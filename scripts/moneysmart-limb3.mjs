// P4-7, second comparison run — **the Moneysmart-comparable scenario that has a NON-SUPER PORTFOLIO.**
//
// `docs/moneysmart-baseline-2026-09-17.md` records the first manual run against ASIC's Moneysmart
// Retirement Planner. It was a pure super/Account-Based Pension scenario with NO portfolio, because
// at the time limb 3 of the Income Waterfall always drew nil — a household needing more than its
// super could supply reported an `Unfunded shortfall` and the comparison stopped there.
//
// P3-21f shipped on 2026-09-18 and limb 3 draws. This script produces the `enough` side of a SECOND
// manual run: the same household shape as the baseline doc (single, 66 at `asAtDate`, retiring at 67,
// $0 salary, homeowner, Age Pension included) with a funded portfolio of CGT parcels bolted on and a
// spending target big enough that the portfolio is genuinely sold. Its output is the table a human
// carries to the Moneysmart form, and the INPUTS it prints are the figures to type in.
//
// It is a MEASUREMENT harness, exactly as `moneysmart-baseline.mjs` is: nothing here may be tuned
// until a figure agrees, and it asserts nothing.
//
// **The Moneysmart run has now been done** (`docs/ASIC Retirement Planner v2.pdf`, 2026-09-18) and its
// year-by-year series is carried below as `MONEYSMART`, so the today's-dollars table prints both sides.
// Their solve is an INPUT to us: `enough` has no level-income solver, so their solved level income of
// **$85,728 a year in today's dollars** becomes this run's spending target. That figure is a monthly
// $7,144 x 12 — their export is MONTHLY where the first run's was ANNUAL; see the doc.
//
// Run:  node scripts/moneysmart-limb3.mjs [--return 0.056] [--pension-basis cpi|wage]
//                                         [--spend 85728] [--spend-basis nominal|real]
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
//                                         [--horizon 100] [--last-age 100]
//
// It lives in `scripts/` and imports from `dist/` for the reason `moneysmart-baseline.mjs` states:
// `tsconfig.json` has `"include": ["src"]`, so a `process.argv` reader under `src/` would be compiled
// into the browser bundle and fail `test/import-graph.test.mjs`. `npm run build` is a precondition.
import { project, disposalOfAmount, parcelsGrownForOneMonth, netCapitalGain, DEFAULT_PARCEL_SELECTION } from '../dist/core/projection.js';
import { toCents } from '../dist/core/money.js';

const argOf = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
};

const NOMINAL_RETURN = Number(argOf('return', '0.056'));
const PENSION_BASIS = argOf('pension-basis', 'cpi');
const SPEND_BASIS = argOf('spend-basis', 'real');
const ANNUAL_SPEND = Number(argOf('spend', '85728'));
const HORIZON = Number(argOf('horizon', '100'));
const LAST_AGE = Number(argOf('last-age', '100'));

if (!['cpi', 'wage'].includes(PENSION_BASIS)) throw new RangeError(`--pension-basis cpi|wage, not ${PENSION_BASIS}`);
if (!['nominal', 'real'].includes(SPEND_BASIS)) throw new RangeError(`--spend-basis nominal|real, not ${SPEND_BASIS}`);

// --- The scenario ---------------------------------------------------------------------------------
//
// Everything below that is NOT about the portfolio is the baseline doc's input table, unchanged, so
// the two runs differ in one thing only.

const AS_AT = '2026-07-01';
// 1 July, and both halves are load-bearing (baseline script's note): Sch 7 cl 1(2)(a)(i) reads the
// Account-Based Pension balance on 1 July, and a walk that never OPENS a 1 July never determines that
// year's minimum. It also makes every age-year exactly a financial year.
const DATE_OF_BIRTH = '1960-07-01'; // 66 at `asAtDate`, 67 on 2027-07-01.
const BIRTH_YEAR = 1960;
const RETIREMENT_DATE = '2027-07-01';
const SUPER = 600_000;

// **The parcels.** Both acquired well over 12 months before the walk starts, so s 115-25's *more than
// 12 months* is satisfied for each and the 50% discount reaches every gain they realise. Cost bases
// are real and materially below market value, so a sale is a taxable event rather than a wash — the
// portfolio carries $300,000 of unrealised gain on $500,000 of market value at `asAtDate`.
const PARCELS = [
  { acquired: '2011-04-14', costBase: toCents(90_000), marketValue: toCents(300_000) },
  { acquired: '2016-09-08', costBase: toCents(110_000), marketValue: toCents(200_000) },
];
const PORTFOLIO_VALUE = 500_000;

const WAGE = 0.037;
const CPI = 0.025;

/** The forward Age Pension series — same construction and same reasons as `moneysmart-baseline.mjs`. */
const series = (lastYear) => {
  const half = PENSION_BASIS === 'wage' ? Math.sqrt(1 + WAGE) : Math.sqrt(1 + CPI);
  const rateIndexations = [];
  const meansTestIndexations = [];
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const day of ['03-20', '09-20']) {
      // `annualisedMtawe: 0` so the 41.76% benchmark can never bind — register O14: no MTAWE level
      // was ever retrieved, so any base here would be invented.
      rateIndexations.push({ effective: `${year}-${day}`, cpi: half, pblci: half, annualisedMtawe: 0 });
    }
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1 + CPI, cpiDecemberQuarter: 1 + CPI });
  }
  return { rateIndexations, meansTestIndexations };
};

const SETTINGS = {
  asAtDate: AS_AT,
  planningHorizonAge: HORIZON,
  economicSeries: { cpi: CPI, pblci: CPI, awote: WAGE, mtawe: WAGE, agePension: series(2075) },
  deemingRates: { lower: 0.0025, upper: 0.0225 },
  nominalReturn: NOMINAL_RETURN,
};

const HOUSEHOLD = {
  persons: [
    {
      name: 'Limb3',
      dateOfBirth: DATE_OF_BIRTH,
      superInterests: [
        {
          // A stated commencement day, or the minimum is nil by design (`projection.ts` chunk 5b).
          // Declared divergence, same as the baseline run: Moneysmart's age 66 is an ACCUMULATION
          // year and this is Retirement Phase from month 0.
          phase: 'accountBasedPension',
          balance: toCents(SUPER),
          statedStreamSettings: { commencementDay: AS_AT },
        },
      ],
      parcels: PARCELS,
      employmentIncomePerFortnight: toCents(0), // $0 salary — the trick that empties the accumulation year.
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
};

const entry = (id, type, date, params) => ({ id, date, owner: 'household', type, params, enabled: true, createdAt: AS_AT });

// Moneysmart's own deflator chain, the baseline doc's basis A: one pre-retirement year at wage growth
// 3.7%, then CPI 2.5% a year. Deflates the START of the age-year to today's dollars.
const deflatorA = (age) => (1 + WAGE) * (1 + CPI) ** (age - 67);

/**
 * **Why a flat real target needs one `SPEND_CHANGE` per year, and not one entry.**
 *
 * `SpendChangeParams.annualSpend` is a LEVEL in NOMINAL cents (`plan.ts`: "a level, not a delta") and
 * `projection.ts` holds it standing until the next entry — the engine never indexes it. Moneysmart's
 * target is the opposite: page 8 of the PDF says retirement spending goals "are inflated over time in
 * the projection in line with the today's dollar adjustment / deflator assumptions", i.e. their
 * $85,728 is FLAT IN TODAY'S DOLLARS and rises at the post-retirement deflator of 2.5% in nominal
 * terms. So matching it means emitting a fresh `SPEND_CHANGE` every 1 July at exactly
 * `target x deflatorA(age)`, which is what `real` does.
 *
 * The first baseline doc's closing instruction — "Set `SPEND_CHANGE` to $64,370" as a single figure —
 * is therefore not reusable here. It was written for a run whose income target was $0, where nothing
 * turned on it; taken literally against a level REAL target it would under-spend by the whole
 * compounded deflator and the comparison would be meaningless by age 80.
 */
const spendEntries = () => {
  if (SPEND_BASIS === 'nominal') return [entry('spend', 'SPEND_CHANGE', RETIREMENT_DATE, { annualSpend: toCents(ANNUAL_SPEND) })];
  const out = [];
  for (let year = 2027; year <= BIRTH_YEAR + HORIZON; year += 1) {
    out.push(entry(`spend-${year}`, 'SPEND_CHANGE', `${year}-07-01`, { annualSpend: toCents(Math.round(ANNUAL_SPEND * deflatorA(year - BIRTH_YEAR))) }));
  }
  return out;
};
const ENTRIES = [entry('retire', 'RETIRE', RETIREMENT_DATE, {}), ...spendEntries()];

// --- Run ------------------------------------------------------------------------------------------

const months = project(SETTINGS, HOUSEHOLD, ENTRIES);

const dollars = (cents) => cents / 100;
const fmt = (n, width = 9) => Math.round(n).toLocaleString('en-AU').padStart(width);

/**
 * **The Moneysmart side, read off their results table by hand and NOT to be regenerated.**
 *
 * `[age, Age pension, Your super, Investment assets]`, all in today's dollars and all **MONTHLY**, as
 * exported. The first run's table was ANNUAL. That convention difference is undocumented anywhere in
 * the tool and is the single easiest way to misread a figure off it; it is stated at the top of
 * `docs/moneysmart-limb3-2026-09-18.md` for that reason. They are multiplied by 12 below and nowhere
 * else, so the raw transcription stays checkable against the screen.
 */
const MONEYSMART = [
  [67, 0, 4982, 2162], [68, 0, 4826, 2319], [69, 0, 4665, 2479], [70, 0, 4501, 2644],
  [71, 0, 4333, 2811], [72, 0, 4162, 2982], [73, 0, 3989, 3155], [74, 0, 3814, 3330],
  [75, 344, 3634, 3165], [76, 733, 3286, 3126], [77, 1104, 2962, 3078], [78, 1459, 2663, 3023],
  [79, 1797, 2387, 2960], [80, 2121, 2213, 2811], [81, 2430, 1958, 2756], [82, 2725, 1726, 2693],
  [83, 2970, 1525, 2649], [84, 3057, 1378, 2709], [85, 3145, 1315, 2685], [86, 3233, 1152, 2759],
  [87, 3284, 1009, 2851], [88, 3322, 879, 2943], [89, 3361, 759, 3024], [90, 3401, 659, 3084],
  [91, 3440, 540, 3164], [92, 3481, 10, 67], [93, 3521, 0, 0], [94, 3563, 0, 0],
  [95, 3604, 0, 0], [96, 3647, 0, 0], [97, 3689, 0, 0], [98, 3733, 0, 0],
  [99, 3776, 0, 0], [100, 3820, 0, 0],
];
const moneysmart = new Map(MONEYSMART.map(([age, pension, sup, inv]) => [age, { pension: pension * 12, sup: sup * 12, inv: inv * 12, total: (pension + sup + inv) * 12 }]));

const AGE_PENSION = (l) => l.description === 'Age Pension';
const DRAWDOWN = (l) => l.description.startsWith('Account-Based Pension payment');
const SALE = (l) => l.description.startsWith('Non-Super Portfolio sale');
const CGT = (l) => l.description.startsWith('Income tax on capital gain');
const SHORTFALL = (l) => l.description === 'Unfunded shortfall';
const SPEND = (l) => l.description === 'Household spending';
const sum = (month, predicate) => month.lines.filter(predicate).reduce((t, l) => t + l.amount, 0);

/**
 * **The portfolio state month by month, REPLAYED through the engine's own functions** —
 * `disposalOfAmount` and `parcelsGrownForOneMonth`, seeded with the same parcels and fed the sale
 * amounts the run actually emitted. `Month` exposes `assessableAssets` (super + portfolio) and not
 * the split, so this is the only way to report a cost base at all; it is a replay of the run's own
 * lines and not an independent model, and the super column below is `assessableAssets` MINUS it,
 * which is what makes a replay error visible as a super balance that moves wrongly.
 *
 * Ordering follows the tick: the month's disposals first, then growth at the end of the month.
 *
 * ⚠️ **What is recorded against a month is its OPENING portfolio — before that month's sales.**
 * `Month.assessableAssets` is `splitAssets` on the month's first day, so it is the OPENING figure
 * too, and subtracting a post-sale portfolio from an opening total would over-state the super
 * balance by exactly the month's sale. That error is not visible in any single row; it shows up as a
 * super balance that declines while nothing draws on it, which is how it was found.
 */
const portfolioByMonth = new Map();
/**
 * The month's NET CAPITAL GAIN, s 102-5, from the same replay. It is reported because the CGT line
 * below can be nil for two quite different reasons — no gain, or a gain the offsets absorb — and
 * only this column tells them apart. It is the replay's own `netCapitalGain`, the engine's function.
 */
const gainByMonth = new Map();
{
  let parcels = PARCELS;
  for (const month of months) {
    const marketValue = parcels.reduce((t, p) => t + p.marketValue, 0);
    const costBase = parcels.reduce((t, p) => t + p.costBase, 0);
    portfolioByMonth.set(month.month, { marketValue, costBase });
    for (const line of month.lines.filter(SALE)) {
      const disposal = disposalOfAmount(0, line.amount, `${month.month}-01`, [parcels], DEFAULT_PARCEL_SELECTION);
      if (disposal === undefined) throw new Error(`replay: ${month.month} sold ${line.amount} out of an empty portfolio`);
      if (disposal.proceeds !== line.amount) {
        throw new Error(`replay: ${month.month} sale line ${line.amount} but the replay could only realise ${disposal.proceeds}`);
      }
      gainByMonth.set(month.month, (gainByMonth.get(month.month) ?? 0) + netCapitalGain(disposal.realisations));
      parcels = disposal.parcelsAfter[0];
    }
    parcels = parcelsGrownForOneMonth(parcels, NOMINAL_RETURN);
  }
}

/** The twelve months of the age-year. DOB is 1 July, so an age-year is a financial year. */
const monthsOfAge = (age) => {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const ordinal = 7 + i;
    const year = BIRTH_YEAR + age + (ordinal > 12 ? 1 : 0);
    const key = `${year}-${String(ordinal > 12 ? ordinal - 12 : ordinal).padStart(2, '0')}`;
    const found = months.find((m) => m.month === key);
    if (found !== undefined) out.push(found);
  }
  return out;
};

const rows = [];
for (let age = 66; age <= LAST_AGE; age += 1) {
  const ms = monthsOfAge(age);
  if (ms.length === 0) continue;
  const open = ms[0];
  // The age-year CLOSES where the next month OPENS. Every figure carried on a `Month` is an opening
  // figure (see the replay's ⚠️), so a closing balance is the following month's opening one and never
  // the last month's own.
  const close = months[months.indexOf(ms[ms.length - 1]) + 1];
  if (close === undefined) continue;
  const openPortfolio = portfolioByMonth.get(open.month);
  const closePortfolio = portfolioByMonth.get(close.month);
  rows.push({
    age,
    complete: ms.length === 12,
    pension: dollars(ms.reduce((t, m) => t + sum(m, AGE_PENSION), 0)),
    draw: dollars(ms.reduce((t, m) => t + sum(m, DRAWDOWN), 0)),
    sale: dollars(ms.reduce((t, m) => t + sum(m, SALE), 0)),
    cgt: dollars(ms.reduce((t, m) => t + sum(m, CGT), 0)),
    gain: dollars(ms.reduce((t, m) => t + (gainByMonth.get(m.month) ?? 0), 0)),
    spend: dollars(ms.reduce((t, m) => t + sum(m, SPEND), 0)),
    shortfall: dollars(ms.reduce((t, m) => t + sum(m, SHORTFALL), 0)),
    openSuper: dollars(open.assessableAssets - openPortfolio.marketValue),
    closeSuper: dollars(close.assessableAssets - closePortfolio.marketValue),
    openPortfolio: dollars(openPortfolio.marketValue),
    closePortfolio: dollars(closePortfolio.marketValue),
    closeCostBase: dollars(closePortfolio.costBase),
    closeOffset: dollars(close.openingBalance),
    dA: deflatorA(age),
  });
}

// **The identity that makes the super column mean "super".** `assessableAssets` is super plus the
// portfolio's market value and nothing else here — the home is protected and carries no value, and
// the Waterfall's running cash is not a `Household` asset — so month 0 must be the two stated
// figures exactly. If it is not, the split reported below is not a split.
const month0 = months[0];
const stated = toCents(SUPER) + toCents(PORTFOLIO_VALUE);
if (month0.assessableAssets !== stated) {
  throw new Error(`assessableAssets at ${month0.month} is ${month0.assessableAssets}, not the stated ${stated}`);
}

console.log('# Moneysmart run 2 — the limb-3 scenario (Account-Based Pension + Non-Super Portfolio)');
console.log('');
console.log('## Inputs, as they go to the Moneysmart form');
console.log(`  status                     single, homeowner, Age Pension included`);
console.log(`  current age / retirement   66 (DOB ${DATE_OF_BIRTH}) / 67 (${RETIREMENT_DATE})`);
console.log(`  asAtDate / horizon age     ${AS_AT} / ${HORIZON}   (${months.length} months walked)`);
console.log(`  salary                     $0`);
console.log(`  super (Account-Based Pension, commenced ${AS_AT})  $${SUPER.toLocaleString('en-AU')}`);
console.log(`  non-super portfolio        $${PORTFOLIO_VALUE.toLocaleString('en-AU')} market value in ${PARCELS.length} parcels:`);
for (const p of PARCELS) {
  console.log(`      acquired ${p.acquired}  cost base $${dollars(p.costBase).toLocaleString('en-AU')}  market value $${dollars(p.marketValue).toLocaleString('en-AU')}`);
}
console.log(`  annual spending target     $${ANNUAL_SPEND.toLocaleString('en-AU')} from ${RETIREMENT_DATE} (${SPEND_BASIS})`);
console.log(`  nominalReturn ${NOMINAL_RETURN}   pension-basis ${PENSION_BASIS}   inflation ${CPI}   wage ${WAGE}`);
console.log('');

console.log('## Year by year, NOMINAL dollars (an age-year is the financial year starting 1 July)');
console.log('  age |  ABP draw | portfolio | net gain |  CGT tax | Age Pension |    spend | shortfall |  close ABP | close p/f | close cost base | close offset');
for (const r of rows) {
  console.log(
    `  ${String(r.age).padStart(3)} | ${fmt(r.draw)} | ${fmt(r.sale)} | ${fmt(r.gain, 8)} | ${fmt(r.cgt, 8)} | ${fmt(r.pension, 11)} | ${fmt(r.spend, 8)} | ${fmt(r.shortfall, 9)} | ${fmt(r.closeSuper, 10)} | ${fmt(r.closePortfolio)} | ${fmt(r.closeCostBase, 15)} | ${fmt(r.closeOffset, 12)}${r.complete ? '' : '  (partial year)'}`,
  );
}
console.log('');
console.log("## Year by year, TODAY'S dollars on the baseline doc's deflator A (1.037 x 1.025^(age-67))");
console.log("## `enough` on the left of the bar, Moneysmart on the right. Their 'super'/'investment' columns");
console.log('## are NOT comparable line for line — they draw both pools proportionately, we drain the ABP');
console.log('## first (limb 2 before limb 3). The TOTAL and the Age Pension are the comparands.');
console.log('  age |  ABP draw | portfolio |  CGT tax | Age Pension |    total || MS pension |  MS super |  MS inv |  MS total | total diff');
for (const r of rows) {
  const income = (r.draw + r.sale + r.pension - r.cgt) / r.dA;
  const ms = moneysmart.get(r.age);
  const right = ms === undefined
    ? ' |        n/a |       n/a |     n/a |       n/a |        n/a'
    : ` | ${fmt(ms.pension, 10)} | ${fmt(ms.sup)} | ${fmt(ms.inv, 7)} | ${fmt(ms.total)} | ${fmt(income - ms.total, 10)}`;
  console.log(
    `  ${String(r.age).padStart(3)} | ${fmt(r.draw / r.dA)} | ${fmt(r.sale / r.dA)} | ${fmt(r.cgt / r.dA, 8)} | ${fmt(r.pension / r.dA, 11)} | ${fmt(income, 8)} |${right}`,
  );
}
console.log('');

// --- Did limb 3 actually fire? ----------------------------------------------------------------------
//
// The whole point of the run, so it is printed as the LINES and not as a summary figure.
const saleMonths = months.filter((m) => m.lines.some(SALE));
console.log('## Limb 3 — `Non-Super Portfolio sale`');
console.log(`  fired in ${saleMonths.length} of ${months.length} months; first ${saleMonths[0]?.month ?? 'NEVER'}, last ${saleMonths[saleMonths.length - 1]?.month ?? 'NEVER'}`);
for (const m of saleMonths.slice(0, 3)) {
  console.log(`  ${m.month}:`);
  for (const l of m.lines) console.log(`      ${l.direction.padEnd(7)} ${l.description.padEnd(38)} $${dollars(l.amount).toFixed(2)}`);
}
console.log('');
const cgtMonths = months.filter((m) => m.lines.some(CGT));
console.log(`## Capital gains tax — charged in ${cgtMonths.length} months`);
for (const m of cgtMonths) {
  for (const l of m.lines.filter(CGT)) console.log(`  ${m.month}  ${l.description}  $${dollars(l.amount).toFixed(2)}`);
}
console.log('');
const firstShortfall = months.find((m) => m.lines.some(SHORTFALL));
const portfolioGone = rows.find((r) => r.closePortfolio === 0);
const superGone = rows.find((r) => r.closeSuper < 1);
console.log(`Portfolio exhausted by the close of age ${portfolioGone?.age ?? 'NEVER within the horizon'}`);
console.log(`Account-Based Pension exhausted by the close of age ${superGone?.age ?? 'NEVER within the horizon'}`);
console.log(`First `.concat('`Unfunded shortfall`: ', firstShortfall?.month ?? 'NEVER within the horizon'));
console.log(`Total CGT paid across the walk: $${rows.reduce((t, r) => t + r.cgt, 0).toLocaleString('en-AU')} nominal`);

// Every DISTINCT line description the walk emitted, so that a column reported as nil above is
// visibly nil in the run rather than nil because this script filtered on a string that never matched.
console.log('');
console.log('## Distinct `MonthLine` descriptions in the whole walk');
const seen = new Map();
for (const m of months) for (const l of m.lines) seen.set(l.description, (seen.get(l.description) ?? 0) + 1);
for (const [description, count] of seen) console.log(`  ${String(count).padStart(4)} x ${description}`);
