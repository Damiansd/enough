// P2-10 — the annual assumption refresh script (`scripts/update-assumptions.mjs`), driven as a
// subprocess: it is deliberately outside tsc's `include` (see the script's own header) so there is
// no compiled output to import, and it does real filesystem I/O keyed off `process.argv` and
// `import.meta.url`, which a same-process `import()` cannot re-parameterise per test. `server/`
// is the house precedent for file-touching Node code outside tsc's reach; this follows it by
// shelling out, the same way a human runs `npm run update-assumptions -- --fy YYYY-YY`.
//
// THE load-bearing property this file exists to pin: a run must not perturb the live tree. Every
// other property here is important, but if this one breaks the forecaster silently starts
// computing a different year than the one on disk. See the non-perturbation test below.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assumptionAt, assumptionKeys } from '../dist/data/assumptions/index.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Overridable ONLY for the mutation-check exercise described in the task brief: pointing this at a
// scratch copy of the script lets the same test file re-verify a mutated copy without editing the
// suite per mutation. The default is always the real, committed script.
const SCRIPT = process.env.UPDATE_ASSUMPTIONS_SCRIPT
  ? resolve(process.env.UPDATE_ASSUMPTIONS_SCRIPT)
  : join(REPO, 'scripts', 'update-assumptions.mjs');

const REFRESH_DIR = join(REPO, 'refresh');
const SRC = join(REPO, 'src');
const DIST_ASSUMPTIONS = join(REPO, 'dist', 'data', 'assumptions');

const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, encoding: 'utf8' });

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Every file under `dir`, relative path → {hash, mtimeMs, size}. Used to prove "untouched". */
const snapshotTree = (dir) => {
  const out = new Map();
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        const stats = statSync(path);
        out.set(relative(dir, path), { hash: sha256(path), mtimeMs: stats.mtimeMs, size: stats.size });
      }
    }
  };
  walk(dir);
  return out;
};

/** Content-only view of `snapshotTree`, for idempotence checks where a fresh mtime on every run
 * is expected and correct — atomic tmp-then-rename always rewrites the file — and only the bytes
 * matter. */
const contentOnly = (tree) =>
  new Map([...tree].map(([path, { hash, size }]) => [path, { hash, size }]));

const domainFile = (fy, domain) => join(REFRESH_DIR, `FY${fy}`, `${domain}.refresh.ts`);

/** Every `.refresh.ts` file staged for `fy`, concatenated — callers rarely care which domain file
 * a key landed in, only whether it is present at all. */
const allStagedText = (fy) => {
  const dir = join(REFRESH_DIR, `FY${fy}`);
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n');
};

/** The exact-key code rows (`"key": {`) inside one of the two labelled sections of a domain file.
 * Formula rows never match this — `rowFor` emits only comments for a formula, never a code row —
 * so this is deliberately blind to formulas, which is exactly the distinction property 8 needs. */
const codeRowKeysInSection = (content, sectionMarker, otherMarker) => {
  const start = content.indexOf(sectionMarker);
  if (start === -1) return [];
  const from = content.slice(start);
  const end = from.indexOf(otherMarker);
  const section = end === -1 ? from : from.slice(0, end);
  return [...section.matchAll(/^ {2}"([^"]+)": \{$/gm)].map((m) => m[1]);
};

const ROTTED_MARKER = '── ROTTED';
const MISSING_MARKER = '── MISSING';

// ---------------------------------------------------------------------------------------------
// Repo hygiene: back up any pre-existing `refresh/` (gitignored, so it may already hold a human's
// in-progress worksheet), guarantee every test starts and ends without a stray `refresh/` of our
// own making, and restore exactly what was there before this file ran.
// ---------------------------------------------------------------------------------------------
let backup = null;

test.before(() => {
  if (existsSync(REFRESH_DIR)) {
    backup = mkdtempSync(join(tmpdir(), 'enough-refresh-backup-'));
    cpSync(REFRESH_DIR, join(backup, 'refresh'), { recursive: true });
    rmSync(REFRESH_DIR, { recursive: true, force: true });
  }
});

test.afterEach(() => {
  rmSync(REFRESH_DIR, { recursive: true, force: true });
});

test.after(() => {
  rmSync(REFRESH_DIR, { recursive: true, force: true });
  if (backup) {
    cpSync(join(backup, 'refresh'), REFRESH_DIR, { recursive: true });
    rmSync(backup, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------
// Property 1 — THE load-bearing invariant: a run must not perturb the live tree.
// ---------------------------------------------------------------------------------------------
test('a run touches nothing under src/, and leaves the compiled assumptions byte-identical', () => {
  const srcBefore = snapshotTree(SRC);
  const distBefore = snapshotTree(DIST_ASSUMPTIONS);
  assert.ok(srcBefore.size > 0, 'the src/ snapshot is empty — the test would pass vacuously');
  assert.ok(distBefore.size > 0, 'the dist/data/assumptions snapshot is empty — the test would pass vacuously');

  const result = run(['--fy', '2027-28']);
  assert.equal(result.status, 0, result.stderr);

  assert.deepEqual(snapshotTree(SRC), srcBefore, 'src/ changed shape, content or mtime during a run');
  assert.deepEqual(snapshotTree(DIST_ASSUMPTIONS), distBefore, 'the compiled assumptions changed during a run');
});

test('the legislated FY2027-28 lowest marginal rate is unchanged by a run naming that year', async () => {
  const before = assumptionAt('tax.years.2027-28.lowestMarginalRate');
  assert.equal(before.value, 0.14);
  assert.equal(before.confidence, 'primary-verified');

  const result = run(['--fy', '2027-28']);
  assert.equal(result.status, 0, result.stderr);

  // Re-import from the same, unrewritten dist/ file: a change here could only mean the run wrote
  // to dist/, which property 1's byte-identical check above also guards independently.
  const { assumptionAt: after } = await import(
    `../dist/data/assumptions/index.js?cachebust=${Date.now()}-${Math.random()}`
  );
  assert.equal(after('tax.years.2027-28.lowestMarginalRate').value, 0.14);
});

// ---------------------------------------------------------------------------------------------
// Property 2 — idempotence, and no generation timestamp.
// ---------------------------------------------------------------------------------------------
test('two consecutive runs for the same FY produce byte-identical staged files', () => {
  const first = run(['--fy', '2027-28']);
  assert.equal(first.status, 0, first.stderr);
  const firstTree = snapshotTree(join(REFRESH_DIR, 'FY2027-28'));
  assert.ok(firstTree.size > 0, 'nothing was staged — the identity check would be vacuous');

  rmSync(REFRESH_DIR, { recursive: true, force: true });

  const second = run(['--fy', '2027-28']);
  assert.equal(second.status, 0, second.stderr);
  const secondTree = snapshotTree(join(REFRESH_DIR, 'FY2027-28'));

  // Content only: the atomic tmp-then-rename write always gives the second run a fresh mtime,
  // and that is correct — idempotence is about bytes, not filesystem metadata.
  assert.deepEqual(contentOnly(secondTree), contentOnly(firstTree), 're-running is not byte-for-byte identical');
  assert.equal(first.stdout, second.stdout, 'the console report differs between two runs of the same input');
});

test('the staged output carries no generation timestamp', () => {
  const result = run(['--fy', '2027-28']);
  assert.equal(result.status, 0, result.stderr);
  const text = allStagedText('2027-28');
  assert.ok(text.length > 0);
  // Every legitimate date in the output is a plain `YYYY-MM-DD` (a `retrieved` stamp copied from
  // the register, or an empty `""` TODO); a generation timestamp would be `Date.now()` or
  // `.toISOString()`-shaped, i.e. it carries a `T` and a clock. That shape must never appear.
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

// ---------------------------------------------------------------------------------------------
// Property 3 — the sourcing gate is enacted, not requested.
// ---------------------------------------------------------------------------------------------
test('every non-formula emitted row is blanked: value null, source and retrieved empty', () => {
  // **FY2025-26, not FY2027-28, since P2-10b.** The rotted set this ran on used to be R12's three
  // carried-forward FY2027-28 rates plus their table. Sch 7 Pt I has since been read directly and
  // those four are `primary-verified`, so FY2027-28 stages ZERO rotted rows and the vacuity guard
  // below would fire. FY2025-26 is where real rot lives now: §2.7's ten Medicare low-income
  // thresholds, stamped FY2025-26 and carrying `priorYearFallbackFor: '2026-27'` because the
  // Budget lifts them retrospectively and FY2026-27's figures do not exist yet. That is the one
  // genuinely unknowable item in this register, and it is deliberately untouched by P2-10b.
  const result = run(['--fy', '2025-26']);
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(domainFile('2025-26', 'tax'), 'utf8');

  const rotted = codeRowKeysInSection(text, ROTTED_MARKER, MISSING_MARKER);
  const missing = codeRowKeysInSection(text, MISSING_MARKER, '\0'); // no marker after MISSING; run to EOF
  assert.ok(rotted.length > 0, 'no rotted rows were staged — the shape assertion below would be vacuous');
  assert.ok(missing.length > 0, 'no missing rows were staged — the shape assertion below would be vacuous');

  for (const key of [...rotted, ...missing]) {
    const start = text.indexOf(`"${key}": {`);
    const end = text.indexOf('\n  },', start);
    const block = text.slice(start, end);
    assert.match(block, /value: null,/, `${key} was not blanked`);
    assert.match(block, /source: "",/, `${key} carries a non-empty source`);
    assert.match(block, /retrieved: "",/, `${key} carries a non-empty (and therefore compilable) retrieved date`);
    assert.match(block, /confidence: "unverified",/, `${key} was not reset to unverified`);
  }
});

// ---------------------------------------------------------------------------------------------
// Property 4 — constants are never blanked.
// ---------------------------------------------------------------------------------------------
test('no `constant`-kind leaf is ever emitted, for any FY the register stamps', () => {
  const constantKeys = assumptionKeys().filter((key) => assumptionAt(key).kind === 'constant');
  assert.ok(constantKeys.length > 0, 'no constant leaves exist in the register — this test would be vacuous');

  const stampedFys = [...new Set(assumptionKeys().map((key) => assumptionAt(key).fy).filter(Boolean))];
  assert.ok(stampedFys.length > 0);

  for (const fy of stampedFys) {
    const result = run(['--fy', fy]);
    assert.equal(result.status, 0, result.stderr);
    const text = allStagedText(fy);
    for (const key of constantKeys) {
      assert.ok(!text.includes(key), `constant leaf ${key} was emitted while refreshing FY${fy}`);
    }
    rmSync(REFRESH_DIR, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------
// Property 5 — sourced target-year leaves survive; the WATO trap, pinned both directions.
// ---------------------------------------------------------------------------------------------
test('--fy 2027-28 leaves the legislated lowest marginal rate alone and does not list WATO as missing', () => {
  const result = run(['--fy', '2027-28']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /left alone[\s\S]*tax\.years\.2027-28\.lowestMarginalRate/);
  assert.match(result.stdout, /left alone[\s\S]*tax\.wato\.maximumOffset/);

  const text = allStagedText('2027-28');
  assert.ok(!text.includes('tax.years.2027-28.lowestMarginalRate'), 'the legislated rate was staged for refresh');
  assert.ok(!text.includes('tax.wato.maximumOffset'), 'a sourced FY2027-28 WATO leaf was staged for refresh');
});

test('--fy 2028-29 (the year after WATO was sourced) DOES list it as missing', () => {
  const result = run(['--fy', '2028-29']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /(\d+) missing/);
  const missingCount = Number(result.stdout.match(/(\d+) missing/)[1]);
  assert.ok(missingCount > 0, 'nothing was reported missing — the WATO assertion below would be vacuous');

  const text = allStagedText('2028-29');
  assert.ok(text.includes('tax.wato.maximumOffset'), 'FY2028-29 should list tax.wato.maximumOffset as missing');
  const keys = codeRowKeysInSection(
    readFileSync(domainFile('2028-29', 'tax'), 'utf8'),
    MISSING_MARKER,
    '\0',
  );
  assert.ok(keys.includes('tax.wato.maximumOffset'));
});

// ---------------------------------------------------------------------------------------------
// Property 6 — R12's rot is caught, exactly.
// ---------------------------------------------------------------------------------------------
test('--fy 2025-26 lists exactly the ten \u00a72.7 Medicare low-income threshold leaves as rotted', () => {
  // This pinned the four R12 carried-forward FY2027-28 leaves until P2-10b sourced them from
  // Sch 7 Pt I. What it pins now is the set that genuinely rots, and the register is explicit that
  // it is the ONLY such set in the tax domain: the Medicare low-income thresholds are lifted
  // retrospectively in the following Budget, so no forward figure for them can exist. The ten are
  // named individually so that one quietly dropping out of the refresh is a failure here.
  const result = run(['--fy', '2025-26']);
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(domainFile('2025-26', 'tax'), 'utf8');
  const rotted = codeRowKeysInSection(text, ROTTED_MARKER, MISSING_MARKER);

  assert.deepEqual(
    [...rotted].sort(),
    [
      'tax.medicareLevy.lowIncomeThresholds.familyLower',
      'tax.medicareLevy.lowIncomeThresholds.familyLowerPerDependentChild',
      'tax.medicareLevy.lowIncomeThresholds.familyUpper',
      'tax.medicareLevy.lowIncomeThresholds.familyUpperPerDependentChild',
      'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower',
      'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyUpper',
      'tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower',
      'tax.medicareLevy.lowIncomeThresholds.seniorsSingleUpper',
      'tax.medicareLevy.lowIncomeThresholds.singleLower',
      'tax.medicareLevy.lowIncomeThresholds.singleUpper',
    ].sort(),
  );
  assert.match(result.stdout, /^ {2}10 rotted/m);

  // And the complement, which is the half P2-10b changed: FY2027-28 now stages NOTHING as rotted,
  // because every figure it holds is sourced. A refresh that starts listing the ladder again has
  // either lost the Act citation or re-guessed a rate.
  const forward = run(['--fy', '2027-28']);
  assert.equal(forward.status, 0, forward.stderr);
  assert.match(forward.stdout, /^ {2}0 rotted/m);
});

// ---------------------------------------------------------------------------------------------
// Property 7 — `priorYearFallbackFor` direction, pinned against the live register AND against
// what the script itself emits.
// ---------------------------------------------------------------------------------------------
test('on the live register, `fy` names where a fallback figure came from and `priorYearFallbackFor` names the target year with no figure', () => {
  const lowIncomeThresholdKeys = assumptionKeys().filter((key) =>
    key.startsWith('tax.medicareLevy.lowIncomeThresholds.'),
  );
  assert.ok(lowIncomeThresholdKeys.length > 0, 'no low-income-threshold leaves exist — this test would be vacuous');

  for (const key of lowIncomeThresholdKeys) {
    const record = assumptionAt(key);
    // The figure is stamped for the year it was published (2025-26, the year it CAME FROM)...
    assert.equal(record.fy, '2025-26', `${key}: fy should be the origin year`);
    // ...and names 2026-27 as the TARGET year that has no figure of its own yet.
    assert.equal(record.priorYearFallbackFor, '2026-27', `${key}: priorYearFallbackFor should be the target year`);
  }
});

test('a rotted row the script emits stamps `fy` to the prior year it carried from, and `priorYearFallbackFor` to the target', () => {
  // Retargeted with the test above, for the same reason: FY2027-28's ladder is sourced now, so the
  // key this used to read is no longer staged. The property is unchanged and is what matters —
  // the DIRECTION of the two stamps — and it is asserted on a leaf that really does rot.
  const result = run(['--fy', '2025-26']);
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(domainFile('2025-26', 'tax'), 'utf8');

  const key = 'tax.medicareLevy.lowIncomeThresholds.singleLower';
  const start = text.indexOf(`"${key}": {`);
  assert.ok(start !== -1, `${key} was not staged — the direction assertion below would be vacuous`);
  const end = text.indexOf('\n  },', start);
  const block = text.slice(start, end);

  assert.match(block, /fy: "2024-25",/, 'fy should name FY2024-25 — the year the carried figure came FROM');
  assert.match(
    block,
    /priorYearFallbackFor: "2025-26",/,
    'priorYearFallbackFor should name FY2025-26 — the TARGET year with no figure of its own',
  );
});

// ---------------------------------------------------------------------------------------------
// Property 8 — formula-valued leaves are listed but never blanked.
// ---------------------------------------------------------------------------------------------
test('a formula leaf appears as a listed comment but is never given a blanked code row', () => {
  const result = run(['--fy', '2028-29']);
  assert.equal(result.status, 0, result.stderr);
  const text = readFileSync(domainFile('2028-29', 'tax'), 'utf8');

  assert.match(text, /\/\/ tax\.wato\.amount\n/, 'the formula was not listed at all');
  assert.match(text, /FORMULA, NOT A FIGURE — do not blank it/);
  assert.ok(!text.includes('"tax.wato.amount": {'), 'a formula leaf was given a compiled, blankable code row');

  // Cross-check with the general extractor: formulas must never appear as a code-row key.
  const missingCodeRowKeys = codeRowKeysInSection(text, MISSING_MARKER, '\0');
  assert.ok(!missingCodeRowKeys.includes('tax.wato.amount'));
});

// ---------------------------------------------------------------------------------------------
// Property 9 — error paths fail with a useful message, never a crash.
// ---------------------------------------------------------------------------------------------
test('missing --fy is refused with a usage message', () => {
  const result = run([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--fy is required/);
  assert.match(result.stderr, /usage: npm run update-assumptions/);
  assert.ok(!existsSync(REFRESH_DIR), 'a failed run left staged output behind');
});

test('bare --fy with no value is refused with the same usage message', () => {
  const result = run(['--fy']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--fy is required/);
});

test('a malformed --fy (missing the second year) is refused, naming the bad value', () => {
  const result = run(['--fy', '2027']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--fy must be a financial year like 2027-28, not 2027/);
});

test('an unknown flag is refused by name', () => {
  const result = run(['--bogus']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown argument --bogus/);
});

test('a year with no stamped leaves at all is refused, and lists the years that ARE stamped', () => {
  const result = run(['--fy', '2030-31']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no assumption leaf is stamped FY2030-31/);
  assert.match(result.stderr, /Stamped years in this build:/);
  assert.ok(!existsSync(REFRESH_DIR));
});

test('a year that has never existed in the register is refused the same way — the script refreshes an EXISTING year only', () => {
  const result = run(['--fy', '1999-00']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no assumption leaf is stamped FY1999-00/);
});

// ---------------------------------------------------------------------------------------------
// Property 10 — a refusal reaches the terminal as its message and NOTHING else.
// ---------------------------------------------------------------------------------------------
// This is the one property the six tests above cannot carry: they pin the message TEXT, and a
// stack trace above the message leaves every one of them green. The script is run once a year by
// a human at a shell, where the sentence is the product; Node's default presentation for an
// uncaught throw puts `RangeError: …` and a wall of `at …` frames around it. The mutation this
// test exists to fail under is deleting the top-level `try { await main(); } catch` in
// scripts/update-assumptions.mjs — nothing else in the suite notices that.
test('a refusal prints its message alone — no error-class prefix, no stack frames', () => {
  const result = run(['--fy', '2027']);
  assert.notEqual(result.status, 0, 'a malformed --fy must still exit non-zero');
  assert.match(result.stderr, /--fy must be a financial year like 2027-28, not 2027/);

  assert.ok(
    !/^\s*at /m.test(result.stderr),
    `stderr carried a stack frame:\n${result.stderr}`,
  );
  assert.ok(
    !/\b(?:Range|Type|Reference|Syntax)?Error:/.test(result.stderr),
    `stderr carried an error-class prefix:\n${result.stderr}`,
  );
  assert.ok(
    !result.stderr.includes('update-assumptions.mjs:'),
    `stderr named a source position, which only a stack trace does:\n${result.stderr}`,
  );

  // Vacuity guard: the assertions above would all pass on empty stderr.
  assert.ok(result.stderr.trim().length > 0, 'stderr was empty — the assertions above were vacuous');
});
