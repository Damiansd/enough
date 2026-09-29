// P3-9 chunk 1 — the refusal vocabulary, and what can honestly be asserted about a vocabulary.
//
// **Twelve classes and, when this file was written, not one throw site.** Chunk 1 builds names, not
// arithmetic (ruling R8's ordering: settle the spelling before anything can raise it), so there is
// nothing here to compute and nothing to compare against a hand-worked figure. **Chunk 3 gave one of
// the twelve — `TransferBalanceCapExceededError` — its throw site on 2026-09-16, and struck exactly
// that one name from the tripwire below in the same change as its §3.10.8 status cell. Chunk 5a, the
// same day, struck two more — `ReversionaryStreamNotModelledError` and
// `CommutationAuthorityNotModelledError` — whose throw sites are INPUT GUARDS in `superPhase.ts`.
// Chunk 6-4, the same day again, struck a fourth — `UnknownPersonalTransferBalanceCapError`, whose
// one door is `transferBalanceAccountOrRefuse` in `transferBalanceAccountSettings.ts`. EIGHT
// remain.** *(This header said "Nine remain" until 2026-09-16: the fourth strike landed in the test
// below and in §3.10.8's status cell without the prose above them moving, which is the lag this
// file's own tripwire exists to stop one layer down.)* What IS assertable about a vocabulary is
// exactly three things, and this file is
// careful not to dress any of them up as more:
//
//   1. **The names.** `test/refusal-names.test.mjs` already checks each class against register
//      §3.10.8 in both directions, so that is not repeated here. What it does NOT check is
//      `this.name` — a copy-pasted class body whose `this.name` still says the class it was copied
//      from is invisible to a test that reads `export class …` declarations, and it is the exact
//      drift R8 exists to stop, one layer down.
//   2. **The grounds.** Register §3.10.5 requires the breach refusal to name three specific things;
//      R2 requires the unknown-cap refusal to carry the seven Settings; R5, R6 and O42 each put a
//      sentence into a message that a later edit could quietly drop. Those are asserted as text.
//   3. **The unreachability.** Eight of the twelve are registered-and-unreachable, and §3.10.8 says
//      so in eight status cells. That claim is pinned below rather than believed — and the number
//      lives in the test's own name, which is the copy that cannot go stale unnoticed.
//
// **The year axis, stated rather than assumed.** **Four** of the twelve take a financial year or a
// day — the unknown-cap refusal, the breach refusal, and the two entry-test ones — and all four are
// exercised in **two financial years**, FY2026-27 and FY2027-28, because a message that interpolates
// a year is a message that can be built for one year and broken for the next. The other **eight**
// **have no year axis at all**: their constructors take no arguments, which is asserted directly
// rather than covered with invented fixtures.
//
// **Every figure below is hand-derived from register §3.10.9 and none was read off an
// implementation.** LCR 2016/9 Example A1 step 1 ends at a personal cap of **$1,613,000** and step 2
// at **$1,625,000**; those are the two caps used. The balances are chosen, and the excesses are
// worked by hand: $1,700,000 − $1,613,000 = **$87,000**, and $1,725,000 − $1,625,000 = **$100,000**.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CappedDefinedBenefitIncomeStreamNotModelledError,
  CommutationAuthorityNotModelledError,
  DeferredAndCappedDefinedBenefitCreditsNotModelledError,
  FraudAndBankruptcyDebitsNotModelledError,
  LRBACreditNotModelledError,
  PaymentSplitNotModelledError,
  StreamCeasedOutsideCommutationNotModelledError,
  StructuredSettlementNotModelledError,
  TransferBalanceCapExceededError,
  UnknownPersonalTransferBalanceCapError,
} from '../dist/core/transferBalanceAccount.js';
import {
  ReversionaryStreamNotModelledError,
  TrisNotificationNotStatedError,
  TrisRetirementPhaseNotModelledError,
  transitionToRetirementInterest,
} from '../dist/core/superPhase.js';
import { conditionOfRelease } from '../dist/core/conditionOfRelease.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LEDGER_SOURCE = readFileSync(join(SRC, 'core', 'transferBalanceAccount.ts'), 'utf8');

/** The twelve, by the name each must answer to. */
const LEDGER_REFUSALS = {
  UnknownPersonalTransferBalanceCapError,
  TransferBalanceCapExceededError,
  CommutationAuthorityNotModelledError,
  CappedDefinedBenefitIncomeStreamNotModelledError,
  LRBACreditNotModelledError,
  DeferredAndCappedDefinedBenefitCreditsNotModelledError,
  StructuredSettlementNotModelledError,
  FraudAndBankruptcyDebitsNotModelledError,
  PaymentSplitNotModelledError,
  StreamCeasedOutsideCommutationNotModelledError,
};
const ENTRY_TEST_REFUSALS = { ReversionaryStreamNotModelledError, TrisNotificationNotStatedError };

/** The eight with no year axis: constructed with no argument, in any year, for ever. */
const NO_ARGUMENTS = [
  CommutationAuthorityNotModelledError,
  CappedDefinedBenefitIncomeStreamNotModelledError,
  LRBACreditNotModelledError,
  DeferredAndCappedDefinedBenefitCreditsNotModelledError,
  StructuredSettlementNotModelledError,
  FraudAndBankruptcyDebitsNotModelledError,
  PaymentSplitNotModelledError,
  StreamCeasedOutsideCommutationNotModelledError,
];

// §3.10.9, LCR 2016/9 Example A1. Cents, because that is what the constructor takes.
const CAP_STEP_1 = 161_300_000;
const CAP_STEP_2 = 162_500_000;

test('every refusal in the vocabulary is a RangeError that answers to its own name', () => {
  const misnamed = [];
  for (const [name, Refusal] of Object.entries({ ...LEDGER_REFUSALS, ...ENTRY_TEST_REFUSALS })) {
    // Built with whatever shape the constructor takes; every one tolerates these.
    const raised = new Refusal('2026-07-01', 0, 0);
    if (!(raised instanceof RangeError)) misnamed.push(`${name} is not a RangeError`);
    if (raised.name !== name) misnamed.push(`${name} reports itself as ${raised.name}`);
    if (raised.message.length < 100) misnamed.push(`${name} states no ground: ${raised.message}`);
  }
  assert.deepEqual(misnamed, []);
  assert.equal(Object.keys({ ...LEDGER_REFUSALS, ...ENTRY_TEST_REFUSALS }).length, 12);
});

test('the eight unmodelled-item refusals have NO year axis, and that is asserted rather than fixtured', () => {
  // These eight take nothing at all: there is no year, no day and no amount to vary, so a two-year
  // fixture for them would be two identical strings. The four that DO take a day or a year are
  // each exercised across two financial years elsewhere in this file.
  for (const Refusal of NO_ARGUMENTS) {
    assert.equal(Refusal.length, 0, `${Refusal.name} has grown a parameter — give it a year fixture`);
    assert.equal(new Refusal().message, new Refusal().message);
  }
  assert.equal(NO_ARGUMENTS.length, 8);
});

test('the unknown-personal-cap refusal carries all seven Settings, in two financial years (R2, R3, R4)', () => {
  const SEVEN = [
    'transferBalanceAccountStartDay',
    'personalTransferBalanceCap',
    'transferBalance',
    'highestEndOfDayTransferBalance',
    'highestBalanceDay',
    'personalCapOnHighestBalanceDay',
    'hasEverExceededCap',
  ];
  for (const fy of ['2026-27', '2027-28']) {
    const { message } = new UnknownPersonalTransferBalanceCapError(fy);
    assert.match(message, new RegExp(`FY${fy}`), 'the refusal must name the year it could not answer');
    for (const field of SEVEN) assert.ok(message.includes(field), `${fy}: ${field} is not named`);
    // R4: the account start is a DAY. A message that asked for a year would be asking for the
    // input R3 was ruled arithmetically insufficient.
    assert.match(message, /a DAY, not a financial year/);
    // O42's scoping, in the message, because a refusal that looks like it covers every retiree is
    // one an implementer will reach for on a Person who is fully computable.
    assert.match(message, /A Person who has NEVER been a retirement phase recipient/);
    // **The MODALITY, contiguously — added by Battery E, 2026-09-16, because the line above is a
    // keyword and a keyword survives the rewrite that matters.** Measured: rewording the O42
    // sentence to *"...may still need all of this, since whether their account starts inside the
    // forecast and is computed in full (O42) is a question for the caller"* kept every asserted
    // anchor, kept `has NEVER` and kept `computed in full (O42)`, and failed **ZERO** tests while
    // saying the opposite of §3.10.8's scoping. The promise is unconditional or it is not a
    // promise, so subject + verb + object are pinned as ONE contiguous regex.
    assert.match(
      message,
      /A Person who has NEVER been a retirement phase recipient before the forecast needs none of this: their account starts inside the forecast and is computed in full \(O42\)\./,
    );
    // And a vocabulary ban over the hedges the reversal cannot be written without: this refusal is
    // about what the tool WILL do for that Person, never about what a caller might decide.
    for (const hedge of [/\bmay still\b/, /\bmight\b/, /\bfor the caller\b/, /\bis a question\b/]) {
      assert.doesNotMatch(message, hedge, `the O42 promise has been made conditional: ${hedge}`);
    }
    // U14 — the seven labels have never been checked against the ATO screen a user reads them off.
    assert.match(message, /U14/);
  }
});

test('the breach refusal names the excess, the cap and s 294-40(1)(b), in two financial years (R1, §3.10.5)', () => {
  // FY2026-27: a $1,700,000 balance against the Example A1 step 1 cap of $1,613,000.
  // Excess, by hand: $1,700,000 − $1,613,000 = $87,000.
  const first = new TransferBalanceCapExceededError('2026-11-03', 170_000_000, CAP_STEP_1);
  assert.match(first.message, /\$1,613,000\.00/);
  assert.match(first.message, /\$1,700,000\.00/);
  assert.match(first.message, /\$87,000\.00/);
  assert.match(first.message, /2026-11-03/);

  // FY2027-28: $1,725,000 against the step 2 cap of $1,625,000. Excess $100,000.
  const second = new TransferBalanceCapExceededError('2027-08-15', 172_500_000, CAP_STEP_2);
  assert.match(second.message, /\$1,625,000\.00/);
  assert.match(second.message, /\$1,725,000\.00/);
  assert.match(second.message, /\$100,000\.00/);
  assert.match(second.message, /2027-08-15/);

  for (const { message } of [first, second]) {
    // The third thing §3.10.5 requires, and the reason the answer is "declare less capital" rather
    // than "accept the tax": the loss of indexation is permanent and is not undone by correcting.
    assert.match(message, /s 294-40\(1\)\(b\)/);
    assert.match(message, /permanently disqualifies/);
    assert.match(message, /correcting the excess does not restore it/);
    // R1's own ground, so a future reader cannot mistake the refusal for caution.
    assert.match(message, /does not model excess transfer balance tax/);
    // The two things §3.10.5 says it must NOT fire on, said out loud so neither is coded by
    // accident when chunk 3 writes the check.
    assert.match(message, /a NEGATIVE transfer balance is not a breach/);
    assert.match(message, /a large total super balance is not one either/);
  }
});

test('the entry-test refusals keep item 106 out of the notification limb, in two financial years', () => {
  // A day in FY2026-27 and a day in FY2027-28. The second is deliberately 12 July: §3.10.9's
  // "fortnight worth a year" fixture retires 28 June 2027 and notifies 12 July 2027, which moves
  // the account-start year — the consequence this refusal's message has to carry.
  for (const on of ['2026-11-03', '2027-07-12']) {
    const reversionary = new ReversionaryStreamNotModelledError(on);
    assert.match(reversionary.message, new RegExp(on));
    assert.match(reversionary.message, /s 307-80\(3\) is a conjunction/);
    // The direction of the error, which is why this one is refused rather than approximated.
    assert.match(reversionary.message, /most flattering wrong answer available/);

    const notification = new TrisNotificationNotStatedError(on);
    assert.match(notification.message, new RegExp(on));
    assert.match(notification.message, /s 307-80\(3\)\(b\)\(ii\)/);
    assert.match(notification.message, /a fortnight is worth a year/);
    // T80 / T117: routing item 106 through a notification requirement is the trap this message is
    // written to stop, so it must say so rather than merely not doing it.
    assert.match(notification.message, /does NOT apply to item 106/);
    // The known-bad shortcut §3.10.6 records: TR 2013/5 ¶71B drops the notification requirement.
    assert.match(notification.message, /TR 2013\/5/);
  }
});

test('R5 is discharged by the refusal that already exists, and it still fires in two financial years', () => {
  // R5: "an absent conversion-day Setting for a Person holding a TRIS must raise a NAMED REFUSAL,
  // never silently skip the conversion." No second name was minted (register §3.10.8, 2026-09-15);
  // this is the assertion that the existing one still covers the case in both years of the fixture.
  // 67 on 1 July 2026, so the condition is met on any day of either year without any act.
  const AGED_67 = '1959-07-01';
  for (const on of ['2026-11-03', '2027-08-15']) {
    const release = conditionOfRelease({ dateOfBirth: AGED_67, on, gainfulEmployment: { ceased: false } });
    assert.throws(() => transitionToRetirementInterest(release), TrisRetirementPhaseNotModelledError);
  }
  // And the discharge is recorded where a reader of the code will find it, not only in the register.
  const phaseSource = readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8');
  assert.match(phaseSource, /IS ruling R5's mandated refusal/);
});

// --- The unreachability, pinned rather than believed ----------------------------------------------

test('seven of the twelve have no throw site in src/, which is what §3.10.8 claims seven times', () => {
  // **A TRIPWIRE, and it is meant to fail.** Every one of the twelve status cells in register
  // §3.10.8 said "no throw site yet" and named the chunk that would add one. The day chunk 3 wrote
  // `throw new TransferBalanceCapExceededError(...)`, this test failed — and the fix was NOT to
  // delete it: that one class was struck from the list below in the SAME change as its §3.10.8
  // status stopped saying "no throw site yet", so the register cannot lag the code. The list may
  // only shrink, exactly like `refusal-names.test.mjs`'s own two ratchets, and it may only shrink
  // by the name that actually gained a site — which is why the vacuity guard below is now that very
  // name, and `core-transfer-balance-day.test.mjs` asserts from the other side that the site exists
  // exactly once. **STRUCK 2026-09-16 by P3-9 chunk 3: `TransferBalanceCapExceededError`. STRUCK
  // 2026-09-16 by P3-9 chunk 5a: `ReversionaryStreamNotModelledError` and
  // `CommutationAuthorityNotModelledError`, whose sites are input guards rather than arithmetic —
  // `core-entry-test-recipient.test.mjs` asserts from the other side that each exists exactly once
  // and that it is reached by declaring the fact, not by any derivation. STRUCK 2026-09-16 by P3-9
  // chunk 6-4: `UnknownPersonalTransferBalanceCapError`, whose single site is
  // `transferBalanceAccountOrRefuse` in `transferBalanceAccountSettings.ts` —
  // `core-transfer-balance-account-settings.test.mjs` asserts from the other side that it exists
  // exactly once AND that the O42 Person does not reach it, which is the half of the strike that
  // matters for this name: it is the one refusal here that could be wired as a regression.**
  // **STRUCK 2026-09-16 by P3-9 chunk 5b-6: `TrisNotificationNotStatedError`.** The comment that
  // stood here until this change said it "stays, because chunk 5b is blocked on a pending ruling and
  // inputs 5 and 6 do not exist in `src/`" — and all three halves of that are now false. **R13
  // ruled** (RULINGS.md, 2026-09-16), which unblocked chunk 5b; input 5 arrived as
  // `StatedStreamSettings.statedSchedule1Item` and input 6 as `.statedNotificationDay`, both built
  // by chunk 5b-2 in `household.ts`. Its single site is limb 2b of `trisInterestOrRefuse` in
  // `src/core/trisInterest.ts`, reached by a Person with the employment ground alone who STATED an
  // item of 101, 102A or 103 and stated no notification day —
  // `core-tris-interest.test.mjs` asserts from the other side that the site exists exactly once,
  // that the stated item is read and never derived, and that each of the four near
  // misses still lands on the OLD refusal. R13 warned in terms that this name must not be deleted
  // merely because its item-106 half went away; it was not deleted, it was wired.
  const STRUCK = [
    'TransferBalanceCapExceededError',
    'ReversionaryStreamNotModelledError',
    'CommutationAuthorityNotModelledError',
    'UnknownPersonalTransferBalanceCapError',
    'TrisNotificationNotStatedError',
  ];
  const names = [...Object.keys(LEDGER_REFUSALS), ...Object.keys(ENTRY_TEST_REFUSALS)].filter(
    (name) => !STRUCK.includes(name),
  );
  assert.equal(names.length, 7);
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const thrown = [];
  const struckSites = new Map(STRUCK.map((name) => [name, 0]));
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    const text = readFileSync(file, 'utf8');
    for (const name of names) {
      if (new RegExp(`\\bnew ${name}\\b`).test(text)) thrown.push(`${name} in ${file}`);
    }
    for (const name of STRUCK) {
      const found = [...text.matchAll(new RegExp(`\\bnew ${name}\\b`, 'g'))].length;
      struckSites.set(name, (struckSites.get(name) ?? 0) + found);
    }
  }
  // Vacuity guard: a walker that reads nothing proves nothing, and the same regex must be able to
  // find a throw site that DOES exist. Two of those now exist — the older one in `superPhase.ts`,
  // and the struck name's own, which is the stronger guard because it is the exact regex that must
  // keep finding it for the strike above to stay honest.
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  assert.match(
    readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8'),
    /\bnew TrisRetirementPhaseNotModelledError\b/,
    'the search cannot find a throw site that exists, so finding none proves nothing',
  );
  // The ratchet, and it is the whole reason a strike is allowed at all: a name may leave the list
  // ONLY by acquiring a site. The search is over all of `src/`, not over the ledger alone — chunk
  // 5a's two sites are in `superPhase.ts`, and pinning them to this file's own source would have
  // made the strike unfalsifiable for any refusal wired anywhere else.
  for (const struck of STRUCK) {
    assert.ok(
      (struckSites.get(struck) ?? 0) >= 1,
      `${struck} was struck from this list but has no throw site — put it back`,
    );
  }
  assert.equal(struckSites.size, 5);
  assert.deepEqual(thrown, []);
});

// --- The fourth brand — a SOURCE canary, and not a compiler check ---------------------------------

test('PersonalTransferBalanceCap is a fourth brand, and the breach refusal takes it (T60)', () => {
  // **Read this for exactly what it is.** These are assertions about the TEXT of a source file, not
  // about `tsc`. The compile error they stand in for is real — a `Cents` or a
  // `GeneralTransferBalanceCap` handed to the `cap` parameter does not typecheck — but no `.mjs`
  // test can observe it, because the tests run against `dist/` where the brand has been erased.
  // What the canary can do is fail if the brand is deleted or the parameter is widened back to
  // `Cents`, which is the mutation that would make T60 invisible again.
  assert.match(LEDGER_SOURCE, /declare const PERSONAL_TRANSFER_BALANCE_CAP: unique symbol;/);
  assert.match(
    LEDGER_SOURCE,
    /export type PersonalTransferBalanceCap = Cents & \{ readonly \[PERSONAL_TRANSFER_BALANCE_CAP\]: true \};/,
  );
  assert.match(
    LEDGER_SOURCE,
    /constructor\(day: IsoDate, balance: Cents, cap: PersonalTransferBalanceCap\)/,
    'the breach refusal must report the cap as a PERSONAL cap — a general one cannot stand in',
  );
  // The brand is a fourth, not a rename of one of superCaps.ts's three.
  const caps = readFileSync(join(SRC, 'core', 'superCaps.ts'), 'utf8');
  for (const brand of ['CONCESSIONAL_CAP', 'NON_CONCESSIONAL_CAP', 'TRANSFER_BALANCE_CAP']) {
    assert.match(caps, new RegExp(`declare const ${brand}: unique symbol;`), `${brand} has moved`);
  }
  assert.ok(!caps.includes('PERSONAL_TRANSFER_BALANCE_CAP'), 'the personal brand belongs to P3-9, and superCaps.ts must not grow a second copy of it');
});

// --- The module's own premise, kept unflattened ---------------------------------------------------

test('the module header keeps §3.10.4 two negatives apart, with their two different labels', () => {
  // §3.10.4: "the two must not be flattened into one label". In TypeScript both are enforced the
  // identical way — by there being no function through which either event can touch the ledger —
  // so the only place the difference can live is the prose a reader of the code sees.
  assert.match(LEDGER_SOURCE, /positive definitional exclusion/i);
  assert.match(LEDGER_SOURCE, /argument from the absence of a table item/i);
  assert.match(LEDGER_SOURCE, /must never be recorded as bare `primary-verified`/);
  // And the advice consequence, which is the one a user could act on wrongly (T76).
  assert.match(LEDGER_SOURCE, /never.{0,3} a remedy for an excess/);
});

// --- O66 batch 2 — T85, the refusal that was asserted by NAME and not by what it SAYS -------------
//
// Measured 2026-09-16: rewriting this refusal's ground from *"its transfer balance credit is a
// SPECIAL VALUE … and not the value of an account"* to *"may be taken as the value of the account
// that supports it"* — the exact proposition T85 exists to forbid — failed **zero** tests. Every
// assertion on this class was about its name, its suffix and its arity. A refusal that can be made
// to state the trap it refuses is a name, not a defence.

test('T85 — the capped defined benefit refusal is pinned by its GROUND, not only by its name', () => {
  const raised = new CappedDefinedBenefitIncomeStreamNotModelledError();
  assert.ok(raised instanceof RangeError);
  assert.equal(raised.name, 'CappedDefinedBenefitIncomeStreamNotModelledError');

  // The ground, as ONE contiguous subject-verb-object regex rather than as a bag of keywords: a
  // reversal keeps every keyword (`special value`, `294-135`, `account`) and says the opposite.
  assert.match(
    raised.message,
    /Its transfer balance credit is a SPECIAL VALUE — the annual entitlement × 16 for a lifetime pension, or × the remaining term for a life expectancy or market linked one \(ss 294-135\(1\)–\(3\)\) — and not the value of an account/,
  );
  // The consequence, contiguously too: the wrong credit is not a small error, it is every later
  // s 294-40 percentage wrong for life.
  assert.match(
    raised.message,
    /treating one as an account-based pension gives a wrong credit, a wrong highest-ever balance and every later s 294-40 percentage wrong for life/,
  );
  assert.match(raised.message, /s 294-140 also replaces the ordinary excess rule with a lesser-of-two-excesses test/);
  // And the scope decision O43 / O54 / U20 require it to carry: refused where DECLARED, never
  // guessed at where it is not — which is why the trigger's unverified width is not a licence to
  // classify streams nobody declared.
  assert.match(raised.message, /refused where it is declared rather than guessed at where it is not/);

  // The vocabulary the reversal cannot be written without. Each of these is a way of saying "the
  // account value will do", which is T85 in a sentence.
  for (const hedge of [
    'may be taken',
    'can be taken',
    'is one way',
    'approximat',
    'estimate',
    'roughly',
    'stand in for',
    'as the value of the account',
  ]) {
    assert.ok(
      !new RegExp(hedge, 'i').test(raised.message),
      `the capped defined benefit refusal now hedges with "${hedge}": its whole ground is that the special value is NOT an account value (T85)`,
    );
  }

  // **The other half of §1's T85 fixture — "must NOT credit the user's stated capital value" — and
  // the direction of what is not covered, stated rather than labelled.** This refusal has no throw
  // site (it is one of the seven asserted from the other side above), because nothing a Person can
  // state declares a defined benefit pension, so the fixture's first half cannot be run today. What
  // stands in for its second half is that no special value exists to be computed anywhere in this
  // module: an annual entitlement is never multiplied here, so a stream that WERE declared could
  // not be silently credited a figure of this module's own making. The residual risk runs one way —
  // a declared defined benefit stream would be credited whatever account value its caller supplied,
  // and the error is unsigned, which is exactly why the refusal is the answer and not an estimate.
  const code = LEDGER_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");
  for (const forbidden of ['annualEntitlement', 'specialValue', 'remainingTerm', '\\* 16', '× 16', '16 \\*']) {
    assert.ok(
      !new RegExp(forbidden, 'i').test(code),
      `a capped defined benefit special value is being COMPUTED here (${forbidden}): Subdiv 294-D is refused, not implemented (T85)`,
    );
  }
  assert.equal(
    (code.match(/throw new CappedDefinedBenefitIncomeStreamNotModelledError/g) ?? []).length,
    0,
    'this refusal has acquired a throw site: §1 T85 fixture can now be run, and this test must be rewritten to run it',
  );
  // Vacuity: the strip keeps the declarations, and the banned words really are absent from code
  // rather than from an over-stripped string.
  assert.match(code, /export class CappedDefinedBenefitIncomeStreamNotModelledError extends RangeError/);
  assert.match(code, /export const creditOnCommencement = \(/);
  assert.match(LEDGER_SOURCE, /annual entitlement × 16/);
});
