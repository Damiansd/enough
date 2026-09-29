// P4-1 chunk 0 — the projection engine's types, asserted rather than described.
//
// `src/core/plan.ts` holds no arithmetic, so there is no number here to check. What CAN go wrong is
// a shape drifting away from the prose that specifies it, silently, months from now — and a shape
// test that merely restates the type catches none of that. So every test below is written to fail
// on a specific mutation:
//
//   * the entry-type list is compared against `concept.md`'s OWN table, PARSED, never hand-copied.
//     Adding a row to the table without adding it to `ENTRY_TYPES` fails here, and so does the
//     reverse — the `assumptions-register-o66.test.mjs` discipline, applied to a union.
//   * `Settings.asAtDate` being required is asserted by COMPILING code that omits it, with a
//     positive control so a probe failing for an unrelated reason cannot pass every case for the
//     wrong reason.
//   * the field names of `Settings`, `Month` and the `Entry` record are pinned by exhaustive key
//     maps, which go red on a rename, an addition AND a removal.
//   * `UnspecifiedParams` is asserted to be unconstructable, which is the only thing that stops the
//     fourteen still-unspecified entry types quietly acquiring `{}` as their specification.
//   * `NON_SUPER_INVESTMENT`'s params, specified for a BUY alone by P3-21f chunk 3, are probed on
//     both sides: a buy compiles and a DRAW does not, which is how chunk 4's disposal stays chunk
//     4's to build rather than arriving as a negative buy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ENTRY_KIND, ENTRY_TYPES, entryKindOf } from '../dist/core/plan.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONCEPT = readFileSync(join(ROOT, 'concept.md'), 'utf8');
const PLAN_SOURCE = readFileSync(join(ROOT, 'src', 'core', 'plan.ts'), 'utf8');

// --- The canary: `concept.md`'s table IS the specification ---------------------------------------

/**
 * The rows of §4's "Entry types" table, read out of the markdown. Bounded at both ends: the table's
 * own heading, and the first heading or non-table paragraph after it — so the walker cannot wander
 * into another table and report a plausible count from the wrong section.
 */
const entryTypesInConcept = () => {
  const start = CONCEPT.indexOf('### Entry types');
  assert.notEqual(start, -1, 'concept.md no longer has an "### Entry types" heading');
  const rest = CONCEPT.slice(start + '### Entry types'.length);
  const end = rest.search(/\n#{1,3} |\n(?=[^|\s])/);
  const table = rest.slice(0, end === -1 ? undefined : end);
  return [...table.matchAll(/^\| `([A-Z_]+)` \|/gm)].map(([, name]) => name);
};

test('CANARY — the entry-type union is exactly concept.md’s table, in its order', () => {
  const inProse = entryTypesInConcept();

  // Vacuity control first: a walker that matched nothing would make every assertion below pass.
  assert.ok(inProse.length > 10, `the table walker found only ${inProse.length} rows`);
  assert.ok(inProse.includes('RETIRE') && inProse.includes('ENTER_CARE'), 'the walker missed the table’s first or last row');

  // Both directions, named separately so a failure says WHICH way the drift went.
  const missingFromCode = inProse.filter((name) => !ENTRY_TYPES.includes(name));
  const missingFromProse = ENTRY_TYPES.filter((name) => !inProse.includes(name));
  assert.deepEqual(missingFromCode, [], 'concept.md names an entry type that `ENTRY_TYPES` does not declare');
  assert.deepEqual(missingFromProse, [], '`ENTRY_TYPES` declares an entry type concept.md’s table does not name');

  // Order too, so the list stays readable against the table it is derived from.
  assert.deepEqual([...ENTRY_TYPES], inProse);
});

test('CANARY — the table is 27 rows, and the count is derived from the table', () => {
  // The brief for this chunk said 17. The table said 19 from the scaffold to 2026-09-22, when
  // `TRIS_EARLY_CONVERSION` became the first row ever added to it (P3-8's conversion limb) — every
  // type before it was already named in concept.md's original table and only gained params later.
  // The table is still the specification: the count is asserted from the parse rather than from
  // the number anybody wrote down. If a row is added or removed this fails, which is the point —
  // 21 is a reading, not a constant. 20 → 21 on 2026-09-23: `MORTGAGE_PAYOFF`, the second row ever
  // added rather than specified. 21 → 22 on 2026-09-23: `TTR_RATE_CHANGE`, the third. 22 → 23 on
  // 2026-09-25 (P14-13): `SELL_HOME`, the fourth. 23 → 24 the same day: `RENT_OUT_HOME`, the fifth.
  // 24 → 25 on 2026-09-25 (P14-19): `BUY_HOME`, the sixth. 25 → 26 the same day (P3-17a slice 3):
  // `INSURANCE_COVER_CHANGE`, the seventh. 26 → 27 on 2026-09-29 (retire flow S4): `TTR_START`, the eighth.
  const inProse = entryTypesInConcept();
  assert.equal(inProse.length, 27);
  assert.equal(ENTRY_TYPES.length, inProse.length);
  assert.equal(new Set(ENTRY_TYPES).size, ENTRY_TYPES.length, 'an entry type is declared twice');
});

test('the four types the minimal first slice specifies are all in the table', () => {
  // The slice is the no-super, salary-and-spend case. If one of these is ever renamed in the table,
  // this says so before the compile probes below start failing for a reason that looks unrelated.
  const inProse = entryTypesInConcept();
  for (const name of ['SPEND_CHANGE', 'ONE_OFF_EXPENSE', 'RETIRE', 'WORK_PATTERN_CHANGE']) {
    assert.ok(inProse.includes(name), `${name} is no longer a row in concept.md’s table`);
  }
});

// --- The clock, which nothing here may read ------------------------------------------------------

test('nothing in plan.ts reads the clock (P4-1a, ADR-0002)', () => {
  const executable = PLAN_SOURCE.split('\n').filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//')).join('\n');
  assert.equal(/\bDate\.now\s*\(/.test(executable), false, 'plan.ts reads the system clock');
  assert.equal(/\bnew Date\s*\(\s*\)/.test(executable), false, 'plan.ts constructs a clock-reading Date');
  // Vacuity: the filter really did leave the module’s text behind.
  assert.match(executable, /asAtDate/);
});

// --- The compile probes --------------------------------------------------------------------------
//
// Same harness as `core-condition-of-release.test.mjs`: a scratch file compiled by `tsc` against the
// real sources, under the repo’s own strictness flags.

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-plan-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import type { Entry, EntryKind, EntryOwner, EntryType, Month, MonthLine, Settings, UnspecifiedParams } from '../src/core/plan.js';\n" +
        "import { ENTRY_KIND, ENTRY_TYPES, entryKindOf } from '../src/core/plan.js';\n" +
        "import { toCents } from '../src/core/money.js';\n" +
        'void ENTRY_TYPES; void toCents; void ENTRY_KIND; void entryKindOf;\n' +
        'type _Used = Entry | EntryKind | EntryOwner | EntryType | Month | MonthLine | Settings | UnspecifiedParams<"DEATH">;\n' +
        'declare const _used: _Used; void _used;\n' +
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

/** A well-formed `Settings`, written out in full because the positive control depends on it. */
const SETTINGS = `const settings: Settings = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 100,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0075, upper: 0.0225 },
  nominalReturn: 0.065,
};`;

test('the compile probe is not vacuous — a well-formed Settings compiles clean', () => {
  const result = tsc(`${SETTINGS}\nvoid settings.asAtDate;`);
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — a Settings WITHOUT `asAtDate` WILL NOT COMPILE (P4-1a)', () => {
  // The whole of ADR-0002’s reproducibility promise rests on this being required. If it were
  // optional, `project()` would have somewhere to fall back to, and the fallback is the clock.
  const result = tsc(`const settings: Settings = {
    planningHorizonAge: 100,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0075, upper: 0.0225 },
    nominalReturn: 0.065,
  };\nvoid settings;`);
  assert.equal(result.ok, false, '`asAtDate` must be required on Settings');
  assert.match(result.output, /asAtDate/);
});

test('EXACTLY SIX fields of Settings are optional — and `asAtDate` cannot be quietly relaxed', () => {
  // The structural form of the same rule, and the one that bites on `asAtDate?:` from a second
  // direction: a Setting is a forecast somebody stated, so a plan file may omit no field of
  // `Settings` and there is no defaulting layer to fill one in. Written as a derived key set rather
  // than a list, so a NEW optional field fails here without anyone remembering to add it.
  //
  // ⚠️ **FIVE FIELDS ARE THE EXCEPTIONS AND EACH IS PINNED FROM BOTH SIDES.** `contingencyFloor`
  // (P4-14), `investmentPayoutRate` and `investmentPayoutFrankedShare` (P3-22h step 1, 2026-09-22),
  // and from 2026-09-22 `superIncomeYieldRate` and `superIncomeYieldFrankedShare` (P3-42 steps 1
  // and 3). The first assertion fails if any SIXTH field becomes optional; the five below fail if
  // any one of these stops being optional. Each exception holds on the same ground: nothing
  // answers the absence — no band is drawn for an absent floor, no payout is made and no credit
  // given for the absent two, and no super earnings tax or credit is computed for the other two.
  // **This does NOT mean `project()` never reads them**: all five are wired live (P3-22h steps 2-3,
  // P3-42 steps 2-3) — what stays true, and what this test actually pins, is structural: each stays
  // OPTIONAL and its absence is never answered with an invented figure.
  //
  // ⚠️ **A SIXTH, `cashInterestRate` (2026-09-23), and it is the one exception to that ground.** Its
  // absence IS answered — by the plan's own `economicSeries.cpi`, on the user's ruling — so it is
  // not an invented figure but it is a filled one. Pinned here so a SEVENTH still fails.
  const result = tsc(`type OptionalKeysOf<T> = { [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never }[keyof T];
type TheSix = 'contingencyFloor' | 'investmentPayoutRate' | 'investmentPayoutFrankedShare' | 'superIncomeYieldRate' | 'superIncomeYieldFrankedShare' | 'cashInterestRate';
const onlyThoseSixAreOptional: OptionalKeysOf<Settings> extends TheSix ? true : false = true;
void onlyThoseSixAreOptional;
const andTheCashInterestRateIs: 'cashInterestRate' extends OptionalKeysOf<Settings> ? true : false = true;
void andTheCashInterestRateIs;
const andTheFloorStillIs: 'contingencyFloor' extends OptionalKeysOf<Settings> ? true : false = true;
void andTheFloorStillIs;
const andThePayoutRateIs: 'investmentPayoutRate' extends OptionalKeysOf<Settings> ? true : false = true;
void andThePayoutRateIs;
const andTheFrankedShareIs: 'investmentPayoutFrankedShare' extends OptionalKeysOf<Settings> ? true : false = true;
void andTheFrankedShareIs;
const andTheSuperIncomeYieldRateIs: 'superIncomeYieldRate' extends OptionalKeysOf<Settings> ? true : false = true;
void andTheSuperIncomeYieldRateIs;
const andTheSuperFrankedShareIs: 'superIncomeYieldFrankedShare' extends OptionalKeysOf<Settings> ? true : false = true;
void andTheSuperFrankedShareIs;
// Vacuity control: the same detector MUST find the one optional field the Entry record has.
const detectorWorks: 'note' extends OptionalKeysOf<Entry> ? true : false = true;
void detectorWorks;`);
  assert.equal(result.ok, true, result.output);
});

test('the field names of Settings are pinned — a rename, an addition or a removal fails', () => {
  // An exhaustive key map. A missing key is a missing-property error and an extra key is an
  // excess-property error, so this bites in both directions rather than only on removal.
  const result = tsc(`type SettingsKeys = keyof Settings;
const pinned: { [K in SettingsKeys]-?: true } = {
  asAtDate: true,
  planningHorizonAge: true,
  economicSeries: true,
  deemingRates: true,
  nominalReturn: true,
  contingencyFloor: true,
  investmentPayoutRate: true,
  investmentPayoutFrankedShare: true,
  superIncomeYieldRate: true,
  superIncomeYieldFrankedShare: true,
  cashInterestRate: true,
};
void pinned;`);
  assert.equal(result.ok, true, result.output);
});

test('the field names of Month are pinned, including the ADR-0005 assets split', () => {
  const result = tsc(`type MonthKeys = keyof Month;
const pinned: { [K in MonthKeys]-?: true } = {
  month: true,
  openingBalance: true,
  closingBalance: true,
  lines: true,
  notes: true,
  appliedEntryIds: true,
  protectedAssets: true,
  assessableAssets: true,
  accessibleAssets: true,
  assetsByPerson: true,
  mortgageBalance: true,
  // P12-1, 2026-09-24: who has died by this month — OMITTED while nobody has, so no walk moves.
  died: true,
  superBalance: true,
  // 2026-09-24: the Non-Super Portfolio at the close, the third part of total wealth at month end.
  closingNonSuperPortfolio: true,
  incomeFromSuper: true,
  // P14-16, 2026-09-24: the refundable RAD held, net of retention, at this month's close —
  // OMITTED while no ENTER_CARE has ever applied, on mortgageBalance's own terms.
  radHeld: true,
  // P9-1, slice 1, 2026-09-24: the Home Equity Access Scheme debt at this month's close — OMITTED
  // while no HEAS_DRAW has ever applied, mortgageBalance's own terms; SUBTRACTED from total wealth.
  heasDebt: true,
  // 2026-09-25: the assets test's free area and cut-off, off the month's own entitlement — OMITTED
  // where no entitlement was computed.
  assetsTestThresholds: true,
  // P7-5, 2026-09-25: the home status the walk derived from a home entry — OMITTED where none governs.
  homeStatus: true,
  provenance: true,
};
void pinned;
// The two figures are separate and both are Cents. Netting them into one would break this line.
declare const m: Month;
const split: [import('../src/core/money.js').Cents, import('../src/core/money.js').Cents] = [m.protectedAssets, m.assessableAssets];
void split;
// P4-6: and accessibleAssets is a THIRD figure of the same type, not a derivation of those two.
const reachable: import('../src/core/money.js').Cents = m.accessibleAssets;
void reachable;
// P3-16 slice 2: the home-loan balance is OPTIONAL — absent is "there is no loan", and a consumer
// that read it as a plain Cents would silently treat a household with no mortgage as owing NaN.
// @ts-expect-error mortgageBalance may be absent, so it is not assignable to Cents.
const owing: import('../src/core/money.js').Cents = m.mortgageBalance;
void owing;
const owingOrNone: import('../src/core/money.js').Cents | undefined = m.mortgageBalance;
void owingOrNone;
// P4-4's polish (2026-09-18): \`notes\` is a SECOND array beside \`lines\` and it is NOT MonthLine[].
// A note carries no \`amount\` and no \`direction\`, which is the whole of why it could not be a line —
// assigning one to the other is the regression this pins, in both directions.
declare const note: import('../src/core/plan.js').MonthNote;
// @ts-expect-error a MonthNote is not a MonthLine: it has no amount and no direction.
const asLine: import('../src/core/plan.js').MonthLine = note;
void asLine;
// @ts-expect-error and a MonthLine is not a MonthNote: it has no subject.
const asNote: import('../src/core/plan.js').MonthNote = m.lines[0];
void asNote;`);
  assert.equal(result.ok, true, result.output);
});

test('P4-4 — a MonthNote is a DISCRIMINATED UNION, so a parameter-window note cannot carry a limb’s money', () => {
  // The shape decision, pinned as a compile error rather than as prose. The rejected alternative was
  // one record with optional `available`/`drawn`, which would have made "nobody supplied a figure"
  // and "the figure was nil" the same value again — the exact confusion the array exists to end.
  const result = tsc(`declare const note: import('../src/core/plan.js').MonthNote;
if (note.subject === 'parameter window') {
  // @ts-expect-error a parameter-window note has no available member: only a limb can offer one.
  void note.available;
  const register: 'Age Pension' | 'income tax' = note.register;
  void register;
}
if (note.subject === 'waterfall limb') {
  // @ts-expect-error and a limb note has no register member.
  void note.register;
  const drawn: import('../src/core/money.js').Cents = note.drawn;
  void drawn;
}`);
  assert.equal(result.ok, true, result.output);
});

test('P4-4 — the four limb names on a MonthNote are the Waterfall’s own, and a fifth is refused', () => {
  const result = tsc(`declare const note: import('../src/core/plan.js').WaterfallLimbNote;
const limbs: readonly import('../src/core/projection.js').WaterfallLimb[] = [note.limb];
void limbs;
// @ts-expect-error there is no fifth limb, and a note may not name one.
const fifth: import('../src/core/plan.js').WaterfallLimbNote['limb'] = 'mortgageRedraw';
void fifth;`);
  assert.equal(result.ok, true, result.output);
});

// P15-13 (2026-09-28) added the ninth, `origin`, optional: the chat turn behind an accepted suggestion.
test('the Journal Entry record is exactly concept.md’s eight fields and the optional origin', () => {
  const result = tsc(`type EntryKeys = keyof Entry;
const pinned: { [K in EntryKeys]-?: true } = {
  id: true,
  date: true,
  owner: true,
  type: true,
  params: true,
  note: true,
  enabled: true,
  createdAt: true,
  origin: true,
};
void pinned;`);
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — an Entry without `enabled` WILL NOT COMPILE (the append-only delete)', () => {
  // `enabled: false` is the only delete this model has (ADR-0002). Optional-defaulting-to-true would
  // make "nobody said" and "enabled" the same fact.
  const result = tsc(`const e: Entry = {
    id: 'e1', date: '2030-01-01', owner: 'personA', type: 'RETIRE', params: {}, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, '`enabled` must be required');
  assert.match(result.output, /enabled/);
});

test('MUTATION — an Entry without an `owner` WILL NOT COMPILE', () => {
  const result = tsc(`const e: Entry = {
    id: 'e1', date: '2030-01-01', type: 'RETIRE', params: {}, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, '`owner` must be mandatory on every entry');
  assert.match(result.output, /owner/);
});

test('the four specified entry types can all actually be built', () => {
  // The positive control for the union: if these stopped compiling, every "will not compile" test
  // below would pass for the wrong reason.
  const result = tsc(`const entries: Entry[] = [
  { id: 'a', date: '2036-06-30', owner: 'personA', type: 'RETIRE', params: {}, enabled: true, createdAt: '2026-09-16' },
  { id: 'b', date: '2032-07-01', owner: 'personB', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(48_000) }, enabled: true, createdAt: '2026-09-16' },
  { id: 'c', date: '2036-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(90_000) }, enabled: false, note: 'slow-go', createdAt: '2026-09-16' },
  { id: 'd', date: '2029-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(45_000) }, enabled: true, createdAt: '2026-09-16' },
];
void entries;`);
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — a raw number where Cents is wanted WILL NOT COMPILE (ADR-0001)', () => {
  const result = tsc(`const e: Entry = {
    id: 'd', date: '2029-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: 45000 }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, 'money must be Cents, never a bare number');
  assert.match(result.output, /not assignable to type 'Cents'/);
});

test('MUTATION — one type’s params on another type WILL NOT COMPILE (the discriminant bites)', () => {
  const result = tsc(`const e: Entry = {
    id: 'c', date: '2036-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { daysPerWeek: 3 }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, 'params must be narrowed by the `type` discriminant');
});

test('MUTATION — an UNSPECIFIED entry type CANNOT be given `{}` as its params', () => {
  // This is the device that stops the five still-unspecified types acquiring an accidental
  // specification. `{}` is not "specified as empty"; `RETIRE`’s `NoParams` is.
  // The probe was `DEATH` until P12-1 specified it, then `CARE_EVENT` until P14-13 renamed and
  // specified it as `ENTER_CARE` (2026-09-24); `VACATE_HOME` is still unspecified.
  const result = tsc(`const e: Entry = {
    id: 'x', date: '2040-01-01', owner: 'personA', type: 'VACATE_HOME', params: {}, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, '`{}` must not satisfy UnspecifiedParams');
  assert.match(result.output, /params/);
});

test('MUTATION — an UNSPECIFIED entry type cannot be given INVENTED params either', () => {
  const result = tsc(`const e: Entry = {
    id: 'x', date: '2040-01-01', owner: 'household', type: 'HEAS_DRAW', params: { amount: toCents(1_000) }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, 'a guessed params shape must not satisfy UnspecifiedParams');
});

test('P3-21f chunk 4 — a BUY and a SELL compile, and their fields do NOT cross', () => {
  // ⚠️ **REWRITTEN, not deleted.** Chunk 3 pinned `direction` as the one-member union `'buy'` and
  // said chunk 4 would widen it deliberately. It has: `NonSuperInvestmentParams` is now a
  // discriminated union of a buy and a sell, and the two members do NOT share their fields — a buy
  // states the incidental costs of acquisition (s 110-25) and a sell states which parcels go first.
  const good = tsc(`const e: Entry = {
    id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(good.ok, true, good.output);

  const sell = tsc(`const e: Entry = {
    id: 's', date: '2027-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'sell', amount: toCents(50_000), parcelSelection: 'highest-cost-base-first' },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(sell.ok, true, sell.output);

  // The selection is OPTIONAL — the default is FIFO and a user should not have to restate it — and
  // it is a closed set, so a fourth rule invented at a call site does not compile.
  const defaulted = tsc(`const e: Entry = {
    id: 's', date: '2027-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'sell', amount: toCents(50_000) }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(defaulted.ok, true, defaulted.output);
  const invented = tsc(`const e: Entry = {
    id: 's', date: '2027-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'sell', amount: toCents(50_000), parcelSelection: 'smallest-first' },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(invented.ok, false, 'a fourth selection rule must not compile');

  // MUTATION, and it is the s 110-25 ruling made structural: a buy that states no incidental costs
  // does not compile. "Nobody stated brokerage" and "there was no brokerage" are different facts;
  // `toCents(0)` is how an entry says the second.
  const noFee = tsc(`const e: Entry = {
    id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(50_000) }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(noFee.ok, false, 'a buy must state its incidental costs of acquisition, even as nil');

  // And the fields do not cross: acquisition costs on a SELL are a compile error rather than a
  // figure nobody reads (costs of sale reduce proceeds; see `disposalFromSell`).
  const crossed = tsc(`const e: Entry = {
    id: 's', date: '2027-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'sell', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(crossed.ok, false, 'a sale does not acquire anything');
  const crossedBack = tsc(`const e: Entry = {
    id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(1), incidentalCostsOfAcquisition: toCents(0), parcelSelection: 'oldest-first' },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(crossedBack.ok, false, 'a buy selects no parcel');

  for (const direction of ["'draw'", "'BUY'", "'SELL'"]) {
    const result = tsc(`const e: Entry = {
      id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
      params: { direction: ${direction}, amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(0) },
      enabled: true, createdAt: '2026-09-16',
    };\nvoid e;`);
    assert.equal(result.ok, false, `direction: ${direction} must not compile`);
  }

  // And it is still specified rather than open: a missing amount, and an invented extra field, are
  // both refused — the same bar `UnspecifiedParams` sets for the fourteen types that have none.
  const noAmount = tsc(`const e: Entry = {
    id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', incidentalCostsOfAcquisition: toCents(0) }, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(noAmount.ok, false, 'a buy must state what was paid');
  const units = tsc(`const e: Entry = {
    id: 'b', date: '2026-12-05', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(1), incidentalCostsOfAcquisition: toCents(0), units: 12 },
    enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(units.ok, false, 'a parcel holds money, not units (P2-4)');
});

test('an unspecified type can still be NARROWED on — naming it costs nothing at the call site', () => {
  // The other half of the device: declaring all nineteen must not force a consumer to handle
  // params it cannot see. Narrowing works; construction does not.
  const result = tsc(`declare const e: Entry;
if (e.type === 'VACATE_HOME') { void e.id; void e.owner; }
const names: readonly EntryType[] = ENTRY_TYPES;
void names;`);
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — an entry type NOT in concept.md’s table WILL NOT COMPILE', () => {
  // `SELL_HOME` was this probe's fictional name until 2026-09-25 (P14-13), when it became a real
  // row — `NOT_A_REAL_ENTRY_TYPE` names its own purpose instead of borrowing a live one, so this
  // probe cannot go quietly true again the next time a name it once used for fiction ships for real.
  const result = tsc(`const e: Entry = {
    id: 'z', date: '2030-01-01', owner: 'household', type: 'NOT_A_REAL_ENTRY_TYPE', params: {}, enabled: true, createdAt: '2026-09-16',
  };\nvoid e;`);
  assert.equal(result.ok, false, 'an unlisted discriminant must not be assignable');
});

test('MUTATION — an owner outside personA | personB | household WILL NOT COMPILE', () => {
  const result = tsc(`const owner: EntryOwner = 'both';\nvoid owner;`);
  assert.equal(result.ok, false, 'the owner union must be closed');
});

test('MUTATION — a MonthLine with no direction WILL NOT COMPILE (the sign lives in the field)', () => {
  const result = tsc(`const line: MonthLine = { description: 'Salary', amount: toCents(9_000) };\nvoid line;`);
  assert.equal(result.ok, false, '`direction` must be required so a negative inflow cannot pose as an outflow');
  assert.match(result.output, /direction/);
});

// --- P4-1 chunk 2b: level or event ---------------------------------------------------------------
//
// Every entry type is classified once, by what the type means, and `projection.ts` reads that
// classification to decide what an entry dated BEFORE `asAtDate` means. The thing that must be
// impossible is an UNCLASSIFIED type, and "impossible" here means a BUILD error rather than a test
// failure — so the assertions below are compile probes first and runtime checks second.

test('chunk 2b — every entry type is classified, and nothing but an entry type is', () => {
  // The runtime half. It is the weaker of the two: the compile probes below are what actually stop
  // a twentieth type landing unclassified, and this exists so a failure says WHICH name is missing.
  assert.deepEqual(Object.keys(ENTRY_KIND).sort(), [...ENTRY_TYPES].sort());
  assert.deepEqual(Object.keys(ENTRY_KIND), [...ENTRY_TYPES], 'ENTRY_KIND drifted from the table’s order');
  for (const type of ENTRY_TYPES) {
    assert.ok(['level', 'event'].includes(ENTRY_KIND[type]), `${type} is classified ${ENTRY_KIND[type]}`);
    assert.equal(entryKindOf(type), ENTRY_KIND[type]);
  }
  // Both kinds are actually used. A map that said `event` nineteen times would satisfy every
  // structural check above and would mean the classification had not been made.
  const kinds = ENTRY_TYPES.map((type) => ENTRY_KIND[type]);
  assert.ok(kinds.includes('level') && kinds.includes('event'), 'one of the two kinds is never used');
});

test('chunk 2b — the two worked examples the ruling was stated on', () => {
  // The user's own framing: "From 2020 we spend $90k a year" is still true; "in 2020 we bought a car
  // for $40k" is money already gone. If either of these ever flips, the ruling has been reversed.
  assert.equal(ENTRY_KIND.SPEND_CHANGE, 'level');
  assert.equal(ENTRY_KIND.ONE_OFF_EXPENSE, 'event');
  // And the case that shows the test is not "did it happen on a date": everything does.
  assert.equal(ENTRY_KIND.DEATH, 'level', 'reading DEATH as an event resurrects the person at month 0');
});

test('MUTATION — a TWENTIETH entry type WILL NOT COMPILE until it is classified', () => {
  // The mechanism, proved rather than described. `ENTRY_KIND` is `satisfies Record<EntryType,
  // EntryKind>`, so widening the union is a missing-property error at the map. Simulated here by
  // widening the union in the probe, which is exactly what adding a row to `ENTRY_TYPES` does —
  // and confirmed by hand against `src/core/plan.ts` itself, where a twentieth name in
  // `ENTRY_TYPES` produces TS1360 at `ENTRY_KIND` and TS7053 at `entryKindOf`.
  // `NOT_A_REAL_ENTRY_TYPE`, never a live name (2026-09-25, P14-13): `SELL_HOME` filled this role
  // until it shipped for real, and reusing a name that can ship again would go quietly true.
  const result = tsc(`type Widened = EntryType | 'NOT_A_REAL_ENTRY_TYPE';
const probe = ENTRY_KIND satisfies Record<Widened, EntryKind>;
void probe;`);
  assert.equal(result.ok, false, 'a twentieth entry type must break the build, not a test');
  assert.match(result.output, /NOT_A_REAL_ENTRY_TYPE/);
});

test('the twentieth-type probe is not vacuous — the NINETEEN do satisfy it', () => {
  // Positive control. Without this, a probe that failed for an unrelated reason (a bad import, a
  // typo in `satisfies`) would pass the mutation test above forever.
  const result = tsc(`const probe = ENTRY_KIND satisfies Record<EntryType, EntryKind>;
void probe;
const kind: EntryKind = entryKindOf('DEATH');
void kind;`);
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — a kind outside `level | event` WILL NOT COMPILE, and nor will a stray key', () => {
  // The other two directions the `satisfies` bites in: a third kind invented at a call site, and a
  // key that is not an entry type at all (which is how a renamed type would otherwise survive).
  const invented = tsc(`const kind: EntryKind = 'both';\nvoid kind;`);
  assert.equal(invented.ok, false, 'the kind union must be closed — there is no third kind');
  const stray = tsc(`const map = { ...ENTRY_KIND, NOT_A_REAL_ENTRY_TYPE: 'event' } as const satisfies Record<EntryType, EntryKind>;
void map;`);
  assert.equal(stray.ok, false, 'a key that is not an entry type must be an excess-property error');
});

test('MUTATION — `entryKindOf` has no default: a NON-entry-type argument WILL NOT COMPILE', () => {
  // The runtime alternative this chunk rejected was a lookup with `?? 'event'`. There is no such
  // fallback, and the reason it is not needed is that the argument cannot be an unclassified name.
  const result = tsc(`void entryKindOf('NOT_A_REAL_ENTRY_TYPE');`);
  assert.equal(result.ok, false, '`entryKindOf` must not accept a name outside EntryType');
});

test('CANARY — the `satisfies` clause that makes ENTRY_KIND exhaustive is still there', () => {
  // A SURVIVOR, found by mutation and closed here. Deleting `satisfies Record<EntryType, EntryKind>`
  // failed ZERO tests: with nineteen keys present, `as const` alone still produces an object every
  // probe accepts. The clause's whole value is what it does on the day a TWENTIETH type is added —
  // it is a tripwire, and a tripwire cannot be tested by walking around it. So it is asserted as
  // text, the way this repo asserts the absence of a clock read.
  const executable = PLAN_SOURCE.split('\n')
    .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
    .join('\n');
  // Vacuity control: the filter left the map itself behind.
  assert.match(executable, /export const ENTRY_KIND = \{/, 'the comment filter removed ENTRY_KIND');
  assert.match(executable, /\} as const satisfies Record<EntryType, EntryKind>;/);

  // And the other half of the mechanism: no fallback anywhere on this path, in either module. A
  // `?? 'event'` would answer the question by accident for a type nobody classified.
  const PROJECTION_SOURCE = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8');
  for (const [name, text] of [['plan.ts', PLAN_SOURCE], ['projection.ts', PROJECTION_SOURCE]]) {
    const code = text.split('\n').filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//')).join('\n');
    assert.equal(/\?\?\s*'(level|event)'/.test(code), false, `${name} has a default kind — an unclassified type must be a build error`);
    assert.equal(/ENTRY_KIND\[[^\]]*\]\s*\?\?/.test(code), false, `${name} falls back on an ENTRY_KIND lookup`);
  }
  // The control for the control: the same two regexes DO fire on text that has the defect.
  assert.equal(/\?\?\s*'(level|event)'/.test("const k = ENTRY_KIND[type] ?? 'event';"), true);
  assert.equal(/ENTRY_KIND\[[^\]]*\]\s*\?\?/.test('const k = ENTRY_KIND[entry.type] ?? fallback;'), true);
});
