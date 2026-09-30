// P8-5 (the writer) — the Household and the Settings. Until this file both could only be changed
// by hand-editing `plan.json`; the editor did journal entries only. It DECIDES nothing: every box
// is read as the string it was typed as, every candidate plan is built by `planEdits.ts`, every
// write goes out through the one `save` door, and every refusal a user sees is `parsePlan`'s own.
//
// **Why it is untested, stated plainly rather than papered over** — the same split as
// `entryForm.ts` and `scenarioPanel.ts`: there is no DOM under `node:test` and `typescript` is the
// one dev dependency (TODO.md P2-9a). Everything decidable lives in `planEdits.ts` and is asserted
// in `test/app-settings-panel.test.mjs`, which also reads THIS file as text and pins the handful
// of properties a silent regression would turn on. §5 of that file says what stays unproven.
//
// ⚠️ **ONE CLOCK, AND THE BALANCES ARE SAVED WITH IT** (user ruling, 2026-09-19). `Settings.asAtDate`
// is the plan's only "today" and no `SuperInterest` or `Parcel` carries a valuation date of its
// own. So the position form has ONE heading, it names the date the figures are stated as at, it
// holds the date box itself, and its one button saves both. There is no control anywhere on this
// page that writes a balance without the date or the date without the balances — see
// `planWithStatedPosition`, which is the only builder that takes either, and `planWithSettings`,
// which carries the date through untouched so the date has exactly one writer.
//
// ⚠️ **ADD ONLY. THERE IS NO REMOVE, AND ITS ABSENCE IS A SAFETY PROPERTY** (user ruling,
// 2026-09-19). An add creates no orphan. Taking a Person away would: `RETIRE` and
// `WORK_PATTERN_CHANGE` are applied by iterating the Persons that exist (`projection.ts`), so an
// entry owned by a Person who is gone silently does nothing — the plan parses, projects, and
// reports a plausible wrong forecast, while the other two per-Person types throw on the same
// dangling owner. That asymmetry is recorded as a live defect (TODO.md P4-12) and is not fixed
// here; until it is, no control in this file may take anything away.
//
// ⚠️ **THE ONE CONTROL HERE THAT IS NOT A FIGURE: THE SUBDIV 293-B ELECTION** (register O84
// residual (iii), closed 2026-09-20). Every other box on this page restates something the
// Household already IS; this one states a DECISION — which pocket a Division 293 liability comes
// out of — and it was reachable only by hand-editing `plan.json` until this control existed, so
// every plan built through the app took the charge from cash and flattered its own Age Pension.
// Three rules of the engine shape it: presence IS the election and silence is a DECLINED one, so
// nothing is pre-selected and nothing is derived from a Person's only account; ONE interest per
// Person may be marked; and a retirement-phase interest may not be marked at all. `electionRow`
// holds all three by being unable to express the alternatives, not by checking for them.
//
// ⚠️ **“START AGAIN” IS A TWO-FIELD WALKTHROUGH THAT OVERWRITES, NOT A DELETION, AND NOT AN
// EXCEPTION TO THE PARAGRAPH ABOVE.** It asks for a name and a date of birth, and on Finish writes
// ONE plan holding that person and nothing else — no example household, no example journal.
//
//   * **there is nothing to delete with.** `store/files.ts` is GET and PUT; `server/index.mjs`
//     answers no OPTIONS and has no DELETE, and its header says that is a security property and not
//     an omission. So “start again” is spelled as writing a new plan over the top.
//   * **it collects first and writes ONCE.** Typing in the two boxes touches nothing; Cancel writes
//     nothing; the plan on disk is the user's own until Finish resolves. That is why the
//     irreversibility warning sits on the Finish step and not on the button that opens the form.
//   * **it goes out through the one door**, `saveAndAnnounce` → `host.save` → `savePlan`, so the
//     candidate is `parsePlan`'d and WALKED before a byte is written, exactly like every other
//     candidate. A date of birth the door refuses, or one past the planning horizon that `project()`
//     refuses, is a refused edit with the engine's own sentence on screen and the user's plan still
//     on disk. Nothing here checks a date; the NAME is a presence-only gate on the Finish button,
//     because no engine rule makes a name mandatory and this build wants one anyway.
//   * **it builds nothing.** `planEdits.walkthroughPlan` is the builder, as for every other write
//     from this page, and this file never reads the plan it is replacing.
//
// It is NOT the REMOVE that P4-12 forbids, and the difference is the orphan. A removal takes a
// Person out of a plan whose entries still name them; this replaces the plan file WHOLE — entries,
// scenarios, household, settings — with one internally consistent document, so no entry is left
// pointing at an owner who is gone and the failure mode P4-12 describes is unreachable. It takes
// nothing out of the current plan: it stops using that plan entirely.
//
// ⚠️ **`economicSeries.agePension` IS NOT EDITABLE HERE, deliberately.** Its two nested arrays of
// dated indexation figures are structurally heavier than anything else on this page. A plan that
// states none is not left without one: `project()` generates it from the CPI, PBLCI and MTAWE growth
// rates this page DOES edit (2026-09-23), so those three boxes are what moves the Age Pension. A
// stated series travels through every save untouched, and wins wherever it is stated.
import {
  BLANK_PARCEL,
  BLANK_PERSON,
  BLANK_SUPER_INTEREST,
  HOME_STATUS_CHOICES,
  NO_RELEASE_ELECTION,
  EMPLOYER_PAYS_INTO_UNCHOSEN_LABEL,
  employerPaysIntoOptionLabel,
  employerPaysIntoShown,
  INSURANCE_COVER_CHOICES,
  INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES,
  SUPER_PHASE_CHOICES,
  AT_RETIREMENT_CHOICES,
  AT_RETIREMENT_SWITCH,
  atRetirementBoxShown,
  PRIOR_PENSION_CHOICES,
  TTR_RATE_RANGE_PERCENT,
  dollarsToCents,
  electableSuperInterests,
  electedReleaseInterest,
  negativeFeeObjection,
  percentAsFraction,
  planWithSettings,
  planWithStatedPosition,
  positionFormValues,
  positionSaveConfirmation,
  positionWithParcel,
  positionWithPerson,
  positionWithSuperInterest,
  rateAsTyped,
  settingsFormValues,
  ttrBoxObjections,
  employerAccountObjection,
  ttrStreamBoxesShown,
  valueJustBefore1July2027BoxShown,
  totalSuperBalanceAt30JuneBoxShown,
  thirtyJuneYear,
  unusedCapYears,
  walkthroughPlan,
} from './planEdits.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatDollars } from './displayMoney.js';
import { infoButton } from './infoButton.js';
import { LAST_LEGISLATION_REFRESH } from './guideTitles.js';
import { ruleRowText, rulesHeadline, rulesInForce } from './rulesInForce.js';
import type { RulesArea } from './rulesInForce.js';
// The unnamed-person wording is `ownerNames.ts`'s, imported so this page and the entry editor call
// the same two people the same thing.
import { UNNAMED_PERSON_LABELS } from './ownerNames.js';
import type { LabelledOption, PersonFormValues, SettingsFormValues, StatedPositionFormValues } from './planEdits.js';
import type { PlanFile } from '../core/parsePlan.js';

/**
 * What the page gives the panel: the plan on screen, and the one thing to do with a candidate.
 * `save` never rejects — `main.ts` catches and banners — so this file has no error handling and no
 * second notification channel of its own.
 */
export interface SettingsPanelHost {
  readonly currentPlan: () => PlanFile;
  readonly save: (candidate: unknown) => Promise<void>;
  /**
   * **A second question on the Finish step, about a file that is not the plan** (user ruling
   * 2026-09-28: "Also delete my transaction history?", default No). This panel knows nothing of the
   * Ledger: it puts `element` on the form and, ONLY once the new plan has landed, awaits `afterPlanReplaced`
   * and adds the sentence it returns to the announcement. `undefined` — no Ledger loaded, or an
   * unreadable one — means no question, and the Ledger is untouched.
   */
  readonly startAgainAlso?: () => StartAgainQuestion | undefined;
}

export interface StartAgainQuestion {
  readonly element: HTMLElement;
  readonly afterPlanReplaced: () => Promise<string>;
}

// **P17-3 (2026-09-28): every ⓘ box below says what its box does, in one or two lines, and never
// restates a figure, a threshold or a rule** — those live only in `userguide.md`, at the `guide:`
// label its `infoButton` call names. The doc comments still describe the mechanic behind each box;
// the words on screen no longer spell it out.

/**
 * **The side effect of moving the date, said where the date is edited.** Two facts, neither
 * visible on the form and both of which change the forecast:
 *
 *   * the double count — month 0 reports what is typed here and growth starts the month after
 *     (`projection.ts`), so a balance read today under an older date is grown again from the older
 *     date;
 *   * the re-partition — `project()` classifies every entry dated before the walk by its kind:
 *     an event already happened and applies nowhere, a level is a standing state and applies from
 *     month 0. Moving the date across an entry therefore moves that entry from one side of the
 *     walk to the other, and the two sides mean different things.
 */
/** What stays on the page beside the date box. */
export const AS_AT_DATE_SUMMARY =
  'Figures below are what you hold on this date, the plan’s “today”.';

export const AS_AT_DATE_NOTICE =
  'This date and the figures below are saved together. Change this date whenever you change the figures below. Moving it on its own changes the forecast,' +
  ' because it moves where your balances and your dated changes start from.';

/**
 * **What this form cannot show and therefore carries through unchanged.** Said out loud because a
 * field a form does not display is a field a user assumes is gone, and a commencement day quietly
 * surviving an edit is the difference between a Schedule 7 minimum being paid and not.
 */
/** What stays on the page above the save button. */
export const CARRIED_THROUGH_SUMMARY = 'Hidden details are kept';

export const CARRIED_THROUGH_NOTICE =
  'Saving here never changes a detail you cannot see. Details this form has no box for — an income stream’s start and conversion dates, and the answer about an' +
  ' earlier super pension — are kept, matched by the account’s position in the list.';

/**
 * **What the Division 293 release control says, and the first sentence is the one that matters.**
 * NOT electing is a real answer — the statutory default under ITAA 1997 s 293-65 is that the
 * Commissioner assesses the individual and the individual pays — so the control opens on "no
 * election" for a Person who has stated none, and the caveat says that this IS the answer rather
 * than a box left blank. The other two sentences are the two shapes the plan file cannot hold, said
 * as the reason they are not on offer rather than as rules to obey.
 */
/** What stays on the page beside the election box. */
export const RELEASE_ELECTION_SUMMARY =
  '“No election” is a real answer.';

export const RELEASE_ELECTION_NOTICE =
  'Which super account, if any, pays this person’s Division 293 charge. “No election” pays the charge' +
  ' from this person’s cash, which is what happens if you do nothing. Only' +
  ' accounts still building up are offered, and the choice can change the Age Pension as well as the tax.';

/** The no-election option's own words. It is a CHOICE in the list, never the absence of one. */
export const NO_RELEASE_ELECTION_LABEL = 'No election (Division 293 charge paid from own cash)';

/** One accumulation interest, as the election list names it. Positions are 1-based on screen. */
export const releaseElectionOptionLabel = (position: number): string =>
  `Super account ${position + 1} (accumulation) — take the Division 293 charge out of this one`;

/**
 * **The Work Bonus, in the user's words on the page and the mechanic behind the button.** The
 * mechanic is read off `core/workBonus.ts` and `data/assumptions/agePension.ts`: $300 a fortnight
 * applied first, the excess drawn from the balance, the unused part banked to a $11,800 ceiling,
 * and eligibility gated on Age Pension age (67) ALONE — the register's "and receiving" limb is
 * circular in a means test and is not checked, which is said rather than implied.
 */
export const WORK_BONUS_SUMMARY =
  'Pay Centrelink ignores that you’ve banked. Leave 0 if not on the Age Pension.';

export const WORK_BONUS_NOTICE =
  'Type the balance you actually hold; nothing is filled in for you. The forecast uses it to shelter this' +
  ' person’s own pay from the Age Pension income test.';

/**
 * **What the fortnightly pay box means, and the two ways it is easy to fill in wrongly**: net
 * instead of gross (the income test assesses gross — R14), and investment income typed in here,
 * which deeming already counts. The standing-figure sentence is `plan.ts`: a `WORK_PATTERN_CHANGE`
 * replaces it annualised, and `RETIRE` wins over that.
 */
export const EMPLOYMENT_INCOME_SUMMARY =
  'Pay before tax. Type 0 if not working.';

export const EMPLOYMENT_INCOME_NOTICE =
  'Only pay for work belongs here: what your investments earn is counted elsewhere. Type it in today’s' +
  ' money; the forecast raises it with wages until a change of hours or retiring replaces it.';

/** What a super account's phase decides. The three values are the ones the box itself offers. */
export const SUPER_PHASE_SUMMARY = 'What the phase decides';

export const SUPER_PHASE_NOTICE =
  'Is this account still building up, or is it already paying you an income? Choose the phase your fund says this account is in today. It decides whether the account pays you, how' +
  ' its earnings are taxed, and how the Age Pension counts it.';

/**
 * **What the drawdown-rate box means when it is left empty, said beside it.** Blank is a real
 * answer — the fund pays the legal minimum — and not a box somebody forgot, so the page says so
 * where the box is rather than behind a button.
 */
export const TTR_RATE_BESIDE =
  `Between ${TTR_RATE_RANGE_PERCENT[0]} and ${TTR_RATE_RANGE_PERCENT[1]}. Leave it empty and the forecast pays the legal minimum, the least the fund must pay you each year.`;

/** Said in the announcement line when the phase box's objection (`employerAccountObjection`) stopped the save. */
export const PHASE_NOT_SAVED = 'Nothing was saved. See the note beside the account’s phase.';

/** Said in the announcement line when a transition-to-retirement box stopped the save. */
export const TTR_NOT_SAVED =
  'Nothing was saved. A transition to retirement account needs a start date, and a drawdown rate only if you want' +
  ' more than the legal minimum — see the note beside the box.';

/**
 * **The three fee boxes, said as a statement says them, and the empty box explained** (P3-17).
 *
 * Funds charge in two shapes and most charge in both: an amount a year, and a share of the balance.
 * Both boxes are here because a statement quotes both and a user should not have to convert one
 * into the other. The two rate boxes are DECIMALS, which is this page's stated convention for every
 * rate on it (`ASSUMPTIONS_SUMMARY`), and the echo beside each box says the same figure back as a
 * percentage — a fee rate typed ten times too large is the cheapest expensive mistake on this form.
 *
 * The sentence about the empty box is not a nicety: an empty box states NO fee at all, and nil is
 * invisible in the forecast — no line, no note, nothing moved — which is a different thing from a
 * fee this build worked out to be nothing.
 */
/**
 * **The switch at retirement, said beside the box that keeps an account out of it** (user ruling,
 * 2026-09-23). The walk's own rules are `retirementPension.ts`'s; this says them in words.
 */
export const AT_RETIREMENT_SUMMARY = 'On the day you retire';

export const AT_RETIREMENT_NOTICE =
  'What happens to this account on the day you retire: it becomes a pension, or it stays as it is. Choose' +
  ' “Stays as it is” to keep this account out of the switch to a pension at retirement. The switch can' +
  ' change the Age Pension as well as the tax.';

export const UNUSED_CAP_SUMMARY =
  'Optional. What myGov shows as unused for each year; leave a year blank if you don’t know it.';

export const UNUSED_CAP_NOTICE =
  'A blank year counts as fully used, which can only make the forecast more careful. The box below it is' +
  ' asked only when your plan’s date is not 1 July.';

export const PRIOR_PENSION_SUMMARY =
  'Yes if they were already paid a pension from super before this plan.';

export const PRIOR_PENSION_NOTICE =
  'Answer Yes and this person’s super is not switched to a pension at retirement; the month table says why' +
  ' in the month they retire. No is the answer for almost everybody.';

export const SUPER_FEES_SUMMARY =
  'Fees in today’s money. Rates are percentages as on your statement: type 0.15 for 0.15%. Leave empty if not charged.';

export const INSURANCE_SUMMARY = 'When the cover ends';

export const INSURANCE_NOTICE = 'The ages come from your fund’s insurance terms.';

export const PENSION_FEES_SUMMARY = 'Fees once this account pays a pension';

export const PENSION_FEES_NOTICE =
  'What the fund charges once this account becomes an account-based pension, in today’s money; leave every' +
  ' box empty to keep the same fees. Fill a box in only where your fund’s statement says the fee changes once the account pays you an income.' +
  ' From then on these boxes replace the ones above for this account.';

export const SUPER_FEES_NOTICE =
  'Copy the fees off your annual statement. The line under each percentage box says what it charges a year' +
  ' on the balance above, and warns you when the figure looks like a decimal typed by mistake. An empty box' +
  ' is no fee at all, and none is guessed for you.';

/**
 * **The typed PERCENTAGE, said back as what it charges in dollars a year on today’s balance** (user
 * ruling, 2026-09-25). Display only, and it decides nothing: the fraction that is saved is
 * `percentAsFraction`'s, never this function's. Blank or unreadable in EITHER box echoes NOTHING
 * rather than a `$0` or a `$NaN`, because an echo that puts a figure on screen where a box holds none
 * is the same defect as a box that defaults itself.
 *
 * `formatDollars`, not `formatCents` — this page shows no cents anywhere (`displayMoney.ts`'s own
 * ruling, 2026-09-24), and an echo is exactly the kind of figure that ruling covers.
 */
export const feeRateDollarsAYear = (percentTyped: string, balanceTyped: string): string => {
  const fraction = percentAsFraction(percentTyped);
  if (!Number.isFinite(fraction)) return '';
  const balance = dollarsToCents(balanceTyped);
  if (!Number.isFinite(balance)) return '';
  return `= ${formatDollars(balance * fraction)} a year on today’s balance`;
};

/**
 * **The guard this ruling exists to add, said rather than silently accepted** (user ruling,
 * 2026-09-25). `3` is a courtesy bound and not a refusal — `parsePlan` still takes any non-negative
 * rate — chosen because this build's own research has never seen a real fund's percentage fee at 3%
 * a year: a figure above it is far more likely to be the OLD decimal convention typed by habit
 * (`0.35` meaning the fraction `0.35`, three and a half thousand percent) than a real one.
 */
export const FEE_RATE_OVER_THREE_PERCENT_WARNING = 'That’s over 3% a year — check you meant percent.';

export const feeRateWarning = (percentTyped: string): string => {
  const percent = rateAsTyped(percentTyped);
  return Number.isFinite(percent) && percent > 3 ? FEE_RATE_OVER_THREE_PERCENT_WARNING : '';
};

/** The home, as a STATUS and never a value — ADR-0005, and the T39/T42 divergence said out loud. */
export const HOME_SUMMARY =
  'Decides which Age Pension limits apply; the home’s value is never counted.';

export const HOME_NOTICE =
  'Owning with a mortgage still counts as owning. The other choices cover having moved out — within the' +
  ' exemption period, past it, or with a protected person still living there — and having no home.';

/** The couple's ownership box, naming both people — the second owns what the first does not. */
export const offsetShareLabel = (first: string, second: string): string => {
  const called = (name: string, index: 0 | 1): string => (name.trim() === '' ? UNNAMED_PERSON_LABELS[index] : name);
  return `${called(first, 0)}’s share of the offset, % (${called(second, 1)} owns the rest) `;
};

/** The offset, as the walk's running cash — `household.ts` on `openingOffsetBalance`. */
export const OFFSET_SUMMARY =
  'Cash in an offset account against your home loan.';

export const OFFSET_NOTICE =
  'This is the household’s everyday money: the forecast pays everything into it and out of it. For a couple,' +
  ' the share box says how much of it the first of you owns, which decides only whose income its interest is,' +
  ' for tax.';

/**
 * **The home loan — P3-16 slice 1, and the ruling of 2026-09-21 is the thing this text exists to
 * carry.** ⚠️ **Amended by slice 2**: the last sentence used to end *"There is no way yet to say
 * that the rate changes, to refinance, to redraw, or to make an extra repayment"*, and the first
 * two of those four are now sayable — `MORTGAGE_REFINANCE` is specified and walked. A sentence that
 * has stopped being true is its own defect, so it names the entry type instead and keeps the two
 * gaps that survive, plus the two this build never claimed (an early payout, interest-only).
 * The repayment is charged ON TOP OF the spending figure the plan states, because the two
 * are different facts and this build will not net one out of the other on the user's behalf. Most
 * people's mental "what we spend a year" already has the mortgage inside it, so the notice and the
 * spending box's own label both say, in words, to leave it out. A forecast that double-counted a
 * repayment would be worse than reality and would look exactly like a forecast that did not.
 *
 * The other three sentences are the three things a user cannot see from the boxes: what the offset
 * does to the interest, that the loan stops when it is repaid, and that a repayment too small to
 * cover the interest is refused rather than forecast.
 */
export const MORTGAGE_SUMMARY = 'Leave all three empty if you have no home loan.';

export const MORTGAGE_NOTICE =
  'The repayment is added on top of your spending, so enter your spending WITHOUT it. Copy the three figures off your last loan statement. To change them later, add a “Home loan — set or' +
  ' change the terms” entry from that date; to pay the loan off early, add a “Home loan — pay off in full”' +
  ' entry.';

/** One purchase of one non-super holding. "Cost base" is kept here because it is the ATO's word. */
export const INVESTMENTS_SUMMARY =
  'Shares or funds outside super, one purchase each. Not property.';

export const INVESTMENTS_NOTICE =
  'One row per purchase: what you paid (the cost base, in the tax office’s word), when you bought it, and' +
  ' what it is worth on the date at the top of this section.';

/** LR-1: the one parcel figure a plan starting after 1 July 2027 must state. */
export const VALUE_AT_REFORM_SUMMARY =
  'Needed because this plan starts after the new capital gains tax rules began.';

export const VALUE_AT_REFORM_NOTICE =
  'The new capital gains tax rules began on that day. The law treats anything you held just before it' +
  ' as sold and bought back at what it was worth then. The rise up to then keeps the old half-gain rule' +
  ' when you sell; the rise after it is taxed the new way. Your plan starts later, so it cannot work the' +
  ' value out itself. A statement from that day will show it.';

/** The horizon, and the two judgment calls `forecastWindow.ts` records about it. */
export const PLANNING_HORIZON_SUMMARY =
  'One age for the whole household, not one each.';

export const PLANNING_HORIZON_NOTICE =
  'The age the forecast runs to. With two people the forecast runs until the last of you reaches this age. Nothing after it is forecast,' +
  ' so money can look as if it lasts simply because the forecast stopped.';

/** The return: nominal, one flat rate, and the balances it does NOT reach (`plan.ts`). */
export const NOMINAL_RETURN_SUMMARY = 'Used for every account; moves the answer most.';

export const NOMINAL_RETURN_NOTICE =
  'It is growth before inflation, applied to every super account and investment holding. It moves the answer' +
  ' more than any other guess, so try a low one too.';

/**
 * **WHAT THE INVESTMENTS PAY OUT, AND HOW MUCH OF IT IS ALREADY TAXED — P3-22h.** Both boxes move the
 * forecast since step 3: `projection.ts` reinvests the payout at the year-end true-up, taxes it there,
 * and credits the share with company tax already paid. Until 2026-09-28 this text still said neither
 * box changed the forecast — false since step 3, and fixed by P17-3, which also moved every rule this
 * note used to spell out into `userguide.md` (`{#investment-payout}`).
 *
 * **The words this text may not use**: the accountant's vocabulary for these two figures is jargon a
 * reader did not sign up for, so it is written in what the money DOES. `test/app-settings-panel.test.mjs`
 * holds the ban.
 */
export const INVESTMENT_PAYOUT_SUMMARY = 'Payouts from shares and funds outside super — both are used in your forecast';

export const INVESTMENT_PAYOUT_NOTICE =
  'What your shares and managed funds pay you each year, and how much of that already has company tax paid' +
  ' on it. Once a year the forecast adds what your holdings pay you to your tax and puts it straight back into the' +
  ' holdings; the share with tax already paid reduces that tax. Leave either box empty if you are not sure.';

/**
 * **WHAT SHARE OF SUPERANNUATION'S OWN GROWTH IS TREATED AS INCOME, AND HOW MUCH OF IT IS ALREADY
 * TAXED — P3-42, both boxes live from step 3 (2026-09-22).** The rules behind them are the guide's to
 * state (P17-3); the box says what the two figures decide, and the jargon ban in
 * `test/app-settings-panel.test.mjs` holds for it on `INVESTMENT_PAYOUT_SUMMARY`'s own ground.
 */
export const SUPER_INCOME_YIELD_SUMMARY = 'Payouts inside super — both are used in your super’s forecast';

export const SUPER_INCOME_YIELD_NOTICE =
  'What share of your super balance each year is treated as income the fund pays tax on, and how much' +
  ' of that has already been taxed by the company paying it. These two figures decide how much tax your super fund pays on its own earnings in the forecast. Leave' +
  ' either box empty if you are not sure; nothing is guessed for you.';

/**
 * **WHAT THE RUNNING CASH EARNS — 2026-09-23.** The summary keeps what blank means (it follows the
 * CPI box). What the interest is taxed as, why only cash above the loan earns it and why the Age
 * Pension does not count it were said here until P17-3 moved rules out of every ⓘ box.
 */
export const CASH_INTEREST_SUMMARY = 'Leave it empty to follow CPI.';

export const CASH_INTEREST_NOTICE =
  'The rate the forecast’s running cash earns, paid in each month. Type 0 if your cash earns nothing.';

/**
 * **THE CONTINGENCY FLOOR — P4-14, and BLANK IS AN ANSWER.** Until 2026-09-21 this figure was a
 * `const` in `main.ts` that drew a $700,000 buffer on every forecast. The box says what the reserve
 * is, that it is typed in today's money, and that it changes no forecast — the walk is identical with
 * and without it, because it is a line to read the answer against.
 */
export const CONTINGENCY_FLOOR_SUMMARY =
  'Money kept back, never spent, for late-life costs; leave it empty if none.';

export const CONTINGENCY_FLOOR_NOTICE =
  'Type it in today’s money: the chart draws it as a line under your reachable money, rising with prices, so' +
  ' you can see where the plan would dip into it. It changes nothing in the forecast itself.';

/** Deeming as a MANUAL policy input — `core/deeming.ts`, register O2 / T30. */
export const DEEMING_SUMMARY =
  'The income Centrelink assumes your savings and investments earn, whatever they actually earn.';

export const DEEMING_NOTICE =
  'Your guess at the two deeming rates, as decimals, for the years after the last rates already decided.' +
  ' Rates already decided are built in and do not come from these boxes.';

/** The four forward rates. Each expansion is read off `data/assumptions/settings.ts`. */
export const CPI_SUMMARY = 'What you assume — your spending rises with it.';

export const CPI_NOTICE =
  'It raises your spending and the other prices you type in today’s money, and the Age Pension’s income and' +
  ' assets thresholds, in the years after the figures already published.';

export const PBLCI_SUMMARY = 'What you assume — it moves the Age Pension.';

export const PBLCI_NOTICE =
  '⚠️ THIS BOX MOVES YOUR AGE PENSION. It is one of the indexes the forecast raises the pension with, so' +
  ' every Age Pension figure after the last published rates is a forecast from your figures, not the law. A' +
  ' plan that states its own dated series uses that instead.';

export const AWOTE_SUMMARY = 'What you assume — your pay follows.';

export const AWOTE_NOTICE =
  '⚠️ THIS BOX MOVES YOUR PAY AND THE CAP. It raises every salary in your plan, and the yearly cap on' +
  ' before-tax super contributions, so every cap after the last published one is a forecast from your' +
  ' figures, not the law.';

export const MTAWE_SUMMARY = 'What you assume — it moves the Age Pension.';

export const MTAWE_NOTICE =
  '⚠️ THIS BOX MOVES YOUR AGE PENSION. The pension is topped up when it falls too far below this wage' +
  ' benchmark, so every Age Pension figure after the last published rates is a forecast from your figures,' +
  ' not the law. A plan that states its own dated series uses that instead.';

/** Said over the assumptions, where a reader would otherwise look for the Age Pension series. */
/** What stays on the page above the assumption boxes. */
export const ASSUMPTIONS_SUMMARY =
  'Your guesses, not the law. Rates are decimals: 0.025 is 2.5%.';

export const ASSUMPTIONS_NOTICE =
  'The figures set by law are built in and are not edited here; The rules in force, below, lists them. The Age' +
  ' Pension indexation series is not on this form; whatever your plan states is kept as it is.';

/**
 * **"The rules in force" (2026-09-30): the legislated figures on the as-at date, read only.** The
 * rows and their words are `rulesInForce.ts`'s; this file only draws them. Each ⓘ says where the
 * figures come from and never restates one (P17-3).
 */
export const RULES_IN_FORCE_SUMMARY = 'Set by law — read only.';

export const RULES_IN_FORCE_NOTICE =
  'The legislated figures your forecast uses on your as-at date: when each took effect, and when it next' +
  ' changes where the change is already law. Past the last published figure, the forecast raises the' +
  ' figures that are indexed with your Forecast assumptions, so those later values are not listed.';

export const RULES_TAX_SUMMARY = 'Where these come from.';
export const RULES_TAX_NOTICE = 'The tax laws behind these figures, and when each was last checked.';
export const RULES_SUPER_SUMMARY = 'Where these come from.';
export const RULES_SUPER_NOTICE = 'The super laws behind these figures, and when each was last checked.';
export const RULES_AGE_PENSION_SUMMARY = 'Where these come from.';
export const RULES_AGE_PENSION_NOTICE = 'The Age Pension rates and rules behind these figures, and when each was last checked.';
export const RULES_HEAS_SUMMARY = 'Where these come from.';
export const RULES_HEAS_NOTICE = 'The scheme’s rules behind these figures, and when each was last checked.';
export const RULES_AGED_CARE_SUMMARY = 'Where these come from.';
export const RULES_AGED_CARE_NOTICE = 'The aged care fee schedules behind these figures, and when each was last checked.';

/** The two save buttons, said as what they do rather than as “Save”. */
export const SAVE_LABELS = {
  position: 'Save the figures and this date together',
  assumptions: 'Save these assumptions',
} as const;

/**
 * **What the walkthrough is, said on the button that opens it — and NOT what it costs.** The cost
 * is `RESET_WARNING` and it belongs on the Finish step, where the click that actually writes is:
 * a warning on a button that writes nothing is a warning read once, before the form, and forgotten
 * by the time it applies.
 */
export const WALKTHROUGH_INVITATION =
  'From your name and date of birth; nothing is written until you finish.';

/**
 * **Why both boxes are mandatory, and what the new plan does NOT contain.** The date of birth is
 * said as what it is FOR: every age the forecast turns on — Age Pension age, preservation age, the
 * planning horizon — is counted from it, so there is no plan without one and no default worth
 * guessing. The second half is the hand-off: a plan holding one person and nothing else is a blank
 * forecast, and a user who is not told where the rest goes has no reason to look.
 */
export const WALKTHROUGH_NOTICE =
  'Both are needed — every age in the forecast is counted from your date of birth. Your home, super and income come next.';

/**
 * **What Finish costs, itemised, and said ON THE FINISH STEP** (user ruling, 2026-09-20). The three
 * things a user would each separately mind losing are named — the journal, the scenarios, and the
 * stated position — because "your plan will be replaced" is a sentence a reader maps onto whichever
 * of the three they happen to be looking at. The irreversibility is stated as a fact about this
 * build and not as a caution: there is no copy of a plan file anywhere. `server`'s PUT renames a
 * temp file over the target (`server/index.mjs`), so the previous bytes are gone at the filesystem
 * level too, and nothing in this app has ever written a backup.
 */
export const RESET_WARNING =
  'Finish replaces your whole plan — every change, every scenario, everything about your household. This cannot be undone,' +
  ' and there is no backup. Nothing is written until you press it.';

/** The two boxes, as the form asks for them. Neither has a default and neither is pre-filled. */
export const WALKTHROUGH_LABELS = {
  name: 'Your name ',
  dateOfBirth: 'Your date of birth ',
} as const;

/**
 * **The three labels, and the middle one is the only thing on this page that writes without being
 * asked for figures first.** The opening button writes nothing at all, so a mis-click on it costs
 * nothing; Finish is pressed with the warning and both typed answers still on screen. Finish says
 * what it does rather than "OK" — a dialogue answered "OK" is one whose question was already
 * forgotten — and Cancel says what it does not do.
 */
export const RESET_LABELS = {
  start: 'Start again with a new plan…',
  finish: 'Finish — replace my plan with a new one for this person',
  cancel: 'Cancel — keep my plan as it is',
} as const;

/**
 * **What is said after the walkthrough landed, and it is read off the plan that is now on disk.**
 * Every figure in it comes from `after`, so a sentence claiming the plan was replaced cannot be
 * produced from anything but the stored result — see `saveAndAnnounce`, which only reaches a
 * description at all when the page's plan object was replaced. The last sentence is the hand-off,
 * and it is true only because `openDisclosure` below opened the section as this ran.
 */
export const resetConfirmation = (after: PlanFile): string =>
  `Saved. New plan for ${after.household.persons.map((person) => person.name).join(' and ')},` +
  ` as at ${after.settings.asAtDate}, with ${after.entries.length} changes and ${after.scenarios.length} scenario(s).` +
  ' Your old plan is gone. Add your home, super and income below.';

/**
 * **The four element builders, shared with `firstRunPanel.ts` rather than copied into it.** They
 * were private to this file until the first-run form existed; exporting them is what stopped a
 * second `<label>`/`<input>`/`<button>` builder appearing one module away, where the two could
 * drift apart in what they set and what they leave to CSS. They decide nothing and hold no copy:
 * every string they render is handed in by a caller.
 */
export const label = (text: string, control: HTMLElement): HTMLLabelElement => {
  const element = document.createElement('label');
  element.append(text, control);
  return element;
};

/** `label`, with its words in bold and the control left at normal weight. */
const boldLabel = (text: string, control: HTMLElement): HTMLLabelElement => {
  const element = document.createElement('label');
  const words = document.createElement('b');
  words.textContent = text;
  element.append(words, control);
  return element;
};

export const input = (type: string, name: string, value: string): HTMLInputElement => {
  const element = document.createElement('input');
  element.type = type;
  element.name = name;
  element.value = value;
  return element;
};

/**
 * A `<select>` with one option per choice and the current one chosen. No option this file invents.
 * The option STORES `value` and SHOWS `label` (P6-13): a stored identifier is never the text.
 */
const select = (name: string, options: readonly LabelledOption<string>[], value: string): HTMLSelectElement => {
  const element = document.createElement('select');
  element.name = name;
  for (const option of options) {
    const choice = document.createElement('option');
    choice.value = option.value;
    choice.textContent = option.label;
    element.append(choice);
  }
  element.value = value;
  return element;
};

export const button = (text: string, title: string, onClick: () => void): HTMLButtonElement => {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.title = title;
  element.addEventListener('click', onClick);
  return element;
};

/** Which folds the user has open; kept across redraws of the panel, forgotten on reload. */
const openFolds = new Set<string>();

/**
 * A collapsible box (user, 2026-09-29): one per person, and one for Forecast assumptions. Closed
 * by default, like the page's other panels; the form inside is in the DOM either way, so saving
 * reads every box whether the fold is open or not.
 */
const foldBox = (key: string, title: HTMLElement): { fold: HTMLDetailsElement; body: HTMLElement } => {
  const fold = document.createElement('details');
  fold.className = 'fold';
  fold.open = openFolds.has(key);
  const summary = document.createElement('summary');
  summary.append(title);
  const body = document.createElement('div');
  body.className = 'fold-body';
  fold.append(summary, body);
  fold.addEventListener('toggle', () => {
    if (fold.open) openFolds.add(key);
    else openFolds.delete(key);
  });
  return { fold, body };
};

/**
 * A closed ⓘ line sits on the row of the box it explains (user, 2026-09-29). A zero-height,
 * full-width break after each one ends that row, so the next box never reads as the thing the
 * ⓘ line was about. DOM only; the CSS is `.row-break` in `public/index.html`.
 */
const endRowsAtInfo = (form: HTMLElement): void => {
  // A group heading with an ⓘ line straight after it ("Home loan", "Other investments") shares
  // that line (user, 2026-09-29): a break before the heading, none between the two.
  for (const heading of Array.from(form.querySelectorAll('p.group-label'))) {
    if (heading.nextElementSibling?.matches?.('details.info') !== true) continue;
    heading.classList.add('with-info');
    const rowBreak = document.createElement('span');
    rowBreak.className = 'row-break';
    if (typeof heading.before === 'function') heading.before(rowBreak);
  }
  for (const info of Array.from(form.querySelectorAll('details.info'))) {
    const rowBreak = document.createElement('span');
    rowBreak.className = 'row-break';
    // The tests' minimal DOM has no `after`; a real browser always does.
    if (typeof info.after === 'function') info.after(rowBreak);
  }
};

export const paragraph = (className: string, text: string): HTMLParagraphElement => {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
};

/**
 * **The write, and the read-back that decides whether anything may be claimed.**
 *
 * `host.save` resolves whether the write landed or the door refused it — it never rejects — so the
 * only honest way to know is to ask the page for its plan again. `main.ts` reassigns that plan
 * **only** after a write resolved, so an unchanged object is a save that did not happen, and the
 * banner is already saying which of the two failures it was. Announcing optimistically here would
 * tell a user every scenario had been recomputed from figures that were never written.
 *
 * `describe` is how the reset gets its own sentence without getting its own write: the read-back
 * test, the early return and the transport are one piece of code for all three controls, and only
 * the wording branches.
 */
const saveAndAnnounce = async (
  host: SettingsPanelHost,
  announce: HTMLElement,
  candidate: unknown,
  describe: (before: PlanFile, after: PlanFile) => string = positionSaveConfirmation,
): Promise<boolean> => {
  const before = host.currentPlan();
  await host.save(candidate);
  const after = host.currentPlan();
  if (after === before) return false; // refused, or the write did not land; the banner says which
  announce.textContent = describe(before, after);
  return true;
};

/**
 * One super interest: its phase and its balance, as at the one date.
 *
 * **The phase box redraws the form**, which is not decoration: the Division 293 election below
 * lists this Person's ACCUMULATION interests only, so moving an interest into a pension phase must
 * take it out of that list — and out of the election, if it was the one elected — where the user
 * can see it happen, rather than at the save.
 */
const interestRow = (person: PersonFormValues, index: number, onPhaseChange: () => void): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'holding';
  const held = person.superInterests[index];
  const phase = select(`phase-${index}`, SUPER_PHASE_CHOICES, held?.phase ?? '');
  phase.addEventListener('change', onPhaseChange);
  // Filled by the save button with `employerAccountObjection`'s sentence, `ttrStreamBoxes`' own way.
  const phaseObjection = paragraph('field-error', '');
  phaseObjection.dataset['errorFor'] = `phase-${index}`;
  const balance = input('text', `balance-${index}`, held?.balance ?? '');
  row.append(
    // "Super phase", bold (user ruling, 2026-09-25): the one label that starts each account's rows.
    boldLabel('Super phase ', phase),
    infoButton(SUPER_PHASE_SUMMARY, SUPER_PHASE_NOTICE, 'guide:super-accounts'),
    phaseObjection,
    label('Balance ', balance),
    // ⚠️ **"In today's money" is the truth about this box and not a flourish** (register O87, user
    // ruling 2026-09-21): the walk raises this figure with prices every year, so what is typed is a
    // price for a service and not a quantity of future dollars. Said on the label because the two
    // rate boxes beside it are NOT indexed, and a silent box beside a labelled one is read as
    // agreeing with it. The why is one sentence in the notice behind the info button.
    label('Admin. fee, dollars a year, in today’s money ', input('text', `administrationFeePerYear-${index}`, held?.administrationFeePerYear ?? '')),
    ...rateBox('Admin. fee, ', `administrationFeeRate-${index}`, held?.administrationFeeRate ?? '', balance),
    // **THE CAP (P3-17 slice 3, user-approved 2026-09-25) — beside the percentage fee it limits,
    // never beside the dollar fee or the investment fee.** DOLLARS a year, blank is uncapped.
    label(
      'Cap on that percentage fee, per year $ (optional) ',
      input('text', `administrationFeeCapPerYear-${index}`, held?.administrationFeeCapPerYear ?? ''),
    ),
    ...rateBox('Investment fee, ', `investmentFeeRate-${index}`, held?.investmentFeeRate ?? '', balance),
    infoButton(SUPER_FEES_SUMMARY, SUPER_FEES_NOTICE, 'guide:super-fees'),
    pensionFeeBoxes(held, index, balance),
    insuranceBoxes(held, index),
    ttrStreamBoxes(held, index),
    atRetirementBox(held, index),
  );
  return row;
};

/**
 * **THE ACCOUNT-BASED PENSION PHASE'S OWN FEE SET — P3-17 slice 4, user-approved 2026-09-25.** Shown
 * for every interest, not gated by phase (unlike `ttrStreamBoxes`/`atRetirementBox`): the boxes
 * above are what a fund charges NOW, and this group is what it charges once the SAME account is a
 * pension — a fact worth stating whether that day has already arrived or is still ahead of an
 * accumulation or TTR account. Every box optional; `planWithStatedPosition` reads them through
 * `statedFee`, so a blank box omits the key exactly as the boxes above do.
 */
const pensionFeeBoxes = (held: PersonFormValues['superInterests'][number] | undefined, index: number, balance: HTMLInputElement): HTMLElement => {
  const group = document.createElement('span');
  group.className = 'pension-fees';
  group.append(
    label(
      'After retirement (account-based pension), dollars a year, in today’s money — leave blank to keep the same fees ',
      input('text', `pensionAdministrationFeePerYear-${index}`, held?.pensionAdministrationFeePerYear ?? ''),
    ),
    ...rateBox('After retirement, admin. fee, ', `pensionAdministrationFeeRate-${index}`, held?.pensionAdministrationFeeRate ?? '', balance),
    label(
      'After retirement, cap on that percentage fee, per year $ (optional) ',
      input('text', `pensionAdministrationFeeCapPerYear-${index}`, held?.pensionAdministrationFeeCapPerYear ?? ''),
    ),
    infoButton(PENSION_FEES_SUMMARY, PENSION_FEES_NOTICE, 'guide:fees-after-retirement'),
  );
  return group;
};

/** P3-17a slice 1: death/TPD premiums off the statement, the cover type, and the insurance admin fee. P3-17b: income protection. */
const insuranceBoxes = (held: PersonFormValues['superInterests'][number] | undefined, index: number): HTMLElement => {
  const group = document.createElement('span');
  group.className = 'insurance';
  // One heading carries the unit and "optional" for every box under it (P17-6).
  group.append(
    paragraph('group-label', 'Insurance in this account — $ a year, today’s money, all optional'),
    label('Death cover ', input('text', `deathPremiumPerYear-${index}`, held?.deathPremiumPerYear ?? '')),
    label('TPD cover ', input('text', `tpdPremiumPerYear-${index}`, held?.tpdPremiumPerYear ?? '')),
    label('Cover type ', select(`insuranceCoverKind-${index}`, INSURANCE_COVER_CHOICES, held?.insuranceCoverKind ?? '')),
    label('Admin. fee ', input('text', `insuranceAdminFeePerYear-${index}`, held?.insuranceAdminFeePerYear ?? '')),
    label('Income protection ', input('text', `incomeProtectionPremiumPerYear-${index}`, held?.incomeProtectionPremiumPerYear ?? '')),
    label(
      'Benefit period ',
      select(`incomeProtectionBenefitPeriod-${index}`, INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES, held?.incomeProtectionBenefitPeriod ?? ''),
    ),
    label('Death cover ends at age ', input('text', `deathCoverEndsAtAge-${index}`, held?.deathCoverEndsAtAge ?? '')),
    label('TPD cover ends at age ', input('text', `tpdCoverEndsAtAge-${index}`, held?.tpdCoverEndsAtAge ?? '')),
    infoButton(INSURANCE_SUMMARY, INSURANCE_NOTICE, 'guide:super-insurance'),
  );
  return group;
};

/**
 * **What the account does at retirement (user ruling, 2026-09-23)**, on the page for every account
 * and shown only where there is something to switch: an account-based pension has no box.
 * `planWithStatedPosition` asks the same `atRetirementBoxShown`, so a hidden box never writes.
 */
const atRetirementBox = (held: PersonFormValues['superInterests'][number] | undefined, index: number): HTMLElement => {
  const group = document.createElement('span');
  group.className = 'at-retirement';
  group.hidden = !atRetirementBoxShown(held?.phase ?? '');
  group.append(
    label('At retirement, 60 or older ', select(`atRetirement-${index}`, AT_RETIREMENT_CHOICES, held?.atRetirement ?? AT_RETIREMENT_SWITCH)),
    infoButton(AT_RETIREMENT_SUMMARY, AT_RETIREMENT_NOTICE, 'guide:becomes-a-pension'),
  );
  return group;
};

/**
 * **The two transition-to-retirement boxes, on the page for every interest and SHOWN only for a
 * `ttr` one** (TTR build step 2). Hidden rather than left out, so a date typed, then a phase
 * switched away and back, is still in the box: the phase box's redraw reads the form as it stands.
 * Whether a hidden box is saved is not decided here — `planWithStatedPosition` asks the same
 * `ttrStreamBoxesShown` and ignores both boxes when it is false.
 *
 * Each box has an empty line under it that the save button fills with `ttrBoxObjections`'s
 * sentence, found by `data-error-for`, which is the box's own name.
 */
const ttrStreamBoxes = (held: PersonFormValues['superInterests'][number] | undefined, index: number): HTMLElement => {
  const group = document.createElement('span');
  group.className = 'ttr-stream';
  group.hidden = !ttrStreamBoxesShown(held?.phase ?? '');
  const objection = (name: string): HTMLParagraphElement => {
    const line = paragraph('field-error', '');
    line.dataset['errorFor'] = name;
    return line;
  };
  group.append(
    label('Start date ', input('date', `ttrStartDate-${index}`, held?.ttrStartDate ?? '')),
    objection(`ttrStartDate-${index}`),
    label('Share taken out each year (%) ', input('text', `ttrDrawdownRate-${index}`, held?.ttrDrawdownRate ?? '')),
    paragraph('caveat', TTR_RATE_BESIDE),
    objection(`ttrDrawdownRate-${index}`),
  );
  return group;
};

/**
 * **One fee-rate box, typed as a PERCENTAGE, and the two live readings under it** (user ruling,
 * 2026-09-25). `${text}% a year ` is the label's own ending, so a reader never has to guess which
 * convention a bare number box is in — the mistake this ruling exists to close.
 *
 * The first line is the CONFIRMATION every percentage box gets: what it charges in dollars a year
 * on the balance typed above, because "0.15% a year" is not a figure most people can size up and a
 * dollar amount is. It follows BOTH boxes live — the rate and the balance — for the as-at heading's
 * reason: a figure said back only after the save is said too late.
 *
 * The second is the GUARD: a decimal fraction typed into this box by habit reads as a huge
 * percentage, and `feeRateWarning` says so without refusing anything — `parsePlan` is still the one
 * judge of what may be saved.
 *
 * Both are read off the boxes' own values and nothing else, so neither can disagree with what will
 * be saved, and both are empty until something readable is typed.
 */
const rateBox = (text: string, name: string, value: string, balance: HTMLInputElement): readonly HTMLElement[] => {
  const box = input('text', name, value);
  const dollars = paragraph('caveat', feeRateDollarsAYear(box.value, balance.value));
  const warning = paragraph('caveat', feeRateWarning(box.value));
  const refresh = (): void => {
    dollars.textContent = feeRateDollarsAYear(box.value, balance.value);
    warning.textContent = feeRateWarning(box.value);
  };
  box.addEventListener('input', refresh);
  balance.addEventListener('input', refresh);
  // The "%" after the box is display only: what is typed and saved is unchanged (P17-6).
  const labelled = label(`${text}% a year `, box);
  labelled.append(' %');
  // The box and its "= $… a year" line wrap as one, so the line never starts the next row.
  const pair = document.createElement('span');
  pair.className = 'rate-box';
  pair.append(labelled, dollars);
  return [pair, warning];
};

/**
 * **THE SUBDIV 293-B ELECTION — ONE CHOICE PER PERSON, AND THE ILLEGAL PLANS ARE UNCONSTRUCTABLE
 * RATHER THAN REFUSED** (register O84 residual (iii), closed 2026-09-20).
 *
 * `parsePlan.checkReleaseAuthorityDestinations` refuses two marked interests and a mark on a
 * retirement-phase interest, and `division293ReleaseDestination` refuses both again in the walk.
 * This control cannot produce either: it is a SINGLE `<select>` for the whole Person, so there is
 * one value and two marks cannot be expressed, and its options are `electableSuperInterests` —
 * the accumulation positions and nothing else. A checkbox per interest would have been the shape
 * that can express both and then has to be validated, which is the shape this one exists instead of.
 *
 * **Nothing is pre-selected.** The chosen option is the one the plan states, and for a Person who
 * states none that is `NO_RELEASE_ELECTION` — an option with its own words on it, so that "I pay it
 * from cash" is something a user reads and chooses rather than something they fail to fill in.
 */
const electionRow = (person: PersonFormValues): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'election';
  const chooser = document.createElement('select');
  chooser.name = 'releaseAuthorityInterest';
  const none = document.createElement('option');
  none.value = NO_RELEASE_ELECTION;
  none.textContent = NO_RELEASE_ELECTION_LABEL;
  chooser.append(none);
  for (const position of electableSuperInterests(person)) {
    const option = document.createElement('option');
    option.value = String(position);
    option.textContent = releaseElectionOptionLabel(position);
    chooser.append(option);
  }
  const elected = electedReleaseInterest(person);
  chooser.value = elected === undefined ? NO_RELEASE_ELECTION : String(elected);
  row.append(
    label('Division 293 charge comes out of ', chooser),
    infoButton(RELEASE_ELECTION_SUMMARY, RELEASE_ELECTION_NOTICE, 'guide:division-293-election'),
  );
  return row;
};

/** What stays on the page beside the "employer pays into" select. */
export const EMPLOYER_PAYS_INTO_SUMMARY = 'Where the employer’s super goes.';

export const EMPLOYER_PAYS_INTO_NOTICE =
  'Your employer’s super contributions are paid into this account. Pick the one your employer pays into.' +
  ' The other account can then start a transition to retirement pension.';

/**
 * The "employer pays into" select (register O82): this person's accumulation accounts, numbered as the
 * account rows are. Shown only by `employerPaysIntoShown`, which is also what lets it write; it is
 * kept in step with the pay box as that is typed, so it is hidden rather than left out.
 */
const employerPaysIntoRow = (person: PersonFormValues, salary: HTMLInputElement): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'employer-pays-into';
  const chooser = document.createElement('select');
  chooser.name = 'employerPaysInto';
  const unchosen = document.createElement('option');
  unchosen.value = '';
  unchosen.textContent = EMPLOYER_PAYS_INTO_UNCHOSEN_LABEL;
  chooser.append(unchosen);
  person.superInterests.forEach((interest, position) => {
    if (interest.phase !== 'accumulation') return;
    const option = document.createElement('option');
    option.value = String(position);
    option.textContent = employerPaysIntoOptionLabel(position);
    chooser.append(option);
  });
  chooser.value = person.employerPaysInto;
  row.append(
    label('Employer pays into ', chooser),
    infoButton(EMPLOYER_PAYS_INTO_SUMMARY, EMPLOYER_PAYS_INTO_NOTICE, 'guide:ttr-start'),
  );
  const sync = (): void => {
    row.hidden = !employerPaysIntoShown(salary.value, person.superInterests);
  };
  sync();
  salary.addEventListener('input', sync);
  return row;
};

/**
 * One investment holding: when it was bought, what it cost, what it is worth now — and, for a plan
 * starting after 1 July 2027, what it was worth just before that day. That box is on the page for
 * every holding and SHOWN only while `valueJustBefore1July2027BoxShown` is true for the as-at date,
 * `ttrStreamBoxes`'s rule: hidden rather than left out, so a figure survives the date being changed
 * and changed back, and `planWithStatedPosition` asks the same question before it writes the box.
 */
const parcelRow = (person: PersonFormValues, index: number, asAtDate: string): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'holding';
  const held = person.parcels[index];
  const stamp = document.createElement('span');
  stamp.className = 'value-just-before-1-july-2027';
  stamp.hidden = !valueJustBefore1July2027BoxShown(asAtDate);
  stamp.append(
    label('Worth just before 1 July 2027 ', input('text', `valueJustBefore1July2027-${index}`, held?.valueJustBefore1July2027 ?? '')),
    infoButton(VALUE_AT_REFORM_SUMMARY, VALUE_AT_REFORM_NOTICE, 'guide:investment-parcels'),
  );
  row.append(
    label('When you bought it ', input('date', `acquired-${index}`, held?.acquired ?? '')),
    label('What you paid ', input('text', `costBase-${index}`, held?.costBase ?? '')),
    label('What it’s worth now ', input('text', `marketValue-${index}`, held?.marketValue ?? '')),
    stamp,
  );
  return row;
};

/**
 * **P3-4b slice 2 — the unused concessional cap boxes, one per year the door accepts, and the
 * 30 June balance box.** Every year `unusedCapYears` offers is drawn, and any year the plan already
 * states besides, so no stated figure is dropped by a box that is missing. The 30 June box is on the
 * page always and SHOWN only while `totalSuperBalanceAt30JuneBoxShown` — `parcelRow`'s rule, so a
 * figure survives the date being changed and changed back.
 */
const unusedCapRows = (person: PersonFormValues, asAtDate: string): HTMLElement => {
  const group = document.createElement('div');
  group.className = 'unused-cap';
  group.append(
    paragraph('group-label', 'Unused concessional cap from myGov'),
    infoButton(UNUSED_CAP_SUMMARY, UNUSED_CAP_NOTICE, 'guide:catch-up-contributions'),
  );
  const years = [...new Set([...unusedCapYears(asAtDate), ...Object.keys(person.unusedConcessionalCap)])].sort();
  for (const year of years) {
    group.append(label(`${year} $`, input('text', `unusedConcessionalCap-${year}`, person.unusedConcessionalCap[year] ?? '')));
  }
  const balance = document.createElement('span');
  balance.className = 'total-super-balance-at-30-june';
  balance.hidden = !totalSuperBalanceAt30JuneBoxShown(asAtDate);
  balance.append(label(`Total super balance on 30 June ${thirtyJuneYear(asAtDate) ?? ''} $`, input('text', 'totalSuperBalanceAt30June', person.totalSuperBalanceAt30June)));
  group.append(balance);
  return group;
};

/**
 * The position form, rebuilt from a values object rather than patched. `show` is how it puts a new
 * version of itself on screen: the three Add buttons read what is currently typed, hand it to one
 * of `planEdits.ts`'s pure add functions, and redraw from the result — so adding a row never loses
 * a figure the user has typed and never writes anything to disk. Only the save button writes.
 */
const renderPosition = (
  box: HTMLElement,
  host: SettingsPanelHost,
  values: StatedPositionFormValues,
  announce: HTMLElement,
  show: (next: StatedPositionFormValues) => void,
): void => {
  const form = document.createElement('form');
  form.className = 'stated-position';

  const asAtDate = input('date', 'asAtDate', values.asAtDate);
  // The as-at date decides whether each holding asks for its value just before 1 July 2027.
  asAtDate.addEventListener('input', () => {
    form.querySelectorAll<HTMLElement>('.value-just-before-1-july-2027').forEach((stamp) => {
      stamp.hidden = !valueJustBefore1July2027BoxShown(asAtDate.value);
    });
    // P3-4b slice 2: the 30 June box, on the same rule and for the same reason.
    form.querySelectorAll<HTMLElement>('.total-super-balance-at-30-june').forEach((box) => {
      box.hidden = !totalSuperBalanceAt30JuneBoxShown(asAtDate.value);
    });
  });

  const homeStatus = select('homeStatus', HOME_STATUS_CHOICES, values.homeStatus);
  const openingOffsetBalance = input('text', 'openingOffsetBalance', values.openingOffsetBalance);
  // A couple's ownership box — the first Person's share, the second owning the rest. Built always and
  // shown only to a couple: a single Person owns the whole offset and is asked nothing.
  const couple = values.persons.length === 2;
  const offsetSharePercent = input('text', 'offsetSharePercent', values.offsetSharePercent);
  const mortgageBalance = input('text', 'mortgageBalance', values.mortgageBalance);
  const mortgageInterestRate = input('text', 'mortgageInterestRate', values.mortgageInterestRate);
  const mortgageRepayment = input('text', 'mortgageRepayment', values.mortgageRepayment);

  const people: HTMLElement[] = [];
  const read = (): StatedPositionFormValues => ({
    asAtDate: asAtDate.value,
    homeStatus: homeStatus.value,
    openingOffsetBalance: openingOffsetBalance.value,
    offsetSharePercent: couple ? offsetSharePercent.value : '',
    mortgageBalance: mortgageBalance.value,
    mortgageInterestRate: mortgageInterestRate.value,
    mortgageRepayment: mortgageRepayment.value,
    persons: people.map((block) => {
      const field = (name: string): string => block.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? '';
      const count = (prefix: string): number => block.querySelectorAll(`[name^="${prefix}-"]`).length;
      return {
        name: field('name'),
        dateOfBirth: field('dateOfBirth'),
        employmentIncomePerFortnight: field('employmentIncomePerFortnight'),
        workBonusBalance: field('workBonusBalance'),
        superInterests: Array.from({ length: count('balance') }, (_unused, index) => ({
          phase: field(`phase-${index}`),
          balance: field(`balance-${index}`),
          // A fee box is read as the string it was typed as, blank included: a blank one states no
          // fee, and `planWithStatedPosition` is where that becomes an absent key.
          administrationFeePerYear: field(`administrationFeePerYear-${index}`),
          administrationFeeCapPerYear: field(`administrationFeeCapPerYear-${index}`),
          administrationFeeRate: field(`administrationFeeRate-${index}`),
          investmentFeeRate: field(`investmentFeeRate-${index}`),
          // P3-17 slice 4 (2026-09-25) — the account-based pension phase's own fee set, same rule.
          pensionAdministrationFeePerYear: field(`pensionAdministrationFeePerYear-${index}`),
          pensionAdministrationFeeCapPerYear: field(`pensionAdministrationFeeCapPerYear-${index}`),
          pensionAdministrationFeeRate: field(`pensionAdministrationFeeRate-${index}`),
          deathPremiumPerYear: field(`deathPremiumPerYear-${index}`),
          tpdPremiumPerYear: field(`tpdPremiumPerYear-${index}`),
          insuranceCoverKind: field(`insuranceCoverKind-${index}`),
          insuranceAdminFeePerYear: field(`insuranceAdminFeePerYear-${index}`),
          incomeProtectionPremiumPerYear: field(`incomeProtectionPremiumPerYear-${index}`),
          incomeProtectionBenefitPeriod: field(`incomeProtectionBenefitPeriod-${index}`),
          deathCoverEndsAtAge: field(`deathCoverEndsAtAge-${index}`),
          tpdCoverEndsAtAge: field(`tpdCoverEndsAtAge-${index}`),
          ttrStartDate: field(`ttrStartDate-${index}`),
          ttrDrawdownRate: field(`ttrDrawdownRate-${index}`),
          atRetirement: field(`atRetirement-${index}`),
        })),
        parcels: Array.from({ length: count('acquired') }, (_unused, index) => ({
          acquired: field(`acquired-${index}`),
          costBase: field(`costBase-${index}`),
          marketValue: field(`marketValue-${index}`),
          valueJustBefore1July2027: field(`valueJustBefore1July2027-${index}`),
        })),
        // One box per Person, holding one position or the no-election value. `field` returns the
        // no-election value when the control is missing, which is the safe way for it to be wrong:
        // a lost box is a lost election, never an invented one.
        releaseAuthorityInterest: field('releaseAuthorityInterest'),
        employerPaysInto: field('employerPaysInto'),
        priorRetirementPhase: field('priorRetirementPhase'),
        // One box per year drawn; the years are read off the boxes that are there.
        unusedConcessionalCap: Object.fromEntries(
          Array.from(block.querySelectorAll<HTMLInputElement>('[name^="unusedConcessionalCap-"]'), (box) => box.name.slice('unusedConcessionalCap-'.length))
            .map((year) => [year, field(`unusedConcessionalCap-${year}`)]),
        ),
        totalSuperBalanceAt30June: field('totalSuperBalanceAt30June'),
      };
    }),
  });

  values.persons.forEach((person, personIndex) => {
    const block = document.createElement('fieldset');
    block.className = 'person';
    const who = document.createElement('span');
    who.className = 'who';
    // Folds per person (user, 2026-09-29), and remembers being open across the redraws the Add
    // buttons and the phase select trigger.
    const { fold, body } = foldBox(`person-${personIndex}`, who);
    block.append(fold);
    // The person is called by their own name, and by their position only while they have none —
    // `ownerNames.ts`'s wording, imported rather than restated so the two cannot drift apart.
    const name = input('text', 'name', person.name);
    const callThem = (): string => (name.value.trim() === '' ? UNNAMED_PERSON_LABELS[personIndex === 0 ? 0 : 1] : name.value);
    who.textContent = callThem();
    // The legend follows the name box as it is typed, for the as-at heading's reason: a heading
    // naming somebody the box no longer names is the screen disagreeing with itself.
    name.addEventListener('input', () => {
      who.textContent = callThem();
    });
    const salaryBox = input('text', 'employmentIncomePerFortnight', person.employmentIncomePerFortnight);
    body.append(
      label('Name ', name),
      label('Date of birth ', input('date', 'dateOfBirth', person.dateOfBirth)),
      label('Pay per fortnight, before tax (not take-home), today’s money ', salaryBox),
      infoButton(EMPLOYMENT_INCOME_SUMMARY, EMPLOYMENT_INCOME_NOTICE, 'guide:household-people'),
      label('Work Bonus balance $', input('text', 'workBonusBalance', person.workBonusBalance)),
      infoButton(WORK_BONUS_SUMMARY, WORK_BONUS_NOTICE, 'guide:work-bonus'),
    );
    // The redraw a phase change triggers reads the form as it stands, exactly as the Add buttons
    // do, so nothing typed is lost and nothing is written: only the election list is rebuilt.
    const redrawFromForm = (): void => show(read());
    person.superInterests.forEach((_interest, index) => body.append(interestRow(person, index, redrawFromForm)));
    body.append(
      button('Another super account', 'Adds an empty super account to this person. Nothing is saved until you save the section.', () =>
        show(positionWithSuperInterest(read(), personIndex, BLANK_SUPER_INTEREST))),
      employerPaysIntoRow(person, salaryBox),
      electionRow(person),
      label('Already had a super pension before this plan ', select('priorRetirementPhase', PRIOR_PENSION_CHOICES, person.priorRetirementPhase)),
      infoButton(PRIOR_PENSION_SUMMARY, PRIOR_PENSION_NOTICE, 'guide:becomes-a-pension'),
      unusedCapRows(person, values.asAtDate),
      // Heads the holdings AND the button (user ruling, 2026-09-25), so it sits above both.
      paragraph('group-label', 'Other investments'),
      infoButton(INVESTMENTS_SUMMARY, INVESTMENTS_NOTICE, 'guide:investment-parcels'),
    );
    person.parcels.forEach((_parcel, index) => body.append(parcelRow(person, index, values.asAtDate)));
    body.append(
      button('Another investment — shares or managed funds', 'Adds an empty investment holding to this person. Nothing is saved until you save the section.', () =>
        show(positionWithParcel(read(), personIndex, BLANK_PARCEL))),
    );
    people.push(block);
  });

  form.append(
    label('As at ', asAtDate),
    infoButton(AS_AT_DATE_SUMMARY, AS_AT_DATE_NOTICE, 'guide:as-at-date'),
    label('Home ', homeStatus),
    infoButton(HOME_SUMMARY, HOME_NOTICE, 'guide:home-status'),
    label('Offset account balance (blank if you have none) ', openingOffsetBalance),
    ...(couple ? [label(offsetShareLabel(values.persons[0]?.name ?? '', values.persons[1]?.name ?? ''), offsetSharePercent)] : []),
    infoButton(OFFSET_SUMMARY, OFFSET_NOTICE, 'guide:offset-account'),
    // **The loan sits directly under the offset, and that is not layout.** The offset is what sizes
    // the interest charge, so the two are one subject read top to bottom. The label on the middle
    // box states the decimal convention where it is typed, on this page's standing rule.
    paragraph('group-label', 'Home loan'),
    infoButton(MORTGAGE_SUMMARY, MORTGAGE_NOTICE, 'guide:home-loan'),
    label('Amount still owed ', mortgageBalance),
    label('Interest rate a year (0.061 is 6.1%) ', mortgageInterestRate),
    label('Repayment each month ', mortgageRepayment),
    ...people,
  );
  // A household is one person or two — `parsePlan` owns that rule and refuses a third, so the
  // control is simply not offered past two rather than checked for here.
  if (values.persons.length < 2) {
    form.append(
      button('Another person', 'Adds a second person to the household. Nothing is saved until you save the section.', () =>
        show(positionWithPerson(read(), BLANK_PERSON))),
    );
  }
  form.append(
    infoButton(CARRIED_THROUGH_SUMMARY, CARRIED_THROUGH_NOTICE, 'guide:screen-household'),
    button(SAVE_LABELS.position, 'The figures and the date they are stated as at go into the plan file in one write.', () => {
      const typed = read();
      // **The one thing this form says NO to before the door does**, and it is a sign check on a
      // fee box (`negativeFeeObjection`). The door refuses a negative fee by field and by path,
      // which is the right sentence for a hand-edited file and the wrong one for somebody looking
      // at the box they just typed into. Nothing else is judged here and nothing is corrected:
      // the save simply does not happen, and what is on screen is still what the user typed.
      const objection = negativeFeeObjection(typed);
      if (objection !== undefined) {
        announce.textContent = objection;
        return;
      }
      // The transition-to-retirement boxes are judged the same way, but the sentence goes BESIDE
      // the box it is about, and every line is rewritten on every attempt so a fixed box clears.
      let ttrObjected = false;
      let phaseObjected = false;
      people.forEach((block, personIndex) => {
        const person = typed.persons[personIndex];
        person?.superInterests.forEach((interest, index) => {
          const phaseObjection = employerAccountObjection(person, index);
          const phaseLine = block.querySelector(`[data-error-for="phase-${index}"]`);
          if (phaseLine !== null) phaseLine.textContent = phaseObjection ?? '';
          if (phaseObjection !== undefined) phaseObjected = true;
          const objections = ttrBoxObjections(interest);
          for (const box of ['ttrStartDate', 'ttrDrawdownRate'] as const) {
            const line = block.querySelector(`[data-error-for="${box}-${index}"]`);
            if (line !== null) line.textContent = objections[box] ?? '';
            if (objections[box] !== undefined) ttrObjected = true;
          }
        });
      });
      if (phaseObjected) {
        announce.textContent = PHASE_NOT_SAVED;
        return;
      }
      if (ttrObjected) {
        announce.textContent = TTR_NOT_SAVED;
        return;
      }
      void saveAndAnnounce(host, announce, planWithStatedPosition(host.currentPlan(), typed));
    }),
  );
  endRowsAtInfo(form);
  box.replaceChildren(form);
};

/** The assumptions form. Fourteen boxes, no date, and one button. */
const renderSettings = (box: HTMLElement, host: SettingsPanelHost, values: SettingsFormValues, announce: HTMLElement): void => {
  const form = document.createElement('form');
  form.className = 'assumptions';
  const heading = document.createElement('h3');
  heading.textContent = 'Forecast assumptions';

  const boxes: Record<keyof SettingsFormValues, HTMLInputElement> = {
    planningHorizonAge: input('text', 'planningHorizonAge', values.planningHorizonAge),
    contingencyFloor: input('text', 'contingencyFloor', values.contingencyFloor),
    nominalReturn: input('text', 'nominalReturn', values.nominalReturn),
    investmentPayoutRate: input('text', 'investmentPayoutRate', values.investmentPayoutRate),
    investmentPayoutFrankedShare: input('text', 'investmentPayoutFrankedShare', values.investmentPayoutFrankedShare),
    superIncomeYieldRate: input('text', 'superIncomeYieldRate', values.superIncomeYieldRate),
    superIncomeYieldFrankedShare: input('text', 'superIncomeYieldFrankedShare', values.superIncomeYieldFrankedShare),
    cashInterestRate: input('text', 'cashInterestRate', values.cashInterestRate),
    deemingLower: input('text', 'deemingLower', values.deemingLower),
    deemingUpper: input('text', 'deemingUpper', values.deemingUpper),
    cpi: input('text', 'cpi', values.cpi),
    pblci: input('text', 'pblci', values.pblci),
    awote: input('text', 'awote', values.awote),
    mtawe: input('text', 'mtawe', values.mtawe),
  };

  form.append(
    infoButton(ASSUMPTIONS_SUMMARY, ASSUMPTIONS_NOTICE, 'guide:assumptions'),
    label('Planning horizon age ', boxes.planningHorizonAge),
    infoButton(PLANNING_HORIZON_SUMMARY, PLANNING_HORIZON_NOTICE, 'guide:assumption-boxes'),
    label('Growth of super and investments a year, before inflation ', boxes.nominalReturn),
    infoButton(NOMINAL_RETURN_SUMMARY, NOMINAL_RETURN_NOTICE, 'guide:growth-guess'),
    // **Directly under the growth box, and that is not layout either.** The two are the same
    // subject read top to bottom — what a holding gains, and what it hands over — and a reader who
    // meets the second one anywhere else is liable to type the same number into both.
    label('Yearly payout, share of value (0.04 is 4%; blank if none) ', boxes.investmentPayoutRate),
    label('Share already company-taxed (0.7 is 70%; blank if unsure) ', boxes.investmentPayoutFrankedShare),
    infoButton(INVESTMENT_PAYOUT_SUMMARY, INVESTMENT_PAYOUT_NOTICE, 'guide:investment-payout'),
    label('Super income the fund is taxed on, share of balance (0.02 is 2%; blank if unsure) ', boxes.superIncomeYieldRate),
    label('Share of that already company-taxed (0.7 is 70%; blank if unsure) ', boxes.superIncomeYieldFrankedShare),
    infoButton(SUPER_INCOME_YIELD_SUMMARY, SUPER_INCOME_YIELD_NOTICE, 'guide:other-assumption-boxes'),
    label('Cash and offset interest (0.03 is 3%; blank follows CPI; 0 if none) ', boxes.cashInterestRate),
    infoButton(CASH_INTEREST_SUMMARY, CASH_INTEREST_NOTICE, 'guide:other-assumption-boxes'),
    // The one money box on this form, and the label says both things the box cannot: which money it
    // is stated in, and that empty is an answer rather than an unfinished field.
    label('Contingency buffer — kept back, in today’s money (blank if you have none) ', boxes.contingencyFloor),
    infoButton(CONTINGENCY_FLOOR_SUMMARY, CONTINGENCY_FLOOR_NOTICE, 'guide:other-assumption-boxes'),
    label('Deeming, lower rate ', boxes.deemingLower),
    label('Deeming, upper rate ', boxes.deemingUpper),
    infoButton(DEEMING_SUMMARY, DEEMING_NOTICE, 'guide:deeming'),
    label('Prices, yearly rise (CPI) ', boxes.cpi),
    infoButton(CPI_SUMMARY, CPI_NOTICE, 'guide:assumption-boxes'),
    label('Pensioners’ cost of living, yearly rise (PBLCI) ', boxes.pblci),
    infoButton(PBLCI_SUMMARY, PBLCI_NOTICE, 'guide:other-assumption-boxes'),
    label('Wages, yearly rise (AWOTE) ', boxes.awote),
    infoButton(AWOTE_SUMMARY, AWOTE_NOTICE, 'guide:assumption-boxes'),
    label('Age Pension wage benchmark, yearly rise (MTAWE) ', boxes.mtawe),
    infoButton(MTAWE_SUMMARY, MTAWE_NOTICE, 'guide:other-assumption-boxes'),
    button(SAVE_LABELS.assumptions, 'The as-at date is not on this form and is not touched by this write.', () => {
      void saveAndAnnounce(host, announce, planWithSettings(host.currentPlan(), {
        planningHorizonAge: boxes.planningHorizonAge.value,
        contingencyFloor: boxes.contingencyFloor.value,
        nominalReturn: boxes.nominalReturn.value,
        investmentPayoutRate: boxes.investmentPayoutRate.value,
        investmentPayoutFrankedShare: boxes.investmentPayoutFrankedShare.value,
        superIncomeYieldRate: boxes.superIncomeYieldRate.value,
        superIncomeYieldFrankedShare: boxes.superIncomeYieldFrankedShare.value,
        cashInterestRate: boxes.cashInterestRate.value,
        deemingLower: boxes.deemingLower.value,
        deemingUpper: boxes.deemingUpper.value,
        cpi: boxes.cpi.value,
        pblci: boxes.pblci.value,
        awote: boxes.awote.value,
        mtawe: boxes.mtawe.value,
      }));
    }),
  );
  endRowsAtInfo(form);
  const { fold, body } = foldBox('assumptions', heading);
  body.append(form);
  box.replaceChildren(fold);
};

/** Each area's ⓘ, pointing at its table of sources in the guide's appendix. */
const rulesAreaInfo = (area: RulesArea): HTMLDetailsElement => {
  switch (area) {
    case 'tax': return infoButton(RULES_TAX_SUMMARY, RULES_TAX_NOTICE, 'guide:sources-tax');
    case 'super': return infoButton(RULES_SUPER_SUMMARY, RULES_SUPER_NOTICE, 'guide:sources-super');
    case 'agePension': return infoButton(RULES_AGE_PENSION_SUMMARY, RULES_AGE_PENSION_NOTICE, 'guide:sources-age-pension');
    case 'heas': return infoButton(RULES_HEAS_SUMMARY, RULES_HEAS_NOTICE, 'guide:sources-heas');
    case 'agedCare': return infoButton(RULES_AGED_CARE_SUMMARY, RULES_AGED_CARE_NOTICE, 'guide:sources-aged-care');
  }
};

/**
 * **The rules in force, read only, beside the assumptions** (2026-09-30). One closed fold, a
 * sub-fold per area; the date is the plan's as-at date, so the rows match the month table's "Set by
 * law" figures for that month. An area with no row on that date (every figure past its last
 * published value) is left out rather than shown empty.
 */
const renderRulesInForce = (box: HTMLElement, plan: PlanFile): void => {
  const heading = document.createElement('h3');
  heading.textContent = 'The rules in force';
  const { fold, body } = foldBox('rules-in-force', heading);
  fold.classList.add('rules-in-force');
  body.append(
    infoButton(RULES_IN_FORCE_SUMMARY, RULES_IN_FORCE_NOTICE, 'guide:rules-in-force'),
    paragraph('caveat', rulesHeadline(plan.settings.asAtDate, LAST_LEGISLATION_REFRESH)),
  );
  for (const section of rulesInForce(plan.settings.asAtDate)) {
    if (section.rows.length === 0) continue;
    const title = document.createElement('h4');
    title.textContent = section.title;
    const area = foldBox(`rules-${section.area}`, title);
    const list = document.createElement('ul');
    list.className = 'rules';
    for (const rule of section.rows) {
      const item = document.createElement('li');
      item.textContent = ruleRowText(rule);
      list.append(item);
    }
    area.body.append(rulesAreaInfo(section.area), list);
    body.append(area.fold);
  }
  box.replaceChildren(fold);
};

/**
 * **The hand-off, and it is the reason the walkthrough is not a dead end** (user ruling,
 * 2026-09-20). A plan built from a name and a date of birth states no home, no super and no income,
 * so the forecast it draws is blank — and the section that takes those figures is a `<details>`
 * that starts closed (`public/index.html`). Opening it is what turns "your plan was replaced" into
 * a next step. The disclosure is found by walking UP from this box rather than by id, so this file
 * still knows nothing about the page's layout beyond being somewhere inside that section.
 */
const openDisclosure = (node: HTMLElement): void => {
  const disclosure = node.closest('details');
  if (disclosure) disclosure.open = true;
};

/**
 * **“Start again”, as two states of the same box: resting, and the walkthrough form.**
 *
 * Nothing is written until Finish, and the opening click writes nothing at all — it only puts the
 * two boxes on screen, under the cost of pressing Finish. **The warning lives in the FORM branch
 * only** (user ruling, 2026-09-20): the resting button cannot write, and a warning shown where it
 * does not apply is one a user has stopped reading by the time it does. "Cancel" is not decoration:
 * a form that can only be opened and never closed leaves a user clicking elsewhere to escape it,
 * and elsewhere on this page is a save button.
 *
 * **The Finish button starts DISABLED and is enabled by presence alone.** Nothing here looks at
 * what was typed: a name has no engine-level rule to check it against, and a date of birth has two
 * — `parsePlan`'s format guard and `project()`'s planning horizon — which say so far better than a
 * hand-written check could, at the door, over a plan file that is still the user's own.
 *
 * **Failure and success both end here closed.** On success `main.ts` has already redrawn the whole
 * panel from the stored plan and `saveAndAnnounce` has written the sentence; on a refusal or a
 * write that did not land it redraws nothing, so closing the form here is what stops a filled-in
 * Finish sitting on screen over a plan that was never replaced. Neither branch says anything: the
 * announcement is `saveAndAnnounce`'s alone, and the banner is `main.ts`'s.
 */
const renderReset = (
  box: HTMLElement,
  host: SettingsPanelHost,
  announce: HTMLElement,
  armed: boolean,
  show: (next: boolean) => void,
): void => {
  const heading = document.createElement('h3');
  heading.textContent = 'Start again with a new plan';
  if (!armed) {
    box.replaceChildren(
      heading,
      paragraph('caveat', WALKTHROUGH_INVITATION),
      button(RESET_LABELS.start, 'Asks for a name and a date of birth first. Nothing is written by this button.', () => show(true)),
    );
    return;
  }

  const form = document.createElement('form');
  form.className = 'walkthrough';
  const name = input('text', 'walkthroughName', '');
  // `type="date"` is what makes the value ISO, which is the format `parsePlan` reads. There is no
  // fallback parse here: a browser that hands over something else gets the door's refusal.
  const dateOfBirth = input('date', 'walkthroughDateOfBirth', '');
  // Asked afresh each time the form opens, so the answer is never carried over from a previous one.
  const also = host.startAgainAlso?.();

  const finish = button(RESET_LABELS.finish, 'Writes the new plan over your plan file now. This cannot be undone.', () => {
    // `describe` runs ONLY when the read-back says the write landed, so the hand-off rides on the
    // one place that fact is known here. The box is still in the document: `mountSettingsPanel`
    // runs once and a redraw re-renders into this same node rather than replacing it.
    void saveAndAnnounce(host, announce, walkthroughPlan({ name: name.value, dateOfBirth: dateOfBirth.value }), (_before, after) => {
      openDisclosure(box);
      return resetConfirmation(after);
    })
      // The second question is acted on only after the plan LANDED: a refused plan leaves both files as they were.
      .then(async (landed) => {
        if (landed && also) announce.textContent += ` ${await also.afterPlanReplaced()}`;
      })
      .finally(() => show(false));
  });
  // Presence only, and on the BUTTON rather than in the handler: a Finish that can be pressed and
  // then silently does nothing is worse than one that is visibly not ready yet.
  finish.disabled = true;
  const gate = (): void => {
    finish.disabled = name.value.trim() === '' || dateOfBirth.value.trim() === '';
  };
  name.addEventListener('input', gate);
  dateOfBirth.addEventListener('input', gate);

  form.append(
    label(WALKTHROUGH_LABELS.name, name),
    label(WALKTHROUGH_LABELS.dateOfBirth, dateOfBirth),
    paragraph('caveat', WALKTHROUGH_NOTICE),
    paragraph('caveat', RESET_WARNING),
    ...(also ? [also.element] : []),
    finish,
    button(RESET_LABELS.cancel, 'Nothing is written and your plan file is untouched.', () => show(false)),
  );
  box.replaceChildren(heading, form);
};

/**
 * Put both forms on the page and return the redraw. `main.ts` calls it after every successful
 * save, so the boxes are refilled from the plan that is now on disk rather than left holding what
 * was typed — a form still showing a figure a refused write never stored would be the screen
 * disagreeing with the file.
 *
 * The confirmation line lives OUTSIDE both forms, for `scenarioPanel.ts`'s reason: each form is
 * replaced wholesale on every redraw, and a sentence about what just happened cannot live inside
 * the thing the save replaces. It is cleared at the start of a redraw and written after the write
 * resolved, by which time `main.ts` has already redrawn.
 */
export const mountSettingsPanel = (box: HTMLElement, host: SettingsPanelHost): (() => void) => {
  const positionBox = document.createElement('div');
  const settingsBox = document.createElement('div');
  const rulesBox = document.createElement('div');
  // The reset is LAST in the panel and outside both forms: it belongs to neither set of figures,
  // and a control that replaces the whole file should not sit beside a Save that changes one box.
  const resetBox = document.createElement('div');
  resetBox.className = 'reset';
  const announce = document.createElement('p');
  announce.className = 'settings-announce';
  box.replaceChildren(positionBox, settingsBox, rulesBox, resetBox, announce);
  const show = (values: StatedPositionFormValues): void => renderPosition(positionBox, host, values, announce, show);
  const showReset = (armed: boolean): void => renderReset(resetBox, host, announce, armed, showReset);
  const redraw = (): void => {
    announce.textContent = '';
    show(positionFormValues(host.currentPlan()));
    renderSettings(settingsBox, host, settingsFormValues(host.currentPlan()), announce);
    renderRulesInForce(rulesBox, host.currentPlan());
    // Disarmed on every redraw, so a write that landed while the confirm was on screen leaves no
    // armed control over a plan that is already gone.
    showReset(false);
  };
  redraw();
  return redraw;
};
