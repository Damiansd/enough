// "The rules in force" (2026-09-30) — `src/app/rulesInForce.ts`. Four properties:
//
//   1. every assumption key is classified, shown or hidden, and the classification is exactly the tree;
//   2. every row's figure is the lookup the walk itself uses, on the date asked for, to the cent;
//   3. the lines that carry a date or a caveat carry it (a later change that is already law, a
//      prior-year fallback, a tax year the law carries forward);
//   4. the module holds no figure of its own — a source canary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  agePensionPeriodAt,
  agedCarePeriodAt,
  assumptionAt,
  assumptionKeys,
  deemingRatesAt,
  maximumPaymentRate,
  nonHomeownerAssetsFreeArea,
  taxYear,
} from '../dist/data/assumptions/index.js';
import { RULE_CLASSIFICATION, ruleRowText, rulesInForce } from '../dist/app/rulesInForce.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(join(ROOT, 'src', 'app', 'rulesInForce.ts'), 'utf8');
const DEMO = JSON.parse(readFileSync(join(ROOT, 'fixtures', 'demo-couple.plan.json'), 'utf8'));

/** The demo plan's as-at date — the reference date the panel uses — and three others either side of the stamps. */
const REFERENCE = DEMO.settings.asAtDate;
const DATES = [REFERENCE, '2026-10-15', '2027-08-01', '2030-01-15'];

const rowsOn = (date) => rulesInForce(date).flatMap((section) => section.rows);
const byId = (date) => new Map(rowsOn(date).map((row) => [row.id, row]));

// --- 1. The classification ---------------------------------------------------------------------------

test('every assumption key is classified, and the classification is exactly assumptionKeys()', () => {
  assert.equal(REFERENCE, '2026-09-01', 'the demo plan moved its as-at date; the pinned expectations below assume 2026-09-01');
  assert.deepEqual(Object.keys(RULE_CLASSIFICATION).sort(), [...assumptionKeys()].sort());
  for (const [key, entry] of Object.entries(RULE_CLASSIFICATION)) {
    if ('hidden' in entry) assert.ok(entry.hidden.trim().length > 20, `${key} is hidden with no real reason`);
    else assert.ok(entry.shown.group && entry.shown.area, `${key} is shown under no group`);
  }
});

test('every shown group has rows on some date, and every row belongs to a shown group in its area', () => {
  const shownGroups = new Map(Object.values(RULE_CLASSIFICATION).filter((entry) => 'shown' in entry)
    .map(({ shown }) => [shown.group, shown.area]));
  const seen = new Set();
  for (const date of DATES) {
    for (const row of rowsOn(date)) {
      assert.equal(shownGroups.get(row.group), row.area, `${row.id} is in group "${row.group}", which no key is shown under`);
      seen.add(row.group);
    }
  }
  assert.deepEqual([...shownGroups.keys()].filter((group) => !seen.has(group)), []);
});

test('the reference date shows a panel of the size ruled (about forty to sixty-five figures)', () => {
  const rows = rowsOn(REFERENCE);
  assert.ok(rows.length >= 40 && rows.length <= 70, `${rows.length} rows`);
});

// --- 2. Every figure is the lookup ------------------------------------------------------------------

const fyOf = (date) => {
  const year = Number(date.slice(0, 4));
  const start = date.slice(5) >= '07-01' ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};
const leaf = (key) => assumptionAt(key).value;
const bracket = (date, position) => taxYear(fyOf(date)).brackets.value[position];
const pension = (date) => agePensionPeriodAt(date);
const care = (date) => agedCarePeriodAt(date);
const listoThreshold = (date) =>
  fyOf(date) >= '2027-28' ? leaf('superannuation.lowIncomeSuperTaxOffset.incomeThresholdFrom2027')(fyOf(date)) : leaf('superannuation.lowIncomeSuperTaxOffset.incomeThreshold');

/** Row id → the figure, looked up independently of the module. */
const EXPECTED = {
  'tax-bracket-0': (d) => bracket(d, 0).upTo,
  'tax-bracket-1': (d) => bracket(d, 1).rate,
  'tax-bracket-2': (d) => bracket(d, 2).rate,
  'tax-bracket-3': (d) => bracket(d, 3).rate,
  'tax-bracket-4': (d) => bracket(d, 4).rate,
  'tax-medicare': () => leaf('tax.medicareLevy.rate'),
  'tax-medicare-single': () => leaf('tax.medicareLevy.lowIncomeThresholds.singleLower'),
  'tax-medicare-family': () => leaf('tax.medicareLevy.lowIncomeThresholds.familyLower'),
  'tax-medicare-senior-single': () => leaf('tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower'),
  'tax-medicare-senior-family': () => leaf('tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower'),
  'tax-lito': () => leaf('tax.lito.maximumOffset'),
  'tax-sapto-single': () => leaf('tax.sapto.baseRebateAmount.single'),
  'tax-sapto-couple': () => leaf('tax.sapto.baseRebateAmount.coupleEach'),
  'tax-work-expenses': () => leaf('tax.s25130.maximumDeduction'),
  'tax-wato': (d) => (d >= '2027-07-01' ? leaf('tax.wato.maximumOffset') : undefined),
  'tax-cgt-minimum': (d) => (d >= '2027-07-01' ? leaf('tax.cgt.minimumTaxRate') : undefined),
  'tax-franking-ceiling': () => leaf('franking.smallShareholder.ceiling'),
  'super-concessional': () => leaf('superannuation.caps.concessional'),
  'super-non-concessional': () => leaf('superannuation.caps.nonConcessional'),
  'super-transfer-balance': () => leaf('superannuation.caps.generalTransferBalance'),
  'super-guarantee': () => leaf('superannuation.superGuarantee.chargePercentage'),
  'super-contributions-tax': () => leaf('superannuation.fundTax.contributionsTax'),
  'super-earnings-tax': () => leaf('superannuation.fundTax.earningsTaxAccumulation'),
  'super-earnings-tax-retirement': () => leaf('superannuation.fundTax.earningsTaxRetirement'),
  'super-high-income': () => leaf('superannuation.division293.threshold'),
  'super-large-balance': () => leaf('superannuation.division296.largeBalanceThreshold'),
  'super-preservation-age': () => leaf('superannuation.access.preservationAge'),
  'super-release-age': () => leaf('superannuation.access.automaticReleaseAge'),
  'super-ttr-maximum': () => leaf('superannuation.access.ttrMaximumDrawdown'),
  ...Object.fromEntries(leaf('superannuation.access.minimumDrawdownFactors')
    .map((band) => [`super-drawdown-${band.fromAge}`, () => band.factor])),
  'super-carry-forward': () => leaf('superannuation.carryForward.totalSuperBalanceTest'),
  'super-listo-threshold': listoThreshold,
  'super-listo-maximum': (d) => (fyOf(d) >= '2027-28'
    ? leaf('superannuation.lowIncomeSuperTaxOffset.maximumFrom2027')(listoThreshold(d), leaf('superannuation.superGuarantee.chargePercentage'))
    : leaf('superannuation.lowIncomeSuperTaxOffset.maximum')),
  'super-downsizer-age': () => leaf('superannuation.downsizer.minimumAge'),
  'super-downsizer-cap': () => leaf('superannuation.downsizer.cap'),
  'pension-age': () => leaf('agePension.qualification.qualifyingAge'),
  'pension-full-single': (d) => maximumPaymentRate(pension(d), 'single'),
  'pension-full-couple': (d) => maximumPaymentRate(pension(d), 'coupleEach'),
  'pension-income-single': (d) => pension(d).meansTest.incomeFreeArea.single,
  'pension-income-couple': (d) => pension(d).meansTest.incomeFreeArea.coupleCombined,
  'pension-assets-single-homeowner': (d) => pension(d).meansTest.assetsFreeAreaHomeowner.single,
  'pension-assets-couple-homeowner': (d) => pension(d).meansTest.assetsFreeAreaHomeowner.coupleCombined,
  'pension-assets-single-renter': (d) =>
    nonHomeownerAssetsFreeArea(pension(d).meansTest.assetsFreeAreaHomeowner.single, pension(d).meansTest.extraAllowableAmount),
  'pension-assets-couple-renter': (d) =>
    nonHomeownerAssetsFreeArea(pension(d).meansTest.assetsFreeAreaHomeowner.coupleCombined, pension(d).meansTest.extraAllowableAmount),
  'pension-deeming-threshold-single': (d) => pension(d).meansTest.deemingThreshold.single,
  'pension-deeming-threshold-couple': (d) => pension(d).meansTest.deemingThreshold.coupleCombined,
  'pension-income-taper': () => leaf('agePension.incomeTest.taper'),
  'pension-assets-taper': () => leaf('agePension.assetsTest.taper'),
  'pension-deeming-lower': (d) => deemingRatesAt(d).lower,
  'pension-deeming-upper': (d) => deemingRatesAt(d).upper,
  'pension-work-bonus': () => leaf('agePension.workBonus.fortnightlyAccrual'),
  'heas-interest': () => leaf('heas.interest.rate'),
  'heas-fortnightly-limit': () => leaf('heas.drawModes.fortnightlyCapMultiple'),
  'care-basic-daily-fee': (d) => (d < '2026-09-20' ? undefined : care(d).rates.basicDailyFee),
  'care-hotelling': (d) => (d < '2026-09-20' ? undefined : care(d).rates.hotellingContributionMax),
  'care-non-clinical': (d) => (d < '2026-09-20' ? undefined : care(d).rates.nonClinicalCareContribution.dailyMax),
  'care-non-clinical-cap': (d) => (d < '2026-09-20' ? undefined : care(d).rates.nonClinicalCareContribution.lifetimeCap),
  'care-room-price': (d) => (d < '2026-09-20' ? undefined : care(d).rates.maxRadWithoutPricingApproval),
  'care-mpir': (d) => (d < '2026-09-20' ? undefined : care(d).mpir),
};

test('every row on every date is the lookup the walk uses, to the cent', () => {
  for (const date of DATES) {
    for (const row of rowsOn(date)) {
      const expected = EXPECTED[row.id];
      assert.ok(expected, `row ${row.id} has no expectation in this test`);
      assert.equal(row.amount, expected(date), `${row.id} on ${date}`);
    }
  }
  // Every expectation is exercised on the reference date: the panel lists each figure then.
  assert.deepEqual(Object.keys(EXPECTED).filter((id) => !byId(REFERENCE).has(id)), []);
});

test('the Age Pension is read from the period covering the date, not the first period of the window', () => {
  const rows = byId(REFERENCE);
  const period = agePensionPeriodAt(REFERENCE);
  assert.equal(period.meansTestEffective, '2026-07-01');
  assert.equal(rows.get('pension-assets-single-homeowner').from, '2026-07-01');
  assert.equal(rows.get('pension-full-single').from, period.ratesEffective);
  assert.equal(rows.get('pension-deeming-lower').from, '2026-03-20');
});

test('a figure the forecast indexes past its last published value is not a row', () => {
  const later = byId('2030-01-15');
  for (const id of ['super-concessional', 'super-transfer-balance', 'super-large-balance', 'pension-full-single',
    'pension-income-single', 'pension-deeming-lower', 'care-basic-daily-fee']) {
    assert.equal(later.has(id), false, `${id} is listed in 2030, where the forecast indexes it`);
  }
  assert.equal(rulesInForce('2030-01-15').find((section) => section.area === 'agedCare').rows.length, 0);
});

// --- 3. The dates and caveats a line carries ----------------------------------------------------------

test('a change the law already sets is on the line: tax 2027-28, capital gains, LISTO, the 20 September rates', () => {
  const rows = byId(REFERENCE);
  assert.deepEqual(rows.get('tax-bracket-1').changes, { date: '2027-07-01', amount: taxYear('2027-28').lowestMarginalRate.value });
  assert.match(ruleRowText(rows.get('tax-bracket-1')), /· changes 1 July 2027 to 14%$/);
  assert.equal(rows.get('tax-cgt-minimum').amount, undefined);
  assert.deepEqual(rows.get('tax-cgt-minimum').changes, { date: '2027-07-01', amount: leaf('tax.cgt.minimumTaxRate') });
  assert.match(ruleRowText(rows.get('tax-cgt-minimum')), /: none yet · changes 1 July 2027 to 30%$/);
  assert.deepEqual(rows.get('super-listo-threshold').changes, { date: '2027-07-01', amount: taxYear('2027-28').brackets.value[1].upTo });
  assert.equal(rows.get('pension-full-single').changes.date, '2026-09-20');
  // No change where the later stamp holds the same figure.
  assert.equal(rows.get('tax-bracket-2').changes, undefined);
  assert.equal(rows.get('tax-lito').changes, undefined);
});

test('the Medicare low-income thresholds say they are last year’s figure', () => {
  const ids = ['tax-medicare-single', 'tax-medicare-family', 'tax-medicare-senior-single', 'tax-medicare-senior-family'];
  for (const date of DATES) {
    const rows = byId(date);
    for (const id of ids) {
      const row = rows.get(id);
      assert.deepEqual(row.fallback, { figureYear: '2025-26', missingYear: '2026-27' }, `${id} on ${date}`);
      assert.match(ruleRowText(row), /the 2025-26 figure; the 2026-27 one is not published yet/);
    }
  }
});

test('a tax year the law carries forward says so, and is dated from the year the law states', () => {
  const stated = byId('2027-08-01').get('tax-bracket-1');
  assert.equal(stated.standingFrom, undefined);
  assert.equal(stated.from, '2027-07-01');
  const carried = byId('2030-01-15');
  for (const id of ['tax-bracket-0', 'tax-bracket-1', 'tax-bracket-4']) {
    const row = carried.get(id);
    assert.equal(row.standingFrom, '2027-28', id);
    assert.equal(row.from, '2027-07-01', `${id} is dated from the year it is carried forward to`);
    assert.match(ruleRowText(row), /the 2027-28 scale, which the law keeps for later years/);
  }
});

test('every line is whole dollars or a percent', () => {
  for (const row of rowsOn(REFERENCE)) {
    assert.doesNotMatch(ruleRowText(row), /\$[\d,]+\.\d/, `${row.id} shows cents`);
  }
});

// --- 4. The module holds no figure --------------------------------------------------------------------

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
const STRING = /'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

test('CANARY — no numeric literal in rulesInForce.ts, and a digit in a string only in a key or a guide label', () => {
  const code = withoutComments(SOURCE);
  assert.ok(code.includes('export const rulesInForce'), 'the canary is reading the wrong thing');
  const numbers = [...code.replace(STRING, "''").matchAll(/(?<![\w$.])\d[\d_.]*/g)].map(([literal]) => literal);
  assert.deepEqual(numbers, [], 'rulesInForce.ts writes a number; every figure must be a lookup');
  const keys = assumptionKeys();
  for (const [literal] of code.matchAll(STRING)) {
    const text = literal.slice(1, -1).replace(/\$\{[^}]*\}/g, '');
    if (!/\d/.test(text)) continue;
    const isKey = keys.some((key) => key === text || key.startsWith(text));
    assert.ok(isKey || text.startsWith('guide:'), `rulesInForce.ts has a digit in the string ${literal}`);
  }
  // The four lookups are the only date-resolved reads; the period tables are never indexed directly.
  assert.doesNotMatch(code, /AGE_PENSION_PERIODS|AGED_CARE_PERIODS|PAYMENT_RATES|MEANS_TEST\b|DEEMING_DETERMINATIONS/);
  for (const lookup of ['agePensionPeriodAt(', 'deemingRatesAt(', 'agedCarePeriodAt(', 'taxYear(', 'assumptionAt(']) {
    assert.ok(code.includes(lookup), `rulesInForce.ts no longer reads through ${lookup}`);
  }
});

test('the stray figures moved into the tree are read from it; the two known outside it are still where the module says', () => {
  const parsePlan = withoutComments(readFileSync(join(ROOT, 'src', 'core', 'parsePlan.ts'), 'utf8'));
  assert.match(parsePlan, /DOWNSIZER_MINIMUM_AGE = SUPERANNUATION\.downsizer\.minimumAge\.value/);
  assert.match(parsePlan, /DOWNSIZER_CAP = SUPERANNUATION\.downsizer\.cap\.value/);
  assert.match(parsePlan, /DOWNSIZER_WINDOW_DAYS = SUPERANNUATION\.downsizer\.windowDays\.value/);
  assert.doesNotMatch(parsePlan, /300_000|= 55;|= 90;/);
  const franking = withoutComments(readFileSync(join(ROOT, 'src', 'core', 'individualFranking.ts'), 'utf8'));
  assert.match(franking, /ceiling: FRANKING\.smallShareholder\.ceiling\.value/);

  // Known outside the tree (the ruling lets them stay): the CGT six-year absence rule's months and
  // the transfer balance account's rounding. If either moves in, take it off this list and the
  // module header.
  assert.match(SOURCE, /six-year\s+\/\/ absence rule's month count|six-year absence rule's month count/);
  assert.match(parsePlan, /\b72\b/, 'the CGT six-year rule no longer counts 72 months in parsePlan.ts');
  assert.match(SOURCE, /transfer balance account's rounding/);
});

test('the panel reads the rules at the plan\'s start date, never the clock', () => {
  // The month table's "Set by law" rows are at the plan's dates; a panel at today's date would show
  // different figures whenever a change falls between the two (the demo starts 2026-09-01, and the
  // Age Pension rates change on 20 Sep 2026).
  const panel = readFileSync(new URL('../src/app/settingsPanel.ts', import.meta.url), 'utf8');
  const start = panel.indexOf('const renderRulesInForce');
  const body = panel.slice(start, panel.indexOf('\n};', start));
  assert.ok(start > 0, 'renderRulesInForce not found');
  assert.match(body, /rulesInForce\(plan\.settings\.asAtDate\)/);
  assert.match(body, /rulesHeadline\(plan\.settings\.asAtDate,/);
  assert.doesNotMatch(body, /new Date|Date\.now/);
});
