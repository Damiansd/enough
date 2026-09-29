// **P7-6 — `Month.assetsByPerson`, the three asset figures broken down per Person.**
//
// **It is a WIDENING and the proof of that is not here.** `test/core-non-super-parcels.test.mjs`
// strips the new field and reproduces the pre-P7-6 digests byte-identically; that is what says no
// figure moved. This file is about what the new field SAYS.
//
// Three things are pinned, and each fails to a different mistake:
//
//   1. **The attribution.** A couple whose two Persons differ in every one of the three figures —
//      one of Age Pension age holding a portfolio and released super, one twelve years younger
//      holding less of both, whose Accumulation Phase balance is protected AND unreachable. Swap
//      the two indices and every figure below is wrong.
//   2. **The reconstruction.** Over a whole walk, the members plus the shared Offset Account are
//      the Household scalar — and each figure is reconstructed against the Offset AT ITS OWN
//      CLOCK, which is the part a sum test would otherwise get wrong: the means-test split is
//      taken on the month's OPENING position and the reachable figure at its CLOSE.
//   3. **The tuple.** A one-Person Household gets one member, and no member carries a name: the
//      Person is identified by POSITION, because two Persons of a Household may be given the same
//      name and a name match would silently pool them.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { PORTFOLIO_SALE_LINE, SUPER_LUMP_SUM_LINE, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, superInterests, parcels) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels,
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const parcel = (dollars) => ({ acquired: '2015-03-02', costBase: toCents(dollars), marketValue: toCents(dollars) });

const settings = (planningHorizonAge) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  // Nothing grows anywhere in this file, so a balance that moves did so because a limb spent it.
  nominalReturn: 0,
});

const spend = (dollars) => ({
  id: 'sc',
  date: '2026-07-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(dollars) },
  enabled: true,
  createdAt: '2026-06-01',
});

const at = (months, month) => months.find((each) => each.month === month);

/** Ben turns 65 on 2040-05-20, and the gate is asked on the first of the month. */
const BEN_REACHES_65 = '2040-06';
const amountOf = (month, prefix) =>
  month.lines.filter((line) => line.description.startsWith(prefix)).reduce((total, line) => total + line.amount, 0);

// --- §1 The asymmetric couple, with nothing to spend ---------------------------------------------
//
// **ADA is 67 at `asAtDate`** — born 1959-01-10, so Age Pension age (67) was behind her on
// 2026-01-10 and the age that releases benefits by itself is behind her too. Her $300,000 of
// Accumulation Phase is therefore ASSESSABLE (the younger-partner exemption needs the owner to be
// under Age Pension age) and REACHABLE. With $200,000 of parcels she is assessable $500,000,
// protected nil, accessible $500,000.
//
// **BEN is 51** — born 1975-05-20. His $400,000 of Accumulation Phase is PROTECTED under the
// younger-partner exemption and UNREACHABLE, because he has met no Condition of Release and this
// Household states no `RETIRE`. With $50,000 of parcels he is protected $400,000, assessable
// $50,000, accessible $50,000.
//
// Every one of the six figures differs from its opposite number, which is what makes an index swap
// visible rather than a coincidence.
const ADA = person('Ada', '1959-01-10', [{ phase: 'accumulation', balance: toCents(300_000) }], [parcel(200_000)]);
const BEN = person('Ben', '1975-05-20', [{ phase: 'accumulation', balance: toCents(400_000) }], [parcel(50_000)]);
const COUPLE = { persons: [ADA, BEN], homeStatus: 'occupied', openingOffsetBalance: toCents(30_000) };

test('P7-6 — the three figures are attributed to the Person who holds the money, positionally', () => {
  // No spending level at all, so no limb draws and every balance stands where it was stated: the
  // figures below are the fixture's own arithmetic and nothing else.
  const months = project(settings(70), COUPLE, []);
  const opening = at(months, '2026-07');
  assert.equal(opening.assetsByPerson.length, 2);

  const [ada, ben] = opening.assetsByPerson;
  assert.equal(ada.protectedAssets, toCents(0));
  assert.equal(ada.assessableAssets, toCents(500_000));
  assert.equal(ada.accessibleAssets, toCents(500_000));
  assert.equal(ben.protectedAssets, toCents(400_000));
  assert.equal(ben.assessableAssets, toCents(50_000));
  assert.equal(ben.accessibleAssets, toCents(50_000));

  // And the same attribution in a month that is NOT the month the walk opens in — month 0 is where
  // every standing fact and every stated balance coincide, so a figure pinned only there says
  // nothing about whether the breakdown is recomputed each tick.
  const later = at(months, '2033-11');
  assert.deepEqual(later.assetsByPerson[0], ada);
  assert.deepEqual(later.assetsByPerson[1], ben);

  // **The member carries no name, deliberately.** A consumer must index into `household.persons`.
  assert.deepEqual(Object.keys(ada).sort(), ['accessibleAssets', 'assessableAssets', 'protectedAssets']);
  assert.equal('name' in ada, false);
  assert.equal('owner' in ada, false);
});

test('P7-6 — a Person’s own figures move when the RULE moves for that Person alone', () => {
  // **Two different rules reach Ben, at two different ages, and each moves ONE of his figures.**
  // That is the sharpest thing this fixture can say: the breakdown is not one number wearing three
  // names, and neither movement touches Ada.
  const months = project(settings(70), COUPLE, []);

  // **65 — the age that releases benefits by itself.** Ben turns 65 on 2040-05-20 and the gate is
  // asked on the first of the month, so 2040-05 has his $400,000 preserved and 2040-06 does not.
  // His ASSETS-TEST treatment does not move an inch: he is still under Age Pension age, so the
  // younger-partner exemption still holds and the balance is still protected.
  const beforeRelease = at(months, '2040-05');
  const afterRelease = at(months, '2040-06');
  assert.equal(beforeRelease.assetsByPerson[1].accessibleAssets, toCents(50_000));
  assert.equal(afterRelease.assetsByPerson[1].accessibleAssets, toCents(450_000));
  assert.equal(beforeRelease.assetsByPerson[1].protectedAssets, toCents(400_000));
  assert.equal(afterRelease.assetsByPerson[1].protectedAssets, toCents(400_000));
  assert.equal(afterRelease.assetsByPerson[1].assessableAssets, toCents(50_000));

  // **67 — Age Pension age.** Ben reaches it on 2042-05-20, so 2042-06 is the first month his
  // $400,000 is assessed. Now the ASSETS-TEST figures move and the reachable one does not: it
  // moved two years ago and there is nothing left for this rule to release.
  const beforePensionAge = at(months, '2042-05');
  const afterPensionAge = at(months, '2042-06');
  assert.equal(beforePensionAge.assetsByPerson[1].protectedAssets, toCents(400_000));
  assert.equal(beforePensionAge.assetsByPerson[1].assessableAssets, toCents(50_000));
  assert.equal(afterPensionAge.assetsByPerson[1].protectedAssets, toCents(0));
  assert.equal(afterPensionAge.assetsByPerson[1].assessableAssets, toCents(450_000));
  assert.equal(afterPensionAge.assetsByPerson[1].accessibleAssets, toCents(450_000));
  assert.equal(beforePensionAge.assetsByPerson[1].accessibleAssets, toCents(450_000));

  // And through all four months, Ada's own three figures are the ones §1 pinned.
  for (const month of [beforeRelease, afterRelease, beforePensionAge, afterPensionAge]) {
    assert.deepEqual(month.assetsByPerson[0], at(months, '2026-07').assetsByPerson[0], `${month.month}: Ada moved`);
  }
});

// --- §2 The reconstruction, over a whole walk -----------------------------------------------------

/**
 * The identity, asserted month by month over `months`:
 *
 *   * `Σ protectedAssets === Month.protectedAssets` **exactly** — the Offset is a financial
 *     investment and is never protected, so it contributes nothing to this side;
 *   * `Σ assessableAssets + Month.openingBalance === Month.assessableAssets`;
 *   * `Σ accessibleAssets + Month.closingBalance === Month.accessibleAssets`.
 *
 * **The two clocks are the point.** The means-test split is taken on the Household as it OPENS the
 * month and the reachable figure on the Household as it CLOSES it, exactly as the scalars beside
 * them are; reconstructing either against the other end of the month is a failure here.
 */
const reconstructs = (months) => {
  let sales = 0;
  for (const month of months) {
    const sum = (field) => month.assetsByPerson.reduce((total, each) => total + each[field], 0);
    assert.equal(sum('protectedAssets'), month.protectedAssets, `protected, ${month.month}`);
    assert.equal(sum('assessableAssets') + month.openingBalance, month.assessableAssets, `assessable, ${month.month}`);
    assert.equal(sum('accessibleAssets') + month.closingBalance, month.accessibleAssets, `accessible, ${month.month}`);
    if (month.openingBalance !== month.closingBalance) sales += 1;
  }
  // Vacuity control: a walk whose Offset never moves cannot tell the two clocks apart, so the
  // identity above would hold under either reading and the loop would prove nothing.
  assert.ok(sales > 0, 'the Offset never moved in this walk — the opening/closing halves are untested');
  return months.length;
};

test('P7-6 — the members plus the shared Offset ARE the Household scalars, every month', () => {
  assert.equal(reconstructs(project(settings(70), COUPLE, [])), 227);
});

// --- §3 A walk that SPENDS, so the closing position differs from the opening one -------------------

test('P7-6 — the reachable figure is the CLOSING position, and a sale is what proves it', () => {
  // $90,000 a year against a couple whose Age Pension is heavily means-tested: limb 3 sells Ada's
  // parcels, and when they are gone limb 5 draws Ada's released super. Ben's super is preserved
  // until he turns 65 in 2040, so until then the only super drawn is Ada's.
  const months = project(settings(70), COUPLE, [spend(90_000)]);
  assert.equal(reconstructs(months), 227);

  // **The month-on-month identity, per Person, over every month of the walk.** Nothing grows here,
  // so a Person's reachable wealth at the close of month n is their reachable wealth at the close
  // of month n-1 less whatever left THEIR NAME in month n — limb 3 sells from both portfolios and
  // limb 5 draws only from the released one, so the two members move by different amounts and on
  // different months. Computing a member from the month's OPENING position makes every one of
  // these equalities read `x === x - drawn` and fail.
  let moved = 0;
  for (let i = 1; i < months.length; i += 1) {
    const month = months[i];
    const previous = months[i - 1];
    if (month.month === BEN_REACHES_65) {
      // **The ONE month of this walk where the identity does not hold, and it is a rule and not a
      // draw.** Ben turns 65 on 2040-05-20, so $400,000 nobody could reach becomes reachable on
      // 2040-06-01 and is immediately drawn on for that month's shortfall. Asserted by name rather
      // than skipped, so a second such month appearing anywhere would fail the loop below.
      assert.equal(previous.assetsByPerson[1].accessibleAssets, toCents(0));
      assert.equal(
        month.assetsByPerson[1].accessibleAssets,
        toCents(400_000) - amountOf(month, `${SUPER_LUMP_SUM_LINE}, Ben`),
      );
      continue;
    }
    COUPLE.persons.forEach((who, personIndex) => {
      const drawn =
        amountOf(month, `${PORTFOLIO_SALE_LINE}, ${who.name}`) + amountOf(month, `${SUPER_LUMP_SUM_LINE}, ${who.name}`);
      assert.equal(
        month.assetsByPerson[personIndex].accessibleAssets,
        previous.assetsByPerson[personIndex].accessibleAssets - drawn,
        `${month.month}, ${who.name}`,
      );
      if (drawn > 0) moved += 1;
    });
  }
  assert.ok(moved > 0, 'nothing was ever drawn — the closing/opening distinction is untested here');
});

// --- §4 The single-Person tuple --------------------------------------------------------------------

test('P7-6 — a one-Person Household gets ONE member, and it is that Person’s own money', () => {
  const alone = {
    persons: [person('Ada', '1959-01-10', [{ phase: 'accumulation', balance: toCents(300_000) }], [parcel(200_000)])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(30_000),
  };
  const months = project(settings(70), alone, []);
  for (const month of months) {
    assert.equal(month.assetsByPerson.length, 1, `${month.month} did not report exactly one member`);
  }
  assert.equal(months[0].assetsByPerson[0].assessableAssets, toCents(500_000));
  assert.equal(months[0].assetsByPerson[0].accessibleAssets, toCents(500_000));
  assert.equal(months[0].assetsByPerson[0].protectedAssets, toCents(0));
  // The Offset is the Household's and is in none of the members: the scalar is $30,000 larger.
  assert.equal(months[0].assessableAssets, toCents(530_000));

  // And the reconstruction holds over a one-member tuple as well — a walk that spends enough to
  // exhaust the limbs above the Offset, so the Offset moves and §2's two clocks are
  // distinguishable here too. A tuple that repeated its one member would double every sum in it.
  assert.equal(reconstructs(project(settings(70), alone, [spend(200_000)])), 31);
});
