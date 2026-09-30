// P3-12 — the Work Bonus. Register §4.6, trap T29.
//
// Three rules, all of which are easy to break and none of which are visible in the output:
//
//   1. **Per Person, never poolable.** One Person's balance cannot shelter the other's wages.
//      `applyWorkBonus` takes exactly one `Person` and returns exactly that Person's assessed
//      income; there is no Household-level entry point and no parameter a second Person could
//      arrive through. Pooling would require changing this signature, which is the point.
//
//   2. **Employment and active self-employment income only.** Investment income is assessed under
//      deeming and is outside the definition entirely, so the only field this function reads is
//      `employmentIncomePerFortnight`.
//
//   3. **Applied before the income test.** It reduces assessed income, not the entitlement. The
//      benefit reaches the Household only through the combined income test — which is what makes
//      it non-poolable in effect as well as in form.
import { addCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { AGE_PENSION } from '../data/assumptions/agePension.js';
import type { Person } from './household.js';

const STARTING_BALANCE: Cents = AGE_PENSION.workBonus.startingBalance.value;
const FORTNIGHTLY_ACCRUAL: Cents = AGE_PENSION.workBonus.fortnightlyAccrual.value;
const MAXIMUM_BALANCE: Cents = AGE_PENSION.workBonus.maximumBalance.value;

export const WORK_BONUS_STARTING_BALANCE = STARTING_BALANCE;
export const WORK_BONUS_MAXIMUM_BALANCE = MAXIMUM_BALANCE;

export interface WorkBonusResult {
  readonly person: string;
  readonly eligibleIncome: Cents;
  /** The $300 fortnightly amount actually used against this fortnight's income. */
  readonly fromFortnightlyAccrual: Cents;
  /** The accumulated balance drawn down for income above $300 this fortnight. */
  readonly fromBalance: Cents;
  readonly assessedEmploymentIncome: Cents;
  readonly balanceAfter: Cents;
  /** The flag the caller passed: the walk passes Age Pension age AND a positive rate (P4-10a). */
  readonly eligible: boolean;
}

/**
 * One Person's Work Bonus for one fortnight.
 *
 * The mechanic, in the register's order: $300 of this fortnight's accrual is applied first; any
 * income above that draws on the accumulated balance; any unused part of the $300 is banked, up
 * to $11,800. That last clause is what "sub-$300 fortnight: eligible income reduced to zero, the
 * remainder of that fortnight's $300 is banked" means, and it is why the balance grows whether or
 * not the Person works.
 *
 * **`eligible` is the caller's, and there are two callers.** `agePensionEntitlement` passes Age
 * Pension age alone, because it is working out the rate: the balance only ever LOWERS assessed
 * income, so assessing every Person of age with it cannot create a rate that would not otherwise
 * exist. The walk's write-back (`projection.ts`, P4-10a) passes Age Pension age AND this month's
 * rate above nil — s 1073AA's "receiving" limb: "where a person receives no pension payment in an
 * instalment period there can be no accrual or depletion" (DSS Guide 3.1.15.20). The same write-back
 * adds `WORK_BONUS_STARTING_BALANCE`'s top-up when a pension starts (s 1073AAA). Carer Payment, DSP
 * and the transitional rate are not modelled.
 */
export const applyWorkBonus = (person: Person, eligible: boolean): WorkBonusResult => {
  const eligibleIncome = person.employmentIncomePerFortnight;
  if (!eligible) {
    return Object.freeze({
      person: person.name,
      eligibleIncome,
      fromFortnightlyAccrual: toCents(0),
      fromBalance: toCents(0),
      assessedEmploymentIncome: eligibleIncome,
      balanceAfter: person.workBonusBalance,
      eligible,
    });
  }

  const fromFortnightlyAccrual = (
    eligibleIncome < FORTNIGHTLY_ACCRUAL ? eligibleIncome : FORTNIGHTLY_ACCRUAL
  ) as Cents;
  const afterAccrual = subCents(eligibleIncome, fromFortnightlyAccrual);
  const fromBalance = (afterAccrual < person.workBonusBalance ? afterAccrual : person.workBonusBalance) as Cents;
  const banked = subCents(FORTNIGHTLY_ACCRUAL, fromFortnightlyAccrual);
  const balance = addCents(subCents(person.workBonusBalance, fromBalance), banked);

  return Object.freeze({
    person: person.name,
    eligibleIncome,
    fromFortnightlyAccrual,
    fromBalance,
    assessedEmploymentIncome: subCents(afterAccrual, fromBalance),
    balanceAfter: (balance > MAXIMUM_BALANCE ? MAXIMUM_BALANCE : balance) as Cents,
    eligible,
  });
};
