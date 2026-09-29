// P5-3 limb 2 and P5-4 — the provenance a `Month` carries, and the four things it has to survive.
//
// **What this file is written against.** Thirteen core modules return a `ComputedProvenance`, and
// until this item `projection.ts` computed `householdIncomeTax(...).provenance` in every one of a
// walk's ~580 months and threw it away. ADR-0006 makes provenance a hard gate on output and writes
// the citation the chat must be able to make in full: *"$1,240 a fortnight of Age Pension in
// Mar-2034, **from the assets test** — month table, Mar-2034, Age Pension row"*. Three claims live
// in that sentence — a figure, a register, and which limb of the register decided it — and the
// engine could prove only the first.
//
// Five things are defended here and nothing else:
//
//   1. **WHICH TEST BOUND reaches the `Month`.** Two fixtures that differ in which means test binds,
//      with the binding derived from the register's own free areas rather than read off the answer.
//   2. **P5-4a: a BORROWED figure still reads as borrowed** after the merge to the `Month`. The
//      Medicare low-income thresholds are stamped FY2025-26 with `priorYearFallbackFor: '2026-27'`,
//      and the sentence that says so must not become the ordinary out-of-year sentence.
//   3. **The empty case is PRESENT, and there are THREE kinds of it, not two.** A growth line has no
//      register behind it; an Account-Based Pension payment has one that this build does not carry;
//      and the two must not be the same value.
//   4. **P5-4: the FY stamp reaches the figure**, and it is the ASSESSMENT's year — which is not the
//      month's own year for the one line in the build where the two disagree.
//   5. **Past the published window the pension figure arrives `unverified`** and names the Setting
//      that made it so, rather than wearing the register's confidence.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION_LINE,
  PENSION_MINIMUM_PROVENANCE,
  TAX_TRUE_UP_LINE,
  UNLEGISLATED,
  project,
} from '../dist/core/projection.js';
import { AGE_PENSION } from '../dist/data/assumptions/agePension.js';
import { TAX } from '../dist/data/assumptions/tax.js';
import { CONFIDENCE_ORDER } from '../dist/core/provenance.js';

// --- Fixtures ------------------------------------------------------------------------------------

const person = (name, dateOfBirth, extra = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...extra,
});

/**
 * The forward series, built from four STATED growth paths that are all different from each other.
 * It is the caller's own act (register O5) and carries no confidence, which is the whole of why a
 * figure indexed from it cannot be `primary-verified`.
 */
const longSeries = (lastYear) => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  let mtawe = 107_000;
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const month of ['03-20', '09-20']) {
      mtawe *= 1.0175;
      rateIndexations.push({
        effective: `${year}-${month}`,
        cpi: 1.0125,
        pblci: 1.011,
        annualisedMtawe: toCents(Math.round(mtawe)),
      });
    }
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1.025, cpiDecemberQuarter: 1.0245 });
  }
  return { rateIndexations, meansTestIndexations };
};

const settings = (planningHorizonAge, over = {}) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035, ...(over.economicSeries ?? {}) },
  deemingRates: over.deemingRates ?? { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
});

/**
 * **The ASSETS-bound couple.** Val is 71 and holds a $700,000 Account-Based Pension; Ken is 56 and
 * holds $400,000 in Accumulation Phase, which the younger-partner exemption protects (§4.8, T27).
 * Born fifteen years apart, and the gap is load-bearing: Ken's super is exempt because of his age,
 * so the assets test sees $700,000 and not $1,100,000.
 */
const ASSETS_BOUND = {
  persons: [
    person('Val', '1955-04-17', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(700_000) }] }),
    person('Ken', '1970-01-01', { superInterests: [{ phase: 'accumulation', balance: toCents(400_000) }] }),
  ],
  homeStatus: 'occupied',
};

/**
 * **The INCOME-bound couple.** Ada is 71 and Bo is 70 — both past pension age, so nothing is exempt
 * — and between them they hold $450,000, comfortably inside the couple homeowner assets free area.
 * The deeming rates are a stated scenario lever at 5% / 9%, far from any determination, which is
 * what makes the deemed income rather than the assets the binding constraint.
 */
const INCOME_BOUND = {
  persons: [
    person('Ada', '1955-04-17', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }] }),
    person('Bo', '1956-08-09', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(150_000) }] }),
  ],
  homeStatus: 'occupied',
};
const HIGH_DEEMING = { deemingRates: { lower: 0.05, upper: 0.09 } };

/** A single earner of 47 on $65,000 a year, well clear of every Medicare shade-in band. */
const WORKER = {
  persons: [person('Sam', '1979-03-02', { employmentIncomePerFortnight: toCents(2_500) })],
  homeStatus: 'occupied',
};

/** Nothing at all: no income, no assets, no spending level. Every month of its walk is empty. */
const NOBODY = { persons: [person('Nil', '1979-03-02')], homeStatus: 'occupied' };

const monthAt = (months, month) => months.find((m) => m.month === month);
const lineNamed = (month, description) => month.lines.find((l) => l.description === description);

// --- 1. WHICH TEST BOUND -------------------------------------------------------------------------

test('ADR-0006’s third claim reaches the Month: the Age Pension row says WHICH TEST BOUND', () => {
  const assetsBound = project(settings(57), ASSETS_BOUND, []);
  const incomeBound = project(settings(72, HIGH_DEEMING), INCOME_BOUND, []);
  const assetsLine = lineNamed(assetsBound[0], AGE_PENSION_LINE);
  const incomeLine = lineNamed(incomeBound[0], AGE_PENSION_LINE);

  // **The binding is DERIVED from the register, not read off the answer.** The couple homeowner
  // assets free area in force at 2026-09-16 is the 1 July 2026 figure; the assets-bound fixture's
  // assessable holding is well past it and the income-bound fixture's is well inside it, so the two
  // fixtures cannot both be bound by the same test whatever the code says.
  const freeArea = AGE_PENSION.meansTest['2026-07-01'].value.assetsFreeAreaHomeowner.coupleCombined;
  assert.equal(freeArea, toCents(499_000));
  assert.ok(assetsBound[0].assessableAssets > freeArea, 'the assets-bound fixture must clear the free area');
  assert.ok(incomeBound[0].assessableAssets < freeArea, 'the income-bound fixture must sit inside it');
  // Ken's $400,000 is PROTECTED by his age, so the assets test sees $700,000 — the fifteen-year gap
  // in the fixture is what puts it there, and without it the figure would be $1,100,000.
  assert.equal(assetsBound[0].assessableAssets, toCents(700_000));
  assert.equal(assetsBound[0].protectedAssets, toCents(400_000));
  assert.equal(incomeBound[0].assessableAssets, toCents(450_000));
  assert.equal(incomeBound[0].protectedAssets, toCents(0));

  assert.equal(assetsLine.provenance.basis, 'legislated');
  assert.equal(assetsLine.provenance.register, 'Age Pension');
  assert.equal(assetsLine.provenance.determination[0], 'the assets test bound');
  assert.equal(incomeLine.provenance.determination[0], 'the income test bound');
  // The two claims are DIFFERENT, on two live walks — the check that would be vacuous if the
  // sentence were a constant.
  assert.notEqual(assetsLine.provenance.determination[0], incomeLine.provenance.determination[0]);
  // And neither is the nil-means-test wording, which would be the answer if both tests were being
  // skipped rather than compared.
  for (const line of [assetsLine, incomeLine]) {
    assert.doesNotMatch(line.provenance.determination[0], /neither test bound/);
    assert.ok(line.amount > 0);
  }
});

test('the two effective dates on the row are the register’s OWN keys, and they are two calendars', () => {
  const months = project(settings(57), ASSETS_BOUND, []);
  const line = lineNamed(months[0], AGE_PENSION_LINE);

  // T22 is the reason both are reported: the payment rates reindex on 20 March / 20 September and
  // the means test on 1 July, so one date cannot stand for the parameter set that produced a figure.
  // The values are checked against the register's key sets, not pasted.
  assert.deepEqual(line.provenance.determination.slice(1), ['rates effective 2026-03-20', 'means test effective 2026-07-01']);
  assert.ok(Object.keys(AGE_PENSION.paymentRates).includes('2026-03-20'));
  assert.ok(Object.keys(AGE_PENSION.meansTest).includes('2026-07-01'));
  assert.equal(Object.keys(AGE_PENSION.paymentRates).includes('2026-07-01'), false, 'the two calendars are not the same table');
  // Three determinations and no more: a count, so a fourth sentence appearing has to be argued for
  // rather than slipping in beside three that are asserted by value.
  assert.equal(line.provenance.determination.length, 3);

  // **And the rate date MOVES with the walk while the means-test date does not.** October 2026 is
  // past the 20 September reindexation, so the same fixture cites a different rate set and the same
  // means-test set — which is what makes these two fields, and not one.
  const october = lineNamed(monthAt(months, '2026-10'), AGE_PENSION_LINE);
  assert.equal(october.provenance.determination[1], 'rates effective 2026-09-20');
  assert.equal(october.provenance.determination[2], 'means test effective 2026-07-01');
});

// --- 2. P5-4a — the borrowed figure still reads as borrowed --------------------------------------

test('P5-4a — the Medicare thresholds still read as BORROWED at the `Month`, not as an ordinary stamp', () => {
  const months = project(settings(50), WORKER, []);
  const taxLine = lineNamed(months[0], 'Income tax, Sam');
  assert.equal(taxLine.provenance.basis, 'legislated');
  assert.equal(taxLine.provenance.register, 'income tax');

  // **The source of truth, asserted first.** The two thresholds this single earner's levy consults
  // genuinely carry a prior-year fallback: FY2026-27 low-income thresholds do not exist and are not
  // legislated until roughly the 2027 Budget (T10, register O1). If this stops being true the
  // sentences below stop being the right ones, and this test must fail there rather than downstream.
  const lower = TAX.medicareLevy.lowIncomeThresholds.singleLower;
  const upper = TAX.medicareLevy.lowIncomeThresholds.singleUpper;
  for (const record of [lower, upper]) {
    assert.equal(record.fy, '2025-26');
    assert.equal(record.priorYearFallbackFor, '2026-27');
  }

  // The sentence, built from the record rather than pasted, so a change to either side fails.
  const borrowed = (key) =>
    `tax.medicareLevy.lowIncomeThresholds.${key} is stamped FY${lower.fy} and carried as a prior-year ` +
    `fallback for FY${lower.priorYearFallbackFor} — no FY${lower.priorYearFallbackFor} figure exists`;
  assert.deepEqual([...taxLine.provenance.caveats], [borrowed('singleLower'), borrowed('singleUpper')]);

  // ⚠️ **AND IT IS NOT THE ORDINARY OUT-OF-YEAR SENTENCE, which is the flattening P5-4a exists to
  // prevent.** "stamped FY2025-26 and was applied to FY2026-27" says a figure from another year was
  // used; "carried as a prior-year fallback … no FY2026-27 figure exists" says there is no other
  // year's figure to use. A reader who cannot tell those apart cannot tell whether the engine chose
  // a stale number or had none to choose from. The two come from mutually exclusive branches of
  // `provenanceOf`, and BOTH halves are asserted: the borrowed wording present, the ordinary absent.
  for (const caveat of taxLine.provenance.caveats) {
    assert.match(caveat, /carried as a prior-year fallback/);
    assert.doesNotMatch(caveat, /was applied to FY/);
  }

  // **And it survives the merge UPWARD, verbatim.** Merging is a set union of these strings, so the
  // Month's record carries the same sentences the line does — not a summary of them. Since P6-8
  // brief 3 chunk 2b it carries TWO MORE, because Sam's employer Guarantee is a second legislated
  // line in this month and it brings its own register with it: the fund's 15% is not the whole tax
  // (Division 293) and the qualifying earnings definition was not read in full (O19). That is the
  // union working, and it is why the assertion below is a SUPERSET test with a count beside it
  // rather than a deep-equal that would have to be rewritten by every chunk that adds a line.
  for (const caveat of taxLine.provenance.caveats) assert.ok(months[0].provenance.caveats.includes(caveat));
  assert.equal(months[0].provenance.caveats.length, 4);
  const borrowedAtTheMonth = months[0].provenance.caveats.filter((caveat) => /prior-year fallback/.test(caveat));
  assert.deepEqual([...borrowedAtTheMonth], [...taxLine.provenance.caveats]);
  for (const caveat of borrowedAtTheMonth) {
    assert.match(caveat, /carried as a prior-year fallback for FY2026-27 — no FY2026-27 figure exists/);
    assert.doesNotMatch(caveat, /was applied to FY/);
  }
  // The two the Guarantee added, named — so a chunk that dropped the SG's provenance fails here.
  assert.equal(months[0].provenance.caveats.filter((caveat) => /register O19/.test(caveat)).length, 1);
  assert.equal(months[0].provenance.caveats.filter((caveat) => /Division 293 imposes a further 15%/.test(caveat)).length, 1);
});

// --- 3. The empty case is present, and there are THREE kinds of it -------------------------------

test('a line with nothing legislated behind it SAYS so — the field is empty, never absent', () => {
  const months = project(settings(50), WORKER, []);
  const salary = lineNamed(months[0], 'Salary, Sam');

  // `MonthLine.effect`'s reasoning, applied: "nobody said" and "the register said nothing" are
  // different facts, so the field is present and carries the second rather than being omitted.
  assert.equal('provenance' in salary, true);
  assert.notEqual(salary.provenance, undefined);
  assert.equal(salary.provenance.basis, 'none');
  assert.deepEqual(salary.provenance, UNLEGISLATED.salary);
  assert.match(salary.provenance.note, /no register figure stands behind it/);
  // It carries no register, no stamp and no confidence — an empty record, not a weak one. A
  // `confidence` here would rank an unlegislated figure on the same scale as a legislated one.
  assert.equal('register' in salary.provenance, false);
  assert.equal('fy' in salary.provenance, false);
  assert.equal('confidence' in salary.provenance, false);

  // EVERY line of every month of the walk has the field. This is the claim that the gate cannot be
  // passed by silence: a line that omitted it would read as `undefined`, which is not a defensible
  // "nothing legislated".
  const all = months.flatMap((m) => m.lines);
  assert.ok(all.length > 30, 'and the walk must actually have lines in it');
  assert.equal(all.filter((l) => l.provenance === undefined).length, 0);
  assert.deepEqual(
    [...new Set(all.map((l) => l.provenance.basis))].sort(),
    ['legislated', 'none'],
  );
});

test('THREE kinds of nothing, not two: an ABP payment is `not carried`, and that is not `none`', () => {
  // A Household that draws a pension. Pat is 66 with a $700,000 Account-Based Pension commenced in
  // 2020, so Schedule 7 governs the year's minimum and the payment line carries it.
  const drawer = {
    persons: [
      person('Pat', '1960-05-10', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(700_000), statedStreamSettings: { commencementDay: '2020-07-01' } }],
      }),
    ],
    homeStatus: 'occupied',
  };
  // Nothing is spent, so the Waterfall asks the limb for nothing and the year's minimum falls due in
  // its LAST month — reg 1.06(9A)(a) is a floor on the YEAR, not on each month of it.
  const months = project({ ...settings(68), asAtDate: '2026-07-01' }, drawer, []);
  const paying = months.find((m) => m.lines.some((l) => l.description.startsWith('Account-Based Pension payment')));
  assert.equal(paying.month, '2027-06');
  const payment = paying.lines.find((l) => l.description.startsWith('Account-Based Pension payment'));

  // **Filing this under `'none'` would state that no register stands behind a Schedule 7 minimum,
  // which is false.** `minimumDrawdown` computes a `ComputedProvenance` for the percentage factors;
  // `annualPensionMinimum` returns `.amount` and drops it. The line names the gap rather than
  // papering over it as "nothing legislated" — the same distinction `Month.notes` was built for.
  assert.equal(payment.provenance.basis, 'not carried');
  assert.equal(payment.provenance.register, 'Account-Based Pension minimum');
  assert.deepEqual(payment.provenance, PENSION_MINIMUM_PROVENANCE);
  assert.notEqual(payment.provenance.basis, 'none');
  assert.notEqual(payment.provenance.basis, UNLEGISLATED.growth.basis);

  // And the Month says which registers it could NOT vouch for, beside the ones it could. A month
  // that listed only `registers` would read as though it had vouched for everything it reported.
  assert.deepEqual([...paying.provenance.uncarried], ['Account-Based Pension minimum']);
  assert.equal(paying.provenance.registers.includes('Account-Based Pension minimum'), false);
});

test('a month with NO legislated figure says so in a field, rather than by having none', () => {
  const months = project(settings(50), NOBODY, []);
  assert.ok(months.length > 30);
  for (const month of months) {
    assert.deepEqual([...month.lines], []);
    assert.deepEqual([...month.provenance.registers], []);
    assert.deepEqual([...month.provenance.uncarried], []);
    assert.deepEqual([...month.provenance.stamps], []);
    assert.deepEqual([...month.provenance.caveats], []);
    // ⚠️ **`'nothing carried'` is deliberately NOT a `Confidence`.** Ranking an empty month as
    // `primary-verified` would be the one direction this field must never be wrong in — it would
    // present a month that vouched for nothing as a month that had vouched for everything.
    assert.equal(month.provenance.confidence, 'nothing carried');
    assert.equal(CONFIDENCE_ORDER.includes(month.provenance.confidence), false);
  }
});

// --- 4. P5-4 — the FY stamp on the figure --------------------------------------------------------

test('P5-4 — the stamp is the ASSESSMENT’s year, and a July true-up proves it is not the month’s', () => {
  // Sam works to 2028 and then retires, so FY2027-28 is over-accrued and settles in July 2028.
  const months = project(
    { ...settings(52), asAtDate: '2026-07-01' },
    WORKER,
    [{ id: 'r', type: 'RETIRE', date: '2028-01-01', owner: 'personA', params: { owner: 'personA' }, enabled: true, createdAt: '2026-06-01' }],
  );
  const july = monthAt(months, '2028-07');
  const trueUp = july.lines.find((l) => l.description.startsWith(TAX_TRUE_UP_LINE));
  assert.ok(trueUp !== undefined, 'the fixture must actually settle a year');

  assert.equal(trueUp.provenance.register, 'income tax year-end true-up');
  // The line lands in a month whose own financial year is 2028-29 and is assessed under 2027-28.
  assert.equal(trueUp.provenance.fy, '2027-28');
  assert.notEqual(trueUp.provenance.fy, '2028-29');
  assert.equal(trueUp.description.endsWith(', 2027-28'), true, 'and the description agrees with the stamp');
  assert.deepEqual([...trueUp.provenance.determination], ['assessed once on the twelve months of FY2027-28']);
  assert.ok(july.provenance.stamps.includes('2027-28'));

  // **A stamp is on EVERY legislated figure, and it is the year that produced it.** The ordinary
  // monthly accrual, taken from a month inside FY2026-27, is stamped with that year — so the two
  // lines disagree about the year on purpose and neither is the reporting month's date.
  const accrual = lineNamed(monthAt(months, '2027-03'), 'Income tax, Sam');
  assert.equal(accrual.provenance.fy, '2026-27');
  assert.equal(lineNamed(monthAt(months, '2027-08'), 'Income tax, Sam').provenance.fy, '2027-28');
  for (const month of months) {
    for (const line of month.lines) {
      if (line.provenance.basis !== 'legislated') continue;
      assert.match(line.provenance.fy, /^20\d\d-\d\d$/);
    }
  }
});

// --- 5. Past the published window ----------------------------------------------------------------

test('past the published window the pension figure is UNVERIFIED and names the Setting that made it so', () => {
  const published = project(settings(57), ASSETS_BOUND, []);
  const indexed = project(
    settings(73, { economicSeries: { agePension: longSeries(2075) } }),
    INCOME_BOUND,
    [],
  );

  // Inside the register's window the figure is the register's own, at the register's confidence.
  assert.equal(lineNamed(published[0], AGE_PENSION_LINE).provenance.confidence, 'primary-verified');
  assert.deepEqual([...lineNamed(published[0], AGE_PENSION_LINE).provenance.caveats], []);

  // Past it, §4.7's mechanism is run over the CALLER's CPI/PBLCI/MTAWE observations, which register
  // O5 makes a Setting and which carry no confidence of their own. The Setting's own doc names the
  // failure this prevents: "a nominal freeze over four decades is a forecast wearing an assumption's
  // provenance". So the figure arrives at the weakest rank, saying which input made it weak.
  const late = monthAt(indexed, '2028-06');
  const line = lineNamed(late, AGE_PENSION_LINE);
  assert.equal(line.provenance.confidence, 'unverified');
  assert.equal(line.provenance.confidence, CONFIDENCE_ORDER[CONFIDENCE_ORDER.length - 1]);
  assert.deepEqual(
    [...line.provenance.caveats],
    ['economic.agePension (the caller-stated forward indexation series, register O5) is unverified'],
  );
  // The parameter set it cites is not in the register at all — which is the fact the caveat is about.
  assert.equal(Object.keys(AGE_PENSION.paymentRates).includes('2028-03-20'), false);
  assert.equal(line.provenance.determination[1], 'rates effective 2028-03-20');

  // **And the weakness reaches the MONTH.** `monthProvenance` takes the weakest of the carried
  // lines, so a month holding one forecast figure is a forecast month however many verified figures
  // sit beside it.
  assert.equal(late.provenance.confidence, 'unverified');
  assert.deepEqual([...late.provenance.registers], ['Age Pension']);
});

// --- 6. The merge upward is a union --------------------------------------------------------------

test('the Month’s record is the lines’ records UNIONED — registers, stamps and caveats, never a summary', () => {
  // A worker of 47 and her mother of 71 in one Household would be two Households; instead, a
  // pensioner couple born a year apart where one still works part-time, so the month carries an Age
  // Pension row and an income tax row at once.
  const mixed = {
    persons: [
      person('Ada', '1955-04-17', {
        // P6-8 brief 3 chunk 2b: a salaried Person's employer Guarantee has to land somewhere, and a
        // retirement-phase interest is closed to contributions. Nil, so it moves nothing of its own.
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }, { phase: 'accumulation', balance: toCents(0) }],
        employmentIncomePerFortnight: toCents(1_800),
      }),
      person('Bo', '1956-08-09', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(150_000) }] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings(72), mixed, []);
  const first = months[0];
  const pension = lineNamed(first, AGE_PENSION_LINE);
  const tax = lineNamed(first, 'Income tax, Ada');
  const guarantee = lineNamed(first, 'Superannuation Guarantee into superannuation, Ada — Superannuation, Accumulation Phase');
  assert.ok(pension !== undefined && tax !== undefined, 'the fixture must carry both registers');

  // THREE registers, in LINE order — the Age Pension is computed in chunk 2, the tax in chunk 3,
  // and from P6-8 brief 3 chunk 2b Ada's employer Guarantee carries the contributions tax with it.
  assert.deepEqual([...first.provenance.registers], ['Age Pension', 'income tax', 'superannuation contributions tax']);
  // One stamp, because both figures are assessed under the month's own year here; the true-up test
  // above is where the two part company.
  assert.deepEqual([...first.provenance.stamps], ['2026-27']);
  // The caveats are the UNION and each is a string the line itself carries — not a rewrite of it.
  for (const line of [tax, pension, guarantee]) {
    for (const caveat of line.provenance.caveats) assert.ok(first.provenance.caveats.includes(caveat));
  }
  assert.equal(
    first.provenance.caveats.length,
    new Set([...pension.provenance.caveats, ...tax.provenance.caveats, ...guarantee.provenance.caveats]).size,
  );
  // And the month is as weak as its weakest line, computed with the one `CONFIDENCE_ORDER` in the
  // build rather than by a second ordering written at the merge.
  const ranks = [pension, tax, guarantee].map((l) => CONFIDENCE_ORDER.indexOf(l.provenance.confidence));
  assert.equal(
    first.provenance.confidence,
    CONFIDENCE_ORDER[Math.max(...ranks)],
  );
});
