// P4-7 — **a MEASUREMENT harness, not a validation gate.** It runs `project()` over the scenario
// `docs/moneysmart-baseline-2026-09-17.md` describes and prints the divergence against ASIC's
// Moneysmart Retirement Planner year by year.
//
// **It exists to MEASURE divergence, not to remove it.** Nothing here may be tuned until a figure
// agrees: a matched number obtained by fitting says nothing about whether this engine independently
// reproduces an external authority, which is the only question the run is asked. Every choice that
// could have been made to flatter the comparison is instead a FLAG with both settings runnable, and
// the report prints which one was in force.
//
// It lives in `scripts/` for the same reason `update-assumptions.mjs` does: `tsconfig.json` has
// `"include": ["src"]`, so a `node:fs`/`process.argv` reader under `src/` would be compiled into the
// browser bundle and would fail `test/import-graph.test.mjs` outright. It imports from `dist/`,
// which is what the tests import from, so `npm run build` is a precondition and `npm run test`'s
// own build is what keeps it honest.
//
// Run:  node scripts/moneysmart-baseline.mjs [--return 0.056] [--pension-basis cpi|wage]
//                                            [--spend-from retirement|start] [--horizon 101]
//                                            [--spend-basis nominal|real]
//
// ⚠️⚠️ **STALE FROM 2026-09-21 — `--spend-basis real` NOW DOUBLE-INDEXES (register O85).** This
// script's `real` basis emits one `SPEND_CHANGE` per year at `1.025^k` BECAUSE the engine held the
// stated level flat. The engine no longer does: the user ruled `SpendChangeParams.annualSpend` a
// REAL figure and `project()` raises it to every month's own price level. So `real` now applies the
// indexation twice, and `nominal` is the option that produces a flat REAL target. It is deliberately
// NOT repaired here: the deflator chain below is `1.037 × 1.025^(age − 67)`, whose first-year kink
// the engine's own factor does not have, so collapsing these entries to one would change what this
// comparison IS. That is the next Moneysmart run's decision — see TODO.md P4-19.
//
//
// --- THE FOUR CHOICE POINTS, none of them settled by the baseline doc -----------------------------
//
// 1. DEFLATION BASIS. Every Moneysmart figure is in today's dollars; `enough` is nominal throughout.
//    Two bases are defensible and BOTH are printed:
//      A  their own deflator chain — one pre-retirement year at 3.7%, then CPI 2.5% a year:
//         divisor(age) = 1.037 * 1.025^(age-67).  This is what Moneysmart itself does (PDF p.4).
//      B  pure CPI from `asAtDate`: divisor(age) = 1.025^(age-66).
//    They differ by the CONSTANT factor 1.037/1.025, i.e. 1.1707% on every row, so the
//    choice shifts the whole table uniformly and cannot create or hide a trend. A is the primary
//    because it is not our convention at all: it is theirs, and the comparand is their column.
//
// 2. WHICH RATE, since `enough` has ONE `nominalReturn` and Moneysmart has two. Balanced 6.1% runs
//    the single accumulation year 66->67; Conservative 5.6% runs all 34 compared years. `RETURN_CHANGE`
//    carries `UnspecifiedParams` and cannot be constructed, so the glide path is NOT EXPRESSIBLE here.
//    Default 0.056, because it governs 34 of the 35 years; `--return 0.061` runs the other end.
//
// 3. HOW THE AGE PENSION IS INDEXED. Moneysmart indexes the payment at wage growth 3.7% while
//    deflating at CPI 2.5%, so their payment rises ~1.1707% a year in REAL terms. `enough` moves the
//    basic rate by the higher of stated CPI and PBLCI, floored at 41.76% of annualised MTAWE.
//      --pension-basis cpi   (default) rate movements at 2.5% a year, MTAWE benchmark set to nil so
//                            it never binds. This is `enough` asked the question in its own terms: a
//                            payment FLAT in real dollars.
//      --pension-basis wage  rate movements at 3.7% a year. This mirrors Moneysmart's model. It is
//                            NOT a correction and NOT a fit; it is the second column that shows how
//                            much of the divergence is indexation alone.
//    The MTAWE limb is deliberately not used to carry wages: register O14 records that no MTAWE LEVEL
//    was ever retrieved, so a base for the 41.76% benchmark would have to be invented.
//
// 4a. WHETHER THE SPEND IS NOMINAL OR REAL, and this one is NOT in the baseline doc's list — it was
//    found by running the thing. `SpendChangeParams.annualSpend` is a NOMINAL level and nothing
//    indexes it, while Moneysmart's $64,370 is a TODAY'S-DOLLARS level income held flat in REAL
//    terms for 25 years. A single `SPEND_CHANGE` of $64,370 therefore asks `enough` for a household
//    whose real spending falls to $27,380 by age 100 — a different scenario, not a different engine.
//      --spend-basis nominal  (default) one entry, exactly as the task states it.
//      --spend-basis real     34 entries, one per age-year, at $64,370 x 1.025^k. This is the same
//                             instruction translated into the units `enough` actually consumes.
//    `real` is the more faithful expression and `nominal` is the literal one, so both are runnable
//    and the report says which was in force. Indexing the spend is NOT a fit: it is fixed at their
//    stated 2.5% inflation and is never solved for an outcome.
//
// 4. WHEN THE SPEND STARTS. Moneysmart models no spending before retirement — age 66 is an empty
//    accumulation year. `--spend-from retirement` (default) dates the `SPEND_CHANGE` at the 67th
//    birthday, which reproduces that. `--spend-from start` dates it at `asAtDate` and draws the
//    Account-Based Pension minimum a year early.
import { project } from '../dist/core/projection.js';
import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_PERIODS, maximumPaymentRate } from '../dist/data/assumptions/agePension.js';

const argOf = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
};

const NOMINAL_RETURN = Number(argOf('return', '0.056'));
const PENSION_BASIS = argOf('pension-basis', 'cpi');
const SPEND_FROM = argOf('spend-from', 'retirement');
const SPEND_BASIS = argOf('spend-basis', 'nominal');
// 101, not 100, so the age-100 year is a WHOLE year like every other row. A horizon of 100 stops the
// walk at the 100th birthday and the last row would be a stub compared against a full-year figure.
const HORIZON = Number(argOf('horizon', '101'));

if (!['cpi', 'wage'].includes(PENSION_BASIS)) throw new RangeError(`--pension-basis cpi|wage, not ${PENSION_BASIS}`);
if (!['retirement', 'start'].includes(SPEND_FROM)) throw new RangeError(`--spend-from retirement|start, not ${SPEND_FROM}`);
if (!['nominal', 'real'].includes(SPEND_BASIS)) throw new RangeError(`--spend-basis nominal|real, not ${SPEND_BASIS}`);

// --- The scenario, from the baseline doc's input table --------------------------------------------

const AS_AT = '2026-07-01';
// 1 July, and both halves of that are load-bearing. Sch 7 cl 1(2)(a)(i) reads the Account-Based
// Pension balance on 1 July, and a walk that never OPENS a 1 July never determines that year's
// minimum. It also makes every age-year exactly a financial year, so the annual rows below need no
// second convention for which months belong to which age.
const DATE_OF_BIRTH = '1960-07-01'; // 66 at `asAtDate`, 67 on 2027-07-01.
const BIRTH_YEAR = 1960;
const SUPER = 600_000;
const ANNUAL_SPEND = 64_370; // Moneysmart's own solved level income, used as our INPUT (doc §"How to use").

const WAGE = 0.037;
const CPI = 0.025;

/**
 * The forward Age Pension series. Without one the Age Pension simply STOPS at 19 March 2027 — the
 * end of the published window — and 33 of the 34 rows would be nil for a reason that has nothing to
 * do with Moneysmart. Rate movements are half-yearly (20 Mar / 20 Sep), means-test movements annual
 * (1 Jul), and they are given DIFFERENT rates because that is the whole point of T23/T24: the payment
 * and the free areas do not move together in either engine.
 */
const series = (lastYear) => {
  const half = PENSION_BASIS === 'wage' ? Math.sqrt(1 + WAGE) : Math.sqrt(1 + CPI);
  const rateIndexations = [];
  const meansTestIndexations = [];
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const day of ['03-20', '09-20']) {
      rateIndexations.push({
        effective: `${year}-${day}`,
        cpi: half,
        pblci: half,
        // NIL, so the 41.76% MTAWE benchmark can never bind. Register O14: no MTAWE level was ever
        // retrieved, so any base here would be invented — and an invented base is exactly the kind of
        // input this harness must not tune.
        annualisedMtawe: 0,
      });
    }
    // 2.5% a year on BOTH limbs, because Moneysmart's assets free area indexes at their inflation
    // rate of 2.5% (doc: "their threshold indexes at 2.5%"). The two reference quarters are the same
    // figure here only because the source states one inflation rate, not because they are one thing.
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1 + CPI, cpiDecemberQuarter: 1 + CPI });
  }
  return { rateIndexations, meansTestIndexations };
};

const SETTINGS = {
  asAtDate: AS_AT,
  planningHorizonAge: HORIZON,
  economicSeries: { cpi: CPI, pblci: CPI, awote: WAGE, mtawe: WAGE, agePension: series(2075) },
  // Not zeroable and not zero in the source either. The doc's run never makes deeming bind — the
  // ASSETS test binds every means-tested year — so these are stated at the current determination and
  // their value is not load-bearing for any row below.
  deemingRates: { lower: 0.0025, upper: 0.0225 },
  nominalReturn: NOMINAL_RETURN,
};

const HOUSEHOLD = {
  // Single, homeowner. `persons` is a one-tuple, which is what `isCouple` tests.
  persons: [
    {
      name: 'Baseline',
      dateOfBirth: DATE_OF_BIRTH,
      superInterests: [
        {
          // An Account-Based Pension with a STATED commencement day. An ABP with no stated day yields
          // a nil minimum by design (`projection.ts` chunk 5b), so without this the drawdown column
          // would be empty for a reason internal to us.
          //
          // ⚠️ AND IT IS A DIVERGENCE IN ITS OWN RIGHT, declared here rather than discovered in the
          // table: Moneysmart's age 66 is an ACCUMULATION year and this is Retirement Phase from
          // month 0. `enough` cannot express "accumulation until 67, then an ABP" — nothing converts
          // a phase mid-walk — so the one thing we can hold constant is the balance and the return.
          phase: 'accountBasedPension',
          balance: toCents(SUPER),
          statedStreamSettings: { commencementDay: AS_AT },
        },
      ],
      parcels: [], // shares, cash, personal assets, insurance: all $0 in the source.
      employmentIncomePerFortnight: toCents(0), // salary $0 — the trick that empties the accumulation year.
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
};

const entry = (id, type, date, params) => ({ id, date, owner: 'household', type, params, enabled: true, createdAt: AS_AT });

const SPEND_DATE = SPEND_FROM === 'start' ? AS_AT : '2027-07-01';
const spendEntries = () => {
  if (SPEND_BASIS === 'nominal') return [entry('spend', 'SPEND_CHANGE', SPEND_DATE, { annualSpend: toCents(ANNUAL_SPEND) })];
  // One entry per 1 July from the spend's start date to the horizon. The level is theirs; the 2.5%
  // is theirs; the only thing added here is the arithmetic that turns a real level into the nominal
  // levels `enough` consumes. `toCents` takes dollars, so the exponent is on dollars.
  const out = [];
  const firstYear = Number(SPEND_DATE.slice(0, 4));
  for (let year = firstYear; year <= BIRTH_YEAR + 101; year += 1) {
    const k = year - Number(AS_AT.slice(0, 4));
    out.push(entry(`spend-${year}`, 'SPEND_CHANGE', `${year}-07-01`, { annualSpend: toCents(Math.round(ANNUAL_SPEND * (1 + CPI) ** k)) }));
  }
  return out;
};
const ENTRIES = [entry('retire', 'RETIRE', '2027-07-01', {}), ...spendEntries()];

// --- The baseline, transcribed from the doc's year-by-year table ----------------------------------

const BASELINE = [
  [67, 9462, 54908], [68, 12745, 51625], [69, 15860, 48510], [70, 18815, 45555],
  [71, 21618, 42752], [72, 24276, 40094], [73, 26797, 37573], [74, 29187, 35184],
  [75, 31452, 32918], [76, 32732, 31638], [77, 33500, 30870], [78, 34270, 30100],
  [79, 35043, 29327], [80, 35819, 28551], [81, 36596, 27774], [82, 37180, 27191],
  [83, 37615, 26755], [84, 38055, 26315], [85, 38501, 25869], [86, 38951, 25419],
  [87, 39407, 24963], [88, 39869, 24501], [89, 40336, 24035], [90, 40808, 23562],
  [91, 41286, 23085], [92, 41769, 93], [93, 42258, 0], [94, 42753, 0],
  [95, 43253, 0], [96, 43759, 0], [97, 44272, 0], [98, 44790, 0],
  [99, 45314, 0], [100, 45854, 0],
];
const BASELINE_EXHAUSTION_AGE = 92;
const BASELINE_BALANCE_AT_67 = 610_657;

// --- Run ------------------------------------------------------------------------------------------

const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
const byMonth = new Map(months.map((m) => [m.month, m]));

const sumLines = (month, predicate) =>
  month.lines.filter(predicate).reduce((total, line) => total + line.amount, 0);

const AGE_PENSION = (line) => line.description === 'Age Pension';
const DRAWDOWN = (line) => line.description.startsWith('Account-Based Pension payment');
const SHORTFALL = (line) => line.description === 'Unfunded shortfall';

/** The twelve months of the year the person is `age`. DOB is 1 July, so this is a financial year. */
const monthsOfAge = (age) => {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const ordinal = 7 + i;
    const year = BIRTH_YEAR + age + (ordinal > 12 ? 1 : 0);
    const month = ordinal > 12 ? ordinal - 12 : ordinal;
    const found = byMonth.get(`${year}-${String(month).padStart(2, '0')}`);
    if (found !== undefined) out.push(found);
  }
  return out;
};

// Deflators. `A` is Moneysmart's own chain; `B` is pure CPI from `asAtDate`. Both deflate to the
// START of the age-year, which is the convention their $610,657 "balance at retirement" uses.
const deflatorA = (age) => (1 + WAGE) * (1 + CPI) ** (age - 67);
const deflatorB = (age) => (1 + CPI) ** (age - 66);

const dollars = (cents) => cents / 100;
const fmt = (n, width = 9) => (Math.round(n)).toLocaleString('en-AU').padStart(width);
const pct = (ours, theirs) => (theirs === 0 ? (ours === 0 ? '    ——' : '   n/a') : `${(((ours - theirs) / theirs) * 100).toFixed(1).padStart(6)}%`);

/**
 * **THE BASELINE DOC'S model, not ours**, transcribed from its §"Reverse-engineered model": a maximum
 * rate of $31,223.40 in today's dollars rising 1.037/1.025 a year, a free area constant at $331,670
 * in today's dollars, and a taper of $78 per $1,000 per year. It is used ONLY as a diagnostic that
 * separates a means-test divergence from a balance-path divergence. Nothing in `src/` is compared
 * against it and nothing here is tuned to it.
 */
const theirModel = (age, assetsTodayDollars) => {
  const max = 31_223.4 * ((1 + WAGE) / (1 + CPI)) ** (age - 67);
  return Math.max(0, max - Math.max(0, assetsTodayDollars - 331_670) * 0.078);
};

const rows = [];
let exhaustionAge = null;
for (const [age, basePension, baseSuper] of BASELINE) {
  const ms = monthsOfAge(age);
  if (ms.length === 0) continue;
  const first = ms[0];
  const last = ms[ms.length - 1];
  const dA = deflatorA(age);
  const dB = deflatorB(age);
  const row = {
    age,
    complete: ms.length === 12,
    pensionNominal: dollars(ms.reduce((t, m) => t + sumLines(m, AGE_PENSION), 0)),
    drawNominal: dollars(ms.reduce((t, m) => t + sumLines(m, DRAWDOWN), 0)),
    shortfallNominal: dollars(ms.reduce((t, m) => t + sumLines(m, SHORTFALL), 0)),
    // `assessableAssets` IS the super balance in this scenario: the home is protected and carries no
    // value, the Non-Super Portfolio holds no parcels, and the Waterfall's own running cash
    // (`openingBalance`) is not a `Household` asset at all. Checked below rather than in prose.
    balanceOpenNominal: dollars(first.assessableAssets),
    balanceCloseNominal: dollars(last.assessableAssets),
    basePension,
    baseSuper,
    dA,
    dB,
  };
  rows.push(row);
  if (exhaustionAge === null && row.balanceCloseNominal === 0) exhaustionAge = age;
}

const month0 = months[0];
const assetsCheck = dollars(month0.assessableAssets);

console.log('# Moneysmart baseline vs `enough` — measurement run');
console.log('');
console.log(`asAtDate ${AS_AT}   DOB ${DATE_OF_BIRTH}   horizon ${HORIZON}   months ${months.length}`);
console.log(`nominalReturn ${NOMINAL_RETURN}   pension-basis ${PENSION_BASIS}   spend-from ${SPEND_FROM} (${SPEND_DATE})   spend-basis ${SPEND_BASIS} (${ENTRIES.length - 1} SPEND_CHANGE ${ENTRIES.length === 2 ? 'entry' : 'entries'})`);
console.log(`assessableAssets at ${month0.month} = $${assetsCheck.toLocaleString('en-AU')} (must be ${SUPER.toLocaleString('en-AU')} for the balance column to mean "super")`);
console.log('');
console.log('Age Pension — enough deflated, against their column');
console.log('  `theirs@ours` is the baseline doc\'s OWN reverse-engineered means test evaluated on');
console.log('  ENOUGH\'s deflated assets. It is not our arithmetic and it is not a target: it exists to');
console.log('  split the divergence into "our means test differs" (enough vs theirs@ours) and "our');
console.log('  balance path differs" (theirs@ours vs baseline).');
console.log('  age |  nominal |  defl A |  defl B | baseline | theirs@ours |   A vs base |  A vs theirs@ours');
for (const r of rows) {
  const ours = r.pensionNominal / r.dA;
  const t = theirModel(r.age, r.balanceOpenNominal / r.dA);
  console.log(
    `  ${String(r.age).padStart(3)} | ${fmt(r.pensionNominal, 8)} | ${fmt(ours, 7)} | ${fmt(r.pensionNominal / r.dB, 7)} | ${fmt(r.basePension, 8)} | ${fmt(t, 11)} | ${pct(ours, r.basePension)} ${fmt(ours - r.basePension, 7)} | ${fmt(ours - t, 8)}${r.complete ? '' : '  (partial year)'}`,
  );
}
console.log('');
console.log('Super drawdown — enough deflated, against their column');
console.log('  age |  nominal |  defl A |  defl B | baseline |   A vs base | shortfall A');
for (const r of rows) {
  console.log(
    `  ${String(r.age).padStart(3)} | ${fmt(r.drawNominal, 8)} | ${fmt(r.drawNominal / r.dA, 7)} | ${fmt(r.drawNominal / r.dB, 7)} | ${fmt(r.baseSuper, 8)} | ${pct(r.drawNominal / r.dA, r.baseSuper)} ${fmt(r.drawNominal / r.dA - r.baseSuper, 7)} | ${fmt(r.shortfallNominal / r.dA, 9)}`,
  );
}
console.log('');
console.log('Super balance — opening of each age-year');
console.log('  age |      nominal |    defl A |    defl B | implied draw rate');
for (const r of rows) {
  const rate = r.balanceOpenNominal === 0 ? '      ——' : `${((r.drawNominal / r.balanceOpenNominal) * 100).toFixed(2).padStart(7)}%`;
  console.log(`  ${String(r.age).padStart(3)} | ${fmt(r.balanceOpenNominal, 12)} | ${fmt(r.balanceOpenNominal / r.dA, 9)} | ${fmt(r.balanceOpenNominal / r.dB, 9)} | ${rate}`);
}
console.log('');
// --- The GROWTH-ONLY PROBE ------------------------------------------------------------------------
//
// The doc's open residual is a RATE: the implied Moneysmart balance path grows 3.150% a year in real
// terms between assessments where Conservative 5.6% against a 2.5% deflator predicts 3.024%. The
// compared run cannot show `enough`'s own figure, because its balance path carries drawdowns. This
// one can: the same household with NO entries at all spends nothing, so limb 2 draws nothing and the
// balance is pure growth. What it prints is `enough`'s real growth rate, to be read against 3.024%
// (the doc's prediction) and 3.150% (what Moneysmart actually did).
const growthOnly = project(SETTINGS, HOUSEHOLD, []);
const growthByMonth = new Map(growthOnly.map((m) => [m.month, m]));
const growthAt = (age) => growthByMonth.get(`${BIRTH_YEAR + age}-07`);
console.log('');
console.log('Growth-only probe (same household, no entries): real growth of the super balance');
{
  const a = growthAt(67);
  const b = growthAt(97);
  const nominalRate = (b.assessableAssets / a.assessableAssets) ** (1 / 30) - 1;
  const realRate = (1 + nominalRate) / (1 + CPI) - 1;
  console.log(`  age 67 $${fmt(dollars(a.assessableAssets), 1)} -> age 97 $${fmt(dollars(b.assessableAssets), 1)} nominal`);
  console.log(`  nominal ${(nominalRate * 100).toFixed(3)}% a year, real (vs CPI ${(CPI * 100).toFixed(1)}%) ${(realRate * 100).toFixed(3)}% a year`);
  console.log(`  doc's prediction for Conservative 5.6%: 3.024%   what Moneysmart's implied path actually did: 3.150%`);
}

// --- The PUBLISHED-RATE CHECK ---------------------------------------------------------------------
//
// The probe above measures the rate `project()` PAYS. This prints the rate the assumption tables
// HOLD, annualised at 26 fortnights, next to the maximum rate the baseline doc back-solved
// ($31,223.40 at age 67, today's dollars). Two published periods straddle `asAtDate`, so both are
// printed and neither is selected: which one Moneysmart used is a fact about Moneysmart.
console.log('');
console.log("Published single Maximum Payment Rate (basic + Pension Supplement max + Energy Supplement) x 26");
for (const period of AGE_PENSION_PERIODS) {
  const annual = dollars(maximumPaymentRate(period, 'single')) * 26;
  console.log(
    `  ${period.from} to ${period.to}  rates ${period.ratesEffective}  $${annual.toFixed(2).padStart(10)} p.a.`
    + `   vs doc back-solve 31,223.40 -> ${(annual - 31_223.4).toFixed(2)}`,
  );
}

// --- The UNABATED-RATE PROBE ----------------------------------------------------------------------
//
// The tables above cannot separate a maximum-rate divergence from a free-area or taper divergence,
// because the assets test binds in every year of both engines. This probe removes that: the SAME
// person with a $1,000 Account-Based Pension and no spending is under the free area at every age, so
// what `project()` reports is `enough`'s MAXIMUM single homeowner rate and nothing else. It is a
// second run of the same engine on a different household — no input to the compared scenario is
// touched by it.
const PROBE_HOUSEHOLD = {
  ...HOUSEHOLD,
  persons: [{ ...HOUSEHOLD.persons[0], superInterests: [{ ...HOUSEHOLD.persons[0].superInterests[0], balance: toCents(1_000) }] }],
};
const probeMonths = project(SETTINGS, PROBE_HOUSEHOLD, []);
const probeByMonth = new Map(probeMonths.map((m) => [m.month, m]));
console.log('');
console.log('Unabated maximum Age Pension rate — the probe household ($1,000 super, no spend)');
console.log('  age |  nominal |  defl A | doc model | A vs doc');
for (const [age] of BASELINE) {
  let nominal = 0;
  let complete = 0;
  for (let i = 0; i < 12; i += 1) {
    const ordinal = 7 + i;
    const year = BIRTH_YEAR + age + (ordinal > 12 ? 1 : 0);
    const found = probeByMonth.get(`${year}-${String(ordinal > 12 ? ordinal - 12 : ordinal).padStart(2, '0')}`);
    if (found === undefined) continue;
    complete += 1;
    nominal += sumLines(found, AGE_PENSION);
  }
  if (complete !== 12) continue;
  const ours = dollars(nominal) / deflatorA(age);
  const doc = 31_223.4 * ((1 + WAGE) / (1 + CPI)) ** (age - 67);
  console.log(`  ${String(age).padStart(3)} | ${fmt(dollars(nominal), 8)} | ${fmt(ours, 7)} | ${fmt(doc, 9)} | ${pct(ours, doc)} ${fmt(ours - doc, 8)}`);
}

console.log('');
const at67 = rows.find((r) => r.age === 67);
console.log(`Balance at retirement (age 67 opening): nominal $${Math.round(at67.balanceOpenNominal).toLocaleString('en-AU')}`
  + `  defl A $${Math.round(at67.balanceOpenNominal / at67.dA).toLocaleString('en-AU')}`
  + `  defl B $${Math.round(at67.balanceOpenNominal / at67.dB).toLocaleString('en-AU')}`
  + `  vs baseline $${BASELINE_BALANCE_AT_67.toLocaleString('en-AU')}`);
console.log(`Exhaustion age: enough ${exhaustionAge === null ? 'NEVER within the horizon' : exhaustionAge}, baseline ${BASELINE_EXHAUSTION_AGE}`);
const finalRow = rows[rows.length - 1];
console.log(`Balance at the last reported age (${finalRow.age}, closing): nominal $${Math.round(finalRow.balanceCloseNominal).toLocaleString('en-AU')}`);
const totalShortfall = rows.reduce((t, r) => t + r.shortfallNominal / r.dA, 0);
console.log(`Total unfunded shortfall over ages 67-${finalRow.age}, deflated basis A: $${Math.round(totalShortfall).toLocaleString('en-AU')}`);
