// Drift control (P3-9, ruling R8). This file asserts nothing about any particular refusal — it
// asserts that the register and the code agree about which refusals exist.
//
// R8's ground is that three independent research passes minted three spellings for the same two
// refusals, so the refusal names need "one home". §3.10.8 of the register is already that home:
// it is the single authoritative list. What was missing is that **nothing read it**, and a rule
// consumed by nothing is the failure this project keeps repeating. So this file reads it, in both
// directions:
//
//   1. every `export class … extends RangeError` under `src/` is named somewhere in the register —
//      the direction that stops a fourth spelling being minted in code;
//   2. every refusal named in §3.10.8's table, and in §3.11.9's, carries the status the code
//      actually supports —
//      `BUILT` means it is in `src/`, anything else means it is not.
//
// On the status vocabulary: `RULED (Rn)` settles a **name**, not a shipping date. Both ruled names
// are settled and unbuilt, so `RULED` is read here as "not built" and the row must flip to `BUILT`
// on the day someone registers the class. That flip is the drift signal; a status nobody has to
// change is a status nobody will change.
//
// No parser and no dependency: the sources are read as text, like `import-graph.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const REGISTER = join(ROOT, 'docs', 'assumptions-register.md');

const register = readFileSync(REGISTER, 'utf8');

const sources = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (entry.name.endsWith('.ts')) yield path;
  }
};

/** Every refusal in the code, name → the file it lives in. A refusal is a `RangeError` (ADR-0004). */
const built = new Map();
for (const file of sources(SRC)) {
  const declarations = readFileSync(file, 'utf8').matchAll(/^export class ([A-Za-z0-9_$]+) extends RangeError\b/gm);
  for (const [, name] of declarations) built.set(name, relative(ROOT, file));
}

// Whole identifiers only, never substrings. The register deliberately records the **losing** names
// from rulings — `ReversionaryPensionNotModelled` in §3.10.8 and R8 — and a substring match would
// read `ReversionaryStreamNotModelledError` as covering a name that must stay dead.
const namedInRegister = new Set([...register.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(([token]) => token));

/** The lines of a `####` subsection, up to the next heading of any level. */
const subsection = (heading) => {
  const lines = register.split('\n');
  const start = lines.findIndex((line) => line.startsWith(heading));
  assert.ok(start >= 0, `${heading} has gone from the register — this test has nothing to read`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line));
  return end === -1 ? rest : rest.slice(0, end);
};

/**
 * EVERY refusal-status table in the register, DISCOVERED not listed — one entry per refusal named
 * in the Refusal column.
 *
 * **§3.11.9 was added to this list on 2026-09-10 (R11), and its absence was a finding.** §3.11.9
 * opens by saying "§3.10.8 is the register's one home for refusal names (R8), and
 * `test/refusal-names.test.mjs` reads it. The rows below are §3.11's additions to that inventory" —
 * but this file read only §3.10.8, so §3.11.9's Status column was a rule consumed by nothing, which
 * is this project's recurring bug signature.
 *
 * **It then happened a THIRD time, on 2026-09-10.** §3.7.1 was added with five rows marked `BUILT`
 * and the list still named two sections, so marking a built refusal `proposed` there failed ZERO
 * tests. A hand-maintained list of where-to-look drifts exactly as a hand-maintained list of names
 * would — the defect this file warns about in its own header, committed by this file.
 *
 * **So the sections are now DISCOVERED, not listed.** Any table anywhere in the register whose
 * header row is `| Refusal | … | Status |` is read. Adding a fourth refusal table requires no edit
 * here and cannot be forgotten.
 */
const refusalTableLines = () => {
  const lines = register.split('\n');
  const out = [];
  let inTable = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^\|\s*Refusal\s*\|/.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    // **A blank line inside a table does not end it, and that rule was earned.** §3.1.1's table
    // carried a stray blank line between its two rows, so the walker stopped at it and the second
    // row — `NoticeOfIntentError`, marked BUILT — was read by nothing: its status was unchecked,
    // its name uncounted, and a Markdown renderer drew it as a headerless table of one. Exactly the
    // failure this file's header warns about, produced by one keystroke in the document rather than
    // by a hand-maintained list. The blank line is gone from the register; this makes the next one
    // harmless. A blank line still ends the table when what follows is a NEW table — a header row
    // and its `|---|` separator — because those rows belong to that table and not to this one.
    if (line.trim() === '') {
      const next = lines[index + 1] ?? '';
      const after = lines[index + 2] ?? '';
      if (next.startsWith('|') && !/^\|[\s\-:|]+\|$/.test(after)) continue;
      inTable = false;
      continue;
    }
    if (!line.startsWith('|')) { inTable = false; continue; }
    out.push(line);
  }
  assert.ok(out.length > 0, 'no | Refusal | … | Status | table found in the register');
  return out;
};

const statuses = refusalTableLines()
  .filter((line) => line.startsWith('|') && !/^\|[\s\-:|]+\|$/.test(line) && !/^\|\s*Refusal\s*\|/.test(line))
  .flatMap((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const [refusal, , status] = cells;
    // Only the Refusal column is read for names. The Status column carries the losing names of
    // R2 and R8, which are not refusals and must not be treated as rows.
    return [...refusal.matchAll(/`([A-Za-z0-9_$]+)`/g)].map(([, name]) => ({ name, status, refusal }));
  });

// The refusals that were already in `src/` with no mention anywhere in the register on 2026-09-10,
// when this test was written. They are a **finding, not an exemption**: each is a refusal a reader
// of the register cannot discover, and the register is what the project is checked against.
// The list may only shrink. The hygiene test below fails if a name here becomes registered, stops
// existing, or is renamed — so it cannot quietly become a second, competing list of refusal names.
const UNREGISTERED_ON_ARRIVAL = new Set([
]);

/** Every refusal that occupies a Refusal-column cell somewhere in the register — one row, one name. */
const namedInARefusalCell = new Set(statuses.map(({ name }) => name));

// **P3-32, closed 2026-09-28: Direction 1 demands a Refusal-column cell, not a mention.** Misspelling
// a name in a Refusal cell used to fail two tests and had fallen to one: Direction 1 kept passing,
// because a row's prose names the class the row is about, so the correct spelling was still
// somewhere in the document. The tightening was deferred while refusals existed that the register
// named in prose only (nine on 2026-09-10, held in a second ratchet list); that list reached zero on
// 2026-09-11, so the deferral's reason is gone and the list is deleted with this change. A refusal
// the register merely discusses is now unregistered: nothing would assert it is built or say where
// it lives.

test('there are refusals to check, and §3.10.8 and §3.11.9 are still tables of them', () => {
  assert.ok(built.size > 30, `expected the codebase's refusals, found ${built.size}`);
  assert.ok(statuses.length > 8, `§3.10.8 and §3.11.9 parsed to ${statuses.length} named refusals — a table shape has changed`);
});

// --- Direction 1: nothing refuses in code that the register has never heard of ---------------------

test('every refusal in src/ has a row in a register refusal table (P3-32)', () => {
  const unnamed = [...built]
    .filter(([name]) => !namedInARefusalCell.has(name) && !UNREGISTERED_ON_ARRIVAL.has(name))
    .map(([name, file]) => `${name} (${file})`);

  assert.deepEqual(
    unnamed,
    [],
    'these refusals exist in src/ and have no Refusal-column cell in any | Refusal | … | Status | table ' +
      'of docs/assumptions-register.md (a mention in prose does not count, P3-32). ' +
      'A refusal the register does not name is a refusal the user cannot look up, and the second ' +
      'spelling of an existing one is indistinguishable from a new refusal. Fix: add a row naming ' +
      'it (§3.10.8 for the transfer-balance cluster, the owning section otherwise) — or, if it is ' +
      'a respelling of a refusal already in the register, use the registered name.',
  );
});

test('the unregistered-on-arrival list only shrinks', () => {
  const stale = [...UNREGISTERED_ON_ARRIVAL].map((name) => {
    if (!built.has(name)) return `${name}: no longer a refusal in src/ — delete this line`;
    if (namedInARefusalCell.has(name)) return `${name}: now has a row in the register — delete this line`;
    return null;
  }).filter((entry) => entry !== null);

  assert.deepEqual(stale, [], 'UNREGISTERED_ON_ARRIVAL in this file is out of date');
});

// --- Direction 2: §3.10.8's statuses are true ------------------------------------------------------

test('every refusal named in the register\'s refusal tables carries the Error suffix (R8)', () => {
  const malformed = statuses.filter(({ name }) => !/^[A-Z][A-Za-z0-9]*Error$/.test(name)).map(({ name }) => name);
  assert.deepEqual(
    malformed,
    [],
    'a refusal named in §3.10.8 or §3.11.9 must be spelled as it would be declared in code — R8 settles the ' +
      '`Error` suffix, and a row spelled without it cannot be matched against src/ at all, so the ' +
      'row silently stops being checked. Fix: restore the suffix in the register.',
  );
});

test('a registered refusal marked BUILT exists in src/, and one that is not does not', () => {
  const wrong = statuses.flatMap(({ name, status }) => {
    const claimsBuilt = /\bBUILT\b/.test(status);
    if (claimsBuilt && !built.has(name)) {
      return `${name}: the register says BUILT, but no "export class ${name} extends RangeError" exists under src/. ` +
        'Fix: restore the class name (a refusal is renamed only through the register), or, if it was ' +
        'deliberately removed, say so in the status.';
    }
    if (!claimsBuilt && built.has(name)) {
      return `${name}: the register says "${status}", but it is built at ${built.get(name)}. ` +
        'Fix: update the §3.10.8 or §3.11.9 status to BUILT and name the file. A status that lags the code is ' +
        'how a refusal gets registered twice.';
    }
    return [];
  });

  assert.deepEqual(wrong, [], '§3.10.8 / §3.11.9 statuses disagree with src/');
});

test('the check would notice a fourth spelling', () => {
  // The three guards that do the work, exercised against names rather than against the tree.
  assert.ok(!namedInRegister.has('ReversionaryStreamNotModelled')); // whole identifiers, not substrings
  assert.ok(namedInRegister.has('ReversionaryStreamNotModelledError'));
  assert.ok(namedInRegister.has('ReversionaryPensionNotModelled')); // the losing name, recorded and not built
  assert.ok(!built.has('ReversionaryPensionNotModelled'));
});
