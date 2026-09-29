// The inputs the UI slice (P5-1 / P5-2) renders. A committed, hardcoded Scenario so that the month
// table has something real to draw before any editing (Phase 6) or any save/load (Phase 8) exists.
//
// ⚠️ **THIS IS NOT TODO.md P2-8's "demo couple", and the two must not be conflated.** P2-8's fixture
// is a VERIFICATION artefact: it exists to be run against Moneysmart's Retirement Planner and to be
// frozen as a golden-file baseline, so its figures are chosen to make an external comparison
// meaningful and changing one of them invalidates a published comparison. This one is a DISPLAY
// artefact with one consumer — `src/app/main.ts` — and its figures are chosen to make every
// renderable shape in a `Month` appear at least once. Editing this file breaks nothing but a
// screenshot; editing P2-8's would break a baseline. When P2-8 lands, it lands beside this, not
// on top of it.
//
// **What it is built to produce, and why each input is here.** The row has to be able to show a
// legislated figure with its FY stamp, an unlegislated one, a figure whose register this build does
// not carry, an entry-attributed line, an unattributed one, a wealth movement that is not cash, and
// both kinds of `MonthNote`. So:
//
//   * Ash holds an Account-Based Pension with a stated commencement day → Waterfall limb 2 pays a
//     Schedule 7 minimum, whose line carries `provenance.basis === 'not carried'` and
//     `attribution.basis === 'not attributed'` — the two third members that a display must never
//     collapse into the `'none'` ones.
//   * Dana is still working → a salary line (`'none'` provenance, `'none'` attribution) and an
//     income-tax line (legislated, FY-stamped, and carrying the borrowed Medicare thresholds'
//     prior-year-fallback caveat — P5-4a).
//   * Both hold growing balances → `effect: 'wealth'` growth lines, which do NOT reconcile the
//     opening balance to the closing one.
//   * A `SPEND_CHANGE` and a `ONE_OFF_EXPENSE` → lines attributed to a named entry
//     (`attribution.basis === 'entries'`).
//   * No `economicSeries.agePension` forward series is stated → past the published Age Pension
//     window the walk indexes the rates and cut-offs on this plan's own `cpi`, `pblci` and `mtawe`,
//     and each such pension line names the generated series in its provenance (2026-09-23). That is
//     the ordinary state of a plan whose owner has not forecast the indexation calendar, not a
//     contrivance. **From 2026-09-21 to that day the walk carried the last published sets forward
//     and emitted a `standing parameters` note; before 2026-09-21 it emitted
//     `PARAMETER_WINDOW_NOTES['Age Pension']` and paid nothing at all.** Neither note is reached by
//     this fixture now.
//
// Everything is stated; nothing is defaulted. `toCents` is the only way money is written (ADR-0001).
import { toCents } from '../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Entry, Scenario, Settings } from '../core/plan.js';
import type { Household, Person } from '../core/household.js';
import { PLAN_FILE_VERSION } from '../core/parsePlan.js';
import type { PlanFile } from '../core/parsePlan.js';

const DANA: Person = {
  name: 'Dana',
  dateOfBirth: '1968-05-14',
  superInterests: [{ phase: 'accumulation', balance: toCents(412_000) }],
  parcels: [{ acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) }],
  employmentIncomePerFortnight: toCents(3_100),
  workBonusBalance: toCents(0),
};

const ASH: Person = {
  name: 'Ash',
  dateOfBirth: '1960-02-09',
  superInterests: [
    {
      phase: 'accountBasedPension',
      balance: toCents(538_000),
      // Sch 7 keys everything off the commencement day and `projection.ts` never guesses one; with
      // it absent, limb 2 stays nil in every month and the `'not carried'` provenance this slice
      // must render would never appear.
      statedStreamSettings: { commencementDay: '2022-08-01' },
    },
  ],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
};

export const DEMO_HOUSEHOLD: Household = {
  persons: [DANA, ASH],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(42_000),
};

export const DEMO_SETTINGS: Settings = {
  asAtDate: '2026-09-01',
  planningHorizonAge: 100,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

export const DEMO_ENTRIES: readonly Entry[] = [
  {
    id: 'spend-2026',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(84_000) },
    enabled: true,
    note: 'The standing spending level.',
    createdAt: '2026-08-20',
  },
  {
    id: 'dana-retires',
    date: '2031-05-14',
    owner: 'personA',
    type: 'RETIRE',
    params: {},
    enabled: true,
    note: 'Dana stops work at 63.',
    createdAt: '2026-08-20',
  },
  {
    id: 'new-roof',
    date: '2029-11-01',
    owner: 'household',
    type: 'ONE_OFF_EXPENSE',
    params: { amount: toCents(38_000) },
    enabled: true,
    note: 'Re-roof.',
    createdAt: '2026-08-20',
  },
];

/**
 * **The seed a first run writes to `plan.json`, and nothing more than that.**
 *
 * From P8, `src/app/main.ts` no longer imports the three constants above: it reads the plan from
 * disk. This is what it writes there the first time, when there is no file yet — so the fixture
 * stops being *the* state of the app and becomes the state a brand-new install starts from. Every
 * run after the first reads the user's own file and never looks here again.
 *
 * It is assembled from the same three constants rather than restating them, so there is exactly one
 * copy of the demo figures and the round-trip tests and the page cannot disagree about them.
 */
/**
 * **The one Scenario a new install starts with (v2, P6-4).** `parentId: null` — it is the root —
 * and its `entryIds` are every entry in the pool, which is the same list a v1 file migrates to:
 * a file with one Scenario holding everything means exactly what a v1 file meant, and that
 * equivalence is what makes the migration a no-op on every figure.
 */
const DEMO_BASELINE: Scenario = {
  id: 'baseline',
  name: 'Baseline',
  parentId: null,
  entryIds: DEMO_ENTRIES.map((entry) => entry.id),
};

export const DEMO_PLAN: PlanFile = {
  version: PLAN_FILE_VERSION,
  settings: DEMO_SETTINGS,
  household: DEMO_HOUSEHOLD,
  entries: DEMO_ENTRIES,
  scenarios: [DEMO_BASELINE],
  activeScenarioId: DEMO_BASELINE.id,
};
