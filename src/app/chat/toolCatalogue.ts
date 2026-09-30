// plan_ai.md §5 and §14, stage 4 — **the tools as a model is offered them: name, description, input
// schema, and the call.** One catalogue for both routes. The connector (`server/connector.mjs`) serves
// it over MCP and reads the plan from disk on each call; the in-app conversation (`conversation.ts`)
// offers it to the provider and runs each call on the plan the page holds, through the figure store.
// A tool described one way to Claude Desktop and another way in the page would be two copies of one
// fact, so neither route keeps its own.
//
// Every call returns the tool's serialised result (identity and money guards already applied); a
// question the tool will not answer comes back as its named refusal, never a throw.
import { OFFERED_ENTRY_TYPES } from '../planEdits.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { MONEY_VIEW_TAG } from '../todaysDollars.js';
import { assumptionTopics, explainAssumption, listAssumptions } from './tools/explainAssumption.js';
import { getMarkers } from './tools/getMarkers.js';
import { getMonth } from './tools/getMonth.js';
import { listEntries } from './tools/listEntries.js';
import { proposeEntries } from './tools/proposeEntries.js';
import { proposeScenario } from './tools/proposeScenario.js';
import { DETAILS, runProjection } from './tools/runProjection.js';
import { solveSustainableSpend } from './tools/solveSustainableSpend.js';
import { whatCanYouModel } from './tools/whatCanYouModel.js';
import type { PlanFile } from '../../core/parsePlan.js';
import type { MoneyView } from '../todaysDollars.js';
import type { Detail } from './tools/runProjection.js';

type JsonType = 'string' | 'object' | 'array';

export interface PropertySchema {
  readonly type: JsonType;
  readonly [keyword: string]: unknown;
}

export interface InputSchema {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, PropertySchema>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: InputSchema;
}

export type ToolArguments = Readonly<Record<string, unknown>>;

export interface CatalogueTool {
  readonly definition: ToolDefinition;
  readonly run: (plan: PlanFile, args: ToolArguments) => string;
}

const BASIS: PropertySchema = {
  type: 'string',
  enum: Object.keys(MONEY_VIEW_TAG),
  description: 'todaysDollars (the default): every figure in today’s money. futureDollars: every figure in the dollars of its own month.',
};
const SCENARIO: PropertySchema = { type: 'string', description: 'A scenario id, as listEntries or a refusal gives it. Absent: the plan’s active scenario.' };

/** Each offered type's params, as a draft states them. Hand-kept: the door refuses a wrong one by name. */
const PARAMS: Readonly<Record<string, string>> = {
  SPEND_CHANGE: '{ annualSpend } — household spending a year from this date, in today’s money, not counting home loan repayments; not negative',
  RETIRE: '{} — the owner retires on this date',
  WORK_PATTERN_CHANGE: '{ daysPerWeek, annualSalary } — annualSalary is what the NEW pattern actually pays a year (for part-time, the reduced pay, not the full-time rate), in today’s wages; daysPerWeek only records why and is never turned into pay; daysPerWeek 0 stops the salary and must state annualSalary 0, and any other daysPerWeek needs an annualSalary above 0',
  ONE_OFF_EXPENSE: '{ amount } — as it will cost on the day',
  LUMP_SUM_FROM_SUPER: '{ amount, interestIndex } — out of the owner’s super account interestIndex; owner personA or personB; amount above 0',
  SUPER_CONTRIBUTION: '{ kind: "salarySacrificed", annualAmount, interestIndex } or { kind: "stopped" } — owner personA or personB ("household" is refused). annualAmount above 0, into an accumulation account (a TTR or pension account is refused). "stopped" ends the owner’s sacrifice from this date and is refused unless a "salarySacrificed" entry of theirs is running before it. No other kind (employer, personal deductible, non-concessional) is modelled',
  MORTGAGE_REFINANCE: '{ openingBalance, annualInterestRate, monthlyRepayment } — annualInterestRate a decimal (0.061 is 6.1%); owner ignored. openingBalance and monthlyRepayment above 0 (to clear the loan, MORTGAGE_PAYOFF). Refused on or after a HEAS_DRAW’s date',
  MORTGAGE_TARGET: '{} — a date the owner means to be clear of the home loan by',
  MORTGAGE_PAYOFF: '{} — pays everything still owed on the home loan in this month',
  ILLNESS_SEPARATION: '{} — the couple is separated by illness from this date (owner not read). Refused for a single-person household',
  DEATH: '{} — the owner dies on this date; owner personA or personB ("household" is refused). Refused for a single-person household',
  NON_SUPER_INVESTMENT: '{ direction: "buy", amount, incidentalCostsOfAcquisition } or { direction: "sell", amount, parcelSelection? } — owner personA or personB; parcelSelection "oldest-first", "highest-cost-base-first" or "lowest-cost-base-first"',
  RETURN_CHANGE: '{ rate } — the owner’s investment return a year from this date, a decimal (0.065 is 6.5%)',
  TTR_START: '{ interestIndex, drawdownRate?, amount? } — from this date a transition to retirement pension starts from the owner’s accumulation account interestIndex; owner personA or personB. drawdownRate a decimal from 0.04 to 0.1, absent pays the yearly minimum. amount in cents, more than 0: the forecast opens a new account for the pension and moves that much into it from interestIndex on the first of the month (capped at its balance), and interestIndex stays in accumulation; absent, interestIndex itself becomes the pension. It converts to a full pension at a later RETIRE or the 65th birthday. Refused dated before the plan’s start date, before the owner’s 60th birthday or on or after the 65th, while the owner is stopped after a RETIRE in the same scenario, or a second start for the same account; without an amount, also for the account the employer pays into or when the owner has no other accumulation account',
  TTR_RATE_CHANGE: '{ interestIndex, drawdownRate } — the owner’s TTR account interestIndex draws drawdownRate a year from this date; owner personA or personB. drawdownRate a decimal from 0.04 to 0.1 (0.07 is 7%). Refused for an account not in the TTR phase (an accumulation account counts from its own TTR_START), or dated on or after the owner’s 65th birthday',
  INSURANCE_COVER_CHANGE: '{ interestIndex, benefit, coverFraction } — from this date the owner’s super account interestIndex keeps coverFraction of its "death", "tpd" or "both" cover, and the premium falls by the same share; coverFraction a decimal from 0 (cancel) to below 1 (raising cover is refused: not modelled). A later change for the same account and benefit replaces it; the insurance admin fee stops once every premium on the account (death, TPD and income protection) is nil. Owner personA or personB. Refused with no premium stated for that benefit, dated before the plan’s start date, or dated on or after the birthday that account’s cover for the benefit ends (its statedDeathCoverEndsAtAge or statedTpdCoverEndsAtAge, 70 when absent; for "both", whichever ends first)',
  SPOUSE_CONTRIBUTION: '{ amount, receivingInterestIndex } — the owner pays into the OTHER person’s account receivingInterestIndex; owner personA or personB, in a couple only. amount above 0; the receiving account must be in accumulation',
  ENTER_CARE: '{ homeValue, radPrice, radPaidAsLumpSum } — the owner moves into permanent residential aged care on this date; owner personA or personB only. All three are the household’s own estimate: the home’s value, the agreed room price (a refundable deposit, RAD) and how much of it is paid as a lump sum, radPaidAsLumpSum 0..radPrice — the rest accrues as a daily accommodation payment. One per Person',
  HEAS_DRAW: '{ securityValue, fortnightlyAmount, stopDate?, advances? } — a Home Equity Access Scheme loan against the home, from this date; owner personA or personB (each Person’s own loan; "household" is refused). advances is an optional list of { date, amount } lump sums on that Person’s own loan. securityValue is the household’s own estimate of the home’s value; fortnightlyAmount is a stated Cents figure (checked against the absolute 150% ceiling) or the literal "maximum" (150% of the full Age Pension less any Age Pension actually received, every fortnight); stopDate is optional and must be after date. One per Person per scenario; a couple’s two must state the same securityValue. Refused unless the household owns its home and someone in it has reached Age Pension age by date. Each advance must fall between date and stopDate, at most 2 in any 26 fortnights, together at most 50% of the owner’s annual maximum Age Pension rate. A MORTGAGE_REFINANCE dated on or after this entry is refused (it would void the No Negative Equity Guarantee)',
  SELL_HOME: '{ salePrice, sellingCosts?, newHomeAmount?, newHomePurchaseDate? } — sells the home outright on this date (owner ignored — a home is a household fact). salePrice/sellingCosts/newHomeAmount are the household’s own estimate; salePrice above 0, sellingCosts at most salePrice, newHomeAmount above 0 and at most salePrice less sellingCosts. Proceeds, net of selling costs, any mortgage still owing and any Home Equity Access Scheme debt (capped at the sale price), land in cash; the household becomes a non-homeowner from this date, UNLESS newHomeAmount is stated — the part of the net proceeds set aside for a new home, excluded from the Age Pension assets test for 24 months from settlement (household treated as a homeowner throughout) and deemed at the lower rate only; the window closes unconditionally at 24 months (no discretionary extension modelled), after which the household becomes a non-homeowner as if nothing had been set aside. newHomePurchaseDate is refused if stated — the purchase is a BUY_HOME entry; leave it out. Refused with no home to sell, or a second one',
  BUY_HOME: '{ purchasePrice, purchaseCosts? } — buys a new home on this settlement date (owner ignored — a home is a household fact). Both are the household’s own estimate in today’s money; purchaseCosts is stamp duty and fees. Paid first from the SELL_HOME’s newHomeAmount set-aside, the rest through the Waterfall; refused if it cannot be paid in full. The household is a homeowner again from this date, and the sale-proceeds exemption ends. Refused without a SELL_HOME in an earlier month of the same scenario, a second BUY_HOME, an ENTER_CARE in the scenario, or a HEAS_DRAW on or after it',
  DOWNSIZER_CONTRIBUTION: '{ amount, receivingInterestIndex, statedOwnedTenYears: true } — home sale money into the owner’s OWN super account receivingInterestIndex (accumulation only), paid in this month; owner personA or personB, and the spouse not on the title may contribute too. amount is in today’s money, at most $300,000 once raised to the date (the cap is not indexed); the couple’s total cannot exceed the SELL_HOME’s salePrice. statedOwnedTenYears must be true (10+ years’ ownership, not checked). Paid from the sale’s set-aside first, then through the Waterfall; refused if it cannot be paid in full. No contributions tax, no cap usage, no deduction. Refused without a SELL_HOME in the same scenario, dated before the sale or more than 90 days after it, with the owner under 55, or a second one for the same Person',
  RENT_OUT_HOME: '{ weeklyRent, annualRates?, annualInsurance?, annualAgentFees?, annualRepairs?, endDate? } — rents the whole home out from this date to an optional end date (owner ignored — a home is a household fact). All the household’s own estimate. Net rent (weekly rent less the four yearly costs) is assessable income for tax, the Age Pension income test and the aged-care means test — never deemed, and floored at nil for the two means tests but not for tax, where a loss can offset other income. The home becomes an assessable, non-homeowner asset once nobody protects it, valued from an ENTER_CARE entry’s own estimate or refused if none exists. A SELL_HOME more than 6 years after this date is refused. endDate must be after date. Refused with no home to rent, a SELL_HOME on or before this date, overlapping tenancies, or an ENTER_CARE while the tenancy runs',
};

const ENTRY_SHAPE =
  'Each entry is { date: "YYYY-MM-DD", owner: "personA" | "personB" | "household", type, params, enabled: true, createdAt: "YYYY-MM-DD" }. ' +
  'Money is in whole cents ($1,234.56 is 123456). Super accounts are numbered from 1. The types, with their params: ' +
  OFFERED_ENTRY_TYPES.map((type) => `${type} ${PARAMS[type]}`).join('; ') +
  '.';

const WHAT_IF: PropertySchema = {
  type: 'object',
  description: `The what-if: { add?: [entry, ...], disable?: [entry id, ...], replace?: [{ entryId, with: entry }, ...] }, with entry ids from listEntries. ${ENTRY_SHAPE}`,
  properties: {
    add: { type: 'array', items: { type: 'object' } },
    disable: { type: 'array', items: { type: 'string' } },
    replace: {
      type: 'array',
      items: { type: 'object', properties: { entryId: { type: 'string' }, with: { type: 'object' } }, required: ['entryId', 'with'], additionalProperties: false },
    },
  },
  additionalProperties: false,
};

const tool = (name: string, description: string, properties: Record<string, PropertySchema>, required: readonly string[], run: CatalogueTool['run']): CatalogueTool => ({
  definition: { name, description, inputSchema: { type: 'object', properties, required, additionalProperties: false } },
  run,
});

// `argumentsRefusal` has already checked each argument's JSON type; the tools refuse their contents by name.
const text = (args: ToolArguments, key: string): string => args[key] as string;
const options = (args: ToolArguments): { scenarioId?: string; basis?: MoneyView } =>
  ({ scenarioId: args['scenarioId'], basis: args['basis'] }) as { scenarioId?: string; basis?: MoneyView };

export const TOOLS: readonly CatalogueTool[] = [
  tool('listEntries', 'The scenario’s own entries: id, type, owner, the entries table’s wording with every figure labelled, and whether each is switched on. Use the ids in a what-if.',
    { scenarioId: SCENARIO, basis: BASIS }, [], (plan, args) => listEntries(plan, options(args))),
  tool('runProjection', 'Runs a what-if on a scenario through the engine and returns the engine’s own difference from the scenario as it is: every marker before and after, and each year’s headline figures that changed, all labelled. With no whatIf it is the scenario as it is. detail "full" returns every figure of every year.',
    { whatIf: WHAT_IF, scenarioId: SCENARIO, basis: BASIS, detail: { type: 'string', enum: [...DETAILS] } }, [],
    (plan, args) => runProjection(plan, args['whatIf'], { ...options(args), detail: args['detail'] as Detail })),
  tool('getMonth', 'One month of the scenario’s forecast, line by line, with the entries that applied that month.',
    { month: { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'YYYY-MM' }, scenarioId: SCENARIO, basis: BASIS }, ['month'],
    (plan, args) => getMonth(plan, text(args, 'month'), options(args))),
  tool('getMarkers', 'The scenario’s markers: Shortfall Age, Pension-Only Age, the Contingency Floor, the home loan payoff, and each person’s retirement.',
    { scenarioId: SCENARIO, basis: BASIS }, [], (plan, args) => getMarkers(plan, options(args))),
  tool('solveSustainableSpend', 'The highest spending the scenario sustains to the end of the forecast, found by the engine’s own search, or the search’s named refusal. Takes about a second.',
    { scenarioId: SCENARIO, basis: BASIS }, [], (plan, args) => solveSustainableSpend(plan, options(args))),
  tool('explainAssumption', 'One legislated rate, threshold or Setting: its value, source, retrieval date and confidence. listAssumptions gives the keys.',
    { key: { type: 'string', description: 'An assumption key, for example one listAssumptions returns.' } }, ['key'],
    (plan, args) => explainAssumption(plan, text(args, 'key'))),
  tool('listAssumptions', 'The assumption keys filed under one topic.',
    { topic: { type: 'string', enum: [...assumptionTopics()] } }, ['topic'], (plan, args) => listAssumptions(plan, text(args, 'topic'))),
  tool('whatCanYouModel', 'What this build models, what it refuses, what it does not model, and the areas not yet checked against anything outside it. Read it before answering a what-if.',
    {}, [], (plan) => whatCanYouModel(plan)),
  tool('proposeEntries', 'Checks a what-if exactly as runProjection does and returns each entry as the boxes of enough’s entry form, with what to type in each (value) and, for a money box, the same figure labelled (amount), plus the entries to switch off. Nothing is saved: the user types them in.',
    { whatIf: WHAT_IF, scenarioId: SCENARIO, basis: BASIS }, ['whatIf'], (plan, args) => proposeEntries(plan, args['whatIf'], options(args))),
  tool('proposeScenario', 'Checks a new scenario, a child of parentId: it inherits every entry of the parent, live, and never copies one. With a whatIf, the entries it adds on top of the parent, checked and returned exactly as proposeEntries checks them against the parent. Nothing is saved.',
    {
      name: { type: 'string', description: 'The new scenario’s name: not blank, not a name a scenario in the plan already has, and never a person’s name.' },
      parentId: { type: 'string', description: 'The id of the scenario it inherits from, as listEntries or a refusal gives it.' },
      whatIf: WHAT_IF,
      basis: BASIS,
    },
    ['name', 'parentId'], (plan, args) => proposeScenario(plan, text(args, 'name'), text(args, 'parentId'), args['whatIf'], options(args).basis)),
];

export const TOOL_BY_NAME: ReadonlyMap<string, CatalogueTool> = new Map(TOOLS.map((each) => [each.definition.name, each]));

const JSON_TYPE: Readonly<Record<JsonType, (value: unknown) => boolean>> = {
  string: (value) => typeof value === 'string',
  object: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  array: Array.isArray,
};

/** The arguments' shape against the tool's schema, top level only: the tools refuse their own contents by name. */
export const argumentsRefusal = (schema: InputSchema, args: ToolArguments): string | undefined => {
  const unknown = Object.keys(args).find((key) => !Object.hasOwn(schema.properties, key));
  if (unknown !== undefined) return `this tool takes only ${Object.keys(schema.properties).join(', ') || 'no arguments'}`;
  const missing = schema.required.find((key) => !Object.hasOwn(args, key));
  if (missing !== undefined) return `${missing} is required`;
  const wrong = Object.entries(args).find(([key, value]) => !JSON_TYPE[schema.properties[key]!.type](value));
  return wrong === undefined ? undefined : `${wrong[0]} must be ${schema.properties[wrong[0]]!.type === 'array' ? 'an array' : `a ${schema.properties[wrong[0]]!.type}`}`;
};

export const refusal = (refused: string, reason: string): string => JSON.stringify({ refused, reason });

/** A tool that threw. Never the message: it may carry a name. The class says which guard or walk refused. */
export const toolFailed = (error: unknown): string =>
  refusal('TOOL_FAILED', `the engine could not answer this (${error instanceof Error ? error.constructor.name : typeof error}), and its message is withheld because it may identify a person`);
