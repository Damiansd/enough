// P5-2 — one `Month` turned into plain display data, and NOTHING ELSE. No DOM, no store, no
// server: `renderTable.ts` writes what this returns and decides nothing. The split is what makes
// the substance of the row testable with `node:test` and no jsdom (TODO.md P2-9a: one dev
// dependency), so every claim below is an assertion in `test/app-month-to-rows.test.mjs`.
//
// **THE RULE THIS FILE EXISTS TO ENFORCE: a three-member union never becomes two on screen.**
// `LineProvenance` and `LineAttribution` each have a third member, and the third member is the
// point:
//
//   * `'none'` — NOTHING LEGISLATED STANDS BEHIND THIS FIGURE (a salary, a Setting-supplied return).
//   * `'not carried'` — SOMETHING DOES AND THIS BUILD DROPS IT (the SIS Reg Sch 7 Account-Based
//     Pension minimum, whose register `annualPensionMinimum` computes and discards).
//
// Rendering both as a blank cell, an em-dash or "n/a" would print, on screen, the claim that no
// register governs a Schedule 7 minimum. That is a false statement about the law wearing the
// authority of a figure, which is the black box ADR-0006 exists to prevent. So each basis has its
// own visibly distinct wording, spelled out below as a frozen constant, and the same holds for
// `'none'` vs `'not attributed'` in attribution.
//
// **CASH AND WEALTH ARE SEPARATED, NEVER SUMMED (the user's ruling, 2026-09-18).** Only
// `effect: 'cash'` lines reconcile `openingBalance` to `closingBalance`; a `'wealth'` line is
// unrealised movement in what the Household owns. `MonthRow` therefore carries two line arrays and
// two nets, and there is no field in which the two are added. `cashNet` is asserted against the
// balances for every month of the demo walk.
//
// **THE ENGINE'S OWN WORDS ARE TRANSLATED HERE, AND NEVER REWRITTEN THERE (2026-09-20).** A
// `Month` carries strings written for an auditor — `Month.notes[].note`, `provenance.determination`,
// the caveat sentences, the confidence token — and they were reaching the screen verbatim: "low tax
// contributions", "SUBDIV 293-B ELECTION", "secondary-only", `tax.medicareLevy…singleLower`. The
// engine must keep saying exactly what it says: `test/core-*` pins those words, and they ARE the
// audit record. So the translation is here, and it takes one of two forms and no third:
//
//   * a **label decided from the engine's TYPE, never parsed out of its prose** —
//     `CONFIDENCE_LABELS` off the confidence union, `NOTE_TEXT_LABELS` off `MonthNote['subject']`,
//     `REGISTER_DETAILS` off `ProvenanceRegister`. A lookup on a union member cannot come to mean
//     something the member does not; a guess at what a sentence means can, and a confidently wrong
//     plain label is worse than the jargon it replaced.
//   * the engine's sentence kept **word for word** and put behind that label, for `renderTable.ts`
//     to fold into an `infoButton`. Nothing is dropped and nothing is paraphrased.
//
// What is NOT translated is recorded where it is met: `MonthLine.description` and the entry ids are
// composed by the engine out of Household data and cannot be re-read from a union here.
//
// **A BORROWED FY STAMP READS AS BORROWED (P5-4a).** `provenanceOf` emits the prior-year-fallback
// sentence and the ordinary out-of-year sentence from mutually exclusive branches; this file keeps
// them apart with `caveatKind`, gives each its own label, and marks the stamp itself when a
// borrowed figure is under it. Flattening the two is the exact risk P5-4a exists to catch — the
// Medicare low-income thresholds really do carry `priorYearFallbackFor: '2026-27'`.
// **THE MONEY IS IN TODAY'S DOLLARS BY DEFAULT (P2-7), AND THE EDIT BOXES ARE NOT.** Every figure
// this file formats is a figure to be READ, so it goes through the row's own `MoneyLens` and is
// printed in whole dollars (`displayMoney.ts` — the page shows no cents). The figures a person TYPES
// BACK — `entryForm.ts`'s echoes, `settingsPanel.ts`'s fields, and the `centsToDollars` in
// `planEdits.ts` that deliberately is not `formatDollars` — are on the other side of that boundary
// and are converted and rounded by nothing: showing a household an amount they never typed, in a
// box they are about to type into, corrupts the round trip and loses money on a save.
//
// **Each figure is rounded ON ITS OWN, and a total is never re-added from rounded parts.** Opening +
// net cash = closing, the lines add to their net, and the two people's assets add to the household's
// — all exactly, in cents. Printed to the dollar, a total can therefore sit a dollar away from the
// sum of the parts printed beside it. The alternative, printing the sum of the rounded parts, would
// show a closing balance the plan does not hold and let this month's closing differ from next
// month's opening.
import { formatDollars, wholeDollarsIn } from './displayMoney.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { moneyLens } from './todaysDollars.js';
import { superAccountName } from './entryLabels.js';
import { AGE_PENSION_LINE } from '../core/projection.js';
import type { MoneyBasis, MoneyLens } from './todaysDollars.js';
import type { Cents } from '../core/money.js';
import type { Person } from '../core/household.js';
import type {
  LineAttribution,
  LineProvenance,
  Month,
  MonthLine,
  MonthNote,
  MonthProvenance,
  PersonAssetFigures,
  WaterfallLimbNote,
} from '../core/plan.js';

/**
 * **The six strings, in one place so that no two of them can quietly become one.** Three for
 * `LineProvenance`'s members and three for `LineAttribution`'s. They are prose rather than codes
 * because the reader of a month table is the person deciding whether to trust the figure beside
 * them, and `'not carried'` as a bare token says nothing to them.
 */
export const PROVENANCE_LABELS = Object.freeze({
  legislated: 'Set by law',
  none: 'Not set by law — this comes from your own plan',
  'not carried': 'Set by law (rule not named here)',
} as const);

export const ATTRIBUTION_LABELS = Object.freeze({
  entries: 'Stated by these entries',
  none: 'No entry states this figure',
  'not attributed': 'An entry is behind this figure and this build cannot say which',
} as const);

/** `'wealth'` is spelled out, because a reader who reads it as cash has mis-read the balance. */
export const EFFECT_LABELS = Object.freeze({
  cash: 'Cash',
  wealth: 'Wealth only — no cash moved',
} as const);

/**
 * Which kind of caveat a sentence is. The three are distinguished on the wording `provenance.ts`
 * writes, which is the only signal that reaches a `MonthLine`: `FigureProvenance.caveats` is
 * `readonly string[]` and the branch that produced each line is not carried with it.
 *
 * `'borrowed'` must never be shown as `'out of year'`: the first says NO FIGURE EXISTS for the year
 * and last year's was used, the second says a figure exists and is stamped elsewhere.
 */
export type CaveatKind = 'borrowed' | 'out of year' | 'other';

export const CAVEAT_LABELS = Object.freeze({
  borrowed: 'Borrowed from an earlier year — no figure exists for this one',
  'out of year': 'Taken from a different financial year and applied to this one',
  other: 'Less certain than a fully checked figure',
} as const);

/**
 * The classifier. The two sentences come from mutually exclusive branches of `provenanceOf` and are
 * matched on the clause each branch alone writes; anything else is `'other'`, which is the
 * confidence sentence (`"… is secondary-only"`) and anything `withCaveats` adds.
 */
export const caveatKind = (caveat: string): CaveatKind =>
  caveat.includes('carried as a prior-year fallback for')
    ? 'borrowed'
    : caveat.includes('and was applied to FY')
      ? 'out of year'
      : 'other';

export interface CaveatCell {
  readonly kind: CaveatKind;
  readonly label: string;
  /**
   * The engine's own sentence, VERBATIM — `tax.medicareLevy.lowIncomeThresholds.singleLower is
   * stamped FY2025-26 …`. It is audit data written for someone checking the figure against the
   * rule, and it names its inputs by their internal keys; `label` is what stands on the page and
   * this opens behind it. Rewording it here would put a paraphrase of a citation on screen wearing
   * the authority of the citation.
   */
  readonly text: string;
}

const caveatCells = (caveats: readonly string[]): readonly CaveatCell[] =>
  Object.freeze(
    caveats.map((text) => {
      const kind = caveatKind(text);
      return Object.freeze({ kind, label: CAVEAT_LABELS[kind], text });
    }),
  );

/**
 * **HOW WELL CHECKED A FIGURE IS, SAID IN WORDS INSTEAD OF IN THE ENGINE'S TOKEN.**
 * `'secondary-only'` and `'primary-via-archive'` are internal labels from
 * `docs/assumptions-register.md` "How to read this", and they were being printed beside real dollar
 * figures under the heading "Confidence", where a reader who has not read that document cannot tell
 * which of them is the weak one.
 *
 * ⚠️ **A TRANSLATION MAY NOT LAUNDER CONFIDENCE UPWARD.** The register defines the weak three as
 * *not* read from the statute (`primary-via-archive`: primary content, non-primary channel;
 * `secondary-only`: corroboration only, no primary text; `unverified`: recorded, not confirmed), and
 * every label below says so in terms. The whole point of the field is lost if the plain words are
 * warmer than the token — so `test/app-month-to-rows.test.mjs` asserts that the three weak labels
 * each carry a negation and that the strong one does not.
 *
 * `'nothing carried'` is the fifth key and belongs to `MonthProvenance` alone: it is deliberately
 * NOT a `Confidence` (see `plan.ts`), and it must not read as a good score.
 */
export const CONFIDENCE_LABELS: Readonly<Record<MonthProvenance['confidence'], string>> =
  Object.freeze({
    'primary-verified': 'Checked against the law itself',
    'primary-via-archive':
      'Not read from the law directly — from official policy text, reached through a web archive',
    'secondary-only': 'Not checked against the law itself — other sources only',
    unverified: 'Written down but not confirmed against any source',
    'nothing carried': 'No figure in this month was worked out from a written rule',
  });

/**
 * **A REAL NAME KEEPS ITS NAME AND GETS A GLOSS.** These are the names of actual taxes and payments
 * — a household meets "Division 293" on an ATO notice and "Account-Based Pension" on a super
 * statement — so renaming them to something friendlier would leave a reader unable to match what is
 * on this screen to what is on that paper. The name stays and the explanation opens behind it.
 *
 * A name that needs no explaining ("Age Pension", "income tax") has no entry and gets no button.
 * Nothing here is inferred from the engine's own wording: each gloss states what the module that
 * emits the name computes (`div293.ts` ss 293-20(1) and 293-25, `superConcessional.ts`'s fund rate,
 * `incomeTax.ts`'s once-a-year assessment).
 */
export const REGISTER_DETAILS: Readonly<
  Partial<Record<MonthProvenance['registers'][number], string>>
> = Object.freeze({
  'Account-Based Pension minimum':
    'An Account-Based Pension is a super account that pays a regular income once the money can be' +
    ' reached. The law sets a smallest amount that must be taken out each financial year — a' +
    ' percentage of the account balance that rises with age. That is a floor, not a limit: the' +
    ' forecast takes out what the household needs, up to the whole balance, and at least the minimum.',
  'income tax on capital gain':
    'The income tax charged on the profit made when an investment is sold. It is worked out on the' +
    ' profit for the whole year, so what one sale adds is the amount by which it raises the year’s' +
    ' bill.',
  'income tax year-end true-up':
    'Income tax is worked out once, on the whole financial year. This is the difference between' +
    ' that and what was already paid month by month, and it can run either way — a bill or a refund.',
  'superannuation contributions tax':
    'The 15% a super fund pays on money going into it from an employer or from a salary sacrifice.' +
    ' It is paid by the fund, not by the person, so it shows up as less going in rather than as a' +
    ' bill.',
  'Division 293 tax':
    'A further 15% on money going into super, for a person whose income and those contributions' +
    ' together come to more than $250,000. It falls on the smaller of the two: the contributions,' +
    ' or the amount by which the pair passes $250,000.',
  'Division 293 tax year-end true-up':
    'The Division 293 charge — a further 15% on money going into super for a person whose income' +
    ' and contributions together pass $250,000 — is worked out once on the whole financial year.' +
    ' This is the difference between that and what was already charged month by month.',
});

/** What the `'none'` and `'not carried'` sentences ARE, said on the page before either opens. */
export const PROVENANCE_NOTE_LABELS = Object.freeze({
  none: 'What this figure rests on instead',
  'not carried': 'Why the rule behind it cannot be shown here',
} as const);

/**
 * **The `determination` list, and why it is folded rather than reworded.** `plan.ts` specifies it as
 * *"which limb of the register decided the figure, in that register's own terms"* — the terms are
 * the rule's, and they carry raw cent figures and section numbers. Paraphrasing a citation would put
 * this build's reading of a rule on screen in the place where the rule's own words belong, so the
 * words are kept and a plain sentence is put in front of them.
 */
export const DETERMINATION_DISCLOSURE = Object.freeze({
  label: 'Which part of the rule decided this figure',
  detail:
    'What follows is the working this build wrote down as it made the figure, in the words of the' +
    ' rule it applied and with the amounts in cents. It is kept exactly as it was written, so that' +
    ' it can be checked against the rule itself rather than against a retelling of it.',
} as const);

export interface ProvenanceCell {
  readonly basis: LineProvenance['basis'];
  /** One of `PROVENANCE_LABELS`. Never empty, never shared between two bases. */
  readonly label: string;
  /** The rule, where one is named — both `'legislated'` and `'not carried'` name one. */
  readonly register: string | null;
  /** The gloss of `register`, from `REGISTER_DETAILS`, or null where the name needs none. */
  readonly registerDetail: string | null;
  /** `FY2026-27`, or null where no figure was carried. */
  readonly stamp: string | null;
  /**
   * The stamp as it must be READ. A stamp with a borrowed figure under it is not an ordinary stamp,
   * and a reader who sees only `FY2026-27` has been told the year is covered when it is not.
   */
  readonly stampLabel: string | null;
  readonly borrowed: boolean;
  /** One of `CONFIDENCE_LABELS` — never the engine's own token. */
  readonly confidence: string | null;
  /**
   * Which part of the rule decided it, in the rule's own terms and with cent figures. Possibly
   * empty. Kept verbatim and shown behind `DETERMINATION_DISCLOSURE`.
   */
  readonly determination: readonly string[];
  readonly caveats: readonly CaveatCell[];
  /** The `'none'` / `'not carried'` sentence — the engine's own, kept verbatim and folded. */
  readonly note: string | null;
  /** What that sentence is, said plainly. Non-null exactly when `note` is. */
  readonly noteLabel: string | null;
}

export const provenanceCell = (provenance: LineProvenance): ProvenanceCell => {
  if (provenance.basis === 'legislated') {
    const caveats = caveatCells(provenance.caveats);
    const borrowed = caveats.some((c) => c.kind === 'borrowed');
    return Object.freeze({
      basis: 'legislated' as const,
      label: PROVENANCE_LABELS.legislated,
      register: provenance.register,
      registerDetail: REGISTER_DETAILS[provenance.register] ?? null,
      stamp: `FY${provenance.fy}`,
      stampLabel: borrowed
        ? `FY${provenance.fy}, in part from an earlier year's figures`
        : `FY${provenance.fy}`,
      borrowed,
      confidence: CONFIDENCE_LABELS[provenance.confidence],
      determination: Object.freeze([...provenance.determination]),
      caveats,
      note: null,
      noteLabel: null,
    });
  }
  return Object.freeze({
    basis: provenance.basis,
    label: PROVENANCE_LABELS[provenance.basis],
    register: provenance.basis === 'not carried' ? provenance.register : null,
    registerDetail:
      provenance.basis === 'not carried' ? REGISTER_DETAILS[provenance.register] ?? null : null,
    stamp: null,
    stampLabel: null,
    borrowed: false,
    confidence: null,
    determination: Object.freeze([]),
    caveats: Object.freeze([]),
    note: provenance.note,
    noteLabel: PROVENANCE_NOTE_LABELS[provenance.basis],
  });
};

export interface AttributionCell {
  readonly basis: LineAttribution['basis'];
  /** One of `ATTRIBUTION_LABELS`. Never empty, never shared between two bases. */
  readonly label: string;
  /** Never empty when `basis` is `'entries'`; always empty otherwise. */
  readonly entryIds: readonly string[];
  /**
   * What the page PRINTS for each of `entryIds`, in the same order — the entry's type, date and
   * description, as the entries table words it. An id is a key for a machine; a reader shown
   * `e9bbe6a0-…` cannot tell which of their decisions stands behind the figure.
   */
  readonly entryNames: readonly string[];
  /** The engine's own sentence, kept verbatim and folded behind `noteLabel`. */
  readonly note: string | null;
  /** What that sentence is, said plainly. Non-null exactly when `note` is. */
  readonly noteLabel: string | null;
}

/** What the `'none'` and `'not attributed'` sentences ARE, said before either opens. */
export const ATTRIBUTION_NOTE_LABELS = Object.freeze({
  none: 'What decided this figure instead',
  'not attributed': 'Why the entries behind it cannot be named',
} as const);

/**
 * Turns an entry id into the words a reader sees. `main.ts` builds the real one from the plan's
 * entries; the default returns the id unchanged, so a caller that has no plan (a test of the row
 * shape) still gets a row and the id is never silently dropped.
 */
export type EntryNamer = (id: string) => string;
export const ENTRY_IDS_AS_NAMES: EntryNamer = (id) => id;

export const attributionCell = (attribution: LineAttribution, name: EntryNamer = ENTRY_IDS_AS_NAMES): AttributionCell =>
  attribution.basis === 'entries'
    ? Object.freeze({
        basis: 'entries' as const,
        label: ATTRIBUTION_LABELS.entries,
        entryIds: Object.freeze([...attribution.entryIds]),
        entryNames: Object.freeze(attribution.entryIds.map(name)),
        note: null,
        noteLabel: null,
      })
    : Object.freeze({
        basis: attribution.basis,
        label: ATTRIBUTION_LABELS[attribution.basis],
        entryIds: Object.freeze([]),
        entryNames: Object.freeze([]),
        note: attribution.note,
        noteLabel: ATTRIBUTION_NOTE_LABELS[attribution.basis],
      });

export interface LineRow {
  readonly description: string;
  readonly direction: MonthLine['direction'];
  readonly effect: MonthLine['effect'];
  readonly effectLabel: string;
  /** Formatted, unsigned — `direction` carries the sign, exactly as on the `MonthLine`. */
  readonly amount: string;
  readonly provenance: ProvenanceCell;
  readonly attribution: AttributionCell;
}

/**
 * `money` is the row's OWN month's lens (`todaysDollars.ts`), bound once in `monthToRow` and handed
 * down. Required and positional: a default would be a second opinion about which money this line is
 * in, and a line printed in a basis its month did not choose is the confusion ADR-0001 names.
 */
export const lineRow = (line: MonthLine, money: MoneyLens, name: EntryNamer = ENTRY_IDS_AS_NAMES): LineRow =>
  Object.freeze({
    description: line.description,
    direction: line.direction,
    effect: line.effect,
    effectLabel: EFFECT_LABELS[line.effect],
    amount: formatDollars(money(line.amount)),
    provenance: provenanceCell(line.provenance),
    attribution: attributionCell(line.attribution, name),
  });

export interface NoteRow {
  readonly subject: MonthNote['subject'];
  /**
   * What the note's `subject` is CALLED on screen. The discriminant itself is an internal token
   * (`'waterfall limb'`) and was being printed as the head of the block; the wording of a union
   * member is decided here and never in the writer — see this file's header.
   */
  readonly subjectLabel: string;
  /** What the note is ABOUT — a source of money, or the name of a rule. */
  readonly of: string;
  readonly available: string | null;
  readonly drawn: string | null;
  /**
   * **The engine's own sentence, VERBATIM, and it is FOLDED — see `NOTE_TEXT_LABELS`.** It is
   * written for someone auditing the walk against the rules: it carries cent figures, section
   * numbers, internal ids and the build's own change history, and it was being printed open under
   * every month. It is kept word for word because it is the record; `noteLabel` is what stands on
   * the page in front of it.
   */
  readonly note: string;
  /** What `note` is ABOUT, in plain words. Never empty, and different for each `subject`. */
  readonly noteLabel: string;
  /**
   * The plain-English gloss of a real term in `of`, or `null` where the name needs none. The writer
   * puts it behind an info button; a term of art on screen with nothing to open is the jargon this
   * pass exists to remove, and a gloss printed in full beside every row is the paragraph it folds.
   */
  readonly detail: string | null;
}

/** What each member of `MonthNote`'s union is CALLED. Never the discriminant token itself. */
export const NOTE_SUBJECT_LABELS: Readonly<Record<MonthNote['subject'], string>> = Object.freeze({
  'waterfall limb': 'Money source',
  'parameter window': 'Rates used',
  'super withdrawal': 'Super withdrawal',
  'superannuation guarantee': 'Employer super',
  // **"Rates used" would have been the honest label for this too, and it is taken.** A window note
  // says no rates reached the month; this says old ones did. They share a subject in English and
  // must not share one on the page, so this names the AGE of the figure, which is the whole fact.
  'standing parameters': 'Rates carried forward',
  // Not "Pension minimum" — that is what the PAYMENT is called, and it has its own lines in the
  // months it is paid. This row is about the figure the year's minimum was worked out FROM.
  'pension minimum basis': 'Pension minimum: which balance it was worked out from',
  // It is NOT called "Salary sacrifice": there is none this month, and that is the point of the
  // row. The label says what happened to the arrangement, because the row exists to tell this
  // month's nothing apart from the five other kinds of nothing (`SuperContributionParams`).
  'salary sacrifice stopped': 'Salary sacrifice stopped',
  'investment distribution': 'Investment distribution',
  'pension at retirement': 'Super at retirement',
  'concessional cap exceeded': 'Over the before-tax super cap',
  'HEAS capacity cap reached': 'Home Equity Access Scheme — capacity reached',
});

const WATERFALL_LIMB_TITLES: Readonly<Record<WaterfallLimbNote['limb'], string>> =
  Object.freeze({
    salary: 'Salary',
    // The pension is two sources since 2026-09-23: what is still owed of the year's minimum, drawn
    // first, and the rest of the account, drawn after investments. Cash is two sources the same day,
    // split at what is owed on the home loan.
    accountBasedPensionMinimum: "Account-Based Pension, this year's minimum",
    cashAboveLoan: 'Cash not offsetting the home loan',
    nonSuperPortfolio: 'Investments',
    accountBasedPensionAboveMinimum: "Account-Based Pension, above this year's minimum",
    offsetAccount: 'Cash offsetting the home loan',
    releasedSuperannuation: 'Released superannuation',
  });

/**
 * **A real term keeps its real name and gets a gloss — it is not renamed to something friendlier.**
 * "Account-Based Pension" is what the account is called, and a household that reads its own
 * super statement will meet the same words there; replacing it with an invented plain phrase would
 * leave them unable to match the two. So the name stays and the explanation opens behind it.
 *
 * A source with nothing to explain has no entry here, and gets no button. The one gloss is READ FROM
 * `REGISTER_DETAILS` rather than written again: the same rule is named in a line's provenance and in
 * this note, and two copies of one explanation are two things that can be reworded apart.
 */
const WATERFALL_LIMB_DETAILS: Readonly<Partial<Record<WaterfallLimbNote['limb'], string>>> =
  Object.freeze({
    accountBasedPensionMinimum: REGISTER_DETAILS['Account-Based Pension minimum'],
    accountBasedPensionAboveMinimum: REGISTER_DETAILS['Account-Based Pension minimum'],
  });

/**
 * **WHAT EACH SUBJECT'S `note` IS, said before it opens.** Four labels for four members, and they
 * are different sentences because the four answer different questions — `plan.ts` specifies each:
 * a limb note says *"why `available` is that figure, above all why it is nil"*; a window note says
 * *"why nothing was computed, and which way the absence runs"*; a withdrawal note says *"why the tax
 * is nil, and the taxed-source assumption underneath it"*; a Guarantee note says *"what was
 * computed, what was NOT done with it, and the module's own caveats"*.
 *
 * The withdrawal label is a PREFIX, not the whole label: the tax figure itself must stay on the page
 * — folding a dollar amount away behind a disclosure would hide money — so the amount is composed
 * onto it in `noteRow` and the label reads as a fact with a figure in it.
 */
export const NOTE_TEXT_LABELS: Readonly<Record<MonthNote['subject'], string>> = Object.freeze({
  'waterfall limb': 'Why this is the most it could give this month',
  'parameter window': 'Why no figure could be worked out for this month, and which way that runs',
  'super withdrawal': 'Tax taken out of this withdrawal',
  'superannuation guarantee':
    'How this was worked out, what happens to it here, and what this build cannot promise about it',
  'standing parameters': 'How old the rates behind this figure are, and which way that runs',
  'pension minimum basis': 'Which balance this year’s minimum was worked out from, and how far out it could be',
  'salary sacrifice stopped': 'What stopping it changed from this month, and what it did not change',
  'investment distribution': 'What this added back in, and why no payment line carries it',
  'pension at retirement': 'What happened to this super at retirement, and why',
  'concessional cap exceeded': 'Over the cap — this forecast looks better than it should',
  'HEAS capacity cap reached': 'Why the loan payments stopped, and what keeps growing anyway',
});

/**
 * **A `switch` over `subject`, and it was a ternary until the third member arrived (2026-09-19).**
 * The two columns are read differently by each member and `MonthNote` is a discriminated union, so
 * a member added to the union without a branch here does not compile — which is how the third one
 * announced itself. The `default` is the exhaustiveness check and nothing else: `note` is `never`
 * there, so it cannot be turned into a fallback row that renders an unrecognised note as blanks.
 */
export const noteRow = (note: MonthNote, money: MoneyLens): NoteRow => {
  switch (note.subject) {
    case 'waterfall limb':
      return Object.freeze({
        subject: 'waterfall limb' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['waterfall limb'],
        of: WATERFALL_LIMB_TITLES[note.limb],
        available: formatDollars(money(note.available)),
        drawn: formatDollars(money(note.drawn)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['waterfall limb'],
        detail: WATERFALL_LIMB_DETAILS[note.limb] ?? null,
      });
    case 'parameter window':
      return Object.freeze({
        subject: 'parameter window' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['parameter window'],
        of: note.register,
        available: null,
        drawn: null,
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['parameter window'],
        detail: REGISTER_DETAILS[note.register] ?? null,
      });
    case 'standing parameters':
      // **BOTH money columns are blank, like a window note's and unlike every other member's.** The
      // money this note is about is already on the page as a LINE — carrying it here as well would
      // print one payment twice in one month, and a reader totting up the columns would double it.
      // What this row adds is the date, which is why `of` names the register AND the last day the
      // carried rates were in force: the figures themselves are identical to that day's, so the date
      // is the only thing on this row that a reader could not have seen already. `standingFrom` is
      // that last day (`LAST_PUBLISHED_PARAMETER_DAY`), not a date any rates were published for.
      return Object.freeze({
        subject: 'standing parameters' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['standing parameters'],
        of: `${note.register} — rates in force on ${note.standingFrom}, carried forward`,
        available: null,
        drawn: null,
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['standing parameters'],
        detail: REGISTER_DETAILS[note.register] ?? null,
      });
    case 'salary sacrifice stopped':
      // **BOTH money columns are blank, and nothing else would be honest.** No money moved: a nil
      // in either column would be a figure, and a reader would take it for an arrangement that
      // contributed nothing rather than for one that is over. The head carries the Person and the
      // date it stopped from, which is the whole of the fact.
      return Object.freeze({
        subject: 'salary sacrifice stopped' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['salary sacrifice stopped'],
        of: `${note.person} — stopped from ${note.stoppedFrom}`,
        available: null,
        drawn: null,
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['salary sacrifice stopped'],
        detail:
          'Salary sacrifice is money your employer puts into your super out of your pay, before tax.' +
          ' Stopping it means your whole pay is taxed as income again from this date; what you already' +
          ' put in stays in, and your employer’s own super payments carry on either way.',
      });
    case 'super withdrawal':
      // The two money columns carry what was ASKED FOR and what was PAID, which is the shape they
      // already have for a limb — the most the source could supply, and what came out of it — and
      // the head names the Person and the interest, because a Person may hold more than one.
      return Object.freeze({
        subject: 'super withdrawal' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['super withdrawal'],
        // The head names the account in the ENTRY TABLE's own words ("super account N", counted from
        // 1 — `superAccountName`), so this row and the entry that caused it name one account the same way
        // (P6-14, pinned in `test/app-month-to-rows.test.mjs`). The tax FIGURE is on the label as
        // well as in the folded text, where it stays on the page: folding a dollar amount away
        // behind a disclosure would hide money. Both copies read `note.taxWithheld`.
        of: `${note.person} — ${superAccountName(note.interestIndex)}`,
        available: formatDollars(money(note.requested)),
        drawn: formatDollars(money(note.paid)),
        note: `${wholeDollarsIn(note.note)} Tax withheld: ${formatDollars(money(note.taxWithheld))}.`,
        noteLabel: `${NOTE_TEXT_LABELS['super withdrawal']}: ${formatDollars(money(note.taxWithheld))} — why it is that figure, and what it assumes`,
        detail: null,
      });
    case 'superannuation guarantee':
      // **The two money columns are what the employer OWES FOR THE YEAR and what this build PAID
      // INTO SUPER THIS MONTH (P6-8 brief 3, chunk 2b).** The second was nil in every month until
      // the Guarantee was credited; it is now the month's own contribution, net of the fund's 15%,
      // and it is the same figure as the month's Guarantee line. The pair is the one the other
      // members carry — the most the source could supply, and what actually came out of it.
      //
      // ⚠️ **A BLANK in the first column with a FIGURE in the second is a real state and it is not
      // a bug**: it is a Person whose earnings exceed the floor under every year's maximum
      // contributions base in a year with no AWOTE index number, so what is owed on the earnings
      // above that floor cannot be derived. What was paid is still stated, and the note says in
      // terms that the rest is refused rather than nil — because a Guarantee that was not computed
      // and a Guarantee of nothing are different facts and this table has a blank for exactly that.
      return Object.freeze({
        subject: 'superannuation guarantee' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['superannuation guarantee'],
        of: `${note.person} — Superannuation Guarantee, for the year`,
        available: note.annualAmount === null ? null : formatDollars(money(note.annualAmount)),
        drawn: formatDollars(money(note.creditedToSuperannuation)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['superannuation guarantee'],
        detail:
          'The Superannuation Guarantee is the super an employer must pay on top of wages. The' +
          ' first figure is what is owed for the whole financial year; the second is what went into' +
          ' the super account this month, after the fund’s own 15% tax.',
      });
    case 'pension minimum basis':
      // **One money column, and the other is deliberately blank.** The pair every other member
      // carries is "what the source could supply" against "what came out of it"; this note is not a
      // source and nothing came out of it here. What it has is one figure — the year's minimum total
      // payment — and putting it in the second column keeps it under the same heading as the money
      // that was actually drawn, which is what it is a floor on.
      return Object.freeze({
        subject: 'pension minimum basis' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['pension minimum basis'],
        of: `${note.person} — the least this pension must pay in ${note.financialYear}`,
        available: null,
        drawn: formatDollars(money(note.minimumForTheYear)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['pension minimum basis'],
        detail:
          'The law sets a minimum you must take out of an account-based pension each year. It is' +
          ' worked out from what the account held on 1 July. This plan starts later in the year, so' +
          ' the balance on 1 July was never recorded and the balance you gave for the day the plan' +
          ' starts has been used instead. The figure can be a little high or a little low as a' +
          ' result; how much depends on what the account did in between.',
      });
    case 'investment distribution':
      // **One money column, like `pension minimum basis`, and for the same reason.** Nothing here
      // is a source and nothing came out of it: `distributed` is put in the second column, under
      // the same heading as an actual payment, because it is the one figure this row has.
      return Object.freeze({
        subject: 'investment distribution' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['investment distribution'],
        of: note.person,
        available: null,
        drawn: formatDollars(money(note.distributed)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['investment distribution'],
        detail:
          'Money your investments paid out this year, put straight back in rather than paid to you.' +
          ' It still counts as income for tax, and next year’s tax reflects it — see the year-end tax line.',
      });
    case 'pension at retirement':
      // **Both money columns are blank**: the switch moves no money, and the balance is the same the
      // day after. The head names the Person and the day, which is the whole of the fact.
      return Object.freeze({
        subject: 'pension at retirement' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['pension at retirement'],
        of: `${note.person} — retiring on ${note.retireDay}`,
        available: null,
        drawn: null,
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['pension at retirement'],
        detail:
          'When you retire at 60 or older, your super becomes an account-based pension: its earnings' +
          ' are no longer taxed, and you must take at least a yearly minimum out of it. Unlike' +
          ' accumulation super, it counts in the Age Pension assets test at any age.',
      });
    case 'concessional cap exceeded':
      // **One money column, the excess**, under the heading of money that moved: it is the part of
      // what went into super this year that the cap did not allow.
      return Object.freeze({
        subject: 'concessional cap exceeded' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['concessional cap exceeded'],
        of: `${note.person} — over the ${note.financialYear} cap by`,
        available: null,
        drawn: formatDollars(money(note.excessSoFar)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['concessional cap exceeded'],
        detail:
          'Your employer super and any salary sacrifice together are capped each year. Your pay rises' +
          ' with wages, so your employer super grows while a salary sacrifice stays the same, and the' +
          ' two can go over the cap. Tax on the amount over the cap is not worked out here, so the' +
          ' forecast looks better than it should. Lowering the sacrifice keeps you under it.',
      });
    case 'HEAS capacity cap reached':
      // **One money column, like `pension minimum basis`**: `capacity` is the ceiling this note
      // exists to name, put in the "available" column since it is the most the scheme could ever
      // supply; `debtAfter` is what the debt actually closed this month at, under the same heading
      // a limb's "drawn" figure uses.
      return Object.freeze({
        subject: 'HEAS capacity cap reached' as const,
        subjectLabel: NOTE_SUBJECT_LABELS['HEAS capacity cap reached'],
        of: 'Home Equity Access Scheme loan',
        available: formatDollars(money(note.capacity)),
        drawn: formatDollars(money(note.debtAfter)),
        note: wholeDollarsIn(note.note),
        noteLabel: NOTE_TEXT_LABELS['HEAS capacity cap reached'],
        detail:
          'The Home Equity Access Scheme lends against your home up to a limit set by your age and' +
          ' the home’s value. Once the loan reaches that limit, payments stop — but interest keeps' +
          ' being added to what you already owe.',
      });
    default: {
      const unreachable: never = note;
      throw new RangeError(`a MonthNote with no row: ${JSON.stringify(unreachable)}`);
    }
  }
};

export interface MonthProvenanceRow {
  readonly registers: readonly string[];
  /**
   * The registers that GOVERNED a figure this month whose provenance did not reach its line. Kept
   * as its own field, never merged into `registers`: a month that listed only `registers` would
   * read as though it had vouched for everything it reported.
   */
  readonly uncarried: readonly string[];
  readonly stamps: readonly string[];
  /** One of `CONFIDENCE_LABELS`, including the `'nothing carried'` one. Never the token. */
  readonly confidence: string;
  readonly caveats: readonly CaveatCell[];
  /** True when any caveat is a prior-year fallback — P5-4a, at the month level. */
  readonly borrowed: boolean;
}

export const monthProvenanceRow = (provenance: MonthProvenance): MonthProvenanceRow => {
  const caveats = caveatCells(provenance.caveats);
  return Object.freeze({
    registers: Object.freeze([...provenance.registers]),
    uncarried: Object.freeze([...provenance.uncarried]),
    stamps: Object.freeze(provenance.stamps.map((fy) => `FY${fy}`)),
    confidence: CONFIDENCE_LABELS[provenance.confidence],
    caveats,
    borrowed: caveats.some((c) => c.kind === 'borrowed'),
  });
};

/**
 * **P7-6 UI — which position a month reports, the Household's or the Persons'.** The Household
 * scalars are the DEFAULT and are on every row in both views; `'person'` is a widening beside them
 * and never a replacement, and `Month.assetsByPerson` is read in that branch alone.
 *
 * The labels are carried here rather than looked up later because the ONLY honest source of them is
 * `household.persons` BY POSITION (`plan.ts`: a `PersonAssetFigures` deliberately carries no name,
 * because two Persons may share one and a name match would silently pool them). Making the labels a
 * required field of the `'person'` member is what stops the split being rendered with no way to say
 * whose figures are whose.
 */
export type AssetsView =
  | { readonly mode: 'household' }
  | { readonly mode: 'person'; readonly labels: readonly string[] };

/** The default, and the one every caller that says nothing gets. */
export const HOUSEHOLD_ASSETS: AssetsView = Object.freeze({ mode: 'household' });

/**
 * The Person labels, **by index and by nothing else**. Two Persons of one Household may be given
 * the same name, so a duplicated name has its POSITION appended to both labels — otherwise the
 * split would put two identical headings over two different sets of figures, which reads as one
 * Person reported twice. A blank name (which `parsePlan` permits) becomes its position too: a
 * heading of `''` over a column of money says nothing at all about whose money it is.
 */
export const personLabels = (persons: readonly Person[]): readonly string[] => {
  const names = persons.map((person) => person.name);
  return Object.freeze(
    names.map((name, index) =>
      name.trim() === ''
        ? `Person ${index + 1}`
        : names.filter((other) => other === name).length > 1
          ? `${name} (person ${index + 1})`
          : name,
    ),
  );
};

export interface PersonAssetRow {
  /** The position in `household.persons` this belongs to. Never a name match. */
  readonly index: number;
  readonly label: string;
  readonly protectedAssets: string;
  readonly assessableAssets: string;
  readonly accessibleAssets: string;
}

/**
 * **What the split says about its own SHAPE.** A one-Person Household is not half a couple, and a
 * page that printed one block of figures under both shapes would leave a reader of the second
 * wondering whose the missing half was.
 */
export const SPLIT_SHAPE_LABELS = Object.freeze({
  1: 'This Household holds one Person. These are that Person’s own figures; the Offset Account below is the rest of what the Household holds.',
  2: 'Two Persons, in the Household’s own order. Neither column includes the Offset Account, which is below.',
} as const);

/**
 * **The Offset Account in the split view, and the decision it records (P7-6 UI).** The engine
 * attributes it to NEITHER Person on purpose (`plan.ts`: it is a Household account under P4-3b and
 * no one was ever asked who owns a share of it), so the members do not sum to the Household
 * scalars. Dropping it from the split would hide money; folding it into a Person would invent an
 * owner. It is therefore shown as its own third block, named as the Household's, and pointed at the
 * two figures that already report it in full on the same row — `openingBalance` and
 * `closingBalance`, at their own two clocks, neither of them re-timed here.
 */
export const OFFSET_ATTRIBUTION = Object.freeze({
  label: 'Offset Account — the Household’s, and no Person’s',
  /**
   * ⚠️ **TWO KEYS, AND `test/app-month-to-rows.test.mjs` PINS THAT COUNT** (`Object.keys(offset)`).
   * The mechanics that used to fill this note are now a disclosure in `renderTable.ts`, which is the
   * layer that can fold them; a third key here would break that pin rather than fail silently.
   */
  note: 'No Person owns a share of it, so it is in neither set of figures above.',
} as const);

export interface AssetsSplitRows {
  /** One member per Person, in `household.persons` order. Both tuple shapes are real. */
  readonly persons: readonly [PersonAssetRow] | readonly [PersonAssetRow, PersonAssetRow];
  readonly shape: string;
  readonly offset: typeof OFFSET_ATTRIBUTION;
}

const personAssetRow = (
  figures: PersonAssetFigures,
  label: string,
  index: number,
  money: MoneyLens,
): PersonAssetRow =>
  Object.freeze({
    index,
    label,
    protectedAssets: formatDollars(money(figures.protectedAssets)),
    assessableAssets: formatDollars(money(figures.assessableAssets)),
    accessibleAssets: formatDollars(money(figures.accessibleAssets)),
  });

/**
 * **Both tuple shapes, written out.** `.map` over the tuple would compile and would quietly accept
 * a labels array of the wrong length, pairing person 0's money with person 1's name; the length
 * check and the two explicit branches are what make that a refusal instead of a mislabelled figure.
 */
const assetsSplitRows = (
  figures: Month['assetsByPerson'],
  labels: readonly string[],
  money: MoneyLens,
): AssetsSplitRows => {
  if (labels.length !== figures.length) {
    throw new RangeError(
      `the split view was given ${labels.length} Person label(s) for ${figures.length} Person(s) of figures`,
    );
  }
  const persons: readonly [PersonAssetRow] | readonly [PersonAssetRow, PersonAssetRow] =
    figures.length === 1
      ? Object.freeze([personAssetRow(figures[0], labels[0] as string, 0, money)] as const)
      : Object.freeze([
          personAssetRow(figures[0], labels[0] as string, 0, money),
          personAssetRow(figures[1] as PersonAssetFigures, labels[1] as string, 1, money),
        ] as const);
  return Object.freeze({
    persons,
    shape: SPLIT_SHAPE_LABELS[figures.length],
    offset: OFFSET_ATTRIBUTION,
  });
};

/**
 * **What the outstanding home-loan balance is CALLED on screen (P3-16 slice 2).** The engine's
 * field is `Month.mortgageBalance`; this is the sentence a person would say about it. It names the
 * two things a bare figure would leave a reader to guess — that it is what is still OWED, and that
 * it is read at the END of the month, which is the clock `closingBalance` beside it is on.
 */
export const HOME_LOAN_OWING_LABEL = 'Still owing on your home loan, at the end of the month';

/**
 * The one thing about that figure a reader can get wrong: it is a debt, and NOTHING on this row is
 * net of it. Folded behind the label by `renderTable.ts`, on the file's standing rule.
 */
export const HOME_LOAN_OWING_DETAIL =
  'What is left to pay on the loan after this month’s repayment. It is a debt and none of the figures above are' +
  ' net of it: this forecast puts no value on the home itself, so there is nothing here to set the loan against.' +
  ' A figure of $0 means the loan is paid off.';

export interface MonthRow {
  readonly month: string;
  readonly openingBalance: string;
  readonly closingBalance: string;
  /** The lines that reconcile the two balances, and only those. */
  readonly cashLines: readonly LineRow[];
  /** Unrealised movement. Reported beside the cash lines and NEVER added to them. */
  readonly wealthLines: readonly LineRow[];
  /**
   * Cash inflows less cash outflows, formatted. `openingBalance + cashNet === closingBalance` — to
   * the cent in the future-dollars view, and **within one cent** in today's money, because each of
   * the three is converted and rounded on its own (`todaysDollars.ts` says why that is the rule and
   * what the alternative would cost).
   */
  readonly cashNet: string;
  /** Wealth inflows less wealth outflows, formatted. Reconciles nothing, by construction. */
  readonly wealthNet: string;
  readonly notes: readonly NoteRow[];
  /** The entries that GOVERNED the month — not the same question a line's attribution answers. */
  readonly appliedEntryIds: readonly string[];
  /** What the page prints for each of `appliedEntryIds`, same order — see `AttributionCell.entryNames`. */
  readonly appliedEntryNames: readonly string[];
  readonly protectedAssets: string;
  readonly assessableAssets: string;
  readonly accessibleAssets: string;
  /**
   * **The per-Person split, or `null` — and `null` is the default (P7-6 UI).** Non-null only when
   * the caller asked for `AssetsView` `'person'`; in the Household view `Month.assetsByPerson` is
   * not read at all, so the default view cannot be broken by anything in the breakdown. The three
   * scalars above are present either way and are never replaced by this.
   */
  readonly assetsByPerson: AssetsSplitRows | null;
  /**
   * **What is still owed on the home loan, formatted — or `null` where the month reports no loan**
   * (P3-16 slice 2). `null` and `'$0.00'` are different facts and are kept apart: the first is a
   * household with no mortgage at this month, the second is a loan that has been paid off. Through
   * the row's own `MoneyLens`, exactly as every other figure here is, so the debt is in the same
   * money as the balances it sits beside.
   */
  readonly homeLoanOwing: string | null;
  /** `Month.superBalance`, formatted: every interest of every Person at the close. `$0.00` with none. */
  readonly superBalance: string;
  /**
   * **Investments and total wealth, both at the month's CLOSE** — the point `closingBalance` and
   * `superBalance` are read at. `totalWealth` is `closingBalance + superBalance +
   * closingNonSuperPortfolio + (radHeld ?? 0) - (heasDebt ?? 0)` summed in cents and converted
   * once, so the three columns before it plus a held RAD (P14-16; absent for every walk with no
   * `ENTER_CARE`) make it up exactly before rounding, LESS a HEAS debt (P9-1, slice 1; absent for
   * every walk with no `HEAS_DRAW`) — the one figure here that SUBTRACTS, because it is real cash
   * already counted in `closingBalance` that the household owes back, not an asset. The charts read
   * the month's OPENING, so this figure is the chart's point for the FOLLOWING month, not this one.
   */
  readonly investments: string;
  readonly totalWealth: string;
  /** `Month.incomeFromSuper`, formatted: cash paid out of super into the Household. `$0.00` when none. */
  readonly incomeFromSuper: string;
  /** The month's `AGE_PENSION_LINE` inflow. `$0.00` before Age Pension age and in any month none is paid. */
  readonly agePension: string;
  readonly provenance: MonthProvenanceRow;
}

/** The table's three headings for the fields above — plain words, no engine terms. */
export const TOTAL_SUPER_LABEL = 'Total super';
export const INCOME_FROM_SUPER_LABEL = 'Income from super';
export const AGE_PENSION_LABEL = 'Age Pension';

/** The two total-wealth headings, each with the sentence folded behind it by `renderTable.ts`. */
export const INVESTMENTS_LABEL = 'Investments';
export const INVESTMENTS_DETAIL =
  'Shares and other investments held outside super, at what they are worth at the end of the month,' +
  ' after anything bought or sold this month. Your home is not in it.';
export const TOTAL_WEALTH_LABEL = 'Total wealth';
export const TOTAL_WEALTH_DETAIL =
  'What the household holds at the end of the month: its cash, its super and its investments, so it is' +
  ' Closing + Total super + Investments. The chart plots the start of each month, so this figure is the' +
  ' chart’s point for the following month less this month’s investment growth and super contributions,' +
  ' which are added at the very end of the month. Your home is not counted and nothing is taken off for a' +
  ' home loan, the same as the chart. Each figure is rounded on its own, so the three can add up a dollar' +
  ' differently from this total.';

/** The month's Age Pension, compared WHOLE — the line carries no name, so there is nothing to take apart. */
export const agePensionPaid = (lines: readonly MonthLine[]): Cents =>
  lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((sum, line) => sum + line.amount, 0) as Cents;

/** Inflow positive, outflow negative, over one effect axis. Plain cents; never crosses the axes. */
export const net = (lines: readonly MonthLine[], effect: MonthLine['effect']): Cents =>
  lines
    .filter((line) => line.effect === effect)
    .reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0) as Cents;

/**
 * **ONE LENS PER ROW, BUILT ONCE HERE (P2-7).** `basis` says which money this table is showing;
 * `money` binds it to THIS month, and every figure below — the two balances, both nets, every line,
 * every note's two money columns, the three Household scalars and each Person's three — goes through
 * that one lens. A row therefore cannot mix bases: there is no route by which one figure is in
 * today's money and the one beside it is not, which is the case ADR-0001 calls the sharpest — a
 * capital gain shown in today's money whose tax was assessed on the future amount. The gain and its
 * tax are two `MonthLine`s of the same month and are converted identically; what the tax was
 * actually computed ON is said in `TODAYS_MONEY_NOTICE`, not implied by the figure.
 *
 * `basis` is positional and required, ahead of the optional `view`, and there is no default:
 * `todaysDollars.ts` holds the default VIEW, `public/index.html` carries it on the markup, and a
 * default here would be a third place that decides which money the page is in.
 */
export const monthToRow = (
  month: Month,
  basis: MoneyBasis,
  view: AssetsView = HOUSEHOLD_ASSETS,
  name: EntryNamer = ENTRY_IDS_AS_NAMES,
): MonthRow => {
  const money = moneyLens(basis, month.month);
  return Object.freeze({
    month: month.month,
    openingBalance: formatDollars(money(month.openingBalance)),
    closingBalance: formatDollars(money(month.closingBalance)),
    cashLines: Object.freeze(
      month.lines.filter((line) => line.effect === 'cash').map((line) => lineRow(line, money, name)),
    ),
    wealthLines: Object.freeze(
      month.lines.filter((line) => line.effect === 'wealth').map((line) => lineRow(line, money, name)),
    ),
    cashNet: formatDollars(money(net(month.lines, 'cash'))),
    wealthNet: formatDollars(money(net(month.lines, 'wealth'))),
    notes: Object.freeze(month.notes.map((note) => noteRow(note, money))),
    appliedEntryIds: Object.freeze([...month.appliedEntryIds]),
    appliedEntryNames: Object.freeze(month.appliedEntryIds.map(name)),
    protectedAssets: formatDollars(money(month.protectedAssets)),
    assessableAssets: formatDollars(money(month.assessableAssets)),
    accessibleAssets: formatDollars(money(month.accessibleAssets)),
    // The one read of `month.assetsByPerson` in this file, and it is inside the `'person'` branch.
    assetsByPerson:
      view.mode === 'person' ? assetsSplitRows(month.assetsByPerson, view.labels, money) : null,
    // Through the SAME lens as the balances above — a debt shown in future dollars beside a balance
    // in today's money is the mixed-basis row this function's header exists to prevent.
    homeLoanOwing: month.mortgageBalance === undefined ? null : formatDollars(money(month.mortgageBalance)),
    superBalance: formatDollars(money(month.superBalance)),
    investments: formatDollars(money(month.closingNonSuperPortfolio)),
    // P14-16 — `month.radHeld` (a refundable RAD, net of retention) is ABSENT for every walk with no
    // `ENTER_CARE`, so `?? 0` leaves every existing figure byte-for-byte unchanged. P9-1 slice 1
    // widens this the same way: `month.heasDebt` is ABSENT for every walk with no `HEAS_DRAW`, and
    // it SUBTRACTS — see `totalWealth`'s own doc for why the sign differs from `radHeld`.
    totalWealth: formatDollars(
      money((month.closingBalance + month.superBalance + month.closingNonSuperPortfolio + (month.radHeld ?? 0) - (month.heasDebt ?? 0)) as Cents),
    ),
    incomeFromSuper: formatDollars(money(month.incomeFromSuper)),
    agePension: formatDollars(money(agePensionPaid(month.lines))),
    provenance: monthProvenanceRow(month.provenance),
  });
};

/**
 * `(month) => monthToRow(month, basis, view)` and NOT `map(monthToRow)`: `Array.prototype.map` passes
 * the index as the second argument, which would hand every row after the first a number where the
 * basis belongs.
 */
export const monthsToRows = (
  months: readonly Month[],
  basis: MoneyBasis,
  view: AssetsView = HOUSEHOLD_ASSETS,
  name: EntryNamer = ENTRY_IDS_AS_NAMES,
): readonly MonthRow[] => Object.freeze(months.map((month) => monthToRow(month, basis, view, name)));
