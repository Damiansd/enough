// P14-13 — `SELL_HOME` wired into `project()`: the mortgage and any Home Equity Access Scheme debt
// repaid from the proceeds, the household's Age Pension and aged-care treatment switching to
// non-homeowner from the sale's own month, and the main residence Capital Gains Tax exemption — no
// CGT parcel for a home exists at all (ADR-0005), so no charge is ever computed.
//
// Sources verified live, 2026-09-25, Chrome UA (`docs/research/` holds no prior fetch for this type):
//   - ato.gov.au "Eligibility for main residence exemption" (last updated 22 June 2026): "Your main
//     residence... is exempt from Capital Gains Tax... if... has been the home of you, your partner
//     and other dependants for the whole period you have owned it" — a full exemption, ITAA 1997
//     Subdiv 118-B.
//   - ato.gov.au "Treating former home as main residence" (last updated 22 June 2026): the 6-year
//     rule for a home later rented out — NOT modelled here (SELL_HOME carries no rental history);
//     that case is `RENT_OUT_HOME`'s, still open (TODO P14-13).
//   - guides.dss.gov.au 4.6.3.70/4.6.3.80 (live fetch 403s automated retrieval — register O12's own
//     finding; wayback snapshots 2021-09-26 / 2022-01-17 read instead, `homeTreatment`'s own
//     precedent for this Guide): selling the principal home makes the seller a NON-HOMEOWNER from
//     settlement.
//   - SS Act s 1144AA, the No Negative Equity Guarantee (already sourced, `data/assumptions/heas.ts`):
//     a HEAS debt is never recovered beyond the security's value. Applied here for the FIRST time as
//     a genuine repayment event (`plan.ts`'s `Month.heasDebt` doc, superseded 2026-09-25) — every
//     prior HEAS test ran a debt that never gets repaid at all.
//
// **P14-13c (2026-09-25) — the sale-proceeds exemption, MODELLED, sourced live via the Wayback Machine
// proxy (guides.dss.gov.au 403s a direct curl) with a Chrome UA:**
//   - DSS Social Security Guide 4.6.3.90 "Exempting the principal home - sale proceeds (for homes sold
//     on or after 01/01/2023)" (Internet Archive snapshot dated 2025-11-16, "Version 1.333 - Released
//     3 November 2025", "Last reviewed: 22 September 2025"): "the portion of the proceeds intended to
//     be used for the new principal home can be exempt from the assets test for up to 24 months" from
//     settlement, for a sale on or after 1 January 2023 — every sale this forecaster can state falls
//     under that date, so the 12-month pre-2023 figure (4.6.3.80) is moot here. A further discretionary
//     12 months (36 total) is available on "reasonable attempts" / "delays beyond their control"
//     criteria requiring documentary evidence — NOT modelled: this build closes the window at 24
//     months unconditionally.
//   - "The person continues to be assessed as a homeowner during the exemption period" — MODELLED as
//     `HomeStatus.noHomeSaleProceedsExempt` (`homeowner: true`), despite there being no home.
//   - "Even though principal home sale proceeds can be exempt from the assets test... the proceeds
//     will still be subject to deeming under the income test... only the lower deeming rate will be
//     applied" — MODELLED as a SEPARATE deemed-income calculation, at the flat lower rate, apart from
//     the household's other financial assets and the pooled deeming threshold
//     (`AgePensionEntitlement.saleProceedsSetAsideDeemedPerFortnight`).
//   - "The principal home sale proceeds exemption ends when... a new principal home has been
//     purchased... or the person ceases to have an intention to apply the proceeds" — NOT MODELLED:
//     ending it with an actual purchase needs a `BUY_HOME` entry judged too big for this slice
//     (`SellHomeParams.newHomePurchaseDate`'s own header note); this build only models the window
//     closing UNUSED, at the 24-month cliff, reverting to `noHome` exactly as if nothing had been set
//     aside — `homePastCliff`'s own precedent (P14-5a, the care-situation cliff).
//
// Every Household here is synthetic: round numbers, no salary, no other super, `cashInterestRate: 0`
// so cash never drifts between the day it is stated and the day it is spent — `core-projection-
// aged-care.test.mjs`'s own reason for pinning it explicitly.
import test from 'node:test';
import assert from 'node:assert/strict';

import { addCents, toCents } from '../dist/core/money.js';
import {
  project,
  AGE_PENSION_LINE,
  MORTGAGE_INTEREST_LINE,
  MORTGAGE_PRINCIPAL_LINE,
  HOME_SALE_PROCEEDS_LINE,
  HOME_SALE_SELLING_COSTS_LINE,
  HOME_SALE_MORTGAGE_REPAID_LINE,
  HOME_SALE_HEAS_REPAID_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  CAPITAL_GAINS_TAX_LINE,
  monthlyFromFortnightly,
} from '../dist/core/projection.js';
import { parsePlan, PlanFileEntryError } from '../dist/core/parsePlan.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

// Every month here falls inside the SAME Age Pension / aged care rate period (2026-09-20 to
// 2027-03-19), on purpose: `asAtDate` is chosen strictly after the 2026-09-20 boundary so no month's
// OWN indexation confounds the SELL_HOME comparison with an unrelated rate rise.
const SETTINGS = {
  asAtDate: '2026-10-16',
  planningHorizonAge: 85,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);
const hasLine = (month, description) => month.lines.some((line) => line.description === description);

// --- The door ---------------------------------------------------------------------------------

const withEntries = (household, entries) => ({
  ...DEMO_PLAN,
  household,
  entries,
  scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
});

const HOMEOWNER_HOUSEHOLD = { ...DEMO_PLAN.household, homeStatus: 'occupied' };
const validSellHome = entry('sell', 'SELL_HOME', '2040-07-01', { salePrice: toCents(900_000) });

test('door: a household with no home to sell (homeStatus noHome) is refused', () => {
  const bad = { ...HOMEOWNER_HOUSEHOLD, homeStatus: 'noHome' };
  assert.throws(
    () => parsePlan(withEntries(bad, [validSellHome])),
    /is SELL_HOME, and household\.homeStatus is "noHome" — there is no home this build treats as a sellable principal home to sell/,
  );
});

test('door: a household already past the vacated-home cliff (non-homeowner treatment) is refused too', () => {
  const bad = { ...HOMEOWNER_HOUSEHOLD, homeStatus: 'vacatedBeyondTwoYearExemption' };
  assert.throws(
    () => parsePlan(withEntries(bad, [validSellHome])),
    /is SELL_HOME, and household\.homeStatus is "vacatedBeyondTwoYearExemption"/,
  );
});

test('door: a second SELL_HOME is refused', () => {
  const second = { ...validSellHome, id: 'sell2', date: '2041-01-01' };
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validSellHome, second])),
    /is a SECOND SELL_HOME entry \(the first is "sell"\)/,
  );
});

test('door: a non-positive sale price, or selling costs above it, is refused', () => {
  assert.throws(() => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: 0 } }])), /a sale for nothing or less is not a sale/);
  assert.throws(() => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: -1 } }])), PlanFileEntryError);
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), sellingCosts: toCents(900_001) } }])),
    /more than the sale price/,
  );
});

test('door: a valid SELL_HOME parses whole and unchanged, sellingCosts omitted when blank', () => {
  const parsed = parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validSellHome]));
  assert.deepEqual(parsed.entries.at(-1).params, { salePrice: toCents(900_000) });
});

// --- P14-13c — the sale-proceeds exemption's set-aside amount: door checks -------------------------

test('door: newHomeAmount at most nothing, or more than the net proceeds, is refused', () => {
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), newHomeAmount: 0 } }])),
    /set aside more than nothing/,
  );
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), newHomeAmount: -1 } }])),
    PlanFileEntryError,
  );
  // Net proceeds are salePrice LESS sellingCosts, not the sale price alone — the mortgage and any
  // HEAS debt repaid are whole-file facts this door does not (and cannot) net off.
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), sellingCosts: toCents(20_000), newHomeAmount: toCents(880_001) } }])),
    /more than the .* net proceeds/,
  );
  // Exactly the net proceeds is the door's own boundary, and it is allowed.
  const wholeNetProceeds = parsePlan(
    withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), sellingCosts: toCents(20_000), newHomeAmount: toCents(880_000) } }]),
  );
  assert.equal(wholeNetProceeds.entries.at(-1).params.newHomeAmount, toCents(880_000));
});

test('door: a stated newHomeAmount parses whole and unchanged, and is omitted when blank', () => {
  const withSetAside = parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), newHomeAmount: toCents(500_000) } }]));
  assert.deepEqual(withSetAside.entries.at(-1).params, { salePrice: toCents(900_000), newHomeAmount: toCents(500_000) });
  assert.ok(!Object.hasOwn(parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [validSellHome])).entries.at(-1).params, 'newHomeAmount'));
});

test('door: newHomePurchaseDate is NOT YET BUILT — refused by name whatever is stated, and never silently dropped', () => {
  assert.throws(
    () => parsePlan(withEntries(HOMEOWNER_HOUSEHOLD, [{ ...validSellHome, params: { salePrice: toCents(900_000), newHomePurchaseDate: '2041-01-01' } }])),
    /newHomePurchaseDate.*not yet built/s,
  );
});

test('door: a household already mid-window (noHomeSaleProceedsExempt) has nothing left to sell or to draw a Home Equity Access Scheme loan against', () => {
  const midWindow = { ...HOMEOWNER_HOUSEHOLD, homeStatus: 'noHomeSaleProceedsExempt' };
  assert.throws(
    () => parsePlan(withEntries(midWindow, [validSellHome])),
    /there is no home this build treats as a sellable principal home to sell/,
  );
});

// --- The walk: a couple sells — mortgage repaid, non-homeowner thresholds, the Age Pension falls -

const SALE_COUPLE = {
  persons: [person('Alex', '1955-06-01'), person('Blair', '1955-06-15')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(400_000),
  mortgage: { openingBalance: toCents(50_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_000) },
};

// **Household cash is ALSO the mortgage offset account (ADR-0005)**, so $400,000 of offset against a
// $50,000 loan means October's interest is nil and the whole $1,000 repayment is principal
// (`mortgageMonth`, independently verified): October closes at $50,000 − $1,000 = $49,000 owing.
// The entry is dated in NOVEMBER — the month AFTER the walk's first — precisely so October stands as
// a genuine "before" month (homeowner, mortgage running) uncontaminated by the sale itself.
const saleEntry = entry('sale', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000) });

test('couple sells: the mortgage is repaid from the proceeds, into cash — one line each, and no CGT is ever charged', () => {
  const months = project(SETTINGS, SALE_COUPLE, [saleEntry]);
  const oct = months.find((m) => m.month === '2026-10');
  const nov = months.find((m) => m.month === '2026-11');
  const dec = months.find((m) => m.month === '2026-12');

  // October: the loan runs normally — nil interest (fully offset), $1,000 of principal, no sale line
  // at all yet (the entry is dated the FOLLOWING month).
  assert.equal(lineSum(oct, MORTGAGE_INTEREST_LINE), 0);
  assert.equal(lineSum(oct, MORTGAGE_PRINCIPAL_LINE), toCents(1_000));
  assert.equal(hasLine(oct, HOME_SALE_PROCEEDS_LINE), false);
  assert.equal(oct.mortgageBalance, toCents(49_000));

  // November — the sale's own month: proceeds land as their own inflow line, the $49,000 still owed
  // is repaid as its own outflow line (`HOME_SALE_MORTGAGE_REPAID_LINE`, never folded into one net
  // figure), no selling costs line (none stated), and the loan is CLEARED — no more mortgage lines,
  // ever, from here on (`derivedHomeStatus`'s own "the balance is RESET, not amortised" doctrine).
  //
  // **`salePrice` is stated in TODAY's money (user ruling, 2026-09-25) — raised to the entry's own
  // settlement day, ONE month after `asAtDate` on this fixture — the mortgage balance stays nominal
  // (a debt), unaffected.**
  const salePriceNominal = inflateStated(toCents(900_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-11-01');
  assert.equal(lineSum(nov, HOME_SALE_PROCEEDS_LINE), salePriceNominal);
  assert.equal(lineSum(nov, HOME_SALE_MORTGAGE_REPAID_LINE), toCents(49_000));
  assert.equal(hasLine(nov, HOME_SALE_SELLING_COSTS_LINE), false);
  assert.equal(lineSum(nov, MORTGAGE_INTEREST_LINE), 0);
  assert.equal(lineSum(nov, MORTGAGE_PRINCIPAL_LINE), 0);
  assert.equal(nov.mortgageBalance, toCents(0));
  assert.equal(dec.mortgageBalance, toCents(0));

  // The ledger identity for November itself, `Month`'s own contract (`closingBalance = openingBalance
  // + Σinflow − Σoutflow`): opening (October's close) plus the proceeds, less the mortgage repaid,
  // less nothing else that moved (no selling costs, no mortgage lines this month, and this couple is
  // old enough to draw the Age Pension too — its own line is in the sum rather than assumed away).
  const novExpectedClose =
    oct.closingBalance + lineSum(nov, HOME_SALE_PROCEEDS_LINE) - lineSum(nov, HOME_SALE_MORTGAGE_REPAID_LINE) + lineSum(nov, AGE_PENSION_LINE);
  assert.equal(nov.closingBalance, novExpectedClose);
  // December: nothing left to move but the pension itself.
  assert.equal(dec.closingBalance, nov.closingBalance + lineSum(dec, AGE_PENSION_LINE));

  // The main residence exemption is total (ITAA 1997 Subdiv 118-B): there is no CGT parcel for a
  // home at all (ADR-0005), so the capital-gains-tax line never fires, in ANY month of the walk.
  for (const month of months) assert.equal(hasLine(month, CAPITAL_GAINS_TAX_LINE), false);
});

test('couple sells: the Age Pension falls once the proceeds land — non-homeowner thresholds, hand-worked off the same agePensionEntitlement() the walk itself calls', () => {
  const months = project(SETTINGS, SALE_COUPLE, [saleEntry]);
  const oct = months.find((m) => m.month === '2026-10');
  const dec = months.find((m) => m.month === '2026-12');

  // **BEFORE, October: homeowner, $400,000 cash, a $50,000 mortgage the means test does not net**
  // (`agePension.ts`'s `homeownerWithAMortgage`). Deemed income on $400,000 (couple threshold
  // $110,600 at 1.75%, the rest at 3.75%): ($110,600 × 0.0175 + $289,400 × 0.0375) ÷ 26 = $491.85/f
  // (49,185c) — income excess over the $396.00 free area is $95.85, taper 50%: $47.93 (4,793c)
  // reduction off the $1,866.00 maximum, giving $1,818.07/f (181,807c combined). The assets test does
  // not bind: $400,000 is under even the HOMEOWNER $499,000 free area, let alone the non-homeowner
  // one — nil excess, nil reduction. Income binds.
  const before = agePensionEntitlement({ household: { ...SALE_COUPLE, openingOffsetBalance: toCents(400_000) }, date: '2026-10-16', deemingRates: SETTINGS.deemingRates });
  assert.equal(before.bindingTest, 'income');
  assert.equal(before.assetsTest.excess, 0);
  assert.equal(before.householdRatePerFortnight, 181808);
  assert.equal(lineSum(oct, AGE_PENSION_LINE), monthlyFromFortnightly(181808));

  // **AFTER, December: non-homeowner (`HomeStatus.noHome`), no mortgage, and cash of whatever
  // November's own close came to** (`nov.closingBalance` — this couple also draws the Age Pension in
  // November itself, so cash is not a round $1,250,000; read the FACT rather than guess it, on the
  // same footing as `before` reading `SALE_COUPLE`'s own stated figure). Assets test: excess over the
  // NON-homeowner free area of $766,000 (the $499,000 homeowner free area PLUS the $267,000 extra
  // allowable amount, T26) comfortably clears it — the household is deep into six figures of cash —
  // so a taper applies whatever the exact cent figure, and the assets test (not income) now binds.
  const nov = months.find((m) => m.month === '2026-11');
  const after = agePensionEntitlement({ household: { ...SALE_COUPLE, homeStatus: 'noHome', mortgage: undefined, openingOffsetBalance: nov.closingBalance }, date: '2026-12-01', deemingRates: SETTINGS.deemingRates });
  assert.equal(after.bindingTest, 'assets');
  assert.ok(after.assetsTest.excess > 0);
  assert.ok(after.householdRatePerFortnight > 0, 'the sale must not zero the pension outright');
  assert.ok(after.householdRatePerFortnight < before.householdRatePerFortnight, 'and it must be LOWER than before the sale');
  // **The control this proves the SWITCH, not just a big number: fed the SAME cash but left as
  // `homeowner: 'occupied'` (the bug this test exists to catch), the couple sits far enough over the
  // LOWER $499,000 homeowner free area to be tapered to NIL.** The walk reports a positive rate,
  // which only the non-homeowner free area can produce from this much cash.
  const wrongHomeowner = agePensionEntitlement({ household: { ...SALE_COUPLE, mortgage: undefined, openingOffsetBalance: nov.closingBalance }, date: '2026-12-01', deemingRates: SETTINGS.deemingRates });
  assert.equal(wrongHomeowner.householdRatePerFortnight, 0, 'the control: a homeowner-threshold bug would zero the pension entirely, not merely move it');
  assert.equal(lineSum(dec, AGE_PENSION_LINE), monthlyFromFortnightly(after.householdRatePerFortnight));
  assert.ok(lineSum(dec, AGE_PENSION_LINE) < lineSum(oct, AGE_PENSION_LINE), 'the Age Pension must FALL once the proceeds land');
});

// --- The walk: the survivor in care sells — aged care assesses the cash, with no home cap --------

const CARE_HOUSEHOLD = {
  persons: [person('Robin', '1950-01-01')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(100_000),
};

// `radPrice`/`radPaidAsLumpSum` both nil: no accommodation deposit at all, so the accommodation
// ledger stays empty and the only lever on the daily fee is the ASSET test — `homeValue` is the one
// fact this test turns on.
const careEntrySameDay = (homeValue) => entry('care', 'ENTER_CARE', '2026-10-16', { homeValue: toCents(homeValue), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');

test('survivor in care, home still owned: the home contributes its CAPPED value to the daily fee', () => {
  // $600,000 home, capped at the published home exemption cap of $219,858.40 (AGED_CARE 2026-09-20
  // schedule) — plus $100,000 cash = $319,858.40 total assessable assets. Asset-tested daily amount
  // 17.5% × ($319,858.40 − $66,500) ÷ 364 = $85.27 (per health.gov.au's own banded formula,
  // `core-aged-care.test.mjs`'s own worked arithmetic) — clears the $73.73 accommodation supplement
  // by $11.54, so hotelling is $11.54 and the non-clinical contribution stays nil (remainder under
  // its own $109.45 daily maximum with room to spare).
  const months = project(SETTINGS, CARE_HOUSEHOLD, [careEntrySameDay(600_000)]);
  const month0 = months[0];
  assert.equal(month0.month, '2026-10');
  // `agedCareFees` is walked over `daysInMonth(date)` — the WHOLE calendar month, whatever day within
  // it the entry states (this build has no day-level precision below the month): October is 31 days.
  const days = 31;
  assert.equal(lineSum(month0, AGED_CARE_BASIC_FEE_LINE), toCents(68.93) * days);
  assert.equal(lineSum(month0, AGED_CARE_HOTELLING_LINE), toCents(11.54) * days);
  assert.equal(lineSum(month0, AGED_CARE_NCCC_LINE), 0);
});

test('survivor in care sells the SAME day: the home cap disappears entirely — a LOWER fee, not a differently-capped one', () => {
  // Sold the same day care starts: `homeSold` and `careOn` both apply from month 0, so the aged-care
  // block never sees a home at all — `home.netValue` is nil from the first tick, not merely reduced.
  // Cash is unchanged (the proceeds land in NEXT month's opening balance, `careEnteredThisMonth`'s
  // own "the entry's own month, not every month" precedent for a one-off credit): $100,000 assessed
  // alone gives an asset-tested daily amount of $16.10 — UNDER the $73.73 accommodation supplement,
  // so hotelling and the non-clinical contribution are BOTH nil, and only the flat basic fee is
  // charged. LOWER than the home-owned case above, which is the point: a home that no longer exists
  // cannot be capped, because there is nothing left to cap.
  const home = careEntrySameDay(600_000);
  const sale = entry('sell', 'SELL_HOME', '2026-10-16', { salePrice: toCents(600_000) });
  const months = project(SETTINGS, CARE_HOUSEHOLD, [home, sale]);
  const month0 = months[0];
  const days = 31;
  assert.equal(lineSum(month0, AGED_CARE_HOTELLING_LINE), 0);
  assert.equal(lineSum(month0, AGED_CARE_NCCC_LINE), 0);
  assert.equal(lineSum(month0, AGED_CARE_BASIC_FEE_LINE), toCents(68.93) * days);
});

test('survivor already sold before the walk starts: the FULL proceeds are assessed — no cap at all, not even the $219,858.40 one', () => {
  // A household that sold in the PAST states its OWN current cash directly — the sale's cash
  // proceeds are never re-credited for a pre-dated `SELL_HOME` (`ENTER_CARE`'s own RAD-lump-sum
  // precedent), so `openingOffsetBalance` here IS the $700,000 the real sale already left behind.
  // $700,000 assessed alone, through the SAME banded asset-test formula `core-aged-care.test.mjs`
  // pins against health.gov.au's own worked examples (never re-derived here — composed, on this
  // file's own stated method): an asset-tested amount of $127.41/day clears the $73.73 accommodation
  // supplement far enough that the hotelling contribution maxes out at $22.15 and the non-clinical
  // care contribution reaches $31.53 (short of ITS OWN $109.45 daily maximum) — a total daily charge
  // of $68.93 + $22.15 + $31.53 = $122.61, MORE than a $219,858.40-capped home could ever add on its
  // own share (test 8, above, tops out at $80.47/day on a $600,000 home): the full sale value counts,
  // with no home cap to shelter any of it, because there is no home left to be the thing a cap
  // applies to.
  const alreadySold = { ...CARE_HOUSEHOLD, openingOffsetBalance: toCents(700_000) };
  const pastCare = entry('care', 'ENTER_CARE', '2020-01-01', { homeValue: toCents(0), radPrice: toCents(0), radPaidAsLumpSum: toCents(0) }, 'personA');
  const pastSale = entry('sell', 'SELL_HOME', '2020-01-01', { salePrice: toCents(600_000) });
  const months = project(SETTINGS, alreadySold, [pastCare, pastSale]);
  const month0 = months[0];
  const days = 31;
  assert.equal(lineSum(month0, AGED_CARE_HOTELLING_LINE), toCents(22.15) * days);
  assert.equal(lineSum(month0, AGED_CARE_NCCC_LINE), toCents(31.53) * days);
  assert.equal(lineSum(month0, AGED_CARE_BASIC_FEE_LINE), toCents(68.93) * days);
});

// --- The walk: a Home Equity Access Scheme debt is repaid from the proceeds, capped at the price -

const HEAS_HOUSEHOLD = {
  persons: [person('Sam', '1955-01-01')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(50_000),
};
const heasDraw = entry('heas', 'HEAS_DRAW', '2026-10-16', { securityValue: toCents(900_000), fortnightlyAmount: toCents(2_000) }, 'personA');

test('a HEAS debt is repaid in full from the proceeds, when the sale covers it', () => {
  // **The debt at the CLOSE of the month BEFORE the sale** — the entry loop that repays it runs at
  // the TOP of the sale's own month's tick, before that month's own HEAS interest/draw block, so what
  // gets repaid is November's closing debt, not December's (`homeSaleHeasRepaid`'s own doc). Read off
  // the SAME accrual mechanism `core-projection-heas.test.mjs` already proves (`heasAccrueFortnight`,
  // 3.95% compounding fortnightly) — never re-derived here, on `core-projection-aged-care.test.mjs`'s
  // own "compose an already-tested calculator" precedent, applied to a SECOND already-tested
  // calculator: `project()` itself, run with NO SELL_HOME, is the calculator being composed.
  const withoutSale = project(SETTINGS, HEAS_HOUSEHOLD, [heasDraw]);
  const debtBeforeSale = withoutSale.find((m) => m.month === '2026-11').heasDebt;
  assert.ok(debtBeforeSale > 0);

  const sale = entry('sell', 'SELL_HOME', '2026-12-16', { salePrice: toCents(900_000) });
  const withSale = project(SETTINGS, HEAS_HOUSEHOLD, [heasDraw, sale]);
  const dec = withSale.find((m) => m.month === '2026-12');
  const jan = withSale.find((m) => m.month === '2027-01');

  assert.equal(lineSum(dec, HOME_SALE_HEAS_REPAID_LINE), debtBeforeSale);
  assert.equal(dec.heasDebt, 0);
  assert.equal(jan.heasDebt, 0, 'the debt stays discharged — it is not redrawn or re-accrued');
  // No further HEAS draws after the security is sold — the door does not refuse a stated stream that
  // simply stops finding a home to draw against, so this is asserted rather than assumed.
  assert.equal(lineSum(jan, HOME_SALE_HEAS_REPAID_LINE), 0);
});

test('a HEAS debt bigger than the sale price is capped at the price — the No Negative Equity Guarantee, and the WHOLE debt is still discharged', () => {
  const withoutSale = project(SETTINGS, HEAS_HOUSEHOLD, [heasDraw]);
  const debtBeforeSale = withoutSale.find((m) => m.month === '2026-11').heasDebt;
  assert.ok(debtBeforeSale > toCents(1_000), 'the fixture needs a real debt to cap');

  // A sale price deliberately BELOW the accrued debt — the NNEG bites.
  const smallSalePrice = debtBeforeSale - toCents(1_000);
  const sale = entry('sell', 'SELL_HOME', '2026-12-16', { salePrice: smallSalePrice });
  const withSale = project(SETTINGS, HEAS_HOUSEHOLD, [heasDraw, sale]);
  const dec = withSale.find((m) => m.month === '2026-12');

  // `salePrice` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to the entry's own
  // settlement day before it caps the repayment or lands as proceeds.
  const smallSalePriceNominal = inflateStated(smallSalePrice, SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-12-16');

  // Capped at the sale price, never at the (larger) debt — the household is never asked to find the
  // shortfall, and the debt is discharged in full regardless: there is no security left to run it
  // against once the home is gone.
  assert.equal(lineSum(dec, HOME_SALE_HEAS_REPAID_LINE), smallSalePriceNominal);
  assert.equal(dec.heasDebt, 0);
  // The proceeds line is still the WHOLE sale price — the cap applies to the REPAYMENT, not to what
  // the household receives.
  assert.equal(lineSum(dec, HOME_SALE_PROCEEDS_LINE), smallSalePriceNominal);
});

// --- P14-13c — the sale-proceeds exemption during the window: excluded from the assets test, deemed --
// --- SEPARATELY at the lower rate only, hand-worked off the SAME agePensionEntitlement() the walk --
// --- itself calls, `SALE_COUPLE`'s own precedent -----------------------------------------------

test('P14-13c — during the window: the set-aside is excluded from the assets test, the household is a homeowner, and the set-aside is deemed SEPARATELY at the lower rate only', () => {
  // A single Person, homeowner threshold and deeming threshold both well within the KNOWN 2026-07-01
  // means-test period (`data/assumptions/agePension.ts`), so every figure below is exact — no
  // synthetic forward indexation involved.
  const household = {
    persons: [person('Sam', '1955-01-01')],
    homeStatus: 'noHomeSaleProceedsExempt',
    // The WHOLE of the household's cash — $500,000 of which `saleProceedsSetAside` carves out below,
    // `splitAssets`'s own clamp: the set-aside is a carve-out of this SAME pool, never a second pot.
    openingOffsetBalance: toCents(850_000),
  };
  const entitlement = agePensionEntitlement({
    household,
    date: '2026-12-01',
    deemingRates: SETTINGS.deemingRates,
    saleProceedsSetAside: toCents(500_000),
  });

  // DSS Guide 4.6.3.90: "the person continues to be assessed as a homeowner during the exemption
  // period" — despite there being no home at all.
  assert.equal(entitlement.assets.homeowner, true);
  // The assets test sees ONLY the remaining $350,000 — the $500,000 set-aside never reaches it.
  assert.equal(entitlement.assets.assessableAssets, toCents(350_000));
  assert.equal(entitlement.assetsTest.assessed, toCents(350_000));
  assert.equal(entitlement.assets.saleProceedsSetAside, toCents(500_000));

  // Deeming, POOLED: the $350,000 alone against the single $66,800 threshold (2026-07-01 period) —
  // $66,800 × 1.75% + ($350,000 − $66,800) × 3.75% = $1,169.00 + $10,620.00 = $11,789.00/year.
  assert.equal(entitlement.deeming.financialAssets, toCents(350_000));
  assert.equal(entitlement.deeming.annual, toCents(11_789));

  // Deeming, SEPARATE: the WHOLE $500,000 set-aside at the LOWER rate only, whatever the pooled
  // threshold above already used up — $500,000 × 1.75% = $8,750.00/year ÷ 26 = $336.5384... cents,
  // rounding half away from zero to $336.54/f (33,654 cents). None of it spills into the 3.75% upper
  // rate the $350,000 above is already partly taxed at.
  assert.equal(entitlement.saleProceedsSetAsideDeemedPerFortnight, 33_654);
  // It actually reaches the income test — not merely reported and then ignored. MUTATION CONTROL for
  // "the set-aside amount not deemed": dropping `saleProceedsSetAsideDeemedPerFortnight` (undefined,
  // or wrongly nil) fails BOTH assertions above and this one, since none of the three figures then
  // reconciles.
  assert.equal(entitlement.incomeTest.assessed, addCents(entitlement.deeming.perFortnight, entitlement.saleProceedsSetAsideDeemedPerFortnight));
  assert.ok(entitlement.saleProceedsSetAsideDeemedPerFortnight > 0, 'the whole point of this test: the excluded amount is still deemed, not simply dropped');
});

// --- P14-13c — the window's automatic 24-month expiry, `homePastCliff`'s own precedent, hand-worked --
// --- off the SAME agePensionEntitlement() the walk itself calls, cross-checked against project() --

// **Sold BEFORE the walk starts** (`asAtDate` 2026-10-16), `alreadySold`'s own precedent above: the
// household's own $850,000 cash already reflects the sale, and settlement pre-dates the walk by
// enough for the window's own 24-month cliff to fall INSIDE the known 2026-03-20 – 2027-03-19
// parameter period — so both snapshots below are exact, with no synthetic forward indexation
// involved. Settlement 2025-01-01: `monthsBetween('2025-01-01', month) < 24` is active THROUGH
// 2026-12 (23 months later) and expires FROM 2027-01 (24 months later).
const SOLO_SELLER = {
  persons: [person('Sam', '1955-01-01')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(850_000),
};
const preDatedSaleWithSetAside = entry('sell', 'SELL_HOME', '2025-01-01', { salePrice: toCents(900_000), newHomeAmount: toCents(700_000) });

test('P14-13c — the window closes at 24 months, UNCONDITIONALLY: the last month inside it and the first month past it, cross-checked against agePensionEntitlement() directly', () => {
  const months = project(SETTINGS, SOLO_SELLER, [preDatedSaleWithSetAside]);
  const nov2026 = months.find((m) => m.month === '2026-11');
  const dec2026 = months.find((m) => m.month === '2026-12');
  const jan2027 = months.find((m) => m.month === '2027-01');

  // **`newHomeAmount` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to THIS
  // entry's own settlement day, 2025-01-01, which is BEFORE `asAtDate` (2026-10-16): the factor is
  // below 1 (`priceLevelFactor`'s own documented case), so the $700,000 stated becomes LESS in
  // nominal terms, not more.**
  const setAsideNominal = inflateStated(toCents(700_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2025-01-01');
  // **2026-12 — the LAST month of the window**: `noHomeSaleProceedsExempt`, the nominal set-aside excluded.
  const during = agePensionEntitlement({
    household: { ...SOLO_SELLER, homeStatus: 'noHomeSaleProceedsExempt', openingOffsetBalance: nov2026.closingBalance },
    date: '2026-12-16',
    deemingRates: SETTINGS.deemingRates,
    saleProceedsSetAside: setAsideNominal,
  });
  assert.equal(lineSum(dec2026, AGE_PENSION_LINE), monthlyFromFortnightly(during.householdRatePerFortnight));

  // **2027-01 — the FIRST month past the cliff**: back to plain `noHome`, the whole balance
  // assessable — the window closed UNUSED (no purchase is modelled), exactly as if nothing had ever
  // been set aside.
  const after = agePensionEntitlement({
    household: { ...SOLO_SELLER, homeStatus: 'noHome', openingOffsetBalance: dec2026.closingBalance },
    date: '2027-01-16',
    deemingRates: SETTINGS.deemingRates,
  });
  assert.equal(lineSum(jan2027, AGE_PENSION_LINE), monthlyFromFortnightly(after.householdRatePerFortnight));

  assert.ok(during.householdRatePerFortnight > 0, 'the fixture needs a real pension during the window to show a fall');
  assert.ok(
    after.householdRatePerFortnight < during.householdRatePerFortnight,
    'the Age Pension must FALL once the window closes and the set-aside becomes fully assessable',
  );

  // MUTATION CONTROL — "the exemption never ends": had the window still been treated as active PAST
  // the cliff, the pension would be HIGHER than the correct, expired figure this walk actually pays.
  const mutantStillExempt = agePensionEntitlement({
    household: { ...SOLO_SELLER, homeStatus: 'noHomeSaleProceedsExempt', openingOffsetBalance: dec2026.closingBalance },
    date: '2027-01-16',
    deemingRates: SETTINGS.deemingRates,
    saleProceedsSetAside: setAsideNominal,
  });
  assert.ok(
    mutantStillExempt.householdRatePerFortnight > after.householdRatePerFortnight,
    'a window that never closes would OVERSTATE the pension past the 24-month cliff',
  );
  assert.notEqual(lineSum(jan2027, AGE_PENSION_LINE), monthlyFromFortnightly(mutantStillExempt.householdRatePerFortnight));
});
