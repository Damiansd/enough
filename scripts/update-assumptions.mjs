// P2-10 — the annual assumption refresh. `npm run update-assumptions -- --fy YYYY-YY`.
//
// Promoted from an ergonomic nicety to load-bearing work by RULINGS.md R12: that ruling supplied
// the FY2027-28 bracket table by carrying the 30%, 37% and 45% rates forward as `unverified`, and
// leant on THIS script as the mechanism that replaces them. Until it existed, "I refresh the
// assumptions annually" was a promise with no mechanism.
//
// **P2-10b, 2026-09-17, changed what this script is for without lightening it.** Those three rates
// are sourced now — Income Tax Rates Act 1986 Sch 7 Pt I cl 1(b) states them, and its third table
// is headed *"for the 2027-28 year of income or a later year of income"*, so `taxYear` answers for
// EVERY year of a forty-eight year walk from that one sentence. Nothing in register §2.1 is
// carried forward any more, and a run naming FY2027-28 now stages **zero** rotted rows. What that
// buys in accuracy it costs in blast radius: one unread amendment silently rewrites forty-eight
// years of projection rather than two. The rot this script stages today is §2.7's ten Medicare
// low-income thresholds, which are lifted retrospectively in the following Budget and are the one
// genuinely unknowable set in the tax domain.
//
// What it does NOT do, deliberately:
//
//   * no network fetch — zero runtime dependencies is a hard rule, and P2-10b's sourcing gate says
//     a human sources and cites every figure in a reviewed commit. The script removes the typing,
//     not the sourcing
//   * no edit to anything under `src/` — see the staging note below
//   * no wiring into `ASSUMPTIONS` (P2-10b). A run must leave the build green and the forecaster
//     computing exactly the numbers it computed before
//
// WHY IT LIVES HERE AND NOT IN `src/`: `tsconfig.json` has `"include": ["src"]`, so anything under
// `src/` is compiled into the browser bundle, and `test/import-graph.test.mjs` asserts every
// `src/**/*.ts` sits in one of four layers and forbids bare specifiers in `core/` and `data/` — a
// `node:fs` importer under `src/` fails that test outright. `server/*.mjs` is the precedent for
// file-touching Node code outside tsc's reach; this follows it, including `config.mjs`'s
// repo-root-from-`import.meta.url` idiom and `index.mjs`'s atomic tmp-then-rename write.
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The staging root. OUTSIDE `src/`, so tsc never compiles it; imported by nothing, so no run can
// perturb the build; gitignored, so a run leaves `git status` clean. The artefact is scaffolding
// for a human edit, not project state.
const STAGING = join(REPO, 'refresh');

// Parsed by hand: an argv parser would be a second dependency, and there is exactly one.
const parseArgs = (argv) => {
  let fy;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fy') {
      fy = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--fy=')) {
      fy = arg.slice('--fy='.length);
    } else {
      throw new RangeError(`unknown argument ${arg} — usage: npm run update-assumptions -- --fy YYYY-YY`);
    }
  }
  if (fy === undefined) throw new RangeError('--fy is required — usage: npm run update-assumptions -- --fy YYYY-YY');
  if (!/^\d{4}-\d{2}$/.test(fy)) throw new RangeError(`--fy must be a financial year like 2027-28, not ${fy}`);
  return fy;
};

/** FY2027-28 → FY2026-27. The year a not-yet-legislated figure is carried FROM. */
const previousFy = (fy) => {
  const start = Number(fy.slice(0, 4)) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

// Everything from here down runs inside `main`, so that a refusal reaches the terminal as its
// message and nothing else. This is a tool a human runs once a year from a shell: a stack trace
// above the sentence that matters buries the product. The thrown types and their text are
// unchanged — only the presentation is.
const main = async () => {
  const fy = parseArgs(process.argv.slice(2));
  const prior = previousFy(fy);

  // The walk reads the COMPILED assumptions, so it sees exactly the tree the forecaster sees — no
  // second parser, no regex over `.ts` sources that could disagree with the build. `npm run
  // update-assumptions` compiles first; running this file directly against a stale or absent dist/
  // would silently refresh yesterday's tree, so say so rather than crashing on a module resolution.
  let assumptionAt;
  let assumptionKeys;
  try {
    ({ assumptionAt, assumptionKeys } = await import(new URL('../dist/data/assumptions/index.js', import.meta.url)));
  } catch (cause) {
    throw new Error('dist/ is missing — run `npm run build` first, or use `npm run update-assumptions`, which does', {
      cause,
    });
  }

  const keys = assumptionKeys();
  const present = new Set(keys);

  // Ruling: `--fy` names a year that ALREADY EXISTS. The script refreshes a year the build holds; it
  // is not a scaffolder for a year nobody has ever stamped. Refusing by name here is cheaper than
  // emitting a plausible-looking empty artefact for a typo'd year.
  if (!keys.some((key) => assumptionAt(key).fy === fy)) {
    throw new RangeError(
      `no assumption leaf is stamped FY${fy}, so there is nothing to refresh. ` +
        `Stamped years in this build: ${[...new Set(keys.map((key) => assumptionAt(key).fy).filter(Boolean))].sort().join(', ')}`,
    );
  }

  // A leaf is refreshable when it is fy-stamped and not a `constant`. `constant` leaves are §7's
  // structural figures — one value for every year of the Planning Horizon — and the type system
  // already half-enforces the distinction (only `Constant` permits `everyYear`). Effective-date
  // leaves are out of scope: see the report at the foot of this file.
  const refreshable = (record) => record.kind !== 'constant' && record.fy !== undefined;

  // Two ways a figure rots, and the walk is LEAF-LEVEL because fy-keying is not uniform: only
  // `tax.ts` has a `Record<FinancialYear, TaxYear>` map to clone; `super.ts` and `agePension.ts`
  // scatter individual `fy:` stamps inside domain-shaped objects with no sibling year.
  const rotted = []; // stamped FY<target> but unsourced or already a fallback
  const missing = []; // no FY<target> figure exists at all; the build is running on an older year
  const legislated = []; // stamped FY<target>, sourced, genuinely this year's figure — LEFT ALONE

  for (const key of keys) {
    const record = assumptionAt(key);
    if (!refreshable(record)) continue;
    if (record.fy === fy) {
      if (record.confidence === 'unverified' || record.priorYearFallbackFor !== undefined) {
        rotted.push({ key, record, carriedFrom: prior });
      } else {
        legislated.push(key);
      }
      continue;
    }
    // The target-year counterpart of a leaf: the same key with the year segment swapped where the
    // key carries one (`tax.years.2026-27.medicareLevyRate`), otherwise the leaf itself — it is the
    // only slot that concept has, and it is stamped for a year that is not the target.
    const counterpart = key.includes(record.fy) ? key.split(record.fy).join(fy) : key;
    if (counterpart !== key && present.has(counterpart)) continue;
    missing.push({ key, counterpart, record, carriedFrom: record.fy });
  }

  const domainOf = (key) => key.slice(0, key.indexOf('.'));

  /** A formula is a mechanism, not a figure — register §4.7 stores the machinery precisely so it does
   * not rot annually. Blanking one would destroy the derivation; what needs re-checking is its
   * published fixture, so these are listed for review rather than emptied. */
  const isFormula = (record) => typeof record.value === 'function';

  const show = (value) => (typeof value === 'function' ? '[formula]' : JSON.stringify(value));

  const DIRECTION_STUB =
    'DIRECTION OF ERROR — REQUIRED BEFORE THIS RECORD SHIPS, and `confidence` does not carry it: ' +
    'state in this note which way the error runs if the FY' +
    prior +
    ' figure is carried into FY' +
    fy +
    ' — does it over-state or under-state the household? A carried-forward figure is only safe ' +
    'while it cannot flatter the household (register §2.1, RULINGS.md R9/R12).';

  const rowFor = ({ key, counterpart, record, carriedFrom }) => {
    const lines = [];
    lines.push(`  // ${counterpart ?? key}`);
    if (counterpart !== undefined && counterpart !== key) lines.push(`  //   no FY${fy} figure exists; the build is using ${key}`);
    // The label matters: a rotted leaf's value is ALREADY stamped FY<target> (carried forward under
    // R12 and displayed today), while a missing leaf's value belongs to the year it is stamped for.
    // Calling both "the FY<prior> value" would misdescribe the first — the FY2027-28 bracket table
    // is not the FY2026-27 one, it holds the legislated 14%.
    lines.push(
      record.fy === fy
        ? `  //   value in the build TODAY, stamped FY${fy}: ${show(record.value)}  (confidence ${record.confidence})`
        : `  //   FY${carriedFrom} value: ${show(record.value)}  (confidence ${record.confidence})`,
    );
    if (isFormula(record)) {
      lines.push('  //   FORMULA, NOT A FIGURE — do not blank it. Re-check the published fixture behind it and');
      lines.push('  //   re-stamp `retrieved`; the derivation carries forward unchanged unless the mechanism changed.');
      lines.push(`  //   derivation: ${record.derivation ?? '(none recorded)'}`);
      return lines.join('\n');
    }
    lines.push('  //   If FY' + fy + ' IS legislated: fill `value`, set `fy` to ' + JSON.stringify(fy) + ', DELETE');
    lines.push('  //   `priorYearFallbackFor`, and cite the source. If it is NOT: put the FY' + carriedFrom);
    lines.push('  //   value above into `value` and leave the fallback stamp exactly as written.');
    lines.push(`  ${JSON.stringify(counterpart ?? key)}: {`);
    lines.push(`    kind: ${JSON.stringify(record.kind)},`);
    lines.push(`    fy: ${JSON.stringify(carriedFrom)},`);
    lines.push(`    priorYearFallbackFor: ${JSON.stringify(fy)},`);
    lines.push('    value: null, // BLANK BY DESIGN — nothing lands here without a figure and a source');
    lines.push('    source: "", // TODO — the published page or instrument, not a summary of one');
    lines.push('    retrieved: "", // TODO — YYYY-MM-DD. Deliberately unparseable as an `IsoDate`: this');
    lines.push('    //             record cannot compile, and so cannot ship, until it is sourced');
    lines.push('    confidence: "unverified", // TODO — raise it only as far as the source you actually read');
    lines.push(`    registerSection: ${JSON.stringify(record.registerSection)},`);
    lines.push(`    note: ${JSON.stringify(DIRECTION_STUB)},`);
    if (record.note !== undefined) lines.push(`    // Prior note, carried for context: ${JSON.stringify(record.note)}`);
    if (record.derivation !== undefined) lines.push(`    derivation: ${JSON.stringify(record.derivation)},`);
    lines.push('  },');
    return lines.join('\n');
  };

  const HEADER = (domain, rottedRows, missingRows) =>
    [
      `// FY${fy} assumption refresh — GENERATED by scripts/update-assumptions.mjs (TODO P2-10).`,
      '//',
      '// NOT COMPILED (outside tsconfig\'s `include`), NOT IMPORTED BY ANYTHING, and gitignored.',
      '// This is a staging artefact: a worksheet for the human who does the sourcing. Wiring any of',
      '// it into `ASSUMPTIONS` is P2-10b\'s reviewed commit, by hand, with citations — NOT this file',
      '// being imported. Deleting it loses nothing; re-run the script to get it back.',
      '//',
      '// Every row below is blanked on purpose and stamped `priorYearFallbackFor: ' + JSON.stringify(fy) + '`,',
      `// because the script does no network fetch and therefore knows NOTHING about what FY${fy} has`,
      '// legislated. A blank that refuses to compile is safe; a figure silently carried forward is not.',
      '//',
      '// No generation timestamp is recorded here, by design: it would make two runs differ byte-for-byte',
      '// on different days, and re-running this must be a no-op.',
      '',
      `export const ${domain.toUpperCase()}_REFRESH_${fy.replace('-', '_')} = {`,
      rottedRows.length === 0
        ? null
        : [
            `  // ── ROTTED: stamped FY${fy}, but unsourced or already a prior-year fallback ──`,
            `  // These are the figures R12's refresh path exists for. The build DISPLAYS them today.`,
            '',
            rottedRows.map(rowFor).join('\n\n'),
          ].join('\n'),
      missingRows.length === 0
        ? null
        : [
            `  // ── MISSING: no FY${fy} figure exists; the build is still running on an earlier year ──`,
            '',
            missingRows.map(rowFor).join('\n\n'),
          ].join('\n'),
      '};',
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');

  const domains = [...new Set([...rotted, ...missing].map(({ key }) => domainOf(key)))].sort();

  await mkdir(join(STAGING, `FY${fy}`), { recursive: true });

  for (const domain of domains) {
    const target = join(STAGING, `FY${fy}`, `${domain}.refresh.ts`);
    const body = HEADER(
      domain,
      rotted.filter(({ key }) => domainOf(key) === domain),
      missing.filter(({ key }) => domainOf(key) === domain),
    );
    await writeFile(`${target}.tmp`, body);
    await rename(`${target}.tmp`, target); // atomic, as in server/index.mjs: a half-written worksheet is worse than none
  }

  const report = [
    `FY${fy} refresh — staged in refresh/FY${fy}/, carrying from FY${prior} where a figure is missing.`,
    `  ${rotted.length} rotted (stamped FY${fy}, unsourced or already a fallback)`,
    `  ${missing.length} missing (no FY${fy} figure at all)`,
    `  ${legislated.length} left alone — sourced and genuinely stamped FY${fy}:`,
    ...legislated.map((key) => `      ${key}`),
    '',
    'Nothing under src/ was touched. The artefact is not wired into ASSUMPTIONS and must not be:',
    'a human fills the values, cites them, and does the wiring in a reviewed commit (P2-10b).',
    '',
    'OUT OF SCOPE of an --fy walk, and not a silent omission:',
    '  * `constant` leaves (register §7) — one value for every year of the Planning Horizon.',
    '  * effective-date leaves — Age Pension payment rates reindex on 20 Mar / 20 Sep and deeming on',
    '    1 Jul (§4.1, §4.7), and heas.ts carries NO `fy:` stamp at all. They do not rot by financial',
    '    year and an --fy refresh cannot see them; their cadence is §4.10 and is separate work.',
    '  * the bracket dollar bounds ($45,000 / $135,000 / $190,000) are literals inside `bracketTable()`,',
    '    not leaves — §2.1\'s never-indexed constant, enacted by there being only one table.',
  ].join('\n');

  console.log(report);
};

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
