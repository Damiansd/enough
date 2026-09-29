// The first run, and the only screen a user with no plan file ever sees. It asks two questions —
// a name and a date of birth — and on Finish writes ONE plan built from those two answers.
//
// ⚠️ **NOTHING IS WRITTEN UNTIL FINISH, AND THERE IS NOTHING HERE TO DESTROY.** This panel is
// mounted only when `loadPlanOrNone` reported that there is no file at all (`loadPlan.ts` says why
// that report is trustworthy). Until this slice a first run wrote the demo couple's plan to disk
// before the user had been asked anything; typing in these two boxes now touches nothing, and the
// plan file comes into existence at the moment Finish resolves.
//
// ⚠️ **THE COPY IS ITS OWN AND MUST NOT BE THE “START AGAIN” COPY** (brief, 2026-09-20).
// `settingsPanel.ts`'s `RESET_WARNING` and `resetConfirmation` say *"your old plan is gone"* and
// *"this cannot be undone"*, which are true of a wizard that overwrites a plan and FALSE here:
// there is no old plan on a first run, so that wording would frighten a user about a loss that
// cannot happen. Every sentence below is written for the empty case. The element builders ARE
// shared with that panel, because a `<label>` is not a claim about anything.
//
// It BUILDS nothing: `planEdits.walkthroughPlan` is the one builder of a candidate plan, exactly as
// it is for the “start again” wizard, and it VALIDATES nothing: a blank or impossible date of birth
// is `parsePlan`'s refusal and one past the planning horizon is `project()`'s, both said in their
// own words at the save door by `main.ts`, which owns the banner.
import { walkthroughPlan } from './planEdits.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { button, input, label, paragraph } from './settingsPanel.js';

/**
 * What the page gives the panel: the one thing to do with a candidate. `save` never rejects —
 * `main.ts` catches and banners, and on a write that landed it reloads the page — so this file has
 * no error handling and no notification channel of its own.
 */
export interface FirstRunHost {
  readonly save: (candidate: unknown) => Promise<void>;
}

/** The heading. It greets rather than warns: nothing has gone wrong and nothing is at stake yet. */
export const FIRST_RUN_HEADING = 'Welcome — let’s start your plan';

/**
 * **What this screen is, and the two facts that make it safe to be on.** There is no plan on this
 * computer, so there is nothing to lose; and nothing is made up for the user, which is the promise
 * the retired seeding write broke — a first run used to arrive holding a demo couple's house,
 * super and income, and a user could read those figures as a starting point they had been given.
 */
export const FIRST_RUN_INTRO =
  'There is no plan on this computer yet, so there is nothing here to lose. Tell us your name and your' +
  ' date of birth and we will start one — nothing is filled in for you, nothing is made up, and nothing' +
  ' is written until you press the button below.';

/**
 * **Why both boxes are needed, and where the rest of the figures go.** The date of birth is said as
 * what it is FOR: every age the forecast turns on is counted from it. The second sentence is the
 * hand-off — a plan holding one person and nothing else draws a blank forecast, and a user who is
 * not told where their home, super and income go has no reason to look for the panel that takes
 * them.
 */
export const FIRST_RUN_NOTICE =
  'Both are needed — every age the forecast turns on is counted from your date of birth. Your home,' +
  ' super and income come next, on the page this opens.';

/** The two boxes, as the form asks for them. Neither has a default and neither is pre-filled. */
export const FIRST_RUN_LABELS = {
  name: 'Your name ',
  dateOfBirth: 'Your date of birth ',
} as const;

/** The one button that writes. It names what it makes, not what it replaces — it replaces nothing. */
export const FIRST_RUN_FINISH = 'Start my plan';

/**
 * **The whole of the first-run screen, and the single write it can make.**
 *
 * The Finish button starts DISABLED and is enabled by presence alone. Nothing here looks at what
 * was typed: a name has no engine-level rule to check it against, and a date of birth has two —
 * `parsePlan`'s format guard and `project()`'s planning horizon — which say so far better than a
 * hand-written check could, at the door, before a byte is written.
 *
 * It is disabled again for the duration of the save so a second press cannot write a second plan,
 * and re-enabled afterwards: `host.save` resolves on a refusal too, and a form left dead over a
 * banner the user can act on would be a dead end. On a write that LANDED the page reloads, so the
 * re-enable is never seen.
 */
export const mountFirstRunPanel = (box: HTMLElement, host: FirstRunHost): void => {
  const heading = document.createElement('h2');
  heading.textContent = FIRST_RUN_HEADING;

  const form = document.createElement('form');
  form.className = 'walkthrough';
  const name = input('text', 'firstRunName', '');
  // `type="date"` is what makes the value ISO, which is the format `parsePlan` reads. There is no
  // fallback parse here: a browser that hands over something else gets the door's refusal.
  const dateOfBirth = input('date', 'firstRunDateOfBirth', '');

  const finish = button(FIRST_RUN_FINISH, 'Writes your new plan file. Nothing exists until you press this.', () => {
    finish.disabled = true;
    const candidate = walkthroughPlan({ name: name.value, dateOfBirth: dateOfBirth.value });
    void host.save(candidate).finally(() => { finish.disabled = false; });
  });
  // Presence only, and on the BUTTON rather than in the handler: a button that can be pressed and
  // then silently does nothing is worse than one that is visibly not ready yet.
  finish.disabled = true;
  const gate = (): void => {
    finish.disabled = name.value.trim() === '' || dateOfBirth.value.trim() === '';
  };
  name.addEventListener('input', gate);
  dateOfBirth.addEventListener('input', gate);

  form.append(
    label(FIRST_RUN_LABELS.name, name),
    label(FIRST_RUN_LABELS.dateOfBirth, dateOfBirth),
    paragraph('caveat', FIRST_RUN_NOTICE),
    finish,
  );
  box.replaceChildren(heading, paragraph('caveat', FIRST_RUN_INTRO), form);
};
