// The "still working at the end of the plan" warning (user request, 2026-09-23).
//
// A salary stops only on a `RETIRE` entry, or on a `WORK_PATTERN_CHANGE` to zero days. A scenario
// that switches off a HOUSEHOLD `RETIRE` and adds one Person's own `RETIRE` in its place therefore
// leaves the other Person paid until the plan's last month, and nothing on the page said so. That is
// the flattering direction: the forecast looks better for a reason the user never chose. Found when
// a "retire at 64" scenario out-lasted the "retire at 67" one it was cloned from.
//
// Pure: takes a Household and the scenario's resolved entries (switched-off ones included, so the
// sentence can name the Retire that would have covered the Person), returns one sentence per Person.
import type { Entry, EntryOwner } from '../core/plan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Household } from '../core/household.js';
import { ownerLabel } from './ownerNames.js';
import { retirementSwitches, workSpells } from '../core/retirementPension.js';
import type { IsoDate } from '../data/assumptions/types.js';

const PERSON_KEYS: readonly EntryOwner[] = ['personA', 'personB'];

const reaches = (entry: Entry, key: EntryOwner): boolean => entry.owner === 'household' || entry.owner === key;

/**
 * Whether Person `index` is still paid a salary in the plan's last month. A switched-on `RETIRE`
 * reaching them stops the salary unless they go back to work after it (`workSpells`, the walk's own
 * expression). Otherwise the last switched-on `WORK_PATTERN_CHANGE` reaching them, if any, decides,
 * and failing that the Household's stated wage does.
 */
const paidToTheEnd = (household: Household, entries: readonly Entry[], index: number): boolean => {
  const key = PERSON_KEYS[index]!;
  const on = entries.filter((entry) => entry.enabled && reaches(entry, key));
  if (workSpells(household, entries)[index]?.at(-1)?.kind === 'stopped') return false;
  let latest: Entry | undefined;
  for (const entry of on) {
    if (entry.type === 'WORK_PATTERN_CHANGE' && (latest === undefined || entry.date >= latest.date)) latest = entry;
  }
  if (latest !== undefined && latest.type === 'WORK_PATTERN_CHANGE') return latest.params.annualSalary > 0;
  return (household.persons[index]?.employmentIncomePerFortnight ?? 0) > 0;
};

/** One plain-English sentence per Person who is still paid a salary when the plan ends. Empty when nobody is. */
export const stillWorkingWarnings = (household: Household, entries: readonly Entry[]): readonly string[] => {
  const warnings: string[] = [];
  household.persons.forEach((_, index) => {
    if (!paidToTheEnd(household, entries, index)) return;
    const key = PERSON_KEYS[index]!;
    const name = ownerLabel(household, key);
    const back = workSpells(household, entries)[index]?.at(-1);
    if (back !== undefined) {
      warnings.push(`${name} is still paid a salary when the plan ends: ${name} goes back to work on ${back.date} and doesn't stop again in this scenario. Add a later Retire entry for ${name} if that isn't what you meant.`);
      return;
    }
    const off = entries.filter((entry) => !entry.enabled && entry.type === 'RETIRE' && reaches(entry, key));
    const hint = off.length === 0
      ? ` Add a Retire entry for ${name} if that isn't what you meant.`
      : ` A Retire entry that would stop it is switched off here (${off.map((entry) => `${ownerLabel(household, entry.owner)}, ${entry.date}`).join('; ')}).`;
    warnings.push(`${name} is still paid a salary when the plan ends: no Retire entry for ${name} or the household is switched on in this scenario.${hint}`);
  });
  return warnings;
};

/**
 * **The switch at retirement, said on the page (user ruling, 2026-09-23).** One sentence per Person
 * whose super the walk switches to an account-based pension, read off `retirementSwitches` — the
 * same expression `project()` reads — so the page cannot announce a switch the walk does not make.
 * The transfer balance cap is the one test only the walk can make; the sentence names it.
 */
export const pensionAtRetirementNotices = (household: Household, entries: readonly Entry[], asAtDate: IsoDate): readonly string[] =>
  retirementSwitches(household, entries, asAtDate).flatMap((decided, index) =>
    decided.kind !== 'switches'
      ? []
      : [
          `At retirement on ${decided.retireDay}, ${household.persons[index]?.name ?? ''}'s super becomes an account-based pension, so its earnings are no longer taxed.` +
            ` Each year's minimum is paid; what you don't spend goes to cash.` +
            ' It doesn\'t apply before 60, over the transfer balance cap, or to an account you keep in accumulation.' +
            ' The pension counts in the Age Pension assets test, so a partner under 67 can lose Age Pension.',
        ]);

/**
 * **The same switch in one short line per retirement day (P17-6, user ruling 2026-09-28)**, with the
 * downside kept visible; `pensionAtRetirementNotices`' full sentences are the ⓘ detail behind it.
 * A couple retiring on one day gets one line naming both.
 */
export const pensionAtRetirementLines = (
  household: Household,
  entries: readonly Entry[],
  asAtDate: IsoDate,
): readonly { readonly summary: string; readonly detail: string }[] => {
  const notices = pensionAtRetirementNotices(household, entries, asAtDate);
  const byDay = new Map<string, { names: string[]; notices: string[] }>();
  let next = 0;
  retirementSwitches(household, entries, asAtDate).forEach((decided, index) => {
    if (decided.kind !== 'switches') return;
    const day = byDay.get(decided.retireDay) ?? { names: [], notices: [] };
    day.names.push(`${household.persons[index]?.name ?? ''}’s`);
    day.notices.push(notices[next++]!);
    byDay.set(decided.retireDay, day);
  });
  return [...byDay].map(([day, { names, notices: said }]) => ({
    summary:
      `On ${day} ${names.join(' and ')} super ${names.length === 1 ? 'becomes a pension' : 'become pensions'}` +
      ' — tax-free earnings, but counted in the Age Pension assets test',
    detail: said.join(' '),
  }));
};
