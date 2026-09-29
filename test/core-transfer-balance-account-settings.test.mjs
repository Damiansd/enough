// P3-9 chunk 6-3 — the SHAPE of the per-Person Settings block, and the one fixture the whole chunk
// is for: **the O42 Person is COMPUTED and must not refuse.**
//
// Register ~2530 and the refusal's own message both say it in terms: a Person who has never been a
// retirement phase recipient before the forecast *"is fully computable and must be computed"*. The
// scoping mistake §3.10.8 names — *"Settings absent, therefore refuse"* — would refuse exactly that
// Person, so the first three tests below price what they would lose and what a wrong default would
// hand them.
//
// **Where the figures come from.** $2,000,000 is the FY2025-26 general transfer balance cap that
// s 294-35(1) seeds from, and $2,040,000 is register §3.10.9's own hand-worked answer for a
// $1,200,000 high-water mark against it (60% used, 40% of the $100,000 increase). Neither was read
// off an implementation; both are already pinned by `core-personal-transfer-balance-cap.test.mjs`.
//
// **What is NOT tested here, because it is not built:** §3.10.7's SECOND Settings block is per
// stream (TRIS conversion day, notification day, Schedule 1 item set, reversionary flag, withdrawal
// characterisation). That is chunk 5b, blocked on a pending ruling, and untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  priorRetirementPhaseAsStated,
  transferBalanceAccountOrRefuse,
  transferBalanceAccountSettingsAsStated,
  transferBalanceAccountShape,
  transferBalanceAccountShapes,
} from '../dist/core/transferBalanceAccountSettings.js';
import { forecastWindow } from '../dist/core/forecastWindow.js';
import {
  UnknownPersonalTransferBalanceCapError,
  closeDayFromLedger,
  closingBalanceOn,
  creditOnCommencement,
  indexPersonalTransferBalanceCap,
  openTransferBalanceAccountDays,
  openTransferBalanceLedger,
  seedPersonalTransferBalanceCap,
  transferBalanceAccountDaysAsStated,
} from '../dist/core/transferBalanceAccount.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const SETTINGS_SOURCE = readFileSync(join(SRC, 'core', 'transferBalanceAccountSettings.ts'), 'utf8');
const HOUSEHOLD_SOURCE = readFileSync(join(SRC, 'core', 'household.ts'), 'utf8');

/** Dollars to cents, so every expected figure reads as the register writes it. */
const $ = (dollars) => dollars * 100;

const person = (name, extra = {}) => ({
  name,
  dateOfBirth: '1958-04-11',
  superInterests: [{ phase: 'accountBasedPension', balance: $(1_200_000) }],
  parcels: [],
  employmentIncomePerFortnight: 0,
  workBonusBalance: 0,
  ...extra,
});

const NEVER = 'neverARetirementPhaseRecipientBeforeTheForecast';
const BEFORE = 'startedRetirementPhaseBeforeTheForecast';

// --- The forecast window this file's Persons are declaring about (P4-1b part (B)) ----------------
//
// It is BUILT, not written down: `forecastWindow` is the one producer, and a window typed out here
// as `{ firstDay: '2026-09-16', ... }` would be a second spelling of the boundary — the exact thing
// the classifier's old deferral note refused to create. The Settings and Household below are the
// smallest honest inputs to it, and both figures it yields are hand-checked underneath.
const WINDOW_SETTINGS = Object.freeze({
  asAtDate: '2026-09-16',
  planningHorizonAge: 100,
  economicSeries: Object.freeze({ cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 }),
  deemingRates: Object.freeze({ lower: 0.0175, upper: 0.0375 }),
  nominalReturn: 0.065,
});
const WINDOW = forecastWindow(WINDOW_SETTINGS, { persons: [person('Ada'), person('Bea')], homeStatus: 'occupied' });

// --- The fixture the brief is for: O42 -----------------------------------------------------------

test('the O42 Person — never a recipient before the forecast, no Settings — is COMPUTED, not refused', () => {
  // Ada starts her first pension on 1 September 2025, INSIDE the forecast. She supplies none of
  // §3.10.3's seven Settings, and she is right not to: she has no history to supply.
  const ada = person('Ada', { statedPriorRetirementPhase: NEVER });
  const shape = transferBalanceAccountShape(WINDOW, ada, new Map());
  assert.equal(shape.kind, 'computedInFull');
  // The wrong answer, named: 'notAnswerable' here — which is what "Settings absent, therefore
  // refuse" produces — is the regression §3.10.8 warns about, and since chunk 6-4 it is no longer
  // hypothetical: 'notAnswerable' IS the throw, for a Person whose every figure is the engine's own.
  assert.notEqual(shape.kind, 'notAnswerable');
  // So the refusal door is asserted on Ada by name, not only the classifier. This is the assertion
  // the brief's mutation (a) — "make the O42 Person refuse" — has to fail against.
  assert.doesNotThrow(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', ada, new Map()));
  assert.equal(transferBalanceAccountOrRefuse(WINDOW, '2026-27', ada, new Map()).kind, 'computedInFull');

  // And "computed in full" is not a label: every one of the seven is produced from her own events.
  const seeded = seedPersonalTransferBalanceCap('2025-09-01'); // fields 1 and 2
  assert.equal(seeded.fy, '2025-26');
  assert.equal(seeded.cap, $(2_000_000));
  let ledger = openTransferBalanceLedger('2025-09-01'); // field 3
  ledger = creditOnCommencement(ledger, {
    startingDay: '2025-09-01',
    valueOfSupportingInterestOnStartingDay: $(1_200_000),
  });
  assert.equal(ledger.transferBalance, $(1_200_000));
  let days = openTransferBalanceAccountDays('2025-09-01', seeded.cap, closingBalanceOn('2025-09-01', ledger));
  days = closeDayFromLedger({ ledger, state: days, day: '2026-06-30', personalCapOnDay: seeded.cap });
  assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000)); // fields 4-7
  assert.equal(days.highestBalanceDay, '2025-09-01');
  assert.equal(days.personalCapOnHighestBalanceDay, $(2_000_000));
  assert.equal(days.hasEverExceededCap, false);
  const nextYear = indexPersonalTransferBalanceCap('2026-27', {
    accountStartDay: '2025-09-01',
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
    highestEndOfDayTransferBalance: days.highestEndOfDayTransferBalance,
    personalCapOnHighestBalanceDay: days.personalCapOnHighestBalanceDay,
    hasEverExceededCap: days.hasEverExceededCap,
  });
  // §3.10.9's hand-worked answer: $2,040,000. Refusing Ada returns no figure at all — and the
  // difference between "computed" and "refused" for her is this $2,040,000 against nothing.
  assert.equal(nextYear.cap, $(2_040_000));
});

test('the refusal IS wired, at a separate door: the classifier stays total and the door throws', () => {
  // **This test was written by chunk 6-3 as `the refusal is NOT wired`, and chunk 6-4 is the event
  // it was waiting for (2026-09-16).** It is rewritten in place rather than deleted, because what
  // 6-3 was pinning — that asking for the CLASSIFICATION cannot refuse anybody — did not vanish
  // when the refusal landed; it narrowed to "the classifier is still total, and the throw is
  // somewhere else". Both halves are asserted below.
  //
  // Bea says her account was already running before the forecast and supplies nothing: the
  // conjunction, both limbs true.
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  let shape;
  assert.doesNotThrow(() => {
    shape = transferBalanceAccountShape(WINDOW, bea, new Map());
  });
  assert.equal(shape.kind, 'notAnswerable');
  assert.match(shape.because, /are not supplied/);

  // And the door refuses her, by name, for the year the caller asked about.
  assert.throws(
    () => transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, new Map()),
    (error) => {
      assert.ok(error instanceof UnknownPersonalTransferBalanceCapError);
      assert.equal(error.name, 'UnknownPersonalTransferBalanceCapError');
      assert.match(error.message, /FY2026-27/); // the year asked for, not a default
      assert.match(error.message, /Supply all seven per-Person Settings of register §3\.10\.3/);
      // The O42 promise travels WITH the refusal, so a reader of the failure cannot conclude that
      // every Person with a pension is refused.
      assert.match(error.message, /has NEVER[\s\S]*computed in full \(O42\)/);
      return true;
    },
  );
});

test('notStated reaches the refusal too — silence is refused, never read as either answer', () => {
  // Cec was never asked. Mutation (c) of the brief — let `notStated` fall through to computed —
  // has to fail here as well as at the classifier: a door that answered for her would hand her the
  // seeding-year computation and a FY2026-27 cap of $2,040,000 she may have no right to.
  const cec = person('Cec');
  assert.throws(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', cec, new Map()), UnknownPersonalTransferBalanceCapError);
  // ...and it is the same refusal on a different ground, which the classifier still carries even
  // though the error message does not distinguish them.
  assert.match(transferBalanceAccountShape(WINDOW, cec, new Map()).because, /has not stated/);
});

test('a Person with the seven Settings passes the door and keeps them', () => {
  // The third outcome, so the door is not "throws or returns computedInFull" — the vacuity control
  // for the two assertions above.
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  const settings = transferBalanceAccountSettingsAsStated({
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: '2018-03-01',
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  });
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  const answerable = transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, new Map([['Bea', settings]]));
  assert.equal(answerable.kind, 'statedHistory');
  assert.equal(answerable.settings.statedDays.highestEndOfDayTransferBalance, $(1_600_000));
});

test('notStated is a THIRD state and is neither answer — a boolean could not hold it', () => {
  // Cec was never asked. The field is absent, and absence is read in exactly one place.
  const cec = person('Cec');
  assert.equal(cec.statedPriorRetirementPhase, undefined);
  assert.equal(priorRetirementPhaseAsStated(cec), 'notStated');
  const shape = transferBalanceAccountShape(WINDOW, cec, new Map());
  // The wrong answer on each side, named and priced. Read as "no" (what a boolean defaulting to
  // false does) she is handed the seeding-year computation and a FY2026-27 cap of $2,040,000 she may
  // have no right to — if her account really started in 2018 and latched s 294-40(1)(b), her true
  // cap is $1,600,000 and stays there for ever, a $440,000 overstatement of her retirement-phase
  // headroom. Read as "yes" she is refused although she may be Ada.
  assert.notEqual(shape.kind, 'computedInFull');
  assert.notEqual(shape.kind, 'statedHistory');
  assert.equal(shape.kind, 'notAnswerable');
  assert.match(shape.because, /has not stated/);
  assert.equal($(2_040_000) - $(1_600_000), $(440_000));
});

// --- The seven, assembled ------------------------------------------------------------------------

test('a stated history carries §3.10.3 fields 1-7, each read from the type that already owned it', () => {
  // Bea's account started 1 March 2018. The stated ledger is built the only way a ledger can be
  // built — by replaying the credit she states — because there is no `asStated` door for field 3.
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  const settings = transferBalanceAccountSettingsAsStated({
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: ['stated by the user from ATO online services (U14)'] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: '2018-03-01',
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  });
  assert.equal(settings.statedAccountStartAndCap.accountStartDay, '2018-03-01'); // 1
  assert.equal(settings.statedAccountStartAndCap.capPrevFY, $(1_600_000)); // 2
  assert.equal(settings.statedLedger.transferBalance, $(1_600_000)); // 3
  assert.equal(settings.statedDays.highestEndOfDayTransferBalance, $(1_600_000)); // 4
  assert.equal(settings.statedDays.highestBalanceDay, '2018-03-01'); // 5
  assert.equal(settings.statedDays.personalCapOnHighestBalanceDay, $(1_600_000)); // 6
  assert.equal(settings.statedDays.hasEverExceededCap, false); // 7
  // The EIGHTH stated fact, and it is not one of the seven: the day the stated history runs to.
  // Without it the mark above is a number with no "as at", and next year indexes from a stale one.
  assert.equal(settings.statedDays.throughDay, '2025-06-30');
  // The ledger has a throughDay of its own meaning something else — the day of its last ENTRY —
  // and the two are not the same fact. Seven years apart here, and both are correct.
  assert.equal(settings.statedLedger.throughDay, '2018-03-01');

  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  const shape = transferBalanceAccountShape(WINDOW, bea, new Map([['Bea', settings]]));
  assert.equal(shape.kind, 'statedHistory');
  assert.equal(shape.settings.statedDays.highestEndOfDayTransferBalance, $(1_600_000));
});

test('the Household aggregation is per Person and never a total', () => {
  const household = {
    persons: [person('Ada', { statedPriorRetirementPhase: NEVER }), person('Bea', { statedPriorRetirementPhase: BEFORE })],
  };
  const shapes = transferBalanceAccountShapes(WINDOW, household);
  assert.deepEqual(
    shapes.map((shape) => [shape.person, shape.kind]),
    [
      ['Ada', 'computedInFull'],
      ['Bea', 'notAnswerable'],
    ],
  );
  // One Person's answer never reaches the other: the cap is per Person and never poolable.
  assert.equal(shapes.length, 2);
});

// --- The three guards, each shown to be able to fire ---------------------------------------------

test('a stated ledger running past the stated day history is refused, not silently accepted', () => {
  // The mark would be read as at 30 June 2024 while a $1,600,000 credit sits on 1 March 2025:
  // s 294-40(2)(a) would take a stale maximum, and the unused percentage would be 100% instead of
  // 20% — a cap $80,000 too high on a $100,000 increase.
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2025-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  const statedDays = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2024-06-30',
    statedHighestEndOfDayTransferBalance: 0,
    statedHighestBalanceDay: '2018-03-01',
    statedPersonalCapOnHighestBalanceDay: $(1_600_000),
    statedHasEverExceededCap: false,
  });
  assert.throws(
    () =>
      transferBalanceAccountSettingsAsStated({
        statedAccountStartAndCap: {
          accountStartDay: '2018-03-01',
          capPrevFY: $(1_600_000),
          provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
        },
        statedLedger,
        statedDays,
      }),
    /stale maximum/,
  );
});

test('a stated account that starts after its own high-water day is refused', () => {
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  assert.throws(
    () =>
      transferBalanceAccountSettingsAsStated({
        statedAccountStartAndCap: {
          accountStartDay: '2020-01-01',
          capPrevFY: $(1_600_000),
          provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
        },
        statedLedger,
        statedDays: transferBalanceAccountDaysAsStated({
          statedThroughDay: '2025-06-30',
          statedHighestEndOfDayTransferBalance: $(1_600_000),
          statedHighestBalanceDay: '2018-03-01',
          statedPersonalCapOnHighestBalanceDay: $(1_600_000),
          statedHasEverExceededCap: false,
        }),
      }),
    /cannot have been reached before the account existed/,
  );
});

test('stating BOTH "never a recipient" and a prior history is a contradiction, not a preference', () => {
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  const settings = transferBalanceAccountSettingsAsStated({
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: '2018-03-01',
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  });
  const ada = person('Ada', { statedPriorRetirementPhase: NEVER });
  // Choosing silently either throws away a $1,600,000 history or throws away the O42 computation.
  assert.throws(() => transferBalanceAccountShape(WINDOW, ada, new Map([['Ada', settings]])), /contradict each other/);
});

// --- What this file must not be read as claiming --------------------------------------------------

test('the refusal has EXACTLY ONE throw site in src/, and the O42 Person does not reach it', () => {
  // **The other side of `core-transfer-balance-account.test.mjs`'s tripwire, which chunk 6-4 struck
  // this name from (2026-09-16).** That test asserts the remaining eight refusals still have NO
  // throw site; this one asserts this name has exactly one, so a strike cannot outlive its code —
  // and it asserts the thing that is specific to THIS refusal, that the site is not on the O42
  // Person's path. A refusal wired one line too wide is a regression, and the count alone would not
  // see it.
  //
  // **This test replaces `the refusal still has NO throw site anywhere in src/` from chunk 6-3.**
  // That assertion did not merely go green-to-red; the fact it pinned (no site) was 6-3's whole
  // claim about itself, and 6-4 is the change that falsifies it on purpose.
  //
  // **REWRITTEN 2026-09-18 by P4-1b part (B), which is the first change to add a throw to the
  // classifier's side of the file since 6-4.** The count it pins did not move — the corroboration of
  // conjunct 1 is a `RangeError` input-shape guard, not a named refusal — but the SHAPE this test
  // reads did: the classifier now delegates the `statedHistory` branch to `statedHistoryCorroborated`,
  // a helper that sits OUTSIDE the `export const transferBalanceAccountShape = (…\n};` text this test
  // captures. So the classifier-text assertion below stopped covering the whole classifier path on
  // that day, and the file-wide count is what still does. Both are asserted, and the helper is named
  // here so a later reader knows which one is load-bearing.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const sites = [];
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    const text = readFileSync(file, 'utf8');
    for (const _ of text.matchAll(/\bnew UnknownPersonalTransferBalanceCapError\b/g)) sites.push(file);
  }
  // Vacuity guard, in both directions: a walker that reads nothing proves nothing, and the same
  // regex family must be able to find a site that DOES exist elsewhere — the breach refusal's, in
  // the ledger. Without this, "exactly one" could be an artefact of a broken walk.
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  const wired = [];
  for (const file of sources(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const _ of text.matchAll(/\bnew TransferBalanceCapExceededError\b/g)) wired.push(file);
  }
  assert.equal(wired.length, 1);

  assert.equal(sites.length, 1, `the refusal has ${sites.length} throw sites, not 1`);
  assert.match(sites[0], /core[/\\]transferBalanceAccountSettings\.ts$/);
  // And the site sits inside the door, not inside the classifier: `transferBalanceAccountShape` is
  // total by design and the Household aggregation returns all three kinds from it.
  const door = /export const transferBalanceAccountOrRefuse = \([\s\S]*?\n\};/.exec(SETTINGS_SOURCE)?.[0] ?? '';
  assert.ok(door.length > 0, 'the door is not where this test looks for it');
  assert.match(door, /throw new UnknownPersonalTransferBalanceCapError\(fy\);/);
  const classifier = /export const transferBalanceAccountShape = \([\s\S]*?\n\};/.exec(SETTINGS_SOURCE)?.[0] ?? '';
  assert.ok(classifier.length > 0);
  assert.doesNotMatch(classifier, /UnknownPersonalTransferBalanceCapError/);
  // The branch the classifier delegates, read on its own text, because the capture above no longer
  // reaches it: the corroboration refuses with a `RangeError` and never with the named refusal.
  const corroboration = /const statedHistoryCorroborated = \([\s\S]*?\n\};/.exec(SETTINGS_SOURCE)?.[0] ?? '';
  assert.ok(corroboration.length > 0, 'the corroborating branch is not where this test looks for it');
  assert.doesNotMatch(corroboration, /UnknownPersonalTransferBalanceCapError/);
  assert.match(corroboration, /throw new RangeError\(/);
  assert.match(classifier, /statedHistoryCorroborated\(window, person, settings\)/);
  // The conjunction, as a property of the door's own text: it refuses the `notAnswerable` case and
  // returns the other two, which is the only arrangement in which O42 holds.
  assert.equal([...door.matchAll(/case '(\w+)':/g)].map(([, kind]) => kind).length, 3);
});

test('this chunk does not claim §3.10.7 is finished — the per-stream block is still chunk 5b', () => {
  assert.match(SETTINGS_SOURCE, /chunk\s*\n?\s*\/\/ 5b, which is blocked on a pending ruling and is untouched here/);
  assert.match(SETTINGS_SOURCE, /Nothing in this file may be read\n\/\/ as saying §3\.10\.7's Settings are complete/);
  // And the declared fact says in the source why it is declared rather than inferred (O42).
  assert.match(HOUSEHOLD_SOURCE, /Settings absent, therefore\n   \* refuse/);
  assert.match(HOUSEHOLD_SOURCE, /readonly statedPriorRetirementPhase\?: StatedPriorRetirementPhase;/);
});

// --- Battery E (2026-09-16): four survivors closed ------------------------------------------------

/** The Settings a pre-forecast Person states: one stream, commenced 1 March 2018 at $1,600,000. */
const statedSettings = () => {
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  return {
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: '2018-03-01',
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  };
};

/**
 * The same Settings, with the start day as the only thing that varies: one stream commenced on
 * `day` at $1,600,000, stated through that day. Everything a start day has to agree with —
 * the ledger's own opening day, the high-water day, the day the history closes — moves with it, so a
 * fixture that the window refuses is refused for the window's reason and not for one of the two
 * cross-checks `transferBalanceAccountSettingsAsStated` already runs.
 */
const startedOn = (day) => {
  let statedLedger = openTransferBalanceLedger(day);
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: day,
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  return {
    statedAccountStartAndCap: {
      accountStartDay: day,
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: day,
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: day,
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  };
};

test('SURVIVOR CLOSED — notStated WITH Settings supplied is refused too, not read as "yes"', () => {
  // **Measured as a survivor on 2026-09-16 (Battery E, mutation 7b).** Letting the `notStated` arm
  // fall through to `statedHistory` whenever Settings happen to be present failed **ZERO** tests:
  // the only `notStated` fixture in this file passes `new Map()`, so the arm was pinned on the
  // half of "either answer" where the Settings are absent and on neither half where they are not.
  //
  // **The priced pair, both readings of the same silence.** Dee was never asked, and a stated
  // history is sitting in the Map for her.
  //
  //   * read as "no"  → the seeding-year computation and a FY2026-27 cap of **$2,040,000**
  //     (the figure the test three above prices for Ada, §3.10.9's own worked answer);
  //   * read as "yes" → her stated history and a personal cap of **$1,600,000**.
  //
  // $440,000 apart, and silence is evidence for neither. The door must refuse, which is what
  // "this is not answerable" actually means.
  const settings = transferBalanceAccountSettingsAsStated(statedSettings());
  assert.equal(settings.statedAccountStartAndCap.capPrevFY, $(1_600_000));
  assert.equal($(2_040_000) - $(1_600_000), $(440_000));

  const dee = person('Dee'); // no `statedPriorRetirementPhase` at all
  assert.equal(priorRetirementPhaseAsStated(dee), 'notStated');
  const supplied = new Map([['Dee', settings]]);

  const shape = transferBalanceAccountShape(WINDOW, dee, supplied);
  assert.equal(shape.kind, 'notAnswerable');
  assert.notEqual(shape.kind, 'statedHistory'); // the wrong answer, named
  assert.notEqual(shape.kind, 'computedInFull'); // and the other wrong answer
  assert.match(shape.because, /has not stated whether/);
  assert.throws(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', dee, supplied), UnknownPersonalTransferBalanceCapError);

  // And the ground does not drift to the other `notAnswerable` reason when Settings are present:
  // she is refused for silence, not for missing Settings she actually supplied.
  assert.doesNotMatch(shape.because, /are not supplied/);
});

test('SURVIVOR CLOSED — the Settings door copies and freezes, so its two guards cannot be edited past', () => {
  // **Measured as a survivor on 2026-09-16 (Battery E, mutation 24).** Replacing the whole return
  // with `{ statedAccountStartAndCap, statedLedger, statedDays }` — no freeze, no defensive copy —
  // failed **ZERO** tests, and it is the one guard in this file whose bypass moves money: the two
  // cross-checks run once, at construction, against an object the CALLER still holds a reference to.
  //
  // **Priced.** Dee states the cap she actually has, $1,600,000, and both guards pass. Editing the
  // same object afterwards restates §3.10.3 field 2 behind the checks: $2,000,000, which is
  // **$400,000** of cap this Person does not have, and permanently — next year's carry-forward
  // starts from it.
  const input = statedSettings();
  const settings = transferBalanceAccountSettingsAsStated(input);

  input.statedAccountStartAndCap.capPrevFY = $(2_000_000);
  assert.equal(settings.statedAccountStartAndCap.capPrevFY, $(1_600_000), 'the honest cap');
  assert.notEqual(settings.statedAccountStartAndCap.capPrevFY, $(2_000_000), 'the laundered cap');
  assert.equal($(2_000_000) - $(1_600_000), $(400_000));

  // The start day is the other field the door checks, and the same edit would walk past the guard
  // that refuses exactly this value three tests above.
  input.statedAccountStartAndCap.accountStartDay = '2020-01-01';
  assert.equal(settings.statedAccountStartAndCap.accountStartDay, '2018-03-01');

  // Both layers, so a freeze without a copy (or a copy without a freeze) fails here.
  assert.ok(Object.isFrozen(settings), 'the Settings record is frozen');
  assert.ok(Object.isFrozen(settings.statedAccountStartAndCap), 'field 1 and 2 are frozen');
  assert.throws(() => {
    settings.statedAccountStartAndCap.capPrevFY = $(2_000_000);
  }, TypeError);
});

test('SURVIVOR CLOSED — the statedHistory branch IS reachable from typed code, and the header says so', () => {
  // **The brief for this battery asserted the opposite, and the module header asserted it too.**
  // Measured 2026-09-16: `tsc --noEmit` exits 0 on a `StatedTransferBalanceAccountSettings`
  // assembled out of exported producers only — no cast, no spread — because
  // `seedPersonalTransferBalanceCap(accountStartDay)` is that Person's seeding-year personal cap by
  // s 294-35(1), which is exactly what §3.10.3 field 2 asks for. So the branch is live, and this
  // asserts it from the runtime side; the compile side is pinned by the header text below.
  const settings = transferBalanceAccountSettingsAsStated({
    ...statedSettings(),
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: seedPersonalTransferBalanceCap('2018-03-01').cap,
      provenanceOfCapPrevFY: seedPersonalTransferBalanceCap('2018-03-01').provenance,
    },
  });
  // FY2017-18's general cap, which is what a 1 March 2018 account seeds from (§3.1).
  assert.equal(seedPersonalTransferBalanceCap('2018-03-01').fy, '2017-18');
  assert.equal(settings.statedAccountStartAndCap.capPrevFY, $(1_600_000));

  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  const answered = transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, new Map([['Bea', settings]]));
  assert.equal(answered.kind, 'statedHistory');
  assert.equal(answered.settings.statedAccountStartAndCap.capPrevFY, $(1_600_000));

  // **The retired claim is canaried by COUNT inside its correction frame, not by absence** — this
  // project keeps one copy of a superseded sentence, quoted in the note that records it as false.
  const retired = /so the statedHistory branch above is unreachable\n\/\/ from typed code/g;
  assert.equal([...SETTINGS_SOURCE.matchAll(retired)].length, 1, 'the retired claim is quoted once, or has returned');
  assert.match(SETTINGS_SOURCE, /NARROWED 2026-09-16 by Battery E[\s\S]{0,900}Both halves are\n\/\/ FALSE/);
  // The direction of what is still missing, which is the half of a narrowing worth testing.
  assert.match(SETTINGS_SOURCE, /wrong by an amount nothing here\n\/\/ bounds, in either direction/);
  // Vacuity: the phrase really is findable in this file at all.
  assert.ok([...SETTINGS_SOURCE.matchAll(/statedHistory/g)].length > 3);
});

// --- O66 batch 2 — T86: Div 294 is drafted wholly per individual ----------------------------------
//
// Measured 2026-09-16: making the Settings lookup fall back to any other Person's stated history —
// `settingsByPerson.get(person.name) ?? [...settingsByPerson.values()][0]`, one spouse's transfer
// balance account answering for the other — failed **zero** tests. The aggregation test above pins
// that the result is a LIST and not a total, which is the pooling this codebase was never going to
// do; it does not pin that a Person's own name is what selects their history, which is the pooling
// a one-line lookup change performs silently.

test('one Person stated history never answers for their spouse, and the cap never pools (T86)', () => {
  // Ada's account predates the forecast and she supplies §3.10.3's seven. Bea says the same thing
  // about hers and supplies nothing — she is the Person the refusal is for.
  let statedLedger = openTransferBalanceLedger('2018-03-01');
  statedLedger = creditOnCommencement(statedLedger, {
    startingDay: '2018-03-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  const adaSettings = transferBalanceAccountSettingsAsStated({
    statedAccountStartAndCap: {
      accountStartDay: '2018-03-01',
      capPrevFY: $(1_600_000),
      provenanceOfCapPrevFY: { fy: '2024-25', confidence: 'secondary-only', caveats: [] },
    },
    statedLedger,
    statedDays: transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_600_000),
      statedHighestBalanceDay: '2018-03-01',
      statedPersonalCapOnHighestBalanceDay: $(1_600_000),
      statedHasEverExceededCap: false,
    }),
  });
  const ada = person('Ada', { statedPriorRetirementPhase: BEFORE });
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  const byPerson = new Map([['Ada', adaSettings]]);

  // Ada is answerable on her own statement.
  const adaAnswer = transferBalanceAccountOrRefuse(WINDOW, '2026-27', ada, byPerson);
  assert.equal(adaAnswer.kind, 'statedHistory');
  assert.equal(adaAnswer.settings.statedAccountStartAndCap.capPrevFY, $(1_600_000));

  // Bea is not, and what she must NOT get is Ada's answer. Div 294 contains no aggregation
  // provision and no transfer between spouses (§3.10, and the non-existence is a labelled inference
  // from the absence of one) — so the Person's own name is what selects a history, and a Person with
  // none is refused rather than lent one.
  const beaShape = transferBalanceAccountShape(WINDOW, bea, byPerson);
  assert.equal(beaShape.kind, 'notAnswerable');
  assert.notEqual(beaShape.kind, 'statedHistory');
  assert.match(beaShape.because, /seven per-Person Settings of register §3.10.3 are not supplied/);
  assert.throws(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, byPerson), UnknownPersonalTransferBalanceCapError);
  // The Household walk answers the same way for each of them, in order, and carries no total.
  assert.deepEqual(
    transferBalanceAccountShapes(WINDOW, { persons: [ada, bea] }, byPerson).map((shape) => [shape.person, shape.kind]),
    [
      ['Ada', 'statedHistory'],
      ['Bea', 'notAnswerable'],
    ],
  );

  // **And the cap itself, priced on §1's own T86 fixture.** A couple with $3,600,000 of super:
  // Person A commences $2,600,000 and Person B $1,000,000 against the FY2026-27 general cap of
  // $2,100,000, which s 294-35(1) seeds both of their personal caps from. A is in breach by
  // $500,000 however much unused cap B has — and B has $1,100,000 of it.
  const seed = seedPersonalTransferBalanceCap('2026-07-01');
  assert.equal(seed.fy, '2026-27');
  assert.equal(seed.cap, $(2_100_000));
  assert.equal($(2_600_000) + $(1_000_000), $(3_600_000));

  let aLedger = openTransferBalanceLedger('2026-07-01');
  aLedger = creditOnCommencement(aLedger, {
    startingDay: '2026-07-01',
    valueOfSupportingInterestOnStartingDay: $(2_600_000),
  });
  assert.throws(
    () => openTransferBalanceAccountDays('2026-07-01', seed.cap, closingBalanceOn('2026-07-01', aLedger)),
    (raised) => {
      assert.ok(raised instanceof RangeError);
      assert.match(raised.message, /by \$500,000\.00\./);
      return true;
    },
  );

  let bLedger = openTransferBalanceLedger('2026-07-01');
  bLedger = creditOnCommencement(bLedger, {
    startingDay: '2026-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_000_000),
  });
  const bDays = openTransferBalanceAccountDays('2026-07-01', seed.cap, closingBalanceOn('2026-07-01', bLedger));
  assert.equal(bDays.highestEndOfDayTransferBalance, $(1_000_000));
  assert.equal(seed.cap - bDays.highestEndOfDayTransferBalance, $(1_100_000));
  // B's $1,100,000 of headroom is not an operand of anything A's account reads: the two ledgers and
  // the two day states are separate values, and no function in `src/core` takes two of either.
  assert.notEqual(aLedger, bLedger);

  // The source side of the same claim, and it is a COUNT rather than a shape guess: the Settings map
  // is read in exactly one place and the key is exactly the Person's own name. Iterating the map is
  // how a fallback to somebody else's history gets written, so the three ways of iterating it are
  // banned by name in executable text. (The behavioural half above is what actually failed when the
  // fallback was measured; this half is here so the lookup cannot drift back to it silently.)
  const settingsCode = SETTINGS_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");
  assert.equal((settingsCode.match(/settingsByPerson\.get\(/g) ?? []).length, 1, 'the Settings map is read in more than one place');
  assert.equal((settingsCode.match(/settingsByPerson\.get\(person\.name\)/g) ?? []).length, 1, 'the Settings map is no longer keyed on the Person own name');
  for (const iteration of ['settingsByPerson\\.values\\(', 'settingsByPerson\\.entries\\(', 'settingsByPerson\\.forEach\\(', 'for \\(const \\[.*\\] of settingsByPerson']) {
    assert.ok(!new RegExp(iteration).test(settingsCode), `the Settings map is being iterated (${iteration}): one Person history can now reach another (T86)`);
  }
  // Vacuity: the strip keeps the door and its lookup.
  assert.match(settingsCode, /export const transferBalanceAccountShape = \(/);
});

// --- P4-1b part (B): conjunct 1 is corroborated against the forecast window ----------------------
//
// **What this section is for.** `UnknownPersonalTransferBalanceCapError` refuses on a CONJUNCTION,
// and its first limb — *the account started before the forecast* — was a bare declaration until the
// window had a name. These tests are the other side of the correction in the classifier's doc: the
// declaration is now checked against the window, in the one branch where a start day exists to check.

test('the window this file checks against is DERIVED, and both of its ends are hand-checked', () => {
  // The first day is `asAtDate` itself — 16 September 2026 — and the first month is September 2026.
  assert.equal(WINDOW.firstDay, '2026-09-16');
  assert.equal(WINDOW.firstMonth, '2026-09');
  // Both fixture Persons were born 11 April 1958, so the hundredth birthday is 11 April 2058 and the
  // window's last month is the month containing it, inclusive.
  assert.equal(WINDOW.lastMonth, '2058-04');
  assert.ok(Object.isFrozen(WINDOW), 'a caller could move the boundary it was handed');
});

test('BRANCH 1 — a start day BEFORE the window corroborates the declaration and is computed', () => {
  // Bea says her account was already running before the forecast and states 1 March 2018 — eight
  // years and a half before 16 September 2026. The declaration and the day agree, so nothing changes
  // for her: she is the `statedHistory` Person this file has had since chunk 6-3.
  const settings = transferBalanceAccountSettingsAsStated(statedSettings());
  assert.ok(settings.statedAccountStartAndCap.accountStartDay < WINDOW.firstDay);
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  const shape = transferBalanceAccountShape(WINDOW, bea, new Map([['Bea', settings]]));
  assert.equal(shape.kind, 'statedHistory');
  assert.equal(shape.settings.statedAccountStartAndCap.capPrevFY, $(1_600_000));
  assert.doesNotThrow(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, new Map([['Bea', settings]])));
});

test('BRANCH 1 REFUSED — a declared pre-forecast account whose start day is INSIDE the window', () => {
  // Bea declares the same thing and states 1 October 2026, which is a day the walk itself will emit.
  // The two statements cannot both be true, and the price of believing the pair is the same $440,000
  // spread this file prices for silence: her stated $1,600,000 cap, latched, against the $2,040,000
  // the seeding-year computation would give an account that really started inside the forecast.
  const inside = transferBalanceAccountSettingsAsStated(startedOn('2026-10-01'));
  assert.ok(inside.statedAccountStartAndCap.accountStartDay > WINDOW.firstDay);
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  assert.throws(
    () => transferBalanceAccountShape(WINDOW, bea, new Map([['Bea', inside]])),
    (error) => {
      assert.ok(error instanceof RangeError);
      assert.match(error.message, /Bea is stated to have started retirement phase before the forecast/);
      assert.match(error.message, /2026-10-01 is not before 2026-09-16/);
      assert.match(error.message, /Correct the start day, or the declaration/);
      return true;
    },
  );
  assert.equal($(2_040_000) - $(1_600_000), $(440_000));
  // The door refuses it too — the corroboration is not something a caller can get past by asking the
  // other question.
  assert.throws(() => transferBalanceAccountOrRefuse(WINDOW, '2026-27', bea, new Map([['Bea', inside]])), RangeError);
});

test('BRANCH 1 REFUSED — the boundary is EXCLUSIVE: a start day ON the window first day is inside it', () => {
  // 16 September 2026 is `asAtDate`, which is the first day the forecast covers — not the last day
  // before it. A Person whose account starts that morning starts it inside the forecast.
  const onTheDay = transferBalanceAccountSettingsAsStated(startedOn('2026-09-16'));
  assert.equal(onTheDay.statedAccountStartAndCap.accountStartDay, WINDOW.firstDay);
  const bea = person('Bea', { statedPriorRetirementPhase: BEFORE });
  assert.throws(
    () => transferBalanceAccountShape(WINDOW, bea, new Map([['Bea', onTheDay]])),
    /2026-09-16 is not before 2026-09-16/,
  );
  // And the day before it is not: the boundary sits exactly between these two fixtures, so an
  // inclusive comparison and an exclusive one are distinguishable here and nowhere else.
  const theDayBefore = transferBalanceAccountSettingsAsStated(startedOn('2026-09-15'));
  assert.equal(transferBalanceAccountShape(WINDOW, bea, new Map([['Bea', theDayBefore]])).kind, 'statedHistory');
});

test('BRANCH 2 — "never a recipient" with a start day INSIDE the window is still the contradiction throw', () => {
  // **The second limb of the deferred rule, asserted where it actually lives.** The rule P3-9 handed
  // to this item reads: the start day must be inside the window when the declaration is
  // `never…`. There is no data path on which that is a comparison — the only `accountStartDay` this
  // module can see is in the stated Settings, and stating a history alongside `never…` is already
  // refused whatever day it names. Both halves are asserted here so that a later author does not
  // re-add the comparison as unreachable code, and so that deleting the throw that discharges the
  // limb goes red.
  const ada = person('Ada', { statedPriorRetirementPhase: NEVER });
  // (i) a start day INSIDE the window — the combination the rule calls consistent — still refuses,
  //     because the history itself is what contradicts the declaration.
  const inside = transferBalanceAccountSettingsAsStated(startedOn('2026-10-01'));
  assert.throws(() => transferBalanceAccountShape(WINDOW, ada, new Map([['Ada', inside]])), /contradict each other/);
  // (ii) and a start day BEFORE it refuses on the same ground, with the same message: the window
  //      does not change which refusal this Person gets.
  const before = transferBalanceAccountSettingsAsStated(statedSettings());
  assert.throws(() => transferBalanceAccountShape(WINDOW, ada, new Map([['Ada', before]])), /contradict each other/);
  // (iii) the O42 Person — `never…` and no Settings, which is the whole point of the declaration —
  //       is untouched by all of this and is still COMPUTED.
  assert.equal(transferBalanceAccountShape(WINDOW, ada, new Map()).kind, 'computedInFull');
});

test('the window is REQUIRED, and the retired deferral is quoted exactly once in its correction', () => {
  // A window that could be omitted would make the corroboration opt-in, so the parameter has no
  // default — the source side of that, since a `.mjs` test cannot see a type.
  assert.match(
    SETTINGS_SOURCE,
    /export const transferBalanceAccountShape = \(\n  window: ForecastWindow,\n  person: Person,/,
  );
  assert.doesNotMatch(SETTINGS_SOURCE, /window\?: ForecastWindow/);
  assert.doesNotMatch(SETTINGS_SOURCE, /window: ForecastWindow = /);
  // The superseded claim, kept once inside the frame that records it as false (this repo keeps one
  // copy of a retired sentence, quoted in its correction — see the Battery E canary above).
  const retired = /There is no forecast window\n \* anywhere in `src\/` to compare `accountStartDay` against/g;
  assert.equal([...SETTINGS_SOURCE.matchAll(retired)].length, 1, 'the retired claim is quoted once, or has returned');
  assert.match(SETTINGS_SOURCE, /\*\*Conjunct 1 IS corroborated now — P4-1b part \(B\), 2026-09-18/);
  // ...and it is quoted as superseded, not merely present: the correction's own verb is asserted, so
  // re-instating the sentence as a live claim by deleting the frame goes red.
  assert.match(SETTINGS_SOURCE, /Until this change the doc here read/);
  // The header's count of input-shape guards moved with the code that raised it, and the count in
  // the prose is asserted against the count in the text — three was true until this change and four
  // is true now, so a fifth guard added silently, or this one removed, both go red here.
  assert.match(SETTINGS_SOURCE, /holds FOUR `RangeError`s and still exactly ONE named refusal/);
  assert.equal([...SETTINGS_SOURCE.matchAll(/throw new RangeError\(/g)].length, 4);
  assert.equal([...SETTINGS_SOURCE.matchAll(/new UnknownPersonalTransferBalanceCapError\b/g)].length, 1);
});
