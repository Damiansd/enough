// P3-9 — **the transfer balance account.** Register §3.10, ITAA 1997 Div 294.
//
// **Chunk 1 built the refusal vocabulary and no arithmetic**, which was the point of building it
// first: ruling **R8** is an instruction — three independent research passes minted three names for
// the same two refusals — so the names were settled before anything could throw them, and a fourth
// spelling has nowhere to be minted from. **Chunk 2 adds the first arithmetic in this file**, at
// the bottom: the personal cap's s 294-35(1) seeding and its s 294-40 proportional indexation.
// Nothing chunk 1 wrote changed, and none of the twelve refusals gained a throw site.
//
// **Chunk 3 adds the first throw site in the vocabulary**, at the very bottom: the day-level
// high-water mark of §3.10.3 and the end-of-day breach check that raises
// `TransferBalanceCapExceededError` under **R1**. Eleven of the twelve refusals are still
// registered-and-unreachable; the twelfth is not, and `test/core-transfer-balance-account.test.mjs`
// struck exactly that one name from its tripwire in the same change as §3.10.8's status cell.
//
// **What R8's "one home" turned out to mean.** Not a single shared `.ts` file holding every refusal
// in the codebase: §8 **O48** records the narrower reading adopted 2026-09-10 — *"§3.10.8 **is** the
// one home … there is no drift in built code to relocate"* — and every other cluster keeps its
// refusals beside its own logic (`superPhase.ts`, `conditionOfRelease.ts`, `ecpiMethod.ts`,
// `div296.ts`). So the ledger-side refusals live here, beside the ledger that will raise them; the
// entry-test ones live in `superPhase.ts`, beside the entry test; and what makes the two sets one
// vocabulary is register §3.10.8's table plus `test/refusal-names.test.mjs`, which reads it in both
// directions. Registering a class here without writing its row there fails that test, today.
//
// **The premise every one of these refusals is scoped against: the transfer balance account is a
// TRANSACTION LEDGER valued at commencement, not a balance** (§3.10.4). It moves only on the five
// s 294-25(1) credit events and the eight s 294-80(1) debit events, and between events it is inert.
// A pension started at $1.6m and now worth $900k still carries a $1.6m transfer balance and zero
// remaining cap space; a pension started at $1.1m and now worth $2.0m still carries $1.1m and has
// headroom a balance-based estimate would deny. The error from using the balance is **unsigned and
// unbounded in both directions**, which is why §3.10.7 offers no conservative approximation and
// `UnknownPersonalTransferBalanceCapError` below refuses instead.
//
// **The two counter-intuitive negatives that follow from it do NOT have the same epistemic status,
// and this comment states them separately because the code will enforce them identically** — by
// there being no function through which either event can touch the ledger — and an identical
// mechanism is exactly what would let a reader flatten them into one claim (§3.10.4):
//
//   * **A pension drawdown creates NO debit.** s 294-80(1) item 1 requires a superannuation **lump
//     sum**, and s 307-65(1) *defines* one as "a superannuation benefit that is **not** a
//     superannuation income stream benefit". A pension payment is an income stream benefit, so it
//     can never satisfy item 1. This is a **positive definitional exclusion**, `primary-verified`.
//   * **Investment earnings create NO credit** (and losses no debit). There is no item in the
//     s 294-25(1) table triggered by the interest growing. The table is read as exhaustive and a
//     public ruling corroborates it in terms (LCR 2016/9 ¶¶24, 24A, 27, 39F) — but the negative
//     itself is an **argument from the absence of a table item**, and §3.10.4 says in terms that it
//     **must never be recorded as bare `primary-verified`**. Weaker than the row above.
//
// The consequence for advice, not just for arithmetic: because a drawdown is not a debit, *"draw
// down more"* is **never** a remedy for an excess. The only remediation this tool may ever emit is
// a commutation (T76).
//
// **Chunk 4 builds the ledger those two negatives are negatives ABOUT**, at the very bottom: the
// s 294-25(1) item 2 credit, the s 294-80(1) item 1 debit, the drawdown that records itself and
// moves nothing, and O47's `pensionPayment | partialCommutation` characterisation. It adds no
// refusal and strikes no name: the eleven registered-and-unreachable classes are all still
// unreachable, because nothing chunk 4 is handed can declare itself a capped defined benefit
// stream or a commutation authority — those facts arrive at the entry test, which is chunk 5a's.
//
// **What is deliberately NOT here, so its absence is not read as an omission.** The
// per-Person aggregation and §3.10.7's seven Settings (chunk 6); the retrofit that makes
// `minimumDrawdown.ts` and `ttrPaymentRange.ts` read the same characterisation this module defines
// (O47's own requirement, and a later item — neither module has a slot for it today).
// The **general** transfer balance cap is not here either and is not new work:
// `generalTransferBalanceCap` in `superCaps.ts` has been built since 2026-09-09 (O44), and chunk 2
// consumes it rather than rebuilding it.
import { compareFinancialYears, financialYearContaining, financialYearStartYear, toFinancialYear } from './financialYear.js';
import { formatCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { mergeProvenance, provenanceOf } from './provenance.js';
import { generalTransferBalanceCap } from './superCaps.js';
import type { Cents } from './money.js';
import type { ComputedProvenance } from './provenance.js';
import type { CpiSeries } from '../data/assumptions/super.js';
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js';

declare const PERSONAL_TRANSFER_BALANCE_CAP: unique symbol;

/**
 * **A Person's own transfer balance cap — ITAA 1997 ss 294-35, 294-40 — and a FOURTH brand,
 * distinct from `superCaps.ts`'s `GeneralTransferBalanceCap`.**
 *
 * The two are both `Cents`, both per Person per year, and within a few per cent of each other for
 * most households, so a general cap substituted for a personal one is a wrong number that looks
 * entirely reasonable — trap **T60**. `superCaps.ts` plays this trick on three caps already
 * ("here it is a compile error"); this is the fourth.
 *
 * **The only lawful origins are s 294-35(1) seeding and s 294-40 indexation**, both built by
 * chunk 2 below (`seedPersonalTransferBalanceCap`, `indexPersonalTransferBalanceCap`). Anywhere
 * else, the only way to produce this type is an explicit cast, which is reviewable in a diff.
 * *(Corrected 2026-09-16: this said "both are chunk 2. **Until then** the only way to produce this
 * type is an explicit cast" — written before chunk 2 landed, and false from the moment it did. The
 * two constructors now exist and are where a lawful one originates; a reader who believed the old
 * sentence would go looking for a cast that is no longer the mechanism.)*
 *
 * **What the brand does not catch, stated so it is not over-claimed:** it stops a *caller*
 * substituting one cap for the other. It cannot stop an *author* multiplying the unused percentage
 * by the general cap instead of by the general cap's **increase** inside the one function allowed
 * to read both (T63) — that is an arithmetic error between two correctly-typed values, and only
 * chunk 2's hand-worked fixtures catch it.
 */
export type PersonalTransferBalanceCap = Cents & { readonly [PERSONAL_TRANSFER_BALANCE_CAP]: true };

// --- Refusals -------------------------------------------------------------------------------------
//
// Each row below says which of §3.5.1's four kinds it is — **rule of law**, **input-shape guard**,
// **drift tripwire**, **scope refusal** — because they are not all the same kind of no, and a reader
// who cannot tell which is which cannot tell what would close one. Nine of the ten are scope
// refusals: the rule exists and is retrieved, and what is missing is this tool's decision to
// implement it.
//
// **SEVEN of the ten have no throw site in `src/` — corrected 2026-09-16 after P3-9 chunk 6-4.**
// *(This paragraph said, until then: "**Nine of the ten still have no throw site in `src/`** … The
// tenth is `TransferBalanceCapExceededError`, which chunk 3 made reachable at the bottom of this
// file". That was true on the day chunk 3 landed and false twice over by the end of the same day;
// the superseded sentence is kept once, dated, rather than rewritten away, because a reader who
// counted nine here and three reachable names below would not know which count to trust.)* The
// three that are reachable: `TransferBalanceCapExceededError` at the end-of-day check of §3.10.5 at
// the bottom of this file (chunk 3); `CommutationAuthorityNotModelledError` as an input guard in
// `superPhase.ts`, reached by declaring the fact (chunk 5a); and
// `UnknownPersonalTransferBalanceCapError` at exactly one door,
// `transferBalanceAccountOrRefuse` in `transferBalanceAccountSettings.ts` (chunk 6-4). The other
// seven are registered and unreachable, which is the O72 / P3-38 pattern and is recorded as a
// finding in §3.10.8 rather than dressed up as coverage. **The count that is authoritative is not
// this comment**: `test/core-transfer-balance-account.test.mjs` walks all of `src/` and asserts it
// over the twelve names of §3.10.8, and a name may leave its list only by acquiring a site.

/**
 * **R2, register §3.10.7 / O42 — a SCOPE REFUSAL, and the one refusal here that is about data
 * availability rather than about a rule.**
 *
 * A Person whose transfer balance account started before the forecast has a personal cap that is a
 * function of five things this tool does not hold: the account's start day, the general-cap series
 * back to it, every dated credit and debit since, the high-water mark and its earliest day, and the
 * personal cap on that day — which is itself the recursive output of the first four for every prior
 * year. The current balance is **neither an upper nor a lower bound** (see the ledger premise in
 * the header), so the error from guessing is unsigned and unbounded and there is no conservative
 * approximation to fall back to.
 *
 * **Scoped narrowly, per O42.** A Person who has never been a retirement phase recipient before the
 * forecast starts is **fully computable and must be computed**: their account starts inside the
 * forecast, the seed cap is the general cap for the seeding year, s 294-40 does not apply in the
 * seeding year at all, and every later credit and debit is generated by the engine's own Scenario.
 * This refusal must never reach them.
 *
 * The message carries the seven fields by name because a refusal that does not say what to supply
 * is a dead end. **U14 is live and is this refusal's failure mode:** the ATO does publish all seven
 * in ATO online services, but this project has never retrieved that screen, so the labels below are
 * the statute's and not necessarily the ones the user will be looking at.
 */
export class UnknownPersonalTransferBalanceCapError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the personal transfer balance cap for FY${fy} cannot be worked out for a Person whose ` +
        'transfer balance account started before the forecast, and it cannot be approximated ' +
        'either. It is not derivable from a current balance: the transfer balance account is a ' +
        'ledger of capital moved into retirement phase and not a valuation of it (ITAA 1997 ' +
        'ss 294-25, 294-80), so a pension started at $1.6m and now worth $900k still carries a ' +
        '$1.6m transfer balance, and one started at $1.1m and now worth $2.0m still carries ' +
        '$1.1m. The error from guessing is unsigned and unbounded in BOTH directions, which is ' +
        'why there is no conservative approximation here and why this is a refusal rather than an ' +
        'estimate. Supply all seven per-Person Settings of register §3.10.3 (ruling R3 — the ' +
        'six-field alternative is arithmetically insufficient, because reconstructing a cap ' +
        'from an account-start YEAR means replaying every intervening s 294-40 increase): ' +
        'transferBalanceAccountStartDay (a DAY, not a financial year — ruling R4, since the ' +
        's 294-25(1) item 2 credit is valued on the stream’s starting day and never on 1 July), ' +
        'personalTransferBalanceCap, transferBalance (which may be negative), ' +
        'highestEndOfDayTransferBalance, highestBalanceDay, personalCapOnHighestBalanceDay, and ' +
        'hasEverExceededCap. The ATO publishes all seven in ATO online services (Super → ' +
        'Information → Transfer balance cap); this project has not verified that screen’s labels ' +
        '(U14), so do not read a pension account balance into any of them. A Person who has NEVER ' +
        'been a retirement phase recipient before the forecast needs none of this: their account ' +
        'starts inside the forecast and is computed in full (O42).',
    );
    this.name = 'UnknownPersonalTransferBalanceCapError';
  }
}

/**
 * **R1, register §3.10.5 — a SCOPE REFUSAL, and the name settled here is `TransferBalanceCapExceededError`.**
 * §3.10.8 carried `TransferBalanceCapExceeded` as *proposed*; R8's `Error` suffix is what the final
 * `Error` is, and `test/refusal-names.test.mjs` enforces the suffix on every registered name.
 *
 * **It is a scope refusal and not a rule of law.** Exceeding the cap is not unlawful: Div 294
 * supplies a complete answer to it — excess transfer balance tax, the s 294-50 asymmetry, the
 * TAA 1953 Sch 1 Div 136 correction chain — and this tool declines to implement that answer. The
 * research for it is retrieved in full and recorded (§3.10.5, and traps T87–T114 are the fixtures a
 * reversal would have to satisfy, not tests to write now).
 *
 * **Why refusal rather than "warn and continue", in the register's own arithmetic.** Continuing
 * forces the model to decide where the commuted capital goes, and the default an implementer
 * reaches for — leave it at 0% ECPI and add a little tax — flatters the household by 15% of
 * earnings, for ever. On a $200,000 excess held 90 days the tax is **$857**; the lost s 294-40(1)(b)
 * indexation is every future step on the personal cap, for life; and the forced move from 0% ECPI to
 * 15% accumulation is 15% of earnings on that capital every year after. Modelling the $857 and
 * calling the breach handled is the flattering error. Refusal is the only option whose failure mode
 * leaves the tool understating.
 *
 * **What it must NOT fire on**, both settled in §3.10.5: a **negative** transfer balance (s 294-30(2)
 * Note 2 — *"There is no consequence for having a negative transfer balance"*), and a large **total
 * super balance**, which is a different measure entirely. Only retirement-phase capital, and only at
 * the **end of a day**: a credit and a debit on the same day net out and the intraday spike never
 * happened (LCR 2016/9 ¶51).
 *
 * The three things §3.10.5 requires the message to name are all here — the **excess**, the
 * **personal cap** it was tested against, and the **s 294-40(1)(b) permanent-indexation
 * consequence** — because that third one is what makes the answer *"declare less capital as
 * retirement phase"* rather than *"accept the tax"*.
 *
 * The cap parameter is a `PersonalTransferBalanceCap` and not a `Cents`: a general cap cannot be
 * reported here as the figure a Person was tested against without an explicit cast.
 */
export class TransferBalanceCapExceededError extends RangeError {
  constructor(day: IsoDate, balance: Cents, cap: PersonalTransferBalanceCap) {
    super(
      `the transfer balance at the end of ${day} is ${formatCents(balance)}, which exceeds the ` +
        `Person’s personal transfer balance cap of ${formatCents(cap)} by ` +
        `${formatCents((balance - cap) as Cents)}. This engine does not project a financial year ` +
        'containing an end-of-day cap breach, and it does not model excess transfer balance tax ' +
        '(ruling R1, register §3.10.5). Refusing is not caution for its own sake: the tax on the ' +
        'excess is the SMALLEST of the three consequences, and the other two are permanent. ' +
        'ITAA 1997 s 294-40(1)(b) grants a proportional indexation increase only where, AT NO ' +
        'TIME before the start of the financial year, the transfer balance has exceeded the cap ' +
        'at the end of a day — so one end-of-day excess, of any size, on any day, permanently ' +
        'disqualifies this Person from EVERY future indexation increase, and correcting the ' +
        'excess does not restore it. And commuting the excess back to accumulation moves that ' +
        'capital from 0% earnings tax to 15%, every year, for ever. Modelling the tax and calling ' +
        'the breach handled flatters the household; there is no "warn and continue" that does ' +
        'not. The answer a household can act on is to declare LESS capital as retirement phase: ' +
        'reduce the amount entering the retirement phase on or before ' +
        `${day} by at least ${formatCents((balance - cap) as Cents)}. Note that a NEGATIVE ` +
        'transfer balance is not a breach (s 294-30(2) Note 2) and a large total super balance is ' +
        'not one either; only retirement-phase capital, measured at the END of a day, is.',
    );
    this.name = 'TransferBalanceCapExceededError';
  }
}

/**
 * **s 307-80(4), register §3.10.6 — a SCOPE REFUSAL.** A stream specified in a Commissioner's
 * commutation authority whose provider fails to pay within 60 days is not in retirement phase for
 * that income year *and every later one*, and the s 294-80(1) item 5 debit follows. The provision is
 * retrieved and the rule is known; the machinery behind it — the TAA 1953 Sch 1 Div 136 chain the
 * authority issues out of — is not modelled.
 *
 * **It carries a trap of its own that is why it cannot be approximated by ignoring the authority:**
 * for transfer balance cap purposes s 294-50(3) requires the operation of s 307-80(4) to be
 * **disregarded** while the 60-day period is still running, so the same stream can be OUT of
 * retirement phase for ECPI and IN it for the cap. A model that took one answer for both would be
 * wrong in one of the two directions with no way to say which.
 *
 * **Reachable since P3-9 chunk 5a (2026-09-16).** Its one throw site is in `superPhase.ts`, where
 * it guards `DeclaredRecipient.commutationAuthority` on all three interest constructors — an input
 * guard with nothing behind it, because the fact is stated (§3.10.8's own trigger) and no
 * constructor could derive it. This class stays here, beside the ledger, because the s 294-80(1)
 * item 5 debit it names is ledger work; only the guard crossed the module boundary, the way
 * `ecpiMethod.ts` already imports `MidYearPhaseChangeError`.
 */
export class CommutationAuthorityNotModelledError extends RangeError {
  constructor() {
    super(
      'a Commissioner’s commutation authority is not modelled (register §3.10.6, ITAA 1997 ' +
        's 307-80(4)). Where the provider does not pay within 60 days the stream stops being in ' +
        'the retirement phase for that income year AND every later one, and a s 294-80(1) item 5 ' +
        'debit arises for the value of the WHOLE supporting interest — but for transfer balance ' +
        'cap purposes s 294-50(3) requires s 307-80(4) to be DISREGARDED while the 60 days are ' +
        'still running, so the same stream is out of retirement phase for ECPI and in it for the ' +
        'cap at the same time. Neither the authority nor the TAA 1953 Sch 1 Div 136 chain it ' +
        'issues out of is implemented, and taking one answer for both purposes would be wrong in ' +
        'one direction with nothing to say which. Remove the commutation-authority facts to get a ' +
        'figure for the rest of the household.',
    );
    this.name = 'CommutationAuthorityNotModelledError';
  }
}

/**
 * **Register §3.10.4, trap T85 — a SCOPE REFUSAL, and the test for it asserts THE REFUSAL, not a
 * number.**
 *
 * For a capped defined benefit income stream the s 294-25 credit is a **special value** — the annual
 * entitlement × 16 for a lifetime pension, or × the remaining term for a life expectancy or market
 * linked one — and not the account balance. Treating one as an account-based pension does not
 * produce a slightly wrong figure: it produces a wrong credit, therefore a wrong high-water mark,
 * therefore every downstream percentage of s 294-40 wrong for life. s 294-140 also replaces the
 * ordinary excess rule with a lesser-of-two-excesses test.
 *
 * **The scope decision has to be enforced rather than assumed** (O43 / O54): declaring a defined
 * benefit pension must refuse, not be silently taken as account-based. **And the width of the
 * trigger is itself unverified (O49 / U20)** — Subdiv 294-D was read, Subdiv 294-E (child
 * recipients) was not — so this refusal is deliberately raised on the declaration rather than on any
 * attempt to classify a stream that was not declared as one.
 */
export class CappedDefinedBenefitIncomeStreamNotModelledError extends RangeError {
  constructor() {
    super(
      'a capped defined benefit income stream is not modelled (register §3.10.4, ITAA 1997 ' +
        'Subdiv 294-D). Its transfer balance credit is a SPECIAL VALUE — the annual entitlement ' +
        '× 16 for a lifetime pension, or × the remaining term for a life expectancy or market ' +
        'linked one (ss 294-135(1)–(3)) — and not the value of an account, so treating one as an ' +
        'account-based pension gives a wrong credit, a wrong highest-ever balance and every ' +
        'later s 294-40 percentage wrong for life. s 294-140 also replaces the ordinary excess ' +
        'rule with a lesser-of-two-excesses test. This tool models two people’s own account-based ' +
        'superannuation; the width of this trigger is itself unverified (O49 / U20) and ' +
        'Subdiv 294-E was never retrieved (O55 / U12), so the stream is refused where it is ' +
        'declared rather than guessed at where it is not.',
    );
    this.name = 'CappedDefinedBenefitIncomeStreamNotModelledError';
  }
}

// --- The credit and debit items this tool does not compute (O48) -----------------------------------
//
// Six SCOPE REFUSALS, one per unmodelled limb of the two statutory tables, and between them they
// cover **credit items 1, 4 and 5, the reversionary limb of item 2, and debit items 2–8**. What is
// left is s 294-25(1) item 2 credits and s 294-80(1) item 1 debits, which is the honest scope of a
// tool that models two people's own account-based super — and naming the residue one refusal at a
// time is what stops "the rest is out of scope" from being a sentence nobody can act on.
//
// **They are separate classes rather than one parameterised refusal on purpose.** A single
// `ItemNotModelledError(item)` would let a mutation change which item a message names without
// changing anything a test asserts on, and it would make the six statuses in §3.10.8 one status.

/**
 * **s 294-25(1) item 4, s 294-55 — a SCOPE REFUSAL.** A limited recourse borrowing arrangement
 * repayment in a small superannuation fund credits the transfer balance account by the increase in
 * value the payment causes. LRBAs are not modelled anywhere in this engine.
 */
export class LRBACreditNotModelledError extends RangeError {
  constructor() {
    super(
      'a limited recourse borrowing arrangement repayment is not modelled (ITAA 1997 ' +
        's 294-25(1) item 4, s 294-55, register §3.10.4). In a small superannuation fund such a ' +
        'repayment credits the transfer balance account by the increase in value it causes, at ' +
        'the time of the payment. This engine holds no LRBA, so the credit cannot be computed ' +
        'and is refused rather than omitted — an omitted credit understates a transfer balance ' +
        'and hides a breach.',
    );
    this.name = 'LRBACreditNotModelledError';
  }
}

/**
 * **s 294-25(1) item 5 and its three regulations — a SCOPE REFUSAL.** reg 294-25.01 (consideration
 * for a deferred superannuation income stream), reg 294-25.02 and reg 294-25.03 (capped defined
 * benefit commutations and successor fund transfers). All three were retrieved; none touches an
 * ordinary account-based pension, which is why the scope line sits here rather than further in.
 */
export class DeferredAndCappedDefinedBenefitCreditsNotModelledError extends RangeError {
  constructor() {
    super(
      'the regulation credits of ITAA 1997 s 294-25(1) item 5 are not modelled (register ' +
        '§3.10.4): reg 294-25.01, consideration for a DEFERRED superannuation income stream; and ' +
        'regs 294-25.02 and 294-25.03, capped defined benefit commutations and successor fund ' +
        'transfers. All three were retrieved and none of them touches an ordinary account-based ' +
        'pension. A deferred stream is also in the retirement phase on the s 307-80(2) limb with ' +
        'NO notification required, which this engine does not model either.',
    );
    this.name = 'DeferredAndCappedDefinedBenefitCreditsNotModelledError';
  }
}

/**
 * **s 294-80(1) item 2 — a SCOPE REFUSAL.** A structured settlement contribution debits the account
 * by its amount, on the later of the contribution day and the account start day. It is the one
 * unmodelled item that regularly drives a transfer balance **negative**, which s 294-30(2) Note 2
 * says has no consequence and s 294-40(3) then reads as 100% unused — so omitting it would not
 * merely lose a debit, it would lose the whole of a Person's indexation entitlement.
 */
export class StructuredSettlementNotModelledError extends RangeError {
  constructor() {
    super(
      'a structured settlement contribution is not modelled (ITAA 1997 s 294-80(1) item 2, ' +
        'register §3.10.4). It debits the transfer balance account by the amount of the ' +
        'contribution, on the later of the contribution and the start of the account, and it is ' +
        'the ordinary way a transfer balance goes NEGATIVE — which has no consequence of its own ' +
        '(s 294-30(2) Note 2) and makes the unused cap percentage 100% under s 294-40(3). ' +
        'Omitting it would overstate the transfer balance and understate the cap, so it is ' +
        'refused rather than dropped.',
    );
    this.name = 'StructuredSettlementNotModelledError';
  }
}

/**
 * **s 294-80(1) item 3, s 294-85 — a SCOPE REFUSAL.** Superannuation reduced because of fraud (with
 * a conviction) or bankruptcy, debited per s 294-85 and **only on notification in the approved
 * form** — one of the two places Div 294 does say "in the approved form", which is the contrast
 * s 307-80(3)(b)(ii)'s notification does *not* draw.
 */
export class FraudAndBankruptcyDebitsNotModelledError extends RangeError {
  constructor() {
    super(
      'a debit for superannuation reduced by fraud or bankruptcy is not modelled (ITAA 1997 ' +
        's 294-80(1) item 3, s 294-85, register §3.10.4). It arises only on notification IN THE ' +
        'APPROVED FORM (s 294-85(1)(b)) and requires a conviction in the fraud limb. Neither the ' +
        'form nor the event is held anywhere in this engine.',
    );
    this.name = 'FraudAndBankruptcyDebitsNotModelledError';
  }
}

/**
 * **s 294-80(1) item 4, s 294-90 — a SCOPE REFUSAL.** A payment split debits the split proportion
 * of the value on the day, from the later of the operative time and the account start, and again
 * only on notification. This engine models no family law split of a superannuation interest.
 */
export class PaymentSplitNotModelledError extends RangeError {
  constructor() {
    super(
      'a payment split is not modelled (ITAA 1997 s 294-80(1) item 4, s 294-90, register ' +
        '§3.10.4). It debits the split proportion of the interest’s value on the day, from the ' +
        'later of the operative time and the start of the account, and only on notification. ' +
        'This engine holds no family law split of a superannuation interest, so the debit cannot ' +
        'be sized and is refused rather than assumed to be nil.',
    );
    this.name = 'PaymentSplitNotModelledError';
  }
}

/**
 * **s 294-80(1) items 5, 6, 7 and 8 — a SCOPE REFUSAL, and the residue of the debit table.** A
 * stream ceasing to be in the retirement phase otherwise than by commutation: the s 307-80(4)
 * 60-day failure (item 5), any other stop time *"but items 1 and 5 do not apply"* (item 6), a
 * Commissioner's s 136-70 non-commutable excess notice (item 7), and the regulation debits of item 8
 * (regs 294-80.01, 294-80.02, and 294-80.03 which switches items 5 and 6 off for those streams).
 *
 * **Item 6's wording is load-bearing and is why a full commutation must not be routed here:** a full
 * commutation is **item 1**, because item 6 is expressly conditioned on items 1 and 5 not applying
 * (T82). Sending it to item 6 instead would debit the value *just before the stop time* rather than
 * the lump sum actually received.
 */
export class StreamCeasedOutsideCommutationNotModelledError extends RangeError {
  constructor() {
    super(
      'a retirement phase stream ceasing otherwise than by commutation is not modelled (ITAA 1997 ' +
        's 294-80(1) items 5–8, register §3.10.4): the s 307-80(4) 60-day failure (item 5), any ' +
        'other stop time where "items 1 and 5 do not apply" (item 6), a Commissioner’s s 136-70 ' +
        'non-commutable excess notice (item 7), and the regulation debits of item 8. A FULL ' +
        'commutation is NOT one of these — it is item 1, because item 6 is expressly conditioned ' +
        'on items 1 and 5 not applying, and item 1 debits the lump sum received rather than the ' +
        'value just before a stop time.',
    );
    this.name = 'StreamCeasedOutsideCommutationNotModelledError';
  }
}

// --- Chunk 2 — the PERSONAL cap: s 294-35 seeding and carry-forward, s 294-40 indexation ----------
//
// **There are two caps and only one of them is config (§3.10.1).** The *general* cap is one national
// figure per year, CPI-indexed under s 294-35(3), and `superCaps.ts` has computed it since O44; the
// *personal* cap is per-Person persisted state, seeded from the general cap **once** and never
// re-read from it again.
//
// > §3.10.1: *"**s 294-35(2) carries LAST YEAR'S PERSONAL CAP forward and never re-reads the general
// > cap.** A Person who seeded at $1,600,000 in FY2017-18 and never qualified for an increase still
// > has a **$1,600,000** cap in FY2026-27 — **$500,000 below** the general cap. s 294-40 is the only
// > thing that ever moves it."*
//
// **That sentence is the whole hazard of this section.** Reading today's general cap for a Person who
// retired years ago is the natural mistake for anyone editing this later, and it is simply wrong: it
// hands a 2017 retiree half a million dollars of headroom the statute never gave them, and the error
// is invisible because the figure it produces is the published, correct, *general* cap. Two things
// are done about it, and only the first is structural:
//
//   * `PersonalTransferBalanceCap` is a fourth brand (see its own comment above), so a **caller**
//     cannot hand `generalTransferBalanceCap(fy).amount` to anything that wants a personal cap
//     without an explicit, reviewable cast — trap **T60**, and a `tsc` failure rather than a wrong
//     number.
//   * Inside `indexPersonalTransferBalanceCap`, which is the **only** function in this codebase
//     allowed to read the general cap for a Person who already has one, the general cap is read
//     **twice and subtracted**, and the difference — never either figure on its own — is what the
//     unused percentage multiplies (**T63**). *The brand does not catch this one.* Both operands are
//     correctly typed `GeneralTransferBalanceCap` values, so substituting `general[thisFY]` for
//     `increase` is type-invisible; it is caught by this section's hand-worked fixtures and by the
//     mutation battery, and by nothing the compiler does.
//
// **The high-water mark is an INPUT here, not a computation.** s 294-40(2)(a)-(c) needs the highest
// end-of-day transfer balance to the end of the *previous* year and the Person's *personal* cap on
// the earliest day it was attained (§3.10.3 fields 4-6). Maintaining those monotonically, and the
// end-of-day breach check that sets field 7, is chunk 3; this section takes them as stated facts so
// that the two can be tested apart.

/**
 * The state s 294-40 reads at the start of a financial year — §3.10.3's fields 1, 2, 4, 6 and 7.
 *
 * Fields 3 (`transferBalance`) and 5 (`highestBalanceDay`) are deliberately absent: the running
 * balance is not an operand of s 294-40 at all, and the day is only how field 6 was chosen. Asking
 * for what the formula does not use is how a state shape acquires a field an implementer then feels
 * entitled to compute from.
 */
export interface PersonalCapCarryForward {
  /** R4, s 294-15(2): a DAY, never a financial year — the later of 1 July 2017 and the first retirement-phase day. */
  readonly accountStartDay: IsoDate;
  /** s 294-35(2). Last year's PERSONAL cap. Not the general cap, at any distance. */
  readonly capPrevFY: PersonalTransferBalanceCap;
  /**
   * The provenance of `capPrevFY`, and it travels with it rather than being optional.
   *
   * A cap carried forward unchanged consumes no figure this year, so a result that reported its own
   * provenance alone would report `primary-verified` with no caveats for a cap that may rest on an
   * indexed general cap carrying **O41**'s open reference-base question, or — for a Person whose
   * account predates the forecast (chunk 6) — on a user-stated Setting. `provenance.ts`'s own rule
   * is that a result is as weak as its weakest input, and last year's cap is an input. Required, so
   * that a caller chaining years cannot drop the history by omitting a field.
   */
  readonly provenanceOfCapPrevFY: ComputedProvenance;
  /** s 294-40(2)(a). The monotone high-water mark to the end of the previous year. May be negative. Chunk 3 maintains it. */
  readonly highestEndOfDayTransferBalance: Cents;
  /** s 294-40(2)(c). The PERSONAL cap on the earliest day that high was attained — §3.10.3 field 6. */
  readonly personalCapOnHighestBalanceDay: PersonalTransferBalanceCap;
  /** s 294-40(1)(b), latching. Read **as at the START of this financial year** (§3.10.3, order of operations). */
  readonly hasEverExceededCap: boolean;
}

export type PersonalCapBasis =
  | 'seeded from the general cap for the financial year the account started (s 294-35(1))'
  | 'carried forward: s 294-40 does not apply in the seeding year (s 294-40(1))'
  | 'carried forward: an end-of-day excess has permanently disqualified indexation (s 294-40(1)(b))'
  | 'carried forward: the general cap did not rise this year (s 294-40(1)(a))'
  | 'increased by the unused cap percentage of the indexation increase (s 294-40(2))';

/** One Person's personal transfer balance cap for one financial year, and how it got there. */
export interface PersonalCapYear {
  readonly fy: FinancialYear;
  readonly cap: PersonalTransferBalanceCap;
  readonly basis: PersonalCapBasis;
  /** s 294-40(2)(d). An integer 0-100, or `null` where s 294-40 did not apply at all this year. */
  readonly unusedCapPercentage: number | null;
  /** The general cap's rise this year — the multiplicand of s 294-40(2). Zero where s 294-40 did not run. */
  readonly indexationIncrease: Cents;
  /** What was actually added to the personal cap. Zero on every carried-forward basis, and on a 0% unused percentage. */
  readonly increase: Cents;
  readonly provenance: ComputedProvenance;
}

/** $1,000 in cents. §3.10.2's invariant: a personal cap is always a whole multiple of it. */
const THOUSAND_DOLLARS = 100_000;
/** $100,000 in cents — s 294-35(3)'s indexation step, and so the step of every increase this reads. */
const INDEXATION_STEP = 10_000_000;

/**
 * **s 294-35(1) — seeding, which happens exactly once per Person and is read from the general cap
 * for the financial year the account STARTED, not for any later year.**
 *
 * The day matters and the year does not suffice (**R4**): the account starts on the later of
 * 1 July 2017 and the day the Person first starts to be a retirement phase recipient (s 294-15(2)),
 * and §3.10.9's *fortnight worth a year* fixture is the whole point — retiring on 28 June 2027 and
 * notifying on 12 July 2027 seeds from **FY2027-28**, a different general cap from the one the
 * retirement day sits in. A year-granular input cannot express that, so this takes a day.
 *
 * A day before 1 July 2017 is refused rather than clamped. s 294-15(2) says "the later of", so a
 * caller holding an earlier retirement day has the transformation still to do, and silently doing
 * it for them would hide a pension that commenced in 2015 behind a 2017 answer.
 *
 * The general cap for a year the CPI series cannot reach raises `superCaps.ts`'s own
 * `MissingIndexNumberError` (register **O40**) — an account starting in FY2027-28 cannot be seeded
 * until the December 2026 quarter is published, and growing last year's figure by an assumed rate
 * is the mutation that row exists to forbid.
 */
export const seedPersonalTransferBalanceCap = (
  accountStartDay: IsoDate,
  series?: CpiSeries,
): PersonalCapYear => {
  if (accountStartDay < '2017-07-01') {
    throw new RangeError(
      `a transfer balance account cannot start on ${accountStartDay}: ITAA 1997 s 294-15(2) starts ` +
        'it on the LATER of 1 July 2017 and the day the Person first starts to be a retirement ' +
        'phase recipient, so state 2017-07-01 rather than the earlier retirement day',
    );
  }
  const fy = financialYearContaining(accountStartDay);
  const general = series === undefined ? generalTransferBalanceCap(fy) : generalTransferBalanceCap(fy, series);
  return Object.freeze({
    fy,
    // The one lawful crossing between the two brands in this codebase, and it is one line long:
    // s 294-35(1) says the personal cap for the seeding year IS the general cap for that year.
    cap: (general.amount as Cents) as PersonalTransferBalanceCap,
    basis: 'seeded from the general cap for the financial year the account started (s 294-35(1))',
    unusedCapPercentage: null,
    indexationIncrease: 0 as Cents,
    increase: 0 as Cents,
    provenance: general.provenance,
  });
};

/**
 * **ss 294-35(2) and 294-40 — carry last year's PERSONAL cap forward, and add the unused percentage
 * of this year's general-cap INCREASE where all three of s 294-40(1)'s conditions are met.**
 *
 * §3.10.2's pseudocode, in order, and the order is not cosmetic:
 *
 * 1. **The seeding year is excluded outright** by s 294-40(1)'s parenthetical — *"other than the
 *    financial year in which you first start to have a transfer balance account"*. A pension
 *    started on 1 July 2026 has a personal cap of exactly $2,100,000 that year even though the
 *    general cap rose $100,000 on the same morning (**T62**).
 * 2. **s 294-40(1)(b) is checked before any general cap is read**, because it decides the year on
 *    its own: one end-of-day excess, of any size, on any day, permanently disqualifies every future
 *    increase, and correcting the excess does not restore it. Reading the general cap first would
 *    make a barred Person's answer depend on a figure that cannot change it — and would refuse the
 *    years O40 has no CPI number for, which is refusing a case the statute answers outright.
 * 3. **s 294-40(1)(a)**: no rise in the general cap, no increase.
 * 4. **s 294-40(2)**: the unused percentage multiplies the **increase**. Never the general cap
 *    (**T63**), and never a percentage cached from an earlier year (**T64**) — it is recomputed
 *    here from the all-time high at every indexation event.
 *
 * **The rounding direction is load-bearing and runs one way only.** s 294-40(2)(c) floors the
 * **used** percentage to a whole number *before* (2)(d) subtracts it from 100, so the **unused**
 * percentage rounds **up**, in the taxpayer's favour. $1,234,567 against a $2,000,000 cap is
 * 61.72835% used → **61** → **39%** unused → **+$39,000**, not $38,000 and not $38,271.65
 * (§3.10.9). Flooring the unused percentage instead, or rounding either to nearest, is **T61**.
 *
 * **A negative high-water mark takes the unused percentage to 100%** — s 294-40(3), and §3.10.1
 * records that a negative transfer balance is permitted with no consequence (s 294-30(2) Note 2).
 * *§3.10.2's pseudocode states this limb in a way that contradicts itself* — it sets
 * `usedPct = 100 if highestEndOfDayBalance < 0`, which subtracts to **0%** unused, while the same
 * line's comment says `(3) => 100 if negative` and the section's own operand table says *"negative
 * balance | unused percentage **taken to be 100%**"*. The statute and §3.10.9's negative-balance
 * fixture (**+$100,000 → $2,100,000**) both give 100% unused, so that is what is implemented here,
 * written as the statute writes it rather than routed through a used percentage s 294-40(3) never
 * computes. Recorded in the report for this chunk; the register line is not edited from here.
 *
 * **What is refused rather than clamped:** a high-water mark ABOVE the personal cap on its own day
 * with `hasEverExceededCap` stated `false`. Those two facts cannot both be true — a balance over
 * the cap at the end of a day is exactly what latches the flag — and the arithmetic would otherwise
 * produce a negative unused percentage that a `Math.max(0, …)` would quietly launder into a 0%
 * answer, hiding a chunk-3 defect inside a plausible cap. Note the boundary: a balance that merely
 * **equalled** the cap is not an excess, leaves s 294-40 applying, and yields 0% unused — the two
 * routes of §3.10.2's *"two ways to lose indexation"*, which are different rules with the same
 * permanence.
 */
export const indexPersonalTransferBalanceCap = (
  thisFY: FinancialYear,
  state: PersonalCapCarryForward,
  series?: CpiSeries,
): PersonalCapYear => {
  const startFY = financialYearContaining(state.accountStartDay);
  // Every branch below merges `provenanceOfCapPrevFY`, including the ones that read no figure at
  // all: the cap they return is last year's, so its history is this year's history.
  const inherited = (fy: FinancialYear, ...also: readonly ComputedProvenance[]): ComputedProvenance =>
    mergeProvenance(provenanceOf(fy, []), state.provenanceOfCapPrevFY, ...also);
  const carried = (basis: PersonalCapBasis, provenance: ComputedProvenance, unused: number | null, rise: Cents): PersonalCapYear =>
    Object.freeze({
      fy: thisFY,
      cap: state.capPrevFY,
      basis,
      unusedCapPercentage: unused,
      indexationIncrease: rise,
      increase: 0 as Cents,
      provenance,
    });

  if (compareFinancialYears(thisFY, startFY) < 0) {
    throw new RangeError(
      `FY${thisFY} is before FY${startFY}, the financial year the transfer balance account started ` +
        `in (${state.accountStartDay}): there is no personal transfer balance cap to carry forward`,
    );
  }
  // 1. s 294-40(1)'s parenthetical. The cap handed in IS the seed, and it is returned untouched —
  //    deliberately without re-deriving it from the general cap to check, because re-deriving a
  //    seeded cap from a later year's general cap is the one error this whole section is shaped
  //    against, and a "check" is as good a doorway for it as a computation.
  if (compareFinancialYears(thisFY, startFY) === 0) {
    return carried(
      'carried forward: s 294-40 does not apply in the seeding year (s 294-40(1))',
      inherited(thisFY),
      null,
      0 as Cents,
    );
  }
  // 2. s 294-40(1)(b), latching, read as at the start of the year, and decided without a general cap.
  if (state.hasEverExceededCap) {
    return carried(
      'carried forward: an end-of-day excess has permanently disqualified indexation (s 294-40(1)(b))',
      inherited(thisFY),
      null,
      0 as Cents,
    );
  }

  const prevFY = toFinancialYear(financialYearStartYear(thisFY) - 1);
  const capThis = series === undefined ? generalTransferBalanceCap(thisFY) : generalTransferBalanceCap(thisFY, series);
  const capPrev = series === undefined ? generalTransferBalanceCap(prevFY) : generalTransferBalanceCap(prevFY, series);
  const provenance = inherited(thisFY, capThis.provenance, capPrev.provenance);
  // The subtraction, and the only figure that leaves it. Neither general cap is used anywhere else
  // in this function, which is the shape T63 has to defeat rather than a comment asking it not to.
  const increase = (capThis.amount - capPrev.amount) as Cents;

  // 3. s 294-40(1)(a).
  if (increase <= 0) {
    return carried('carried forward: the general cap did not rise this year (s 294-40(1)(a))', provenance, null, increase);
  }

  // 4. s 294-40(2). The unused percentage, recomputed from the all-time high every time (T64).
  const { highestEndOfDayTransferBalance: highest, personalCapOnHighestBalanceDay: denominator } = state;
  let unusedCapPercentage: number;
  if (highest < 0) {
    // s 294-40(3), as the statute states it: the unused cap percentage is TAKEN TO BE 100%.
    unusedCapPercentage = 100;
  } else {
    if (highest > denominator) {
      throw new RangeError(
        `the highest end-of-day transfer balance ${formatCents(highest)} exceeds the personal ` +
          `transfer balance cap of ${formatCents(denominator)} on the day it was attained, but ` +
          'hasEverExceededCap is false. Those two facts cannot both hold: an end-of-day balance ' +
          'above the cap is what latches s 294-40(1)(b). The unused cap percentage is not ' +
          'computed from inconsistent state, because clamping it to 0% would hide the defect ' +
          'inside a cap that looks entirely reasonable',
      );
    }
    // s 294-40(2)(c): FLOOR the USED percentage, then (2)(d) subtracts. The direction is the
    // taxpayer's, and reversing it is T61.
    unusedCapPercentage = 100 - Math.floor((100 * highest) / denominator);
  }

  const increment = (unusedCapPercentage * increase) / 100;
  // §3.10.2's invariant, stated a second time the other way round and deliberately not factored
  // together with the line above — the same discipline `superPhase.ts` uses on its own coverage
  // check. The general cap moves in whole $100,000 steps (s 294-35(3)), so every increase is a
  // whole number of steps and each step contributes $1,000 per unused percentage point. If the two
  // routes disagree, or the cap comes out bearing cents, the arithmetic is wrong and no figure
  // leaves this function.
  const steps = increase / INDEXATION_STEP;
  const check = steps * unusedCapPercentage * THOUSAND_DOLLARS;
  const cap = (state.capPrevFY + increment) as Cents;
  if (
    !Number.isInteger(steps) ||
    increment !== check ||
    !Number.isInteger(unusedCapPercentage) ||
    unusedCapPercentage < 0 ||
    unusedCapPercentage > 100 ||
    cap % THOUSAND_DOLLARS !== 0
  ) {
    throw new RangeError(
      `the personal transfer balance cap for FY${thisFY} came out as ${formatCents(cap)} from a ` +
        `${unusedCapPercentage}% unused cap percentage of an indexation increase of ` +
        `${formatCents(increase)} (${steps} step(s) of $100,000, cross-checked as ` +
        `${formatCents(check as Cents)}). A personal cap is always a whole multiple of $1,000 and ` +
        'the unused percentage is always an integer in [0, 100] (register §3.10.2)',
    );
  }
  return Object.freeze({
    fy: thisFY,
    cap: cap as PersonalTransferBalanceCap,
    basis: 'increased by the unused cap percentage of the indexation increase (s 294-40(2))',
    unusedCapPercentage,
    indexationIncrease: increase,
    increase: increment as Cents,
    provenance,
  });
};

// --- Chunk 3 — the day-level high-water mark, and R1's end-of-day breach refusal --------------------
//
// **The high-water mark is a DOLLAR FIGURE, not a proportion** (§3.10.3). Four rules, and they are
// four, not one:
//
//   1. It is measured at the **END of a day**, never intraday. A credit and a debit on the same day
//      net out and the spike between them never happened — LCR 2016/9 ¶51, where Alice's same-day
//      credit and debit on 1 July 2017 leave her with **no** excess ever and her indexation intact.
//      That is why `advanceTransferBalanceDay` takes one **closing** balance per day and refuses a
//      day it has already closed: there is no shape in which two figures for one day can be handed
//      in and the larger of them win.
//   2. It is **never reduced by a later debit**. Commuting the whole pension to nil leaves the
//      numerator of s 294-40(2)(a) exactly where it was — T59, T84.
//   3. Where the same maximum occurs on more than one day, s 294-40(2)(b) takes the **earliest**, so
//      the mark and its day are written **only on a STRICT increase** — T71. The day is not
//      decoration: it is how §3.10.3 field 6, the personal cap on that day, is chosen, and that cap
//      is the denominator chunk 2 divides by. An off-by-one-day tie writes a different denominator
//      and so a different cap, for ever.
//   4. It may itself be **negative** (s 294-30(2) Note 2 permits a negative transfer balance with no
//      consequence), in which case s 294-40(3) takes the unused percentage to be 100%.
//
// **R1, and it is not softened here.** An end-of-day transfer balance that **exceeds** the Person's
// personal cap raises `TransferBalanceCapExceededError` and the year is not projected. Excess
// transfer balance tax is not implemented and warn-and-continue has no conservative form (§3.10.5).
// **Equalled is not exceeded**: a balance equal to the cap is not a breach, s 294-40 keeps applying,
// and the answer is a 0% unused percentage — the second of §3.10.2's *two ways to lose indexation*,
// which is equally permanent and is a different rule. The comparison is `>` in exactly one place
// below, and chunk 2's own boundary test asserts the same edge from the other side.
//
// **Why the latch is carried forward here and never SET here, which is a consequence of R1 and not a
// gap.** §3.10.5's ruled row says it in terms: *"under R1 a projected day that would set the flag
// throws instead, so the end-of-day test becomes the detector that fires the refusal and the Setting
// is what feeds the flag"*. So the one live write path for `hasEverExceededCap` is a Person's
// **stated** history, which arrives through `transferBalanceAccountDaysAsStated`; every projected
// day either carries the flag forward unchanged or does not return at all. §3.10.3's field-7 row
// (*"updated at the end of every day, against that day's cap"*) describes that same machine as it
// stood before R1 was applied to it, and the two are reconciled by the refusal, not in conflict.
// Writing `state.hasEverExceededCap || exceededToday` below would be monotone and would also be
// **dead in its second operand**, since the throw is above it — an unreachable branch dressed as
// coverage, which this project treats as worse than an honest propagation.
//
// **What encapsulation does and does not buy, stated so it is not over-claimed.** The state below is
// branded with a `unique symbol` no caller can name, so there is no object literal anywhere outside
// this module that typechecks as one: a caller cannot mint a state whose mark is lower than its own
// history, and the only three producers are in this file. That makes rules 2 and 3 **structural
// against a caller**. It does **not** make them structural against an author: `>` could be written
// `>=` inside `advanceTransferBalanceDay` and the compiler would have nothing to say. The monotone
// re-check at the end of that function is a runtime tripwire for exactly that mutation, and the tie
// rule has no equivalent — it is test-only, and the fixtures price it in dollars rather than
// asserting a day.

declare const TRANSFER_BALANCE_ACCOUNT_DAYS: unique symbol;

/**
 * **§3.10.3's fields 4, 5, 6 and 7 — the part of a Person's transfer balance account that is a
 * function of every day since the account started, rather than of one day.**
 *
 * Field 3, the running `transferBalance` itself, is deliberately **not** here: it is chunk 4's, it
 * moves only on the s 294-25(1) credits and s 294-80(1) debits — it is the `TransferBalanceLedger`
 * chunk 4 adds below — and this state is fed the day's
 * closing figure rather than owning it. Nothing here can reconstruct it, which is the point — a
 * high-water mark that could also answer *"what is the balance today?"* is one an implementer will
 * eventually ask that question of.
 *
 * The brand is not decoration. Without it this is a plain structural type and any caller could write
 * `{ highestEndOfDayTransferBalance: 0, … }` and hand it back in, which would make the monotone
 * guarantee a convention rather than a property. With it, the only values of this type in existence
 * came out of the three functions below.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real state cannot carry it: `{ ...real, highestEndOfDayTransferBalance: lie }` is
 * TS2741, not a `TransferBalanceAccountDays`, in one step or via an unannotated intermediate const.
 * Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class TransferBalanceAccountDaysWitness { private readonly [TRANSFER_BALANCE_ACCOUNT_DAYS]: true }

export interface TransferBalanceAccountDays extends TransferBalanceAccountDaysWitness {
  /** The last day whose CLOSING balance has been taken. Days are closed once, in order. */
  readonly throughDay: IsoDate;
  /** s 294-40(2)(a), §3.10.3 field 4. Monotone non-decreasing. May be negative. */
  readonly highestEndOfDayTransferBalance: Cents;
  /** s 294-40(2)(b), §3.10.3 field 5. The EARLIEST day the maximum was attained. */
  readonly highestBalanceDay: IsoDate;
  /** s 294-40(2)(c), §3.10.3 field 6. Snapshotted with the day above, never recomputed later. */
  readonly personalCapOnHighestBalanceDay: PersonalTransferBalanceCap;
  /** s 294-40(1)(b), §3.10.3 field 7. Latching, and under R1 only a stated history can set it. */
  readonly hasEverExceededCap: boolean;
}

/**
 * The end-of-day test of s 294-30(1) read with §3.10.5, and the only comparison in this module that
 * decides a breach. **Strictly greater**: equalling the cap is not exceeding it.
 */
const refuseAnEndOfDayBreach = (day: IsoDate, closingBalance: Cents, personalCapOnDay: PersonalTransferBalanceCap): void => {
  if (closingBalance > personalCapOnDay) throw new TransferBalanceCapExceededError(day, closingBalance, personalCapOnDay);
};

/**
 * **The account's first day — the O42 Person, whose account starts INSIDE the forecast and who is
 * therefore fully computable.** §3.10.3 gives the starting points: the mark is the first day's
 * closing balance, the day is the account start day, and the cap on it is the seed cap
 * (`seedPersonalTransferBalanceCap` above produces exactly that figure, for exactly that day).
 *
 * The flag starts `false` and s 294-40 does not apply in the seeding year at all, so nothing this
 * function returns can be indexed until the following 1 July.
 */
export const openTransferBalanceAccountDays = (
  accountStartDay: IsoDate,
  personalCapOnStartDay: PersonalTransferBalanceCap,
  closingBalance: Cents,
): TransferBalanceAccountDays => {
  if (accountStartDay < '2017-07-01') {
    throw new RangeError(
      `a transfer balance account cannot start on ${accountStartDay}: ITAA 1997 s 294-15(2) starts ` +
        'it on the LATER of 1 July 2017 and the first day the Person is a retirement phase recipient',
    );
  }
  refuseAnEndOfDayBreach(accountStartDay, closingBalance, personalCapOnStartDay);
  return Object.freeze({
    throughDay: accountStartDay,
    highestEndOfDayTransferBalance: closingBalance,
    highestBalanceDay: accountStartDay,
    personalCapOnHighestBalanceDay: personalCapOnStartDay,
    hasEverExceededCap: false,
  }) as TransferBalanceAccountDays;
};

/**
 * **The stated history of a Person whose account predates the forecast — §3.10.7's Settings, and
 * under R1 the ONLY live write path for `hasEverExceededCap`.**
 *
 * This is the one door through which a state not built day by day can enter, and it exists because
 * the flag must be buildable regardless of the refusal: refusing only prevents **new** breaches and
 * cannot undo one that predates the projection, and without the flag the model silently restores a
 * proportional indexation entitlement s 294-40(1)(b) removed permanently (R1).
 *
 * It is an **input boundary, not a computation**, and it is honest about what that costs: a user who
 * states a mark lower than their true history gets a cap that is too high, and nothing here can
 * detect it — the register's own answer is that these seven fields come off the ATO's record of the
 * account, and `UnknownPersonalTransferBalanceCapError` refuses the Person who cannot supply them.
 * What **is** checked is internal consistency, because two of the stated fields can contradict each
 * other outright: a mark above the cap on its own day with the flag stated `false` is exactly the
 * state chunk 2 refuses rather than clamps, and catching it here names the Setting that is wrong
 * instead of surfacing it a financial year later as an arithmetic complaint.
 *
 * **Why every parameter key carries a `stated` prefix, which is the only reason this door is not
 * also a laundering route.** The branded state above is a structural SUPERSET of a bare parameter
 * object spelled with the statute's own field names, and a symbol-keyed brand survives an object
 * spread — so `transferBalanceAccountDaysAsStated({ ...realState, highestEndOfDayTransferBalance: 0 })`
 * would typecheck, pass both consistency checks below (zero is not after `throughDay`; zero does not
 * exceed the cap) and come back out **branded**, with a high-water mark below its own history.
 * Priced by §3.10.9's high-water fixture: the honest $2,040,000 replaced by $2,055,000, the
 * 40%-unused answer replaced by the 100%-unused one, permanently, because next year carries forward
 * from it. No runtime witness can catch it: this state carries no trail, by design (*"Nothing here
 * can reconstruct it, which is the point"*), so unlike the ledger's `Σ movement` there is nothing to
 * read back.
 *
 * The prefix closes it **structurally**. A spread of a real state supplies none of the five required
 * keys, so `tsc` refuses the expression outright (TS2345, five missing properties) rather than
 * accepting a wrong number — and honest use is untouched, because stating Settings means writing the
 * five fields out one by one, which is exactly what a user-supplied record is. The rename is
 * deliberately a **visible identifier change**: the wrong move becomes a compile error at the call
 * site instead of a silent acceptance, and a caller who wants the laundered state must now type out
 * the lie field by field rather than spreading it past the checks.
 *
 * This follows the precedent chunk 4 sets for `creditOnCommencement`, whose parameter is
 * `valueOfSupportingInterestOnStartingDay` rather than `value`: *"`value` on its own is the name of
 * the mistake … The name is the only thing standing between the two."* The **refusal messages** and
 * the register's §3.10.3 table keep the statute's spellings; only the parameter keys take the
 * prefix, because it is the parameter, not the field, that is being distinguished.
 */
export const transferBalanceAccountDaysAsStated = (stated: {
  readonly statedThroughDay: IsoDate;
  readonly statedHighestEndOfDayTransferBalance: Cents;
  readonly statedHighestBalanceDay: IsoDate;
  readonly statedPersonalCapOnHighestBalanceDay: PersonalTransferBalanceCap;
  readonly statedHasEverExceededCap: boolean;
}): TransferBalanceAccountDays => {
  if (stated.statedHighestBalanceDay > stated.statedThroughDay) {
    throw new RangeError(
      `the stated highest-balance day ${stated.statedHighestBalanceDay} is after ${stated.statedThroughDay}, ` +
        'the last day the stated history covers: the high-water mark cannot have been attained on a ' +
        'day the account has not reached',
    );
  }
  if (!stated.statedHasEverExceededCap && stated.statedHighestEndOfDayTransferBalance > stated.statedPersonalCapOnHighestBalanceDay) {
    throw new RangeError(
      `the stated highest end-of-day transfer balance ${formatCents(stated.statedHighestEndOfDayTransferBalance)} ` +
        `exceeds the stated personal transfer balance cap of ${formatCents(stated.statedPersonalCapOnHighestBalanceDay)} ` +
        `on ${stated.statedHighestBalanceDay}, the day it was attained, but hasEverExceededCap is stated ` +
        'false. Those two Settings contradict each other: an end-of-day balance above the cap is ' +
        'precisely what latches ITAA 1997 s 294-40(1)(b), permanently. Check both against the ATO ' +
        'record of the transfer balance account rather than reconciling them here',
    );
  }
  return Object.freeze({
    throughDay: stated.statedThroughDay,
    highestEndOfDayTransferBalance: stated.statedHighestEndOfDayTransferBalance,
    highestBalanceDay: stated.statedHighestBalanceDay,
    personalCapOnHighestBalanceDay: stated.statedPersonalCapOnHighestBalanceDay,
    hasEverExceededCap: stated.statedHasEverExceededCap,
  }) as TransferBalanceAccountDays;
};

/**
 * **One day, closed once — the whole of chunk 3's arithmetic, and the point at which R1 refuses.**
 *
 * Order, and it is the order the statute reads in:
 *
 * 1. **The day must be new and later than the last day closed.** Not a formality: §3.10.3 measures
 *    at the end of a day precisely so that a credit and a debit on one day net out (LCR 2016/9 ¶51),
 *    and a caller allowed to close 3 March twice — once after the credit and once after the debit —
 *    would resurrect the intraday spike the rule exists to erase. Out of order, the tie rule breaks
 *    too: *earliest* is only meaningful over days seen in order.
 * 2. **The end-of-day breach test (R1).** Strictly greater than the cap **on that day**, which is
 *    why the cap is a per-day parameter and not a field of the state: a year boundary moves it, and
 *    testing an April balance against July's cap is a wrong answer in whichever direction the cap
 *    moved.
 * 3. **The strict increase**, which writes all three of the mark, its day and that day's cap
 *    together or writes none of them. A tie takes the earlier day by taking no branch at all.
 *
 * The monotone re-check at the end states rule 2 of the header a second time, the other way round —
 * the same discipline `superPhase.ts` uses on its own coverage figure. It is not redundant with the
 * branch: it is what fails if the comparison above is ever inverted, which is the one mutation the
 * brand and the encapsulation cannot see.
 */
export const advanceTransferBalanceDay = (input: {
  readonly state: TransferBalanceAccountDays;
  readonly day: IsoDate;
  readonly closingBalance: Cents;
  readonly personalCapOnDay: PersonalTransferBalanceCap;
}): TransferBalanceAccountDays => {
  const { state, day, closingBalance, personalCapOnDay } = input;
  if (day <= state.throughDay) {
    throw new RangeError(
      `${day} is not after ${state.throughDay}, the last day this transfer balance account closed: ` +
        'each day is closed once, with one END-OF-DAY balance, and in order. A day closed twice ' +
        'would let an intraday figure become the high-water mark, and ITAA 1997 s 294-40(2)(a) ' +
        'measures the highest balance at the END of a day — a credit and a debit on the same day ' +
        'net out and the spike between them never happened (LCR 2016/9 ¶51)',
    );
  }
  refuseAnEndOfDayBreach(day, closingBalance, personalCapOnDay);

  // s 294-40(2)(a) and (b): STRICTLY greater. A tie leaves the mark, its day and its cap alone, so
  // the earliest of the tied days is the one that survives (T71).
  const isAStrictIncrease = closingBalance > state.highestEndOfDayTransferBalance;
  const next = Object.freeze({
    throughDay: day,
    highestEndOfDayTransferBalance: isAStrictIncrease ? closingBalance : state.highestEndOfDayTransferBalance,
    highestBalanceDay: isAStrictIncrease ? day : state.highestBalanceDay,
    personalCapOnHighestBalanceDay: isAStrictIncrease ? personalCapOnDay : state.personalCapOnHighestBalanceDay,
    // Carried forward, never set here: under R1 the day that would set it threw above (§3.10.5).
    hasEverExceededCap: state.hasEverExceededCap,
  }) as TransferBalanceAccountDays;

  if (next.highestEndOfDayTransferBalance < state.highestEndOfDayTransferBalance) {
    throw new RangeError(
      `closing ${day} at ${formatCents(closingBalance)} lowered the high-water mark from ` +
        `${formatCents(state.highestEndOfDayTransferBalance)} to ` +
        `${formatCents(next.highestEndOfDayTransferBalance)}. ITAA 1997 s 294-40(2)(a) asks for the ` +
        'HIGHEST transfer balance at the end of any day since the account started, which no later ' +
        'debit can reduce: commuting the whole pension to nil leaves the numerator where it was',
    );
  }
  return next;
};

/**
 * **The seam between chunk 3 and chunk 2, and it is a function so that the compiler checks it.**
 *
 * s 294-40 reads three of the fields above (§3.10.3 fields 4, 6 and 7) together with the account
 * start day and last year's personal cap, which are not day-level state and arrive separately. A
 * spread at a call site would do the same thing and would keep doing it silently if a field were
 * ever renamed on one side only; a declared return type makes that a compile error instead.
 *
 * The three fields are copied by name rather than spread for the same reason: a `...state` would
 * also carry `throughDay` and the brand into a shape that s 294-40 has no use for, and a state shape
 * that carries what the formula does not read is how an implementer comes to feel entitled to read it.
 */
export const carryPersonalCapForward = (
  state: TransferBalanceAccountDays,
  account: {
    readonly accountStartDay: IsoDate;
    readonly capPrevFY: PersonalTransferBalanceCap;
    readonly provenanceOfCapPrevFY: ComputedProvenance;
  },
): PersonalCapCarryForward =>
  Object.freeze({
    accountStartDay: account.accountStartDay,
    capPrevFY: account.capPrevFY,
    provenanceOfCapPrevFY: account.provenanceOfCapPrevFY,
    highestEndOfDayTransferBalance: state.highestEndOfDayTransferBalance,
    personalCapOnHighestBalanceDay: state.personalCapOnHighestBalanceDay,
    hasEverExceededCap: state.hasEverExceededCap,
  });

// --- Chunk 4 — the ledger proper: s 294-25(1) item 2 credits, s 294-80(1) item 1 debits ------------
//
// **§3.10.3's field 3, and the producer of the closing balance chunk 3 consumes.** Until now a
// caller handed `advanceTransferBalanceDay` a figure and the module took its word for it. This is
// where the figure comes from, and the whole design question is what is allowed to move it.
//
// **The account is a TRANSACTION LEDGER valued at commencement, not a balance** (§3.10.4). It moves
// only on the five s 294-25(1) credit events and the eight s 294-80(1) debit events; this tool
// computes exactly one of each — item 2 and item 1 — and the other eleven limbs are the six scope
// refusals registered above. Between events the ledger is **inert**, and "inert" is not a convention
// here: there is no function in this file that takes a rate, a period, a market value or an earnings
// figure, so there is nothing for a growth number to be passed to.
//
// **THE TWO NEGATIVES, REPRODUCED ROW BY ROW RATHER THAN SUMMARISED INTO ONE SENTENCE.** §3.10.4
// carries them as two rows of one table with two different confidence labels and says in terms that
// *"the two must not be flattened into one label"*. Both are enforced below by the identical
// mechanism — the absence of any code path — so the code cannot carry the difference and this
// comment has to. The rows, in the register's own words:
//
//   * **"Investment earnings create NO credit" (and losses no debit).** Source: *"there is **no
//     item** in the s 294-25(1) table triggered by the interest growing. Item 3 is triggered by
//     excess transfer balance and its amount is notional earnings on the excess; item 4 needs an
//     LRBA repayment in a small fund"* — s 294-25(1) read as exhaustive, LCR 2016/9 ¶¶24, 24A, 27,
//     39F. Confidence: *"primary-verified as an exhaustive-table reading, and corroborated in terms
//     by a public ruling — but the negative itself is an ARGUMENT FROM THE ABSENCE OF A TABLE ITEM.
//     It must never be recorded as bare `primary-verified`."*
//   * **"A pension drawdown creates NO debit."** Source: *"s 294-80(1) item 1 requires a
//     **superannuation lump sum**, and s 307-65(1) defines one as 'a superannuation benefit that is
//     **not** a superannuation income stream benefit'. A pension payment is an income stream
//     benefit, so it can never satisfy item 1"* — ss 294-80(1) item 1, 307-65(1), 307-70(1),
//     LCR 2016/9 ¶¶24A, 24B, 25. Confidence: *"primary-verified — a POSITIVE DEFINITIONAL
//     EXCLUSION, not an absence. Stronger than the row above, and the two must not be flattened
//     into one label."*
//
// The second is a definition doing the work; the first is an enumeration being read as closed. A
// future pass that finds a sixth credit item would falsify the first and leave the second standing
// untouched, which is the whole reason for keeping them apart.
//
// **Three functions, and deliberately no fourth that takes a characterisation and branches.**
// `recordPensionPayment` and `recordCommutation` are separate entry points, mirroring
// `superPhase.ts`'s own `transitionToRetirementInterest` / `retirementPhaseInterest` split. A single
// `recordWithdrawal(kind, amount)` would put the whole of the definitional exclusion above inside
// one string literal that a mutation could flip — T74, exactly — and the only test that could catch
// it would be one asserting on a branch. Two functions cannot be confused by a flag: calling the
// wrong one is a different identifier at the call site, which a diff shows and a flipped literal
// does not. `recordPensionPayment` goes further and contains **no arithmetic operator at all**: the
// balance it writes is the balance it was handed, by reference, so there is no `+` or `-` in the
// drawdown path for a mutation to invert.
//
// **What that does NOT buy, stated rather than implied.** It stops a *caller* characterising a
// withdrawal with a boolean. It does not stop an *author* writing `- payment` inside
// `recordPensionPayment`, and `tsc` would have nothing to say about that: two `Cents` subtract
// cleanly. That residue is priced by the fixtures, in dollars, and it is the mutation battery's job
// rather than the compiler's.

/**
 * **O47's characterisation — the one input that decides whether a withdrawal is a s 294-80(1)
 * item 1 debit, and the type this module defines for two other modules to read later.**
 *
 * §3.10.4: *"The same cashflow is a debit or nothing **depending on the member's act** — it cannot
 * be inferred from size."* A $50,000 withdrawal is a pension payment or a partial commutation
 * because of what the member elected, not because of anything observable in the amount, the timing
 * or the account. So it is an input, and it is the member's.
 *
 * **It is not a parameter of anything in this file, and that is the point.** It is the fact a caller
 * holds *before* deciding which of `recordPensionPayment` and `recordCommutation` to call. Nothing
 * below accepts it, because a function that accepted it would have to branch on it.
 *
 * **O47's coordination point, recorded and not acted on here.** §3.10.4 notes that this same
 * characterisation is read by §3.9's Schedule 7 machinery — a partial commutation produces a debit
 * here **and** does not count toward the pension's annual minimum — so `minimumDrawdown.ts` and
 * `ttrPaymentRange.ts` must eventually read the same type. Neither has a slot for it today; adding
 * one is additive work on two already-shipped, tested modules and is **not** part of this chunk.
 * Note the neighbouring warning in the same paragraph, which is about a different helper and must
 * not be read as applying to this type: the §3.9 minimum and the §3.10 credit read **different
 * days**, so a shared *"pension balance as at"* helper is a bug waiting to happen (T56). The
 * characterisation is shared; the valuation is not.
 */
export type WithdrawalCharacterisation = 'pensionPayment' | 'partialCommutation';

/**
 * **§3.10.4, the partial-commutation row:** *"Default the characterisation to `pensionPayment` — the
 * direction that does not invent headroom (T81)."*
 *
 * The asymmetry is the reason. Defaulting to `partialCommutation` debits the ledger for a withdrawal
 * the member never elected to commute, which manufactures transfer balance cap space out of an
 * ordinary drawdown and lets a later commencement through that should have breached. Defaulting to
 * `pensionPayment` leaves the ledger where it is: the member who really did commute and did not say
 * so gets **less** headroom than they are entitled to, which is the error this project accepts.
 *
 * It is a constant rather than a parameter default so that it has exactly one value in the codebase
 * and a test can assert on it.
 */
export const DEFAULT_WITHDRAWAL_CHARACTERISATION: WithdrawalCharacterisation = 'pensionPayment';

/**
 * What a single line of the ledger records. The `event` string is the statutory limb, written as a
 * literal by whichever function produced the line — there is no place a caller can supply it.
 */
export type TransferBalanceLedgerEvent =
  | 'credit — s 294-25(1) item 2: a superannuation income stream started'
  | 'debit — s 294-80(1) item 1: a superannuation lump sum on commutation'
  | 'no movement — a pension payment is not a superannuation lump sum (s 307-65(1))';

export interface TransferBalanceLedgerEntry {
  /** The day the event happened. For item 2 the stream's **starting day**; for item 1 the day the lump sum is **received**. */
  readonly day: IsoDate;
  readonly event: TransferBalanceLedgerEvent;
  /** The dollar figure of the event itself, as stated. Never negative: direction lives in `movement`. */
  readonly amount: Cents;
  /** What the event did to the transfer balance: `+amount`, `-amount`, or **exactly zero**. */
  readonly movement: Cents;
}

declare const TRANSFER_BALANCE_LEDGER: unique symbol;

/**
 * **§3.10.3 field 3 — the running transfer balance, and the audit trail that produced it.**
 *
 * Branded for the same reason the day state is: without it this is a structural type and any caller
 * could write `{ transferBalance: 0, … }` and hand it in, which would make every rule below a
 * convention. With it, the only values of this type in existence came out of the four producers in
 * this file, and every cent of every one of them is on the `entries` trail.
 *
 * **It may be negative, and that is not an error** (s 294-30(2) Note 2: *"There is no consequence
 * for having a negative transfer balance"*; §3.10.5 says in terms do **not** refuse on one). A
 * $500,000 structured settlement debit against a $300,000 credit leaves −$200,000, and s 294-40(3)
 * then takes the unused cap percentage to be 100%.
 *
 * **Several events may share a day, and the ledger must permit that** — unlike
 * `advanceTransferBalanceDay`, which closes a day once. s 294-40(2)(a) measures at the **end** of a
 * day, so a credit and a debit on 1 July net out and the intraday spike never happened
 * (LCR 2016/9 ¶51, Alice). The ledger is therefore ordered by `day` non-decreasing, and
 * `closingBalanceOn` is the only way to read a figure out of it for a given day.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, and no
 * object literal can supply a private member, a spread of a real ledger included:
 * `{ ...realLedger, transferBalance: lie }` is TS2741, not a `TransferBalanceLedger`, and so is the
 * same spread taken in two steps through an unannotated `const`. Nothing exists at runtime; the value
 * is still a plain frozen record and every reader is unchanged.
 */
declare class TransferBalanceLedgerWitness { private readonly [TRANSFER_BALANCE_LEDGER]: true }

export interface TransferBalanceLedger extends TransferBalanceLedgerWitness {
  readonly transferBalance: Cents;
  /** The day of the most recent entry, or the account start day while the ledger is empty. */
  readonly throughDay: IsoDate;
  readonly entries: readonly TransferBalanceLedgerEntry[];
}

/**
 * **The ledger's own witness, checked at runtime as well as by the type.**
 *
 * Until P3-41 the brand above was an ordinary `[SYM]: true` property, and it blocked a bare
 * annotated object literal (TS2741) and nothing else. A **spread** of a real ledger carried the
 * symbol-keyed brand into the type of the result, and overriding a *known* field never trips
 * excess-property checking, so `{ ...realLedger, transferBalance: 200_000_000 as Cents }` was a
 * `TransferBalanceLedger` to the compiler — measured, and a $2,400,000 ledger was made to read back
 * $2,000,000, §3.10.9's own named wrong answer for the *"Ledger, not balance"* row, with no error
 * and no breach raised. The private-member brand now closes that at compile time. This check stays
 * because the type cannot see an `as` cast or a JavaScript caller, and it is the account's own
 * definition read back rather than an extra rule.
 *
 * What closes it is that the invariant is already written down in the data. Every producer records
 * a `movement` equal to what it did to the balance — `+amount` for the s 294-25(1) item 2 credit,
 * `−amount` for the s 294-80(1) item 1 debit, and exactly zero for the payment that is not a
 * superannuation lump sum (s 307-65(1)) — so `transferBalance` is the running sum of
 * `entries[].movement` by construction, and the two can differ only in a value that did not come
 * out of the producers. The check is therefore not an extra rule: it is the account's own
 * definition, read back.
 *
 * It is called at the only write (`appended`) and at the only read (`closingBalanceOn`), and the
 * full sum is taken at both. The read is the one that matters, because `closeDayFromLedger` routes
 * every closed day through it and a laundered ledger need never be appended to again. The cost is
 * one pass over at most a few hundred entries, about once per closed day.
 *
 * **`throughDay` is witnessed the same way, and by the same data.** The sum closes the balance and
 * says nothing about the day it is the balance *of*, so `{ ...realLedger, throughDay: '2026-08-01' }`
 * used to pass both guards and answer 1 Aug 2026 with 1 Sep 2026's honest figure — $2,400,000 where
 * $1,500,000 is true, a *phantom* breach rather than a missed one. The entries carry their own
 * `day`, and every one of the four producers writes `throughDay` from it: `appended` sets it to
 * `entry.day` and refuses an entry before it, so the trail is non-decreasing and its last day IS
 * `throughDay`; `openTransferBalanceLedger` is the only other producer and has no entries at all.
 * That last case is the limit of this check and is stated rather than hidden — **an empty ledger's
 * `throughDay` has no witness**, because the account start day is an input, not a derived fact. It
 * moves no figure: a ledger with no entries reads back zero on every day.
 */
const requireAConformingLedger = (ledger: TransferBalanceLedger): TransferBalanceLedger => {
  const sumOfMovements = ledger.entries.reduce((total, entry) => total + entry.movement, 0) as Cents;
  if (sumOfMovements !== ledger.transferBalance) {
    throw new RangeError(
      `this transfer balance ledger says its running total is ${formatCents(ledger.transferBalance)}, ` +
        `but the ${ledger.entries.length} entr${ledger.entries.length === 1 ? 'y' : 'ies'} on its own ` +
        `trail move it by ${formatCents(sumOfMovements)} in total — a difference of ` +
        `${formatCents((ledger.transferBalance - sumOfMovements) as Cents)}. Every producer in this ` +
        'file writes a movement equal to the change it makes to the balance, so the two figures can ' +
        'only differ if this value was assembled outside them — most likely by spreading a real ' +
        'ledger and overriding `transferBalance` behind a cast or from JavaScript. A transfer ' +
        'balance account is a transaction ledger (ITAA 1997 ss 294-25 and 294-80), so the trail IS ' +
        'the account and the stored total cannot outrank it',
    );
  }
  const lastEntry = ledger.entries[ledger.entries.length - 1];
  if (lastEntry !== undefined && ledger.throughDay !== lastEntry.day) {
    throw new RangeError(
      `this transfer balance ledger says it runs through ${ledger.throughDay}, but the last of its ` +
        `${ledger.entries.length} entr${ledger.entries.length === 1 ? 'y' : 'ies'} is dated ` +
        `${lastEntry.day}. Every producer in this file writes \`throughDay\` from the day of the ` +
        'entry it is recording, so the two can only differ if this value was assembled outside them ' +
        '— most likely by spreading a real ledger and overriding `throughDay` behind a cast or ' +
        'from JavaScript. The day matters as much as the figure: ITAA 1997 s 294-40(2)(a) ' +
        'measures the balance at the END of a day, so a ledger that misdates its own last movement ' +
        'answers one day with the closing balance of another',
    );
  }
  return ledger;
};

/**
 * The one place a ledger grows a line. It takes the next balance rather than computing one, so each
 * caller below owns its own arithmetic and no shared expression can be inverted for all three at
 * once.
 */
const appended = (ledger: TransferBalanceLedger, entry: TransferBalanceLedgerEntry, transferBalance: Cents): TransferBalanceLedger => {
  requireAConformingLedger(ledger);
  if (entry.day < ledger.throughDay) {
    throw new RangeError(
      `${entry.day} is before ${ledger.throughDay}, the day of the last entry in this transfer ` +
        'balance ledger: credits and debits are recorded in date order. Several events may share ' +
        'one day — ITAA 1997 s 294-40(2)(a) measures the balance at the END of a day, so a credit ' +
        'and a debit on the same day net out (LCR 2016/9 ¶51) — but a later event cannot be ' +
        'recorded before an earlier one, because the closing balance of every day between them ' +
        'would already have been taken',
    );
  }
  if (entry.amount < 0) {
    throw new RangeError(
      `a transfer balance ledger event cannot have a negative amount (${formatCents(entry.amount)} ` +
        `on ${entry.day}). A negative credit is a debit that has not said which of the eight ` +
        's 294-80(1) items it is, and a negative debit is a credit that has not said which of the ' +
        'five s 294-25(1) items it is; either would move the account through a door that does not ' +
        'ask what the event was',
    );
  }
  return Object.freeze({
    transferBalance,
    throughDay: entry.day,
    entries: Object.freeze([...ledger.entries, entry]),
  }) as TransferBalanceLedger;
};

/**
 * **An empty account, on the day it starts — ITAA 1997 s 294-15(2).**
 *
 * The balance starts at zero and the first entry is normally the item 2 credit for the very stream
 * whose starting day this is: s 294-15(2) starts the account on the later of 1 July 2017 and the
 * first day the Person is a retirement phase recipient, so an account with no credit on its own
 * start day is a Person who was not yet a recipient on it.
 *
 * This is the O42 Person — the account starts **inside** the forecast and every later movement is
 * generated by the engine. A Person whose account predates the forecast does not come through here;
 * `UnknownPersonalTransferBalanceCapError` refuses them, because their balance is not reconstructible
 * from anything this tool holds.
 */
export const openTransferBalanceLedger = (accountStartDay: IsoDate): TransferBalanceLedger => {
  if (accountStartDay < '2017-07-01') {
    throw new RangeError(
      `a transfer balance account cannot start on ${accountStartDay}: ITAA 1997 s 294-15(2) starts ` +
        'it on the LATER of 1 July 2017 and the first day the Person is a retirement phase recipient',
    );
  }
  return Object.freeze({ transferBalance: 0 as Cents, throughDay: accountStartDay, entries: Object.freeze([] as readonly TransferBalanceLedgerEntry[]) }) as TransferBalanceLedger;
};

/**
 * **s 294-25(1) item 2 — the only credit this tool computes.**
 *
 * The trigger is *"you start to be a retirement phase recipient of a superannuation income stream"*
 * on a day, and the amount credited is *"the **value on the starting day** of the superannuation
 * interest that supports"* the stream. §3.10.4 names the three figures that are **not** it: not the
 * 1 July value, not the prior 30 June balance, not the Total Super Balance. The only day 1 July is
 * the right answer is when the pension actually commences on 1 July (T77).
 *
 * **This is a one-shot photograph, and everything the ledger does afterwards follows from that.**
 * LCR 2016/9 ¶24: *"Once a superannuation income stream has commenced and a credit arises …,
 * subsequent changes in the value of the supporting superannuation interest do not affect your
 * transfer balance"*, worked at ¶27 — Darius credits $1.1m on 1 July 2018, the interest is worth
 * $1.05m a year later, and his transfer balance is **still $1.1m**. There is no function in this
 * module through which the $50,000 could be given back, and that absence is the first of the two
 * negatives above.
 *
 * **Why the parameter is named for the day rather than for the amount.** `value` on its own is the
 * name of the mistake: a caller with a pension balance in hand will pass it, and on any day but the
 * starting day that is a different figure. The name is the only thing standing between the two,
 * since both are `Cents` and the compiler cannot tell them apart.
 *
 * **What "value" means, and the one labelled inference in the chain** (§3.10.4): s 307-205(b) is
 * *"the total amount of all the superannuation lump sums that could be payable from the interest at
 * that time"*, and reg 307-205.02(2)(b)(ii) excludes account-based streams from the regulation
 * method, so limb (a) is empty and (b) governs. The statutory chain is primary-verified; the last
 * step — *"the whole interest is commutable, therefore value = balance"* — is a **labelled
 * inference** (U16, O56, O62), and this function does not launder it: it takes the value it is given.
 *
 * **Not every stream that starts credits this figure.** A capped defined benefit income stream
 * credits a *special value* (annual entitlement × 16, or × the remaining term) and is refused by
 * `CappedDefinedBenefitIncomeStreamNotModelledError`; a reversionary stream credits at the end of
 * twelve months, still at the starting-day value, and is refused by `ReversionaryStreamNotModelledError`
 * in `superPhase.ts`. Both refusals fire where the stream is **declared**, at the entry test, and not
 * here: this function is handed a value and cannot tell what produced it, so a guard here would be a
 * guard on nothing (§3.10.4's own reason for refusing on the declaration rather than on a guess).
 */
export const creditOnCommencement = (
  ledger: TransferBalanceLedger,
  commencement: {
    readonly startingDay: IsoDate;
    readonly valueOfSupportingInterestOnStartingDay: Cents;
  },
): TransferBalanceLedger => {
  const amount = commencement.valueOfSupportingInterestOnStartingDay;
  return appended(
    ledger,
    {
      day: commencement.startingDay,
      event: 'credit — s 294-25(1) item 2: a superannuation income stream started',
      amount,
      movement: amount,
    },
    (ledger.transferBalance + amount) as Cents,
  );
};

/**
 * **s 294-80(1) item 1 — the only debit this tool computes, and the only function in this module
 * that reduces a transfer balance.**
 *
 * The trigger is *"a superannuation lump sum"* received because a retirement-phase stream is
 * *"commuted, in full or in part"*; the amount debited is **the amount of the lump sum**, and the
 * day is **the day it is received** — not the day of the election, not the end of the year.
 *
 * **In full or in part, and a full commutation is item 1, not item 6** (T82). Item 6 is expressly
 * conditioned on *"items 1 and 5 do not apply"*, so a full commutation that produces a lump sum has
 * already been answered by item 1 and never reaches item 6. That is why there is one debit function
 * and not two: the statute does not distinguish them by size, so neither does this.
 *
 * **It can take the balance negative and must be allowed to.** s 294-30(2) Note 2: *"There is no
 * consequence for having a negative transfer balance"*, and §3.10.5 says in terms not to refuse on
 * one. A clamp at zero here would destroy exactly the information s 294-40(3) needs — a negative
 * high-water mark is what makes the unused cap percentage 100%.
 *
 * **It debits the ledger and does not touch the high-water mark**, which is the other half of the
 * same rule: commuting the whole pension to nil leaves the numerator of s 294-40(2)(a) exactly where
 * it was (T59, T84). The mark is chunk 3's, it moves only upward, and this function has no access
 * to it.
 *
 * **The remediation point, and it is the only advice this tool may ever emit about an excess**
 * (T76): because a drawdown is not a debit, *"draw down more"* is never a remedy. A commutation is.
 */
export const recordCommutation = (
  ledger: TransferBalanceLedger,
  commutation: {
    readonly dayReceived: IsoDate;
    readonly lumpSum: Cents;
  },
): TransferBalanceLedger => {
  const amount = commutation.lumpSum;
  return appended(
    ledger,
    {
      day: commutation.dayReceived,
      event: 'debit — s 294-80(1) item 1: a superannuation lump sum on commutation',
      amount,
      movement: (0 - amount) as Cents,
    },
    (ledger.transferBalance - amount) as Cents,
  );
};

/**
 * **A pension payment — recorded, and moving nothing. The definitional exclusion, as code.**
 *
 * s 294-80(1) item 1 requires a **superannuation lump sum**. s 307-65(1) *defines* a superannuation
 * lump sum as *"a superannuation benefit that is **not** a superannuation income stream benefit"*.
 * A pension payment is a superannuation income stream benefit (s 307-70(1)), so it can never satisfy
 * item 1, and no other item of the eight reaches it. This is a **positive definitional exclusion**,
 * not an argument from absence — it is the stronger of §3.10.4's two negatives, and the header above
 * keeps it apart from the weaker one.
 *
 * **Why this function exists at all, given that it changes no figure.** Three reasons, and none of
 * them is arithmetic:
 *
 *   1. **The absence has to be visible.** A drawdown that simply never reaches the ledger is
 *      indistinguishable, in a diff or in a trail, from a drawdown a caller forgot to record. The
 *      entry below says the payment happened and moved nothing, which is the claim being made.
 *   2. **It is the safe destination for O47's default.** §3.10.4 defaults an uncharacterised
 *      withdrawal to `pensionPayment`, and a default needs somewhere to go.
 *   3. **It leaves `recordCommutation` with nothing to share.** The alternative — one function with
 *      a characterisation parameter — is T74's mutation waiting to happen.
 *
 * **There is no arithmetic operator in this function.** The balance written is the balance handed
 * in, by reference, and the movement is the literal `0`. Nothing here can be inverted; the only way
 * to make a pension payment debit the account is to rewrite the function or call the other one.
 */
export const recordPensionPayment = (
  ledger: TransferBalanceLedger,
  payment: {
    readonly day: IsoDate;
    readonly amount: Cents;
  },
): TransferBalanceLedger =>
  appended(
    ledger,
    {
      day: payment.day,
      event: 'no movement — a pension payment is not a superannuation lump sum (s 307-65(1))',
      amount: payment.amount,
      movement: 0 as Cents,
    },
    ledger.transferBalance,
  );

/**
 * **The END-of-day figure, and the seam chunk 3 has been waiting for.**
 *
 * s 294-40(2)(a) measures the highest transfer balance *"at the end of a day"*, never intraday, and
 * that is a rule about **which** figure, not merely about when it is read. This function refuses to
 * answer for a day the ledger has already moved past: if an entry exists after `day`, the balance in
 * hand is no longer that day's closing figure, and returning it would silently answer a different
 * question. Reading a day **before** any event is fine and returns zero — the account existed and
 * nothing had happened.
 */
export const closingBalanceOn = (day: IsoDate, ledger: TransferBalanceLedger): Cents => {
  if (ledger.throughDay > day) {
    throw new RangeError(
      `the transfer balance ledger has already recorded an event on ${ledger.throughDay}, which is ` +
        `after ${day}: the balance in hand is no longer the CLOSING balance for ${day}. ITAA 1997 ` +
        's 294-40(2)(a) measures the transfer balance at the END of a day, so every event of a day ' +
        'must be recorded before that day is closed and none of a later day before it',
    );
  }
  return requireAConformingLedger(ledger).transferBalance;
};

/**
 * **Chunk 4 wired into chunk 3 — one day, closed from the ledger that produced its balance.**
 *
 * A function rather than a spread at the call site, for the reason `carryPersonalCapForward` is one:
 * a declared return type makes a renamed field on either side a compile error instead of a silent
 * pass-through. It composes exactly two things and adds no rule of its own — `closingBalanceOn` for
 * *which* figure, `advanceTransferBalanceDay` for the high-water mark and R1's end-of-day breach
 * check — so a breach raised here is raised by chunk 3's single comparison and not by a second one.
 */
export const closeDayFromLedger = (input: {
  readonly ledger: TransferBalanceLedger;
  readonly state: TransferBalanceAccountDays;
  readonly day: IsoDate;
  readonly personalCapOnDay: PersonalTransferBalanceCap;
}): TransferBalanceAccountDays =>
  advanceTransferBalanceDay({
    state: input.state,
    day: input.day,
    closingBalance: closingBalanceOn(input.day, input.ledger),
    personalCapOnDay: input.personalCapOnDay,
  });
