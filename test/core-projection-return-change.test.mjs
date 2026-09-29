// P2-11 microtask 3 — RETURN_CHANGE reaches the walk: a per-Person growth rate LEVEL that replaces
// the flat `settings.nominalReturn` from its own month, at BOTH growth call sites
// (`parcelsGrownForOneMonth` and the super `grownForOneMonth` inside `balanceAfterDrawdownAndGrowth`).
//
// **The boundary, said precisely, because it is not where a first guess would put it.** Growth is
// computed at the END of a month's tick, "after this month has been assessed and reported"
// (`projection.ts`, chunk 5a's own comment) — so a month's OWN `assessableAssets`/`protectedAssets`
// never carry that month's own growth; it lands in the growth LINE and in the FOLLOWING month's
// balance. `governing` is updated at the TOP of the tick, before that growth is computed, so the
// entry's own dated month is the first one whose growth LINE is struck at the new rate, even though
// that month's own reported balance is still the pre-change figure.
//
// Three things are defended here and nothing else:
//
//   1. the stated rate governs the growth LINE from the entry's own month, and the month before it
//      is struck at the OLD rate — the boundary, on both call sites' own output;
//   2. it reaches BOTH pools a Person's return acts on — the Non-Super Portfolio and a super
//      Accumulation interest — because `grownParcels` and `grownSuper` are two separate call sites
//      and a fix at one without the other is a fix that only half took;
//   3. it does NOT leak to a Person it was not stated for — a two-Person Household, one `owner`,
//      and the OTHER Person's growth line is untouched to the cent.
//
// And the zero-fixture-churn proof: a plan with no `RETURN_CHANGE` entries at all reads the flat
// `settings.nominalReturn` exactly as it did before this microtask, on `core-projection-growth.
// test.mjs`'s own fixtures — unchanged by this file, and not repeated here.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { grownForOneMonth, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const parcel = (marketValue, over = {}) => ({
  acquired: '2015-03-02',
  costBase: toCents(1_234.56),
  marketValue,
  ...over,
});

const settings = (over = {}) => ({
  asAtDate: '2026-09-01',
  planningHorizonAge: 43,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.05,
  ...over,
});

// Sam is well below Age Pension age throughout, so nothing in the means test can move
// `assessableAssets` for a reason other than the growth under test — Non-Super Portfolio assets are
// assessable regardless of age, so the parcel's value is the whole of `assessableAssets` and no
// Age Pension line, deeming, or Work Bonus interaction can be in play.
const SAM = {
  persons: [person('Sam', '1985-01-15', { parcels: [parcel(toCents(1_000_000))] })],
  homeStatus: 'occupied',
};

const PORTFOLIO_GROWTH = 'Investment growth, Sam — Financial investments outside superannuation';

const RETURN_CHANGE = (id, date, rate, owner = 'personA') => ({
  id,
  date,
  owner,
  type: 'RETURN_CHANGE',
  params: { rate },
  enabled: true,
  createdAt: '2026-06-01',
});

const growthLine = (month, description) => month.lines.find((l) => l.description === description)?.amount;

test('a RETURN_CHANGE governs the growth LINE from its own month, and the month before it is struck at the OLD rate', () => {
  const OLD_RATE = 0.05;
  const NEW_RATE = 0.15;
  const months = project(settings({ nominalReturn: OLD_RATE }), SAM, [
    RETURN_CHANGE('rc', '2026-12-01', NEW_RATE),
  ]);
  const flat = project(settings({ nominalReturn: OLD_RATE }), SAM, []);

  const nov = months.find((m) => m.month === '2026-11');
  const dec = months.find((m) => m.month === '2026-12');
  const flatNov = flat.find((m) => m.month === '2026-11');
  const flatDec = flat.find((m) => m.month === '2026-12');

  // Both months' own REPORTED balances are still identical between the two walks — the change has
  // not yet reached a reported figure this early. This is the fact chunk 5a's own comment states
  // ("after this month has been assessed and reported") and it is asserted here rather than assumed.
  assert.equal(nov.assessableAssets, flatNov.assessableAssets);
  assert.equal(dec.assessableAssets, flatDec.assessableAssets);

  // The BOUNDARY is in the growth LINE, not the reported balance. November — the month BEFORE the
  // entry's date — is struck at the OLD rate, byte-identical to the all-OLD-rate walk.
  assert.equal(growthLine(nov, PORTFOLIO_GROWTH), growthLine(flatNov, PORTFOLIO_GROWTH));
  assert.equal(growthLine(nov, PORTFOLIO_GROWTH), grownForOneMonth(nov.assessableAssets, OLD_RATE) - nov.assessableAssets);

  // December — the entry's OWN month — is already struck at the NEW rate: the entry loop runs
  // before the growth is computed in the SAME tick (`MORTGAGE_REFINANCE` transition (iv)'s own
  // precedent). Mutation (b)'s target — applying the new rate a month late — would make this equal
  // `flatDec`'s growth line instead, and it does not.
  assert.equal(growthLine(dec, PORTFOLIO_GROWTH), grownForOneMonth(dec.assessableAssets, NEW_RATE) - dec.assessableAssets);
  assert.notEqual(growthLine(dec, PORTFOLIO_GROWTH), growthLine(flatDec, PORTFOLIO_GROWTH), 'the new rate arrived a month late');
  assert.notEqual(
    growthLine(dec, PORTFOLIO_GROWTH),
    grownForOneMonth(dec.assessableAssets, OLD_RATE) - dec.assessableAssets,
    'the OLD rate lingered into the entry\'s own month',
  );

  // The full cumulative series, hand-worked from the SAME primitive `project()` itself calls —
  // mutation (a)'s target: an engine that ignored `returnRate` and always read the flat
  // `nominalReturn` would make this walk byte-identical to `flat` throughout, and it does not.
  // Month i's reported balance is grown from month (i-1)'s balance at the rate governing DURING
  // month (i-1)'s own tick — the off-by-one chunk 5a's own comment describes.
  let expected = toCents(1_000_000);
  const series = [expected];
  for (let i = 1; i < months.length; i += 1) {
    const rate = months[i - 1].month >= '2026-12' ? NEW_RATE : OLD_RATE;
    expected = grownForOneMonth(expected, rate);
    series.push(expected);
  }
  assert.deepEqual(months.map((m) => m.assessableAssets), series);
  assert.notDeepEqual(months.map((m) => m.assessableAssets), flat.map((m) => m.assessableAssets));
  assert.ok(months.at(-1).assessableAssets > flat.at(-1).assessableAssets, 'the higher rate must grow more, not less');
});

test('a RETURN_CHANGE reaches BOTH pools a Person\'s growth acts on — the portfolio AND a super interest', () => {
  const OLD_RATE = 0.05;
  const NEW_RATE = 0.2;
  const household = {
    persons: [
      person('Sam', '1985-01-15', {
        parcels: [parcel(toCents(500_000))],
        superInterests: [{ phase: 'accumulation', balance: toCents(500_000) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  // Dated ON `asAtDate` itself, so the entry governs from month 0's own tick (P4-1d: an entry dated
  // on or before `asAtDate` applies from month 0).
  const changed = project(settings({ nominalReturn: OLD_RATE }), household, [
    RETURN_CHANGE('rc', '2026-09-01', NEW_RATE),
  ]);
  const flat = project(settings({ nominalReturn: OLD_RATE }), household, []);

  // Accumulation phase, below Age Pension age: PROTECTED. The portfolio parcel: ASSESSABLE. Two
  // separate pools, two separate call sites in `projection.ts` — a fix that landed at one call site
  // and not the other would leave one of these two hand-worked figures unmoved.
  const superGrowth = 'Investment growth, Sam — Superannuation, Accumulation Phase';
  assert.equal(growthLine(changed[0], PORTFOLIO_GROWTH), grownForOneMonth(toCents(500_000), NEW_RATE) - toCents(500_000));
  assert.equal(growthLine(changed[0], superGrowth), grownForOneMonth(toCents(500_000), NEW_RATE) - toCents(500_000));
  assert.equal(growthLine(flat[0], PORTFOLIO_GROWTH), grownForOneMonth(toCents(500_000), OLD_RATE) - toCents(500_000));
  assert.equal(growthLine(flat[0], superGrowth), grownForOneMonth(toCents(500_000), OLD_RATE) - toCents(500_000));

  // And the reported balances one month on — mutation (a)'s target on each pool separately.
  const changedNext = changed.find((m) => m.month === '2026-10');
  const flatNext = flat.find((m) => m.month === '2026-10');
  assert.notEqual(changedNext.assessableAssets, flatNext.assessableAssets, 'the Non-Super Portfolio call site did not read the changed rate');
  assert.notEqual(changedNext.protectedAssets, flatNext.protectedAssets, 'the super call site did not read the changed rate');
  assert.ok(changedNext.assessableAssets > flatNext.assessableAssets);
  assert.ok(changedNext.protectedAssets > flatNext.protectedAssets);
});

test('a RETURN_CHANGE does NOT leak to a Person it was not stated for', () => {
  const OLD_RATE = 0.05;
  const NEW_RATE = 0.25;
  const household = {
    persons: [
      person('Sam', '1985-01-15', { parcels: [parcel(toCents(400_000))] }),
      person('Robin', '1983-07-20', { parcels: [parcel(toCents(400_000))] }),
    ],
    homeStatus: 'occupied',
  };
  // `owner: 'personA'` — Sam alone. Mutation (c)'s target: an engine that let this rate reach every
  // Person regardless of `owner` would move Robin's growth line too, and it must not move by a cent.
  const months = project(settings({ nominalReturn: OLD_RATE }), household, [
    RETURN_CHANGE('rc', '2026-09-01', NEW_RATE, 'personA'),
  ]);
  const flat = project(settings({ nominalReturn: OLD_RATE }), household, []);
  const samGrowth = (m) => growthLine(m, 'Investment growth, Sam — Financial investments outside superannuation');
  const robinGrowth = (m) => growthLine(m, 'Investment growth, Robin — Financial investments outside superannuation');

  // Robin's growth line is BYTE-IDENTICAL, month by month, to the same Household with no entry at
  // all — the sharpest statement of "did not leak": not merely different from Sam's, but unmoved.
  assert.deepEqual(months.map(robinGrowth), flat.map(robinGrowth));
  // And Sam's line at month 0 is the NEW rate, while Robin's is the OLD one — the non-vacuity
  // control, so this test could not pass on a build that dropped the entry entirely.
  assert.equal(samGrowth(months[0]), grownForOneMonth(toCents(400_000), NEW_RATE) - toCents(400_000));
  assert.equal(robinGrowth(months[0]), grownForOneMonth(toCents(400_000), OLD_RATE) - toCents(400_000));
  assert.notEqual(samGrowth(months[0]), robinGrowth(months[0]));
});

test('a household-owned RETURN_CHANGE reaches every Person — RETIRE\'s own reading of `owner`, not SUPER_CONTRIBUTION\'s', () => {
  const OLD_RATE = 0.05;
  const NEW_RATE = 0.1;
  const household = {
    persons: [
      person('Sam', '1985-01-15', { parcels: [parcel(toCents(300_000))] }),
      person('Robin', '1983-07-20', { parcels: [parcel(toCents(300_000))] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings({ nominalReturn: OLD_RATE }), household, [
    RETURN_CHANGE('rc', '2026-09-01', NEW_RATE, 'household'),
  ]);
  const samGrowth = growthLine(months[0], 'Investment growth, Sam — Financial investments outside superannuation');
  const robinGrowth = growthLine(months[0], 'Investment growth, Robin — Financial investments outside superannuation');
  assert.equal(samGrowth, grownForOneMonth(toCents(300_000), NEW_RATE) - toCents(300_000));
  assert.equal(robinGrowth, grownForOneMonth(toCents(300_000), NEW_RATE) - toCents(300_000));
});
