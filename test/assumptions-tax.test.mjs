// Income tax, LITO and SAPTO — register §2, and the traps in §1 that a first-year test cannot see.
//
// The published SAPTO thresholds are fixtures here and nowhere else: the register's §2.4 rule is
// that they are derived from the year's marginal rates and never stored. Every dollar figure in
// this file is a public legislated figure or an ATO worked example. No real personal figure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { addCents, toCents } from '../dist/core/money.js';
import { netLabourIncome, netLabourIncomeFromSalary } from '../dist/core/incomeBases.js';
import { toFinancialYear } from '../dist/core/financialYear.js';
import {
  TAX,
  assumptionKeys,
  entitledToWorkingAustraliansOffset,
  explainAssumption,
  offsetApplicationOrder,
  s25130AppliesToYear,
  saptoThreshold,
  saptoTransferAmount,
  taxYear,
  taxYearAvailable,
  watoOffsetAmount,
  watoShadeInPoint,
  watoShadeInPointFor,
} from '../dist/data/assumptions/index.js';

const sapto = TAX.sapto;

/** Threshold inputs for a year in the module, at a given base rebate amount. */
const inputs = (fy, baseRebateAmount) => ({
  taxFreeThreshold: taxYear(fy).taxFreeThreshold.value,
  lowestMarginalRate: taxYear(fy).lowestMarginalRate.value,
  secondLowestMarginalRate: taxYear(fy).secondLowestMarginalRate.value,
  rebateMaximumAmount: sapto.rebateMaximumAmount.value,
  rebateReductionRate: sapto.rebateReductionRate.value,
  rebateReductionThreshold: sapto.rebateReductionThreshold.value,
  baseRebateAmount,
});

// FY2025-26 is not carried as a tax year in the module — nothing in the engine projects
// backwards. Its lowest marginal rate of 16% is the register's own reconciliation of the
// FY2025-26 published thresholds (§2.4, T7), and it is supplied here as fixture input only.
const fy2025Inputs = (baseRebateAmount) => ({ ...inputs('2026-27', baseRebateAmount), lowestMarginalRate: 0.16 });

const BRA = {
  single: sapto.baseRebateAmount.single.value,
  couple: sapto.baseRebateAmount.coupleEach.value,
  illness: sapto.baseRebateAmount.illnessSeparatedEach.value,
};

test('T5 — the FY2026-27 SAPTO thresholds derive to the published figures, to the dollar', () => {
  assert.deepEqual(saptoThreshold(inputs('2026-27', BRA.single)), {
    shadeOut: toCents(36_034),
    cutOut: toCents(53_874),
    branch: 'reg-s-9(5)',
  });
  assert.deepEqual(saptoThreshold(inputs('2026-27', BRA.couple)), {
    shadeOut: toCents(31_847),
    cutOut: toCents(44_663),
    branch: 'reg-s-9(5)',
  });
  assert.deepEqual(saptoThreshold(inputs('2026-27', BRA.illness)), {
    shadeOut: toCents(34_767),
    cutOut: toCents(51_087),
    branch: 'reg-s-9(5)',
  });
});

test('T5/T7 — the same formula reproduces the FY2025-26 set at 16%, which is a different set', () => {
  // The mutation this catches: hard-coding the FY2026-27 thresholds as literals. It also catches
  // sourcing them from ATO QC72197, which publishes this set with no year label at all (T7).
  assert.equal(saptoThreshold(fy2025Inputs(BRA.single)).shadeOut, toCents(34_919));
  assert.equal(saptoThreshold(fy2025Inputs(BRA.single)).cutOut, toCents(52_759));
  assert.equal(saptoThreshold(fy2025Inputs(BRA.couple)).shadeOut, toCents(30_994));
  assert.equal(saptoThreshold(fy2025Inputs(BRA.couple)).cutOut, toCents(43_810));
  assert.equal(saptoThreshold(fy2025Inputs(BRA.illness)).shadeOut, toCents(33_732));
  assert.equal(saptoThreshold(fy2025Inputs(BRA.illness)).cutOut, toCents(50_052));

  assert.notEqual(saptoThreshold(inputs('2026-27', BRA.single)).shadeOut, toCents(34_919));
});

test('the SAPTO thresholds are stored as a formula, not as a table', () => {
  assert.equal(sapto.threshold.kind, 'config-derived');
  assert.equal(typeof sapto.threshold.value, 'function');
  assert.ok(sapto.threshold.derivation.includes('reg s 9(6)'));
});

test('T6 — reg s 9(6) is the default from FY2027-28 with no transfer at all', () => {
  // At 15% the simple s 9(5) limb gives $36,034 < $37,000 and s 9(6) is never reached without a
  // transfer. At 14% the same limb gives 18,200 + 2,675/0.14 = $37,307 > $37,000, so an
  // implementation of s 9(5) alone is correct for every day of FY2026-27 and wrong from
  // 1 Jul 2027. This test is FY2026-27 blind by construction — it has to run past that date.
  assert.equal(saptoThreshold(inputs('2026-27', BRA.single)).branch, 'reg-s-9(5)');
  assert.equal(saptoThreshold(inputs('2027-28', BRA.single)).branch, 'reg-s-9(6)');
  assert.equal(saptoThreshold(inputs('2027-28', BRA.single)).shadeOut, toCents(37_137));
});

test('R9 — an unverified FY2027-28 rate may err only in the direction that over-states tax', () => {
  // The safety of the carried-forward 0.3 is a property of the number, not of the code: a later
  // agent "improving" the placeholder to 0.28 would still type-check, still be labelled
  // unverified, and would now understate tax for every household projected past 1 Jul 2027.
  // `unverified` says the figure is unsourced; it does not say which way the error runs.
  //
  // The property asserted is one-sided on purpose. An UNVERIFIED forward rate may sit at or above
  // its last verified value — over-stating tax, or exactly right — but never below it. A SOURCED
  // figure is free to be anything, including lower, because that is the entire point of sourcing
  // it, so the ordering assertion lives inside the unverified branch and cannot make the real
  // FY2027-28 rate harder to land.
  //
  // Narrow by survey, not by laziness: it is the only unverified forward-year *number* in
  // `src/data/assumptions/` carried forward from a verified prior year. The other unverified
  // records are strings recording an ambiguity or a provenance weakness, with no prior value to
  // compare against; and the direction is not uniform across the register — the Medicare
  // low-income thresholds are carried at a prior year's figure where it is the LOWER figure that
  // over-states the levy, so a blanket "must not decrease" rule would be backwards there.
  const carried = taxYear('2027-28').secondLowestMarginalRate;
  const lastVerified = taxYear('2026-27').secondLowestMarginalRate;

  if (carried.confidence === 'unverified') {
    assert.ok(
      carried.value >= lastVerified.value,
      `the unverified FY2027-28 second-lowest rate is ${carried.value}, below the FY2026-27 ` +
        `${lastVerified.value} it is carried forward from. That understates tax and flatters the ` +
        'household, which is the one direction an unsourced placeholder may not move (R9). ' +
        'A lower rate needs a source, not a better guess.',
    );

    // And the record must say so out loud — the direction is what a future agent reads before
    // deciding whether to touch the figure, so it is asserted, not merely written.
    assert.match(carried.note, /OVER-STATES tax/, 'the note must state which way the error runs');
    assert.match(carried.note, /R9/, 'the note must cite the ruling that keeps FY2027-28 projectable');
  } else {
    // Sourced. No ordering constraint: the register hygiene test's `confidence is never laundered
    // upward` map is the gate on the label itself, and P3-24 is the pass that would clear it.
    assert.ok(typeof carried.source === 'string' && carried.source.trim() !== '');
    assert.match(carried.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('R9/R12 GENERALISED — over EVERY CONSECUTIVE PAIR of years, an unverified rate may err only upward', () => {
  // **What this replaces, and why the replacement was necessary.** The R12 test that stood here
  // compared `taxYear('2027-28')` against `taxYear('2026-27')` and nothing else. That was the
  // whole of the register when it was written. It is not any more: `taxYear` answers for every
  // year from FY2026-27 to the end of any Planning Horizon, so a wrongly-LOWERED FY2044-45 rate
  // was a thing this suite could not see. The property is pairwise and it is now asserted
  // pairwise, across the walk's whole horizon.
  //
  // THE TRAP, unchanged and still the reason this needs care: the lowest marginal rate
  // legitimately FALLS, 0.15 → 0.14, because Parliament legislated it. A blanket "no rate may
  // decrease" is false on arrival, and a version that excludes the first rate BY POSITION says
  // nothing about why. The exemption is BY PROVENANCE — a rate the register carries a source for
  // is free to move in either direction, which is what sourcing it means — and the exempt rate is
  // then named and asserted to fall, so the trap is documented in the suite rather than dodged.
  const RATE_KEYS = ['lowestMarginalRate', 'secondLowestMarginalRate', 'thirdMarginalRate', 'topMarginalRate'];

  /**
   * The predicate itself, extracted so that it can be run against something that VIOLATES it.
   * Returns one string per violation, so an empty array is a pass and the array is also the
   * failure message. Constrains only `unverified` records: see the exemption above.
   */
  const violations = (earlierFy, earlier, laterFy, later) => {
    const found = [];
    for (const key of RATE_KEYS) {
      const before = earlier[key];
      const after = later[key];
      if (before === undefined || after === undefined) {
        found.push(`FY${laterFy} or FY${earlierFy} is missing ${key} — the ladder is built from these records`);
        continue;
      }
      if (after.confidence !== 'unverified') continue;
      if (after.value < before.value) {
        found.push(
          `the unverified FY${laterFy} ${key} is ${after.value}, below the FY${earlierFy} ${before.value} ` +
            'it follows. That understates tax and flatters the household, which is the one direction ' +
            'an unsourced figure may not move (R9, R12). A lower rate needs a source, not a better guess.',
        );
      }
      if (!/OVER-STATES tax/.test(after.note ?? '')) {
        found.push(`FY${laterFy} ${key} is unverified and its note does not state which way the error runs`);
      }
    }
    return found;
  };

  // FY2026-27 is the first year the register carries and 2075 is past the Planning Horizon of any
  // Household this tool will project, so every consecutive pair the walk can reach is examined.
  const years = [];
  for (let start = 2026; start <= 2075; start += 1) years.push(toFinancialYear(start));

  let pairs = 0;
  let recordsExamined = 0;
  for (let i = 1; i < years.length; i += 1) {
    const earlierFy = years[i - 1];
    const laterFy = years[i];
    assert.deepEqual(
      violations(earlierFy, taxYear(earlierFy), laterFy, taxYear(laterFy)),
      [],
      `FY${earlierFy} → FY${laterFy}`,
    );
    pairs += 1;
    recordsExamined += RATE_KEYS.length;
  }
  assert.equal(pairs, 49, 'the pairwise sweep must really cover the horizon, not one pair');
  assert.equal(recordsExamined, 196);

  // **THE VACUITY CONTROL, and it is not optional here.** Since P2-10b read Sch 7 Pt I directly,
  // EVERY rate in every one of those 196 records is `primary-verified`, so the constraint above is
  // DORMANT: it examines 196 records and binds none of them. A dormant guard that cannot be shown
  // to bite is decoration, and this project has paid for that once. So the same predicate is run
  // against a SYNTHETIC pair — fabricated here, in test/, never in src/, and not a financial year
  // of the build — in which a forward rate is unverified and lower. It must report exactly the
  // two failures it is built to report: the ordering, and the missing direction note.
  const SYNTHETIC_EARLIER = {
    lowestMarginalRate: { value: 0.14, confidence: 'primary-verified' },
    secondLowestMarginalRate: { value: 0.3, confidence: 'primary-verified' },
    thirdMarginalRate: { value: 0.37, confidence: 'primary-verified' },
    topMarginalRate: { value: 0.45, confidence: 'primary-verified' },
  };
  const SYNTHETIC_LATER_THAT_FLATTERS = {
    ...SYNTHETIC_EARLIER,
    secondLowestMarginalRate: { value: 0.28, confidence: 'unverified', note: 'a better guess' },
  };
  const caught = violations('9998-99', SYNTHETIC_EARLIER, '9999-00', SYNTHETIC_LATER_THAT_FLATTERS);
  assert.equal(caught.length, 2, caught.join('\n'));
  assert.ok(caught.some((line) => line.includes('0.28') && line.includes('flatters the household')));
  assert.ok(caught.some((line) => line.includes('does not state which way the error runs')));

  // And an unverified rate that moves the SAFE way, with its direction written down, passes — so
  // the control above is catching the direction and the note, not merely the `unverified` label.
  assert.deepEqual(
    violations('9998-99', SYNTHETIC_EARLIER, '9999-00', {
      ...SYNTHETIC_EARLIER,
      topMarginalRate: { value: 0.47, confidence: 'unverified', note: 'carrying it up OVER-STATES tax' },
    }),
    [],
  );

  // THE EXEMPTION, named rather than assumed. The one rate in the whole sweep that falls is the
  // legislated 1 Jul 2027 cut, and it is exempt because it is SOURCED, not because of where it
  // sits in the ladder. If this stops being true the sweep above is guarding a different world.
  assert.notEqual(taxYear('2027-28').lowestMarginalRate.confidence, 'unverified');
  assert.ok(
    taxYear('2027-28').lowestMarginalRate.value < taxYear('2026-27').lowestMarginalRate.value,
    'the legislated 1 Jul 2027 cut is the whole reason this rule cannot be "no rate may decrease"',
  );
  // …and it is the ONLY fall anywhere in the horizon, which is what makes the standing table's
  // residual risk one-directional rather than merely unmeasured.
  const falls = [];
  for (let i = 1; i < years.length; i += 1) {
    for (const key of RATE_KEYS) {
      if (taxYear(years[i])[key].value < taxYear(years[i - 1])[key].value) falls.push(`${years[i]}.${key}`);
    }
  }
  assert.deepEqual(falls, ['2027-28.lowestMarginalRate']);
});

// --- P2-10b — the standing table, and telling a projected year from a stated one ----------------

test('P2-10b — the coverage window is open ABOVE and closed BELOW, and the boundary is exact', () => {
  // The register STATES two years. Sch 7 Pt I cl 1(b)'s third table is headed "for the 2027-28
  // year of income OR A LATER YEAR OF INCOME", so from FY2028-29 on the parameters are answered
  // from that sentence rather than refused. There is no standing table running backwards: Sch 7's
  // other two tables name their years expressly, so FY2025-26 and earlier stay refused.
  assert.equal(taxYearAvailable('2024-25'), false);
  assert.equal(taxYearAvailable('2025-26'), false); // the boundary, from below
  assert.equal(taxYearAvailable('2026-27'), true); // …and from above: the first stated year
  assert.equal(taxYearAvailable('2027-28'), true);
  assert.equal(taxYearAvailable('2028-29'), true); // the first standing year
  assert.equal(taxYearAvailable('2074-75'), true); // past any Planning Horizon this tool projects

  assert.throws(() => taxYear('2025-26'), /no tax assumptions for FY2025-26/);
  assert.ok(taxYear('2028-29') !== undefined);

  // The comparison is on the START YEAR as a NUMBER. The decade boundary is safe either way —
  // '2029-30' < '2030-31' as strings too — but the CENTURY rollover is not: FY2099-00 spells its
  // second half '00', so any rule that reached for the back half of the string would decide
  // FY2099-00 precedes FY2027-28. `financialYear.ts` carries the same finding for its own
  // comparator, and this is the property, not the implementation.
  assert.equal(taxYearAvailable('2029-30'), true);
  assert.equal(taxYearAvailable('2030-31'), true);
  assert.equal(taxYearAvailable('2099-00'), true, 'the century rollover must not read as year zero');
  assert.ok('00' < '28', 'the back-half compare this rule must not use really is wrong at the rollover');
});

test('P2-10b — a STANDING year is distinguishable from a STATED one WITHOUT comparing the figures', () => {
  // This is the whole design problem of the chunk, and it is worth stating plainly: a standing
  // year's figures are IDENTICAL to FY2027-28's, by construction and by the Act. So any test, any
  // display and any reader that tries to tell them apart by the numbers cannot. `standingLawFrom`
  // is the one thing that differs, and it is asserted here rather than inferred.
  const stated = ['2026-27', '2027-28'];
  const standing = ['2028-29', '2029-30', '2045-46', '2074-75'];

  for (const fy of stated) {
    assert.equal(taxYear(fy).standingLawFrom, undefined, `FY${fy} is stated by the register, not projected`);
  }
  for (const fy of standing) {
    assert.equal(taxYear(fy).standingLawFrom, '2027-28', `FY${fy} must say which year it is projected from`);
  }

  // NOT VACUOUS, and this is the trap the brief named: the figures really are the same, so a test
  // that compared them would pass under almost any mutation. Asserted here so the reason the
  // marker has to exist is in the suite rather than only in a comment.
  for (const fy of standing) {
    assert.deepEqual(
      taxYear(fy).brackets.value,
      taxYear('2027-28').brackets.value,
      `FY${fy} must be numerically identical to FY2027-28 — if it ever is not, the marker is not the only difference`,
    );
  }

  // Each record is re-stamped with the year it ANSWERS FOR, not left saying 2027-28. A caller
  // reading `fy` off a FY2045-46 figure must not be told it is a FY2027-28 figure.
  const projected = taxYear('2045-46');
  for (const key of ['taxFreeThreshold', 'lowestMarginalRate', 'secondLowestMarginalRate', 'thirdMarginalRate', 'topMarginalRate', 'brackets']) {
    assert.equal(projected[key].fy, '2045-46', `${key} must be stamped for the year it answers for`);
    // And it is NOT dressed as a prior-year fallback. That field means "the figure for this year
    // does not exist yet"; here it does exist, in the Act's own words. §2.7's Medicare low-income
    // thresholds keep `priorYearFallbackFor` and this must never be confused with them.
    assert.equal(projected[key].priorYearFallbackFor, undefined);
    assert.match(projected[key].note, /OR A LATER YEAR OF INCOME/);
  }
});

test('P2-10b — EVERY rate applied past the source\'s own year states its DIRECTION OF RISK', () => {
  // **A SURVIVOR THIS CHUNK FOUND AND CLOSED.** The R9/R12 direction rule asserts a note only on
  // records whose confidence is `unverified`, and since Sch 7 Pt I was read directly nothing in
  // this ladder is. So deleting the direction sentence from all three of R12's former
  // carried-forward rates failed ZERO tests — measured, not guessed. That is the register's own
  // discipline going quiet exactly where the reader needs it most, because a `primary-verified`
  // label on a figure applied to FY2060-61 says the SOURCE is strong and says nothing about the
  // thirty-four years of amendment risk between the reading and the year.
  //
  // The rule asserted, therefore, is not "unverified rates carry a direction" but the wider one:
  // **any rate applied to a year beyond the one its source was published for must say which way
  // its residual error runs.** FY2026-27 is exempt because it is the current year — there is no
  // distance and nothing to state.
  const forward = taxYear('2027-28');
  const RATE_KEYS = ['lowestMarginalRate', 'secondLowestMarginalRate', 'thirdMarginalRate', 'topMarginalRate'];
  let stated = 0;
  for (const key of RATE_KEYS) {
    assert.match(forward[key].note, /OVER-STATES tax/, `FY2027-28 ${key} must state which way its error runs`);
    stated += 1;
  }
  assert.equal(stated, 4, 'every rate of the ladder is examined, so the loop cannot go vacuous');

  // …and the standing years inherit it, because they inherit the records.
  for (const fy of ['2028-29', '2060-61']) {
    for (const key of RATE_KEYS) {
      assert.match(taxYear(fy)[key].note, /OVER-STATES tax/, `FY${fy} ${key}`);
      // And they say the distance too, which is the part only a projected year has.
      assert.match(taxYear(fy)[key].note, /OR A LATER YEAR OF INCOME/, `FY${fy} ${key}`);
    }
  }

  // The current year does NOT carry it, so this is a claim about distance and not a blanket
  // requirement that would be satisfied by pasting the sentence everywhere.
  assert.equal(taxYear('2026-27').lowestMarginalRate.note, undefined);
});

test('P2-10b — a standing year is SOURCED, and says so in a way a mutation cannot fake cheaply', () => {
  // The confidence is `primary-verified` because the source's own words cover the year asked for.
  // That is a claim about the SOURCE, and it is pinned against the source text, not just the
  // label — a record relabelled without a citation, or citing something else, fails here.
  for (const fy of ['2028-29', '2060-61']) {
    for (const key of ['taxFreeThreshold', 'lowestMarginalRate', 'secondLowestMarginalRate', 'thirdMarginalRate', 'topMarginalRate', 'brackets']) {
      const record = taxYear(fy)[key];
      assert.equal(record.confidence, 'primary-verified', `${fy}.${key}`);
      assert.equal(record.kind, 'config', `${fy}.${key}`);
      assert.match(record.source, /Income Tax Rates Act 1986/, `${fy}.${key}`);
      assert.match(record.source, /Sch 7 Pt I/, `${fy}.${key}`);
      assert.equal(record.retrieved, '2026-09-17', `${fy}.${key}`);
    }
  }
});

test('P2-10b — a standing year is MEMOISED, so a year asked for twice is the same frozen object', () => {
  // The walk asks about this six hundred times. Identity matters to the provenance consolidation,
  // and a fresh object per call would also mean a fresh unfrozen object per call.
  assert.equal(taxYear('2033-34'), taxYear('2033-34'));
  assert.notEqual(taxYear('2033-34'), taxYear('2034-35'));
  assert.ok(Object.isFrozen(taxYear('2033-34')));
  assert.ok(Object.isFrozen(taxYear('2033-34').brackets));
  assert.throws(() => {
    taxYear('2033-34').brackets.value[1].rate = 0.01;
  }, TypeError);
});

test('R12 — the FY2027-28 table exists, is as weak as its weakest rate, and shares the thresholds', () => {
  const forward = taxYear('2027-28').brackets;
  const base = taxYear('2026-27').brackets;
  assert.ok(forward !== undefined, 'R12 supplied this table; without it FY2027-28 tax is refused');

  // Thresholds are never indexed (§2.1), so the two ladders must have the same upper bounds. They
  // are written once in `bracketTable` and shared, so this asserts a property the code already
  // makes structurally impossible to break — cheap, and it fails loudly if that construction goes.
  assert.deepEqual(forward.value.map((b) => b.upTo), base.value.map((b) => b.upTo));

  // The table is only as strong as its weakest rate, and since P2-10b read Sch 7 Pt I cl 1(b)'s
  // FY2027-28 table directly, its weakest rate is primary-verified. The assertion is PINNED, not
  // relaxed: it is exact equality both ways, so weakening any rate back to a guess without saying
  // so at the table fails here, and so does stamping the table stronger than its contents.
  assert.equal(forward.confidence, 'primary-verified');
  assert.match(forward.source, /Sch 7 Pt I/);
  // The rule, not the value: the table's confidence must be the WEAKEST of the rates it is built
  // from. This is what stops the two drifting apart in either direction.
  const rateConfidences = ['lowestMarginalRate', 'secondLowestMarginalRate', 'thirdMarginalRate', 'topMarginalRate']
    .map((key) => taxYear('2027-28')[key].confidence);
  assert.equal(forward.confidence, rateConfidences.includes('unverified') ? 'unverified' : 'primary-verified');

  // And it is assembled from the year's own rate records, not a second copy of them.
  const year = taxYear('2027-28');
  assert.deepEqual(forward.value.map((b) => b.rate), [
    0,
    year.lowestMarginalRate.value,
    year.secondLowestMarginalRate.value,
    year.thirdMarginalRate.value,
    year.topMarginalRate.value,
  ]);
});

test('T1 — the transfer literals are frozen constants, not the year lowest marginal rate', () => {
  assert.equal(sapto.transferReductionRate.value, 0.15);
  assert.equal(sapto.transferReductionRate.kind, 'constant');
  assert.equal(sapto.transferReductionRate.everyYear, true);
  assert.equal(sapto.transferIncomeFloor.value, toCents(6_000));

  // The coincidence that hides the bug: in FY2026-27 the regulation's 0.15 *is* the lowest
  // marginal rate. From 1 Jul 2027 it is not, and the regulation does not move.
  assert.equal(taxYear('2026-27').lowestMarginalRate.value, sapto.transferReductionRate.value);
  assert.notEqual(taxYear('2027-28').lowestMarginalRate.value, sapto.transferReductionRate.value);

  // The floor is $6,000, not the tax-free threshold — a second wiring mistake in the same line.
  assert.notEqual(sapto.transferIncomeFloor.value, taxYear('2026-27').taxFreeThreshold.value);
});

test('T1 exemplar — the transfer past 1 Jul 2027 fails if 0.15 is wired to the marginal rate', () => {
  // Transferor taxable income $10,000, couple base rebate amount $1,602.
  const transferred = saptoTransferAmount(BRA.couple, toCents(10_000));
  assert.equal(transferred, toCents(1_002)); // 1,602 − 4,000 × 0.15

  // Wired to the FY2027-28 lowest marginal rate instead, the same case gives $1,042 — and the
  // transferee's recomputed threshold moves with it. Identical output all through FY2026-27.
  const wrong = toCents(1_602 - 4_000 * taxYear('2027-28').lowestMarginalRate.value);
  assert.equal(wrong, toCents(1_042));
  assert.notEqual(transferred, wrong);

  const withTransfer = saptoThreshold(inputs('2027-28', BRA.couple + transferred));
  const withWrongTransfer = saptoThreshold(inputs('2027-28', BRA.couple + wrong));
  assert.equal(withTransfer.shadeOut, toCents(38_324));
  assert.equal(withWrongTransfer.shadeOut, toCents(38_451));
  assert.notEqual(withTransfer.shadeOut, withWrongTransfer.shadeOut);

  // And the same case inside FY2026-27 is blind to the mutation, which is the point.
  const blind = toCents(1_602 - 4_000 * taxYear('2026-27').lowestMarginalRate.value);
  assert.equal(blind, transferred);
});

test('T4 — ATO Example 9: the transferee threshold is recomputed on the augmented BRA*', () => {
  // FY2025-26, illness separated, transferor taxable income $10,000, own Rebate Income $48,000.
  const transferred = saptoTransferAmount(BRA.illness, toCents(10_000));
  assert.equal(transferred, toCents(1_440));

  const augmented = BRA.illness + transferred; // BRA* = $3,480
  const threshold = saptoThreshold(fy2025Inputs(augmented));
  assert.equal(threshold.shadeOut, toCents(39_912));
  assert.equal(threshold.branch, 'reg-s-9(6)');

  // The published table threshold for that case is $33,732 — using it is the T4 mutation.
  assert.notEqual(threshold.shadeOut, toCents(33_732));

  // The offset amount itself is P3-1's; computed here from stored constants only, as a check
  // that the chain reconciles: ceil(BRA* − 0.125 × (rebate income − shade-out)).
  const offset = Math.ceil((augmented - sapto.taperRate.value * (toCents(48_000) - threshold.shadeOut)) / 100);
  assert.equal(offset, 2_469);
});

test('the register FY2026-27 worked transfer check reconciles end to end', () => {
  const transferred = saptoTransferAmount(BRA.couple, toCents(10_000));
  const threshold = saptoThreshold(inputs('2026-27', BRA.couple + transferred));
  assert.equal(threshold.branch, 'reg-s-9(6)'); // reached only once a transfer is added, at 15%
  assert.equal(threshold.shadeOut, toCents(37_727));

  const offset = Math.ceil(
    (BRA.couple + transferred - sapto.taperRate.value * (toCents(42_000) - threshold.shadeOut)) / 100,
  );
  assert.equal(offset, 2_070);
});

test('a transferor taxable income at or below the floor transfers the whole base rebate amount', () => {
  assert.equal(saptoTransferAmount(BRA.couple, toCents(6_000)), BRA.couple);
  assert.equal(saptoTransferAmount(BRA.couple, toCents(0)), BRA.couple);
  assert.equal(saptoTransferAmount(BRA.couple, toCents(20_680)), 0); // 1,602 / 0.15 + 6,000
});

test('T2/T3 — the gate and the amount read different income figures, and a transfer moves only one', () => {
  assert.match(sapto.eligibility.incomeGateBasis.value, /half of combined Rebate Income/);
  assert.match(sapto.eligibility.amountBasis.value, /own Rebate Income/);
  assert.equal(sapto.transferAffectsEligibility.value, false);

  // Ying and Li Jun: combined $79,697, halved = $39,848.50 < the couple cut-out ⇒ both eligible;
  // Ying's own $54,020 is above it ⇒ Ying receives $0 and Li Jun the full $1,602.
  const cutOut = saptoThreshold(inputs('2026-27', BRA.couple)).cutOut;
  assert.ok(toCents(79_697) / 2 < cutOut);
  assert.ok(toCents(54_020) > cutOut);
});

test('T9 — LITO, SAPTO and the Medicare levy name three different income bases', () => {
  assert.equal(TAX.lito.incomeBase.value, 'taxable income');
  assert.equal(sapto.incomeBase.value, 'Rebate Income');
  assert.notEqual(TAX.lito.incomeBase.value, sapto.incomeBase.value);
  assert.match(TAX.medicareLevy.incomeBase.value, /taxable income/);
  assert.doesNotMatch(TAX.medicareLevy.incomeBase.value, /Rebate Income/);
});

test('the LITO step function joins at $45,000 and computes below zero at the ceiling', () => {
  const lito = TAX.lito;
  const stageOneAt45k =
    lito.maximumOffset.value - lito.stageOneTaper.value * (lito.stageTwoThreshold.value - lito.stageOneThreshold.value);
  assert.equal(stageOneAt45k, lito.stageTwoBaseAmount.value); // $700 − 5% × $7,500 = $325

  const atCeiling =
    lito.stageTwoBaseAmount.value - lito.stageTwoTaper.value * (lito.eligibilityCeiling.value - lito.stageTwoThreshold.value);
  assert.ok(atCeiling < 0, 'the second limb computes to −$0.005 at $66,667 — P3-1 must clamp at zero');
});

test('T10 — the Medicare levy thresholds are stamped FY2025-26 and say so out loud', () => {
  for (const [name, record] of Object.entries(TAX.medicareLevy.lowIncomeThresholds)) {
    assert.equal(record.fy, '2025-26', `${name} must carry the year it actually belongs to`);
    assert.equal(record.priorYearFallbackFor, '2026-27', `${name} must declare the mismatch`);
  }

  const explained = explainAssumption('tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower');
  assert.equal(explained.stamp, 'FY2025-26 — prior-year fallback, no FY2026-27 figure exists');
  assert.match(explained.note, /register O1/);

  // The levy rate itself is a current-year figure, so the mismatch must be visible per row and
  // not smeared across the module.
  assert.equal(TAX.medicareLevy.rate.fy, '2026-27');
  assert.equal(TAX.medicareLevy.rate.priorYearFallbackFor, undefined);
});

test('T8 — the seniors threshold switch keys off the computed offset, not eligibility', () => {
  assert.equal(TAX.medicareLevy.seniorsThresholdSwitch.value, 'computed SAPTO > $0');
  assert.doesNotMatch(TAX.medicareLevy.seniorsThresholdSwitch.value, /eligib/i);
});

test('ADR-0001 — nothing in this module is indexed', () => {
  assert.equal(TAX.bracketThresholdsIndexed.value, false);
  assert.equal(sapto.baseRebateAmountsIndexed.value, false);
  assert.equal(TAX.wato.maximumOffsetIndexed.value, false);
});

// --- WATO — ITAA 1997 Subdiv 61-E, register §2.8.1 (P3-24) --------------------------------------
//
// Every dollar figure below is legislated ($250, $18,200, $700) or Budget Paper No. 2's published
// corroboration ($19,985, $24,985). The synthetic year is labelled as such and exists only because
// FY2027-28 is the only real WATO year, and a single-year fixture in this repo has repeatedly been
// proven FY-blind: at the FY2026-27 rate of 15% the shade-in point is $19,866.67, at the FY2027-28
// 14% it is $19,985.71, and a hard-coded either is wrong in the other year.

const wato = TAX.wato;

/**
 * A deliberately SYNTHETIC rate scale — no year in the module has a 10% lowest rate or a $20,000
 * tax-free threshold. It exists so the shade-in derivation is driven with two different scales, and
 * it is chosen to land on a whole cent (25,000 / 0.10 is exact) where the real year does not.
 */
const syntheticScale = {
  taxFreeThreshold: toCents(20_000),
  lowestMarginalRate: 0.1,
  offsetMaximums: [wato.maximumOffset.value],
};

test('T9/O15 — WATO tests a FIFTH income base, and it is not any of the other four', () => {
  assert.equal(wato.incomeBase.value, 'net labour income');
  for (const other of [TAX.lito.incomeBase.value, sapto.incomeBase.value, TAX.medicareLevy.incomeBase.value]) {
    assert.notEqual(wato.incomeBase.value, other);
  }
  // Div 293's base is the fourth, and it is a different thing again (register §3.6).
  assert.doesNotMatch(wato.incomeBase.value, /surcharge|Rebate Income|taxable income/);
  assert.match(wato.incomeBase.value, /^net labour income$/);
  assert.match(wato.incomeBase.note, /FIFTH income base/);

  // The register's own claim about which bases exist is a claim about the code: net labour income
  // must be a real brand in `core/incomeBases.ts`, not a string in this file.
  assert.equal(typeof netLabourIncome, 'function');
  // Since P3-38 the salary default is not the identity: it subtracts the s 25-130 standard
  // deduction, so the same $50,000 of salary is $49,000 of net labour income in a year the
  // provision exists and $50,000 in a year it does not. Both are asserted against the two-limb
  // form, which is the base's only constructor, so this stays a claim about the BRAND.
  assert.equal(
    netLabourIncomeFromSalary('2027-28', toCents(50_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(50_000), labourDeductions: TAX.s25130.maximumDeduction.value }),
  );
  assert.equal(
    netLabourIncomeFromSalary('2025-26', toCents(50_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(50_000), labourDeductions: toCents(0) }),
  );
  assert.equal(netLabourIncome({ labourAmounts: toCents(50_000), labourDeductions: toCents(1_000) }), toCents(49_000));
});

test('the two limbs of net labour income are both required — an omitted one is caught by absence', () => {
  assert.throws(() => netLabourIncome({ labourAmounts: toCents(50_000) }), /labourDeductions/);
  assert.throws(() => netLabourIncome({ labourDeductions: toCents(0) }), /labourAmounts/);
  assert.throws(() => netLabourIncome({ labourAmounts: toCents(-1), labourDeductions: toCents(0) }), /negative/);

  // No floor at nil: s 61-155(2) states none, and a negative figure fails the s 61-155(1)(b)
  // "must exceed" test on its face, so nothing downstream needs a clamp.
  assert.equal(netLabourIncome({ labourAmounts: toCents(500), labourDeductions: toCents(1_000) }), toCents(-500));
});

test('s 61-160 is a MIN — remove it and a Person 1c over the threshold collects the whole $250', () => {
  const maximumOffset = wato.maximumOffset.value;
  assert.equal(maximumOffset, toCents(250));

  // Inside the shade-in band limb (b) binds. FY2027-28: net labour income $19,000, so the
  // hypothetical basic liability is 0.14 × (19,000 − 18,200) = $112.
  const hypothetical = toCents(0.14 * (19_000 - 18_200));
  assert.equal(hypothetical, toCents(112));
  assert.equal(watoOffsetAmount({ maximumOffset, hypotheticalBasicIncomeTaxLiability: hypothetical }), toCents(112));
  assert.notEqual(watoOffsetAmount({ maximumOffset, hypotheticalBasicIncomeTaxLiability: hypothetical }), maximumOffset);

  // One cent over the threshold: fourteen hundredths of a cent of liability, rounded to nil.
  assert.equal(watoOffsetAmount({ maximumOffset, hypotheticalBasicIncomeTaxLiability: toCents(0) }), toCents(0));

  // Above the point limb (a) binds, and it keeps binding at every income, forever — there is no
  // taper and no ceiling of LITO's s 61-110(1)(b) kind. $400,000 gets the same $250 as $30,000.
  for (const liability of [toCents(250), toCents(1_663), toCents(154_667)]) {
    assert.equal(watoOffsetAmount({ maximumOffset, hypotheticalBasicIncomeTaxLiability: liability }), maximumOffset);
  }

  assert.match(wato.amount.derivation, /NO TAPER/);
  assert.match(wato.amount.derivation, /min\(\$250/);
  assert.match(wato.amount.derivation, /PRE-OFFSET/);
});

test('the shade-in point is DERIVED from the year rate scale, in two different years', () => {
  assert.equal(wato.shadeInPoint.kind, 'config-derived');
  assert.equal(typeof wato.shadeInPoint.value, 'function');

  // FY2027-28, the only real WATO year: 18,200 + 250/0.14 = 19,985.714…, so $19,985.72 is the
  // first whole cent at which limb (a) binds. Budget Paper No. 2 publishes "$19,985" independently.
  const real = watoShadeInPointFor('2027-28');
  assert.equal(Math.floor(real.exactCents / 100), 19_985);
  assert.equal(real.firstCentAtMaximum, toCents(19_985.72));
  assert.notEqual(real.exactCents, real.firstCentAtMaximum); // fractional in cents, deliberately

  // Same formula, a SYNTHETIC scale, a different answer — 20,000 + 250/0.10 = $22,500 exactly.
  const synthetic = watoShadeInPoint(syntheticScale);
  assert.equal(synthetic.exactCents, toCents(22_500));
  assert.equal(synthetic.firstCentAtMaximum, toCents(22_500));
  assert.notEqual(synthetic.firstCentAtMaximum, real.firstCentAtMaximum);

  // And the FY2026-27 scale gives a third answer, which is what makes a stored figure a bug: at
  // 15% the point is 18,200 + 1,666.67 = $19,866.67. WATO does not apply in FY2026-27, but the
  // arithmetic is what a later year's rate change does to a hard-coded $19,985.71.
  const priorScale = watoShadeInPoint({
    taxFreeThreshold: taxYear('2026-27').taxFreeThreshold.value,
    lowestMarginalRate: taxYear('2026-27').lowestMarginalRate.value,
    offsetMaximums: [wato.maximumOffset.value],
  });
  assert.equal(priorScale.firstCentAtMaximum, toCents(19_866.67));
  assert.notEqual(priorScale.firstCentAtMaximum, real.firstCentAtMaximum);

  // It stacks with LITO, and stacked it reproduces BP2's second published figure: the $24,985
  // "effective tax-free threshold" is 18,200 + (700 + 250)/0.14, which only arrives by stacking.
  const stacked = watoShadeInPoint({
    taxFreeThreshold: taxYear('2027-28').taxFreeThreshold.value,
    lowestMarginalRate: taxYear('2027-28').lowestMarginalRate.value,
    offsetMaximums: [wato.maximumOffset.value, TAX.lito.maximumOffset.value],
  });
  assert.equal(Math.floor(stacked.exactCents / 100), 24_985);
  assert.equal(stacked.firstCentAtMaximum, toCents(24_985.72));
});

test('$19,985.71 and $24,985.71 are stored nowhere — the formula is stored instead', async () => {
  const source = await readFile(new URL('../src/data/assumptions/tax.ts', import.meta.url), 'utf8');
  const wholeCents = [toCents(19_985.71), toCents(19_985.72), toCents(24_985.71), toCents(24_985.72)];
  for (const cents of wholeCents) {
    assert.doesNotMatch(source, new RegExp(`toCents\\(${cents}\\)`), `${cents} must be derived, not stored`);
  }
  assert.doesNotMatch(source, /toCents\(19_?985/);
  assert.doesNotMatch(source, /toCents\(24_?985/);
  // The figures may APPEAR — in the derivation string, as the arithmetic's own output. That is the
  // register's corroboration, and it is not a stored figure.
  assert.match(wato.shadeInPoint.derivation, /19,985\.714/);
  assert.match(wato.shadeInPoint.note, /STORE THE FORMULA, NEVER THE NUMBER/);
});

test('the $250 is a config that is NOT indexed, and the arithmetic never sees a year', () => {
  assert.equal(wato.maximumOffset.value, toCents(250));
  assert.equal(wato.maximumOffset.kind, 'config');
  assert.equal(wato.maximumOffset.fy, '2027-28');
  assert.equal(wato.maximumOffset.everyYear, undefined);

  assert.equal(wato.maximumOffsetIndexed.value, false);
  assert.equal(wato.maximumOffsetIndexed.kind, 'constant');
  assert.equal(wato.maximumOffsetIndexed.everyYear, true);
  // Positive evidence of no mechanism, not a failure to find one — the note must say which table.
  assert.match(wato.maximumOffsetIndexed.note, /960-265/);
  assert.match(wato.maximumOffsetIndexed.note, /ADR-0001/);

  // Structural, and stronger than the flag: the maximum reaches `watoOffsetAmount` as a bare
  // amount with no year attached, so there is nowhere for an index factor to be applied. The same
  // input gives the same offset in every year, including a synthetic distant one.
  const offsetIn = () => watoOffsetAmount({ maximumOffset: wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: toCents(9_999) });
  assert.equal(offsetIn('2027-28'), toCents(250));
  assert.equal(offsetIn('2045-46'), toCents(250)); // synthetic year, unchanged: no year enters at all
  assert.equal(watoShadeInPoint.length, 1); // one argument, and it is a rate scale, not an index series
});

test("O15 — no indexation machinery is reachable from WATO's block in the source", async () => {
  const source = await readFile(new URL('../src/data/assumptions/tax.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('// --- WATO'), source.indexOf('// --- Medicare levy'));
  assert.ok(block.length > 1_000, 'the WATO block must be found, or this canary passes vacuously');

  // The repo's actual indexation vocabulary. Adding $250 to the indexation path means calling one
  // of these or reading one of these series, and neither may appear in the block.
  const indexationVocabulary = ['indexCap', 'indexCapFromCpiSeries', 'cpiIndexNumberAt', 'indexPensionRates', 'decemberQuarterIndex', 'cpiSeries', 'AWOTE_BASE_QUARTER_INDEX'];
  const repo = await readFile(new URL('../src/data/assumptions/super.ts', import.meta.url), 'utf8');
  const pension = await readFile(new URL('../src/data/assumptions/agePension.ts', import.meta.url), 'utf8');
  const caps = await readFile(new URL('../src/core/superCaps.ts', import.meta.url), 'utf8');
  for (const token of indexationVocabulary) {
    // Vacuity check first: a canary listing tokens that exist nowhere forbids nothing.
    assert.ok(
      repo.includes(token) || pension.includes(token) || caps.includes(token),
      `${token} appears nowhere in the indexation modules — this canary's vocabulary has gone stale`,
    );
    assert.ok(!block.includes(token), `${token} must not be reachable from WATO — the $250 is not indexed`);
  }
});

test('$18,200 is pinned to the tax-free threshold itself, in both years, not to a second literal', () => {
  // T14 — a second copy of $18,200 is a figure free to drift from the one it must equal.
  assert.equal(wato.entitlementThreshold.value, taxYear('2026-27').taxFreeThreshold.value);
  assert.equal(wato.entitlementThreshold.value, taxYear('2027-28').taxFreeThreshold.value);

  // A `constant`, not a `config`: the freeze is positively evidenced, which is what the project's
  // default demands before a figure may claim to hold for every year.
  assert.equal(wato.entitlementThreshold.kind, 'constant');
  assert.equal(wato.entitlementThreshold.everyYear, true);
  assert.match(wato.entitlementThreshold.source, /Income Tax Rates Act 1986 s 3\(1\)/);
  assert.match(wato.entitlementThreshold.source, /repealed/);
});

test('s 61-155(1)(b) — the test is EXCEEDS, and it runs on net labour income, from FY2027-28', () => {
  assert.match(wato.entitlementTest.value, /EXCEED/);

  const threshold = wato.entitlementThreshold.value;
  // **RE-BASED by P3-38.** The argument to the default is a GROSS SALARY and the s 25-130 standard
  // deduction now comes out of it, so the salary that lands exactly on the threshold is the
  // threshold PLUS that deduction — read from the record, never a second $1,000 literal (T14). The
  // discriminant is untouched: the test is still that AT the threshold there is no entitlement and
  // one cent above it there is.
  const salary = (net) => netLabourIncomeFromSalary('2027-28', addCents(net, TAX.s25130.maximumDeduction.value), toCents(0));
  assert.equal(salary(threshold), threshold, 'the re-based salary must land exactly on the threshold');
  assert.equal(entitledToWorkingAustraliansOffset('2027-28', salary(threshold)), false);
  assert.equal(entitledToWorkingAustraliansOffset('2027-28', salary(threshold + 1)), true);
  assert.equal(entitledToWorkingAustraliansOffset('2027-28', netLabourIncomeFromSalary('2027-28', toCents(400_000), toCents(0))), true);

  // The second year, and the one that makes the first-year-only fixture useless: no entitlement at
  // all in FY2026-27, at any income. Act No. 49 of 2026 Sch 3 Pt 2 item 4. s 25-130 DOES apply in
  // that year — it starts one year earlier — and it still cannot produce an entitlement.
  assert.equal(s25130AppliesToYear('2026-27'), true, 'vacuity guard — the deduction is live in the year with no WATO');
  assert.equal(
    entitledToWorkingAustraliansOffset('2026-27', netLabourIncomeFromSalary('2026-27', toCents(400_000), toCents(0))),
    false,
  );
  assert.equal(wato.firstIncomeYear.value, '2027-28');
  assert.match(wato.firstIncomeYear.note, /Sch 3 itself commenced 1 Jul 2026/);

  // A Person drawing only a pension and an income stream has nil labour amounts, so no entitlement
  // even in a WATO year — which is why WATO is worth $250 in the working years and nothing after.
  assert.equal(
    entitledToWorkingAustraliansOffset('2027-28', netLabourIncome({ labourAmounts: toCents(0), labourDeductions: toCents(0) })),
    false,
  );
});

test('s 63-10(1) — WATO is item 3 and applies BEFORE SAPTO, and the order is derived from the items', () => {
  const order = offsetApplicationOrder();
  assert.deepEqual(
    order.map((row) => row.item),
    [3, 5, 10, 15, 20],
  );
  assert.equal(wato.applicationOrder.watoItem.value, 3);
  assert.equal(wato.applicationOrder.saptoItem.value, 5);
  assert.ok(wato.applicationOrder.watoItem.value < wato.applicationOrder.saptoItem.value);

  const watoAt = order.findIndex((row) => /Subdiv 61-E/.test(row.offset));
  const saptoAt = order.findIndex((row) => /160AAAA/.test(row.offset));
  const litoAt = order.findIndex((row) => /61-D/.test(row.offset));
  assert.equal(watoAt, 0, 'WATO is applied first');
  assert.ok(watoAt < saptoAt, 'WATO before SAPTO — item 3 was inserted ahead of item 5 deliberately');
  assert.ok(saptoAt < litoAt, 'LITO has no item of its own and falls into the item 20 residual');

  // The order is a property of the item NUMBERS, so permuting the table is benign — this is the
  // control for the reordering mutation, and it must pass where changing an item number fails.
  const permuted = [...order].reverse();
  assert.deepEqual(offsetApplicationOrder(permuted), order);

  assert.equal(wato.refundable.value, false);
  assert.equal(wato.transferable.value, false);
  assert.equal(wato.carryForward.value, false);
  assert.equal(wato.reducesMedicareLevy.value, false);
  assert.match(wato.reducesMedicareLevy.note, /items 21 and 22/);
});

test('O73 — the s 63-10 order is mandatory but ORDER-BLIND as to the SAPTO transfer', () => {
  // The claim this replaces was false. `docs/research/p3-24-o73-offset-order.md`: s 63-10(1) item 5
  // transfers nothing itself ("in accordance with regulations made under that Act"), and reg s 12
  // computes the amount from the base rebate amount and the transferor's TAXABLE INCOME. Nothing in
  // it asks what consumed the liability, so WATO at item 3 cannot move it.
  assert.match(wato.applicationOrder.neutrality.value, /mandatory/);
  assert.match(wato.applicationOrder.neutrality.value, /\$0 for a SAPTO couple/);
  assert.doesNotMatch(wato.applicationOrder.neutrality.value, /NOT neutral/);
  assert.match(wato.applicationOrder.neutrality.note, /ORDER-BLIND/);
  assert.match(wato.applicationOrder.neutrality.note, /O73/);
  assert.match(wato.applicationOrder.neutrality.note, /FALSE/);

  // The superseded sentence is kept in exactly ONE place and only inside its correction frame, so
  // the claim stays findable without standing as an assertion. Count, not absence.
  const copies = [wato.applicationOrder.neutrality.note, wato.applicationOrder.neutrality.value].join(' ');
  const superseded = copies.match(/applying WATO first increases the transferable/g) ?? [];
  assert.equal(superseded.length, 1, 'the false claim must survive exactly once, inside the correction');
  assert.match(wato.applicationOrder.neutrality.note, /"applying WATO first increases the transferable[\s\S]*?"\s*is FALSE/);

  // The mechanism that IS true, in stored figures: the order fixes which offset is the leftover.
  // A Person with $200 of basic income tax liability and a $250 WATO maximum. WATO first eats the
  // whole $200 and SAPTO is wholly unused; SAPTO first eats it and the WATO is wasted. The
  // COMPOSITION of the leftovers moves — and the transfer, computed by reg s 12, does not.
  const liability = toCents(200);
  const watoAmount = watoOffsetAmount({ maximumOffset: wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: liability });
  assert.equal(watoAmount, toCents(200), 'the offset is capped by the liability, not paid in full');
  assert.notEqual(BRA.couple - Math.max(0, liability - watoAmount), BRA.couple - Math.min(BRA.couple, liability));

  // And the payload: the transfer is a function of taxable income alone, so it is identical under
  // either application order at every income the couple can have.
  for (const ti of [0, 6_000, 6_001, 10_000, 12_000, 18_200, 28_500, 45_000]) {
    const transfer = saptoTransferAmount(BRA.couple, toCents(ti));
    assert.equal(saptoTransferAmount(BRA.couple, toCents(ti)), transfer);
    assert.equal(saptoTransferAmount.length, 2, 'reg s 12 takes a BRA and a taxable income — no offset, no residual, no order');
  }

  const rows = offsetApplicationOrder();
  assert.match(rows[0].excess, /lost/);
  assert.match(rows[1].excess, /transferred/);
});

// O73's residual finding is CONDITIONAL, and this is the condition. The two readings of reg
// s 12(1)(b)'s "tax payable ... (disregarding any credits or rebates)" — gross of every offset, or
// gross of ITAA 1936 rebates only — differ in dollars only where a positive SAPTO transfer and a
// positively-applied WATO can coexist for the same Person. Today they cannot: the transfer formula
// has already tapered to nil before the tax-free threshold, below which a non-refundable WATO
// cannot be applied at all. Both figures are read from the assumption records, never written here,
// so this canary survives an update of either and dies only when the finding does.
test('O73 CANARY — the positive-transfer and positive-WATO regions must stay DISJOINT', () => {
  for (const fy of ['2026-27', '2027-28']) {
    const floor = sapto.transferIncomeFloor.value;
    const rate = sapto.transferReductionRate.value;
    const bra = BRA.couple;
    const taxFreeThreshold = taxYear(fy).taxFreeThreshold.value;

    // Vacuity guard: a canary comparing two zeroes forbids nothing.
    assert.ok(bra > 0 && rate > 0 && floor > 0 && taxFreeThreshold > 0);

    // Top of the positive-transfer region, derived from the records — `floor + BRA / rate`.
    const transferNilPoint = floor + bra / rate;

    // Second derivation, through the shipped reg s 12(3)(b)(ii) function rather than the arithmetic:
    // the transfer must be spent exactly at that income and still alive a dollar before it.
    assert.equal(saptoTransferAmount(bra, Math.ceil(transferNilPoint)), toCents(0));
    assert.ok(saptoTransferAmount(bra, Math.floor(transferNilPoint) - 100) > 0);

    // Bottom of the positive-WATO region. WATO is s 63-10(1) item 3 and non-refundable, so what is
    // APPLIED is capped by actual basic income tax liability, which is nil up to the threshold.
    assert.equal(watoOffsetAmount({ maximumOffset: wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: toCents(0) }), toCents(0));

    // The largest couple base rebate amount the finding survives, derived, never typed.
    const braAtWhichTheyMeet = (taxFreeThreshold - floor) * rate;

    assert.ok(
      transferNilPoint < taxFreeThreshold,
      `O73's $0 conclusion has EXPIRED for FY${fy}. The positive-transfer region now runs to a ` +
        `taxable income of ${transferNilPoint / 100} and the positive-WATO region starts at ` +
        `${taxFreeThreshold / 100}, so they OVERLAP. The two readings of reg s 12(1)(b)'s ` +
        `"tax payable ... (disregarding any credits or rebates)" — gross of every offset, which the ` +
        `build adopts at the SAPTO transfer gate in src/core/incomeTax.ts, versus gross of ITAA 1936 ` +
        `rebates only — are no longer worth the same. Revisit O73 and register §2.6 before trusting ` +
        `any transfer figure: fetch the Explanatory Statement to F2025L01060 (TODO P3-40). The ` +
        `condition is floor + BRA / rate < tax-free threshold; the couple BRA is ` +
        `${bra / 100} and the largest it may be is ${braAtWhichTheyMeet / 100}.`,
    );

    // The same condition said the other way round, so a fall in the tax-free threshold and a rise in
    // the BRA are both caught, and neither figure can be swapped for a literal without this failing.
    assert.ok(bra < braAtWhichTheyMeet, `the couple base rebate amount ${bra / 100} has reached ${braAtWhichTheyMeet / 100} — see the message above`);
    assert.equal(braAtWhichTheyMeet, (taxYear(fy).taxFreeThreshold.value - sapto.transferIncomeFloor.value) * sapto.transferReductionRate.value);
  }

  // The rate in the condition is reg s 12's OWN frozen literal (T1). It must not be re-sourced to
  // the year's lowest marginal rate: those coincide in FY2026-27 and part in FY2027-28, and the
  // nil point would move if the wrong one were used.
  assert.equal(sapto.transferReductionRate.kind, 'constant');
  assert.equal(sapto.transferReductionRate.everyYear, true);
  assert.match(sapto.transferReductionRate.note, /does not move when that rate falls to 14%/);
  assert.equal(sapto.transferReductionRate.value, taxYear('2026-27').lowestMarginalRate.value);
  assert.notEqual(sapto.transferReductionRate.value, taxYear('2027-28').lowestMarginalRate.value);
});

test('the net labour income split is a Setting, and its stated default is the one in the code', () => {
  const explained = explainAssumption('tax.wato.netLabourIncomeSplit');
  assert.equal(explained.kind, 'setting');
  assert.match(explained.reason, /netLabourIncomeFromSalary\(fy, salary, reducerDeductions\)/);
  // The direction of the error, which `kind: 'setting'` does not carry.
  assert.match(explained.reason, /over-states net labour income/);

  // **And WHOM it favours, which the direction alone does not carry either.** Over-stating net
  // labour income raises WATO, which lowers net tax, so this default FLATTERS THE HOUSEHOLD — the
  // opposite direction from every other unsourced figure in FY2027-28, each engineered so it can
  // only over-state cost (`CARRIED_FORWARD_DIRECTION`, RULINGS.md R9).
  assert.match(explained.reason, /FLATTERS THE HOUSEHOLD/);
  assert.match(explained.reason, /P3-38/, 'the caveat must name what amended it');

  // **The 2026-09-15 amendment, pinned so the narrowing cannot be read back as the old acceptance.**
  // P3-39 accepted this default's optimism for the wage earner with no other work deductions; P3-38
  // wired s 25-130 and made it EXACT for exactly that Person. What survives is the Person with real,
  // unmodelled reducers, and it carries its OWN dated acceptance rather than inheriting the old one.
  // "shade-in band" is deliberately no longer asserted here: the old caveat was confined to that
  // band because it moved WATO alone, and the surviving one reaches the taxable-income limb too.
  assert.match(explained.reason, /DISCHARGED for the modal wage earner/);
  assert.match(explained.reason, /ACCEPTED 2026-09-15 \(P3-38\) on its own dated ground rather than inherited/);
  assert.equal(TAX.wato.amount.fy, '2027-28', 'the WATO half of the optimism is confined to a year the offset exists in');

  // The superseded wording survives exactly ONCE, inside its correction frame — the O73 discipline
  // above, applied here. Count, not absence: the false default must stay findable by a reader who
  // remembers it, without standing anywhere as a claim.
  const superseded = explained.reason.match(/labour deductions are nil/g) ?? [];
  assert.equal(superseded.length, 1, 'the superseded default must survive exactly once, inside the correction');
  assert.match(explained.reason, /'labour deductions are nil', kept here in its correction frame/);

  // And the default the reason names must be what the function does — a Setting whose documented
  // default and code disagree is worse than no default at all. **Two years**, because the default
  // is year-dependent now and a single-year check cannot tell a wired deduction from a hard-coded
  // one: FY2027-28, where s 25-130 and WATO are both live, and FY2025-26, where neither exists.
  assert.equal(
    netLabourIncomeFromSalary('2027-28', toCents(80_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(80_000), labourDeductions: TAX.s25130.maximumDeduction.value }),
  );
  assert.equal(
    netLabourIncomeFromSalary('2025-26', toCents(80_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(80_000), labourDeductions: toCents(0) }),
  );
});

// P3-38 TRIPWIRE, REPLACED 2026-09-15 and NOT deleted. Its predecessor pinned the P3-39 acceptance
// to the ABSENCE of a s 25-130 record and instructed whoever made it go red to delete it. That
// record has now arrived and the sites it named were revisited in the same change — but the
// acceptance did not vanish with them, it NARROWED. The modal wage earner's optimism is discharged:
// the default is exact for a Person with no other work deductions. What survives is a Person with
// real, unmodelled s 25-130(2) reducers, whose net labour income is still over-stated, with no
// honest refusal trigger because the tool cannot identify that population at all. That narrower
// acceptance is RULED ACCEPTED on its own dated ground (2026-09-15, P3-38) and must not be read as
// an inheritance of §2.8.1's. Prose alone rots here, so the same discipline applies: the acceptance
// is pinned to the thing whose ARRIVAL would falsify it, and to the DIRECTION and SIZE of the gap,
// which a label alone does not carry.
test('P3-38 TRIPWIRE, NARROWED — the residual reducer optimism, its direction and what discharges it', () => {
  const keys = assumptionKeys();
  assert.ok(keys.length > 50, 'the key walk returned almost nothing — this tripwire would be vacuous');

  // The old tripwire's trigger, now asserted the other way round: the record HAS arrived, so a
  // revert of P3-38 that left this test standing would fail here rather than pass quietly.
  assert.ok(
    keys.filter((key) => /s25130/i.test(key)).length > 0,
    'the s 25-130 record has gone: P3-38 has been reverted and §2.8.1\'s wider acceptance is live again',
  );

  // **WHAT WOULD DISCHARGE THE RESIDUAL, and it is the only thing that would.** The Person with
  // unmodelled reducers is invisible to the tool because the reducer sum is a SETTING — a figure
  // the caller states and the tool cannot derive. The day it becomes a derived assumption record,
  // the tool can identify that population, a refusal or a correction becomes possible, and this
  // acceptance stops being honest. Count the assumption walk, not the Settings registry.
  assert.deepEqual(
    keys.filter((key) => /reducerDeduction/i.test(key)),
    [],
    'the s 25-130(2) reducers are now DERIVED rather than asked for (assumption key, not Setting). ' +
      'The tool can therefore identify the Person whose reducers are unmodelled, and the acceptance ' +
      'recorded on 2026-09-15 (P3-38) at register §2.8.1 and in `TAX.s25130.residualOptimism` rests ' +
      'on a premise that no longer holds. Revisit both, and the Setting `tax.s25130.reducerDeductions`.',
  );
  assert.equal(explainAssumption('tax.s25130.reducerDeductions').kind, 'setting');

  // **THE DIRECTION AND THE SIZE, hand-derived from s 25-130(2) and s 61-155(2), never read off the
  // implementation.** A Person on $80,000 of salary with $4,000 of real work deductions:
  //
  //   truthful:  limbs (a)/(b) $4,000, limb (c) max(0, min(1,000, 80,000) − 4,000) = $0
  //              labour deductions max($4,000, $1,000) = $4,000  →  net labour income $76,000
  //   nil default: limbs (a)/(b) $0, limb (c) min(1,000, 80,000) − 0 = $1,000
  //              labour deductions $1,000                        →  net labour income $79,000
  //
  // The default is the HIGHER of the two, which raises WATO, which lowers net tax: it flatters the
  // household. **And the gap is $3,000, not $1,000** — it is `max(0, actual − $1,000)`, nil for
  // every Person with $1,000 or less of real deductions and UNBOUNDED above. A future record that
  // narrows this acceptance to a $1,000 ceiling of net labour income is wrong on this arithmetic.
  const truthful = netLabourIncomeFromSalary('2027-28', toCents(80_000), toCents(4_000));
  const nilDefault = netLabourIncomeFromSalary('2027-28', toCents(80_000), toCents(0));
  assert.equal(truthful, toCents(76_000));
  assert.equal(nilDefault, toCents(79_000));
  assert.ok(nilDefault > truthful, 'the direction: the nil default OVER-states net labour income');
  assert.equal(nilDefault - truthful, toCents(3_000), 'and by more than the $1,000 standard deduction');

  // **THE DISCHARGE, which is the other half of the same claim.** For the modal wage earner — no
  // other work deductions — the default is EXACT, not optimistic, and that is what makes §2.8.1's
  // P3-39 acceptance discharged rather than relabelled. Asserted in TWO financial years, because a
  // single year cannot tell a wired provision from a constant: FY2027-28, where s 25-130 and WATO
  // are both live, and FY2025-26, where s 25-130 does not exist and the nil deduction is a matter
  // of LAW rather than an approximation.
  assert.equal(s25130AppliesToYear('2027-28'), true);
  assert.equal(s25130AppliesToYear('2025-26'), false);
  assert.equal(
    netLabourIncomeFromSalary('2027-28', toCents(80_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(80_000), labourDeductions: TAX.s25130.maximumDeduction.value }),
    'FY2027-28: the modal wage earner gets exactly the standard deduction the Act gives them',
  );
  assert.equal(
    netLabourIncomeFromSalary('2025-26', toCents(80_000), toCents(0)),
    toCents(80_000),
    'FY2025-26: the provision does not exist, so the nil is the law and not the old optimism',
  );
  // And in that earlier year the residual is the WHOLE of the unmodelled deductions, because there
  // is no standard deduction to absorb the first $1,000 of them.
  assert.equal(
    toCents(80_000) - netLabourIncomeFromSalary('2025-26', toCents(80_000), toCents(4_000)),
    toCents(4_000),
  );
});

// Added 2026-09-15 by the P3-38 mutation battery. `tax.s25130.reducerDeductions` was asserted in
// exactly one place — `.kind === 'setting'`, in the tripwire above — so its STATED DEFAULT was
// unpinned: changing "DEFAULT: nil" to "DEFAULT: $1,000" in `settings.ts` failed ZERO tests, while
// the code went on subtracting the full standard deduction. A Setting whose documented default and
// whose code disagree is worse than no default at all, which is the rule the sibling test above
// applies to `tax.wato.netLabourIncomeSplit`; this is the same rule for the other half of the pair.
test('the s 25-130(2) reducer sum is a Setting, and its stated default is the one in the code', () => {
  const explained = explainAssumption('tax.s25130.reducerDeductions');
  assert.equal(explained.kind, 'setting');
  assert.equal(explained.registerSection, '§2.8.2 / O72');

  // THE DEFAULT, stated once and not in two versions. A second "DEFAULT:" sentence is a second
  // default, and the reader has no way to tell which one the code implements.
  assert.equal((explained.reason.match(/DEFAULT: /g) ?? []).length, 1, 'exactly one stated default');
  assert.match(explained.reason, /DEFAULT: nil, meaning the Person claims no separate work deduction/);

  // The direction, which `kind: 'setting'` does not carry, and WHOM it favours.
  assert.match(explained.reason, /in the household's favour/);
  assert.match(explained.reason, /NOT bounded by \$1,000 × the marginal rate/);
  assert.match(explained.reason, /max\(0, actual reducers − \$1,000\), unbounded above/);

  // s 25-130(3): the exclusions get no field, so the Setting cannot be read as covering them.
  assert.match(explained.reason, /s 25-130\(3\) amounts[\s\S]*get NO field/);
  assert.match(explained.reason, /never reduce the deduction whatever their size/);

  // And that the nil is stated rather than inherited — the arity `core-income-tax-mutations` proves.
  assert.match(explained.reason, /required argument to `netLabourIncomeFromSalary`/);
  assert.match(explained.reason, /required field on `StandardDeductionInputs`/);

  // **THE DEFAULT PINNED TO THE CODE, hand-derived from s 25-130(2), in TWO financial years** — a
  // single year cannot tell a wired provision from a constant. A Person with $80,000 of labour
  // income who leaves the Setting at nil:
  //
  //   FY2026-27, the first income year:  max(0, min($1,000, $80,000) − $0)  =  $1,000
  //   FY2025-26, before the provision:   no deduction exists at all         =      $0
  //
  // The $1,000 is read from the record rather than typed, so this moves with the record (T14).
  assert.equal(s25130AppliesToYear('2026-27'), true);
  assert.equal(s25130AppliesToYear('2025-26'), false);
  assert.equal(
    netLabourIncomeFromSalary('2026-27', toCents(80_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(80_000), labourDeductions: TAX.s25130.maximumDeduction.value }),
    'FY2026-27: the nil default leaves exactly the standard deduction',
  );
  assert.equal(
    netLabourIncomeFromSalary('2025-26', toCents(80_000), toCents(0)),
    netLabourIncome({ labourAmounts: toCents(80_000), labourDeductions: toCents(0) }),
    'FY2025-26: the nil default leaves nothing, because there is no deduction to leave',
  );
  assert.equal(TAX.s25130.maximumDeduction.value, toCents(1_000), 'or the two years above are the same case');
});

// --- THE DIRECTION ARGUMENT'S EVIDENCE IS DATA, NOT A SENTENCE — C3, user ruling 2026-09-21 -------
//
// `STANDING_TABLE_DIRECTION` is why this build answers FY2045-46 from FY2027-28's ladder instead of
// refusing: every movement in the lowest marginal rate within living memory has been DOWNWARD, so a
// standing table over-states tax or is exactly right and cannot flatter the household. That is an
// EMPIRICAL claim, and two of its three data points were records while the 16% sat only in the
// prose — because the years it belongs to are ones `taxYear` refuses, so it had nowhere to live.
//
// A figure with no home reads as unimportant right up until the argument resting on it is
// questioned. These assertions are what make the claim checkable rather than merely stated.
test('the lowest-marginal-rate history is monotonically FALLING, which is what the standing table leans on', async () => {
  const { LOWEST_MARGINAL_RATE_HISTORY } = await import('../dist/data/assumptions/tax.js');
  const years = Object.keys(LOWEST_MARGINAL_RATE_HISTORY.value);
  const rates = years.map((fy) => LOWEST_MARGINAL_RATE_HISTORY.value[fy]);
  assert.ok(rates.length >= 3, 'a direction claim needs more than two points');
  for (let i = 1; i < rates.length; i += 1) {
    assert.ok(
      rates[i] <= rates[i - 1],
      `the lowest marginal rate RISES from ${years[i - 1]} (${rates[i - 1]}) to ${years[i]} (${rates[i]}) — ` +
        'STANDING_TABLE_DIRECTION claims every movement on record is downward, and a rise here means ' +
        'the argument above it is now false, not that this figure needs updating',
    );
  }
  assert.ok(rates[rates.length - 1] < rates[0], 'the ladder must actually fall, not merely never rise');
});

test('the history AGREES with the two years the engine answers from their own records', async () => {
  const { LOWEST_MARGINAL_RATE_HISTORY, taxYear } = await import('../dist/data/assumptions/tax.js');
  // The cross-check that shows the right column was read: the evidence record and the records the
  // engine actually computes from must not disagree, or one of them is wrong and nothing would say so.
  // Read through `taxYear`, the public accessor, so this tests what the engine uses and not a shape.
  for (const fy of ['2026-27', '2027-28']) {
    assert.equal(
      LOWEST_MARGINAL_RATE_HISTORY.value[fy],
      taxYear(fy).lowestMarginalRate.value,
      `the history and the record the engine computes from disagree for ${fy}`,
    );
  }
});

test('the history is EVIDENCE and not a rate table — the engine still refuses those years', async () => {
  const { taxYear } = await import('../dist/data/assumptions/tax.js');
  for (const fy of ['2024-25', '2025-26']) {
    assert.throws(
      () => taxYear(fy),
      `taxYear answered ${fy} — promoting the history must not make refused years answerable`,
    );
  }
});
