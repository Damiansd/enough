// Drift control (P2-5). This file asserts nothing about any particular figure — it asserts that
// every figure still knows where it came from.
//
// It is the check that still holds in five years, when the rates have all moved and the fixtures
// have all been rewritten: a leaf without a source, a retrieval date, a confidence or a register
// section is a figure nobody can check, and a config row without a stamp is a figure that will be
// displayed as current long after it stops being current. Register §9's "register hygiene"
// mutations are the three at the end.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSUMPTIONS,
  SETTINGS_NOT_ASSUMPTIONS,
  assumptionAt,
  assumptionKeys,
  explainAssumption,
  taxYear,
} from '../dist/data/assumptions/index.js';

const KINDS = ['config', 'config-derived', 'constant'];
const CONFIDENCES = ['primary-verified', 'primary-via-archive', 'secondary-only', 'unverified'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FINANCIAL_YEAR = /^\d{4}-\d{2}$/;

const keys = assumptionKeys();
const leaves = keys.map((key) => [key, assumptionAt(key)]);

test('there are assumptions to check, and every key is unique and dotted', () => {
  assert.ok(keys.length > 100, `expected a populated register, found ${keys.length} leaves`);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) assert.match(key, /^[A-Za-z0-9]+(\.[A-Za-z0-9-]+)*$/);
});

test('every leaf carries a source, a retrieval date, a confidence and a register section', () => {
  for (const [key, record] of leaves) {
    assert.ok(typeof record.source === 'string' && record.source.trim() !== '', `${key} has no source`);
    assert.match(record.retrieved, ISO_DATE, `${key} has no usable retrieval date`);
    assert.ok(CONFIDENCES.includes(record.confidence), `${key} has confidence ${record.confidence}`);
    assert.match(record.registerSection, /^§\d/, `${key} does not point back into the register`);
  }
});

test('every leaf declares one of the three kinds', () => {
  for (const [key, record] of leaves) {
    assert.ok(KINDS.includes(record.kind), `${key} has kind ${record.kind}`);
  }
});

test('every config row is stamped, and only a constant may hold for every year', () => {
  for (const [key, record] of leaves) {
    const stamps = ['fy', 'effective', 'everyYear'].filter((stamp) => record[stamp] !== undefined);
    assert.deepEqual(stamps.length, 1, `${key} carries ${stamps.length} stamps: ${stamps.join(', ')}`);

    if (record.kind !== 'constant') {
      assert.ok(record.everyYear === undefined, `${key} is ${record.kind} and must carry a year or a date`);
    }
    if (record.fy !== undefined) assert.match(record.fy, FINANCIAL_YEAR, `${key} has a malformed financial year`);
    if (record.effective !== undefined) assert.match(record.effective, ISO_DATE, `${key} has a malformed date`);
  }
});

test('a prior-year fallback names the year it is standing in for', () => {
  const fallbacks = leaves.filter(([, record]) => record.priorYearFallbackFor !== undefined);
  assert.ok(fallbacks.length > 0);
  for (const [key, record] of fallbacks) {
    assert.match(record.fy, FINANCIAL_YEAR, `${key}`);
    assert.notEqual(record.fy, record.priorYearFallbackFor, `${key} is not standing in for anything`);
    assert.match(explainAssumption(key).stamp, /prior-year fallback/);
  }
  // Currently the Medicare levy low-income thresholds, and nothing else (register §2.7, O1).
  for (const [key] of fallbacks) assert.match(key, /^tax\.medicareLevy\.lowIncomeThresholds\./);
});

test('every derived figure stores its derivation', () => {
  const derived = leaves.filter(([, record]) => record.kind === 'config-derived');
  assert.ok(derived.length > 0);
  for (const [key, record] of derived) {
    assert.ok(
      typeof record.derivation === 'string' && record.derivation.trim() !== '',
      `${key} is derived but does not say how`,
    );
  }
});

test('no money value is a float', () => {
  // Rates are floats and always below 1; index numbers and counts are the documented exceptions.
  const NON_MONEY_FLOATS = new Set([
    'superannuation.capIndexation.awoteBaseQuarterIndexNumber', // AWOTE dollars per week, as published
    'superannuation.capIndexation.awoteLatestPublishedQuarterIndexNumber', // the same, for the latest published quarter
    'superannuation.capIndexation.cpiDecemberQuarterIndexNumbers', // ABS CPI index numbers, as published
    'heas.drawModes.fortnightlyCapMultiple', // 1.5 — a multiple of a rate, not a rate
  ]);

  const check = (key, value) => {
    if (typeof value === 'number') {
      assert.ok(
        Number.isInteger(value) || Math.abs(value) < 1 || NON_MONEY_FLOATS.has(key),
        `${key} holds ${value}, which is neither integer cents nor a rate`,
      );
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    for (const child of Object.values(value)) check(key, child);
  };

  for (const [key, record] of leaves) check(key, record.value);
});

test('confidence is never laundered upward', () => {
  // Register §9: upgrading any of these to primary-verified must fail a test. They are the rows
  // the research passes could not source primarily, and they stay that way until someone reads
  // the primary text — not until someone is confident.
  const held = {
    'agePension.deemingDeterminations.2020-05-01': 'secondary-only',
    'agePension.indexation.mtaweBenchmark': 'secondary-only',
    'agePension.assetsTest.homeownerTest': 'primary-via-archive',
    'agePension.treatment.pensionerConcessionCard': 'primary-via-archive',
    'heas.ageComponent.recalculationCadence': 'primary-via-archive',
    'heas.capacity.coupleStructure': 'primary-via-archive',
    'heas.meansTest.debtReducesAssessableAssets': 'primary-via-archive',
    // T136, RESOLVED 2026-09-25 (P9-2b) — the OTHER direction again: this was `unverified` until
    // the gate (`docs/research/p9-2b-heas-advances-gate-2026-09-25.md`) read s 1134(1A)(b) against
    // Services Australia's own "George" worked example and settled which of register §5.3's two
    // candidate formulas is right (the pseudocode, not the table row, which was a 26× error and is
    // struck). Pinned here so a later change cannot quietly revert to `unverified` OR silently
    // launder past `primary-verified` to something stronger than the evidence supports.
    'heas.drawModes.fortnightlyRateDuringAnAdvancePeriod': 'primary-verified',
    // P4-18. The step sizes the 1 July indexation comment turns on are read off two published
    // movements and nothing else: SSA 1991 s 1191's rounding-base column would settle them and was
    // not obtainable, and no secondary source was consulted either — so this is `unverified` and
    // not `secondary-only`. Register O74 is open on exactly this, and closing it means reading
    // s 1191. Relabelling this record is not closing it.
    'agePension.indexation.publishedRoundingSteps': 'unverified',
    // P4-18, the other direction — these two WERE read primarily and must not quietly lose it.
    // The transitional rate came off an Internet Archive capture of a page that has since been
    // overwritten by the 20 September rates, which is `primary-via-archive` and not the bare
    // article; the superseded HEAS rate is in F2019L01613 s 5 in terms, which is.
    'agePension.transitionalMaximumRate': 'primary-via-archive',
    'heas.interest.supersededRates.2020-01-01': 'primary-verified',
    'heas.interest.publishedWorkedExample': 'primary-verified',
    'heas.interest.supersededWorkedExample': 'primary-via-archive',
    // **These four were `unverified` until P2-10b and the pin is KEPT, not dropped — it changed
    // direction.** They were R12's carried-forward rates and the table built from them, pinned so
    // that relabelling one could not buy an exemption from the direction rule in
    // test/assumptions-tax.test.mjs. Income Tax Rates Act 1986 Sch 7 Pt I cl 1(b)'s FY2027-28
    // table has since been read directly (register O8, closed), and it states all four expressly,
    // so `unverified` is no longer the truth about them and asserting it would pin a lie.
    //
    // What they are pinned against now is the mirror hazard, and it is the one that matters once
    // `taxYear` projects these figures across forty-eight years: a figure that has a primary
    // source must not quietly LOSE it and keep its number. `assert.equal` here is exact in both
    // directions, so weakening any of these to `unverified` — or strengthening anything else —
    // fails. The source text itself is pinned just below, because a label without a citation is
    // the same lie one step further on.
    'tax.years.2027-28.taxFreeThreshold': 'primary-verified',
    'tax.years.2027-28.lowestMarginalRate': 'primary-verified',
    'tax.years.2027-28.secondLowestMarginalRate': 'primary-verified',
    'tax.years.2027-28.thirdMarginalRate': 'primary-verified',
    'tax.years.2027-28.topMarginalRate': 'primary-verified',
    'tax.years.2027-28.brackets': 'primary-verified',
    // O27, accepted 2026-09-04 by user ruling and shipped as a labelled inference. The statutory
    // words of s 160APHT(1)(a) are primary-verified; the CONCLUSION that a complying fund has no
    // equivalent relief is inferred from them plus ATO's framing, and the ATO never negates the
    // fund case in one sentence. R6 forbids narrowing the label, and the label travels into
    // NotAQualifiedPersonError's message — so it is pinned here as well as in franking.ts.
    'franking.smallShareholder.eligibleEntities': 'secondary-only',
  };

  for (const [key, confidence] of Object.entries(held)) {
    assert.equal(assumptionAt(key)?.confidence, confidence, `${key} must stay ${confidence}`);
  }

  // The citation, not merely the label. Each FY2027-28 ladder leaf claims `primary-verified` on
  // the strength of one document read on one day; if the claim is true the document is named, and
  // if the document stops being named the claim has become a bare assertion.
  // P4-18's two primary claims, cited and not merely labelled — the same discipline the FY2027-28
  // ladder gets below. A label without a citation is the lie one step further on.
  assert.match(assumptionAt('heas.interest.supersededRates.2020-01-01').source, /F2019L01613/);
  assert.match(assumptionAt('heas.interest.publishedWorkedExample').source, /Services Australia/);
  assert.match(assumptionAt('agePension.transitionalMaximumRate').source, /web\.archive\.org/);

  for (const key of Object.keys(held).filter((k) => k.startsWith('tax.years.2027-28.'))) {
    const record = assumptionAt(key);
    assert.match(record.source, /Income Tax Rates Act 1986/, `${key} claims primary-verified — against what?`);
    assert.equal(record.retrieved, '2026-09-17', `${key}: the date the Act was read`);
  }
});

test('the STANDING-LAW years are pinned exactly as the stated ones are, and marked as projected', () => {
  // **Why this test exists at all.** `taxYear` answers for every year past FY2027-28 from Sch 7
  // Pt I's "or a later year of income" table. Those years are NOT keys of `TAX.years`, so the
  // register walk above never reaches them and `assumptionAt` cannot see them — the per-path
  // pinning that protects every stated figure would simply stop at the edge of the horizon. This
  // is the equally-strict replacement the mechanism requires, and it pins by exact path too.
  const LADDER = [
    'taxFreeThreshold',
    'lowestMarginalRate',
    'secondLowestMarginalRate',
    'thirdMarginalRate',
    'topMarginalRate',
    'brackets',
  ];

  let pinned = 0;
  for (const fy of ['2028-29', '2029-30', '2040-41', '2074-75']) {
    const year = taxYear(fy);
    // The marker, first: this is the ONLY thing that separates a projected year from a stated one,
    // because the figures are identical by construction. A mutation that drops it makes a
    // forty-eight year projection indistinguishable from a checked figure, and every downstream
    // staleness report silently becomes wrong.
    assert.equal(year.standingLawFrom, '2027-28', `FY${fy} must say which stated year it projects from`);
    for (const key of LADDER) {
      const record = year[key];
      assert.equal(record.confidence, 'primary-verified', `tax.years.${fy}.${key}`);
      assert.match(record.source, /Income Tax Rates Act 1986/, `tax.years.${fy}.${key}`);
      assert.equal(record.retrieved, '2026-09-17', `tax.years.${fy}.${key}`);
      assert.equal(record.fy, fy, `tax.years.${fy}.${key} must be stamped for the year it answers for`);
      assert.equal(record.priorYearFallbackFor, undefined, `tax.years.${fy}.${key} is not a prior-year fallback`);
      pinned += 1;
    }
  }
  assert.equal(pinned, 24, 'the sweep must really visit four years of six leaves, not go vacuous');

  // And the complement, which is the half a mutation would reach for: a year the register STATES
  // must never acquire the marker. Marking FY2026-27 as projected would understate the register's
  // own confidence just as badly as the reverse overstates it.
  for (const fy of ['2026-27', '2027-28']) {
    assert.equal(taxYear(fy).standingLawFrom, undefined, `FY${fy} is stated, not projected`);
  }
});

test('the assumptions are frozen all the way down', () => {
  assert.throws(() => {
    ASSUMPTIONS.tax.sapto.transferReductionRate.value = 0.14;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.agePension.paymentRates['2026-09-20'].value.maximumBasicRate.single = 0;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.heas.ageComponent.table.value[67] = 0;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.tax.years['2026-27'].brackets.value.push({ upTo: null, rate: 0.99 });
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.superannuation.capIndexation.concessional.value.roundingAmount = 1;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.newDomain = {};
  }, TypeError);

  assert.equal(ASSUMPTIONS.tax.sapto.transferReductionRate.value, 0.15);
  for (const [, record] of leaves) assert.ok(Object.isFrozen(record));
});

test('explainAssumption returns the value with its stamp, source, date and confidence', () => {
  for (const key of keys) {
    const explained = explainAssumption(key);
    assert.equal(explained.key, key);
    assert.ok(explained.stamp.length > 0, `${key} explains with no stamp`);
    assert.ok(explained.source.length > 0);
    assert.match(explained.retrieved, ISO_DATE);
    assert.ok(CONFIDENCES.includes(explained.confidence));
    assert.equal(typeof explained.isFormula, 'boolean');
  }

  const sapto = explainAssumption('tax.sapto.transferReductionRate');
  assert.equal(sapto.value, 0.15);
  assert.equal(sapto.kind, 'constant');
  assert.equal(sapto.stamp, 'every year of the Planning Horizon (constant)');
  assert.match(sapto.note, /coincidence/);

  const table = explainAssumption('heas.ageComponent.table');
  assert.equal(table.stamp, 'effective 2019-07-01');

  const threshold = explainAssumption('tax.sapto.threshold');
  assert.equal(threshold.isFormula, true);
  assert.match(threshold.derivation, /reg s 9\(5\)/);
});

test('explainAssumption answers for a Setting, and refuses an unbacked key', () => {
  const deeming = explainAssumption('agePension.deeming.ratesAfterLastDetermination');
  assert.equal(deeming.kind, 'setting');
  assert.match(deeming.reason, /no formula, no index/);
  assert.match(deeming.registerSection, /O2/);

  assert.throws(() => explainAssumption('tax.sapto.somethingInvented'), RangeError);
  assert.throws(() => explainAssumption(''), RangeError);
});

test('nothing is both an assumption and a Setting', () => {
  for (const key of Object.keys(SETTINGS_NOT_ASSUMPTIONS)) {
    assert.equal(assumptionAt(key), undefined, `${key} is claimed by both sides of the boundary`);
    assert.equal(SETTINGS_NOT_ASSUMPTIONS[key].kind, 'setting');
    assert.ok(SETTINGS_NOT_ASSUMPTIONS[key].reason.length > 0);
  }
});
