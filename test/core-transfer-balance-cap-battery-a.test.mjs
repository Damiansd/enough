// P3-9 mutation Battery A — the three gaps the battery found in chunks 2 and 3, and nothing else.
//
// This file is not a second copy of the golden fixtures: `core-personal-transfer-balance-cap.test.mjs`
// and `core-transfer-balance-day.test.mjs` carry those, and the battery confirmed they catch every
// arithmetic mutation it threw at them (T58, T59, T60, T61, T62, T63, T64, T71, T84, the s 294-40(1)(b)
// latch, the breach comparison and the day-ordering guard all failed between 1 and 17 tests). What
// survived was three things none of those fixtures look at, and each one is pinned below with its
// own measurement rather than with a claim.
//
// **Where every figure comes from.** Register §3.10.9's own hand-worked rows, or a derivation shown
// line by line beside the assertion. Nothing was read off an implementation: the two caps in the
// third test are §3.10.9's *"$2,040,000 (not $2,055,000)"* — the register names both the right answer
// and the wrong one, which is why this gap can be priced at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  advanceTransferBalanceDay,
  carryPersonalCapForward,
  indexPersonalTransferBalanceCap,
  openTransferBalanceAccountDays,
  seedPersonalTransferBalanceCap,
  transferBalanceAccountDaysAsStated,
} from '../dist/core/transferBalanceAccount.js';
import { generalTransferBalanceCap } from '../dist/core/superCaps.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_SOURCE = readFileSync(join(ROOT, 'src', 'core', 'transferBalanceAccount.ts'), 'utf8');

/** Dollars to cents, so every expected figure below reads as the register writes it. */
const $ = (dollars) => dollars * 100;

// --- Gap 1: the "two deliberately different routes" cross-check cannot disagree ---------------------

test('the §3.10.2 cross-check is algebraically vacuous, and exactly one of its six limbs can fire', () => {
  // **Measured, not assumed.** Chunk 2 computes the increment twice — once as
  // `unusedCapPercentage × increase / 100` and once as `steps × unusedCapPercentage × $1,000` — and
  // calls the pair a cross-check. It is not one. Both routes are functions of the same two values
  // and are algebraically identical: for a whole-$100,000-step increase of `n` steps,
  // `pct × (n × 10,000,000) / 100` and `(n × 10,000,000 / 10,000,000) × pct × 100,000` are the same
  // expression rearranged. Every whole-step increase the general cap has ever taken or could take,
  // against every lawful unused percentage, is enumerated here, and the two routes never part.
  let disagreements = 0;
  for (let steps = 1; steps <= 200; steps += 1) {
    for (let unused = 0; unused <= 100; unused += 1) {
      const increase = steps * $(100_000);
      if ((unused * increase) / 100 !== (increase / $(100_000)) * unused * $(1_000)) disagreements += 1;
    }
  }
  assert.equal(disagreements, 0, 'the two routes disagreed somewhere — the vacuity finding would be wrong');

  // So the guard's value is not in `increment !== check`. Of its six limbs, four more are also
  // unreachable through the module's own API, and the reasons are different for each:
  //
  //   * `!Number.isInteger(steps)` — s 294-35(3) rounds the general cap DOWN to a whole $100,000
  //     (`superCaps.ts`), so no pair of years can produce a fractional step. Asserted below over
  //     every consecutive pair the register can compute.
  //   * `!Number.isInteger(unusedCapPercentage)` and `unusedCapPercentage < 0` and `> 100` —
  //     `Math.floor` of a ratio already bounded by the `highest > denominator` refusal above it.
  //
  // Every consecutive pair of computable years, FY2017-18 through FY2026-27. A fractional step here
  // would mean `superCaps.ts` had stopped rounding, which is the only way limb 1 becomes reachable.
  const years = ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];
  for (let i = 1; i < years.length; i += 1) {
    const rise = generalTransferBalanceCap(years[i]).amount - generalTransferBalanceCap(years[i - 1]).amount;
    assert.equal(rise % $(100_000), 0, `FY${years[i]} rose ${rise} cents, which is not a whole $100,000 step`);
  }

  // **The one limb that can fire, fired.** `cap % THOUSAND_DOLLARS !== 0` is reachable because
  // `capPrevFY` is a caller-supplied figure — for a Person whose account predates the forecast it is
  // a §3.10.7 Setting, so a cents-bearing cap can genuinely arrive. Derivation: last year's cap
  // $2,000,000.50, a FY2026-27 increase of $2,100,000 − $2,000,000 = $100,000, a high-water mark of
  // $1,200,000 against a $2,000,000 cap on its day → floor(60) used → 40% unused → +$40,000, so the
  // cap comes out at $2,040,000.50 and §3.10.2's invariant says a cents-bearing personal cap is
  // always a bug.
  assert.throws(
    () =>
      indexPersonalTransferBalanceCap('2026-27', {
        accountStartDay: '2025-09-01',
        capPrevFY: $(2_000_000) + 50,
        provenanceOfCapPrevFY: seedPersonalTransferBalanceCap('2025-09-01').provenance,
        highestEndOfDayTransferBalance: $(1_200_000),
        personalCapOnHighestBalanceDay: $(2_000_000),
        hasEverExceededCap: false,
      }),
    (raised) => {
      assert.ok(raised instanceof RangeError);
      assert.match(raised.message, /\$2,040,000\.50/);
      assert.match(raised.message, /whole multiple of \$1,000/);
      assert.match(raised.message, /§3\.10\.2/);
      return true;
    },
  );
});

test('the guard that cannot fire on a value is pinned as TEXT, limb by limb', () => {
  // Deleting the whole guard failed **zero** tests when the battery measured it, and collapsing
  // `check` into `increment` failed zero as well. Neither mutation moves a figure, which is exactly
  // why neither fixture sees it — and both would leave the module's own comment claiming a
  // cross-check it no longer performs. Since the pair cannot disagree on a value, the only thing
  // that can defend it is the source text, and this test says so rather than implying more.
  //
  // The two routes, each written once and each written the way the comment above them describes.
  assert.equal([...LEDGER_SOURCE.matchAll(/const increment = \(unusedCapPercentage \* increase\) \/ 100;/g)].length, 1);
  assert.equal([...LEDGER_SOURCE.matchAll(/const steps = increase \/ INDEXATION_STEP;/g)].length, 1);
  assert.equal([...LEDGER_SOURCE.matchAll(/const check = steps \* unusedCapPercentage \* THOUSAND_DOLLARS;/g)].length, 1);
  // The six limbs, each exactly once. A limb that appears twice is a second idea of the invariant.
  for (const limb of [
    /!Number\.isInteger\(steps\)/,
    /increment !== check/,
    /!Number\.isInteger\(unusedCapPercentage\)/,
    /unusedCapPercentage < 0/,
    /unusedCapPercentage > 100/,
    /cap % THOUSAND_DOLLARS !== 0/,
  ]) {
    assert.equal([...LEDGER_SOURCE.matchAll(new RegExp(limb.source, 'g'))].length, 1, `${limb} is not written exactly once`);
  }
  // The two constants the invariant is stated in, by value — a row pinned by name is not pinned by
  // value. $1,000 is §3.10.2's invariant step; $100,000 is s 294-35(3)'s indexation step.
  assert.match(LEDGER_SOURCE, /const THOUSAND_DOLLARS = 100_000;/);
  assert.match(LEDGER_SOURCE, /const INDEXATION_STEP = 10_000_000;/);
  // Vacuity guard: the same style of count must find something that is genuinely there more often,
  // or a derivation that silently matched nothing would let every line above pass.
  assert.ok([...LEDGER_SOURCE.matchAll(/unusedCapPercentage/g)].length > 6);
});

// --- Gap 2: CLOSED — the door's parameter keys are renamed, so the laundering will not compile -----

/**
 * The same scratch-file harness `core-div293.test.mjs` and `core-income-tax-mutations.test.mjs` use:
 * a file compiled by `tsc --noEmit` against `src/` (not `dist/`, where the types are erased), under
 * the same flags as the project build. `ok` is the exit status, `output` the diagnostics.
 */
const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-tba-days-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { toCents } from '../src/core/money.js';\n" +
        'import { openTransferBalanceAccountDays, seedPersonalTransferBalanceCap, ' +
        "transferBalanceAccountDaysAsStated } from '../src/core/transferBalanceAccount.js';\n" +
        "const seed = seedPersonalTransferBalanceCap('2025-09-01');\n" +
        "const real = openTransferBalanceAccountDays('2025-09-01', seed.cap, toCents(1_200_000));\n" +
        'void real; void transferBalanceAccountDaysAsStated;\n' +
        `${body}\n`,
    );
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
      return { ok: true, output: '' };
    } catch (error) {
      return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('the compile probe is not vacuous — an honest field-by-field stated history compiles clean', () => {
  // The positive control, and it is the half of the claim that costs something: if the rename had
  // made legitimate use awkward or impossible, this would fail and the fix would be a refusal of the
  // §3.10.7 Settings rather than a containment. Stating a history means writing the five fields out
  // one by one, which is exactly what a user-supplied record is, so nothing honest was lost.
  const result = tsc(
    'void transferBalanceAccountDaysAsStated({\n' +
      "  statedThroughDay: '2025-06-30',\n" +
      '  statedHighestEndOfDayTransferBalance: toCents(1_700_000),\n' +
      "  statedHighestBalanceDay: '2018-03-01',\n" +
      '  statedPersonalCapOnHighestBalanceDay: seed.cap,\n' +
      '  statedHasEverExceededCap: true,\n' +
      '});',
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — spreading a real state into the stated door with the mark zeroed will not compile', () => {
  // **What this test used to assert.** Until this pass it asserted today's WRONG behaviour: a real,
  // computed state spread into the stated-history door with its high-water mark overwritten came
  // back out frozen and BRANDED, and every function downstream accepted it. The brand blocked the
  // bare annotated literal (TS2741) and nothing else — the door's parameter object was a structural
  // SUBSET of the branded state, so `{ ...real, highestEndOfDayTransferBalance: 0 }` supplied every
  // key it asked for and the two consistency checks inside it both passed on zero (zero is not after
  // `throughDay`; zero does not exceed the cap). Its own tripwire scripted this retirement.
  //
  // **What closed it is a rename, not a check**, because no check could: the day state carries no
  // trail — *"Nothing here can reconstruct it, which is the point"* — so unlike chunk 4's ledger,
  // where `transferBalance` must equal the sum of `entries[].movement` and 6-0 could read the
  // witness back, there is no runtime evidence of a lowered mark anywhere in the value. The five
  // parameter keys now carry a `stated` prefix, so a spread of a real state supplies **none** of
  // them and the expression is a compile error rather than a silent acceptance.
  const result = tsc('void transferBalanceAccountDaysAsStated({ ...real, highestEndOfDayTransferBalance: toCents(0) });');
  assert.equal(result.ok, false, 'the laundering spread still compiles — the containment is gone');
  // TS2561 as measured (the explicit member is now an excess property and `tsc` reports that first,
  // naming the prefixed key it meant); TS2345 is the missing-properties form the same expression
  // takes without the explicit member. Either is the compile error; neither is a wrong number.
  assert.match(result.output, /TS2561|TS2345/);
  // Named one by one, so a partial rename that left one key unprefixed would fail here.
  for (const key of [
    'statedThroughDay',
    'statedHighestEndOfDayTransferBalance',
    'statedHighestBalanceDay',
    'statedPersonalCapOnHighestBalanceDay',
    'statedHasEverExceededCap',
  ]) {
    assert.match(result.output, new RegExp(key));
  }
  // And the prefix cannot be half-adopted: spreading the real state and renaming only the key being
  // lied about is the obvious next attempt, and it is missing the other four just the same.
  const halfAdopted = tsc(
    'void transferBalanceAccountDaysAsStated({ ...real, statedHighestEndOfDayTransferBalance: toCents(0) });',
  );
  assert.equal(halfAdopted.ok, false);
  assert.match(halfAdopted.output, /TS2561|TS2345/);
});

test('the price the rename removes, and the residue it does not: $2,040,000 against $2,055,000', () => {
  // **The priced pair is kept verbatim from the version of this test that recorded the gap**, because
  // a closed gap that stops naming its own figures cannot be re-checked. §3.10.9 states both: the
  // honest **$2,040,000** and the flattered **$2,055,000** (*"$2,040,000 (not $2,055,000)"*).
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  assert.equal(seed.cap, $(2_000_000)); // FY2025-26's general cap, §3.1.

  // §3.10.9's high-water-mark fixture: $1.2m credit 1 Sep 2025, $300k debit 15 Mar 2026, so the
  // account closes 1 Sep 2025 at $1,200,000 and sits at $900,000 after the debit.
  const real = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  assert.equal(real.highestEndOfDayTransferBalance, $(1_200_000));

  // The honest answer, which the register states in terms: floor(100 × 1,200,000 / 2,000,000) = 60
  // used → 40% unused of the $100,000 FY2026-27 increase → +$40,000 → **$2,040,000**.
  const honest = indexPersonalTransferBalanceCap(
    '2026-27',
    carryPersonalCapForward(real, {
      accountStartDay: '2025-09-01',
      capPrevFY: seed.cap,
      provenanceOfCapPrevFY: seed.provenance,
    }),
  );
  assert.equal(honest.cap, $(2_040_000));

  // **The residue, stated plainly rather than implied away.** The rename closes the route where a
  // COMPUTED state is silently relabelled. It does not, and cannot, stop a user from stating a false
  // history field by field — that is the input boundary's own limit, the one §3.10.7 answers with
  // *"these seven fields come off the ATO's record of the account"*. Written out, the same five
  // values reach the same wrong cap:
  const stated = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2025-09-01',
    statedHighestEndOfDayTransferBalance: 0,
    statedHighestBalanceDay: '2025-09-01',
    statedPersonalCapOnHighestBalanceDay: seed.cap,
    statedHasEverExceededCap: false,
  });
  const advanced = advanceTransferBalanceDay({
    state: stated,
    day: '2026-09-01',
    closingBalance: $(900_000),
    personalCapOnDay: seed.cap,
  });
  assert.equal(advanced.highestEndOfDayTransferBalance, $(900_000));

  // The price, hand-derived: floor(100 × 900,000 / 2,000,000) = 45 used → 55% unused of $100,000 →
  // +$55,000 → **$2,055,000**, which is the exact figure §3.10.9 names as the failure for this
  // fixture (*"$2,040,000 (not $2,055,000)"*).
  const flattered = indexPersonalTransferBalanceCap(
    '2026-27',
    carryPersonalCapForward(advanced, {
      accountStartDay: '2025-09-01',
      capPrevFY: seed.cap,
      provenanceOfCapPrevFY: seed.provenance,
    }),
  );
  assert.equal(flattered.cap, $(2_055_000));
  // **The direction, which is the half of a known-unsafe label that is worth testing.** The residue
  // runs one way: it can only ever RAISE the cap, because lowering the mark can only raise the
  // unused percentage. $15,000 of cap space this Person does not have, and permanently — next year's
  // carry-forward starts from it. What changed is WHO can do it: a deliberate statement, not a
  // one-line spread of a state the model itself computed.
  assert.ok(flattered.cap > honest.cap);
  assert.equal(flattered.cap - honest.cap, $(15_000));
});

test('the stated-history door is the ONLY unbranded way into the day state, and it is one door', () => {
  // The containment above holds only while there is exactly one door AND its keys stay prefixed. A
  // second producer taking a caller-supplied mark would be a second place the laundering happens,
  // and the existing `as TransferBalanceAccountDays;` count of three does not distinguish the doors
  // from the computations — `openTransferBalanceAccountDays` and `advanceTransferBalanceDay` derive
  // the mark from a CLOSING BALANCE they are handed for one day, which is a different kind of input.
  assert.equal([...LEDGER_SOURCE.matchAll(/export const transferBalanceAccountDaysAsStated = \(stated: \{/g)].length, 1);
  // **The replacement tripwire for the retired gap.** The prefix is the whole containment, so it is
  // pinned two ways that fail differently. First, each prefixed key by name, so dropping one prefix
  // re-opens the spread for that field. Second, a type-blind COUNT of the parameter's `readonly`
  // members — a `deepEqual` over matched declarations is a whitelist of the shapes that were thought
  // of, and a member whose type carried an unexpected character would simply not match.
  const door = LEDGER_SOURCE.slice(
    LEDGER_SOURCE.indexOf('export const transferBalanceAccountDaysAsStated = (stated: {'),
  );
  const parameter = door.slice(0, door.indexOf('}): TransferBalanceAccountDays'));
  for (const key of [
    'statedThroughDay: IsoDate;',
    'statedHighestEndOfDayTransferBalance: Cents;',
    'statedHighestBalanceDay: IsoDate;',
    'statedPersonalCapOnHighestBalanceDay: PersonalTransferBalanceCap;',
    'statedHasEverExceededCap: boolean;',
  ]) {
    assert.match(parameter, new RegExp(`readonly ${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
  assert.equal([...parameter.matchAll(/readonly \w+\??:/g)].length, 5, 'the stated door grew or lost a key');
  // Two field declarations of the mark in the whole module now, and they are accounted for one by
  // one: `PersonalCapCarryForward` (chunk 2's read-only seam, which produces no day state) and the
  // branded `TransferBalanceAccountDays` state itself. The stated door's own copy is the prefixed
  // one counted above, and that is precisely why the subset relation no longer holds. A third is
  // either a second door or a second state, and this file's account of the gap would be out of date.
  assert.equal([...LEDGER_SOURCE.matchAll(/readonly highestEndOfDayTransferBalance: Cents;/g)].length, 2);
  assert.match(LEDGER_SOURCE, /export const openTransferBalanceAccountDays = \(\n\s*accountStartDay: IsoDate,\n\s*personalCapOnStartDay: PersonalTransferBalanceCap,\n\s*closingBalance: Cents,\n\)/);
  // Vacuity guard.
  assert.ok([...LEDGER_SOURCE.matchAll(/highestEndOfDayTransferBalance/g)].length > 2);
});
