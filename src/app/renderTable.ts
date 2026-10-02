// P5-1 / P5-2 — the DOM writer. It takes what `monthToRows.ts` already decided and puts it on the
// page; it decides NOTHING. No arithmetic, no formatting of money, no choice of wording for a
// union member — every string it writes is either a heading, an explanation of a heading, or a
// field of a `MonthRow`. Wording that a union member's IDENTITY depends on (which basis a figure
// has, what a note's subject is called, the gloss of a term of art) is decided in `monthToRows.ts`
// and arrives here already written.
//
// **Why it is untested, stated plainly rather than papered over.** Asserting on DOM needs jsdom,
// and TODO.md P2-9a keeps `typescript` as the one dev dependency. So the split above is the
// safety: everything a reader could be MISLED by — which union member a cell means, whether a
// stamp is borrowed, which lines reconcile the balances — lives in the pure function and is
// asserted in `test/app-month-to-rows.test.mjs`. What is untested here is whether the text lands
// in the right cell, which a single look at the page settles and a wrong one cannot make a true
// sentence false. Same trade-off as `main.ts` and `server/`.
//
// The one exception is the financial-year grouping (P7-UX-1): whether a year starts collapsed,
// toggles, and is opened by `revealMonth` is behaviour, not text in a cell, so
// `test/app-financial-year-rows.test.mjs` drives it through a small stand-in `document`.
import { infoButton } from './infoButton.js'; // `.js` is correct in a `.ts` file
import { BAND_LABELS } from './monthsToSeries.js';
import {
  AGE_PENSION_LABEL,
  DETERMINATION_DISCLOSURE,
  HOME_LOAN_OWING_DETAIL,
  HOME_LOAN_OWING_LABEL,
  DEPRIVED_ASSETS_DETAIL,
  DEPRIVED_ASSETS_LABEL,
  PERSONAL_ASSETS_DETAIL,
  PERSONAL_ASSETS_LABEL,
  INCOME_FROM_SUPER_LABEL,
  INVESTMENTS_DETAIL,
  INVESTMENTS_LABEL,
  TOTAL_SUPER_LABEL,
  TOTAL_WEALTH_DETAIL,
  TOTAL_WEALTH_LABEL,
} from './monthToRows.js';
import { financialYearOfMonth } from '../core/financialYear.js';
import type { AssetsSplitRows, CaveatCell, LineRow, MonthRow, NoteRow, ProvenanceCell } from './monthToRows.js';
import { CATCH_UP_BUTTON } from './financialYearRows.js';
import type { YearRow } from './financialYearRows.js';

/**
 * **The three position figures, glossed where they are read.** The first two are `monthsToSeries`'s
 * OWN band labels rather than a second set of words for the same two figures: the chart's legend and
 * this table now say the same thing about the same number, and neither can be reworded alone.
 * `accessibleAssets` has no band — it cross-cuts both (see `monthsToSeries.ts`) — so its gloss is
 * written here, in the same shape.
 */
const REACHABLE_LABEL = 'Reachable — money the Household could actually get at';

/**
 * The one explanation of the whole sourcing block, which used to be four headings of internal
 * vocabulary sitting open beside real dollar figures. Precise, but with nothing in it a reader has
 * to already know this build to parse.
 */
const SOURCES_SUMMARY = 'Where these figures come from';

/**
 * The mechanics that used to stand open under every Offset block. `OFFSET_ATTRIBUTION.note` keeps
 * the one fact that changes how the figures beside it are read — nobody owns a share of it — and
 * this is the why, folded away. It lives here rather than on that frozen object because the object's
 * key COUNT is pinned (see `monthToRows.ts`), and because folding is this layer's job.
 */
const OFFSET_DETAIL =
  'Because no Person owns a share of it, the two sets of figures above do not add up to the' +
  ' Household totals. It is still reported in full on this row: inside the Household’s assessable' +
  ' figure at the month’s opening, and inside the reachable figure at its close.';

const SOURCES_DETAIL =
  'Each figure above was worked out under a written rule — a tax rate, a threshold, a pension' +
  ' formula. This lists which rules were used this month, which rules lie behind a figure whose' +
  ' working this build cannot show, which financial year’s numbers were applied, and how well' +
  ' checked the least certain of them is. None of it changes a figure: it is the working behind' +
  ' them, so a number can be trusted for a reason rather than because it is printed.';

/**
 * P3-4b slice 2 — the catch-up column. The words in each cell are `financialYearRows.ts`'s, read off
 * the walk; the explanation is the guide's.
 */
const CATCH_UP_HEADING = 'Unused super cap';
const CATCH_UP_DETAIL = 'What is left of each person’s yearly limit on before-tax super contributions, as the forecast works it out.';

/** A heading is its words, or its words and the sentence folded behind them. */
const HEADINGS: readonly (string | readonly [string, string])[] = [
  '',
  'Year and month',
  'Opening',
  'Net cash',
  'Closing',
  TOTAL_SUPER_LABEL,
  [INVESTMENTS_LABEL, INVESTMENTS_DETAIL],
  [TOTAL_WEALTH_LABEL, TOTAL_WEALTH_DETAIL],
  INCOME_FROM_SUPER_LABEL,
  AGE_PENSION_LABEL,
];

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const dl = (pairs: readonly (readonly [string, string])[]): HTMLElement => {
  const list = el('dl', 'facts');
  for (const [term, value] of pairs) {
    list.append(el('dt', '', term), el('dd', '', value));
  }
  return list;
};

const ul = (className: string, items: readonly string[]): HTMLElement => {
  const list = el('ul', className);
  for (const item of items) list.append(el('li', '', item));
  return list;
};

/**
 * **A caveat: the plain label on the page, the citation behind it.** `CaveatCell.label` is
 * `monthToRows.ts`'s wording for the KIND of caveat, and `text` is `provenanceOf`'s own sentence,
 * which names the figure it is about by its internal key (`tax.medicareLevy…singleLower`). The two
 * were being printed as one line, so the key was on screen beside a dollar figure. The kind stays in
 * the `data-` attribute either way — a stylesheet can still tell a borrowed caveat from the rest.
 */
const caveatBlock = (caveat: CaveatCell): HTMLElement => {
  const box = infoButton(caveat.label, caveat.text);
  box.dataset['kind'] = caveat.kind;
  return box;
};

/**
 * The provenance block. The `basis` is written into a `data-` attribute as well as a label so that
 * the three members are distinguishable in the DOM and not only to a reader — a stylesheet that
 * gave two of them the same appearance would be the same collapse the pure function refuses.
 */
const provenanceBlock = (cell: ProvenanceCell): HTMLElement => {
  const block = el('div', 'provenance');
  block.dataset['basis'] = cell.basis;
  block.append(el('p', 'provenance-label', cell.label));
  const facts: (readonly [string, string])[] = [];
  if (cell.register !== null) facts.push(['Rule', cell.register]);
  if (cell.stampLabel !== null) facts.push(['Financial year', cell.stampLabel]);
  if (cell.confidence !== null) facts.push(['How well checked', cell.confidence]);
  if (facts.length > 0) block.append(dl(facts));
  // The name of the rule keeps its own name and the explanation opens behind it — the gloss is
  // `monthToRows.ts`'s, keyed on the register, and a rule that needs none has no button.
  if (cell.register !== null && cell.registerDetail !== null) {
    block.append(infoButton(cell.register, cell.registerDetail));
  }
  // The `'none'` / `'not carried'` sentence is the engine's own and names its internals; the pure
  // layer decided what it IS, and that is what stands on the page.
  if (cell.note !== null && cell.noteLabel !== null) {
    block.append(infoButton(cell.noteLabel, cell.note));
  }
  if (cell.determination.length > 0) {
    const working = infoButton(DETERMINATION_DISCLOSURE.label, DETERMINATION_DISCLOSURE.detail, 'guide:figure-sources');
    working.append(ul('determination', cell.determination));
    block.append(working);
  }
  for (const caveat of cell.caveats) block.append(caveatBlock(caveat));
  return block;
};

const lineBlock = (line: LineRow): HTMLElement => {
  const block = el('div', 'line');
  block.dataset['direction'] = line.direction;
  block.dataset['effect'] = line.effect;
  const head = el('p', 'line-head');
  head.append(
    el('span', 'line-description', line.description),
    el('span', 'line-amount', `${line.direction === 'outflow' ? '−' : '+'}${line.amount}`),
    el('span', 'line-effect', line.effectLabel),
  );
  block.append(head);
  const attribution = el('div', 'attribution');
  attribution.dataset['basis'] = line.attribution.basis;
  attribution.append(el('p', 'attribution-label', line.attribution.label));
  if (line.attribution.entryIds.length > 0) attribution.append(ul('entry-ids', line.attribution.entryNames));
  if (line.attribution.note !== null && line.attribution.noteLabel !== null) {
    attribution.append(infoButton(line.attribution.noteLabel, line.attribution.note));
  }
  block.append(attribution, provenanceBlock(line.provenance));
  return block;
};

const noteBlock = (note: NoteRow): HTMLElement => {
  const block = el('div', 'month-note');
  block.dataset['subject'] = note.subject;
  block.append(el('p', 'note-head', `${note.subjectLabel}: ${note.of}`));
  if (note.available !== null && note.drawn !== null) {
    block.append(dl([['Available', note.available], ['Drawn', note.drawn]]));
  }
  // **The engine's own sentence, folded.** It is the audit record for the month and it reads like
  // one — cent figures, section numbers, this build's own change history in capitals — and it was
  // printed open under every month. `noteLabel` is the pure layer's plain statement of what it is,
  // decided on the note's `subject` and not by reading its prose; the record itself is one click
  // away and word for word.
  block.append(infoButton(note.noteLabel, note.note));
  // The gloss of a real term in the head, where the pure layer supplied one — folded away, never
  // printed open beside every month.
  if (note.detail !== null) block.append(infoButton('What this means', note.detail));
  return block;
};

/**
 * **The Position section in the per-Person view (P7-6 UI).** One block per member of the tuple —
 * `split.persons` is already the right length, so a one-Person Household gets one block and a
 * couple two, and this loop never assumes which it has. The Person's POSITION goes into the DOM
 * beside the label, because the index is what the figures are keyed on and the label is only what
 * they are called.
 *
 * The Offset block is the third, and it carries no figure of its own: it points at the row's
 * `openingBalance` and `closingBalance`, which are the same two fields the summary line shows and
 * are each read on their own clock. Nothing here re-times anything — the headings say which clock
 * each of the two is, and that is the whole of what this file decides.
 */
const splitPosition = (row: MonthRow, split: AssetsSplitRows): HTMLElement => {
  const box = el('div', 'assets-split');
  box.append(el('p', 'split-shape', split.shape));
  for (const person of split.persons) {
    const block = el('div', 'person-assets');
    block.dataset['person'] = String(person.index);
    block.append(
      el('h4', '', person.label),
      dl([
        [BAND_LABELS.protected, person.protectedAssets],
        [BAND_LABELS.assessable, person.assessableAssets],
        [REACHABLE_LABEL, person.accessibleAssets],
      ]),
    );
    box.append(block);
  }
  const offset = el('div', 'offset-assets');
  offset.append(
    el('h4', '', split.offset.label),
    dl([
      ['Opening — the clock the protected and assessable figures are read on', row.openingBalance],
      ['Closing — the clock the accessible figure is read on', row.closingBalance],
    ]),
    el('p', 'offset-note', split.offset.note),
    infoButton('Why it is in neither column', OFFSET_DETAIL, 'guide:offset-account'),
  );
  box.append(offset);
  return box;
};

/**
 * The expanded half of a row. Cash and wealth are two sections with two headings and two subtotals,
 * because only the first reconciles the balances — see `monthToRows.ts`.
 */
const detail = (row: MonthRow): HTMLElement => {
  const cell = el('td', 'detail');
  cell.colSpan = HEADINGS.length + 1;

  const cash = el('section', 'axis cash');
  cash.append(el('h3', '', `Cash — reconciles the balance (net ${row.cashNet})`));
  for (const line of row.cashLines) cash.append(lineBlock(line));
  if (row.cashLines.length === 0) cash.append(el('p', 'empty', 'No cash moved this month.'));

  const wealth = el('section', 'axis wealth');
  wealth.append(el('h3', '', `Wealth only — no cash moved, NOT part of the balance (net ${row.wealthNet})`));
  for (const line of row.wealthLines) wealth.append(lineBlock(line));
  if (row.wealthLines.length === 0) wealth.append(el('p', 'empty', 'Nothing moved without cash this month.'));

  const position = el('section', 'axis position');
  position.append(el('h3', '', 'Position'));
  position.append(
    row.assetsByPerson === null
      ? dl([
          [BAND_LABELS.protected, row.protectedAssets],
          [BAND_LABELS.assessable, row.assessableAssets],
          [REACHABLE_LABEL, row.accessibleAssets],
        ])
      : splitPosition(row, row.assetsByPerson),
  );
  // **The home loan, beside the balances and never inside them (P3-16 slice 2).** Written in BOTH
  // views, because the debt is the Household's and no Person owns a share of it — the same reason
  // the Offset Account gets its own block. `null` is a household with no loan at this month and
  // prints nothing at all; `$0.00` is a loan that has been paid off and prints.
  if (row.homeLoanOwing !== null) {
    const loan = el('div', 'home-loan');
    loan.append(dl([[HOME_LOAN_OWING_LABEL, row.homeLoanOwing]]), infoButton('What this figure is', HOME_LOAN_OWING_DETAIL, 'guide:home-loan'));
    position.append(loan);
  }
  // A gift's deprived amount (register §4.12): counted by the means tests, held by nobody — so
  // beside the Position figures, in both views, and only in a month that has one.
  if (row.deprivedAssets !== undefined) {
    const gifts = el('div', 'deprived-assets');
    gifts.append(dl([[DEPRIVED_ASSETS_LABEL, row.deprivedAssets]]), infoButton('What this figure is', DEPRIVED_ASSETS_DETAIL, 'guide:gifts'));
    position.append(gifts);
  }
  if (row.personalAssets !== undefined) {
    const owned = el('div', 'personal-assets');
    owned.append(dl([[PERSONAL_ASSETS_LABEL, row.personalAssets]]), infoButton('What this figure is', PERSONAL_ASSETS_DETAIL, 'guide:personal-assets'));
    position.append(owned);
  }

  const entries = el('section', 'axis entries');
  entries.append(el('h3', '', 'Changes that applied this month'));
  entries.append(
    row.appliedEntryNames.length > 0
      ? ul('entry-ids', row.appliedEntryNames)
      : el('p', 'empty', 'No change applied this month.'),
  );

  // **The whole sourcing block, behind ONE disclosure.** It used to sit open under every expanded
  // month, four internal headings deep, against real dollar figures — and a reader could not tell
  // from any of it whether the number beside it was trustworthy. The summary says what the block is
  // FOR; the facts are unchanged and one click away.
  const rollup = el('section', 'axis rollup');
  const sources = infoButton(SOURCES_SUMMARY, SOURCES_DETAIL, 'guide:figure-sources');
  sources.append(
    dl([
      ['Rules used', row.provenance.registers.join(', ')],
      ['Rules behind a figure whose working is not shown', row.provenance.uncarried.join(', ')],
      ['Financial years', row.provenance.stamps.join(', ')],
      ['How well checked the least certain of them is', row.provenance.confidence],
    ]),
  );
  for (const caveat of row.provenance.caveats) sources.append(caveatBlock(caveat));
  rollup.append(sources);

  const notes = el('section', 'axis notes');
  notes.append(el('h3', '', 'What did NOT move, and why'));
  for (const note of row.notes) notes.append(noteBlock(note));

  cell.append(cash, wealth, position, entries, rollup, notes);
  return cell;
};

const summaryRow = (row: MonthRow, expanded: HTMLTableRowElement): HTMLTableRowElement => {
  const tr = el('tr', 'summary');
  const toggleCell = el('td', '');
  const toggle = el('button', 'toggle', '▸');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const open = expanded.hidden;
    expanded.hidden = !open;
    toggle.textContent = open ? '▾' : '▸';
    toggle.setAttribute('aria-expanded', String(open));
  });
  toggleCell.append(toggle);
  tr.append(toggleCell, el('td', 'month', row.month));
  tr.append(el('td', 'num', row.openingBalance), el('td', 'num', row.cashNet), el('td', 'num', row.closingBalance));
  tr.append(el('td', 'num', row.superBalance), el('td', 'num', row.investments), el('td', 'num', row.totalWealth));
  tr.append(el('td', 'num', row.incomeFromSuper), el('td', 'num', row.agePension), el('td', 'catch-up'));
  return tr;
};

/**
 * **P7-UX-1 — how each financial year of the table on screen opens.** One opener per year, so
 * `revealMonth` opens a year without a selector over the page. Each new table replaces the lot: a
 * year of a table no longer on screen can never be opened.
 */
let openers: ReadonlyMap<string, () => void> = new Map();

/** The year's own row. Its months are `monthBodies`, shown and hidden together. */
/** What a click on "Add a catch-up" asks the page to do. The page checks and saves; this file only reports the click. */
export type CatchUpRequest = (person: number, financialYear: YearRow['financialYear']) => void;

/** One line per Person, and the button only where the pure layer offered a catch-up. Nothing is written until it is clicked. */
const catchUpCell = (year: YearRow, onCatchUp: CatchUpRequest | undefined): HTMLElement => {
  const cell = el('td', 'catch-up');
  for (const room of year.catchUpRoom) {
    if (room.text === '') continue;
    const line = el('div', 'catch-up-room', room.text);
    if (room.offer !== null && onCatchUp !== undefined) {
      const add = el('button', 'catch-up-add', CATCH_UP_BUTTON);
      add.type = 'button';
      add.title = room.offerTitle;
      add.addEventListener('click', (event?: Event) => {
        // The row toggles its months on a click; this one is not that.
        event?.stopPropagation();
        onCatchUp(room.person, year.financialYear);
      });
      line.append(add);
    }
    cell.append(line);
  }
  return cell;
};

const yearRow = (year: YearRow, monthBodies: readonly HTMLElement[], onCatchUp: CatchUpRequest | undefined): { readonly tr: HTMLTableRowElement; readonly open: () => void } => {
  const tr = el('tr', 'year-summary');
  const toggleCell = el('td', '');
  const toggle = el('button', 'toggle', '▸');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', `Months of ${year.label}`);
  toggleCell.append(toggle);
  const show = (open: boolean): void => {
    for (const body of monthBodies) body.hidden = !open;
    toggle.textContent = open ? '▾' : '▸';
    toggle.setAttribute('aria-expanded', String(open));
  };
  // On the row, so a click anywhere on it toggles. The button's own click — and Enter or Space on
  // it, which a button turns into a click — bubbles here, so there is one handler and not two.
  tr.addEventListener('click', () => show(toggle.getAttribute('aria-expanded') !== 'true'));
  const label = el('td', 'month year');
  label.append(el('span', 'year-label', year.label), el('span', 'ages', year.ages));
  tr.append(toggleCell, label);
  tr.append(el('td', 'num', year.openingBalance), el('td', 'num', year.cashNet), el('td', 'num', year.closingBalance));
  tr.append(el('td', 'num', year.superBalance), el('td', 'num', year.investments), el('td', 'num', year.totalWealth));
  tr.append(el('td', 'num', year.incomeFromSuper), el('td', 'num', year.agePension), catchUpCell(year, onCatchUp));
  return { tr, open: () => show(true) };
};

/**
 * Writes the whole table into `container`, replacing whatever is there: one row per financial year,
 * EVERY one collapsed, each followed by its months, each month in the structure it has always had.
 */
export const renderTable = (container: HTMLElement, years: readonly YearRow[], onCatchUp?: CatchUpRequest): void => {
  const table = el('table', 'months');
  const head = el('thead', '');
  const headRow = el('tr', '');
  for (const heading of HEADINGS) {
    if (typeof heading === 'string') {
      headRow.append(el('th', '', heading));
    } else {
      const th = el('th', '');
      th.append(infoButton(heading[0], heading[1], 'guide:years-and-months'));
      headRow.append(th);
    }
  }
  const catchUpHead = el('th', '');
  catchUpHead.append(infoButton(CATCH_UP_HEADING, CATCH_UP_DETAIL, 'guide:catch-up-contributions'));
  headRow.append(catchUpHead);
  head.append(headRow);
  table.append(head);
  const built = new Map<string, () => void>();
  for (const year of years) {
    const monthBodies = year.months.map((row) => {
      const body = el('tbody', '');
      body.dataset['financialYear'] = year.financialYear;
      body.hidden = true;
      const expanded = el('tr', 'expanded');
      expanded.hidden = true;
      expanded.append(detail(row));
      body.append(summaryRow(row, expanded), expanded);
      return body;
    });
    const yearBody = el('tbody', 'year');
    yearBody.dataset['financialYear'] = year.financialYear;
    const { tr, open } = yearRow(year, monthBodies, onCatchUp);
    yearBody.append(tr);
    table.append(yearBody, ...monthBodies);
    built.set(year.financialYear, open);
  }
  openers = built;
  container.replaceChildren(table);
};

/**
 * Opens the financial year holding `month` (`YYYY-MM`) and never closes one. `false` when the table
 * on screen has no such year. For the chat's chips, and for a `#month-…` address.
 */
export const revealMonth = (month: string): boolean => {
  const open = /^\d{4}-\d{2}$/.test(month) ? openers.get(financialYearOfMonth(month)) : undefined;
  open?.();
  return open !== undefined;
};

/** `#month-2031-04` or `#month-2031-04-line-3` opens that month's year; any other address, nothing. */
export const revealMonthInHash = (hash: string): boolean => {
  const month = /^#month-(\d{4}-\d{2})(?:-|$)/.exec(hash)?.[1];
  return month !== undefined && revealMonth(month);
};
