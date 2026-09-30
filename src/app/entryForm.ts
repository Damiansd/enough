// P6-6 (the writer) — the add form and the entry TABLE. It DECIDES nothing: every value it
// reads goes to `planEdits.ts` as the string it was typed as, and every refusal a user sees comes
// from `parsePlan`. The only two facts this file originates are the ones that cannot be pure —
// `crypto.randomUUID()` for the new entry's `id` and today's date for its `createdAt`.
//
// **Why it is untested, stated plainly rather than papered over** (same split as `renderChart.ts`
// and `renderTable.ts`): there is no DOM here and no jsdom — `typescript` is the one dev dependency
// (TODO.md P2-9a). So everything decidable is in `planEdits.ts` and asserted in
// `test/app-plan-edits.test.mjs`, and what stays unproven is whether the values this file reads off
// the inputs are the ones the user typed, which a single look at the page settles.
// `test/app-entry-form.test.mjs` reads this file as TEXT and pins the handful of properties a
// silent regression would turn on: that the toggle writes a boolean and never splices the array,
// that the id and the timestamp are made HERE and passed IN, and that no validation happens here.
// Which rows the table shows and in what order is NOT here either — that is `entryTable.ts`, which
// is pure and asserted behaviourally in `test/app-entry-table.test.mjs`.
//
// ⚠️ **The FORM'S SHAPE FOLLOWS THE UNION'S SHAPE, and that is load-bearing for
// `NON_SUPER_INVESTMENT`.** Its two directions are two `params` shapes that share no field list
// (`plan.ts`, and `parsePlan.ts`'s branch on `direction`): `incidentalCostsOfAcquisition` is
// required on a buy and REFUSED on a sell, and `parcelSelection` exists only on a sell. One flat
// set of boxes offering every field to both would hand the door a plan it rejects on a field the
// user never filled in — a form with a missing check even though the door holds. So the direction
// selector swaps which `<span>` is on the page, **only the shown branch's inputs are read**, and
// each branch calls its own builder, whose parameter type has no field the other branch owns.
//
// ⚠️ **The toggle is ONE control and it is never called "Delete".** `enabled: false` is the
// append-only-safe delete (ADR-0002) and the entry stays in the file, so a label promising removal
// would be a lie about what the button does — and the button is reversible, which "Delete" is not.
//
// ⚠️ **AND IT IS SCOPED TO THE SCENARIO IN VIEW (2026-09-22).** The table lists the ACTIVE
// Scenario's resolved entries, not the shared pool, and the toggle writes that Scenario's own
// `entryOverrides` (`planEdits.ts`'s `planWithEntryOverride`). Before this, both halves read and
// wrote the pool: a user picked a scenario with its radio, switched a change off, and it went off
// in every scenario that listed it — including the one they had built to compare against.
import {
  OFFERED_ENTRY_TYPES,
  DAYS_PER_WEEK_ENTRY_NOTICE,
  DAYS_PER_WEEK_ENTRY_SUMMARY,
  SPEND_CHANGE_ENTRY_NOTICE,
  SPEND_CHANGE_ENTRY_SUMMARY,
  LUMP_SUM_ENTRY_NOTICE,
  LUMP_SUM_ENTRY_SUMMARY,
  MORTGAGE_ENTRY_NOTICE,
  MORTGAGE_ENTRY_SUMMARY,
  SUPER_CONTRIBUTION_ENTRY_NOTICE,
  SUPER_CONTRIBUTION_ENTRY_SUMMARY,
  SPOUSE_CONTRIBUTION_ENTRY_NOTICE,
  SPOUSE_CONTRIBUTION_ENTRY_SUMMARY,
  TTR_RATE_CHANGE_ENTRY_NOTICE,
  TTR_RATE_CHANGE_ENTRY_SUMMARY,
  TTR_START_ENTRY_NOTICE,
  TTR_START_ENTRY_SUMMARY,
  INSURANCE_BENEFIT_CHOICES,
  INSURANCE_COVER_CHANGE_ENTRY_NOTICE,
  INSURANCE_COVER_CHANGE_ENTRY_SUMMARY,
  TTR_RATE_RANGE_PERCENT,
  ENTER_CARE_ENTRY_NOTICE,
  ENTER_CARE_ENTRY_SUMMARY,
  HEAS_DRAW_ENTRY_NOTICE,
  HEAS_DRAW_ENTRY_SUMMARY,
  SELL_HOME_ENTRY_NOTICE,
  SELL_HOME_ENTRY_SUMMARY,
  RENT_OUT_HOME_ENTRY_NOTICE,
  RENT_OUT_HOME_ENTRY_SUMMARY,
  BUY_HOME_ENTRY_NOTICE,
  BUY_HOME_ENTRY_SUMMARY,
  DOWNSIZER_CONTRIBUTION_ENTRY_NOTICE,
  DOWNSIZER_CONTRIBUTION_ENTRY_SUMMARY,
  fractionAsPercent,
  superContributionStopEntry,
  lumpSumFromSuperEntry,
  mortgageRefinanceEntry,
  mortgageTargetEntry,
  mortgagePayoffEntry,
  illnessSeparationEntry,
  deathEntry,
  enterCareEntry,
  heasDrawEntry,
  sellHomeEntry,
  rentOutHomeEntry,
  buyHomeEntry,
  downsizerContributionEntry,
  nonSuperInvestmentBuyEntry,
  nonSuperInvestmentSellEntry,
  oneOffExpenseEntry,
  planWithEntry,
  planWithEntryOverride,
  returnChangeEntry,
  spendChangeEntry,
  spouseContributionEntry,
  superContributionEntry,
  ttrRateChangeEntry,
  ttrStartEntry,
  insuranceCoverChangeEntry,
  workPatternChangeEntry,
} from './planEdits.js'; // `.js` is correct in a `.ts` file
import {
  DEFAULT_ENTRY_TABLE_VIEW,
  ENTRY_TABLE_COLUMNS,
  ariaSortFor,
  entryTableRows,
  filtersAreOpen,
  filtersReset,
  hiddenSummary,
  withSortKey,
  // Inline `type` specifiers rather than a second `import type` line from the same module: one
  // module, one import, so the pinned import list in `test/app-entry-form.test.mjs` cannot be
  // satisfied twice over by the same dependency.
  type EntryRow,
  type EntryTableView,
} from './entryTable.js';
import { activeScenario, activeScenarioEntries, inheritedEntryIds, inheritedEntrySources } from './scenarioWalks.js';
import { infoButton } from './infoButton.js';
import { INVESTMENT_DIRECTION_OPTIONS, PARCEL_SELECTION_OPTIONS, entryTypeLabel, entryTypeOptions, parcelSelectionLabel, superAccountName } from './entryLabels.js';
import { ownerLabel, ownerOptions } from './ownerNames.js';
import { pensionAtRetirementLines, stillWorkingWarnings } from './retirementWarning.js';
import { FOR_GOOD_DETAIL, FOR_GOOD_SUMMARY, RETIRE_CHOICES, TTR_CHOICE_DETAIL, TTR_CHOICE_SUMMARY, forGoodLines, retireChoiceEntries, ttrRefusal, ttrStartNeeded } from './retireChoice.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { Entry } from '../core/plan.js';
import { formatDollars } from './displayMoney.js';
import { careRouteSkipLine, careRoutes } from './careRoutes.js';
import { radDepositEnds, radDepositSentences } from './radDeposit.js';
import { downsizerAgePension, downsizerAgePensionSentence } from './downsizerAgePension.js';

/**
 * What the page gives the editor: the plan currently on screen, and the one thing to do with a
 * candidate. `save` returns a promise that settles when the write has been attempted; it never
 * rejects — `main.ts` catches and banners — so this file has no error handling of its own.
 */
export interface EntryEditorHost {
  readonly currentPlan: () => PlanFile;
  readonly save: (candidate: unknown) => Promise<void>;
}

/** The label on the control that switches an entry off, and the one that switches it back on. */
export const TOGGLE_LABELS = {
  disable: 'Switch off',
  enable: 'Switch back on',
} as const;

/** The browser's local date as `YYYY-MM-DD` — the `createdAt` every write from this file stamps. */
const todayIso = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const label = (text: string, control: HTMLElement): HTMLLabelElement => {
  const element = document.createElement('label');
  element.append(text, control);
  return element;
};

const input = (type: string, name: string, placeholder = ''): HTMLInputElement => {
  const element = document.createElement('input');
  element.type = type;
  element.name = name;
  if (placeholder !== '') element.placeholder = placeholder;
  return element;
};

/**
 * **The form's one `<select>` builder**: option text written for a reader, option value the stored
 * one. There is deliberately no unlabelled sibling taking bare values — the one this file had put
 * `buy` and `sell` on the screen (P6-13's fault, 2026-09-24), so every box passes `entryLabels.ts`
 * options or fills its own labelled ones.
 */
const labelledSelect = (name: string, options: readonly { readonly value: string; readonly label: string }[]): HTMLSelectElement => {
  const element = document.createElement('select');
  element.name = name;
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    element.append(node);
  }
  return element;
};

/**
 * **The one non-`EntryOwner` value this selector ever offers** (T37 — HEAS is a loan PER PERSON, so
 * a couple states two entries, never one `household`-owned one). Chosen here it never reaches
 * `parsePlan`: the submit handler below reads it and builds the two per-person entries itself, one
 * `heasDrawEntry` per Person, from the SAME boxes — `checkHeasDraws`' own requirement that a
 * couple's two entries agree on `securityValue` is met for free because both are built from the one
 * typed value, and the two builds are folded into a single `host.save`, so a refusal of either
 * writes neither.
 */
export const HEAS_DRAW_BOTH_OWNER = 'both';

/**
 * The Owner selector, rebuilt from the plan on screen. Its option TEXT is the person's name and
 * its option VALUE is the position `plan.json` stores — never the name (`ownerNames.ts`). A choice
 * the rebuilt list still offers is kept, so a redraw for an unrelated save does not silently move
 * the owner of an entry half-typed.
 *
 * `offerBoth` adds `HEAS_DRAW_BOTH_OWNER` to the end of the list — only for a two-Person Household,
 * on `ownerOptions`' own "cannot offer `personB` to a single Household" precedent — and only while
 * `HEAS_DRAW` is the chosen type, which is what the caller passes it for.
 */
const fillOwners = (element: HTMLSelectElement, household: PlanFile['household'], offerBoth: boolean): void => {
  const chosen = element.value;
  const options: readonly { readonly value: string; readonly label: string }[] = [
    ...ownerOptions(household),
    ...(offerBoth && household.persons.length === 2 ? [{ value: HEAS_DRAW_BOTH_OWNER, label: 'Both of us' }] : []),
  ];
  element.replaceChildren(
    ...options.map((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      return node;
    }),
  );
  if (options.some((option) => option.value === chosen)) element.value = chosen;
};

/** A group of inputs shown for one branch of the form and hidden for the others. */
/**
 * A line of plain text on the form. For a branch that has **no boxes**, which would otherwise show
 * as an empty space the user has to guess the meaning of: `kind: 'stopped'` states nothing but the
 * date, so the sentence is what stands where its fields would have been.
 */
const sentence = (text: string): HTMLSpanElement => {
  const element = document.createElement('span');
  element.textContent = text;
  return element;
};

const group = (...children: readonly HTMLElement[]): HTMLSpanElement => {
  const element = document.createElement('span');
  for (const child of children) element.append(child);
  return element;
};

/**
 * The add form. `type="date"` and `type="text"` and nothing else — no `min`, no `step`, no `pattern`
 * and no `required`: an HTML constraint here would be a **second validator**, it would differ from
 * `parsePlan` in ways nobody would notice, and a browser that quietly rejects a value shows the user
 * a tooltip this app did not write. The door refuses, and the door's own words go in the banner.
 *
 * **Hiding a box is not validating it.** What the hiding does is decide which BUILDER runs and
 * therefore which fields exist at all — see the header on the union. A hidden box's value is never
 * read, so a figure left in the sell box cannot ride along on a buy.
 *
 * The type selector is built from `OFFERED_ENTRY_TYPES`, which is `parsePlan`'s own parser table
 * minus `ENTRY_TYPES_NOT_YET_WALKED`: this file offers what the door can read AND the walk acts on,
 * and cannot offer a type either half is missing. The `BUILDERS` record below is keyed by the same
 * names, and `test/app-entry-form.test.mjs` asserts the two agree — a type added to the engine but
 * not here is a missing option, which is the failure that is visible; a builder here for a type the
 * door refuses would be a save that always fails, which is the one that is not.
 *
 * ⚠️ **The third failure, which is why the list is the OFFERED one and not the constructible one**
 * (2026-09-19): a type the door reads and the walk ignores would save cleanly and change no figure.
 * ~~`SUPER_CONTRIBUTION` is that today.~~ **SUPERSEDED 2026-09-20 (P6-8 brief 2 chunk 5): it is
 * offered, and `ENTRY_TYPES_NOT_YET_WALKED` is empty.** The list is still what the selector is
 * built from, because the failure it prevents is about the NEXT type to arrive parser-first, not
 * about that one. `describeParams` below still writes the row, and it now says what the forecast
 * does NOT do rather than what it half-does.
 */
const buildForm = (host: EntryEditorHost): { readonly form: HTMLFormElement; readonly refreshOwners: () => void } => {
  const form = document.createElement('form');
  form.id = 'add-entry';

  const type = labelledSelect('type', entryTypeOptions(OFFERED_ENTRY_TYPES));
  type.value = 'SPEND_CHANGE';
  const date = input('date', 'date');
  const owner = labelledSelect('owner', []);
  const refreshOwners = (): void => fillOwners(owner, host.currentPlan().household, type.value === 'HEAS_DRAW');
  refreshOwners();
  const note = input('text', 'note', 'why (optional)');

  // One input per params field in `PARAMS_PARSERS`, named as the field is named there.
  const annualSpend = input('text', 'annualSpend', 'e.g. 84,000');
  const daysPerWeek = input('text', 'daysPerWeek', 'e.g. 3 — 0 stops the salary');
  const annualSalary = input('text', 'annualSalary', 'what those days pay a year — type 0 at 0 days');
  const daysPerWeekNotice = infoButton(DAYS_PER_WEEK_ENTRY_SUMMARY, DAYS_PER_WEEK_ENTRY_NOTICE, 'guide:part-time-work');
  const amount = input('text', 'amount', 'e.g. 38,000');
  const lumpSumAmount = input('text', 'lumpSumAmount', 'e.g. 120,000');
  const interestIndex = input('text', 'interestIndex', 'which one — 1 is the first');
  const lumpSumNotice = infoButton(LUMP_SUM_ENTRY_SUMMARY, LUMP_SUM_ENTRY_NOTICE, 'guide:super-lump-sum');
  const sacrificeAmount = input('text', 'sacrificeAmount', 'a year — e.g. 20,000');
  const contributionInterestIndex = input('text', 'contributionInterestIndex', 'which one — 1 is the first');
  const contributionNotice = infoButton(SUPER_CONTRIBUTION_ENTRY_SUMMARY, SUPER_CONTRIBUTION_ENTRY_NOTICE, 'guide:salary-sacrifice');
  const spouseContributionAmount = input('text', 'spouseContributionAmount', 'e.g. 3,000');
  const spouseContributionInterestIndex = input('text', 'spouseContributionInterestIndex', "which of your spouse's — 1 is the first");
  const spouseContributionNotice = infoButton(SPOUSE_CONTRIBUTION_ENTRY_SUMMARY, SPOUSE_CONTRIBUTION_ENTRY_NOTICE, 'guide:spouse-contribution');
  // `DOWNSIZER_CONTRIBUTION` (P9-5): the ownership answer starts unanswered, so it is never stated by default.
  const downsizerAmount = input('text', 'downsizerAmount', "e.g. 300,000 — in today's money");
  const downsizerInterestIndex = input('text', 'downsizerInterestIndex', 'which of your own — 1 is the first');
  const downsizerOwnedTenYears = labelledSelect('downsizerOwnedTenYears', [
    { value: '', label: 'Choose' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]);
  // The home loan's three, named as `MortgageRefinanceParams` names them. Its own boxes and not the
  // settings panel's: those are the DAY-1 loan and are read back out of the plan file, while these
  // are a dated change and are read back out of nothing.
  const loanBalance = input('text', 'openingBalance', 'what is owed from this date — e.g. 420,000');
  const loanRate = input('text', 'annualInterestRate', 'a decimal a year — 0.061 is 6.1%');
  const loanRepayment = input('text', 'monthlyRepayment', 'each month — e.g. 3,000');
  const loanNotice = infoButton(MORTGAGE_ENTRY_SUMMARY, MORTGAGE_ENTRY_NOTICE, 'guide:refinancing');
  const buyAmount = input('text', 'buyAmount', 'e.g. 40,000');
  const incidentalCostsOfAcquisition = input('text', 'incidentalCostsOfAcquisition', 'brokerage — type 0 if none');
  const sellAmount = input('text', 'sellAmount', 'e.g. 20,000');
  const parcelSelection = labelledSelect('parcelSelection', PARCEL_SELECTION_OPTIONS);
  const returnRate = input('text', 'returnRate', 'a decimal a year — 0.065 is 6.5%');
  const ttrInterestIndex = input('text', 'ttrInterestIndex', 'which one — 1 is the first');
  // `INSURANCE_COVER_CHANGE` (P3-17a slice 3): the benefit starts unchosen.
  const insuranceInterestIndex = input('text', 'insuranceInterestIndex', 'which one — 1 is the first');
  const insuranceBenefit = labelledSelect('insuranceBenefit', INSURANCE_BENEFIT_CHOICES);
  const insuranceCoverPercent = input('text', 'insuranceCoverPercent', 'e.g. 50 — 0 cancels it');
  const ttrRatePercent = input('text', 'ttrRatePercent', `between ${TTR_RATE_RANGE_PERCENT[0]} and ${TTR_RATE_RANGE_PERCENT[1]} — e.g. 7`);
  // `TTR_START` (retire flow S4): the account, and the rate with blank for the minimum.
  const ttrStartInterestIndex = input('text', 'ttrStartInterestIndex', 'which one — 1 is the first');
  const ttrStartRatePercent = input('text', 'ttrStartRatePercent', `between ${TTR_RATE_RANGE_PERCENT[0]} and ${TTR_RATE_RANGE_PERCENT[1]}, or blank for the minimum`);
  // `ENTER_CARE`'s three boxes, `MORTGAGE_REFINANCE`'s own precedent: all required, none judged
  // here, and all the household's own estimate — `ENTER_CARE_ENTRY_NOTICE` says why.
  // **All three are TODAY's money (user ruling, 2026-09-25): type today's price; the forecast raises
  // it with inflation to the entry's own date.**
  const homeValue = input('text', 'homeValue', "e.g. 900,000 — 0 if no home, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const radPrice = input('text', 'radPrice', "e.g. 550,000, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const radPaidAsLumpSum = input('text', 'radPaidAsLumpSum', "e.g. 550,000 — 0 pays it all as a daily amount instead, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const enterCareNotice = infoButton(ENTER_CARE_ENTRY_SUMMARY, ENTER_CARE_ENTRY_NOTICE, 'guide:aged-care');
  // `HEAS_DRAW`'s three boxes plus the kind selector (P9-1, slice 2). `securityValue`'s own estimate
  // warning is in `heasNotice`, `ENTER_CARE_ENTRY_NOTICE`'s own precedent for a figure nobody can
  // look up. `stopDate` is blank-means-no-stop (`HeasDrawFormValues`'s own doc).
  // **`securityValue` and a STATED `fortnightlyAmount`/`advanceAmount` are all TODAY's money (user
  // ruling, 2026-09-25): type today's price; the forecast raises it with inflation to the date.
  // "The most allowed" (`'maximum'`) is unaffected — it is already netted off the month's own
  // Age Pension entitlement.**
  const heasSecurityValue = input('text', 'securityValue', "e.g. 900,000 — your own estimate, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const heasFortnightlyAmount = input('text', 'fortnightlyAmount', "e.g. 1,000, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const heasStopDate = input('date', 'stopDate');
  const heasNotice = infoButton(HEAS_DRAW_ENTRY_SUMMARY, HEAS_DRAW_ENTRY_NOTICE, 'guide:home-equity-access');
  // **A lump-sum advance (P9-2b) — ONE, this slice** (`HeasDrawFormValues`'s own doc says why there
  // is no "add another" here). Both boxes optional together: blank `heasAdvanceDate` is "no advance
  // at all", `heasDrawEntry`'s own precedent for `stopDate`.
  const heasAdvanceDate = input('date', 'advanceDate');
  const heasAdvanceAmount = input('text', 'advanceAmount', "e.g. 10,000, in today's money. Type today's price; the forecast raises it with inflation to the date.");

  // **The salary-sacrifice union, chosen the way the investment union is chosen** (P6-8 brief 4,
  // user ruling 2026-09-21). `kind` is the discriminant `SuperContributionParams` is built on, and
  // the two options are the two things a user can say about a standing arrangement: start one at an
  // amount, or end the one they have. The option TEXT is what the user is doing and the option
  // VALUE is what the file stores — `labelledSelect`'s whole reason — because "salarySacrificed" is
  // a field name and nobody is typing one.
  const sacrificeKind = labelledSelect('sacrificeKind', [
    { value: 'salarySacrificed', label: 'Sacrifice this much a year' },
    { value: 'stopped', label: 'Stop sacrificing, from this date' },
  ]);
  const sacrificeAmountFields = group(
    // **"Before tax, out of your pay" and "in today's money" are both on the label** — the boxes
    // beside it on this form say which money they are in (register O85), and a silent box next to a
    // labelled one is read as agreeing with it. This figure is NOT indexed: it is the number of
    // dollars sacrificed every year until the arrangement is changed or stopped (register O88).
    label('Salary sacrificed a year, before tax, and the same number of dollars every year $', sacrificeAmount),
    label('Super account ', contributionInterestIndex),
  );
  // The whole of what a stop says, on the page, in one line. What it does NOT do — the months
  // already contributed, the cap, the employer's payments — is behind the notice beside it.
  const sacrificeStopFields = group(
    sentence('Your salary sacrifice ends on this date. What you have already put in stays in, and your pay is taxed in full again from here.'),
  );
  const sacrificeFields = group(label('What this entry does ', sacrificeKind), sacrificeAmountFields, sacrificeStopFields, contributionNotice);

  // **The HEAS draw union, `sacrificeKind`'s own shape** (P9-1, slice 2): the option TEXT is what
  // the household is asking for and the option VALUE is what `heasDrawEntry` reads to choose which
  // string it hands `fortnightlyAmount` — `'maximum'` verbatim, or the stated box's own text.
  const heasFortnightlyKind = labelledSelect('heasFortnightlyKind', [
    { value: 'stated', label: 'A fixed amount each fortnight' },
    { value: 'maximum', label: 'The most allowed — 150% of the full Age Pension, less any Age Pension you receive' },
  ]);
  const heasStatedFields = group(label('Fortnightly amount, in today’s money $', heasFortnightlyAmount));
  const heasMaximumFields = group(
    sentence('This draws the most allowed every fortnight, and moves automatically if your Age Pension does.'),
  );
  const heasFields = group(
    label('Home value (your own estimate), in today’s money $', heasSecurityValue),
    label('How much to draw ', heasFortnightlyKind),
    heasStatedFields,
    heasMaximumFields,
    label('Stop drawing from this date (optional) ', heasStopDate),
    // **Lump-sum advances (P9-2b) — one, this slice.** The limits are said in plain English, on the
    // form itself, not only in the notice: a household deciding whether to type an advance at all
    // should not have to open the info button first to learn the two numbers that bound it.
    sentence('Lump-sum advances (optional) — up to twice a year, in total at most half a year’s full pension:'),
    label('Advance date ', heasAdvanceDate),
    label('Advance amount, in today’s money $', heasAdvanceAmount),
    heasNotice,
  );

  // `SELL_HOME`'s boxes (P14-13; `newHomeAmount` P14-13c). `salePrice` is required, `ENTER_CARE`'s
  // own precedent; `sellingCosts` and `newHomeAmount` are optional, `heasStopDate`'s own "blank means
  // none" idiom — left blank, each is omitted, not typed as a zero.
  //
  // **`newHomePurchaseDate` has NO BOX.** `BUY_HOME` (P14-19) is the one writer of the purchase, and
  // the door refuses this field; a box that can only error must not be shown. The builder below
  // passes the literal `''` `newHomePurchaseDate` requires, never a box's `.value`.
  // **All three are TODAY's money (user ruling, 2026-09-25): type today's price; the forecast raises
  // it with inflation to the entry's own settlement date.**
  const salePrice = input('text', 'salePrice', "e.g. 900,000 — your own estimate, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const sellingCosts = input('text', 'sellingCosts', "e.g. 20,000 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const newHomeAmount = input('text', 'newHomeAmount', "e.g. 500,000 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const sellHomeNotice = infoButton(SELL_HOME_ENTRY_SUMMARY, SELL_HOME_ENTRY_NOTICE, 'guide:selling-the-home');
  const sellHomeFields = group(
    label('Sale price (your own estimate), in today’s money $', salePrice),
    label('Selling costs (optional), in today’s money $', sellingCosts),
    label('Of that, set aside for a new home, in today’s money $', newHomeAmount),
    sellHomeNotice,
  );

  // `RENT_OUT_HOME`'s six boxes (P14-13). `weeklyRent` is required, `salePrice`'s own precedent; the
  // four annual costs and `endDate` are each optional, `sellingCosts`'s own "blank means none" idiom.
  // **All five are TODAY's money (user ruling, 2026-09-25): type today's price; the forecast raises
  // it with inflation, every month, for as long as the tenancy runs — unlike `ENTER_CARE`/`SELL_HOME`,
  // fixed once at entry, this is a standing figure that keeps rising, `SPEND_CHANGE`'s own footing.**
  const weeklyRent = input('text', 'weeklyRent', "e.g. 550 — your own estimate, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const annualRates = input('text', 'annualRates', "e.g. 2,800 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const annualInsurance = input('text', 'annualInsurance', "e.g. 1,200 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const annualAgentFees = input('text', 'annualAgentFees', "e.g. 2,200 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const annualRepairs = input('text', 'annualRepairs', "e.g. 1,500 — optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const rentOutHomeEndDate = input('date', 'endDate');
  const rentOutHomeNotice = infoButton(RENT_OUT_HOME_ENTRY_SUMMARY, RENT_OUT_HOME_ENTRY_NOTICE, 'guide:renting-out-the-home');
  const rentOutHomeFields = group(
    label('Weekly rent (your own estimate), in today’s money $', weeklyRent),
    label('Council rates a year (optional), in today’s money $', annualRates),
    label('Insurance a year (optional), in today’s money $', annualInsurance),
    label('Agent’s fees a year (optional), in today’s money $', annualAgentFees),
    label('Repairs a year (optional), in today’s money $', annualRepairs),
    label('Tenancy ends on this date (optional) ', rentOutHomeEndDate),
    rentOutHomeNotice,
  );

  // `BUY_HOME`'s boxes (P14-19): the price required, the costs optional — `sellHomeFields`' idiom.
  const purchasePrice = input('text', 'purchasePrice', "e.g. 650,000 — your own estimate, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const purchaseCosts = input('text', 'purchaseCosts', "e.g. 30,000 — stamp duty and fees, optional, leave blank for none, in today's money. Type today's price; the forecast raises it with inflation to the date.");
  const buyHomeFields = group(
    label('Purchase price (your own estimate), in today’s money $', purchasePrice),
    label('Stamp duty and fees (optional), in today’s money $', purchaseCosts),
    infoButton(BUY_HOME_ENTRY_SUMMARY, BUY_HOME_ENTRY_NOTICE, 'guide:buying-a-home'),
  );

  const retireKind = labelledSelect('retireKind', RETIRE_CHOICES);
  const forGoodNote = sentence('');
  const forGoodFields = group(forGoodNote, infoButton(FOR_GOOD_SUMMARY, FOR_GOOD_DETAIL, 'guide:retire-date'));
  const ttrRefusalLine = sentence('');
  const ttrDaysPerWeek = input('text', 'ttrDaysPerWeek', 'e.g. 3, or the same as now');
  const ttrAnnualSalary = input('text', 'ttrAnnualSalary', 'what those days pay a year');
  // S4: where no pension is running yet, the same answer starts one on the date, from this account.
  const ttrStartAccount = input('text', 'ttrStartAccount', 'which one — 1 is the first');
  const ttrStartRate = input('text', 'ttrStartRate', `between ${TTR_RATE_RANGE_PERCENT[0]} and ${TTR_RATE_RANGE_PERCENT[1]}, or blank for the minimum`);
  const ttrStartBoxes = group(
    label('Which super account pays the pension ', ttrStartAccount),
    label('Share taken out each year (%) ', ttrStartRate),
  );
  const ttrBoxes = group(label('Days a week ', ttrDaysPerWeek), label('Salary a year, in today’s money $', ttrAnnualSalary), ttrStartBoxes);
  const ttrFields = group(ttrRefusalLine, ttrBoxes, infoButton(TTR_CHOICE_SUMMARY, TTR_CHOICE_DETAIL, 'guide:transition-to-retirement'));

  const direction = labelledSelect('direction', INVESTMENT_DIRECTION_OPTIONS);
  const buyFields = group(label('Amount $', buyAmount), label('Buying costs (brokerage, fees) $', incidentalCostsOfAcquisition));
  const sellFields = group(label('Amount $', sellAmount), label('Which to sell first ', parcelSelection));
  const nonSuperFields = group(label('Direction ', direction), buyFields, sellFields);

  const paramFields: Readonly<Record<string, HTMLElement>> = {
    // **The label carries the exclusion and the button carries the reason** (P3-16 slice 1, user
    // ruling 2026-09-21). A repayment stated on the settings panel is charged ON TOP of this
    // figure, and a user whose own spending number already includes their mortgage would otherwise
    // have it counted twice — a forecast worse than their life, with nothing on screen to say why.
    //
    // **The label also says WHICH MONEY the box wants (register O85, user ruling 2026-09-21).** The
    // figure is REAL: the forecast raises it with prices every year, so a user typing "$84,000" is
    // typing a standard of living. The two boxes on this form that take a spending figure now say
    // opposite things — this one is today's money and `ONE_OFF_EXPENSE`'s is the amount on the day
    // — and a silent box beside a labelled one is read as agreeing with it, so both are labelled.
    SPEND_CHANGE: group(
      label('Annual household spending in today’s money, NOT counting home loan repayments $', annualSpend),
      infoButton(SPEND_CHANGE_ENTRY_SUMMARY, SPEND_CHANGE_ENTRY_NOTICE, 'guide:spending-plan'),
    ),
    // Retire flow S1 (2026-09-29): one question, and each answer is its own branch. `retireChoice.ts`
    // decides the words and the entries; nothing here tests an age.
    RETIRE: group(label('Stopping for good, or cutting down? ', retireKind), forGoodFields, ttrFields),
    WORK_PATTERN_CHANGE: group(label('Days a week ', daysPerWeek), label('Salary a year, in today’s money $', annualSalary), daysPerWeekNotice),
    // ⚠️ **"On the day" is the truth about this box and not a preference** (`OneOffExpenseParams`,
    // register O86): the cents typed here are the cents charged, in the entry's own month, with no
    // rise for prices. Said on the label because the spending box above says the opposite.
    ONE_OFF_EXPENSE: group(label('Amount, as it will cost on the day $', amount)),
    LUMP_SUM_FROM_SUPER: group(label('Amount $', lumpSumAmount), label('Super account ', interestIndex), lumpSumNotice),
    // Its own two boxes, not the withdrawal's: a shared amount box would carry a figure typed for
    // one entry into the other, and the two indexes mean different things — the account money comes
    // OUT of, and the account it goes INTO.
    SUPER_CONTRIBUTION: sacrificeFields,
    // **All three boxes, always, because a partial change is not expressible** (`plan.ts`): the
    // walk would have to reach back for whatever was in force, and this build does not carry
    // figures the user cannot see. The label says "set", not "refinance" — the same reason
    // `entryLabels.ts` does.
    MORTGAGE_REFINANCE: group(
      label('Amount still owed, from this date $', loanBalance),
      label('Interest rate a year, as a decimal (0.061 is 6.1%) ', loanRate),
      label('Repayment each month $', loanRepayment),
      loanNotice,
    ),
    // `MortgageTargetParams` is `{}`, `RETIRE`'s own shape — the date is the whole of the stated
    // fact. Which milestone this is (payoff, or an offset covering the balance) belongs in the
    // shared note box below, never a box of its own (P3-16a, `plan.ts`).
    MORTGAGE_TARGET: group(),
    // `MortgagePayoffParams` is `{}` — the amount is whatever is owed that month, never typed.
    MORTGAGE_PAYOFF: group(),
    // `IllnessSeparationParams` is `{}` (P12-4) — the date is the whole of the fact.
    ILLNESS_SEPARATION: group(),
    // `DeathParams` is `{}` (P12-1) — the owner and the date are the whole of the fact.
    DEATH: group(),
    // **`ENTER_CARE` (P14-13, slice 3b) — three boxes, all required, all the household's own
    // estimate.** `owner` above names WHO enters care; it is refused at the door for `household`.
    ENTER_CARE: group(
      label('Home value on the day of entry, in today’s money $', homeValue),
      label('Room price — a refundable deposit, RAD, in today’s money $', radPrice),
      label('Of that, paid as a lump sum now, in today’s money $', radPaidAsLumpSum),
      enterCareNotice,
    ),
    // **`HEAS_DRAW` (P9-1, slice 2) — the household's own estimate of the home value, a choice of
    // how much to draw, and an optional stop.** `owner` above is refused at the door for
    // `'household'` and takes `personA`/`personB` — HEAS is a loan PER PERSON (T37) — or, only for
    // a two-Person Household, `HEAS_DRAW_BOTH_OWNER`'s own "Both of us", which the submit handler
    // resolves into the couple's two per-person entries from these same boxes.
    HEAS_DRAW: heasFields,
    // **`SELL_HOME` (P14-13; `newHomeAmount` P14-13c) — the sale price required, the rest optional.**
    // `owner` above is ignored: a home is a Household fact, `MORTGAGE_REFINANCE`'s own ruling.
    // `newHomePurchaseDate` has no box — see `sellHomeFields`'s own declaration above.
    SELL_HOME: sellHomeFields,
    // **`RENT_OUT_HOME` (P14-13) — six boxes, only the weekly rent required.** `owner` above is
    // ignored: a home is a Household fact, `MORTGAGE_REFINANCE`'s own ruling.
    RENT_OUT_HOME: rentOutHomeFields,
    // **`BUY_HOME` (P14-19) — the price required, the costs optional; `owner` ignored.**
    BUY_HOME: buyHomeFields,
    NON_SUPER_INVESTMENT: nonSuperFields,
    // **One box, on `MORTGAGE_REFINANCE`'s rate-box precedent — a decimal fraction, not a percentage
    // typed as e.g. "6.5"** (P2-11 microtask 4). This is a per-Person LEVEL, exactly like
    // `WORK_PATTERN_CHANGE` above: it replaces `settings.nominalReturn` for the chosen Owner from
    // this date, until another `RETURN_CHANGE` for the same Owner supersedes it.
    RETURN_CHANGE: group(label('New investment return a year, as a decimal (0.065 is 6.5%) ', returnRate)),
    TTR_START: group(
      label('Super account ', ttrStartInterestIndex),
      label('Share taken out each year (%) ', ttrStartRatePercent),
      infoButton(TTR_START_ENTRY_SUMMARY, TTR_START_ENTRY_NOTICE, 'guide:ttr-start'),
    ),
    TTR_RATE_CHANGE: group(
      label('Super account ', ttrInterestIndex),
      label('New share taken out each year (%) ', ttrRatePercent),
      infoButton(TTR_RATE_CHANGE_ENTRY_SUMMARY, TTR_RATE_CHANGE_ENTRY_NOTICE, 'guide:ttr-rate-change'),
    ),
    INSURANCE_COVER_CHANGE: group(
      label('Super account ', insuranceInterestIndex),
      label('Which cover ', insuranceBenefit),
      label('Share of the cover kept (%), 0 cancels it ', insuranceCoverPercent),
      infoButton(INSURANCE_COVER_CHANGE_ENTRY_SUMMARY, INSURANCE_COVER_CHANGE_ENTRY_NOTICE, 'guide:insurance-changes'),
    ),
    // Its own two boxes, `SUPER_CONTRIBUTION`'s own shape pointed the other way: the owner above is
    // who PAYS, and this account is the RECEIVING spouse's, never the owner's own.
    SPOUSE_CONTRIBUTION: group(
      label('Amount, paid once, from your own after-tax money $', spouseContributionAmount),
      label("Your spouse's super account ", spouseContributionInterestIndex),
      spouseContributionNotice,
    ),
    DOWNSIZER_CONTRIBUTION: group(
      label('Amount from the home sale, in today’s money $', downsizerAmount),
      label('Your super account ', downsizerInterestIndex),
      label('Did you or your spouse own the home for 10 years or more? ', downsizerOwnedTenYears),
      infoButton(DOWNSIZER_CONTRIBUTION_ENTRY_SUMMARY, DOWNSIZER_CONTRIBUTION_ENTRY_NOTICE, 'guide:downsizer-contribution'),
    ),
  };

  /** Only the chosen branch is on the page, and only the chosen branch is ever read. */
  const showChosenBranch = (): void => {
    for (const [name, fields] of Object.entries(paramFields)) fields.hidden = name !== type.value;
    buyFields.hidden = direction.value !== 'buy';
    sellFields.hidden = direction.value !== 'sell';
    // A stop states no amount and no account, so those boxes are not on the page for it — and a
    // figure left in the amount box therefore cannot ride along on a stop, which is the same
    // property the buy/sell pair above has.
    sacrificeAmountFields.hidden = sacrificeKind.value !== 'salarySacrificed';
    sacrificeStopFields.hidden = sacrificeKind.value !== 'stopped';
    heasStatedFields.hidden = heasFortnightlyKind.value !== 'stated';
    heasMaximumFields.hidden = heasFortnightlyKind.value !== 'maximum';
    showRetireChoice();
  };
  type.addEventListener('change', showChosenBranch);
  // `HEAS_DRAW_BOTH_OWNER` is offered only while `HEAS_DRAW` is the chosen type — switching away
  // must drop it from the list rather than leave it selected and unreachable by the door.
  type.addEventListener('change', refreshOwners);
  direction.addEventListener('change', showChosenBranch);
  sacrificeKind.addEventListener('change', showChosenBranch);
  heasFortnightlyKind.addEventListener('change', showChosenBranch);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Add entry';

  /** The Retire branch's answer, re-read on every change that could move it: type, date, owner, answer, a save. */
  function showRetireChoice(): void {
    const plan = host.currentPlan();
    forGoodFields.hidden = retireKind.value !== 'forGood';
    ttrFields.hidden = retireKind.value !== 'ttr';
    forGoodNote.textContent = forGoodLines(plan.household, activeScenarioEntries(plan), plan.settings.asAtDate, owner.value, date.value).join(' ');
    const refused = ttrRefusal(plan.household, activeScenarioEntries(plan), owner.value, date.value, plan.settings.asAtDate);
    ttrRefusalLine.textContent = refused ?? '';
    ttrBoxes.hidden = refused !== undefined;
    ttrStartBoxes.hidden = !ttrStartNeeded(plan.household, activeScenarioEntries(plan), owner.value, date.value, plan.settings.asAtDate);
    submit.disabled = type.value === 'RETIRE' && retireKind.value === 'ttr' && refused !== undefined;
  }
  retireKind.addEventListener('change', showRetireChoice);
  date.addEventListener('change', showRetireChoice);
  owner.addEventListener('change', showRetireChoice);

  form.append(
    label('Type ', type),
    label('From ', date),
    label('Owner ', owner),
    ...Object.values(paramFields),
    label('Note ', note),
    submit,
  );
  showChosenBranch();

  /**
   * One builder per constructible type, each reading ITS OWN boxes and nothing else. `id` and
   * `createdAt` are the two impure facts, made below and passed in — no builder reaches for a clock
   * or for randomness, and none of them checks a value.
   */
  const BUILDERS: Readonly<Record<string, (id: string, createdAt: string) => unknown>> = {
    SPEND_CHANGE: (id, createdAt) =>
      spendChangeEntry({ date: date.value, owner: owner.value, note: note.value, annualSpend: annualSpend.value }, id, createdAt),
    WORK_PATTERN_CHANGE: (id, createdAt) =>
      workPatternChangeEntry({ date: date.value, owner: owner.value, note: note.value, daysPerWeek: daysPerWeek.value, annualSalary: annualSalary.value }, id, createdAt),
    ONE_OFF_EXPENSE: (id, createdAt) =>
      oneOffExpenseEntry({ date: date.value, owner: owner.value, note: note.value, amount: amount.value }, id, createdAt),
    LUMP_SUM_FROM_SUPER: (id, createdAt) =>
      lumpSumFromSuperEntry(
        { date: date.value, owner: owner.value, note: note.value, amount: lumpSumAmount.value, interestIndex: interestIndex.value },
        id,
        createdAt,
      ),
    // The union, resolved the way `NON_SUPER_INVESTMENT`'s is: which function is CALLED is the
    // discriminant, and the stop's builder cannot reach the amount box.
    SUPER_CONTRIBUTION: (id, createdAt) =>
      sacrificeKind.value === 'stopped'
        ? superContributionStopEntry({ date: date.value, owner: owner.value, note: note.value }, id, createdAt)
        : superContributionEntry(
            { date: date.value, owner: owner.value, note: note.value, annualAmount: sacrificeAmount.value, interestIndex: contributionInterestIndex.value },
            id,
            createdAt,
          ),
    MORTGAGE_REFINANCE: (id, createdAt) =>
      mortgageRefinanceEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          openingBalance: loanBalance.value,
          annualInterestRate: loanRate.value,
          monthlyRepayment: loanRepayment.value,
        },
        id,
        createdAt,
      ),
    MORTGAGE_TARGET: (id, createdAt) =>
      mortgageTargetEntry({ date: date.value, owner: owner.value, note: note.value }, id, createdAt),
    MORTGAGE_PAYOFF: (id, createdAt) =>
      mortgagePayoffEntry({ date: date.value, owner: owner.value, note: note.value }, id, createdAt),
    ILLNESS_SEPARATION: (id, createdAt) =>
      illnessSeparationEntry({ date: date.value, owner: owner.value, note: note.value }, id, createdAt),
    DEATH: (id, createdAt) =>
      deathEntry({ date: date.value, owner: owner.value, note: note.value }, id, createdAt),
    ENTER_CARE: (id, createdAt) =>
      enterCareEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          homeValue: homeValue.value,
          radPrice: radPrice.value,
          radPaidAsLumpSum: radPaidAsLumpSum.value,
        },
        id,
        createdAt,
      ),
    // The union is resolved HERE, by which STRING is handed to `fortnightlyAmount` — never by which
    // function is called (`heasDrawEntry`'s own doc): the amount box's value is read only when
    // "stated" is chosen, so a figure left in it cannot ride along on "maximum".
    HEAS_DRAW: (id, createdAt) =>
      heasDrawEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          securityValue: heasSecurityValue.value,
          fortnightlyAmount: heasFortnightlyKind.value === 'maximum' ? 'maximum' : heasFortnightlyAmount.value,
          stopDate: heasStopDate.value,
          advanceDate: heasAdvanceDate.value,
          advanceAmount: heasAdvanceAmount.value,
        },
        id,
        createdAt,
      ),
    SELL_HOME: (id, createdAt) =>
      sellHomeEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          salePrice: salePrice.value,
          sellingCosts: sellingCosts.value,
          newHomeAmount: newHomeAmount.value,
          // No box for this field (see its declaration above) — the literal `''` `sellHomeEntry`
          // reads as "none stated", never a value this form could type.
          newHomePurchaseDate: '',
        },
        id,
        createdAt,
      ),
    RENT_OUT_HOME: (id, createdAt) =>
      rentOutHomeEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          weeklyRent: weeklyRent.value,
          annualRates: annualRates.value,
          annualInsurance: annualInsurance.value,
          annualAgentFees: annualAgentFees.value,
          annualRepairs: annualRepairs.value,
          endDate: rentOutHomeEndDate.value,
        },
        id,
        createdAt,
      ),
    BUY_HOME: (id, createdAt) =>
      buyHomeEntry(
        { date: date.value, owner: owner.value, note: note.value, purchasePrice: purchasePrice.value, purchaseCosts: purchaseCosts.value },
        id,
        createdAt,
      ),
    RETURN_CHANGE: (id, createdAt) =>
      returnChangeEntry({ date: date.value, owner: owner.value, note: note.value, rate: returnRate.value }, id, createdAt),
    TTR_START: (id, createdAt) =>
      ttrStartEntry(
        { date: date.value, owner: owner.value, note: note.value, interestIndex: ttrStartInterestIndex.value, drawdownRatePercent: ttrStartRatePercent.value },
        id,
        createdAt,
      ),
    TTR_RATE_CHANGE: (id, createdAt) =>
      ttrRateChangeEntry(
        { date: date.value, owner: owner.value, note: note.value, interestIndex: ttrInterestIndex.value, drawdownRatePercent: ttrRatePercent.value },
        id,
        createdAt,
      ),
    INSURANCE_COVER_CHANGE: (id, createdAt) =>
      insuranceCoverChangeEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          interestIndex: insuranceInterestIndex.value, benefit: insuranceBenefit.value, coverPercent: insuranceCoverPercent.value,
        },
        id,
        createdAt,
      ),
    SPOUSE_CONTRIBUTION: (id, createdAt) =>
      spouseContributionEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          amount: spouseContributionAmount.value,
          receivingInterestIndex: spouseContributionInterestIndex.value,
        },
        id,
        createdAt,
      ),
    DOWNSIZER_CONTRIBUTION: (id, createdAt) =>
      downsizerContributionEntry(
        {
          date: date.value, owner: owner.value, note: note.value,
          amount: downsizerAmount.value,
          receivingInterestIndex: downsizerInterestIndex.value,
          ownedTenYears: downsizerOwnedTenYears.value,
        },
        id,
        createdAt,
      ),
    // The union, at the one place it can be resolved: which function is CALLED is the discriminant,
    // and neither call can reach the other branch's inputs.
    NON_SUPER_INVESTMENT: (id, createdAt) =>
      direction.value === 'buy'
        ? nonSuperInvestmentBuyEntry(
            { date: date.value, owner: owner.value, note: note.value, amount: buyAmount.value, incidentalCostsOfAcquisition: incidentalCostsOfAcquisition.value },
            id,
            createdAt,
          )
        : nonSuperInvestmentSellEntry(
            { date: date.value, owner: owner.value, note: note.value, amount: sellAmount.value, parcelSelection: parcelSelection.value },
            id,
            createdAt,
          ),
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // The two impure facts, made here and handed in. `createdAt` is provenance and never a
    // projection input (`plan.ts`), so the browser's own local date is the right "when this was
    // written down" — it is not the plan's `asAtDate` and nothing computes from it.
    const createdAt = todayIso();
    // **"Both of us" (T37) — two entries, one per Person, from the SAME boxes, saved as ONE edit.**
    // `checkHeasDraws`' requirement that a couple's two entries agree on `securityValue` is met for
    // free, because both are built from the one typed value; folding both `planWithEntry` calls into
    // a single `host.save` means `savePlan` validates the WHOLE candidate before writing anything —
    // a refusal of either entry (the age, the cap, the homeowner test) writes neither.
    if (type.value === 'HEAS_DRAW' && owner.value === HEAS_DRAW_BOTH_OWNER) {
      const heasValues = {
        date: date.value,
        note: note.value,
        securityValue: heasSecurityValue.value,
        fortnightlyAmount: heasFortnightlyKind.value === 'maximum' ? 'maximum' : heasFortnightlyAmount.value,
        stopDate: heasStopDate.value,
        // Every box applies to EACH partner, as the fortnightly amount does: an advance typed here is
        // one advance for each of them (each has their own loan and their own advance limit, T37).
        advanceDate: heasAdvanceDate.value,
        advanceAmount: heasAdvanceAmount.value,
      };
      const personA = heasDrawEntry({ ...heasValues, owner: 'personA' }, crypto.randomUUID(), createdAt);
      const personB = heasDrawEntry({ ...heasValues, owner: 'personB' }, crypto.randomUUID(), createdAt);
      // `planWithEntry` returns `unknown` on purpose (its own doc): it is a CANDIDATE, unvalidated
      // until `parsePlan` inside `savePlan` reads it. The cast below feeds that same unvalidated
      // shape back into a second `planWithEntry` call rather than into anything that trusts it.
      const withPersonA = planWithEntry(host.currentPlan(), personA) as PlanFile;
      void host.save(planWithEntry(withPersonA, personB));
      return;
    }
    // **Retire (S1): the answer decides which entries are written**, all folded into one save as
    // "Both of us" is. A refused TTR writes nothing; its reason is already beside the choice.
    if (type.value === 'RETIRE') {
      const plan = host.currentPlan();
      const chosen = retireChoiceEntries(
        plan.household,
        activeScenarioEntries(plan),
        plan.settings.asAtDate,
        retireKind.value,
        {
          date: date.value, owner: owner.value, note: note.value, daysPerWeek: ttrDaysPerWeek.value, annualSalary: ttrAnnualSalary.value,
          ttrInterestIndex: ttrStartAccount.value, ttrRatePercent: ttrStartRate.value,
        },
        () => crypto.randomUUID(),
        createdAt,
      );
      if ('refused' in chosen) return;
      void host.save(chosen.entries.reduce<unknown>((candidate, entry) => planWithEntry(candidate as PlanFile, entry), plan));
      return;
    }
    const build = BUILDERS[type.value];
    if (build === undefined) return; // unreachable: the selector is built from the same keys, less RETIRE above.
    void host.save(planWithEntry(host.currentPlan(), build(crypto.randomUUID(), createdAt)));
  });

  // A save can add the TTR account or change a birthday, so the redraw re-reads the Retire answer too.
  return { form, refreshOwners: () => { refreshOwners(); showRetireChoice(); } };
};

/** What the row's info button opens: what the forecast does with a salary sacrifice, and what it does not. */
const SUPER_CONTRIBUTION_ROW_DETAIL =
  'Your take-home pay falls by the amount sacrificed, and this account receives it alongside your employer’s own' +
  ' payments. The yearly cap and the extra tax for high incomes are both in the forecast.';

/**
 * What a row says about an entry's params, per type. A row that showed the date and the type alone
 * would make two entries differing only in their amount look identical, and the whole point of the
 * list is to be able to find the one to switch off.
 *
 * `RETIRE` and `MORTGAGE_TARGET` return the empty string because they HAVE nothing — both params
 * types are `{}` — and each is written as its own case rather than left to fall through, so the
 * absence is visibly deliberate. The `default` covers the NINE unspecified members of the `Entry`
 * union (`UNSPECIFIED_ENTRY_TYPES`, which `parsePlan` refuses at the door) plus `TRIS_EARLY_
 * CONVERSION`, which is constructible but has no case of its own yet — the union is wider than the
 * ten types this switch names explicitly. **`RETURN_CHANGE` joined those ten on 2026-09-22 (P2-11
 * microtask 4)**, on `MORTGAGE_REFINANCE`'s own precedent for turning a stored decimal fraction into
 * a percentage on the row.
 *
 * ⚠️ **`SUPER_CONTRIBUTION`'s row is the one that carries the REFUSALS the figure does not show**,
 * and it is the only place in the page that says them beside the arrangement itself.
 *
 * **The sentence has been rewritten at every chunk of P6-8 brief 2, and each rewriting is the
 * point.** It has read, in turn: *"NOT YET IN THE FORECAST"* (brief 1, true then — the walk had no
 * branch); *"OPTIMISTIC by the whole arrangement"* (chunk 1, the salary assessed had fallen and
 * nothing else had moved); *"PESSIMISTIC by the whole arrangement"* (chunk 3, the cash had left the
 * pay packet and arrived nowhere); and *"IN THE FORECAST, EXCEPT THE CAP"* (chunk 4, the money path
 * closed and the concessional cap unchecked). Each of those became FALSE the day the next chunk
 * landed, and a row saying "better than it should be" about figures that are worse is a second
 * wrong answer rather than a stale one — so it is restated, never left standing.
 *
 * **CHUNK 5 (2026-09-20) IS THE ONE THAT RETIRES THE "EXCEPT" AND THE ROW SURVIVES IT.** The cap is
 * refused by name now (`ExcessConcessionalContributionsNotModelledError`), so the entry is offered
 * in the form and no figure above is flattering because of it. ~~Delete this case when chunk 5
 * lands.~~ **Not deleted, and the instruction is superseded rather than obeyed**: what the row
 * carried was never only the cap. **The first of the three closed on 2026-09-20 (brief 3, chunk
 * 2b): the employer's Superannuation Guarantee IS contributed now**, net of the fund's 15%, on the
 * PRE-sacrifice salary — so the row states it as a fact of the forecast rather than as a gap.
 * ~~Two remain true of every one of these figures, both conservative and neither visible in the
 * amount: Division 293's second 15% is not charged, so a Person near $250,000 pays more tax than
 * shown;~~ **THE SECOND OF THOSE CLOSED ON 2026-09-20 (P6-9 chunk 3) and the sentence is struck
 * rather than deleted: the further 15% IS charged now, monthly, out of the Person's own cash, and
 * the row says so.** ONE gap is left, it is conservative, and it is not visible in the amount: an
 * amount above the pay is capped at the pay with the excess dropped, so the arrangement forecast
 * may be SMALLER than the one stated. The row says that one, the Guarantee, and the charge.
 *
 * ⚠️ **What the row does NOT say, because it is about WHICH POCKET and not about this
 * arrangement's figures — and it is the one residual here that FLATTERS.** ~~The Subdiv 293-B
 * election to have the Division 293 charge released from the fund is not modelled (register
 * O84)~~ — **SUPERSEDED 2026-09-20 (P6-10): it IS modelled, at the year-end settlement, for a
 * Person whose plan file names the interest.** ~~What survives is narrower and still flatters: **no
 * box on the form states the election**, so every plan built through this app takes the charge
 * from cash, which leaves a means-test-EXEMPT accumulation interest standing and spends ASSESSED
 * Offset cash instead, so the Age Pension of a Household whose payer is below Age Pension age is
 * OVER-stated.~~ **SUPERSEDED 2026-09-20 (P6-11): the election is stated under "Household and
 * settings", one choice per Person, so a plan built through this app can make it.** What the row
 * does not say is still what the row does not say — this is a fact about the HOUSEHOLD and not
 * about this arrangement's figures — and the direction above is now the direction of a user who
 * leaves the choice at "no election" while they would really elect, which is their answer to give.
 * O84 carries the direction, the bounds and the two residuals that outlive the control; the
 * notice carries the fact to the user. **The cap is the
 * notice's to explain and not the row's**: it is enforced against the arrangement AND the Guarantee
 * together from 2026-09-20 (brief 3, final chunk) — the sentence here said it was "enforced against
 * the STATED arrangement alone ... because the Guarantee is measured against no cap at all", which
 * is superseded — and a row is no place to explain why a plan that worked yesterday is refused.
 *
 * ⚠️ **What the row does NOT say, and no longer needs to: the phase of the target.** A contribution
 * into a non-accumulation interest is refused at the door from chunk 5
 * (`parsePlan.checkContributionTargets`), so no plan on screen can hold one.
 *
 * **The leading `" — "` is a join, not part of the sentence** (2026-09-22). It is here because this
 * text used to be concatenated onto the end of a one-line row; the table's Description cell strips
 * it (`descriptionCell` below) and joins the note on with the same separator. The prefix stays on
 * the returned string so the wording of each case — and the pin in `test/app-entry-form.test.mjs`
 * that reads it — is untouched by the table.
 */
const describeParams = (entry: Entry): string => {
  switch (entry.type) {
    case 'RETIRE':
      return '';
    // Written out for the same reason `RETIRE` above is: `MortgageTargetParams` is also `{}`, and
    // the absence of a figure here is deliberate rather than a fallthrough to `default`. The date
    // column already carries the target; which milestone it means is in the entry's own note.
    case 'MORTGAGE_TARGET':
      return '';
    // No figure is stated, so the row says what the payout IS rather than showing an amount.
    case 'MORTGAGE_PAYOFF':
      return ' — whole loan paid off';
    // No figure is stated, so the row says what changes — and what does not (P12-4).
    case 'ILLNESS_SEPARATION':
      return ' — from this month each of you is paid the single Age Pension rate, still means-tested together as a couple; for income tax still a couple, but on the larger seniors offset for a couple living apart, for the whole financial year';
    // No figure is stated, so the row says what changes — and what does not (P12-1).
    case 'DEATH':
      return ' — from this month the other person carries on alone: means-tested as a single person, with all of this person\'s super paid to them tax-free and their investments passed to them; spending does not change unless you change it';
    // A decimal fraction turned into a percentage on the row, `MORTGAGE_REFINANCE`'s own precedent.
    case 'RETURN_CHANGE':
      return ` — investment return changed to ${entry.params.rate * 100}% a year`;
    case 'SPEND_CHANGE':
      return ` — ${formatDollars(entry.params.annualSpend)} a year`;
    // ⚠️ **The row states the MONEY, and that is what replaced the warning (2026-09-19).** It used
    // to append `workPatternChangeDisclosure`'s "not modelled — the salary carries on unchanged, so
    // the forecast is optimistic" to every row at a non-zero `daysPerWeek`. The entry now states an
    // `annualSalary` and the engine applies it, so the warning was false; what a reader needs
    // instead is the figure the forecast is actually using, which no other line of the row carries.
    case 'WORK_PATTERN_CHANGE':
      return ` — ${entry.params.daysPerWeek} days a week at ${formatDollars(entry.params.annualSalary)} a year`;
    case 'ONE_OFF_EXPENSE':
      return ` — ${formatDollars(entry.params.amount)}`;
    // The row states the money AND which account it comes out of, because a Person may hold more
    // than one interest and two withdrawals of the same size from different ones are different
    // facts — the phase of the target decides whether the engine can honour the entry at all.
    case 'LUMP_SUM_FROM_SUPER':
      return ` — ${formatDollars(entry.params.amount)} out of ${superAccountName(entry.params.interestIndex)}`;
    // **The two shapes read as two different acts, and the stop does NOT show a figure** (P6-8
    // brief 4). A row that said "$0 a year" would be the overloaded nil this type refuses at the
    // door wearing a different hat; what the entry says is that the arrangement ends here, and the
    // date beside it on the row is the date it ends from.
    case 'SUPER_CONTRIBUTION':
      return entry.params.kind === 'stopped'
        ? ' — stop the salary sacrifice from this date'
        : ` — ${formatDollars(entry.params.annualAmount)} a year salary sacrificed into ${superAccountName(entry.params.interestIndex)}`;
    // **All three figures on the row, because all three are what the entry SETS** — a row that
    // showed only the one a reader thought had changed would imply the other two were carried over,
    // which is exactly what this type does not do.
    case 'MORTGAGE_REFINANCE':
      return ` — home loan set to ${formatDollars(entry.params.openingBalance)} owing at ${entry.params.annualInterestRate * 100}% a year, repaid ${formatDollars(entry.params.monthlyRepayment)} a month`;
    case 'NON_SUPER_INVESTMENT':
      return entry.params.direction === 'buy'
        ? ` — buy ${formatDollars(entry.params.amount)}, costs ${formatDollars(entry.params.incidentalCostsOfAcquisition)}`
        : ` — sell ${formatDollars(entry.params.amount)}${entry.params.parcelSelection === undefined ? '' : `, ${parcelSelectionLabel(entry.params.parcelSelection)}`}`;
    // The row states the money AND which of the SPOUSE's accounts it lands in, `LUMP_SUM_FROM_SUPER`'s
    // own reason: two contributions of the same size into different interests are different facts.
    case 'SPOUSE_CONTRIBUTION':
      return ` — ${formatDollars(entry.params.amount)} into your spouse's ${superAccountName(entry.params.receivingInterestIndex)}`;
    case 'DOWNSIZER_CONTRIBUTION':
      return ` — ${formatDollars(entry.params.amount)} in today's money into ${superAccountName(entry.params.receivingInterestIndex)}`;
    case 'INSURANCE_COVER_CHANGE': {
      const cover = { death: 'death cover', tpd: 'TPD cover', both: 'death and TPD cover' }[entry.params.benefit];
      return entry.params.coverFraction === 0
        ? ` — ${superAccountName(entry.params.interestIndex)}: ${cover} cancelled from this date`
        : ` — ${superAccountName(entry.params.interestIndex)}: ${cover} cut to ${fractionAsPercent(entry.params.coverFraction)}% from this date`;
    }
    case 'TTR_START':
      return ` — ${superAccountName(entry.params.interestIndex)} becomes a transition to retirement pension, paying ${
        entry.params.drawdownRate === undefined ? 'the yearly minimum' : `${fractionAsPercent(entry.params.drawdownRate)}% of its balance a year`
      }`;
    case 'TTR_RATE_CHANGE':
      return ` — ${superAccountName(entry.params.interestIndex)} pays ${fractionAsPercent(entry.params.drawdownRate)}% of its balance a year from this date`;
    // The row states all three figures — `MORTGAGE_REFINANCE`'s own reason, and the room price is
    // spelled out beside "RAD" so the row never shows the bare acronym. **"in today's money" is on
    // the row too (user ruling, 2026-09-25): the figures typed here are raised with inflation to the
    // day care actually starts, so a reader must not read the bare number as the day's own price.**
    case 'ENTER_CARE':
      return ` — home valued at ${formatDollars(entry.params.homeValue)} in today's money, room price (RAD) ${formatDollars(entry.params.radPrice)} in today's money, ${formatDollars(entry.params.radPaidAsLumpSum)} in today's money paid as a lump sum`;
    // The row states the security value, what is drawn (a figure, or "the most allowed") and the
    // stop date where there is one — `MORTGAGE_REFINANCE`'s own reason: all three are what the
    // entry SETS, and a row silent about one would imply nothing had been said about it. **"in
    // today's money" is on the row too (user ruling, 2026-09-25); "the most allowed" is unaffected.**
    case 'HEAS_DRAW':
      return ` — home valued at ${formatDollars(entry.params.securityValue)} in today's money, drawing ${
        entry.params.fortnightlyAmount === 'maximum' ? 'the most allowed' : `${formatDollars(entry.params.fortnightlyAmount)} in today's money`
      } a fortnight${entry.params.stopDate === undefined ? '' : `, stopping ${entry.params.stopDate}`}`;
    // The sale price is always stated; selling costs only where the household typed one —
    // `HEAS_DRAW`'s "stopping" clause is the same "say it only where there is something to say".
    // **"in today's money" is on the row too (user ruling, 2026-09-25).**
    case 'SELL_HOME':
      return ` — sale price ${formatDollars(entry.params.salePrice)} in today's money${
        entry.params.sellingCosts === undefined ? '' : `, selling costs ${formatDollars(entry.params.sellingCosts)} in today's money`
      }${
        entry.params.newHomeAmount === undefined ? '' : `, ${formatDollars(entry.params.newHomeAmount)} in today's money set aside for a new home`
      }`;
    // The weekly rent is always stated; each annual cost and the end date only where the household
    // typed one — `SELL_HOME`'s own "say it only where there is something to say". **Order matters:
    // `listEntries.ts`'s `statedFigures` relabels every `$` figure this text carries, in this same
    // order (weeklyRent, then rates/insurance/agent's fees/repairs), and a mismatched count throws.**
    // **"in today's money" is on the row too (user ruling, 2026-09-25) — and unlike the three types
    // above, this one keeps rising every month of the tenancy, not just once at entry.**
    case 'RENT_OUT_HOME': {
      const costs: string[] = [];
      if (entry.params.annualRates !== undefined) costs.push(`rates ${formatDollars(entry.params.annualRates)} in today's money`);
      if (entry.params.annualInsurance !== undefined) costs.push(`insurance ${formatDollars(entry.params.annualInsurance)} in today's money`);
      if (entry.params.annualAgentFees !== undefined) costs.push(`agent’s fees ${formatDollars(entry.params.annualAgentFees)} in today's money`);
      if (entry.params.annualRepairs !== undefined) costs.push(`repairs ${formatDollars(entry.params.annualRepairs)} in today's money`);
      return ` — ${formatDollars(entry.params.weeklyRent)} in today's money a week${costs.length === 0 ? '' : `, ${costs.join(', ')}`}${entry.params.endDate === undefined ? '' : `, ending ${entry.params.endDate}`}`;
    }
    // `SELL_HOME`'s own order: the price, then the costs where stated.
    case 'BUY_HOME': {
      const costs = entry.params.purchaseCosts === undefined ? '' : `, stamp duty and fees ${formatDollars(entry.params.purchaseCosts)} in today's money`;
      return ` — price ${formatDollars(entry.params.purchasePrice)} in today's money${costs}`;
    }
    default:
      return '';
  }
};

/** The separator `describeParams` opens with, stripped here so the cell does not start with it. */
const DESCRIPTION_JOIN = ' — ';

/**
 * The Description cell: what the entry's params say, and the user's own note where there is one,
 * joined with the separator the one-line row used to use. The note comes LAST because it is the
 * only part of the cell the user wrote themselves, and a reader scanning the column is looking for
 * the figures first.
 */
const descriptionCell = (entry: Entry): string => {
  const detail = describeParams(entry);
  const stated = detail.startsWith(DESCRIPTION_JOIN) ? detail.slice(DESCRIPTION_JOIN.length) : detail;
  return [stated, entry.note ?? ''].filter((part) => part !== '').join(DESCRIPTION_JOIN);
};

/**
 * One entry in a line of words, for a page that cites an entry by id (the month table's "Stated by
 * these entries" and "Changes that applied this month"). The same type label, effective date and
 * Description cell the entries table shows, so an entry reads the same wherever it is named.
 */
export const entrySummary = (entry: Entry): string => {
  const description = descriptionCell(entry);
  return `${entryTypeLabel(entry.type)}, ${entry.date}${description === '' ? '' : `${DESCRIPTION_JOIN}${description}`}`;
};

/**
 * ⚠️ **One `EntryRow` per entry THE ACTIVE SCENARIO PROJECTS — never one per entry in the pool
 * (2026-09-22).** The pool is the union of every Scenario's decisions, so the old mapping listed a
 * user rows belonging to scenarios they were not looking at, in a panel headed by a radio saying
 * which scenario they were, and offered an on/off switch beside each one. The order is
 * `scenarioWalks.ts`'s resolved order — ancestors first — and each row's `enabled` is that
 * Scenario's own answer, so the switch a row draws and the figure the chart drew cannot disagree.
 *
 * `entryTable.ts` does the sorting and the filtering, and this only writes down what each cell
 * SAYS. The owner cell is the person's NAME (`ownerNames.ts`); the stored `personA` is what the
 * file still holds and never appears here.
 */
const entryRows = (plan: PlanFile): readonly EntryRow[] =>
  activeScenarioEntries(plan).map((entry) => ({
    entry,
    // The entry's own effective date. `createdAt` is not read anywhere in this table — see the
    // ruling quoted on `EntrySortKey`.
    date: entry.date,
    type: entryTypeLabel(entry.type),
    owner: ownerLabel(plan.household, entry.owner),
    description: descriptionCell(entry),
    enabled: entry.enabled,
  }));

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Which way the sorted column is pointing, for readers who cannot see `aria-sort`. */
const SORT_GLYPHS = { ascending: ' ▲', descending: ' ▼', none: '' } as const;

/**
 * A heading. The `<th>` carries `aria-sort` — `ascending`, `descending`, or `none` on every column
 * that is not the sorted one — and the clickable thing inside it is a real `<button>` rather than a
 * click handler on the cell, so the keyboard reaches it and it announces itself as a control.
 */
const headingCell = (
  column: (typeof ENTRY_TABLE_COLUMNS)[number],
  view: EntryTableView,
  onView: (next: EntryTableView) => void,
): HTMLTableCellElement => {
  const cell = el('th', `col-${column.key}`);
  const sorted = ariaSortFor(view, column.key);
  cell.setAttribute('aria-sort', sorted);
  const button = el('button', 'sort', `${column.heading}${SORT_GLYPHS[sorted]}`);
  button.type = 'button';
  button.addEventListener('click', () => onView(withSortKey(view, column.key)));
  cell.append(button);
  return cell;
};

/**
 * The one control a row has, and it is never called "Delete" — see the header. It sits in the
 * Enabled column because that is the column it changes, and the column has no other content: a
 * separate "on/off" word beside the button would be a second statement of the same flag, and the
 * two could disagree.
 */
const toggleButton = (entry: Entry, host: EntryEditorHost): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = entry.enabled ? TOGGLE_LABELS.disable : TOGGLE_LABELS.enable;
  // Kept off the entry's own `enabled` so the two cannot disagree: the row says what the entry
  // is, the title says what the button does to it. `entry` here is the ACTIVE SCENARIO'S resolved
  // entry (`entryRows`), so `enabled` is already this Scenario's answer and not the pool's.
  button.title = entry.enabled
    ? 'The entry stays in your plan file and stops applying in this scenario. You can switch it back on.'
    : 'The entry applies again in this scenario, from its own date.';
  button.addEventListener('click', () => {
    // ⚠️ The write names `activeScenarioId`. It is a statement BY THIS SCENARIO about a shared
    // entry, not an edit to the entry — see `planWithEntryOverride`, which is the whole of the
    // 2026-09-22 fix.
    const plan = host.currentPlan();
    void host.save(planWithEntryOverride(plan, plan.activeScenarioId, entry.id, !entry.enabled));
  });
  return button;
};

/**
 * **"Compare ways to pay for care" (P14-14), beside an `ENTER_CARE` row.** `careRoutes` decides
 * everything; this reads the rent box and saves. What it made or skipped is kept in `said`, by
 * entry id, because the save redraws this table and would otherwise wipe the lines.
 */
const careRoutesControl = (entry: Entry, host: EntryEditorHost, said: Map<string, readonly string[]>): HTMLElement => {
  const box = el('div', 'care-routes');
  const rent = input('text', 'weeklyRent', 'blank skips renting');
  const button = el('button', 'care-routes-run', 'Compare ways to pay for care');
  button.type = 'button';
  const lines = el('div', 'care-routes-said');
  const show = (text: readonly string[]): void => {
    said.set(entry.id, text);
    lines.replaceChildren(...text.map((line) => el('p', '', line)));
  };
  show(said.get(entry.id) ?? []);
  button.addEventListener('click', () => {
    const createdAt = todayIso();
    let result;
    try {
      result = careRoutes(host.currentPlan(), entry.id, rent.value, createdAt);
    } catch (error) {
      show([error instanceof Error ? error.message : String(error)]);
      return;
    }
    const made = result.created.length === 0
      ? []
      : [`Added ${result.created.length} scenario${result.created.length === 1 ? '' : 's'} under this one — tick them on the Compare chart to see them side by side.`];
    show([...made, ...result.skipped.map(careRouteSkipLine)]);
    if (result.plan !== null) void host.save(result.plan);
  });
  // P14-10: two walks and a bisection, so only on a click; not kept across a redraw, where the
  // plan may have changed under it.
  const deposit = el('button', 'rad-deposit-run', 'Deposit: least vs most');
  deposit.type = 'button';
  const depositLines = el('div', 'rad-deposit-said');
  deposit.addEventListener('click', () => {
    let text: readonly string[];
    try {
      const plan = host.currentPlan();
      text = radDepositSentences(radDepositEnds(plan, entry.id), plan.settings);
    } catch (error) {
      text = [error instanceof Error ? error.message : String(error)];
    }
    depositLines.replaceChildren(...text.map((line) => el('p', '', line)));
  });
  box.append(label('Weekly rent $ ', rent), button, lines, deposit, depositLines);
  return box;
};

/** P9-6, beside a `DOWNSIZER_CONTRIBUTION` row: two walks, so only on a click (P14-10's idiom). */
const downsizerAgePensionControl = (entry: Entry, host: EntryEditorHost): HTMLElement => {
  const box = el('div', 'downsizer-age-pension');
  const button = el('button', 'downsizer-age-pension-run', 'What does this cost in Age Pension?');
  button.type = 'button';
  const said = el('p', 'downsizer-age-pension-said');
  button.addEventListener('click', () => {
    try {
      said.textContent = downsizerAgePensionSentence(downsizerAgePension(host.currentPlan(), entry.id));
    } catch (error) {
      said.textContent = error instanceof Error ? error.message : String(error);
    }
  });
  box.append(button, said);
  return box;
};

/**
 * ⚠️ **THE FILTER CONTROLS, AND WHY THE COUNT IS NOT ONE OF THEM.** The checkbox and the text box
 * are things the user operates; the sentence between them and the table is a thing the user READS,
 * and it is on the page whether or not anything is hidden and without anyone touching a control.
 * That is the whole of the guardrail quoted on `entryTable.ts`'s `hiddenSummary`, and it is why
 * this sentence is not folded into the checkbox's label the way the old list's toggle was: a label
 * only says its count while the control is drawn, and the control this table draws is always drawn.
 *
 * `aria-live="polite"` so a screen reader hears the count change when a filter moves — a silent
 * update would leave exactly the user who cannot see the table unable to tell that rows went away.
 *
 * **"Reset filters" is the one click back to the whole file.** It is the second half of the
 * guardrail and it clears BOTH filters (`filtersReset`). It is disabled — not hidden — when
 * nothing is filtered, because a control that vanishes teaches nobody that it exists.
 */
const filterControls = (
  rows: readonly EntryRow[],
  view: EntryTableView,
  onView: (next: EntryTableView) => void,
): HTMLElement => {
  const box = el('div', 'entry-filters');

  const showOff = document.createElement('input');
  showOff.type = 'checkbox';
  showOff.className = 'show-switched-off';
  showOff.checked = view.showSwitchedOff;
  showOff.addEventListener('change', () => onView({ ...view, showSwitchedOff: showOff.checked }));

  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'entry-search';
  search.value = view.search;
  search.placeholder = 'type, owner or description';
  // `input`, not `change`: the count beside it has to be live, and a count that only caught up when
  // the box lost focus would say the wrong number for as long as the user was typing.
  search.addEventListener('input', () => onView({ ...view, search: search.value }));

  const reset = el('button', 'reset-filters', 'Reset filters');
  reset.type = 'button';
  reset.disabled = filtersAreOpen(view);
  reset.title = 'Show every entry in the plan file again, switched off or not.';
  reset.addEventListener('click', () => onView(filtersReset(view)));

  const summary = el('p', 'hidden-count', hiddenSummary(rows, view));
  summary.setAttribute('aria-live', 'polite');

  box.append(label('Show switched off ', showOff), label('Filter ', search), reset, summary);
  return box;
};

/**
 * ⚠️ **ONE ROW PER ENTRY SHOWN, IN A TABLE THAT SORTS AND FILTERS — AND THE FILE IS UNTOUCHED BY
 * EITHER** (user ruling, 2026-09-22). A switched-off entry is still IN THE FILE (ADR-0002); what
 * the view decides is only which rows are on screen and in what order. Every decision about that
 * is in `entryTable.ts`, which is pure and tested; what is here is the DOM and nothing else.
 *
 * **What this replaced, and what carried forward.** Until 2026-09-22 this was one `<div>` per
 * entry, each a single `<span>` of concatenated text, listed in the plan array's order with a
 * button that revealed the switched-off ones. Two things survive the redesign unchanged because
 * they are the panel's whole point: **add** (the `<form>` above, still a separate panel — the table
 * is a reader, not an editor) and **switch off / switch back on** (now the Enabled cell). There is
 * still no in-place edit and no delete, by design (`planEdits.ts`), and the table is deliberately
 * plain about that: no cell is an input, no row opens an editor, and the only control in the whole
 * table is the toggle, so nothing here implies an operation this build does not have.
 *
 * **A plan with no entries at all gets a sentence, not an empty table.** "There is nothing here"
 * and "this did not render" look identical otherwise — and so do "nothing is here" and "your
 * filter matched nothing", which is why the filtered-to-nothing case gets its own sentence naming
 * the way back rather than sharing the empty-plan one.
 */
const renderEntryList = (
  list: HTMLElement,
  host: EntryEditorHost,
  view: EntryTableView,
  onView: (next: EntryTableView) => void,
  careSaid: Map<string, readonly string[]>,
): void => {
  const plan = host.currentPlan();
  // The whole panel is rebuilt on every keystroke in the filter box (see `mountEntryEditor` on why
  // there is no patching), which would drop the caret out of the box the user is typing in. The
  // one piece of DOM state that cannot be recomputed from the plan and the view is therefore
  // carried across by hand.
  const focused = document.activeElement;
  const caret = focused instanceof HTMLInputElement && focused.classList.contains('entry-search') ? focused.selectionStart : null;
  // The same problem for a keyboard user sorting the table: the heading they pressed is gone by the
  // time the redraw finishes, and focus would fall back to the document. The column is remembered
  // rather than the element, because the element is about to be replaced by a new one.
  const sortedBy = focused instanceof HTMLButtonElement && focused.classList.contains('sort')
    ? (focused.parentElement?.className ?? '')
    : '';

  list.replaceChildren();
  // A salary that is never stopped runs to the plan's last month and flatters every figure after
  // the date the user thinks they retire (`retirementWarning.ts`). Above the table, not in it, so no
  // filter can hide it.
  for (const warning of stillWorkingWarnings(plan.household, activeScenarioEntries(plan))) {
    list.append(el('p', 'still-working', warning));
  }
  // The switch at retirement moves money between the pools the Age Pension assets test treats
  // differently, so it is said where the Retire entry that causes it is listed: one short line with
  // the downside on it, the full sentences behind the ⓘ (P17-6).
  for (const line of pensionAtRetirementLines(plan.household, activeScenarioEntries(plan), plan.settings.asAtDate)) {
    const box = infoButton(line.summary, line.detail, 'guide:becomes-a-pension');
    box.classList.add('pension-at-retirement');
    list.append(box);
  }
  if (activeScenarioEntries(plan).length === 0) {
    const empty = el('p', 'empty');
    // "in this scenario", because the pool may be full: a scenario cloned from another starts with
    // no entries of its own and inherits none if its parent has none either, and an empty list that
    // said "no changes recorded" flat would be a claim about the file that is not true of it.
    empty.textContent = 'No changes in this scenario yet. Every figure below comes from the household and the settings alone — with no spending change recorded, the forecast assumes nothing is spent at all.';
    list.append(empty);
    return;
  }

  const rows = entryRows(plan);
  // Which of the rows came from an ancestor Scenario rather than from the one in view. A fact about
  // the plan as it stands, recomputed on every redraw: inheritance is live, so a row can become
  // inherited without this table being touched.
  const inherited = inheritedEntryIds(plan, activeScenario(plan));
  // The NAME of the ancestor each inherited row came from. The left border alone was read as
  // decoration (user, 2026-09-22) — a mark that says "this row is different" without saying how is
  // worse than no mark, because the reader invents a meaning for it.
  const inheritedFrom = inheritedEntrySources(plan, activeScenario(plan));
  list.append(filterControls(rows, view, onView));

  const table = el('table', 'entries');
  const head = el('thead', '');
  const headRow = el('tr', '');
  for (const column of ENTRY_TABLE_COLUMNS) headRow.append(headingCell(column, view, onView));
  head.append(headRow);
  const body = el('tbody', '');
  const shown = entryTableRows(rows, view);
  if (shown.length === 0) {
    const none = el('tr', 'empty-row');
    const cell = el('td', '', 'Nothing matches this filter. “Reset filters” above shows every entry in the plan file again.');
    cell.colSpan = ENTRY_TABLE_COLUMNS.length;
    none.append(cell);
    body.append(none);
  }
  for (const row of shown) {
    const tr = el('tr', 'entry');
    tr.dataset['enabled'] = String(row.enabled);
    // **The second dataset flag, and it IS a fact about the row** — unlike the `data-not-modelled`
    // the note below records the removal of. An inherited row is one this Scenario did not add and
    // cannot remove; switching it off here states an override and leaves the parent's own answer
    // alone. Nothing else in the row says which kind it is.
    tr.dataset['inherited'] = String(inherited.has(row.entry.id));
    // **No second dataset flag, and its absence is deliberate (2026-09-19).** A
    // `data-not-modelled` attribute used to be set here on every `WORK_PATTERN_CHANGE` with a
    // non-zero `daysPerWeek`, and `public/index.html` coloured that row as a warning. The entry
    // now states its own salary and the engine applies it, so there is nothing about such a row to
    // warn about — a row still painted as unmodelled would be telling the reader to distrust a
    // figure that is correct, which is the same mistake in the opposite direction. The CSS rule
    // went with it.
    const description = el('td', 'col-description', row.description);
    // The long explanation is behind the row's own info button, not repeated in every row's text.
    if (row.entry.type === 'SUPER_CONTRIBUTION') {
      description.append(infoButton('What the forecast does with this', SUPER_CONTRIBUTION_ROW_DETAIL, 'guide:salary-sacrifice'));
    }
    if (row.entry.type === 'ENTER_CARE' && row.entry.enabled) description.append(careRoutesControl(row.entry, host, careSaid));
    if (row.entry.type === 'DOWNSIZER_CONTRIBUTION' && row.entry.enabled) description.append(downsizerAgePensionControl(row.entry, host));
    const enabledCell = el('td', 'col-enabled');
    enabledCell.append(toggleButton(row.entry, host));
    const dateCell = el('td', 'col-date', row.date);
    // The words go in the bordered cell, beside the border, so the mark and its explanation are one
    // thing rather than two. A legend under the table would make the reader hold the key in their
    // head while scanning rows; this makes every row state its own answer.
    const source = inheritedFrom.get(row.entry.id);
    if (source !== undefined) {
      const tag = el('span', 'inherited-tag', `from ${source}`);
      tag.title = `This change belongs to the scenario “${source}”, and this one inherits it live. Editing it there moves this scenario too. Switching it off here states an override and leaves “${source}” alone.`;
      dateCell.append(tag);
    }
    tr.append(dateCell, el('td', 'col-type', row.type), el('td', 'col-owner', row.owner), description, enabledCell);
    body.append(tr);
  }
  table.append(head, body);
  list.append(table);

  if (caret !== null) {
    const search = list.querySelector('input.entry-search');
    if (search instanceof HTMLInputElement) {
      search.focus();
      search.setSelectionRange(caret, caret);
    }
  }
  if (sortedBy !== '') {
    const heading = list.querySelector(`th.${sortedBy} button.sort`);
    if (heading instanceof HTMLButtonElement) heading.focus();
  }
};

/**
 * Put both controls on the page and return the redraw for the list. `main.ts` calls the returned
 * function after every successful save, so the list is rebuilt from the plan that is now on disk
 * rather than patched to match what the click asked for — a list that updated itself optimistically
 * would keep showing the change after a write that failed.
 *
 * `view` lives HERE, in a closure over this one mount, and nowhere near `host.save` — it is the one
 * piece of state this file owns that a save never reads and a load never sets. Sorting and
 * filtering go through the same redraw for the same reason: they are questions about the screen,
 * and the only thing that answers them is a rebuild from the plan that is on disk.
 *
 * It survives the redraw `main.ts` triggers after every save (so a sort or a filter stays put
 * across an unrelated edit) and starts at `DEFAULT_ENTRY_TABLE_VIEW` on every fresh mount — date
 * descending, switched-off rows hidden — which is the same state a page reload gives you.
 */
export const mountEntryEditor = (form: HTMLElement, list: HTMLElement, host: EntryEditorHost): (() => void) => {
  const added = buildForm(host);
  form.replaceChildren(added.form);
  let view = DEFAULT_ENTRY_TABLE_VIEW;
  const careSaid = new Map<string, readonly string[]>();
  const redraw = (): void => {
    // The form is built once and the Owner options are not: a rename or a second Person saved in
    // "Household and settings" reaches this selector on the redraw that save already triggers.
    added.refreshOwners();
    renderEntryList(list, host, view, (next) => {
      view = next;
      redraw();
    }, careSaid);
  };
  redraw();
  return redraw;
};
