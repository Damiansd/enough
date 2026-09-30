// plan_ai.md §12.4 and ADR-0011 §3 — **`proposeEntries`: a what-if, checked, handed back as the
// boxes of the entry form to type it into.** No suggestion code, no file, no queue: the answer is
// words, and an unused one is just text in a chat log.
//
// **THE CHECK IS `runProjection`'s, WHOLE.** The what-if (`{ add, disable, replace }`, or a bare list
// of entries to add) goes through `whatIfOrRefusal`: the same parse door and trial walk the form's
// own save runs, plus the named refusals (`UNKNOWN_ENTRY`, `HONOURED_ONCE`, `UNKNOWN_SUPER_ACCOUNT`
// and the door's own). A refusal comes back as it is. Nothing is written and nothing is kept.
//
// **THE WORDING IS THE FORM'S, AND THE FORM'S OWN BUILDER IS THE JUDGE OF IT.** Each entry comes back
// as the boxes the form shows for its type, labelled as the form labels them, each with the text to
// type. That text is then fed to the form's own builder (`planEdits.ts`, the one `entryForm.ts`
// calls on "Add entry"), and the entry it builds must be the draft that was checked — type, date,
// owner, switched on, and every param. One that is not (a rate the box cannot state, a draft switched
// off, a type the form does not offer) is refused as `NOT_TYPEABLE` rather than handed over as
// something that would save as a different entry from the one the walk checked.
//
// **THE LABELS ARE COPIES, AND A TEST HOLDS THEM TO THE FORM.** `entryForm.ts` writes its labels
// inline in DOM code, and `test/app-entry-form.test.mjs` pins that code by its shape, so the labels
// are written here and `test/app-chat-propose-entries.test.mjs` asserts each one is a `label(...)`
// literal in `entryForm.ts`, word for word. The select options are read from `entryLabels.ts`.
//
// ⚠️ **A money box's value is the draft's own figure as it is TYPED, "38000.00", with no `$` and no
// basis tag.** It is what to type, in the form the box takes, and never a figure to quote: the money
// guard does not see a figure with neither `$` nor "cents" (plan_ai.md §13 open item 1), so this
// relies on that gap on purpose. **Beside it, `amount` is the same figure as a figure to QUOTE**,
// labelled by `listEntries`' own `labelledEntryFigures` exactly as the entries table's wording is: a
// spending level in today's money, a salary in today's wages, a nominal amount at its own month on
// the asked basis — and, since the ruling of 2026-09-25, an ENTER_CARE/SELL_HOME/RENT_OUT_HOME/
// HEAS_DRAW figure in today's money too, `listEntries.ts`'s own `statedFigures`. The first golden run quoted the bare text with a `$` and a label of its own making.
// The two are paired by position and must state the same cents, or this build is at fault.
import { TOGGLE_LABELS } from '../../entryForm.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { INVESTMENT_DIRECTION_LABELS, NO_PARCEL_PREFERENCE_LABEL, entryTypeLabel, parcelSelectionLabel } from '../../entryLabels.js';
import { HOUSEHOLD_OWNER_LABEL } from '../../ownerNames.js';
import {
  centsToDollars,
  deathEntry,
  enterCareEntry,
  fractionAsPercent,
  heasDrawEntry,
  illnessSeparationEntry,
  lumpSumFromSuperEntry,
  mortgagePayoffEntry,
  mortgageRefinanceEntry,
  mortgageTargetEntry,
  nonSuperInvestmentBuyEntry,
  nonSuperInvestmentSellEntry,
  oneOffExpenseEntry,
  retireEntry,
  returnChangeEntry,
  sellHomeEntry,
  rentOutHomeEntry,
  buyHomeEntry,
  downsizerContributionEntry,
  spendChangeEntry,
  spouseContributionEntry,
  superContributionEntry,
  superContributionStopEntry,
  ttrRateChangeEntry,
  ttrStartEntry,
  insuranceCoverChangeEntry,
  INSURANCE_BENEFIT_CHOICES,
  workPatternChangeEntry,
} from '../../planEdits.js';
import { DEFAULT_MONEY_VIEW, moneyBasis } from '../../todaysDollars.js';
import { personLabel, toolOutput } from './identity.js';
import { entriesOrRefusal, labelledEntryFigures } from './listEntries.js';
import { accountsStored, changesOf, whatIfOrRefusal } from './runProjection.js';
import { isRefusal } from './scenarioWalk.js';
import type { Cents } from '../../../core/money.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { Entry } from '../../../core/plan.js';
import type { MoneyBasis } from '../../todaysDollars.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

/** The entry form's box labels, word for word as `entryForm.ts` writes them, without the trailing space. */
export const FORM_BOXES = Object.freeze({
  type: 'Type',
  date: 'From',
  owner: 'Owner',
  annualSpend: 'Annual household spending in today’s money, NOT counting home loan repayments $',
  daysPerWeek: 'Days a week',
  annualSalary: 'Salary a year, in today’s money $',
  oneOffAmount: 'Amount, as it will cost on the day $',
  amount: 'Amount $',
  superAccount: 'Super account',
  sacrificeKind: 'What this entry does',
  sacrificeAmount: 'Salary sacrificed a year, before tax, and the same number of dollars every year $',
  loanBalance: 'Amount still owed, from this date $',
  loanRate: 'Interest rate a year, as a decimal (0.061 is 6.1%)',
  loanRepayment: 'Repayment each month $',
  incidentalCosts: 'Buying costs (brokerage, fees) $',
  parcelSelection: 'Which to sell first',
  direction: 'Direction',
  returnRate: 'New investment return a year, as a decimal (0.065 is 6.5%)',
  ttrRate: 'New share taken out each year (%)',
  ttrStartRate: 'Share taken out each year (%)',
  ttrMoveAmount: 'Amount to move $',
  spouseAmount: 'Amount, paid once, from your own after-tax money $',
  spouseAccount: "Your spouse's super account",
  homeValue: 'Home value on the day of entry, in today’s money $',
  radPrice: 'Room price — a refundable deposit, RAD, in today’s money $',
  radPaidAsLumpSum: 'Of that, paid as a lump sum now, in today’s money $',
  heasSecurityValue: 'Home value (your own estimate), in today’s money $',
  heasKind: 'How much to draw',
  heasFortnightlyAmount: 'Fortnightly amount, in today’s money $',
  heasStopDate: 'Stop drawing from this date (optional)',
  heasAdvanceDate: 'Advance date',
  heasAdvanceAmount: 'Advance amount, in today’s money $',
  salePrice: 'Sale price (your own estimate), in today’s money $',
  sellingCosts: 'Selling costs (optional), in today’s money $',
  newHomeAmount: 'Of that, set aside for a new home, in today’s money $',
  weeklyRent: 'Weekly rent (your own estimate), in today’s money $',
  annualRates: 'Council rates a year (optional), in today’s money $',
  annualInsurance: 'Insurance a year (optional), in today’s money $',
  annualAgentFees: 'Agent’s fees a year (optional), in today’s money $',
  annualRepairs: 'Repairs a year (optional), in today’s money $',
  rentEndDate: 'Tenancy ends on this date (optional)',
  purchasePrice: 'Purchase price (your own estimate), in today’s money $',
  purchaseCosts: 'Stamp duty and fees (optional), in today’s money $',
  downsizerAmount: 'Amount from the home sale, in today’s money $',
  downsizerAccount: 'Your super account',
  downsizerOwnedTenYears: 'Did you or your spouse own the home for 10 years or more?',
  insuranceBenefit: 'Which cover',
  insuranceCover: 'Share of the cover kept (%), 0 cancels it',
});

/** The HEAS draw box's two options, as `entryForm.ts` words them. */
export const HEAS_DRAW_OPTIONS = Object.freeze({
  stated: 'A fixed amount each fortnight',
  maximum: 'The most allowed — 150% of the full Age Pension, less any Age Pension you receive',
});

/** The salary-sacrifice box's two options, as `entryForm.ts` words them. */
export const SACRIFICE_OPTIONS = Object.freeze({ salarySacrificed: 'Sacrifice this much a year', stopped: 'Stop sacrificing, from this date' });

export const CHECKED =
  'Each entry below passed the checks the entry form’s own save runs, and the forecast walked with it. Nothing has been added to the plan ' +
  'and nothing is kept: type each one into the entry form yourself ("Add entry"), with this scenario in view, and switch off each entry ' +
  'listed under toSwitchOff in the entries table. runProjection with the same what-if says what it changes.';

export const AMOUNT_OR_VALUE =
  'A box’s value is only the text to type in it. A money box also has amount, the same figure labelled: quote amount, word for word with its label, ' +
  'whenever you state the figure, and never put a $ or a label on the value.';

export const OWNER_BOX = 'The Owner box lists each person by name: Person A is the first person under Household and settings, and Person B the second.';

export const NOT_TYPEABLE =
  'the entry form cannot type this entry exactly (a figure it cannot state, an entry switched off, or a type it does not offer), so it would save as a different entry from the one checked';

interface Box {
  readonly box: string;
  readonly value: string;
  /** A money box's figure, in cents, to pair with its labelled amount. */
  readonly cents?: Cents;
}

const TRIAL_ID = 'typed';
const TRIAL_CREATED_AT = '2000-01-01';

/** The boxes the form shows for `entry`, each with what to type, and what the form's builder makes of them; `undefined` if the form has no builder for the type. */
const typedOnTheForm = (entry: Entry, ID = TRIAL_ID, CREATED_AT = TRIAL_CREATED_AT): { readonly boxes: readonly Box[]; readonly built: unknown } | undefined => {
  const common = { date: entry.date, owner: entry.owner, note: '' };
  const account = (position: number): string => String(position + 1);
  const boxes = (...pairs: readonly (readonly [string, string] | readonly [string, string, Cents])[]): readonly Box[] =>
    pairs.map(([box, value, cents]) => (cents === undefined ? { box, value } : { box, value, cents }));
  switch (entry.type) {
    case 'SPEND_CHANGE': {
      const annualSpend = centsToDollars(entry.params.annualSpend);
      return { boxes: boxes([FORM_BOXES.annualSpend, annualSpend, entry.params.annualSpend]), built: spendChangeEntry({ ...common, annualSpend }, ID, CREATED_AT) };
    }
    case 'RETIRE':
      return { boxes: [], built: retireEntry(common, ID, CREATED_AT) };
    case 'WORK_PATTERN_CHANGE': {
      const daysPerWeek = String(entry.params.daysPerWeek);
      const annualSalary = centsToDollars(entry.params.annualSalary);
      return {
        boxes: boxes([FORM_BOXES.daysPerWeek, daysPerWeek], [FORM_BOXES.annualSalary, annualSalary, entry.params.annualSalary]),
        built: workPatternChangeEntry({ ...common, daysPerWeek, annualSalary }, ID, CREATED_AT),
      };
    }
    case 'ONE_OFF_EXPENSE': {
      const amount = centsToDollars(entry.params.amount);
      return { boxes: boxes([FORM_BOXES.oneOffAmount, amount, entry.params.amount]), built: oneOffExpenseEntry({ ...common, amount }, ID, CREATED_AT) };
    }
    case 'LUMP_SUM_FROM_SUPER': {
      const amount = centsToDollars(entry.params.amount);
      const interestIndex = account(entry.params.interestIndex);
      return {
        boxes: boxes([FORM_BOXES.amount, amount, entry.params.amount], [FORM_BOXES.superAccount, interestIndex]),
        built: lumpSumFromSuperEntry({ ...common, amount, interestIndex }, ID, CREATED_AT),
      };
    }
    case 'SUPER_CONTRIBUTION': {
      if (entry.params.kind === 'stopped') {
        return { boxes: boxes([FORM_BOXES.sacrificeKind, SACRIFICE_OPTIONS.stopped]), built: superContributionStopEntry(common, ID, CREATED_AT) };
      }
      const annualAmount = centsToDollars(entry.params.annualAmount);
      const interestIndex = account(entry.params.interestIndex);
      return {
        boxes: boxes([FORM_BOXES.sacrificeKind, SACRIFICE_OPTIONS.salarySacrificed], [FORM_BOXES.sacrificeAmount, annualAmount, entry.params.annualAmount], [FORM_BOXES.superAccount, interestIndex]),
        built: superContributionEntry({ ...common, annualAmount, interestIndex }, ID, CREATED_AT),
      };
    }
    case 'MORTGAGE_REFINANCE': {
      const openingBalance = centsToDollars(entry.params.openingBalance);
      const annualInterestRate = String(entry.params.annualInterestRate);
      const monthlyRepayment = centsToDollars(entry.params.monthlyRepayment);
      return {
        boxes: boxes([FORM_BOXES.loanBalance, openingBalance, entry.params.openingBalance], [FORM_BOXES.loanRate, annualInterestRate], [FORM_BOXES.loanRepayment, monthlyRepayment, entry.params.monthlyRepayment]),
        built: mortgageRefinanceEntry({ ...common, openingBalance, annualInterestRate, monthlyRepayment }, ID, CREATED_AT),
      };
    }
    case 'MORTGAGE_TARGET':
      return { boxes: [], built: mortgageTargetEntry(common, ID, CREATED_AT) };
    case 'MORTGAGE_PAYOFF':
      return { boxes: [], built: mortgagePayoffEntry(common, ID, CREATED_AT) };
    case 'ILLNESS_SEPARATION':
      return { boxes: [], built: illnessSeparationEntry(common, ID, CREATED_AT) };
    case 'DEATH':
      return { boxes: [], built: deathEntry(common, ID, CREATED_AT) };
    case 'ENTER_CARE': {
      const homeValue = centsToDollars(entry.params.homeValue);
      const radPrice = centsToDollars(entry.params.radPrice);
      const radPaidAsLumpSum = centsToDollars(entry.params.radPaidAsLumpSum);
      return {
        boxes: boxes(
          [FORM_BOXES.homeValue, homeValue, entry.params.homeValue],
          [FORM_BOXES.radPrice, radPrice, entry.params.radPrice],
          [FORM_BOXES.radPaidAsLumpSum, radPaidAsLumpSum, entry.params.radPaidAsLumpSum],
        ),
        built: enterCareEntry({ ...common, homeValue, radPrice, radPaidAsLumpSum }, ID, CREATED_AT),
      };
    }
    // **`HEAS_DRAW` (P9-1, slice 2) — the union resolved by which STRING `fortnightlyAmount` is,
    // `heasDrawEntry`'s own doc.** The kind box is not money, so it does not shift the money-box
    // index `withAmounts` pairs against `listEntries.ts`'s `statedFigures` — `securityValue` first,
    // then a STATED draw where there is one, `'maximum'` carrying no second money figure at all.
    case 'HEAS_DRAW': {
      const securityValue = centsToDollars(entry.params.securityValue);
      const stopDate = entry.params.stopDate ?? '';
      // **`advances` (P9-2b) — the form offers ONE, so only the FIRST is reconstructed here, the
      // same limit `HeasDrawFormValues`'s own doc states.** An entry holding more than one (only
      // reachable by hand-editing the plan file, never by this form) proposes a change that would
      // drop the rest if saved — the same "cannot be typed" gap `NOT_TYPEABLE` exists to name, not a
      // silent loss this tool hides.
      const firstAdvance = entry.params.advances?.[0];
      const advanceDate = firstAdvance?.date ?? '';
      const advanceAmount = firstAdvance === undefined ? '' : centsToDollars(firstAdvance.amount);
      const advanceBoxes =
        firstAdvance === undefined
          ? []
          : boxes([FORM_BOXES.heasAdvanceDate, advanceDate], [FORM_BOXES.heasAdvanceAmount, advanceAmount, firstAdvance.amount]);
      if (entry.params.fortnightlyAmount === 'maximum') {
        return {
          boxes: [
            ...boxes(
              [FORM_BOXES.heasSecurityValue, securityValue, entry.params.securityValue],
              [FORM_BOXES.heasKind, HEAS_DRAW_OPTIONS.maximum],
              [FORM_BOXES.heasStopDate, stopDate],
            ),
            ...advanceBoxes,
          ],
          built: heasDrawEntry({ ...common, securityValue, fortnightlyAmount: 'maximum', stopDate, advanceDate, advanceAmount }, ID, CREATED_AT),
        };
      }
      const fortnightlyAmount = centsToDollars(entry.params.fortnightlyAmount);
      return {
        boxes: [
          ...boxes(
            [FORM_BOXES.heasSecurityValue, securityValue, entry.params.securityValue],
            [FORM_BOXES.heasKind, HEAS_DRAW_OPTIONS.stated],
            [FORM_BOXES.heasFortnightlyAmount, fortnightlyAmount, entry.params.fortnightlyAmount],
            [FORM_BOXES.heasStopDate, stopDate],
          ),
          ...advanceBoxes,
        ],
        built: heasDrawEntry({ ...common, securityValue, fortnightlyAmount, stopDate, advanceDate, advanceAmount }, ID, CREATED_AT),
      };
    }
    // **`SELL_HOME` (P14-13; `newHomeAmount` P14-13c) — `sellingCosts`/`newHomeAmount` are the optional
    // fields, `HEAS_DRAW`'s `stopDate` own idiom: absent becomes `''`, which `sellHomeEntry` reads as
    // "none stated". `newHomePurchaseDate` is always `''` — `entry.params` can never carry one: a
    // stated value there would already have been refused at the door (`parsePlan`), so there is
    // nothing this trial round-trip could ever be asked to type.**
    case 'SELL_HOME': {
      const salePrice = centsToDollars(entry.params.salePrice);
      const sellingCosts = entry.params.sellingCosts === undefined ? '' : centsToDollars(entry.params.sellingCosts);
      const newHomeAmount = entry.params.newHomeAmount === undefined ? '' : centsToDollars(entry.params.newHomeAmount);
      return {
        boxes: boxes(
          [FORM_BOXES.salePrice, salePrice, entry.params.salePrice],
          ...(entry.params.sellingCosts === undefined ? [] : [[FORM_BOXES.sellingCosts, sellingCosts, entry.params.sellingCosts] as const]),
          ...(entry.params.newHomeAmount === undefined ? [] : [[FORM_BOXES.newHomeAmount, newHomeAmount, entry.params.newHomeAmount] as const]),
        ),
        built: sellHomeEntry({ ...common, salePrice, sellingCosts, newHomeAmount, newHomePurchaseDate: '' }, ID, CREATED_AT),
      };
    }
    // **`RENT_OUT_HOME` (P14-13) — the four annual costs and `endDate` are each optional,
    // `SELL_HOME`'s `sellingCosts` own idiom: absent becomes `''`, which `rentOutHomeEntry` reads as
    // "none stated".**
    case 'RENT_OUT_HOME': {
      const weeklyRent = centsToDollars(entry.params.weeklyRent);
      const annualRates = entry.params.annualRates === undefined ? '' : centsToDollars(entry.params.annualRates);
      const annualInsurance = entry.params.annualInsurance === undefined ? '' : centsToDollars(entry.params.annualInsurance);
      const annualAgentFees = entry.params.annualAgentFees === undefined ? '' : centsToDollars(entry.params.annualAgentFees);
      const annualRepairs = entry.params.annualRepairs === undefined ? '' : centsToDollars(entry.params.annualRepairs);
      const endDate = entry.params.endDate ?? '';
      return {
        boxes: boxes(
          [FORM_BOXES.weeklyRent, weeklyRent, entry.params.weeklyRent],
          ...(entry.params.annualRates === undefined ? [] : [[FORM_BOXES.annualRates, annualRates, entry.params.annualRates] as const]),
          ...(entry.params.annualInsurance === undefined ? [] : [[FORM_BOXES.annualInsurance, annualInsurance, entry.params.annualInsurance] as const]),
          ...(entry.params.annualAgentFees === undefined ? [] : [[FORM_BOXES.annualAgentFees, annualAgentFees, entry.params.annualAgentFees] as const]),
          ...(entry.params.annualRepairs === undefined ? [] : [[FORM_BOXES.annualRepairs, annualRepairs, entry.params.annualRepairs] as const]),
          ...(entry.params.endDate === undefined ? [] : [[FORM_BOXES.rentEndDate, entry.params.endDate] as const]),
        ),
        built: rentOutHomeEntry({ ...common, weeklyRent, annualRates, annualInsurance, annualAgentFees, annualRepairs, endDate }, ID, CREATED_AT),
      };
    }
    // **`BUY_HOME` (P14-19) — `SELL_HOME`'s `sellingCosts` idiom for the optional costs.**
    case 'BUY_HOME': {
      const purchasePrice = centsToDollars(entry.params.purchasePrice);
      const purchaseCosts = entry.params.purchaseCosts === undefined ? '' : centsToDollars(entry.params.purchaseCosts);
      return {
        boxes: boxes(
          [FORM_BOXES.purchasePrice, purchasePrice, entry.params.purchasePrice],
          ...(entry.params.purchaseCosts === undefined ? [] : [[FORM_BOXES.purchaseCosts, purchaseCosts, entry.params.purchaseCosts] as const]),
        ),
        built: buyHomeEntry({ ...common, purchasePrice, purchaseCosts }, ID, CREATED_AT),
      };
    }
    case 'NON_SUPER_INVESTMENT': {
      const amount = centsToDollars(entry.params.amount);
      const direction = [FORM_BOXES.direction, INVESTMENT_DIRECTION_LABELS[entry.params.direction]] as const;
      if (entry.params.direction === 'buy') {
        const incidentalCostsOfAcquisition = centsToDollars(entry.params.incidentalCostsOfAcquisition);
        return {
          boxes: boxes(direction, [FORM_BOXES.amount, amount, entry.params.amount], [FORM_BOXES.incidentalCosts, incidentalCostsOfAcquisition, entry.params.incidentalCostsOfAcquisition]),
          built: nonSuperInvestmentBuyEntry({ ...common, amount, incidentalCostsOfAcquisition }, ID, CREATED_AT),
        };
      }
      const selection = entry.params.parcelSelection;
      return {
        boxes: boxes(direction, [FORM_BOXES.amount, amount, entry.params.amount], [FORM_BOXES.parcelSelection, selection === undefined ? NO_PARCEL_PREFERENCE_LABEL : parcelSelectionLabel(selection)]),
        built: nonSuperInvestmentSellEntry({ ...common, amount, parcelSelection: selection ?? '' }, ID, CREATED_AT),
      };
    }
    case 'RETURN_CHANGE': {
      const rate = String(entry.params.rate);
      return { boxes: boxes([FORM_BOXES.returnRate, rate]), built: returnChangeEntry({ ...common, rate }, ID, CREATED_AT) };
    }
    case 'TTR_START': {
      const interestIndex = account(entry.params.interestIndex);
      const drawdownRatePercent = entry.params.drawdownRate === undefined ? '' : fractionAsPercent(entry.params.drawdownRate);
      // RF-3: the amount box only where one is proposed; blank is the account itself.
      const amount = entry.params.amount === undefined ? '' : centsToDollars(entry.params.amount);
      const moved = entry.params.amount === undefined ? [] : [[FORM_BOXES.ttrMoveAmount, amount, entry.params.amount] as const];
      return {
        boxes: boxes([FORM_BOXES.superAccount, interestIndex], ...moved, [FORM_BOXES.ttrStartRate, drawdownRatePercent]),
        built: ttrStartEntry({ ...common, interestIndex, drawdownRatePercent, amount }, ID, CREATED_AT),
      };
    }
    case 'TTR_RATE_CHANGE': {
      const interestIndex = account(entry.params.interestIndex);
      const drawdownRatePercent = fractionAsPercent(entry.params.drawdownRate);
      return {
        boxes: boxes([FORM_BOXES.superAccount, interestIndex], [FORM_BOXES.ttrRate, drawdownRatePercent]),
        built: ttrRateChangeEntry({ ...common, interestIndex, drawdownRatePercent }, ID, CREATED_AT),
      };
    }
    case 'INSURANCE_COVER_CHANGE': {
      const interestIndex = account(entry.params.interestIndex);
      const { benefit } = entry.params;
      const coverPercent = fractionAsPercent(entry.params.coverFraction);
      const chosen = INSURANCE_BENEFIT_CHOICES.find((choice) => choice.value === benefit)?.label ?? '';
      return {
        boxes: boxes([FORM_BOXES.superAccount, interestIndex], [FORM_BOXES.insuranceBenefit, chosen], [FORM_BOXES.insuranceCover, coverPercent]),
        built: insuranceCoverChangeEntry({ ...common, interestIndex, benefit, coverPercent }, ID, CREATED_AT),
      };
    }
    case 'SPOUSE_CONTRIBUTION': {
      const amount = centsToDollars(entry.params.amount);
      const receivingInterestIndex = account(entry.params.receivingInterestIndex);
      return {
        boxes: boxes([FORM_BOXES.spouseAmount, amount, entry.params.amount], [FORM_BOXES.spouseAccount, receivingInterestIndex]),
        built: spouseContributionEntry({ ...common, amount, receivingInterestIndex }, ID, CREATED_AT),
      };
    }
    case 'DOWNSIZER_CONTRIBUTION': {
      const amount = centsToDollars(entry.params.amount);
      const receivingInterestIndex = account(entry.params.receivingInterestIndex);
      return {
        boxes: boxes(
          [FORM_BOXES.downsizerAmount, amount, entry.params.amount],
          [FORM_BOXES.downsizerAccount, receivingInterestIndex],
          [FORM_BOXES.downsizerOwnedTenYears, 'Yes'],
        ),
        built: downsizerContributionEntry({ ...common, amount, receivingInterestIndex, ownedTenYears: 'yes' }, ID, CREATED_AT),
      };
    }
    default:
      return undefined;
  }
};

/**
 * The entry exactly as the entry form's own builder makes it from the boxes, under a real `id` and
 * `createdAt`: what the review queue's Accept saves (`reviewQueue.ts`). `undefined` where the form
 * cannot type it, which `proposalOrRefusal` has already refused.
 */
export const formBuiltEntry = (entry: Entry, id: string, createdAt: string): unknown => typedOnTheForm(entry, id, createdAt)?.built;

/** JSON with every object's keys sorted, so two entries compare by content alone. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, each: unknown) =>
    each !== null && typeof each === 'object' && !Array.isArray(each)
      ? Object.fromEntries(Object.entries(each as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : each,
  );

const sameEntry = (built: unknown, draft: Entry): boolean => {
  const { type, date, owner, enabled, params } = built as Entry;
  return canonical({ type, date, owner, enabled, params }) === canonical({ type: draft.type, date: draft.date, owner: draft.owner, enabled: draft.enabled, params: draft.params });
};

/** Each money box given its `amount`, the figure `listEntries` labels at the same place; a pairing that disagrees is a fault in this build. */
const withAmounts = (entry: Entry, boxes: readonly Box[], basis: MoneyBasis) => {
  const figures = labelledEntryFigures(entry, basis);
  const money = boxes.filter(({ cents }) => cents !== undefined);
  if (money.length !== figures.length || money.some(({ cents }, index) => cents !== figures[index]!.cents)) {
    throw new RangeError(`a ${entry.type} entry's money boxes do not match the figures listEntries labels for it`);
  }
  let index = 0;
  return boxes.map(({ box, value, cents }) => (cents === undefined ? { box, value } : { box, value, amount: figures[index++]!.labelled }));
};

const ownerOf = (entry: Entry): string => (entry.owner === 'household' ? HOUSEHOLD_OWNER_LABEL : personLabel(entry.owner === 'personA' ? 0 : 1));

/** The what-if, checked, as the entry form's boxes to type and the entries to switch off — or a named refusal. */
export const proposalOrRefusal = (plan: PlanFile, asked: unknown, options: ToolOptions = {}) => {
  const asChanges = changesOf(structuredClone(asked));
  if (asChanges !== undefined && asChanges.add.length + asChanges.disable.length + asChanges.replace.length === 0) {
    return { refused: 'NO_ENTRIES', reason: 'there is nothing to propose: give at least one entry to add, switch off or replace' };
  }
  const checked = whatIfOrRefusal(plan, asked, { ...options, detail: 'compact' });
  if (isRefusal(checked)) return checked;
  const changes = asChanges!;
  const drafts = [
    ...changes.add.map((draft, index) => ({ draft, place: `add[${index}]` })),
    ...changes.replace.map((swap, index) => ({ draft: swap.with, place: `replace[${index}].with` })),
  ];
  const basis = moneyBasis(options.basis ?? DEFAULT_MONEY_VIEW, plan.settings);
  const toType = [];
  for (const { draft, place } of drafts) {
    const entry = (accountsStored(plan, draft, place) as { readonly draft: unknown }).draft as Entry;
    const typed = typedOnTheForm(entry);
    if (typed === undefined || !sameEntry(typed.built, entry)) return { refused: 'NOT_TYPEABLE', reason: `${place}: ${NOT_TYPEABLE}` };
    toType.push({
      boxes: [
        { box: FORM_BOXES.type, value: entryTypeLabel(entry.type) },
        { box: FORM_BOXES.date, value: entry.date },
        { box: FORM_BOXES.owner, value: ownerOf(entry) },
        ...withAmounts(entry, typed.boxes, basis),
      ],
    });
  }
  const listed = entriesOrRefusal(plan, options) as Exclude<ReturnType<typeof entriesOrRefusal>, ToolRefusal>;
  const wordingOf = new Map(listed.entries.map(({ id, wording }) => [id, wording]));
  const toSwitchOff = [...changes.disable, ...changes.replace.map(({ entryId }) => entryId)].map((entryId) => ({
    entryId,
    wording: wordingOf.get(entryId)!,
    control: TOGGLE_LABELS.disable,
  }));
  return { scenarioId: checked.scenarioId, basis: listed.basis, checked: CHECKED, amounts: AMOUNT_OR_VALUE, ownerBox: OWNER_BOX, toType, toSwitchOff };
};

/** `proposeEntries` as the connector returns it: serialised, through the identity and money guards. */
export const proposeEntries = (plan: PlanFile, asked: unknown, options: ToolOptions = {}): string =>
  toolOutput(plan.household, proposalOrRefusal(plan, asked, options), options.basis ?? DEFAULT_MONEY_VIEW);
