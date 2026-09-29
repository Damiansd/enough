// P6-8 brief 2, chunk 4 — the sacrificed money ARRIVES, and the means test treats it differently
// depending on WHOSE it is and HOW OLD THEY ARE.
//
// Chunks 1-3 took the sacrifice out of the salary that is assessed and then out of the pay packet,
// and left it nowhere: between 0abf77b and this file a Household with a sacrifice simply lost the
// money. This is the other side of it — the fund's 15% (Income Tax Rates Act 1986 s 26(1)(a),
// register §3.1) and the net amount credited to the interest the entry names.
//
// **Four things are defended here and nothing else.**
//
//   1. WHAT ARRIVES: the net-of-tax amount, to the cent, as a NON-CASH line the Waterfall cannot
//      spend, with the balance it moved and the line reporting the same figure.
//   2. WHERE it arrives: the interest the entry NAMES — not "the only one", not interest 0.
//   3. THE MEANS-TEST ASYMMETRY, which is the whole point of P6-8: accumulation super held by a
//      Person under Age Pension age is exempt from BOTH tests (§4.8, the younger-partner
//      exemption), while the cash it came out of was assessed and deemed from the first dollar. So
//      a sacrifice can RAISE a Household's Age Pension. The same arrangement made by a Person who
//      has REACHED Age Pension age LOWERS it, because their accumulation super is assessed. Both
//      signs are asserted, against each other, in one test.
//   4. CONSERVATION: the cash that left the pay packet, the tax that was saved on it and the 15%
//      the fund paid account for every cent of the change in the Household's wealth. Nothing is
//      created and nothing beyond the 15% is destroyed.
//
// ⚠️ **This build still does NOT refuse an over-cap sacrifice (P6-8 chunk 5).** A Person
// sacrificing past their concessional cap is taxed at 15% on the whole of it here, and ITAA 1997
// Div 291's excess treatment is not applied at all — which is wrong in the FLATTERING direction for
// exactly those Households, and is why `SUPER_CONTRIBUTION` is still not offered in the form.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const entry = (id, type, date, owner, params = {}) => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-01-01',
});

const monthAt = (months, isoMonth) => months.find((each) => each.month === isoMonth);
const lineOf = (months, isoMonth, prefix) => {
  const found = monthAt(months, isoMonth).lines.filter((line) => line.description.startsWith(prefix));
  return found.length === 1 ? found[0] : found;
};
const amountOf = (months, isoMonth, prefix) => {
  const found = monthAt(months, isoMonth).lines.find((line) => line.description.startsWith(prefix));
  return found === undefined ? 0 : found.amount;
};

// --- The fixture: one member over Age Pension age, one under it, and only the younger one works ---
//
/**
 * **Nell is 54 and Owen is 69, and that gap is the whole fixture.** Owen has reached Age Pension
 * age and Nell has not, so Nell's Accumulation Phase interests are exempt from both means tests
 * while every dollar in the Offset Account is assessed and deemed. The couple is assessed on their
 * COMBINED income and assets and only Owen is eligible, which is why the taper below arrives at a
 * quarter of a dollar rather than a half — see `pensionRise`.
 *
 * **Nell holds TWO Accumulation Phase interests and the entry names the SECOND.** The first is not
 * decoration: it is the only way a test can tell "the interest the entry named" from "interest 0"
 * or from "the one they have". The nil second interest produces no growth line at all until
 * something is paid into it, so the COUNT of Nell's accumulation growth lines is 1 in a walk with
 * no sacrifice and 2 in a walk with one — a signal that survives both balances being in the same
 * pool and both lines carrying the same description.
 *
 * ⚠️ **$95,000 is not a round number chosen for comfort — it was chosen to stay OUT of register
 * O30.** `MixedSaptoFamilyThresholdError` was raised for any couple where one spouse was entitled
 * to SAPTO and the other was not and the family income was under 1.25 times the larger of their two
 * family income thresholds. Owen is entitled and Nell is not, so the family income after the
 * sacrifice had to clear roughly $77,000: at a $75,000 or $85,000 salary this identical fixture
 * threw. **⚠️ SUPERSEDED 2026-09-21: O30 is CLOSED and the refusal is deleted** — a sacrifice can
 * no longer push a couple into a refusal by lowering one taxable income, because there is nothing
 * left to be pushed into. The salary is kept at $95,000 and its figures with it; it is no longer
 * load-bearing, and lowering it now moves numbers rather than raising an error, which is the reason
 * this paragraph is superseded rather than deleted.
 */
const ASYMMETRY_HOUSEHOLD = {
  persons: [
    {
      name: 'Nell',
      dateOfBirth: '1972-02-20',
      superInterests: [
        // **NOMINATED, because from P6-8 brief 3 chunk 2b two accumulation interests and no
        // nomination is REFUSED by the walk** — which fund an employer pays into is not derivable
        // from a Person holding two accounts, and this build will not choose. Naming the FIRST also
        // keeps this fixture's second claim sharp: the sacrifice below names interest 1, so a build
        // that credited "the one the employer uses" would land both in the same place and fail.
        { phase: 'accumulation', balance: toCents(200_000), statedEmployerContributionDestination: 'superannuationGuarantee' },
        { phase: 'accumulation', balance: toCents(0) },
      ],
      parcels: [],
      employmentIncomePerFortnight: toCents(3_654),
      workBonusBalance: toCents(0),
    },
    {
      name: 'Owen',
      dateOfBirth: '1957-03-05',
      // Nil, and it matters: crediting the WRONG Person would put the money in an interest held by
      // somebody of Age Pension age, where it is assessed and deemed. The asymmetry test below is
      // therefore also the tripwire on that mutation.
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(0),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
};

const ASYMMETRY_SETTINGS = {
  asAtDate: '2026-10-01',
  planningHorizonAge: 70,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const ASYMMETRY_BASE = [
  entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(50_000) }),
  // Stated rather than derived from the fortnightly figure, because the O30 boundary above is
  // decided by the exact salary.
  entry('w', 'WORK_PATTERN_CHANGE', '2026-10-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(95_000) }),
];

const SACRIFICE = entry('sac', 'SUPER_CONTRIBUTION', '2026-10-01', 'personA', {
  kind: 'salarySacrificed',
  annualAmount: toCents(12_000),
  interestIndex: 1,
});

const asymmetryPlain = () => project(ASYMMETRY_SETTINGS, ASYMMETRY_HOUSEHOLD, ASYMMETRY_BASE);
const asymmetrySacrificed = () => project(ASYMMETRY_SETTINGS, ASYMMETRY_HOUSEHOLD, [...ASYMMETRY_BASE, SACRIFICE]);

/**
 * **The month's arithmetic, worked long and once.** $12,000 a year is a twelfth of itself each
 * month — `mulCents` rounds to the cent — and the fund pays 15% of that under s 26(1)(a).
 */
const MONTHLY_SACRIFICE = 100_000;
const CONTRIBUTIONS_TAX = 15_000;
const NET_OF_TAX = 85_000;
const ACCUMULATION_LINE = 'Investment growth, Nell — Superannuation, Accumulation Phase';
const CREDIT_LINE = 'Salary sacrifice into superannuation, Nell — Superannuation, Accumulation Phase';

test('the amount credited is the sacrifice less the fund’s 15%, and the line says which account', () => {
  assert.equal(Math.round(12_000_00 / 12), MONTHLY_SACRIFICE);
  assert.equal(Math.round(MONTHLY_SACRIFICE * 0.15), CONTRIBUTIONS_TAX);
  assert.equal(MONTHLY_SACRIFICE - CONTRIBUTIONS_TAX, NET_OF_TAX);

  const months = asymmetrySacrificed();
  const credit = lineOf(months, '2026-10', 'Salary sacrifice into superannuation');
  assert.equal(credit.description, CREDIT_LINE, 'the line does not name the Person and the pool the money landed in');
  assert.equal(credit.amount, NET_OF_TAX);
  assert.equal(credit.direction, 'inflow');
  // **NON-CASH, and this is the assertion the Waterfall depends on.** The Household never holds
  // this money — it goes from the employer to the fund — so a `'cash'` line would put it in
  // `closingBalance` and let the Offset Account spend on groceries the very dollars limb 1 was
  // already reduced by in chunk 3. That would be the same money twice.
  assert.equal(credit.effect, 'wealth');
  // The 15% is CARRIED, not merely mentioned: the line's provenance names the register that
  // decided it and the determination shows the subtraction.
  assert.equal(credit.provenance.basis, 'legislated');
  assert.equal(credit.provenance.register, 'superannuation contributions tax');
  assert.equal(credit.provenance.determination[0], `${MONTHLY_SACRIFICE} cents sacrificed, less ${CONTRIBUTIONS_TAX} cents of contributions tax at 0.15`);
  // Division 293's second 15% is not priced here and the line says so rather than implying a total.
  assert.ok(credit.provenance.caveats.some((each) => /Division 293/.test(each)), 'the Div 293 caveat did not travel to the line');
  // And the entry that STATES the figure is named — `attributionOf`'s narrow rule, satisfied here
  // because the sacrifice is precisely what the entry says.
  assert.deepEqual(credit.attribution, { basis: 'entries', entryIds: ['sac'] });
  assert.ok(monthAt(months, '2026-10').appliedEntryIds.includes('sac'), 'a line cites an entry the month does not');
});

test('it lands in the interest the entry NAMED, and not in interest 0', () => {
  // Nell holds two Accumulation Phase interests. The nil one produces no growth line at all, so the
  // COUNT of her accumulation growth lines answers which interest received the money — 1 where
  // only the $200,000 interest is growing, 2 once the nil one has something in it.
  const plain = asymmetryPlain();
  const sacrificed = asymmetrySacrificed();
  const growthLines = (months, month) => monthAt(months, month).lines.filter((line) => line.description === ACCUMULATION_LINE);
  assert.equal(growthLines(plain, '2026-11').length, 1, 'the control: with no contribution Nell’s second interest is nil and silent');
  assert.equal(growthLines(sacrificed, '2026-10').length, 1, 'the credit lands at the END of its own tick, so it cannot have grown in the month it arrived');
  assert.equal(growthLines(sacrificed, '2026-11').length, 2, 'the money went into interest 0 — `interestIndex` is not being read');
  // And the second line is the month's return on exactly what was credited, which is what says the
  // balance behind it is the credit and not a share of the $200,000.
  const [, second] = growthLines(sacrificed, '2026-11');
  assert.equal(second.amount, Math.round(NET_OF_TAX * (Math.pow(1.065, 1 / 12) - 1)), 'the new interest is not growing on the credited balance');
  // The control on the control: the $200,000 interest grows by the same amount in both walks, so
  // the second line is an ADDITION and not a split of the first.
  assert.equal(growthLines(sacrificed, '2026-11')[0].amount, growthLines(plain, '2026-11')[0].amount);
});

test('the money is not spendable, and the cash that left the pay packet is accounted for to the cent', () => {
  const plain = asymmetryPlain();
  const sacrificed = asymmetrySacrificed();
  // **CONSERVATION.** The Household's cash falls by the sacrifice LESS the income tax it no longer
  // pays, and by nothing else. If the credit were a cash line the gap would be $850 smaller; if the
  // money were credited AND left in the pay packet the gap would be nil.
  const taxSaved = amountOf(plain, '2026-10', 'Income tax, Nell') - amountOf(sacrificed, '2026-10', 'Income tax, Nell');
  assert.ok(taxSaved > 0, 'the control: the sacrifice saved income tax, so the identity below is not 0 === 0');
  assert.equal(
    monthAt(plain, '2026-10').closingBalance - monthAt(sacrificed, '2026-10').closingBalance,
    MONTHLY_SACRIFICE - taxSaved,
    'the cash gap is not the sacrifice less the tax saved — the credit is reaching the Offset Account',
  );
  // And the reconciliation itself still holds with a `'wealth'` line in the month: opening plus the
  // CASH lines and nothing else.
  const october = monthAt(sacrificed, '2026-10');
  const cash = october.lines
    .filter((line) => line.effect === 'cash')
    .reduce((total, line) => total + (line.direction === 'inflow' ? line.amount : -line.amount), 0);
  assert.equal(october.openingBalance + cash, october.closingBalance);
  assert.ok(october.lines.some((line) => line.effect === 'wealth' && line.description === CREDIT_LINE), 'the wealth line is not in the month the reconciliation was taken over');

  // **WHAT THE HOUSEHOLD IS WORTH AFTERWARDS, and it is an arbitrage rather than a free lunch.**
  // Protected plus assessable rises by the income tax saved LESS the fund's 15% — 30c in this
  // Household's dollar against 15c — and that difference is the whole of the gain. Taken at
  // 2026-11, the first month that OPENS with a credit in it, so the figures are one month of the
  // arrangement and not a running total.
  const wealth = (months) => monthAt(months, '2026-11').protectedAssets + monthAt(months, '2026-11').assessableAssets;
  assert.equal(wealth(sacrificed) - wealth(plain), taxSaved - CONTRIBUTIONS_TAX);
});

test('the sacrifice RAISES this Household’s Age Pension, and the same arrangement over Age Pension age lowers it', () => {
  const plain = asymmetryPlain();
  const sacrificed = asymmetrySacrificed();
  const pension = (months, month) => amountOf(months, month, 'Age Pension');
  const assessable = (months, month) => monthAt(months, month).assessableAssets;

  // **The month the arrangement starts moves NOTHING, and that is the first half of the claim.**
  // The credit lands after the month has been assessed, and the Age Pension income test is assessed
  // on the GROSS salary by ruling — so a sacrifice has no income-test limb at all. Every movement
  // below is therefore the ASSETS, and the assets alone.
  assert.equal(pension(sacrificed, '2026-10'), pension(plain, '2026-10'));
  assert.ok(pension(plain, '2026-10') > 0, 'the control: a pension is payable, so the equality above is not 0 === 0');

  // **From 2026-11 the pension is HIGHER with the sacrifice. That is the feature.** Nell is 54, so
  // her Accumulation Phase interest is exempt from both tests (§4.8); the Offset Account the money
  // would otherwise have swept into is assessed and deemed from the first dollar. So moving money
  // from one to the other lowers the assessed assets even though the Household is richer.
  for (const month of ['2026-11', '2026-12', '2027-01']) {
    assert.ok(assessable(sacrificed, month) < assessable(plain, month), `${month}: the assessed assets did not fall — is the credit reaching a protected pool?`);
    assert.ok(pension(sacrificed, month) > pension(plain, month), `${month}: the Age Pension did not rise — the protection asymmetry is not reaching the means test`);
  }

  // **PRICED, from the deeming chain and not from the answer.** The couple's financial assets are
  // far below the lower deeming threshold, so the whole gap is deemed at the lower rate. The income
  // test then withdraws 50c of every deemed dollar from the COMBINED rate, of which Owen — the only
  // eligible member of the couple — loses half. So the taper on the gap is **25c in the dollar of
  // deemed income, not 50c**, and that factor of two is the substance of the check below.
  //
  // ⚠️ **It is asserted PER FORTNIGHT and to within one cent, and the tolerance is derived rather
  // than chosen.** Three roundings stand between an asset gap and a monthly pension line: `deeming`
  // rounds the annual amount and then the fortnightly one, and the entitlement itself is a whole
  // number of cents per fortnight before the month's line multiplies it by 26/12. Only the last of
  // those can be undone here — the other two are applied to each walk's own absolute figure, not to
  // the gap, so the two walks can round in opposite directions and put a whole cent a fortnight
  // between the gap and its taper. Asserting an exact monthly equality would therefore be asserting
  // which way two independent roundings happened to fall, which is not a fact about the rule. One
  // cent a fortnight against a ~34c taper still separates 25c in the dollar from 50c by thirty
  // standard errors, which is what this test is for.
  const deemedPerFortnight = (cents) => Math.round(Math.round(cents * ASYMMETRY_SETTINGS.deemingRates.lower) / 26);
  for (const month of ['2026-11', '2026-12', '2027-01', '2027-02']) {
    const gapInDeemedIncome = deemedPerFortnight(assessable(plain, month)) - deemedPerFortnight(assessable(sacrificed, month));
    const taperedPerFortnight = gapInDeemedIncome * 0.5 * 0.5;
    const risePerFortnight = (pension(sacrificed, month) - pension(plain, month)) * 12 / 26;
    assert.ok(gapInDeemedIncome > 0, `${month}: no deemed income was released — the gap is not reaching the income test`);
    assert.ok(
      Math.abs(risePerFortnight - taperedPerFortnight) < 1,
      `${month}: the rise is ${risePerFortnight}c a fortnight and the taper on the asset gap is ${taperedPerFortnight}c — more than a cent apart`,
    );
  }

  // **AND THE OTHER SIGN, which is what makes the first one an asymmetry rather than a bug.** Ida
  // is 68 — she has REACHED Age Pension age — so her Accumulation Phase interest is assessed at the
  // balance and deemed for income. The identical arrangement therefore leaves her assessed assets
  // HIGHER (the income tax saved exceeds the fund's 15%, so she is richer, and all of it is
  // assessed) and her pension LOWER.
  const IDA = {
    persons: [{
      name: 'Ida',
      dateOfBirth: '1958-04-10',
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(2_200),
      workBonusBalance: toCents(0),
    }],
    homeStatus: 'occupied',
  };
  const idaBase = [entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(40_000) })];
  const idaPlain = project({ ...ASYMMETRY_SETTINGS, planningHorizonAge: 72 }, IDA, idaBase);
  const idaSacrificed = project({ ...ASYMMETRY_SETTINGS, planningHorizonAge: 72 }, IDA, [
    ...idaBase,
    entry('sac', 'SUPER_CONTRIBUTION', '2026-11-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(20_000), interestIndex: 0 }),
  ]);
  assert.equal(pension(idaSacrificed, '2026-11'), pension(idaPlain, '2026-11'), 'the month the arrangement starts must still move nothing');
  assert.ok(assessable(idaSacrificed, '2026-12') > assessable(idaPlain, '2026-12'), 'Ida’s super is not being assessed — she has reached Age Pension age');
  assert.ok(pension(idaSacrificed, '2026-12') < pension(idaPlain, '2026-12'), 'Ida’s pension did not FALL — the age gate on the younger-partner exemption is not being applied');
  // The two signs, stated as one claim: the same arrangement, opposite directions, and the only
  // difference between the two Households is which side of Age Pension age the contributor is on.
  assert.ok(
    (pension(sacrificed, '2026-12') - pension(plain, '2026-12')) > 0 &&
      (pension(idaSacrificed, '2026-12') - pension(idaPlain, '2026-12')) < 0,
    'the asymmetry has collapsed — both households now move the same way',
  );
});

test('the credit reaches `assetsByPerson`, and only the contributor’s share of it', () => {
  const plain = asymmetryPlain();
  const sacrificed = asymmetrySacrificed();
  const of = (months, month, index) => monthAt(months, month).assetsByPerson[index];
  // 2026-11 opens with exactly one credit in it and no growth on it yet, so the gap is the net
  // amount to the cent rather than a compounded figure.
  assert.equal(of(sacrificed, '2026-11', 0).protectedAssets - of(plain, '2026-11', 0).protectedAssets, NET_OF_TAX);
  assert.equal(of(sacrificed, '2026-11', 0).assessableAssets, of(plain, '2026-11', 0).assessableAssets);
  // **Owen's split does not move at all**, which is the per-Person half of "the interest the entry
  // named". A credit to the wrong Person would land in an interest held by somebody of Age Pension
  // age, so it would show up here as ASSESSABLE rather than not at all.
  assert.deepEqual(of(sacrificed, '2026-11', 1), of(plain, '2026-11', 1));
  assert.equal(of(sacrificed, '2026-11', 1).protectedAssets, 0, 'the control: Owen holds a nil interest, so a credit to him would be visible');
});

test('a contribution into an interest the Person does not hold is refused by name, not skipped', () => {
  // `parsePlan`'s `checkContributionTargets` refuses this at the door — but `project()` is reached
  // directly by every caller that built a `Household` in code, and a silent no-op there is the
  // P4-12 shape this build refuses for `LUMP_SUM_FROM_SUPER` and refuses here for the same reason:
  // an entry that contributes nothing, forever, with nothing on screen to say so.
  assert.throws(
    () => project(ASYMMETRY_SETTINGS, ASYMMETRY_HOUSEHOLD, [
      ...ASYMMETRY_BASE,
      entry('sac', 'SUPER_CONTRIBUTION', '2026-10-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(12_000), interestIndex: 7 }),
    ]),
    (err) => err instanceof RangeError && /names superannuation interest 7, and Nell holds 2/.test(err.message),
  );
});

// --- P6-8 brief 3, final chunk — THE CONCESSIONAL CAP, ON THE REAL TOTAL -------------------------
//
// Chunk 4 of brief 2 left the walk charging the fund's 15% on an arrangement of any size, where
// ITAA 1997 Div 291 puts the excess into the Person's own assessable income with a 15% offset and
// adds an excess concessional contributions charge. Chunk 5 closed that with a refusal against the
// STATED SACRIFICE ALONE, and said why in terms: the Superannuation Guarantee was stranded, so
// every total the walk could build understated the Person's real one, and a check that can only
// understate can prove a breach and never compliance.
//
// ⚠️ **THAT GROUND IS DISCHARGED AND THIS SECTION IS RE-DERIVED (2026-09-20).** Brief 3 chunk 2b
// credits the Guarantee and feeds it to `concessionalContributions`, so the walk builds a REAL
// concessional total and the cap is measured against it. **Nell is paid $95,000, so her Guarantee
// is $11,400 and the room left for a sacrifice in FY2026-27 is $32,500 − $11,400 = $21,100.** Every
// figure in this section is that subtraction or a consequence of it, and the old boundary ($32,500
// sacrificed, at the cap on its own) is now the mutation this section kills.
//
// **Three properties, and the third is the one that decays silently.**
//
//   1. OVER THE YEAR'S CAP IS REFUSED BY NAME, and the boundary is exact: at the cap is walked.
//   2. PASSING IS STILL NOT A CLAIM OF COMPLIANCE, for a smaller reason than chunk 5's. Carry-
//      forward headroom is not run (it would make the cap larger) and a personal deductible
//      contribution has no field in this model (it would make the total larger), so the check is
//      one-directional in both directions at once and the credit's own caveat says so.
//   3. THE CAP IS THE ONE FOR THE YEAR THE ARRANGEMENT TAKES EFFECT IN — it is indexed, it moves,
//      and testing against "the cap" (FY2026-27's $32,500, for ever) is the mutation this file
//      must kill. It is killed through the one channel the walk has: a later financial year has no
//      AWOTE index number, so above the base amount the walk asks for a cap that does not exist
//      and gets `MissingIndexNumberError` — which a build using today's cap would never raise.
//      The arithmetic of the FY-sensitivity itself is pinned on the pure function, against
//      synthetic index numbers, in `test/core-super-concessional.test.mjs`.

/** FY2026-27's published general concessional cap (register §3.1). Ida-free: this is Nell's year. */
const GENERAL_CAP_2026_27 = 32_500_00;

/** Nell's employer Guarantee: 12% of her $95,000 salary, which SGAA s 10A(1)(h) leaves whole. */
const NELL_GUARANTEE = 11_400_00;

/** What is left of the cap for her to sacrifice, and it is a subtraction rather than a figure. */
const ROOM_FOR_A_SACRIFICE = GENERAL_CAP_2026_27 - NELL_GUARANTEE;

const atLevel = (annualAmount, date = '2026-10-01') =>
  project(ASYMMETRY_SETTINGS, ASYMMETRY_HOUSEHOLD, [
    ...ASYMMETRY_BASE,
    entry('sac', 'SUPER_CONTRIBUTION', date, 'personA', { kind: 'salarySacrificed', annualAmount: toCents(annualAmount / 100), interestIndex: 1 }),
  ]);

test('an arrangement over the year’s general concessional cap is refused by name, and the boundary is a cent wide', () => {
  assert.equal(ROOM_FOR_A_SACRIFICE, 21_100_00);
  assert.equal(Math.round(95_000_00 * 0.12), NELL_GUARANTEE, 'the Guarantee is not 12% of the salary — the room below is measured against the wrong figure');
  // ONE CENT over, and the reason is stated: s 291-20(1) is exceeded only ABOVE the cap, so the
  // pair below is the whole of the boundary and neither half of it is a round number chosen for
  // comfort.
  assert.throws(
    () => atLevel(ROOM_FOR_A_SACRIFICE + 1),
    (err) => {
      assert.equal(err.name, 'ExcessConcessionalContributionsNotModelledError');
      assert.match(err.message, /entry sac \(SUPER_CONTRIBUTION\), Nell/, 'the refusal does not say which entry, so the user cannot find it');
      assert.match(err.message, /3250001 cents of concessional contributions/);
      assert.match(err.message, /2110001 cents salary sacrificed/);
      assert.match(err.message, /1140000 cents of employer Superannuation Guarantee/);
      assert.match(err.message, /cap for FY2026-27 is 3250000 cents/);
      assert.match(err.message, /Div(ision)? 291/, 'the refusal does not name the law it is refusing to guess at');
      return true;
    },
  );
  // AT the cap it is walked, and walked properly — the credit is a twelfth of the SACRIFICE less
  // the fund's 15%, so this is not merely "it did not throw". $21,100 ÷ 12 = $1,758.33 (`mulCents`
  // rounds to the cent), less 15% = $1,494.58.
  const atTheCap = atLevel(ROOM_FOR_A_SACRIFICE);
  assert.equal(Math.round(ROOM_FOR_A_SACRIFICE / 12), 175_833);
  assert.equal(amountOf(atTheCap, '2026-10', CREDIT_LINE), Math.round(175_833 - 175_833 * 0.15));
  assert.equal(Math.round(175_833 - 175_833 * 0.15), 149_458);
  // ⚠️ **AND THE OLD BOUNDARY IS NOW THE MUTATION.** $32,500 is at FY2026-27's cap on its own and
  // $11,400 over it once the employer's 12% is counted. A walk that measured the sacrifice alone —
  // which is what this build did until 2026-09-20 — projects this Household without a word.
  assert.throws(() => atLevel(GENERAL_CAP_2026_27), { name: 'ExcessConcessionalContributionsNotModelledError' });
});

test('a sacrifice inside the cap is NOT a finding that the Person has no excess, and the line says so', () => {
  // **REWRITTEN ON ITS OWN GROUND A SECOND TIME, 2026-09-20 (P6-8 brief 3, final chunk), NOT
  // DELETED.** The sentence chunk 2b left here said the cap check *"is measured against this stated
  // arrangement alone and not against the arrangement plus the Guarantee"*, and that stopped being
  // true the day the total was assembled. The ACCEPTANCE narrowed again rather than vanishing: what
  // keeps the check one-directional now is that carry-forward headroom is not run and a personal
  // deductible contribution has no field in this model — the first would raise the cap and the
  // second the total, so the residue runs both ways and a silent pass is still not a clean bill.
  //
  // ⚠️ The sentence that carries this lives in the line's `determination`, not in its `caveats` —
  // chunk 4 passed it to `taxProvenance` alongside the arithmetic — so that is where it is read
  // from.
  const credit = lineOf(atLevel(ROOM_FOR_A_SACRIFICE), '2026-10', CREDIT_LINE);
  assert.ok(
    credit.provenance.determination.some((each) => /The CAP is measured on the two TOGETHER/.test(each)),
    'the credit line no longer says the cap saw the Guarantee',
  );
  assert.ok(
    credit.provenance.determination.some((each) => /not a finding that the Person has no excess/.test(each)),
    'the statement that keeps the cap check honest has gone — an at-the-cap arrangement now reads as compliant',
  );
  // And the superseded claim is GONE from the live line rather than reworded around: no line of
  // this walk may say the cap saw one limb.
  for (const each of credit.provenance.determination) {
    assert.doesNotMatch(each, /against this stated arrangement alone/);
  }
  // And the Guarantee's own line says the same thing from the other side, so a reader who looks at
  // either half of the Person's concessional contributions is told what the cap measured.
  const guarantee = lineOf(atLevel(ROOM_FOR_A_SACRIFICE), '2026-10', 'Superannuation Guarantee into superannuation');
  assert.ok(
    guarantee.provenance.determination.some((each) => /it counts towards the general concessional cap/.test(each)),
    'the Guarantee line still says it is outside the cap check',
  );
  assert.ok(
    guarantee.provenance.determination.some((each) => /On its own it cannot exceed the cap/.test(each)),
    'the Guarantee line no longer says why an unsacrificing Person is never checked',
  );
});

// ⚠️ **REWRITTEN ON 2026-09-21 (P6-12), AND THE CHANNEL IT TESTS IS NEW.** What this test used to
// prove was FY-sensitivity through a REFUSAL: FY2027-28 had no AWOTE number, so above the base
// amount it raised `MissingIndexNumberError`, and a build using today's cap for every year sailed
// past. The register now holds December 2025's published wage level and the plan states a growth
// rate, so every year from FY2026-27 has a cap — a derived one — and the refusal channel is gone
// for forward years. **The mutation it existed to kill has not gone anywhere**, so it is killed the
// better way instead: the room left for a sacrifice is now a DIFFERENT NUMBER in different years,
// to the cent, and a build that used FY2026-27's cap for every year fails on the second pair below.
test('the cap is the YEAR\'s, and the room a later year leaves is a different figure to the cent', () => {
  // **FY2027-28, and it is derived.** December 2025's published 2051.10 grown one year at this
  // plan's stated 3.5% is 2122.888; over the December 2016 base of 1533.40 that is a factor of 1.385
  // (s 960-285(6), three decimals); $25,000 × 1.385 = $34,622.50, floored to the $2,500 step is
  // $32,500.
  // ⚠️ **AND NELL'S GUARANTEE IS NO LONGER $11,400 IN THOSE YEARS (2026-09-23).** Pay rises with
  // wages: her $95,000 is stated in the wage level of October 2026 and the same 3.5% raises it every
  // month, so the Guarantee the cap is tested against in the month the arrangement is stated is 12%
  // of THAT month's salary. July 2027 is 9 months on: $95,000 × 1.035 ^ (9/12) = $97,483.00, a
  // Guarantee of $11,697.96, a room of $32,500 − $11,697.96 = $20,802.04 — $297.96 less than the
  // $21,100 of flat pay, and it is the rising Guarantee that took it.
  const guaranteeAfter = (months) => Math.round(Math.round(9_500_000 * 1.035 ** (months / 12)) * 0.12);
  assert.equal(guaranteeAfter(9), 11_697_96);
  const room2027 = 32_500_00 - guaranteeAfter(9);
  assert.equal(room2027, 20_802_04);
  assert.equal(GENERAL_CAP_2026_27 - NELL_GUARANTEE, 21_100_00, 'the flat-pay room, kept beside the new one');
  assert.ok(amountOf(atLevel(room2027, '2027-07-01'), '2027-07', CREDIT_LINE) > 0);
  assert.throws(() => atLevel(room2027 + 1, '2027-07-01'), { name: 'ExcessConcessionalContributionsNotModelledError' });
  // **FY2028-29, and this is the pair that kills "the cap is $32,500 for ever".** Two years of 3.5%
  // takes the wage level to 2197.190, the factor to 1.433, and $25,000 × 1.433 = $35,825, which
  // floors to $35,000 — one $2,500 step up. July 2028 is 21 months on, so Nell's Guarantee is 12% of
  // $95,000 × 1.035 ^ (21/12) = $100,894.90, $12,107.39, and the room is $35,000 − $12,107.39 =
  // $22,892.61 ($23,600 on flat pay). The cent either side of it is the boundary.
  assert.equal(guaranteeAfter(21), 12_107_39);
  const room2028 = 35_000_00 - guaranteeAfter(21);
  assert.equal(room2028, 22_892_61);
  assert.ok(amountOf(atLevel(room2028, '2028-07-01'), '2028-07', CREDIT_LINE) > 0);
  assert.throws(() => atLevel(room2028 + 1, '2028-07-01'), { name: 'ExcessConcessionalContributionsNotModelledError' });
  // The two years disagree, which is the whole point: $22,892.61 is inside FY2028-29's cap and over
  // FY2027-28's.
  assert.throws(() => atLevel(room2028, '2027-07-01'), { name: 'ExcessConcessionalContributionsNotModelledError' });
  // ⚠️ **AND THE REFUSAL SAYS THE CAP WAS A FORECAST.** Half the ruling of 2026-09-21 was the label:
  // a Person refused against a figure their own wage assumption produced must be told that is what
  // happened, because nothing published says their contribution is over any cap.
  let message = '';
  assert.throws(
    () => atLevel(room2028, '2027-07-01'),
    (error) => {
      message = error.message;
      return true;
    },
  );
  assert.match(message, /FORECAST AND NOT THE LAW/);
  assert.match(message, /wage growth rate stated in this plan/);
  // ⚠️ **THE BEHAVIOUR CHANGE, STATED.** $20,000 dated FY2027-28 was REFUSED by name before
  // 2026-09-21 and walks now, and $25,000 was refused for want of a cap and is refused now for
  // exceeding one. The direction is flattering — bigger caps, fewer refusals — and it was ruled on
  // that ground: a cap frozen at $25,000 for forty years is not a cautious forecast, it is a wrong
  // one.
  assert.ok(amountOf(atLevel(20_000_00, '2027-07-01'), '2027-07', CREDIT_LINE) > 0);
  assert.throws(() => atLevel(25_000_00, '2027-07-01'), { name: 'ExcessConcessionalContributionsNotModelledError' });
});
