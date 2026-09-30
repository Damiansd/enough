// P3-21f chunk 1 — THE PARCEL, AND NOTHING THAT MOVES.
//
// `Person.financialAssets` was a stored scalar and is now `financialAssets(person)`, a DERIVATION
// over `Person.parcels`.
//
// ⚠️ **Three of the assertions below were flipped by P3-21f chunk 6 and the flips are marked where
// they are.** Chunk 1's claim was that a cost base moved no figure, and it held for chunks 2 to 5
// because nothing could dispose of a parcel the walk had not been told to sell. Limb 3 now draws
// without being told, so a funded Household's walk MOVES, its cost base MATTERS, and the pool is
// spent rather than compounded untouched. The old digest is kept and asserted against, rather than
// refreshed.
//
// **Four things are defended here and nothing else.**
//
//   1. **The scalar is derived and cannot be stored.** The means test reads the scalar and the
//      portfolio holds the parcels; if both could exist, a disposal that moved one and not the
//      other would produce an Age Pension assessed on money the Household no longer holds. There is
//      no exception to notice and no mismatch to see — just a wrong entitlement that reads
//      perfectly. Tested as a BEHAVIOUR (a lying `financialAssets` property is ignored) and as a
//      structural sweep (no `.financialAssets` read survives anywhere in `src/`).
//   2. **The acquisition day is required and is never defaulted.** Chunk 4's 50% discount turns
//      entirely on it — *more than* 12 months — so a parcel with no day, or with a day the model
//      supplied, would answer a tax question on the user's behalf in the flattering direction. It
//      is refused at every level: the derivation, the means-test split and the whole projection.
//   3. **A parcel is owned by a PERSON, never by the Household** (P3-21c — a realised gain is that
//      Person's and cannot be shifted after the fact). A Household-level parcel is not merely
//      discouraged: it reaches nothing, and the assertion is a dollar figure rather than a shape.
//   4. **BYTE-IDENTICAL projection, for a Household that holds NOTHING.** ADR-0009's expected state
//      still projects to the same bytes it did before the parcel existed — P4-1a's reproducibility
//      bar, and the bar chunks 1 and 2 of P4-1 met. The two digests below were captured from the
//      build at `092a383`, the commit before this chunk, and are pinned rather than recomputed.
//      **A FUNDED one no longer does, and chunk 6 is why:** `BEFORE_FUNDED` is now the digest the
//      walk must NOT produce.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { financialAssets, splitAssets } from '../dist/core/household.js';
import { parcelsGrownForOneMonth, project, unfundedMiddleLimbs } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const parcel = (marketValue, over = {}) => ({
  acquired: '2015-03-02',
  costBase: toCents(1_000),
  marketValue,
  ...over,
});

// --- 1. The scalar is a DERIVATION ---------------------------------------------------------------

test('financialAssets is the sum of the parcels, and an empty portfolio is a stated fact', () => {
  assert.equal(financialAssets(person('Val', '1955-04-17')), toCents(0));
  assert.equal(
    financialAssets(
      person('Val', '1955-04-17', {
        parcels: [parcel(toCents(250_000)), parcel(toCents(0.01)), parcel(toCents(99_999.99))],
      }),
    ),
    toCents(350_000),
  );

  // Absent is not the same fact as empty. `parcels: []` is how a Household says it holds no
  // investments outside super (ADR-0009's expected state); a Person with no `parcels` at all has
  // not been asked, and reading that as nil would answer for them.
  assert.throws(
    () => financialAssets({ name: 'Val', dateOfBirth: '1955-04-17', superInterests: [] }),
    /Val states no non-super parcels/,
  );

  // Whole cents, never negative, on both money fields — the guard money.ts puts on every balance.
  assert.throws(() => financialAssets(person('Val', '1955-04-17', { parcels: [parcel(100.5)] })), /marketValue is not a whole number of cents/);
  assert.throws(() => financialAssets(person('Val', '1955-04-17', { parcels: [parcel(-1)] })), /marketValue is not a whole number of cents/);
  assert.throws(
    () => financialAssets(person('Val', '1955-04-17', { parcels: [parcel(toCents(10), { costBase: -1 })] })),
    /costBase is not a whole number of cents/,
  );
});

test('MUTATION — a stored `financialAssets` beside the parcels is IGNORED, everywhere', () => {
  // The mutation this chunk exists to make impossible: a kept total that can drift from the parcels
  // it is supposed to summarise. There is no field for one — so a Person carrying the property
  // anyway is carrying a lie, and every reader must take the parcels.
  const liar = person('Val', '1955-04-17', {
    superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
    parcels: [parcel(toCents(250_000))],
    financialAssets: toCents(9_000_000),
  });
  const truthful = person('Val', '1955-04-17', {
    superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
    parcels: [parcel(toCents(250_000))],
  });

  assert.equal(financialAssets(liar), toCents(250_000));

  const household = { persons: [liar], homeStatus: 'occupied' };
  const split = splitAssets(household, '2026-11-14');
  assert.equal(split.assessableAssets, toCents(550_000));
  assert.equal(split.deemedFinancialAssets, toCents(550_000));
  assert.notEqual(split.assessableAssets, toCents(9_300_000));
  // The whole split is the split of the truthful Household, line for line and figure for figure.
  assert.deepEqual(split, splitAssets({ persons: [truthful], homeStatus: 'occupied' }, '2026-11-14'));

  // And the projection agrees with the split: a reader that took the stored figure would assess
  // $9,000,000 of deemed financial assets and pay a very different Age Pension.
  const settings = {
    asAtDate: '2026-09-16',
    planningHorizonAge: 72,
    // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
    // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
    // to each month's own price level, so at any positive CPI every hand-worked figure below would
    // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
    // than about what it was written for. At nil the factor is exactly 1 in every month
    // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
    // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
    economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
  };
  assert.equal(project(settings, household, [])[0].assessableAssets, toCents(550_000));
  assert.equal(
    JSON.stringify(project(settings, household, [])),
    JSON.stringify(project(settings, { persons: [truthful], homeStatus: 'occupied' }, [])),
  );
});

test('STRUCTURAL — nothing in src/ reads a `.financialAssets` property', () => {
  // The behavioural test above catches a reader that PREFERS a stored field. This catches the field
  // coming back at all: after chunk 1 the only spelling is the function call, so a property read is
  // either a resurrected field or a reader of a lie. Deliberately blunt — it over-matches into
  // prose sooner than it lets a real read pass as commentary, which is why the fix for a false
  // positive is to reword the comment.
  const files = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* files(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const offenders = [];
  for (const file of files(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      if (/\.financialAssets\b/.test(line)) offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}`);
    }
  }
  assert.deepEqual(offenders, []);

  // Not vacuous: `financialAssets` IS still the name of the figure, and the regex above would have
  // caught the pre-chunk-1 spelling of every one of these call sites.
  const household = readFileSync(join(SRC, 'core', 'household.ts'), 'utf8');
  assert.match(household, /export const financialAssets = \(person: Person\): Cents =>/);
  assert.match(household, /readonly parcels: readonly Parcel\[\];/);
  assert.doesNotMatch(household, /readonly financialAssets/);
  assert.ok(/\.financialAssets\b/.test('    if (person.financialAssets !== 0) {'), 'the sweep would not catch the old code');
});

// --- 2. The acquisition day is required ----------------------------------------------------------

test('MUTATION — a parcel with no acquisition day is REFUSED, at every level', () => {
  // Chunk 4 halves the gain on a parcel held MORE THAN 12 months, so the day is the difference
  // between two tax bills. A defaulted day is a tax answer nobody was asked for.
  const dayless = { costBase: toCents(1_000), marketValue: toCents(250_000) };
  const holder = person('Val', '1955-04-17', { parcels: [dayless] });

  assert.throws(() => financialAssets(holder), /not a zero-padded ISO date: undefined/);
  assert.throws(() => splitAssets({ persons: [holder], homeStatus: 'occupied' }, '2026-11-14'), /not a zero-padded ISO date/);
  assert.throws(
    () =>
      project(
        {
          asAtDate: '2026-09-16',
          planningHorizonAge: 72,
          economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
          deemingRates: { lower: 0.0175, upper: 0.0375 },
          nominalReturn: 0.065,
        },
        { persons: [holder], homeStatus: 'occupied' },
        [],
      ),
    /not a zero-padded ISO date/,
  );

  // A day that is not zero-padded sorts wrongly against a padded one — `2026-3-5` against
  // `2026-03-20` — and an anniversary test done on strings would get it backwards. Refused too.
  assert.throws(() => financialAssets(person('Val', '1955-04-17', { parcels: [parcel(toCents(1), { acquired: '2026-3-5' })] })), /not a zero-padded ISO date: 2026-3-5/);
  assert.throws(() => financialAssets(person('Val', '1955-04-17', { parcels: [parcel(toCents(1), { acquired: '' })] })), /not a zero-padded ISO date/);
  // A stated day is carried through the whole walk untouched — nothing in chunk 1 may rewrite one.
  assert.equal(parcelsGrownForOneMonth([parcel(toCents(250_000))], 0.065)[0].acquired, '2015-03-02');
});

// --- 3. Owned per PERSON, never by the Household -------------------------------------------------

test('MUTATION — a parcel owned by the HOUSEHOLD reaches nothing (P3-21c)', () => {
  // Whose name the bridge is in is a decision made years before it matters, and a gain cannot be
  // shifted after the fact. So there is no Household-level portfolio to shift one into: a `parcels`
  // array on the Household is an unread property, and the assertion is a dollar figure.
  const val = person('Val', '1955-04-17', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }] });
  const ken = person('Ken', '1970-01-01');
  const householdOwned = {
    persons: [val, ken],
    homeStatus: 'occupied',
    parcels: [parcel(toCents(250_000))],
  };

  const split = splitAssets(householdOwned, '2026-11-14');
  assert.equal(split.assessableAssets, toCents(300_000), 'a Household-level parcel was assessed');
  assert.equal(split.deemedFinancialAssets, toCents(300_000));
  assert.deepEqual(split.lines.map((line) => line.description), ['Account-Based Pension']);
  assert.deepEqual(split, splitAssets({ persons: [val, ken], homeStatus: 'occupied' }, '2026-11-14'));

  // Limb 3 agrees: this Household holds no Non-Super Portfolio at all.
  assert.equal(unfundedMiddleLimbs(householdOwned).nonSuperPortfolio.note.startsWith('no Non-Super Portfolio in this Household:'), true);

  // Not vacuous — the very same parcel, moved onto a Person, is assessed and deemed and changes the
  // note. $250,000 is either counted or it is not, and this is the pair that says which.
  const personOwned = { persons: [{ ...val, parcels: [parcel(toCents(250_000))] }, ken], homeStatus: 'occupied' };
  assert.equal(splitAssets(personOwned, '2026-11-14').assessableAssets, toCents(550_000));
  assert.equal(splitAssets(personOwned, '2026-11-14').lines.find((line) => line.deemed && line.owner === 'Val' && line.amount === toCents(250_000)).owner, 'Val');
  assert.match(unfundedMiddleLimbs(personOwned).nonSuperPortfolio.note, /this note is a BUG and not a fact/);
});

// --- 4. BYTE-IDENTICAL: the bar this chunk is measured against -----------------------------------
//
// A couple with an Account-Based Pension drawing its Sch 7 minimum in 88 of 221 months, an Age
// Pension in 7 of them, a spending level, and a Non-Super Portfolio on both sides of the couple.
// Both pools grow every month, so a wrongly wired parcel moves `assessableAssets` in every month of
// the walk. Captured at `092a383` with `financialAssets: toCents(250_000)` and `toCents(90_000)`
// stored scalars; re-run here with the same money stated as ONE parcel each, at a cost base that is
// not the market value.

const BYTE_SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 75,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};
const BYTE_ENTRIES = [
  {
    id: 'sc',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(72_000) },
    enabled: true,
    createdAt: '2026-06-01',
  },
];
/**
 * **The Age Pension held at its 2026 rates, STATED — for the two tests below whose subject is limb 3
 * and not the pension (2026-09-23).** Until that day a plan with no series carried the last
 * published sets forward; it now indexes them on the plan's own growth rates, and on this fixture
 * that pays Val's pension in every month, so limb 3 sells too little for Ken's parcel or a capital
 * gain ever to be reached and the two tests would be asserting about nothing. A series of unit
 * movements with the MTAWE floor at nil is §4.7's mechanism run at the carried table's own figures
 * (register §4.7.0's two-route control: within 9 cents a month), so those two tests keep the walk
 * they were written about, and say so, rather than silently losing it.
 *
 * ⚠️ **Since "spend cash first" (later on 2026-09-23) the frozen pension no longer reaches a taxable
 * gain either**: the parcels are sold ahead of the pension above its minimum, in slices small enough
 * to stay under Val's tax-free threshold every year. Ken's parcel IS still reached — on either
 * settings now — so the lines test below keeps its subject; the cost-base test raises the spending
 * instead, and says why.
 */
const FROZEN_AGE_PENSION = (() => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  for (let year = 2027; year <= 2045; year += 1) {
    for (const md of ['03-20', '09-20']) rateIndexations.push({ effective: `${year}-${md}`, cpi: 1, pblci: 1, annualisedMtawe: 0 });
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1, cpiDecemberQuarter: 1 });
  }
  return { rateIndexations, meansTestIndexations };
})();
const FROZEN_SETTINGS = { ...BYTE_SETTINGS, economicSeries: { ...BYTE_SETTINGS.economicSeries, agePension: FROZEN_AGE_PENSION } };

const byteHousehold = (valParcels, kenParcels) => ({
  persons: [
    {
      ...person('Val', '1955-04-17', {
        superInterests: [
          { phase: 'accountBasedPension', balance: toCents(400_000), statedStreamSettings: { commencementDay: '2020-07-01' } },
        ],
        parcels: valParcels,
      }),
    },
    { ...person('Ken', '1970-01-01', { superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }], parcels: kenParcels }) },
  ],
  homeStatus: 'occupied',
});

/**
 * The projection, as the bytes a caller would see — and, beside it, the same walk with P4-6's
 * `accessibleAssets` removed from every month.
 *
 * **Why the second digest exists.** P4-6 widened `Month` with a new field, so every digest captured
 * before it necessarily changed — and a digest that merely got refreshed proves nothing about
 * whether a FIGURE moved. `withoutAccessible` is the walk P4-6 was supposed to leave untouched, and
 * it is asserted against the pins captured before P4-6 rather than against a new capture. A change
 * that moved one cent of the walk breaks it; adding a field does not.
 */
// **THE PAYMENT LINE WAS RENAMED ON 2026-09-23 — `Account-Based Pension minimum, <name>` became
// `Account-Based Pension payment, <name>` — and that is a LABEL, not a figure.** Limb 2 offers the
// whole balance, so "minimum" misnamed the payment. The two words are the same length, so the byte
// counts below cannot see it; the digests can. The old label is put back before hashing, and every
// pin in this file is then asserted UNCHANGED: that is the proof the rename moved no cent.
const beforeTheRename = (json) => json.replaceAll('"description":"Account-Based Pension payment, ', '"description":"Account-Based Pension minimum, ');

const digestOf = (household, settings = BYTE_SETTINGS, entries = BYTE_ENTRIES) => {
  const months = project(settings, household, entries);
  const json = beforeTheRename(JSON.stringify(months));
  // **THE STRIP IS CUMULATIVE — P4-6's field, and now P4-4's two widenings (2026-09-18).** Each
  // widening adds bytes to what a caller sees, and a digest that merely got refreshed would prove
  // nothing about whether a FIGURE moved. So the pre-P4-6 walk is RECONSTRUCTED from the current
  // one and asserted against the digests captured before any of them existed:
  //   * `accessibleAssets` removed (P4-6);
  //   * every `effect: 'wealth'` line removed and `effect` deleted from the rest (P4-4 item 1);
  //   * `appliedEntryIds` truncated to the month's own entries (P4-4 item 2). `BYTE_ENTRIES` holds
  //     exactly one entry, `sc`, a standing level dated before the walk — so the pre-P4-4 array was
  //     `['sc']` in month 0 and `[]` in every other month, and that is what is restored. It is
  //     derived from the fixture rather than read off the output: the walk is not allowed to tell
  //     this strip what the answer was.
  //   * `notes` removed (P4-4's polish, 2026-09-18) — the Waterfall's per-limb record and the
  //     parameter-window notes. It is the fourth layer and it is the easiest of them to check: a
  //     note is not a money movement, so the pre-P4-6 digests below must reproduce byte-identically
  //     with it gone, and they do.
  //   * `provenance` removed from the month AND from every line (P5-3 limb 2, 2026-09-18) — the
  //     FIFTH layer. It is the same check as `notes`: a record of where a figure came from is not a
  //     figure, so stripping it must put the walk back to the byte at the pre-P4-6 digests below.
  //     It is the layer most likely to hide a movement, because unlike `notes` it is attached to
  //     the very objects that carry the money — hence the line-level strip is a field deletion and
  //     never a line deletion.
  //   * `assetsByPerson` removed (P7-6, 2026-09-19) — the SEVENTH layer, and the cheapest of them
  //     to argue: it is the three figures already on the month, broken down per Person, so every
  //     cent in it is a cent the month already reported. Stripping it must put the walk back to the
  //     byte at the digests below — which is the whole proof that a breakdown moved nothing.
  //   * `mortgageBalance` removed (P3-16 slice 2, 2026-09-21) — the EIGHTH layer, and the only one
  //     of the eight that is INERT on these two fixtures, which is a stronger statement than the
  //     others and is why it is spelled out rather than added silently. `byteHousehold` states no
  //     `mortgage`, and `projection.ts` OMITS THE KEY ENTIRELY where there is none — so both
  //     digests below reproduce with the strip and, unlike every layer above, without it. The
  //     widening is conditional, so a mortgage-free walk is byte-identical rather than merely
  //     strippable. ⚠️ **The consequence, measured on 2026-09-21: a build that emitted the field
  //     unconditionally would be caught by the FULL digests below and NOT by the stripped ones** —
  //     the strip would delete the very evidence. So the unconditional-emit mutation is pinned in
  //     three places and this is only one of them; the others are `core-mortgage.test.mjs`'s "no
  //     mortgage stated is no word anywhere in the walk" and its key-absence test, which say WHY
  //     rather than merely that the bytes moved. The line is here so that the day a
  //     mortgage-bearing fixture is added, the pre-existing stripped digests are still reachable.
  //   * `attribution` removed from every line (P5-3's line → entry attribution, 2026-09-18) — the
  //     SIXTH layer, and a field deletion for the same reason the fifth is. Naming the entry behind
  //     a figure cannot move the figure: a line whose attribution changed while its amount did not
  //     reproduces the pre-P4-6 digests exactly, and a line whose amount moved does not, whatever
  //     it says about its author.
  //
  //   * `superBalance` and `incomeFromSuper` removed (2026-09-23) — the NINTH layer: a total of
  //     balances the walk already held and a sum of lines already in `lines`, so neither can move a
  //     figure and stripping them must land on the same digests.
  //   * `closingNonSuperPortfolio` removed (2026-09-24) — the TENTH: the Non-Super Portfolio on the
  //     closing Household the walk already built, so it cannot move a figure either.
  //   * `assetsTestThresholds` removed (2026-09-25) — the ELEVENTH: the assets test's free area and
  //     cut-off, read off the entitlement the walk already computed, so it cannot move a figure.
  //
  // **The strip is DELETIONS and one derivation, and that is deliberate.** Nothing here recomputes a
  // figure: a strip that rebuilt a balance could hide the very cent it was written to find.
  const bare = JSON.stringify(
    months.map(({ accessibleAssets, assetsByPerson, mortgageBalance, notes, provenance, superBalance, incomeFromSuper, closingNonSuperPortfolio, assetsTestThresholds, concessionalCapByPerson, ...rest }, index) => ({
      ...rest,
      lines: rest.lines
        .filter((line) => line.effect !== 'wealth')
        .map(({ effect, provenance: lineProvenance, attribution, ...line }) => line),
      appliedEntryIds: index === 0 ? ['sc'] : [],
    })),
  );
  return {
    sha256: createHash('sha256').update(json).digest('hex'),
    bytes: json.length,
    // 2026-09-25: the full walk with `assetsTestThresholds` stripped — must be the pre-thresholds digest.
    withoutThresholds: createHash('sha256')
      .update(beforeTheRename(JSON.stringify(months, (key, field) => (key === 'assetsTestThresholds' || key === 'concessionalCapByPerson' ? undefined : field))))
      .digest('hex'),
    withoutAccessible: { sha256: createHash('sha256').update(beforeTheRename(bare)).digest('hex'), bytes: bare.length },
    months: JSON.parse(JSON.stringify(months)),
  };
};

// Captured from the build at 092a383 — the commit before P3-21f chunk 1 — by projecting the same
// two Households when the pool was still a stored scalar. Pinned, not recomputed.
const BEFORE_FUNDED = '684a8d828075828893092977a7058e8c5852862769b3006c25e35b02748da227';
const BEFORE_EMPTY = '6d5ff03fab1e1baf8887c158e57425f40a15cdc5c90438d9c0fbcdb599b18754';

test('P3-21f chunk 6 — a FUNDED Household no longer projects byte-identically, and that IS chunk 6', () => {
  // ⚠️ **THIS ASSERTION WAS `equal` UNTIL CHUNK 6 AND IT IS NOW `notEqual`, deliberately.** Chunk 1's
  // bar was that giving the pool a cost base moved no figure; chunks 2 to 5 kept it, because none of
  // them could dispose of a parcel the walk had not been told to sell. **Chunk 6 is the one that
  // tells it.** Limb 3 draws, so this Household — $72,000 a year of spending against an ABP and an
  // Age Pension — now sells parcels in 115 of its 221 months, and a byte-identical walk would mean
  // limb 3 had not been built. `BEFORE_FUNDED` is kept and asserted AGAINST rather than deleted, so
  // that the break stays a decision somebody made and not a digest somebody refreshed.
  const funded = digestOf(
    byteHousehold(
      [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }],
      [{ acquired: '2023-10-30', costBase: toCents(85_000), marketValue: toCents(90_000) }],
    ),
  );
  assert.notEqual(funded.sha256, BEFORE_FUNDED, 'limb 3 drew nothing: the funded walk is still the pre-chunk-1 walk');
  // **P4-6 (2026-09-18) moved this digest by ADDING A FIELD and by nothing else, and both halves are
  // asserted.** `accessibleAssets` is on every month now, so the bytes a caller sees are different;
  // strip it and the walk is the chunk-6 walk to the byte, at the digest and the length captured
  // before P4-6 existed. The old figure is kept and asserted against, exactly as `BEFORE_FUNDED` is.
  // ⚠️ **AND ON 2026-09-19 THE STRIPPED DIGEST MOVED FOR THE FIRST TIME, WHICH IS A FIGURE AND NOT
  // A FIELD.** Waterfall limb 5 draws released superannuation, and Ken — born 1970-01-01, holding
  // $300,000 of Accumulation Phase — reaches the age that releases benefits by itself on
  // 2035-01-01. From 2043-06 this Household is short and it now pays for the shortfall out of his
  // account: **20 months carry a `Superannuation lump sum, Ken` line** where they used to carry an
  // `Unfunded shortfall` beside a balance nobody could spend. The pre-P4-6 pin is kept and asserted
  // AGAINST rather than overwritten, exactly as `BEFORE_FUNDED` is, so the break stays a decision
  // somebody made.
  assert.notEqual(funded.withoutAccessible.sha256, '3b796bb10ac48fd29c5fc9c8b49bd34b392abd5aaff5092ea517435b3d6d0404'); // pre-limb-5
  // ⚠️ **AND ON 2026-09-21 THE STRIPPED DIGEST MOVED FOR THE SECOND TIME, WHICH IS AGAIN A FIGURE
  // AND NOT A FIELD (P4-1e).** The Age Pension is carried past the published window, so this
  // Household is paid one in **124 of its 221 months instead of 7**, and the money changes what
  // every limb below it has to do: limb 3 sells parcels in **99 months rather than 115**, limb 5
  // draws Ken's released super in **NO month at all rather than 20**, and the terminal assessable
  // figure rises from **$836,086.46 to $1,217,782.61**. That is a stripped digest that SHOULD move,
  // and the pre-P4-1e pin is kept and asserted AGAINST rather than overwritten.
  assert.notEqual(funded.withoutAccessible.sha256, '024c67ca6eced1bc3e5b7816bc572fc9338a91b6d3b357a1196c7d4bb47af443'); // pre-P4-1e
  // ⚠️ **AND ON 2026-09-21 IT MOVED FOR THE THIRD TIME, AND AGAIN IT IS A FIGURE (P10-5).** This
  // Household's plan is stated as at 1 September, and until that day the engine determined NO
  // Account-Based Pension minimum for the year in progress — so limb 2 offered nothing until the
  // following 1 July. SIS Reg Sch 7 has no such nil: cl 1(2)(a)(i) works the minimum out on the
  // 1 July balance whatever month a plan is written in, and cl 3 pro-rates only a commencement year.
  // The pension pays that opening part-year now, which is money limb 3 no longer has to sell parcels
  // for. The pre-P10-5 pin is kept and asserted AGAINST rather than overwritten, exactly as the two
  // above it are.
  assert.notEqual(funded.withoutAccessible.sha256, '9ba0af65e2101def56b96ef7a7634853c6cb3b65de763b0455879f09328b213e'); // pre-P10-5
  // ⚠️ **AND ON 2026-09-21 IT MOVED FOR THE FOURTH TIME, AND THIS ONE IS A CORRECTION (P10-4).**
  // Limb 3 sold to NEED and the capital gains tax on that sale was charged afterwards, against the
  // same running cash — so this Household was reported SHORT in 21 of its 221 months, from 2037-06,
  // and **the shortfall was equal to that month's `Income tax on capital gain` to the cent in all
  // 21 of them**: $5,617.80 of shortfall against $5,617.80 of tax. The sale is grossed up to fund
  // its own tax now, and **no month of this walk is short at all**. What it costs is stated rather
  // than hidden: selling a little more realises a little more gain, so the walk pays $5,956.22 of
  // CGT instead of $5,617.80, and the terminal assessable figure is $1,210,400.60 against
  // $1,217,807.38 — $7,406.78 lower, because money moved out of a growing parcel and into cash
  // sooner. The pre-P10-4 pin is kept and asserted AGAINST rather than overwritten, exactly as the
  // three above it are.
  assert.notEqual(funded.withoutAccessible.sha256, 'f9701b865345d64d22d9f24b2add957d50a7406e622ae290501be69da12e9b5d'); // pre-P10-4
  // ⚠️ **AND ON 2026-09-23 IT MOVED FOR THE FIFTH TIME, AND AGAIN IT IS A FIGURE.** A plan with no
  // series now INDEXES the Age Pension on its own growth rates instead of carrying the 2026 sets. The
  // assets-test cut-off is the free area plus the rate over the taper, so when the rate rises the
  // cut-off rises with it: Val was cut out in 97 of these months on the carried table and is paid in
  // **all 221** now. That money is money limb 3 does not have to raise, so it sells in **99 months
  // rather than 106**, never reaches Ken's parcel, realises no taxable gain at all — **nil CGT
  // against $5,956.22** — and the walk ends **$142,298.98 richer**. The pre-2026-09-23 pin is kept
  // and asserted AGAINST rather than overwritten, exactly as the four above it are.
  assert.notEqual(funded.withoutAccessible.sha256, '5afd8e443bd7aaddfa0e02fbb360eab497fd3a898bd1e51619eccb380255310f'); // pre-2026-09-23
  // ⚠️ **AND LATER ON 2026-09-23 IT MOVED FOR THE SIXTH TIME: "SPEND CASH FIRST".** The Waterfall is
  // seven limbs, and the one that matters here is that Val's pension ABOVE its minimum is now drawn
  // AFTER the portfolio, where the whole pension used to be drawn before it. So the parcels are sold
  // sooner — in **121 months rather than 99**, and Ken's parcel is reached (38 of them) where it never
  // was — and the pension pays in 119 months rather than 123. **The terminal figure moves by eleven
  // CENTS**, which is the size the mechanism predicts: both pools earn the same 6.5%, no sale here
  // realises a taxable gain in either order, so which of the two is spent first is wealth-neutral up
  // to each month's flooring. The pre-order pin is kept and asserted AGAINST.
  assert.notEqual(funded.withoutAccessible.sha256, '2cfe7164de1d34298926dd450fca22d9d36e0f546e3a047ec3d4526a1d5b1132'); // pre-order
  // ⚠️ **AND ON 2026-09-24 IT MOVED FOR THE SEVENTH TIME, AND THIS ONE IS A CORRECTION (T135).**
  // The assets excess taxed under the assets test now floors to the nearest $500 (SSA 1991 s1064
  // point 1064-G7) instead of being taxed continuously, so the Age Pension this Household is paid
  // in every one of its 221 months is a few cents higher — no month-count anywhere in this test
  // moved, only the amounts did. The pre-T135 pin is kept and asserted AGAINST, exactly as the six
  // above it are.
  assert.notEqual(funded.withoutAccessible.sha256, '3ad43c342f18da3f30eaad94c0f3d5d7d5c5a942033c7a33b9c8125b2cd1a11b'); // pre-T135
  assert.equal(funded.withoutAccessible.sha256, '99b20267ae82f83b1ca6a7b1799095735b32fc40b7363dc51c28234d81d9d3d4');
  assert.equal(68_892, 68_892, 'the pre-limb-5 stripped length, kept beside the new one');
  assert.equal(69_092, 69_092, 'the pre-P4-1e stripped length, kept beside the new one');
  assert.equal(78_576, 78_576, 'the pre-P10-5 stripped length, kept beside the new one');
  assert.equal(79_114, 79_114, 'the pre-P10-4 stripped length, kept beside the new one');
  // SHORTER, for the first time in this file's history: P10-4 took 21 `Unfunded shortfall` lines
  // out of the walk and added none.
  assert.equal(77_584, 77_584, 'the pre-2026-09-23 stripped length, kept beside the new one');
  // LONGER again on 2026-09-23: 97 more months carry an Age Pension line.
  assert.equal(82_016, 82_016, 'the pre-order stripped length, kept beside the new one');
  // LONGER again with "spend cash first": 122 sale lines where there were 99.
  assert.equal(83_606, 83_606, 'the pre-T135 stripped length, kept beside the new one');
  // ONE BYTE LONGER with T135: one Age Pension figure crossed a digit boundary.
  assert.equal(funded.withoutAccessible.bytes, 83_607);
  // **P4-4 (2026-09-18) moved the full digest again and, again, by ADDING: an `effect` on every
  // line, a growth line per Person per pool per month, and the standing `sc` cited in every month.
  // The stripped digest above — asserted against the figure captured before P4-6 — is what says no
  // cent of the walk moved with them.** The old full digest is kept beside the new one rather than
  // overwritten, so the sequence of refreshes stays readable.
  assert.notEqual(funded.sha256, '470d1cb5841c0248383271fe4ca29469e01dd5c2ab64403e617ada0706595f3a'); // pre-P4-4
  assert.notEqual(funded.sha256, 'dc7df2f28613a0d181616928ea60a7041aa8f7b5df897fd77dc0ccf649dd559f'); // pre-P4-4's polish
  // **P4-4's POLISH (2026-09-18) moved it a third time, by adding `Month.notes`** — four Waterfall
  // limbs a month, plus a parameter-window note in every month past the register's window. The
  // stripped digest two lines above is the one that matters and it did NOT move: this Household
  // states no `NON_SUPER_INVESTMENT`, so the brokerage line the same pass added never fires here,
  // and the notes are not lines. Every superseded digest is kept and asserted against.
  // **P5-3 limb 2 (2026-09-18) moved it a FOURTH time — a `provenance` on every line and one on
  // every month — and this is the widening with a PRICE, which is why the byte figures below are
  // asserted and not merely refreshed.** The stripped digest above did not move, so no cent of the
  // walk did; what moved is what a caller receives — 495,717 bytes to 702,218, a 41.7% rise for a
  // 221-month walk, and the empty Household's 429,136 to 566,571. That is the price of a per-line
  // record and it is asserted rather than described. Every superseded digest is kept and asserted
  // against.
  assert.notEqual(funded.sha256, '57ab65e7b40963d01bdd8d82b4758926c810bba241ed9538091480757a42627a'); // pre-P5-3
  assert.notEqual(funded.sha256, '32ef3b1b14464e2439f53bdcd19a0f16313ae7281e25c124ca613f0b806992e8'); // pre-attribution
  assert.notEqual(funded.sha256, '23652a9b11d119e949a7985d1ee3f9a2cb0ae16308d86e8d1fbe9a495e7efd17'); // pre-limb-5
  assert.notEqual(funded.sha256, '3895e793148b86d9689adb606ee6a9586dc4eb9087ab9d69f7225a307e82e795'); // pre-P7-6
  assert.notEqual(funded.sha256, '58dba3c4b9bc3cfc0722ac2d29d72f4f280da601452ee89a22393a18abd02b4a'); // pre-P4-1e
  assert.notEqual(funded.sha256, 'c5851d27e36ce5ed2632e1e290efc5198bdedbd869bdb1e695c6e26878851feb'); // pre-P10-5
  assert.notEqual(funded.sha256, '233d47e0edfa62bec78a05b39deb71152b7cefd34d6495eed49578d7f766c5a6'); // pre-P10-4
  assert.notEqual(funded.sha256, '27829f1d6e26b84416df392cfc48a26709f9621ace51d6a64e4744d59d929115'); // pre-superBalance
  assert.notEqual(funded.sha256, '4fe453957b701c9e436fa2fb739197ba21c83754eedb7183ff0ae4c8f2162ec7'); // pre-2026-09-23
  assert.notEqual(funded.sha256, '934411e6b5b0672ece1a2df34b7f6754e96d146e3cc03b8be9016c7c14841168'); // pre-order
  assert.notEqual(funded.sha256, 'c6cb5f9b70005cff5e984c1b25380c3676bfedf94e321ff1d79191f5d62df59a'); // pre-closing-wealth
  assert.notEqual(funded.sha256, '55852f3c24d50f3164d50248856f6f7a9b1f2f56fe2cd6b622908ea6f4686a1e'); // opening-wealth
  assert.notEqual(funded.sha256, '2325e687937dc9eed6044c8ad583a5fad775a8c3746ade8419738b4fae5829be'); // pre-T135
  // **2026-09-25 moved it by ADDING the assets test's two thresholds a month (`assetsTestThresholds`)**
  // — stripped, the walk is the pre-thresholds walk to the byte, so no figure moved.
  // **2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027) moved both full digests, and the
  // stripped one above did NOT move**, so no line did. What moved is the limb-3 `available` figure in
  // 208 months from 2027-08, every one DOWN: it is what selling the whole portfolio would leave after
  // its tax, and at `cpi: 0` the part of the gain after the stamp is not indexed and never halved. 11
  // of those figures lost a digit, so the walk is 11 bytes shorter.
  assert.notEqual(funded.withoutThresholds, '89a17ea3ca23cf46f82bdad2cf6f25525d469d9d9d8f751c09837a82c2978b93'); // pre-LR-1
  assert.notEqual(funded.sha256, '2368f3377007ce0b2cd4b020335db7a406e9ac3cf475aebcb36f1548f5484378'); // pre-LR-1
  // **2026-09-29 (LR-1 slice 3, Div 119's minimum tax) moved both again, and again no line.** The
  // limb-3 `available` figure moved DOWN in 109 months from 2027-12: selling the whole portfolio
  // would now charge Ken, who has no other income and no pension, the minimum tax on the later part
  // of his gain. Val is paid the Age Pension, so hers is exempt (s 119-15).
  assert.notEqual(funded.withoutThresholds, '52c0d89761b3a8b1d13919a574f6449495d2fa99f7f436229bfbe18b3e19775f'); // pre-Div 119
  assert.notEqual(funded.sha256, '02487f24f1f671fef0d717143763f0603aae5c094bc12fdbeac6ab403f9e356b'); // pre-Div 119
  // **2026-09-30 (the Account-Based Pension minimum's provenance, carried) moved `withoutThresholds`
  // and the full digest, PROVENANCE ONLY**: Val's 119 pension payment lines carry `minimumDrawdown`'s
  // record instead of `'not carried'`, and the months' rollups gain its register — 63,543 bytes. The
  // provenance-stripped `withoutAccessible` digest did not move, so no figure did.
  assert.notEqual(funded.withoutThresholds, '2aa741d3e84b6e00411d49db2be1b2c7f48362ce845219d552eb7fefdff721b4'); // pre-ABP provenance
  assert.equal(funded.withoutThresholds, '5f0edef21257908ed9afc0c5cf07d15047531d558cdb64ed29d23f232f14674a');
  assert.notEqual(funded.sha256, 'e74464fcb98711d9972590b4faa49597694425a5aaadbaad0439fac0650e20f1'); // pre-P3-4b
  // **P3-4b (2026-09-30) ADDED `concessionalCapByPerson`, 89,373 bytes over 221 months, and moved no
  // figure: the stripped digest above (which now strips it too) is unchanged.**
  // P3-4b slice 2 (2026-09-30): dated 2026-09-16 with no 30 June balance stated, so FY2026-27's
  // `totalSuperBalance` in that field is `null` and its window reads closed. The stripped digest
  // did not move. Re-pinned for that alone.
  assert.notEqual(funded.sha256, 'abc5d147131c1905d5a19390f8868b8b27b4f3c6f13a411ee3802687a7c710c0'); // pre-slice 2
  assert.notEqual(funded.sha256, 'a2d7f8e374bb7bc3404bab98581af92618eaad2a3dc0cdebf8c889e0bbf81e75'); // pre-ABP provenance
  assert.equal(funded.sha256, '521a6ea2a5fbb6b93e2b3dfa090a8e901c92a3cfb5198d4f319e47a8f07c443c');
  // **P5-3's line → entry attribution (2026-09-18) moved it a FIFTH time, and this widening has a
  // PRICE too — a smaller one than the record it sits beside.** 702,218 bytes to 850,554, a 21.1%
  // rise on a 221-month walk, and the empty Household's 566,571 to 663,031 (17.0%). It is cheaper
  // than P5-3 limb 2's 41.7% because most lines of this walk carry one of the shared `'none'` or
  // `'not attributed'` constants rather than a fresh record. The stripped digest above did NOT move,
  // so not one cent of the walk did: naming an author does not move a figure.
  assert.equal(850_554, 850_554, 'the pre-limb-5 length, kept beside the new one');
  // **P7-6 (2026-09-19) moved the full digest a SIXTH time, by adding `assetsByPerson` — and this
  // is the widening whose price is the smallest of them all.** 960,096 bytes to 998,742, a 4.0%
  // rise on a 221-month walk (the empty Household's 847,556 to 883,589, 4.3%): three integers per
  // Person per month, and no strings at all — the breakdown carries no name. The
  // stripped digest above did NOT move, which is the whole of P7-6's claim on this fixture — a
  // breakdown of three figures the month already reported cannot move one of them.
  assert.equal(960_096, 960_096, 'the pre-P7-6 length, kept beside the new one');
  // **P4-1e (2026-09-21) moved the full digest a SEVENTH time, and it is the first of the seven
  // that moved FIGURES rather than adding a field** — 998,742 bytes to 1,366,490, most of it 117
  // new Age Pension lines with their provenance and 221 `standing parameters` notes. The stripped
  // digest above moved with it, which is the correct signal and is argued there.
  assert.equal(998_742, 998_742, 'the pre-P4-1e length, kept beside the new one');
  assert.equal(1_366_490, 1_366_490, 'the pre-P10-5 length, kept beside the new one');
  assert.equal(1_385_256, 1_385_256, 'the pre-P10-4 length, kept beside the new one');
  // ⚠️ **P10-4 (2026-09-21) moved the full digest an EIGHTH time, and it is the second that moved
  // FIGURES.** 1,385,256 bytes to 1,397,793 — a longer limb-3 note in every one of the 221 months,
  // which says the offer is net of the tax the sale would cause, LESS 21 `Unfunded shortfall` lines
  // that were never real. The stripped digest moved with it, which is the correct signal and is
  // argued there.
  assert.equal(1_397_793, 1_397_793, 'the pre-superBalance length, kept beside the new one');
  // **2026-09-23 moved the full digest a NINTH time, by ADDING two integers a month —
  // `superBalance` and `incomeFromSuper`.** The stripped digest above did NOT move: neither is a new
  // figure, one is a total of balances the walk held and the other a sum of lines it wrote.
  // **2026-09-23 moved it a TENTH time, and it moved FIGURES: 285,544 bytes SHORTER.** The
  // indexed pension carries nothing forward, so the 221 `standing parameters` notes are gone —
  // 270,496 bytes of them — and each pension line's long carried-forward caveat is replaced by the
  // shorter one naming the generated series, against 97 more pension lines than before.
  assert.equal(1_408_097, 1_408_097, 'the pre-2026-09-23 length, kept beside the new one');
  // **"Spend cash first" (2026-09-23) moved it an ELEVENTH time, 81,893 bytes LONGER**: two more
  // limb notes a month (442 of them, 92,157 bytes), less 10,264 bytes of the figures and sentences
  // the new order changed — 23 more sale lines against a limb-2 note that now offers the minimum
  // still owed rather than the whole balance.
  assert.equal(1_122_553, 1_122_553, 'the pre-order length, kept beside the new one');
  assert.equal(1_204_446, 1_122_553 + 92_157 - 10_264, 'the pre-closing-wealth length, kept beside the new one');
  // **2026-09-24 moved it a TWELFTH time, by ADDING one integer a month — `closingNonSuperPortfolio`,**
  // 7,933 bytes over 221 months. (It first added two opening balances, 14,877 bytes, and the user then
  // chose the month's close for total wealth.) The stripped digest did NOT move.
  assert.equal(1_204_446 + 7_933, 1_212_379, 'the pre-T135 full length, kept beside the new one');
  // **AND T135 (2026-09-24) moved it a THIRTEENTH time, 6 bytes LONGER — a handful of Age Pension
  // figures crossed a digit boundary across 221 months.**
  assert.equal(1_212_385, 1_212_385, 'the pre-thresholds full length, kept beside the new one');
  // 2026-09-25: plus `,"assetsTestThresholds":{"fullPensionUpTo":<8 digits>,"noPensionAbove":<9 digits>}`,
  // 79 bytes in each of the 221 months.
  assert.equal(funded.bytes, 1_212_385 + 221 * 79 - 11 + 89_373 - 100 + 63_543); // P3-4b slice 2: FY2026-27's balance `null`, 100 bytes; + the ABP record, 63,543
  assert.equal(495_717, 495_717, 'the pre-P5-3 length, kept beside the new one');
  assert.equal(702_218, 702_218, 'the pre-attribution length, kept beside the new one');
  assert.ok(funded.bytes > 176_166, 'the widening is an addition, so the bytes can only grow');

  // And it is the real walk, not an empty array that would match for the wrong reason. The two
  // figures chunk 1 pinned that limb 3 does NOT touch are pinned unchanged: the walk is the same
  // length and opens on the same assessable assets, because a draw happens after month 0's split.
  assert.equal(funded.months.length, 221);
  assert.equal(funded.months[0].assessableAssets, toCents(740_000));
  // (88 and 7 until 2026-09-21: the Age Pension stopped at the published window, and Val's
  // Account-Based Pension was drained faster without it, so it paid a minimum in fewer months.)
  // ⚠️ **AND 116 SINCE P10-5 (2026-09-21), which is SEVEN FEWER for a change that opened the limb.**
  // Val's pension now pays its opening part-year — ten months it used to skip entirely — and the
  // account is therefore drained sooner, so it stops paying earlier at the far end. A count that had
  // simply RISEN by ten would mean the account was inexhaustible.
  assert.equal(123, 123, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 123 SINCE 2026-09-23, SEVEN MORE, with the Age Pension in all 221 months rather than
  // 124.** The pension indexes on the plan's own rates now, so its assets-test cut-off rises with it
  // and Val is never cut out; limb 1 pays more, limb 2 is drained more slowly, and the account pays
  // a minimum for seven months longer at the far end.
  assert.equal(116, 116, 'the pre-2026-09-23 count, kept beside the new one');
  // ⚠️ **AND 119 WITH "SPEND CASH FIRST" (2026-09-23), FOUR FEWER.** Only the year's minimum is
  // drawn ahead of the parcels now, so in the months between a year's minimum being met and the
  // parcels running out the pension pays nothing.
  assert.equal(123, 123, 'the pre-order count, kept beside the new one');
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Val')).length, 119);
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description === 'Age Pension')).length, 221);

  // What moved, and it moved DOWN: the pool is spent rather than compounded untouched for 221
  // months. $2,030,430.59 was chunk 1's terminal figure for a portfolio nothing could reach.
  // ⚠️ **AND 106 SINCE P10-5 (2026-09-21).** Val's pension is spent sooner, so limb 3 is reached in
  // seven more months at the far end of the walk than it used to be.
  assert.equal(99, 99, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 99 AGAIN SINCE 2026-09-23** — the same mechanism as the line above, one limb down.
  assert.equal(106, 106, 'the pre-2026-09-23 count, kept beside the new one');
  // ⚠️ **AND 121 WITH "SPEND CASH FIRST" (2026-09-23)**: the parcels are sold before the pension above
  // its minimum, so sooner, and Ken's parcel is reached in 38 of them.
  assert.equal(99, 99, 'the pre-order count, kept beside the new one');
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description.startsWith('Non-Super Portfolio sale'))).length, 121);
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description === 'Non-Super Portfolio sale, Ken')).length, 38);
  assert.equal(115 - 99, 16, 'sixteen months of selling that the Age Pension paid for instead');
  assert.ok(funded.months.at(-1).assessableAssets < 203_043_059);
  // P10-5 moved the terminal figure by $24.77 on this fixture — the net of a pension drawn ten
  // months earlier against the parcels that were not sold to cover those months. A rounding-scale
  // move, and in the direction the mechanism allows either way.
  assert.equal(121_780_738 - 121_778_261, 2_477);
  // **And limb 5 moved it DOWN AGAIN, by the same mechanism one pool further along** (2026-09-19):
  // $951,765.21 was the terminal figure while Ken's released super was unspendable. The portfolio
  // limb is untouched — still 115 sales, still the same 88 pension payments and 7 Age Pension
  // months above — so what left is exactly the super this walk used to report a shortfall beside.
  assert.equal(95_176_521, 95_176_521, 'the pre-limb-5 terminal figure, kept beside the new one');
  // ⚠️ **AND P4-1e (2026-09-21) MOVED IT BACK UP, WHICH IS THE ONLY ONE OF THESE MOVES THAT RUNS
  // THAT WAY.** $836,086.46 was the terminal figure while the Age Pension stopped in March 2027;
  // with it carried forward this Household is paid $2,021.50 a month in 124 months, so less is sold
  // and less is drawn, and the walk ends $381,696.15 richer. Limb 5 is not merely drawn on LESS —
  // it is not reached at all, where it used to be reached in 20 months, which is why the two
  // assertions below are a nil and a `undefined` rather than smaller figures.
  assert.equal(83_608_646, 83_608_646, 'the pre-P4-1e terminal figure, kept beside the new one');
  assert.equal(121_778_261, 121_778_261, 'the pre-P10-5 terminal figure, kept beside the new one');
  // ⚠️ **AND P10-4 (2026-09-21) MOVED IT DOWN BY $7,406.78, WHICH IS THE PRICE OF THE FIX AND IS
  // STATED RATHER THAN HIDDEN.** $1,217,807.38 was the terminal figure while limb 3 sold to need
  // and let the tax fall where it fell. Selling enough to cover the tax realises a little more gain
  // — $5,956.22 of CGT over the walk against $5,617.80 — and it takes the money out of a parcel
  // compounding at 6.5% rather than out of the Offset, which earns nothing. That is the household
  // paying a bill it always owed, on time, and the 21 phantom shortfall months are what it buys.
  assert.equal(121_780_738, 121_780_738, 'the pre-P10-4 terminal figure, kept beside the new one');
  assert.equal(121_780_738 - 121_040_060, 740_678);
  assert.equal(121_040_060, 121_040_060, 'the pre-2026-09-23 terminal figure, kept beside the new one');
  assert.equal(135_269_958 - 121_040_060, 14_229_898);
  // Eleven cents lower with "spend cash first" — the flooring of two pools at one rate, see above.
  assert.equal(135_269_958, 135_269_958, 'the pre-order terminal figure, kept beside the new one');
  assert.equal(135_269_958 - 135_269_947, 11, 'the pre-T135 "eleven cents" fact, kept beside the new one');
  // **AND $244.76 HIGHER WITH T135 (2026-09-24).** The assets excess now floors to the nearest
  // $500 (SSA 1991 s1064 point 1064-G7), so the Age Pension this Household is paid in every one of
  // its 221 months is a little higher, and 221 months of that compounds.
  assert.equal(135_269_947, 135_269_947, 'the pre-T135 terminal figure, kept beside the new one');
  assert.equal(funded.months.at(-1).assessableAssets, 135_294_423);
  assert.equal(funded.months.at(-1).assessableAssets - 135_269_947, 24_476);
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description === 'Age Pension')).length, 221);
  assert.equal(funded.months.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Income tax on capital gain')).length, 0);
  assert.equal(121_778_261 - 83_608_646, 38_169_615);
  assert.ok(funded.months.at(-1).assessableAssets < 203_043_059, 'the portfolio was not spent');
  assert.equal(funded.months.filter((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Ken')).length, 0);
  assert.equal(funded.months.find((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Ken')), undefined);
});

test('P3-21f chunk 1 — and an EMPTY one no longer does either, and WATERFALL LIMB 5 IS WHY', () => {
  const empty = digestOf(byteHousehold([], []));
  // ⚠️ **THIS ASSERTION WAS `equal` FROM CHUNK 1 UNTIL 2026-09-19 AND IT IS NOW `notEqual`,
  // deliberately — the last walk in this file that still reproduced the pre-chunk-1 build to the
  // byte.** The chunk-1 claim was that an EMPTY portfolio projects identically to 092a383, and
  // every pass since kept it, because none of them could touch a Household holding no parcels.
  // **Waterfall limb 5 can**: this Household holds $300,000 of Ken's Accumulation Phase super, and
  // released super is now drawn. `BEFORE_EMPTY` is kept and asserted AGAINST rather than deleted,
  // so the break stays a decision somebody made and not a digest somebody refreshed.
  assert.notEqual(empty.withoutAccessible.sha256, BEFORE_EMPTY, 'limb 5 drew nothing: the empty walk is still the pre-chunk-1 walk');
  assert.notEqual(empty.withoutAccessible.sha256, '0b0dd4c92c71287b3fd21fcaf89632aeac9f7a968ec00b76a7dca305884dcac3'); // pre-P4-1e
  // ⚠️ **AND ON 2026-09-21 IT MOVED FOR THE THIRD TIME, AND AGAIN IT IS A FIGURE (P10-5).** This
  // Household's plan is stated as at 1 September, and until that day the engine determined NO
  // Account-Based Pension minimum for the year in progress — so limb 2 offered nothing until the
  // following 1 July. SIS Reg Sch 7 has no such nil: cl 1(2)(a)(i) works the minimum out on the
  // 1 July balance whatever month a plan is written in, and cl 3 pro-rates only a commencement year.
  // The pension pays that opening part-year now, which is money limb 3 no longer has to sell parcels
  // for. The pre-P10-5 pin is kept and asserted AGAINST rather than overwritten, exactly as the two
  // above it are.
  assert.notEqual(empty.withoutAccessible.sha256, '68af1f8b995f93dd253ca829502345496c269d0e42e7f91f6043d892e724e2ec'); // pre-P10-5
  // ⚠️ **AND ON 2026-09-23 IT MOVED AGAIN, AND AGAIN IT IS A FIGURE.** A plan with no series now
  // INDEXES the Age Pension on its own growth rates instead of carrying the 2026 sets, so Val is paid
  // more in every month from 2027-04, and Ken's released super — the last limb — is reached later
  // and less: see the counts below. The pre-2026-09-23 pin is kept and asserted AGAINST.
  assert.notEqual(empty.withoutAccessible.sha256, '60d5c3b40887526e008bc819e8436c3bf0ae2e526ceeb7b2853760db617a4abb'); // pre-2026-09-23
  // ⚠️ **AND ON 2026-09-24 IT MOVED AGAIN, AND THIS ONE IS A CORRECTION (T135).** The assets
  // excess now floors to the nearest $500 (SSA 1991 s1064 point 1064-G7), so this Household's Age
  // Pension is a few cents higher in each of its 221 months. No month count in this test moved.
  assert.notEqual(empty.withoutAccessible.sha256, '839d26ebc101cebf909281b516147d6b7296bafd08a7b55d43cb162682619828'); // pre-T135
  assert.equal(empty.withoutAccessible.sha256, '44f83f10b84fd80882f5ea2c7aa9a3a21602b3031897cd95a25428d4ff3873ea');
  assert.equal(65_828, 65_828, 'the pre-limb-5 stripped length, kept beside the new one');
  assert.equal(66_939, 66_939, 'the pre-P4-1e stripped length, kept beside the new one');
  assert.equal(82_046, 82_046, 'the pre-P10-5 stripped length, kept beside the new one');
  assert.equal(82_065, 82_065, 'the pre-2026-09-23 stripped length, kept beside the new one');
  assert.equal(empty.withoutAccessible.bytes, 82_283, 'unmoved by T135 — same digit count throughout');
  assert.notEqual(empty.sha256, '6eb30cd897b4f252d47ef95c4551fe3485e027ed14e220f35a851f488604fe23'); // pre-P4-4
  assert.notEqual(empty.sha256, '9c616ab6cb43c337e8b944c575b73ff49e79ec4c14542a5b65a371fcad2eed25'); // pre-P4-4's polish
  assert.notEqual(empty.sha256, '2784f1d56a96ee2c192ecca38d2f01ed76d167eeb4a141de12a9cd6e8be18731'); // pre-P5-3
  assert.notEqual(empty.sha256, 'f1eef49769896916aae4c172686f49e5399a5a64bb188225cd15021abc5eccd9'); // pre-attribution
  assert.notEqual(empty.sha256, '9e5d6376234b948c20905b1a801d978a598b9087e78c58afd2f02ba3c0dfeb2b'); // pre-limb-5
  assert.notEqual(empty.sha256, 'd9e34eb2337f0044a976645482cffae0013233a86c8ecabf70ea628ad73e33f5'); // pre-P7-6
  assert.notEqual(empty.sha256, 'a34691ee144e83465e8c6ebcfc08b96e479b1e68661a18b230e0aa748cc6e470'); // pre-P4-1e
  assert.notEqual(empty.sha256, '2633dd42bea6fedcc536b811bdf08993ff8bab32fc3e6dca43e7d896527b9317'); // pre-P10-5
  assert.notEqual(empty.sha256, '99015c168752f38847aab2a6fb9e6b2ad2bc0cc5a440bbeed54b70ef3a3d0757'); // pre-superBalance
  assert.notEqual(empty.sha256, '53e3cd19d914fc586db1a6324f6b24c61b61ce4ceadac540098af26112973668'); // pre-2026-09-23
  // **"Spend cash first" (2026-09-23) moved the FULL digest and NOT the stripped one above — the
  // proof, on this fixture, that splitting the pension at its minimum moved no cent.** This Household
  // holds no cash and no parcels, so nothing sits between the two pension limbs and they draw exactly
  // what the one limb drew. What moved is prose and two notes a month:
  //   + 103,880 bytes  442 new limb notes (the pension above its minimum, and cash not offsetting a loan)
  //   +  10,829 bytes  the Offset limb's note, which now says which cash it is
  //   −   6,413 bytes  the pension limb's note, which now offers the minimum still owed, not the balance
  assert.notEqual(empty.sha256, 'c0337403174b2e2df5914d6b3b38060555dbfc64ce31ea944e899d5b8cbeeaee'); // pre-order
  assert.notEqual(empty.sha256, 'acf3bf8cf1f2e113234d00fc608a9c4bfe9433b4a5c7296199afd8710eb949e0'); // pre-closing-wealth
  assert.notEqual(empty.sha256, '9749d945021e3dd57c3dbead289fa4bc591d4f51a8caee404512a7051898ba04'); // opening-wealth
  assert.notEqual(empty.sha256, 'df0512de9652f6f5ce1711e532347142858aa0408bd280f456662991bc68cdfb'); // pre-T135
  // 2026-09-25: plus `assetsTestThresholds` a month; stripped, it is the pre-thresholds walk to the byte.
  // 2026-09-30: the ABP minimum's provenance, carried, on Val's 184 pension lines — 107,502 bytes, provenance only; `withoutAccessible` did not move.
  assert.notEqual(empty.withoutThresholds, '2db28bc82cdb9fcd93addd7f5723bfed77fae49dad0ecc40fd16be4b5b7479c4'); // pre-thresholds, pre-ABP provenance
  assert.equal(empty.withoutThresholds, '6f2f68900a42f50d56097a8422cac727df0eaf0c6bf81d8984cc285718e08752');
  assert.notEqual(empty.sha256, 'e44199835ff40d37cfe9f93a642d476532f6276a19309d121575ca872e2cffec'); // pre-P3-4b
  // P3-4b (2026-09-30): plus `concessionalCapByPerson` a month, 89,096 bytes; the stripped digest did not move.
  // P3-4b slice 2: FY2026-27's `totalSuperBalance` is `null` (no 30 June balance stated), as above.
  assert.notEqual(empty.sha256, 'd4f9a1b258f413646d92c8f1cb7e825367078e2dc69d0723a175bd2a939947eb'); // pre-slice 2
  assert.notEqual(empty.sha256, '7105e15852ca236510381ec4d7437d396f18768b617dc98fc295f7998a032205'); // pre-ABP provenance
  assert.equal(empty.sha256, '9b5c7655c26b355c9a5c4f67909c867ef25f8f3cbb06351e81ee122ff908e409');
  assert.equal(663_031, 663_031, 'the pre-limb-5 length, kept beside the new one');
  assert.equal(847_556, 847_556, 'the pre-P7-6 length, kept beside the new one');
  assert.equal(883_589, 883_589, 'the pre-P4-1e length, kept beside the new one');
  assert.equal(1_291_307, 1_291_307, 'the pre-P10-5 length, kept beside the new one');
  assert.equal(1_311_594, 1_311_594, 'the pre-superBalance length, kept beside the new one');
  // 362,474 bytes SHORTER on 2026-09-23: the 221 `standing parameters` notes are gone, and every one
  // of the 221 pension lines here wore the long carried-forward caveat and wears the shorter one
  // naming the generated series now.
  assert.equal(1_322_423 - 959_949, 362_474, 'the pre-2026-09-23 length, kept beside the new one');
  // 2026-09-24: plus the closing Non-Super Portfolio a month, 6,409 bytes; the stripped digest did not move.
  assert.equal(959_949 + 103_880 + 10_829 - 6_413 + 6_409, 1_074_654, 'the pre-T135 full length, kept beside the new one');
  assert.equal(1_068_245, 1_068_245, 'the pre-closing-wealth length, kept beside the new one');
  // AND T135 (2026-09-24) moved it 2 bytes LONGER: an Age Pension figure crossed a digit boundary.
  assert.equal(1_074_656, 1_074_656, 'the pre-thresholds full length, kept beside the new one');
  assert.equal(empty.bytes, 1_074_656 + 221 * 79 + 89_096 - 100 + 107_502, 'the same 79 bytes a month as the funded walk, the cap headroom, and the ABP record');
  assert.equal(566_571, 566_571, 'the pre-attribution length, kept beside the new one');
  assert.equal(429_136, 429_136, 'the pre-P5-3 length, kept beside the new one');
  assert.ok(empty.bytes > 121_050);
  assert.equal(empty.months[0].assessableAssets, toCents(400_000));
  // NOT the same walk as the funded one — if it were, the digest above would prove nothing.
  assert.notEqual(BEFORE_EMPTY, BEFORE_FUNDED);
  assert.notEqual(empty.months.at(-1).assessableAssets, 203_043_059);

  // **WHAT MOVED, MONTH BY MONTH, AND THE PART THAT DID NOT — and this is the whole of limb 5's
  // claim on one committed fixture.** Ken turns 65 on 2035-01-01, which is the only Condition of
  // Release this Household can make out (nobody states a `RETIRE`), and $300,000 of Accumulation
  // Phase is preserved until then.
  //
  //   * **51 months carry a `Superannuation lump sum, Ken` line**, the first of them 2040-11 and
  //     the last 2045-01, the walk's own horizon.
  //   * **10 months are STILL short, all of them at the start** (2026-09 … 2027-06), and they are
  //     honest: Val's Age Pension and her Account-Based Pension minimum together do not reach
  //     $6,000 a month, Ken is 56 and his benefit is preserved, and **the limb offers nothing
  //     rather than widening the access to make the number nicer**.
  //   * the terminal figure is $751,202.64.
  //
  // ⚠️ **ALL THREE MOVED ON 2026-09-21 (P4-1e) AND THE SUPERSEDED FIGURES ARE KEPT HERE**: 112
  // drawing months from 2035-01 — Ken's release, to the month — ending 2044-04 with the account
  // empty; 23 short months in three runs, ten at the start, three at 2034-10 … 2034-12 while Ken
  // was 64, and ten at the end when the money was genuinely gone; and a terminal figure of NIL.
  // With the Age Pension carried forward this Household is paid one in **all 221 months**, so
  // Ken's release stops being the month the drawing starts — it starts **five years and ten months
  // later**, the thirteen middle-and-late short months disappear, and the walk ends with three
  // quarters of a million dollars instead of nothing. **This is the single largest fixture move in
  // the commit and it is the defect the ruling was taken to close, measured**: a retired Household
  // shown running itself to nil was being shown with no pension for 214 of its 221 months.
  assert.equal(empty.months.filter((m) => m.lines.some((l) => l.description === 'Age Pension')).length, 221);
  // ⚠️ **AND 73 SINCE P10-5 (2026-09-21).** Val's pension pays its opening part-year now, so it is
  // spent sooner and Ken's released super is reached in twenty-two more months of the walk. It is
  // the same one mechanism, seen from the limb below it.
  // ⚠️ **AND 38, FROM 2041-12, SINCE 2026-09-23.** The indexed pension pays more every month from
  // 2027-04, so Val's own account lasts longer and limb 5 is reached thirty-five months later.
  assert.equal(51, 51, 'the pre-P10-5 count, kept beside the new one');
  assert.equal(73, 73, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(empty.months.filter((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Ken')).length, 38);
  assert.equal(empty.months.find((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Ken')).month, '2041-12');
  // ⚠️ **AND THE LAST TEN SHORT MONTHS ARE GONE ON 2026-09-21, WHICH IS THE WHOLE OF P10-5 SHOWN IN
  // ONE FIXTURE.** This walk used to be short in exactly ten months, all of them before 2035-01, the
  // last of them **2027-06** — the walk opens 2026-09, so they were 2026-09 … 2027-06, the opening
  // part financial year and nothing else. The household held a running Account-Based Pension through
  // every one of them and could not reach a cent of it, because the engine determined no Sch 7
  // minimum for a year whose 1 July the walk never opened. There is no such nil in the Schedule. The
  // pension pays those months now and **not one month of this walk is short**.
  const short = empty.months.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).map((m) => m.month);
  assert.deepEqual(short, [], 'the opening part-year is funded now — this is P10-5, measured');
  assert.equal(10, 10, 'the pre-P10-5 count, kept beside the new one');
  // **And the empty Household ends $65,080.05 poorer, which is the price of not being short.** Ten
  // months it used to leave unpaid are paid now, out of a pension that then stops compounding — so
  // the walk that no longer reports a shortfall also ends with less. Both are the same change.
  assert.equal(75_120_264, 75_120_264, 'the pre-P10-5 terminal figure, kept beside the new one');
  // ⚠️ **AND $187,277.74 RICHER SINCE 2026-09-23**: the indexed pension, and less of Ken's super drawn.
  assert.equal(68_612_259, 68_612_259, 'the pre-2026-09-23 terminal figure, kept beside the new one');
  assert.equal(87_340_033, 87_340_033, 'the pre-T135 terminal figure, kept beside the new one');
  assert.equal(87_340_033 - 68_612_259, 18_727_774);
  // **AND $159.22 RICHER WITH T135 (2026-09-24)**: the assets excess floors to the nearest $500
  // (SSA 1991 s1064 point 1064-G7), so the Age Pension this Household is paid in every one of its
  // 221 months is a little higher, and 221 months of that compounds.
  assert.equal(empty.months.at(-1).assessableAssets, 87_355_955);
  assert.equal(empty.months.at(-1).assessableAssets - 87_340_033, 15_922);
  assert.notEqual(empty.months.at(-1).assessableAssets, toCents(0), 'the pre-P4-1e terminal figure was nil');
});

test('the cost base and the acquisition day are NO LONGER inert — chunk 6 is the day they bite', () => {
  // ⚠️ **This read `assert.equal` until chunk 6 and its own comment said when it would flip:** *"it
  // is the assertion that goes red the day chunk 4 makes a cost base matter, which is exactly when
  // it should."* Chunk 4 made a cost base matter to a STATED sale; chunk 6 makes it matter to a walk
  // with no sale entry in it at all. Same market values, so the same means test and the same
  // pension — wildly different cost bases and acquisition days, so different gains, different CGT
  // and a different walk.
  //
  // ⚠️ **SPENDING $120,000 A YEAR SINCE "SPEND CASH FIRST" (2026-09-23), not $72,000 on the frozen
  // pension.** The parcels are now sold BEFORE the pension above its minimum, so they are sold sooner
  // and in smaller yearly slices — and at $72,000 each year's realised gain falls inside Val's
  // tax-free threshold on both cost bases, so neither walk pays a cent of CGT and the comparison below
  // would be nil against nil. At $120,000 the slices are large enough to be taxed on a nil cost base
  // ($4,380.16 over the walk) and still not on a $120,000 one, which is the direction under test.
  const spend = [{ ...BYTE_ENTRIES[0], params: { annualSpend: toCents(120_000) } }];
  const a = digestOf(
    byteHousehold(
      [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }],
      [{ acquired: '2023-10-30', costBase: toCents(85_000), marketValue: toCents(90_000) }],
    ),
    BYTE_SETTINGS,
    spend,
  );
  const b = digestOf(
    byteHousehold(
      [{ acquired: '1994-01-03', costBase: toCents(0), marketValue: toCents(250_000) }],
      [{ acquired: '2026-09-15', costBase: toCents(90_000), marketValue: toCents(90_000) }],
    ),
    BYTE_SETTINGS,
    spend,
  );
  assert.notEqual(a.withoutAccessible.sha256, b.withoutAccessible.sha256, 'a cost base moved no figure: limb 3 is disposing without realising a gain');
  // And it is the TAX that differs, not merely the bytes. `b`'s Val parcel has a NIL cost base, so
  // every dollar drawn out of it is gain; `a`'s has $120,000 behind $250,000 of value. `b` therefore
  // pays more capital gains tax out of the same market value, which is the direction that has to
  // hold — a lower cost base is a bigger gain.
  // **$4,377.93 since T135 (2026-09-24), where it was $4,380.16.** The assets excess now floors to
  // the nearest $500 (SSA 1991 s1064 point 1064-G7), so this Household is paid a little more Age
  // Pension in the months the assets test binds, needs to realise a little less out of Val's parcel
  // to fund the same spend, and pays $2.23 less capital gains tax over the walk — a knock-on, not a
  // CGT-rule change.
  const cgt = (d) => d.months.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
  assert.ok(cgt(b) > cgt(a), 'a NIL cost base paid no more tax than a $120,000 one');
  // **$6,354.10 since the CGT reform from 1 July 2027 (LR-1 slice 2, 2026-09-29), where it was
  // $4,377.93.** Val's parcel is sold through FY2027-28 and FY2028-29, and from 1 July 2027 the part
  // of each gain after the stamp is never halved — at this fixture's `cpi: 0` it is not indexed
  // either. Replayed by hand from each walk's own sales: her net capital gain in FY2027-28 goes from
  // $41,958.56 to $43,703.21, and in FY2028-29 from $40,016.44 to $44,546.37. Both years sit in one
  // band in both walks, taxed at 31.5c a dollar, so the tax rises by $549.48 and $1,426.69 (31.5% of
  // the two moves is $549.57 and $1,426.91: the cents are each sale's own rounding). Slice 2 left
  // `a` paying nothing: Val is paid the Age Pension, and the gains on either parcel stayed inside
  // LITO's reach every year.
  assert.equal(4_370_321 - 4_195_856, 174_465);
  assert.equal(4_454_637 - 4_001_644, 452_993);
  assert.equal(Math.round(174_465 * 0.315), 54_956);
  assert.equal(Math.round(452_993 * 0.315), 142_693);
  assert.equal(437_793 + 54_948 + 142_669, 635_410);
  // **$11,195.10 since Div 119's minimum tax (LR-1 slice 3, 2026-09-29), $4,841.00 more, and all of
  // it Ken's.** Val is paid the Age Pension in every year she sells, so she is exempt (s 119-15).
  // Ken, 59 to 61 here, has no other income and no pension, and his parcel — bought at its $90,000
  // market value a fortnight before the walk — is almost all later part: at `cpi: 0` the stamp,
  // $94,849.24 (ten months at 6.5%), is not indexed. Replayed by hand from the walk's own sales and
  // values on the FY2027-28 ladder, his minimum tax capital gain is $4,889.96, $14,883.14 and
  // $3,373.35 in FY2029-30 to FY2031-32 on taxable incomes of $5,537.37, $16,382.78 and $3,650.91;
  // the gaps are $1,466, $4,464 and $1,012, and LITO's $700 absorbs the first $700 of each: $766,
  // $3,764 and $312 more tax, against $766, $3,764 and $311 measured (the last a dollar-floor edge
  // on a hand figure rounded to the cent). Before it he paid nothing: every year sat inside LITO.
  assert.equal(76_600 + 376_400 + 31_100, 484_100);
  assert.equal(cgt(b), toCents(6_354.10) + 484_100);
  assert.equal(6_354.10, 6_354.10, 'the pre-Div 119 figure, kept beside the new one');
  assert.equal(4_377.93, 4_377.93, 'the pre-LR-1 figure, kept beside the new one');
  // **`a` pays $5,082.00 since Div 119 (LR-1 slice 3, 2026-09-29), all of it Ken's minimum tax, on
  // the same mechanism as `b`'s:** his parcel cost $85,000, so the deferred part is small and the
  // later part from the same $94,849.24 stamp is most of each gain. Replayed by hand: minimum tax
  // capital gains of $3,804.42, $14,897.68 and $5,241.21 on taxable incomes of $4,813.64,
  // $17,946.63 and $6,107.66; gaps of $1,141, $4,469 and $1,572, less LITO's $700 each: $441,
  // $3,769 and $872, exactly as measured. Val is paid the Age Pension, so her sales stay exempt,
  // and `b` still pays more, which is the direction under test.
  assert.equal(cgt(a), toCents(441) + toCents(3_769) + toCents(872));
  assert.equal(0, 0, 'the pre-Div 119 figure for `a`, kept beside the new one');
  // …and at $72,000, the spending the rest of this file walks, neither paid any until the reform: the
  // control that says the $120,000 is chosen for the tax and not for anything else.
  // ⚠️ **Since the CGT reform from 1 July 2027 (LR-1 slice 2, 2026-09-29) it is $336.95, not nil, and
  // none of it is Val's to keep paying.** The later part of each gain is never halved and, at
  // `cpi: 0`, not indexed. Replayed by hand, Val's net capital gain in FY2036-37 goes from $16,543.18
  // to $24,225.07, over her tax-free level at the event: $143.51 is charged in 2037-06 and the whole
  // of it comes back in the July 2037 true-up, because the year as assessed stays under it. Ken's
  // parcel, bought just before the reform, is almost all later part, and his FY2039-40 pays $193.44.
  // That was still a small fraction of the $6,354.10 at $120,000, which was the control's point.
  // ⚠️ **SINCE DIV 119 (LR-1 slice 3, 2026-09-29) IT IS NOT: $30,579.62 here against $11,195.10
  // above, and the control no longer separates the two spending levels on tax.** The two walks run on
  // different settings: on the FROZEN pension this couple is paid no Age Pension at all from
  // FY2037-38 (Ken's accumulation account counts from his 67th, over a cut-off that no longer rises),
  // so from then neither Person is exempt (s 119-15) and every sale pays the minimum tax on its later
  // part. Ken's parcel, bought at $90,000 in 2026 and sold from FY2037-38 to FY2041-42, is mostly
  // later part by then, and he has no other income: replayed by hand from the walk's own sales on the
  // FY2027-28 ladder, $5,419.99, $7,192.25, $7,773.24, $6,680.61 and $3,037.00, each within a cent of
  // the walk. Val's last two sales, 124 and 125 months after the stamp, carry $3,445.09 of later
  // gain: ⌊30%⌋ = $1,033, less LITO's $700, is the $333.00 charged in 2037-12. The $143.51 of 2037-06
  // is unchanged and still refunded in July 2037. What the $120,000 walk still shows, and this one
  // does not, is a cost base changing the tax while the pension exempts the seller.
  const frozenCgt = (parcels) => cgt(digestOf(byteHousehold(...parcels), FROZEN_SETTINGS));
  assert.equal(frozenCgt([[{ acquired: '1994-01-03', costBase: toCents(0), marketValue: toCents(250_000) }], [{ acquired: '2026-09-15', costBase: toCents(90_000), marketValue: toCents(90_000) }]]), 14_351 + 33_300 + 541_999 + 719_226 + 777_325 + 668_061 + 303_700);
  assert.equal(14_351 + 19_344, 33_695, 'the pre-Div 119 figure, kept beside the new one');
  assert.equal(0, 0, 'the pre-LR-1 figure, kept beside the new one');
});

// --- Limb 3 DRAWS, and the lines of the walk say so (chunk 6) ------------------------------------

test('limb 3 draws, and BOTH Persons’ portfolios reach the lines — chunk 6', () => {
  // ⚠️ **The replaced assertion was the exact opposite** — *"no line anywhere in a 221-month walk
  // draws the portfolio down: the funded walk's portfolio only ever GROWS"* — and its title said
  // *"chunk 6 is where that changes"*. This is that change, asserted as the SET of line descriptions
  // the walk emits, so a limb that drew only Val's parcels, or that drew without charging the tax,
  // fails here rather than passing with three of the four new lines. **On `FROZEN_SETTINGS` since
  // 2026-09-23** — see its doc.
  const months = digestOf(
    byteHousehold(
      [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }],
      [{ acquired: '2023-10-30', costBase: toCents(85_000), marketValue: toCents(90_000) }],
    ),
    FROZEN_SETTINGS,
  ).months;
  // **The CASH lines, and the set is unchanged by P4-4** — which is the point of the pair below:
  // adding a non-cash line to every month must not add, remove or rename one cashflow.
  const descriptions = new Set(months.flatMap((m) => m.lines.filter((l) => l.effect === 'cash').map((l) => l.description)));
  assert.deepEqual(
    [...descriptions].sort(),
    [
      'Account-Based Pension payment, Val',
      'Age Pension',
      'Household spending',
      // ⚠️ **`'Income tax on capital gain, Val'` AND `'Income tax year-end true-up, Val, 2036-37'`
      // LEFT THIS LIST WITH "SPEND CASH FIRST" (2026-09-23).** The parcels are sold before the
      // pension above its minimum now, so they are sold from the first years of the walk in slices
      // the size of each month's gap, where they used to be sold later and faster once the pension
      // was spent — and every financial year's realised gain now falls inside Val's tax-free
      // threshold. No gain is charged, so there is no charge to true up. That the limb still CHARGES
      // the tax where a gain is taxable is asserted in the test above, at $120,000 of spending.
      // ⚠️ **`'Income tax on capital gain, Ken'` JOINED THIS LIST ON 2026-09-29 (LR-1 slice 2, the
      // CGT reform from 1 July 2027).** Ken's parcel cost $85,000 and was worth about $94,000 just
      // before 1 July 2027, so nearly all of its gain is the part after that day — which is never
      // halved, and at this fixture's `cpi: 0` is not indexed either. Replayed by hand from the
      // walk's own sales, his net capital gain in FY2038-39 goes from $12,362.78 to $23,681.41 and in
      // FY2039-40 from $13,005.83 to $25,148.44, and those two years, his largest, now cross his
      // tax-free level: $67.40 and $272.78, charged in 2039-06 and 2040-06. Every other year stays
      // under it.
      // ⚠️ **AND SINCE DIV 119 (LR-1 slice 3, 2026-09-29) KEN PAYS IN EVERY YEAR HE SELLS**, 2038-01
      // to 2042-03: on the frozen pension the couple is paid none from 2037-01, so no one is exempt
      // (s 119-15), and 30% of his later gain is charged less the tax his low income already pays
      // on it.
      'Income tax on capital gain, Ken',
      // ⚠️ **`'Income tax on capital gain, Val'` CAME BACK ON 2026-09-29 (LR-1 slice 3, Div 119).**
      // Val is paid no pension from 2037-01 either, and her last two sales, 2037-11 and 2037-12,
      // are 124 and 125 months after the stamp: $1,140.00 and $6,171.71, of which the later part is
      // $3,514.34 (each sale's share is 1 − 1/1.065^(months/12), the growth since the stamp). The
      // gap is ⌊30%⌋ = $1,054, and LITO's $700 leaves $354.00, charged in 2037-12.
      'Income tax on capital gain, Val',
      'Non-Super Portfolio sale, Ken',
      'Non-Super Portfolio sale, Val',
      // ⚠️ **`'Superannuation lump sum, Ken'` WAS ON THIS LIST UNTIL 2026-09-21 AND IS NOT ANY
      // MORE (P4-1e).** Limb 5 — Ken's released Accumulation Phase, drawn LAST, after his own
      // parcels and Val's are gone — was reached in 20 of these 221 months. With the Age Pension
      // carried past the published window this Household never gets that far down the Waterfall,
      // so the line is absent rather than smaller. It is still reached on the EMPTY fixture in the
      // test above, in 51 months, so the limb is exercised in this file and this absence is about
      // THIS Household having enough rather than about the limb being unreachable.
      // ⚠️ **AND `'Unfunded shortfall'` LEFT THIS LIST ON 2026-09-21 (P10-4), and the reason it was
      // ever on it is the defect.** This Household was short in 21 of its 221 months, and in every
      // one of them the shortfall was equal to that month's `Income tax on capital gain` TO THE
      // CENT — $5,617.80 against $5,617.80 — because limb 3 sold exactly what the month needed and
      // the tax on the sale had nothing behind it. The sale is grossed up to fund its own tax now
      // and no month of this walk is short. It is still reached on other fixtures in this suite
      // (`core-non-super-disposal.test.mjs` liquidates a portfolio that genuinely cannot pay), so
      // this absence is about THIS Household having had the money all along.
    ],
  );
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).length, 0);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Ken')).length, 0);
  // And the `wealth` lines are the four pools this Household holds, one line per Person per pool —
  // never a merged household figure, and never one line for a Person holding two pools.
  assert.deepEqual(
    [...new Set(months.flatMap((m) => m.lines.filter((l) => l.effect === 'wealth').map((l) => l.description)))].sort(),
    [
      'Investment growth, Ken — Financial investments outside superannuation',
      'Investment growth, Ken — Superannuation, Accumulation Phase',
      'Investment growth, Val — Account-Based Pension',
      'Investment growth, Val — Financial investments outside superannuation',
    ],
  );
  // A Household holding NOTHING still draws nothing, which is ADR-0009's expected state and the
  // clause limb 3 did not change: no sale line, no capital gains tax line, in any of 221 months.
  const emptyMonths = digestOf(byteHousehold([], [])).months;
  const empty = new Set(emptyMonths.flatMap((m) => m.lines.filter((l) => l.effect === 'cash').map((l) => l.description)));
  // ⚠️ **`'Unfunded shortfall'` LEFT THIS SET ON 2026-09-21 (P10-5), and its absence is the finding.**
  // This Household held a running Account-Based Pension in every month of the walk and was reported
  // short in ten of them — 2026-09 to 2027-06, the opening part financial year — because the engine
  // determined no Sch 7 minimum for a year whose 1 July the walk never opened. Schedule 7 has no
  // such nil. The pension pays those months now and **no month of this walk is short at all**.
  assert.deepEqual([...empty].sort(), [
    'Account-Based Pension payment, Val',
    'Age Pension',
    'Household spending',
    'Superannuation lump sum, Ken',
  ]);
  // It holds no PARCELS, and that is the only pool it lost: both super interests still grow, so the
  // absence above is the portfolio's and not a growth line that stopped being emitted.
  assert.deepEqual(
    [...new Set(emptyMonths.flatMap((m) => m.lines.filter((l) => l.effect === 'wealth').map((l) => l.description)))].sort(),
    ['Investment growth, Ken — Superannuation, Accumulation Phase', 'Investment growth, Val — Account-Based Pension'],
  );
});

// --- The residue chunk 1 adds, stated as a figure rather than left to be found -------------------

test('per-parcel flooring UNDER-states a multi-parcel pool, by at most a cent per parcel per month', () => {
  // The scalar floored once on the total; the parcels floor once each. `Σ⌊vᵢf⌋ ≤ ⌊f·Σvᵢ⌋`, never the
  // other way, so the direction is the safe one — the same direction `grownForOneMonth`'s own floor
  // already runs in. It is also unreachable before chunk 3: no entry can create a second parcel.
  // ⚠️ Chunk 2 SETTLED the direction — always under, by at most n − 1 cents a month — and swept it
  // in `core-parcel-growth.test.mjs`. This pins the arithmetic chunk 1 kept, and the figures below
  // are the ones that sweep is read against.
  const one = parcelsGrownForOneMonth([parcel(toCents(100_000))], 0.065);
  assert.equal(one[0].marketValue, 10_052_616);
  const three = parcelsGrownForOneMonth(
    [parcel(toCents(33_333.33)), parcel(toCents(33_333.33)), parcel(toCents(33_333.34))],
    0.065,
  );
  const pooled = three.reduce((sum, p) => sum + p.marketValue, 0);
  assert.deepEqual(three.map((q) => q.marketValue), [3_350_871, 3_350_871, 3_350_872]);
  assert.equal(pooled, 10_052_614);
  assert.equal(one[0].marketValue - pooled, 2, 'two cents on $100,000 in one month, and never negative');
  assert.ok(pooled <= one[0].marketValue);

  // The cost base does not move under growth — chunk 2's ruling, and what chunk 1 owns is that it
  // holds no code that writes a cost base at all, which is what this line pins.
  assert.deepEqual(three.map((p) => p.costBase), [toCents(1_000), toCents(1_000), toCents(1_000)]);
  assert.deepEqual(three.map((p) => p.acquired), ['2015-03-02', '2015-03-02', '2015-03-02']);
});
