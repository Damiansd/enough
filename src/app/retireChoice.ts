// Retire flow S1 (user rulings 2026-09-29): choosing Retire asks one question, "stopping work for
// good" or "cutting down with a transition to retirement pension", and each answer writes its own
// entries.
//
// - For good writes `RETIRE`, as before (SISR Sch 1 item 101, reg 6.01(7)(b)(i)). Its note is read
//   off `retirementSwitches`, the expression the walk reads, so the page cannot promise a switch the
//   walk does not make. Nothing here tests an age for it.
// - A TTR writes a `WORK_PATTERN_CHANGE` and never a `RETIRE`: a TTR is not a retirement (item 110).
//   It is offered only at 60 to 64 on the date. Where no TTR is running by then (none stated as
//   started by the plan's date, and no `TTR_START` for the Person on or before the date), it also
//   writes a `TTR_START` on the same date naming the account the pension is paid from (S4, user
//   ruling 2026-09-29), or the account money moves out of into a new one, with the amount (RF-3).
//
// Pure: no DOM, no clock, no randomness. `entryForm.ts` shows the words and passes the ids in.
import { conditionOfRelease } from '../core/conditionOfRelease.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Household } from '../core/household.js';
import type { Entry, EntryOwner } from '../core/plan.js';
import { retirementSwitches, workSpells } from '../core/retirementPension.js';
import { toCents } from '../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { IsoDate } from '../data/assumptions/types.js';
import type { LabelledOption } from './entryLabels.js';
import { ownerLabel } from './ownerNames.js';
import { retireEntry, ttrStartEntry, workPatternChangeEntry } from './planEdits.js';
import type { WorkPatternChangeFormValues } from './planEdits.js';

export type RetireChoice = 'forGood' | 'ttr';

export const RETIRE_CHOICES: readonly LabelledOption<RetireChoice>[] = [
  { value: 'forGood', label: 'Stopping work for good' },
  { value: 'ttr', label: 'Cutting down, with a transition to retirement (TTR) pension' },
];

export const FOR_GOOD_SUMMARY = 'What stopping for good does';
export const FOR_GOOD_DETAIL =
  'From this date the forecast pays no more salary. If you are old enough to take your super, any' +
  ' account still building up becomes an account-based pension on this date: its earnings are no longer' +
  ' taxed, and it pays you at least a minimum each year. Your fund does not do this by itself, so ask it' +
  ' to. Stopping work younger than that does not unlock your super early.';

export const TTR_CHOICE_SUMMARY = 'What cutting down does';
export const TTR_CHOICE_DETAIL =
  'For someone who keeps working, on fewer days or the same, and draws a transition to retirement' +
  ' pension. This changes the days and pay from this date. If no pension is running yet, it also starts' +
  ' one on this date. Type the amount to move and the forecast opens a new account for the pension,' +
  ' taking the amount out of the super account you choose, where your employer keeps paying. Or leave' +
  ' the amount blank and choose a second account you have already set up for it. It becomes a normal' +
  ' pension when you stop work for good, or by itself at the age the law sets.';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const PERSON_OWNERS: readonly EntryOwner[] = ['personA', 'personB'];

/**
 * The TTR answer's own `WORK_PATTERN_CHANGE`, as the spells read it: someone cutting down keeps
 * working, so it is a return to work on the date after a stop.
 */
const withCandidate = (entries: readonly Entry[], owner: string, date: IsoDate): readonly Entry[] => [
  ...entries,
  { id: '', date, owner: owner as EntryOwner, type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 1, annualSalary: toCents(0) }, enabled: true, createdAt: date },
];

/** The owner's latest stop on or before `date`, with the candidate included; `undefined` for none. */
const latestStop = (household: Household, entries: readonly Entry[], owner: string, date: IsoDate): IsoDate | undefined => {
  const index = PERSON_OWNERS.indexOf(owner as EntryOwner);
  return (workSpells(household, withCandidate(entries, owner, date))[index] ?? []).filter((change) => change.kind === 'stopped' && change.date <= date).at(-1)?.date;
};

/**
 * Whether the TTR answer must also start the pension: nothing stated as a `ttr` account that had
 * started by the plan's date, and no `TTR_START` of the owner's dated on or before `date` in
 * `entries` (the active Scenario's). After a stop (RF-2) only a start since the latest stop counts,
 * and a stated one only where the switch at that stop did not convert it.
 */
export const ttrStartNeeded = (household: Household, entries: readonly Entry[], owner: string, date: string, asAtDate: IsoDate): boolean => {
  const index = PERSON_OWNERS.indexOf(owner as EntryOwner);
  const person = household.persons[index];
  if (person === undefined) return false;
  const stopped = ISO_DATE.test(date) ? latestStop(household, entries, owner, date as IsoDate) : undefined;
  const decided = stopped === undefined ? undefined : retirementSwitches(household, entries, asAtDate)[index];
  const stated = person.superInterests.some((interest, slot) =>
    interest.phase === 'ttr' && interest.statedStreamSettings !== undefined && interest.statedStreamSettings.commencementDay <= asAtDate &&
    !(decided?.kind === 'switches' && decided.slots.includes(slot) && decided.retireDay <= date));
  const started = entries.some((entry) => entry.enabled && entry.type === 'TTR_START' && entry.owner === owner && entry.date <= date && (stopped === undefined || entry.date > stopped));
  return !stated && !started;
};

/**
 * Why the TTR answer cannot be taken for this owner on this date, or `undefined` when it can. The
 * two ages are `conditionOfRelease`'s own: stopping work on the date would release super (60 or
 * older), and super is not already free without stopping (under 65). Where the answer must start
 * the pension (`ttrStartNeeded`), the things `parsePlan` would refuse the `TTR_START` for that the
 * page can see first: a date before the plan's, being stopped on the date (this answer's own work
 * change counts as a return after a stop, RF-2), no second account still building up, and no second
 * account left once the first stop's switch is taken out. With an amount to move (RF-3) the pension
 * gets a new account, so one account still building up is enough.
 */
export const ttrRefusal = (household: Household, entries: readonly Entry[], owner: string, date: string, asAtDate: IsoDate, withAmount = false): string | undefined => {
  const index = PERSON_OWNERS.indexOf(owner as EntryOwner);
  const person = household.persons[index];
  if (person === undefined) return 'Choose one person: a transition to retirement pension is one person’s own.';
  if (!ISO_DATE.test(date) || date < person.dateOfBirth) return 'Choose the date first.';
  const on = date as IsoDate;
  const name = ownerLabel(household, owner as EntryOwner);
  const stoppingReleases = conditionOfRelease({ dateOfBirth: person.dateOfBirth, on, gainfulEmployment: { ceased: true, ceasedOn: on } }).met;
  if (!stoppingReleases) return `${name} is under 60 on this date, and a transition to retirement pension can’t start before 60.`;
  const alreadyFree = conditionOfRelease({ dateOfBirth: person.dateOfBirth, on, gainfulEmployment: { ceased: false } }).met;
  if (alreadyFree) return `${name} is 65 or older on this date, so their super is already free to use. Choose Stopping work for good, or Change work hours and pay.`;
  if (!ttrStartNeeded(household, entries, owner, date, asAtDate)) return undefined;
  if (on < asAtDate) return `This date is before the plan starts. A transition to retirement pension ${name} already has goes under Household and settings.`;
  // RF-2: with this answer's own return included, refused only while stopped on the date.
  const spells = workSpells(household, withCandidate(entries.filter((entry) => entry.enabled), owner, on))[index] ?? [];
  const latest = spells.filter((change) => change.date <= on).at(-1);
  if (latest?.kind === 'stopped') {
    return `${name} already stops work for good on ${latest.date} in this plan, which turns their super into a full pension. A transition to retirement pension can’t start after that.`;
  }
  const needed = withAmount ? 1 : 2;
  const building = person.superInterests.filter((interest) => interest.phase === 'accumulation').length;
  if (building < needed) {
    return withAmount
      ? `${name} has no super account still building up, so there is nothing to move into a transition to retirement pension.`
      : `${name}’s employer keeps paying into their super account, so the pension needs its own account. Type the amount to move into it, or add a second super account under Household and settings and choose it here.`;
  }
  const decided = retirementSwitches(household, entries, asAtDate)[index];
  const kept = person.superInterests.filter((interest, slot) =>
    interest.phase === 'accumulation' && !(decided?.kind === 'switches' && decided.slots.includes(slot) && decided.retireDay <= on)).length;
  if (kept < needed) {
    return `${name}’s super became a full pension when ${name} stopped work on ${(decided as { readonly retireDay: IsoDate }).retireDay}, so no account is left to start a transition to retirement pension from. It needs ${withAmount ? 'an account' : 'a second account'} kept in accumulation at retirement.`;
  }
  return undefined;
};

/**
 * The one-line notes for "stopping work for good" on this date: that the forecast starts an
 * account-based pension and the fund must be asked to, or that stopping before 60 does not unlock
 * super. Read off `retirementSwitches` with the candidate added, so an earlier Retire, a kept-out
 * account or a pension already held says nothing here, exactly as the walk switches nothing.
 */
export const forGoodLines = (
  household: Household,
  entries: readonly Entry[],
  asAtDate: IsoDate,
  owner: string,
  date: string,
): readonly string[] => {
  if (!ISO_DATE.test(date) || !(owner === 'household' || PERSON_OWNERS.includes(owner as EntryOwner))) return [];
  const on = date as IsoDate;
  const candidate: Entry = { id: '', date: on, owner: owner as EntryOwner, type: 'RETIRE', params: {}, enabled: true, createdAt: on };
  if (household.persons.some((person) => on < person.dateOfBirth)) return [];
  return retirementSwitches(household, [...entries, candidate], asAtDate).flatMap((decided, index) => {
    if (decided.kind !== 'switches' && decided.kind !== 'underPreservationAge') return [];
    if (decided.retireDay !== on) return [];
    const name = ownerLabel(household, PERSON_OWNERS[index]!);
    return decided.kind === 'switches'
      ? [`The forecast assumes ${name}’s super fund starts an account-based pension on this date. Ask the fund to do it.`]
      : [`Stopping work before 60 doesn’t let ${name} take super early.`];
  });
};

export interface RetireChoiceFormValues extends WorkPatternChangeFormValues {
  /** The account the pension is paid from, counted from 1, as typed. Read only when a start is needed. */
  readonly ttrInterestIndex: string;
  /** The yearly rate as a percent, as typed; blank pays the minimum. Read only when a start is needed. */
  readonly ttrRatePercent: string;
  /** RF-3: the dollars to move into a new account for the pension, as typed; blank names an account already set up. */
  readonly ttrAmount: string;
}

export type RetireChoiceResult = { readonly refused: string } | { readonly entries: readonly unknown[] };

/**
 * The entries one answer writes. For good: one `RETIRE` (the days and salary boxes are not read).
 * TTR: one `WORK_PATTERN_CHANGE`, and a `TTR_START` on the same date where `ttrStartNeeded`, only
 * when `ttrRefusal` has nothing to say. `newId` is called once per entry written.
 */
export const retireChoiceEntries = (
  household: Household,
  entries: readonly Entry[],
  asAtDate: IsoDate,
  choice: string,
  values: RetireChoiceFormValues,
  newId: () => string,
  createdAt: string,
): RetireChoiceResult => {
  if (choice === 'forGood') {
    return { entries: [retireEntry({ date: values.date, owner: values.owner, note: values.note }, newId(), createdAt)] };
  }
  if (choice === 'ttr') {
    const refused = ttrRefusal(household, entries, values.owner, values.date, asAtDate, values.ttrAmount.trim() !== '');
    if (refused !== undefined) return { refused };
    const work = workPatternChangeEntry(values, newId(), createdAt);
    if (!ttrStartNeeded(household, entries, values.owner, values.date, asAtDate)) return { entries: [work] };
    const start = ttrStartEntry(
      { date: values.date, owner: values.owner, note: values.note, interestIndex: values.ttrInterestIndex, drawdownRatePercent: values.ttrRatePercent, amount: values.ttrAmount },
      newId(),
      createdAt,
    );
    return { entries: [work, start] };
  }
  return { refused: 'Choose whether you are stopping work for good or cutting down.' };
};
