// P13-4 — golden-file regression test on the demo couple, `fixtures/demo-couple.plan.json`.
//
// **A golden move is accepted only with a commit naming the mechanism and the expected size of the
// change — NEVER by re-running `npm run golden:update` to make this test green.** A move that lands
// unexplained is exactly the "confidently wrong" failure mode `enough` exists to be organised
// against (see `.claude/agent-memory/dev/project-enough-verification-posture.md`); the commit
// message is the audit trail a diff on its own is not. The corresponding line in README's "Running
// it" section states the same rule for anyone who has not read this file.
//
// This test only READS `fixtures/golden/demo-couple.golden.json` and re-derives the same figures
// from a fresh `project()` walk of the fixture — it never writes the golden file, and never calls
// `scripts/golden-update.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePlan } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';
import { groupByFinancialYear, financialYearOfMonth } from '../dist/core/financialYear.js';
import { agesAt, shortfallAge, mortgagePayoff, retirementMonths } from '../dist/core/outcomes.js';
import { addCents, subCents, toCents } from '../dist/core/money.js';
import { financialYearSummaries, settledFinancialYear } from '../dist/app/chat/tools/financialYearSummary.js';
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

// --- The same derivation `scripts/golden-update.mjs` uses, kept in step with it deliberately: this
// test's job is to catch a MOVED FIGURE, not a divergent derivation, so both re-derive the golden
// shape the identical way and a golden-update.mjs edit without a matching edit here would itself be
// a silent regression in what this test can catch. -------------------------------------------------

const nil = () => toCents(0);
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

const buildActual = () => {
  const plan = parsePlan(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')));
  const { household, settings, entries } = plan;
  const months = project(settings, household, entries);

  const householdYears = financialYearSummaries(household, months);
  const groups = groupByFinancialYear(months);

  const years = groups.map((group, index) => {
    const first = group[0];
    const last = group.at(-1);
    const householdYear = householdYears[index];
    const perPersonRows = group.map((month) => personMonthFlows(household, month));
    const perPersonTotals = household.persons.map((_person, personIndex) =>
      sumPersonTotals(perPersonRows.map((row) => row[personIndex])),
    );
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

  return { firstMonth: months[0].month, lastMonth: months.at(-1).month, monthCount: months.length, years, markers };
};

// --- Flatten a year row to `FY / line / value` triples, so a mismatch can be reported by name -----

const flattenYear = (year) => {
  const rows = [];
  const label = year.financialYear;
  for (const person of year.persons) {
    rows.push([`${label} ${person.name} salary`, person.salaryCents]);
    rows.push([`${label} ${person.name} super drawn`, person.superDrawnCents]);
    rows.push([`${label} ${person.name} tax`, person.taxCents]);
  }
  for (const [key, value] of Object.entries(year.household)) rows.push([`${label} household ${key}`, value]);
  rows.push([`${label} monthsCovered`, year.monthsCovered]);
  rows.push([`${label} partial`, year.partial]);
  return rows;
};

test('demo couple golden file matches a fresh projection, financial year by financial year', () => {
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
  const actual = buildActual();

  assert.equal(actual.firstMonth, golden.firstMonth, 'the walk\'s first month moved');
  assert.equal(actual.lastMonth, golden.lastMonth, 'the walk\'s last month moved');
  assert.equal(actual.monthCount, golden.monthCount, 'the walk\'s length moved');
  assert.equal(actual.years.length, golden.years.length, 'the number of financial years moved');

  const moved = [];
  for (let index = 0; index < golden.years.length; index += 1) {
    const goldenRows = new Map(flattenYear(golden.years[index]));
    const actualRows = new Map(flattenYear(actual.years[index]));
    for (const [key, goldenValue] of goldenRows) {
      const actualValue = actualRows.get(key);
      if (actualValue !== goldenValue) moved.push({ key, old: goldenValue, new: actualValue });
    }
  }

  if (moved.length > 0) {
    const summary = moved
      .slice(0, 10)
      .map(({ key, old, new: next }) => `  ${key}: ${old} -> ${next}`)
      .join('\n');
    assert.fail(`${moved.length} figure(s) moved against the golden file (first 10 shown):\n${summary}`);
  }

  assert.deepEqual(actual.markers, golden.markers, 'the golden markers (shortfall age, mortgage payoff, retirements) moved');
});
