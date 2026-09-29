// P3-11 — the Age Pension means test: combined then halved, both tests, take the lesser.
// Register §4, ADR-0003.
//
// Every Household here is synthetic and obviously fake — round numbers, placeholder names, no
// real personal figures. The hand-worked fixture at the top reconciles end to end against the
// register's own published parameters and is the seed for P13-3 (verification against Services
// Australia).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { MissingDeemingRatesError } from '../dist/core/deeming.js';
import { UnvaluedAssessableHomeError, agePensionEntitlement } from '../dist/core/agePension.js';

const person = (name, dateOfBirth, overrides = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...overrides,
});

/** A homeowner couple, both well past 67, holding one Account-Based Pension of `balance`. */
const coupleWith = (balance, overrides = {}) => ({
  persons: [
    person('Alex', '1955-01-01', {
      superInterests: [{ phase: 'accountBasedPension', balance: toCents(balance) }],
      ...overrides,
    }),
    person('Blair', '1957-01-01'),
  ],
  homeStatus: 'occupied',
});

// 20 September 2026: parameter period 3 — the 20 Sep 2026 rate set against the 1 Jul 2026 free
// areas and deeming thresholds, with the 20 Sep 2026 deeming rates.
const ON = '2026-09-20';

// --- The hand-worked fixture --------------------------------------------------------------------

test('hand-worked fixture — a $700,000 homeowner couple on 20 Sep 2026, reconciled line by line', () => {
  const result = agePensionEntitlement({ household: coupleWith(700_000), date: ON });

  // Parameters, from the register and nowhere else.
  assert.equal(result.ratesEffective, '2026-09-20');
  assert.equal(result.meansTestEffective, '2026-07-01');
  assert.equal(result.status, 'coupleCombined');

  // Maximum Payment Rate: basic $1,711.80 + Pension Supplement $133.00 + Energy Supplement $21.20
  // + Rent Assistance nil = $1,866.00 combined (§4.2).
  assert.equal(result.maximumPaymentRate, toCents(1_866));

  // Income test. Deemed: $110,600 × 1.75% = $1,935.50; $589,400 × 3.75% = $22,102.50;
  // $24,038.00 a year ÷ 26 = $924.54 a fortnight. Free area $396.00 combined.
  // ($924.54 − $396.00) × 50c = $264.27. $1,866.00 − $264.27 = $1,601.73.
  assert.equal(result.deeming.annual, toCents(24_038));
  assert.equal(result.incomeTest.assessed, toCents(924.54));
  assert.equal(result.incomeTest.freeArea, toCents(396));
  assert.equal(result.incomeTest.excess, toCents(528.54));
  assert.equal(result.incomeTest.reduction, toCents(264.27));
  assert.equal(result.incomeTest.rate, toCents(1_601.73));

  // Assets test. Assessable Assets $700,000; free area $499,000 combined homeowner.
  // $201,000 ÷ $1,000 × $3.00 = $603.00. $1,866.00 − $603.00 = $1,263.00.
  assert.equal(result.assets.assessableAssets, toCents(700_000));
  assert.equal(result.assetsTest.freeArea, toCents(499_000));
  assert.equal(result.assetsTest.excess, toCents(201_000));
  assert.equal(result.assetsTest.reduction, toCents(603));
  assert.equal(result.assetsTest.rate, toCents(1_263));

  // The lesser applies: the assets test, at $1,263.00 combined. Halved once: $631.50 each.
  assert.equal(result.bindingTest, 'assets');
  assert.equal(result.combinedRatePerFortnight, toCents(1_263));
  assert.equal(result.perPersonRatePerFortnight, toCents(631.5));
  assert.deepEqual([...result.eligiblePersons], ['Alex', 'Blair']);
  assert.equal(result.householdRatePerFortnight, toCents(1_263));
  assert.equal(result.pensionerConcessionCard, true);

  // The derived cut-offs reproduce the register's published fixtures (T25), including the $250
  // round-up on the assets side. They are derived here, never stored.
  assert.equal(result.incomeTest.cutOff, toCents(4_128));
  assert.equal(result.assetsTest.cutOff, toCents(1_121_000));
});

// --- T135: the assets excess floors in $250 steps per Person (SSA 1991 s1064 point 1064-G7) -----
//
// Found 2026-09-24 (P13-3 run 2) as an 8-cent understatement against Services Australia Payment
// Finder, 20 Sep 2026 rates: a homeowner couple, both 67, no income, all assets deemed (Managed
// Investments). Point 1064-G7 disregards any part of a Person's assets excess that is not a
// multiple of $250; each member of a couple takes half the combined excess (point 1064-G5), so the
// floor lands on the COMBINED excess in $500 steps for a couple and $250 steps for a single
// Person. Two Payment Finder figures pin it because a $250 step and a $1,000 step cannot be told
// apart by every fixture — see the second case below.
test('T135 — a couple assets excess floors to the nearest $500, reproducing Payment Finder to the cent', () => {
  // $608,054 assessable assets; free area $499,000 combined homeowner (1 Jul 2026).
  // Raw excess $109,054.00 floors to $109,000.00 (nearest $500 below).
  // $109,000 ÷ $1,000 × $3.00 = $327.00 reduction. $1,866.00 − $327.00 = $1,539.00 combined.
  // Halved: $769.50 each — Payment Finder's $692.40 basic + $66.50 PS + $10.60 ES = $769.50.
  const result = agePensionEntitlement({ household: coupleWith(608_054), date: ON });
  assert.equal(result.bindingTest, 'assets');
  assert.equal(result.assetsTest.excess, toCents(109_000));
  assert.equal(result.assetsTest.reduction, toCents(327));
  assert.equal(result.assetsTest.rate, toCents(1_539));
  assert.equal(result.perPersonRatePerFortnight, toCents(769.5));
});

test('T135 — a $250 floor or a $1,000 floor both disagree with Payment Finder; only $500 agrees', () => {
  // $609,900 assessable assets; free area $499,000. Raw excess $110,900.00.
  //   floor to $500 (correct): $110,500.00 → $331.50 reduction → $1,534.50 combined → $767.25 each,
  //     matching Payment Finder's $690.15 basic + $66.50 PS + $10.60 ES = $767.25.
  //   floor to $250: $110,750.00 → $332.25 reduction → $1,533.75 combined → $766.88 each (wrong).
  //   floor to $1,000: $110,000.00 → $330.00 reduction → $1,536.00 combined → $768.00 each (wrong).
  //   no floor (continuous): $110,900.00 → $332.70 reduction → $1,533.30 combined → $766.65 each (wrong).
  const result = agePensionEntitlement({ household: coupleWith(609_900), date: ON });
  assert.equal(result.bindingTest, 'assets');
  assert.equal(result.assetsTest.excess, toCents(110_500));
  assert.equal(result.assetsTest.reduction, toCents(331.5));
  assert.equal(result.assetsTest.rate, toCents(1_534.5));
  assert.equal(result.perPersonRatePerFortnight, toCents(767.25));
});

test('T135 — a single Person floors to the nearest $250, hand-worked', () => {
  // $410,120 assessable assets; free area $333,000 single homeowner (1 Jul 2026).
  // Raw excess $77,120.00 floors to $77,000.00 (nearest $250 below — 77,120 ÷ 250 = 308.48).
  // $77,000 ÷ $1,000 × $3.00 = $231.00 reduction. Maximum single rate $1,135.40 basic +
  // $88.20 PS + $14.10 ES = $1,237.70 (§4.2 / T31). $1,237.70 − $231.00 = $1,006.70.
  // A continuous taper would take $231.36 off the raw excess and give $1,006.34 instead — 36c high.
  const household = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(410_120) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const result = agePensionEntitlement({ household, date: ON });
  assert.equal(result.status, 'single');
  assert.equal(result.assetsTest.freeArea, toCents(333_000));
  assert.equal(result.assetsTest.excess, toCents(77_000));
  assert.equal(result.assetsTest.reduction, toCents(231));
  assert.equal(result.maximumPaymentRate, toCents(1_237.7));
  assert.equal(result.assetsTest.rate, toCents(1_006.7));
  assert.equal(result.perPersonRatePerFortnight, result.assetsTest.rate, 'nothing is halved for a single Household');
});

// --- Combined then halved -----------------------------------------------------------------------

test('a couple is computed ONCE on combined means, then halved — asymmetry must not matter', () => {
  // The same $900,000 of Account-Based Pension, held entirely by Alex or split evenly. A
  // per-Person calculation cannot give the same answer to both, because Blair's half would sit
  // under a half free area and clamp at the maximum while Alex's would taper past zero.
  const allWithAlex = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(900_000) }],
      }),
      person('Blair', '1957-01-01'),
    ],
    homeStatus: 'occupied',
  };
  const splitEvenly = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(450_000) }],
      }),
      person('Blair', '1957-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(450_000) }],
      }),
    ],
    homeStatus: 'occupied',
  };

  const a = agePensionEntitlement({ household: allWithAlex, date: ON });
  const b = agePensionEntitlement({ household: splitEvenly, date: ON });

  assert.equal(a.combinedRatePerFortnight, b.combinedRatePerFortnight);
  assert.equal(a.incomeTest.rate, b.incomeTest.rate);
  assert.equal(a.assetsTest.rate, b.assetsTest.rate);

  // $900,000 − $499,000 = $401,000 → $1,203.00 reduction → $663.00 combined, $331.50 each.
  assert.equal(a.combinedRatePerFortnight, toCents(663));
  assert.equal(a.perPersonRatePerFortnight, toCents(331.5));

  // The mutation this must catch, written out: a per-Person assets test at the `coupleEach` rate
  // against half the free area. It agrees on the symmetric Household and is wrong on the other,
  // so a test using only `splitEvenly` would prove nothing.
  const perPerson = (balances) =>
    balances.reduce((total, balance) => {
      const excess = Math.max(0, balance - 499_000 / 2);
      return total + Math.max(0, 933 - (excess / 1_000) * 3);
    }, 0);
  assert.equal(perPerson([450_000, 450_000]), 663, 'the symmetric case is blind to the mutation');
  assert.equal(perPerson([900_000, 0]), 933, 'the asymmetric case is not');
  assert.notEqual(toCents(perPerson([900_000, 0])), a.combinedRatePerFortnight);
});

test('combined then halved on the income side too — one Person earning, one not', () => {
  // Alex earns $2,000 a fortnight with an empty Work Bonus balance; Blair earns nothing and holds
  // the full $11,800. Only $300 of Alex's income is sheltered — the balance is Blair's and stays
  // Blair's (T29) — and the $1,700 remainder reaches the Household through the COMBINED test.
  const household = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
        employmentIncomePerFortnight: toCents(2_000),
        workBonusBalance: toCents(0),
      }),
      person('Blair', '1957-01-01', { workBonusBalance: toCents(11_800) }),
    ],
    homeStatus: 'occupied',
  };
  const result = agePensionEntitlement({ household, date: ON });

  assert.equal(result.workBonus[0].assessedEmploymentIncome, toCents(1_700));
  assert.equal(result.workBonus[1].balanceAfter, toCents(11_800));

  // Deemed on $300,000: $1,935.50 + $189,400 × 3.75% = $9,038.00 a year → $347.62 a fortnight.
  // Combined assessed income $1,700.00 + $347.62 = $2,047.62; less $396.00 = $1,651.62;
  // × 50c = $825.81; $1,866.00 − $825.81 = $1,040.19.
  assert.equal(result.incomeTest.assessed, toCents(2_047.62));
  assert.equal(result.incomeTest.rate, toCents(1_040.19));
  assert.equal(result.bindingTest, 'income');
  // $1,040.19 ÷ 2 = $520.095, which is not a whole number of cents: the halving rounds half away
  // from zero, so 2 × the per-Person rate is a cent more than the combined rate. The combined
  // figure is the one the calculation produced; the halved one is a presentation of it.
  assert.equal(result.perPersonRatePerFortnight, toCents(520.1));
  assert.equal(result.perPersonRatePerFortnight * 2 - result.combinedRatePerFortnight, 1);
});

// --- Both tests, take the lesser ----------------------------------------------------------------

test('the assets test binds', () => {
  const result = agePensionEntitlement({ household: coupleWith(700_000), date: ON });
  assert.equal(result.bindingTest, 'assets');
  assert.ok(result.assetsTest.rate < result.incomeTest.rate);
  assert.equal(result.combinedRatePerFortnight, result.assetsTest.rate);
});

test('the income test binds', () => {
  // $520,000: assets excess $21,000 → $63.00 reduction → $1,803.00. Deemed $17,288.00 a year →
  // $664.92 a fortnight → ($664.92 − $396.00) × 50c = $134.46 → $1,731.54. The income test is lower.
  const result = agePensionEntitlement({ household: coupleWith(520_000), date: ON });
  assert.equal(result.assetsTest.rate, toCents(1_803));
  assert.equal(result.incomeTest.rate, toCents(1_731.54));
  assert.equal(result.bindingTest, 'income');
  assert.equal(result.combinedRatePerFortnight, toCents(1_731.54));
});

test('neither test binds — both are at the Maximum Payment Rate', () => {
  const result = agePensionEntitlement({ household: coupleWith(200_000), date: ON });
  assert.equal(result.incomeTest.rate, toCents(1_866));
  assert.equal(result.assetsTest.rate, toCents(1_866));
  assert.equal(result.bindingTest, 'neither');
  assert.equal(result.combinedRatePerFortnight, toCents(1_866));
  assert.equal(result.perPersonRatePerFortnight, toCents(933));
});

test('the tests cross exactly once, and the entitlement is the lesser at every point', () => {
  let crossings = 0;
  let previous;
  for (let balance = 300_000; balance <= 900_000; balance += 1_000) {
    const result = agePensionEntitlement({ household: coupleWith(balance), date: ON });
    const lesser = Math.min(result.incomeTest.rate, result.assetsTest.rate);
    assert.equal(result.combinedRatePerFortnight, lesser, `at $${balance} the lesser must apply`);
    assert.equal(result.perPersonRatePerFortnight, Math.round(lesser / 2));

    const binding = result.assetsTest.rate < result.incomeTest.rate ? 'assets' : 'income';
    if (previous !== undefined && binding !== previous) crossings += 1;
    previous = binding;
  }
  assert.equal(crossings, 1, 'income binds below the crossover, assets above — exactly one switch');

  // The crossover sits between $551,000 and $552,000 at these parameters. Asserted so that a
  // change to either taper moves a number here rather than passing silently.
  assert.equal(agePensionEntitlement({ household: coupleWith(551_000), date: ON }).bindingTest, 'income');
  assert.equal(agePensionEntitlement({ household: coupleWith(552_000), date: ON }).bindingTest, 'assets');
});

test('ADR-0003 — above the cut-off the answer is zero, not small', () => {
  const atCutOff = agePensionEntitlement({ household: coupleWith(1_121_000), date: ON });
  assert.equal(atCutOff.combinedRatePerFortnight, toCents(0));
  assert.equal(atCutOff.householdRatePerFortnight, toCents(0));
  assert.equal(atCutOff.pensionerConcessionCard, false, 'no entitlement, no Pensioner Concession Card');

  const above = agePensionEntitlement({ household: coupleWith(2_000_000), date: ON });
  assert.equal(above.combinedRatePerFortnight, toCents(0));
  assert.equal(above.perPersonRatePerFortnight, toCents(0));

  // And just inside it there is still something, however small — the card's whole point.
  const inside = agePensionEntitlement({ household: coupleWith(1_120_000), date: ON });
  assert.ok(inside.combinedRatePerFortnight > 0);
  assert.equal(inside.pensionerConcessionCard, true);
});

// --- Free areas and thresholds ------------------------------------------------------------------

test('T26 — the non-homeowner free area is the homeowner figure plus the extra allowable amount', () => {
  const homeowner = agePensionEntitlement({ household: coupleWith(700_000), date: ON });
  const nonHomeowner = agePensionEntitlement({
    household: { ...coupleWith(700_000), homeStatus: 'noHome' },
    date: ON,
  });

  assert.equal(homeowner.assetsTest.freeArea, toCents(499_000));
  assert.equal(nonHomeowner.assetsTest.freeArea, toCents(766_000));
  assert.equal(
    nonHomeowner.assetsTest.freeArea - homeowner.assetsTest.freeArea,
    toCents(267_000),
    'one indexed differential, not a second series',
  );
  assert.equal(nonHomeowner.assetsTest.cutOff, toCents(1_388_000));

  // $700,000 is under the non-homeowner free area entirely, so only the income test can bind.
  assert.equal(nonHomeowner.assetsTest.rate, toCents(1_866));
  assert.equal(nonHomeowner.bindingTest, 'income');
});

test('T22 — the parameter period is selected by date, and the 1 July set moves before the rates do', () => {
  const june = agePensionEntitlement({ household: coupleWith(700_000), date: '2026-06-30' });
  const july = agePensionEntitlement({ household: coupleWith(700_000), date: '2026-07-01' });
  const september = agePensionEntitlement({ household: coupleWith(700_000), date: ON });

  // Same rates in June and July; different free areas.
  assert.equal(june.maximumPaymentRate, july.maximumPaymentRate);
  assert.equal(june.maximumPaymentRate, toCents(1_810.4));
  assert.equal(june.assetsTest.freeArea, toCents(481_500));
  assert.equal(july.assetsTest.freeArea, toCents(499_000));
  assert.equal(june.incomeTest.freeArea, toCents(380));
  assert.equal(july.incomeTest.freeArea, toCents(396));

  // And the rates move on 20 September while the free areas hold.
  assert.equal(september.maximumPaymentRate, toCents(1_866));
  assert.equal(september.assetsTest.freeArea, july.assetsTest.freeArea);
});

test('a single Household uses the single rate and free areas, and nothing is halved', () => {
  const household = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(400_000) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const result = agePensionEntitlement({ household, date: ON });

  assert.equal(result.status, 'single');
  // $1,135.40 + $88.20 + $14.10 = $1,237.70.
  assert.equal(result.maximumPaymentRate, toCents(1_237.7));
  assert.equal(result.assetsTest.freeArea, toCents(333_000));
  assert.equal(result.incomeTest.freeArea, toCents(226));
  assert.equal(result.assetsTest.cutOff, toCents(745_750));
  assert.equal(result.incomeTest.cutOff, toCents(2_701.4));
  assert.equal(result.deeming.threshold, toCents(66_800));
  assert.equal(result.perPersonRatePerFortnight, result.combinedRatePerFortnight);
  assert.equal(result.householdRatePerFortnight, result.combinedRatePerFortnight);
});

// --- P12-4: the illness-separated couple, the third path -----------------------------------------

test('P12-4 — an illness-separated couple: the single rate each, on the COUPLE’s combined means and free areas', () => {
  // The same $700,000 as the hand-worked fixture, three ways. Every figure differs, so reverting
  // the third path to the plain couple/single binary, or to halving the couple rate, is caught.
  const couple = agePensionEntitlement({ household: coupleWith(700_000), date: ON });
  const separated = agePensionEntitlement({ household: coupleWith(700_000), date: ON, illnessSeparated: true });
  const single = agePensionEntitlement({
    household: { persons: [coupleWith(700_000).persons[0]], homeStatus: 'occupied' },
    date: ON,
  });

  // The maximum is the single $1,237.70, paid to each of two: $2,475.40 combined.
  assert.equal(separated.status, 'single');
  assert.equal(separated.illnessSeparated, true);
  assert.equal(separated.maximumPaymentRate, toCents(2_475.4));

  // The means stay the couple's: the couple free areas and the couple deeming threshold, so the
  // assessed income is the couple's $924.54, not the single $958.23.
  assert.equal(separated.incomeTest.freeArea, toCents(396));
  assert.equal(separated.assetsTest.freeArea, toCents(499_000));
  assert.equal(separated.deeming.threshold, toCents(110_600));
  assert.equal(separated.incomeTest.assessed, couple.incomeTest.assessed);
  assert.equal(separated.incomeTest.reduction, couple.incomeTest.reduction);
  assert.equal(separated.assetsTest.reduction, couple.assetsTest.reduction);

  // The cut-offs are the register's published illness-separated figures for 20 Sep 2026 (§4.3,
  // §4.4): $5,346.80 a fortnight and $1,324,500 homeowner — the assets one only with the round-up
  // on each Person's excess before doubling, which `personsAtThatRate: 2` carries.
  assert.equal(separated.incomeTest.cutOff, toCents(5_346.8));
  assert.equal(separated.assetsTest.cutOff, toCents(1_324_500));

  // Assets: $2,475.40 − $603.00 = $1,872.40 combined, $936.20 each. Income: $2,475.40 − $264.27 =
  // $2,211.13. The assets test binds.
  assert.equal(separated.incomeTest.rate, toCents(2_211.13));
  assert.equal(separated.assetsTest.rate, toCents(1_872.4));
  assert.equal(separated.bindingTest, 'assets');
  assert.equal(separated.combinedRatePerFortnight, toCents(1_872.4));
  assert.equal(separated.householdRatePerFortnight, toCents(1_872.4));

  // The three answers, per Person per fortnight.
  assert.equal(couple.perPersonRatePerFortnight, toCents(631.5));
  assert.equal(separated.perPersonRatePerFortnight, toCents(936.2));
  assert.equal(single.perPersonRatePerFortnight, toCents(136.7));

  // Absent is a couple living together, and the field is not on its entitlement at all.
  assert.equal('illnessSeparated' in couple, false);
  assert.deepEqual(agePensionEntitlement({ household: coupleWith(700_000), date: ON, illnessSeparated: false }), couple);
});

test('P12-4 — an illness separation is refused for a single Household: there is nobody to be separated from', () => {
  assert.throws(
    () => agePensionEntitlement({ household: { persons: [coupleWith(700_000).persons[0]], homeStatus: 'occupied' }, date: ON, illnessSeparated: true }),
    /illness separation needs a couple/,
  );
});

// --- Account-Based Pensions, deeming, and refusing to guess ---------------------------------------

test('an Account-Based Pension is assessed under BOTH tests — at balance, and by deeming', () => {
  const result = agePensionEntitlement({ household: coupleWith(700_000), date: ON });
  assert.equal(result.assetsTest.assessed, toCents(700_000), 'assets: the account balance');
  assert.equal(result.deeming.financialAssets, toCents(700_000), 'income: deemed as a financial asset');
  assert.ok(result.incomeTest.assessed > 0);
});

test('T30 — past the last determination the deeming rates must be supplied, or nothing is computed', () => {
  const household = coupleWith(700_000);
  assert.throws(() => agePensionEntitlement({ household, date: '2026-11-15' }), MissingDeemingRatesError);

  const supplied = agePensionEntitlement({
    household,
    date: '2026-11-15',
    deemingRates: { lower: 0.0175, upper: 0.0375 },
  });
  assert.equal(supplied.combinedRatePerFortnight, toCents(1_263));

  // The lever moves the answer, which is the point of it being a Setting.
  const harsher = agePensionEntitlement({
    household,
    date: '2026-11-15',
    deemingRates: { lower: 0.05, upper: 0.08 },
  });
  assert.ok(harsher.incomeTest.rate < supplied.incomeTest.rate);
});

test('a vacated home past the two-year cliff is assessable at a value this model may not read, so the calculation refuses', () => {
  // RENAMED 2026-09-11 (P3-36). It was "the register contradicts itself on the vacated-home
  // cliff": the fourth copy of a claim that stopped being true on 2026-09-04, and the one the
  // suite called the behaviour by. T39 was resolved that day in favour of T42, by a user ruling;
  // what the register records is a knowing law/scope divergence, and that divergence IS the
  // resolution. Nothing below changed — the same throw, the same three exempt statuses, the same
  // three rates.
  assert.throws(
    () =>
      agePensionEntitlement({
        household: { ...coupleWith(700_000), homeStatus: 'vacatedBeyondTwoYearExemption' },
        date: ON,
      }),
    UnvaluedAssessableHomeError,
  );

  // Every other status computes, and all three exempt statuses give the same answer — the home's
  // exemption is worth its whole value and its value is worth nothing.
  const rates = ['occupied', 'vacatedProtectedPersonRemains', 'vacatedWithinTwoYearExemption'].map(
    (homeStatus) =>
      agePensionEntitlement({ household: { ...coupleWith(700_000), homeStatus }, date: ON })
        .combinedRatePerFortnight,
  );
  assert.deepEqual(rates, [toCents(1_263), toCents(1_263), toCents(1_263)]);
});

test('nothing reads the clock — the same Household on the same date is byte-identical', () => {
  const household = coupleWith(700_000);
  const a = agePensionEntitlement({ household, date: ON });
  const b = agePensionEntitlement({ household, date: ON });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

test('MUTATION P3-36 — the refusal does not call this a contradiction in the register, reworded or not', () => {
  // The message said "The register contradicts itself here." It was written in `49caaf2` at 08:09
  // on 2026-09-04 and was false by 11:05 the same morning, when `ff085db` landed the user ruling
  // that resolved T39 in favour of T42 — and it went untouched for a week. Two defects in one
  // sentence: a fact that expired, and the wrong KIND of refusal. "The register contradicts
  // itself" describes a drift tripwire on the register's own records, the kind
  // `PublishedCapMismatchError` actually is; this one reads `homeStatus` and compares no record
  // with any other. It is a scope refusal (register §4.4.1), and what is missing is permission to
  // connect a value the model already holds.
  //
  // Layered, and deliberately NOT an equality assertion on the message: `09d84c9` is this repo's
  // record of a prose pin holding a falsehood in place, and a canary that freezes the wording
  // would trade one failure mode for the other. This forbids the claim; it does not fix the text.
  let message = '';
  assert.throws(
    () =>
      agePensionEntitlement({
        household: { ...coupleWith(700_000), homeStatus: 'vacatedBeyondTwoYearExemption' },
        date: ON,
      }),
    (error) => {
      message = error.message;
      return true;
    },
  );

  // Layer 0 — the refusal is unchanged and its sound half survives intact.
  assert.match(message, /past its two-year exemption and is therefore assessable/);
  assert.match(message, /Refusing to compute rather than silently under-assess\./);

  // Layer 1 — the wording the claim wore, and its near shapes.
  for (const shape of [
    /The register contradicts itself here/i,
    /\bregister\b[^.]{0,40}\bcontradict/i,
    /\bcontradict\w*\b/i,
    /\bself-contradiction\b/i,
    /\bT39\b[^.]{0,40}\b(?:versus|vs\.?|against)\b[^.]{0,20}\bT42\b[^.]{0,60}\b(?:cannot|can't|conflict|clash|disagree)/i,
    /\b(?:at odds|inconsistent|irreconcilable|in conflict)\b/i,
    /\bcannot both\b/i,
    /\bboth\b[^.]{0,30}\bcannot be\b/i,
  ]) {
    assert.doesNotMatch(message, shape, `${shape} — T39 was resolved in favour of T42 on 2026-09-04`);
  }

  // Layer 2 — the claim's vocabulary against the refusal's own. A reword has to say that two
  // records disagree; this refusal's subject is a resolved divergence and a value it may not read,
  // so the words the claim needs are words this message has no use for. The one "register" left is
  // the citation, and a second is a claim about the document rather than a pointer into it.
  assert.equal(
    [...message.matchAll(/\bregister\b/gi)].length,
    2,
    'two: "register T39 states that law" and the §4.4.1 citation. A third is the document being ' +
      'made the subject again, which is where the removed sentence sat',
  );
  for (const word of [/\bdisagree/i, /\bincoherent\b/i, /\bunresolved\b/i, /\bopen question\b/i]) {
    assert.doesNotMatch(message, word, `${word} — this is resolved, by ruling, and dated`);
  }

  // Layer 3 — topic and count, which is the layer a fresh paraphrase has to get past. Four
  // statements, each anchored to one of this refusal's subjects. A contradiction sentence that
  // borrows "T39" and "T42" to look on-topic still has to be a fifth statement or displace one of
  // the four, and displacing one drops a positive anchor below.
  const sentences = message.split(/(?<=\.)\s+/).filter((sentence) => sentence.trim() !== '');
  assert.equal(
    sentences.length,
    4,
    `four statements: the home is assessable and unvalued, the divergence is the resolution, the ` +
      `kind of refusal this is, and the refusal. The message split into ${sentences.length}`,
  );
  for (const sentence of sentences) {
    assert.match(
      sentence,
      /T39|T42|ADR-0005|Phase 14|scope refusal|two-year exemption|Refusing to compute/,
      `"${sentence}" is about none of this refusal's subjects`,
    );
  }

  // The positive claims, which are what a displacing reword would have to remove.
  assert.match(message, /T39 was resolved on 2026-09-04 in favour of T42/);
  assert.match(message, /knowing divergence between the law and v1 scope, and that divergence is the resolution/);
  assert.match(message, /This is a scope refusal/);
  assert.match(message, /full assessment belongs to Phase 14/);
});
