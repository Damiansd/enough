// P3-9 chunk 6-2b — a RECORD of a known, accepted residue. It is not a defence.
//
// **What this file is.** Every object-shaped `unique symbol` brand in `src/core/` is probed with
// `tsc` against the one expression that defeats it — `{ ...aRealValue, someInvariantField: aLie }`
// — and the verdict is pinned. All fifteen are now CLOSED: P3-41 converted them, in two chunks
// (`43dabb8`: `ConditionOfRelease`, `TtrPaymentRange`, `TransferBalanceLedger`; chunk 2: the
// remaining twelve), to a private-member brand. The HOLED list below is empty — kept as a list, not
// deleted, because it is the ratchet's other direction: a brand added to `src/core/` after this point
// starts holed and this file catches it the moment it does.
//
// **Sixteen since 2026-09-28.** P11-1 slice 1 added `Ledger` (`src/core/ledger.ts`, the transaction
// ledger — not the transfer balance one), born with the private-member brand, so it arrived CLOSED.
//
// **What this file is for.** Two things, and they are the reasons a record beats a TODO:
//
//   1. It **ratchets in both directions**, the way `test/refusal-names.test.mjs` does. A NEW holed
//      brand fails it, and so does a brand that is silently FIXED. The second half is the point: a
//      fix must come with an edit here, and the list of edits left to make is the conversion
//      checklist. A hand-maintained list nobody has to change is a list nobody changes.
//   2. It records the three candidate structural fixes with their **measured** verdicts, so the
//      eventual conversion starts from evidence rather than re-deriving it.
//
// **The mechanism, stated once.** A `[SYM]: true` member is an ordinary property. An object spread
// copies it into the type of the result, and excess-property checking never fires on the overridden
// field because that field is a *known* property of the target. No tsconfig flag changes this. So a
// symbol brand in this repo means *"these fields were computed together"*, **never** *"this
// invariant holds"* — unless it is a `private` member of a type-only witness class, which no object
// literal or spread can ever carry, and that is the form every row below now wears.
//
// **The three candidate fixes, each probed below, not asserted:**
//   * **opaque type — WORKS (TS2353).** Hide the figure behind the brand and read the fields through
//     functions. The spread then has nothing known to carry and the overridden field is an excess
//     property. Cost: every reader becomes an accessor call.
//   * **class with a `private` member — WORKS (TS2741).** A private member cannot be produced by any
//     object literal, spread or not. Cost: the values stop being plain frozen records.
//   * **brand as a method signature (`[SYM](): void`) — DOES NOT WORK.** It looks like the cheap
//     structural fix and it is not one: a method is copied by the spread exactly as a property is.
//     Probed here so nobody has to rediscover it.
//
// **The scalar brands are immune, and that is measured too** — all eighteen of them are `number`
// intersections (`Cents` itself, and seventeen of the form `Cents & { [SYM]: true }`), so spreading
// one is `TS2698` and cross-assigning two of them is `TS2322`. A sweep that recorded only failures would invite the reader to think the
// whole idea is broken. It is the object-shaped form alone that leaks.
//
// **Runtime mitigations are recorded per type, and a mitigation is NOT a closed hole in its own
// right.** Three types had the *consequence* of the laundering addressed by chunks 6-0, 6-1 and 6-2,
// before any of them had a closed type. All three are now ALSO closed by the P3-41 private-member
// conversion — `TransferBalanceLedger` in chunk 1, `RetirementPhaseInterest` and
// `TransferBalanceAccountDays` in chunk 2 — and each keeps its runtime mitigation regardless, because
// a cast or a JavaScript caller is invisible to the type either way.
//
// **The full conversion — 15 types across 8 modules, TODO P3-41 — is now complete**, across two
// chunks (`43dabb8` and this one). This file is what makes that claim checkable rather than asserted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The scratch-file harness `test/core-div293.test.mjs` and
 * `test/core-transfer-balance-cap-battery-a.test.mjs` use: a file compiled by `tsc --noEmit` against
 * `src/` (not `dist/`, where the types are erased), under the flags of the project build.
 *
 * `lines` returns the 1-based line numbers of `case.ts` that carried a diagnostic, so one `tsc`
 * invocation can decide many independent probes at once. The whole file is five invocations, about
 * four and a half seconds.
 */
const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-brand-sweep-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let output = '';
    let ok = true;
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit',
          '--strict',
          '--target', 'ES2022',
          '--module', 'nodenext',
          '--moduleResolution', 'nodenext',
          '--verbatimModuleSyntax',
          '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      ok = false;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    const lines = new Set([...output.matchAll(/case\.ts\((\d+),/g)].map(([, line]) => Number(line)));
    return { ok, output, lines };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// --- The honest values every probe launders -------------------------------------------------------

/**
 * One real, honestly-constructed value per branded type, built through the module's own producers.
 * Nothing here is a cast and nothing is a literal of a branded type: if any of these stopped being
 * obtainable the positive control below would fail, and the sweep would be measuring nothing.
 */
const PRELUDE = [
  "import { toCents } from '../src/core/money.js';",
  "import { conditionOfRelease } from '../src/core/conditionOfRelease.js';",
  "import type { ConditionOfRelease } from '../src/core/conditionOfRelease.js';",
  "import { minimumDrawdown, pensionAccountBalance } from '../src/core/minimumDrawdown.js';",
  "import type { MinimumDrawdown, PensionAccountBalance } from '../src/core/minimumDrawdown.js';",
  "import { ttrPaymentRange } from '../src/core/ttrPaymentRange.js';",
  "import type { TrisAccountBalance, TtrPaymentRange } from '../src/core/ttrPaymentRange.js';",
  "import { frankedDistributionFromStatement } from '../src/core/superFranking.js';",
  "import type { FrankedDistribution } from '../src/core/superFranking.js';",
  "import { totalSuperBalance } from '../src/core/superCaps.js';",
  "import { div296FundEarnings, superannuationEarnings, totalSuperBalanceReference } from '../src/core/div296.js';",
  "import type { Div296FundEarnings, SuperannuationEarnings, TotalSuperBalanceReference } from '../src/core/div296.js';",
  "import { ACCUMULATION_INTEREST_ONLY, lowTaxContributions } from '../src/core/div293.js';",
  "import type { LowTaxContributions } from '../src/core/div293.js';",
  'import { accumulationInterest, phaseHeldForTheWholeYear, retirementPhaseInterest, ' +
    "transitionToRetirementInterest } from '../src/core/superPhase.js';",
  "import type { AccumulationInterest, PhaseYearFraction, RetirementPhaseInterest } from '../src/core/superPhase.js';",
  'import { openTransferBalanceAccountDays, openTransferBalanceLedger, seedPersonalTransferBalanceCap } ' +
    "from '../src/core/transferBalanceAccount.js';",
  "import type { TransferBalanceAccountDays, TransferBalanceLedger } from '../src/core/transferBalanceAccount.js';",
  "import { emptyLedger } from '../src/core/ledger.js';",
  "import type { Ledger } from '../src/core/ledger.js';",
  '',
  'const WORKING = { ceased: false } as const;',
  // 61 on 1 July 2026 and still working: no ground is met, so this is a live TTR.
  "const unmetRelease = conditionOfRelease({ dateOfBirth: '1965-07-01', on: '2026-07-01', gainfulEmployment: WORKING });",
  // 71 on the same day: reg 6.01(7) item 101 is met by age alone.
  "const metRelease = conditionOfRelease({ dateOfBirth: '1955-07-01', on: '2026-07-01', gainfulEmployment: WORKING });",
  "const realPensionAccountBalance = pensionAccountBalance({ measuredAt: '2026-07-01', " +
    'accountBalance: toCents(1_000_000), withdrawalBenefit: toCents(1_000_000) });',
  "const realMinimumDrawdown = minimumDrawdown({ fy: '2026-27', dateOfBirth: '1965-07-01', " +
    "commencementDay: '2020-07-01', balance: realPensionAccountBalance, commutedOrRolledOverDuringYear: false });",
  "const realTtrPaymentRange = ttrPaymentRange({ fy: '2026-27', dateOfBirth: '1965-07-01', " +
    "commencementDay: '2020-07-01', balance: realPensionAccountBalance, gainfulEmployment: WORKING, " +
    'commutedOrRolledOverDuringYear: false });',
  // `trisAccountBalance` is module-private; the range is the only way to hold one.
  'const realTrisAccountBalance = realTtrPaymentRange.maximum.balance;',
  "const realFrankedDistribution = frankedDistributionFromStatement({ fy: '2026-27', " +
    "frankedAmount: toCents(70_000), frankingCredit: toCents(30_000), source: 'a fund statement', " +
    "confidence: 'primary-verified' });",
  "const realTsbReference = totalSuperBalanceReference({ fy: '2026-27', " +
    "opening: totalSuperBalance('2026-06-30', toCents(2_900_000)), " +
    "closing: totalSuperBalance('2027-06-30', toCents(3_100_000)), deceasedDuringYear: false });",
  "const realFundEarnings = div296FundEarnings({ fy: '2026-27', components: { " +
    'relevantTaxableIncome: toCents(100_000), netCapitalGain: toCents(0), assessableContributions: toCents(0), ' +
    'netExemptCurrentPensionIncome: toCents(0), nonArmsLengthComponent: toCents(0), ' +
    'pooledSuperannuationTrustComponent: toCents(0) }, smallSuperannuationFund: false });',
  "const realSuperannuationEarnings = superannuationEarnings({ fy: '2026-27', amount: toCents(100_000) });",
  "const realLowTaxContributions = lowTaxContributions({ fy: '2026-27', lowTaxContributedAmounts: toCents(30_000), " +
    'excessConcessionalContributions: toCents(0), interests: ACCUMULATION_INTEREST_ONLY });',
  "const realPhaseYearFraction = phaseHeldForTheWholeYear('2026-27');",
  'const realAccumulationInterest = accumulationInterest(unmetRelease);',
  'const realTtrInterest = transitionToRetirementInterest(unmetRelease);',
  'const realRetirementPhaseInterest = retirementPhaseInterest(metRelease);',
  "const seed = seedPersonalTransferBalanceCap('2025-09-01');",
  "const realTransferBalanceAccountDays = openTransferBalanceAccountDays('2025-09-01', seed.cap, toCents(1_200_000));",
  "const realTransferBalanceLedger = openTransferBalanceLedger('2025-09-01');",
  'const realLedger = emptyLedger();',
  'void realAccumulationInterest; void realMinimumDrawdown;',
  '',
];

/**
 * **The inventory, and the ratchet.** One row per object-shaped branded type in `src/core/`.
 *
 * `holed` is the pinned verdict. Every row says `true` today. When a type is converted — to the
 * opaque form or to a class with a private member, both of which are probed below and both of which
 * work — its row flips to `false` and this file becomes the record of how far the conversion got.
 * The test fails either way round, so the flip cannot be skipped and cannot be faked.
 *
 * `mitigation` is a RUNTIME containment of the CONSEQUENCE, and is deliberately a separate column
 * from `holed`. A mitigated type is still spreadable; it merely fails loudly, or is re-derived,
 * further down. `null` means nothing stands between the laundered value and the figure it produces.
 */
const BRANDS = [
  {
    type: 'PensionAccountBalance',
    module: 'minimumDrawdown.ts',
    real: 'realPensionAccountBalance',
    lie: 'value: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'MinimumDrawdown',
    module: 'minimumDrawdown.ts',
    real: 'realMinimumDrawdown',
    lie: 'amount: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'FrankedDistribution',
    module: 'superFranking.ts',
    real: 'realFrankedDistribution',
    lie: 'frankingCredit: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'TotalSuperBalanceReference',
    module: 'div296.ts',
    real: 'realTsbReference',
    lie: 'value: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'Div296FundEarnings',
    module: 'div296.ts',
    real: 'realFundEarnings',
    lie: 'amount: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'SuperannuationEarnings',
    module: 'div296.ts',
    real: 'realSuperannuationEarnings',
    lie: 'amount: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    type: 'LowTaxContributions',
    module: 'div293.ts',
    real: 'realLowTaxContributions',
    lie: 'amount: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    // **Outside P3-9 entirely, and named here for exactly that reason.** `met` is a P13-5 mutation
    // target in register §9, and a spread sets it directly: `{ ...unmetRelease, met: true }` is a
    // `ConditionOfRelease` to the compiler. This row and `TtrPaymentRange.ceiling` below are the
    // evidence that the hole is a property of the codebase and not a P3-9 authoring slip.
    type: 'ConditionOfRelease',
    module: 'conditionOfRelease.ts',
    real: 'unmetRelease',
    lie: 'met: true',
    holed: false, // P3-41: private-member brand
    mitigation: null,
  },
  {
    type: 'TrisAccountBalance',
    module: 'ttrPaymentRange.ts',
    real: 'realTrisAccountBalance',
    lie: 'value: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    // The second out-of-P3-9 row. The ceiling is the limit whose breach TR 2013/5 ¶¶18-20 says ends
    // the stream for the whole year, retrospectively, and a spread raises it to any number at all.
    type: 'TtrPaymentRange',
    module: 'ttrPaymentRange.ts',
    real: 'realTtrPaymentRange',
    lie: 'ceiling: toCents(99_999_999)',
    holed: false, // P3-41: private-member brand
    mitigation: null,
  },
  {
    type: 'PhaseYearFraction',
    module: 'superPhase.ts',
    real: 'realPhaseYearFraction',
    lie: 'days: 1',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
  },
  {
    // The mirror of the `RetirementPhaseInterest` row: a retirement-phase interest relabelled down.
    type: 'AccumulationInterest',
    module: 'superPhase.ts',
    real: 'realRetirementPhaseInterest',
    lie: "phase: 'accumulation'",
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: null,
    // `phase` is a discriminant literal, and an unannotated `const` widens a freshly-written literal
    // property to its base type — so the CLOSED test's two-step proof, taken with this same `lie`,
    // would fail on the widened `phase: string` alone and prove nothing about the brand. `as const`
    // locks the literal back down, so the only remaining mismatch is the missing witness member.
    witnessLie: "phase: 'accumulation' as const",
  },
  {
    // Chunk 6-1. `fundEarningsTax` re-raises the constructor guard against the `release` the spread
    // must carry along, so the 0% rate is no longer handed out on the strength of the label alone.
    // P3-41 chunk 2 then closed the TYPE with a private-member brand; the runtime re-derivation stays
    // regardless, because a cast or a JavaScript caller is invisible to the type.
    type: 'RetirementPhaseInterest',
    module: 'superPhase.ts',
    real: 'realTtrInterest',
    lie: "phase: 'retirement'",
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: 'chunk 6-1: re-derived inside `fundEarningsTax` from the `release` the spread carries',
    // Same widening confound as `AccumulationInterest` above, and the same fix.
    witnessLie: "phase: 'retirement' as const",
  },
  {
    // Chunk 6-2 renamed the five `transferBalanceAccountDaysAsStated` parameter keys, which closed
    // the STATED DOOR structurally — that laundering route does not compile. P3-41 chunk 2 then
    // closed the TYPE itself with a private-member brand, so the spread annotated as the branded
    // type, as here, no longer compiles either.
    type: 'TransferBalanceAccountDays',
    module: 'transferBalanceAccount.ts',
    real: 'realTransferBalanceAccountDays',
    lie: 'highestEndOfDayTransferBalance: toCents(0)',
    holed: false, // P3-41 chunk 2: private-member brand
    mitigation: 'chunk 6-2: the `stated*` key rename closes the stated-history door, not the type',
  },
  {
    // Chunk 6-0. `requireAConformingLedger` re-sums `entries[].movement` at the only write and the
    // only read, so a laundered balance throws rather than paying out. P3-41 then closed the TYPE
    // with a private-member brand; the runtime check stays for casts and JavaScript callers.
    type: 'TransferBalanceLedger',
    module: 'transferBalanceAccount.ts',
    real: 'realTransferBalanceLedger',
    lie: 'transferBalance: toCents(2_000_000)',
    holed: false, // P3-41: private-member brand
    mitigation: 'chunk 6-0 and 6-2: `requireAConformingLedger` at two seams, the write and the read',
  },
  {
    // P11-1 slice 1. The lie is the one append-only exists against: recorded history emptied out.
    type: 'Ledger',
    module: 'ledger.ts',
    real: 'realLedger',
    lie: 'transactions: []',
    holed: false, // born with the private-member brand
    mitigation: null,
  },
];

const probeLine = ({ type, real, lie }, index) =>
  `const probe${index}: ${type} = { ...${real}, ${lie} }; void probe${index};`;

// --- The positive control, first, because everything below is read through it ----------------------

test('the compile probe is not vacuous — every honest value is obtainable and compiles clean', () => {
  // Without this, a typo in an import or a constructor that started refusing would produce a file
  // that fails to compile for a reason having nothing to do with brands, and the sweep would read
  // every hole as closed. This is the half of the measurement that costs something.
  const result = tsc(PRELUDE.join('\n'));
  assert.equal(result.ok, true, result.output);
});

// --- The sweep ------------------------------------------------------------------------------------

test('SWEEP — which object-shaped brands in src/core a bare object spread still defeats, and which it no longer does', () => {
  // One `tsc` invocation for all fifteen probes: each is a single line, so a diagnostic naming a
  // line names the brand. The probe is `{ ...aRealValue, invariantField: aLie }` annotated as the
  // branded type — never a fresh literal, which the brand does correctly reject (see below).
  const offset = PRELUDE.length;
  const result = tsc([...PRELUDE, ...BRANDS.map(probeLine)].join('\n'));

  const measured = BRANDS.map((brand, index) => ({ ...brand, measuredHoled: !result.lines.has(offset + index + 1) }));

  const drifted = measured.filter((brand) => brand.measuredHoled !== brand.holed);
  assert.deepEqual(
    drifted.map((brand) => `${brand.type} (${brand.module}): recorded holed=${brand.holed}, measured ${brand.measuredHoled}`),
    [],
    'the recorded inventory and the compiler disagree. If a brand was CONVERTED, flip its `holed` ' +
      'row to false here — that edit is the conversion checklist and is required, not optional. If a ' +
      'NEW brand became holed, add its row. Full tsc output follows:\n' + result.output,
  );

  // The count, pinned separately from the rows, so deleting a row cannot quietly shrink the sweep.
  assert.equal(measured.length, 16);
  assert.equal(measured.filter((brand) => brand.measuredHoled).length, 0, result.output);
  // Every diagnostic is a closed row's probe, and it is the private-member verdict: the brand member
  // is missing (TS2741 for an interface, TS2322 elaborating the same for an intersection).
  assert.deepEqual(
    [...result.lines].sort((a, b) => a - b),
    measured.flatMap((brand, index) => (brand.measuredHoled ? [] : [offset + index + 1])),
    result.output,
  );
  assert.equal(result.output.match(/error TS\d+/g)?.length, 16, result.output);
  assert.equal(result.output.match(/Property '\[[A-Z_]+\]' is missing/g)?.length, 16, result.output);
});

test('CLOSED by P3-41 — all fifteen converted brands refuse the spread in one step AND in two', () => {
  // The sweep above probes the annotated one-step spread. The opaque form, which the header records
  // as working, is defeated by the two-step spread: an unannotated `const` is not a fresh literal, so
  // excess-property checking never runs when it is later assigned. The private-member form refuses
  // both, because the spread never carries a private member at all. So both steps are probed here,
  // per converted type, and each must report that type's own brand symbol as missing.
  const converted = BRANDS.filter((brand) => !brand.holed);
  assert.deepEqual(
    converted.map((brand) => brand.type).sort(),
    [
      'AccumulationInterest', 'ConditionOfRelease', 'Div296FundEarnings', 'FrankedDistribution',
      'LowTaxContributions', 'MinimumDrawdown', 'PensionAccountBalance', 'PhaseYearFraction',
      'RetirementPhaseInterest', 'SuperannuationEarnings', 'TotalSuperBalanceReference',
      'TransferBalanceAccountDays', 'TransferBalanceLedger', 'TrisAccountBalance', 'TtrPaymentRange',
      'Ledger',
    ].sort(),
  );
  const lines = converted.flatMap(({ type, real, lie, witnessLie }, index) => [
    `const one${index}: ${type} = { ...${real}, ${lie} }; void one${index};`,
    `const loose${index} = { ...${real}, ${witnessLie ?? lie} };`,
    `const two${index}: ${type} = loose${index}; void two${index};`,
  ]);
  const offset = PRELUDE.length;
  const result = tsc([...PRELUDE, ...lines].join('\n'));
  const expected = converted.flatMap((_, index) => [offset + index * 3 + 1, offset + index * 3 + 3]);
  assert.deepEqual([...result.lines].sort((a, b) => a - b), expected, result.output);
  assert.equal(result.output.match(/error TS\d+/g)?.length, converted.length * 2, result.output);
  // Every type's own symbol is reported missing exactly twice, EXCEPT `SUPER_INTEREST`, which
  // `AccumulationInterest` and `RetirementPhaseInterest` share and so is reported missing four times.
  const TYPE_SYMBOL = {
    PensionAccountBalance: 'PENSION_ACCOUNT_BALANCE',
    MinimumDrawdown: 'MINIMUM_DRAWDOWN',
    FrankedDistribution: 'FRANKED_DISTRIBUTION',
    TotalSuperBalanceReference: 'TSB_REFERENCE',
    Div296FundEarnings: 'FUND_EARNINGS',
    SuperannuationEarnings: 'SUPERANNUATION_EARNINGS',
    LowTaxContributions: 'LOW_TAX_CONTRIBUTIONS',
    ConditionOfRelease: 'CONDITION_OF_RELEASE',
    TrisAccountBalance: 'TRIS_ACCOUNT_BALANCE',
    TtrPaymentRange: 'TTR_PAYMENT_RANGE',
    PhaseYearFraction: 'PHASE_YEAR',
    AccumulationInterest: 'SUPER_INTEREST',
    RetirementPhaseInterest: 'SUPER_INTEREST',
    TransferBalanceAccountDays: 'TRANSFER_BALANCE_ACCOUNT_DAYS',
    TransferBalanceLedger: 'TRANSFER_BALANCE_LEDGER',
    Ledger: 'LEDGER',
  };
  const bySymbol = new Map();
  for (const { type } of converted) {
    const symbol = TYPE_SYMBOL[type];
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + 2);
  }
  for (const [symbol, count] of bySymbol) {
    assert.equal(result.output.match(new RegExp(`Property '\\[${symbol}\\]' is missing`, 'g'))?.length, count, result.output);
  }
});

test('the inventory covers every object-shaped brand src/core declares, discovered not listed', () => {
  // The rows above are a hand-written list, and a hand-written list drifts — `refusal-names.test.mjs`
  // records this project committing that exact defect three times. So the brands are DISCOVERED by
  // reading every file in `src/core/`, and the discovered set must equal the probed set exactly. A
  // sixteenth object-shaped brand, in a new module or an old one, fails here rather than simply
  // never being probed.
  const discovered = [];
  let members = 0;
  for (const file of readdirSync(join(ROOT, 'src', 'core')).filter((name) => name.endsWith('.ts'))) {
    const source = readFileSync(join(ROOT, 'src', 'core', file), 'utf8');
    // Every brand member in the file, of either family. Counted so that a brand written in a shape
    // neither derivation below recognises shows up as a missing row instead of as nothing at all.
    members += [...source.matchAll(/readonly \[\w+\]: true/g)].length;
    // Family 1 — an intersection spelled on one line. Object-shaped unless the base is the scalar
    // `Cents` or `number`, which is exactly how the two families are told apart everywhere else.
    for (const [, name, base] of source.matchAll(/^export type (\w+) = (\w+) & \{ readonly \[\w+\]: true \};$/gm)) {
      if (base !== 'Cents' && base !== 'number') discovered.push({ type: name, module: file });
    }
    // Family 2 — the member written inside an exported `interface` or multi-line `type`. Always
    // object-shaped: a primitive intersection has nowhere to put it.
    for (const [, name] of source.matchAll(/^export (?:interface|type) (\w+)[^\n]*(?:\n(?!export)[^\n]*)*?\n\s+readonly \[\w+\]: true;/gm)) {
      discovered.push({ type: name, module: file });
    }
    // Family 3 — the P3-41 form: the member is `private` on a type-only witness class, and the
    // exported type wears the class by `extends` or by intersection. Its member is still counted by
    // the shape-blind total above, so a witness no exported type wears surfaces as a mismatch.
    for (const [, witness] of source.matchAll(/^declare class (\w+) \{ private readonly \[\w+\]: true \}$/gm)) {
      const wearers = [
        ...source.matchAll(new RegExp(`^export (?:interface (\\w+) extends [^\\n{]*\\b${witness}\\b|type (\\w+) = [^\\n]*\\b${witness}\\b)`, 'gm')),
      ];
      for (const [, viaExtends, viaType] of wearers) discovered.push({ type: viaExtends ?? viaType, module: file });
    }
  }

  const key = ({ type, module }) => `${module}:${type}`;
  assert.deepEqual(
    discovered.map(key).sort(),
    BRANDS.map(key).sort(),
    'src/core and this sweep disagree about which brands are object-shaped',
  );
  // Vacuity guards. The `deepEqual` above passes trivially if BOTH sides are empty, and the two
  // regexes are guesses about the shape a brand is written in — so pin the totals from a derivation
  // that makes no guess at all. 34 members: 16 object-shaped (below) and 18 scalar.
  assert.equal(discovered.length, 16);
  assert.equal(members, 34, 'a brand member is written in a shape neither derivation above recognises');
  assert.equal(new Set(BRANDS.map((brand) => brand.type)).size, BRANDS.length);
  assert.equal(new Set(BRANDS.map((brand) => brand.module)).size, 9, 'the brands span 9 modules');
});

// --- The half of the picture a failure-only sweep would hide ---------------------------------------

test('the brand DOES block a fresh literal — which is why the spread is the probe that decides it', () => {
  // The brand is not worthless and this test says so. A bare annotated object literal is rejected,
  // because the symbol member cannot be written by any caller. Every one of these is a compile
  // error; it is only the SPREAD that carries the member through.
  const probes = [
    "const n1: PensionAccountBalance = { measuredAt: '2026-07-01', accountBalance: toCents(1), " +
      'withdrawalBenefit: toCents(1), value: toCents(0), withdrawalBenefitSubstituted: false, ' +
      'proxiedFrom: undefined }; void n1;',
    "const n2: ConditionOfRelease = { on: '2026-07-01', met: true, grounds: [], rule: 'x', " +
      'provenance: unmetRelease.provenance }; void n2;',
    "const n3: TransferBalanceLedger = { transferBalance: toCents(0), throughDay: '2025-09-01', entries: [] }; void n3;",
    'const n4: RetirementPhaseInterest = { on: realTtrInterest.on, ' +
      "phase: 'retirement', incomeStream: realTtrInterest.incomeStream, release: realTtrInterest.release, " +
      "reason: 'x', provenance: realTtrInterest.provenance }; void n4;",
  ];
  const offset = PRELUDE.length;
  const result = tsc([...PRELUDE, ...probes].join('\n'));
  assert.equal(result.ok, false);
  for (let index = 0; index < probes.length; index += 1) {
    assert.ok(result.lines.has(offset + index + 1), `literal probe ${index + 1} compiled — the brand blocks nothing at all\n${result.output}`);
  }
  // The diagnostic names the missing symbol member, which is the whole of what the brand buys.
  assert.match(result.output, /TS2322|TS2741/);
  assert.match(result.output, /\[PENSION_ACCOUNT_BALANCE\]/);
  assert.match(result.output, /\[TRANSFER_BALANCE_LEDGER\]/);
});

test('the SCALAR brands are structurally immune — a spread is TS2698 and a cross-assign is TS2322', () => {
  // Seventeen of the eighteen scalar brands are `Cents & { [SYM]: true }` and `Cents` is itself
  // `number & { [CENTS]: true }`. An intersection with a primitive is not an object type, so the
  // spread the sweep above uses cannot even be written. This is the shape the conversion is aiming
  // at, and it is the reason this file is not a claim that branding does not work.
  const result = tsc(
    [
      "import type { ConcessionalCap } from '../src/core/superCaps.js';",
      "import type { TaxableIncome } from '../src/core/incomeBases.js';",
      'declare const income: TaxableIncome;',
      'const s1: ConcessionalCap = income; void s1;',
      'const s2: ConcessionalCap = { ...income, extra: 1 }; void s2;',
    ].join('\n'),
  );
  assert.equal(result.ok, false);
  assert.ok(result.lines.has(4), result.output);
  assert.ok(result.lines.has(5), result.output);
  assert.match(result.output, /TS2322/);
  assert.match(result.output, /TS2698: Spread types may only be created from object types/);
});

// --- The three candidate fixes, measured ----------------------------------------------------------

test('the three candidate structural fixes, probed: opaque WORKS, private-member WORKS, method DOES NOT', () => {
  // Self-contained: these declare their own miniature brands rather than touching `src/`, so the
  // verdicts are about the FORM and not about any one module. The conversion starts here.
  const probes = [
    // 1. Brand as a METHOD SIGNATURE. The cheap-looking fix. A method is a property; the spread
    //    copies it exactly as it copies `[SYM]: true`, and this line compiles.
    'declare const A: unique symbol;',
    'interface FigureA { readonly cents: number; [A](): void }',
    'declare const realA: FigureA;',
    'const a1: FigureA = { ...realA, cents: 0 }; void a1;',
    // 2. OPAQUE. The fields are not on the type at all; readers go through accessors. The spread
    //    has nothing known to carry, so the overridden field is an excess property: TS2353.
    'declare const B: unique symbol;',
    'interface FigureB { readonly [B]: true }',
    'declare const realB: FigureB;',
    'const b1: FigureB = { ...realB, cents: 0 }; void b1;',
    // 3. CLASS with a PRIVATE member. No object literal can supply it, spread or not: TS2741.
    'class FigureC { private readonly witness = true; constructor(readonly cents: number) {} }',
    'declare const realC: FigureC;',
    'const c1: FigureC = { ...realC, cents: 0 }; void c1;',
  ];
  const result = tsc(probes.join('\n'));

  // The method-signature form leaves line 4 clean. Recorded as a NEGATIVE result on purpose: it is
  // the fix a future reader will reach for first, and it buys nothing.
  assert.ok(!result.lines.has(4), `the method-signature brand now blocks the spread — re-read this file\n${result.output}`);
  assert.ok(result.lines.has(8), `the opaque form stopped blocking the spread\n${result.output}`);
  assert.ok(result.lines.has(11), `the private-member form stopped blocking the spread\n${result.output}`);
  assert.match(result.output, /TS2353: Object literal may only specify known properties/);
  assert.match(result.output, /TS2741/);
  // Exactly two of the three forms hold. A third erroring line would mean the method form started
  // working and the header above needs rewriting.
  assert.equal(result.lines.size, 2, result.output);
});

// --- The runtime mitigations, and the line between a mitigation and a fix --------------------------

test('the three runtime mitigations exist, and a mitigation never closed a type on its own — both halves asserted', () => {
  // Recorded because "6-0 fixed the ledger" is the sentence this file exists to stop. Each
  // mitigation is tied to the source that implements it, so a mitigation quietly removed fails here
  // as loudly as a hole quietly opened.
  const mitigated = BRANDS.filter((brand) => brand.mitigation !== null).map((brand) => brand.type);
  assert.deepEqual(mitigated.sort(), ['RetirementPhaseInterest', 'TransferBalanceAccountDays', 'TransferBalanceLedger']);
  // All three mitigated types are now ALSO converted — the mitigation is what happened first, and it
  // is not what closed them. It was the separate P3-41 private-member brand that did.
  assert.deepEqual(
    mitigated.filter((type) => !BRANDS.find((brand) => brand.type === type).holed).sort(),
    ['RetirementPhaseInterest', 'TransferBalanceAccountDays', 'TransferBalanceLedger'],
  );

  const tba = readFileSync(join(ROOT, 'src', 'core', 'transferBalanceAccount.ts'), 'utf8');
  // 6-0 and 6-2: the write and the read, two seams, the full sum taken at both.
  assert.match(tba, /const requireAConformingLedger = \(ledger: TransferBalanceLedger\)/);
  assert.equal([...tba.matchAll(/^\s+(?:return )?requireAConformingLedger\(/gm)].length, 2, 'the write seam and the read seam');
  // 6-2: the renamed stated-history keys, which close a DOOR and not a type.
  assert.match(tba, /statedHighestEndOfDayTransferBalance/);

  const phase = readFileSync(join(ROOT, 'src', 'core', 'superPhase.ts'), 'utf8');
  // 6-1: `fundEarningsTax` re-raises the constructor guard against the carried `release`.
  assert.match(phase, /requireBenefitAccess\(\s*benefitAccess\(interest\.release\)/);
});
