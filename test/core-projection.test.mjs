// P4-1 chunks 1 and 2b — `project()`'s month walk, the clock it must never read, and what an entry
// dated BEFORE the walk means.
//
// The module under test contains no arithmetic, so there is no number here to check. What CAN go
// wrong is the shape of time — a month emitted twice, a month skipped at a year boundary, a
// disabled entry applying anyway — and, above all, a `Date.now()` creeping in under `project()`,
// which would make ADR-0002's promise that a comparison run months ago still reproduces simply
// false. So every test below is written to fail on a specific mutation, and the two that matter
// most carry a VACUITY CONTROL: a test that would pass whether or not the clock was faked, or
// whether or not the source filter left the module behind, proves nothing at all.
//
// **Chunk 2b** replaced chunk 1's blanket refusal of any entry dated outside the horizon with the
// user's ruling of 2026-09-17: each entry TYPE is a level or an event, classified once in
// `plan.ts`, and a pre-dated level stands from month 0 while a pre-dated event applies nowhere and
// is not refused. Its tests are at the bottom of the walk section, and the fixture they use is
// built so that a wrong classification is a wrong MONEY FIGURE — not merely a wrong count of ids.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { assertIsoMonth, monthOf, nextMonth, project } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8');

/**
 * A module's EXECUTABLE text: every whole-line comment removed — `//`, a block comment's `*`
 * continuation lines, and a one-line `/** … *\/` doc comment, which is the form that made the
 * first draft of this canary go red on its own prose. Deliberately blunt in the safe direction: it
 * over-removes into doc comments sooner than it lets a real clock read pass as commentary.
 */
const stripComments = (text) =>
  text
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');

// --- The fixture -------------------------------------------------------------------------------
//
// A couple twelve years apart, so "the LATER of the two" is a distinguishable ruling rather than a
// coincidence, and a horizon of 100 that took the older partner would be 12 years — 144 months —
// short. Every field is stated; none is defaulted.

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const HOUSEHOLD = {
  persons: [person('A', '1962-04-17'), person('B', '1974-11-02')],
  homeStatus: 'occupied',
};

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 100,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  // `DeemingRatesSetting` is `{ lower, upper }` (data/assumptions/settings.ts). Chunk 1 wrote
  // `{ lowerRate, upperRate }` here and nothing noticed, because chunk 1 never read the field and a
  // `.mjs` fixture is not type-checked. Chunk 2 passes it to `resolveDeemingRates`, where the wrong
  // spelling reaches `mulCents` as `undefined` and throws `not a finite rate`. Corrected, not
  // renamed: these are the 20 September 2026 determined rates, which is what this fixture meant.
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const ENTRIES = [
  { id: 'z', date: '2036-06-30', owner: 'personA', type: 'RETIRE', params: {}, enabled: true, createdAt: '2026-09-16' },
  // Zero days and a nil salary: this Household states no employment income at all, so the pair the
  // door allows here is the zero one — a positive `daysPerWeek` must now state the money those days
  // pay (`plan.ts`, 2026-09-19), and any positive figure would put a salary line into a fixture whose
  // whole point is the entry BOOKKEEPING. `wpc` below keeps the three-day case, where a standing
  // `RETIRE` makes a stated salary inert.
  { id: 'b', date: '2032-07-01', owner: 'personB', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 0, annualSalary: toCents(0) }, enabled: true, createdAt: '2026-09-16' },
  { id: 'c', date: '2036-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(90_000) }, enabled: false, note: 'slow-go', createdAt: '2026-09-16' },
  { id: 'd', date: '2029-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(45_000) }, enabled: true, createdAt: '2026-09-16' },
  { id: 'e', date: '2036-06-02', owner: 'personB', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(1_000) }, enabled: true, createdAt: '2026-09-16' },
];

// --- The source-text canary ----------------------------------------------------------------------

test('CANARY — projection.ts reads no clock (P4-1a, ADR-0002)', () => {
  const executable = stripComments(SOURCE);
  // Vacuity control FIRST: prove the comment filter left the module's executable text behind. A
  // filter that stripped everything would make all three assertions below pass on an empty string.
  assert.match(executable, /export const project =/, 'the comment filter removed the module itself');
  assert.match(executable, /asAtDate/);
  assert.ok(executable.length > 1_000, `the filter left only ${executable.length} characters`);

  assert.equal(/\bDate\.now\s*\(/.test(executable), false, 'projection.ts reads the system clock');
  assert.equal(/\bnew Date\s*\(\s*\)/.test(executable), false, 'projection.ts constructs a clock-reading Date');
  // Stronger than the two above and the reason this canary can stay green: the module names no
  // `Date` at all, so there is no clock-adjacent construct for a later edit to reach for.
  assert.equal(/\bDate\b/.test(executable), false, 'projection.ts mentions Date — the walk is string arithmetic');
});

test('CANARY — the same filter DOES catch a clock read (the canary is not vacuous)', () => {
  // The control for the control: run the identical filter over text that does read the clock and
  // require it to go red. Without this, a broken regex would make the test above pass forever.
  const planted = [
    '// Date.now() in a comment must NOT trip it',
    '/** Nor `new Date()` in a one-line doc comment. */',
    ' * Nor Date.now() in a block comment body.',
    'const t = Date.now();',
  ].join('\n');
  const executable = stripComments(planted);
  assert.equal(/\bDate\.now\s*\(/.test(executable), true, 'the filter or the regex no longer detects a clock read');
  assert.equal(/\bnew Date\s*\(\s*\)/.test('const d = new Date();'), true);
  // And a comment alone does not trip it, so the canary is not merely a ban on the word.
  assert.equal(/\bDate\b/.test(stripComments('// Date.now()\n/** new Date() */')), false);
});

// --- The month walk ------------------------------------------------------------------------------

test('the walk starts at asAtDate’s month and is ascending, contiguous and gap-free', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES).map((m) => m.month);
  assert.equal(months[0], '2026-09');
  assert.equal(new Set(months).size, months.length, 'a month was emitted twice');
  for (let i = 1; i < months.length; i += 1) {
    assert.ok(months[i] > months[i - 1], `months out of order at ${months[i - 1]} → ${months[i]}`);
    assert.equal(months[i], nextMonth(months[i - 1]), `a gap between ${months[i - 1]} and ${months[i]}`);
  }
});

test('every financial-year boundary in the walk is present — both the June and the July side', () => {
  // A skipped month is invisible in a length check if something else compensates, and 1 July is
  // where a projection is most likely to lose one (P4-2 makes the FY a first-class boundary).
  const months = new Set(project(SETTINGS, HOUSEHOLD, ENTRIES).map((m) => m.month));
  for (let year = 2027; year <= 2074; year += 1) {
    assert.ok(months.has(`${year}-06`), `${year}-06 is missing from the walk`);
    assert.ok(months.has(`${year}-07`), `${year}-07 is missing from the walk`);
  }
});

test('the horizon is the LATER person’s 100th birthday month, inclusive', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES).map((m) => m.month);
  // Person B, born 1974-11, turns 100 in 2074-11. Person A would have stopped the walk in 2062-04.
  assert.equal(months.at(-1), '2074-11', 'the horizon did not take the later of the two persons');
  assert.ok(months.includes('2074-11'), 'the horizon month itself must be emitted (inclusive)');
  assert.equal(months.includes('2074-12'), false, 'the walk ran past the horizon month');
});

test('the month COUNT is derived from the two dates, not asserted as a constant', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  // 2026-09 .. 2074-11 inclusive, counted independently of the walk that produced it.
  const expected = (2074 - 2026) * 12 + (11 - 9) + 1;
  assert.equal(months.length, expected);
  assert.equal(months.length, 579);
});

test('a single-person Household projects too — `persons` is one OR two (household.ts)', () => {
  const months = project(SETTINGS, { persons: [person('A', '1962-04-17')], homeStatus: 'occupied' }, []);
  assert.equal(months[0].month, '2026-09');
  assert.equal(months.at(-1).month, '2062-04');
});

test('a horizon already passed is REFUSED, not returned as an empty walk', () => {
  assert.throws(
    () => project({ ...SETTINGS, planningHorizonAge: 40 }, HOUSEHOLD, []),
    /Planning Horizon .* is before asAtDate/,
  );
});

// --- appliedEntryIds -----------------------------------------------------------------------------

test('an EVENT applies in the month of its own date and in no other — and a LEVEL governs onward (P4-4)', () => {
  // ⚠️ **REWRITTEN BY P4-4, not deleted.** This read `where('z') === ['2036-06']` and
  // `where('b') === ['2032-07']` until 2026-09-18, on a reading of "applied" that made a standing
  // fact citable in exactly one month of the walk — so month 500's spending, retirement and work
  // pattern had no traceable cause in the `Month` that reported them. `appliedEntryIds` now cites
  // the entries that GOVERN a month. The event half is untouched, and that is the pair.
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  const where = (id) => months.filter((m) => m.appliedEntryIds.includes(id)).map((m) => m.month);
  // `d` is an ONE_OFF_EXPENSE — an `ENTRY_KIND` event. One month, exactly as before.
  assert.deepEqual(where('d'), ['2029-03']);
  assert.deepEqual(where('e'), ['2036-06']);
  // `z` is a RETIRE and `b` a WORK_PATTERN_CHANGE — levels. Each is cited from its own month to the
  // horizon, and in NO month before it: a retirement that had not happened yet must not be cited.
  assert.equal(where('z')[0], '2036-06');
  assert.equal(where('z').at(-1), '2074-11');
  assert.equal(where('z').length, months.filter((m) => m.month >= '2036-06').length);
  assert.equal(where('b')[0], '2032-07');
  assert.equal(where('b').length, months.filter((m) => m.month >= '2032-07').length);
  // Before 2032-07 the only citation anywhere in the walk is the 2029 event, in its own month.
  assert.deepEqual(
    months.filter((m) => m.month < '2032-07').flatMap((m) => m.appliedEntryIds.map((id) => [m.month, id])),
    [['2029-03', 'd']],
  );
});

test('two entries in the same month are both reported, in the Scenario’s own order', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  const june = months.find((m) => m.month === '2036-06');
  // The two ids are deliberately chosen so that INPUT order (`z` before `e`) differs from both
  // alphabetical order and date order (`e` is the 2nd, `z` the 30th). An earlier draft used `a`
  // and `e`, where all three orders coincided — and three mutations (sorting the ids, walking the
  // entries in reverse, ordering by date) therefore failed ZERO tests. The fixture is the
  // assertion here; with the old ids this test proved nothing.
  // **P4-4 APPENDS and never reorders**: the month's own entries keep the Scenario's order at the
  // front, and the levels still in force follow — here `b`, person B's 2032 work pattern, which is
  // still governing this month and was cited nowhere near it before. `z` is in force too and is not
  // repeated: the array is deduplicated.
  assert.deepEqual([...june.appliedEntryIds], ['z', 'e', 'b'], 'input order is the Scenario order (ADR-0002)');
  assert.deepEqual([...june.appliedEntryIds].slice(0, 2), ['z', 'e']);
  assert.equal(new Set(june.appliedEntryIds).size, june.appliedEntryIds.length, 'an id was cited twice');
});

test('a DISABLED entry never appears in any month — `enabled: false` is the delete (ADR-0002)', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  const sightings = months.filter((m) => m.appliedEntryIds.includes('c'));
  assert.deepEqual(sightings, [], 'a disabled entry applied');
  // And the month it WOULD have landed in exists and cites only the levels standing over it — `z`,
  // the retirement of the month before, and `b` — so the absence is the flag doing the work rather
  // than the month being missing. (It was `[]` before P4-4; `c` is absent from both readings.)
  // The standing run is OLDEST-GOVERNING FIRST: `b` has been in force since 2032-07 and `z` only
  // since the month before this one.
  assert.deepEqual([...months.find((m) => m.month === '2036-07').appliedEntryIds], ['b', 'z']);
});

test('every id reported is an id that was passed in, and every enabled in-window id is reported', () => {
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  // **A SET since P4-4**: a level is cited in every month it governs, so the flat list repeats ids
  // by design. What must still hold exactly is the two-way containment — nothing is reported that
  // was not passed in, and nothing enabled and in-window goes unreported.
  const reported = new Set(months.flatMap((m) => [...m.appliedEntryIds]));
  const enabled = ENTRIES.filter((e) => e.enabled).map((e) => e.id);
  assert.deepEqual([...reported].sort(), [...enabled].sort());
});

test('an enabled entry dated AFTER the horizon is REFUSED, naming the entry — it does not vanish', () => {
  // Chunk 2b kept this half of chunk 1's refusal and dropped the other half. The two cases are not
  // symmetric: a before-the-walk entry has a meaning to recover (`ENTRY_KIND` recovers it), and an
  // after-the-horizon one has none — a level dated past the last month has no month to stand from
  // and an event has no month to occur in. So it is far likelier to be a mistyped year than an
  // intention, and dropping it silently would hide the typo where the user cannot see it. A user
  // who means "ignore this" has `enabled: false`.
  const after = { ...ENTRIES[3], id: 'future', date: '2099-01-01' };
  assert.throws(() => project(SETTINGS, HOUSEHOLD, [after]), /entry future .* after the Planning Horizon 2074-11/);
  // And the boundary is the horizon month itself, inclusive: one month later throws, that month does not.
  const onIt = { ...ENTRIES[3], id: 'edge', date: '2074-11-30' };
  assert.equal(project(SETTINGS, HOUSEHOLD, [onIt]).at(-1).appliedEntryIds.includes('edge'), true);
  const past = { ...ENTRIES[3], id: 'over', date: '2074-12-01' };
  assert.throws(() => project(SETTINGS, HOUSEHOLD, [past]), /entry over .* after the Planning Horizon/);
});

// --- P4-1 chunk 2b: an entry dated BEFORE the walk ------------------------------------------------
//
// The user's ruling of 2026-09-17. A pre-dated entry is read by its TYPE's kind: a `level` is a
// standing state that is still true and applies from month 0; an `event` already happened and was
// already paid, so it applies nowhere and is NOT refused.
//
// **The fixture is the assertion here**, in two ways this file has been burned by before.
//
// (1) THREE superseded levels, not two. With two, "the latest by date wins" and "the last one in
// the input wins" can be the same entry and neither is tested. These three are ordered so that
// INPUT order, DATE order and ALPHABETICAL order each pick a DIFFERENT one — and each carries a
// different `annualSpend`, so a wrong pick is a wrong NUMBER and not merely a wrong id.
//
// (2) The figures differ between the two classifications. Flipping `SPEND_CHANGE` to `event` makes
// the standing level at month 0 vanish; flipping `ONE_OFF_EXPENSE` to `level` charges the 2020 car
// again, moving the one-off total from $1,000 to $46,000. Both are asserted as money.

const PAST_ENTRIES = [
  // input order: s-mid, a-late, z-early.  date order: z-early, s-mid, a-late.  alphabetical: a, s, z.
  { id: 's-mid', date: '2021-05-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(72_000) }, enabled: true, createdAt: '2021-05-01' },
  { id: 'a-late', date: '2024-02-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(96_000) }, enabled: true, createdAt: '2024-02-01' },
  { id: 'z-early', date: '2019-08-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2019-08-01' },
  // An EVENT before the walk: the car was bought in 2020 and the money is already gone.
  { id: 'car', date: '2020-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(45_000) }, enabled: true, createdAt: '2020-03-01' },
  // A LEVEL before the walk, per person: two standing facts, not one superseding the other.
  { id: 'retA', date: '2023-06-30', owner: 'personA', type: 'RETIRE', params: {}, enabled: true, createdAt: '2023-06-30' },
  { id: 'retB', date: '2022-01-15', owner: 'personB', type: 'RETIRE', params: {}, enabled: true, createdAt: '2022-01-15' },
  // A second LEVEL for person A, of a DIFFERENT type: the supersession key is type AND owner, so
  // this stands alongside `retA` rather than one of them swallowing the other.
  // Three days a week at a STATED $48,000 (`plan.ts`, 2026-09-19) — and the figure moves nothing,
  // because `retA` above stands over the same Person from 2023 and `RETIRE` beats a work pattern in
  // either order. The salary is the level this fixture does NOT test; the supersession key is.
  { id: 'wpc', date: '2020-11-01', owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(48_000) }, enabled: true, createdAt: '2020-11-01' },
  // And one ordinary in-walk event, so the totals below are not all drawn from the past.
  { id: 'roof', date: '2029-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(1_000) }, enabled: true, createdAt: '2026-09-16' },
];

const byId = new Map(PAST_ENTRIES.map((e) => [e.id, e]));

/**
 * The money the Waterfall will be charged for one-off expenses across the whole walk: every applied
 * `ONE_OFF_EXPENSE` id, resolved back to its own `amount`. A FIGURE, not a count — `car` and `roof`
 * differ by a factor of 45, so an extra sighting cannot be mistaken for the right answer.
 */
const oneOffTotal = (months) =>
  months
    .flatMap((m) => [...m.appliedEntryIds])
    .map((id) => byId.get(id))
    .filter((e) => e.type === 'ONE_OFF_EXPENSE')
    .reduce((total, e) => total + e.params.amount, 0);

/** The Household's standing annual spending level in one month, read off what applied in it. */
const standingSpendIn = (month) => {
  const spends = [...month.appliedEntryIds].map((id) => byId.get(id)).filter((e) => e.type === 'SPEND_CHANGE');
  assert.ok(spends.length <= 1, `${month.month} carries ${spends.length} spending levels at once`);
  return spends[0]?.params.annualSpend;
};

test('chunk 2b — a LEVEL dated before the walk applies from MONTH 0, and the figure is the LATEST one', () => {
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES);
  // The number, not the id: $96,000 is `a-late`. $72,000 would be first-in-input, $60,000 would be
  // last-in-input or alphabetically-last, and `undefined` would be `SPEND_CHANGE` read as an event.
  assert.equal(standingSpendIn(months[0]), toCents(96_000));
  assert.equal(months[0].month, '2026-09');
});

test('chunk 2b — superseded levels do not double-apply: three become ONE, and the other two apply NOWHERE', () => {
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES);
  const where = (id) => months.filter((m) => m.appliedEntryIds.includes(id)).map((m) => m.month);
  // **P4-4 changed the first of these three and NOT the other two, which is the whole finding.**
  // `a-late` is the level that survived supersession, so it governs every month of the walk and is
  // cited in every one of them — it used to be cited in month 0 alone. The two levels it superseded
  // are cited NOWHERE, before and after: being superseded is not being in force.
  assert.equal(where('a-late').length, 579);
  assert.equal(where('a-late')[0], '2026-09');
  assert.deepEqual(where('s-mid'), [], 'a superseded level applied anyway');
  assert.deepEqual(where('z-early'), [], 'a superseded level applied anyway');
  // And it is still ONE standing state and not a recurring charge: every month carries exactly one
  // spending level (`standingSpendIn` refuses two), and the money is charged once a month, not
  // once per citation — asserted as a dollar figure in the walk test below.
  assert.equal(months.filter((m) => standingSpendIn(m) !== undefined).length, 579);
  assert.equal(new Set(months.map((m) => standingSpendIn(m))).size, 1);
});

test('chunk 2b — an EVENT dated before the walk applies NOWHERE and does NOT refuse', () => {
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES); // no throw — chunk 1 threw here.
  assert.deepEqual(months.filter((m) => m.appliedEntryIds.includes('car')).map((m) => m.month), []);
  // The FIGURE: $1,000 is the roof alone. Reading `ONE_OFF_EXPENSE` as a level would replay the
  // 2020 car in month 0 and charge $46,000 — money the household has already spent.
  assert.equal(oneOffTotal(months), toCents(1_000));
});

test('chunk 2b — supersession is keyed by type AND owner, and both halves of the key are load-bearing', () => {
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES);
  const first = [...months[0].appliedEntryIds];
  // Same type, two owners: two standing facts. A key of `type` alone would drop one of these.
  assert.ok(first.includes('retA'), 'person A’s retirement was superseded by person B’s');
  assert.ok(first.includes('retB'), 'person B’s retirement was superseded by person A’s');
  // Same owner, two types: also two standing facts. A key of `owner` alone would drop `wpc`, which
  // is dated earliest of person A's two — so the FIGURE below would come back undefined.
  const pattern = [...months[0].appliedEntryIds].map((id) => byId.get(id)).filter((e) => e.type === 'WORK_PATTERN_CHANGE');
  assert.equal(pattern.length, 1, 'person A’s standing work pattern was superseded by their retirement');
  assert.equal(pattern[0].params.daysPerWeek, 3, 'the standing work pattern at month 0 is three days a week');
  // And a level that IS still standing is cited in every month it stands over — all 579 of them
  // since P4-4, where it used to be month 0 alone. Nothing supersedes it, so it never stops.
  assert.equal(months.filter((m) => m.appliedEntryIds.includes('wpc')).length, 579);
  assert.equal(months.filter((m) => m.appliedEntryIds.includes('wpc'))[0].month, '2026-09');
});

test('chunk 2b — month 0 carries the carried levels oldest-first, ahead of anything dated in month 0', () => {
  // Zero days since retire flow S3 (2026-09-29): at three days a week this entry, dated after `retA`,
  // is person A going back to work, and the walk then refuses it because every account A holds is a
  // pension. The fixture is about ORDER, and a zero-day pattern is never a return, so it still is.
  const inMonthZero = { ...PAST_ENTRIES[6], id: 'now', date: '2026-09-20', params: { daysPerWeek: 0, annualSalary: toCents(0) } };
  const months = project(SETTINGS, HOUSEHOLD, [...PAST_ENTRIES, inMonthZero]);
  // wpc 2020-11, retB 2022-01, retA 2023-06, a-late 2024-02 — by their own dates — then the entry
  // actually dated in the month. An id-sorted or input-ordered result fails here.
  assert.deepEqual([...months[0].appliedEntryIds], ['wpc', 'retB', 'retA', 'a-late', 'now']);
});

test('chunk 2b — a DISABLED level before the walk carries nothing, and the next one down stands', () => {
  // `enabled: false` is still the append-only delete (ADR-0002), and it reaches the supersession:
  // disabling the latest level must promote the one before it, not leave month 0 with no level.
  const entries = PAST_ENTRIES.map((e) => (e.id === 'a-late' ? { ...e, enabled: false } : e));
  const months = project(SETTINGS, HOUSEHOLD, entries);
  assert.equal(standingSpendIn(months[0]), toCents(72_000), 'disabling the latest level did not promote `s-mid`');
  assert.deepEqual(months.filter((m) => m.appliedEntryIds.includes('a-late')), []);
});

test('chunk 2b — a tie on date is broken by the Scenario’s own order, LAST stated winning', () => {
  const tied = [
    { ...PAST_ENTRIES[0], id: 'first-stated', date: '2024-02-01', params: { annualSpend: toCents(50_000) } },
    { ...PAST_ENTRIES[0], id: 'last-stated', date: '2024-02-01', params: { annualSpend: toCents(51_000) } },
  ];
  const months = project(SETTINGS, HOUSEHOLD, tied);
  const spend = [...months[0].appliedEntryIds].map((id) => tied.find((e) => e.id === id)).filter(Boolean);
  assert.deepEqual(spend.map((e) => e.id), ['last-stated']);
  assert.equal(spend[0].params.annualSpend, toCents(51_000));
});

// --- P4-4: the array is PROVENANCE, and a line with no traceable cause is the hole it closes ------

test('P4-4 — month 200’s spending line names the 2019 entry that decided it', () => {
  // **THE AUDIT-TRAIL HOLE, in one month.** ADR-0002 and ADR-0006 ask `appliedEntryIds` to be what
  // a user reads to find out WHY a figure is what it is. Before 2026-09-18 the $8,000.00 charged in
  // 2043-05 could be traced to nothing: `a-late` was cited in month 0 and in no other, so the
  // 194th, 300th and 579th months each reported a spending line with an empty array beside it.
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES);
  const late = months[200];
  assert.equal(late.month, '2043-05');
  assert.deepEqual(
    late.lines.filter((l) => l.description === 'Household spending').map((l) => l.amount),
    [toCents(8_000)],
  );
  // The cause, resolved from the month's OWN array — a twelfth of `a-late`'s $96,000, to the cent.
  const cause = [...late.appliedEntryIds].map((id) => byId.get(id)).filter((e) => e.type === 'SPEND_CHANGE');
  assert.equal(cause.length, 1);
  assert.equal(cause[0].id, 'a-late');
  assert.equal(cause[0].params.annualSpend / 12, toCents(8_000));
  // And the other two standing facts are there too: person A's work pattern and both retirements.
  assert.deepEqual([...late.appliedEntryIds], ['wpc', 'retB', 'retA', 'a-late']);
  // Nothing dated in that month, so every id in it is a standing one — which is the whole change.
  assert.deepEqual(PAST_ENTRIES.filter((e) => e.date.startsWith('2043-05')), []);
});

test('chunk 2b — the walk itself is unchanged by pre-dated entries: same months, same money', () => {
  // A standing level applying in month 0 must not add a month or move the horizon.
  const months = project(SETTINGS, HOUSEHOLD, PAST_ENTRIES);
  assert.equal(months.length, 579);
  assert.equal(months[0].month, '2026-09');
  assert.equal(months.at(-1).month, '2074-11');

  // **Chunk 4 gave this fixture money, and the figures are the standing level's.** Until then every
  // `lines` here was empty and this test asserted so. The surviving `SPEND_CHANGE` is `a-late` at
  // $96,000 a year — $8,000.00 a month, which divides exactly — and this Household has no income of
  // any kind, so every month of the walk is a full, unfunded $8,000.00.
  const spending = (month) => month.lines.filter((l) => l.description === 'Household spending').map((l) => l.amount);
  const shortfall = (month) => month.lines.filter((l) => l.description === 'Unfunded shortfall').map((l) => l.amount);
  assert.deepEqual(spending(months[0]), [toCents(8_000)]);
  assert.deepEqual(shortfall(months[0]), [toCents(8_000)]);
  // $72,000 ÷ 12 would be $6,000.00 and $60,000 ÷ 12 would be $5,000.00: the level that survived is
  // a DOLLAR FIGURE here and not merely an id in `appliedEntryIds`.
  assert.notDeepEqual(spending(months[0]), [toCents(6_000)]);
  assert.notDeepEqual(spending(months[0]), [toCents(5_000)]);
  // The level HOLDS for all 579 months. The balance holds at nil — a shortfall floors it there
  // rather than letting it run to −$4.6m — UNTIL 2051-04, and that month is the Age Pension's, not
  // this test's (user ruling 2026-09-23). With no series stated the rate indexes on the plan's own
  // growth rates: `cpi: 0` holds this $8,000 nominal, while the basic rate rises by √1.025 a half-year
  // and, from about 2038, by the MTAWE floor's √1.035. Hand-worked, the couple's maximum rate first
  // tops $8,000 a month at the 20 Mar 2051 indexation (the 49th): combined basic $3,555.86 +
  // $133.00 + $21.20 = $3,710.06 a fortnight, × 26 ÷ 12 = $8,038.46. The month before it is $7,907.08.
  for (const month of months) {
    assert.deepEqual(spending(month), [toCents(8_000)], `${month.month} lost the spending level`);
    if (month.month >= '2051-04') continue;
    assert.equal(month.openingBalance, toCents(0));
    assert.equal(month.closingBalance, toCents(0));
  }
  const overtaken = months.find((m) => m.month === '2051-04');
  assert.equal(overtaken.openingBalance, toCents(0));
  assert.equal(overtaken.closingBalance, 803_846 - toCents(8_000));
  assert.ok(months.filter((m) => m.month > '2051-04').every((m) => m.closingBalance > 0));
  // The in-walk `roof` event is charged in its own month and in no other, and the shortfall that
  // month is $8,000.00 + $1,000.00. The 2020 `car` is charged NOWHERE — it was already paid.
  const roofMonths = months.filter((m) => m.lines.some((l) => l.description === 'One-off expense'));
  assert.deepEqual(roofMonths.map((m) => m.month), ['2029-03']);
  assert.deepEqual(roofMonths[0].lines.filter((l) => l.description === 'One-off expense').map((l) => l.amount), [toCents(1_000)]);
  assert.deepEqual(shortfall(roofMonths[0]), [toCents(9_000)]);
  assert.notDeepEqual(shortfall(roofMonths[0]), [toCents(54_000)]); // the $45,000 car, replayed
});

test('a DISABLED entry outside the horizon does NOT refuse — disabling silences it', () => {
  // Chunk 2b narrowed what "refuse" still covers, so this now tests the AFTER-horizon case, which
  // is the only one that still throws. A 2019 date would pass here under chunk 2b whether or not
  // `enabled` were honoured, because an out-of-range EVENT no longer refuses either — so the date
  // is 2099 and the test is about the flag again.
  const months = project(SETTINGS, HOUSEHOLD, [{ ...ENTRIES[3], id: 'future', date: '2099-01-01', enabled: false }]);
  assert.equal(months.length, 579);
  assert.deepEqual(months.flatMap((m) => [...m.appliedEntryIds]), []);
  // And a disabled LEVEL before the walk is silent too: it carries nothing into month 0.
  const level = { ...ENTRIES[2], id: 'old-level', date: '2019-01-01', enabled: false };
  assert.deepEqual(project(SETTINGS, HOUSEHOLD, [level]).flatMap((m) => [...m.appliedEntryIds]), []);
});

// --- Everything else empty, and honestly so ------------------------------------------------------

test('a Household with no income and no spending level invents no number — and now it has a pension', () => {
  // This read "every money figure is zero and every `lines` is empty" through chunks 1–3. Chunk 4
  // left most of it true and could not leave all of it true: `ENTRIES` carries two enabled
  // `ONE_OFF_EXPENSE`s, and a one-off is money the Household must find. What chunk 4 must NOT do is
  // invent a spending line for a Household nobody asked — `ENTRIES`' only `SPEND_CHANGE` is
  // DISABLED, and "nobody stated a level" is not "a level of nil" (ADR-0009's "no waterfall step
  // that fires on a zero balance", applied to the target rather than to a source).
  //
  // ⚠️ **AND THE STANDING TABLE (P4-1e, 2026-09-21) TAKES THE REST OF THE ZEROES.** Nothing about
  // this Household changed: it still holds nothing, earns nothing and states no spending level. What
  // changed is that A, born 1962-04-17, reaches Age Pension age on 2029-04-17 and the walk can now
  // compute the entitlement past 19 March 2027 instead of emitting no line at all. So from 2029-05
  // this Household has an INCOME, and the balances stop being nil — which is the defect the ruling
  // was taken to close, showing up in the fixture built to assert its absence. The parts of this
  // test that are about INVENTION are unchanged and are what it still defends.
  const months = project(SETTINGS, HOUSEHOLD, ENTRIES);
  const charged = new Map();
  for (const month of months) {
    assert.deepEqual(month.lines.filter((l) => l.description === 'Household spending'), []);
    assert.equal(month.protectedAssets, toCents(0), 'nothing here is protected — there is no super');
    if (month.lines.length > 0) charged.set(month.month, month.lines.map((l) => [l.direction, l.description, l.amount]));
  }

  // THE PENSION, hand-worked, because a figure this test did not used to contain is the one it now
  // turns on. It stood at $2,021.50 on the carried 20 September 2026 sets; from 2026-09-23 no series
  // stated means the rates INDEX on this plan's own growth rates, five half-years of them by 2029-05:
  //   combined basic      $1,711.80 × √1.025 ⁵ (PBLCI beats a nil CPI; the MTAWE floor is below) = $1,820.81
  //   Pension Supplement  $133.00, unmoved — it follows CPI alone, and CPI is nil here
  //   Energy Supplement   $21.20, never indexed                          → $1,975.01 combined
  //   both means tests are nil — this Household opens 2029-05 holding nothing at all
  //   halved, and only A is eligible: $987.51 a fortnight × 26 ÷ 12           = $2,139.60 a month
  // A turns 67 on 2029-04-17 and a month is read on its FIRST day, so April is still short of it.
  assert.deepEqual(months.find((m) => m.month === '2029-04').lines, []);
  assert.deepEqual(charged.get('2029-05'), [['inflow', 'Age Pension', 213_960]]);
  assert.equal(months.find((m) => m.month === '2029-05').closingBalance, 213_960);
  assert.equal(months.find((m) => m.month === '2029-04').closingBalance, toCents(0));

  // The $45,000 one-off still lands in 2029-03, two months BEFORE the first payment, so it is still
  // wholly unfunded — and it is the LAST such month in the walk, which is the whole change: with a
  // pension arriving, a Household that could fund nothing can now fund something.
  assert.deepEqual(charged.get('2029-03'), [
    ['outflow', 'One-off expense', toCents(45_000)],
    ['inflow', 'Unfunded shortfall', toCents(45_000)],
  ]);
  assert.deepEqual(
    months.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).map((m) => m.month),
    ['2029-03'],
  );
  // And `$45,000` against `$1,000` is a factor of 45, so a replayed or misdated charge is a
  // different number. The $1,000 one-off is met in full out of banked pension — no shortfall line
  // beside it, where before this ruling there was one.
  // Nineteen half-years on, still A alone and nothing assessed: $2,164.37 + $133.00 + $21.20 =
  // $2,318.57 combined, the MTAWE floor still below the PBLCI limb; halved to $1,159.29, × 26 ÷ 12
  // = $2,511.79.
  assert.deepEqual(charged.get('2036-06'), [
    ['inflow', 'Age Pension', 251_179],
    ['outflow', 'One-off expense', toCents(1_000)],
  ]);

  // **THE MEANS TEST CLOSES THE LOOP, and this is the cleanest fixture in the suite for it.** The
  // Household banks every payment and spends almost none of it, so its own Offset balance is
  // assessed against it and the pension FALLS across the walk. A carried table that were merely a
  // constant would pay the same figure in 2074 as in 2029.
  const last = months.at(-1);
  const pensionIn = (month) => month.lines.filter((l) => l.description === 'Age Pension').reduce((t, l) => t + l.amount, 0);
  assert.ok(pensionIn(last) > 0);
  // The couple's maximum at 2074-11, hand-worked the same way, is $17,625.68 a month: the figure
  // paid is below it, which is the assets test and not the rate.
  assert.ok(pensionIn(last) < 1_762_568, 'the assets test bites as the Offset fills');
  // All of it is the Offset and all of it is assessed — but at the balance the month OPENS with,
  // which is the repo's clock rule and is why this is not `closingBalance`: the gap between the two
  // is exactly this month's own payment, arriving after the assessment that produced it.
  assert.equal(last.openingBalance, last.assessableAssets);
  assert.equal(last.closingBalance - last.assessableAssets, pensionIn(last));

  // The `Month` shape is fully populated: a field silently omitted would read as `undefined`, not
  // as a defensible zero.
  assert.deepEqual(
    Object.keys(months[0]).sort(),
    // P4-6 added `accessibleAssets`: the money this Household could actually spend, at the close.
    // **P4-4's polish added `notes` (2026-09-18)**, and this Household is exactly the one it was
    // built for: four limbs with nothing in any of them, every month, each saying which kind of
    // nothing it is rather than being absent from the output altogether.
    // **P5-3 limb 2 added `provenance` (2026-09-18)** — and month 0 is still the empty-but-present
    // case at the MONTH level: it has no line at all, so no register carried anything, and the
    // month says that in a field rather than by having none.
    // **P7-6 added `assetsByPerson` (2026-09-19)** — the three asset figures per Person.
    // **`superBalance` and `incomeFromSuper` (2026-09-23)** — the combined super at the close and
    // the cash paid out of it; both nil here, and both present.
    // **`assetsTestThresholds` (2026-09-25)** — the assets test's free area and cut-off, present
    // because an entitlement was computed this month (nil as it is).
    ['accessibleAssets', 'appliedEntryIds', 'assessableAssets', 'assetsByPerson', 'assetsTestThresholds', 'closingBalance', 'closingNonSuperPortfolio', 'incomeFromSuper', 'lines', 'month', 'notes', 'openingBalance', 'protectedAssets', 'provenance', 'superBalance'],
  );
  // Month 0 is still wholly empty, and the walk's first months still carry nothing at all: the
  // pension is a fact about 2029 onward and not a figure sprayed over the fixture.
  assert.equal(months[0].accessibleAssets, toCents(0));
  assert.deepEqual([...months[0].provenance.registers], []);
  assert.equal(months[0].provenance.confidence, 'nothing carried');
  // And from the first paid month the register IS carried, which is the other half of the same
  // claim: 'nothing carried' must mean nothing was, not that nothing ever is.
  const paid = months.find((m) => m.month === '2029-05');
  assert.deepEqual([...paid.provenance.registers], ['Age Pension']);
  assert.notEqual(paid.provenance.confidence, 'nothing carried');
});

// --- Purity and determinism ----------------------------------------------------------------------

test('project() is pure: repeated calls agree and the inputs are not mutated', () => {
  const entries = ENTRIES.map((e) => ({ ...e }));
  const snapshot = JSON.stringify(entries);
  const first = JSON.stringify(project(SETTINGS, HOUSEHOLD, entries));
  const second = JSON.stringify(project(SETTINGS, HOUSEHOLD, entries));
  assert.equal(first, second);
  assert.equal(JSON.stringify(entries), snapshot, 'project() mutated the entries it was given');
});

test('the months it returns are frozen — a caller cannot edit a projection in place', () => {
  const months = project(SETTINGS, HOUSEHOLD, []);
  assert.ok(Object.isFrozen(months) && Object.isFrozen(months[0]));
});

// --- The month primitives ------------------------------------------------------------------------

test('assertIsoMonth is the zero-padding guard plan.ts said belonged here', () => {
  assert.equal(assertIsoMonth('2026-09'), '2026-09');
  assert.throws(() => assertIsoMonth('2026-9'), /not a zero-padded ISO month/);
  assert.throws(() => assertIsoMonth('2026-09-16'), /not a zero-padded ISO month/);
  assert.equal(monthOf('2026-09-16'), '2026-09');
  // monthOf validates the DATE, not just the seven characters it keeps. `2026-09` slices to a
  // perfectly well-formed month, so without `assertIsoDate` a dayless string would pass straight
  // through — a mutation that removed that guard failed zero tests until this line existed.
  assert.throws(() => monthOf('2026-09'), /not a zero-padded ISO date/);
  assert.throws(() => monthOf('2026-9-16'), /not a zero-padded ISO date/);
  assert.equal(nextMonth('2026-12'), '2027-01');
  assert.equal(nextMonth('2026-06'), '2026-07');
  assert.throws(() => nextMonth('2026-13'), /not a month of the year/);
});

// --- P4-1a: two fake clocks, byte-identical output ------------------------------------------------
//
// The test this chunk exists for. Node cannot un-fake a clock once faked in-process, and a
// same-process override can be defeated by a module that captured `Date` at import time — so the
// two passes run in separate child processes under a preloaded clock override, which is the form
// ADR-0002's closing line asks for.

const CLOCKS = ['2026-09-16T00:00:00Z', '2031-03-04T13:45:06Z'];

const FAKE_CLOCK = `
const fixed = Date.parse(process.env.FAKE_NOW);
const Real = Date;
class Fake extends Real {
  constructor(...args) { super(...(args.length === 0 ? [fixed] : args)); }
  static now() { return fixed; }
}
globalThis.Date = Fake;
if (Date.now() !== fixed) throw new Error('the clock override did not take');
`;

const FIXTURE = `
import { toCents } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'money.js'))};
import { project } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'projection.js'))};
const person = ${person.toString()};
const HOUSEHOLD = ${JSON.stringify(HOUSEHOLD)};
const SETTINGS = ${JSON.stringify(SETTINGS)};
const ENTRIES = ${JSON.stringify(ENTRIES)};
export const run = () => project(SETTINGS, HOUSEHOLD, ENTRIES);
`;

/** Runs `body` in a fresh process whose global clock is pinned to `now`, and returns its stdout. */
const underClock = (dir, body, now) => {
  const script = join(dir, `run-${Buffer.from(now).toString('hex')}.mjs`);
  writeFileSync(script, body);
  return execFileSync(process.execPath, ['--import', join(dir, 'clock.mjs'), script], {
    encoding: 'utf8',
    env: { ...process.env, FAKE_NOW: now },
    // A 579-month walk serialises to more than Node's default 1 MiB pipe buffer, and the child is
    // killed with ENOBUFS rather than reporting a drift — P7-6's `assetsByPerson` is what took it
    // over. The harness must be able to carry the whole walk, or this test measures nothing.
    maxBuffer: 256 * 1024 * 1024,
  });
};

const withHarness = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'enough-clock-'));
  try {
    writeFileSync(join(dir, 'clock.mjs'), FAKE_CLOCK);
    writeFileSync(join(dir, 'fixture.mjs'), FIXTURE);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const PRINT_PROJECTION = `
import { run } from './fixture.mjs';
process.stdout.write(JSON.stringify(run()));
`;

test('P4-1a — the same fixture under two different fake clocks is BYTE-IDENTICAL', () => {
  const [first, second] = withHarness((dir) => CLOCKS.map((now) => underClock(dir, PRINT_PROJECTION, now)));
  assert.ok(first.length > 1_000, `the child produced only ${first.length} bytes — it did not project`);
  assert.equal(first, second, 'project() drifted with the system clock — ADR-0002’s promise is broken');
  // And it is the real projection, not an empty array that would be identical for the wrong reason.
  const months = JSON.parse(first);
  assert.equal(months.length, 579);
  assert.equal(months[0].month, '2026-09');
});

test('P4-1a VACUITY CONTROL — a deliberate clock read under the SAME harness makes it FAIL', () => {
  // This is what makes the test above an assertion rather than a decoration. The harness is
  // unchanged; only the code under it reads the clock. If the two clocks were not actually
  // different — or the override never took — these two outputs would be identical and this test
  // would go red, which is exactly the signal the test above cannot give on its own.
  const readsTheClock = `
import { run } from './fixture.mjs';
const months = run().map((m, i) => (i === 0 ? { ...m, stamp: new Date().toISOString(), now: Date.now() } : m));
process.stdout.write(JSON.stringify(months));
`;
  const [first, second] = withHarness((dir) => CLOCKS.map((now) => underClock(dir, readsTheClock, now)));
  assert.notEqual(first, second, 'the clock override did not take — the P4-1a test above proves nothing');
  assert.match(first, /"stamp":"2026-09-16T00:00:00\.000Z"/, '`new Date()` was not faked in the child');
  assert.match(second, /"stamp":"2031-03-04T13:45:06\.000Z"/, '`new Date()` was not faked in the child');
  // Strip the planted clock read and the two agree again: the ONLY difference was the clock.
  const strip = (text) => text.replace(/,"stamp":"[^"]*","now":\d+/, '');
  assert.equal(strip(first), strip(second));
});
