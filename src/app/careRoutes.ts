// P14-14 — "Compare ways to pay for care": one `ENTER_CARE` in, up to four child Scenarios
// of the CURRENT Scenario out, one per funding route. Pure, `scenarioList.ts`'s idiom: the caller
// supplies `createdAt` and sends the result through `savePlan`, the one write path.
//
// Each child switches the parent's `ENTER_CARE` off and adds its own copy, so the door's
// per-Scenario checks (`parsePlan`'s `careCheckScopes`) see one per Person in each. A route whose
// walk is refused is NOT created (user ruling, 2026-09-25): it is tried here, alone, and reported
// as skipped with the refusal's own reason. Scenario ids are derived from the parent and the care
// entry, so a re-run hits `scenarioList`'s duplicate-id rule and the route is skipped, never doubled.
//
// The fourth route draws HEAS at the most allowed from the care month, secured on `homeValue`. It is
// skipped, not guessed, where a home loan is stated (the security would need the loan netted off) or
// the Person already has a `HEAS_DRAW` in the scenario (the door allows one per Person).
import { scenarioCloned } from './scenarioList.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { rentOutHomeEntry } from './planEdits.js';
import { activeScenario, scenarioEntries, scenarioById } from './scenarioWalks.js';
import type { Projector } from './scenarioWalks.js';
import { project } from '../core/projection.js';
import { parsePlan } from '../core/parsePlan.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { Entry } from '../core/plan.js';
import { toCents } from '../core/money.js';

export const CARE_ROUTE_NAMES = {
  sell: 'Sell home, pay deposit',
  rent: 'Keep home, rent it out, pay daily',
  empty: 'Keep home empty, pay daily',
  heas: 'Keep home, draw HEAS, pay daily',
} as const;

export type CareRoute = keyof typeof CARE_ROUTE_NAMES;

export interface CareRouteSkip {
  readonly route: CareRoute;
  readonly reason: string;
}

export interface CareRoutes {
  /** The plan with every created route in it, or `null` when none was — nothing to save. */
  readonly plan: PlanFile | null;
  /** The ids of the Scenarios created, in route order. */
  readonly created: readonly string[];
  readonly skipped: readonly CareRouteSkip[];
}

/** One line per skipped route: which one, and why. */
export const careRouteSkipLine = (skip: CareRouteSkip): string => `Skipped “${CARE_ROUTE_NAMES[skip.route]}”: ${skip.reason}`;

/** The first of the month after `date`'s month — `RENT_OUT_HOME`'s start (ruling (c), 2026-09-25). */
const monthAfter = (date: string): string => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
};

export const careRouteScenarioId = (parentId: string, careId: string, route: CareRoute): string => `${parentId}.care-${careId}.${route}`;

export const careRoutes = (
  plan: PlanFile,
  careEntryId: string,
  weeklyRent: string,
  createdAt: string,
  walk: Projector = project,
): CareRoutes => {
  const parent = activeScenario(plan);
  const care = scenarioEntries(plan, parent).find((entry) => entry.id === careEntryId);
  if (care === undefined || care.type !== 'ENTER_CARE') {
    throw new RangeError(`"${careEntryId}" is not an ENTER_CARE entry of the scenario in view`);
  }
  if (!care.enabled) throw new RangeError('this move into care is switched off in this scenario — switch it on to compare ways to pay for it');

  let next = plan;
  const created: string[] = [];
  const skipped: CareRouteSkip[] = [];
  const inParent = scenarioEntries(plan, parent);
  for (const route of ['sell', 'rent', 'empty', 'heas'] as const) {
    const id = careRouteScenarioId(parent.id, care.id, route);
    const existing = next.scenarios.find((scenario) => scenario.id === id);
    if (existing !== undefined) {
      skipped.push({ route, reason: `it is already in the plan as “${existing.name}”` });
      continue;
    }
    if (route === 'rent' && weeklyRent.trim() === '') {
      skipped.push({ route, reason: 'no weekly rent was typed — type the rent you expect to compare renting the home out' });
      continue;
    }
    if (route === 'heas' && (plan.household.mortgage !== undefined || inParent.some((entry) => entry.enabled && entry.type === 'MORTGAGE_REFINANCE'))) {
      skipped.push({ route, reason: 'a home loan is stated — the loan would need taking off the home’s value to find what HEAS can lend against' });
      continue;
    }
    if (route === 'heas' && inParent.some((entry) => entry.type === 'HEAS_DRAW' && entry.owner === care.owner)) {
      skipped.push({ route, reason: 'this person already has a Home Equity Access Scheme loan in this scenario' });
      continue;
    }
    const careCopy: Entry = {
      ...care,
      id: `${id}.enter-care`,
      createdAt: createdAt as Entry['createdAt'],
      params: { ...care.params, radPaidAsLumpSum: route === 'sell' ? care.params.radPrice : toCents(0) },
    };
    const added: unknown[] = [careCopy];
    if (route === 'sell') {
      added.push({ id: `${id}.sell-home`, date: care.date, owner: 'household', type: 'SELL_HOME', params: { salePrice: care.params.homeValue }, enabled: true, createdAt });
    }
    if (route === 'rent') {
      added.push(rentOutHomeEntry(
        { date: monthAfter(care.date), owner: 'household', note: '', weeklyRent, annualRates: '', annualInsurance: '', annualAgentFees: '', annualRepairs: '', endDate: '' },
        `${id}.rent-out-home`,
        createdAt,
      ));
    }
    if (route === 'heas') {
      added.push({ id: `${id}.heas-draw`, date: care.date, owner: care.owner, type: 'HEAS_DRAW', params: { securityValue: care.params.homeValue, fortnightlyAmount: 'maximum' }, enabled: true, createdAt });
    }
    const scenarios = scenarioCloned(next.scenarios, parent.id, id, `${parent.name} — ${CARE_ROUTE_NAMES[route]}`).map((scenario) =>
      scenario.id === id
        ? { ...scenario, entryIds: added.map((entry) => (entry as Entry).id), entryOverrides: { [care.id]: false } }
        : scenario);
    const candidate = { ...next, entries: [...next.entries, ...added], scenarios };
    try {
      const parsed = parsePlan(candidate);
      walk(parsed.settings, parsed.household, scenarioEntries(parsed, scenarioById(parsed, id)));
      next = parsed;
      created.push(id);
    } catch (error) {
      skipped.push({ route, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { plan: created.length === 0 ? null : next, created, skipped };
};
