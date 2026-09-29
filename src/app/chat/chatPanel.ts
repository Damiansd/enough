// plan_ai.md §9 stage 5 — **the chat on the page: its settings box, and the panel.** P15-11.
//
// **THE SETTINGS BOX** is always in the settings area. It reads and writes through `chatSettings.ts`
// and nothing else, so the key stays in this browser's localStorage (plan_ai.md §2 rule 4). It shows
// this month's spending against the monthly limit, and says in one line what goes to Anthropic.
//
// **THE PANEL IS NOT IN THE PAGE WHILE THE CHAT IS OFF.** Its host is emptied and hidden, and no
// conversation or queue exists, so a page with the chat off is the page as it was (rule 5). Turned
// on, it holds the question box, the conversation and the review queue under it.
//
// **A REPLY IS PUT ON THE PAGE ONLY AS `chips.ts` RENDERED IT:** each marker a chip showing the
// engine's value and linking to the month table (`monthAnchors.ts` opens it), each figure the model
// wrote itself struck through as "not worked out by enough", and a marker that names nothing a red chip.
// Replies are rendered again in the other money when the page's toggle flips; the model is not asked
// again. A turn that fails shows `conversation.ts`'s own plain message.
//
// **SUGGESTIONS WAIT IN THE REVIEW QUEUE** (`reviewQueue.ts`), in memory: Accept saves through the
// page's own save, Reject drops the suggestion and writes nothing. Each entry Accept adds carries
// the turn it came from as its `origin` (P15-13): the question, the reply as plain text with every
// chip its value as shown at that moment, the model and when the reply came back. The review box
// says so, since that puts written reasoning about money into `plan.json` (ADR-0006).
//
// DOM code: `test/app-chat-panel.test.mjs` drives it through a small stand-in DOM, since `typescript`
// is the one dev dependency (TODO.md P2-9a).
import { formatDollars } from '../displayMoney.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { revealAnchor } from '../monthAnchors.js';
import { moneyBasis } from '../todaysDollars.js';
import { monthOf, readChatState, spentIn, writeChatSettings } from './chatSettings.js';
import { createConversation } from './conversation.js';
import { renderReply, replyText } from './chips.js';
import { createReviewQueue, effectHtml } from './reviewQueue.js';
import { ORIGIN_QUESTION_MAX } from '../../core/parsePlan.js';
import type { PlanFile } from '../../core/parsePlan.js';
import type { EntryOrigin } from '../../core/plan.js';
import type { MoneyView } from '../todaysDollars.js';
import type { ChatSettings, DeviceStorage } from './chatSettings.js';
import type { Conversation, TurnOutcome } from './conversation.js';
import type { ChatProvider } from './provider.js';
import type { ReviewQueue } from './reviewQueue.js';

export interface ChatPageDeps {
  readonly storage: DeviceStorage;
  readonly currentPlan: () => PlanFile;
  /** The page's money toggle, now. */
  readonly moneyView: () => MoneyView;
  /** The page's own save: `true` once the write landed. */
  readonly save: (candidate: unknown) => Promise<boolean>;
  readonly pageOrigin: string;
  readonly now: () => Date;
  readonly newId: () => string;
  /** Absent on the page: the adapter the settings name. */
  readonly provider?: (settings: ChatSettings) => ChatProvider;
}

export const CHAT_NOTICE = 'When the chat is on, your questions and the forecast’s figures are sent to Anthropic. Names and dates of birth are not.';
export const KEY_STAYS = 'The key stays in this browser only.';
export const SETTINGS_SAVED = 'Chat settings saved.';
export const SETTINGS_REFUSED = 'Not saved: a price or the monthly limit is not a number of dollars.';
export const ASKING = 'Asking…';
export const CHAT_FAULT = 'The chat went wrong on this page, so this question has no answer. Nothing was changed.';
export const ACCEPTED = 'Saved to your plan.';
export const QUEUE_EMPTY = 'No suggestions are waiting. When the chat suggests a change, it waits here until you accept or reject it.';
export const QUEUE_NOTE = 'Suggestions are kept only while this page is open: reloading the page clears them.';
export const ORIGIN_SAVED_NOTE =
  'Accepting a suggestion also saves your question and the chat’s answer with the new entries, in your plan file (plan.json). The file then holds written reasoning about your money, so take the same care with it, and any copy of it, as with your figures.';

export const CHAT_LABELS = Object.freeze({
  enabled: 'Chat on',
  endpoint: 'Provider address (https://…)',
  modelName: 'Model name',
  apiKey: 'API key',
  inputPrice: 'Input price, dollars per million tokens',
  outputPrice: 'Output price, dollars per million tokens',
  monthlyCeiling: 'Most the chat may spend in a month, in dollars',
  save: 'Save chat settings',
  ask: 'Ask',
  accept: 'Accept',
  reject: 'Reject',
});

/** Whole dollars (no cents anywhere in this interface), and "under $1" for a spend too small to show as one. */
const dollars = (amount: number): string => (amount > 0 && amount < 0.5 ? 'under $1' : formatDollars(Math.round(amount * 100)));

/** This month's spending against the limit, in words. */
export const spendLine = (settings: ChatSettings, spent: number): string =>
  settings.monthlyCeiling === null
    ? `Spent ${dollars(spent)} this month. Set a monthly limit to start.`
    : `Spent ${dollars(spent)} of the ${dollars(settings.monthlyCeiling)} monthly limit this month.`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const labelled = (text: string, control: HTMLElement): HTMLLabelElement => {
  const label = el('label');
  label.append(`${text} `, control);
  return label;
};

const input = (type: string, value: string): HTMLInputElement => {
  const box = el('input');
  box.type = type;
  box.value = value;
  return box;
};

const amountAsTyped = (text: string): number | null => (text.trim() === '' ? null : Number(text.trim()));
const amountShown = (amount: number | null): string => (amount === null ? '' : String(amount));

const todayOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

interface Turn {
  readonly question: string;
  readonly outcome: TurnOutcome;
  /** The model the settings named when the question was asked. */
  readonly model: string;
  /** When the reply came back, ISO 8601. */
  readonly answeredAt: string;
}

/** Mount the settings box in `settingsBox` and the panel in `panelHost`. The returned `redraw` repaints replies and suggestions in the page's current money. */
export const mountChat = (settingsBox: HTMLElement, panelHost: HTMLElement, deps: ChatPageDeps): { readonly redraw: () => void } => {
  let conversation: Conversation | undefined;
  let queue: ReviewQueue | undefined;
  let turns: Turn[] = [];
  /** Each queued suggestion's id to the turn that produced it: where Accept's `origin` comes from. */
  let turnOf = new Map<string, Turn>();
  const basis = () => moneyBasis(deps.moneyView(), deps.currentPlan().settings);

  // --- The settings box -------------------------------------------------------------------------
  const stored = readChatState(deps.storage).settings;
  const enabled = input('checkbox', '');
  enabled.checked = stored.enabled;
  const endpoint = input('text', stored.endpoint);
  const model = input('text', stored.model);
  const apiKey = input('password', stored.apiKey);
  apiKey.autocomplete = 'off';
  const inputPrice = input('text', amountShown(stored.inputPricePerMillion));
  const outputPrice = input('text', amountShown(stored.outputPricePerMillion));
  const ceiling = input('text', amountShown(stored.monthlyCeiling));
  const saveButton = el('button', '', CHAT_LABELS.save);
  saveButton.type = 'button';
  const announce = el('p', 'chat-settings-announce');
  const spend = el('p', 'chat-spend');
  settingsBox.replaceChildren(
    el('p', 'chat-notice', CHAT_NOTICE),
    labelled(CHAT_LABELS.enabled, enabled),
    labelled(CHAT_LABELS.endpoint, endpoint),
    labelled(CHAT_LABELS.modelName, model),
    labelled(CHAT_LABELS.apiKey, apiKey),
    labelled(CHAT_LABELS.inputPrice, inputPrice),
    labelled(CHAT_LABELS.outputPrice, outputPrice),
    labelled(CHAT_LABELS.monthlyCeiling, ceiling),
    saveButton,
    announce,
    spend,
    el('p', 'chat-key-note', KEY_STAYS),
  );

  const paintSpend = (): void => {
    const state = readChatState(deps.storage);
    spend.textContent = spendLine(state.settings, spentIn(state.spend, monthOf(deps.now())));
  };

  saveButton.addEventListener('click', () => {
    const settings: ChatSettings = {
      enabled: enabled.checked,
      provider: stored.provider,
      endpoint: endpoint.value.trim(),
      model: model.value.trim(),
      apiKey: apiKey.value.trim(),
      inputPricePerMillion: amountAsTyped(inputPrice.value),
      outputPricePerMillion: amountAsTyped(outputPrice.value),
      monthlyCeiling: amountAsTyped(ceiling.value),
    };
    try {
      writeChatSettings(deps.storage, settings);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      announce.textContent = SETTINGS_REFUSED;
      return;
    }
    announce.textContent = SETTINGS_SAVED;
    paintPanel();
  });

  // --- The panel --------------------------------------------------------------------------------
  const log = el('div', 'chat-log');
  const question = el('textarea', 'chat-question');
  question.rows = 3;
  question.maxLength = ORIGIN_QUESTION_MAX;
  const askButton = el('button', '', CHAT_LABELS.ask);
  askButton.type = 'button';
  const status = el('p', 'chat-status');
  const review = el('div', 'chat-review-items');

  const paintLog = (): void => {
    log.replaceChildren(
      ...turns.map(({ question: asked, outcome }) => {
        const turn = el('div', 'chat-turn');
        turn.append(el('p', 'chat-asked', asked));
        if (outcome.kind === 'answer') {
          const reply = el('div', 'chat-reply');
          reply.innerHTML = renderReply(outcome.prose, asked, conversation!.store, basis()).html;
          turn.append(reply);
        } else turn.append(el('p', 'chat-failure', outcome.message));
        return turn;
      }),
    );
  };

  /** The turn as the page shows it now: the reply's chips in the page's money, in whole dollars. */
  const originOf = (turn: Turn | undefined): EntryOrigin | undefined =>
    turn === undefined || turn.outcome.kind !== 'answer'
      ? undefined
      : {
          question: turn.question,
          reply: replyText(renderReply(turn.outcome.prose, turn.question, conversation!.store, basis())),
          model: turn.model,
          date: turn.answeredAt,
        };

  const paintReview = (): void => {
    const items = queue?.items() ?? [];
    if (items.length === 0) {
      review.replaceChildren(el('p', 'chat-review-empty', QUEUE_EMPTY));
      return;
    }
    review.replaceChildren(
      ...items.map((item, index) => {
        const card = el('div', 'review-card');
        card.dataset['suggestion'] = item.id;
        card.append(el('h4', '', item.newScenario === undefined ? `Suggestion ${index + 1}, for the scenario “${item.scenarioName}”` : `Suggestion ${index + 1}, a new scenario “${item.scenarioName}”`));
        const wording = el('ul', 'review-entries');
        for (const line of item.wording) wording.append(el('li', '', line));
        card.append(wording, el('p', 'review-effect-head', 'What this what-if changes:'));
        const effect = el('ul', 'review-effect');
        for (const html of effectHtml(item, basis())) {
          const line = el('li');
          line.innerHTML = html;
          effect.append(line);
        }
        const accept = el('button', 'review-accept', CHAT_LABELS.accept);
        accept.type = 'button';
        const reject = el('button', 'review-reject', CHAT_LABELS.reject);
        reject.type = 'button';
        const outcome = el('p', 'review-status');
        accept.addEventListener('click', async () => {
          accept.disabled = true;
          reject.disabled = true;
          const origin = originOf(turnOf.get(item.id));
          const accepted = await queue!.accept(item.id, {
            plan: deps.currentPlan(),
            save: deps.save,
            newId: deps.newId,
            today: todayOf(deps.now()),
            ...(origin === undefined ? {} : { origin }),
          });
          if (accepted.kind === 'saved') {
            status.textContent = ACCEPTED;
            paintReview();
            return;
          }
          outcome.textContent = accepted.message;
          accept.disabled = false;
          reject.disabled = false;
        });
        reject.addEventListener('click', () => {
          queue!.reject(item.id);
          paintReview();
        });
        card.append(effect, accept, reject, outcome);
        return card;
      }),
    );
  };

  askButton.addEventListener('click', async () => {
    const asked = question.value.trim();
    if (asked === '' || conversation === undefined) return;
    const asking = conversation;
    const model = readChatState(deps.storage).settings.model;
    askButton.disabled = true;
    status.textContent = ASKING;
    let outcome: TurnOutcome;
    try {
      outcome = await asking.ask(asked, basis());
    } catch {
      outcome = { kind: 'failed', message: CHAT_FAULT };
    }
    askButton.disabled = false;
    status.textContent = '';
    paintSpend();
    // The chat was switched off while the question was out: its answer has nowhere to go.
    if (conversation !== asking) return;
    question.value = '';
    const turn: Turn = { question: asked, outcome, model, answeredAt: deps.now().toISOString() };
    turns = [...turns, turn];
    if (outcome.kind === 'answer') {
      for (const proposal of outcome.proposals) {
        const item = queue!.add(deps.currentPlan(), proposal);
        if (item !== undefined) turnOf.set(item.id, turn);
      }
    }
    paintLog();
    paintReview();
  });

  // A chip is a link into the month table, which may be folded shut: open it there rather than follow a bare fragment.
  const followChip = (event: Event): void => {
    const chip = (event.target as Element | null)?.closest?.('a.figure-chip');
    const href = chip?.getAttribute('href');
    if (href === null || href === undefined || !href.startsWith('#')) return;
    event.preventDefault();
    revealAnchor(document, href.slice(1));
  };

  const panel = el('section');
  panel.id = 'chat-panel';
  const reviewBox = el('section', 'chat-review');
  reviewBox.append(el('h3', '', 'Suggestions to review'), el('p', 'chat-review-note', QUEUE_NOTE), el('p', 'chat-origin-note', ORIGIN_SAVED_NOTE), review);
  panel.append(
    el('h2', '', 'Ask about this plan'),
    el('p', 'chat-intro', 'Every dollar figure in an answer is the forecast’s own, and links to the month it came from. Anything the chat wrote itself is struck through.'),
    log,
    labelled('Your question', question),
    askButton,
    status,
    reviewBox,
  );
  panel.addEventListener('click', followChip);

  const paintPanel = (): void => {
    paintSpend();
    if (!readChatState(deps.storage).settings.enabled) {
      conversation = undefined;
      queue = undefined;
      turns = [];
      turnOf = new Map();
      panelHost.replaceChildren();
      panelHost.hidden = true;
      return;
    }
    if (conversation === undefined) {
      conversation = createConversation({
        plan: deps.currentPlan,
        storage: deps.storage,
        pageOrigin: deps.pageOrigin,
        now: deps.now,
        ...(deps.provider === undefined ? {} : { provider: deps.provider }),
      });
      queue = createReviewQueue();
    }
    panelHost.replaceChildren(panel);
    panelHost.hidden = false;
    paintLog();
    paintReview();
  };

  paintPanel();

  return {
    redraw: () => {
      if (conversation === undefined) return;
      paintLog();
      paintReview();
    },
  };
};
