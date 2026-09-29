// Phase 14, SLICE 3a (P14-13) — `ENTER_CARE` wired into `project()`: the RAD lump sum through the
// cash/Waterfall path, the RAD asymmetry (Centrelink-exempt, aged-care-assessable), the ongoing
// means-tested fees (basic, hotelling, NCCC, DAP) and the protected-person home rule.
//
// **How the expected figures below were built, and why that is still "hand-worked".** Every fee
// figure asserted here is DAYS-IN-MONTH × a per-day figure produced by `agedCareMeansAssessment` /
// `agedCareFees` / `agedCareAccommodationPayment` — the SAME pure functions `core-aged-care.test.mjs`
// already pins against health.gov.au's own worked examples. This file's job is the WIRING (P14-13),
// not a second proof of the band arithmetic, so the per-day figures are derived by calling those
// already-verified functions directly with household facts computed by hand (cash after the RAD
// left it, the combined RAD ledger, home protection) — `core-illness-separation.test.mjs`'s own
// precedent for composing an already-tested calculator rather than re-deriving its formula.
// `AGED_CARE.residentialSchedule['2026-09-20'].value.basicDailyFee` is $68.93/day, asserted against
// directly wherever only the day count varies.
//
// Every Household here is synthetic: round numbers, no salary, no super, `cashInterestRate: 0` so
// cash never drifts between the day it is stated and the day it is spent — the one Setting this
// file pins explicitly so every dollar figure below is arithmetic, not a second unstated variable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  project,
  AGE_PENSION_LINE,
  AGED_CARE_RAD_PAYMENT_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_DAP_LINE,
  AGED_CARE_RAD_RETENTION_LINE,
  AGED_CARE_RAD_REFUND_LINE,
  SHORTFALL_LINE,
  RadPaymentUnfundedError,
} from '../dist/core/projection.js';
import { parsePlan, PlanFileEntryError } from '../dist/core/parsePlan.js';
import { agedCareMeansAssessment, agedCareFees, agedCareAccommodationPayment, agedCareRadRetentionDeduction, startingNcccCapBalance } from '../dist/core/agedCare.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { AGED_CARE, agedCarePeriodsThrough, agedCarePeriodAt } from '../dist/data/assumptions/agedCare.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CURRENT = AGED_CARE.residentialSchedule['2026-09-20'].value;
const MPIR_OCT = AGED_CARE.mpir['2026-10-01'].value; // 0.0851, in force from 1 Oct 2026

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** A ten-month walk, 2026-09 through 2027-06 — inside `AGED_CARE_PERIODS` (2026-09-20 to 2027-09-19). */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 70,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);

// --- The door -------------------------------------------------------------------------------------

const withEntries = (household, entries) => ({
  ...DEMO_PLAN,
  household,
  entries,
  scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
});

const COUPLE_HOUSEHOLD = {
  persons: [person('Alex', '1957-06-01'), person('Blair', '1957-06-15')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(500_000),
};

const SINGLE_HOUSEHOLD = {
  persons: [person('Sam', '1957-06-01')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(2_000_000),
};

const validEnterCare = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(900_000), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(300_000) }, 'personA');
// **`radPaidAsLumpSum` is stated in TODAY's money (user ruling, 2026-09-25) — raised to
// `validEnterCare`'s own day, ONE month after `asAtDate` on this fixture's dates
// (`core/priceLevel.ts`'s `inflateStated`). Every hand-worked figure below that used to read the
// stated $300,000 reads this nominal one instead.**
const VALID_ENTER_CARE_RAD_NOMINAL = inflateStated(toCents(300_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');

test('door: owned by "household" is refused — entering care is one Person\'s own fact', () => {
  const bad = { ...validEnterCare, owner: 'household' };
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [bad])), /is "household", and entering permanent residential aged care is one Person's own fact/);
});

test('door: a Person not in the Household is refused', () => {
  const bad = { ...validEnterCare, owner: 'personB' };
  assert.throws(() => parsePlan(withEntries(SINGLE_HOUSEHOLD, [bad])), PlanFileEntryError);
});

test('door: a second ENTER_CARE for the same Person is refused', () => {
  const second = { ...validEnterCare, id: 'ec2' };
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [validEnterCare, second])), /is a SECOND ENTER_CARE entry for Alex/);
});

test('door: a negative homeValue, radPrice or radPaidAsLumpSum is refused', () => {
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [{ ...validEnterCare, params: { ...validEnterCare.params, homeValue: -1 } }])), /homeValue.*cannot be negative/s);
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [{ ...validEnterCare, params: { ...validEnterCare.params, radPrice: -1 } }])), /radPrice.*cannot be negative/s);
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [{ ...validEnterCare, params: { ...validEnterCare.params, radPaidAsLumpSum: -1 } }])), /negative lump sum/);
});

test('door: radPaidAsLumpSum above radPrice is refused', () => {
  const bad = { ...validEnterCare, params: { ...validEnterCare.params, radPaidAsLumpSum: toCents(300_001) } };
  assert.throws(() => parsePlan(withEntries(COUPLE_HOUSEHOLD, [bad])), /more than the RAD price/);
});

test('door: a valid ENTER_CARE parses whole and unchanged', () => {
  const parsed = parsePlan(withEntries(COUPLE_HOUSEHOLD, [validEnterCare]));
  assert.deepEqual(parsed.entries.at(-1).params, { homeValue: toCents(900_000), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(300_000) });
});

// --- The walk: RAD in full, a couple, one resident, the partner at home ---------------------------

test('couple, RAD in full: the RAD leaves cash as its own line, the Age Pension rises from the FOLLOWING month, and fees are the basic daily fee only', () => {
  const withCare = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare]);
  const without = project(SETTINGS, COUPLE_HOUSEHOLD, []);
  assert.equal(withCare.length, 10);
  assert.deepEqual(withCare.map((m) => m.month), without.map((m) => m.month));

  // **`radPaidAsLumpSum` is stated in TODAY's money (user ruling, 2026-09-25) and raised to the
  // entry's own day, ONE month after `asAtDate` on this fixture's own dates — `$300,000` becomes
  // `$300,000 × 1.025^(1/12)`, `core/priceLevel.ts`'s `inflateStated`, the same mechanism
  // `plan-money-basis-inventory.test.mjs` pins.** The RAD is still ONE line, in the entry's own
  // month, for the WHOLE (now-nominal) figure — nothing funds it in instalments and nothing else
  // moves the same amount.
  const entryMonth = withCare.find((m) => m.month === '2026-10');
  const radPaidNominal = inflateStated(toCents(300_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  assert.equal(lineSum(entryMonth, AGED_CARE_RAD_PAYMENT_LINE), radPaidNominal);
  assert.equal(withCare.filter((m) => lineSum(m, AGED_CARE_RAD_PAYMENT_LINE) > 0).length, 1);

  // **Home protected (Blair stays), income trivial (deeming on $500,000 cash can never reach the
  // $35,726.60 couple free area — even at the UPPER 3.75% deeming rate that is $18,750, well under
  // it), and each Person's own share of assets lands EXACTLY on the accommodation supplement.**
  // Combined other assets after the RAD = $200,000 cash + $300,000 RAD = $500,000, halved = $250,000
  // each. Asset-tested: 17.5% × ($219,858.40 − $66,500) / 364 = $26,837.72 / 364 = $73.73 exactly
  // (2,683,772 ÷ 364 = 7,373.00, no remainder) — which is EXACTLY `maxAccommodationSupplement`
  // ($73.73), so `remainder = max(0, 73.73 − 73.73) = 0`: hotelling and NCCC are both nil, and the
  // whole daily charge is the flat basic fee.
  for (const month of withCare) {
    assert.equal(lineSum(month, AGED_CARE_HOTELLING_LINE), 0);
    assert.equal(lineSum(month, AGED_CARE_NCCC_LINE), 0);
    assert.equal(lineSum(month, AGED_CARE_DAP_LINE), 0); // RAD in full: no outstanding balance
  }
  const daysInMonth = { '2026-09': 0, '2026-10': 31, '2026-11': 30, '2026-12': 31, '2027-01': 31, '2027-02': 28, '2027-03': 31, '2027-04': 30, '2027-05': 31, '2027-06': 30 };
  // **P14-17 — the published rate holds through 20 Mar 2027, then the SCHEDULE ITSELF regenerates.**
  // `AGED_CARE_PERIODS` used to hold `CURRENT` flat for the whole of this walk because nothing called
  // the forward mechanism at all; now a real boundary falls on 2027-03-20, so March (assessed from its
  // own month-start, before the 20th) still reads the published rate and April onward reads the
  // generated one — CPI/pension-driven and, for this rising fixture, higher.
  for (const month of withCare.slice(1, 7)) { // 2026-10 .. 2027-03
    assert.equal(lineSum(month, AGED_CARE_BASIC_FEE_LINE), CURRENT.basicDailyFee * daysInMonth[month.month]);
  }
  for (const month of withCare.slice(7)) { // 2027-04 .. 2027-06 — past the 2027-03-20 boundary
    assert.ok(
      lineSum(month, AGED_CARE_BASIC_FEE_LINE) > CURRENT.basicDailyFee * daysInMonth[month.month],
      `${month.month}: the basic fee must move once the generated schedule (P14-17) takes over`,
    );
  }
  assert.equal(lineSum(withCare[0], AGED_CARE_BASIC_FEE_LINE), 0); // the month before the entry: no fee at all

  // **The Age Pension: identical in the entry's OWN month (the entitlement is assessed off the
  // balance the month OPENED with, before the RAD leaves cash later in the same tick) and STRICTLY
  // HIGHER in every month after — the RAD asymmetry (exempt for the Age Pension) reaching the
  // walk.** The control: a household that never enters care never gets the exemption.
  const agePensionIn = (m) => lineSum(m, AGE_PENSION_LINE);
  assert.equal(agePensionIn(withCare[1]), agePensionIn(without[1])); // 2026-10, the entry's own month
  for (let i = 2; i < withCare.length; i += 1) {
    assert.ok(agePensionIn(withCare[i]) > agePensionIn(without[i]), `${withCare[i].month}: the Age Pension did not rise once the RAD was exempt`);
  }
});

// --- DAP only, then a split -------------------------------------------------------------------

test('single, DAP only (no lump sum): the whole RAD accrues as a daily accommodation payment', () => {
  const dapOnly = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(400_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project(SETTINGS, SINGLE_HOUSEHOLD, [dapOnly]);
  const october = walked.find((m) => m.month === '2026-10');
  assert.equal(lineSum(october, AGED_CARE_RAD_PAYMENT_LINE), 0);

  // Means test, hand-composed: income $0, other assets $2,000,000 (nothing paid as a RAD to add
  // back), no home. `agedCareMeansAssessment`/`agedCareFees` are the SAME functions
  // `core-aged-care.test.mjs` pins — composed here, not re-derived.
  const means = agedCareMeansAssessment(
    { couple: false, personNames: ['Sam'], combinedAssessableIncome: toCents(0), combinedAssessableAssetsExcludingHomeAndRad: toCents(2_000_000), combinedRadPaid: toCents(0), home: { netValue: toCents(0), homeIsProtected: false } },
    CURRENT,
  );
  const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  // **`radPrice` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to the entry's
  // own day, ONE month after `asAtDate` on this fixture, before the DAP arithmetic runs on it.**
  const radPriceNominal = inflateStated(toCents(400_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  const dap = agedCareAccommodationPayment(radPriceNominal, toCents(0), MPIR_OCT);
  assert.equal(lineSum(october, AGED_CARE_BASIC_FEE_LINE), fees.basicDailyFee * 31);
  assert.equal(lineSum(october, AGED_CARE_HOTELLING_LINE), fees.hotellingContribution * 31);
  assert.equal(lineSum(october, AGED_CARE_NCCC_LINE), fees.nonClinicalCareContribution * 31);
  assert.equal(lineSum(october, AGED_CARE_DAP_LINE), dap.dap * 31);
  assert.ok(dap.dap > 0);
});

test('single, a SPLIT (half lump sum, half DAP): the RAD line is the lump sum only, and the DAP is on the OUTSTANDING half', () => {
  const split = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(400_000), radPaidAsLumpSum: toCents(200_000) }, 'personA');
  const walked = project(SETTINGS, SINGLE_HOUSEHOLD, [split]);
  const october = walked.find((m) => m.month === '2026-10');
  // **`radPrice`/`radPaidAsLumpSum` are stated in TODAY's money (user ruling, 2026-09-25) — both
  // raised by the SAME factor to the entry's own day, so the OUTSTANDING half stays exactly half
  // the nominal price too.**
  const factorAtEntry = (cents) => inflateStated(cents, SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  const radPriceNominal = factorAtEntry(toCents(400_000));
  const radPaidNominal = factorAtEntry(toCents(200_000));
  assert.equal(lineSum(october, AGED_CARE_RAD_PAYMENT_LINE), radPaidNominal);

  // Cash after the split RAD: $2,000,000 less the nominal RAD paid. `combinedRadPaid` adds it back
  // for the aged care side of the ledger — the asymmetry, composed rather than re-derived. `dap` is
  // on the nominal amount STILL outstanding, at the SAME MPIR the DAP-only case used.
  const means = agedCareMeansAssessment(
    { couple: false, personNames: ['Sam'], combinedAssessableIncome: toCents(0), combinedAssessableAssetsExcludingHomeAndRad: toCents(2_000_000) - radPaidNominal, combinedRadPaid: radPaidNominal, home: { netValue: toCents(0), homeIsProtected: false } },
    CURRENT,
  );
  const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  const dap = agedCareAccommodationPayment(radPriceNominal, radPaidNominal, MPIR_OCT);
  assert.equal(dap.radOutstanding, radPriceNominal - radPaidNominal);
  assert.equal(lineSum(october, AGED_CARE_DAP_LINE), dap.dap * 31);
  assert.equal(lineSum(october, AGED_CARE_BASIC_FEE_LINE), fees.basicDailyFee * 31);
  assert.equal(lineSum(october, AGED_CARE_HOTELLING_LINE), fees.hotellingContribution * 31);
  assert.equal(lineSum(october, AGED_CARE_NCCC_LINE), fees.nonClinicalCareContribution * 31);
});

// --- The NCCC cap carries month to month --------------------------------------------------------

test('the NCCC contribution carries its running balance month to month, to the cent', () => {
  // At these means (the DAP-only fixture above), the daily NCCC is $109.45 — the dailyMax, not yet
  // capped by either the lifetime $ balance ($140,652.80) or the 1,460-day count: at $109.45/day
  // the lifetime cap alone takes ~1,285 days (~3.5 years) to exhaust, which is outside what a
  // hand-worked test can run through `project()` for a FRESH admission (there is no way to state a
  // partly-used cap — `startingNcccCapBalance` is the only seed `ENTER_CARE` has). What this test
  // proves instead is the thing P4-10's own precedent (the Work Bonus balance) is guarding against:
  // that the balance is WRITTEN BACK and carried, not recomputed from a stale or reset starting
  // point every month — verified by reproducing the exact multi-month total independently, day by
  // day, from `startingNcccCapBalance` alone. Full exhaustion is pinned at the pure-function level
  // in `core-aged-care.test.mjs` ("the NCCC stops at the lifetime dollar cap" / "at 1,460 days").
  const dapOnly = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(400_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project(SETTINGS, SINGLE_HOUSEHOLD, [dapOnly]);
  const months = ['2026-10', '2026-11', '2026-12'].map((month) => walked.find((m) => m.month === month));
  const days = [31, 30, 31];

  const means = agedCareMeansAssessment(
    { couple: false, personNames: ['Sam'], combinedAssessableIncome: toCents(0), combinedAssessableAssetsExcludingHomeAndRad: toCents(2_000_000), combinedRadPaid: toCents(0), home: { netValue: toCents(0), homeIsProtected: false } },
    CURRENT,
  );
  assert.equal(agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT)).nonClinicalCareContribution, CURRENT.nonClinicalCareContribution.dailyMax);

  let cap = startingNcccCapBalance(CURRENT);
  let expectedStartCap = cap.lifetimeCapRemaining;
  for (const [index, month] of months.entries()) {
    let monthTotal = 0;
    for (let day = 0; day < days[index]; day += 1) {
      const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, cap);
      monthTotal += fees.nonClinicalCareContribution;
      cap = fees.ncccCapBalanceAfter;
    }
    assert.equal(lineSum(month, AGED_CARE_NCCC_LINE), monthTotal, `${month.month}: the carried cap predicts a different total than the walk produced`);
  }
  // The three months together consumed exactly dailyMax × 92 days of the lifetime balance — the
  // cumulative proof that nothing reset it between months.
  const totalDays = days.reduce((sum, d) => sum + d, 0);
  assert.equal(expectedStartCap - cap.lifetimeCapRemaining, CURRENT.nonClinicalCareContribution.dailyMax * totalDays);
});

// --- The RAD is a refusal, never a silent shortfall -------------------------------------------

test('a RAD lump sum the household cannot fund is REFUSED, not left as an Unfunded shortfall', () => {
  const poor = { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(50_000) };
  const tooMuch = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(300_000) }, 'personA');
  assert.throws(
    () => project(SETTINGS, poor, [tooMuch]),
    /a RAD payment that cannot be funded in full is refused rather than left as an "Unfunded shortfall"/,
  );
  // **P16-3 — the refusal is a NAMED class, not a bare RangeError**, so `sustainableSpend`'s search
  // can tell this ground apart from every other refusal a walk can throw and carries the failing
  // month back rather than re-parsing it out of the message.
  try {
    project(SETTINGS, poor, [tooMuch]);
    assert.fail('the RAD refusal above must actually throw, or this assertion proves nothing');
  } catch (error) {
    assert.ok(error instanceof RadPaymentUnfundedError, `expected RadPaymentUnfundedError, got ${error.name}`);
    assert.equal(error.month, '2026-10');
  }
});

// --- P14-18b — the RAD is funded through the WHOLE Waterfall, not cash alone -------------------
//
// Most retirees pay a RAD out of superannuation, not running cash. `target` now carries the RAD
// lump sum (`projection.ts`, on `MORTGAGE_PAYOFF`'s own precedent), so the whole Waterfall —
// including the Account-Based Pension above its minimum — funds it, and only a genuine
// Waterfall-wide shortfall refuses it (moved off "cash on hand" alone).

const ABP_HOUSEHOLD = {
  persons: [
    {
      name: 'Sam',
      dateOfBirth: '1957-06-01',
      superInterests: [
        {
          phase: 'accountBasedPension',
          balance: toCents(2_000_000),
          statedAdministrationFeePerYear: toCents(0),
          statedAdministrationFeeRate: 0,
          statedInvestmentFeeRate: 0,
          statedStreamSettings: { commencementDay: '2020-07-01' },
        },
      ],
      parcels: [],
      employmentIncomePerFortnight: toCents(0),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(10_000), // nowhere near enough cash to cover a $750,000 RAD alone
};

test('a $750,000 RAD is funded through the Waterfall from the Account-Based Pension when cash cannot cover it — super falls, radHeld rises, total wealth continuous', () => {
  const radEntry = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(750_000), radPaidAsLumpSum: toCents(750_000) }, 'personA');
  const walked = project(SETTINGS, ABP_HOUSEHOLD, [radEntry]);
  const before = walked.find((m) => m.month === '2026-09');
  const entryMonth = walked.find((m) => m.month === '2026-10');
  assert.ok(before !== undefined && entryMonth !== undefined, 'the walk must actually reach the entry month, or this fixture proves nothing');

  // `radPaidAsLumpSum` is stated in TODAY's money (user ruling, 2026-09-25) — raised to the entry's
  // own day, ONE month after `asAtDate` on this fixture.
  const radPaidNominal = inflateStated(toCents(750_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  assert.equal(lineSum(entryMonth, AGED_CARE_RAD_PAYMENT_LINE), radPaidNominal);
  assert.ok(entryMonth.radHeld > 0, 'the RAD must actually be held, not merely paid and forgotten');
  // The Account-Based Pension payment (needed draw + compliance floor, one line per interest per
  // month — `PENSION_MINIMUM_LINE`) must have supplied almost all of the $750,000: the household's
  // whole cash position is $10,000, nowhere near enough on its own. A balance-delta check would be
  // confounded by this same month's investment growth, so the DRAW LINE is read directly instead.
  const pensionDrawn = entryMonth.lines
    .filter((l) => l.description.startsWith('Account-Based Pension payment'))
    .reduce((s, l) => s + l.amount, 0);
  assert.ok(
    pensionDrawn >= toCents(740_000),
    `the Account-Based Pension draw must fund almost all of the $750,000 RAD — cash alone ($10,000) could never — got ${pensionDrawn} cents`,
  );
  assert.ok(
    entryMonth.closingBalance >= 0,
    'cash must not have gone negative to cover a RAD that could never have come from cash alone',
  );
  // **Total wealth is continuous — no ~$750,000 cliff.** A RAD paid from the Account-Based Pension
  // moves the same dollar from `superBalance` to `radHeld`, so — unlike the cash-only P14-16 test
  // above, whose simple cash-line identity does not extend to a month with an internal super-to-cash
  // transfer in it (the pension DRAW line is itself a wealth-neutral transfer, not new money) — the
  // structural claim pinned here is the bound this fixture's own modest fees/retention/shortfall
  // this same month cannot come close to: total wealth must not fall by anything near the RAD.
  assert.ok(
    Math.abs(totalWealth(entryMonth) - totalWealth(before)) < toCents(50_000),
    `total wealth must not drop by anything near the RAD itself — moved by ${totalWealth(entryMonth) - totalWealth(before)} cents`,
  );
});

// **P16-3 — the RAD refusal fires ONLY on the Waterfall's own target (spend + RAD), never on an
// ordinary shortfall the SAME month's ONGOING fees leave behind.** Found while investigating why
// `sustainableSpend()` broke on a RAD-paying plan: the demo couple's own RAD month funds the
// $750,000 RAD in full and still carries a genuine $5,505 `Unfunded shortfall` for that month's
// basic fee and hotelling contribution — and that is P14-18's own ruling working as designed, not a
// second bug the RAD's refusal should have caught. The two are DIFFERENT facts about the same tick
// (RAD: refuse if the whole Waterfall cannot fund it; ongoing fees: report a shortfall like any
// other unmet cost) and this pins them staying apart on a minimal fixture, rather than trusting the
// much larger demo-couple walk alone to prove it.
test('a RAD fully funded through the Waterfall does not suppress an ordinary shortfall the SAME month\'s ongoing fees leave behind', () => {
  // `radPaidAsLumpSum` is stated in TODAY's money (user ruling, 2026-09-25) — raised to the entry's
  // own day, ONE month after `asAtDate` on this fixture. The balance is set to that SAME nominal
  // figure, exactly, and not one cent for the fees due the same month — the fixture's own premise.
  const radPaidNominal = inflateStated(toCents(750_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  const tightHousehold = {
    persons: [
      {
        name: 'Sam',
        dateOfBirth: '1957-06-01',
        superInterests: [
          {
            phase: 'accountBasedPension',
            balance: radPaidNominal,
            statedAdministrationFeePerYear: toCents(0),
            statedAdministrationFeeRate: 0,
            statedInvestmentFeeRate: 0,
            statedStreamSettings: { commencementDay: '2020-07-01' },
          },
        ],
        parcels: [],
        employmentIncomePerFortnight: toCents(0),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(0),
  };
  const radEntry = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(750_000), radPaidAsLumpSum: toCents(750_000) }, 'personA');
  // Must not throw `RadPaymentUnfundedError` — the Waterfall's own target (the RAD, nothing else
  // stated) is funded in full — even though the same month is genuinely short elsewhere.
  const walked = project(SETTINGS, tightHousehold, [radEntry]);
  const entryMonth = walked.find((m) => m.month === '2026-10');
  assert.ok(entryMonth !== undefined, 'the walk must actually reach the entry month, or this fixture proves nothing');
  assert.equal(lineSum(entryMonth, AGED_CARE_RAD_PAYMENT_LINE), radPaidNominal, 'the RAD must be paid in full');
  const pensionDrawn = entryMonth.lines
    .filter((l) => l.description.startsWith('Account-Based Pension payment'))
    .reduce((s, l) => s + l.amount, 0);
  assert.equal(pensionDrawn, radPaidNominal, 'the Waterfall must have drawn exactly the RAD target — no more, no less');
  const feesThisMonth =
    lineSum(entryMonth, AGED_CARE_BASIC_FEE_LINE) + lineSum(entryMonth, AGED_CARE_HOTELLING_LINE) + lineSum(entryMonth, AGED_CARE_NCCC_LINE);
  assert.ok(feesThisMonth > 0, 'the fixture must actually charge a fee, or the shortfall below proves nothing');
  assert.equal(
    lineSum(entryMonth, SHORTFALL_LINE),
    feesThisMonth,
    'the shortfall must be exactly the ongoing fees the emptied account could not also cover — the RAD itself already left nothing owing',
  );
});

test('a RAD beyond EVERYTHING the household has — cash and super both — is still refused, not funded from thin air', () => {
  const poorAndSmallSuper = {
    persons: [
      {
        name: 'Sam',
        dateOfBirth: '1957-06-01',
        superInterests: [
          {
            phase: 'accountBasedPension',
            balance: toCents(50_000),
            statedAdministrationFeePerYear: toCents(0),
            statedAdministrationFeeRate: 0,
            statedInvestmentFeeRate: 0,
            statedStreamSettings: { commencementDay: '2020-07-01' },
          },
        ],
        parcels: [],
        employmentIncomePerFortnight: toCents(0),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const radEntry = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(750_000), radPaidAsLumpSum: toCents(750_000) }, 'personA');
  assert.throws(
    () => project(SETTINGS, poorAndSmallSuper, [radEntry]),
    /a RAD payment that cannot be funded in full is refused rather than left as an "Unfunded shortfall"/,
  );
});

// --- P14-17: forward indexation past the one published year — the defect this closes -------------
//
// Until 2026-09-25, `project()` refused ANY month with a resident in care past 19 Sep 2027, because
// `indexAgedCareSchedule` (built in slice 1) was never called by anything. `agedCarePeriodsThrough`
// (`data/assumptions/agedCare.ts`) now extends the residential schedule forward on its own 20 Mar /
// 1 Jul / 20 Sep calendar — `agePension.ts`'s own answer to the identical published-window problem,
// mirrored — and the refusal narrows to the one case that is still genuinely unpriceable: a date
// before anything has been published at all.

test('P14-17 — a resident entering care in 2056, decades past the published aged care schedule, walks to the horizon with no refusal', () => {
  const farFuture = entry('ec', 'ENTER_CARE', '2056-02-01', { homeValue: toCents(0), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project({ ...SETTINGS, planningHorizonAge: 100 }, SINGLE_HOUSEHOLD, [farFuture]);
  const entryMonth = walked.find((m) => m.month === '2056-02');
  assert.ok(entryMonth !== undefined, 'the walk must actually reach 2056-02, or this fixture proves nothing');
  const dailyFee2056 = lineSum(entryMonth, AGED_CARE_BASIC_FEE_LINE) / 29; // February 2056 — a leap year, 29 days
  assert.ok(dailyFee2056 > 0, 'a fee must actually be charged this month');
  // **Not merely "no throw" — the fee must have actually MOVED off the 2026 published rate.** A
  // silent flat carry of the last published schedule across thirty years would ALSO reach this month
  // without refusing, which is exactly the "priced on stale rates" failure this brief closes, so
  // this is the assertion that would catch that regression where the "no refusal" one alone cannot.
  assert.ok(dailyFee2056 > CURRENT.basicDailyFee, '2056 must be genuinely re-indexed, not a stale carry of the 2026 rate');
  const last = walked.at(-1);
  assert.ok(lineSum(last, AGED_CARE_BASIC_FEE_LINE) > 0, 'the walk must run all the way to the horizon with the resident still in care and still being charged');
});

test('a date before the first published aged care schedule is still refused — the one-sided refusal left after P14-17', () => {
  // `ENTER_CARE` is a level and may predate `asAtDate` (P14-5a's own precedent) — backdated well
  // before 20 Sep 2026, the entry is a CARRIED fact applying from the walk's own first month, and
  // `SETTINGS.asAtDate` ('2026-09-16') itself falls before the first published schedule date.
  const enteredBeforeAnythingWasPublished = entry('ec', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(0), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  assert.throws(
    () => project(SETTINGS, SINGLE_HOUSEHOLD, [enteredBeforeAnythingWasPublished]),
    /aged care before 2026-09-20, the first published aged care schedule/,
  );
});

// --- The partner dies: the home is no longer protected, and its value counts ----------------------

test('the partner dies: the home stops being protected, and its capped value joins the means test that same month', () => {
  const death = entry('d1', 'DEATH', '2027-01-01', {}, 'personB');
  const walked = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare, death]);

  const beforeDeath = ['2026-10', '2026-11', '2026-12'].map((month) => walked.find((m) => m.month === month));
  for (const month of beforeDeath) {
    assert.equal(lineSum(month, AGED_CARE_HOTELLING_LINE), 0);
    assert.equal(lineSum(month, AGED_CARE_NCCC_LINE), 0);
  }
  // **The death month itself, singly-tested from the survivor's own means (P12-1's own precedent:
  // the Age Pension survivor test starts the SAME month).** Cash after the RAD: $200,000; the RAD
  // itself $300,000 added back; the home now assessed at the SINGLE cap, $219,858.40 (not halved —
  // there is no couple left) rather than exempt. Composed via the same pure functions, not
  // re-derived band by band.
  const january = walked.find((m) => m.month === '2027-01');
  const means = agedCareMeansAssessment(
    {
      couple: false,
      personNames: ['Alex'],
      combinedAssessableIncome: toCents(0),
      combinedAssessableAssetsExcludingHomeAndRad: toCents(200_000),
      combinedRadPaid: toCents(300_000),
      home: { netValue: toCents(900_000), homeIsProtected: false },
    },
    CURRENT,
  );
  assert.equal(means.perPerson[0].homeAssessedValue, CURRENT.thresholds.homeExemptionCap);
  const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  assert.ok(fees.hotellingContribution > 0, 'the home joining the test must raise the means tested amount past the accommodation supplement');
  assert.equal(lineSum(january, AGED_CARE_HOTELLING_LINE), fees.hotellingContribution * 31);
  assert.ok(lineSum(january, AGED_CARE_NCCC_LINE) > 0);
});

// --- P14-16: the RAD does not vanish from wealth, is retained monthly, and refunds on death -------
//
// Slice 3a kept the paid RAD in a walk-local `radBalance` no `Month` reported — found at review,
// 2026-09-24 (TODO.md). These tests pin the fix: `Month.radHeld`, folded into total wealth (both
// `protectedAssets` and the table's `closingBalance + superBalance + closingNonSuperPortfolio +
// radHeld`), retained at 2%/year (`agedCareRadRetentionDeduction`, already built in slice 2 and
// unused until now), and refunded — less retention — to cash in the resident's DEATH month.

const totalWealth = (m) => m.closingBalance + m.superBalance + m.closingNonSuperPortfolio + (m.radHeld ?? 0);

test('total wealth is continuous across the entry month: it moves only by the month’s cash flows and retention, never by -RAD', () => {
  const walked = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare]);
  const before = walked.find((m) => m.month === '2026-09');
  const entryMonth = walked.find((m) => m.month === '2026-10');
  assert.equal(before.radHeld, undefined); // no ENTER_CARE has applied yet
  assert.ok(entryMonth.radHeld > 0);

  // Total wealth moves by exactly this month's cash lines OTHER than the RAD payment itself (which
  // is offset, cent for cent, by the RAD joining `radHeld`) less the retention `effect: 'wealth'`
  // line — never by the $300,000 the RAD payment line alone reads.
  const cashIn = entryMonth.lines.filter((l) => l.effect === 'cash' && l.direction === 'inflow').reduce((s, l) => s + l.amount, 0);
  const nonRadCashOut = entryMonth.lines
    .filter((l) => l.effect === 'cash' && l.direction === 'outflow' && l.description !== AGED_CARE_RAD_PAYMENT_LINE)
    .reduce((s, l) => s + l.amount, 0);
  const retentionOut = lineSum(entryMonth, AGED_CARE_RAD_RETENTION_LINE);
  assert.equal(totalWealth(entryMonth) - totalWealth(before), cashIn - nonRadCashOut - retentionOut);
  assert.ok(Math.abs(totalWealth(entryMonth) - totalWealth(before)) < toCents(300_000), 'total wealth must not drop by anything near the RAD itself');
});

test('the RAD is a real band in the wealth chart too: protectedAssets rises by the RAD from the month AFTER it is paid', () => {
  const walked = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare]);
  const entryMonth = walked.find((m) => m.month === '2026-10'); // assessed on what the month OPENS with — the RAD is not yet paid
  const following = walked.find((m) => m.month === '2026-11');
  assert.equal(entryMonth.protectedAssets, entryMonth.assetsByPerson[0].protectedAssets + entryMonth.assetsByPerson[1].protectedAssets);
  // `following`'s OPENING radHeld is October's CLOSING one: the RAD paid in October, less the
  // retention October itself withheld from it (the first month's accrual, so this is the whole of it).
  assert.equal(following.protectedAssets - entryMonth.protectedAssets, VALID_ENTER_CARE_RAD_NOMINAL - lineSum(entryMonth, AGED_CARE_RAD_RETENTION_LINE));
  // Alex (index 0) paid the RAD, and it is HIS asset, not Blair's (index 1).
  assert.ok(following.assetsByPerson[0].protectedAssets > entryMonth.assetsByPerson[0].protectedAssets);
});

test('RAD retention accrues at 2%/year, cumulative to the cent, and lands as a wealth line — never cash', () => {
  const walked = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare]);
  const months = ['2026-10', '2026-11', '2026-12'].map((month) => walked.find((m) => m.month === month));
  const days = [31, 30, 31];
  let cumulativeDays = 0;
  let previousRetention = 0;
  for (const [index, month] of months.entries()) {
    cumulativeDays += days[index];
    const cumulative = agedCareRadRetentionDeduction(VALID_ENTER_CARE_RAD_NOMINAL, cumulativeDays, AGED_CARE.radRetention.value);
    assert.equal(lineSum(month, AGED_CARE_RAD_RETENTION_LINE), cumulative - previousRetention, month.month);
    const line = month.lines.find((l) => l.description === AGED_CARE_RAD_RETENTION_LINE);
    assert.equal(line.effect, 'wealth');
    assert.equal(line.direction, 'outflow');
    previousRetention = cumulative;
  }
  assert.ok(previousRetention > 0);
  // And `radHeld` carries the balance NET of it — never the raw amount paid.
  assert.equal(months.at(-1).radHeld, VALID_ENTER_CARE_RAD_NOMINAL - previousRetention);
});

test('the resident dies: the RAD refunds to cash, exactly the balance less retention withheld, and the Age Pension assesses it from that same month', () => {
  const residentDies = entry('d2', 'DEATH', '2027-01-01', {}, 'personA');
  const partnerDies = entry('d1', 'DEATH', '2027-01-01', {}, 'personB');
  const residentWalk = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare, residentDies]);
  const partnerWalk = project(SETTINGS, COUPLE_HOUSEHOLD, [validEnterCare, partnerDies]);

  // Identical through December — the two walks differ only in WHO dies, and a death is not
  // processed before its own month.
  const decemberResident = residentWalk.find((m) => m.month === '2026-12');
  const decemberPartner = partnerWalk.find((m) => m.month === '2026-12');
  assert.equal(decemberResident.closingBalance, decemberPartner.closingBalance);
  assert.equal(decemberResident.assessableAssets, decemberPartner.assessableAssets);
  assert.equal(decemberResident.radHeld, decemberPartner.radHeld);

  const january = residentWalk.find((m) => m.month === '2027-01');
  const januaryControl = partnerWalk.find((m) => m.month === '2027-01'); // the partner died: no refund

  const daysHeld = 31 + 30 + 31; // October, November, December — held right up to the death month
  const retentionWithheld = agedCareRadRetentionDeduction(VALID_ENTER_CARE_RAD_NOMINAL, daysHeld, AGED_CARE.radRetention.value);
  const expectedRefund = VALID_ENTER_CARE_RAD_NOMINAL - retentionWithheld;
  assert.equal(lineSum(january, AGED_CARE_RAD_REFUND_LINE), expectedRefund);
  const refundLine = january.lines.find((l) => l.description === AGED_CARE_RAD_REFUND_LINE);
  assert.equal(refundLine.direction, 'inflow');
  assert.equal(refundLine.effect, 'cash');
  assert.equal(january.radHeld, 0); // fully refunded — nothing left to hold

  // **The Age Pension assesses the refunded cash from THIS SAME MONTH.** The control walk (the
  // partner dies, so no refund) is otherwise identical up to this point, so the whole gap is the
  // refund, to the cent — and the higher assessable figure taxes the survivor's pension down, never up.
  assert.equal(january.assessableAssets - januaryControl.assessableAssets, expectedRefund);
  assert.ok(lineSum(january, AGE_PENSION_LINE) <= lineSum(januaryControl, AGE_PENSION_LINE));
});

const POOR_CARE_HOUSEHOLD = { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(303_000) };
const tightEnterCare = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(0), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(300_000) }, 'personA');
const bigSpend = entry('sc', 'SPEND_CHANGE', '2026-11-01', { annualSpend: toCents(600_000) });

test('the Waterfall cannot draw on the RAD: a genuine later shortfall leaves it untouched, falling only by retention', () => {
  const walked = project(SETTINGS, POOR_CARE_HOUSEHOLD, [tightEnterCare, bigSpend]);
  const october = walked.find((m) => m.month === '2026-10');
  const november = walked.find((m) => m.month === '2026-11');
  assert.equal(lineSum(october, SHORTFALL_LINE), 0, 'October must pay the RAD and its own fee cleanly, or this test proves the wrong thing');
  assert.ok(lineSum(november, SHORTFALL_LINE) > 0, 'the fixture must actually run short in November, or this test proves nothing');
  assert.equal(november.closingBalance, 0);
  assert.ok(october.radHeld > 0);
  assert.ok(november.radHeld > 0, 'the RAD must still be held — never drawn on to cover the shortfall');
  const retentionInNovember = lineSum(november, AGED_CARE_RAD_RETENTION_LINE);
  assert.equal(october.radHeld - november.radHeld, retentionInNovember, 'the only fall permitted is retention, never a draw to cover the shortfall');
});

// --- P14-5a: the Age Pension side of a home nobody lives in any more ------------------------------
//
// SS Act s 11A(9)(b) / DSS Guide 4.6.3.70: a home vacated for a CARE SITUATION stays exempt for a
// flat 2 years from the date nobody protecting it remains, "irrespective of whether the recipient
// intends to return"; past that, "the income support recipient is treated as a non-homeowner, AND
// principal home is an assessable asset". The aged care rate schedule (`AGED_CARE_PERIODS`) is
// published for exactly one year (2026-09-20 to 2027-09-19), and once ANY Person's `careOn` is set
// the walk must stay inside that window for every month it produces (the refusal pinned two tests
// up) — so a fixture cannot show a full 24 months of walked output AND stay inside the window
// unless the clock has ALREADY been running before the walk starts. `ENTER_CARE` is a LEVEL
// (`ENTRY_KIND`), so it is allowed to predate `asAtDate` — a household stating a fact about care
// that already started, exactly as `RETIRE` or `TTR_RATE_CHANGE` may (P4-1d) — and `careOn[i]`
// carries the entry's own true day regardless of which month it is APPLIED in. Every fixture below
// exploits exactly that: the clock starts BEFORE `asAtDate`, so its 24-month cliff lands inside the
// one-year window the walk can actually observe. `DEATH`, by contrast, may never predate `asAtDate`
// (`deathOf`'s own refusal — "state it as a Household of one"), so a death that removes the LAST
// protecting Person cannot be walked 24 more months before the aged-care window's own end: that
// scenario is represented here, as `deathOf`'s own doctrine says it must be, as a single-Person
// Household — the survivor, already alone.
const CARE_CLIFF_SETTINGS = { ...SETTINGS, asAtDate: '2026-10-16' }; // '2026-10' is the first month `agedCareParametersCover` admits (the published window opens 2026-09-20, and `date` is always the 1st)

// `assessableAssets` for these fixtures is CASH ALONE (no parcels, no super) except where the home
// joins it, so this identity — this month's assessable figure is exactly last month's closing
// balance — is what "the home added nothing" looks like, hand-worked without re-deriving the fee
// arithmetic `core-aged-care.test.mjs` already owns.
const noHomeJump = (before, after) => assert.equal(after.assessableAssets, before.closingBalance, `${after.month}: assessableAssets moved by more than the month's own cash flows — something besides cash (the home?) reached it`);

// **`homeValue` is stated in TODAY's money (user ruling, 2026-09-25, superseding P14-5a's original
// "carried on CPI from the entry's own day"): the vacated-home assessment now raises the SAME
// $900,000 from `CARE_CLIFF_SETTINGS.asAtDate` ('2026-10-16') straight to the assessing month
// ('2027-03'), `core/priceLevel.ts`'s `inflateStated` — five months of the walk's own CPI, not the
// 24 months since the (irrelevant, now) entry day. Both fixtures below share this one figure because
// both land on the SAME assessing month off the SAME `asAtDate` and the SAME stated home value.**
const CPI_CARRIED_HOME_TO_MARCH_2027 = inflateStated(toCents(900_000), CARE_CLIFF_SETTINGS.economicSeries.cpi, CARE_CLIFF_SETTINGS.asAtDate, '2027-03');

test('P14-5a — a lone survivor enters care: the Age Pension is unchanged for 24 months, then the CPI-carried home value joins the assets test from month 25, and the Age Pension drops', () => {
  const survivor = { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(150_000) };
  // Backdated 24 months before the cliff this fixture is built to land on: 2025-03 + 24 = 2027-03,
  // squarely inside the 9-month walk (2026-10..2027-06) this Settings/DOB pair produces.
  const enteredCare = entry('ec', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project(CARE_CLIFF_SETTINGS, survivor, [enteredCare]);
  assert.equal(walked.length, 9);
  assert.deepEqual(walked.map((m) => m.month), ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06']);

  const [oct, nov, dec, jan, feb, mar] = walked;
  assert.equal(oct.assessableAssets, toCents(150_000)); // the walk's own opening figure, month 1
  for (const [before, after] of [[oct, nov], [nov, dec], [dec, jan], [jan, feb]]) noHomeJump(before, after);

  // The exemption held for the whole of it: the same Age Pension every month, 2026-10 through
  // 2027-02 — five months of "unchanged", the clock's own last five before the cliff.
  const agePensionRates = [oct, nov, dec, jan, feb].map((m) => lineSum(m, AGE_PENSION_LINE));
  assert.deepEqual(agePensionRates, agePensionRates.map(() => agePensionRates[0]));
  assert.ok(agePensionRates[0] > 0, 'the fixture must actually pay something before the cliff, or "unchanged" proves nothing');

  // Month 25 (2027-03): the CPI-carried, mortgage-netted (nil mortgage here) home value joins
  // assessableAssets, to the cent, and nothing else moved that this month's own cash lines do not
  // already explain.
  assert.equal(mar.assessableAssets, feb.closingBalance + CPI_CARRIED_HOME_TO_MARCH_2027);
  assert.ok(lineSum(mar, AGE_PENSION_LINE) < agePensionRates[0], 'the Age Pension must drop once the home is assessed');
});

test('P14-5a — a couple both in care: the clock runs from the SECOND entry, not the first', () => {
  const couple = { persons: [person('Alex', '1957-06-01'), person('Blair', '1957-06-15')], homeStatus: 'occupied', openingOffsetBalance: toCents(150_000) };
  // Blair enters first, years before the walk even starts — if the clock ran from Blair's entry the
  // cliff would already be long past by 2026-10. Alex enters SECOND, on the same day the lone
  // survivor above did, so the cliff lands on the identical month and the CPI figure is comparable.
  // Both entries state the SAME $900,000 — one house, one fact — and `careEntry.find` (P14-13's own
  // lookup, reused here) reads Alex's (personA, checked first), which is also the later date: the
  // CPI anchor and the protection clock agree for this fixture, so the same 24-month factor applies.
  const blairFirst = entry('ecB', 'ENTER_CARE', '2023-01-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personB');
  const alexSecond = entry('ecA', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project(CARE_CLIFF_SETTINGS, couple, [blairFirst, alexSecond]);
  assert.equal(walked.length, 9);

  const [oct, nov, dec, jan, feb, mar] = walked;
  for (const [before, after] of [[oct, nov], [nov, dec], [dec, jan], [jan, feb]]) noHomeJump(before, after);
  const beforeRate = lineSum(feb, AGE_PENSION_LINE);
  assert.ok(beforeRate > 0, 'the fixture must actually pay something before the cliff, or the drop below proves nothing');

  assert.equal(mar.assessableAssets, feb.closingBalance + CPI_CARRIED_HOME_TO_MARCH_2027);
  assert.ok(lineSum(mar, AGE_PENSION_LINE) < beforeRate, 'the Age Pension must drop once the home is assessed, from the SECOND entry');
});

test('P14-5a — a partner still at home: the home is never assessed, however long the other has been in care', () => {
  const couple = { persons: [person('Alex', '1957-06-01'), person('Blair', '1957-06-15')], homeStatus: 'occupied', openingOffsetBalance: toCents(150_000) };
  // Alex entered care in 2025-03 — the SAME date that triggers the cliff in the two tests above —
  // and Blair never enters care and never dies: the home stays protected. Walked to the SAME
  // horizon (9 months, through what would be month 16 since Alex's entry), well past what the cliff
  // WOULD be if Blair's presence did not protect it, to prove this is not merely "not yet 24 months".
  const alexOnly = entry('ecA', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const walked = project(CARE_CLIFF_SETTINGS, couple, [alexOnly]);
  assert.equal(walked.length, 9);
  for (let i = 1; i < walked.length; i += 1) noHomeJump(walked[i - 1], walked[i]);
});

test('P14-5a — no stated value: the named refusal is kept', () => {
  // No `ENTER_CARE` entry at all — the pre-existing `homeStatus`-only path (`VACATE_HOME`, P3-15),
  // which has no `ENTER_CARE` behind it to read a value from and so still refuses, exactly as
  // `test/core-projection-age-pension.test.mjs`'s own version of this fixture already pins.
  const stale = { persons: [person('Sam', '1957-06-01')], homeStatus: 'vacatedBeyondTwoYearExemption', openingOffsetBalance: toCents(150_000) };
  assert.throws(() => project(SETTINGS, stale, []), /UnvaluedAssessableHomeError|s 1121\(5\)/);
});

// --- P14-17 lifts the bound: the LITERAL version of P14-5a's death-through-the-cliff scenario -----
//
// `project-p14-5a-age-pension-vacated-home`'s own note: a `DEATH` cannot predate `asAtDate`
// (`deathOf`'s own refusal), so where a death is what removes the LAST protecting person, the
// 2-year clock starts on a WALKED date and must be walked 24 more months while `agedCareParametersCover`
// holds throughout — impossible while the aged care window was capped at one published year. Now
// that the schedule regenerates forward without limit, this is walkable in full: Alex (personA)
// already entered care before `asAtDate` (a level, so this is allowed), Blair (personB) — the one
// still living at home — dies DURING the walk, and Blair's death, not Alex's care, is the LATER of
// the two removal dates (`protectorRemovedOn`'s own `min(careDate, deathDate)` per person, then the
// LATEST across the household), so the clock starts on Blair's death date, not Alex's care date.
test('P14-5a, the literal version — a couple, one dies, the survivor already in care, 24 months pass and the home becomes assessable', () => {
  const couple = { persons: [person('Alex', '1957-06-01'), person('Blair', '1957-06-15')], homeStatus: 'occupied', openingOffsetBalance: toCents(150_000) };
  const alexAlreadyInCare = entry('ecA', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const blairDies = entry('d1', 'DEATH', '2026-10-20', {}, 'personB');
  const settings = { ...SETTINGS, asAtDate: '2026-10-16', planningHorizonAge: 72 };
  const walked = project(settings, couple, [alexAlreadyInCare, blairDies]);

  // Blair's death is the clock's start: `monthsBetween('2026-10-20', month) >= 24` first holds at
  // 2028-10 (the day-of-month is irrelevant to `monthsBetween`, which counts whole months only).
  const beforeCliff = walked.find((m) => m.month === '2028-09');
  const atCliff = walked.find((m) => m.month === '2028-10');
  assert.ok(beforeCliff !== undefined && atCliff !== undefined, 'the walk must actually reach the cliff, or this fixture proves nothing');

  for (const [before, after] of [['2026-11', '2026-12'], ['2027-06', '2027-07'], ['2028-01', '2028-02']]) {
    noHomeJump(walked.find((m) => m.month === before), walked.find((m) => m.month === after));
  }
  const monthBeforeCliff = walked.find((m) => m.month === '2028-08');
  noHomeJump(monthBeforeCliff, beforeCliff);

  // **The CPI base is `settings.asAtDate` (2026-10-16), never Alex's entry date and never Blair's
  // death date (user ruling, 2026-09-25, superseding P14-5a's original "carried from the entry's own
  // day"): `homeValue` is stated in TODAY's money, so it is raised straight from `asAtDate` to the
  // assessing month, composed here via the real `inflateStated`, not re-derived by hand.**
  const expectedHomeValue = inflateStated(toCents(900_000), settings.economicSeries.cpi, settings.asAtDate, '2028-10');
  assert.equal(atCliff.assessableAssets, beforeCliff.closingBalance + expectedHomeValue);

  const rateBeforeCliff = lineSum(beforeCliff, AGE_PENSION_LINE);
  assert.ok(rateBeforeCliff > 0, 'the fixture must actually pay something before the cliff, or the drop below proves nothing');
  assert.ok(lineSum(atCliff, AGE_PENSION_LINE) < rateBeforeCliff, 'the Age Pension must drop once the home is assessed');
});

// --- P14-18a — demo couple review, 2056-01: low hotelling/NCCC is the FORMULA, not a defect --------
//
// **Finding (review 2026-09-25): the low fees are correct.** Alex enters care 2056-01-01 with the
// home ($1.2m, Sam remains there — protected) and a $750,000 room price part-funded by a $300,000
// RAD lump sum. `Month.assessableAssets` for 2056-01 is $1,179,586.69 (combined) — super IS in that
// figure (both are ABP, both are Age Pension age by 2056, and `superInterestTreatment`'s
// younger-partner exemption is an ACCUMULATION-phase, under-pension-age rule that does not apply
// here — see [[project-sacrifice-means-test-asymmetry]] for the exemption itself). Per Person that
// is $589,793.35 — between the 2056 (CPI-carried) "second" and "third" asset-band boundaries, NOT
// past the uncapped top band, so the 17.5%/0%/7.8%/0%/7.8% taper (health.gov.au's own band shape,
// pinned to the cent against Sakura's and Raj's worked examples in `core-aged-care.test.mjs`) gives
// an asset-tested amount of $160.62/day. The 2056 maximum accommodation supplement — itself CPI-
// carried from $73.73 (2026) to ~$150.22/day by 2056, the SAME movement every other figure here
// moves by — is subtracted FIRST (the health.gov.au waterfall `FEE_WATERFALL_ORDER` quotes, and
// Raj's own worked example already shows a moderately-above-the-free-area resident paying BELOW the
// hotelling max for exactly this reason), leaving only ~$10.40/day for hotelling and nothing at all
// for the NCCC. A resident's own wealth needs to clear the accommodation supplement by MORE than the
// hotelling max (2056: ~$46.00/day) before the NCCC starts at all — Raj, in the SOURCE example, is
// $1.75/day short of that and pays zero NCCC too, so this household's own zero is the same shape as
// the primary source's own worked case, not a symptom of a missing input.
//
// **What this test pins, independent of the fee block under test:** (a) a FLOOR on
// `Month.assessableAssets` well above what cash alone could produce, so a regression that drops
// super back out of the aged-care assessable pool (the brief's own first suspect) fails this before
// it ever reaches the banded taper; (b) the exact hotelling/NCCC cents for 2056-01, reproduced by
// feeding that walk fact through the SAME `agedCareMeansAssessment`/`agedCareFees` pair
// `core-aged-care.test.mjs` already pins to the cent against health.gov.au's own Sakura/Raj examples
// — this file's own stated convention (see the header) for testing WIRING rather than re-deriving
// the band arithmetic a second time; (c) the period thresholds are re-derived through a SECOND call
// to `agedCarePeriodsThrough` (the same pure, already-P14-17-tested indexation chain, called fresh
// here rather than read off `project()`'s own closure) so a stale or mis-selected period would also
// be caught. The income test is bounded, not reproduced: the walk's actual deemed income cannot
// exceed 3.75% (the plan's own deeming UPPER rate) of the combined pool even in the worst case, and
// even that generous ceiling sits under the 2056 couple income free area — so the true figure, sight
// unseen, still taxes the income test at zero.
test('P14-18a — demo couple review fixture: 2056-01 hotelling/NCCC hand-worked, and low is correct (not a defect)', () => {
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, 'fixtures', 'demo-couple.plan.json'), 'utf8'));
  const RAD_PAID = toCents(300_000);
  raw.entries.push({
    id: 'care2056',
    type: 'ENTER_CARE',
    date: '2056-01-01',
    owner: 'personA',
    enabled: true,
    createdAt: '2026-09-25',
    params: { homeValue: toCents(1_200_000), radPrice: toCents(750_000), radPaidAsLumpSum: RAD_PAID },
  });
  raw.scenarios[0].entryIds.push('care2056');
  const plan = parsePlan(raw);
  const walked = project(plan.settings, plan.household, plan.entries.filter((e) => plan.scenarios[0].entryIds.includes(e.id)));
  const jan2056 = walked.find((m) => m.month === '2056-01');
  assert.ok(jan2056 !== undefined, 'the demo couple walk must actually reach 2056-01, or this fixture proves nothing');

  // (a) The floor — a regression that dropped super out of the aged-care pool would leave roughly
  // cash alone (well under $500,000 combined at this point in the walk), nowhere near this bound.
  assert.ok(
    jan2056.assessableAssets > toCents(1_000_000),
    `combined assessable assets should be well over $1,000,000 by 2056-01 (super included) — got ${jan2056.assessableAssets} cents`,
  );

  // (b)/(c) — an independent second call to the SAME forward-indexation chain `project()` itself
  // uses, never read off its closure.
  const periods = agedCarePeriodsThrough('2060-12-31', plan.settings.economicSeries.cpi, () => toCents(0));
  const period = agedCarePeriodAt('2056-01-01', periods);

  const combinedOtherAssets = jan2056.assessableAssets; // the RAD nets out exactly: (assessableAssets − radPaidThisMonth) + combinedRadPaid = assessableAssets
  const incomeUpperBoundCents = Math.ceil(combinedOtherAssets * plan.settings.deemingRates.upper); // a ceiling: real deeming is a BLEND of the lower and upper rate, never fully the upper rate on the whole pool
  const assessment = agedCareMeansAssessment(
    {
      couple: true,
      personNames: ['Alex', 'Sam'],
      combinedAssessableIncome: incomeUpperBoundCents,
      combinedAssessableAssetsExcludingHomeAndRad: jan2056.assessableAssets - RAD_PAID,
      combinedRadPaid: RAD_PAID,
      home: { netValue: toCents(0), homeIsProtected: true }, // Sam remains at home — the net value is irrelevant once protected
    },
    period.rates,
  );
  const [alex] = assessment.perPerson;
  assert.equal(alex.incomeTestedAmountPerDay, 0, 'even the generous upper-bound deeming ceiling sits under the 2056 couple income free area');

  const fees = agedCareFees(alex.meansTestedAmountPerDay, period.rates, startingNcccCapBalance(period.rates));
  const DAYS_IN_JAN = 31;
  assert.equal(lineSum(jan2056, AGED_CARE_HOTELLING_LINE), fees.hotellingContribution * DAYS_IN_JAN);
  assert.equal(lineSum(jan2056, AGED_CARE_NCCC_LINE), fees.nonClinicalCareContribution * DAYS_IN_JAN);
  assert.equal(fees.nonClinicalCareContribution, 0, 'the finding: NCCC is genuinely zero this month, not merely small — hotelling never reaches its own cap');
  assert.ok(fees.hotellingContribution > 0 && fees.hotellingContribution < period.rates.hotellingContributionMax, 'hotelling is a real, non-zero, below-cap contribution — the accommodation supplement offset, not a missing input, is what keeps it small');
});

// --- HEAS debt against the former home (docs/research/p9-heas-debt-netting-2026-09-25.md) ---------

test('HEAS debt — past the cliff, the OPENING HEAS debt comes off the vacated home in full (SS Act s 1121(5)); while it is exempt, nothing moves', () => {
  const survivor = { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(150_000) };
  const enteredCare = entry('ec', 'ENTER_CARE', '2025-03-01', { homeValue: toCents(900_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const heas = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(900_000), fortnightlyAmount: toCents(500) }, 'personA');
  const walked = project(CARE_CLIFF_SETTINGS, survivor, [enteredCare, heas]);
  const [oct, nov, dec, jan, feb, mar] = walked;
  // Exempt (DSS Guide 3.4.5.20: the debt offsets an exempt asset): cash alone, debt or no debt.
  for (const [before, after] of [[oct, nov], [nov, dec], [dec, jan], [jan, feb]]) noHomeJump(before, after);
  assert.ok(feb.heasDebt > 0 && mar.heasDebt > feb.heasDebt, 'the debt must exist and still be growing, or opening vs closing proves nothing');
  // Feb's close is March's opening debt.
  assert.equal(mar.assessableAssets, feb.closingBalance + CPI_CARRIED_HOME_TO_MARCH_2027 - feb.heasDebt);
});

test('HEAS debt — the aged care home value nets the opening HEAS debt BEFORE the home exemption cap (Aged Care Act 2024 s 330(8))', () => {
  const single = { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(50_000) };
  const enteredCare = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(230_000), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const heas = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(230_000), fortnightlyAmount: toCents(1_000) }, 'personA');
  const walked = project(SETTINGS, single, [enteredCare, heas]);
  const prev = walked.find((m) => m.month === '2027-02');
  const mar = walked.find((m) => m.month === '2027-03');
  const V = inflateStated(toCents(230_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  const cap = CURRENT.thresholds.homeExemptionCap;
  const D = prev.heasDebt;
  assert.ok(V > cap && D > V - cap && D < cap, 'V over the cap and D over V − cap, or the three readings collapse');

  const feesFor = (netValue) => {
    const means = agedCareMeansAssessment(
      { couple: false, personNames: ['Sam'], combinedAssessableIncome: toCents(0), combinedAssessableAssetsExcludingHomeAndRad: mar.assessableAssets, combinedRadPaid: toCents(0), home: { netValue, homeIsProtected: false } },
      CURRENT,
    );
    assert.equal(means.perPerson[0].incomeTestedAmountPerDay, 0);
    return agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  };
  // Income: an upper-bound deeming ceiling still tests at nil, so the $0 above loses nothing.
  const bound = agedCareMeansAssessment(
    { couple: false, personNames: ['Sam'], combinedAssessableIncome: Math.ceil(mar.assessableAssets * SETTINGS.deemingRates.upper), combinedAssessableAssetsExcludingHomeAndRad: mar.assessableAssets, combinedRadPaid: toCents(0), home: { netValue: V - D, homeIsProtected: false } },
    CURRENT,
  );
  assert.equal(bound.perPerson[0].incomeTestedAmountPerDay, 0);

  const beforeCap = feesFor(V - D);
  const afterCap = feesFor(cap - D);
  const notDeducted = feesFor(V);
  const readings = [beforeCap, afterCap, notDeducted].map((f) => f.hotellingContribution + f.nonClinicalCareContribution);
  assert.equal(new Set(readings).size, 3, `the three readings must differ, or the pin below is vacuous: ${readings}`);
  assert.ok(beforeCap.hotellingContribution < CURRENT.hotellingContributionMax);
  assert.equal(lineSum(mar, AGED_CARE_HOTELLING_LINE), beforeCap.hotellingContribution * 31);
  assert.equal(lineSum(mar, AGED_CARE_NCCC_LINE), beforeCap.nonClinicalCareContribution * 31);
});
