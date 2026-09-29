// plan_ai.md §5, §12.5, §12.11 and §13 microtask 10 — **`whatCanYouModel`: what this build models,
// what it refuses, and what nobody outside it has checked yet.**
//
// **THE REFUSED ENTRY TYPES ARE READ LIVE.** `UNSPECIFIED_ENTRY_TYPES` is `parsePlan`'s own derived
// list, read on every call and never copied, so a type that gains a parser leaves this answer the
// day it ships, and a type that loses one joins it. The offered types are `OFFERED_ENTRY_TYPES`, the
// entry form's own list, read the same way.
//
// **THE REST IS KEPT BY HAND, BECAUSE ITS SOURCES ARE PROSE.** TODO.md's Parked list and register §8's
// open limits are written in sentences, not code, so each limit is a line here with its reason and
// where it is recorded (ADR-0011). Retiring a limit means deleting its line in the commit that closes
// it. **A limit that turns on a legislated figure the data SOURCES states that figure, read from
// `data/assumptions/` and never typed here**: a dollar figure labelled "(as legislated …)" by its own
// record's stamp, as `explainAssumption` gives it. In the first golden run (R3) the model supplied the
// carry-forward balance test from memory, because this line named the limit and not the figure.
//
// **THE NOT-YET-CHECKED LIST IS PHASE 13's (§12.5).** One line per rules area whose figures have not
// been checked against anything outside this build. Each Phase 13 item deletes its own line in the
// commit that closes it, and the model repeats the warning when a what-if touches the area.
import { UNSPECIFIED_ENTRY_TYPES } from '../../../core/parsePlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { AGE_PENSION_AGE } from '../../../core/household.js';
import { PUBLISHED_TRANSFER_BALANCE_CAP } from '../../../core/retirementPension.js';
import { SUPERANNUATION } from '../../../data/assumptions/index.js';
import { CGT_REFORM_START } from '../../../data/assumptions/tax.js';
import { ENTRY_TYPE_LABELS } from '../../entryLabels.js';
import { OFFERED_ENTRY_TYPES } from '../../planEdits.js';
import { DEFAULT_MONEY_VIEW } from '../../todaysDollars.js';
import { legislatedFigure } from './explainAssumption.js';
import { toolOutput } from './identity.js';
import type { PlanFile } from '../../../core/parsePlan.js';

export const REFUSED_TYPE_REASON =
  'This build cannot read or project this kind of change, so a plan holding one is refused whole rather than projected without it.';

export interface Limit {
  readonly limit: string;
  readonly reason: string;
  /** Where the limit is recorded. */
  readonly recorded: string;
}

const CARRY_FORWARD_BALANCE_TEST = SUPERANNUATION.carryForward.totalSuperBalanceTest;
const CONCESSIONAL_CAP = SUPERANNUATION.caps.concessional;
const SG_RATE = SUPERANNUATION.superGuarantee.chargePercentage.value;

/** What is not modelled, by hand: TODO.md's Parked list, register §8's open limits, and the brief's named gaps. */
export const NOT_MODELLED: readonly Limit[] = Object.freeze([
  {
    limit: 'Carry-forward of unused concessional cap',
    reason:
      'The plan holds no history of past contributions, so unused cap from earlier years cannot be worked out. ' +
      `The law allows carry-forward only for someone whose total super balance was under ${legislatedFigure(CARRY_FORWARD_BALANCE_TEST.value, CARRY_FORWARD_BALANCE_TEST)} on the 30 June before the year. ` +
      "A contribution above the year's general cap is refused by name, even for someone whose unused cap would lawfully allow it. " +
      `That cap is ${legislatedFigure(CONCESSIONAL_CAP.value, CONCESSIONAL_CAP)}; a later year's cap is a forecast, indexed to wages, and not the law.`,
    recorded: 'register §8 O78; plan_ai.md §12.11',
  },
  {
    limit: 'Moving out of the home, and moving into aged care',
    reason: 'Moving out of the home is parked with the move into aged care, which belongs to Phase 14 and is not built. A plan holding either is refused.',
    recorded: 'TODO.md Phase 14',
  },
  {
    limit: 'The transfer balance account',
    reason:
      `No transfer balance account is tracked. The cap is held at ${legislatedFigure(PUBLISHED_TRANSFER_BALANCE_CAP, SUPERANNUATION.caps.generalTransferBalance)} ` +
      'in every year of the forecast, and a switch to a pension above it is refused: the super stays in accumulation, because splitting an account between the two is not modelled.',
    recorded: 'register §3.1; core/retirementPension.ts',
  },
  {
    limit: 'Market ups and downs',
    reason: 'The forecast is one path at the stated returns. A spread of outcomes (Monte Carlo) and the order returns arrive in (sequencing risk) are not modelled.',
    recorded: 'TODO.md Parked',
  },
  {
    limit: 'Investment property',
    reason: 'Rental income, negative gearing, land tax, stamp duty and the property’s own means-test treatment are a rules area of their own, and it is not built.',
    recorded: 'TODO.md Parked',
  },
  {
    limit: 'Selling the home to rent',
    reason: 'Not modelled: the Rent Assistance a renter could get is small next to losing a home the Age Pension does not count.',
    recorded: 'TODO.md Parked',
  },
  {
    limit: 'Medicare levy low-income thresholds for 2026-27',
    reason: 'Not yet legislated. The 2025-26 thresholds are used, and labelled as a prior-year fallback.',
    recorded: 'register §8 O1',
  },
  {
    limit: 'Deeming rates after the last determination',
    reason: 'No formula sets them. Rates after the last published determination are a Setting in the plan, not a forecast.',
    recorded: 'register §8 O2',
  },
  {
    limit: `Age Pension age beyond ${AGE_PENSION_AGE}`,
    reason: `Held at ${AGE_PENSION_AGE} for the whole forecast. No legislation says otherwise; a change would be policy risk.`,
    recorded: 'register §8 O3',
  },
  {
    limit: `Superannuation Guarantee rate beyond ${SG_RATE}%`,
    reason: `Held at ${SG_RATE}% for the whole forecast. That is an assumption about future policy.`,
    recorded: 'register §8 O4',
  },
  {
    limit: 'Future prices and wages',
    reason: 'Future inflation and wage growth are Settings stated in the plan, not legislated figures.',
    recorded: 'register §8 O5',
  },
  {
    limit: 'A pension commuted or rolled over part way through a year',
    reason: 'The law as read does not say how that year’s minimum is proportioned, so such a year is refused rather than guessed.',
    recorded: 'register §8 O39',
  },
  {
    limit: 'The transfer balance cap for a pension started before the plan',
    reason: 'It cannot be worked out from a balance, so it is refused rather than guessed.',
    recorded: 'register §8 O42',
  },
  {
    limit: 'Partial commutations',
    reason: 'Every withdrawal from a pension is treated as a pension payment. A partial commutation is not told apart from one.',
    recorded: 'register §8 O47',
  },
  {
    limit: 'The kind of super fund',
    reason: 'Industry and retail funds are not told apart from self-managed funds.',
    recorded: 'register §8 O69',
  },
  {
    limit: 'Work Bonus indexation',
    reason: 'The Work Bonus amounts are not indexed, because no source says they are. This runs against the Household: more income is assessed.',
    recorded: 'register §8 O75',
  },
  {
    limit: 'Tax for a couple living apart because of illness',
    reason:
      'A couple living apart because of illness or care is paid the single Age Pension rate each, but is still taxed as a couple, including the seniors and pensioners tax offset. How a year the separation starts part way through is assessed is not settled, so no year is given the separated amounts. Taxing them as a couple never lowers the tax either of them pays, so tax is overstated, not understated.',
    recorded: 'register §8 O90; TODO.md P12-4',
  },
  {
    limit: 'Tax in the year one of a couple dies',
    reason:
      'In the financial year of a death the survivor is still taxed as one of a couple, including the seniors and pensioners tax offset; from the next 1 July they are taxed as a single person. The tax office can give a widowed survivor the single offset for that year instead, so the tax may be overstated for that one year, never understated. The Medicare levy for that year is a couple’s, as the tax office treats it.',
    recorded: 'register §8 O91; TODO.md P12-1',
  },
  {
    limit: 'Capital gains tax when one of a couple dies holding investments from before the change',
    reason:
      `The capital gains tax rules changed on ${CGT_REFORM_START}. The law has not settled what happens to the part of a gain made before that day when the owner dies after it. ` +
      'The forecast passes it to the survivor, who pays tax on it when they sell, with the half-gain rule counted from the original purchase date. ' +
      'If the tax office instead taxes it at the death, the tax comes earlier than shown.',
    recorded: 'register §2.10 (ruling R1)',
  },
  {
    limit: 'Inflation indexing of capital gains',
    reason:
      `From ${CGT_REFORM_START} the cost of an investment is raised with inflation before the gain after that day is taxed. ` +
      "The forecast raises it with this plan's own inflation Setting, not with published price index figures.",
    recorded: 'register §2.10',
  },
  {
    limit: 'The bereavement payment',
    reason:
      'When one of a couple who were both on the Age Pension dies, the survivor gets a lump sum. Its size depends partly on the number of days until the next Age Pension payday, which this forecast does not know, so it takes the smallest possible number. The payment may be understated by up to about half a week of the difference between the couple’s rate and the single rate, never overstated.',
    recorded: 'register §4.11; TODO.md P12-1',
  },
]);

export interface Unchecked {
  readonly area: string;
  /** The Phase 13 item that removes this line when it closes. */
  readonly gate: string;
  readonly warning: string;
}

/** Rules areas not yet checked against anything outside this build (plan_ai.md §12.5, §13). */
export const NOT_YET_CHECKED: readonly Unchecked[] = Object.freeze([
  {
    area: 'Transition to retirement pensions',
    gate: 'P13-2',
    warning: "Transition to retirement pension figures have not yet been checked against a fund's own calculator, so treat them as unverified.",
  },
  {
    area: 'The Age Pension',
    gate: 'P13-3',
    warning: 'Age Pension figures have not yet been checked against a hand-worked Services Australia figure, so treat them as unverified.',
  },
]);

export const REPEAT_THE_WARNING = 'When a what-if touches an area in notYetChecked, repeat that area’s warning with the answer.';

/** What this build models, refuses and has not had checked — the refused types read live on every call. */
export const modelScope = () => ({
  canModel: OFFERED_ENTRY_TYPES.map((type) => ({ type, label: ENTRY_TYPE_LABELS[type] })),
  refusedEntryTypes: UNSPECIFIED_ENTRY_TYPES.map((type) => ({ type, label: ENTRY_TYPE_LABELS[type], reason: REFUSED_TYPE_REASON })),
  notModelled: NOT_MODELLED,
  notYetChecked: NOT_YET_CHECKED,
  instruction: REPEAT_THE_WARNING,
});

/** `whatCanYouModel` as the connector returns it: serialised, through the identity and money guards. */
export const whatCanYouModel = (plan: PlanFile): string => toolOutput(plan.household, modelScope(), DEFAULT_MONEY_VIEW);
