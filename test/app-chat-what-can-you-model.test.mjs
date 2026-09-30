// plan_ai.md §5 and §13 microtask 10 — `whatCanYouModel(plan)`.
//
// The refused entry types are read from the LIVE `UNSPECIFIED_ENTRY_TYPES` on every call, never
// copied. The limits kept by hand and the not-yet-checked list are pinned here line by line, so
// dropping one is a failure and retiring one is a deliberate edit to this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatCents } from '../dist/core/money.js';
import { UNSPECIFIED_ENTRY_TYPES } from '../dist/core/parsePlan.js';
import { AGE_PENSION, SUPERANNUATION } from '../dist/data/assumptions/index.js';
import { legislatedTag } from '../dist/app/chat/tools/moneyGuard.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { ENTRY_TYPE_LABELS } from '../dist/app/entryLabels.js';
import { OFFERED_ENTRY_TYPES } from '../dist/app/planEdits.js';
import { REFUSED_TYPE_REASON, whatCanYouModel } from '../dist/app/chat/tools/whatCanYouModel.js';

const scope = () => JSON.parse(whatCanYouModel(DEMO_PLAN));

test('the refused entry types are the live UNSPECIFIED_ENTRY_TYPES, each with its label and reason', () => {
  assert.deepEqual(
    scope().refusedEntryTypes,
    UNSPECIFIED_ENTRY_TYPES.map((type) => ({ type, label: ENTRY_TYPE_LABELS[type], reason: REFUSED_TYPE_REASON })),
  );
  assert.deepEqual(scope().canModel, OFFERED_ENTRY_TYPES.map((type) => ({ type, label: ENTRY_TYPE_LABELS[type] })));
  // A tripwire, not a second source: a newly refused type is a moment to check the hand-kept lists.
  // P12-1, 2026-09-24: `DEATH` leaves it — specified and walked, so it is offered (`canModel`).
  // P14-13, slice 3a, the same day: `CARE_EVENT` is renamed `ENTER_CARE` and specified — it leaves
  // this list too, though `ENTRY_TYPES_NOT_YET_WALKED` still holds it back from `canModel` (the
  // form has no control for it yet — see `planEdits.ts`). P9-1, slice 1, the same day again:
  // `HEAS_DRAW` leaves it too, on the identical ground — specified and walked, held back from
  // `canModel` by the same list, engine-only by explicit instruction.
  // P9-5, 2026-09-25: `DOWNSIZER_CONTRIBUTION` leaves it — specified, walked and offered.
  assert.deepEqual([...UNSPECIFIED_ENTRY_TYPES], ['CONTRIBUTION_SPLIT', 'DOWNSIZE', 'VACATE_HOME']);
});

test('P15-12: CGT is in scope, not refused — the Non-Super Portfolio is offered and nothing mentions capital gains', () => {
  // ADR-0009/P3-21 un-parked CGT on 2026-09-04. The refusal list in P15-12's own box named CGT and
  // went stale the day it did; this pins the opposite so a hard-coded CGT line here is caught, not silent.
  assert.ok(OFFERED_ENTRY_TYPES.includes('NON_SUPER_INVESTMENT'));
  assert.ok(!scope().refusedEntryTypes.some(({ type }) => type === 'NON_SUPER_INVESTMENT'));
  // NARROWED 2026-09-29 (LR-1 slice 4): two limits now name capital gains, and each is ONE rule the
  // forecast applies in a stated way, not CGT refused. Everything else still names none, and each of
  // the two says what the forecast does, so neither can read as "not modelled".
  const CGT_LIMITS = ['Capital gains tax when one of a couple dies holding investments from before the change', 'Inflation indexing of capital gains'];
  const rest = { ...scope(), notModelled: scope().notModelled.filter(({ limit }) => !CGT_LIMITS.includes(limit)) };
  assert.equal(scope().notModelled.length - rest.notModelled.length, CGT_LIMITS.length);
  assert.doesNotMatch(JSON.stringify(rest), /capital gain/i);
  for (const limit of CGT_LIMITS) assert.match(scope().notModelled.find((each) => each.limit === limit).reason, /The forecast (?:passes|raises)/);
});

test('a type added to UNSPECIFIED_ENTRY_TYPES is refused at once: the tool reads the constant, not a copy of it', () => {
  const live = UNSPECIFIED_ENTRY_TYPES;
  assert.ok(!live.includes('SPOUSE_CONTRIBUTION'));
  live.push('SPOUSE_CONTRIBUTION');
  try {
    const refused = scope().refusedEntryTypes.map(({ type }) => type);
    assert.ok(refused.includes('SPOUSE_CONTRIBUTION'), 'the tool did not see a type added to the live constant');
    assert.equal(refused.length, live.length);
  } finally {
    live.pop();
  }
  assert.ok(!scope().refusedEntryTypes.some(({ type }) => type === 'SPOUSE_CONTRIBUTION'));
});

test('the not-yet-checked list: TTR and the Age Pension, each a one-line warning', () => {
  const unchecked = scope().notYetChecked;
  // P13-7 (CGT) and P13-8 (franking) closed 2026-09-24 (docs/verification/, @7d9882a) and removed
  // their own lines, as §12.5 says each Phase 13 item does.
  assert.deepEqual(unchecked.map(({ gate }) => gate), ['P13-2', 'P13-3']);
  assert.deepEqual(unchecked.map(({ area }) => area), ['Transition to retirement pensions', 'The Age Pension']);
  assert.ok(!JSON.stringify(unchecked).match(/capital gains|franking/i));
  for (const { warning } of unchecked) {
    assert.ok(warning.length > 40 && !warning.includes('\n'), warning);
    assert.match(warning, /not yet been checked/);
  }
  assert.match(scope().instruction, /repeat that area’s warning/);
});

test('the limits kept by hand: each one named, with its reason and where it is recorded', () => {
  const limits = scope().notModelled;
  assert.deepEqual(limits.map(({ limit }) => limit), [
    'Carry-forward of unused concessional cap',
    'Moving out of the home, and moving into aged care',
    'The transfer balance account',
    'Market ups and downs',
    'Investment property',
    'Selling the home to rent',
    'Medicare levy low-income thresholds for 2026-27',
    'Deeming rates after the last determination',
    'Age Pension age beyond 67',
    'Superannuation Guarantee rate beyond 12%',
    'Future prices and wages',
    'A pension commuted or rolled over part way through a year',
    'The transfer balance cap for a pension started before the plan',
    'Partial commutations',
    'The kind of super fund',
    'Work Bonus indexation',
    // 'Tax for a couple living apart because of illness' (P12-4) went on 2026-09-30: O90 gives the
    // separated seniors and pensioners tax offset for the whole year, so it is no longer a limit.
    // P12-1, 2026-09-24: the year of a death is taxed as a couple (O91), and NDEP is a bound (§4.11).
    'Tax in the year one of a couple dies',
    // LR-1 slice 4, 2026-09-29: the death ruling R1 is a reading of unsettled law, and indexing is a forecast.
    'Capital gains tax when one of a couple dies holding investments from before the change',
    'Inflation indexing of capital gains',
    'The bereavement payment',
  ]);
  for (const { reason, recorded } of limits) assert.ok(reason.length > 20 && recorded.length > 0, reason);
  const byName = new Map(limits.map((each) => [each.limit, each]));
  assert.match(byName.get('Carry-forward of unused concessional cap').reason, /no history of past contributions/);
  assert.match(byName.get('Moving out of the home, and moving into aged care').reason, /Phase 14/);
  assert.ok(!limits.some(({ limit, recorded }) => /illness/i.test(limit) || /O90/.test(recorded)), 'O90 is built, not a limit');
  // The direction is the point of the limit: a gap that overstates tax is the cautious one.
  assert.match(byName.get('Tax in the year one of a couple dies').reason, /overstated for that one year, never understated/);
  assert.match(byName.get('Tax in the year one of a couple dies').recorded, /O91/);
  assert.match(byName.get('The bereavement payment').reason, /understated .* never overstated/);
  const inherited = byName.get('Capital gains tax when one of a couple dies holding investments from before the change');
  assert.match(inherited.reason, /has not settled/);
  assert.match(inherited.reason, /the tax comes earlier than shown/);
  assert.ok(inherited.reason.includes('2027-07-01'), 'the day is the data record\'s, interpolated');
  // The cap's figure is the data's own, labelled with its own year.
  const cap = SUPERANNUATION.caps.generalTransferBalance;
  assert.ok(byName.get('The transfer balance account').reason.includes(`${formatCents(cap.value)} (as legislated for ${cap.fy})`));
  assert.ok(byName.get('The transfer balance account').reason.includes('$2,100,000.00 (as legislated for 2026-27)'));
  // The carry-forward limit states the figures it turns on, each read from its own record and labelled
  // with that record's stamp (the first golden run's R3 supplied the balance test from memory).
  const carry = byName.get('Carry-forward of unused concessional cap').reason;
  const test = SUPERANNUATION.carryForward.totalSuperBalanceTest;
  assert.ok(carry.includes(`under ${formatCents(test.value)} (${legislatedTag(test)}) on the 30 June before the year`), carry);
  assert.ok(carry.includes('under $500,000.00 (as legislated for every year)'), carry);
  const general = SUPERANNUATION.caps.concessional;
  assert.ok(carry.includes(`That cap is ${formatCents(general.value)} (${legislatedTag(general)})`), carry);
  assert.ok(carry.includes('$32,500.00 (as legislated for 2026-27)'), carry);
  assert.equal(byName.get(`Age Pension age beyond ${AGE_PENSION.qualification.qualifyingAge.value}`).recorded, 'register §8 O3');
  assert.equal(byName.get(`Superannuation Guarantee rate beyond ${SUPERANNUATION.superGuarantee.chargePercentage.value}%`).recorded, 'register §8 O4');
});

test('no legislated figure is typed into the limits: each is read from data/assumptions/', () => {
  // A literal $ figure, an amount of three digits or more (a financial year such as 2026-27 aside), a
  // percentage, or the pension age in the source would be a second copy of a record's value, and
  // would go stale the day the record moves.
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'chat', 'tools', 'whatCanYouModel.ts'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.deepEqual(source.match(/\$\d|\b\d[\d_,]{2,}\b(?!-\d)|\d+%|\b67\b/g), null);
  // Every $ figure the tool sends is legislated, and labelled so.
  const out = whatCanYouModel(DEMO_PLAN);
  const figures = out.match(/\$\d[\d,]*(?:\.\d+)?(?: \([^()]*\))?/g);
  assert.equal(figures.length, 3);
  for (const figure of figures) assert.match(figure, / \(as legislated (?:for \d{4}-\d{2}|for every year)\)$/);
});
