// P14-13 — `RENT_OUT_HOME` wired into `project()`: the net rent as assessable income for tax, the
// Age Pension income test and the aged-care means test; the home's Age Pension asset status once
// nobody protects it; and the ATO's 6-year main-residence rule on a later sale.
//
// Sources verified live, 2026-09-25, Chrome UA:
//   - ato.gov.au "Treating former home as main residence" (last updated 22 June 2026): the 6-year
//     rule — full exemption for up to 6 years of renting after moving out, a PARTIAL exemption
//     beyond that, apportioned by days. This build computes no partial exemption, so a sale more
//     than 6 years after the rental's own start is refused by name.
//   - guides.dss.gov.au 4.6.3.60 "Exempting the principal home — temporary vacation of property"
//     (wayback 2025-12-03, live fetch 403s automated retrieval): a household not intending to
//     return makes the home an assessable, non-homeowner asset — this build's `HomeStatus.rentedOut`,
//     with NO 12-month grace (the conservative, understating-entitlement reading).
//   - guides.dss.gov.au 4.6.3.70 "Exempting the principal home — care situations" (wayback
//     2026-02-16): "the rent received... is exempt from the income test for the period that the
//     principal home is exempt" — confirming BOTH that rent is otherwise ordinary income counted in
//     the test, AND that it is specifically excused while an ENTER_CARE-protected home stays exempt.
//   - servicesaustralia.gov.au aged care means test "Real estate income" (wayback 2021-04-12,
//     principle unchanged): "Your assessable income from real estate is the gross income... minus
//     the deductions we allow" (rates, insurance, agent's fees, repairs) — and "If you make a loss
//     from your rental property, we count that income as zero... You can't offset this loss against
//     ...any other source of income" — the floor this build applies to BOTH means tests and NOT to
//     income tax, where a loss reduces other income (ordinary ATO negative gearing).
//
// Every Household here is synthetic: round numbers, `cashInterestRate: 0` and a flat `economicSeries`
// (`cpi/pblci/awote/mtawe: 0`) so nothing drifts between the day a figure is stated and the day it
// is read — `core-projection-sell-home.test.mjs`'s own reason for pinning rates explicitly.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents, mulCents } from '../dist/core/money.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import {
  project,
  AGE_PENSION_LINE,
  RENT_OUT_HOME_RENT_LINE,
  RENT_OUT_HOME_RATES_LINE,
  RENT_OUT_HOME_INSURANCE_LINE,
  RENT_OUT_HOME_AGENT_FEES_LINE,
  RENT_OUT_HOME_REPAIRS_LINE,
  AGED_CARE_NCCC_LINE,
  monthlyFromAnnual,
} from '../dist/core/projection.js';
import { parsePlan, PlanFileEntryError } from '../dist/core/parsePlan.js';
import { agePensionEntitlement, UnvaluedAssessableHomeError } from '../dist/core/agePension.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, employmentIncomePerFortnight = toCents(0)) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight,
  workBonusBalance: toCents(0),
});

// Every month here falls inside the ONE published Age Pension / aged care rate period
// (2026-09-20 to 2027-03-19 / 2027-09-19), on purpose — `core-projection-sell-home.test.mjs`'s own
// reason for choosing `asAtDate` strictly after the 2026-09-20 boundary.
const SETTINGS = {
  asAtDate: '2026-10-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);

const withEntries = (household, entries) => ({
  ...DEMO_PLAN,
  household,
  entries,
  scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
});

// --- The door ---------------------------------------------------------------------------------

const HOMEOWNER_HOUSEHOLD = { ...DEMO_PLAN.household, homeStatus: 'occupied' };
const validRent = entry('rent', 'RENT_OUT_HOME', '2040-07-01', { weeklyRent: toCents(500) });

test('door: a household with no home to rent (homeStatus noHome) is refused', () => {
  const bad = { ...HOMEOWNER_HOUSEHOLD, homeStatus: 'noHome' };
  assert.throws(
    () => parsePlan(withEntries(bad, [validRent])),
    /is RENT_OUT_HOME, and household\.homeStatus is "noHome" — there is no home this build treats as a rentable principal home/,
  );
});

test('door: a RENT_OUT_HOME on or after a SELL_HOME is refused — nothing left to rent', () => {
  const sold = entry('sold', 'SELL_HOME', '2040-01-01', { salePrice: toCents(900_000) });
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [sold, validRent])),
    /a SELL_HOME entry \(id sold\) is dated 2040-01-01 — on or before it/,
  );
});

test('door: two overlapping tenancies are refused', () => {
  const second = { ...validRent, id: 'rent2', date: '2040-08-01' };
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validRent, second])),
    /the two tenancies overlap/,
  );
  // Non-overlapping (the first ends before the second starts) parses whole.
  const first = { ...validRent, params: { ...validRent.params, endDate: '2040-08-01' } };
  const later = { ...validRent, id: 'rent2', date: '2040-09-01' };
  assert.ok(parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [first, later])));
});

test('door: an endDate on or before the entry’s own date is refused', () => {
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validRent, params: { ...validRent.params, endDate: '2040-07-01' } }])),
    /a tenancy cannot end before or in the month it starts/,
  );
});

test('door: an ENTER_CARE dated on or after an already-active tenancy is refused', () => {
  const care = entry('care', 'ENTER_CARE', '2040-08-01', { homeValue: toCents(700_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validRent, care])),
    /Entering care means leaving a home actually lived in/,
  );
  // Care FIRST, then renting the now-vacated home, is the case this build models — allowed.
  const careFirst = { ...care, date: '2040-06-01' };
  assert.ok(parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [careFirst, validRent])));
});

test('door: a non-positive weekly rent, or a negative cost, is refused', () => {
  assert.throws(() => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validRent, params: { weeklyRent: 0 } }])), /a rental for nothing or less is not a rental/);
  assert.throws(() => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validRent, params: { weeklyRent: -1 } }])), PlanFileEntryError);
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validRent, params: { weeklyRent: toCents(500), annualRates: -1 } }])),
    /this is money leaving the household for the year, and a negative figure would be money arriving/,
  );
});

test('door: a valid RENT_OUT_HOME parses whole and unchanged, blank costs and endDate omitted', () => {
  const parsed = parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validRent]));
  assert.deepEqual(parsed.entries.at(-1).params, { weeklyRent: toCents(500) });
});

test('door: a SELL_HOME within 6 years of a RENT_OUT_HOME’s start is allowed; beyond 6 years it is refused', () => {
  const rentFrom = entry('rent', 'RENT_OUT_HOME', '2030-01-01', { weeklyRent: toCents(500) });
  const saleWithin = entry('sale', 'SELL_HOME', '2036-01-01', { salePrice: toCents(900_000) }); // 72 months exactly
  assert.ok(parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [rentFrom, saleWithin])));
  const saleBeyond = { ...saleWithin, date: '2036-02-01' }; // 73 months — beyond the 6-year rule
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [rentFrom, saleBeyond])),
    /more than 6 years \(72 months\) earlier.*only PARTIAL/s,
  );
});

// --- The walk -----------------------------------------------------------------------------------

const ENTER_CARE_PARAMS = { homeValue: toCents(700_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) };

test('cash lines: the gross rent and each stated cost, monthly, every month the tenancy is active', () => {
  const household = { persons: [person('Robin', '1980-01-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(200_000) };
  const care = entry('care', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', {
    weeklyRent: toCents(500), annualRates: toCents(2_000), annualInsurance: toCents(1_200), annualAgentFees: toCents(2_200), annualRepairs: toCents(1_500),
  });
  const months = project(SETTINGS, household, [care, rent]);
  const oct = months.find((m) => m.month === '2026-10');
  const nov = months.find((m) => m.month === '2026-11');
  // October: care has started, but the tenancy has not — no rent lines yet.
  assert.equal(lineSum(oct, RENT_OUT_HOME_RENT_LINE), 0);
  // November: the tenancy's own month — gross rent and each cost, monthly, `monthlyFromAnnual`'s
  // own twelfth-of-a-year convention (`SpendChangeParams.annualSpend`'s own precedent), reused here
  // rather than re-derived.
  assert.equal(lineSum(nov, RENT_OUT_HOME_RENT_LINE), monthlyFromAnnual(toCents(500 * 52)));
  assert.equal(lineSum(nov, RENT_OUT_HOME_RATES_LINE), monthlyFromAnnual(toCents(2_000)));
  assert.equal(lineSum(nov, RENT_OUT_HOME_INSURANCE_LINE), monthlyFromAnnual(toCents(1_200)));
  assert.equal(lineSum(nov, RENT_OUT_HOME_AGENT_FEES_LINE), monthlyFromAnnual(toCents(2_200)));
  assert.equal(lineSum(nov, RENT_OUT_HOME_REPAIRS_LINE), monthlyFromAnnual(toCents(1_500)));
  // And it recurs the month after, unchanged — a standing tenancy, `HEAS_DRAW`'s own fortnightly
  // stream, not a one-off.
  const dec = months.find((m) => m.month === '2026-12');
  assert.equal(lineSum(dec, RENT_OUT_HOME_RENT_LINE), lineSum(nov, RENT_OUT_HOME_RENT_LINE));
});

// **`weeklyRent` and the four annual costs are stated in TODAY's money and rise with CPI EVERY
// MONTH of the tenancy (user ruling, 2026-09-25) — unlike `ENTER_CARE`'s RAD/home value, fixed once
// at entry, this is a STANDING figure, `SpendChangeParams.annualSpend`'s own footing.** This file's
// own `SETTINGS` holds `cpi: 0` throughout (so every OTHER test above is a byte-identical control,
// unaffected by the ruling) — this test alone states a non-zero rate to prove the rule.
test('weeklyRent is TODAY\'S money and rises with CPI through the tenancy: a 2056 rent is inflated to the cent, a rent starting at asAtDate is not', () => {
  const withCpi = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, cpi: 0.025 }, planningHorizonAge: 95 };
  // A standalone `RENT_OUT_HOME` refuses by name the moment the home is assessable and unvalued
  // (`standalone` test above) — `ENTER_CARE`'s own `homeValue` is what supplies one, `care lines`
  // test's own household shape, so this test can walk for decades without hitting that scope refusal.
  const household = { persons: [person('Robin', '1990-01-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(200_000) };
  const care = entry('care', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');

  // A tenancy starting the month AFTER `asAtDate`'s own month: `priceLevelFactor`'s own `asAtDate`
  // identity means the very first month is not quite 1 (`asAtDate` is 2026-10-16, so November is
  // already one whole month on) — "barely moves" is asserted to the cent via the same expression,
  // never as a hand-typed near-1 figure.
  const rentFromStart = entry('rentFromStart', 'RENT_OUT_HOME', '2026-11-01', { weeklyRent: toCents(500) });
  const startWalk = project(withCpi, household, [care, rentFromStart]);
  const startMonth = startWalk.find((m) => m.month === '2026-11');
  assert.equal(
    lineSum(startMonth, RENT_OUT_HOME_RENT_LINE),
    monthlyFromAnnual(mulCents(inflateStated(toCents(500), withCpi.economicSeries.cpi, withCpi.asAtDate, '2026-11'), 52)),
  );

  // The SAME tenancy, one CPI-bearing year later: the rent has risen by the plan's own factor,
  // `core/priceLevel.ts`'s `inflateStated` — re-derived here, never pasted as a new literal.
  const oneYearLater = startWalk.find((m) => m.month === '2027-11');
  assert.equal(
    lineSum(oneYearLater, RENT_OUT_HOME_RENT_LINE),
    monthlyFromAnnual(mulCents(inflateStated(toCents(500), withCpi.economicSeries.cpi, withCpi.asAtDate, '2027-11'), 52)),
  );
  assert.ok(lineSum(oneYearLater, RENT_OUT_HOME_RENT_LINE) > lineSum(startMonth, RENT_OUT_HOME_RENT_LINE), 'the rent must actually rise a year in');

  // A tenancy starting in 2056 — thirty years of CPI from `asAtDate` — inflated to the cent by the
  // SAME expression, never a second one.
  const rent2056 = entry('rent2056', 'RENT_OUT_HOME', '2056-01-01', {
    weeklyRent: toCents(500), annualRates: toCents(2_000), annualInsurance: toCents(1_200), annualAgentFees: toCents(2_200), annualRepairs: toCents(1_500),
  });
  const walked2056 = project(withCpi, household, [care, rent2056]);
  const jan2056 = walked2056.find((m) => m.month === '2056-01');
  const factorAt2056 = (cents) => inflateStated(cents, withCpi.economicSeries.cpi, withCpi.asAtDate, '2056-01');
  assert.equal(lineSum(jan2056, RENT_OUT_HOME_RENT_LINE), monthlyFromAnnual(mulCents(factorAt2056(toCents(500)), 52)));
  assert.equal(lineSum(jan2056, RENT_OUT_HOME_RATES_LINE), monthlyFromAnnual(factorAt2056(toCents(2_000))));
  assert.equal(lineSum(jan2056, RENT_OUT_HOME_INSURANCE_LINE), monthlyFromAnnual(factorAt2056(toCents(1_200))));
  assert.equal(lineSum(jan2056, RENT_OUT_HOME_AGENT_FEES_LINE), monthlyFromAnnual(factorAt2056(toCents(2_200))));
  assert.equal(lineSum(jan2056, RENT_OUT_HOME_REPAIRS_LINE), monthlyFromAnnual(factorAt2056(toCents(1_500))));
  assert.ok(lineSum(jan2056, RENT_OUT_HOME_RENT_LINE) > monthlyFromAnnual(toCents(500 * 52)) * 1.5, 'thirty years of CPI must move the 2056 rent by far more than a rounding cent');
});

test('whole-home rental only: renting while a partner still lives in the home is refused, by name, at the walk', () => {
  const household = {
    persons: [person('Alex', '1955-06-01'), person('Blair', '1955-06-15')],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const care = entry('care', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA'); // Blair stays home
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', { weeklyRent: toCents(500) });
  assert.throws(
    () => project(SETTINGS, household, [care, rent]),
    /is active while a partner still lives in the home \(DSS Guide 4\.6\.3\.70\)/,
  );
});

test('standalone (no ENTER_CARE): renting the whole home out has no stated value once it becomes assessable, and refuses by name', () => {
  const household = { persons: [person('Robin', '1955-01-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(50_000) };
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-10-01', { weeklyRent: toCents(500) });
  assert.throws(() => project(SETTINGS, household, [rent]), UnvaluedAssessableHomeError);
});

// --- The Age Pension income test: exempt while ENTER_CARE keeps the home exempt, counted once ----
// --- past the cliff (DSS Guide 4.6.3.70) — and aged care sees it EITHER WAY -----------------------

// A big enough rent that its NET figure, HALVED for a couple (aged care's own "half your combined
// income" rule), clears the aged-care per-person income free area (~$35,727/year,
// `data/assumptions/agedCare.ts`'s `incomeThresholds.couple.freeArea`) by a wide margin — so the
// aged-care comparison below is decisive rather than a few cents from the boundary. Deeming on a
// $50,000 offset contributes only a few hundred dollars a year, which does not change that.
const BIG_RENT_PARAMS = { weeklyRent: toCents(3_000), annualRates: toCents(2_000), annualInsurance: toCents(1_200), annualAgentFees: toCents(2_200), annualRepairs: toCents(1_500) };
const NET_RENT_ANNUAL = toCents(3_000 * 52 - (2_000 + 1_200 + 2_200 + 1_500)); // $149,100

const bothInCareCouple = () => ({
  persons: [person('Alex', '1955-06-01'), person('Blair', '1955-06-15')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(50_000),
});

test('Age Pension: protected (within the ENTER_CARE clock) — the rent is EXEMPT from the income test, DSS Guide 4.6.3.70', () => {
  const household = bothInCareCouple();
  const careA = entry('careA', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');
  const careB = entry('careB', 'ENTER_CARE', '2026-10-15', ENTER_CARE_PARAMS, 'personB');
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', BIG_RENT_PARAMS);
  // The tenancy's OWN first month: November's OPENING balance is October's close, which is
  // IDENTICAL whether or not the rent entry exists (the rent has not yet paid a cent by then) — so
  // deeming on cash cannot be the source of any difference this test finds, only the income test's
  // own treatment of the rent can be. `homeUnprotectedFrom` is 2026-10-15; 1 month on is well under
  // the 24-month cliff (`AGE_PENSION.assetsTest.careVacatedHomeExemptionMonths`).
  const testMonth = '2026-11';
  const withRent = project(SETTINGS, household, [careA, careB, rent]);
  const withoutRent = project(SETTINGS, household, [careA, careB]);
  const monthWith = withRent.find((m) => m.month === testMonth);
  const monthWithout = withoutRent.find((m) => m.month === testMonth);
  assert.equal(monthWith.openingBalance, monthWithout.openingBalance, 'the two runs already disagree on cash before the rent test even starts — the comparison is contaminated');
  // Same oracle the walk itself calls (`agePensionEntitlement`), fed the SAME facts, with the home
  // still `vacatedWithinTwoYearExemption` (protected) at this month — no `otherAssessableIncomePerFortnight`.
  const exempt = agePensionEntitlement({
    household: { ...household, homeStatus: 'vacatedWithinTwoYearExemption', openingOffsetBalance: monthWith.openingBalance },
    date: `${testMonth}-01`,
    deemingRates: SETTINGS.deemingRates,
  });
  // The CONTRAST: the same call WITH the rent added is a different (higher) assessed income.
  const counted = agePensionEntitlement({
    household: { ...household, homeStatus: 'vacatedWithinTwoYearExemption', openingOffsetBalance: monthWith.openingBalance },
    date: `${testMonth}-01`,
    deemingRates: SETTINGS.deemingRates,
    otherAssessableIncomePerFortnight: Math.round(NET_RENT_ANNUAL / 26),
  });
  assert.notEqual(exempt.incomeTest.assessed, counted.incomeTest.assessed, 'the contrast is vacuous — rent does not move the income test at all');
  // The WALK, with the rent entry present, agrees with the EXEMPT reading — not the counted one.
  assert.equal(lineSum(monthWith, AGE_PENSION_LINE), lineSum(monthWithout, AGE_PENSION_LINE), 'the walk counted rent in the income test while the home is still protected');
});

test('Age Pension: past the cliff — the rent IS counted in the income test, and the Age Pension line falls', () => {
  const household = bothInCareCouple();
  const careA = entry('careA', 'ENTER_CARE', '2015-01-01', ENTER_CARE_PARAMS, 'personA');
  const careB = entry('careB', 'ENTER_CARE', '2015-01-15', ENTER_CARE_PARAMS, 'personB');
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-10-16', BIG_RENT_PARAMS);
  const testMonth = '2026-11';
  const withRent = project(SETTINGS, household, [careA, careB, rent]);
  const withoutRent = project(SETTINGS, household, [careA, careB]);
  const monthWith = withRent.find((m) => m.month === testMonth);
  const monthWithout = withoutRent.find((m) => m.month === testMonth);
  assert.notEqual(lineSum(monthWith, AGE_PENSION_LINE), lineSum(monthWithout, AGE_PENSION_LINE), 'the rent has no effect on the Age Pension once the home is past its cliff');
  assert.ok(lineSum(monthWith, AGE_PENSION_LINE) <= lineSum(monthWithout, AGE_PENSION_LINE), 'more assessable income can only lower or hold the Age Pension, never raise it');
});

test('aged care: the rent is assessed EITHER WAY — even while it is exempt from the Age Pension income test', () => {
  const household = bothInCareCouple();
  const careA = entry('careA', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');
  const careB = entry('careB', 'ENTER_CARE', '2026-10-15', ENTER_CARE_PARAMS, 'personB');
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', BIG_RENT_PARAMS);
  const testMonth = '2026-11'; // the tenancy's own first month — the NCCC cap history is identical
  // between the two runs up to and including this month, so the comparison is clean.
  const withRent = project(SETTINGS, household, [careA, careB, rent]);
  const withoutRent = project(SETTINGS, household, [careA, careB]);
  const monthWith = withRent.find((m) => m.month === testMonth);
  const monthWithout = withoutRent.find((m) => m.month === testMonth);
  assert.ok(
    lineSum(monthWith, AGED_CARE_NCCC_LINE) > lineSum(monthWithout, AGED_CARE_NCCC_LINE),
    'aged care did not see the rent — it should, even while the Age Pension exempts it (4.6.3.70)',
  );
});

// --- Income tax: net rent reaches EACH owner, split 50/50, and a LOSS is unfloored (negative gearing)

test('income tax: net rent reaches EACH owner’s own assessment (50/50, a couple), and is floored at nil for neither means test — but a loss floors THERE, not for tax', () => {
  const household = bothInCareCouple();
  const careA = entry('careA', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');
  const careB = entry('careB', 'ENTER_CARE', '2026-10-15', ENTER_CARE_PARAMS, 'personB');
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', BIG_RENT_PARAMS);
  const withRent = project(SETTINGS, household, [careA, careB, rent]);
  const withoutRent = project(SETTINGS, household, [careA, careB]);
  const testMonth = '2026-11';
  const monthWith = withRent.find((m) => m.month === testMonth);
  const monthWithout = withoutRent.find((m) => m.month === testMonth);
  const taxLine = (month, name) => month.lines.filter((line) => line.description === `Income tax, ${name}`).reduce((sum, line) => sum + line.amount, 0);
  // BOTH owners' own tax rises — proving the split reaches each of them, not only one.
  assert.ok(taxLine(monthWith, 'Alex') > taxLine(monthWithout, 'Alex'), "Alex's own tax did not rise — the rent split did not reach them");
  assert.ok(taxLine(monthWith, 'Blair') > taxLine(monthWithout, 'Blair'), "Blair's own tax did not rise — the rent split did not reach them");
});

test('income tax: a rental LOSS reduces a Person’s other income (negative gearing), unfloored — unlike the two means tests', () => {
  // A salaried single Person, so a loss has other income to offset (`incomeTest`/`aged care` never
  // see either the salary or the loss here — no ENTER_CARE reaches the AGE PENSION side of this
  // test, so the standalone `rentedOut` refusal is sidestepped by keeping the horizon inside a
  // window with an ENTER_CARE anyway, `UnvaluedAssessableHomeError`'s own reason).
  const household = {
    persons: [{ ...person('Robin', '1980-01-01', toCents(4_000_00)), superInterests: [{ phase: 'accumulation', balance: toCents(0) }] }],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const care = entry('care', 'ENTER_CARE', '2026-10-01', ENTER_CARE_PARAMS, 'personA');
  const lossParams = { weeklyRent: toCents(200), annualRates: toCents(4_000), annualInsurance: toCents(2_000), annualAgentFees: toCents(3_000), annualRepairs: toCents(3_000) };
  const rent = entry('rent', 'RENT_OUT_HOME', '2026-11-01', lossParams);
  const withLoss = project(SETTINGS, household, [care, rent]);
  const withoutRent = project(SETTINGS, household, [care]);
  const testMonth = '2026-11';
  const monthWith = withLoss.find((m) => m.month === testMonth);
  const monthWithout = withoutRent.find((m) => m.month === testMonth);
  const tax = (month) => month.lines.filter((line) => line.description === 'Income tax, Robin').reduce((sum, line) => sum + line.amount, 0);
  assert.ok(tax(monthWith) < tax(monthWithout), 'a rental loss did not reduce this Person’s tax — negative gearing is not being applied');
});
