// P6-8 microtask 3 — the guided template's own input screen: one dollar figure, a date range, and
// which existing account it targets, landing on the EXISTING overlay chart (P7-1). It DECIDES
// nothing itself: `comparisonTemplate.ts`'s `superVsInvestTemplate` builds the candidate,
// `savePlan` validates and writes it, and this file only reads the boxes and calls the two.
//
// **Why it is untested, stated plainly rather than papered over** — the same split as
// `entryForm.ts` and `scenarioPanel.ts`: there is no DOM under `node:test` and `typescript` is the
// one dev dependency (TODO.md P2-9a). Everything decidable is in `comparisonTemplate.ts` and
// `crossover.ts`, both asserted behaviourally; `test/app-comparison-template-form.test.mjs` reads
// THIS file as TEXT and pins what a silent regression would turn on — the banned-word rule below,
// that it writes only through `save`, and that the refusal is shown BEFORE the door is asked.
//
// ⚠️ **BANNED WORDS ON THIS SCREEN, PER THE BRIEF: "franking", "imputation", "ECPI", "gross-up",
// any register tag, any item ID.** Say it in terms of "extra super contributions" and "money
// invested outside super". Anything that needs a paragraph goes behind `infoButton`, never inline.
import { infoButton } from './infoButton.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { personOwnerLabels } from './ownerNames.js';
import { interestIndexAsTyped, superDestinationRefusal, superVsInvestTemplate } from './comparisonTemplate.js';
import type { PlanFile } from '../core/parsePlan.js';

/**
 * What the page gives this screen: the plan on screen, the one thing to do with a candidate, and a
 * way to land the reader on the comparison chart once the two Scenarios exist. `save` never
 * rejects — `main.ts` catches and banners — so this file has no error handling of its own beyond
 * the up-front refusal `superDestinationRefusal` already computes.
 */
export interface ComparisonTemplateHost {
  readonly currentPlan: () => PlanFile;
  readonly save: (candidate: unknown) => Promise<void>;
  /** Switches the chart to Compare mode and redraws it — P7-1's existing toggle, not a new chart. */
  readonly showComparison: () => void;
}

export const COMPARISON_TEMPLATE_SUMMARY = 'How it works';

export const COMPARISON_TEMPLATE_NOTICE =
  'A quick way to compare extra super contributions against investing the same money outside super. This builds two scenarios out of your plan to look at side by side: one with extra super contributions' +
  ' starting on the start date, and one where the same total is invested outside super on that date instead.' +
  ' Type 0 for the cost to buy if you paid nothing.';

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

/** The Owner selector for THIS screen — persons only, never "Household" (`superContributionEntry`'s own rule). */
const fillPersonOwners = (element: HTMLSelectElement, plan: PlanFile): void => {
  const chosen = element.value;
  const labels = personOwnerLabels(plan.household);
  const values: readonly string[] = labels.map((_, index) => (index === 0 ? 'personA' : 'personB'));
  element.replaceChildren(
    ...labels.map((personLabel, index) => {
      const node = document.createElement('option');
      node.value = values[index] as string;
      node.textContent = personLabel;
      return node;
    }),
  );
  if (values.includes(chosen)) element.value = chosen;
};

/** Today, as `YYYY-MM-DD` — `entryForm.ts`'s own `createdAt` construction, for the same reason: provenance, not a projection input. */
const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * The one form. No HTML constraint beyond `type="date"`/`type="text"` — a browser-level refusal
 * here would be a second validator, on `entryForm.ts`'s own ground.
 */
const buildForm = (host: ComparisonTemplateHost): { readonly form: HTMLFormElement; readonly refreshOwners: () => void } => {
  const form = document.createElement('form');
  form.id = 'comparison-template-form';

  const amount = input('text', 'annualAmount', 'e.g. 15,000 a year');
  const startDate = input('date', 'startDate');
  const endDate = input('date', 'endDate');
  const owner = document.createElement('select');
  owner.name = 'owner';
  const refreshOwners = (): void => fillPersonOwners(owner, host.currentPlan());
  refreshOwners();
  const interestIndex = input('text', 'interestIndex', 'which one — 1 is the first');
  const incidentalCostsOfAcquisition = input('text', 'incidentalCostsOfAcquisition', 'costs to buy it — type 0 if none');
  const note = input('text', 'note', 'why (optional)');
  const generate = document.createElement('button');
  generate.type = 'submit';
  generate.textContent = 'Make both scenarios';

  const announce = document.createElement('p');
  announce.className = 'comparison-template-announce';

  form.append(
    infoButton(COMPARISON_TEMPLATE_SUMMARY, COMPARISON_TEMPLATE_NOTICE, 'guide:super-vs-invest'),
    label('Amount $ ', amount),
    label('From ', startDate),
    label('To ', endDate),
    label('Whose ', owner),
    label('Super account ', interestIndex),
    label('Costs to buy it $ ', incidentalCostsOfAcquisition),
    label('Note ', note),
    generate,
    announce,
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    announce.textContent = '';
    const plan = host.currentPlan();
    const ownerValue = owner.value === 'personB' ? 'personB' : 'personA';
    const parsedIndex = interestIndexAsTyped(interestIndex.value);
    // Said BEFORE the door is asked — the gate's own ruling: refuse an ineligible destination
    // account in the template itself, before anything is generated.
    const refusal = Number.isFinite(parsedIndex)
      ? superDestinationRefusal(plan.household, ownerValue, parsedIndex)
      : `"${interestIndex.value}" is not a super account number — type a number, 1 for the first`;
    if (refusal !== undefined) {
      announce.textContent = refusal;
      return;
    }
    const createdAt = today();
    const ids = {
      superScenarioId: crypto.randomUUID(),
      investScenarioId: crypto.randomUUID(),
      superEntryId: crypto.randomUUID(),
      investEntryId: crypto.randomUUID(),
    };
    let candidate;
    try {
      candidate = superVsInvestTemplate(
        plan,
        plan.activeScenarioId,
        {
          annualAmount: amount.value,
          startDate: startDate.value,
          endDate: endDate.value,
          owner: ownerValue,
          interestIndex: interestIndex.value,
          incidentalCostsOfAcquisition: incidentalCostsOfAcquisition.value,
          note: note.value,
        },
        ids,
        createdAt,
      );
    } catch (error) {
      announce.textContent = error instanceof Error ? error.message : String(error);
      return;
    }
    void (async () => {
      await host.save(candidate);
      host.showComparison();
      announce.textContent = 'Added two scenarios — one with extra super contributions, one investing outside super. Showing them on the Compare chart.';
    })();
  });

  return { form, refreshOwners };
};

/**
 * Puts the form on the page and returns the redraw — `main.ts` calls it after every successful
 * save, the same pattern `mountScenarioPanel` and `mountEntryEditor` use, so the Owner options
 * cannot lag a rename or a second Person saved elsewhere.
 */
export const mountComparisonTemplateForm = (box: HTMLElement, host: ComparisonTemplateHost): (() => void) => {
  const built = buildForm(host);
  box.replaceChildren(built.form);
  return (): void => built.refreshOwners();
};
