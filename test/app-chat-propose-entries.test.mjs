// plan_ai.md §12.4, ADR-0011 §3 — `proposeEntries(plan, whatIf, {scenarioId?, basis?})`: the what-if,
// checked by `runProjection`'s own machinery, handed back as the entry form's boxes to type.
//
// The round trip is asserted HERE from the form's own builders (`planEdits.ts`), fed the text each
// box says to type, and never from the tool's own comparison. The labels are asserted against
// `entryForm.ts`'s source, word for word.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { entryTypeLabel } from '../dist/app/entryLabels.js';
import * as edits from '../dist/app/planEdits.js';
import { listEntries } from '../dist/app/chat/tools/listEntries.js';
import { labelledFigure } from '../dist/app/chat/tools/basisLabelled.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { FORM_BOXES, HEAS_DRAW_OPTIONS, NOT_TYPEABLE, SACRIFICE_OPTIONS, proposalOrRefusal, proposeEntries } from '../dist/app/chat/tools/proposeEntries.js';

const FORM_SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'entryForm.ts'), 'utf8');
const NAMES = DEMO_PLAN.household.persons.map(({ name }) => name);

const draft = (type, owner, params, date = '2028-07-01') => ({ date, owner, type, params, enabled: true, createdAt: '2026-09-24' });

// SYNTHETIC: the demo with a transition-to-retirement account for Person A, who reaches preservation
// age (60) in 2028-05, so a TTR_RATE_CHANGE has an account to name.
const WITH_TTR = structuredClone(DEMO_PLAN);
WITH_TTR.household.persons[0].superInterests.push({ phase: 'ttr', balance: toCents(100_000), statedStreamSettings: { commencementDay: '2028-06-01', statedTtrDrawdownRate: 0.05 } });

// SYNTHETIC: the demo with a second accumulation account for Person A, so a TTR_START has an
// account to start from while the Guarantee keeps landing in the first. The first is named as the
// employer's, or the plan without the entry would not know where the Guarantee goes (O82).
const WITH_SECOND_ACCOUNT = structuredClone(DEMO_PLAN);
WITH_SECOND_ACCOUNT.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
WITH_SECOND_ACCOUNT.household.persons[0].superInterests.push({ phase: 'accumulation', balance: toCents(100_000) });

// SYNTHETIC: the demo with a death and TPD premium on Person A's first account, so an
// INSURANCE_COVER_CHANGE has cover to change.
const WITH_INSURANCE = structuredClone(DEMO_PLAN);
Object.assign(WITH_INSURANCE.household.persons[0].superInterests[0], { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300), statedTpdPremiumPerYear: toCents(120) });

// SYNTHETIC: the demo with a SHORT horizon, so the walk ends before `AGED_CARE_PERIODS`'s own
// published window closes (2027-09-19) — `agedCareParametersCover`'s own gate, `core/projection.ts`
// — rather than DEMO_PLAN's ordinary horizon (age 100), which runs a resident in care well past it
// and is refused for a reason that has nothing to do with the boxes this test is checking.
const WITH_CARE = structuredClone(DEMO_PLAN);
WITH_CARE.settings.planningHorizonAge = 59;
// The demo's OWN entries dated after the shortened horizon are switched off — `dana-retires`
// (2031-05-14) and `new-roof` (2029-11-01) — the door refuses a plan holding an ENABLED entry
// dated past the Planning Horizon, and this fixture is about `ENTER_CARE`'s own boxes, not theirs.
WITH_CARE.entries = WITH_CARE.entries.map((entry) => (entry.date > '2027-05' ? { ...entry, enabled: false } : entry));

// SYNTHETIC: a single-Person household already in care with a stated home value, so a later
// `RENT_OUT_HOME` case has somewhere to apply that is not `vacatedProtectedPersonRemains` — nobody
// is left to protect a SINGLE Person's home once they themselves are in care, `P14-5a`'s own
// "represent the survivor alone" precedent, `NIL_PENSION_HEAS`'s own single-Person shape (below).
const SINGLE_IN_CARE = structuredClone(DEMO_PLAN);
SINGLE_IN_CARE.settings.planningHorizonAge = 72;
SINGLE_IN_CARE.household = {
  persons: [{ name: 'Robin', dateOfBirth: '1955-01-01', superInterests: [], parcels: [], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0) }],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(50_000),
};
SINGLE_IN_CARE.entries = [];
SINGLE_IN_CARE.scenarios = SINGLE_IN_CARE.scenarios.map((scenario) => ({ ...scenario, entryIds: [] }));
// The `ENTER_CARE` itself is not what the `RENT_OUT_HOME` case is testing, so it is baked into the
// plan rather than drafted.
const WITH_CARE_AND_A_HOME_VALUE = edits.planWithEntry(SINGLE_IN_CARE, {
  id: 'baked-enter-care', type: 'ENTER_CARE', owner: 'personA', date: '2026-10-01',
  params: { homeValue: toCents(900_000), radPrice: toCents(550_000), radPaidAsLumpSum: toCents(0) },
  enabled: true, createdAt: '2026-09-24',
});

/** One draft per offered type, each on a plan it walks on, with any entry it needs first. */
const CASES = {
  SPEND_CHANGE: [DEMO_PLAN, [draft('SPEND_CHANGE', 'household', { annualSpend: toCents(90_000) })]],
  RETIRE: [DEMO_PLAN, [draft('RETIRE', 'personB', {})]],
  WORK_PATTERN_CHANGE: [DEMO_PLAN, [draft('WORK_PATTERN_CHANGE', 'personA', { daysPerWeek: 3, annualSalary: toCents(60_000) })]],
  ONE_OFF_EXPENSE: [DEMO_PLAN, [draft('ONE_OFF_EXPENSE', 'household', { amount: toCents(38_000) })]],
  // GIFT slice 2: a giver who is one Person, so the round trip proves the owner survives too.
  GIFT: [DEMO_PLAN, [draft('GIFT', 'personB', { amount: toCents(25_000) })]],
  LUMP_SUM_FROM_SUPER: [DEMO_PLAN, [draft('LUMP_SUM_FROM_SUPER', 'personB', { amount: toCents(10_000), interestIndex: 1 })]],
  SUPER_CONTRIBUTION: [DEMO_PLAN, [draft('SUPER_CONTRIBUTION', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(5_000), interestIndex: 1 }), draft('SUPER_CONTRIBUTION', 'personA', { kind: 'stopped' }, '2029-07-01')]],
  MORTGAGE_REFINANCE: [DEMO_PLAN, [draft('MORTGAGE_REFINANCE', 'household', { openingBalance: toCents(100_000), annualInterestRate: 0.061, monthlyRepayment: toCents(2_000) })]],
  MORTGAGE_TARGET: [DEMO_PLAN, [draft('MORTGAGE_TARGET', 'household', {})]],
  MORTGAGE_PAYOFF: [DEMO_PLAN, [draft('MORTGAGE_REFINANCE', 'household', { openingBalance: toCents(100_000), annualInterestRate: 0.061, monthlyRepayment: toCents(2_000) }, '2028-01-01'), draft('MORTGAGE_PAYOFF', 'household', {})]],
  ILLNESS_SEPARATION: [DEMO_PLAN, [draft('ILLNESS_SEPARATION', 'household', {})]],
  DEATH: [DEMO_PLAN, [draft('DEATH', 'personB', {}, '2040-01-01')]],
  NON_SUPER_INVESTMENT: [DEMO_PLAN, [draft('NON_SUPER_INVESTMENT', 'personA', { direction: 'buy', amount: toCents(10_000), incidentalCostsOfAcquisition: toCents(20) }), draft('NON_SUPER_INVESTMENT', 'personA', { direction: 'sell', amount: toCents(5_000), parcelSelection: 'highest-cost-base-first' }, '2029-07-01')]],
  RETURN_CHANGE: [DEMO_PLAN, [draft('RETURN_CHANGE', 'personA', { rate: 0.0651 })]],
  // RF-3: the second one moves an amount out of the employer's account into a new one.
  TTR_START: [WITH_SECOND_ACCOUNT, [draft('TTR_START', 'personA', { interestIndex: 2, drawdownRate: 0.07 }), draft('TTR_START', 'personA', { interestIndex: 1, amount: toCents(50_000) })]],
  TTR_RATE_CHANGE: [WITH_TTR, [draft('TTR_RATE_CHANGE', 'personA', { interestIndex: 2, drawdownRate: 0.07 })]],
  INSURANCE_COVER_CHANGE: [WITH_INSURANCE, [draft('INSURANCE_COVER_CHANGE', 'personA', { interestIndex: 1, benefit: 'both', coverFraction: 0.5 })]],
  SPOUSE_CONTRIBUTION: [DEMO_PLAN, [draft('SPOUSE_CONTRIBUTION', 'personB', { amount: toCents(3_000), receivingInterestIndex: 1 })]],
  // `radPaidAsLumpSum: 0` — the whole RAD accrues as a daily accommodation payment instead — so the
  // walk does not need to find $550,000 of cash on hand in this month, `core-projection-aged-care.
  // test.mjs`'s own DAP-only fixture. `WITH_CARE`, not `DEMO_PLAN` — see its own comment above.
  ENTER_CARE: [WITH_CARE, [draft('ENTER_CARE', 'personB', { homeValue: toCents(900_000), radPrice: toCents(550_000), radPaidAsLumpSum: toCents(0) }, '2026-10-01')]],
  // `owner: 'personB'` — P9-2a: HEAS is a Person's own loan, never `household` — dated after
  // Person B's own Age Pension age (67 from 2027-02-09), `checkHeasDraws`'s own two whole-file facts.
  // `'maximum'` draws the netted allowance, so no stated figure has to clear the 150% ceiling by hand.
  // **No advance here** (P9-2b): on DEMO_PLAN, Person B is a genuine PART-RATE pensioner by
  // 2028-08 — exactly T137's UNCONFIRMED case — and `project()` correctly refuses it. The advance
  // box/figure alignment has its own standalone test below, on a nil-pension Household, so T137's
  // refusal never fires there.
  HEAS_DRAW: [DEMO_PLAN, [draft('HEAS_DRAW', 'personB', { securityValue: toCents(900_000), fortnightlyAmount: 'maximum' })]],
  SELL_HOME: [DEMO_PLAN, [draft('SELL_HOME', 'household', { salePrice: toCents(900_000), sellingCosts: toCents(20_000) })]],
  // `RENT_OUT_HOME` (P14-13) needs a stated home value to reuse once the home becomes assessable
  // (`checkRentOutHomes`'s own "nearest stated estimate" ruling) — baked into the plan via an
  // already-applied `ENTER_CARE`, on `WITH_CARE`'s own shortened horizon, rather than drafted here:
  // this case is testing RENT_OUT_HOME's own boxes, not ENTER_CARE's.
  RENT_OUT_HOME: [WITH_CARE_AND_A_HOME_VALUE, [draft('RENT_OUT_HOME', 'household', { weeklyRent: toCents(500), annualRates: toCents(2_000) }, '2026-11-01')]],
  // `BUY_HOME` (P14-19) needs a sale earlier in the same scenario — drafted with it.
  // `DOWNSIZER_CONTRIBUTION` (P9-5) needs a sale in the same scenario, within 90 days — drafted with it.
  DOWNSIZER_CONTRIBUTION: [DEMO_PLAN, [draft('SELL_HOME', 'household', { salePrice: toCents(900_000), sellingCosts: toCents(20_000) }), draft('DOWNSIZER_CONTRIBUTION', 'personA', { amount: toCents(200_000), receivingInterestIndex: 1, statedOwnedTenYears: true }, '2028-08-01')]],
  BUY_HOME: [DEMO_PLAN, [draft('SELL_HOME', 'household', { salePrice: toCents(900_000), sellingCosts: toCents(20_000), newHomeAmount: toCents(600_000) }), draft('BUY_HOME', 'household', { purchasePrice: toCents(550_000), purchaseCosts: toCents(25_000) }, '2028-10-01')]],
};

/** Each box's text, keyed by the form value it fills, for the builder named by the entry's type. */
const FIELD_OF_BOX = {
  [FORM_BOXES.annualSpend]: 'annualSpend',
  [FORM_BOXES.daysPerWeek]: 'daysPerWeek',
  [FORM_BOXES.annualSalary]: 'annualSalary',
  [FORM_BOXES.oneOffAmount]: 'amount',
  [FORM_BOXES.giftAmount]: 'amount',
  [FORM_BOXES.amount]: 'amount',
  [FORM_BOXES.sacrificeAmount]: 'annualAmount',
  [FORM_BOXES.loanBalance]: 'openingBalance',
  [FORM_BOXES.loanRate]: 'annualInterestRate',
  [FORM_BOXES.loanRepayment]: 'monthlyRepayment',
  [FORM_BOXES.incidentalCosts]: 'incidentalCostsOfAcquisition',
  [FORM_BOXES.returnRate]: 'rate',
  [FORM_BOXES.ttrRate]: 'drawdownRatePercent',
  [FORM_BOXES.ttrStartRate]: 'drawdownRatePercent',
  [FORM_BOXES.ttrMoveAmount]: 'amount',
  [FORM_BOXES.spouseAmount]: 'amount',
  [FORM_BOXES.spouseAccount]: 'receivingInterestIndex',
  [FORM_BOXES.homeValue]: 'homeValue',
  [FORM_BOXES.radPrice]: 'radPrice',
  [FORM_BOXES.radPaidAsLumpSum]: 'radPaidAsLumpSum',
  [FORM_BOXES.heasSecurityValue]: 'securityValue',
  [FORM_BOXES.heasFortnightlyAmount]: 'fortnightlyAmount',
  [FORM_BOXES.heasStopDate]: 'stopDate',
  [FORM_BOXES.heasAdvanceDate]: 'advanceDate',
  [FORM_BOXES.heasAdvanceAmount]: 'advanceAmount',
  [FORM_BOXES.salePrice]: 'salePrice',
  [FORM_BOXES.sellingCosts]: 'sellingCosts',
  [FORM_BOXES.newHomeAmount]: 'newHomeAmount',
  [FORM_BOXES.weeklyRent]: 'weeklyRent',
  [FORM_BOXES.annualRates]: 'annualRates',
  [FORM_BOXES.annualInsurance]: 'annualInsurance',
  [FORM_BOXES.annualAgentFees]: 'annualAgentFees',
  [FORM_BOXES.annualRepairs]: 'annualRepairs',
  [FORM_BOXES.rentEndDate]: 'endDate',
  [FORM_BOXES.purchasePrice]: 'purchasePrice',
  [FORM_BOXES.purchaseCosts]: 'purchaseCosts',
  [FORM_BOXES.downsizerAmount]: 'amount',
  [FORM_BOXES.downsizerAccount]: 'receivingInterestIndex',
  [FORM_BOXES.insuranceCover]: 'coverPercent',
};

/** What the form would save from these boxes, built by the form's own builder. */
const typedBack = (entryDraft, boxes) => {
  const value = (label) => boxes.find(({ box }) => box === label)?.value;
  const values = { date: value(FORM_BOXES.date), owner: entryDraft.owner, note: '' };
  for (const { box, value: text } of boxes) if (Object.hasOwn(FIELD_OF_BOX, box)) values[FIELD_OF_BOX[box]] = text;
  if (value(FORM_BOXES.superAccount) !== undefined) values.interestIndex = value(FORM_BOXES.superAccount);
  const { type } = entryDraft;
  if (type === 'SUPER_CONTRIBUTION') {
    return value(FORM_BOXES.sacrificeKind) === SACRIFICE_OPTIONS.stopped ? edits.superContributionStopEntry(values, 'x', 'y') : edits.superContributionEntry(values, 'x', 'y');
  }
  if (type === 'HEAS_DRAW') {
    const kind = value(FORM_BOXES.heasKind);
    // `advanceDate`/`advanceAmount` are blank unless the boxes above set them (P9-2b) — the same
    // "blank means no advance" `stopDate` already carries, and `heasDrawEntry` requires both keys.
    return edits.heasDrawEntry(
      { advanceDate: '', advanceAmount: '', ...values, fortnightlyAmount: kind === HEAS_DRAW_OPTIONS.maximum ? 'maximum' : values.fortnightlyAmount },
      'x',
      'y',
    );
  }
  if (type === 'RENT_OUT_HOME') {
    // The four costs and `endDate` are each optional (P14-13) — a box exists only where the case
    // stated one, `HEAS_DRAW`'s own "blank means none" default for the rest.
    return edits.rentOutHomeEntry({ annualRates: '', annualInsurance: '', annualAgentFees: '', annualRepairs: '', endDate: '', ...values }, 'x', 'y');
  }
  // `newHomeAmount`/`newHomePurchaseDate` are blank unless a box above set them (P14-13c) — `HEAS_DRAW`'s
  // `advanceDate`/`advanceAmount` own "blank means none" idiom; `sellHomeEntry` requires both keys.
  if (type === 'SELL_HOME') {
    return edits.sellHomeEntry({ newHomeAmount: '', newHomePurchaseDate: '', ...values }, 'x', 'y');
  }
  // RF-3: blank unless the box above set it, `BUY_HOME`'s own idiom.
  if (type === 'TTR_START') {
    return edits.ttrStartEntry({ amount: '', ...values }, 'x', 'y');
  }
  if (type === 'BUY_HOME') {
    return edits.buyHomeEntry({ purchaseCosts: '', ...values }, 'x', 'y');
  }
  if (type === 'DOWNSIZER_CONTRIBUTION') {
    return edits.downsizerContributionEntry({ ...values, ownedTenYears: value(FORM_BOXES.downsizerOwnedTenYears) === 'Yes' ? 'yes' : '' }, 'x', 'y');
  }
  if (type === 'INSURANCE_COVER_CHANGE') {
    const benefit = edits.INSURANCE_BENEFIT_CHOICES.find(({ label }) => label === value(FORM_BOXES.insuranceBenefit))?.value ?? '';
    return edits.insuranceCoverChangeEntry({ ...values, benefit }, 'x', 'y');
  }
  if (type === 'NON_SUPER_INVESTMENT') {
    const sell = value(FORM_BOXES.direction).startsWith('Sell');
    if (!sell) return edits.nonSuperInvestmentBuyEntry(values, 'x', 'y');
    const chosen = value(FORM_BOXES.parcelSelection);
    return edits.nonSuperInvestmentSellEntry({ ...values, parcelSelection: {
      'Sell oldest first': 'oldest-first', 'Sell the most expensive first': 'highest-cost-base-first', 'Sell the cheapest first': 'lowest-cost-base-first',
    }[chosen] ?? '' }, 'x', 'y');
  }
  const builder = {
    SPEND_CHANGE: edits.spendChangeEntry, RETIRE: edits.retireEntry, WORK_PATTERN_CHANGE: edits.workPatternChangeEntry, ONE_OFF_EXPENSE: edits.oneOffExpenseEntry, GIFT: edits.giftEntry,
    LUMP_SUM_FROM_SUPER: edits.lumpSumFromSuperEntry, MORTGAGE_REFINANCE: edits.mortgageRefinanceEntry, MORTGAGE_TARGET: edits.mortgageTargetEntry,
    MORTGAGE_PAYOFF: edits.mortgagePayoffEntry, ILLNESS_SEPARATION: edits.illnessSeparationEntry, DEATH: edits.deathEntry, RETURN_CHANGE: edits.returnChangeEntry,
    TTR_START: edits.ttrStartEntry, TTR_RATE_CHANGE: edits.ttrRateChangeEntry, SPOUSE_CONTRIBUTION: edits.spouseContributionEntry, ENTER_CARE: edits.enterCareEntry,
  }[type];
  return builder(values, 'x', 'y');
};

/** The draft as `plan.json` would store it: accounts counted from 0. */
const stored = ({ params, ...rest }) => ({
  ...rest,
  params: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, ['interestIndex', 'receivingInterestIndex'].includes(key) ? value - 1 : value])),
});

test('every offered type: the boxes, typed into the form’s own builder, save as exactly the draft that was checked', () => {
  assert.deepEqual(Object.keys(CASES).sort(), [...edits.OFFERED_ENTRY_TYPES].sort(), 'a type the form offers has no case here');
  for (const [type, [plan, drafts]] of Object.entries(CASES)) {
    const out = proposalOrRefusal(plan, drafts);
    assert.equal(out.refused, undefined, `${type}: ${out.reason}`);
    assert.equal(out.toType.length, drafts.length, type);
    out.toType.forEach(({ boxes }, index) => {
      const want = stored(drafts[index]);
      assert.deepEqual(boxes.slice(0, 3), [
        { box: 'Type', value: entryTypeLabel(want.type) },
        { box: 'From', value: want.date },
        { box: 'Owner', value: { household: 'Household', personA: 'Person A', personB: 'Person B' }[want.owner] },
      ], type);
      const built = typedBack(want, boxes);
      assert.deepEqual({ type: built.type, date: built.date, owner: built.owner, enabled: built.enabled, params: built.params }, { type: want.type, date: want.date, owner: want.owner, enabled: true, params: want.params }, type);
    });
    // Through both guards, both views.
    for (const basis of ['todaysDollars', 'futureDollars']) proposeEntries(plan, drafts, { basis });
  }
});

test('every box label is a label(...) literal in entryForm.ts, word for word, and every option a label: literal', () => {
  for (const [key, text] of Object.entries(FORM_BOXES)) {
    const quoted = [`label('${text} '`, `label('${text}'`, `label("${text} "`, `label("${text}"`];
    assert.ok(quoted.some((each) => FORM_SOURCE.includes(each)), `FORM_BOXES.${key} ("${text}") is not a label in entryForm.ts`);
  }
  for (const [value, text] of Object.entries(SACRIFICE_OPTIONS)) assert.ok(FORM_SOURCE.includes(`{ value: '${value}', label: '${text}' }`), `the ${value} option is not worded "${text}" in entryForm.ts`);
  for (const [value, text] of Object.entries(HEAS_DRAW_OPTIONS)) assert.ok(FORM_SOURCE.includes(`{ value: '${value}', label: '${text}' }`), `the ${value} option is not worded "${text}" in entryForm.ts`);
});

test('a money box carries the typed text bare, and beside it the figure labelled; never a code or an id', () => {
  const out = proposeEntries(DEMO_PLAN, [draft('ONE_OFF_EXPENSE', 'household', { amount: toCents(38_000) })], { basis: 'futureDollars' });
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed.toType[0].boxes[3], { box: 'Amount, as it will cost on the day $', value: '38000.00', amount: '$38,000.00 (future dollars)' });
  assert.match(parsed.amounts, /quote amount, word for word with its label/);
  assert.doesNotMatch(out, /draft-\d|"code"|"id"/);
  assert.deepEqual(Object.keys(parsed).sort(), ['amounts', 'basis', 'checked', 'ownerBox', 'scenarioId', 'toSwitchOff', 'toType']);
  for (const name of NAMES) assert.ok(!out.includes(name));
});

// SYNTHETIC: a NIL-pension single Person, well past Age Pension age, huge cash — so a
// `HEAS_DRAW` advance never trips T137's genuine-part-rate-pensioner refusal, which the DEMO_PLAN
// case above already proves fires where it should (P9-2b).
const NIL_PENSION_HEAS = structuredClone(DEMO_PLAN);
NIL_PENSION_HEAS.household = {
  persons: [{ name: 'Nil', dateOfBirth: '1955-01-01', superInterests: [], parcels: [], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0) }],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(5_000_000),
};
NIL_PENSION_HEAS.entries = [];
NIL_PENSION_HEAS.scenarios = NIL_PENSION_HEAS.scenarios.map((scenario) => ({ ...scenario, entryIds: [] }));

test('a HEAS_DRAW advance box (P9-2b) is a money box like any other, LAST, and its amount is listEntries\' own appended figure', () => {
  const advance = draft('HEAS_DRAW', 'personA', { securityValue: toCents(900_000), fortnightlyAmount: 'maximum', advances: [{ date: '2028-08-01', amount: toCents(5_000) }] }, '2028-07-01');
  const out = proposeEntries(NIL_PENSION_HEAS, [advance], { basis: 'futureDollars' });
  const parsed = JSON.parse(out);
  const boxes = parsed.toType[0].boxes;
  const advanceDateBox = boxes.find(({ box }) => box === FORM_BOXES.heasAdvanceDate);
  const advanceAmountBox = boxes.find(({ box }) => box === FORM_BOXES.heasAdvanceAmount);
  assert.equal(advanceDateBox.value, '2028-08-01');
  assert.equal(advanceAmountBox.value, '5000.00');
  // **The advance is stated in TODAY's money (user ruling, 2026-09-25) and raised to ITS OWN day,
  // 2028-08-01, one month after the entry's own 2028-07-01 — so the future-dollars figure is NOT the
  // bare $5,000 typed, and the expected one is `inflateStated`, the same expression `listEntries.ts`'s
  // `labelledStated` raises it by (not `listEntries()` itself: the row text for a "maximum" draw never
  // mentions the advance at all, so `entrySummary`'s own `$`-count would not match `statedFigures`'
  // here — `labelledEntryFigures`, which `proposeEntries` actually calls, does not need it to).**
  const basis = moneyBasis('futureDollars', NIL_PENSION_HEAS.settings);
  const expectedAmount = labelledFigure(inflateStated(toCents(5_000), basis.cpi, basis.asAtDate, '2028-08'), basis, '2028-08');
  assert.notEqual(expectedAmount, '$5,000.00 (future dollars)', 'the advance must actually move — otherwise this test proves nothing');
  assert.equal(advanceAmountBox.amount, expectedAmount);
  // And the round trip: typed back into `heasDrawEntry`, the advance survives whole.
  const built = typedBack(stored(advance), boxes);
  assert.deepEqual(built.params.advances, [{ date: '2028-08-01', amount: toCents(5_000) }]);
});

/** The `$` figures listEntries words `entry` with, once the entry is in the plan: the labelling proposeEntries must reuse. */
const listedFigures = (plan, drafts, index, basis) => {
  const withIt = drafts.slice(0, index + 1).reduce((each, entry, at) => edits.planWithEntry(each, { ...stored(entry), id: `listed-${at}` }), plan);
  const listed = JSON.parse(listEntries(withIt, { basis })).entries.find(({ id }) => id === `listed-${index}`);
  return listed.wording.match(/\$[\d,]+\.\d\d \([^()]*\)/g) ?? [];
};

test('every money box, every offered type, both bases: the value is bare and the amount is listEntries’ own labelled figure', () => {
  let money = 0;
  for (const [type, [plan, drafts]] of Object.entries(CASES)) {
    for (const basis of ['todaysDollars', 'futureDollars']) {
      const out = JSON.parse(proposeEntries(plan, drafts, { basis }));
      out.toType.forEach(({ boxes }, index) => {
        const moneyBoxes = boxes.filter(({ box }) => box.endsWith(' $'));
        for (const { box, value } of boxes) assert.doesNotMatch(value, /\$|\(/, `${type} ${box}: the box text is only what to type`);
        for (const each of moneyBoxes) assert.match(each.value, /^\d+\.\d\d$/, `${type} ${each.box}`);
        assert.deepEqual(boxes.filter((each) => !each.box.endsWith(' $')).map(({ amount }) => amount), boxes.filter((each) => !each.box.endsWith(' $')).map(() => undefined), `${type}: only a money box has an amount`);
        assert.deepEqual(moneyBoxes.map(({ amount }) => amount), listedFigures(plan, drafts, index, basis), `${type} ${basis}`);
        money += moneyBoxes.length;
      });
    }
  }
  assert.equal(money, 2 * 31, 'the money boxes the cases hold'); // + GIFT's one (its amount, 2026-10-02) + TTR_START's one (RF-3, its amount) + DOWNSIZER_CONTRIBUTION's three (its sale's salePrice and sellingCosts, then amount); 13 + ENTER_CARE's three (homeValue, radPrice, radPaidAsLumpSum) + HEAS_DRAW's one ("maximum" carries no second money box, securityValue's own doc) + SELL_HOME's two (salePrice, sellingCosts) + RENT_OUT_HOME's two (weeklyRent, annualRates) + BUY_HOME's five (its sale's salePrice, sellingCosts and newHomeAmount, then purchasePrice, purchaseCosts)
  // The three kinds of stated money, each on its own label.
  const [spend, salary, lump] = [
    ['SPEND_CHANGE', 'household', { annualSpend: toCents(72_000) }],
    ['WORK_PATTERN_CHANGE', 'personA', { daysPerWeek: 3, annualSalary: toCents(48_000) }],
    ['ONE_OFF_EXPENSE', 'household', { amount: toCents(40_000) }],
  ].map(([type, owner, params]) => JSON.parse(proposeEntries(DEMO_PLAN, [draft(type, owner, params)])).toType[0].boxes.at(-1).amount);
  assert.equal(spend, '$72,000.00 (today’s money)');
  assert.equal(salary, '$48,000.00 (in today’s wages)');
  assert.match(lump, /^\$\d{2},\d{3}\.\d\d \(today’s money\)$/);
  assert.notEqual(lump, '$40,000.00 (today’s money)', 'a nominal amount is converted at its own month, not relabelled');
});

test('a switch-off and a replace come back as the entries table’s wording and its own control', () => {
  const later = draft('RETIRE', 'personA', {}, '2033-05-14');
  const out = proposalOrRefusal(DEMO_PLAN, { replace: [{ entryId: 'dana-retires', with: later }], disable: ['new-roof'] });
  assert.deepEqual(out.toSwitchOff.map(({ entryId, control }) => [entryId, control]), [['new-roof', 'Switch off'], ['dana-retires', 'Switch off']]);
  assert.equal(out.toSwitchOff[1].wording, 'Retire, 2031-05-14 — Person A stops work at 63.');
  assert.deepEqual(out.toType[0].boxes, [{ box: 'Type', value: 'Retire' }, { box: 'From', value: '2033-05-14' }, { box: 'Owner', value: 'Person A' }]);
});

test('refusals: each by name, and the plan is never touched', () => {
  const frozen = structuredClone(DEMO_PLAN);
  const before = JSON.stringify(frozen);
  const refusedAs = (asked, name) => {
    const out = proposalOrRefusal(frozen, asked);
    assert.equal(out.refused, name, JSON.stringify(out));
    return out;
  };
  refusedAs(undefined, 'NO_ENTRIES');
  refusedAs([], 'NO_ENTRIES');
  refusedAs({ add: 'no' }, 'MALFORMED_DRAFTS');
  refusedAs({ disable: ['no-such-entry'] }, 'UNKNOWN_ENTRY');
  refusedAs([draft('RETIRE', 'personA', {}, '2033-05-14')], 'HONOURED_ONCE');
  refusedAs([draft('SPEND_CHANGE', 'household', { annualSpend: 'lots' })], 'WHAT_IF_REFUSED');
  // Checked and walked, but the form would save something else: the form writes every entry
  // switched on, so a switched-off draft is not what "Add entry" would save.
  assert.equal(refusedAs([{ ...draft('ONE_OFF_EXPENSE', 'household', { amount: toCents(1_000) }), enabled: false }], 'NOT_TYPEABLE').reason, `add[0]: ${NOT_TYPEABLE}`);
  assert.equal(JSON.stringify(frozen), before);
});
