// The register §9 "Income tax and offsets" mutation rows that belong to P3-1 and P3-2 — T2, T3,
// T8 and T9 — written as executable assertions rather than a list.
//
// §9's rule is that a mutation with no failing test is a trap the suite does not cover. Each
// test below names the deliberate code change it must fail against. The T1/T4–T7/T10 rows sit at
// the data layer and are already covered by `assumptions-tax.test.mjs`; the Div 293 rows belong to
// a later chunk. **WATO's arrived on 2026-09-15 with P3-39** and is at the end of this file: limb (b)
// netted of LITO, which the `BasicIncomeTaxLiability` brand turns from a wrong dollar into a
// compile error (register §2.8.1.1).
//
// T9 is the odd one out, and deliberately so. It is not asserted at runtime at all: the four
// income bases are distinct brands, so feeding one where another is wanted does not produce a
// wrong number, it produces a compile error. Those tests below run `tsc` over a scratch file and
// assert that it *fails*, with a positive control asserting the correct version compiles clean —
// a mutation that cannot be expressed is a stronger outcome than one that is caught.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { familyIncome, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';
import { householdIncomeTax, medicareLevy, seniorsAndPensionersOffset } from '../dist/core/incomeTax.js';
import {
  TAX,
  s25130AppliesToYear,
  standardDeductionAmount,
  standardDeductionAmountFor,
} from '../dist/data/assumptions/tax.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/**
 * Comments and error messages name the traps by name — that is the point of them. The greps
 * below assert things about the *code*, so comments and string literals are stripped first.
 *
 * Line comments and all three string forms are stripped in ONE left-to-right alternating pass,
 * which is the difference from `core-age-pension-mutations.test.mjs`. Doing them as separate
 * passes goes wrong twice on these sources, in both directions:
 *
 *   * stripping `//` first eats the tail of every source URL — `'ATO rates — https://www.ato...'`
 *     loses its closing quote, and the now-unterminated string swallows code up to the next one;
 *   * stripping quotes first, one delimiter at a time, lets an apostrophe inside a double-quoted
 *     string — "the Person's own Rebate Income" — open a single-quote match that runs to the next
 *     apostrophe anywhere in the file.
 *
 * `tax.ts` contains both. One pass gets it right because whichever construct opens first wins.
 * The failure is loud either way, but only once someone writes the URL or the apostrophe.
 */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = Object.fromEntries(
  ['incomeTax.ts', 'incomeBases.ts'].map((name) => [name, readFileSync(join(SRC, 'core', name), 'utf8')]),
);
const CODE = Object.fromEntries(Object.entries(RAW).map(([name, text]) => [name, executableCode(text)]));

/**
 * The third derivation, and the opposite of the one above: comment markers removed and whitespace
 * flattened, so a claim made in a comment — which wraps across lines and so never matches a naive
 * grep of the raw text — reads as one sentence. `CODE` throws the comments away; this is what makes
 * a correction to a comment enforceable rather than decorative.
 */
const flatten = (text) =>
  text.replaceAll(/^[ \t]*(?:\/\/|\*\/|\/\*\*?|\*)[ \t]?/gm, '').replaceAll(/\s+/g, ' ');

const PROSE = Object.fromEntries(Object.entries(RAW).map(([name, text]) => [name, flatten(text)]));

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

const ti = (dollars) => taxableIncome(toCents(dollars));
const person = (name, dollars, overrides = {}) => ({
  name,
  taxableIncome: ti(dollars),
  rebateIncome: rebateIncomeFrom(ti(dollars)),
  qualifiedForAgePension: true,
  ...overrides,
});

const FY = '2026-27';

test('the source greps below are not vacuous — stripping leaves the executable code behind', () => {
  for (const source of Object.values(CODE)) {
    assert.match(source, /\bexport\b/);
    assert.ok(source.length > 500);
  }
  assert.match(CODE['incomeTax.ts'], /saptoOffset/);
  assert.match(CODE['incomeBases.ts'], /RebateIncome/);
  // And it does still catch a word that is only in the code.
  assert.match(executableCode("const x = 1; // eligibility\nconst eligibility = 2;"), /eligibility/);
  assert.doesNotMatch(executableCode("// eligibility\nconst x = 'eligibility';"), /eligibility/);
  // The prose derivation keeps what the other one throws away, and rejoins a claim that wraps.
  assert.ok(PROSE['incomeTax.ts'].length > CODE['incomeTax.ts'].length, 'the prose form must keep the comments');
  assert.match(flatten('//     wrapped across\n//     two lines'), /wrapped across two lines/);
  assert.match(PROSE['incomeTax.ts'], /The message was corrected on 2026-09-11/);
  // The one-pass strip, in both directions.
  assert.match(executableCode(`const a = "the Person's own"; const kept = 1; const b = 'x';`), /kept/);
  assert.match(executableCode("const a = 'https://x/y'; const kept = 1;"), /kept/);
});

// --- T2: the gate and the amount read different income figures -----------------------------------

test('MUTATION T2 — computing the SAPTO gate on the Person\'s own Rebate Income', () => {
  // Register §9: must fail against *Ying and Li Jun* — both must be ELIGIBLE on half combined
  // income. Ying's own $54,020 is above the $44,663 couple cut-out, so a gate mutated to read the
  // Person's own figure would deny Ying eligibility outright rather than allow eligibility with a
  // $0 amount. The two designs differ on Ying's eligibility flag, on the income the gate reports,
  // and — through T8 — on Ying's Medicare levy.
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });

  assert.equal(result.persons[0].eligibility.passed, true, 'Ying passes the gate on half combined income');
  assert.equal(result.persons[0].eligibility.incomeTested, toCents(39_848.5));
  assert.notEqual(result.persons[0].eligibility.incomeTested, result.persons[0].offset);
  assert.equal(result.persons[0].eligibility.basis, 'half combined Rebate Income');

  // Half combined is computed once, in one place, and reaches nothing but the gate.
  assert.equal(occurrences(CODE['incomeTax.ts'], 'halfCombined'), 2, 'one definition, one call site');
  assert.match(CODE['incomeTax.ts'], /gateIncome = relationship === "" \? combinedRebateIncome : halfCombined\(persons\)/);
});

test('MUTATION T2 — computing the SAPTO amount on half combined Rebate Income', () => {
  // Register §9: must fail against *Ying and Li Jun* — Ying must receive $0 and Li Jun the full
  // $1,602. Half combined is $39,848.50, which sits between the $31,847 shade-out and the $44,663
  // cut-out, so a mutated amount would give BOTH of them 1,602 − 0.125 × 8,001.50 = $602 (rounded
  // up from $601.8125). Two Persons with the same offset is the signature of this mutation.
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });
  assert.equal(result.persons[0].offset, toCents(0));
  assert.equal(result.persons[1].offset, toCents(1_602));
  assert.notEqual(result.persons[0].offset, result.persons[1].offset);
  for (const each of result.persons) assert.notEqual(each.offset, toCents(602));
});

// --- T3: a transfer changes the amount and never the gate -----------------------------------------

test('MUTATION T3 — re-testing the eligibility gate on the augmented BRA*', () => {
  // Register §9: must fail against a transferee whose augmented amount would push them past the
  // cut-out. Reg s 12(3) applies "for the purposes of subsection 11(2) (but not section 10)".
  //
  // In the §2.6 worked case the transferee's BRA* is $2,604, whose cut-out is
  // ceil(2,604 / 0.125 + 37,727) = 20,832 + 37,727 = $58,559 — a $13,896 wider gate than the
  // untransferred $44,663. The gate must still report $44,663.
  const transfer = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000), person('Sasha', 42_000)],
  });
  const sasha = transfer.persons[1];
  assert.equal(sasha.augmentedBaseRebateAmount, toCents(2_604));
  assert.equal(sasha.eligibility.cutOut, toCents(44_663));
  assert.notEqual(sasha.eligibility.cutOut, toCents(58_559));
  assert.equal(sasha.thresholdBeforeTransfer.shadeOut, toCents(31_847));

  // And the flag itself flips under the mutation. Combined Rebate Income $100,000 halves to
  // $50,000, above the untransferred $44,663 cut-out, so BOTH Persons fail the gate and both
  // receive $0 — including the one whose own Rebate Income is only $10,000. Compute the transfer
  // first and the augmented $58,559 cut-out lets the transferee back through.
  const denied = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000), person('Sasha', 90_000)],
  });
  assert.equal(denied.persons[0].eligibility.passed, false);
  assert.equal(denied.persons[1].eligibility.passed, false);
  assert.equal(denied.persons[0].offset, toCents(0));
  assert.equal(denied.persons[1].offset, toCents(0));
  assert.equal(denied.persons[1].transferReceived, null);

  // Structurally: the gate is computed from `untransferredThreshold`, and the transfer has exactly
  // one origin. There is no second call to the regulation's transfer formula for a gate to reach.
  assert.equal(occurrences(CODE['incomeTax.ts'], 'saptoTransferAmount'), 2, 'one import, one call site');
  assert.match(CODE['incomeTax.ts'], /cutOut: untransferredThreshold\.cutOut/);
});

// --- T8: the Medicare seniors switch keys off the computed offset, not eligibility ----------------

test('MUTATION T8 — keying the Medicare seniors thresholds off SAPTO eligibility', () => {
  // Register §9: must fail against a Person eligible on half combined income whose own SAPTO
  // computes to $0. Ying is exactly that Person.
  //   keyed off the computed offset (correct): ordinary thresholds ⇒ 2% × 54,020 = $1,080.40
  //   keyed off eligibility (the mutation):    seniors thresholds  ⇒ 10% × (54,020 − 44,268)
  //                                                                = $975.20
  const sapto = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });
  assert.equal(sapto.persons[0].eligibility.passed, true);
  assert.equal(sapto.persons[0].offset, toCents(0));

  const levy = medicareLevy({ fy: FY, taxableIncome: ti(54_020), saptoReceived: sapto.persons[0].offset });
  assert.equal(levy.seniorsThresholds, false);
  assert.equal(levy.lowerThreshold, toCents(28_011));
  assert.equal(levy.levy, toCents(1_080.4));
  assert.notEqual(levy.levy, toCents(975.2));

  // The same difference survives the Household path, where the wiring between the two is made.
  const household = householdIncomeTax({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });
  assert.equal(household.persons[0].medicareLevy.seniorsThresholds, false);
  assert.equal(household.persons[0].medicareLevy.levy, toCents(1_080.4));

  // Structurally, the mutation cannot be written inside `medicareLevy` at all: eligibility never
  // crosses that boundary. The Person's own input carries a dollar amount and no flag — and so
  // does the spouse's, added for s 8(3)(c), whose threshold amount is keyed to SAPTO the same way.
  for (const name of ['MedicareLevyPerson', 'MedicareLevySpouse']) {
    const input = new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(CODE['incomeTax.ts']);
    assert.ok(input !== null, `${name} is declared`);
    assert.match(input[1], /saptoReceived: Cents/, name);
    assert.doesNotMatch(input[1], /eligib|passed|qualified/i, name);
  }
  assert.match(CODE['incomeTax.ts'], /const seniors = input\.saptoReceived > 0;/);
  assert.match(CODE['incomeTax.ts'], /spouse\.saptoReceived > 0 \? THRESHOLDS\.seniorsSingleLower : THRESHOLDS\.singleLower/);
});

// --- T9: five income bases from FY2027-28, and the substitutions will not compile -----------------
//
// Four bases until 30 Jun 2027 and five after it: WATO's net labour income (ITAA 1997 s 61-155(2))
// joins them from FY2027-28 (register §2.8.1, P3-24). The count is asserted where it is claimed —
// this comment used to say "four income bases", and the register's T9 now says five bases and six
// brands, the sixth being Div293Income, which is a projection of an existing base rather than one.

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-mutation-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { toCents } from '../src/core/money.js';\n" +
        "import { familyIncome, netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../src/core/incomeBases.js';\n" +
        "import { medicareLevy, seniorsAndPensionersOffset } from '../src/core/incomeTax.js';\n" +
        "import { entitledToWorkingAustraliansOffset, watoHypotheticalBasicIncomeTaxLiabilityFor, watoOffsetAmount, TAX } from '../src/data/assumptions/tax.js';\n" +
        "import { lowIncomeTaxOffset, taxOnTaxableIncome } from '../src/core/incomeTax.js';\n" +
        'const TAXABLE = taxableIncome(toCents(54_020));\n' +
        'const REBATE = rebateIncomeFrom(TAXABLE);\n' +
        // Three arguments since P3-38: the year, because ITAA 1997 s 25-130 has a first income
        // year; the salary; and the s 25-130(2) reducer sum, which is a figure the caller states
        // and never one they get by leaving it out. A nil here is the Setting's documented default.
        "const LABOUR = netLabourIncomeFromSalary('2027-28', toCents(54_020), toCents(0));\n" +
        'void familyIncome; void medicareLevy; void seniorsAndPensionersOffset; void REBATE;\n' +
        'void entitledToWorkingAustraliansOffset; void LABOUR;\n' +
        'void watoHypotheticalBasicIncomeTaxLiabilityFor; void watoOffsetAmount; void TAX;\n' +
        'void lowIncomeTaxOffset; void taxOnTaxableIncome;\n' +
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

test('the compile probe is not vacuous — the CORRECT bases compile clean', () => {
  // The positive control. Without it, a probe that failed for an unrelated reason — a bad path, a
  // missing flag — would make every T9 case below pass for the wrong reason.
  const result = tsc(
    'seniorsAndPensionersOffset({\n' +
      "  fy: '2026-27',\n" +
      "  relationship: 'single',\n" +
      "  persons: [{ name: 'Sam', rebateIncome: REBATE, taxableIncome: TAXABLE, qualifiedForAgePension: true }],\n" +
      '});\n' +
      "medicareLevy({ fy: '2026-27', taxableIncome: TAXABLE, saptoReceived: toCents(0), familyIncome: familyIncome(TAXABLE), spouse: null });\n" +
      "entitledToWorkingAustraliansOffset('2027-28', LABOUR);",
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION T9 — taxable income where WATO needs net labour income WILL NOT COMPILE', () => {
  // The fifth base, and the substitution the fixtures cannot catch: for a wage earner with no
  // deductions the two figures are equal, so every plausible test case passes with the wrong base
  // and only the Person with large non-labour income or deductions comes out wrong. There is
  // therefore nothing to assert at runtime — the brand is the whole guard.
  const result = tsc("entitledToWorkingAustraliansOffset('2027-28', TAXABLE);");
  assert.equal(result.ok, false, 'WATO must not accept a taxable income');
  assert.match(result.output, /NET_LABOUR_INCOME|TAXABLE_INCOME|not assignable/);
});

test('MUTATION T9 — Rebate Income and a bare Cents figure are not net labour income either', () => {
  const rebate = tsc("entitledToWorkingAustraliansOffset('2027-28', REBATE);");
  assert.equal(rebate.ok, false, 'WATO must not accept a Rebate Income');
  assert.match(rebate.output, /NET_LABOUR_INCOME|REBATE_INCOME|not assignable/);

  const bare = tsc("entitledToWorkingAustraliansOffset('2027-28', toCents(54_020));");
  assert.equal(bare.ok, false, 'a bare money figure is not a base at all');
  assert.match(bare.output, /NET_LABOUR_INCOME|not assignable/);

  // And the brand has no widening constructor: the only way in is through the two-limb formula.
  const cast = tsc('const bad: typeof LABOUR = TAXABLE;\nvoid bad;');
  assert.equal(cast.ok, false, 'net labour income must not be assignable from another base');
});

// --- P3-39 trap 1: limb (b) is PRE-OFFSET, and the brand is what makes that structural -----------
//
// s 4-10(3) puts basic income tax liability at step 2 and tax offsets at step 3, so LITO and SAPTO
// cannot enter s 61-160(b). A post-offset figure is a perfectly good `Cents`, so on the bare type
// the mutation compiled and returned a plausible wrong dollar — nil for every Person with net
// labour income at or below $23,200. `BasicIncomeTaxLiability` is minted only by
// `taxOnTaxableIncome` and by limb (b) itself, neither of which subtracts anything, so the
// mutation now needs a visible cast. Register §2.8.1.1.

test('the WATO compile probe is not vacuous — the CORRECT limb (b) compiles clean', () => {
  const result = tsc(
    "const limbB = watoHypotheticalBasicIncomeTaxLiabilityFor('2027-28', LABOUR);\n" +
      'const amount = watoOffsetAmount({ maximumOffset: TAX.wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: limbB });\n' +
      'void amount;',
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION P3-39 trap 1 — limb (b) NET OF LITO WILL NOT COMPILE', () => {
  const result = tsc(
    "import { subCents } from '../src/core/money.js';\n" +
      "const limbB = watoHypotheticalBasicIncomeTaxLiabilityFor('2027-28', LABOUR);\n" +
      'const netted = subCents(limbB, lowIncomeTaxOffset(TAXABLE));\n' +
      'void watoOffsetAmount({ maximumOffset: TAX.wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: netted });',
  );
  assert.equal(result.ok, false, 'limb (b) must not accept an offset-reduced figure — it is s 4-10(3) step 2');
  assert.match(result.output, /BASIC_INCOME_TAX_LIABILITY|not assignable/);
});

test('MUTATION P3-39 trap 1 — a bare Cents figure is not a basic income tax liability either', () => {
  // The weakening that matters most: widening the field back to `Cents` is the ONE edit that makes
  // the netting above compile, so the brand has to refuse a plain money figure as well.
  const bare = tsc(
    'void watoOffsetAmount({ maximumOffset: TAX.wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: toCents(112) });',
  );
  assert.equal(bare.ok, false, 'a bare money figure must not be usable as limb (b)');
  assert.match(bare.output, /BASIC_INCOME_TAX_LIABILITY|not assignable/);

  // And the real ladder still is one, so the brand is not merely unsatisfiable.
  const real = tsc(
    "void watoOffsetAmount({ maximumOffset: TAX.wato.maximumOffset.value, hypotheticalBasicIncomeTaxLiability: taxOnTaxableIncome('2027-28', TAXABLE) });",
  );
  assert.equal(real.ok, true, real.output);
});

test('MUTATION s 8(3) — a family levy computed without the spouse WILL NOT COMPILE', () => {
  // s 8(3)(c) turns on whether the SPOUSE would themselves be liable to levy, and s 8(4) on the
  // spouse's unused reduction. A family income alone cannot answer either: it is one summed
  // number and the gate needs the split. Getting this wrong is not a rounding difference — the
  // ATO's own worked example is $92.90 unapportioned against $229.76 apportioned.
  const result = tsc(
    "medicareLevy({ fy: '2026-27', taxableIncome: TAXABLE, saptoReceived: toCents(0), familyIncome: familyIncome(TAXABLE) });",
  );
  assert.equal(result.ok, false, 'a family levy must not type-check without the spouse');
  assert.match(result.output, /spouse/);
});

test('MUTATION T9 — taxable income where Rebate Income is required WILL NOT COMPILE', () => {
  // Register §9: "must fail against a Person with reportable superannuation contributions — the
  // bases must differ". It never gets as far as a Person: SAPTO cannot be handed a taxable income.
  const result = tsc(
    'seniorsAndPensionersOffset({\n' +
      "  fy: '2026-27',\n" +
      "  relationship: 'single',\n" +
      "  persons: [{ name: 'Sam', rebateIncome: TAXABLE, taxableIncome: TAXABLE, qualifiedForAgePension: true }],\n" +
      '});',
  );
  assert.equal(result.ok, false, 'the wrong income base must not type-check');
  assert.match(result.output, /TAXABLE_INCOME|REBATE_INCOME|not assignable/);
});

test('MUTATION T9 — Rebate Income fed into the Medicare levy WILL NOT COMPILE', () => {
  const result = tsc("medicareLevy({ fy: '2026-27', taxableIncome: REBATE, saptoReceived: toCents(0) });");
  assert.equal(result.ok, false, 'the Medicare levy must not accept Rebate Income');
  assert.match(result.output, /REBATE_INCOME|not assignable/);
});

test('MUTATION T9 — family income built from Rebate Incomes WILL NOT COMPILE', () => {
  // Medicare Levy Act s 8(5): family income is the sum of both Persons' TAXABLE incomes.
  const result = tsc('familyIncome(REBATE, REBATE);');
  assert.equal(result.ok, false, 'family income must be built from taxable incomes');
  assert.match(result.output, /REBATE_INCOME|not assignable/);
});

test('MUTATION T9 — the substitution will not compile INSIDE the modules either', () => {
  // The brands would be worth much less if they only guarded the public surface: every private
  // helper taking a bare `Cents` would be a place the swap still compiles. It does not. Verified
  // by applying each swap to the source and running `tsc`:
  //   saptoOffset(..., person.taxableIncome)                    TS2345 TaxableIncome → RebateIncome
  //   saptoTransferAmount(..., from.person.rebateIncome)        TS2345 RebateIncome → TaxableIncome
  //   lowIncomeTaxOffset(person.rebateIncome)                   TS2345 RebateIncome → TaxableIncome
  //   familyIncome(...persons.map((p) => p.rebateIncome))       TS2345 RebateIncome → TaxableIncome
  // The signatures those errors come from are asserted here so they cannot be widened back to
  // `Cents` without this failing.
  assert.match(
    CODE['incomeTax.ts'],
    /const saptoOffset = \(baseRebateAmount: Cents, shadeOut: Cents, income: RebateIncome\)/,
  );
  assert.match(CODE['incomeTax.ts'], /const halfCombined = \(persons: readonly SaptoPerson\[\]\): RebateIncome/);
  assert.match(CODE['incomeTax.ts'], /taxOnTaxableIncome = \(fy: FinancialYear, income: TaxableIncome\)/);
  assert.match(CODE['incomeTax.ts'], /lowIncomeTaxOffset = \(income: TaxableIncome\)/);
  assert.match(
    executableCode(readFileSync(join(SRC, 'data', 'assumptions', 'tax.ts'), 'utf8')),
    /transferorTaxableIncome: TaxableIncome/,
  );

  // The runtime backstop, for the day someone reaches for a cast: the SAPTO fixtures in
  // `core-income-tax.test.mjs` include a Person with $15,000 of reportable superannuation
  // contributions, whose two bases differ by $15,000 and whose offset differs by $1,120.
});

test('MUTATION T9 — an unlabelled Cents amount cannot stand in for any base', () => {
  // The bases are not a naming convention over `number`: a raw money figure is not a base at all,
  // so there is no way to reach the calculation without saying which base the figure is.
  const result = tsc("medicareLevy({ fy: '2026-27', taxableIncome: toCents(54_020), saptoReceived: toCents(0) });");
  assert.equal(result.ok, false, 'a bare Cents figure must not stand in for taxable income');
  assert.match(result.output, /TAXABLE_INCOME|not assignable/);
});

// --- P3-35: the two messages that were wrong about their own firing condition -------------------

test('MUTATION P3-35/O30 — the module\'s prose describes what it now does, and what it no longer refuses', () => {
  // The messages are canaried where they are thrown, in `core-medicare-family-shade-in.test.mjs`.
  // This is the other half: `incomeTax.ts`'s prose said the same two things, in the file header's
  // "what this module refuses to do" list and in both classes' JSDoc, and a reader reaches those
  // before ever seeing a message. Without this block a comment-level correction here is
  // unenforceable — `CODE` strips exactly the lines being corrected.
  const prose = PROSE['incomeTax.ts'];

  // `MixedSaptoFamilyThresholdError` WAS the other half of this, and it was deleted on
  // 2026-09-21 when O30 closed on the primary law: the levy's low-income reduction is computed
  // PER TAXPAYER, so the two family income thresholds a mixed couple holds are the Act's own
  // outcome and not a conflict. The prose canary is not deleted with it — it is turned around, so
  // that the file cannot drift back to describing a refusal it no longer contains, and cannot
  // describe O30 as live.
  for (const shape of [
    /register O30[^.\n]{0,60}unresolved and live/i,
    /nothing in s 8 (?:says|resolves|decides)/i,
    /refused rather than (?:read one way|decided)/i,
    /raised only where the two thresholds/i,
  ]) {
    assert.doesNotMatch(prose, shape, `${shape} — O30 closed on 2026-09-21 and the refusal is gone`);
  }
  // The construction, stated positively, because absence alone would pass on a file that said
  // nothing at all. Including the ground it turned on: s 8(5)(b) names the spouse for the child
  // uplift and s 8(7) does not, which is the whole of the expressio unius argument.
  assert.match(prose, /computed PER TAXPAYER/);
  assert.match(prose, /\*\*s 8\(7\) does not use it\*\*/);
  assert.match(prose, /artefact of the SYMMETRIC case/);
  assert.match(prose, /each spouse has their own phase-in band/i);
  // And the code carries no refusal and no household-wide threshold choice, whatever the prose
  // says. `CODE` is the comment-stripped source, so these are about lines that execute.
  for (const gone of [/class MixedSaptoFamilyThresholdError/, /throw new MixedSapto/, /spouseFamilyLower/]) {
    assert.doesNotMatch(CODE['incomeTax.ts'], gone, `${gone} — deleted with O30, not narrowed`);
  }

  // `FamilySpouseNotSuppliedError` fires on `raw > 0`, not on the excess being the smaller figure.
  for (const shape of [
    /exceeds[^.]{0,80}by less than s 8\(2\)'s reduction/i,
    /excess[^.]{0,60}is less than[^.]{0,30}reduction/i,
    /by less than the reduction/i,
  ]) {
    assert.doesNotMatch(prose, shape, `${shape} — a window 13.5 times narrower than the one it fires in`);
  }
  assert.match(prose, /The condition is `raw > 0`/);
  assert.match(prose, /the paraphrase was about 13\.5 times too narrow/);
});

// --- P3-38: ITAA 1997 s 25-130, the $1,000 standard deduction --------------------------------
//
// Added 2026-09-15 by the P3-38 mutation battery. Six of the eight mutations that battery ran were
// already caught by `assumptions-tax.test.mjs` and `core-income-tax.test.mjs`; three survived the
// whole suite and are what this section exists for:
//
//   T14 drift   the $1,000 written as a literal at a second site instead of read from
//               `S25130_MAXIMUM_DEDUCTION`. It agrees with the record today and disagrees the year
//               s 25-130(2) is amended, so it moves no fixture in between: 0 tests failed.
//   the arity   `reducerDeductions` given a code-level default, so the nil stops being a figure the
//               caller states. Every call site passes it explicitly, so nothing moved: 0 tests
//               failed — and the "all three arguments are required" doctrine was unenforced.
//   s 25-130(3) nothing anywhere asserted that an income-protection premium or an association fee
//               cannot reduce the deduction.
//
// The s 25-130(3) point is STRUCTURAL and is pinned as such: those amounts have no field to be
// filed under, so the defence is absence plus a compile error, not an expected dollar.

const s25130Block = (text) => {
  const code = executableCode(text);
  const start = code.indexOf('const ITAA97_S25130');
  const end = code.indexOf('const fallback =');
  assert.ok(start >= 0 && end > start, 'the s 25-130 block has moved — this canary would be vacuous');
  return code.slice(start, end);
};

const TAX_SRC = readFileSync(join(SRC, 'data', 'assumptions', 'tax.ts'), 'utf8');

test('MUTATION P3-38/T14 — the $1,000 is written ONCE, and the s 25-130 block holds no other figure', () => {
  const block = s25130Block(TAX_SRC);

  // Vacuity first: a strip that over-stripped would make every assertion below pass on an empty
  // string. The block must still contain the three things the section is made of.
  assert.ok(block.length > 1_000, 'the s 25-130 block is too short to be the real one');
  assert.match(block, /export const standardDeductionAmount = /);
  assert.match(block, /export const standardDeductionAmountFor = /);
  assert.match(block, /const S25130_MAXIMUM_DEDUCTION = toCents\(1_000\);/);

  // The exact set of numeric literals surviving the strip, and the justification for each survivor:
  //
  //   1_000  s 25-130(2) limb (a) itself, the one place it is written.
  //   0      the s 25-130(2) floor ("reduced, but not below zero") and the nil the year gate
  //          returns before FY2026-27. Neither is a legislated dollar amount that could drift.
  //
  // Anything else is a second copy of a figure that belongs in a record.
  assert.deepEqual(
    [...new Set(block.match(/\b\d[\d_]*(?:\.\d+)?\b/g) ?? [])].sort(),
    ['0', '1_000'],
    'a new numeric literal is live in the s 25-130 block. $1,000 belongs in `S25130_MAXIMUM_DEDUCTION` ' +
      'and nowhere else, and the first income year belongs in `S25130_FIRST_INCOME_YEAR`.',
  );
  assert.equal(
    occurrences(block, '1_000'),
    1,
    'the s 25-130 $1,000 is written twice. The second copy agrees with the record today and ' +
      'disagrees the year s 25-130(2) is amended, changing no fixture in between — register T14.',
  );
  // And the arithmetic must read the const rather than a literal of its own.
  assert.match(block, /maximumDeduction: S25130_MAXIMUM_DEDUCTION,/);

  // The other half of the same drift: `core/incomeBases.ts` consumes the deduction and must never
  // compute one. `0` is its only surviving literal — the nil deduction limb and the guards — and
  // a dollar figure appearing here means a legislated amount has left `data/assumptions/`.
  assert.deepEqual(
    [...new Set(CODE['incomeBases.ts'].match(/\b\d[\d_]*(?:\.\d+)?\b/g) ?? [])].sort(),
    ['0'],
    'a dollar figure is written in core/incomeBases.ts. Legislated figures live in data/assumptions/.',
  );
  assert.match(CODE['incomeBases.ts'], /standardDeductionAmountFor\(fy, salary, reducerDeductions\)/);
});

test('the s 25-130 compile probe is not vacuous — the CORRECT calls compile clean', () => {
  // The positive control for the three negative probes below. Without it they would pass for a bad
  // path or a missing import rather than for the reason they name.
  const result = tsc(
    "import { standardDeductionAmount, standardDeductionAmountFor } from '../src/data/assumptions/tax.js';\n" +
      "void netLabourIncomeFromSalary('2026-27', toCents(80_000), toCents(0));\n" +
      "void standardDeductionAmountFor('2026-27', toCents(80_000), toCents(0));\n" +
      'void standardDeductionAmount({\n' +
      '  maximumDeduction: TAX.s25130.maximumDeduction.value,\n' +
      '  assessableLabourIncome: toCents(80_000),\n' +
      '  reducerDeductions: toCents(0),\n' +
      '});',
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION P3-38 — a DEFAULTED reducer sum WILL NOT COMPILE away: all three arguments are required', () => {
  // The nil is a figure the caller states, never one they get by leaving a field out — the same
  // doctrine `NetLabourIncomeComponents` enforces by making both limbs required. A code-level
  // default (`reducerDeductions: Cents = toCents(0)`) changes no figure at all, because every call
  // site passes the nil explicitly: it failed ZERO tests before this probe existed. What it changes
  // is who is responsible for the nil, which is the whole of the Setting's honesty.
  const twoArgs = tsc("void netLabourIncomeFromSalary('2026-27', toCents(80_000));");
  assert.equal(twoArgs.ok, false, 'the reducer sum must not be optional on the salary default');
  assert.match(twoArgs.output, /Expected 3 arguments|argument/i);

  const noYear = tsc("void netLabourIncomeFromSalary(toCents(80_000), toCents(0));");
  assert.equal(noYear.ok, false, 'the year must not be optional either — the deduction has a first income year');

  const capOnly = tsc(
    "import { standardDeductionAmountFor } from '../src/data/assumptions/tax.js';\n" +
      "void standardDeductionAmountFor('2026-27', toCents(80_000));",
  );
  assert.equal(capOnly.ok, false, 'the reducer sum must not be optional on the arithmetic either');

  const missingField = tsc(
    "import { standardDeductionAmount } from '../src/data/assumptions/tax.js';\n" +
      'void standardDeductionAmount({\n' +
      '  maximumDeduction: TAX.s25130.maximumDeduction.value,\n' +
      '  assessableLabourIncome: toCents(80_000),\n' +
      '});',
  );
  assert.equal(missingField.ok, false, '`reducerDeductions` must be a required field on StandardDeductionInputs');
  assert.match(missingField.output, /reducerDeductions/);
});

test('MUTATION P3-38 — a s 25-130(3) amount has NO FIELD to reduce the deduction through', () => {
  // s 25-130(3): income-protection, personal-sickness and accident-insurance premiums, and trade or
  // professional association fees NEVER reduce the standard deduction, whatever their size. In this
  // build that is a STRUCTURAL property rather than an arithmetic one — there is no field to put
  // such an amount in — so it is pinned as absence plus a compile error, the P3-1a pattern. Nothing
  // here invents a field in order to have something to assert against.
  const block = s25130Block(TAX_SRC);
  const inputs = /export interface StandardDeductionInputs \{([\s\S]*?)\n\}/.exec(block);
  assert.ok(inputs !== null, 'StandardDeductionInputs has gone — this canary would pass vacuously');
  const fields = [...inputs[1].matchAll(/readonly (\w+):/g)].map((match) => match[1]);
  assert.deepEqual(fields, ['maximumDeduction', 'assessableLabourIncome', 'reducerDeductions']);
  assert.doesNotMatch(
    inputs[1],
    /insurance|premium|sickness|accident|association|union|subscription/i,
    'a s 25-130(3) amount has acquired a field. Those amounts do not reduce the deduction at all, ' +
      'so a field for one can only be read wrongly — s 25-130(3), register §2.8.2.',
  );

  // The same absence at the consuming end: the salary default takes a reducer sum and nothing else.
  assert.doesNotMatch(CODE['incomeBases.ts'], /insurance|premium|sickness|accident|association/i);

  // Writing one anyway does not compile, which is stronger than the greps above: the excess
  // property is refused at the call site, so there is no way to smuggle an amount in even locally.
  const smuggled = tsc(
    "import { standardDeductionAmount } from '../src/data/assumptions/tax.js';\n" +
      'void standardDeductionAmount({\n' +
      '  maximumDeduction: TAX.s25130.maximumDeduction.value,\n' +
      '  assessableLabourIncome: toCents(80_000),\n' +
      '  reducerDeductions: toCents(0),\n' +
      '  professionalAssociationFees: toCents(900),\n' +
      '});',
  );
  assert.equal(smuggled.ok, false, 'a s 25-130(3) amount must not be expressible as an input');
  assert.match(smuggled.output, /professionalAssociationFees/);

  // And the runtime half, in TWO financial years, because a single year cannot tell a wired
  // provision from a constant. Hand-derived from s 25-130(2), never read off the implementation:
  //
  //   FY2026-27, $80,000 of labour income, nil reducers:  max(0, min(1,000, 80,000) − 0) = $1,000
  //   FY2025-26, the same Person:                         the provision does not exist  =     $0
  //
  // A $900 professional-association fee and a $700 income-protection premium are smuggled in as
  // extra properties — JavaScript accepts what TypeScript refused above — and neither figure may
  // move either answer. If someone adds a field and reads it, this goes red in both years.
  const exclusions = { professionalAssociationFees: toCents(900), incomeProtectionPremiums: toCents(700) };
  const maximum = TAX.s25130.maximumDeduction.value;
  for (const [fy, expected] of [['2026-27', maximum], ['2025-26', toCents(0)]]) {
    assert.equal(standardDeductionAmountFor(fy, toCents(80_000), toCents(0)), expected, `s 25-130(2) in FY${fy}`);
    // The same year gate, over an input object carrying the s 25-130(3) amounts — which is what
    // `standardDeductionAmountFor` itself is, and the only way to get them near the arithmetic.
    const smuggled = s25130AppliesToYear(fy)
      ? standardDeductionAmount({
          maximumDeduction: maximum,
          assessableLabourIncome: toCents(80_000),
          reducerDeductions: toCents(0),
          ...exclusions,
        })
      : toCents(0);
    assert.equal(smuggled, expected, `a s 25-130(3) amount reduced the deduction in FY${fy}`);
  }
  // The years must actually differ, or the loop above tests one case twice.
  assert.equal(s25130AppliesToYear('2026-27'), true);
  assert.equal(s25130AppliesToYear('2025-26'), false);
  assert.notEqual(maximum, toCents(0));

  // The register record that says so, so the reader who looks for the rule finds it stated.
  assert.match(TAX.s25130.excludedFromReducers.value, /income-protection/);
  assert.match(TAX.s25130.excludedFromReducers.value, /personal-sickness and accident-insurance premiums/);
  assert.match(TAX.s25130.excludedFromReducers.value, /trade or\s+professional association fees|professional association fees/);
  assert.match(TAX.s25130.excludedFromReducers.note, /NEVER reduce/);
  assert.match(TAX.s25130.excludedFromReducers.note, /no\s+field/);
});
