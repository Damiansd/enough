// The P3-28 mutation battery — the traps `test/assumptions-franking.test.mjs` was measured NOT to
// catch, written as executable assertions.
//
// P3-28 shipped with four mutations run against it. A full battery of twenty-five, run 2026-09-15,
// found **eight survivors**, and this file closes seven of them. Each test below names the exact
// mutation it was built from, and the ones that are structural say so. Read
// `test/assumptions-franking.test.mjs` first: it holds the reachability, figure and confidence
// pins. This file holds only the things that were measured to fail zero tests.
//
// **What is structural here and what is not, stated once so nothing below over-claims.**
//
//   * The `tsc` probe is structural. Omitting `payerCorporateTaxRate`, or passing `undefined` for
//     it, is a compile error, and the probe proves it by running the compiler with a positive
//     control beside it. That is the "REQUIRED, UNDEFAULTED parameter" claim in
//     `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` actually enforced rather than
//     asserted — before this file, making the property optional and defaulting it to a stored
//     rate failed ZERO tests, and the Setting's own sentence saying otherwise went on passing.
//   * Everything else is an assertion over source text. TypeScript cannot forbid a numeric literal
//     that resembles a rate, cannot stop a rate being recorded in a different data module under an
//     innocent name, and cannot read the register. Those are canaries, and their limits are
//     written into their own failure messages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FRANKING,
  SETTINGS_NOT_ASSUMPTIONS,
  assumptionAt,
  assumptionKeys,
} from '../dist/data/assumptions/index.js';
import { fromCents } from '../dist/core/money.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const register = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');
const RAW = readFileSync(join(SRC, 'core', 'superFranking.ts'), 'utf8');

const SETTING_KEY = 'franking.portfolioEffectiveRate';

/** The register between two headings, as text. No parser, like `assumptions-franking.test.mjs`. */
const between = (from, to, source = register) =>
  source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from) + 1));

/**
 * Flattened prose: whitespace collapsed, so a claim that wraps across lines reads as one
 * sentence. Every register assertion below runs against this rather than the raw text — a naive
 * grep of a hard-wrapped markdown file is a grep that passes whenever the line break moves.
 */
const flatten = (text) => text.replace(/\s+/g, ' ');

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

// --- MUTATION 14, the structural half: the rate stops being required ---------------------------
//
// Measured 2026-09-15: making `payerCorporateTaxRate` optional and defaulting it to a rate stored
// in the module failed **0 of 627** tests. Both halves of §9's franking Setting row fell at once
// and the Setting's own "REQUIRED, UNDEFAULTED parameter" sentence kept passing, because the test
// that reads that sentence reads the WORDS and not the code. A required property is only required
// if something compiles a call that omits it.

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-franking-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { toCents } from '../src/core/money.js';\n" +
        "import { frankedDistributionFromRate, frankedDistributionFromStatement } from '../src/core/superFranking.js';\n" +
        'void frankedDistributionFromRate; void frankedDistributionFromStatement;\n' +
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
          '--exactOptionalPropertyTypes',
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

test('the compile probe is not vacuous — a CORRECT franked distribution compiles clean', () => {
  // The positive control. Without it a probe failing for an unrelated reason — a bad path, a
  // missing flag — would make every case below pass for the wrong reason.
  const result = tsc(
    "void frankedDistributionFromRate({\n" +
      "  fy: '2026-27',\n" +
      '  frankedAmount: toCents(1_000),\n' +
      '  frankingPercentage: 1,\n' +
      '  payerCorporateTaxRate: 0.3,\n' +
      "  source: 'an AMMA statement',\n" +
      "  confidence: 'primary-verified',\n" +
      '});\n' +
      "void frankedDistributionFromStatement({\n" +
      "  fy: '2026-27',\n" +
      '  frankedAmount: toCents(1_000),\n' +
      '  frankingCredit: toCents(428),\n' +
      "  source: 'an AMMA statement',\n" +
      "  confidence: 'primary-verified',\n" +
      '});',
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION T43 — a franked distribution derived WITHOUT a payer rate WILL NOT COMPILE', () => {
  const omitted = tsc(
    "void frankedDistributionFromRate({\n" +
      "  fy: '2026-27',\n" +
      '  frankedAmount: toCents(1_000),\n' +
      '  frankingPercentage: 1,\n' +
      "  source: 'an AMMA statement',\n" +
      "  confidence: 'primary-verified',\n" +
      '});',
  );
  assert.equal(
    omitted.ok,
    false,
    'the payer rate must be REQUIRED. s 202-60(2) fixes it to the entity making the distribution, ' +
      'so the engine has no figure to fall back on: a default here is a portfolio-level rate by ' +
      "another name, which is exactly what T43 forbids and what SETTINGS_NOT_ASSUMPTIONS['" +
      SETTING_KEY +
      "'] says cannot happen.",
  );
  assert.match(omitted.output, /payerCorporateTaxRate/);

  // And it cannot be waved through with an explicit `undefined` either — the property is not
  // optional, so there is no shape of call that leaves the rate unstated.
  const undef = tsc(
    "void frankedDistributionFromRate({\n" +
      "  fy: '2026-27',\n" +
      '  frankedAmount: toCents(1_000),\n' +
      '  frankingPercentage: 1,\n' +
      '  payerCorporateTaxRate: undefined,\n' +
      "  source: 'an AMMA statement',\n" +
      "  confidence: 'primary-verified',\n" +
      '});',
  );
  assert.equal(undef.ok, false, 'an explicit undefined must not stand in for the payer rate');
});

test('the statement route needs no rate at all, and cannot be given one', () => {
  // T43's own remedy: `grossed_up = franked + credit`. If this route ever grew a rate parameter
  // the "the preferred route needs no rate at all" half of the Setting would have quietly died.
  const smuggled = tsc(
    "void frankedDistributionFromStatement({\n" +
      "  fy: '2026-27',\n" +
      '  frankedAmount: toCents(1_000),\n' +
      '  frankingCredit: toCents(428),\n' +
      '  payerCorporateTaxRate: 0.3,\n' +
      "  source: 'an AMMA statement',\n" +
      "  confidence: 'primary-verified',\n" +
      '});',
  );
  assert.equal(smuggled.ok, false, 'the statement route must not accept a rate');
});

// --- MUTATION 8: a rate literal the shipped canary cannot see ---------------------------------
//
// Measured 2026-09-15. `test/assumptions-franking.test.mjs`'s canary matches `0\.\d+` over a
// source with comments stripped but STRINGS KEPT. Three rate literals walked past it:
//
//   * `.3`      — no leading zero. Failed 0 of 627 tests: invisible to both canaries in the tree.
//   * `3 / 10`  — not a decimal at all.
//   * `500_000` — the $5,000 ceiling in cents, which `5_?000` does not match.
//
// The derivation below is the executable-only one (comments stripped AND strings blanked) and the
// pin is the **exact surviving set**, not a list of forbidden shapes: a literal nobody predicted
// fails it too. Its two survivors are `0` and `1`, and both are bounds on a rate the caller
// supplied — `f < 0 || f > 1` and `r <= 0 || r >= 1` — not figures.

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const CODE = executableCode(RAW);

test('the executable-only derivation of superFranking.ts has not over-stripped', () => {
  // The vacuity test. A block of `doesNotMatch`/empty-set assertions passes trivially if the
  // strip eats the file, so the bindings that must survive it are asserted positively first.
  assert.match(CODE, /export const frankedDistributionFromRate/);
  assert.match(CODE, /export const frankedDistributionFromStatement/);
  assert.match(CODE, /export const frankingInSuper/);
  assert.match(CODE, /mulCents\(input\.frankedAmount, \(f \* r\) \/ \(1 - r\)\)/);
  assert.ok(CODE.length > 4_000, `the strip left ${CODE.length} characters — it ate the module`);
});

test('MUTATION T43 — the only numeric literals in superFranking.ts are the bounds 0 and 1', () => {
  // `\.\d+` is the alternative that matters: `.3` is the mutation that survived the shipped
  // canary, and a leading-zero-only regex is blind to it by construction.
  const literals = [...CODE.matchAll(/(?<![\w.])(?:\d[\d_]*(?:\.\d+)?|\.\d+)/g)].map(([match]) => match);
  assert.deepEqual(
    [...new Set(literals)].sort(),
    ['0', '1'],
    'a numeric literal other than the bounds 0 and 1 is written in src/core/superFranking.ts. ' +
      'Every figure this module uses is supplied by the caller with the caller\'s own confidence: ' +
      'the payer rate (s 202-60(2), T43), the franking percentage, the franked amount. A stored ' +
      'one is a register figure without a register row. Literals found: ' +
      `${[...new Set(literals)].sort().join(', ')}`,
  );

  // The rate must also never be defaulted from a value imported from elsewhere — the set pin
  // above sees a literal in THIS file and nothing else. This is the import side of the same rule.
  const imports = [...RAW.matchAll(/^import\s+(?!type)[^\n]*from\s+'([^']+)'/gm)].map(([, spec]) => spec);
  assert.deepEqual(
    [...new Set(imports)].sort(),
    ['./money.js', './provenance.js', './superPhase.js'],
    'superFranking.ts has grown a value import. A rate parked in a sibling module and imported ' +
      'here is the same mutation as a literal, and the literal-set pin above cannot see it.',
  );
  assert.doesNotMatch(CODE, /payerCorporateTaxRate\s*\?\?/);
  assert.doesNotMatch(CODE, /payerCorporateTaxRate\?:/);
});

// --- MUTATION 12: the rate recorded somewhere the canary does not look -------------------------
//
// Measured 2026-09-15: a `blendedImputationRate` of 0.28, `kind: 'constant'`, sourced to
// s 202-60(2) and stamped §5A.1, added to `SUPERANNUATION` — the precise figure T43 says does not
// exist in law — failed **0 of 627** tests. `assumptions-franking.test.mjs` bans the names
// `portfolio`, `effectiveRate`, `effectiveFranking` and `grossUp` across `assumptionKeys()`, so
// the defence was a name blacklist and the mutation simply chose another name.
//
// Two layers here, because neither is enough alone: **where §5A may be cited from**, and **which
// files in the data layer may speak about franking at all**. Both are named in the failure
// messages. The honest residual is stated in the last assertion: a rate that names itself neither
// franking nor imputation and cites a register section outside §5A is not reachable by either.

test('MUTATION T43 — §5A is cited from the franking module and the Setting, and from nowhere else', () => {
  for (const key of assumptionKeys()) {
    const { registerSection } = assumptionAt(key);
    if (/^§5A/.test(registerSection)) {
      assert.match(
        key,
        /^franking\./,
        `${key} cites ${registerSection} but does not live under franking.*. §5A's figures are ` +
          'the fourteen records in src/data/assumptions/franking.ts and nothing else. A franking ' +
          'figure filed under another domain is out of reach of every pin that module carries — ' +
          'including the one that says no record here is a rate a distribution is grossed up by.',
      );
    }
  }

  // The Setting is the other side of the same boundary: §5A.1's rate is claimed by exactly one of
  // them, and it is not the assumption tree.
  assert.equal(SETTINGS_NOT_ASSUMPTIONS[SETTING_KEY].registerSection, '§5A.1 / T43');
  assert.equal(assumptionAt(SETTING_KEY), undefined);
});

test('MUTATION T43 — only franking.ts speaks about franking inside src/data/assumptions/', () => {
  const files = readdirSync(join(SRC, 'data', 'assumptions')).filter((name) => name.endsWith('.ts'));
  assert.ok(files.includes('franking.ts'), 'the canary is reading the wrong directory');

  const speaking = files.filter((name) =>
    /franking|imputation|gross-up|grossUp|franked/i.test(readFileSync(join(SRC, 'data', 'assumptions', name), 'utf8')),
  );
  assert.deepEqual(
    speaking.sort(),
    ['franking.ts', 'index.ts', 'settings.ts'],
    'a data-layer module other than franking.ts, the barrel and the Setting now mentions ' +
      'franking or imputation. The mutation this catches is a blended imputation rate recorded in ' +
      'another domain under an innocent name — measured 2026-09-15 as failing zero tests. ' +
      'HONEST LIMIT: this reads vocabulary, so a rate that calls itself neither franking nor ' +
      'imputation AND cites a register section outside §5A is caught by nothing here. T43 cannot ' +
      'be made structural; that residual is the price of it.',
  );
});

// --- MUTATION 21: the Setting's reason reworded --------------------------------------------------
//
// Measured 2026-09-15: inserting *"T43 forbids the two legislated payer rates, 25% and 30%, as
// engine figures just as it forbids a blended one"* into the reason — the exact over-broad reading
// the correction frame exists to kill, in new words — failed **0 of 627** tests. The shipped test
// pins eleven literal phrases, and a paraphrase that keeps all eleven and ADDS a twelfth sentence
// walks through. A false claim comes back reworded, not re-pasted, so the pins below are counts
// and anchors rather than more quotations.

const REASON = SETTINGS_NOT_ASSUMPTIONS[SETTING_KEY].reason;
const SENTENCES = REASON.split(/(?<=\.)\s+(?=[A-Z§'“])/);

test('MUTATION T43 — the over-broad reading survives in the reason exactly twice, both times framed', () => {
  // Count, not absence. The superseded claim is deliberately kept once as a quotation and once in
  // the sentence that corrects it, so `doesNotMatch` would either fail on the legitimate copies or
  // pass by the accident of a line break. A third occurrence is the claim coming back.
  assert.equal(
    occurrences(REASON.toLowerCase(), 'payer rate'),
    2,
    'the phrase "payer rate" must appear exactly twice in the reason: once inside the quoted ' +
      'superseded sentence, once in the sentence that says the payer rates were never inside ' +
      "T43's remit. A third is the over-broad reading re-asserted; a first-and-only is the " +
      'correction frame decayed into a bare assertion.',
  );
  assert.equal(occurrences(REASON, '25%'), 2, 'the two legislated rates are named twice: quote and correction');
  assert.equal(occurrences(REASON, '30%'), 2);
  assert.equal(occurrences(REASON.toLowerCase(), 'forbid'), 2);

  // And each of the two occurrences sits in its frame rather than standing alone.
  const [quoted, corrected] = SENTENCES.filter((s) => /payer rate/i.test(s));
  assert.match(quoted, /T43 forbids a portfolio rate, not the two legislated payer rates/);
  assert.match(corrected, /never inside T43's remit/);
  assert.match(corrected, /never proposed as §7 constants/);
});

test('MUTATION T43 — the reason is twelve sentences, and each of them is on one of its own subjects', () => {
  // The layer that closes the reword: a paraphrase can borrow an on-topic word to pass a
  // vocabulary ban, but it must then be an EXTRA sentence or displace an asserted one. The count
  // and the anchors are pinned; the sentence text is not — a prose pin holds a falsehood in place
  // as readily as a truth.
  const ANCHORS = [
    /portfolio/i,
    /ENTITY MAKING THE DISTRIBUTION/,
    /FORECAST about a portfolio's composition/,
    /WHAT IT IS NOT/,
    /payer rate/i,
    /do not appear in §7 at all/,
    /R-B/,
    /NEEDS NO RATE AT ALL/,
    /frankedDistributionFromRate/,
    /HOW FAR THAT IS ENFORCED/,
    /source canary/,
    /register §9/,
  ];
  assert.equal(
    SENTENCES.length,
    12,
    `the reason is now ${SENTENCES.length} sentences, not twelve. An added sentence is how the ` +
      'over-broad reading came back the last time this was measured; a removed one is a ' +
      'qualification quietly dropped. Either way the count is the thing that noticed.',
  );
  for (const sentence of SENTENCES) {
    assert.ok(
      ANCHORS.some((anchor) => anchor.test(sentence)),
      `a sentence of the reason names none of T43's own subjects: "${sentence.slice(0, 80)}…"`,
    );
  }

  // The enforcement claim, tied to the probe at the top of this file rather than left as prose.
  assert.match(REASON, /REQUIRED, UNDEFAULTED parameter/);
  assert.match(REASON, /the never-stored half is NOT structural/);
});

// --- MUTATIONS 22 and 23: the register's own wording ------------------------------------------
//
// Both measured 2026-09-15 as failing **0 of 627** tests. T43's row can be rewritten from "no
// portfolio-level gross-up rate" to "no gross-up rate, at the portfolio level or at the payer
// level" — the over-broad reading, installed in the ruling itself — and §5A.3.1's correction can
// be inverted straight back into the falsehood it was shipped to kill. The whole build rests on
// T43's qualifier; nothing was reading it.

test('MUTATION T43 — the ruling keeps its qualifier, and does not reach the payer rates', () => {
  const t43 = register.split('\n').filter((line) => line.startsWith('| T43 |'));
  assert.equal(t43.length, 1, 'T43 must be stated once');

  assert.match(
    t43[0],
    /There is \*\*no portfolio-level gross-up rate in law\.\*\*/,
    'T43 has lost the word that carries it. The ruling is about a BLENDED, cross-payer rate: ' +
      's 202-60(2) fixes the rate to the entity making the distribution, so a diversified holding ' +
      'spans both legislated rates at once. Widened to "no gross-up rate in law" it becomes false ' +
      '— the payer rates are perfectly real — and P3-28 spent a commit correcting exactly that ' +
      'over-reading where §5A.3.1 had made it.',
  );
  assert.match(t43[0], /s 202-60\(2\) fixes the rate to \*the entity making the distribution\*/);
  assert.doesNotMatch(
    t43[0],
    /payer/i,
    'T43 now says something about the payer rates. It never did: its subject is the figure that ' +
      'does not exist, and the two that do are §5A.2 config rows outside its remit.',
  );
  assert.match(t43[0], /user input \/ Setting/);
  assert.match(t43[0], /`grossed_up = franked \+ credit` needs no rate at all/);
});

test('MUTATION §5A.3.1 — the superseded claim appears once, and inside its correction', () => {
  const claim = "§5A.2's 25% and 30% appear in §7's constants list";
  assert.equal(
    occurrences(flatten(register), claim),
    1,
    'the sentence P3-28 retracted must survive exactly once in this register, as the quotation ' +
      'inside its own correction. Twice is the claim escaping the frame; nil is the frame decayed ' +
      'into a bare assertion nobody can check against what it replaced.',
  );

  const flat = flatten(between('§5A.3.1', '## 6. Cross-report consistency'));
  assert.match(flat, /THE CLAIM WAS FALSE WHEN WRITTEN/);
  assert.match(
    flat,
    /\*\*§5A\.2's rates do not appear in §7 at all, under any tag\.\*\*/,
    'the correction has gone. Measured 2026-09-15: inverting this one sentence back into the ' +
      'falsehood failed zero tests, which is how a retracted claim returns to a register.',
  );
  // The direction of the surviving half, so the correction cannot be read as retracting the lot.
  assert.match(flat, /T43 forbids a \*\*portfolio\*\* rate, not the two legislated \*\*payer\*\* rates\*? is correct/);
});

// --- MUTATION 24: §7's franking rows drifting away from the records ----------------------------
//
// Measured 2026-09-15: changing §7's at-risk row from **0.30** to **0.35** failed **0 of 627**
// tests. The shipped structural test pins the twelve rows BY NAME and reads their value cells only
// for a rate-shaped phrase, so every figure in the table could move without the records moving
// with them — the T14 drift this register exists to prevent, in the register itself.
//
// Every expected string below is COMPUTED FROM THE RECORD, never typed: change either side alone
// and this fails.

const dollars = (cents) => `$${fromCents(cents).toLocaleString('en-AU')}`;

test('MUTATION §7 — each franking row still states the figure its record holds', () => {
  const seven = between('## 7. The constants', '## 8. What is still open');
  const cells = new Map(
    seven
      .split('\n')
      .filter((line) => line.trim().endsWith('| franking |'))
      .map((line) => line.split('|').map((cell) => cell.trim()))
      .map(([, name, value]) => [name.replace(/\*\*/g, ''), value]),
  );
  assert.equal(cells.size, 12, 'the twelve rows are pinned by name in assumptions-franking.test.mjs');

  const expected = [
    ['Small shareholder ceiling', [dollars(FRANKING.smallShareholder.ceiling.value)]],
    ['Small shareholder exemption — eligible entities', [FRANKING.smallShareholder.eligibleEntities.value.split(' —')[0]]],
    ['Small shareholder boundary', [FRANKING.smallShareholder.boundary.value.split(' qualifies')[0]]],
    ['Dividend-washing small-holder ceiling', [dollars(FRANKING.dividendWashing.ceiling.value)]],
    [
      'Holding period',
      [`${FRANKING.holdingPeriod.days.value.ordinary} days`, `${FRANKING.holdingPeriod.days.value.preferenceShares} days`],
    ],
    ['Holding period, widely held trust investor', [`${FRANKING.holdingPeriod.widelyHeldTrustDays.value} days flat`]],
    [
      'Qualification windows',
      [
        `±${FRANKING.holdingPeriod.days.value.ordinary} / ±${FRANKING.holdingPeriod.days.value.preferenceShares}`,
      ],
    ],
    ['At-risk minimum net delta', [FRANKING.atRisk.minimumNetDelta.value.toFixed(2)]],
    ['Day counting', ['acquisition day', 'disposal day']],
    ['Parcel disposal order', [FRANKING.parcelDisposalOrder.value.split(' ')[0]]],
    ['Maximum franking percentage', [`${FRANKING.maximumFrankingPercentage.value * 100}%`]],
    [
      'Excess franking credits refundable',
      [
        `**${FRANKING.excessCreditsRefundable.individual.value}** for an individual`,
        `**${FRANKING.excessCreditsRefundable.nonComplyingFundOrAdf.value}** for a non-complying fund`,
      ],
    ],
  ];

  for (const [name, fragments] of expected) {
    const value = cells.get(name);
    assert.ok(value !== undefined, `§7 has no franking row named "${name}"`);
    for (const fragment of fragments) {
      assert.ok(
        value.includes(fragment),
        `§7's "${name}" row reads "${value}" and the record says "${fragment}". One of the two ` +
          'moved without the other. The register is the specification for the data layer, so a ' +
          'row that no longer states its record\'s figure is a figure with two values and no ' +
          'source — T14 drift, inside the document written to prevent it.',
      );
    }
  }
});

// --- MUTATION 25: §9's declaration of what has no code path ------------------------------------
//
// Measured 2026-09-15: deleting the O66-shaped preamble P3-28 added and replacing it with "All
// sixteen rows below are live and covered" failed **0 of 627** tests. A declared gap that nothing
// reads is a gap waiting to be undeclared.

test('MUTATION §9 — the Franking table still declares which of its rows have no code to run against', () => {
  // `### Franking` also names §5A's own heading, so the slice starts inside §9.
  const nine = register.slice(register.indexOf('\n## 9. '));
  const franking = between('### Franking', '\n### ', nine);
  const rows = franking
    .split('\n')
    .filter((line) => line.startsWith('|') && !line.startsWith('|---') && !line.startsWith('| Mutation |'));

  assert.equal(
    rows.length,
    17,
    `§9's franking mutation table holds ${rows.length} rows. The preamble's arithmetic is stated ` +
      'against this number, so a row added or removed without the preamble moving is a row ' +
      'nobody has classified as live, dead or not-a-test.',
  );

  // NOT PINNED, and deliberately: the preamble says "these sixteen rows" and there are seventeen.
  // That is a defect in the register found by writing this count, not something to assert around —
  // tying the word to the count would ship a red test. Reported for correction rather than fixed
  // here; the ten-with-no-code-path classification below is itself correct.
  const flat = flatten(franking);
  assert.match(flat, /NO CODE PATH TO RUN AGAINST/, 'the O66-shaped declaration has been removed');
  assert.match(flat, /same reason O66's is stated in §1/);
  assert.match(flat, /no row is marked BUILT/);
  assert.match(flat, /The individual \(non-super\) side of franking is \*\*P3-22\*\*, and that module does not exist/);
  assert.match(flat, /a record is not a test, and that module has no runtime consumer at all/);
  assert.match(flat, /\*\*What IS live today:\*\*/);
  assert.doesNotMatch(
    flat,
    /All (sixteen|seventeen) rows below are live/,
    'the declaration has been inverted into a claim of coverage. Ten of these rows have nothing ' +
      'to mutate, because P3-22 does not exist.',
  );
});
