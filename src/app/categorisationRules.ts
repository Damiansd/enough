// P11-5 / P11-6 — categorisation rules that SUGGEST (ADR-0004), and the subcategories already in use.
// The page half is in `transactionsPanel.ts`. User ruling 2026-09-28: a batch is reviewed WHOLE —
// "23 transactions match 'WOOLWORTHS' → Committed / Groceries: Accept all · Reject" — and per-row
// unticking is deferred.
//
//   * A rule is a piece of the raw description, case ignored, optionally held to one account. The
//     rule as it now stands is the LAST record for its text (case ignored) and account; a retired one
//     is a record saying so, and suggests nothing.
//   * **A Transaction whose current Categorisation was chosen by hand is in no batch, ever.** A rule
//     may re-suggest over what an earlier rule suggested (a changed rule offers to re-sort what it
//     sorted before), and suggests nothing to a Transaction that already has its Category.
//   * **Where two rules match one Transaction it goes to the rule saved most recently**, and only to
//     that one; each batch says how many of its matches it gave up, or took, and to or from which rule.
//
// Pure: no DOM, no I/O, no clock. Nothing here writes: accepting a batch is the panel's append.
import { CATEGORIES, categoryOf } from '../core/ledger.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Category, CategorisationRule, Ledger, Transaction } from '../core/ledger.js';

/** A rule standing (not retired): it carries a Category. */
export type LiveRule = CategorisationRule & { readonly category: Category };

const keyOf = (rule: Pick<CategorisationRule, 'match' | 'account'>): string => JSON.stringify([rule.match.toLowerCase(), rule.account ?? null]);

/** True when the two name the same rule: the same text, case ignored, and the same account (or none). */
export const sameRuleKey = (a: Pick<CategorisationRule, 'match' | 'account'>, b: Pick<CategorisationRule, 'match' | 'account'>): boolean => keyOf(a) === keyOf(b);

/** The rules as they now stand, oldest-saved first: the last record per key, retirements dropped. */
export const liveRules = (ledger: Ledger): LiveRule[] => {
  const latest = new Map<string, CategorisationRule>();
  for (const rule of ledger.categorisationRules ?? []) {
    latest.delete(keyOf(rule));
    latest.set(keyOf(rule), rule);
  }
  return [...latest.values()].filter((rule): rule is LiveRule => rule.category !== undefined);
};

export const ruleMatches = (rule: CategorisationRule, transaction: Transaction): boolean =>
  transaction.description.toLowerCase().includes(rule.match.toLowerCase()) && (rule.account === undefined || rule.account === transaction.account);

/** One rule's suggestion, reviewed whole. */
export interface SuggestionBatch {
  readonly rule: LiveRule;
  /** In the order the Transactions were recorded. */
  readonly transactions: readonly Transaction[];
  /** Matches of THIS rule that went to a newer one instead: that rule, and how many. */
  readonly gaveUp: readonly { readonly rule: LiveRule; readonly count: number }[];
  /** Members that an OLDER rule also matches: that rule, and how many. */
  readonly tookFrom: readonly { readonly rule: LiveRule; readonly count: number }[];
}

const tally = (counts: Map<LiveRule, number>, rule: LiveRule): void => {
  counts.set(rule, (counts.get(rule) ?? 0) + 1);
};

/**
 * Every non-empty batch, newest rule first. A Transaction is in a batch when the newest live rule it
 * matches is that batch's rule, its current Categorisation was NOT chosen by hand, and that
 * Categorisation is not already the one the rule suggests.
 */
export const suggestionBatches = (ledger: Ledger): SuggestionBatch[] => {
  const rules = liveRules(ledger);
  const members = new Map<LiveRule, Transaction[]>(rules.map((rule) => [rule, []]));
  const gaveUp = new Map<LiveRule, Map<LiveRule, number>>(rules.map((rule) => [rule, new Map()]));
  const tookFrom = new Map<LiveRule, Map<LiveRule, number>>(rules.map((rule) => [rule, new Map()]));
  for (const transaction of ledger.transactions) {
    const current = categoryOf(ledger, transaction.id);
    if (current !== undefined && current.ruleId === undefined) continue;
    const matching = rules.filter((rule) => ruleMatches(rule, transaction));
    const owner = matching.at(-1);
    if (owner === undefined) continue;
    if (current !== undefined && current.category === owner.category && current.subcategory === owner.subcategory) continue;
    members.get(owner)!.push(transaction);
    for (const other of matching.slice(0, -1)) {
      tally(gaveUp.get(other)!, owner);
      tally(tookFrom.get(owner)!, other);
    }
  }
  const listed = (counts: Map<LiveRule, number>): { rule: LiveRule; count: number }[] => [...counts].map(([rule, count]) => ({ rule, count }));
  return rules
    .filter((rule) => members.get(rule)!.length > 0)
    .reverse()
    .map((rule) => ({ rule, transactions: members.get(rule)!, gaveUp: listed(gaveUp.get(rule)!), tookFrom: listed(tookFrom.get(rule)!) }));
};

/** P11-5: the subcategories already used under each Category — by a Categorisation or a live rule — sorted, once each. */
export const subcategoriesInUse = (ledger: Ledger): Record<Category, string[]> => {
  const used = Object.fromEntries(CATEGORIES.map((category) => [category, new Set<string>()])) as Record<Category, Set<string>>;
  for (const each of [...ledger.categorisations, ...liveRules(ledger)]) {
    if (each.subcategory !== undefined) used[each.category].add(each.subcategory);
  }
  return Object.fromEntries(CATEGORIES.map((category) => [category, [...used[category]].sort()])) as Record<Category, string[]>;
};
