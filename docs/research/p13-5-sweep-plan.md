# P13-5 / P13-5a mutation sweep — plan

Planning only. No mutation in this document has been applied to `src/`. Produced against
`79ee1b1`.

## 0. Scope correction on "~70"

TODO.md's P13-5a line says "the ~70 mutations already written up in register §9." Counting
`| ... |` data rows in §9 today gives **217**, not 70:

| Subsection | Rows | Already measured & recorded? |
|---|---:|---|
| Income tax and offsets (T1–T10, Medicare/SAPTO family block) | 30 | no |
| WATO / s 25-130 (P3-38) | 10 | **yes** — applied at `658bf0e`, all now fail (`fb0e2b8`) |
| Superannuation (main table: T11–T21, T54, T56, T57, ECPI T126–T133, P13-5 cap/COR/TTR rows) | 48 | no |
| Transfer balance cap — P3-9 chunk 6 / Battery E | 9 | **yes** — 2 are DECLARED SURVIVORS (real, left-open gaps) |
| Transfer balance cap — O66 batch 1 (T59–T72) | 16 | **yes** |
| Transfer balance cap — O66 batch 2 (T74–T86) | 21 | **yes** |
| Transfer balance cap — O66 batch 3 (T114, T117–T125) | 17 | **yes** |
| Age Pension | 28 | no |
| HEAS | 19 | no |
| Franking | 17 | 10 have **no code path to run against** (P3-22 doesn't exist); ~6 already BUILT/measured |
| Register hygiene | 2–3 | **yes** (structural, in `assumptions-register.test.mjs`) |

**63 rows are already applied-and-recorded** (both transfer-balance-cap blocks plus WATO), each
with a measured failing-test count written directly into the register prose. Re-running them adds
nothing; P13-5a's job is over 27 traps (T87–T113) that are **out of scope by ruling R1** — "do not
schedule tests for them; do not remove them" — so they contribute 0 rows to any chunk.

That leaves **~137 rows** (income tax 30 + super 48 + Age Pension 28 + HEAS 19 + franking's ~11
live-or-uncertain rows + hygiene 2) as P13-5a's real remaining scope. The "~70" figure predates
2026-09-16 (O66 batches 1–3, +54 rows) and 2026-09-24 (T135, +2 rows); it was never updated after
either.

## 1. Inventory

Grep evidence below is by trap ID or by a fixture literal named in the row's "must fail against"
column (e.g. exact dollar figures), run against `test/*.mjs`. **FIXTURE-EXISTS is not the same as
CONFIRMED** — no mutation was applied to check the fixture actually fails; that is exactly what
the run design in §3 is for.

### Already done — no P13-5a action
- **Transfer balance cap, all 63 rows** (T58–T125 except the R1-excluded T87–T113): applied,
  built, counted with `grep -c '^not ok '`, reverted, counts recorded in register prose. Two rows
  are **DECLARED SURVIVORS** (open findings, not gaps to close): the ledger-witness row (one
  `test()` call defends 4 mutations) and the `Exclude<>` hand-spelled-union row (structural, no
  behavioural test).
- **WATO / s 25-130, all 10 rows**: applied at `658bf0e`, reverted at `fb0e2b8`, all now caught.
- **Register hygiene, 2–3 rows**: `test/assumptions-register.test.mjs:35,50,110` — stamp/config,
  confidence-laundering structural tests. AUTOMATED.
- **T87–T113 (27 traps)**: RECORDED-NOT-LIVE under ruling R1. Not a §9 gap; do not write rows.

### Income tax and offsets (30 rows) — STATUS: mostly AUTOMATED, rest FIXTURE-EXISTS
Evidence: `test/assumptions-tax.test.mjs` (T1 incl. exemplar `'T1 exemplar — the transfer past 1
Jul 2027 fails if 0.15 is wired to the marginal rate'` at line 438; T4–T7, T10, ADR-0001),
`test/core-income-tax-mutations.test.mjs` (T2, T3, T8, T9 — 8 `tsc` compile-fail probes, T14),
`test/core-income-tax.test.mjs` (T5, T6, LITO clamp, T52/T53 fixtures), and
`test/core-medicare-family-shade-in.test.mjs`, which is the strongest single file: its Ashton test
sweeps `for (const wrong of [229.76, 543.7, 543.2, 680.56, 0, 141.79, 288.44])` — six of §9's
Medicare mutation rows asserted wrong **in one loop** — plus dedicated tests for the s 8(3) gate,
s 8(4) mutuality, the band-boundary (`raw > 0` vs `<= familyUpper`), `FamilySpouseNotSuppliedError`,
and O30's per-taxpayer mixed-SAPTO couple. No row in this section came back with zero evidence.

### Superannuation, main table (48 rows) — STATUS: FIXTURE-EXISTS for the great majority
- T11–T21: `test/assumptions-super.test.mjs`, `test/core-div296.test.mjs`,
  `test/core-super-caps.test.mjs`, `test/core-super-carry-forward.test.mjs`,
  `test/core-super-concessional.test.mjs`.
- T54 (Div 293 cliff/taper): `test/core-div293.test.mjs` — `'P3-5 — ... never the $2,250 a cliff
  would charge'`, `'"exceeds" is strict: $250,000 exactly is nil and $250,001 is fifteen cents'`.
- `metNilCashingCOR` (P13-5): `test/core-condition-of-release.test.mjs`.
- T56 (Sch 7 minimum: rounding, pro-rating, day-count, commencement balance, stand-in balance,
  `PensionMinimumBasisNote`): **not tagged `T56` anywhere**, but every named fixture value is
  present — `$49,380`/`36,940`/`14,960`/`$987,654`/`$1,009,078` in
  `test/core-minimum-drawdown.test.mjs`; `PensionBalanceDateError` and `PensionBalanceProxyError`
  in `test/core-minimum-drawdown.test.mjs`, `test/core-projection-pension-drawdown.test.mjs`,
  `test/core-ttr-range.test.mjs`. The note itself is asserted by shape, not by class name —
  `n.subject === 'pension minimum basis'` — with a byte-identical control at
  `core-projection-pension-drawdown.test.mjs:1127`.
- T57 (TTR maximum: pro-rate, round, age-65/1-June edges): `test/core-ttr-range.test.mjs`,
  `test/core-projection-ttr-payment.test.mjs`.
- ECPI cluster (M-P3-25-1, T130, T126, T129, T133, T132): `test/assumptions-register-o66.test.mjs`,
  `test/core-super-phase.test.mjs`.
- **NOT independently re-confirmed**: "net the two net-investment-loss silos", "wire 15%
  contributions tax to marginal rate", "change the concessional/NCC/TBC cap by one step" (P13-5,
  generic — likely covered incidentally by `core-super-caps.test.mjs` and
  `core-super-carry-forward.test.mjs` but not verified against this exact row's wording). Flag
  these three for first-chunk priority.

### Age Pension (28 rows) — STATUS: AUTOMATED for most
`test/core-age-pension-mutations.test.mjs` (T25, T26, T27, T28, T29, T31, T32, T38, T42, P3-36) is
a dedicated mutation file. `test/assumptions-age-pension.test.mjs` covers T22–T30 including the
standing-table §4.7.0 boundary rows. `test/age-pension-forward-indexation.test.mjs` covers the
20-year-projection ("FY2026-27 blind") rows (T23/T24 wage-vs-CPI, Energy Supplement flat). The two
P13-5 taper rows ($2.50 assets / 40c income) are pinned exactly: `toCents(1_121_000)` cut-off in
`assumptions-age-pension.test.mjs:150` and `toCents(4_128)` in `core-age-pension.test.mjs:83`.
T135 (both floor rows: remove it, $250 floor, $1,000 floor) is directly covered by three tests in
`test/core-age-pension.test.mjs:96,109,124` plus a wide blast radius of "RE-PINNED 2026-09-24
(T135)" comments across ~15 other test files (evidence it already moved real numbers once).
ADR-0003 (no floor entitlement): `core-age-pension.test.mjs:281`.

### HEAS (19 rows) — STATUS: AUTOMATED
`test/assumptions-heas.test.mjs` names T32–T42 directly by trap ID in its own test titles and
covers every row in §9's HEAS table (advance caps, age-of-younger-partner, security rounding,
interest convention `r/26` not `r×14/365`, compounding past exit, the 90-day-exemption asymmetry,
PCC-follows-entitlement, NNEG voiding, the vacated-home cliff refusal).

### Franking (17 rows) — STATUS: mixed, matches register's own note exactly
10 rows have **no code path** (P3-22 individual franking doesn't exist) — the register says this
itself; not a gap, don't write test rows for them, don't delete them either (they document future
scope). The remaining ~7 (T44 gross-up, both T45 s 207-90/110, T49 super-half qualified-person,
T48 indexation, the portfolio-rate structural/source-canary pair) are AUTOMATED in
`test/assumptions-franking-mutations.test.mjs` and `test/core-super-franking.test.mjs`.

**No true duplicates found.** The register is careful to say "deliberately NOT claimed here"
wherever two traps could look like the same row (T80/T117, T79/T116, T67/T114). **No stale rows
found either** — every class/function/constant named in a §9 row still exists in `src/` at
`79ee1b1` (checked `PensionMinimumBasisNote`, `MixedSaptoFamilyThresholdError`'s reach,
`DEFAULT_WITHDRAWAL_CHARACTERISATION`, `S25130_MAXIMUM_DEDUCTION`). The one row that *names* a
deleted class (`MixedSaptoFamilyThresholdError`) does so deliberately — reinstating it anywhere in
its old reach is the mutation.

## 2. Special cases

- **SAPTO 0.15 exemplar (T1)**: already automated, and already past 1 Jul 2027 —
  `test/assumptions-tax.test.mjs:438`, `'T1 exemplar — the transfer past 1 Jul 2027 fails if 0.15
  is wired to the marginal rate'`. No action needed; P13-5a's SAPTO caveat is already satisfied.
- **T135 (added 2026-09-24, today)**: fully covered, both floor-value rows and the
  no-floor-at-all row, in `test/core-age-pension.test.mjs`. It is also the widest-blast-radius
  trap in the whole register today — ~15 other test files carry "RE-PINNED (T135)" comments,
  meaning it already moved real fixture numbers once and the suite caught every one.

## 3. Run design

**Never `git checkout` to revert a mutation.** Work in a scratch copy:
```
cp src/<file> /tmp-scratch/<file>.orig   # before editing
# ... edit src/<file> ...
diff /tmp-scratch/<file>.orig src/<file>   # CONFIRM the mutation actually landed before trusting any count
npm run build && node --test test/<scoped-file>.test.mjs
cp /tmp-scratch/<file>.orig src/<file>     # revert by copy-back, not git checkout
diff /tmp-scratch/<file>.orig src/<file>   # CONFIRM the revert is clean (empty diff) before moving on
```
`npm test` already runs `npm run build && node --test test/` (see `package.json`), so a scoped run
must call `node --test test/<file>.test.mjs` directly — `npm run build` first, always, since every
test imports from `dist/`, not `src/`. A stale `dist/` after a revert produces a false "still
fails" reading, which is the single most likely way this sweep lies to itself.

**Scope each run to the relevant test file(s)**, identified from §1's evidence column, not the
full ~20-minute suite. Most rows touch 1–3 files. A few (T9's income-basis rows, T121, T77) are
known wide-blast — those get a fuller but still targeted run (the files the register's own O66
batches named, e.g. "13 tests, across the ledger, the settings door...").

**Diff-before-belief discipline**: the O66 batches' own methodology (`grep -c '^not ok '` before
and after, from a copy taken before the edit) is the model to copy exactly — it is what caught
T118's `includes('102')` / `'102A'` false-positive bug in the original assertion.

**Chunking**: ~137 rows ÷ ~10/chunk ≈ **14 chunks**. Proposed split, each independently resumable:

| Chunk | Rows | Content |
|---|---|---|
| 1 | 10 | Income tax T1–T10 |
| 2 | 10 | Income tax Medicare/SAPTO block (T52/T53/§2.7/O30) |
| 3 | 10 | Superannuation T11–T21 |
| 4 | 10 | Superannuation T54, COR, TTR-10%/12%, "one step" cap rows, 15% contributions tax, net-silo row |
| 5 | 10 | Superannuation T56 (Sch 7 minimum) part 1 |
| 6 | 8 | Superannuation T56 part 2 + T57 |
| 7 | 6 | Superannuation ECPI cluster (M-P3-25-1, T126, T129, T130, T132, T133) |
| 8 | 10 | Age Pension T22–T30 |
| 9 | 10 | Age Pension T25/T26/T135/ADR-0003 taper+floor rows |
| 10 | 8 | Age Pension remainder |
| 11 | 10 | HEAS T32–T37 |
| 12 | 9 | HEAS T38–T42 |
| 13 | 7 | Franking live rows only (skip the 10 no-code-path rows) |
| 14 | 2–3 | Register hygiene (re-confirm only — already automated) |

**Checkpoint file**: `docs/research/p13-5-sweep-checkpoint.md` (or a scratchpad file if this stays
provisional), one line per row: `chunk | row id | mutation applied? | diff confirmed? | test run
(pass/fail) | reverted? | diff-clean confirmed?`. A chunk is resumable by reading the last
incomplete row and continuing — never by re-deriving status from memory.

## 4. Cost estimate

Per chunk of ~10 rows: mutate (1 Edit) + diff-confirm (1 Bash) + build (1 Bash, ~15–30s) +
scoped test run (1 Bash, ~5–20s per file, more for wide-blast rows) + revert (1 Bash) +
diff-confirm-revert (1 Bash) + checkpoint update (1 Edit) ≈ **7 tool calls/row**, ~70/chunk.
Wall-clock: builds and scoped runs are fast (seconds, not the 20-minute full suite), so a chunk is
**~15–25 minutes** including read/write overhead, call it **~20 minutes × 14 ≈ 4.5–5 hours** total
if all 137 rows are run. Superannuation chunks (4–7, touching `dist/core/*.ts` widely) run slower
per row than Age Pension/HEAS chunks (narrower blast radius, single-file domain tests).

**A finding = a mutation that does not turn any test red.** Given §1's evidence, expect the sweep
to close mostly clean — the real risk is not "no test exists" (evidence found for effectively
every row) but "the existing fixture doesn't actually exercise the mutated code path," which only
running the mutation, not reading the fixture, can catch (the register's own precedent: T118's
`includes('102')` substring bug, the two declared-survivor transfer-balance-cap rows, and the
Medicare-levy `min` mutation that was found unfalsifiable and correctly *not* written as a row).
