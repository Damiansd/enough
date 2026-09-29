// P8-2b, extended by P6-6 — the visible failure states. Three things can go wrong with a plan file
// and the page must say which, because the user's next move is different for each:
//
//   * **it would not load** — the file is still there, untouched, and what is wrong is in the file;
//   * **it would not save** — the file on disk is now OLDER than the screen, which is the dangerous
//     one, because everything still looks right;
//   * **an edit was refused** (P6-6) — the safest of the three: nothing was sent, so the file and
//     the screen still agree, and what is wrong is in the form.
//
// A `console.error` is not a failure state: nobody has the console open, and the second case in
// particular is invisible without a banner — the figures on screen are still drawn, still correct
// as a computation, and no longer what is stored.
//
// **Each banner now LEADS with a short plain sentence and hides the machine words.** Every banner
// used to end with the raw thrown message, and the refusal banner fires on every typo'd date, so
// the most-seen text in the app was half developer language — `… cannot be negative: 12345 cents`.
// The raw words are not deleted, because they are the only thing that identifies a defect; they
// move behind `infoButton`, collapsed, where a reader who wants them can open them.
//
// The message is a pure function so it can be asserted without a DOM; `showPlanFailure` is the
// three lines that put it on the page.
import { PlanWriteFailure } from './loadPlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import * as planFile from '../core/parsePlan.js';
import { infoButton } from './infoButton.js';

/**
 * **The refusals that are WRITTEN FOR A USER, derived from the module rather than listed.**
 *
 * Two families of `RangeError` reach these banners and they want opposite treatment:
 *
 *   * `parsePlan`'s refusals name a field and a value — `plan file: entries[3].date is "2030-1-1"`.
 *     That is the actionable half: it says which box to fix, so it stays on the page.
 *   * the ~66 engine `RangeError`s under `src/core/` are internal invariant breaches phrased in
 *     field names and cents. Nobody wrote them for a reader, and they go behind the button.
 *
 * The two are cleanly separable because the first family is exactly the `RangeError` subclasses
 * `core/parsePlan.ts` exports and nothing else exports them. This list is READ OFF that module, not
 * transcribed: a ninth file-boundary refusal joins it on the day it is exported, and none of the
 * engine's classes can ever wander in, so there is no hand-maintained table here to rot.
 */
const FILE_REFUSALS: readonly Function[] = (Object.values(planFile) as readonly unknown[]).filter(
  (value): value is Function =>
    typeof value === 'function' && (value as { prototype?: unknown }).prototype instanceof RangeError,
);

const namesAField = (error: unknown): boolean => FILE_REFUSALS.some((Kind) => error instanceof Kind);

/** What the banner is made of: the sentence a user reads, and the words a debugger opens. */
export interface PlanBanner {
  /** Plain language, no internal vocabulary. Always shown. */
  readonly lead: string;
  /** A refusal that names the field to fix. Shown, because it is what the user acts on. */
  readonly visibleDetail: string | null;
  /** Everything else that was thrown. Behind the disclosure, closed. */
  readonly collapsedDetail: string | null;
}

const split = (lead: string, error: unknown): PlanBanner => {
  const detail = error instanceof Error ? error.message : String(error);
  return namesAField(error)
    ? { lead, visibleDetail: detail, collapsedDetail: null }
    : { lead, visibleDetail: null, collapsedDetail: detail };
};

const SAVE_LEAD =
  'Your plan could NOT be saved, so what you see here is not what is on disk. ' +
  'Nothing already stored was lost. Try again in a moment.';

const LOAD_LEAD =
  'Your plan file was not loaded, and it has NOT been changed — it is on disk exactly as it was. ' +
  'Nothing is shown below, because a forecast from anything other than your own plan is worse than none.';

const REFUSAL_LEAD =
  'That change was NOT made. Nothing was sent to your plan file, so your saved plan and the ' +
  'forecast below still agree. Fix the entry and try again.';

/** The banner for a load or a save failure. Pure: takes the thrown value, returns the parts. */
export const planFailureBanner = (error: unknown): PlanBanner =>
  split(error instanceof PlanWriteFailure ? SAVE_LEAD : LOAD_LEAD, error);

/**
 * **The third state, from P6-6: an EDIT that was refused before anything was sent.**
 *
 * It is neither of the two above and must not borrow either one's words. *"The plan file was not
 * loaded"* would be false — the file loaded fine and is still on screen — and *"could NOT be
 * saved"* would frighten a user into thinking the disk is broken when what happened is that they
 * typed a date wrong. What actually happened is the safest of the three: `parsePlan` (or the
 * engine) refused the edit, so **nothing was sent to the file at all**, and the plan on disk and
 * the plan on screen are still the same plan.
 *
 * Same banner element, same mechanism — a second notification channel would mean two places to
 * look when something goes wrong.
 */
export const entryRefusalBanner = (error: unknown): PlanBanner => split(REFUSAL_LEAD, error);

/** The text a reader sees without opening anything. */
const visibleText = (banner: PlanBanner): string =>
  banner.visibleDetail === null ? banner.lead : `${banner.lead} The problem: ${banner.visibleDetail}`;

/** What the banner says, without its disclosure. Pure, and what the tests assert. */
export const planFailureMessage = (error: unknown): string => visibleText(planFailureBanner(error));

/** As `planFailureMessage`, for a refused edit. */
export const entryRefusalMessage = (error: unknown): string => visibleText(entryRefusalBanner(error));

/**
 * Put one on the page. `textContent` first — that clears any previous banner's disclosure — then
 * the disclosure, only when there is something to fold away. A banner whose detail is already
 * visible never touches the DOM factory at all.
 */
const show = (banner: HTMLElement, parts: PlanBanner): void => {
  banner.textContent = visibleText(parts);
  if (parts.collapsedDetail !== null) banner.append(infoButton('What went wrong', parts.collapsedDetail));
  banner.hidden = false;
};

/** Put the message on the page. The banner is hidden until something has gone wrong. */
export const showPlanFailure = (banner: HTMLElement, error: unknown): void =>
  show(banner, planFailureBanner(error));

/** As `showPlanFailure`, for a refused edit. */
export const showEntryRefusal = (banner: HTMLElement, error: unknown): void =>
  show(banner, entryRefusalBanner(error));

/** Nothing is wrong: put the banner away. Called after an edit that DID land. */
export const clearPlanStatus = (banner: HTMLElement): void => {
  banner.textContent = '';
  banner.hidden = true;
};
