// P13-4 — the ONLY writer of `fixtures/golden/demo-couple.golden.json`. `npm run golden:update`.
//
// A test never writes this file (`test/golden-demo-couple.test.mjs` only reads it and compares); a
// golden move is a decision a human makes running this script by hand, and the commit that follows
// names the mechanism and the expected size of the move, on this file's own header comment.
//
// **WHOLE CENTS, NEVER ROUNDED, ONE ROW PER FINANCIAL YEAR — NOT PER MONTH.** `groupByFinancialYear`
// (`core/financialYear.ts`) is the one grouping the app's own month table and the connector's FY
// summary both use, imported here rather than re-implemented, so a golden year can never disagree
// with what the page or the chat tool would call "FY2041-42". Flows are SUMMED over the year's
// months in nominal cents; stocks are READ from the year's LAST month. Both rules are
// `financialYearRows.ts`'s and `financialYearSummary.ts`'s own, restated because a golden row has to
// hold to them independently of either display path changing.
//
// **HOUSEHOLD flows and stocks are read straight off `financialYearSummaries()`**
// (`app/chat/tools/financialYearSummary.ts`) — the connector's own FY aggregator — and never
// re-summed here. The only new arithmetic in this file is the PER-PERSON breakdown of salary, tax
// and super drawn, because that aggregator pools every Person into one household total by design
// (its `LineKind` map merges every Person's `salaryDescription` etc. into a single `'salary'` key).
// The per-person split below uses the IDENTICAL mechanism — `groupByFinancialYear`, `MonthLine`
// descriptions built from the same exported functions in `core/projection.ts`, the same inflow/
// outflow sign convention — keyed by Person instead of pooled, and every per-person total is
// asserted to SUM to the household total `financialYearSummaries()` already reports before this
// script will write a byte, so a mismatch here fails loudly rather than silently drifting from the
// household figure it is a breakdown of.
//
// **AGE PENSION IS A HOUSEHOLD FIGURE, NOT A PER-PERSON ONE, BY THE ENGINE'S OWN CONSTRUCTION.**
// `projection.ts`'s `AGE_PENSION_LINE` is pushed once a month with no Person's name in it — Centrelink
// assesses and pays a couple jointly and the engine matches that — so a golden file that invented a
// 50/50 split would be asserting an attribution nothing in `src/` computes.
//
// **SUPER BALANCE IS A HOUSEHOLD, PHASE-POOLED FIGURE, FOR THE SAME REASON.** `Month.superBalance`
// is the Household's combined superannuation "whatever its phase (accumulation, TTR, Account-Based
// Pension)" (`plan.ts`'s own doc on the field) and no per-interest or per-Person balance is reported
// anywhere on `Month` — only the three POOLED asset splits (`assetsByPerson`: protected / assessable
// / accessible), which cross-cut phase and person and are not a phase split either. A golden file
// that reconstructed "Alex's accumulation balance" from `assetsByPerson` would be inventing a fourth
// figure the engine never computed, from parts that do not add up to it. So this file reports the
// one figure that IS real: the household's pooled `superBalance`, at the year's close.
//
// **NO SUSTAINABLE-SPEND HEADLINE.** `core/sustainableSpend.ts`'s search re-runs `project()` roughly
// twenty times to converge (`app/chat/tools/solveSustainableSpend.ts`'s own header: "COST: about 20
// walks"); it is a SOLVE over a knob, not a pure read of the one walk this file pins, so it is out of
// scope for a golden file keyed to a single projection.
//
// Run:  npm run build && node scripts/golden-update.mjs
//
// Lives outside `src/` for `moneysmart-baseline.mjs`'s reason: `tsconfig.json`'s `"include": ["src"]`
// would compile a `node:fs` reader into the browser bundle and fail `test/import-graph.test.mjs`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePlan } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';
import { groupByFinancialYear, financialYearOfMonth } from '../dist/core/financialYear.js';
import { agesAt, shortfallAge, mortgagePayoff, retirementMonths } from '../dist/core/outcomes.js';
import { addCents, subCents, toCents } from '../dist/core/money.js';
import { financialYearSummaries, monthFlows, settledFinancialYear } from '../dist/app/chat/tools/financialYearSummary.js';
import {
  INCOME_FROM_SUPER_LINES,
  capitalGainsTaxDescription,
  division293Description,
  division293ReleaseDescription,
  division293ReleaseRefundDescription,
  division293TrueUpDescription,
  incomeTaxDescription,
  salaryDescription,
  superPaymentDescription,
  taxTrueUpDescription,
} from '../dist/core/projection.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PATH = join(REPO, 'fixtures', 'demo-couple.plan.json');
const GOLDEN_PATH = join(REPO, 'fixtures', 'golden', 'demo-couple.golden.json');

const nil = () => toCents(0);

// --- Per-person salary / tax / super drawn, the one sum this file adds that `financialYearSummary.ts`
// does not already offer pooled ------------------------------------------------------------------

const PERSON_KINDS = ['salary', 'tax', 'superDrawn'];
// Positive when the line comes IN — the same convention `financialYearSummary.ts`'s `POSITIVE_WHEN_IN`
// states: salary and a super payment are inflows by nature, while tax is positive when PAID (an
// outflow) and negative on a net refund (an inflow of tax already paid back).
const INFLOW_POSITIVE = new Set(['salary', 'superDrawn']);

const personKindMap = (person, settled) => {
  const map = new Map([
    [salaryDescription(person.name), 'salary'],
    [incomeTaxDescription(person.name), 'tax'],
    [capitalGainsTaxDescription(person.name), 'tax'],
    [taxTrueUpDescription(person.name, settled), 'tax'],
    [division293Description(person.name), 'tax'],
    [division293TrueUpDescription(person.name, settled), 'tax'],
    [division293ReleaseRefundDescription(person.name, settled), 'tax'],
    [division293ReleaseDescription(person.name, settled), 'tax'],
  ]);
  for (const line of INCOME_FROM_SUPER_LINES) map.set(superPaymentDescription(line, person), 'superDrawn');
  return map;
};

/** One month's per-Person totals, `household.persons` order — `financialYearSummary.ts`'s `monthFlows`, forked per Person. */
const personMonthFlows = (household, month) => {
  const settled = settledFinancialYear(month.month);
  return household.persons.map((person) => {
    const kindOf = personKindMap(person, settled);
    const totals = { salary: nil(), tax: nil(), superDrawn: nil() };
    for (const line of month.lines) {
      const kind = kindOf.get(line.description);
      if (kind === undefined) continue;
      const countedIn = (line.direction === 'inflow') === INFLOW_POSITIVE.has(kind);
      totals[kind] = countedIn ? addCents(totals[kind], line.amount) : subCents(totals[kind], line.amount);
    }
    return totals;
  });
};

const addPersonTotals = (a, b) => ({
  salary: addCents(a.salary, b.salary),
  tax: addCents(a.tax, b.tax),
  superDrawn: addCents(a.superDrawn, b.superDrawn),
});

const sumPersonTotals = (rows) => rows.reduce(addPersonTotals, { salary: nil(), tax: nil(), superDrawn: nil() });

// --- Assemble ----------------------------------------------------------------------------------

const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const plan = parsePlan(raw);
const { household, settings, entries } = plan;
const months = project(settings, household, entries);
if (months.length === 0) throw new Error('project() returned no months — nothing to pin');

const householdYears = financialYearSummaries(household, months);
const groups = groupByFinancialYear(months);
if (groups.length !== householdYears.length) {
  throw new Error(`groupByFinancialYear produced ${groups.length} years but financialYearSummaries produced ${householdYears.length}`);
}

const years = groups.map((group, index) => {
  const first = group[0];
  const last = group.at(-1);
  const householdYear = householdYears[index];
  if (householdYear.financialYear !== financialYearOfMonth(first.month)) {
    throw new Error(`year ${index}: householdYear ${householdYear.financialYear} does not match group's ${financialYearOfMonth(first.month)}`);
  }

  const perPersonRows = group.map((month) => personMonthFlows(household, month));
  const perPersonTotals = household.persons.map((_person, personIndex) =>
    sumPersonTotals(perPersonRows.map((row) => row[personIndex])),
  );

  // Structural cross-check, not a display concern: every per-Person total must sum to the pooled
  // household figure `financialYearSummaries()` already computed, or this script's per-Person
  // mechanism has drifted from the household one and must not write a byte.
  const pooledSalary = perPersonTotals.reduce((sum, p) => addCents(sum, p.salary), nil());
  if (pooledSalary !== householdYear.flows.income.salary) {
    throw new Error(`${householdYear.financialYear}: per-person salary ${pooledSalary} !== household salary ${householdYear.flows.income.salary}`);
  }
  const pooledTax = perPersonTotals.reduce((sum, p) => addCents(sum, p.tax), nil());
  const householdTax = addCents(householdYear.flows.incomeTax, householdYear.flows.division293Tax);
  if (pooledTax !== householdTax) {
    throw new Error(`${householdYear.financialYear}: per-person tax ${pooledTax} !== household tax ${householdTax}`);
  }
  const pooledSuperDrawn = perPersonTotals.reduce((sum, p) => addCents(sum, p.superDrawn), nil());
  if (pooledSuperDrawn !== householdYear.flows.income.incomeFromSuper) {
    throw new Error(
      `${householdYear.financialYear}: per-person super drawn ${pooledSuperDrawn} !== Month.incomeFromSuper total ${householdYear.flows.income.incomeFromSuper}`,
    );
  }

  const ages = agesAt(household, first);

  return {
    financialYear: householdYear.financialYear,
    firstMonth: householdYear.firstMonth,
    lastMonth: householdYear.lastMonth,
    monthsCovered: householdYear.monthsCovered,
    partial: householdYear.partial,
    ages: ages.ages.map(({ name, age }) => ({ person: name, age })),
    ...(ages.died === undefined ? {} : { died: ages.died }),
    persons: household.persons.map((person, personIndex) => ({
      name: person.name,
      salaryCents: perPersonTotals[personIndex].salary,
      superDrawnCents: perPersonTotals[personIndex].superDrawn,
      taxCents: perPersonTotals[personIndex].tax,
    })),
    household: {
      agePensionCents: householdYear.flows.agePension,
      spendingCents: addCents(householdYear.flows.spending.household, householdYear.flows.spending.oneOffExpenses),
      mortgageRepaymentsCents: householdYear.flows.spending.mortgageRepayments,
      mortgageBalanceCents: last.mortgageBalance === undefined ? null : last.mortgageBalance,
      offsetCashCents: last.closingBalance,
      superBalanceCents: last.superBalance,
      investmentsCents: last.closingNonSuperPortfolio,
      totalWealthCents: addCents(addCents(last.closingBalance, last.superBalance), last.closingNonSuperPortfolio),
      shortfallCents: householdYear.flows.unfundedShortfall,
    },
  };
});

const shortfall = shortfallAge(months, household);
const payoff = mortgagePayoff(months, household);
const retirements = retirementMonths(months, household, entries);

const markers = {
  shortfallAge:
    shortfall.outcome === 'never'
      ? { outcome: 'never' }
      : {
          outcome: 'shortfall',
          firstShortfall: { month: shortfall.firstShortfall.month, ages: shortfall.firstShortfall.ages },
          recovered: shortfall.recovered,
          monthsShort: shortfall.monthsShort,
        },
  mortgagePayoff: {
    outcome: payoff.outcome,
    firstPayoff: payoff.firstPayoff === undefined ? null : { month: payoff.firstPayoff.month, ages: payoff.firstPayoff.ages },
    owedAtHorizonCents: payoff.owedAtHorizon === undefined ? null : payoff.owedAtHorizon,
    lastReported: payoff.lastReported ?? null,
  },
  retirements: retirements.map((retirement) => ({ name: retirement.name, month: retirement.month ?? null, age: retirement.age ?? null })),
};

const golden = {
  note:
    'GENERATED by scripts/golden-update.mjs — never hand-edited. One row per financial year over ' +
    "fixtures/demo-couple.plan.json's baseline walk, in whole nominal cents exactly as project() " +
    'computed them (never rounded, never converted to today\'s money). A moved figure is a real ' +
    "regression signal or a real, named change to the engine's rules — never re-run this script " +
    'just to go green; see test/golden-demo-couple.test.mjs\'s header before accepting a move.',
  fixture: 'fixtures/demo-couple.plan.json',
  firstMonth: months[0].month,
  lastMonth: months.at(-1).month,
  monthCount: months.length,
  years,
  markers,
};

writeFileSync(GOLDEN_PATH, `${JSON.stringify(golden, null, 2)}\n`);
console.log(`wrote ${GOLDEN_PATH}: ${years.length} financial years, ${months.length} months (${months[0].month} to ${months.at(-1).month})`);
