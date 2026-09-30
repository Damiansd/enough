// the income/spend chart design gate (2026-09-21, GO WITH CONDITIONS) — `flowSeries.ts`, the pure layer behind the
// second chart ("Money coming in and going out, by financial year"). Written against the gate's four
// binding conditions, one section each, plus the structural sweep the gate also asked for.
//
//   §1 THE CLASSIFIER IS TOTAL AND THROWS ON AN UNKNOWN DESCRIPTION, NEVER A PREFIX OR REGEX.
//   §2 EVERY *_LINE CONSTANT projection.ts EXPORTS IS ACCOUNTED FOR — cash ones classified, the ten
//      wealth-only ones named and excluded, by a structural sweep of the source text.
//   §3 THE SHORTFALL IS NEVER A BAND AND NEVER SUMMED INTO ANY INCOME GROUP.
//   §4 AN FY'S SHORTFALL IS THE SUM OF ITS MONTHS, NEVER max(0, spend − income) — a bad month and a
//      good one both stay visible.
//   §5 PARTIAL FINANCIAL YEARS ARE FLAGGED.
//   §6 AGED-CARE COSTS APPEAR ONLY IN THEIR OWN GROUP.
//   §7 A realistic walk (the demo household), for the shapes only a real project() run produces.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION_BEREAVEMENT_LINE,
  AGE_PENSION_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_DAP_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_RAD_PAYMENT_LINE,
  AGED_CARE_RAD_REFUND_LINE,
  CAPITAL_GAINS_TAX_LINE,
  CASH_INTEREST_LINE,
  DIVISION_293_LINE,
  DIVISION_293_RELEASE_REFUND_LINE,
  DIVISION_293_TRUE_UP_LINE,
  DOWNSIZER_CONTRIBUTION_LINE,
  downsizerContributionDescription,
  HEAS_ADVANCE_LINE,
  HEAS_DRAW_LINE,
  HOME_PURCHASE_COSTS_LINE,
  HOME_PURCHASE_PRICE_LINE,
  HOME_SALE_HEAS_REPAID_LINE,
  HOME_SALE_MORTGAGE_REPAID_LINE,
  HOME_SALE_PROCEEDS_LINE,
  HOME_SALE_SELLING_COSTS_LINE,
  HOUSEHOLD_SPENDING_LINE,
  INCOME_TAX_LINE,
  MORTGAGE_INTEREST_LINE,
  MORTGAGE_PRINCIPAL_LINE,
  ONE_OFF_EXPENSE_LINE,
  PENSION_MINIMUM_LINE,
  PORTFOLIO_BROKERAGE_LINE,
  PORTFOLIO_PURCHASE_LINE,
  PORTFOLIO_SALE_LINE,
  RENT_OUT_HOME_AGENT_FEES_LINE,
  RENT_OUT_HOME_INSURANCE_LINE,
  RENT_OUT_HOME_RATES_LINE,
  RENT_OUT_HOME_RENT_LINE,
  RENT_OUT_HOME_REPAIRS_LINE,
  SALARY_LINE,
  SHORTFALL_LINE,
  SPOUSE_CONTRIBUTION_LINE,
  SUPER_DEATH_BENEFIT_LINE,
  TAX_TRUE_UP_LINE,
  TTR_PAYMENT_LINE,
  SUPER_LUMP_SUM_LINE,
  capitalGainsTaxDescription,
  cashInterestDescription,
  division293Description,
  division293ReleaseRefundDescription,
  division293TrueUpDescription,
  incomeTaxDescription,
  portfolioBrokerageDescription,
  portfolioPurchaseDescription,
  portfolioSaleDescription,
  salaryDescription,
  spouseContributionDescription,
  superPaymentDescription,
  taxTrueUpDescription,
  project,
} from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import {
  FLOW_GROUP_LABELS,
  FLOW_GROUP_ORDER,
  FLOW_GROUP_SIDE,
  SHORTFALL_LABEL,
  buildClassificationIndex,
  classifyCashLine,
  flowSeries,
} from '../dist/app/flowSeries.js';

const FUTURE = moneyBasis('futureDollars', DEMO_SETTINGS);

const person = (name) => ({ name, dateOfBirth: '1965-01-01', superInterests: [], parcels: [] });
const COUPLE = { persons: [person('Robin'), person('Sam')] };
const SOLO = { persons: [person('Robin')] };

const cashLine = (direction, description, amount) =>
  Object.freeze({ direction, effect: 'cash', description, amount, provenance: { basis: 'none', note: '' }, attribution: { basis: 'none', note: '' } });
const wealthLine = (description, amount) =>
  Object.freeze({ direction: 'inflow', effect: 'wealth', description, amount, provenance: { basis: 'none', note: '' }, attribution: { basis: 'none', note: '' } });
const monthOf = (month, lines) => Object.freeze({ month, lines: Object.freeze(lines) });

// --- §1 THE CLASSIFIER: EXACT, TOTAL, AND THROWS ON THE UNKNOWN -----------------------------------

test('classifyCashLine throws on a description the index was never built for', () => {
  const index = buildClassificationIndex(COUPLE, ['2026-27']);
  assert.throws(() => classifyCashLine('Something nobody wrote a line for', index), RangeError);
  // A REAL line description, but for a Person outside the Household the index was built from — the
  // classifier must not fall back to matching "close enough".
  assert.throws(() => classifyCashLine(salaryDescription('Nobody'), index), RangeError);
});

test('every FIXED (no-suffix) cash line classifies to the documented group, exactly', () => {
  const index = buildClassificationIndex(COUPLE, ['2026-27']);
  const cases = [
    [AGE_PENSION_LINE, 'agePension'],
    [AGED_CARE_BASIC_FEE_LINE, 'agedCareCosts'],
    [AGED_CARE_HOTELLING_LINE, 'agedCareCosts'],
    [AGED_CARE_NCCC_LINE, 'agedCareCosts'],
    [AGED_CARE_DAP_LINE, 'agedCareCosts'],
    [AGED_CARE_RAD_PAYMENT_LINE, 'radDeposit'],
    [AGED_CARE_RAD_REFUND_LINE, 'radRefund'],
    [HEAS_DRAW_LINE, 'heas'],
    [HEAS_ADVANCE_LINE, 'heas'],
    [HOME_SALE_PROCEEDS_LINE, 'saleProceeds'],
    [HOME_SALE_SELLING_COSTS_LINE, 'saleProceeds'],
    [HOME_SALE_MORTGAGE_REPAID_LINE, 'saleProceeds'],
    [HOME_SALE_HEAS_REPAID_LINE, 'saleProceeds'],
    [HOME_PURCHASE_PRICE_LINE, 'homePurchase'],
    [HOME_PURCHASE_COSTS_LINE, 'homePurchase'],
    [HOUSEHOLD_SPENDING_LINE, 'spending'],
    [ONE_OFF_EXPENSE_LINE, 'spending'],
    [MORTGAGE_INTEREST_LINE, 'mortgage'],
    [MORTGAGE_PRINCIPAL_LINE, 'mortgage'],
    [RENT_OUT_HOME_RENT_LINE, 'rentalIncome'],
    [RENT_OUT_HOME_RATES_LINE, 'rentalIncome'],
    [RENT_OUT_HOME_INSURANCE_LINE, 'rentalIncome'],
    [RENT_OUT_HOME_AGENT_FEES_LINE, 'rentalIncome'],
    [RENT_OUT_HOME_REPAIRS_LINE, 'rentalIncome'],
    [SHORTFALL_LINE, 'shortfall'],
  ];
  for (const [description, group] of cases) {
    assert.equal(classifyCashLine(description, index), group, description);
  }
});

test('every per-Person / per-financial-year family classifies via the ENGINE\'S OWN description builder, never a reconstructed string', () => {
  const index = buildClassificationIndex(COUPLE, ['2026-27', '2027-28']);
  const [robin, sam] = COUPLE.persons;
  const perPerson = [
    [salaryDescription(robin.name), 'pay'],
    [cashInterestDescription(robin), 'investmentIncome'],
    [incomeTaxDescription(robin.name), 'tax'],
    [capitalGainsTaxDescription(robin.name), 'tax'],
    [division293Description(robin.name), 'tax'],
    [portfolioSaleDescription(robin.name), 'portfolioMove'],
    [portfolioPurchaseDescription(robin.name), 'portfolioMove'],
    [portfolioBrokerageDescription(robin.name), 'portfolioMove'],
    [superPaymentDescription(PENSION_MINIMUM_LINE, robin), 'superIncome'],
    [superPaymentDescription(TTR_PAYMENT_LINE, robin), 'superIncome'],
    [superPaymentDescription(SUPER_LUMP_SUM_LINE, robin), 'superIncome'],
    [superPaymentDescription(SUPER_DEATH_BENEFIT_LINE, robin), 'superIncome'],
    [taxTrueUpDescription(robin.name, '2026-27'), 'tax'],
    [division293TrueUpDescription(robin.name, '2026-27'), 'tax'],
    [division293ReleaseRefundDescription(robin.name, '2026-27'), 'tax'],
    [spouseContributionDescription(robin.name, sam.name), 'spouseContribution'],
    [spouseContributionDescription(sam.name, robin.name), 'spouseContribution'],
    [downsizerContributionDescription(robin.name), 'downsizerContribution'],
  ];
  for (const [description, group] of perPerson) {
    assert.equal(classifyCashLine(description, index), group, description);
  }
  // A financial year the index was NOT built for is unclassifiable, exactly like an unknown Person —
  // the table is exhaustive over what it was given and nothing wider.
  assert.throws(() => classifyCashLine(taxTrueUpDescription(robin.name, '2030-31'), index), RangeError);
});

test('a solo Household never produces a spouse-contribution candidate, and the classifier still throws on one', () => {
  const index = buildClassificationIndex(SOLO, ['2026-27']);
  assert.throws(() => classifyCashLine(spouseContributionDescription('Robin', 'Ghost'), index), RangeError);
});

test('no module under src/ classifies a line description by prefix or regex — the same repo canary this file relies on (test/core-div293-charge.test.mjs), re-run against flowSeries.ts alone', () => {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'flowSeries.ts');
  const code = readFileSync(path, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (m) => (m.startsWith('//') ? '' : '""'));
  assert.deepEqual(
    [...code.matchAll(/\.description\s*\??\.\s*(?:startsWith|endsWith|includes|indexOf|lastIndexOf|match|matchAll|search|slice|split|substring|substr|replace|replaceAll)\s*\(/g)],
    [],
  );
});

// --- §2 THE STRUCTURAL SWEEP: EVERY *_LINE CONSTANT IS ACCOUNTED FOR ------------------------------

// The twelve wealth-only lines: `effect: 'wealth'` at every emit site in projection.ts, so flowSeries's
// own `effect === 'cash'` filter means the classifier never sees them. Named here, once, so a new
// `_LINE` constant can only join this file's coverage by a deliberate edit to one of the two lists.
const WEALTH_ONLY_LINES = [
  'GROWTH_LINE',
  'SALARY_SACRIFICE_LINE',
  'SUPER_GUARANTEE_LINE',
  'SUPER_ADMINISTRATION_FEE_LINE',
  'SUPER_INVESTMENT_FEE_LINE',
  'SUPER_INSURANCE_LINE',
  'SUPER_EARNINGS_TAX_LINE',
  'SUPER_FRANKING_CREDIT_REFUND_LINE',
  'HEAS_INTEREST_LINE',
  'AGED_CARE_RAD_RETENTION_LINE',
  'DIVISION_293_RELEASE_LINE',
  'LOW_INCOME_SUPER_TAX_OFFSET_LINE',
];

// The 43 cash-effect line constants, each with a sample description this file can build and expect
// `classifyCashLine` to accept without throwing — bare where the constant is the whole description,
// or through the SAME builder function projection.ts itself exports for a suffixed one.
const CASH_LINE_SAMPLES = (() => {
  const [robin, sam] = COUPLE.persons;
  return {
    AGE_PENSION_LINE,
    AGE_PENSION_BEREAVEMENT_LINE,
    AGED_CARE_BASIC_FEE_LINE,
    AGED_CARE_DAP_LINE,
    AGED_CARE_HOTELLING_LINE,
    AGED_CARE_NCCC_LINE,
    AGED_CARE_RAD_PAYMENT_LINE,
    AGED_CARE_RAD_REFUND_LINE,
    CAPITAL_GAINS_TAX_LINE: capitalGainsTaxDescription(robin.name),
    CASH_INTEREST_LINE: cashInterestDescription(robin),
    DIVISION_293_LINE: division293Description(robin.name),
    DIVISION_293_RELEASE_REFUND_LINE: division293ReleaseRefundDescription(robin.name, '2026-27'),
    DIVISION_293_TRUE_UP_LINE: division293TrueUpDescription(robin.name, '2026-27'),
    DOWNSIZER_CONTRIBUTION_LINE: downsizerContributionDescription(robin.name),
    HEAS_ADVANCE_LINE,
    HEAS_DRAW_LINE,
    HOME_PURCHASE_COSTS_LINE,
    HOME_PURCHASE_PRICE_LINE,
    HOME_SALE_HEAS_REPAID_LINE,
    HOME_SALE_MORTGAGE_REPAID_LINE,
    HOME_SALE_PROCEEDS_LINE,
    HOME_SALE_SELLING_COSTS_LINE,
    HOUSEHOLD_SPENDING_LINE,
    INCOME_TAX_LINE: incomeTaxDescription(robin.name),
    MORTGAGE_INTEREST_LINE,
    MORTGAGE_PRINCIPAL_LINE,
    ONE_OFF_EXPENSE_LINE,
    PENSION_MINIMUM_LINE: superPaymentDescription(PENSION_MINIMUM_LINE, robin),
    PORTFOLIO_BROKERAGE_LINE: portfolioBrokerageDescription(robin.name),
    PORTFOLIO_PURCHASE_LINE: portfolioPurchaseDescription(robin.name),
    PORTFOLIO_SALE_LINE: portfolioSaleDescription(robin.name),
    RENT_OUT_HOME_AGENT_FEES_LINE,
    RENT_OUT_HOME_INSURANCE_LINE,
    RENT_OUT_HOME_RATES_LINE,
    RENT_OUT_HOME_RENT_LINE,
    RENT_OUT_HOME_REPAIRS_LINE,
    SALARY_LINE: salaryDescription(robin.name),
    SHORTFALL_LINE,
    SPOUSE_CONTRIBUTION_LINE: spouseContributionDescription(robin.name, sam.name),
    SUPER_DEATH_BENEFIT_LINE: superPaymentDescription(SUPER_DEATH_BENEFIT_LINE, robin),
    TAX_TRUE_UP_LINE: taxTrueUpDescription(robin.name, '2026-27'),
    TTR_PAYMENT_LINE: superPaymentDescription(TTR_PAYMENT_LINE, robin),
    SUPER_LUMP_SUM_LINE: superPaymentDescription(SUPER_LUMP_SUM_LINE, robin),
  };
})();

test('CASH_LINE_SAMPLES actually names all 43 non-wealth *_LINE constants, and none of the 12 wealth-only ones', () => {
  assert.equal(Object.keys(CASH_LINE_SAMPLES).length, 43);
  for (const name of WEALTH_ONLY_LINES) assert.equal(name in CASH_LINE_SAMPLES, false, name);
});

test('every *_LINE constant exported by projection.ts is either classified here or named as wealth-only — the structural sweep', () => {
  const projectionPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'projection.ts');
  const source = readFileSync(projectionPath, 'utf8');
  const swept = [...source.matchAll(/export const ([A-Z][A-Z0-9_]*_LINE) = /g)].map(([, name]) => name);
  assert.ok(swept.length > 0, 'the sweep found nothing — it is reading the wrong file');
  const accountedFor = new Set([...Object.keys(CASH_LINE_SAMPLES), ...WEALTH_ONLY_LINES]);
  const missing = swept.filter((name) => !accountedFor.has(name));
  assert.deepEqual(missing, [], 'a *_LINE constant in projection.ts has neither a sample nor a wealth-only exclusion');
  // And the reverse — nothing here claims to cover a constant projection.ts no longer exports, which
  // would let this file's own count silently drift ahead of the sweep it is meant to be measured by.
  const extra = [...accountedFor].filter((name) => !swept.includes(name));
  assert.deepEqual(extra, []);
});

test('every sampled cash-line description classifies without throwing, via classifyCashLine', () => {
  const index = buildClassificationIndex(COUPLE, ['2026-27']);
  for (const [name, description] of Object.entries(CASH_LINE_SAMPLES)) {
    assert.doesNotThrow(() => classifyCashLine(description, index), name);
  }
});

// --- §3/§4 SHORTFALL: NEVER A GROUP, NEVER NETTED, ALWAYS THE SUM OF ITS MONTHS -------------------

test('the shortfall is reported on its own field, is not a FlowGroupKey, and is never folded into any group\'s total', () => {
  assert.equal(FLOW_GROUP_ORDER.includes('shortfall'), false);
  assert.equal('shortfall' in FLOW_GROUP_LABELS, false);
  assert.equal('shortfall' in FLOW_GROUP_SIDE, false);
  assert.equal(SHORTFALL_LABEL, 'Money this plan does not have');

  const months = [
    monthOf('2026-07', [cashLine('inflow', AGE_PENSION_LINE, toCents(1_000)), cashLine('inflow', SHORTFALL_LINE, toCents(500))]),
  ];
  const series = flowSeries(months, COUPLE, FUTURE);
  const agePension = series.groups.find((g) => g.key === 'agePension');
  assert.equal(agePension.values[0], toCents(1_000), 'the shortfall on the same month must not inflate the agePension group');
  assert.equal(series.shortfall[0], toCents(500));
});

test('an FY\'s shortfall is the SUM of its months\' own SHORTFALL_LINE amounts — a bad March and a good June both stay visible', () => {
  // A financial year (2026-27) with one very short month and one very comfortable one. If the FY's
  // shortfall were recomputed as max(0, annual spend − annual income) it would read as a SMALL number
  // (or nil) here, because June's pension comfortably outweighs the whole year's spending; summing the
  // engine's own per-month figure cannot wash the bad month out with the good one.
  const months = [
    monthOf('2027-03', [
      cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(4_000)),
      cashLine('inflow', SHORTFALL_LINE, toCents(3_000)), // March: badly short
    ]),
    monthOf('2027-06', [
      cashLine('inflow', AGE_PENSION_LINE, toCents(50_000)), // June: comfortably covered, no shortfall line
      cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(4_000)),
    ]),
  ];
  const series = flowSeries(months, COUPLE, FUTURE);
  assert.equal(series.years.length, 1);
  assert.equal(series.years[0].financialYear, '2026-27');
  assert.equal(series.shortfall[0], toCents(3_000), 'March’s own shortfall, uneroded by June’s surplus');
  // The naive alternative this condition forbids, computed independently, to show the two really do
  // diverge on this fixture rather than coincide by accident.
  const totalSpend = toCents(4_000) + toCents(4_000);
  const totalIncome = toCents(50_000);
  const naive = Math.max(0, totalSpend - totalIncome);
  assert.equal(naive, 0);
  assert.notEqual(series.shortfall[0], naive);
});

test('a February with TWO SHORTFALL_LINE entries (the ordinary sweep and the CGT-outran-the-sale sweep) sums both', () => {
  const months = [monthOf('2026-09', [cashLine('inflow', SHORTFALL_LINE, toCents(200)), cashLine('inflow', SHORTFALL_LINE, toCents(75))])];
  const series = flowSeries(months, COUPLE, FUTURE);
  assert.equal(series.shortfall[0], toCents(275));
});

// --- §5 PARTIAL FINANCIAL YEARS ARE FLAGGED -------------------------------------------------------

test('a financial year with fewer than twelve months is flagged partial and labelled, never drawn as a short bar with no caption', () => {
  const months = ['2026-09', '2026-10', '2026-11'].map((m) => monthOf(m, [cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(100))]));
  const series = flowSeries(months, COUPLE, FUTURE);
  assert.equal(series.years.length, 1);
  assert.equal(series.years[0].partial, true);
  assert.equal(series.years[0].label, '2026-27 (Sep to Nov)');
});

test('a full twelve-month financial year is not flagged partial', () => {
  const months = Array.from({ length: 12 }, (_unused, i) => {
    const month = i < 6 ? `2026-${String(7 + i).padStart(2, '0')}` : `2027-${String(i - 5).padStart(2, '0')}`;
    return monthOf(month, [cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(100))]);
  });
  const series = flowSeries(months, COUPLE, FUTURE);
  assert.equal(series.years.length, 1);
  assert.equal(series.years[0].partial, false);
  assert.equal(series.years[0].label, '2026-27');
});

// --- §6 AGED-CARE COSTS APPEAR ONLY IN THEIR OWN GROUP --------------------------------------------

test('the four aged-care cost lines land in agedCareCosts and nowhere else; the RAD deposit and refund are their own groups', () => {
  const months = [
    monthOf('2026-07', [
      cashLine('outflow', AGED_CARE_BASIC_FEE_LINE, toCents(1)),
      cashLine('outflow', AGED_CARE_HOTELLING_LINE, toCents(2)),
      cashLine('outflow', AGED_CARE_NCCC_LINE, toCents(3)),
      cashLine('outflow', AGED_CARE_DAP_LINE, toCents(4)),
      cashLine('outflow', AGED_CARE_RAD_PAYMENT_LINE, toCents(500_000)),
      cashLine('inflow', AGED_CARE_RAD_REFUND_LINE, toCents(500_000)),
    ]),
  ];
  const series = flowSeries(months, COUPLE, FUTURE);
  const byKey = Object.fromEntries(series.groups.map((g) => [g.key, g]));
  assert.equal(byKey.agedCareCosts.values[0], toCents(1 + 2 + 3 + 4));
  assert.equal(byKey.radDeposit.values[0], toCents(500_000));
  assert.equal(byKey.radRefund.values[0], toCents(500_000));
  // Never merged: the huge RAD lump sum must not leak into `agedCareCosts`, which would dwarf the
  // ongoing fees and make aged care look like a single $500,010 spike rather than a small ongoing cost
  // plus a separate, clearly-labelled deposit.
  assert.equal(byKey.agedCareCosts.values[0], toCents(10));
  assert.notEqual(byKey.agedCareCosts.values[0], toCents(500_010));
  assert.equal(FLOW_GROUP_LABELS.radDeposit, 'Aged care — deposit paid (refundable)');
});

// --- Asset moves are never income or spending -----------------------------------------------------

test('a home sale nets its four lines into saleProceeds, and never touches spending or mortgage', () => {
  const months = [
    monthOf('2026-07', [
      cashLine('inflow', HOME_SALE_PROCEEDS_LINE, toCents(900_000)),
      cashLine('outflow', HOME_SALE_SELLING_COSTS_LINE, toCents(20_000)),
      cashLine('outflow', HOME_SALE_MORTGAGE_REPAID_LINE, toCents(300_000)),
      cashLine('outflow', HOME_SALE_HEAS_REPAID_LINE, toCents(10_000)),
      cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(3_000)),
      cashLine('outflow', MORTGAGE_INTEREST_LINE, toCents(500)),
    ]),
  ];
  const series = flowSeries(months, COUPLE, FUTURE);
  const byKey = Object.fromEntries(series.groups.map((g) => [g.key, g]));
  assert.equal(byKey.saleProceeds.values[0], toCents(900_000 - 20_000 - 300_000 - 10_000));
  assert.equal(byKey.spending.values[0], toCents(3_000));
  assert.equal(byKey.mortgage.values[0], toCents(500));
});

test('a group family that runs the other way in a year nets rather than switching sides — a Division 293 refund year', () => {
  const [robin] = COUPLE.persons;
  const months = [
    monthOf('2026-07', [cashLine('inflow', division293ReleaseRefundDescription(robin.name, '2026-27'), toCents(1_000))]),
  ];
  const series = flowSeries(months, COUPLE, FUTURE);
  const tax = series.groups.find((g) => g.key === 'tax');
  // `tax` is an outflow-side group; a pure refund year nets NEGATIVE rather than being reported as an
  // inflow group, which is the "net, never re-sided" rule the header states.
  assert.equal(tax.values[0], -toCents(1_000));
});

test('a group with no cash line anywhere in the walk is not reported at all', () => {
  const months = [monthOf('2026-07', [cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(100))])];
  const series = flowSeries(months, COUPLE, FUTURE);
  assert.deepEqual(series.groups.map((g) => g.key), ['spending']);
});

// --- §7 A REAL WALK: today's-money conversion, and the demo household's own shapes ----------------

test('flowSeries over the demo walk: pay and tax both appear, in today’s money, whole-dollar-summable', () => {
  const months = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
  const today = moneyBasis('todaysDollars', DEMO_SETTINGS);
  const series = flowSeries(months, DEMO_HOUSEHOLD, today);
  assert.ok(series.years.length > 1);
  const byKey = Object.fromEntries(series.groups.map((g) => [g.key, g]));
  assert.ok(byKey.pay, 'Dana is still working at the start of the demo walk');
  assert.ok(byKey.pay.values.some((v) => v > 0));
  assert.ok(byKey.spending, 'the demo plan states a SPEND_CHANGE');
  assert.ok(byKey.agePension, 'the demo couple is paid the Age Pension somewhere in 501 months');
  // Not vacuous: the future-dollars walk and the today's-money walk must actually differ somewhere,
  // or the conversion this test exists to exercise is not being exercised.
  const future = flowSeries(months, DEMO_HOUSEHOLD, moneyBasis('futureDollars', DEMO_SETTINGS));
  const payToday = byKey.pay.values;
  const payFuture = future.groups.find((g) => g.key === 'pay').values;
  assert.notDeepEqual(payToday, payFuture);
});

test('the demo walk’s FIRST year is partial (the plan starts in September)', () => {
  const months = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
  const series = flowSeries(months, DEMO_HOUSEHOLD, FUTURE);
  assert.equal(series.years[0].partial, true);
  assert.match(series.years[0].label, /from Sep/);
});
