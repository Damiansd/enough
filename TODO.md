# TODO

Working task list for `enough`. Maintained throughout the build.

## Conventions

- `- [ ]` open · `- [x]` complete
- On completion, append `— ✅ YYYY-MM-DD` and a short comment: what was decided, what surprised
  us, or what it broke. **Comments are the point** — a ticked box with no note loses the reason.
- Task IDs (`P2-3`) are stable. Never renumber; add sub-items as `P2-3a`.
- If a task is dropped, mark `- [~]` with the date and why. Don't delete it.
- Anything that changes the design updates `concept.md` / an ADR *in the same commit* as the code.

---

## Phase 0 — Design

- [x] **P0-1** Write `concept.md` — form factor, domain model, AU rules, risks — ✅ 2026-09-03. Web app over spreadsheet; the journal requirement decided it.
- [x] **P0-2** Research AU rules: super, TTR, caps, Age Pension, tax — ✅ 2026-09-03. Age 60 ≠ access; couple pension is combined-then-halved.
- [x] **P0-3** Research couple-specific levers — ✅ 2026-09-03. Every threshold is individual; only lever is moving balance between people.
- [x] **P0-4** Research indexation bases — ✅ 2026-09-03. Five distinct bases. Killed the single-inflation-knob design → ADR-0001.
- [x] **P0-5** Design interview, round 1 — ✅ 2026-09-03. Couple · real · owner-occupied · horizon 100 · monthly · nominal.
- [x] **P0-6** Design interview, round 2 — ✅ 2026-09-03. Found 3 gaps in my own concept: fees, HEAS, downsizer-is-not-free.
- [x] **P0-7** Research home equity, downsizing, fees — ✅ 2026-09-03. HEAS available at $0 pension — the largest omitted lever.
- [x] **P0-8** Research aged care + test the sell-the-home assumption — ✅ 2026-09-03. Assumption wrong in the likely case; protected person exemption.
- [x] **P0-9** Write `CONTEXT.md` glossary — ✅ 2026-09-03.
- [x] **P0-10** Write ADRs 0001–0005 — ✅ 2026-09-03.
- [x] **P0-11** Write `README.md` and `.gitignore` — ✅ 2026-09-03. Gitignore before any real figures exist.

---

## Phase 1 — Close the open figures

*Gate: nothing gets hard-coded until its source is primary. See `concept.md` §6.*

- [x] **P1-1** Verify LITO parameters (amount, phase-out points) against ato.gov.au — ✅ 2026-09-03. LITO is a band step function on **taxable income**, not rebate income — the two offsets test on different bases.
- [x] **P1-2** Verify SAPTO — including couple thresholds and unused-offset transfer between spouses — ✅ 2026-09-03. The thresholds aren't numbers, they're **derived from the year's marginal rates**, so they moved on 1 Jul 2026 and move again on 1 Jul 2027. The couple gate uses half combined rebate income; the amount uses the Person's own. A transfer changes the amount but not the gate, and the transferee's shade-out must be re-derived on the augmented base.
- [x] **P1-3** Confirm FY2026-27 caps directly with the ATO ($32,500 / $130,000 / $2.1m) — currently secondary-sourced — ✅ 2026-09-03. All confirmed direct from the ATO — `curl` with a browser UA works where WebFetch 403s. Secondary sourcing retired.
- [x] **P1-4** Confirm Div 296 detail and indexation basis (CPI vs AWOTE) against the March 2026 Act — ✅ 2026-09-03. CPI as believed, but it **commenced 1 Apr 2026 and first applies to 2026-27** — store the application year — and it's 15% + 10% on the **same** earnings base, not marginal bands. The universal "30%/40%" framing is wrong above $10m.
- [x] **P1-5** Capture the **20 Sep 2026** Age Pension reindexation — rates, free areas, deeming — ✅ 2026-09-03. The **20 Sep 2026 rates were already published (20 Aug 2026)** — closed 17 days early. Surprise: the year holds **three** parameter sets, not two, because free areas and deeming thresholds index on 1 July.
- [ ] **P1-6** Confirm 2026-27 Medicare levy low-income thresholds when published
  - **Checked 2026-09-24: not published.** ATO QC27031/QC27032 were last updated 30 Jun 2026 and cover 2025-26 only. There is no bill.
    The 2025-26 figures stand, enacted by Act No. 58 of 2026. Re-check after the next Treasury Laws Amendment bill.
  - The FY2026-27 thresholds **are not legislated and do not exist** as at 2026-09-03. FY2025-26 figures are carried as a **labelled prior-year fallback**, stamped with the year they belong to so the mismatch is visible. These thresholds are legislated retrospectively in the following Budget, so this is expected to close late. Not blocking. Register §2.7, trap T10, open item O1.
- [x] **P1-7** Find the HEAS total-capacity formula (age-based, against security value) — ✅ 2026-09-03. Age component table recovered from the legislative instrument itself (F2019L00420 s 4(2), 36 rows, unchanged since 2019 and with no indexation mechanism); the **couple case is keyed to the younger member's age** at last birthday, recalculated annually on that birthday.
- [x] **P1-8** Confirm Work Bonus starting balance for new pensioners — ✅ 2026-09-03. $4,000 / $300 per fortnight / $11,800 bank maximum confirmed. Per Person and **never poolable** — the balance can't cover a partner's wages, and it reaches the Household only through the combined income test.
- [x] **P1-9** Confirm non-homeowner assets-test thresholds — ✅ 2026-09-03. $600,000 single / $766,000 couple. The differential is **$267,000**, not the ~$250k recorded — one indexed constant driving both, not two series.
- [x] **P1-10** Record every figure's source and retrieval date in the assumptions object — ✅ 2026-09-03. Landed as `docs/assumptions-register.md` rather than in code, since P2-5 doesn't exist yet. The Traps section and the P13-5 mutation list turned out to matter more than the figures.
- [x] **P1-11** Source **franking and dividend imputation** — ✅ 2026-09-04. Opened and closed the
  same day imputation entered scope (`concept.md` §5.14,
  [ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md)); run as three research
  chunks and consolidated into **register §5A**, traps **T43–T51**. Three findings changed the
  design. **There is no portfolio-level gross-up rate in law** — s 202-60(2) fixes the rate to the
  paying company, so the effective franking rate is a Setting and never an engine constant.
  **Refundability is equal on both sides**, so the whole franking advantage is the rate differential,
  and refunding on the super side while merely *offsetting* on the individual side manufactures a
  spurious advantage of up to the full franking rate. And the **$5,000 small shareholder exemption is
  a frozen constant that no mechanism can index** — a deliberate exception to this project's default
  that an AU tax figure is indexed config, written up as T48 *with its reason* so a future maintainer
  does not "fix" it by indexing it. The exemption is **individuals only**, with no super equivalent at
  any credit level (T49) — a direct input to P6-8.
  - **Progress 2026-09-04 — run in three chunks. All three landed, and the consolidation with them.**
    - [x] **P1-11a** Gross-up and corporate rate — ✅ 2026-09-04,
      `docs/research/p1-11-franking-grossup.md`. **Gross-up is an addition, not a rate**: assessable
      income includes the credit (s 207-20(1)); `credit = f × D × r/(1−r)`. Rates 25%/30%; base rate
      entity needs **both** limbs (passive income ≤80% *and* turnover < $50m, s 23AA), and the $50m
      is hard-coded, not indexed. **The finding that changes P3-22:** s 202-60(2) fixes the rate to
      *the paying company*, so a diversified ETF spans both rates and **no portfolio-level gross-up
      rate exists in law**. Take the credit as an input — an AMMA statement reports franked amount
      and credit separately, after which `grossed_up = franked + credit` needs no rate at all.
      Compute with `D × r/(1−r)` directly: the ATO's own examples round to 2.3333, which is 60c
      wrong per $100,000.
    - [x] **P1-11b** Refundability, both sides — ✅ 2026-09-04,
      `docs/research/p1-11-franking-refundability.md`. Refundable for an individual (s 67-25(1),
      s 63-10(1) item 40) and for a **complying** fund (s 960-115; (1A) denies only non-complying).
      **The ECPI trap, resolved:** s 207-90 would deny gross-up *and* offset on exempt income and
      has no super carve-out — the rescue is **Subdivision 207-E**, s 207-110, which names the ECPI
      provisions and disapplies it. **Reading Div 207 without reaching Subdiv 207-E gives exactly
      the wrong answer.** Credits are refunded in full, both segregated and proportionate.
      **P6-8 consequence:** refundability is *equal* on both sides, so the whole franking advantage
      is the rate differential (0%/15% vs MTR + Medicare). Flips to a dead heat — never to a
      non-super advantage — only below a ~15% effective rate after LITO/SAPTO. **Modelling trap:**
      refunding on the super side while only *offsetting* on the individual side manufactures a
      spurious advantage of up to the full franking rate.
    - [x] **P1-11c** 45-day holding rule and the small shareholder exemption — ✅ 2026-09-04,
      `docs/research/p1-11-franking-holding-rule.md`. Gates whether the credit is available at all,
      so it gates everything above. **The rules were never rewritten into ITAA 1997**: they are ITAA
      1936 **former Division 1A of Part IIIAA** applied *as in force 30 June 2002*, imported by the
      express words of s 207-145(1)(a) and construed that way by TD 2007/11 — **not** by the *Income
      Tax (Transitional Provisions) Act 1997*, which has no Division 207 at all. 45 continuous days
      at risk (90 for preference shares); acquisition day always excluded, disposal day only if
      disposed, so 45 countable days needs 46 calendar ones; "at risk" means **≥30% net delta**.
      **A related payment does not disqualify** — it switches the test to the secondary ±45/±90
      window, and that is the one thing here a plausible implementation gets backwards. The $5,000
      exemption is individuals only, all-or-nothing, applies to indirect distributions, and frozen.
      **Audited against the retrieved primary sources before consolidation and seven corrections
      applied in place**, the two load-bearing ones being that related-payments formula and the
      confidence label on "available to a complying super fund?" — verified statutory text carrying
      an **inferential** conclusion, because the ATO never states it in one sentence. That stays open
      as register **O27**
    - [x] **P1-11d** Consolidate all three into `docs/assumptions-register.md` — ✅ 2026-09-04.
      Landed as **§5A**, with traps **T43–T51**, twelve rows in §7, open items **O24–O29** and
      seventeen franking mutations in §9. Numbered **5A rather than 6** on purpose: `src/`, `TODO.md`
      and `concept.md` already cite register §5, §7, §8 and §9 by number, and renumbering the tail of
      the file to make room would break every one of those citations silently
    - Carried into the register rather than left here — **§8 items O24–O29**: the TAA 1953 Pt IIB
      refund machinery and **timing** (entitlement verified, payment mechanics not — matters for cash
      flow, and P3-22g depends on it) is **O28**; ss 295-400 and 207-158 and the Division 1A
      commencement dates are **O29**; the s 160APHR(1)(g) "excluded fund" question is **O24**, its
      post-2002 operability **O25**, and the Division 1A regulation hooks **O26**. On the authorised
      compilations: chunk 3 found the route — `api.prod.legislation.gov.au/v1/documents/find(...)`
      returns the real `.doc`, which is how repealed Division 1A was retrieved and MD5-compared across
      two compilations. Chunks 1 and 2 still rest on the ATO/CCH consolidation (register O6)
  - **Closed 2026-09-04.** The register now has **§5A**, and every figure below is primary-sourced
    with an FY stamp, a config-vs-constant kind and a confidence label. The Phase 1 gate is satisfied:
    these may be hard-coded when P2-5 reaches them. The shopping list this task opened with, kept as
    the record, each answered:
  - **The gross-up rate** — the corporate rate the paying company actually paid. It is not one
    rate for every company (full rate vs base rate entity), so what the model needs is the rule
    for choosing, not a number. → **register §5A.1–§5A.2**, and the sharper answer: there is no
    portfolio rate at all, so the model needs a Setting, not a rule for choosing (T43)
  - **Refundability of excess credits** — the provision that makes the offset refundable, for an
    **individual** and separately for a **complying superannuation fund**. This is the half of
    imputation a non-Australian mental model gets wrong, so cite it rather than assume it.
    → **register §5A.3** — s 67-25(1) with s 63-10(1) item 40 for both, and s 960-115 for why the
    corporate-tax-entity denials never reach a fund
  - **The 45-day holding rule** — the qualified-person requirement and the small-shareholder
    exemption threshold beneath which it does not apply (P3-22e treats it as an assumption, not
    machinery, and that treatment needs the threshold to be real before it is stated on screen).
    → **register §5A.4–§5A.6**. The threshold is real and now sourced — **$5,000, frozen** — but it
    is an **individual's** relief only, so P3-22e's on-screen wording had to change
  - **Franking inside super** — confirm that credits attached to a fund's Australian equity income
    are refundable against a 0% Retirement Phase earnings liability, not merely wasted (P3-7b).
    The whole both-sides requirement rests on this being true. → **register §5A.3, trap T45**.
    **True, but by a provision that is easy to miss**: s 207-90 would deny the credit outright on
    exempt income and has no super carve-out — s 207-110, one Subdivision later, is the rescue
  - **Not sourceable, and not the register's job:** the **1.0–1.5% a year** that carried the
    un-parking ruling is an order-of-magnitude estimate of the size of the bias, and the franking
    percentage of any actual ETF is a portfolio characteristic that varies year to year. Both are
    Settings or reasoning, never assumptions — do not go looking for a legislated figure

---

## Phase 2 — Foundations

- [x] **P2-1** `git init`; first commit; delete stray `.DS_Store` files — ✅ 2026-09-03. Two strays (root, `docs/`) removed before the first commit, so neither ever entered history.
- [x] **P2-2** Scaffold the app and confirm it **loads over `http://localhost`**. The old wording
  ("opens with no build step") was never achievable: from `file://` Chrome gives an opaque origin
  and refuses to load the ES modules this design has always specified. See ADR-0007
  — ✅ 2026-09-03. Confirmed by loading the served page in headless Chrome: the module graph
  resolves natively and a `core/` value renders.
  - [x] **P2-2a** ~40-line Node server — `node:http` + `node:fs`, **zero runtime dependencies**.
    Two jobs only: serve static files, and read/write `plan.json` and `ledger.json` on disk. No
    application logic in it, now or later; the browser is pure UI
    — ✅ 2026-09-03. 37 lines. The two disk paths are a fixed map in the server, never a path
    from the request, and only `dist/` is served — the repo root would have made `.git/`
    fetchable. Bound to `127.0.0.1`.
  - [x] **P2-2b** Launcher script — one command compiles, starts the server and opens the browser
    at the served URL. No port-pinning apparatus, no origin guard, no permission prompts
    — ✅ 2026-09-03. `npm start`. The port *is* pinned (4173, `server/config.mjs`), which the ADR
    said was unnecessary apparatus — but the alternative is the launcher telling the browser an
    address it has to discover first, which is more machinery, not less.
  - [x] **P2-2c** TypeScript compile step — `tsc` → native ES modules in `dist/`, served as-is.
    No bundler, no framework. **npm total: one dev dependency (`typescript`)**
    — ✅ 2026-09-03. `module: NodeNext` is what makes the browser-required `.js` extensions on
    `.ts` imports *enforced* rather than merely tolerated. Commented in `tsconfig.json`, because
    it reads as a mistake.
- [x] **P2-3** Vendor Chart.js locally — a committed file imported by relative path. Never
  CDN-fetched, and **not an npm runtime dependency** — ✅ 2026-09-18/19 (`b861a96`, `0f20e4d`).
  `chart.js@4.4.4`'s UMD build and its source map are committed at `public/vendor/`, downloaded
  independently from jsDelivr and unpkg and confirmed byte-identical before committing, with SHA-256
  hashes recorded in `public/vendor/PROVENANCE.md` for re-verification. `npm`'s devDependencies is
  still `{ "typescript": "^5.9.2" }` alone — Chart.js never became an npm dependency of any kind.
  **One deviation from the literal wording, named in `PROVENANCE.md` itself**: it is loaded by a
  `<script src="./vendor/chart.umd.js">` tag setting `globalThis.Chart`, not by an ES `import` —
  the published ESM build imports the bare specifier `@kurkle/color`, unresolvable without a bundler
  or an import map, and editing that import inside the vendored file would have destroyed the
  hash-verifiability this item exists for. The `<script src>` path is still local and relative; the
  intent ADR-0007 states (vendored, never CDN-fetched, no bundler) is honoured, the literal
  mechanism is not. The source map (955 KB, `sourcesContent` for all 74 original TypeScript sources)
  means the vendored ~200 KB of minified code is readable and steppable from its own source rather
  than being an opaque blob — the strongest objection this item's own header raised against
  vendoring at all.
  - [ ] **P2-3a** The "must work offline in 2031" rationale is **retired as confused**. A
    2026-vintage forecaster opened in 2031 would hold stale brackets, pension rates and deeming
    figures and answer confidently anyway — the exact failure this project is organised against.
    The requirement is now: **no network dependency at runtime, and the plan file is readable
    without the app**. What has to last is the plan file, not the app
- [x] **P2-4** Money utilities: integer cents, no floats anywhere — ✅ 2026-09-03. `Cents` is a
  branded type, so a dollar figure cannot be passed where cents are expected. Rounding is half
  **away from zero**, not `Math.round`, which is asymmetric across zero and would bias every
  negative figure one cent. Floats survive in exactly two places: `toCents` (the input boundary)
  and the rate argument to `mulCents`.
- [x] **P2-5** Assumptions object — year-indexed, FY-stamped, every value marked config vs constant
  — ✅ 2026-09-04. `src/data/assumptions/`, one module per domain, 190 leaves, deeply frozen.
  The stamp is a type union rather than a convention: only `kind: 'constant'` may carry
  `everyYear`, so a config row cannot lose its year without changing its kind in the diff. The
  surprise was how much of the register is *machinery* — cap indexation, the pension benchmark
  chain, the SAPTO thresholds and HEAS capacity are all stored as formulas with the published
  figures demoted to fixtures, which is most of the file volume and all of the value.
  - [x] **P2-5a** SAPTO thresholds are **config (derived)**, from the year's marginal rates via reg s 9(4)–(8) — both branches, including the `> $37,000` test. Never store the published table; use it as a fixture (T5, T6)
    — ✅ 2026-09-04. Reproduces all six published thresholds to the dollar, plus ATO Example 9's
    $1,440 / $39,912 / $2,469 chain. `saptoThreshold` returns which limb it used, so T6 is
    asserted rather than inferred.
  - [x] **P2-5b** `sapto.transferIncomeFloor` ($6,000) and `sapto.transferReductionRate` (0.15) as named frozen literals, **never wired to the lowest marginal rate** — correct through FY2026-27, silently wrong from 1 Jul 2027 (T1)
    — ✅ 2026-09-04. The mutation test runs the transfer at FY2027-28 rates: the wired version
    gives $1,042 and a $38,451 recomputed threshold against the correct $1,002 and $38,324. The
    same case inside FY2026-27 is asserted to be *blind* to the mutation, so the test documents
    why a first-year test proves nothing here.
  - [x] **P2-5c** Medicare levy thresholds carried as an FY2025-26 **labelled fallback** with a visible year mismatch — do not relabel them FY2026-27 (T10)
    — ✅ 2026-09-04. `priorYearFallbackFor: '2026-27'`, and `explainAssumption` renders it as
    "FY2025-26 — prior-year fallback, no FY2026-27 figure exists". A test asserts these are the
    only fallback rows in the whole register. P1-6 stays open.
  - [x] **P2-5d** Settings vs assumptions boundary — anything legislated is an assumption, anything forecast is a Setting
    — ✅ 2026-09-04. `settings.ts` holds no values: the shapes a Setting supplies, plus a keyed
    register of what is deliberately absent and why, so `explainAssumption` answers "that is a
    Setting" instead of nothing. Deeming rates split rather than sorting cleanly either way —
    determinations already made are legislated facts and are stored with their effective dates,
    while `deemingRatesAt` returns `undefined` past 20 Sep 2026 rather than extrapolating the
    three +0.5% steps that have happened in a row (T30, O2).
  - [ ] **P2-5e** Resolve the register §5.3 contradiction: the HEAS fortnightly rate during an
    advance period has two incompatible expressions — a table row `max(MPR, 1.5 × MPR −
    advances_taken)`, which mixes a fortnightly rate with a lump sum, and a dimensionally
    coherent pseudocode line. Stored as `unverified` with both readings and deliberately not
    implemented. Needs s 1134(1A)(b) read directly, before P9 models advances
- [x] **P2-6** Three inflation knobs: CPI, wage growth (AWOTE), deeming rates as manual policy input
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). Four rates ship, not the three asked for: `EconomicSeriesSetting` carries cpi/pblci/awote/mtawe (`src/data/assumptions/settings.ts:105`) and `DeemingRatesSetting` (`:18`), both reachable from `Settings` (`plan.ts:90,102`). Item description UNDERSTATES what was built. Note PBLCI and MTAWE are wired as boxes but inert — see P6-12.
  - [x] **P2-6a** Age Pension needs **three** indexation bases, not one: MTAWE-benchmarked basic rate, CPI-only Pension Supplement, never-indexed Energy Supplement (T23)
    — ✅ **Ticked 2026-09-23 in the reconciliation pass; built under P4-1c, the box was never
    flipped.** `defaultAgePensionSeries` (`data/assumptions/agePension.ts`, called from
    `projection.ts`) indexes the basic rate at max(CPI, PBLCI) floored at 41.76% of MTAWE and the
    supplement at CPI only; `energySupplementIndexed: false` keeps the Energy Supplement out of the
    rate set entirely, so it cannot be indexed by construction. Default-on since `66bac84`.
- [x] **P2-7** Nominal↔today's-dollars conversion at the display boundary only (ADR-0001)
  — ✅ **2026-09-21. THE DEFAULT VIEW IS TODAY'S MONEY**, on the user's ruling, with a toggle to the
  raw future amounts and a plain-English note they asked for by name. `src/app/todaysDollars.ts`,
  `test/app-todays-dollars.test.mjs` (21 tests), 1809 green from 1788.
  - **Why the default mattered more than the toggle.** Defaulting to the future amounts would have
    been free — no existing expectation moves — but it would have left the page showing the figure
    nobody can read while this item was ticked. ADR-0001's TITLE is *"Compute in nominal dollars
    internally, **display in today's dollars**"*; the readable basis is the stated intent, not an
    opt-in. Deferring would not have dodged the cost either: flipping the default later moves the
    same expectations.
  - **The feared blast radius was mostly an illusion, and the reason generalises.** The gate
    estimated ~99 money assertions across 7 files. The true figure was **25 call sites**, because
    nearly every "money assertion" is `formatCents(<the same field off the Month>)` — **a
    self-referential identity, not a pinned figure.** A grep for `/\$[0-9]/` counts the DIALECT, not
    the assertions. Check whether a "pinned figure" is pinned to anything before costing work off it.
  - **Existing display tests were NOT re-based.** They now declare their basis as `futureDollars`,
    where the lens is the identity, because their figures are hand-derived with the working in the
    comments — converting them would swap a checkable derivation for a number only the code can
    produce. Consequence to know: **the default view's coverage lives in the new file.**
  - **Proofs that the arithmetic is right rather than merely plausible:** the month-0 factor is
    exactly `1.000000`, so both views agree on day one; `cpi = 0` makes the two views identical at
    every month; and the conversion was read off the LIVE PAGE in headless Chrome and re-derived by
    hand — 2047-07 `$1,260,866.60` → `$753,798.52`, 2068-05 `$1,053,272.12` → `$376,454.82`.
  - **One structural choice worth keeping:** the lens is bound ONCE PER ROW and handed to every cell
    builder, so a row **cannot** mix bases. That closes ADR-0001's sharpest named case — a capital
    gain shown in today's money whose tax was assessed on the future amount — structurally rather
    than by convention.
  - **Rounding is not additive**: `opening + cashNet === closing` cannot hold exactly once each
    figure is converted on its own. Bound measured at **exactly one cent**, asserted in both
    directions across all 501 months *including that the bound is reached*, and said plainly on
    screen rather than hidden.
  - **The Contingency Floor is treated as STATED IN TODAY'S MONEY** — flat in the default view,
    inflating in the future view — because that is what a person means by "I want $700k of buffer".
    ⚠️ **This has an unfinished consequence: see P4-14.**
- [x] **P2-8** Synthetic demo couple fixture — round numbers, committed to the repo — ✅
  **2026-09-24.** `fixtures/demo-couple.plan.json`: a made-up couple whose plan exercises a realistic
  set of entries, flattened into ONE baseline
  Scenario. The entries (10 entries, in the order `effectiveEntryIds` would
  hand them out): a `SPEND_CHANGE` now, a `MORTGAGE_REFINANCE` 2027-04-01, a household `RETIRE` on
  the younger invented Person's 63rd birthday, a household `MORTGAGE_PAYOFF`, and six more
  `SPEND_CHANGE` levels dated the 1 July after each of the 67th/70th/75th/80th/85th/90th birthdays.
  Persons "Alex" (DOB 1971-01-01, accumulation super $500,000) and "Sam" (DOB
  1973-01-01, $50,000), both fee-free; pay $3,500/fn and $1,500/fn; a $250,000 mortgage at 5%,
  $2,300/month, refinanced to $350,000; a $10,000 opening offset. All figures invented and round;
  none is a real person's. `test/demo-couple-fixture.test.mjs`: 5 tests — parses through
  `parsePlan` with no refusal, `project()` walks it to Sam's 100th-birthday month (2073-01) with no
  refusal, `git check-ignore` reports it NOT ignored (P8-4c, ticked below), and the fixture's own
  DOBs/balances are pinned as the invented figures. Mutation-checked: adding the fixture path to
  `.gitignore` kills exactly the check-ignore test (4 pass, 1 fail); dropping a required field
  (`mortgage.annualInterestRate`) kills the parse test and everything downstream of it (1 pass, 4
  fail). Both reverted from a scratchpad copy, not `git checkout`, per
  [[feedback-mutation-test-protocol]].
  - [x] **P2-8a** Lives under `fixtures/`, the one path `.gitignore` negates back in (P8-4b).
    Anywhere else and `*.plan.json` swallows it — ✅ 2026-09-24, `fixtures/` created for the first
    time by this fixture; the negations were correct but idle until now (see P8-4c's own note).
  - ~~[ ] **P2-8b** The demo couple holds **zero non-super assets**, and keeps holding zero. P3-20
    makes the pool first-class; it does not make the fixture own one. The fixture stands for the
    Household, it is the Moneysmart comparison subject (P13-1) and the golden-file baseline
    (P13-4), and giving it an ETF because the capability now exists would silently change what
    every regression test measures. The bridge and the CGT disposal get **separate** fixtures
    (P13-7), named so nobody mistakes one for the baseline~~ **SUPERSEDED by user ruling,
    2026-09-24.** The fixture is a twin of "R@63, house +100k", whose resolved entries carry a
    mortgage and an offset (the fixture's invented $10,000) — a non-super position from month one — so "zero
    non-super assets" was never true of the thing P2-8 was asked to build, and the fixture now
    shipped is NOT zero-non-super. **P13-4a's "the golden baseline stays zero non-super" premise
    follows this one down** and needs its own re-reading before golden files are written against
    this fixture.
- [ ] **P2-9** Test harness; hand-worked expected values as the first fixtures
  - Harness up and running (`npm test`); the hand-worked fixtures wait on the rules modules.
  - [x] **P2-9a** Tests run on **`node:test`** — the built-in runner. Not Vitest, not Jest; the
    one dev dependency is `typescript` and it stays that way — ✅ 2026-09-03. Tests are plain
    `.mjs` against the compiled output: writing them in TypeScript would need `@types/node`, and
    that is a second dev dependency for no gain.
  - [x] **P2-9b** Import-graph test enforcing the module boundary: `core/` and `data/` never
    import `store/` or `app/`. A boundary that isn't asserted is a boundary that erodes
    — ✅ 2026-09-03. Reads the `.ts` sources and regex-matches import specifiers — no parser, no
    dependency. Verified by temporarily importing `store/` from `core/money.ts` and watching it
    fail. It also rejects bare specifiers in those layers, which catches `node:fs` in `core/`.
- [x] **P2-10** ⚠️ **LOAD-BEARING, NOT A CONVENIENCE — promoted 2026-09-15 by RULINGS.md R12.**
  `npm run update-assumptions -- --fy YYYY-YY` — the annual maintenance script.
  **Why it was promoted from an ergonomic nicety to queued work:** R12 supplied the FY2027-28 bracket
  table by carrying the 30%, 37% and 45% rates forward, `unverified`, and leaned on this script to
  replace them with legislated figures. **That reason is spent — P2-10b, 2026-09-17: those rates
  were never assumptions.** Sch 7 Pt I cl 1(b) states all four expressly, for FY2027-28 *and every
  later year*, and it has been read (O8, closed). **The reason that replaces it is larger:**
  `taxYear` now answers for **every** year of a forty-eight year walk from that one sentence, so a
  single amendment nobody re-read silently rewrites forty-eight years of projection instead of one.
  The residual is amendment rather than absence and still runs the safe way — every movement in
  this ladder on record is a cut — but the refresh path is now load-bearing over the whole horizon.
  The one genuinely unknowable set is untouched and is what the script stages today: §2.7's ten
  Medicare low-income thresholds, lifted retrospectively in the following Budget. See register §2.1
  (the rule and its boundary), §2.1.1 and O8.
  Scaffolds next year's assumption modules from the published ATO and Services Australia figures:
  copies the current year's shape, blanks the values, and leaves every leaf carrying its
  `registerSection` so nothing lands without a source. Whatever is not yet legislated at run time
  is written with `priorYearFallbackFor` set rather than silently carried forward, which is the
  one behaviour that makes the script safe to run early — ✅ 2026-09-15. Built as
  `scripts/update-assumptions.mjs` (outside `src/`, so tsc never compiles it), wired as
  `npm run update-assumptions`, and pinned by `test/scripts-update-assumptions.test.mjs`, which
  drives it as a subprocess the way a human runs it.
  - ✅ **THAT CASHFLOW CONSEQUENCE IS CLOSED — P2-10b, 2026-09-17.** This entry read, until today,
    that the Income Waterfall spent the GROSS salary from 1 July 2028, roughly **$1,220 a month**
    for forty-six of the walk's forty-eight years, OVER-stating the household. The premise was
    wrong rather than the arithmetic: Income Tax Rates Act 1986 Sch 7 Pt I cl 1(b)'s third table is
    headed *"for the 2027-28 year of income **or a later year of income**"*, so the ladder past
    FY2027-28 was unread (register O8), never unknown. `taxYear` answers for every year of the walk
    from that sentence and **every month from FY2026-27 on carries its tax line**. The assertion in
    `test/core-projection-waterfall.test.mjs` was replaced, in the same commit, by one proving the
    drag is present and measuring it. What remains is **distance, not absence** — a FY2060-61 figure
    is the law as read on 2026-09-17 projected thirty-four years — and every such year is marked
    `standingLawFrom`. Reporting that marker in the OUTPUT is the second half of P2-10b and is not
    built here.
  - **Superseded 2026-09-15 — this item used to read *"While P2-10 is unbuilt, 'I will refresh the
    assumptions annually' is a promise with no mechanism"*.** The mechanism now exists:
    `scripts/update-assumptions.mjs` is built and driven by `test/scripts-update-assumptions.test.mjs`.
    The old sentence is kept here rather than deleted because it is what made this item
    load-bearing, and R12 still cites it. **What the mechanism did NOT discharge, and what happened to it:** the 30%,
    37% and 45% FY2027-28 rates were `unverified` and carried forward. **P2-10b sourced them on
    2026-09-17** — from Sch 7 Pt I itself, which states all four rates for FY2027-28 *and every
    later year*, closing O8. Nothing in §2.1 is carried forward now. The promise has a mechanism and
    the figures; what it does not have is a *cadence*, and that matters more than it did, because
    one unread amendment now rewrites forty-eight years of projection rather than one.
  - **Corrected 2026-09-15 — this line used to claim `settings.asAtDate` among the things that
    "already exist or are already decided", which read as though the script could take "today"
    from it.** The year-stamped modules and `priorYearFallbackFor` do exist (P2-5, P2-5c);
    `settings.asAtDate` is **decided but unbuilt** — it appears nowhere in `src/`, only in ADR-0002,
    ADR-0008 and the unticked P4-1a/P8-1a. It is not a blocker and the script must not be built
    against it: `--fy` is explicit, which is the stronger design anyway, because a refresh that
    inferred its own target year from a date would silently pick one. The script is the only
    genuinely missing piece of the annual-update story: today a new financial year is hand-written
  - [x] **P2-10a** It **writes source files, never values into a running plan**. A plan file
    projects against the assumptions the code holds; re-stamping an old plan's figures would break
    the reproducibility P4-1a exists to guarantee. Opening a 2026 plan in 2031 must still produce
    the 2026 answer — ✅ 2026-09-15. Stronger than "never touches a plan file" as built: the script
    writes **only** into a **gitignored staging dir** (`refresh/FY<year>/`), which is outside
    `tsconfig`'s `include`, imported by nothing, and dirties neither `git status` nor the build. A
    run cannot perturb the live tree at all, and that non-perturbation is the load-bearing property
    the test file pins.
  - [x] **P2-10b** The scaffolded year is **not** wired into `ASSUMPTIONS` by the script. A human
    fills the values, cites them, and does the wiring in a reviewed commit — the script removes
    the typing, not the sourcing gate (`concept.md` §6) — ✅ 2026-09-15. The gate is structural
    rather than exhortative: every staged row is emitted as `value: null` with empty `source` and
    `retrieved` strings, and an empty `retrieved` is deliberately unparseable as an `IsoDate`, so
    an unsourced record **fails to compile** and therefore cannot ship. A blank that refuses to
    build is safe; a figure silently carried forward is not.
- [x] **P2-11** Investment return **Glide Path** — the return Setting as age bands (High Growth to
  - ⚠️ **SUPERSEDED 2026-09-23 — the verdict below was true on the morning of 2026-09-22 and false by
    that evening.** `RETURN_CHANGE` shipped end to end the same day as an ordinary explicit entry
    (`45878ec` → `e88b7db`: params, parser, walk, form). What is still unbuilt is only the
    *synthetic* resolution in P2-11a / P6-3. Original audit line kept as the record:
  - ~~⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit).~~ Glide Path unbuilt. `RETURN_CHANGE` appears in `projection.ts` exactly once, at line 2347, INSIDE A COMMENT naming P2-11 as future work. Blocked on nothing — the mechanism is designed in `plan.ts`'s doc comments and never written. Shares its missing mechanism with P6-3.
  55, Balanced 55–65, Conservative from 65), per Person and per account. `concept.md` §5.13
  - ⚠️ **NOT WHAT SHIPPED, AND THE CHECKBOX ABOVE TICKS THE ITEM ANYWAY — READ THE SHIPPED NOTE
    BELOW BEFORE TRUSTING THIS LINE.** No age bands, no Setting, no per-account targeting: the gate
    ruled a different, narrower shape satisfies this item — an ordinary, explicit, per-Person
    `RETURN_CHANGE` entry, stated one rate at a time, `SPEND_CHANGE`'s own carried-level idiom.
  - [ ] **P2-11a** It is a **Dated Parameter**, so the bands resolve into synthetic `RETURN_CHANGE`
    Journal Entries before projection (P6-3). One mechanism, and the band shows in the month table
    as an entry that applied. An explicit `RETURN_CHANGE` supersedes the synthetic one
    — ⚠️ **NOT TICKED, DELIBERATELY (2026-09-22): this is the missing generic mechanism, P6-3, and it
    is exactly as unbuilt today as it was before this item started.** See the SHIPPED note below.
  - [x] **P2-11b** This does **not** reopen Monte Carlo or sequencing risk, and the docs must keep
    saying so. Phased deterministic returns are one input and one reproducible projection; the
    Parked entry's reasoning is untouched. Anyone who reads the glide path as a foothold for a fan
    chart has misread it
  - 🟢 **GATE: GO-VIA-DIFFERENT-SHAPE — 2026-09-22 (LIZ), claims verified independently.** The
    2026-09-22 audit's "blocked on nothing" was itself stale — corrected here.
    - **A plain Setting does NOT satisfy this item, confirmed as a ratified design commitment, not
      an assumption.** ADR-0002 (`docs/adr/0002-journal-entries-as-overlay.md:27-31`, quoted and
      verified): "Dated Parameters are sugar... resolve into synthetic Journal Entries before
      projection, so there is exactly one mechanism." A Setting read directly by the growth
      calculation would be invisible in the month table's own entry-applied list, breaking the
      explainability guarantee that ADR exists to protect. Also stated independently in
      `plan.ts:104-116`, `projection.ts:2355-2359`, `concept.md` §5.13.
    - **But the missing generic mechanism (P6-3, VERIFIED NOT BUILT) is NOT actually required.**
      The false binary was Setting-vs-missing-mechanism. The real answer is a third, already-
      precedented shape: `RETURN_CHANGE` as an ORDINARY EXPLICIT entry — no synthesis, no Setting
      driving it — reusing `SPEND_CHANGE`'s existing "standing level per type+owner, carried until
      superseded" engine pattern (`governing` map, `projection.ts:4263-4344`, confirmed live and
      reusable). Exactly the shape `MORTGAGE_TARGET` and `NON_SUPER_INVESTMENT` already shipped in.
      P6-3 stays exactly as unbuilt as today — untouched, not a prerequisite.
    - **Zero fixture churn, confirmed** — two flat-rate call sites (`projection.ts:7569,7619`), a
      plan with no `RETURN_CHANGE` entries is unaffected.
    - **No figure to invent** — the bands' own ages and rates are the user's stated assumption,
      same as every other rate Setting shipped today.
    - **RULED BY LIZ on today's own precedent, not escalated — both open questions.** (1)
      **Per-Person for v1, not per-account.** Every staged feature today shipped the narrower case
      first and named the wider one as a gap rather than block on it (individual franking before
      super franking; early TTR conversion before the automatic backstop was wired). Per-account
      adds real disambiguation complexity (which of possibly several accounts) nothing here asks
      for explicitly — the "per account" wording is the same aspirational doc-comment category the
      audit already found stale once today (P6-3's "synthetic entries"). (2) **Ship via explicit
      entries generated by a one-off wizard, not automatic Setting-driven regeneration.** Matches
      the shape of every feature built today — changing the household's assumption later means
      regenerating or hand-editing the entries, exactly how `MORTGAGE_TARGET`/spending presets
      already work. The bigger, always-in-sync mechanism is P6-3's job, still deferred.
    - **Build order:** (1) `RETURN_CHANGE` params (`rate: number`, effective from the entry's own
      date) in `plan.ts`, moved off the `UnspecifiedParams` list. (2) parser in `parsePlan.ts`,
      mirroring `SPEND_CHANGE`'s. (3) engine branch: add `RETURN_CHANGE` to the `governing` map,
      read the governing rate instead of the flat `settings.nominalReturn` at both call sites.
      (4) plain entry form, matching `MORTGAGE_TARGET`'s ship — the wizard/template generator is an
      explicit follow-on, not a blocker for this item. (5) retire or mark deferred the "synthetic"
      promise in `nominalReturn`'s/`monthlyGrowthFactor`'s own doc comments, naming what was
      actually built.
    - ✅ **SHIPPED 2026-09-22, five microtasks, five commits, 2242 → 2248 tests (6 new), 0 fail.**
      `ReturnChangeParams { rate: number }` (`plan.ts`), the parser (`parsePlan.ts`, `nominalReturn`'s
      own sign precedent — negative permitted), the engine branch (`returnRate[personIndex] ??
      settings.nominalReturn` at both growth call sites, carried through `governing` exactly as
      `SPEND_CHANGE`), and `returnChangeEntry` on the form (`entryForm.ts`, `MORTGAGE_REFINANCE`'s
      rate-box shape) — `RETURN_CHANGE` is now the eleventh constructible, tenth offered type.
      - **THE FINDING: the gate's "different shape" is not a compromise, it is what shipped, and
        P6-3's synthetic mechanism is exactly as unbuilt as it was before this item started.** No
        `Dated Parameter` machinery exists anywhere in `src/`; `RETURN_CHANGE` is an ordinary,
        explicit, user-stated Journal Entry, read back off `governing` for provenance like every
        other level. A household wanting three bands states three entries by hand.
      - **Zero fixture churn, proven rather than assumed:** every existing fixture in
        `core-projection-growth.test.mjs` (no `RETURN_CHANGE` entries) is byte-identical; the two
        flat `settings.nominalReturn` reads fall back to it exactly when `returnRate[personIndex]`
        is `undefined` — "nobody has ever stated a return for this Person", `statedSalary`'s own
        reading of absence.
      - **The boundary is not where a first guess puts it.** Growth is computed at the END of a
        month's tick, after that month is "assessed and reported" — so the entry's own dated month's
        REPORTED balance still shows the OLD rate; the NEW rate first shows in that month's growth
        LINE, and in the FOLLOWING month's reported balance. `test/core-projection-return-change.
        test.mjs` pins this precisely, on the entry's own growth line rather than the balance.
      - **Mutations (a) ignore `returnRate` entirely, (b) apply the new rate a month early, and
        (c) let it leak to every Person regardless of `owner`** were each applied by hand, compiled,
        and confirmed to fail the new tests alone (4/4, 1/4, 3/4 respectively) — then reverted.
      - **PER-PERSON, ruled and built as ruled** — `household`-owned reaches every Person
        (`personsReachedBy`, `RETIRE`'s own reading of `owner`), `personA`/`personB`-owned reaches
        one and leaks to neither the other Person nor a different `owner`'s level.
      - `plan.ts`'s `nominalReturn` doc and `projection.ts`'s `monthlyGrowthFactor` doc are corrected
        (microtask 5, no code change): both used to promise the synthetic-Setting mechanism as this
        item's own design; both now say what was actually built and mark the Glide Path's synthesis
        idea SUPERSEDED-not-deleted, still P6-3's job.
    - ⚠️ **P2-11a, AS ORIGINALLY WRITTEN, IS NOT WHAT SHIPPED AND STAYS UNTICKED.** It describes the
      *Dated Parameter* / synthetic-`RETURN_CHANGE`-Journal-Entry mechanism the gate ruled a false
      binary — that mechanism (P6-3) remains entirely unbuilt. What ticked above is the different,
      already-precedented explicit-entry shape the gate named GO-VIA-DIFFERENT-SHAPE. P6-3 itself is
      untouched and stays open for whoever builds the generic Dated Parameter mechanism.
    - ✅ P2-11b holds for what shipped: `RETURN_CHANGE` is a deterministic, explicit, one-rate-at-a-
      time entry, exactly as flat-rate projection already was — no distribution, no fan chart, and
      nothing here reopens the Parked Monte Carlo entry's reasoning.

---

## Phase 3 — Rules modules (pure functions, no UI)

- [x] **P3-1** Income tax: year-indexed brackets, Medicare levy, LITO/SAPTO
  — ✅ 2026-09-04. `core/incomeTax.ts`, consuming `data/assumptions/tax.ts` and re-declaring
  nothing. The ordering is what the shape enforces: SAPTO eligibility is decided from
  untransferred figures before a transfer exists, the gate and the amount call one `saptoOffset`
  with different income arguments so T2 is a visible difference in arguments rather than two
  formulas free to drift, and the Medicare levy cannot run before SAPTO because it consumes the
  offset. Hand-worked fixtures are the register's own published examples — §2.4's threshold sets,
  §2.5's *Ying and Li Jun*, §2.6's $1,002 / $37,727 / $2,070 transfer check — so they are
  independent of the code and of my arithmetic. **Refusals rather than plausible numbers:** see
  P3-1c. ⚠️ **SUPERSEDED 2026-09-15 (R12):** this entry used to record a second refusal — FY2027-28
  had no bracket table and `taxOnTaxableIncome` threw there. **It no longer throws.** R12 supplied
  that table (never-indexed thresholds, the legislated 14%, and the 30/37/45 carried forward,
  `unverified`, over-stating tax or exact), and `MissingBracketTableError` narrowed to a
  defence-in-depth guard no real input reaches. Register §2.1 and §2.1.1.
  **Surprise:** the FY2027-28 *couple* SAPTO threshold stays on reg s 9(5) — §2.4's "s 9(6)
  becomes the default at 0.14" is true of the single case alone, because at BRA $1,602 the s 9(5)
  branch gives $32,821, still under the $37,000 reduction threshold. Also, a FY2027-28 couple is
  only computable while no transfer is in play at all: reg s 12's "base rebate amount exceeds tax
  payable" precondition needed the bracket table that year did not have — **until R12 supplied it
  on 2026-09-15**, which lifts that restriction.
  - [x] **P3-1a** The Medicare levy seniors/pensioners threshold switch keys off **computed SAPTO > $0**, not SAPTO eligibility — the half-combined gate can make a Person eligible while their own rebate income zeroes the offset (T8)
    — ✅ 2026-09-04. Enforced by absence: `MedicareLevyInput` carries `saptoReceived`, a dollar
    amount, and has no eligibility field, so inside `medicareLevy` the wrong design is not a bad
    line of code, it is a line that cannot be written. Ying is the case that separates the two —
    eligible on half combined $39,848.50, $0 on her own $54,020 — and the answers differ by
    $105.20 a year ($1,080.40 on the ordinary thresholds against $975.20 on the seniors ones).
  - [x] **P3-1b** Capture WATO — amount, taper, the "net labour income" definition — before the 2027-28 year is projected (O15)
    — ✅ 2026-09-11 by P3-24. **All three limbs, and one of them had no answer to capture:** the
    amount is `min($250, basic tax on net labour income)` (s 61-160) and **there is no taper** —
    limb (b) is a shade-IN at the bottom, so above ~$19,986 it is a flat $250 at every income with
    no ceiling. "Net labour income" is s 61-155(2)'s own definition and a **fifth income base**.
    Register **§2.8.1**; **O15 closed**; figures and the s 63-10 order in
    `src/data/assumptions/tax.ts`. The offset itself is still not computed — see P3-39.
    — **stamped 2026-09-15:** the last sentence was true when it was written and is not now. P3-39
    computed the offset the same day: `workingAustraliansTaxOffset` in `src/core/incomeTax.ts`,
    limb (b) in `src/data/assumptions/tax.ts`, register **§2.8.1.1**.
  - [x] **P3-1c** **The family Medicare levy shade-in band is REFUSED, not computed.** Between the
    family lower and upper thresholds the reduction is governed by Medicare Levy Act s 8(2), which
    register §2.7 records as **not read** — it is a GIF in the ATO Legal Database, and both its
    0.08 coefficient and, decisively, how it apportions the reduction between two spouses are
    inferred (open item **O7**). `medicareLevy` throws `FamilyShadeInUnsourcedError` there. The
    band is reachable for a real retiree couple (seniors family $61,623–$77,028), so this is a
    live limit and not a theoretical one. Closes when O7 closes: read s 8(2) from the Federal
    Register compilation, or OCR the GIF. Do **not** close it by inventing an apportionment
    — ✅ 2026-09-05. O7 is closed: the GIF was downloaded and read, and the formula independently
    confirmed from the Federal Register compilation's PDF text layer and from the Act's own
    history notes (`docs/research/p3-medicare-family-shadein.md`). `FamilyShadeInUnsourcedError`
    is **deleted**. The register had stopped one subsection too early — **s 8(3) is the
    apportionment**, and s 8(4) sits behind it.
    **The surprise is the s 8(3)(c) gate.** Apportionment happens only if "but for this section
    and section 9, the spouse … would be liable to pay levy" — **s 7 is not in that exclusion**,
    so a spouse at or below their own s 3(1) threshold amount is not liable, the gate never opens,
    and the liable spouse keeps the **entire** reduction. For a seniors couple the gate cannot
    open anywhere in the band at all: both liable needs `2 × $44,268 = $88,536` against a band top
    of `1.25 × $61,623 = $77,028.75`. **The apportionment this refusal existed to avoid inventing
    is dead in exactly the case the refusal was blocking** — and inventing it would have halved a
    real retiree household's benefit. The ATO's own Ashton example reproduces to the cent at
    **$92.90**, against $229.76 for unconditional apportionment, $543.70 for ignoring s 7(2) and
    $141.79 for the pre-2014 taper; all three are asserted as *not* produced.
    Two further findings, both now in the code: the band test is **`raw > 0`**, never
    `family income ≤ the published upper` — no upper family threshold exists in the Act, the
    published ones are the ATO's `1.25 ×` arithmetic and they do not round consistently (a family
    income of $59,047.25 is $0.25 above the published upper and still inside the band, worth 2c);
    and `MEDICARE.shadeInRateFamilies` (0.1) is **read by nothing and is not the taper** — the
    s 8(2) coefficient is 0.08, and 0.10 is the effective rate only for one earner above their own
    phase-in limit (0.02 + 0.08). `familyShadeInTaper` and `familyShadeInBaseRate` are the records
    the code consumes; correcting the register row is register work, not this.
    **One mutation is structurally unfalsifiable** (the precedent is the inlined SG rate):
    *dropping s 8(4)(a)'s "subsection (3) applies" condition* changes nothing observable, because
    an excess can only be delivered to a spouse who was **not** liable — and a spouse who is not
    liable already pays nil under s 7(1), so subtracting the excess from their levy is a no-op.
    — ✅ 2026-09-05, register work done. §2.7 now carries s 8(1)–(4) and s 7(2) on the family path;
    O7 is marked closed and O30–O34 opened from the research report's unverified list; T52 (the
    s 8(3)(c) gate) and T53 (s 7(2) applies to a married Person) are new traps with §9 mutations.
    **Three §2.7 rows were over-stated and are now `secondary-only`:** no upper family threshold
    exists anywhere in the Act, and `seniorsFamilyUpper` had been sourced to s 8(7), which contains
    no upper threshold at all. `MEDICARE.shadeInRateFamilies` was **removed** rather than relabelled
    — it was read by nothing, and 0.1 is one of *three* effective rates (8% / 10% / 18%), so keeping
    it under a name that reads like the taper was the landmine, not the orphan. The three rates are
    now in the `familyShadeInTaper` note, at the point of use. `npm test` unchanged at 298.
  - [x] **P3-1f** **A couple where only ONE spouse receives SAPTO is refused inside the family
    shade-in band** — ✅ **DISCHARGED 2026-09-21 ON THE USER'S RULING, and by DELETING the refusal
    rather than narrowing it.** The ruling: **the s 8 low-income reduction is computed PER
    TAXPAYER**. Each spouse applies **their own** family income threshold to the **shared** family
    income, so a mixed couple holding $61,623 and $47,238 at once yields two different,
    simultaneously correct answers — which is the Act's outcome, not the conflict this item was
    filed as. **The item was a MIS-FRAMING, and where it came from matters more than the fix:** the
    research note observed that two spouses' reductions *"sum to raw — the household gets the
    reduction once"*, which holds **only in the symmetric case**; O30 elevated that artefact into a
    statutory constraint, found it broke under asymmetry, and concluded the Act was silent. **A
    regularity observed only in the symmetric case is not a rule.**
    - **The grounds, each verified against Compilation No. 53 (C2026C00295, in force 1 July 2026)
      rather than taken on trust.** Every operative limb — ss 8(1), 8(2), 8(3), 8(5), 8(7) — is
      framed on *"a person"* / *"the relevant person"*. The defined term is expressly *"**family
      income threshold**, in relation to a person (the relevant person)"* while *"family income"* is
      expressly the shared sum of both taxable incomes. **s 8(5)(b) shows the drafter's express
      technique for pulling a spouse's circumstances into a per-person term** — *"the relevant
      person **or the spouse of the relevant person**"*, for the child uplift — and **s 8(7) does
      not use it**: read as it stands, *"Subsections (5) and (6) apply in relation to a person who
      is entitled … to a rebate under section 160AAAA … as if each reference to $47,238 were a
      reference to $61,623"*. That is the identical formula s 3(1) uses for `threshold amount` and
      `phase-in limit` (*"for a person who is entitled to a rebate under section 160AAAA … $55,335;
      … in any other case … $35,013"*), which this engine has always applied per Person and which
      `MedicareLevySpouse.saptoReceived` exists to feed. `incomeTax.ts`'s own comment said exactly
      this and then declined to follow it through. And s 8(3)'s ratio is TI(spouse)/family income
      with **no threshold in it at all**, so two asymmetric reduction amounts apportion perfectly
      well.
    - **What changed in `src/`: one `if` block and a class, both deleted.** `familyLower` was
      **already** the Person's own threshold off their own `saptoReceived`, and `spouseLiable`
      already read the spouse's own s 3(1) switch, so the construction was present under the guard
      and nothing was rebuilt. `src/core/incomeTax.ts` now has **no branch at all** on the couple
      being mixed — s 8 never asks — and that absence is what the canary defends.
    - **No computed figure moved anywhere in the suite, and that is a fact about what was removed:**
      a `throw` produces no number, so deleting one can only turn refusals into answers. The moves
      are all in the tests that asserted the refusal. Relative to the two household-wide readings
      O30 was torn between, the per-taxpayer answer lies **strictly between them**, one spouse
      moving each way: on the $46,000/$29,000 fixture the senior takes the **lower** of her two
      figures ($73.66 against $173.20 on the smaller threshold) and the other the **higher** of his
      ($98.90 against $36.14 on the larger), household $172.56 against $109.80 and $272.10.
    - ⚠️ **THE CLOSING CONDITION THIS ITEM NAMED WAS NOT MET, and the substitution was made
      knowingly.** It named *an ATO worked example, a ruling, or the ATO Medicare levy calculator
      driven through a mixed couple*. **No such worked example exists** — the only ATO family
      example (QC27032, Ashton) has **both** spouses on SAPTO, which is precisely the symmetric case
      the mis-framing generalised from. What closed it is the **primary law** above, supported by
      the ATO's **per-taxpayer myTax Worksheet 2** (two spouses enter different amounts at the SAPTO
      row, with no reconciliation step between them) and the ATO's express statement resolving
      within-couple SAPTO asymmetry on **individual** entitlement. Stronger evidence than the
      condition named, and a **different kind**. Recorded here and in register O30 so that nobody
      reads this as the named condition having arrived. **Provenance of the provenance:** ss 3 and 8
      were re-read from the ATO Legal Database on 2026-09-21 and every ground above is quoted from
      what was read; the myTax worksheet and the ATO statement come from the ruling and were **not**
      re-fetched here (two candidate ATO instruction URLs 404'd, and the search was stopped rather
      than padded). They corroborate; the primary law is the ground.
    - **The mutation canary was REPLACED, not deleted** (register §9's row is rewritten on the new
      premise, not circumvented). The P3-35 battery asserted the refusal fired across its full
      reach; `test/core-medicare-family-shade-in.test.mjs` now runs a four-mutation battery in its
      place — both spouses on the larger threshold, both on the smaller, each reading the other's
      switch, and any refusal reinstated anywhere in the deleted guard's former reach (swept at $500
      steps of family income across four splits, both ways round). the prose half in
      `test/core-income-tax-mutations.test.mjs` is turned around rather than dropped: the module may no longer describe
      a refusal it does not contain, nor describe O30 as live.
    — original text follows, kept as the record of what was refused and why:
    **A couple where only ONE spouse receives SAPTO is refused inside the family
    shade-in band** — `MixedSaptoFamilyThresholdError`. s 8(7) substitutes the seniors family
    threshold "in relation to a person who is entitled" to SAPTO, which is a **per-Person** test,
    so the two spouses can hold $61,623 and $47,238 against one family income; s 8(2) then has no
    single household reduction amount and s 8(3) no single figure to apportion, and nothing in s 8
    resolves it (research **U2**). This is realistic — one partner under Age Pension age is the
    common case — so it is a live limit, narrowed to where it bites: the refusal fires only where
    the larger of the two thresholds still leaves a reduction to grant. Closes on an ATO worked
    example, a ruling, or the ATO Medicare levy calculator driven through a mixed couple in the
    band (research U8, which would also settle U1, U3, U4 and U5)
  - [x] **P3-1e** **Medicare Levy Act s 7(2) has no married-person carve-out.** `medicareLevy`
    applied the 10% shade-in ceiling only to a Person assessed alone, so a Person on $30,000 with a
    spouse on $40,000 was charged the full 2% — $600.00 where s 7(2) caps at 10% × (30,000 − 28,011)
    = $198.90, three times too much, at `band: 'full levy'` and with nothing in the result saying
    why. It sat *outside* the family shade-in band, so `FamilyShadeInUnsourcedError` never guarded
    it: a silently wrong number, not a refusal.
    — ✅ 2026-09-05. s 7 runs before s 8 and caps the levy "but for sections 8 and 9", so the
    ceiling is computed first, against the Person's **own** s 3(1) threshold amount — never the
    s 8(5) family threshold, which is a different defined term — and s 8 may only reduce further.
    `MedicareLevyResult.sevenTwoCeiling` reports it, because on the family path `band` describes
    the family test and the ceiling is the only thing that explains the amount. The stale test that
    enshrined $600.00 was hand-derived from §2.7 again, not repointed at the implementation.
    **Two of the four mutations for this fix fail zero tests, and both are structural, not gaps in
    the fixtures** (the precedent is the inlined SG rate):
      * *taking the s 7(2) figure instead of the lesser of it and the 2% levy* — inside the range
        the ceiling is always the lesser, because §2.7's phase-in limits are all `lower × 1.25`
        **truncated**. No income exists at which the two readings differ. It becomes testable only
        if a published upper ever exceeds `lower × 1.25`; the code is written for the statute, not
        for the current table.
      * *hard-coding the 10% shade-in rate* — `shadeInRateSingles` is a constant with
        `everyYear: true` and `primary-verified` confidence, so consuming the record adds no
        caveat and no year stamp to `provenance`. The literal and the record agree in every year
        the register admits, and nothing in `MedicareLevyResult` can tell them apart.
    The s 8(2)/(3)/(4) apportionment is still **not** implemented — see P3-1c, which stays open.
  - [ ] **P3-1d** Tax and levy amounts are computed in whole cents. The register states no rounding
    rule for either, so none was invented; the ATO rounds to whole dollars on assessment. Confirm
    and, if it matters, put the rule in the register before putting it in the code
- [x] **P3-2** Separate taxable income from the Div 293 / offset income base
  — ✅ 2026-09-04. `core/incomeBases.ts`. Four distinct brands over `Cents` —
  `TaxableIncome`, `RebateIncome`, `FamilyIncome`, `SurchargeIncome` — rather than a shared
  `number` and a naming convention, so T9 is a compile error and not a test failure. Only
  `taxableIncome` widens from `Cents`; the other three are built out of `TaxableIncome` values
  plus their own named components, so a relabelling cast is the only way to get one wrong and a
  cast is visible in review. The guard reaches inside the modules too, not just the public
  surface: `saptoOffset` takes `RebateIncome` (half combined Rebate Income is still Rebate
  Income), `saptoTransferAmount` takes `TaxableIncome` — which is T1 put into a type, since reg
  s 12(3)(b)(ii) reads taxable income and the two figures diverge the moment the transferor
  salary sacrifices. All four substitutions were applied to the source and rejected by `tsc`;
  `core-income-tax-mutations.test.mjs` runs them as scratch files, with a positive control.
  **Gap found:** the register names Div 293's base as *income for surcharge purposes* but never
  decomposes that term, so `surchargeIncome` takes taxable income plus one named, unsourced
  remainder rather than an invented component list. P3-5 must source it before Div 293 computes
- [x] **P3-3** Super contributions: SG, salary sacrifice, personal deductible, 15% contributions tax
  — ✅ 2026-09-04, in two segments: P3-3a the Superannuation Guarantee, P3-3b everything else that
  goes in and the 15% on the way. Division 293 is deliberately not part of it and is P3-5
  — ⚠️ **the `[x]` was STALE and is corrected to `[ ]` on 2026-09-19 (P6-8 brief 1).** (`[~]`
  means DROPPED in this file's convention — line 11 — and this is not dropped, it is unfinished.) Both modules
  are built, tested and correct, and **nothing the month walk reaches imports either of them**:
  `superContributions.ts` and `superConcessional.ts` are stranded, so no contribution — not the
  Superannuation Guarantee, not a sacrifice, not the 15% — reaches a `Month` in any projection this
  build produces. A super balance in the demo walk grows by the return assumption alone. The RULES
  are done; the WIRING is not, and reading this line as done is how a forecast comes to under-state
  every super balance in it for forty years. The wiring is P6-8's first engine brief
  - ⚠️ **Ticked 2026-09-20 in the reconciliation pass. THE STRANDING IS OVER.** This item was un-ticked on 2026-09-19 because *"nothing the month walk reaches imports either of them"*. That is now FALSE: `projection.ts` imports `superConcessional.js` (`:217`), `superContributions.js` (`:220`), `div293.js` (`:218`) and `division293Release.js` (`:219`). The wiring landed as P6-8 briefs 2-3 (`db28676`..`ea7961b`) and P6-9/P6-10/P6-11 (`ac08f57`..`5c835ff`).
  - [x] **P3-3a** SG base is **qualifying earnings** from 1 Jul 2026 — salary sacrifice no longer reduces it; the maximum contributions base is **annual per employer** ($270,830), not quarterly (T17, T18)
    — ✅ 2026-09-04. `core/superContributions.ts`, the SG only. T17 is a brand:
    `QualifyingEarnings` has no widening constructor, so the only way to obtain one is to name
    `salarySacrificedAmounts` and have it **added** — handing `superGuarantee` the post-sacrifice
    payslip gross does not compile, and omitting the sacrifice field does not compile either. Both
    were run through `tsc` with a positive control. T18 is the call shape: `superGuarantee` takes a
    list of `Employment` records and caps **each** at its own maximum contributions base, then sums
    the charges — there is no path that sums earnings before capping. The ceiling is derived through
    `maximumContributionsBase` from the year's concessional cap, so it moves ($270,830 in FY2026-27,
    $291,660 on a synthetic FY2027-28 driver) and a year with no AWOTE number refuses.
    **Found:** the SG charge percentage is arithmetically un-mutable — the register carries exactly
    one flat 12 for every year (O4), so inlining `12` as a literal fails **zero** tests. The only
    defence is provenance: dropping the record also drops the "stamped FY2026-27, applied to
    FY2027-28" caveat and the O4 caveat, and that does fail. Recorded rather than papered over
    **Refused:** years before FY2026-27 throw `SuperGuaranteeEarningsBaseError`. The register carries
    no ordinary time earnings definition and no pre-2026 charge percentage. *(Corrected 2026-09-10,
    P3-29 — the third copy of an overstatement: **§3.5 DOES carry the $62,500 quarterly base**, and
    T18 and §9 do too. It is there as **prose and a note, not a record** — no year stamp, no source
    of its own, nothing a computation can consume — which is the narrower claim that actually
    carries the refusal.)*
  - [x] **P3-3b** Salary sacrifice as a *contribution*, personal deductible contributions, the 15%
    contributions tax, and applying the total against the concessional cap and the carry-forward
    headroom
    — ✅ 2026-09-04. `core/superConcessional.ts`, a **sibling** of `superContributions.ts` rather
    than an extension of it: that module is the T17 module, and this is precisely the segment where
    introducing sacrifice as a contribution invites someone to "fix" the SG base by netting it off.
    Kept apart, the sacrificed amount reaches the SG base and the contribution total by two paths
    that never meet. The T17 defences were re-checked and still fire — TS2322 on a bare `Cents` as
    the SG base, TS2345 on omitting `salarySacrificedAmounts`. It is counted on both sides on
    purpose: 12% of a base that includes it, *and* the sacrificed dollars on top.
    `ConcessionalContributions` is a brand with one constructor and four required, added limbs, and
    `contributionsTax` takes that brand — so applying the 15% to a non-concessional contribution is
    TS2345, not a wrong number. `applyNonConcessional` was narrowed from `Cents` to a new
    `NonConcessionalContributions` brand in `superCaps.ts`: no behaviour change and no test change,
    but it is what makes "a personal deductible contribution treated as non-concessional" a compile
    error in both directions.
    **Ordering, and a register wording gap:** the general cap is consumed first and the five-year
    window takes only what is left, earliest year first. §3.4 states the second half of that and not
    the first. The first comes from s 291-20(4), which *increases* the cap rather than opening a
    second pool, and from `carryForwardHeadroom`, which already prices an over-cap year that way —
    the alternative reading would make the two halves disagree about one history. §3.4 should say it
    in prose. It is not cosmetic: consuming the window first gives the same total cap and a
    different future, leaving the general cap unspent to generate fresh headroom while burning
    window years that expire
    **Found:** `fundTax.contributionsTax` had sat in the assumptions layer with nothing importing
    it — a rule recorded and consumed by nothing, which is this codebase's known bug signature. It
    is consumed now
    **Gap:** the register never says what a concessional contribution *is* — ITAA 1997 s 291-25 and
    Subdiv 290-C are not in §3. The three limbs are named from the statute and `otherConcessional`
    is one named, unenumerated remainder, the same shape `surchargeIncome` uses (P3-2). Of
    Subdiv 290-C only s 290-170 is enforced: without an acknowledged notice of intent,
    `personalDeductibleContributions` refuses rather than handing the Person a deduction, because
    the same dollars without it are an ordinary non-concessional contribution. The s 290-155
    complying-fund and s 290-165 age conditions are **not** checked
    **Not built:** Division 293. §3.6 names the income base and never decomposes it, so every result
    says the fund's 15% is not the whole tax rather than implying a total. Div 291's excess
    concessional treatment is reported and not priced, exactly as Div 292 is on the other side.
    Also unchanged: every `superGuarantee` result still carries the register O19 caveat — only the
    salary-sacrifice limb of SGAA s 10A(1) was read closely, so `otherQualifyingEarnings` is a named
    unenumerated input. Read `F2026L00784` and s 10A(1)(a)–(g), (3) before any Scenario involves
    bonuses, allowances or termination payments
- [x] **P3-4** Contribution caps: concessional, non-concessional, carry-forward, bring-forward tiers
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). `src/core/superCaps.ts` (45 KB) with `carryForwardHeadroom`/`bringForward`, tested by `core-super-caps.test.mjs` (56 KB) + `core-super-carry-forward.test.mjs` (28 KB). **Sub-item P3-4b (five-year rolling headroom SURFACED per Person) remains open** — the engine computes it, nothing displays it.
  - [x] **P3-4a** Cap indexation is **cumulative from each cap's base amount and base quarter**, never chained; parameterise index, base and rounding **per cap** (T13, T14)
    — ✅ **Ticked 2026-09-23 in the reconciliation pass; built, the box was never flipped.**
    `superCaps.ts`'s `indexCap` indexes each cap from its own base amount and base quarter and never
    from last year's cap (module header, T13); the concessional cap is indexed live in the walk
    since `922aec5` and held against the whole year since `a7f5347`. P3-4b below stays open.
  - [ ] **P3-4b** Surface carry-forward as a **five-year rolling headroom figure per Person per
    year**, oldest consumed first, gated on Total Super Balance < $500,000 at the prior 30 June.
    The rule itself is P3-4 and is not new; what is new is displaying the headroom and offering a
    catch-up `SUPER_CONTRIBUTION` entry against it — offered, never bound (ADR-0004). The $500,000
    gate never indexes (T21), so the window closes on its own and the tool should show that
    - 2026-09-04: `carryForwardHeadroom` computed and tested. "Oldest consumed first" was carried
      in the register (§3.4, `carryForward.applicationOrder`) and in this line, and the first
      implementation still summed each year's gross `cap − contributions` — which keeps offering
      headroom that an over-cap year inside the window has already spent. Fixed. The remaining
      P3-4b work is the display and the offered catch-up entry, not the rule
- [x] **P3-5** Div 293 and Div 296 — ✅ 2026-09-08, both computed
  - [x] **P3-5a** Div 296 is two proportions of **one** earnings base taxed at 15% and 10%; the 2026-27 TSB test is **closing balance only**; CGT phase-in factors 0.2 / 0.4 / 0.6 / 0.8 (T15, T16)
    — ✅ 2026-09-08. `core/div296.ts`, 28 tests. T15 is answered by shape where shape reaches:
    `div296Tax` takes **one** branded `SuperannuationEarnings` and both proportions come out of a
    single closure over it, so a `Cents` band of earnings will not compile where the base goes
    (checked with `tsc`, with the correct version compiling as the control). What shape does *not*
    reach is the arithmetic — carving the s 296-45 slice out of the s 296-40 slice instead of
    adding it is expressible, and is caught by fixture instead: at a $12,000,000 balance on
    $1,000,000 of earnings the right answer is **$129,170** and the carve-out gives $104,165,
    both-rates-on-one-proportion $187,500, swapped rates $100,005. All four agree below
    $10,000,000, which is why the "30% / 40%" commentary framing survives in the wild
    - T16 is structural: the year switch stays in `div296TotalSuperBalanceReference` and
      `totalSuperBalanceReference` is its only caller in `core/`, so no executable line here takes
      a `Math.max` of two balances or compares a year against a literal. It **does** say what §3.7
      says — verified against transitional s 296-1(2) before being relied on. The fixture had to be
      built rather than found: closing-alone and `max(opening, closing)` agree whenever the balance
      rose, so a suite of ordinary growing balances tests T16 not at all. Every T16 assertion runs
      $12,000,000 → $4,000,000, in FY2026-27 (reference $4,000,000, tax $7,500) and FY2027-28
      (reference $12,000,000), with a control asserting a rising balance cannot tell them apart
    - **What surprised us: the CGT phase-in cannot reach a Person.** The factors attach to the net
      capital gain inside the fund's relevant taxable income, and 0.2/0.4/0.6/0.8 is the share that
      **counts** — the register's sequence ends in "no discount, spent", and the other reading would
      ramp inclusion down from 80% to 20% and then jump to 100%. But s 296-60(3) excludes a small
      superannuation fund, and s 296-65(3)'s attribution regulations were never retrieved, so this
      model can only attribute from a fund a Person wholly holds — which is a small fund — which is
      the case the discount does not apply to. It is computed and reported at the fund and no
      Person's assessment can currently reach it. A gap in the register, not in the arithmetic
    - Three refusals, each on its own ground. Thresholds: CPI-indexed from Dec 2025 and the register
      carries no CPI number for any quarter (O11), so FY2027-28 onward raises `UnsourcedIndexBaseError`
      — but the reference balance and the fund earnings touch no threshold and stay available every
      year, which is what keeps T16 testable in 2027-28. Negative earnings: nil below the very large
      threshold, where §3.7's "> 0" guard on the s 296-40 limb settles it; refused above it, where
      §3.7 puts no such guard on the s 296-45 limb and the two readings differ by a negative charge.
      s 296-50: ends the matter in FY2026-27, where only the closing balance is read; from FY2027-28
      the surviving opening limb splits into two readings and is refused rather than chosen
    - **Mutation M5 fails zero tests, and that is a finding, not an omission.** Hard-coding a
      *correct* FY2026-27 threshold literal is behaviourally identical, because O11 makes FY2026-27
      the only year in which a threshold can be computed at all — there is no second year for the
      literal to be wrong in. A *wrong* literal (one $150,000 / $500,000 indexation step up) fails
      10 tests, so the value is bound; its source is not. This closes when a Dec 2025 CPI index
      number enters the register, and not before. No token assertion was added to fill the row.
      The other five mutations: marginal bands 3, both rates on one proportion 8, rates swapped 8,
      `max` in 2026-27 4, closing-alone in 2027-28 3, CGT factors reordered 1 (offset by a year, 1)
    - Still open under Div 296: nothing charges this to a Person's cashflow, the same seam P3-5b
      left. A Division 296 **loss** goes nowhere — §3.7 records no carry-forward rule for one, so a
      negative-earnings year reduces no later year and the model may over-state a later year's tax.
      That is carried as a caveat on the affected assessment rather than silently
  - [x] **P3-5b** **Div 293 computed** — ✅ 2026-09-05. `core/div293.ts`. The taper is the whole
    task: `min(low tax contributions, sum − 250,000)`, checked against the ATO's own worked
    example ($240,000 + $15,000 = **$750**, and a cliff charges $2,250 — 3× too much, at every
    point inside a band exactly as wide as the Person's own contributions). What surprised us was
    the *direction* of the carry-forward interaction, now a test: using the five-year window raises
    a $230,000 Person's Div 293 tax from $1,875 to $3,000 on the same $40,000 contributed, because
    s 293-25(b) subtracts the excess and a bigger cap makes a smaller excess. Any UI presenting
    carry-forward as an unambiguous win is misleading a Person above the threshold. Low tax
    contributions have two constructors on purpose: the derived one (`concessional − excess`)
    consumes `lowTaxContributedAmountDivergence` and reports **unverified** for P3-5 U1, while a
    stated s 293-30 figure keeps primary-verified — a blanket caveat on every Div 293 number would
    stop meaning anything. Subdivs 293-D/E/F are refused by name (U2), not approximated. Still
    open: nothing charges this to a Person's cashflow yet, and P3-5 Finding 5.5 makes *which pot
    pays* — after-tax cash or a release from super — a Setting that changes terminal balances
    - 2026-09-05: the paperwork closed behind it. Register **§3.6** now carries the s 995-1(1)
      component list (four additive limbs, two disregards inside limb (a), a subtractive fifth),
      the taper written out with the ATO's $750-not-$2,250 example, the three grounds for the
      $250,000 freeze and why it is **weaker** than the franking $5,000's, and the carry-forward
      direction — as new traps **T54** (taper, not cliff) and **T55** (carry-forward increases
      exposure), open item **O35** (the SIS s 99G(6) reading, labelled *inferred from statutory
      structure, not stated in terms* on its headline row as well as in the body) and four §9
      mutations. Three comments that had gone stale were corrected in the same pass: `incomeBases.ts`
      says **five** brands, and the `surchargeIncome` "unsourced remainder" the concessional and
      SG modules pointed at no longer exists. **What remains under P3-5 is P3-5a, Div 296** — the
      parent box stays unticked until it is built (built 2026-09-08; the parent is ticked above)
- [x] **P3-6** Condition of Release as a boolean independent of age — ✅ 2026-09-08.
  `core/conditionOfRelease.ts`. Age 60 releases nothing, and the defence is the **signature**:
  `benefitAccess` takes a branded `ConditionOfRelease` and **nothing else** — no date of birth, no
  date, no number — so "pass me the age and I'll tell you if super is accessible" is not a callable
  shape. Adding an age parameter to it is a compile error, and the `tsc` probe proves it by failing
  its own positive control. The 65 limb genuinely is an age test, and the tension is resolved by
  making every ground *push a named reason* while `met` is only `grounds.length > 0`: neither limb
  can be edited into standing for the other. The employment facts are a required discriminated
  union, so "we don't know" cannot default to "they didn't". §9's `metNilCashingCOR = (age >= 60)`
  fails 4 tests.
  - Two surprises. **The register records 60 as a number and 65 only inside the prose of the
    Condition of Release row**, so `access.automaticReleaseAge` was added to `super.ts` to give the
    second limb a leaf of its own — a figure read out of a sentence is a figure nothing can consume.
    And the pre-60 cessation refusal had to be **bounded on both sides**: a Person who stopped work
    at 58 and is now 59 is not released on either reading, so refusing there would have been
    refusing a case §3.9 answers. It fires only between Preservation Age and 65.
  - Hard-coding a *correct* 60 or 65 is invisible to every fixture — both literals give the right
    answer today. It is caught by a source-text canary (no bare age literal in executable code)
    that fails exactly 1 test, and the fixture dates are derived from the records so a changed
    record moves them. Same shape as the Div 296 threshold canary.
- [x] **P3-7** Accumulation vs retirement phase; earnings tax 15% / 0% — ✅ 2026-09-09
  - [x] **The phase model and the fund earnings tax** — ✅ 2026-09-09. `core/superPhase.ts`, on
    register §3.1's two rows and §7's constants list. `fundTax.earningsTaxAccumulation` and
    `fundTax.earningsTaxRetirement` were both unconsumed by `src/` until this chunk; they are the
    rate table now, and a test asserts `core/superPhase.ts` is their only importer.
    - **A TTR pension is a pension and it is NOT Retirement Phase — 15%, not 0%.** That is made
      structural rather than asserted: there are **two** phases, not three, because the register
      has two rates, and `transitionToRetirementInterest` **returns an `AccumulationInterest`**,
      the same branded type an accumulation account gets. Writing `phase: 'retirement'` into it is
      a `tsc` error (TS2352 on the brand), not a wrong number. Forced to compile by also widening
      the return type, it fails **3** tests.
    - **Phase is not age, and "has met a Condition of Release" is not phase either.** No
      constructor takes anything but a `ConditionOfRelease`; there is no date of birth, no `ageAt`
      and no import of `household.js`, and a `ConditionOfRelease` carries no age. And
      `accumulationInterest` **never reads `release.met`** — a Person of 67, retired and released
      twice over, whose money is still in an accumulation account pays the 15%. The minimal way to
      write that mistake, `release.met ? retirementPhaseInterest(release) : …`, does not compile
      (TS2322), and it fails **3** tests when cast into compiling. Meeting the condition is
      **necessary** for Retirement Phase — checked through `requireBenefitAccess`, the model's one
      gate — and nowhere sufficient. Keying the phase off an age instead fails **2** tests but, be
      exact, **still compiles today**: nothing under `src/` calls these constructors yet, so the
      added parameter breaks no call site and the source canary is the whole defence until the
      projection engine calls in.
    - **What is refused rather than guessed, four ways.** A TRIS whose owner has already met a
      Condition of Release (`TrisRetirementPhaseNotModelledError` — that is the conversion limb of
      P3-8, and 15% overstates it while 0% understates it); a year in which the phase changed
      (`MidYearPhaseChangeError` — apportioning it is the segregated-vs-proportionate ECPI
      question, and §3 states no apportionment rule); a fund loss (`FundLossNotModelledError` —
      15% of a negative number reads as a refund in a forecast and would be spent); and a phase
      statement carried into a different financial year (`PhaseYearMismatchError`).
    - **The register does not say when a stream *enters* the retirement phase**, and the transfer
      balance cap that gates how much capital may enter is P3-9 and is not modelled. Neither
      blocked this chunk, because **phase is stated per interest and never derived** — the module
      offers no Person-level aggregation and no total to split, so there is nothing here for a cap
      to gate. Every Retirement Phase result carries a caveat saying s 307-80's entry test is not
      in the register and no amount has been checked against a cap. **P3-9 must revisit this**: an
      engine that lets a Person state $3m as Retirement Phase would silently exempt the excess.
    - **Swapping the 15% and the 0% is caught by assertion, not structurally** (6 tests). There is
      no shape that stops the two records being exchanged in the rate table; the hand-worked
      fixtures are the defence. Hard-coding the rates instead of reading the records fails **1**
      test — the source canary, since no fixture could see a literal that is correct today.
  - [x] **P3-7a and P3-7b** **Franking credits received inside super, both phases** — ✅ 2026-09-09.
    `core/superFranking.ts` on register §5A.3, with §5A.1's gross-up and §5A.4's qualified person
    gate. Landed as one chunk because the two are the same expression with a different rate on the
    income: Retirement Phase is refunded the whole credit, Accumulation Phase — and a TTR pension
    with it — offsets the 15% and is refunded the excess. Hand-worked on $70,000 fully franked by a
    30% payer: credit $30,000, grossed up $100,000, and the refund is **$30,000 in Retirement Phase
    against $15,000 on a TTR**. Added 2026-09-04 (ADR-0010)
    - **The T45 defence is the absence of a branch, and that was the whole design.** s 207-90
      denies the gross-up *and* the offset on exempt income with no super carve-out, so Division
      207 read that far and no further says a Retirement Phase fund gets **nothing** — the exact
      inverse of the truth. s 207-110(2)(b) disapplies it one Subdivision later. The consequence
      for the code is that the **correct** implementation has no exemption branch at all:
      `const offset = distribution.frankingCredit`, unconditionally, *is* s 207-20(2) and s 207-110
      together. The mutation cannot be written by flipping a condition — it has to add one — and a
      test asserts there is exactly one assignment to `offset`, that it is that expression, and
      that no ternary touches it. Applying s 207-90 without reaching s 207-110 fails **5** tests.
    - **TTR-as-Accumulation is inherited, not re-asserted.** Nothing in the module reads
      `interest.phase`, names either phase, or mentions a TRIS; phase reaches the answer through
      one call to `superPhase.fundEarningsTax` and through nothing else. The type-level half was
      re-confirmed by `tsc` this chunk: assigning `transitionToRetirementInterest(...)` to a
      `RetirementPhaseInterest` is **TS2322**. Detecting a TRIS off `incomeStream` and exempting it
      anyway fails **2** tests.
    - **The gross-up rate stays an input, two ways.** `frankedDistributionFromStatement` needs no
      rate at all — an AMMA statement gives the franked amount and the credit as two dollar figures
      and `grossed_up = franked + credit` is an addition (T43). `frankedDistributionFromRate` takes
      the **payer's** rate from the caller with the caller's own confidence, as `superCaps.ts`
      takes an index number, and computes `f × D × r/(1−r)` directly. The rate is validated as a
      rate and deliberately **not** against 0.25 or 0.30: checking it would put both figures in the
      engine, which is what T43 forbids, and would reject the blended rate a diversified portfolio
      actually has. The only numeric literals in executable code are `0` and `1`.
    - **The six mutations, applied, counted and reverted 2026-09-09.** (1) s 207-90 without
      s 207-110 — **5**. (2) TTR as Retirement Phase — **2**. (3) the individual's $5,000 relief on
      the super side — **3**. (4) offset the 15% but do not refund the excess — **8**. (5) a
      portfolio-level gross-up rate as a constant — **4**. (6) round the gross-up to 2.3333 —
      **13**. None was zero. (6) is the widest because every fixture in the file is exact to the
      cent: $100,000 fully franked at 30% is a credit of **$42,857.14** against the $42,857.75 the
      ATO's own 2.3333 produces, and $70,000 is **$30,000** against $30,000.43.
    - **Nil credits are refused, never computed.** s 207-110 disapplies ss 207-90 and 207-95 only,
      so it is no shelter from Subdiv 207-F. A fund that is not a qualified person, a non-complying
      fund or ADF (s 67-25(1A)) and a non-resident (ss 128B(3)(ga), 128D) are three named refusals
      rather than three zeroes — because a zero produced by *this* module is indistinguishable from
      the T45 mistake at the point where it matters most. The non-complying refusal is also what
      keeps the arithmetic honest: answering one distribution on its own is exact **only** because
      the excess is refundable, so nothing is floored at nil on the way through.
    - **T49 / O27 is structural, and carries its inferred status.** The qualified person gate is
      three booleans and the function applying it is handed no dollar figure at all, so "…unless
      the credits are $5,000 or less" cannot be written without first adding a parameter for the
      amount to arrive through. `NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER` is **`secondary-only`** and
      says "inferred from statutory structure, not stated in terms" in the refusal message and in
      the caveat on every result. It is *not* a confidence downgrade on the computing path, because
      on that path it decides no number — the weakness is attached to the one route that has it.
    - **What franking does to the missing transfer balance cap — it widens the gap, it does not
      make it unbounded.** `superPhase.ts` lets a caller state any amount as Retirement Phase and
      every result says so; that caveat is merged through to here and a test asserts it survives.
      The earnings base is now the *grossed-up* distribution rather than the cash, so a mis-stated
      Retirement Phase balance costs `1/(1−r)` times as much — about **43% more at the 30% rate**.
      But it creates no new unbounded error, because the credit is refunded in full on **both**
      sides of the phase line (T46): the difference between the phases is the 15%, and only the
      15%. **P3-9 should size the gap on the grossed-up base, not the cash base.**
    - **Finding — register §5A has no records in `src/data/assumptions/` at all.** Nothing was
      re-declared to cover it. §5A.3's refundability rows, §5A.2's two corporate rates and §5A.6's
      O27 rule have no assumption leaf, so `explainAssumption` answers nothing for any of them and
      `SETTINGS_NOT_ASSUMPTIONS` has no entry for the effective franking rate that T43 and P3-22h
      both call a Setting. This chunk needed none of them as *figures* — the rate is deliberately
      an input and the refundability rules are rules — so nothing was invented to fill the hole.
      **P3-22 or the register pass should decide whether §5A gets a `franking.ts` assumptions
      module**, and if it does, the one figure that must go in it is the frozen $5,000 (T48), which
      is the individual side and is not needed here.
- [x] **P3-8** TTR: 4% min, 10% max, conversion on notification or age 65
  — ✅ **Ticked 2026-09-23 in the reconciliation pass. Every limb of the title is built and live:**
  the payment range (2026-09-09), conversion on notification (`TRIS_EARLY_CONVERSION`) and at 65
  (`trisConversionDayUnderItem106`), wired at `f602792` on 2026-09-22, and TTR payments with a dated
  rate change in three build steps on 2026-09-23 (`1be0a81`..`7c02ecf`). The conversion-limb box
  below still read "computationally BLOCKED" after its own BUILT child was ticked; flipped too.
  - [x] **The payment range — the minimum and the maximum a TRIS may pay in a year** — ✅ 2026-09-09.
    `core/ttrPaymentRange.ts`, on `docs/research/p3-minimum-drawdown-and-ttr.md` §3. **The 10%
    maximum is not in reg 1.06(9A) and not in Schedule 7**: it is a limb of the reg 6.01(2)
    *definition* of a transition to retirement income stream, para **(b)(ii)** — which is not where
    anyone would look, and the register cites it to nothing (D4).
    - **The asymmetry is real, and it is the whole item.** Sch 7 cl 3 pro-rates "the minimum total
      payment" and cl 5 rounds "an amount determined under **this Schedule**", so neither reaches a
      maximum determined under reg 6.01(2), and that regulation supplies no replacement. The
      maximum is **not pro-rated, not rounded to $10, not age-varying, not switched off by cl 4's
      1 June nil rule, and not subject to cl 1(2)(b)'s withdrawal-benefit substitution**. So **in a
      commencement year the floor drops and the ceiling does not move**: 1 Oct 2026, $500,000,
      age 61 → **$14,960 – $50,000**, against $20,000 – $50,000 in a full year. Commencing on or
      after 1 June → **nil – $50,000**, a whole year's ceiling available in sixteen days.
    - **The negatives are an argument from the absence of a provision (research pass U1)** —
      corroborated explicitly, three bullets, one per negative, by ATO guidance, with no competing
      reading found, and by nothing primary. So a new record `access.ttrMaximumUnadjusted` holds
      the *reading* at **`secondary-only`** while `ttrMaximumDrawdown` keeps the 10% at
      `primary-verified`, and **every** maximum consumes the reading — the number a ceiling reports
      *is* the unadjusted one, so there is no route where it is not load-bearing. A TTR range is
      therefore `secondary-only` even where its floor alone is `primary-verified`, and the
      route-specific caveats say which end the weakness is at. Would be closed by an ATO ruling or
      the Explanatory Statement to the 2005 regulation that inserted the definition; neither was
      retrieved.
    - **`access.ttrMinimumDrawdown` (a flat 4%) is deliberately left unconsumed**, and now carries
      a note saying so. A TRIS pulls in the **whole** of Schedule 7 through reg 6.01(2)(b)(i), so
      the floor is `minimumDrawdown(...)` — age-banded, pro-rated, rounded, nil for a June
      commencement. A second 4% would drift from the table and be wrong the moment a TRIS is held
      at 65. A test asserts nothing in `src/` imports it. **Correcting or removing the row is the
      register chunk (D2), and clearing the unconsumed-record list was not the goal** — a record
      consumed wrongly is worse than one not consumed at all.
    - **The four adjustments are kept out by having no route in.** No day count, no proportion, no
      denominator and no $10 step exists anywhere in the file, so pro-rating or rounding cannot be
      written without first importing the arithmetic to write it with; no date of birth and no
      `ageAt` is reachable from the ceiling; cl 4's date stays in `minimumDrawdown.ts` and this file
      learns a year was nil by reading the discriminated `nil: true` off the *minimum*; and the
      ceiling is taken of a separately branded `TrisAccountBalance` with **no withdrawal benefit on
      it**, minted through a helper whose parameter type excludes the substituted figure — the
      substitution written where a maintainer would naturally write it **does not compile**.
    - **Refuses rather than guessing.** `TrisConversionNotModelledError` for a Person who has met a
      nil-cashing Condition of Release by 30 June: reg 6.01(2)'s "unless" means they have **no
      maximum at all**, and returning one would cap a plan that is not capped. Both release grounds
      are permanent, so testing at the last day of the year settles the whole year without deciding
      *when* a conversion happened. Also `TrisNotCommencedError` and `TrisMaximumBalanceDateError`
      (each provision checks the balance day for itself — the two happen to name the same day, and
      that is checked twice rather than merged).
    - **Mutations applied to the source, run, counted and reverted** (none failed zero tests):
      pro-rating the maximum **4**; rounding it to the nearest $10 **3**; applying cl 4's 1 June nil
      to it **1**; the cl 1(2)(b) substitution reaching it **1** — and the same substitution written
      inside the minting helper is a **compile error**, not a failing test; a flat 4% floor **6**;
      an age-varying maximum **8** in its plausible form (scaled by the Schedule 7 band) and **6**
      as an arbitrary step inside the 60–64 window; hard-coding a *correct* `0.1` instead of reading
      the record **1**, caught by the canary asserting the only numeric literals in the module are
      `0` and the rational scale.
    - **The one thing no fixture can catch** is the maximum varying by age *in the abstract*: a TRIS
      holder has not met a nil-cashing Condition of Release, turning 65 meets one automatically, so
      every reachable age sits in Schedule 7's single 0–64 band. The age fixture is written as the
      invariance it is, and the defence against an age reaching the ceiling is structural.
  - [x] **The conversion limb** — ✅ **BUILT 2026-09-22 (`f602792`) — see the BUILT child below; the
    "BLOCKED" that follows is the 2026-09-09 state, kept as the record.** — **legally closed 2026-09-09, computationally BLOCKED.** The
    research is done: `docs/research/p3-transfer-balance-cap.md` §D and register §3.10.6.
    - **Both previously-missing sources were retrieved.** ITAA 1997 **s 307-70 contains no
      cessation rule at all** — it is a bare delegation to the regulations, so the old citation was
      simply wrong; the operative definition is ITAR (1997 Act) 2021 s 307-70.02(1) (**O58/U32**,
      still unfetched, now a one-line fetch). **TR 2013/5 was retrieved in full**, upgrading the
      retrospective mechanism from `secondary-only` to `ruling-verified` and adding two things the
      register never carried: the fund loses **ECPI for the whole year**, and the stream **dies
      permanently** — a breach forces commute-and-recommence, not merely a bad year.
    - **Correction against ourselves:** TR 2013/5 never addresses the **10% maximum**; its reasoning
      runs to the *minimum*. The application to a 10% breach stays `secondary-only` (**O61/U31**),
      and the register must not cite it otherwise.
    - **Two events, two days.** The 10% ceiling lapses on *satisfaction* of a nil-cashing condition;
      the phase changes on *notification*. Conditions **104 and 105(b)** switch the ceiling off
      **without** converting the phase — no maximum, still 15% fund tax, no transfer balance credit.
    - **Attaining 65 converts automatically, with no notification** — s 307-80(3)(b)(i) points at
      all four conditions while (b)(ii) points at only three. Label is `inference from an express
      enumeration`, ruling-corroborated. **R6: never record it as bare `primary-verified`.**
    - **BLOCKER — GONE 2026-09-10. R10 steps 1–3 are BUILT** (513 tests). `fundEarningsTax` takes a
      branded `PhaseYearFraction` (two **integers** + `coverage`, never divided — **T130**: a days
      split is not the law under either method, so no float exists for anyone to multiply earnings
      by) and charges a part-year at the **provable upper bound**, disclosed by a `basis` field and
      `chargedAs` read off the same `coverage` as the charge — so a bounded result cannot be
      returned silently. **$4,500.00 is structurally unreachable**: the charge is a total lookup
      over (phase × coverage), and dropping the coverage index **does not compile** (TS2538 ×2,
      TS2322 — I verified this myself, it is not a reported claim). `MidYearPhaseChangeError`
      survives, narrowed, firing only where a fraction was counted against a *different* FY —
      365-vs-366 would otherwise charge a whole year at 0%.
      **Step 4 BUILT 2026-09-10, and O69 is RESOLVED by ruling R11** — an SMSF/APRA discriminant
      `fund?: FundType` **on the interest**, absent by default (no `smsf` default: that would
      silently decide which refusals apply). New module `src/core/ecpiMethod.ts` dispatches on fund
      type through a two-cell total lookup **before any ECPI question is asked**, so
      `SegregatedEcpiNotModelledError` and `EcpiMethodNotStatedError` are **unreachable on an APRA
      interest** — the APRA branch contains no `throw` at all. `FundTypeNotStatedError` covers the
      needed-and-missing case. **No existing caller changed.**
      - ⚠️ **The forcing function I was relying on did not exist.** §3.11.9 opened by saying
        `test/refusal-names.test.mjs` read it; the test parsed **§3.10.8 only**, so §3.11.9's Status
        column was enforced by nothing — the "recorded and consumed by nothing" defect *inside the
        test built to prevent it*. Now reads both tables. **Assume other cross-references claiming
        enforcement are unverified until checked.**
      - Two weaknesses reported, not patched: the consumer-side `?? 'smsf'` default was caught by
        only **1** test until a canary was added, and the **discriminant-on-the-Person mutation is
        caught by source canaries, not behaviour** — `heldInFund` copies the release per interest,
        so the two-interests-one-Person fixture still passes. Two honest weak spots reported, not patched: the provenance
      mutation is caught only by source greps (both rate records are `primary-verified` and
      unstamped, so the object is byte-identical either way), and the float-comparison mutation
      passes every numeric fixture because `n/n === 1` is exact.
    - *(Superseded note, kept as the record:)* **RESOLVED 2026-09-10, was gated on a build not on research.** O60 is closed and
      its premise was false: s 295-390 had been retrieved on 2026-09-04 (**O70**). Register
      **§3.11** now carries the answer — **there is no apportionment of a part-year** — and ruling
      **R10** narrows `MidYearPhaseChangeError` rather than lifting it: the conversion year computes
      at the **provable upper bound** (15% on everything), disclosed by name. **R10 steps 1–3 are
      buildable now; step 4's refusals are gated on O69**, the SMSF/APRA discriminant, which is
      **not ruled**. Beware the naive repair — deleting the guard and honouring the stated phase
      returns **$4,500.00** against a statutory **$7,569.86**, landing on the flattering extreme.
    - **O65 open:** the retire-without-notifying-then-turn-65 overlap. Paragraph (b) is a
      **disjunction**, so a member who retired on item 101 and never notified satisfies limb (b)(ii)
      on its own terms and turning 65 adds a fourth condition without un-satisfying it. Recorded,
      **not** resolved by preference. T117's fixture must state that no item 101/102A/103 was
      satisfied before the birthday.
    - ✅ **THE EARLY OVERRIDE BUILT 2026-09-22, and O65 is SIDESTEPPED rather than closed.** The
      user's ruling (recorded against P3-42, restated here because this is the sub-item it
      unblocks) narrowed the scope twice: first to *"never assume — a stated date, the same shape
      as `RETIRE`"*, then, the same day, to R13's own words restated — *"preservation age to 64,
      user advises the move to account based, else auto happens at 65"* — which is R13 (2026-09-16,
      `c2bbb4e`) confirmed, not overturned. **The silent case — no entry — is untouched**: a
      household that says nothing still converts automatically at 65 under the EXISTING, ALREADY
      BUILT `trisConversionDayUnderItem106` (this file, chunk 5b-3), which this build did not read,
      import or modify. **What is new is a narrow EARLY override**: `TRIS_EARLY_CONVERSION`
      (`plan.ts`), a dated entry naming one Person's TTR interest by `interestIndex`, honoured only
      when the entry's own `date` — RETIRE's and MORTGAGE_TARGET's idiom, no second date field — is
      **strictly before** that Person's 65th birthday. On or after is refused at the door, by name,
      including the birthday itself: R13's own boundary treats a stated day EQUAL to the automatic
      day as agreement (`>`, not `>=`), because on R13's question the two readings name the same
      day, but this entry asks a different question — is this genuinely EARLY — and the answer on
      the birthday itself is no, so the door's boundary (`checkTrisEarlyConversionTargets`,
      `parsePlan.ts`) is one comparison stricter (`>=`) for a reason particular to what THIS entry
      claims, not a disagreement with R13.
      - **O65 is sidestepped structurally, not resolved.** `trisInterest.ts`'s whole design is a
        routing decision made by reading a Condition of Release's `.grounds`, which is what O65's
        non-resolution actually is. The new pure routing function, `trisEarlyConversion.ts` (a
        SEPARATE file beside `trisInterest.ts`, not folded into it — mixing an early, grounds-blind
        override into the file whose entire point is the grounds-based routing decision would risk
        that boundary), never reads `.grounds` and never imports `trisInterestOrRefuse` or
        `trisConversionDayUnderItem106` — pinned by a source tripwire
        (`test/core-tris-early-conversion.test.mjs`), mutation-tested by reading `.grounds` and by
        importing `trisConversionDayUnderItem106`, both caught. A user who states their own early
        conversion day has made O65's routing decision themselves; the function goes straight to
        `retirementPhaseInterest` (through its existing gate — a preserved benefit or a declared
        reversionary beneficiary still refuse exactly as they do everywhere else — not around it).
      - **Built as a tested, PURE, UNWIRED unit, on `SUPER_CONTRIBUTION`'s own precedent
        (P6-8 brief 1).** `TRIS_EARLY_CONVERSION` is constructible and fully door-checked
        (`checkTrisEarlyConversionTargets`: owner must be a Person, the named interest must exist
        and be stated `phase: 'ttr'`, the date must clear the boundary above) and sits in
        `planEdits.ENTRY_TYPES_NOT_YET_WALKED` — **`projection.ts` was not touched and has no
        branch for it.** Wiring a live projection to read this entry (and, separately, wiring the
        existing silent-case backstop into the walk at all — a prerequisite for P3-42) is explicit,
        later, follow-on work, not done here.
      - **Ripple, because this is the first row concept.md's Entry types table has gained since the
        project's scaffold** (every type before it was already named there and only gained params
        later): the table went 19 rows → 20, `ENTRY_TYPES.length` with it, and every count derived
        from it moved in step (`core-plan.test.mjs`, `core-parse-plan.test.mjs`,
        `app-entry-form.test.mjs`, `app-plan-edits.test.mjs`). README's counts are untouched — this
        type is neither offered nor unspecified, so neither number it states moved.
      - **Mutations applied to the source, run, counted and reverted** (each caught): the `>=`
        boundary relaxed to R13's own `>` (door test fails on the birthday-itself case); the TTR
        phase gate removed entirely (door test fails); an out-of-range `interestIndex` accepted by
        skipping its own check — **does NOT compile** (TS18048/TS2532 under `noUncheckedIndexedAccess`,
        the same compile-forced defence `LUMP_SUM_FROM_SUPER` already relies on, not merely a test);
        the routing function reading `release.grounds` (source-pin test fails); the routing function
        importing `trisConversionDayUnderItem106` (source-pin test fails).
      - Two commits: `369d00c` (the entry type, its door checks, and the ripple) and `cc81569`
        (the pure routing function and its tripwire). 2137 → 2154 tests, 0 failures at either
        commit (6 pre-existing, unrelated cancellations in `origin-provider.test.mjs`'s server
        harness, reproduced on a clean checkout before this work began).
      - 🟢 **GATE: GO — 2026-09-22 (LIZ), claims verified independently, not taken on the
        agent's word.** Covers wiring BOTH triggers — the early entry above and R13's existing
        automatic-65 backstop — into a live `project()` walk, so `SuperInterest.phase` actually
        flips instead of sitting static for the whole forecast.
        - **A Person's Condition of Release is already derivable live, confirmed by
          `grep -n "conditionOfRelease(" src/core/projection.ts`** — called at line 2821 and three
          more sites for the `LUMP_SUM_FROM_SUPER` path. No third hidden prerequisite.
        - **The two triggers cannot collide.** The early entry is refused at the door for any date
          on-or-after the 65th birthday (`parsePlan.ts:1279`); the automatic backstop only ever
          fires exactly ON that birthday. They can never name the same month for the same interest
          — no runtime tie-break needed, confirmed structural.
        - ⚠️ **The transfer-balance-cap credit (O57) is CONFIRMED separate and stays untouched.**
          Read O57's own register entry in full: it names FOUR blockers (no entry commences a
          pension from cold, no debit path, cap-seeding fails past the published index, no input
          channel) and concludes "no reachable arithmetic behind it" — a different module
          (`transferBalanceAccount.ts`) that none of the phase-flip call sites touch. This item
          makes P3-42's future tax-rate work MORE ACCURATE for a household whose TTR genuinely
          converts; it does not unblock P3-42 and P3-42 does not require it.
        - ⚠️ **CORRECTION, found by checking rather than trusting the gate's own count: neither
          `fundEarningsTax` NOR `ttrPaymentRange` is called anywhere in `src/` today — confirmed
          `ttrPaymentRange` has ZERO hits including itself, weaker than the gate's own "one hit
          each."** So this wiring's real-world effect today is on the MEANS TEST'S REASON STRING
          and the MINIMUM-DRAWDOWN gate only — not yet on any tax rate or payment ceiling, since
          neither of those is a live consumer of phase yet.
        - **A concrete, verified fixture regression, not a hypothetical one.** Confirmed directly:
          `test/core-projection-pension-drawdown.test.mjs`'s Kim (born 1962-05-10) walks from
          2026-07-01 to age 66, so she turns 65 on 2027-05-10, INSIDE the window. Her TTR fixture
          asserts `PENSION_MINIMUM_LINE` is `[]` for the WHOLE walk — once wired, this goes red
          from 2027-05 on, because that is the defect this item exists to fix. Audit the other
          files holding `phase: 'ttr'` fixtures for the same exposure before merging.
        - **RULED BY LIZ on precedent, not escalated — both of the gate's open questions are
          already this project's standing practice, not new decisions.** (1) Ship as a straight
          correctness fix, disclosed plainly: matches how every other named defect here has been
          handled, and it only ever makes a forecast more accurate. (2) Keep the new hard-stop for
          a household who stated a notification-based retirement rather than relying on turning
          65: matches "refuse rather than guess wrong" everywhere else in this codebase, AND —
          checked, not assumed — that input has no UI construction path today at all (only ever
          reachable from a hand-built test fixture), so no real user's plan can hit it yet.
        - **Build order:** (1) resolve a per-interest `conversionDay` = the early override if a
          matching `TRIS_EARLY_CONVERSION` entry validates, else `trisConversionDayUnderItem106`,
          carried as a level exactly like `retiredOn`. (2) replace each `interest.phase` read
          (~11 sites: contribution-destination gate, `isAccountBasedPension` filters, minimum-
          drawdown gates, `accessibleWealth`, `superLumpSum.ts`'s phase-keyed gates, the means-
          test treatment) with an `effectivePhaseFor(personIndex, slot, date)` helper, fixture-
          verifying each site named above. (3) re-derive Kim's fixture and audit every other
          `phase: 'ttr'` fixture in `test/` for the same 65th-birthday exposure before merging.
      - [x] **BUILT — ✅ 2026-09-22 (`f602792`).** `SuperInterest.phase` now actually flips inside a
        live `project()` walk. Both triggers wired: a validating `TRIS_EARLY_CONVERSION` entry's
        `date` IS the conversion day, taken as given (the entry's own pure function,
        `trisEarlyConversion.ts`, is deliberately never called — nothing here needed it, since the
        walk only ever needed the DAY, not a constructed `RetirementPhaseInterest`); a silent
        household falls to R13's automatic-65 backstop, `trisConversionDayUnderItem106`, called and
        unchanged. Neither `trisEarlyConversion.ts` nor `trisConversionDay.ts` was edited.
        - **`conversionDay` is resolved directly off `entries`, keyed by `(personIndex, slot)` —
          NOT through the `standing`/`carried` levels machinery `RETIRE` and `WORK_PATTERN_CHANGE`
          share.** That machinery dedupes a pre-dated level by `type \0 owner` alone, which is
          correct where a later entry SUPERSEDES an earlier one of the same kind — the wrong rule
          here, since two different interests of the SAME Person may each carry an independent
          conversion day, and deduping by owner would silently drop one in favour of the other (the
          P4-12 shape this build refuses everywhere else). Pinned by a new test (§3 below).
        - **`effectivePhaseFor(personIndex, slot, date)` is the one place `SuperInterest.phase` is
          resolved for a month**, closed over `household` and `conversionDay` inside `project()`.
          Every direct `.phase` read it reaches was replaced: `isAccountBasedPension`'s three
          in-loop call sites (the year's minimum determination, the month's claims, the June
          floor sweep) and `superLumpSum.ts`'s three phase-keyed call sites
          (`releasedSuperannuationOffer`, `superLumpSumWithdrawal` twice — the entry-driven
          withdrawal and limb 5's allocated draw).
        - **The means-test reason and `accessibleWealth`'s gate are fixed a DIFFERENT way, and
          `household.ts` was never touched.** `withBalances` (the one function that already builds
          the Household `splitAssets` and `accessibleWealthByPerson` are handed inside the walk)
          gained a SIXTH, OPTIONAL substitution: a `(personIndex, slot) => phase` callback. Supplied
          only at `project()`'s own two call sites, bound to that month's `date`. Absent — every
          existing caller of `withBalances`, direct or through a fixture — behaviour is unchanged to
          the byte. This is how the CORRECTION the gate itself found (fee/growth/sacrifice/guarantee
          LINE LABELS still read the STATED phase, deliberately, since none of those four is a live
          consumer of phase yet either) stays true: labels are read off the raw `household`, never
          off the phase-substituted one.
        - **`unfundedMiddleLimbs` (the note-only NIL fallback) was NOT given a `date` parameter.**
          It reads whatever phase the `Household` object it is HANDED states — unchanged, and still
          correct, because both its callers (`accountBasedPensionMinimumLimb`,
          `nonSuperPortfolioLimb`) are already fed the phase-substituted `householdThisMonth`. A
          direct test caller of `unfundedMiddleLimbs` itself (several exist,
          `test/core-projection-pension-drawdown.test.mjs` among them) still sees the STATED phase,
          which is correct for a function with no notion of "this month".
        - **The 65th-birthday boundary is enforced ONLY at the door, confirmed rather than assumed**
          (mutation (c) below): the walk adds no redundant re-check of its own, on
          `LUMP_SUM_FROM_SUPER`'s own precedent for which checks a direct caller is on their own
          for. A new test bypasses `parsePlan` entirely and shows the walk does not throw on a
          late-stated day — it simply converts on the (nonsensical, were a door involved) later day.
        - **Three existing fixtures were exposed and re-derived by hand — figures below, not
          pasted from a run.**
          1. `test/core-projection-pension-drawdown.test.mjs`'s Kim (born 1962-05-10, $800,000 TTR,
             `commencementDay: '2024-07-01'`) walks 2026-07 → 2028-05 (23 months) and turns 65 on
             2027-05-10, inside it. `PENSION_MINIMUM_LINE` is no longer `[]` for the whole walk.
             **The gate's own text said "goes red from 2027-05 on" — checked against the code
             rather than trusted, and it is one financial year later than that, for a reason the
             gate did not trace: `schedule7RelevantDay(FY2026-27, '2024-07-01')` = 2026-07-01, and
             the determination for a financial year only ever fires in the WALK MONTH that day
             falls in. By the time Kim's interest is actually an Account-Based Pension (from
             2027-06 — `date` is a month's FIRST day, so the birthday itself, 2027-05-10, is not
             visible until the following month), FY2026-27's one determination month (2026-07) has
             already passed, and the interest was still a TTR when it ran. So FY2026-27 draws
             NOTHING — twelve months of full shortfall, the interest growing untouched — and
             determination only succeeds when FY2027-28 opens: `schedule7RelevantDay(FY2027-28,
             '2024-07-01')` = 2027-07-01, matching month 2027-07 exactly. From there the SIS Reg
             minimum is a FLOOR and not what sets the monthly figure — `pensionAvailableThisMonth`
             offers the whole (now much larger, a year's untouched 6.5% growth) balance, and every
             month draws exactly the household's need: `SPEND`'s $60,000.01/year ÷ 12 is
             `Math.ceil(6_000_001 / 12)` = 500,001 cents, unmoved by cpi 0. The walk ends 2028-05,
             before FY2027-28's own June 2028 close, so no year-end sweep ever fires and every one
             of the eleven months from 2027-07 to 2028-05 reads the same figure:
             `[500_001, 500_001, 500_001, 500_001, 500_001, 500_001, 500_001, 500_001, 500_001,
             500_001, 500_001]`. Independently confirmed against the actual walk after the fact,
             not derived from it.
          2. `test/core-lump-sum-from-super.test.mjs`'s Kit ("WHICH interest: the entry names one,
             and the other is not touched") held two TTR interests at date of birth 1960-01-15 —
             already 66 at the walk's own `asAtDate`, so both interests would have auto-converted
             years before the walk starts, and `superLumpSumWithdrawal` refuses a payment out of a
             retirement-phase stream outright. Not a numeric re-derivation: the fixture's PREMISE
             (a genuine, still-TTR interest) was impossible once wired. Date of birth moved to
             1962-03-01 (64 at `asAtDate`, turns 65 on 2027-03-01, after every month the test
             reads), and a `RETIRE` entry (2024-01-01, well past Preservation Age) added — Kit's
             benefit access was previously supplied by the automatic-65 ground the DOB change
             removes, so it needed a different ground, unrelated to the ground this test is about.
          3. `test/core-waterfall-released-super.test.mjs`'s Di ("AN ACCOUNT-BASED PENSION IS
             LIMB 2'S, and a TRIS is nobody's") held an Account-Based Pension AND a TTR at date of
             birth 1955-02-02 — 71 at `asAtDate`, the same defect as Kit's. Date of birth moved to
             1964-02-02 (62 at `asAtDate`, turns 65 on 2029-02-02, after every month the test
             reads); no `RETIRE` needed here since the assertions never touch benefit-access-gated
             money, only `releasedSuperannuationOffer`'s NOTE text for the still-genuinely-TTR
             interest.
        - **Audited and confirmed UNEXPOSED, structurally rather than merely by re-running the
          suite green:** `test/core-division293-release.test.mjs` and
          `test/core-age-pension-mutations.test.mjs` both hold a stated TTR interest and never
          import `project()` at all (the second calls `agePensionEntitlement` — and so `splitAssets`
          — directly, on the raw, un-substituted Household) — categorically unreachable by this
          build, not merely untouched by coincidence. `test/core-household.test.mjs` and
          `test/core-tris-conversion-credit.test.mjs` likewise never call `project()`.
          `test/core-projection-growth-lines.test.mjs`'s Sam (DOB 1964-03-02, crosses 65 in 2029,
          inside that file's horizon-70 walk) and `test/core-lump-sum-from-super.test.mjs`'s
          KIT_AND_ROBIN's Robin (DOB 1965-06-10, crosses 65 in 2030-06, inside that fixture's
          60-month walk) ARE structurally exposed — `conversionDay` genuinely resolves for both —
          but neither file's assertions move: Sam's are all read in the walk's first two months,
          long before conversion; Robin's benefit access is already met for the whole walk (retired
          2025-08, before Preservation Age's ground even needs the automatic one), so
          `accessibleWealth`'s `interest.phase === 'accountBasedPension' || released` was already
          `true` throughout via the `released` half, both before and after this build.
        - **`test/core-projection-tris-conversion.test.mjs` is new**, four tests: the early
          override live (a full walk split into a six-month shortfall half and a three-month funded
          half either side of the stated day), the automatic backstop live (the same split, driven
          by nothing but a date of birth), two TTR interests of one Person resolving independently
          (a $50,000.00 monthly need split $30,000.00 / $20,000.00 across two $30,000 balances —
          proof that BOTH conversions took effect, not just one), and the door-vs-walk boundary
          proof.
        - **Mutations applied to the source, run, counted and reverted, each caught:**
          (a) `effectivePhaseFor` returning the stated phase unconditionally (conversion day
          resolved, never applied) — 2148 → 2147 pass, 5 fail (Kim's fixture and all four new
          tests; Kit's and Di's fixtures do NOT catch it, because under this mutation their
          interests stay genuinely TTR forever, which is exactly their fixed premise — expected,
          not a gap). (b) `effectivePhaseFor` returning `'accountBasedPension'` for every TTR
          unconditionally, ignoring `conversionDay` and the month — 2148 → 2141 pass, 11 fail
          (every fixture holding an interest that starts already stated as something else, or
          never converts within its walk, moves). (c) `parsePlan.ts`'s `>=` 65th-birthday boundary
          check disabled — 2148 → 2150 pass, 2 fail, and BOTH are `core-parse-plan.test.mjs`'s own
          door tests (`checkTrisEarlyConversionTargets`'s `on the 65th birthday itself` and `after`
          cases); the new door-vs-walk test does NOT fail, confirming the door is what protects the
          boundary and the walk holds no redundant copy of the check.
        - **2154 → 2158 tests** (four new, §3 above; 2148 → 2152 pass at every commit, the same 6
          pre-existing `origin-provider.test.mjs` cancellations throughout, reproduced on a clean
          checkout before this work began). One commit (`f602792`): the wiring, the three
          re-derived fixtures, the new test file, and `planEdits.ts`'s superseded doc paragraph and
          `app-entry-form.test.mjs`'s `PARTIALLY_WALKED` update together — none is separable from
          the others without an intermediate red commit.
        - **`TRIS_EARLY_CONVERSION` stays in `ENTRY_TYPES_NOT_YET_WALKED`, on purpose, for a NEW,
          THIRD reason the array's own name does not describe.** The walk honours the entry WHOLE
          now — this is not "half a branch" in `SUPER_CONTRIBUTION`'s old sense. What is still
          missing is a FORM BUILDER: `entryForm.ts` offers no control for `interestIndex` or a
          conversion day for this type, so `OFFERED_ENTRY_TYPES` cannot move without also shipping
          one, which is separate, later, app-layer work — not part of this item's core wiring, and
          not attempted here. `test/app-entry-form.test.mjs`'s `PARTIALLY_WALKED` names it and
          spells out why, on that test's own "widen it by one more name only with the same kind of
          paragraph" instruction.
        - **What was refused: nothing.** No collision path was found between the two triggers (the
          new test tried the two boundary cases the brief named and both resolved cleanly, no
          throw); no mutation went uncaught; the household with a stated notification-based
          retirement that `trisConversionDayUnderItem106` refuses outright remains refused, exactly
          as ruled acceptable — no real plan can construct that input today (no UI path), and no
          workaround was added.
  - [x] **TTR income-stream payments, build step 1 of 3 (engine only)** — ✅ 2026-09-23. A
    commenced, unconverted TTR now PAYS. Until today it sat in the walk paying nothing until it
    converted, and `ttrPaymentRange.ts` computed a range nothing called. Steps 2 and 3 (UI, and a
    new Entry type) are not started.
    - **The year's figure** is `ttrAnnualPayment` (`projection.ts`): max(stated rate × relevant-day
      balance, Sch 7 minimum), capped at `ttrAnnualCeiling`. That is `ttrPaymentRange.ts`'s own
      unadjusted 10%, newly exported on its own, because `ttrPaymentRange()` refuses any year in
      which the Person meets a Condition of Release, and a TTR converting at 65 mid-year is exactly
      such a year. The rate is `StatedStreamSettings.statedTtrDrawdownRate`, optional; absent means
      the minimum. **RULING:** in the commencement year the rate is pro-rated by days exactly as cl 3
      pro-rates the minimum. Neither cl 4's June nil nor cl 5's $10 rounding touches it; the product
      is rounded once, to the cent, and the ceiling is never pro-rated. With a door-validated rate
      the cap cannot bind, so it is defended by a direct `project()` caller stating 15%.
    - **Paid** as `TTR_PAYMENT_LINE`: a twelfth (`monthlyFromAnnual`) each month and the remainder in
      June, so the year sums exactly. It sits before `received`, so limb 1 spends it, and its balance
      is written back at once on the stated lump sum's precedent. It is the third member of
      `INCOME_FROM_SUPER_LINES` and a member of `INTERNAL_TRANSFER_LINES`. Provenance:
      `'not carried'` under a new `'transition to retirement income stream'` register. Attribution:
      `NO_STATING_ENTRY.ttrPayment`.
    - **RULING, the carry-across:** it is the same stream in law, so it is the same year. The TTR is
      determined into the SAME `pensionYears` slot, and that sharing IS the carry-across: after
      conversion limb 2 finds the year already determined, draws it, and June sweeps what is left. A
      fresh year starts the next 1 July. The determination block moved above `received` so a TTR
      can be paid in its own determination month. Nothing else moved: the Account-Based Pension
      figures are unchanged to the byte (every demo digest is green), because no lump sum can touch
      an Account-Based Pension.
    - **RULING, refused below 60:** `TtrPaymentBelowTaxFreeAgeError` (`superLumpSum.ts`,
      register §3.9), modelled on the lump-sum refusal and sharing its taxed-source sentence.
      **Found while building:** the first version asked the age on the month's first day, which
      refused a lawful stream commencing mid-month on the 60th birthday. It now asks on the later
      of that day and the commencement day.
    - **RULING, refused at the door with no date:** `parsePlan` refuses a `'ttr'` interest with no
      `statedStreamSettings` by path. It also refuses a rate outside [Sch 7's lowest factor,
      `ttrMaximumDrawdown`] and a rate on a non-TTR interest. A direct `project()` caller still gets
      silence, on the account-based pension precedent. **Fixtures this broke, each fixed by stating
      a day (2028-05-14, Dana's 60th birthday):** `core-parse-plan.test.mjs`'s accumulation-target
      loop and `withDanaInTris` (nine tests), and `app-settings-panel.test.mjs`'s option-list test.
      ⚠️ **The settings panel could not be fixed by stating a day, which is a real UI finding:** the
      household editor offers `ttr` but has no commencement-day box, and `planWithStatedPosition`
      carries `statedStreamSettings` over from the plan's existing interest. So a TTR chosen in the
      UI on an interest with no stated day is refused at save. Step 2 must add the box.
    - **Re-derived, not pasted. Kim** (`core-projection-pension-drawdown`, $800,000 at 64, commenced
      2024-07-01): predicted 11 × $2,666.67 (4% × $800,000 = $32,000 ÷ 12) for 2026-07..2027-05, each
      FY2026-27 shortfall down by the same amount ($5,000.01 → $2,333.34), and a 2027-06 draw from
      the carry-across. **All three matched on the first run.** The 2027-06 draw is the whole
      $5,000.01 need through limb 2, not a TTR twelfth, because a converted stream is drawn to need.
      That left no June sweep, since need exceeded the $2,666.63 remaining. **No other walk figure
      in the suite moved.** Every other `'ttr'` fixture either has no stream settings or has not
      commenced before it converts. The rest of the red was structural:
      `StatedStreamSettings` member-list and count pins (`core-household` ×2,
      `core-tris-conversion-day`'s T117 tripwire, 5 → 6, not a T117 field) and the register's
      refusal-name sweep.
    - **Mutations, full suite each** (baseline 1 pre-existing fail from the settings test
      above, since fixed, plus 6 origin-provider cancels): (a) cap dropped — 1; (b) no start-year
      pro-rate — 2; (c) carry-across disabled — 2 as first written, but one was an artefact (it also
      cleared a year Nat's stream determined *as* an Account-Based Pension). Narrowed to drop only
      a TTR-determined year it killed 1 (Kim), so a second fixture was added (Jo, converting
      1 January, spending nothing, so only the June sweep can pay the carried $20,000.02). Now 2.
      (d) TTR line out of `INCOME_FROM_SUPER_LINES` — **does not compile** (TS2345:
      `superPaymentDescription` is typed by that tuple); the runtime variant, filtering it out of
      the `incomeFromSuper` set, killed 2. (e) under-60 refusal removed — 1.
    - **2309 → 2324 tests** (11 in the new `core-projection-ttr-payment.test.mjs`, 4 door tests in
      `core-parse-plan` §16): 2318 pass, 0 fail, 6 cancelled — the origin-provider harness, which is
      the dev server on 4173 and not a failure.
  - [x] **TTR build step 2 of 3 (the on-screen inputs)** — ✅ 2026-09-23. Closes step 1's
    regression: choosing `ttr` on the household editor for an interest with no stated day was
    refused at save. Step 3 (a new Entry type) is not started.
    - **Two boxes on every super interest row, SHOWN only for `ttr`**: Start date (required) and
      Yearly drawdown rate (%) (optional; the note beside it says blank pays the legal minimum).
      Hidden rather than left out, so a phase switched away and back keeps what was typed.
      `ttrStreamBoxesShown` is one predicate for both the show/hide and the builder, so a hidden
      box never writes.
    - **The rate box is a PERCENTAGE** (6 is 6%), unlike this page's other rate boxes, which are
      decimals. The brief asked for percent and 4-10 is how a fund quotes it. The file still holds the
      fraction; `fractionAsPercent` uses `toPrecision(12)` so 0.07 reads back as `7`, not
      `7.000000000000001`.
    - **Nothing in `statedStreamSettings` is dropped.** For a `ttr` interest the held object is
      spread first and the two boxes laid over it. The rate box is the rate's one writer, so an
      emptied box removes the key. For any other phase the held object is carried less the rate,
      which the door refuses off a TTR. Without that, a TTR switched to an account-based pension
      could not be saved, and no box on screen could fix it.
    - **Errors are said beside the box before any save**: `ttrBoxObjections`, using the door's own
      `TTR_RATE_FLOOR`/`TTR_RATE_CEILING` (now exported), and a sweep 3.0-11.0% asserts that the form
      and the door agree on every tenth. **No PUT happens on a refusal**; checked on the page (0 PUTs).
    - ~~**Found, not fixed:** a salaried Person whose ONLY account is switched to `ttr` passes the door
      and is refused by the WALK (the Guarantee has no accumulation interest to go to). That refusal's
      sentence names `superInterests`. It is the engine's rule, and the fix is a second account, but
      the sentence is not plain English on this page.~~ **Fixed 2026-09-23:** `ttrPhaseObjection`
      asks the same rule of the boxes as typed (a TTR account, a salary above nil, and no
      accumulation account). At save it puts "Your employer's super needs an accumulation account to
      go into. Add one before switching this account to TTR." beside the phase box, and saves
      nothing. A test checks the objected plan passes the door and the walk refuses it, and that the
      control with a second account walks. On the page: the sentence appeared beside Dana's phase and
      the scratch plan file was byte-identical. ~~The rule does not cover a salaried Person with only an
      account-based pension, because the wording is about switching to TTR.~~ **Widened 2026-09-23:**
      renamed `employerAccountObjection`; it now objects to ANY non-accumulation account of a salaried
      Person with no accumulation account, with its own sentence for an account-based pension. A new
      test checks that the walk refuses that plan too. Mutation: reverting to the TTR-only rule turns
      the new test red. 2342 → 2344 tests: 2338 pass, 0 fail, 6 cancelled (origin-provider on 4173).
    - **Two ratchets moved, with reasons written at each:** `core-household`'s carrier-reader list
      now includes `app/planEdits.ts`. It reads exactly `commencementDay` and
      `statedTtrDrawdownRate`, and both map absence to an empty box. `app-entry-form`'s
      planEdits import list gained the type-only `../core/household.js`.
    - **Mutations, apply/diff/count/restore by cp:** (a) rate box does not write through — 5;
      (b) save drops the other stream-settings fields — 1; (c1) the shared predicate shows the boxes
      for accumulation — 27; (c2) the panel alone shows them for accumulation — 1.
    - **Page:** on a scratch origin provider, Dana got a second account set to `ttr`, with 12% and no
      date. The save was refused beside both boxes and nothing was written. With 2028-05-14 and 6%
      it saved, and the boxes read back `ttr`/`2028-05-14`/`6`. Income from super, future dollars:
      2028-05 $1,866.93 = TTR $72.83 + Ash $1,794.10; 2028-07 $1,897.01 = $556.80 + $1,340.21.
    - **2324 → 2329 tests**: 2323 pass, 0 fail, 6 cancelled (origin-provider on 4173; 6/6 pass alone).
  - [x] **TTR build step 3 of 3: a dated change of rate (`TTR_RATE_CHANGE`)** — ✅ 2026-09-23. A
    new Entry type (the third row ever ADDED to concept.md's table): person, `interestIndex`, and a
    `drawdownRate` between the door's own `TTR_RATE_FLOOR`/`CEILING`. It governs from its month until
    replaced; before any entry the stated setting governs. Offered on "Change the plan" as "Change
    how much a transition to retirement pension pays", with a percent box like the household editor's.
    - **Timing rule: a change mid-year RE-SETS THE REST OF THAT YEAR; it does not wait for 1 July.**
      SIS Reg Sch 7 cl 1-2 fix the MINIMUM on the relevant day, and reg 6.01(2) (TTR definition, para
      (b)(ii)) fixes the MAXIMUM, 10% of that day's balance. reg 1.06(9A)(a) floors only the year's
      TOTAL. Nothing fixes the amount chosen between them, so the member may vary it. The year is
      re-priced from the change month: `amount − old share of days left + new rate × days left`
      (`ttrAnnualPaymentRevised`). It is floored at the minimum and at what is already paid, and
      capped at 10% on the YEAR'S total. What is left is spread evenly over the months to June.
    - **Per interest, not per Person.** Resolved off `entries`, keyed by (Person, interest), the
      `TRIS_EARLY_CONVERSION` way. Not through the `standing` levels, which keep one pre-dated entry
      per type+owner.
    - **Refusals, two tiers:** the door refuses a non-TTR interest, a household owner, a missing
      account, and a date on or after the 65th birthday. The walk refuses a date on or after THIS
      scenario's conversion day, because a `TRIS_EARLY_CONVERSION` belongs to one scenario.
    - **Mutations, apply/diff/count/restore by cp:** (a) resolved through the shared levels — 1;
      (b) change ignored — 5; (c) the 10% cap measured per month — 3 (1 new, and 2 step-1 tests
      whose June sweep exceeds a twelfth). A first (b) that did not compile was re-run.
    - **Page:** on a scratch provider, the demo plus a TTR account for Dana ($100,000, started
      2028-06-01). Added 10% from 2030-01-01 through the form. With Ash present, "Income from super"
      did NOT move, and that is correct: the TTR line went from $383.33 to $952.68 and Ash's
      pension, drawn to need, fell by the same amount. With Dana alone it moved from 2030-01, from
      $353.04 to $877.41 in today's money, and 2029-12 did not change.
    - **2329 → 2342 tests**: 2336 pass, 0 fail, 6 cancelled (origin-provider on 4173).
- [ ] **P3-9** Transfer balance cap: credits, proportional indexation, **highest-ever** tracking
  - ⬜ **Open box CONFIRMED CORRECT 2026-09-23 (reconciliation pass).** Every child is ticked, but the
    parent's own verb is *tracking*, and nothing tracks: `transferBalanceAccount.ts` is built and
    tested and `projection.ts` does not import it. The walk's cap test is one comparison on the
    conversion day — see "OPEN — no transfer balance account is kept" in the retirement-switch
    section below (O57 stands).
  - [x] **Research — ✅ 2026-09-09**, `docs/research/p3-transfer-balance-cap.md` (4,379 lines) and
    register **§3.10**. Four parallel passes over ITAA 1997 Div 294 and s 307-80, consolidated:
    verbatim primary text, four analysis sections, three reconciliations, **U9–U33 / T58–T125 /
    O40–O65**, and a §7 fetch log of **77 successes and 29 distinct failures** with true absences
    separated from malformed requests. Nine user rulings **R1–R9** in
    `docs/research/p3-9-chunks/RULINGS.md`.
    - **The account is a transaction ledger valued at commencement, not a balance.** Earnings create
      **no credit**; a drawdown creates **no debit**. A pension started at $1.6m and now worth $900k
      still carries a $1.6m transfer balance and zero headroom. The two negatives are **not equally
      strong** and must not be collapsed: the drawdown negative is definitional via s 307-65(1); the
      earnings negative is an argument from the absence of a table item.
    - **Two caps.** s 294-35(1) seeds the *personal* cap once from the general cap in the year the
      account starts; s 294-35(2) then carries last year's personal cap forward and **never re-reads
      the general cap**. A Person seeded at $1.6m in FY2017-18 still has a $1,600,000 cap today.
      Reading today's general cap for an existing retiree is simply wrong.
    - **Highest-ever tracking is a dollar high-water mark, not a proportion** — end-of-day, never
      reduced by a later debit, earliest of tied days, written only on a *strict* increase.
    - **$2,100,000 confirmed and upgraded.** The conflicting "$2 million" line was a stale orphan.
      The ABS CPI series was retrieved and the same arithmetic reproduces **all nine** published caps
      2018-19 → 2026-27, which **closes O11** and re-sources the §3.1 row that had cited s 294-35(3)
      (a provision containing $1.6m, not $2.1m).
  - [x] **Build — chunks 1-4, 5a, 5b and 6 are ALL DONE (2026-09-15 → 2026-09-16).** *(This bullet
    read "5b remains and is BLOCKED" until 2026-09-16; before that, "**Build** — not started", by which time nine
    build commits and five mutation batteries had landed under it. Kept and dated rather than
    rewritten: a status line that lags the code by nine commits is the defect this project keeps
    finding in its own prose, and the spec paragraph below it was never wrong.)* **P3-9 is NOT
    complete.** Spec is register §3.10; consume `src/data/assumptions/`, never
    re-declare a figure. **R1: the engine hard-refuses any financial year containing an end-of-day
    breach and does NOT implement excess transfer balance tax** — warn-and-continue has no
    conservative form. **The latching `hasEverExceededCap` flag is built regardless**, because
    refusing only prevents *new* breaches and one excess of any size, ever, permanently kills
    proportional indexation under s 294-40(1)(b). **R3/R4:** seven per-Person Settings, day-granular
    account start. **R5:** the conversion day is a stated Setting, and an absent one must raise a
    **named refusal**, never a silent skip — silence is conservative on tax but flattering on the
    cap. **R8:** collect the refusal names into **one module first** — three independent passes have
    now minted three spellings for the same refusals.
    - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** The bullet's own text has read "ALL DONE" since 2026-09-16 while the box stayed `[ ]` — the exact lag it complains about one line below.
    - **What landed, chunk by chunk.** **1** (`51623b3`) the refusal vocabulary — twelve names, no
      arithmetic, R8's ordering. **2** (`b57a18a`) the personal cap: s 294-35(1) seeding, s 294-40
      proportional indexation, and a fourth brand so the general cap cannot be reported as a
      personal one. **3** (`f7a1923`) the day-level high-water mark and R1's end-of-day breach
      refusal — the first of the twelve names to become reachable. **4** (`5dce09e`) the ledger
      itself: the item 2 credit, the item 1 debit, the drawdown that records itself and moves
      nothing, and O47's characterisation. **5a** (`2b1846d`) R7 inputs 4 and 7 — the reversionary
      stream and the commutation authority, both refused as DECLARED facts and never derived.
      **6-0 → 6-4** (`81154d8`, `14f73c0`, `498bad1`, `90e6221`, `3d56601`, `fa1552a`) the seven
      per-Person Settings of §3.10.7, the tri-state O42 fact, the refusal wired at exactly one door,
      and the three brand-spread gaps — one closed structurally (the `stated` rename, TS2561), two
      by runtime witnesses. **Five mutation batteries** (`69d4d3b`, `af8e9d6`, `3401c96`, and
      Battery E in `4f15f96`) are folded in; their rows are register **§9 → Transfer balance cap**,
      including the two DECLARED SURVIVORS.
    - **5b — the PER-STREAM Settings block of §3.10.7. UNBLOCKED 2026-09-16 by R13; COMPLETE
      2026-09-16, 5b-1 → 5b-6 all landed.** *(This bullet read "**BLOCKED**, not merely next … blocked on a
      **pending user ruling**" until 2026-09-16. The ruling came: **R13** narrows R5's absent-Setting
      limb — a stated changeover day wins whenever present, otherwise the 65th birthday, because
      SISR Sch 1 item 106 converts a TRIS automatically at 65 with no notification and no election.
      The superseded wording is kept here once, in this frame.)* The block is: each stream's
      commencement day, the **TRIS conversion day** and (on the 101/102A/103 route) the notification
      day, the Schedule 1 **item set**, the reversionary flag, and each above-minimum withdrawal's
      characterisation.
      - **5b-1** (`c6a258d`) `nthBirthday` in `financialYear.ts` — the calendar, not the age, with
        the leap-year edge (29 Feb + 65 → 1 March) resolved in the direction that understates.
      - **5b-2** (`28dbc78`) `StatedStreamSettings` on `SuperInterest` — days and acts, never flags.
      - **5b-3** (`c2bbb4e`) `trisConversionDayUnderItem106` — R13's resolution, plus the
        contradiction R13 left open (a stated day *after* the birthday is refused, never silently
        preferred either way) and the two off-route refusals.
      - **5b-4** (`bf8aab2`) `trisInterestOrRefuse` — the item-106 half of §3.10.8's narrowing, taken
        as a **new door** and not as a weaker refusal. **O65 is deliberately NOT resolved:**
        `grounds.length === 1` is the non-resolution written as code.
      - **5b-5** (this pass, 2026-09-16) `creditTrisConversionUnderItem106` in
        `src/core/trisConversionCredit.ts` — the s 294-25(1) item 2 credit that arises on R13's day,
        composed from the day resolver and `creditOnCommencement`.
        **The finding, and it is not a tick:** this ships with **no production caller anywhere in
        `src/`**, and it cannot honestly have one yet. `trisInterestOrRefuse` holds no ledger and no
        dated value, and supplying one would mean inventing a figure — the value of the supporting
        interest **on the conversion day**, which nothing in `src/` computes and which `SuperInterest`
        cannot carry, because it is `{ phase, balance }` with no day at all. That join is **O57**, and
        the register assigns it to **P4-1** by name. So the function is registered, tested and
        unreachable — the O72 / P3-38 pattern, recorded as a finding rather than dressed up as
        coverage, with a whole-`src/` tripwire that must be **rewritten, not deleted**, when P4-1
        wires it. Second finding, smaller and now pinned: §3.10.4's *"the credit reads the
        commencement-day value once, ever"* is a **trap** for a converted TRIS, whose item 2 starting
        day is the **conversion** day — the stream's own commencement day is an accumulation-phase
        fact that carries no credit, and crediting both would double-count one interest.
      - **5b-6** (this pass, 2026-09-16) **limb 2b of `trisInterestOrRefuse`** — the throw site
        `TrisNotificationNotStatedError` had lacked since it was registered on 2026-09-15. It fires on
        a conjunction of three: the **employment** ground **without** the automatic-release one, a
        **stated** `statedSchedule1Item` of **101, 102A or 103**, and **no** stated notification day.
        Struck from the registered-and-unreachable list in
        `test/core-transfer-balance-account.test.mjs` in the same change, ratchet 8 → 7.
        *(This bullet read "**what is left** … Until it is built, `TrisNotificationNotStatedError`
        keeps no throw site and stays on the registered-and-unreachable list". It was built.)*
        **The item is READ, never DERIVED**, and that is the whole of the O59 / U28 scoping:
        `schedule1ItemFor` is one import away and deliberately absent from the module's executable
        text, because the employment-ground → item-101 mapping is `unverified` and deriving it would
        fire this refusal at every retiree in the model rather than at the ones who said which item
        they satisfied. **O65 is untouched:** limb 2b fires only where the automatic-release ground is
        absent, so the retired-at-62-then-turned-65 Person fails limb 2b's exclusion as well as limb
        2's `length === 1` and keeps the refusal that has always met them.
        **The finding, and it is the same shape as 5b-5's:** a Person who **did** state the
        notification day still has nowhere to land. No converted-101/102A/103 interest constructor
        exists anywhere in `src/` — building one means handing `retirementPhaseInterest` a conversion
        day that is the notification day and crediting it there, and neither has a caller — so the
        better-informed user gets the *generic* refusal, which is a worse message than the one the
        user who said nothing gets. That is recorded in §3.10.6, in the module header and in a test
        that must be **rewritten, not deleted**, when the constructor is built.
    - **What chunk 5b being COMPLETE does to P3-9, stated without overclaiming.** Every chunk of the
      §3.10 build plan has now landed, and **P3-9 is still not complete**, for a reason that is about
      wiring and not about scope. Chunks 5b-3 → 5b-6 ship as **four modules with no production
      caller**: nothing under `src/` calls `trisInterestOrRefuse`, `creditTrisConversionUnderItem106`
      or `trisConversionDayUnderItem106`, so **a TRIS still converts for nobody in a running
      forecast**, no transfer balance credit is recorded for a conversion, and the named refusals are
      reachable only from tests. The Person-level aggregation that would call them is chunk 6's
      surface and the ledger join is **O57**, which the register assigns to **P4-1** by name. Of the
      twelve refusal names registered by chunk 1, **five** are now reachable and **seven** are not
      (**O48**, corrected the same day). What is genuinely finished is the *law*: §3.10's rules are
      stated, sourced and implemented; what is missing is the caller.
  - [x] **O66 — write the §9 mutation rows for the transfer balance cap traps** — ✅ 2026-09-16.
    The headline "68 traps, none tested" was wrong twice over. **27 of the 68 (T87–T113) are
    RECORDED-NOT-LIVE under R1** — the ruling says in terms *"do not schedule tests for them"* — so
    the in-scope figure is **41**, and **all 41 are now covered**: 7 by P3-9 chunk 6 / Battery E,
    12 by **batch 1**, 12 by **batch 2** and 10 by **batch 3**, all below, for **52 mutations**
    measured and reverted in total. **0 remain.** §9 also now carries an **R1 EXCLUDED** note over
    T87–T113, so a reader of that table does not read the 27-row gap between T86 and T114 as missed
    work. **Two things ticking this box does NOT close**, both recorded in the §8 row: the 27 are
    **out of scope, not covered**; and the **four untested ECPI traps T127, T128, T131 and T134**
    were tracked here by reference and are **not** discharged with it — §1's Exception 2 is where
    they now live, and it is derived from §9's Trap column rather than written by hand. **If they
    are to be scheduled they need an open item of their own, and this is not it.**
    - [x] **Batch 1 — §A's remainder (T59–T64, T66–T70, T72), 2026-09-16.** Twelve traps, **fourteen
      mutations**, each applied to `src/` by hand, built, run against the whole suite, counted and
      reverted from a pre-mutation copy. Failing-test counts, measured against a 796-test, 0-failure
      baseline: T59 **12**, T60 **22**, T61 **5**, T62 **4**, T63 **19**, T64 **7**, T66 **1** and
      **2** (two edges), T67 **2**, **2** and **1**, T68 **4** and **6**, T69 **1**, T70 **4**,
      T72 **37**. Nothing was uncovered outright, and two findings are worth more than the counts:
      - **T67 carries a partial survivor, and it is IN §9 rather than left out.** Un-latching
        `hasEverExceededCap` only on a strict increase fails **one** test and that test is a source
        canary — no fixture moves a dollar. It is recorded rather than patched because the escape is
        unreachable by construction (a real latch implies a mark above its own day's cap; a barred
        Person's cap never indexes; R1 throws on a projected day above the cap), with the residue —
        a *stated* history pairing a true flag with a mark below its cap — written into the row.
      - **T66's defence was one assert-throws test with no figure in it.** The repeated-day mutation
        failed only the ordering guard, so batch 1 added the priced LCR 2016/9 ¶51 (Alice) fixture to
        `core-transfer-balance-day.test.mjs`: $1,700,000 credited and $100,000 commuted on 1 July
        2017 close at exactly the $1,600,000 cap, where the intraday figure would breach by $100,000
        **and** write a numerator the honest day never had. That mutation now fails 2.
      - §1's preamble, §8's O66 row and this entry all carried *"the 68 traps have no §9 tests"*.
        Four citing sites were found repo-wide and **three corrected**; the fourth (§1's ECPI note)
        cites O66 by reference only and was re-pointed rather than rewritten. The count is now
        **derived from the tables by `test/assumptions-register-o66.test.mjs`**, which parses §1's
        trap rows, R1's RECORDED-NOT-LIVE range and §9's Trap column and asserts the prose agrees —
        so the next batch cannot land a row without moving the figure, or move the figure without a
        row.
    - [x] **Batch 2 — §B's remainder (T74–T83, T85, T86), 2026-09-16.** Twelve traps, **twenty-one
      mutations**, same discipline as batch 1: each applied to `src/` by hand, built, run against
      the whole suite, counted with `grep -cE '^\s*not ok '` and reverted from a pre-mutation copy.
      Baseline **800 tests, 0 failures**; four of the twenty-one failed it **zero** tests and are the
      batch's finding rather than its footnote — T76 (the breach refusal's remediation sentence,
      rewritten to recommend a bigger pension payment), T82 (the item 1 lump-sum debit, dated the
      previous `throughDay` instead of the day received, across a 30 June boundary), T85 (the capped
      defined benefit refusal's stated ground reversed to the exact proposition it exists to forbid)
      and T86 (the per-Person Settings lookup, made to fall back to a spouse's stated history).
      **What the four have in common is the reusable finding: each was *asserted* — the refusal
      existed, the debit function existed, the aggregation returned a list — and none was asserted
      in the direction the trap runs. A name, an arity and a return shape are not a defence.** Each
      is now closed by one new priced test (800 → 804) in `core-transfer-balance-ledger.test.mjs`
      (T76, T82) and `core-transfer-balance-account.test.mjs` / `core-transfer-balance-account-
      settings.test.mjs` (T85, T86). Three more traps — T77, T78, T81 — could only be mutated
      through the SHAPE of a parameter, not its value, because the figure is supplied by the caller
      and this module cannot tell one figure from another; those rows rename the parameter the
      module's own comment names as the whole defence and apply the rename to its one `src/` call
      site too. §1's preamble and §8's O66 row are updated to the resulting **31 covered / 10
      outstanding** split, derived and checked by `test/assumptions-register-o66.test.mjs`.
    - [x] **Batch 3 — §D's remainder (T117–T125) and §C's one live trap (T114), 2026-09-16.** Ten
      traps, **seventeen mutations**, same discipline as batches 1 and 2: each applied to `src/` by
      hand, built, run against the whole suite, counted with `grep -cE '^\s*not ok '` and reverted
      from a pre-mutation copy. Baseline **804 tests, 0 failures**; nine new tests take it to
      **813**. Counts, after the new tests: T114 **3 / 3 / 15**, T117 **6 / 2**, T118 **2 / 1**,
      T119 **2**, T120 **2 (broken probe) / 1**, T121 **23**, T122 **9 / 1**, T123 **1**, T124
      **1 / 1**, T125 **6**.
      **Four of the seventeen failed ZERO tests before their fixture, and all four are one defect
      wearing four faces: a rule this project holds ONLY in prose.** T118's item **102** (death),
      which could be struck from reg 6.01(2)(b)(ii)'s "Nil" set because the existing fixture asked
      `message.includes('102')` and **`'102A'` answers it** — *a substring test over a set whose
      members are prefixes of one another asserts nothing about the shorter ones*; T120's
      conversion-year pro-rating, where **no fixture held a Person who turned 65 in a year their
      pension did not commence in**, so $20,000 of Schedule 7 minimum could become $11,620 in
      silence; T123's whole TR 2013/5 breach doctrine, which lives in a doc comment; and T124's own
      **anti-shortcut warning**, the paragraph telling the next implementer not to reach for
      ¶71B's gloss, which could be reversed into an instruction to reach for it.
      **T114 — "the largest money consequence in the cluster and the easiest to omit" — rested on
      ONE test.** Two independent ways of losing the s 294-40(1)(b) latch each failed the same
      single `test()` call. It now has three, priced on §1's own one-dollar fixture: a **$1.00**
      excess, fully corrected, still costs **$96,000** of personal cap across two indexation events.
      Measuring it produced the batch's most useful negative — under R1 the latch and the
      mark-above-cap refusal are nearly redundant in the money, so **batch 1's declared partial
      survivor on T67 was re-measured at 1 test and is left declared**; its residue and T114's are
      the same residue and neither is closeable without a stated history no honest ATO record
      produces. **No fixture was invented to force it.**
      **A stale claim found while closing this, and it is not in the transfer balance cap cluster:**
      §1's Exception 2 said the nine ECPI traps carried *"exactly one mutation test between them"*,
      while §9 had carried rows for **T126, T129, T130 and T133** since P3-25. Corrected to the
      derived **five covered / four outstanding**, and `test/assumptions-register-o66.test.mjs` now
      computes that split too, so it cannot drift again. The same file lost its **second** hardcoded
      anchor: batch 2 replaced a literal `22`, and the phrase it left behind — *"still true of the N
      left:"* — is unwritable at N = 0, so the anchor now branches on the derived figure and both
      branches ratchet.
- [x] **P3-10** **Minimum drawdown factors by age band** — ✅ 2026-09-08. `core/minimumDrawdown.ts`,
  built on `docs/research/p3-minimum-drawdown-and-ttr.md`: SIS Regulations 1994 reg 1.06(9A)(a) and
  **Schedule 7 cll 1–5**, read off Compilation No. 159 — the cl 1(1) formula out of the
  compilation's own embedded drawing records (no fraction bar, so no divisor) and again as plain
  text in the ATO Legal Database. All four unknowns that stopped 80f377c are closed, and §3.9 turns
  out to be **wrong** on the fourth rather than merely silent.
  - **U1 — the rounding direction.** cl 5: **nearest $10, and an exact $5 goes up**. Not a ceiling.
    $987,654.32 at 5% is **$49,380**.
  - **U2 — the order.** cl 1(1) is "Subject to clauses 3, 4, 4A and 4B" and cl 5 rounds "an amount
    determined under **this Schedule**", so the pro-rating sits inside the determination and the
    rounding follows it. **One rounding, last.** $1,009,078 at 4% from 1 Aug 2026 is **$36,940**,
    not the $36,930 that rounding the annual figure first gives.
  - **U3 — the basis.** cl 3: **days**, and "include and follow" the commencement day. The word
    "month" appears nowhere in Schedule 7. $500,000 at 4% from 1 Oct 2026 is **$14,960**, not the
    $15,000 that nine whole months give; excluding the commencement day gives $14,900.
  - **U4 — which balance.** cl 1(2)(a)(ii): the **commencement-day** balance, with the **full**
    annual factor applied to it — every part-year adjustment lives in cl 3, and the balance is
    never scaled. **§3.9's "on the 1 July balance" is wrong for a commencement year.**
  - Two rules §3.9 does not carry at all are modelled: **cl 1(2)(b)**, which substitutes the
    **withdrawal benefit** where it exceeds the account balance (inert for an ordinary APRA
    account-based pension, which is exactly why it gets dropped), and the fact that in a
    commencement year the **age is taken on the commencement day** — a Person who turns 65 in
    September and commences in October takes 5%, not 4%: $18,700 against $14,960 on $500,000.
  - **cl 4A/4B — the GFC and COVID halving — are spent** (closed enumerations of named years ending
    1 July 2022; last amended by F2022L00498, 2 Apr 2022) but are **kept as a year-keyed slot**
    valued 1 for FY2026-27 rather than deleted, so the next relief regulation is a data change and
    not a structural one. It also makes the multiplier *testable*: ATO's own end-to-end worked
    example — $250,000 from 1 Jan 2023 at age 66, halved by cl 4A — runs the same code path and
    reproduces **$3,100** to the dollar, which independently checks the days basis, the
    commencement-day balance and the single late rounding at once.
  - **The one thing the instrument never states is the denominator** of cl 3's proportion; 365/366
    comes from the ATO (U2 of the research pass). It is a record of its own at `secondary-only`, so
    a **part-year** minimum comes out `secondary-only` and a full-year one stays `primary-verified`
    — the caveat rides only where it is load-bearing. Immaterial for FY2026-27, which has 365 days.
  - **Refuses rather than guessing**: `MidYearProportioningError` for a year in which the pension
    was **commuted or rolled over**, because ATO recognises a second proportioning event that Sch 7
    cl 3 does not reach and that limb was outside the research pass's scope (its U7);
    `PensionBalanceDateError` for a balance measured on any day but the one cl 1(2) names; and
    `PensionNotCommencedError` for a year before the pension existed, where a nil would read as a
    pension that is running and requires nothing.
  - **`access.minimumDrawdownFactors` now has an importer** — the known bug signature ends for that
    row. Still consumed by nothing in `src/`: `benefitsFromATaxedSourceAt60`, and
    `ttrMinimumDrawdown`, which **P3-8's payment range left unconsumed on purpose** because a flat
    4% understates the rule. `ttrMaximumDrawdown` gained its importer there on 2026-09-09.
  - **Mutations applied to the source, run, counted and reverted** (none failed zero tests):
    ceiling instead of nearest-ties-up **5**; rounding before the pro-rating rather than after
    **2**; months instead of days **10**; excluding the commencement day from the count **8**; the
    1 July balance in a commencement year **11** (it is refused, not merely wrong); dropping the
    cl 1(2)(b) withdrawal-benefit substitution **1**; age at 1 July instead of at the commencement
    day **1**; ignoring cl 4's 1 June nil **2**; hard-coding a *correct* factor table instead of
    reading `ACCESS_RULES` **1** — the last is invisible to every fixture, as the Div 296 and
    Condition of Release literals are, and is caught by a canary asserting that the only numeric
    literals in the module are 0, 1, 2 and the rational scale.
  - **Register §3.9 needs correcting and this chunk deliberately did not touch it.** "On the 1 July
    balance" is wrong for a commencement year; "rounded to $10" does not say *nearest, ties up*;
    "pro-rated" does not say *days*; the row does not say the rounding is last; cl 1(2)(b) is
    missing; and the TTR rows understate the asymmetry (the maximum is **not** pro-rated, **not**
    rounded, **not** age-varying and **not** switched off by cl 4 — it is reg 6.01(2)(b)(ii), not
    this Schedule). `access.minimumDrawdownFactors.note` repeats the same four gaps and should be
    corrected in the same pass. Research report §5, D1–D8; it also belongs in register §8 as a
    numbered open item after **O35**.
- [x] **P3-11** **Age Pension means test** — combined then halved, both tests, take the lesser
  — ✅ 2026-09-04. `core/agePension.ts`. Both rules are enforced by shape rather than by care:
  the only exported calculation takes a `Household` and there is no per-Person entry point to
  call by accident, both tests are computed unconditionally into the result, and the halving has
  exactly one call site, after the lesser has been taken. The combined-then-halved test writes out
  the per-Person mutation it must catch and asserts that the *symmetric* Household is blind to it —
  a test using only an even split would have proved nothing. Hand-worked fixture: a $700,000
  homeowner couple on 20 Sep 2026, reconciled line by line to $1,263.00 combined / $631.50 each,
  and the seed for P13-3.
  - [x] **P3-11a** Three parameter periods per financial year (20 Mar / 1 Jul / 20 Sep), not two. **Derive** the income and assets cut-offs; never hard-code them (T22, T25)
    — ✅ 2026-09-04. Consumed from `agePensionPeriodAt`; the cut-offs are derived per call and
    asserted against the register's published fixtures ($1,121,000 / $4,128.00 / $745,750 /
    $1,388,000) rather than stored. Surprise: the register's $250 round-up applies to the cut-off
    derivation only, so a continuous $3/$1,000 taper reaches zero up to $250 *before* the
    published cut-off. The two agree on the answer because the reduction clamps; no stepping rule
    for the taper itself was invented.
- [x] **P3-12** Deeming; Work Bonus; account-based pension assessed as balance + deemed income
  — ✅ 2026-09-04. `core/deeming.ts` and `core/workBonus.ts`, with the both-tests assertion for an
  Account-Based Pension in the means-test suite: the same balance appears as `assetsTest.assessed`
  and as `deeming.financialAssets` in one result.
  - [x] **P3-12a** Deeming rates as a **Setting with a scenario lever** — six-monthly Ministerial discretion, no formula, no terminal rate (T30)
    — ✅ 2026-09-04. `resolveDeemingRates` is the only way into `core/deeming.ts` and it throws
    `MissingDeemingRatesError` past 20 Sep 2026 unless the Setting is supplied, naming the key so
    the message can be acted on. A supplied Setting also overrides a determination that does
    exist — that is the scenario lever, not a fallback.
  - [x] **P3-12b** Account-Based Pension grandfathering hard-coded **`false`** — both limbs are structurally unreachable here; exposing it as a Setting invites an undetectable overstatement (T28)
    — ✅ 2026-09-04. Nothing in `core/` reads a grandfathering flag: an Account-Based Pension is
    classified as assessable-and-deemed unconditionally, so there is no branch to flip.
- [x] **P3-13** Younger-partner accumulation exemption until 67 — the biggest cliff
  — ✅ 2026-09-04. Classified in `core/household.ts`, proved end to end in
  `test/core-age-pension-mutations.test.mjs`. On the synthetic fixture the cliff is **$1,203.00 a
  fortnight off the combined rate in one day**. Worth charting the *combined* rate, not the
  Household total: the younger Person becomes eligible on the same day, so the Household figure
  falls by only $270.00 and understates what happened.
  - [x] **P3-13a** The exemption also ends on **commencing any income stream, including a TTR**, at any age (T27)
    — ✅ 2026-09-04. A TTR at 66 costs the same Household $601.50 a fortnight, and the TTR case
    before the birthday is asserted identical to the accumulation case after it — the trigger is
    the income stream, not the age. Seven mutations were run against the suite to confirm it
    discriminates (greater-not-lesser, no halving, per-Person assets test, per-Person deeming,
    exemption ignoring phase, exemption ending at 65, Work Bonus applied after the test); all
    seven fail at least one test, and the naive "a TTR keeps the exemption" edit does not even
    typecheck.
- [x] **P3-14** `HomeStatus` and the `protectedAssets` / `assessableAssets` split (ADR-0005)
  — ✅ 2026-09-04. `core/household.ts`. The enforcement of ADR-0005 is an **absence**: there is no
  `homeValue` field on `Person` or `Household`, so a fixture cannot supply one and the means test
  cannot read one. A test greps the four core sources for `marketValue|homeValue` and fails on a
  hit. Surprise: the register contradicts itself on the vacated-home cliff — T42 and the ADR-0005
  amendment note say the market value never enters `assessableAssets`, while T39 says at the
  two-year cliff the home does exactly that, at full market value. Not guessed: the status
  `vacatedBeyondTwoYearExemption` sets `homeIsAssessableButUnvalued` and `agePensionEntitlement`
  refuses to compute rather than under-assess. Left for P3-15 to resolve with an ADR.
  - [x] **P3-14a** Non-homeowner free area = homeowner free area + the **extra allowable amount ($267,000)** — one constant plus an offset, not two series (T26)
    — ✅ 2026-09-04. Consumed from `nonHomeownerAssetsFreeArea`; the split reports a `homeowner`
    boolean and nothing else, so there is no second series for the rules module to introduce.
- [ ] **P3-15** Two-year Age Pension exemption clock on a vacated home — **detect and refuse**, not assess
  - ⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit). None of P3-15a–e built. No `vacatedWithinTwoYearExemption`, no `UnvaluedAssessableHomeError` in `agePension.ts`/`household.ts`. Also note `VACATE_HOME` has ZERO engine branches (`grep -ac VACATE_HOME src/core/projection.ts` = 0), so P6-5a is unbuilt too and P7-5's home-status chart marker is blocked behind both.
  — Rescoped 2026-09-04 by user ruling: *"House value is an input field. House value is not part
  of the means test."* That resolves the T39/T42 contradiction found in P3-14 in favour of T42, and
  it costs us the scenario: the law assesses a vacated home at full market value after two years,
  v1 deliberately does not, so v1 **cannot forecast that scenario and must refuse it**. See the
  2026-09-04 note in `docs/adr/0005-home-is-a-status-not-a-value.md`. The clock still gets built —
  it is now the thing that **detects the boundary at which the tool stops**, not the thing that
  switches an assessment on.
  **Addendum 2026-09-20: this limit is now said out loud on the settings form**, not just in the
  ADR and register — the Home Status disclosure states that a home vacated more than two years is
  knowingly outside the assets test. No change to the ruling or to P3-15a–e; the gap is unchanged,
  only now user-visible rather than only developer-visible.
  - [ ] **P3-15a** Derive the clock from the `VACATE_HOME` entry date: `vacatedWithinTwoYearExemption` until the second anniversary, `vacatedBeyondTwoYearExemption` from it. Monthly, from entries, never from the system clock (P4-1a)
  - [ ] **P3-15b** Keep the refusal: `agePensionEntitlement` throws `UnvaluedAssessableHomeError` on `vacatedBeyondTwoYearExemption`. **Do not** add a market-value read to the means test to make it compute — that is the reopen condition in ADR-0005, not a fix
  - [ ] **P3-15c** Surface the refusal as a dated, explained boundary rather than a crash: the projection stops at the cliff date and says why, naming the ruling and the ADR. A silently-truncated `Month[]` is as bad as a wrong number
  - [ ] **P3-15d** Update the ADR-0005 note and register T39 in the same commit if any of the above changes what is refused
  - [ ] **P3-15e** Full assessment of a vacated home at market value is **out of v1** and lives in **P14-5a**. Do not implement it here
- [x] **P3-16** Mortgage amortisation and offset interaction
  — ✅ **Ticked 2026-09-23 in the reconciliation pass; the box lagged three slices.** Both halves of
  the title shipped in slice 1 (`b8377cb`, 2026-09-21): principal-and-interest amortisation and
  interest on `max(0, balance − offset)`. Slices 2-3, P3-16a and P3-16b added refinance, the
  on-screen balance, the target date and payoff; the user confirmed it working on 2026-09-21.
  **Still unmodelled, outside this item's verb:** redraw, extra/lump repayments, interest-only.
  **Defect tracked separately, CLOSED 2026-09-24:** payoff-month cash held back in the Offset limb (see the
  "Home loan payoff" section near the end of Phase 8).
  - ✅ **SLICE 1 DONE 2026-09-21 — THE HOUSEHOLD CAN HAVE A HOME LOAN, engine and form.** Stated
    balance, annual rate and monthly repayment on `Household.mortgage?`; principal-and-interest
    amortisation in `mortgageMonth` (`household.ts`); two `MonthLine`s per month; three boxes on the
    settings form. **This closes the largest structural gap in the tool** — README listed a mortgage
    in scope and the model held none. `test/core-mortgage.test.mjs` (15), `test/app-mortgage-form.test.mjs` (8).
    1832 tests, 0 fail.
    - **BYTE-IDENTICAL when no loan is stated, proven twice:** the demo plan's whole 501-month
      projection hashes the same on a `b6b9c77` worktree and on this build, and the full suite with
      the two new files removed reads **1809 — unchanged**. I verified the second myself.
    - ⚠️ **THE MEANS TEST IS DELIBERATELY UNCHANGED, and that is the sourced answer, not an
      omission.** `agePension.ts:560`'s `homeownerWithAMortgage`, attributed to Services Australia:
      *"the mortgage is netted only against the asset it secures, which is itself exempt … mortgage
      debt is **not** deductible from other assets."* `splitAssets` gains **no branch**. A mutation
      that nets the loan off assessable assets fails exactly one test, by name — I reproduced it.
      **`withBalances` OMITS the mortgage rather than substituting it**, so the means-test view has
      no debt for a future author to reach for. That is how "do not add a branch" was made to last.
    - **The Offset Account finally earns its keep, and a recorded residual closes.**
      `interest = max(0, balance − offset) × rate / 12` — the offset is READ to size the charge and
      **nothing is credited to it**, so `closing = opening + Σin − Σout` is untouched. The
      `projection.ts:2346` comment (offset does not grow, "a Shortfall Age earlier than the truth")
      is rewritten: its first reason is marked SUPERSEDED and the residual narrows to "an offset with
      no loan left to cancel a charge against".
    - **THE USER'S RULING, 2026-09-21: the repayment is ADDITIONAL to the stated spending figure, and
      the screen says so.** The spend label now reads *"Annual household spending, NOT counting home
      loan repayments"*. Most people's mental spending figure already includes the mortgage, so
      silently adding it would double-count and make the forecast worse than the life. `target` at
      `projection.ts:5259` is now **three** parts; its old "in two parts and no more" sentence is
      quoted as superseded rather than deleted.
    - **Every way the loan can end, enumerated in the source beside the arithmetic** — amortises to
      nil (final payment capped); repaid then the walk continues (**the repayment STOPS**, tested);
      forecast ends first; **never ends — a repayment ≤ the interest is REFUSED BY NAME**, at the
      door and in the walk from one function, equality included; never stated (the only spelling of
      "no loan"); stated as owing nothing (refused, so there is one spelling); nil rate (legal, pure
      principal); offset ≥ balance (interest nil, never a credit); cannot afford it (the repayment
      is in `target`, so an `Unfunded shortfall` says so and the loan is still paid).
    - **TWO lines, not one** — `Mortgage repayment — interest` and `— principal`, on the portfolio
      purchase/brokerage precedent. A merged line is the same figure for thirty years and **the whole
      effect of the offset is visible only in the interest half**. Both render in today's money and
      in future dollars, asserted on the LAST month still carrying a loan (month 0 converts to itself
      and would prove nothing).
    - **Still unmodelled, and named as such on screen and in `Mortgage`'s doc:** rate changes,
      refinance (`MORTGAGE_REFINANCE`), redraw, extra or lump repayments, interest-only. **P3-16a
      (`MORTGAGE_TARGET`) is untouched** and remains the next slice.
  - ✅ **SLICE 2 DONE 2026-09-21 (`ed275d0`) — THE BALANCE IS ON SCREEN AND THE TERMS CAN CHANGE FROM
    A DATE.** 1851 tests, 0 fail. Two changes, two separate arguments:
    - **`Month.mortgageBalance?`** — the CLOSING figure, read off the same `MortgageMonth` the
      month's two lines were written from. ⚠️ **It is a DEBT and NOTHING NETS IT**: ADR-0005 holds no
      value for the home, so it is not subtracted from `protectedAssets`, `assessableAssets` or
      `accessibleAssets`, and it reaches the means test not at all. Reported beside those three and
      never one of them.
    - ⚠️ **A CORRECTION TO THE STRIP-AND-RE-HASH TECHNIQUE, and it inverts the usual argument.**
      The five earlier widenings (P4-6, P4-4, P5-3, P7-6) were UNCONDITIONAL, so stripping the new
      field and re-hashing proved the rest unmoved. **This field is CONDITIONAL and the byte-identity
      Household states no mortgage, so the strip is INERT** — the digests reproduce with it and
      without it. That is a *stronger* claim (the walk is byte-identical, not merely strippable) but
      **the stripped digest CANNOT catch the field being emitted unconditionally, because the strip
      deletes the evidence.** I verified this: emitting unconditionally fails **7** tests, and the
      two that matter are the **FULL** byte-identity digests, not the stripped ones. **Before reusing
      the strip pattern, ask whether the widening is conditional.**
    - **`MORTGAGE_REFINANCE` now carries params** — balance, rate, repayment, **all three required**
      (every specified level type replaces its state atomically; a partial change would make the walk
      reach back for whatever was in force). It **also ORIGINATES** a loan where there was none, and
      a change dated **after payoff is a NEW LOAN**, not a refusal — pay off then borrow again is
      real, and a mis-dated entry only ever ADDS debt, so it cannot flatter. **A stated nil balance
      is refused**, so absent stays the only spelling of "no loan" and an early payout is not quietly
      invented. On screen it does **not** say "refinance" (`entryLabels.ts`, the P6-13 pattern).
      The form now offers **8** of 19 types; README's counts moved 7→8 and 12→11.
    - ⚠️ **THE DOOR CANNOT VALIDATE A DATED CHANGE, and this generalises.** Whether a repayment covers
      the interest depends on the offset balance **at that date**, which is an OUTPUT of the walk.
      **Two tiers:** the day-1 door check is untouched and still refuses with a JSON path a form can
      show; a dated change that cannot be repaid is refused **when the projection reaches it, naming
      the entry and the month**. The loss — no pre-flight refusal for dated changes — is stated in
      the source rather than papered over. **A door check can only validate what the file itself
      states; anything whose inputs are walk outputs belongs in the walk.**
    - **Three transitions beyond the ten specified, found and pinned by the build:** two changes in
      the SAME month resolve by plan order (pinned by REVERSING the order, so the claim is about
      order and not about the figures); two dated before `asAtDate` keep the later date; a
      switched-off change is byte-identical to a plan without it.
    - **A guard mutation that would not compile is a structural defence, not a test.**
      `if (false && entry.type === 'MORTGAGE_REFINANCE')` destroys the discriminant narrowing and the
      params stop type-checking — so the branch **cannot** be neutered by killing its guard.
    - **Four doc comments that said no entry could state, change or end a mortgage became false** and
      are narrowed in place with the supersession recorded, not deleted.
    - **Still unmodelled:** early payout by lump sum, redraw, extra repayments, interest-only.
      **P3-16a (`MORTGAGE_TARGET`) remains the next slice.**
  - ✅ **SLICE 3 DONE 2026-09-21 — "AM I CLEAR BEFORE I RETIRE" IS NOW A QUESTION THE SCREEN ANSWERS.**
    The user entered a loan and said *"I manually trawled the months and saw the balance at 0 but
    didn't know where else to see it in the ui."* They were right: the balance reached every month
    and **nothing summarised it**. A chart marker and a plain-words headline, both asked for by name.
    1881 tests, 0 fail. `outcomes.ts`'s `mortgagePayoff`/`retirementMonths`, `mortgageHeadline.ts`.
    - ⚠️ **THE RULING THAT MATTERS — the marker draws `clearForGood`, NOT `firstPayoff`.**
      `mortgagePayoff` reports both. **An upright rule captioned "Home loan clear" makes a claim about
      every month to its RIGHT** — drawn at the first payoff in a plan that pays off and borrows
      again, it asserts that of months in which money is owed. For a single loan the two are equal.
      **Generalises to every marker on this chart: a vertical rule is a claim about a HALF-LINE, not
      about a point.**
    - **A couple is never reduced to one number.** Two Persons retire in different months, so the
      comparison is per Person and each sentence names only its own Person. ⚠️ **In the
      still-owing case the HEADLINE carries no `$` at all** (asserted) — a figure there would silently
      belong to one spouse. The amounts live in the per-Person lines. A mutation taking only the
      first Person fails **3** tests; I reproduced it.
    - **`retirementMonths` reads `Month.appliedEntryIds`, NOT the entries' dates.** `RETIRE` is a
      `level`, so the first month CITING it is the effective month — which inherits the horizon
      clamp, the pre-`asAtDate` bucket and supersession for free rather than keeping a second copy of
      any of them. **The right way to ask "when did this level take effect".**
    - ⚠️ **AN EIGHTH CASE THE BUILD FOUND THAT MY BRIEF MISSED: one of a couple retires and the other
      has NO `RETIRE` entry.** Treating that as "nobody retires" would drop the answer for the one
      who does have a date. The headline is decided on those who have dates; the other's line says
      they have none. **My "name every case" instruction works, but it does not make my own list
      complete — this is the second slice running where the build found cases I had not.**
    - **Eight cases handled:** no loan (no marker, no note, byte-identical); clear before retirement;
      still owing at retirement (amount unmissable); never repaid (no invented payoff date, and **no
      marker for a payoff that never happens**); nobody retires (payoff stated alone); loan starts
      later (*"no home loan yet"*, explicitly not "clear"); paid off then re-borrowed (the `tail`
      surfaces the later loan even when the lead is good news); and the eighth above.
    - **Byte-identical for a no-loan walk, proven by ABSENCE not by a zero:** `JSON.stringify(series)`
      contains neither `"mortgage"` nor `"loan"`, with a positive control that the same walk WITH a
      loan has all three. Mutation (b), emitting the marker regardless, fails **10** — and five of
      those are **pre-existing** marker tests including *"a walk that never falls short produces NO
      marker rather than one at index 0"*. **The markers-are-a-list defence is real and load-bearing.**
    - ⚠️ **A SECOND `executableCode` TRAP, same family as the `statedFee` one:** it blanks string
      literals, so **a pin on a colour hex found zero occurrences of it**. Keep `executableCode` for
      code-SHAPE assertions; a pin on a literal's VALUE must read the raw file. See
      [[enough-canary-stripped-code]].
  - [x] **P3-16a** `MORTGAGE_TARGET` — a dated payoff or offset milestone as an entry, marked on
    the chart against the target retirement date so the projection says plainly whether the two
    meet. Changes no arithmetic; it makes an intention checkable (`concept.md` §5.12)
    - 🟢 **GATE: GO — 2026-09-22 (LIZ), claims verified independently.** Confirmed directly: the
      entry type already exists, declared but refused (`plan.ts:298,401,1045`); `Household.mortgage`
      is singular/optional (`household.ts:578`), so no naming-which-loan problem; the chart-marker
      mechanism (`MarkerKey`, `monthsToSeries.ts:149`) is already PER-SCENARIO, not the comparison-
      scoped one built for P6-8 today — `'mortgagePayoff'` is already a member of the exact same
      list this item extends. "Changes no arithmetic" holds: both dates this item compares already
      exist (the entry's own `date`; the retirement date `retirementMonths` already computes).
      Zero fixture churn — the type is unconstructable today, so specifying its params moves
      nothing that exists.
    - **RULED BY LIZ on the project's own spec, not escalated.** The gate found one open question
      (does "payoff" vs "offset milestone" need two separately-computed checks, or one date
      compared against retirement date either way?) — but `concept.md` §5.12 answers it directly,
      unprompted: *"It changes no arithmetic... it makes an intention checkable."* One stated date,
      one comparison, the kind of milestone carried in the entry's own free-text note. Building two
      distinct computed checks would be NEW arithmetic and contradict the item's own spec.
      `MortgageTargetParams = NoParams`, on `RetireParams`'s own precedent.
    - **Build order:** (1) specify `MortgageTargetParams` in `plan.ts`, remove from the unspecified
      union. (2) a pure function in `outcomes.ts`: enabled `MORTGAGE_TARGET` entries' dates vs
      `retirementMonths`, reporting before/after/no-retirement-date. (3) new `MarkerKey` member,
      label/colour in `chartConfig.ts`, one more `markerAt(...)` push in `monthsToSeries.ts`. (4) an
      on-screen sentence stating whether the two meet, mirroring `mortgageHeadline.ts`'s shape.
      (5) offer the entry type on the form.
    - ✅ **SHIPPED 2026-09-22, five microtasks, five commits, 2218 → 2242 tests (24 new), 0 fail
      beyond three known-red README pins the user updates themselves.** `MortgageTargetParams =
      NoParams` (`plan.ts`), `mortgageTargets` (`outcomes.ts`), the `'mortgageTarget'` `MarkerKey`
      (`monthsToSeries.ts`, `chartConfig.ts`), `mortgageTargetHeadlines` (`mortgageHeadline.ts`,
      wired into `main.ts`'s existing mortgage-headline box), and `mortgageTargetEntry` on the form.
      - **THE FINDING: this entry needed NO branch in `projection.ts` at all, and that is now
        proven rather than assumed.** `appliedEntryIds` bucketing already cites any dated entry in
        its own month regardless of type, so `mortgageTargets` reads only the entry's own `date`
        and `retirementMonths`'s answer — never `Month.mortgageBalance`, never the walk. This makes
        `MORTGAGE_TARGET` the FIRST type this build ever offers on the form with ZERO dispatch in
        the walk, and `test/app-entry-form.test.mjs` now asserts that gap stays empty by name —
        a tripwire against a later author adding a branch "to be safe".
      - **The sign convention, decided and documented at the definition (`outcomes.ts`):** retiring
        in the SAME month the target falls in counts as `retiresAfterTarget`, not before — the
        milestone has not yet been reached partway through its own month.
      - **A couple is never collapsed to one verdict**, on `mortgageHeadline.ts`'s own precedent:
        one target date can read "before" for one Person and "after" for the other in the very
        same comparison, and `perPerson` carries both rather than picking one.
      - **Not a verdict on the loan, unlike `mortgageHeadline`'s own sentence beside it.**
        `mortgageTargets` never reads `Month.mortgageBalance`, so there is no check here of whether
        the loan is ACTUALLY clear by the stated date — only whether the date chosen falls before
        or after each Person's own retirement. `mortgageTargetHeadlines`'s wording is deliberately
        free of "good"/"bad" framing for exactly that reason.
      - **`entries` is a new TRAILING, DEFAULTED (`= []`) parameter on `monthsToSeries`** — the one
        parameter of the four given a default, and the reason is stated beside it: every existing
        caller (every test fixture predating this slice) keeps working unchanged, drawing no
        `'mortgageTarget'` marker, rather than the ~25-call-site ripple a required parameter would
        have forced across eight test files for a type those fixtures never held.
      - **A stale placeholder label found and fixed in passing:** `ENTRY_TYPE_LABELS.MORTGAGE_TARGET`
        read "Change home loan repayments" since the type was declared, unspecified, years before
        this slice — corrected to "Set a home loan payoff or offset target date" now that it
        reaches a screen for the first time.
- [x] **P3-17** Per-account fees: admin ($ + %), investment (%), insurance ($ with stop age)
  - ✅ **Ticked 2026-09-25 (P3-17a slice 3).** The title's three verbs are all built: admin $ + % (slices 1-4), investment % (slice 1), insurance $ with a stop age (P3-17a slice 1, nil from 70) and the entries acting on it (slice 3). Income protection is out of this title and gated on its own (P3-17b).
  - **Gate 2026-09-24: CONDITIONAL GO** (`docs/research/p3-17-fees-gate-2026-09-24.md`). The admin and investment fees are already
    applied in project(). ~~Still missing: fee CAPS (e.g. Aware's 0.15% capped at $750) and separate accumulation and pension schedules.~~
    **Both closed — the cap by SLICE 3, the phase-split schedule and its wage/CPI indexation by SLICE 4, both 2026-09-25.** What
    remains of this gate is insurance alone (P3-17a). Aware-level fees cost the demo couple −2.7% of super at 67 and −0.9% of
    sustainable spend. P3-17a is no longer source-blocked: Aware's Insurance Handbook has an age-rated Death/TPD table, and cover
    ends at 70 (IP at 65).
  - ⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit). Insurance limb only. Admin + investment fees shipped with form fields and `core-super-fees.test.mjs` (13 tests). `grep -rn 'statedInsurance|insurancePremium' src/` returns ZERO — the insurance-premium limb (age-rated per P3-17a) has no field and no logic.
  - ✅ **SLICE 4 — SEPARATE ACCUMULATION AND PENSION FEE SCHEDULES, user-approved 2026-09-25 — the
    other gap the 2026-09-24 gate named, now closed.** Three new optional `SuperInterest` fields —
    `statedPensionAdministrationFeePerYear`, `statedPensionAdministrationFeeRate`,
    `statedPensionAdministrationFeeCapPerYear` — read ONLY in every month `effectivePhaseFor`
    resolves the interest to `'accountBasedPension'` (a TTR is charged the ACCUMULATION set the whole
    time it remains one, on `superPhase.ts`'s own exclusion of a TTR from retirement phase). **Absent
    falls back to the accumulation twin, per field, not to nil** — a fund charging the identical
    dollar figure either side of retirement (Aware's own case) states it once.
    **INDEXATION IS NOW SPLIT BY PHASE, closing the CPI-for-everything simplification slice 3 flagged
    as flattering an accumulation account**: `monthlySuperFeesForOneMonth` (`projection.ts`) takes
    TWO lenses, `raisedByWages` and `raisedByCpi`, and picks between them by the SAME `phase` argument
    that picks the fee set — accumulation/TTR by wages, pension by CPI, matching Aware's own schedule
    exactly (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15) rather than approximating it.
    **A moved figure, found and re-derived, not pasted:** an account already stating
    `statedAdministrationFeePerYear` with no pension override now rises with WAGES (3.5% in this
    repo's demo settings) rather than CPI (2.5%) while it stays in accumulation — three
    `plan-money-basis-inventory.test.mjs` hand-worked identities and three golden SHA-256 digests
    (`app-chat-get-month.test.mjs`, `app-chat-identity.test.mjs`, `app-chat-key-isolation.test.mjs`,
    all copies of one fixture that retires a fee-stated interest) re-pinned after tracing every byte
    of the diff to that one mechanism (cent-level cascades, max $12.65 over a 113-month walk; nothing
    post-retirement moved, because the flat limb never depended on balance and both old and new code
    already raised a retirement-phase account by CPI). **Door: the pension set's three fields refused
    on the SAME three grounds as the accumulation set** — non-negative, and a pension cap refused by
    name with no pension rate beside it. **Settings panel**: an "After retirement (account-based
    pension)" box group, shown on every interest (not gated by phase, unlike the TTR or at-retirement
    boxes), using the percent-typed rate boxes and dollar-cap box 54b4a4a already built. Tests:
    `core-super-fees.test.mjs` (+5: the phase split, the wage-lens control, the CPI-lens control on a
    genuine pension, the fallback-is-byte-identical proof, the door), `core-retirement-pension-
    switch.test.mjs` (+3: the fee set switches WITH the account at RETIRE, the fallback survives a
    switch byte-identically, a TTR never reads the pension set), `app-settings-panel.test.mjs` (+1
    round trip, plus the discovery/builder/plain-words canaries widened to the three new boxes),
    `plan-money-basis-inventory.test.mjs` (the call-site count moved 5→6, the O87 identity re-derived
    on wages, the cap identity split into an accumulation/wages case and a pension/CPI case).
  - ✅ **SLICE 3 — THE CAP, user-approved 2026-09-25.** `statedAdministrationFeeCapPerYear` (optional
    `Cents`, `household.ts`) caps `statedAdministrationFeeRate`'s ANNUAL figure alone (never the
    flat limb, never the investment fee): `min(rate × balance, cap)`, then the existing twelfth-and-
    ceil schedule in `monthlySuperFeesForOneMonth` (`projection.ts`) — the annual cap is re-derived
    from each month's own balance, since the walk carries no year-boundary accrual to true up
    against. **Indexed by the SAME `raisedToPriceLevel` (CPI) lens as the dollar fee** — Aware's own
    schedule (`~/.enough/verification/P13-1c-aware-soa-extract.md` p.15) indexes the cap by wages in
    accumulation phase and CPI in retirement phase, so CPI is the fund's own rule for a pension-phase
    account and a labelled simplification for an accumulation one; the direction is FLATTERING once
    the cap binds (a lower cap charges less, not "cautious" as a naive reading suggests — see
    `household.ts`'s doc on the field and the pinned identity in `test/plan-money-basis-inventory
    .test.mjs`). **Door: refused if negative; refused if stated with no `statedAdministrationFeeRate`**
    — a cap with nothing to cap is refused by name rather than silently inert. Absent = uncapped,
    byte-identical to every pre-slice-3 fixture. Tests: `core-super-fees.test.mjs` (+6),
    `plan-money-basis-inventory.test.mjs` (+1), `app-settings-panel.test.mjs` (settings-panel box and
    courtesy objection).
  - ✅ **THE PERCENTAGE BOXES TAKE PERCENT AS SAID, user-approved 2026-09-25.** The admin-rate and
    investment-rate boxes on the settings panel now take `0.15` for 0.15% a year (was the decimal
    fraction `0.0015`) — `percentAsFraction`/`fractionAsPercent` (`planEdits.ts`) convert at the box
    boundary only; `plan.json` keeps storing the fraction, so an existing plan loads unchanged.
    `percentAsFraction` rounds to twelve significant digits (`fractionAsPercent`'s own bound, run the
    other way) so `0.15 / 100` stores exactly `0.0015` rather than a float residue. Label ends
    "% a year"; the echo under it reads "= $X a year on today's balance" via `feeRateDollarsAYear`,
    through `displayMoney.ts`'s `formatDollars` (no cents anywhere on this page). A courtesy warns,
    without refusing, above 3% a year (`feeRateWarning`) — real fund fees have never been seen at 3%
    in this build's research, so a bigger figure is far more likely to be the old decimal typed by
    habit. Tests: `app-settings-panel.test.mjs` (round trip + box/echo/guard tests).
  - ✅ **SLICES 1 AND 1b ARE DONE — admin ($ + %) and investment (%) on SUPER interests, engine
    AND form. A user can now state a fee and see it change the forecast.** Slice 1 (`aaccc25`,
    2026-09-20) built the engine; slice 1b (2026-09-21) put three boxes per interest on the
    household settings panel, with a live echo reading a typed `0.0035` back as `0.35% a year`.
    - ⚠️ **THE ITEM STILL STAYS UNTICKED, and the reason has CHANGED — read the parent's own verb.**
      This item's title names **insurance ($ with a stop age)** and that is **not built**: it is
      **slice 2**. The old reason ("there is no form box") is discharged. P3-17a below is separately
      research-gated. *Recorded this way deliberately: a parent box is not discharged by its
      children, and ticking this on "fees work now" would be the exact false green the 2026-09-20
      reconciliation pass existed to remove.*
    - **What landed.** Three OPTIONAL fields on `SuperInterest` —
      `statedAdministrationFeePerYear`, `statedAdministrationFeeRate`, `statedInvestmentFeeRate` —
      flat rather than a nested `fees` object, because a nested one gives **two spellings of "no
      fees"** (`absent` vs `{}`), the exact absent/null trap this door is built against.
      `monthlySuperFeesForOneMonth` in `projection.ts`, two new `MonthLine` constants, the three keys
      on `parseSuperInterest`'s allowlist. `test/core-super-fees.test.mjs`, 13 tests.
    - **BYTE-IDENTICAL, and proven rather than asserted:** with the engine change in and the new test
      file removed, every `core-*` test passes **1165/1165** — no pre-P3-17 expected figure moved.
      A nil or absent fee emits no line, per `growthLine`'s zero-suppression and the brokerage rule
      *"no line where there was no fee"*. An existing fee-less `~/.enough/plan.json` still parses.
    - **Rulings, each documented in the source.** Fee deducted BEFORE growth, so it earns no return
      (ADR-0009's direction; 47c apart in month 0 on a $100k account). **`rate / 12` arithmetic, NOT
      the geometric twelfth `monthlyGrowthFactor` uses** — a fee is a periodic charge, not a
      compounding return, and it charges slightly more, the non-flattering way. `Math.ceil` per
      component, so the all-three line is exactly the limbs charged alone. **Two lines, not one** —
      forced by the type: `UnlegislatedFigure` is `{basis, note}` and carries no `determination`, so
      a fee with no line of its own cannot be seen. **The cap is ORDERED, never pro-rated** — admin
      first, so an account worth less than a year's fees goes to nil rather than negative.
    - ⚠️ **THE ONE PLACE THIS TOOK THE FLATTERING SIDE, declared rather than buried — user endorsed
      2026-09-20.** The percentages apply to the **post-drawdown, pre-growth** balance, not the
      opening balance, because the payment is already ruled to fall on the 1st and charging the
      opening balance would levy a fee on money the fund no longer holds. **A wrong reading, not a
      conservative one** — conservatism is a tiebreak for genuine uncertainty, not a licence to model
      something false. Worth ~14c/month at 0.5% on a $40,000 drawdown.
    - **`planEdits.ts` needed a carrier and it is load-bearing.** `planWithStatedPosition` rebuilds
      every `SuperInterest` from the household form, so without it a hand-stated fee would be
      **silently dropped** on the next balance save — the file would still parse, still project and
      still draw a chart, with the fund free of charge. **Dropping a fee only ever flatters.**
    - **Sizing, and why this was worth doing at all:** at 0.75%/yr a fee costs ~20% of the terminal
      balance over 30 years, at 1.0%/yr ~26%. **P4-7's third Moneysmart run is now unblocked on this
      axis** — a forecast can be given the fund's real fees, which was the main reason this engine
      was expected to run rich against a calculator that charges them.
    - **Slice 1b, 2026-09-21.** Three boxes per interest in `settingsPanel.ts`; `planEdits.ts` gains
      `statedFee`/`feeBox` (one expression of "blank omits the key", not three copies of a `trim()`)
      and `negativeFeeObjection`, which judges the SIGN only and leaves NaN to the door.
      - ⚠️ **AN EMPTY BOX WRITES NO KEY — not a zero, and not a key holding undefined.** This is the
        property slice 1's byte-identical guarantee rests on, and it is pinned: a mutation making a
        blank box write `0` fails **11** tests. A typed `0` is different and is kept different — a
        stated charge of nothing, which round-trips as a key.
      - **The slice-1 carry-by-position is GONE, deliberately.** With a box, the carried key and the
        box would be **two writers of one fact**, and clearing a box would leave the fee charged
        anyway — the user's own instruction ignored, in the flattering direction. The hazard it
        guarded moved onto a round-trip assertion, three saves deep, with a positive control that
        `statedStreamSettings` and the Division 293 election ARE still carried by position.
      - ⚠️ **A SOURCE-CANARY TRAP FOUND HERE, and it generalises.** The repo's "written once, read
        once" canaries count over `executableCode`, which **blanks string literals**. Moving a key
        name into a shared helper's argument (`statedFee('statedAdministrationFeeRate', …)`) made a
        LIVE WRITER read as ABSENT — the canary silently stopped guarding what it names. **Pin a
        writer whose key is a string against the RAW source; pin the reader against the stripped
        code.** Same family as `grep` reading `projection.ts` as binary and tests reading `dist/`:
        a tool reporting "absent" when it means "cannot see".
  - [x] **P3-16b** `MORTGAGE_PAYOFF` — pay the home loan off in full in one month, as an EVENT entry
    with params `{}` (the amount is whatever the walk says is owed) — ✅ 2026-09-23
    - **Built:** `mortgagePayoffMonth` (`household.ts`) shares `mortgageMonth`'s interest expression
      (`monthsInterest`): the month's interest as usual, the whole opening balance as principal, nil
      close. At the pricing site it replaces `mortgageMonthOrRefuse` for that month, so its payment
      sits in the Waterfall `target` exactly where a repayment does, on the EXISTING two mortgage
      lines (principal attributed to the payoff entry, interest to the terms). The loan's TERMS are
      never unset — only the balance goes to nil — so `mortgagePayoff` reads CLEAR, the headline does
      not fall into case 6 ("no home loan yet"), and a later `MORTGAGE_REFINANCE` is a new loan.
    - **Rulings taken:** unfundable payout = `ONE_OFF_EXPENSE`'s (charged in full, the shortfall
      absorbs it, no new refusal). No loan in force / nothing owed = `RangeError` naming the entry
      and the month. Same month as a refinance = transition (viii)'s plan order: refinance-then-
      payoff pays the NEW loan out; payoff-then-refinance is **REFUSED, naming both entries** (LIZ
      ruling 2026-09-23 — the build first SUPERSEDED the payoff, which dropped the old payout: the
      flattering direction. The walk cannot tell "roll it over" from "pay out, then borrow", so it
      asks: remove the payoff, or date the new loan the next month). Dated before
      `asAtDate` = `ENTRY_KIND` `event` precedent: dropped, walk byte-identical, never refused.
    - **THE FINDING: an unfunded-shortfall test CANNOT see the Waterfall target.** `Unfunded
      shortfall` is a sweep at the month's close, so for a household holding nothing, leaving the
      payout OUT of `target` produced the identical shortfall and the first battery caught that
      mutation with ZERO tests. The target is only observable where a limb would have funded it —
      pinned with an Account-Based Pension that draws exactly payout − repayment ($498,492.49) more.
      Worth remembering for any future outflow added to `target`.
    - **Narrowed:** `parsePlan`'s nil-balance refusal on `MORTGAGE_REFINANCE` now points at this
      entry instead of saying a payout is "not modelled"; so do both on-screen loan notices and the
      README. What is still not modelled is paying PART of a loan off early with a lump sum.
  - [x] **P3-17a** ⚠️ **RESEARCH-FIRST, and the line below saying "it is not a separate task" is
    SUPERSEDED (2026-09-20 gate).** Every other figure in slice 1 is user-supplied — read off a
    statement, the same class as `Settings.nominalReturn`. An age-scaled premium is a **curve, not a
    number**, and there is **no source anywhere in this repo**: no `docs/research/` file, no register
    row, no cited table. Gate it behind a research pass producing `docs/research/p3-17a-*.md`, and do
    not let it block the parent. Original text kept below as written.
  - [x] **P3-17a** Premiums are **age-rated, not flat**. A figure taken from today's statement and
    held to 65 understates the drag badly through the fifties and sixties — the decade that
    decides the answer. Model an age-scaled premium schedule for Life / TPD / IP, and support the
    two entries that act on it: scale the cover back at a date, or cancel at age X. Extends P3-17;
    it is not a separate task (`concept.md` §5.9)
    - **2026-09-25 — slice 1 BUILT (not committed at time of writing): Death + TPD premium cost.**
      `SuperInterest.statedDeathPremiumPerYear`/`statedTpdPremiumPerYear`/`statedInsuranceCoverKind`
      (`'fixed'|'age-based'`, required with a premium)/`statedInsuranceAdminFeePerYear`; scaled by the
      ratio of Aware's Table 1/Table 2 (`src/core/superInsurance.ts`), nil from 70, one
      `Superannuation insurance` wealth line, form boxes + select. Source, formula and refusals:
      `docs/research/p3-17a-insurance.md`; tests `test/core-super-insurance.test.mjs`. **Still open:**
      IP; the two entries (scale back at a date, cancel at age X); fixed-TPD taper 61-70; the
      inactive/low-balance switch-off (both over-state cost).
    - **2026-09-25 — slice 3 BUILT (not committed): `INSURANCE_COVER_CHANGE`, "Change super insurance cover".**
      Both entries in one type: owner + interestIndex + benefit (`death`/`tpd`/`both`) + coverFraction (0 ≤ f < 1;
      0 cancels). That benefit's premium × f from the entry's month; each benefit still a ceiled twelfth; the admin
      fee stops once both are nil; the line is attributed to the governing entries. Per (Person, interest, benefit),
      latest in force governs (`TTR_RATE_CHANGE`'s shape, not the type+owner machinery); `level` kind. Door refuses
      f ≥ 1 by name (raising cover needs underwriting, not modelled), no premium for the benefit, a date on or after
      the 70th birthday, a household owner, a missing account. Absent is byte-identical (golden, chat, slice 1
      tests unchanged). Tests `test/core-super-insurance.test.mjs` (5 new); 3 mutations red (fraction ignored 4,
      admin kept 1, earliest governs 1). **⚠️ A pre-dated (before `asAtDate`) scale-back applies from month 0 on top
      of the stated premium** — a cut already on today's statement must not be entered again; not refused.
      **Ticked:** the title's verbs (age-scaled Life/TPD schedule, the two entries) are built; what is left is IP,
      now **P3-17b**, and two known over-statements (fixed-TPD taper, inactive switch-off), recorded in
      `docs/research/p3-17a-insurance.md`.
  - [x] **P3-17b** Income protection premiums in super. ⚠️ **GATED: research first** — Aware's Handbook IP table
    (IP ends at 65), waiting/benefit period factors, and whether IP premiums are paid from super at all for this
    household. Split out of P3-17a on 2026-09-25.
    - **Research GO, 2026-09-28:** `docs/research/p3-17b-income-protection-2026-09-28.md` (Insurance Handbook, 30 Apr 2026, Tables 4-6 p.20). Same ratio idiom as P3-17a; category, loading and waiting period cancel, but the **benefit period does not** (the three columns aren't proportional), so it is a new required input. IP is opt-in and ends at 65. **Answered 2026-09-28:** a real set of IP, death and TPD premiums was checked by hand and reconciles exactly to Tables 2-6.
    - ✅ **BUILT 2026-09-28 (`77f7719`).** `SuperInterest.statedIncomeProtectionPremiumPerYear` (Cents, today's premium) + `statedIncomeProtectionBenefitPeriod` (`'2-years' | '5-years' | 'to-65'`), stated together or not at all (door refuses either alone, by name; a cover kind beside IP alone is still refused — the kind is death/TPD's). Table 4 encoded verbatim as `INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND` in `src/core/superInsurance.ts`, beside Tables 1-2 with the same doc-comment source stamp (NOT under `src/data/assumptions/`: P3-17a's tables are not there, and the fund's product schedule is not a register figure). Premium = stated × Table4[period][age] / Table4[period][age₀], not CPI-raised, nil from 65. **Folded into the existing `Superannuation insurance` line** (P3-17a's pattern: death + TPD + admin are already one line); provenance note now names IP, p.20 and the 65 stop. The insurance admin fee is charged when ANY of death/TPD/IP is. `INSURANCE_COVER_CHANGE` does not touch IP. Settings: two boxes under the death/TPD ones (premium, "Income protection benefit paid for" dropdown, never preselected); the form objects to one without the other. Tests `test/core-super-insurance.test.mjs` (+8: Table 4 spot checks, Ruby and Amanda from p.19 hand-worked, IP-alone walk stops at 65 with admin, not CPI-raised + survives a death/TPD cancel, absent byte-identical, door, form); `test/app-settings-panel.test.mjs` pins moved (dropdown list, `statedFee` 16 → 17, writer table, two ROUND_TRIPS). 3 mutations red (not stopped at 65, wrong column, door accepts premium alone). **Gaps:** ~~an IP premium stated for a Person already 65+ (or under 15) at the plan's start throws a walk `RangeError`, not a door refusal — P3-17a's death/TPD have the same shape~~ (closed 2026-09-28, below); while an `INSURANCE_COVER_CHANGE` is in force the one line is attributed to it even though its IP part is not; ~~phase untouched~~ (ruled and fixed 2026-09-28, below).
    - ✅ **RULED + FIXED 2026-09-28 — cover ends at the pension.** User ruling: super insurance stops when the interest becomes a retirement-phase account-based pension (Insurance Handbook, 30 Apr 2026, scopes all cover to the Future Saver accumulation account). Walk: from the month `effectivePhaseFor` makes the interest an ABP — or the month its conversion day falls in, so a mid-month RETIRE ends cover that month — no death/TPD/IP premium and no insurance admin fee, for good. A TTR keeps cover while it is a TTR and loses it when it converts (RETIRE, early conversion, or 65); an account kept out by `keepInAccumulationAtRetirement` keeps it; a declared ABP never pays. An `INSURANCE_COVER_CHANGE` after the conversion changes nothing and does not throw. **Door gap closed:** a death/TPD premium at 70+ or IP at 65+ (or any under 15) at the plan's first month is refused by name at `superInterests[j].<premium key>` (`checkInsuranceAges`), no longer a walk `RangeError`. Provenance note and the cover-change entry notice say so. Tests +5 in `test/core-super-insurance.test.mjs`; golden byte-identical (demo states no insurance). ~~**Open:** a premium stated on a declared ABP interest is accepted and silently charges nothing~~ **closed 2026-09-28 (LIZ):** refused by name at the door (`checkInsuranceAges`), test + mutation red. On a real plan, the charges on the pension account are now gone.
    - ~~**Found on the way, open:**~~ (ruled above) Death/TPD premiums are charged whatever the account's phase (`projection.ts` insurance line, no phase check). The handbook scopes insurance to the Future Saver (accumulation) account, so a RETIRE that converts the whole balance to an ABP should probably end cover. Needs a ruling (does the household keep a Future Saver open for cover?). It moves no figure on the real plan, which states no insurance.
- [~] **P3-18** Contribution splitting (85%, applied year N+1, 100% to contributor's cap)
  - **Skipped by the user 2026-09-25**, after the research below reopened it. The sources are now primary (SISR reg 6.40-6.46, `docs/research/p3-18-contribution-splitting-2026-09-25.md`, GO for a 4-slice build), so no research blocks it if it is ever wanted. Not built. P6-5b depends on it and is skipped with it.
  - **Measured 2026-09-24 on a real plan: worth ≈ $0, so DEPRIORITISED.** The benefit would come from a partner's accumulation super being
    exempt while they are under Age Pension age, but a household RETIRE converts both partners' super to an assessable ABP once the partner is 60+, so
    that window never opens. Even with it open, assets sat well above the threshold in the gap. Revisit only for a household with
    a per-person RETIRE, a wider age gap, or assets near the threshold.
  - ⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit). `CONTRIBUTION_SPLIT` is a name + UI label only (`plan.ts:186`, `entryLabels.ts:41`), `UnspecifiedParams`, refused at the parse door. `grep -ac` in `projection.ts` = 0.
  - 🔴 **GATE: NO-GO — 2026-09-22 (LIZ), claims verified independently.** Two named conditions
    both trip. **The 85% split limit is uncited** — nothing in `src/data/assumptions/` names it,
    confirmed by grep. **No engine mechanic exists for the cross-year, cross-Person transfer this
    needs, and it's a genuinely new shape, not an adaptation of one that exists.** Confirmed
    directly: `applyConcessional` (the full cap assessment with carry-forward) is never called from
    the walk at all (`projection.ts:7757`'s own comment says so); there is zero Person-to-Person
    money movement anywhere in `projection.ts` (`grep -in spouse` returns nothing); the `governing`
    per-type+owner LEVEL idiom (`SPEND_CHANGE`/`RETURN_CHANGE`) is a continuously-held state, not a
    one-shot "apply exactly one year later, to a different Person, then stop" transfer — it does not
    fit. This needs new engine state on two axes at once (deferred by exactly one financial year,
    and moving between two Persons), which is materially bigger than "adjust existing cap tracking."
    **RULED BY LIZ, not escalated: park this rather than invent a one-off mechanic for a single
    feature.** Matches this project's own discipline — a bespoke, single-use piece of machinery is
    exactly what this codebase's shared-mechanism conventions (ADR-0002 among them) argue against.
    Revisit if a second feature ever needs the same "next year, someone else's account" shape.
- [x] **P3-19** Spouse contribution offset
  - ✅ **BUILT 2026-09-22.** All five build-order steps shipped: figures in `tax.ts` (§2.9),
    `spouseContributionOffset` beside `lowIncomeTaxOffset`/`seniorsAndPensionersOffset`, wired into
    `householdIncomeTax`'s item 20 residual alongside LITO, `SpouseContributionParams` specified and
    off `UnspecifiedParams`, and reached from the walk (`projection.ts`, a dedicated entry loop —
    `purchaseFromBuy`'s cash-on-hand cap, non-concessional, one `SPOUSE_CONTRIBUTION_LINE`) plus the
    form. Microtasks 4 and 5 (entry type/walk and form) were **shipped as one commit, not two**:
    `test/app-entry-form.test.mjs` checks `OFFERED_ENTRY_TYPES` against what `parsePlan` AND
    `projection.ts` both honour, so a parser+walk with no form control is a genuinely red interval
    in this codebase's own suite, not a deferrable one — `MORTGAGE_REFINANCE`'s own precedent for a
    type shipped whole. Full suite 2248 → 2273 tests (+25: 5 pure-function fixtures, 3 household-level
    fixtures, 9 walk-level fixtures in the new `test/core-spouse-contribution.test.mjs`, 8 door-level
    fixtures), zero regressions, zero fixture churn on the demo plan (`core-parse-plan.test.mjs`'s
    existing byte-identical-walk canary untouched).
    - ⚠️ **THREE ASSUMPTIONS, FLAGGED EXPLICITLY, NOT SILENT.** (i) **$40,000 is not a stored
      figure** — it is `lowerThreshold + base`, computed, on `watoShadeInPoint`'s own "store the
      formula, never the number" doctrine; the ATO's own guidance quotes it as a convenience, not a
      separate statutory figure. (ii) **s 63-10(1) placement is a reasoned INFERENCE, not a fetched
      item number** — no item of the fetched table (3, 5, 10, 15, 20, 21, 22, 40, 45) names Subdiv
      290-D, so it lands in item 20's residual beside LITO, on the same "any tax offset not covered
      by another item" wording that already carries LITO. (iii) **The deductibility exclusion needs
      no field.** s 290-150's personal-contribution deduction applies only to a contribution to the
      CONTRIBUTOR's own interest; `SPOUSE_CONTRIBUTION` is definitionally paid into the RECEIVING
      spouse's interest, so the two can never be the same dollars — this is a structural fact about
      the two entry shapes, not a gate this build enforces. Likewise the "permanently separated"
      exclusion: this codebase has no fact for it distinct from Household shape, and a 2-Person
      Household is already read as `relationship: 'couple'` everywhere else in `incomeTax.ts`
      (SAPTO, the Medicare levy family path) — `SPOUSE_CONTRIBUTION` reuses that reading rather than
      inventing a second one.
    - **Mutations run, applied and compiled, three of three as specified.** (a) drop the taper
      (`taperedBase = SPOUSE_OFFSET.base.value`, ignoring income) — compiles, **caught by 3 tests**.
      (b) drop the $540 cap (`return raw`, no ceiling) — compiles, **caught by 0 tests**, and this is
      a genuine structural finding rather than a coverage gap: `base × rate` = $3,000 × 18% = $540
      exactly, with no rounding overshoot possible (an exact integer-cent multiplication), so the
      explicit ceiling can never bind against any input this formula can produce — it exists as a
      direct statement of s 290-235 rather than an emergent property, exactly as `tax.ts`'s own
      record says, and no input constructs the case that would distinguish "cap present" from "cap
      absent". (c) make it refundable — applied the offset AFTER the shared LITO/SAPTO cap, uncapped
      against remaining liability; **compiles** (`Cents` carries no non-negativity constraint, so
      TypeScript does not catch it) but is **caught by 2 direct tests and 37 across the full suite**
      — refundability is structurally unreachable through the shared non-refundable stack this offset
      reuses, confirmed by trying rather than assumed.
  - 🟢 **GATE: GO — 2026-09-22 (LIZ), figures independently fetched and confirmed, not taken on a
    research pass's word.** I curled the ATO's own page myself and the exact figures appear
    verbatim.
    - **The shape fits an established, TWICE-proven pattern — non-refundable, capped at tax
      otherwise payable, same as WATO/LITO/SAPTO.** `incomeTax.ts:976-985` shows WATO was added as
      a THIRD offset directly inside `householdIncomeTax` today, sequenced per s 63-10(1)'s
      imperative order ("Adding a third offset does not automatically inherit it: WATO is s
      63-10(1) item 3... SAPTO at item 5"). A fourth offset follows the same, now-proven pattern.
      This touches `incomeTax.ts`'s core but NOT the refundability invariant `individualFranking.ts`
      protects — it stays inside the existing `offsetsApplied` stack alongside the other three.
    - **Every figure sourced, verified twice** — once by the research pass against the ATO's T3
      2026 instructions page, and again by me fetching that exact page directly: **$540 maximum**,
      **18% of the lesser of** ($3,000 reduced dollar-for-dollar once the RECEIVING spouse's income
      exceeds $37,000, cutting to nil at $40,000) **or the contribution actually made**. "Spouse
      income" for this test is assessable income + reportable fringe benefits + reportable employer
      super contributions — NOT simply taxable income. Section: ITAA 1997 Subdiv 290-D, s 290-230
      (the formula) and s 290-235 (the $540 ceiling) — confirmed via AustLII's indexed text,
      consistent with the ATO's own restatement.
    - **Not indexed — a fixed figure since 2017, flagged for periodic recheck rather than treated as
      permanently stable.** No indexation provision exists in the Act; last changed by the
      *Treasury Laws Amendment (Fair and Sustainable Superannuation) Act 2016*. Source this
      sub-point's confidence honestly in the assumptions record: inferred from the absence of an
      indexation clause and unchanged figures 2017-2026, not a positive primary-source statement.
    - **Build order:** (1) source the figures into `src/data/assumptions/tax.ts`, `primary-verified`
      against the citations above, with a note flagging periodic recheck (no auto-indexation).
      (2) `spouseContributionOffset` computation beside `lowIncomeTaxOffset`/
      `seniorsAndPensionersOffset` in `incomeTax.ts`, same income-tested-taper shape. (3) wire into
      `householdIncomeTax` at its correct `s 63-10(1)` position relative to WATO/SAPTO/LITO,
      following the WATO sequencing pattern exactly. (4) specify `SpouseContributionParams` in
      `plan.ts`, move `SPOUSE_CONTRIBUTION` off `UnspecifiedParams`, wire the contributing/receiving
      Person pair. (5) reach it from the walk; fixtures and tests as usual.
- [x] **P3-20** **Non-Super Portfolio as a first-class, drawable pool that defaults to empty** —
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). Parcels + `financialAssets` in `household.ts:442-772`; waterfall limb 3 wired (`nonSuperPortfolio` appears 11× in `projection.ts`). Sub-chunks through P3-21f shipped 2026-09-18.
  the pre-60 Liquidity Bridge. A **capability**, not a holding: the Household owns no investments
  outside super today — only the Offset Account — and expects to own none, but ETFs are a vehicle
  under consideration and the model must be able to hold them the day one is bought. See
  [ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md) and `concept.md` §5.12
  - ⚠️ **Sub-items reconciled 2026-09-23.** The parent was ticked with every child still open.
    a–e are built and now ticked, each with its evidence; **f stays open**, and why is written on it.
  - [x] **P3-20a** ✅ *(2026-09-23 reconciliation: `splitAssets` classifies the portfolio assessable
    and deemed with no age or phase gate; `financialAssets` is derived from the parcels.)*
    **Assessable and deemed from the first dollar**, both tests, with none of the
    shelter super gets. A bridge built larger than it needs to be is an Age Pension cost later —
    the tool prices that trade, it does not recommend a side
  - [x] **P3-20b** ✅ *(2026-09-23 reconciliation: limb `nonSuperPortfolio` in `WATERFALL_LIMBS`,
    drawn since P3-21f. ⚠️ The order has since been changed by user ruling: cash NOT offsetting the
    loan now comes before the portfolio — "Spend cash first", 2026-09-23. Offsetting cash is still
    after it, so the reasoning below survives for that cash only.)*
    It enters the **Income Waterfall** between the Account-Based Pension minimum and
    the Offset Account (P4-3). Offset stays last: a dollar there earns the mortgage rate risk-free
    and untaxed, so it is the most expensive dollar in the Household to spend
  - [x] **P3-20c** ✅ *(2026-09-23 reconciliation: buy and sell are both specified, parsed, walked and
    offered on the form — `NonSuperInvestmentParams`, P3-21f chunks 3-4, P6-5c; a sell realises CGT.)*
    `NON_SUPER_INVESTMENT` entry — buy into or draw from the portfolio, owned per
    Person. A draw is a disposal and realises CGT (P3-21); the two are not separable
  - [x] **P3-20d** ✅ *(2026-09-23 reconciliation: a constraint, not a build — and it holds. The
    Offset's means-test treatment was not changed by P3-20/21; its mortgage job went live with P3-16.)*
    The Offset Account is now doing **three** jobs — liquid buffer, mortgage
    reduction, bridge funding. Its means-test treatment is unchanged; only the reason to hold it is
  - [x] **P3-20e** ✅ *(2026-09-23 reconciliation: P3-21f chunk 1's byte-identity bar — a Household
    holding nothing projects byte-identically; asserted in `core-non-super-parcels`, `-buy` and
    `-gain-tax` tests.)*
    **Empty is a supported state, not a special case.** A Household holding no
    investments outside super must project **identically** to one modelled before P3-20 existed: no waterfall
    step firing on a zero balance, no asset line in the means-test split, no CGT event, no change
    to any existing expected value. The seam is already built and behaves this way — `Person`
    carries `financialAssets` and `splitAssets` emits no line when it is zero
    (`src/core/household.ts`) — so the test is that the rest matches it. Assert it: the current
    hand-worked Age Pension fixtures must not move when the pool lands
  - [ ] **P3-20f** ⬜ *(2026-09-23 reconciliation: OPEN BOX CORRECT, PARTIAL. The engine obeys the
    asymmetry and a test asserts it in both directions (`core-projection-sacrifice-credit`). P6-8b
    surfaces it on the comparison only as a COUNT of Age Pension months — the `AssetLine.reason`
    strings this item names are not used by the comparison surface.)*
    The **means-test asymmetry** is the non-obvious consequence and the engine must
    expose it rather than merely obey it. `financialAssets` are assessable **and** deemed with no
    age gate; Accumulation Phase super under Age Pension age is protected and undeemed, so it
    enters neither figure `agePensionEntitlement` consumes. The `AssetLine.reason` strings already
    carry the *why* for P5 auditability — the requirement here is that the comparison surface uses
    them (P6-8) instead of leaving the user to notice. The exemption itself is **P3-13**; do not
    duplicate its rules here
- [x] **P3-21** **CGT on the Non-Super Portfolio** — un-parked 2026-09-04 by ADR-0009, because
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). FIFO parcel selection, 12-month discount, tax-base integration and disposal draw all shipped 2026-09-18; `core-non-super-parcels.test.mjs` (773 lines), `core-non-super-disposal.test.mjs` (699 lines).
  "nothing outside super to tax" stopped being true. A substantial rules area entering scope
  deliberately, not by implication
  - ⚠️ **Sub-items reconciled 2026-09-23.** The parent was ticked with a–d still open; all four are
    built (P3-21f chunks 1-6, 2026-09-18) and are now ticked with their evidence.
  - [x] **P3-21a** ✅ *(2026-09-23 reconciliation: `Parcel` carries acquisition date and cost base;
    `ParcelSelection` defaults to `oldest-first` via `DEFAULT_PARCEL_SELECTION` and is overridable on
    each sale, as the ruling below requires.)*
    **Cost base per parcel, never per account.** The 12-month discount and parcel
    selection both turn on which parcel is sold and an average cost base can express neither.
    Track acquisition date and cost per parcel; select explicitly, default to a stated rule. This
    is the "just track the balance" trap — the wrong answer looks right
    - ✅ **THE RULE IS NOW STATED — RULED 2026-09-17: OLDEST PARCEL FIRST (FIFO).** This item said
      *"default to a stated rule"* and never stated one. The user's words: *Oldest first*. Chosen
      over minimise-gain-this-year and realise-gain-deliberately because it is the **predictable**
      one: it is what share registries default to, it maximises the chance a parcel has passed the
      12-month mark and so earns the 50% discount, and the other two are **tactics for a particular
      year rather than defaults worth running silently for forty**. ⚠️ **It is a DEFAULT, not a
      policy:** it must be visible and overridable per disposal (ADR-0004 proposes, it does not
      dispose), and the alternatives stay reachable because P3-21d's sequencing lever is exactly
      the case for choosing against FIFO in a low-income year
  - [x] **P3-21b** ✅ *(2026-09-23 reconciliation: `test/core-non-super-gain-tax.test.mjs` §4 — the
    gain reaches the brackets, LITO, SAPTO's rebate income and the Medicare levy, each with its own
    dollar figure, and never WATO's net labour income.)*
    50% discount for an individual on a parcel held **more than** 12 months, applied
    to the nominal gain. The discounted gain lands in **taxable income**, so it flows through the
    brackets, LITO, SAPTO's rebate income and the Medicare levy — the four bases of P3-2 and T9 that
    a non-labour amount can raise apply unchanged. A discounted capital gain is **not** a labour
    amount under ITAA 1997 s 61-155(2), so it never enters WATO's net labour income, which is the
    fifth base from FY2027-28 (§2.8.1). It is not taxed on its own schedule
  - [x] **P3-21c** ✅ *(2026-09-23 reconciliation: parcels are owned per Person, a `household` owner is
    refused, and gain-tax §5 prices the same sale routed to the other Person: $32,900 vs $12,920.)*
    A realised gain is **per Person**, on that Person's parcels, and cannot be
    shifted after the fact. Whose name the bridge is in is a decision made years before it matters
  - [x] **P3-21d** ✅ *(2026-09-23 reconciliation: the lever exists — a dated `NON_SUPER_INVESTMENT`
    sell with a chosen `ParcelSelection`, taxed under its own year's rates (gain-tax §3). No solver
    picks the year for you; this item asks only that it be modelled.)*
    Sequencing disposals against the retirement date is the largest lever here: the
    same gain can be taxed at a low marginal rate in a low-salary year or at 39% in the last full
    working year. This is why the section is modelled rather than estimated
  - [x] **P3-21f** ✅ **DONE 2026-09-18 — ALL SIX CHUNKS SHIPPED, and limb 3 draws.** The chunk plan
    below is kept as written (2026-09-17) because the rulings inside it are still live; what changed
    is that every chunk of it is now built, so the refusal quoted in the next sentence is
    **DISCHARGED ON ITS OWN STATED GROUND** and `unfundedMiddleLimbs`' funded branch is now a
    tripwire rather than a finding. ⚠️ **Two consequences worth carrying forward.** (i) Chunk 1's
    byte-identity bar now holds only for a Household holding NOTHING — a FUNDED one legitimately
    moves, and `BEFORE_FUNDED` is asserted against rather than refreshed. (ii) `closingBalance < 0`
    stopped being unreachable-by-arithmetic: the draw is to NEED, so the CGT it realises is an
    outflow the Waterfall never saw, and a **second `Unfunded shortfall` sweep** runs after every
    line of the month is pushed. A month can now carry two shortfall lines and they are not merged.
    Limb 3 was the last limb of the Income Waterfall that drew nil. Its `note` named the blocker
    exactly: *"drawing it is a CGT disposal on a per-parcel cost base this model does not
    hold"*. **Build it the way limb 2 was rebuilt at `9a767fa`** — decision functions that each
    answer ONE question, state threaded through `project()`, one line per disposal per month, and
    the balance write-back reading the same array the lines were emitted from, so no balance can
    move without a line.
    - ⚠️ **THE STRUCTURAL FACT THAT SHAPES EVERYTHING: the pool ALREADY EXISTS as a scalar.**
      `Person.financialAssets: Cents` is live today, and `splitAssets` classifies it `assessable`
      **and** `deemed` unconditionally, with no age gate and no phase gate. So this work does **not**
      introduce the pool — it gives an existing pool a cost base and a way to move. **`financialAssets`
      must become DERIVED from the parcels (the sum of their market values), never a field kept
      beside them.** Two spellings of the same money is this repo's oldest trap and the means test
      reads the scalar — if the two can disagree, the Age Pension silently disagrees with the
      portfolio.
    - **Chunk 1 — the parcel, and nothing that moves.** A `Parcel` holding **acquisition date,
      cost base, units-or-market-value**, owned per Person (P3-21c). `financialAssets` becomes a
      derivation over parcels. No entry, no draw, no tax. **The assertion:** a Household whose
      parcels sum to its old `financialAssets` figure projects **byte-identically** to before — the
      same reproducibility bar P4-1a set, and the same one chunks 1 and 2 of P4-1 met.
    - **Chunk 2 — growth accrues to MARKET VALUE, never to cost base.** The pool is already grown
      monthly at `nominalReturn`. **The assertion:** after a year of growth the unrealised gain is
      exactly the growth, and the cost base is unchanged to the cent. ⚠️ **THE TRAP, and it is the
      P3-21a flavour — growing the cost base alongside the value makes every gain VANISH and every
      figure still looks plausible.** A test must fail if cost base moves.
    - **Chunk 3 — `NON_SUPER_INVESTMENT` gets real params (P3-20c).** Today `UnspecifiedParams`, so
      no entry can fund or draw the pool at all. Buy creates a parcel dated the entry's date at the
      stated cost; the entry is owned per Person like every other. **Still no draw, still no tax.**
    - ✅ **RULED 2026-09-17 — BROKERAGE IS RECORDED, AND THE COST BASE IS THE HIGHER FIGURE.**
      Chunk 3 shipped with the stated amount as the whole cost base and no field for incidental
      costs. The user's choice: *higher cost base*. Incidental costs of acquisition form part of a
      CGT cost base under **ITAA 1997 s 110-25**, so recording them raises the cost base and lowers
      the taxable gain. The default it replaces (ignoring them) **overstated** the gain and the tax
      — conservative, and now superseded by the accurate treatment.
      - ⚠️ **THIS BREAKS AN INVARIANT CHUNK 3 ASSERTED, deliberately, and chunk 4 owns the
        rewrite.** Chunk 3's `NonSuperInvestmentParams.amount` doc states that cost base and market
        value *"are the same figure"* on the day of purchase. With brokerage they are **not**:
        brokerage is **paid** but buys no units, so a $50,000 buy with $30 of brokerage is
        **$50,030 of cash out**, a **$50,030 cost base** and a **$50,000 market value**. The
        parcel is under water by the brokerage from the moment it is bought, which is correct and
        is what a real disposal nets off.
      - **Consequences to carry:** the cash outflow is the **gross** figure, so chunk 3's
        dollar assertion (*"exactly $50,000 poorer in cash and $50,000 richer in parcels"*) must be
        **rewritten, not deleted** — it becomes $50,030 poorer and $50,000 richer. The funding cap
        `min(stated, cash)` must cap on the **gross** cost, or a household with $50,010 buys a
        parcel it cannot pay for. And the means test reads `marketValue`, which brokerage does
        **not** raise — so no Age Pension figure moves.
      - **Not settled here and chunk 4 owes it a line:** whether brokerage on the *disposal* side
        (s 110-25 covers acquisition; disposal costs reduce the proceeds) is carried too. Symmetry
        argues yes; state the choice where the code is rather than leaving it implied.
    - **Chunk 4 — the disposal and the discount (P3-21b).** Selling a parcel realises
      `proceeds − cost base`; the **50% discount applies to a parcel held MORE THAN 12 months**.
      ⚠️ **Off-by-one trap: exactly 12 months does NOT qualify** — assert the day either side of the
      anniversary, and assert them as distinct dollar figures rather than as a boolean.
    - **Chunk 5 — the gain reaches the tax bases, and it is NOT taxed on its own schedule.** The
      discounted gain lands in **taxable income** and flows through the brackets, LITO, SAPTO's
      rebate income and the Medicare levy — the four bases of P3-2/T9. ⚠️ **It is NOT a labour
      amount (ITAA 1997 s 61-155(2)), so it must NEVER enter WATO's net labour income**, the fifth
      base from FY2027-28. A test must fail if WATO moves when a gain is realised.
    - ✅ **Chunk 6 — limb 3 draws. DONE 2026-09-18.** `nonSuperPortfolio.available` is the whole
      market value of the Household's parcels (`nonSuperPortfolioLimb`), allocated back in the
      Household's stated order and disposed of through `disposalOfAmount` — the SAME arithmetic a
      stated sale goes through, at `DEFAULT_PARCEL_SELECTION`, because an automatic draw has no entry
      to carry P3-21a's override. The gain goes through the one `chargeCapitalGain` accumulator, so a
      Person who draws automatically AND sells by entry in one month is assessed once on the union —
      $2,350 in the fixture, against the $11,750 a second accumulator gives. Only now does
      `nonSuperPortfolio.available` stop being nil and its note stop being the refusal quoted above. **The assertion:** the P4-7 Moneysmart scenario plus
      a funded portfolio draws limb 3 **after** the ABP and **before** the offset, with a dollar
      figure no adjacent transposition can produce — the same order fixture limb 2 earned.
    - ⚠️ **THE TRAP WITH NO CHUNK OF ITS OWN: the tax on a disposal is owed in a LATER financial
      year than the money it funded.** Selling $X to fund $X of spending leaves a tax bill that
      itself needs funding, so a naive limb 3 funds this year's target and quietly underfunds a
      future one. **Precedent settles the direction and it must not be re-litigated:** the register
      already forbids the Waterfall funding spending from a refund before the refund exists. Draw to
      NEED, let the liability fall in its own financial year, and let the shortfall machinery report
      it honestly if it cannot be met. **Do not gross the draw up to cover a tax not yet owed.**
    - **Settled by precedent, so NOT rulings — do not put these to the user again.** *Whose parcels
      sell first:* the Household's own stated order, exactly as limb 2 allocates across two people.
      *Where a surplus goes:* into `lines` as an inflow and thus into `closingBalance`, as limbs 1
      and 2 already do. *Franking:* in scope by ADR-0010 but a **separate** rules area on both sides
      of super — it is P3-22/P3-7a/P3-7b, not this plan, and folding it in here would make the
      chunk list unfinishable.
    - ✅ **RULED 2026-09-17 — OLDEST PARCEL FIRST (FIFO), and chunk 4 is unblocked.** This was the
      one ruling the plan deliberately did not make. The user chose FIFO over minimise-gain and
      realise-gain-deliberately, on predictability: it is the registry default, it maximises the
      chance the 12-month discount applies, and the other two are tactics for a particular year
      rather than defaults worth running silently for forty. **Stated and overridable per disposal,
      never hidden** (ADR-0004). See P3-21a, where the rule now lives. ⚠️ **Chunk 4 must assert
      FIFO with a dollar figure that the other two selection rules could NOT produce** — a fixture
      of three parcels whose orderings give three different tax bills, or the default is untested.
    - **Size, honestly.** Larger than the limb 2 job that landed today (3 files, ~620 insertions,
      one day): six chunks against that one, a new data structure rather than a rewritten function,
      and a tax-base integration limb 2 did not need. ⚠️ **And the CGT half CANNOT be validated
      externally** — ASIC's Moneysmart states it *"does not explicitly allow for any associated
      taxes on these income or capital gains"* on non-super assets and does not model CGT on
      drawdowns. So chunk 6 is checkable against an outside engine and **chunks 4 and 5 are not**:
      they must be defended by the Act and by hand-worked fixtures. **That is where the risk
      concentrates**, and it is the argument for the per-chunk assertions above being dollar
      figures rather than shapes.
  - [~] ~~**P3-21e** Franking credits stay **out of scope** — but on a new argument, since the old
    one died with the same sentence CGT's did. Distributions are modelled as cash without
    imputation, understating after-tax return on Australian equity in the conservative direction.
    Reopen if the portfolio ever becomes the main holding rather than a bridge~~ — **superseded
    2026-09-04, same day it was written**, by **P3-22**. The user overturned the replacement
    argument: the understatement is of the order of 1.0–1.5% a year and systematic in one
    direction, which tilts P6-8 toward super — the comparison the portfolio was admitted to
    inform. Conservative is the right default for a figure nobody is deciding on and the wrong one
    for the figure being decided. Kept, struck through, because the record of a scope call reversed
    the day it was made is worth more than a tidy list
    ([ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md))
- [x] **P3-22** **Franking credits and dividend imputation** — ✅ **Ticked 2026-09-23 in the
  reconciliation pass: every child a–h is ticked, and BOTH sides are live in the walk** —
  `projection.ts` imports and calls `frankingForIndividual` (`59d9ae5`, step 3 of P3-22h) and
  `frankingInSuper` (`a0fc0c9`, P3-42 step 3). The "VERIFIED NOT BUILT" audit line below was true on
  the morning of 2026-09-22 and false by that evening. — un-parked 2026-09-04 by
  - 🟢 **GATE: GO — 2026-09-22 (LIZ), verified independently, not taken on the agent's word.**
    - **The "both sides or neither" bar (P3-22a) is met at the SAME bar the super side cleared.** P3-7a/b are ticked DONE on a pure, sourced, tested module that is NOT wired into the walk: `grep -rn frankingInSuper src/ test/` returns test files ONLY, zero production call sites. Confirmed 2026-09-22. So the individual side ships the same way, and "make it count in a live forecast" is an explicitly SEPARATE later item. Do not let a future pass read P3-22 as unfinished because no figure moved.
    - **The refund path needs NO change to `incomeTax.ts`.** LITO/SAPTO/WATO stay non-refundable; that invariant is untouched. Run `householdIncomeTax` twice — once without the distribution, once with the grossed-up amount — and diff `netTax`. This is not a new trick: `assessCapitalGainCharge` (`projection.ts:5358-5384`) already ships exactly this decomposition in production, and `frankingInSuper` already uses the same `refund = offset > liability ? ...` shape.
    - **Fixture churn: ZERO**, via the nil idiom that worked for P3-17's fees. No stated distribution ⇒ $0 cash, $0 credit ⇒ every figure `+0`. And the nil default is the statutory truth for a Person holding no equities outside super, not a convenience. New coverage lands in a NEW test file, mirroring how P3-7a/b landed.
    - **No figure is invented.** Gross-up, the offset, individual refundability (s 67-25(1) / s 63-10(1) item 40), the $5,000 small-shareholder ceiling — all already `primary-verified` in `franking.ts` and sitting unused. The only new numbers are the user's own distribution figures.
    - ⚠️ **GAP FOUND, and it is the real work: the portfolio has no concept of paying anything out.** `parcelsGrownForOneMonth` grows 100% into market value; nothing distributes a cent until a sale. So this item needs a way to STATE a distribution, which is a new kind of input rather than merely a rate. That is what the open question below is about — not scope creep, it is P3-22b's cash-plus-credit.
    - **RULED BY LIZ on precedent, not escalated** (two of the gate's three "open decisions" were already settled): (1) ships as a tested module, NOT wired into the live walk — precedent is P3-7a/b, identical shape; (2) a distribution is treated as REINVESTED for now, not as spendable cash — that matches what the portfolio already does today, so it moves no figure, and "spend your dividends" becomes its own later item. Escalated to the user: only HOW the distribution figure is stated.
    - **Register bears on the input shape (T43, §5A.3.1, settings.ts:201):** there is deliberately NO portfolio-level franking rate, because a diversified ETF spans both the 25% and 30% payer rates and no single legislated figure exists. The preferred route takes the franked amount and the credit as TWO DOLLAR FIGURES from a statement (`frankedDistributionFromStatement`, needs no rate). `frankedDistributionFromRate` exists but takes the rate from the caller with the caller's own confidence. A source canary enforces that no rate-shaped literal enters `superFranking.ts`. **Do not add a blended rate constant to make this easier.**
  - ~~⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit).~~ **SUPERSEDED the same day — see the parent.** Only the SUPER side of franking is built (`core/superFranking.ts`, P3-7a/b). `src/data/assumptions/franking.ts:292` states in terms: 'NOT READ BY ANY CODE: the individual side of franking (P3-22)'. Blocked on nothing technical — `superFranking.ts` is a reusable template. Note P6-8d makes this a ship-blocker for the sacrifice-vs-invest comparison.
  [ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md), reversing P3-21e on
  the day it was written. Parked twice and entering scope on the second reversal: the omission is
  ~1.0–1.5% a year on Australian equity and **systematic in one direction**, so it biases the
  sacrifice-versus-invest comparison (P6-8) toward super rather than averaging out
  (`concept.md` §5.14)
  - [x] **P3-22a** ✅ **Both sides, or neither — MET 2026-09-22, at the same bar the super side cleared.** `individualFranking.ts` ships as a pure, sourced, tested module with **zero production call sites**, which is exactly what P3-7a/b ticked DONE on. `grep -rn 'frankingForIndividual\|frankingInSuper' src/` returns nothing but the modules themselves, and `test/core-individual-franking.test.mjs` asserts that of BOTH modules against `projection.ts` — so the day either is wired in, that test goes red and whoever wires it has to decide about the other. **The finding: "both sides" is now defended by a test rather than by a TODO line.** Original text: This is the governing requirement of the task,
    not a sub-case. Franking attaches to Australian equity income **inside super as well as
    outside it** — see **P3-7a** and **P3-7b**, which hold the super side and are extended rather
    than duplicated here. Modelling only the non-super side over-corrects and biases the same
    comparison the other way, just as invisibly. No franking arithmetic ships on one side alone
  - [x] **P3-22b** **Gross-up — ✅ 2026-09-22, `src/core/individualFranking.ts`.** No new gross-up expression was written: the module takes a `FrankedDistribution` built by `superFranking.ts`'s two constructors and reads `grossedUpAmount` off it. **The finding is that reuse was the only safe option.** A second gross-up here would have been a second place `f × D × r/(1−r)` lives, and T44's 60c-per-$100,000 error is exactly what a drifting second copy produces. It also keeps the branded type single — `test/brand-spread-sweep.test.mjs` discovers object-shaped brands in `src/core/` and pins the count, so a second `FrankedDistribution` would have been fixture churn as well as a correctness risk. Original text: A franked distribution is assessable as cash **plus** the attached
    credit. The grossed-up amount is what enters taxable income, not the cash received. **Sourced
    2026-09-04 — register §5A.1–§5A.2** (P1-11 closed). Read what it says before implementing: the
    gross-up is an *addition of the credit*, not a rate applied to the cash, and **no portfolio-level
    gross-up rate exists in law** (T43), so there is no figure here to lift — the effective rate is a
    Setting and the credit normally arrives as a dollar amount on a statement. Where a credit is
    derived, compute `D × r/(1−r)` directly (T44)
  - [x] **P3-22c** **The franking offset — ✅ 2026-09-22.** The order is structural, not asserted: the only thing added to taxable income is `distribution.grossedUpAmount`, and the offset is subtracted from a **difference `householdIncomeTax` computed**, so there is no expression in which the cash is taxed and the credit offset. **What surprised me is how much the offset runs against that no marginal rate names.** On a $1,000 gross-up at a $40,000 baseline the extra tax is $220, not $150: $150 bracket + $20 levy + **$50 of LITO taper**. A hand-written "30% marginal" model would have refunded $150 too much. Original text: claimed against tax payable on the grossed-up amount.
    Note the order: gross up first, tax the larger figure, then offset. Taxing the cash and
    offsetting the credit is the plausible-looking wrong implementation
  - [x] **P3-22d** **Refundability of excess credits — ✅ 2026-09-22, and `incomeTax.ts` was NOT touched.** The refund is produced by differencing two assessments and subtracting the credit from the difference — never by letting `netTax` go below zero. That is the whole reason LITO/SAPTO/WATO stay non-refundable: an implementation that made the Division 207 offset refundable *inside* `householdIncomeTax` would have made LITO refundable for every Household in every year, and no franking fixture would have noticed. **T46 is satisfied by symmetry of shape**: `refund = offset > tax ? offset − tax : 0` is the same expression on both sides, in two files, and neither floors the other direction away. Original text: — the half that makes this worth modelling
    at all. Where the credit exceeds tax payable, an individual receives the difference **in cash**
    rather than wasting it, and so does a complying super fund. A retiree with low taxable income
    is exactly that case, which is why this is largest in precisely the years the projection is
    about. **Sourced 2026-09-04 — register §5A.3**, both sides. The register's warning goes with it:
    refundability is *equal* on the two sides and is therefore **not** a super advantage, and
    refunding on one side while only offsetting on the other manufactures a spurious one (T46)
  - [x] **P3-22e** **The 45-day holding rule — ✅ 2026-09-22 as an ASSUMPTION, as ruled; the machinery is still not built and must not be.** `IndividualFrankingFacts` states `qualifiedPerson`, `relatedPayment` and the year's total credits, all required and undefaulted. **Two findings.** (1) The $5,000 test could not be taken per distribution: aggregation is at taxpayer and income-year level across the whole portfolio, so defaulting it to this distribution's own credit would let six $1,000 distributions claim a relief a single $6,000 one is denied — hence a required caller figure, which nothing in this model can cross-check because the portfolio distributes nothing (`parcelsGrownForOneMonth`). (2) T47's direction is now executable rather than prose: a related payment does not disqualify, it costs the shelter — so `relatedPayment: true` with credits **under** the ceiling still refuses, and that is the row a reader would most likely get backwards. ⚠️ **The on-screen flag for a disposal landing inside the window is NOT built** — there is no screen for it until P3-22h, and nothing to flag until the walk knows about distributions. Original text: — an assumption, not machinery.** Buy-and-hold ETF
    positions qualify without effort — 45 countable days needs 46 calendar ones, once per parcel — so
    day-level qualification tracking is machinery for a case the Household is not in. But disposal
    sequencing (P3-21d) is what could put it in that case. **The engineering decision is unchanged:
    the engine assumes qualification, states the assumption on screen, and flags a disposal landing
    inside the window** instead of silently crediting it. ⚠️ **What changed on 2026-09-04 is the
    wording of the assumption.** This entry used to say "a small-shareholder exemption sits below a
    credit threshold" as a general proposition. **That is wrong on the super side.** The exemption is
    **individuals only** — ITAA 1936 former s 160APHT(1)(a), "the taxpayer is an individual" — and a
    complying fund, APRA-regulated or SMSF, has **no equivalent relief at any credit level**
    (register §5A.6, T49). So the on-screen assumption is not one sentence but two: an individual
    under the threshold is a qualified person for **all** dividends without the 45-day rule; the super
    side has no such shelter and rests on the 45-day rule alone. The threshold is **now sourced —
    $5,000, and frozen** (register §5A.5, T48) — where this entry previously said it was unsourced, so
    the flag may state the number. **A related payment does not disqualify**; it switches the test to
    the secondary ±45/±90 window (T47), which is what the flag must not get backwards. If the flag
    ever fires in a real scenario, that is the argument for building the rule properly
  - [x] **P3-22f** ✅ **2026-09-22, and the fifth base is excluded STRUCTURALLY rather than asserted.** All four bases move because `householdIncomeTax` derives family income from the two taxable incomes and SAPTO from the two Rebate Incomes — nothing had to be told to raise them. The fifth cannot be reached: `IndividualFrankingPerson` carries `netLabourIncome` as a field the module copies and never computes with, and Rebate Income is rebuilt from **add-backs** rather than added to, so there is no expression in which a distribution reaches WATO's base. **The counter-intuitive case is built and it is bigger than expected**: at a $40,000 baseline a $1,000 gross-up costs $220 — $150 bracket, $20 levy and $50 of LITO taper — so a "30% marginal" model over-refunds by $70 on a $300 credit, 23% of it. ⚠️ **Defended ONE test deep, and it is the FY2027-28 WATO case**: nothing else in the suite reaches `watoComputed` through this module. Original text: a non-labour amount
    can raise** — brackets, LITO, SAPTO's rebate income, the Medicare levy (P3-2, T9), exactly as the
    discounted capital gain does (P3-21b). Not the fifth: a franked distribution and its gross-up are
    not labour amounts under ITAA 1997 s 61-155(2), so neither enters WATO's net labour income. The counter-intuitive case the tests must cover: a distribution that is
    tax-neutral in itself and still costs an offset, because the gross-up moved the base the offset
    tests against
  - [x] **P3-22g** ✅ **2026-09-22, and what is ticked is the ABSENCE, which is worth stating plainly.** The module's only unit of time is a `FinancialYear`; there is no month in it, no monthly figure, and a source canary asserts that. So the timing bug cannot be committed here — it can only be committed by whoever wires this into the Waterfall, and that is the item this tick does NOT close. ⚠️ **Register O28 is still open** and the day the refund becomes cash is still unsourced; the canary is a tripwire on the shape, not an answer to the question. Original text: It is an annual tax
    outcome. The Income Waterfall (P4-3) must not fund spending from a refund before the refund
    exists — the timing bug here looks like extra money, which is the failure mode that never gets
    questioned
  - ⚠️ **INCIDENT 2026-09-22, recorded because it nearly destroyed this file.** The commit that added the summary block below (`16e3176`) also DELETED the entire Phase 3 section — P3-1 to P3-22, 1,353 lines, 22 task items, including the same day's audit findings and the P3-22 gate. The additions were good; the insert was not. Restored from `5664f60` at `TODO.md` and re-applied. **The lesson for anyone editing this file programmatically: a replace that spans from a heading to "the next heading" will swallow every item in between when the anchor does not match what you assumed.** Diff the line count before committing — `git diff --stat` showed `1373 +-----` and that number was the only warning.
  - ✅ **BUILT 2026-09-22 — `src/core/individualFranking.ts`, `test/core-individual-franking.test.mjs`, register §5A.3.2. Tests 2086 → 2115, and NO existing test file was edited.** P3-22a–e and g are ticked above; **h and the live wiring are NOT, and that is a decision** — see the two bullets after the mutation table.
    - **THE MUTATION BATTERY, run against the committed module and reverted after each** (a battery that reverts with `git checkout` would have destroyed uncommitted work, so the module was committed first). Six applied, six killed, none by a compile error:
      | Mutation | Tests failed |
      |---|---|
      | **M1** tax the CASH instead of the grossed-up amount (P3-22c's plausible wrong order) | **11** |
      | **M2** clamp the refund at nil — keep only `max(0, tax − offset)` (T46) | **9** |
      | **M3** drop the $5,000 ceiling from the relief gate (T48) | **3** |
      | **M4** let a related payment keep the shelter (T47, inverted) | **1** |
      | **M5** boundary `<` instead of `<=` — exactly $5,000.00 refused (T48) | **1** |
      | **M6** run the offset against the HOUSEHOLD's extra tax, not the recipient's | **1** |
      ⚠️ **M4, M5 and M6 are each ONE TEST DEEP**, and that is worth knowing before anyone deletes a test that looks redundant. M6's single test is the couple spillover fixture; M5's is the `does not exceed` boundary; M4's is the related-payment direction. M1 and M2 are killed by most of the file because they move every dollar figure in it.
    - ⚠️ **A REGISTER CORRECTION IS OWED AND WAS NOT MADE, because making it is fixture churn.** `docs/assumptions-register.md` §9's Franking table still reads *"The individual (non-super) side of franking is **P3-22**, and that module does not exist"*, and `test/assumptions-franking-mutations.test.mjs:514` asserts that exact sentence. It is now false: the module exists and ten of §9's seventeen franking rows may now have a code path to run against. **Correcting the register requires editing that test in the same change**, which this build was instructed not to do, so it is left for whoever re-classifies those ten rows — which is the real work, not the sentence. `src/data/assumptions/franking.ts`'s own `excessCreditsRefundable.individual` note WAS corrected, because nothing pins it: the module still reads not one record (it declares, on the `superFranking.ts` convention), so the file header's claim is intact and only the reason lapsed.
    - **NOT DONE, and neither is an oversight.** **P3-22h** — the Setting that states a distribution — is untouched: there is no UI, no plan field and no parse path, and until there is, nothing can hand this module a `FrankedDistribution`. **The live wiring is untouched**: `project()` calls neither franking module, and `test/core-individual-franking.test.mjs` asserts that of BOTH, so wiring either side in turns that test red. The user's rulings on the future Setting (a PERCENTAGE of portfolio value, distributions REINVESTED rather than spendable) change nothing about this module's interface — it takes dollar figures as parameters — but they are recorded in its header so the next pass does not re-litigate them.
    - **What the gate got right and what it under-stated.** Right: zero fixture churn, no `incomeTax.ts` change, no invented figure, `assessCapitalGainCharge` as the template. Under-stated: the gate said to diff `netTax` for the receiving Person, which is correct — but a couple's distribution also moves the OTHER Person's tax through the family Medicare levy and SAPTO's combined Rebate Income, and that spillover is real money ($41.90 on a $2,000 gross-up in the test fixture). It is reported as `spilloverToTheOtherPerson` and deliberately kept OUT of the offset base, because refunding it would be cash nobody is entitled to.
    - ✅ **STEP 1 SHIPPED 2026-09-22 — two optional Settings, no wiring, zero figures moved.** `8c5b645` + `90167df`. Tests 2115 → 2125. `src/core/projection.ts` UNTOUCHED, and the trip-wire at `test/core-individual-franking.test.mjs:654-665` stayed green — that is the proof the step stayed in scope, not a claim.
      - **MUTATION BATTERY run by LIZ 2026-09-22** after the building agent was killed by a 529 mid-battery. Each mutation was confirmed APPLIED (anchor matched) and confirmed to COMPILE before the suite ran — an anchor miss or a compile failure would have been a meaningless green, not a strength.
        | Mutation | Tests failed |
        |---|---|
        | **M1** a blank box writes `0` instead of OMITTING the key | **15** |
        | **M2** the value saves but is never loaded (dropped from the parse output) | **5** |
        | **M3** the control name drifts (`investmentPayoutRate` → `investmentPayoutRatio`) | **4** |
      - **The finding: M2 and M3 are the two failure modes that have previously failed ZERO tests on this project** (P8-2). They now fail 5 and 4. A Setting that round-trips but that nobody reads is still undefended by design at this step — nothing reads these two yet — and that is step 2's behavioural test, not a gap here.
      - ⚠️ **A LOAD-BEARING INVARIANT WAS WIDENED, correctly, and it is worth knowing it moved.** `test/core-plan.test.mjs` asserted at TYPE level that **exactly one** field of `Settings` may be optional (`contingencyFloor`, P4-14). Two more optional fields necessarily broke it. It was RELAXED, not deleted: it now pins exactly three, from both sides — a fourth optional field fails it, and any of the three ceasing to be optional fails it. The ground is unchanged and still stated: nothing answers the absence.
      - **On-screen wording, checked against the banned-word list** (no "franking", "imputation", "gross-up", "offset"): *"What your investments pay you each year, as a share of their value (0.04 is 4%; blank if they pay you nothing)"* and *"How much of that already has company tax paid on it (0.7 is 70%; blank if you are not sure)"*, plus a temporary notice saying the tax already paid is not counted yet, so tax on these investments reads a little high for now.
      - **Three test files were edited, where the brief allowed one.** All three were forced and none is a pinned figure: the exact box-list set, the one-optional-field type pin, and a `statedFee(` call-count pin (4 → 6). Recorded because "only one test should move" was the instruction and it did not hold — the reason was the type-level invariant, which the gate did not anticipate.
  - [x] **P3-22h** ✅ **ALL THREE STEPS SHIPPED, 2026-09-22 — the Setting, the payout mechanic and the live franking wiring.** **Franking percentage is a Setting, not an assumption.** How much of a given
    - 🟢 **GATE: GO — 2026-09-22 (LIZ), claims verified independently.** Covers P3-22h AND the live wiring.
      - **O28's timing is ANSWERED by an existing mechanism, and no figure is invented.** The year-end true-up already built and tested for P4-2 (`TAX_TRUE_UP_LINE`, `projection.ts` chunk 3b) assesses a completed financial year ONCE and books the swing as a cash line in either direction, with `TRUE_UP_DE_MINIMIS` dropping sub-cent noise. Feeding the gross-up and offset into that same `assessHousehold` call reuses the rule instead of inventing one. **The TAA 1953 refund machinery O28 leaves open is never needed** — only *when the cash appears*, which this already answers for every other tax swing. This was my named NO-GO condition and it does not hold.
      - **"Both sides or neither" does NOT force wiring the super side in this change.** That bar is about the MODULES' refundability symmetry (T46), and P3-22a is already ticked as MET by shipping both unwired. P6-8d stays the checkpoint that will force it — it says the sacrifice-vs-invest comparison does not ship without franking on both sides.
      - **Fixture churn: ZERO digest files.** Both new figures ship as OPTIONAL Settings, absent = no effect, on the `contingencyFloor` precedent (`plan.ts:124-129`, added 2026-09-21 with no default). ⚠️ **TWO existing tests must be edited, both STRUCTURAL rather than figure-pinning, and the gate said one:** (1) the trip-wire at `test/core-individual-franking.test.mjs:654-665`, which asserts `projection.ts` mentions NEITHER franking module — step 3 turns it red BY DESIGN and it must be edited deliberately, never deleted; (2) `test/app-settings-panel.test.mjs:478-484`, which `deepEqual`s the form's box list as an exact 9-key set, so any new box fails it. Both failures are the tests doing their job.
      - ⚠️ **CORRECTION to the gate: `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` is NOT a reserved slot.** It is a boundary RECORD whose own text says "ANSWERED 2026-09-15 (P3-28, R-B): NOT BUILT", and nothing in `plan.ts`, `parsePlan.ts` or `settingsPanel.ts` reads it. The Setting is built from scratch; the record only constrains its shape (no blended rate as a constant — T43).
      - **TWO figures are needed, not one, and TODO conflates them under this id:** a distribution-payout rate (the "portfolio pays nothing out" gap) and a franked fraction. Build both.
      - **The gap neither existing test catches:** a Setting that round-trips AND harvests but that `project()` never reads. The key-list and harvest scans are both discovery-based and will pass. Needs a NEW behavioural test — two fixtures differing only in the rate, asserting the output differs. This is the P8-2 lesson restated.
      - **RULED BY LIZ, not escalated.** (1) **Ship staged, figures moving once per reason** — step 2 (payout, taxed as ordinary income, no credit) then step 3 (the credit) — because that is this project's whole splitting rationale and it makes a wrong figure attributable. The interim state overstates tax on these investments and the box must SAY SO in plain words while it lasts. (2) **Ask for BOTH numbers in step 1, against the gate's advice.** The gate recommended collecting only the payout and treating none of it as franked until later; that makes step 3 INERT — the credit would be zero for every user, so the work would move no figure and deliver nothing visible. One extra optional box is cheaper than a step that ships nothing. Both are optional, so a user who does not know their franked share simply leaves it blank and gets the conservative answer.
      - **Microtasks: (1) both Settings, no wiring, zero figures move. (2) payout + reinvestment, taxed as ordinary UNFRANKED income. (3) wire `frankingForIndividual` into the year-end true-up.**
      - [x] **Step 1 — both Settings, no wiring — ✅ 2026-09-22. `Settings.investmentPayoutRate` and `Settings.investmentPayoutFrankedShare`, both optional, both unread. ZERO figures moved: the 501-month digest is identical with both stated and with neither, and that equality is asserted rather than claimed.** Tests **2115 → 2125**. **FOUR findings.**
        1. ⚠️ **The gate said TWO existing tests would need editing and the true number is FIVE, all structural, all of them tripwires doing their job.** Beyond `app-settings-panel.test.mjs:478` (the 9-key `deepEqual`, now 11): the `statedFee` **call count** (4 → 6 — one shared "blank omits the key" expression, and the count is what stops a second copy appearing); the `ROUND_TRIPS` table, which §11 says in terms is the way to add a box; and TWO compile-probe pins in `core-plan.test.mjs` — *"EXACTLY ONE field of Settings is optional"*, now **three**, and the exhaustive `keyof Settings` key map. The trip-wire at `core-individual-franking.test.mjs:654` was **NOT** touched and is still green: nothing in `projection.ts` changed, which is the proof this step stayed inside its own scope.
        2. **The behavioural test the gate asked for is the INVERSE of the one it described, and that is not a dodge.** It said: two fixtures differing only in the rate, asserting the output DIFFERS. Nothing reads either figure in step 1, so that test could only pass by faking a reader. What is asserted instead is the deliverable's own claim — the walk is **bit-identical** with the figures and without — carried by a digest, with a vacuity control (`nominalReturn` moved DOES change the same digest) so the equality cannot pass on a digest that never moves. ⚠️ **That test is written to be INVERTED BY STEP 2** and says so in its own comment: when the payout mechanic lands it goes red, and `assert.equal` becomes `assert.notEqual`. The save-but-never-load half IS covered now — the value is read back off the **parsed** plan by the inverse reader, never off the object handed in — and so is a drifted control name, shown going red against the real source with one token changed.
        3. **A refusal the gate did not anticipate: the franked share cannot be stated ALONE.** It is a share OF the payout, so with no payout stated it is a figure the user types, the file keeps, the box shows back, and nothing can ever be true of — this project's own worst defect class. The door refuses it naming the missing box. The share also has a ceiling of 1 and the payout rate has **none**: a part cannot exceed its whole (structural), while a payout above 100% of value in a year is odd but not impossible, and a ceiling there would be refusing on a figure nobody legislated.
        4. **T43 is respected by construction and the record was left alone.** No blended rate exists anywhere in `src/data/assumptions/` and none was added; `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` still reads "NOT BUILT" and is still read by nothing, which remains **accurate** — it is a boundary record about a CONSTANT, and what shipped is the user's own figure in the plan file. **On-screen text names none of it**: "franked", "imputation", "gross-up" and "distribution" are all banned by a test over the new label and notice text, and the one-sentence on-screen warning that the tax already paid is **not counted yet** — so the interim answer overstates tax on these investments — is pinned as a subject, not as a phrase.
        5. **MUTATION-CHECKED, seven mutations, none survived** (counts over `app-settings-panel`, `core-parse-plan` and `core-plan` together, baseline 174 pass / 0 fail): the save dropping the payout key **5**; the inverse reader never reading it back, so the box reloads empty **2**; a drifted control name in the panel **4**; the orphan-share refusal removed **2**; a nil payout accepted rather than refused **2**; the share's ceiling of 1 removed **2**; the on-screen "not counted yet" sentence deleted from the summary **1**. The two that matter are the first two — **save-but-never-load and load-but-never-read are the defects that have historically failed ZERO tests here**, and both are now one-mutation-deep at worst. The last is one test deep, which is worth knowing before anyone trims that sentence: it is the only thing telling a user why the two figures they just typed moved nothing.
      - [x] **Step 2 — the payout mechanic — ✅ 2026-09-22.** `Settings.investmentPayoutRate` now pays out once a year, in the financial year's FINAL MONTH — the same `finalMonthOfTheYear = monthOf(endOfFinancialYear(fy))` the pension-floor sweep already computes, read a second time rather than re-derived. `distributionFromPortfolio` (rate × the Person's own held parcels' market value, `Math.floor`'d on `grownForOneMonth`'s own convention, computed BEFORE the month's growth) and `parcelsAfterDistribution` (raises `costBase` pro-rata across the Person's parcels — BigInt-safe, remainder to the last parcel — and moves `marketValue` and `acquired` NOT AT ALL) are both new, exported, pure functions beside `parcelsGrownForOneMonth`. **FOUR findings.**
        1. **Reinvested, not cash — and the ruling that market value does not move either is not stated in the brief, it was derived.** A real reinvested distribution's round trip (ex-distribution fall, DRP purchase back) nets to nil on market value and a raised cost base; this build applies only that NET, so no `MonthLine` names it (neither `'cash'` — nothing left the Offset Account — nor `'wealth'` — the means test's `marketValue` does not move by a cent) and a NEW `MonthNote` member, `InvestmentDistributionNote` (`plan.ts`), is what says it happened. `monthToRows.ts` gained the eighth case its own exhaustive `noteRow` switch requires; `test/app-month-to-rows.test.mjs`'s "seven note subjects" pin is now eight.
        2. **The tax reuses P4-2's year-end true-up, and NOWHERE ELSE.** A new `taxYearToDate.distributed` accumulator (ADDED to, never assigned, unlike `.gain`) is combined with `.gain` ONLY at the settlement (`distributedGains = completed.gain.map(...)`), feeding BOTH `assessHousehold` (income tax) and `div293IncomesOn` (Division 293 base — a distribution is taxable income before any deduction touches it, same as a capital gain). No second true-up mechanism, no change to `assessCapitalGainCharge` or the monthly accrual, which stayed nil-gains exactly as before. `investmentPayoutFrankedShare` is read NOWHERE — confirmed by a test asserting `projection.ts`'s own source names `investmentPayoutRate` but not `investmentPayoutFrankedShare`.
        3. **A REAL, DOCUMENTED GAP: a distribution paid in a walk's first, PARTIAL financial year is never taxed, at all.** For a capital gain the same partial-year refusal only ever drops a RESIDUAL, because the gain is charged in cash at the disposal regardless of the year's completeness; a distribution has no event-time charge, so the WHOLE of a first-partial-year distribution goes untaxed. UNDER-states the household. Accepted rather than closed, on chunk 3b's own reason: assessing a part-year invents either a year's income or a year's rate scale. Recorded in `projection.ts` at the point it happens, not discovered later.
        4. **HAND-WORKED, not re-pasted — `test/core-investment-distribution.test.mjs`, six figures.** A $500,000 portfolio at 4% pays $20,000.00; taxed against Sol's $78,000 salary (reusing `test/core-projection-true-up.test.mjs`'s own $78,000 fixture) the true-up costs **$6,399.96** — not a round $6,400.00, because the undistributed run's own four-cent monthly-rounding residue is UNDER the $1.00 de-minimis and is suppressed to no line, so it does not cancel out of the difference. A couple with two different portfolios (Ren $20,000.00, Sam $10,000.00) settles at $6,399.96 and $3,199.96 respectively, in the same July, under the right names. A later disposal of a distributed-into parcel realises $3,200.00 LESS capital gains tax ($8,000.00 → $4,800.00) — 32% of the $10,000.00 the raised cost base removed from the 50%-discounted gain — proving the RIGHT base moved. A stated rate of `0` is asserted BYTE-IDENTICAL (`deepEqual`, not just a digest) to the key being absent.
      - [x] **Step 3 — the live wiring — ✅ 2026-09-22.** `project()` now calls `individualFranking.ts`'s `frankingForIndividual`, at the SAME year-end true-up P4-2 and step 2 already use. Tests **2133 → 2137**. `⚠️ The duplicate NOT-BUILT line directly above this one was a stray from a prior edit and is deleted here, not carried forward.`
        - **The math: `frankedPortion = distribution × frankedShare` is the CREDIT, not a cash split.** `frankedAmount` stays the WHOLE raw distribution (unsplit — a Household holds the same cash regardless of what share of it "already had company tax paid on it"); the credit rides alongside it, built by a NEW export, `frankedDistributionFromShare` (`src/core/individualFranking.ts`), which reuses `frankedDistributionFromStatement`'s own addition (T44) rather than a second gross-up expression. Absent or nil `frankedShare` ⇒ credit nil ⇒ `grossedUpAmount` byte-identical to step 2's own distribution — the zero-regression anchor, hand-verified against step 2's own $6,399.96 figure to the cent, not merely asserted.
        - **The credit is folded into the SAME `assessHousehold` call the true-up already makes, not a second assessment.** `frankingForIndividual` is called once per Person with a distribution this year, for its own `offset` (s 207-20(2), unconditionally the credit) and its provenance; what actually RAISES the year's assessed tax is adding the credit directly into `distributedGains` before that ONE call — so a couple's family Medicare levy and combined SAPTO Rebate Income see it exactly once, and the spillover onto the OTHER Person needs no code of its own: it falls out of `householdIncomeTax`'s own family-level arithmetic and lands on THEIR OWN `TAX_TRUE_UP_LINE`, exactly as asked. Hand-worked to the cent (`test/core-investment-distribution.test.mjs` §9): Uma's $1,300.00 credit pushes the family OUT of the $47,238–$59,047.50 Medicare shade-in band, and Val — who holds no portfolio and states no share — pays **$49.90 more**, verified as the DELTA between two runs so the messy fractional-cent monthly-accrual apportionment (real, but not this step's own arithmetic) never has to be reproduced.
        - **A structural wall forced a design choice the brief did not anticipate.** `FrankedDistribution` is a branded type constructible ONLY by `superFranking.ts`'s two constructors, and TWO existing tripwires each forbid a route to it: `core-individual-franking.test.mjs`'s own "zero value imports from `superFranking`" pin (so `individualFranking.ts` could not just import the constructor freely) and the module-level tripwire itself (so `projection.ts` could never import from `superFranking.ts` directly, even after this step turns its OWN assertion around). Resolution: `frankedDistributionFromShare` lives IN `individualFranking.ts`, which now carries exactly ONE named value import from `superFranking.ts` — `frankedDistributionFromStatement`, the rate-free constructor T43 already prefers — and the "zero imports" test is NARROWED (not deleted) to allow exactly that one name while still forbidding every fund- or phase-shaped export (`frankingInSuper`, `FundFrankingFacts`, `NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER`, `fundEarningsTax`, `SuperInterest`). `projection.ts` itself never mentions `superFranking` anywhere in its own source, so the module-level tripwire's OTHER half — no super-side call site — is untouched.
        - **Two collateral call-site-count tripwires moved, for a REAL, LEGITIMATE reason, not a fudge.** `test/core-div293-low-tax-contributions.test.mjs` pinned `excessConcessionalContributions: toCents(0),` at exactly THREE occurrences and `test/core-non-super-gain-tax.test.mjs` pinned `netLabourIncomeFromSalary(` at exactly ONE call site, built from salary alone with no path for a gain. Both now have a SECOND, legitimate site: the year-end settlement rebuilds the SAME two figures — via the SAME exported pure functions, not a second formula — for whichever Person(s) `frankingForIndividual` is assessed against. Both tests were updated to name the new count and assert the NEW call site is ALSO salary-only, with no `gain` or `distributed` reachable from it — narrowing the ground, not abandoning it.
        - **MUTATION BATTERY, four applied, four killed, confirmed applied and compiled before each run:**
          | Mutation | Tests failed |
          |---|---|
          | **(a)** apply the credit but skip the gross-up (tax the cash, not `distribution + credit`) | **4** |
          | **(b)** clamp the offset at the credit's own incremental tax (T46's non-refundable direction) | **4** |
          | **(c)** apply the offset to BOTH Persons instead of the recipient alone (the couple-attribution boundary) | **2** |
          | **(d)** `investmentPayoutFrankedShare` stated but the walk silently ignores it (proves the WIRING, not just the module, is exercised) | **4** |
          ⚠️ **(c) is TWO tests deep** — the two fixtures with a second Person in the household (§8, §9 below) — worth knowing before either looks redundant.
        - **Three new HAND-WORKED fixtures, `test/core-investment-distribution.test.mjs` §7–§10.** §7 reuses step 2's own Sol/$78,000/$500,000/$20,000 fixture at a 50% share: the credit's own incremental cost is $3,200.00 (32% of $10,000.00, the SAME combined bracket-and-levy rate step 2's own $6,400.00 used), the $10,000.00 offset exceeds it by $6,800.00, and folded into step 2's own $6,399.96 OUTFLOW that is a **$400.04 INFLOW**. §8 reuses the Ren/Sam fixture: both credited independently and additively (Ren $400.04, Sam $200.04), because both clear the $59,047.50 family threshold even after their own credit — the vacuity control that this is genuine independence. §9 is the spillover, detailed above. §10 re-confirms step 2's own $6,399.96 figure survives, to the cent, when the share is left out.
        - **What was refused: a genuinely from-scratch, non-cliff spillover fixture.** The first attempt (a couple each on ~$29,000 taxable, mirroring `test/core-individual-franking.test.mjs`'s own spillover fixture) could not be built with a whole-cent fortnightly salary reaching that figure exactly (`$29,000 + $1,000` standard deduction ÷ 26 is not a whole cent), and a fixture where the RAW distribution alone leaves the family inside the shade-in band while the CREDIT alone pushes it out needs an s 8(3) apportionment on UNEQUAL incomes — a fractional-cent ratio this report declines to reverse-engineer blindly. §9's fixture is constructed instead so EQUAL incomes make the "inside the band" apportionment a clean 50/50 and the "outside the band" case needs no apportionment at all — the DELTA technique this report also used to sidestep the monthly accrual's own unequal-income apportionment. Both are real, both are correctly computed by the engine, and neither is this step's own arithmetic to reproduce.
    ETF's distribution is franked depends on what it holds and varies year to year; the same is
    true of a fund's Australian-equity share on the super side. User input, displayed with the
    other Settings, never a constant in the engine. It is legislated-vs-forecast on the forecast
    side of the P2-5d boundary: not a register figure, and P1-11 does not close it

---

- [x] **P3-23** **Remediation owed by the P3-9 research pass — ✅ COMPLETE 2026-09-10.** Seven commits, `d7019b7` → `09d84c9`; tests **471 → 504**, every step mutation-checked rather than accepted on green. Original text — found while researching the
  transfer balance cap, all outside P3-9's own scope, all silently wrong if left. Each is a
  *correction to shipped work*, not new capability.
  - [x] **`superCaps.ts` refuses on a justification that no longer exists (O44)** — ✅ 2026-09-09 (`d7019b7`). The cap now computes any year the ABS series covers and reproduces all nine published caps. **O41 is enforced structurally**: a `CpiSeries` carries its reference base, so a mixed-base pair is not expressible through the API — applying that mutation needed an internal edit. Note **T69's defence is ONE test deep**; nothing else reaches a factor ≤ 1. It throws
    `UnsourcedIndexBaseError` for every FY except 2026-27 **because O11 was open**. O11 closed
    2026-09-09 — register §3.2 now carries the ABS CPI series and reproduces all nine published
    caps. As things stand the engine **cannot compute the FY2026-27 indexation increase that
    s 294-40 requires**. Lift the refusal; do not widen it.
  - [x] **`ttrPaymentRange.ts` contradicts the retrieved law** — ✅ 2026-09-10 (`813d65f`). The stream **is still a TRIS** (s 307-80(3)(a)(i) presupposes it); the ceiling event (satisfaction, seven items) and the phase event (notification, or the 65th birthday) are no longer fused. **The annual-vs-permanent mutation fails ZERO tests** — the proposition is comment-only and no test was invented to hide that. Records the gap that `conditionOfRelease` models **two** grounds where the regulation names **seven**. Its `TrisConversionNotModelledError`
    message says the stream "is no longer a transition to retirement income stream" — but
    s 307-80(3)(a)(i) **presupposes it still is**. It also conflates two events that fall on
    different days and apply to different condition sets, and treats a 10% breach as annual when
    TR 2013/5 makes it **permanent**.
  - [x] **`superPhase.ts`** — ✅ 2026-09-10 (`18975c8`, `09d84c9`). Caveat kept but re-grounded ("specified and not implemented", not "not modelled"); the TRIS refusal re-expressed on **R5**; `MidYearPhaseChangeError` re-grounded and its two false claims removed. **§D's derive-from-DOB narrowing was NOT implemented — R5 overrode it**, and that mutation fails **7** tests, so R5 is guarded by defences predating it. R7's four absent inputs recorded, not invented. *(R10 steps 1–3 are a separate build, in flight.)*
    `TrisRetirementPhaseNotModelledError` (it refuses the item-106 case the register now answers),
    the converted case needs a different constructor, and **four of R7's seven entry-test inputs are
    absent entirely**.
  - [x] **`conditionOfRelease.ts`** — ✅ 2026-09-10 (`4239570`). The "register cites no item" objection is spent; the **split confidence** survives it — items and *turning 65 = item 106* are `primary-verified`, the **item-101 mapping stays `unverified`** pending reg 6.01(7) (**O59/U28**). `ConditionOfReleaseItemNotIdentifiedError` **built** — the register had named a refusal that existed nowhere. The mapping record holds **the gap, not `'101'`**.
    numbers, but the **item-101 mapping stays `unverified`** pending reg 6.01(7) (**O59**).
  - [x] **`div296.ts` carried the same superseded sentence O44 just removed** — ✅ 2026-09-09. Both
    thresholds now take a `CpiSeries` on `generalTransferBalanceCap`'s shape, and the comments state
    the real limit: **the base quarter IS the latest published December quarter**, so there is no
    later quarter to index *to* and published data yields exactly one computable year. That is a
    different fact from "no index number exists", and it means the year refusal is
    `MissingIndexNumberError` (a missing quarter) with `UnsourcedIndexBaseError` kept only for a
    supplied series that cannot furnish Dec 2025 — narrowed, not widened.
    - **The canary was dead and is now alive.** Hard-coding a *correct* $3,000,000 failed **zero**
      tests before (one computable year, and the literal is right for it); it fails **2** now, driven
      by a synthetic clearly-labelled series (2026-09-04 ruling; synthetic numbers stay out of
      `src/`). Same for a correct $10,000,000. **This is the general lesson: a module whose only
      fixture year is its base year cannot test its own arithmetic at all.**
    - What surprised us: the FY2026-27 cross-check against the published record is an **identity**
      — quarter = base quarter, so the factor is 1 on any series and the computation can only
      reproduce the base amount. `PublishedCapMismatchError` is not dead weight, though: it catches
      the published record and its spec **drifting apart** (moving the published LSBT to $3,150,000
      alone fails 15 tests). And FY2026-27 owes O41 nothing for the same reason — a ratio of one
      number over itself is 1 on either reference base — so `cpiReferenceBase` is consumed only
      where the quarter differs from the base quarter, and the published year stays
      `primary-verified`.
    - **Left for `superCaps.ts`'s own item:** the `UnsourcedIndexBaseError` doc comment there still
      says `div296.ts` has "no channel through which a series could be supplied". It now has one.
      Not touched under this brief's no-touch list — the superseded sentence is still in the tree.
  - [x] **Correction owed to `docs/research/p3-minimum-drawdown-and-ttr.md` §3.4** — ✅ 2026-09-10, stamped in place, not rewritten. — the s 307-70
    citation and the annual-vs-permanent characterisation.
  - [x] **T85's refusal name** — ✅ 2026-09-10 (`bab00da`). Closed by normalising the eight proposed names in the register and enforcing the suffix in `test/refusal-names.test.mjs`; the built code never had the defect. `CappedDefinedBenefitIncomeStreamNotModelled` has no `Error` suffix,
    unlike every other refusal in the codebase — fold into **R8**'s single refusal module.
  - [x] **R9 — FY2027-28 forward items** — ✅ 2026-09-10. Ruled 2026-09-09: **do NOT refuse to project FY2027-28.**
    R1 does not transfer, because every gap here runs the *conservative* way — carrying
    `secondLowestMarginalRate: 0.3` forward over-states tax, and omitting WATO over-states tax.
    Both understate the household. Two actions: **(a)** `tax.ts`'s FY2027-28 note must state the
    **direction of the error**, not merely `unverified` — a confidence label says a number is
    unsourced, it does not say the error is *safe*, and that is what a future agent needs in order
    to leave it alone; **(b)** assert the conservatism with a test that **fails if the placeholder is
    later "improved" in the flattering direction**. Today the safety is a property of the number,
    not of the code.
  - [x] **s 8AAD(1A)** — ✅ 2026-09-09, **resolved as LATENT, no code change**. Gating found **nothing in `src/` reads a GIC or s 8AAD rate at all**, so there is no live defect — the base+3 / base+7 adjacency is a trap against a *future* implementer and stays recorded as one. Had this been bundled into a remediation brief, an agent would have gone looking for a bug that does not exist. **Originally described as "a live trap against shipped Div 296 code"; that was wrong.** Inserted 1 April 2026 by
    No 8 of 2026, it carries the **Div 296** rate (base + **3**) in the same section as the general
    GIC rate (base + **7**). Div 296 is already built. The wrong-rate mistake is one line away.
- [x] **P3-27** **— ✅ 2026-09-10.** `caps.nonConcessionalMultiple` (4) and
  `bringForward.ageGateUnder` (75) now exist as **numeric** records; the prose stays beside each for
  the reader and the two are asserted to agree. `TSB_DEFINITION_FROM` is **derived**
  (`justBeforeFinancialYear`) rather than pinned, guarded against an effective date that is not a
  1 July. **The canary is now the blanket rule with NO exceptions** — the module may write `0 1 2 3`
  and nothing else, and writes no date at all. Verified: re-introducing the literal `4` **does not
  compile** (structural, not merely tested); moving the record 4 → 5 fails **8** tests.
  - *(Original finding:)* the two figures were hand-held because the register carried them only in
    prose — `nonConcessional.derivation` and the sentence `bringForward.ageGate` — so there was no
    number for `src/core/` to read. **T14 drift the assumptions layer was forcing**, not a coding
    slip.
 — found 2026-09-10 while adding source canaries. `NON_CONCESSIONAL_MULTIPLE = 4`
  (s 292-85(2)(a)) and the bring-forward age gate `< 75` (s 292-85(3)(c)) are hand-held **because
  the register carries them only inside PROSE** — `caps.nonConcessional.derivation` and
  `bringForward.ageGate.value` are *strings* (`'under 75 at any time in the first year'`), so there
  is no numeric record for `src/core/` to consume. **This is T14 drift that the assumptions layer
  makes unavoidable**, not a coding slip: give each a real numeric record, then the canary's
  blanket "no literal in core" becomes true instead of pinned-with-exceptions.
  - Third literal `TSB_DEFINITION_FROM = '2026-06-30'` is the day *before*
    `access.totalSuperBalanceDefinition.effective` (`'2026-07-01'`), written by hand. Now pinned to
    both sides so a record that moves without the literal fails — but deriving it would be better.
  - ⚠️ **Deleting the non-concessional `PublishedCapMismatchError` cross-check failed ZERO tests
    before 2026-09-10.** That check is **the only thing standing behind the hand-held `4 ×`
    multiple**, and nothing forced a mismatch on that path. Now covered.
- [x] **P3-26** **Refusals with no register row — 28 → 23, cluster 1 of 13 done 2026-09-10; ALL
  CLUSTERS AND BOTH RATCHETS DONE 2026-09-11.** Box ticked 2026-09-11 by P3-24: the batch-3 entry
  below already said *"BOTH RATCHETS ARE ZERO. P3-26 is complete"*, and the parent box was still
  open — a stale `[ ]` contradicted by its own content, which is the same defect this item was about.
  - [x] **`div296.ts` (5) → new §3.7.1** — ✅ 2026-09-10. All five `BUILT`.
  - [x] **`superCaps.ts` (4) → §3.1.1, §3.4.1, §3.8.1** — ✅ 2026-09-10. Quarantine **23 → 19**.
    - **One refusal, one row, even across two callers.** `TotalSuperBalanceDateError` is raised by
      one guard with two callers (§3.3 bring-forward, §3.4 carry-forward). A row under each would
      register one refusal twice — **exactly what R8 exists to stop** — so §3.3/§3.4 carry pointers
      and only §3.8.1 carries the row.
    - ⚠️ **The non-concessional `PublishedCapMismatchError` branch is UNREACHABLE BY ANY INPUT.**
      By the time it runs the nested concessional call has already thrown or returned exactly
      $32,500, so `amount` is always `4 × 32,500`; it fires only if a *record* is edited. That is
      why deleting it failed zero tests — and `core-super-caps.test.mjs:136` **looks like coverage
      but is not**: the throw it observes comes from the nested concessional call. The only thing
      holding it is a canary that reads the module's **text**. **No behavioural test can ever reach
      that branch.**
    - Two things the register did not record, now in it: **§3.4 had no rule for an incomplete
      contribution history** (the decision to refuse lived only in `src/`), and **FY2026-27 is the
      first year §3.3 and §3.4 can be computed at all** — FY2025-26 is unreachable from both ends
      and no Setting gets you earlier.
  - [x] **`superFranking.ts` (4) → §5A.3.1, §5A.4.1** — ✅ 2026-09-10. Quarantine **19 → 15**.
    U1/O27's label preserved verbatim in both places, split into a `primary-verified` limb and an
    **inferential** limb, marked *not to be reopened*. §5A.6 gets a pointer, not a second row (R8).
    - **No stale grounds** from today's `a526f6a`/`be21aa5` phase change — all four checked. The
      year discipline **strengthened**: `fundEarningsTax` never sees the distribution, so the
      franking year check is the only thing covering the credit.
    - ⚠️ **`NonResidentFrankedDistributionError` may be unreachable in law and the register cannot
      say** — it turns on the *Australian superannuation fund* definition, for which **no row
      exists anywhere**. Recorded as an open question, explicitly **not** as a claim of
      unreachability (R6). Also: §5A.3 says "a non-resident's franked dividend is NANE" and **does
      not say whose residence** — the statute means the recipient; the code resolves it to the fund.
    - ⚠️ **Nothing cross-checks `complyingFund`.** A caller-stated boolean, and the interest's
      fund-type discriminant has two cells that are both complying-fund shapes — so a fund stated
      non-complying here and typed complying elsewhere is caught by **neither**.
- [x] **P3-28 — ✅ 2026-09-15, on a HEADLINE THAT WAS FALSE.** The item was filed as
  *"**§5A is specified and carries NO code at all**"*. It is quoted once, here, because it is
  wrong and the narrow claim underneath it was right. `src/core/superFranking.ts` is **464 lines**
  implementing §5A.1, §5A.3 and §5A.4 with four named register-cited refusals, and
  `test/core-super-franking.test.mjs` is **703 lines** spanning two financial years; both build
  commits (`19841d8`, `a526f6a`) are ancestors of HEAD, so this was never a stale citation. What
  was true is the narrow claim — **zero** occurrences of "franking" in `src/data/assumptions/`,
  and no `franking` key in the `ASSUMPTIONS` barrel. A true narrow claim was promoted into a false
  broad one, which is the **O70 / P3-29 pattern running in reverse**: usually a refusal asserts a
  negative the register contradicts; here a TODO asserted a negative the *code* contradicted.
  - **What was built.** `src/data/assumptions/franking.ts` — §7's twelve franking constants as
    **fourteen** records (§7's single refundability row holds three values from three provisions,
    and a record holds one source) — wired into `ASSUMPTIONS` as `franking`, reachable at
    `franking.*`. ⚠️ **It has NO RUNTIME CONSUMER and that is declared in the module header, not
    left to be discovered** (O72/P3-38 precedent). The day-level qualification machinery these
    constants feed is out of scope by **P3-22e**, so there is nothing to consume them; the records
    are the *provenance* of rules applied on caller-stated facts.
  - **§9's mutation row is now built in both halves**, and their strengths differ. *"The §7
    constants list must not contain [a portfolio rate]"* is **fully structural** — the test reads
    §7 out of the register and pins its twelve franking rows by name. *"The effective franking rate
    must resolve from a **Setting**"* tops out at **"required, undefaulted parameter + absent
    literal"**: `payerCorporateTaxRate` is required and undefaulted, so omitting it is a `tsc`
    error, but TypeScript cannot forbid a numeric literal that resembles a rate, and the
    never-*also*-stored half is a **source canary** over `superFranking.ts`. Not a compiler
    guarantee; do not cite it as one.
  - **The inventory claim this item inherited was FALSE and is corrected at its source.** The
    superseded text read: *"None of the twelve franking constants §7 lists is carried in code,
    including §5A.2's 25%/30% payer rates and the $50m base-rate-entity threshold."* **Those rows
    are not in §7 at all, under any tag** — §5A.2 types all of them `config` or `config (derived)`
    and stamps them `2026-27`, and §7's own rule excludes year-stamped figures structurally. The
    error originated in the register's own §5A.3.1 (`a3aaa7e7`, 2026-09-10) and this item copied
    it; **both are now fixed**, §5A.3.1 in its own correction frame. **T43's bottom line survives
    on its actual text but for a weaker reason than this item gave:** T43 forbids a *portfolio*
    rate and says nothing about the payer rates — correct — but their absence was never a T43
    question, because they were never proposed as §7 constants.
  - **RULED 2026-09-15 (R-B): §5A.2's config rows are NOT built** — the 25%/30% payer rates, the
    base rate entity test, the $50m threshold, the previous-year imputation rule. Ground: §5A.2's
    own closing sentence says the engine does not need them under the preferred route, where the
    credit arrives as a dollar figure and `grossed_up = franked + credit` needs no rate at all.
    The decision and its reason are recorded in
    `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']`, not silently omitted.
  - **§9's Franking mutation table now carries an O66-shaped preamble**: **ten of its sixteen rows
    have no code path to run against**, because the individual side (P3-22) does not exist. No row
    was ever falsely marked BUILT, but nothing stopped a reader assuming otherwise.
  - ⚠️ **WHAT REMAINS OPEN, and it is most of franking.** The individual side (**P3-22a–h**); the
    gross-up's wiring into `incomeBases.ts`'s four affected bases, **blocked on P4-1's `project()`**
    — this was *"the same blocker as O72's taxable-income limb"*, and **that half of the sentence
    stopped being true on 2026-09-17**: P4-1 chunk 3 built the assessable-less-deductions assembly
    and closed O72, so the assembly exists and franking's gross-up now has a **place to be added**
    (`taxableIncomeFromSalary`'s assessable limb in `src/core/projection.ts`) rather than nothing to
    attach to. What survives is the narrower and real blocker: there are still **zero** franking
    call sites in `incomeBases.ts` or `incomeTax.ts`, and the individual side that would produce a
    franked amount does not exist; and the day-level 45-day / at-risk / LIFO machinery,
    **declined** by P3-22e rather than merely unscheduled. Franking is not "modelled" because these
    records exist.
  - **The "also declared Settings with no key" grouping was one-third accurate and is NOT swept in
    here** (precedent: P3-30's "one module knowing is not the codebase knowing" argues for fixing at
    the owning item, and R8's one-refusal-one-home against blurring ownership). **O63/R5** is real
    and matches — no `SETTINGS_NOT_ASSUMPTIONS` key for the TRIS conversion day — but it already has
    its runtime guard (`TrisRetirementPhaseNotModelledError`) and belongs to **P3-8**, which owns
    the conversion day. **O40 is refuted as stated:** its driving Setting `economic.cpi` already has
    a key; what O40 lacks is the s 960-285 forward-projection *mechanism*, not a key. **U37 is
    stale:** ruling **R10** (2026-09-10) resolved it by computing and disclosing the provable
    conservative bound instead of asking for a Setting, so there is no pending Setting-shaped gap.
  - [x] **`superContributions.ts` (3) → §3.5.1** — ✅ 2026-09-10. Quarantine **15 → 12**. All three
    stay in §3.5; unlike clusters 2–3, none belongs to a neighbouring section.
    - **Three DIFFERENT KINDS of refusal, now named as such.** A rule of law
      (`SuperGuaranteeEarningsBaseError`, SGAA s 10A(1)); an **input-shape guard**
      (`DuplicateEmployerError` — no statute is breached by naming an employer twice; the Act
      supplies only *why the shape matters*); and a **drift tripwire on the register's own
      records** (`EarningsBaseChangedError`) — the only guard of its kind in `src/`.
    - ⚠️ **`EarningsBaseChangedError` is unreachable by any input AND has zero tests.** It reads two
      `deepFreeze`d constants, takes no year and no Setting, so the condition is constant-false for
      any build; it can fire only if someone edits `super.ts` and rebuilds. Not imported by its
      module's test file at all. **One guard, two callers, zero tests on either.**
    - ⚠️ **The refusal named for the earnings base never reads the earnings base** — it compares FYs
      against a module literal `QUALIFYING_EARNINGS_FROM = '2026-27'`. §7's *SG earnings base* IS
      carried and read, but by the drift tripwire. **The commencement date is the thing with no
      record** — 1 Jul 2026 lives only inside a value cell's parenthetical.
    - ⚠️ **A canary loophole:** the module header forbids a literal **dollar amount**, which *by its
      letter licenses a literal date*. Worth widening when the §3.5 canary is written.
    - ⚠️ **A stamping contradiction:** `earningsBase` and `salarySacrificeIsQualifyingEarnings` are
      `everyYear: true` — asserting qualifying earnings is the SG base in **every** horizon year,
      exactly what `SuperGuaranteeEarningsBaseError` refuses to act on before FY2026-27 — while
      §3.5 year-stamps both, and the guard that reads them takes no year at all.
    - A fifth guard has **no name**: `qualifyingEarnings` throws a bare `RangeError` on a negative
      component — outside R8's discipline and outside the reach of the table-reading test.
- [x] **P3-29 — ✅ 2026-09-10.**
  `superContributions.ts:77` says the register carries *"nor the quarterly $62,500 maximum
  contributions base (§3.5)"* — but **§3.5 line 883 states it**, T18 states it, and §9 mutates on
  it. The narrower true claim (prose and a note, **not a record**, so nothing a computation can
  consume) carries the refusal fine. `test/core-super-contributions.test.mjs:266-268` **copies the
  overstatement verbatim**, so correcting the code will break that test — which is how the last two
  were found. Same class as **O70**, now in a third module: **the pattern is not "never retrieved",
  it is a refusal asserting a negative about the register that the register itself contradicts.**
  - [x] **`ttrPaymentRange.ts` (3) → §3.9.1** — ✅ 2026-09-10. Quarantine **12 → 9**. All three to
    §3.9, **none to §3.10.6**: the conversion refusal declines **the ceiling**, which is §3.9's
    rule. Registering it beside the entry test would **re-fuse in the register the two events
    `src/` stopped fusing at `813d65f`**.
    - ⚠️ **An unrecorded premise — PERMANENCE.** The reg 6.01(2) gate is tested **once**, on
      30 June, which is sound only if a met condition **stays** met. §3.9 says nothing about
      permanence; `ConditionOfRelease` documents itself as *"a boolean on a date, not a permanent
      property"*; and **`GainfulEmployment` can already express the loss** — someone who ceased at
      61 and returned to work is `{ ceased: false }`, takes no ground, and gets a **ceiling that in
      law had already lapsed**. Unlike T118, **the model can already hold the detecting fact.**
    - **§9 gap:** it names `PensionBalanceDateError` for the *floor*'s balance date, but its four
      TTR-maximum mutations name no refusal and none touches the **ceiling**'s balance day.
    - `TrisNotCommencedError` is reachable **only** for a Person who has not met a condition (the
      release gate runs first) — verified against `dist/`. And `minimumDrawdown`'s duplicate
      balance-day check is unreachable *through the range*; the test file is honest about it and
      calls `minimumDrawdown` directly rather than reading one throw as coverage of both.
- [x] **P3-30 — ✅ 2026-09-10.**
  `superPhase.ts:228` says *"O60 no longer blocks it"*; `ttrPaymentRange.ts:140` still cites O60 as
  a live blocker of the conversion limb. I corrected `ttrPaymentRange` at **`09d84c9`** writing
  "narrowed by R10, not yet built" — true at the time — then **built R10 at `a526f6a` / `be21aa5`
  and never went back**. The header's "not yet built" is stale for the same reason.
  - **The R5 limb still stands** (no conversion-day Setting exists), and the refusal is correct on
    its own first sentence — so this is **not** the P3-29/O70 class. It is a **discharged blocker
    written into one module and not the other**.
  - The message is **asserted by a mutation test**, so correcting it will break that test — which
    is the intended signal, not an obstacle.
  - **Lesson for the next multi-commit build: when a blocker is discharged, grep for every module
    that cites it before closing the item.** One module knowing is not the codebase knowing.
  - [x] **`superPhase.ts` (2) → §3.11.9** — ✅ 2026-09-10. Quarantine **9 → 7**. Both to §3.11, not
    §3.10: neither declines the s 307-80 entry test; both decline inputs to §3.11's own machinery.
    `PhaseYearMismatchError` gets **one row for two throw sites** (R8) — they guard different
    *inputs* (R5's conversion day; the interest's phase-statement day), not different refusals.
    - **A FOURTH kind of refusal — a *scope* refusal.** `FundLossNotModelledError` is none of
      cluster 4's three: a fund loss is lawful and well-formed, nothing is mis-shaped. **What is
      missing is a rule to apply to it.**
    - ⚠️ **The same fact is computed in §3.7 and refused in §3.11.** s 296-60(1) defines fund
      earnings as *"relevant taxable income **or loss**"* and Div 296 **computes nil** below the
      VLSBT; §3.11 refuses. They may be entitled to differ — **the specification never says they
      do, or why.**
    - ⚠️ **`MidYearPhaseChangeError` can no longer refuse a mid-year phase change.** After R10's
      narrowing it fires only on a fraction counted against the wrong year — so it sits on the line
      above `PhaseYearMismatchError` doing the same class of job under a name that no longer
      describes it. Cluster 4's *"named for X, never reads X"*, found again. No rename proposed;
      R8 settles names through the register.
    - `PhaseYearMismatchError`'s message says *"the phase of this **interest** was stated on…"* —
      but at `:364` there is **no interest in scope**; it was handed a conversion day. `src/` defect.
- [x] **P3-31** ⚠️ **R10's proof is false as written, and the code is saved by a guard the proof
  never mentions.** §3.11.6 states the exempt amount lies in **`[0, the year's income]`** and
  concludes *"under **either** method and on **any** facts, fund earnings tax ≤ 15% × taxable
  earnings"*. **For a loss year the inequality REVERSES** — `[0, income]` is not an interval when
  income is negative, and with exempt proportion `p ∈ [0,1]` the assessable amount is
  `(1−p) × income`, so `15% × income` is the **most negative** figure available. Charging a
  part-year loss wholly at the accumulation rate would be the **largest notional refund**, not a
  ceiling.
  - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** All five sub-items were `[x]`; the leftovers closed at `42bad9e` (*"A claim is not retracted while three files still assert it"*).
  - **What keeps it true today** is `FundLossNotModelledError` firing **before** the rate lookup,
    so a loss never reaches `CHARGED` and never acquires a `basis`. That ordering is load-bearing
    and **§3.11.6 does not state it as a condition of the proof.**
  - ⚠️ **Nothing tests the combination.** The loss fixture is charged over a **whole** year; a loss
    in a **part** year — the only case where the bound's direction is in question — **appears in no
    test.**
  - [x] **CORRECTED 2026-09-10.** §3.11.6 now opens *"Let `taxableEarnings ≥ 0`"* and says plainly
    the earlier wording **claimed more than it establishes**. **R10 itself is untouched — the
    ruling is sound; its justification was over-broad.** The part-year-loss fixture exists (550
    tests).
  - ⚠️ **My analysis of WHY it was safe was wrong, and the correction matters.** I said the
    load-bearing property was the guard's **position** (ahead of the rate lookup). It is not: a
    pure reorder that keeps the guard **unconditional** fails **zero** tests, because the lookups
    it moves past are pure and total. The load-bearing property is that the guard is
    **unconditional over `coverage`**. The observable defect needs the guard **narrowed** —
    `taxableEarnings < 0 && coverage === 'whole-year'` — which is **exactly the repair someone
    reaches for after being told the part year is "covered by the bound anyway"**.
  - **That narrowing failed ZERO tests before the fixture and 1 after.** It produces a part-year
    loss charged at **−$6,750.00**, a notional refund **$3,680.14 larger in magnitude** than the
    proportionate **−$3,069.86** — the exact mirror of F2−F1 — and labelled *"proven upper bound"*.
  - [x] **The over-broad sentence is gone from `src/` — ✅ 2026-09-10.** Both `superPhase.ts` sites
    now carry the `taxableEarnings ≥ 0` condition **and** the corrected reason: the loss refusal is
    load-bearing because it is **unconditional over `coverage`**, not because of where it sits.
    `docs/research/p3-25-ecpi-apportionment.md` got an **audit correction stamped in place**, not a
    rewrite — the original claim stands as the record of what that pass concluded.
  - [x] **Register canary built — ✅ 2026-09-10** (`core-super-phase.test.mjs`). Pins **both**
    directions: the condition must be present, and *"on **any** facts"* must occur **exactly
    twice**, both quotations of the superseded claim. Verified myself — a third occurrence fails 1,
    removing the condition fails 1.
  - [x] **Batch A, PARTIAL — 2 of 4 — ✅ 2026-09-10.** Quarantine **7 → 5**. A session limit killed
    the pass mid-batch; it had written both rows in full and died **before** clearing the quarantine
    entries, so the tree was left **RED** — the shrink-only test firing exactly as designed, because
    naming a refusal in the register registers it. Rows reviewed and accepted, entries cleared by me.
    - **`ModifiedLowTaxContributionsError` → §3.6.1** — a **scope refusal** (the fourth kind).
      **P3-26 at its narrowest:** unusually, §3.6's closing paragraph *already states the ground* —
      Subdivs 293-D/E/F not retrieved (research U2), *"refused rather than approximated"*, with no
      fallback because Subdiv 291-C modifies the concessional side by different rules. So it is
      **not** a rule living only in `src/`, and **not** P3-29 — **the register asserted the same
      negative and never named the class carrying it out.** All three throw sites reachable.
      ⚠️ **The guard tests the three flags in FIXED ORDER and the first true one throws**, so a
      defined-benefit member who is also a Commonwealth judge is always refused on **293-D** and the
      reported subdivision is not the whole truth.
    - **`NoticeOfIntentError` → §3.1/§3.4 area** — row written, accepted.
  - [x] **Batch A remainder (2) → §3.9.1 — ✅ 2026-09-10.** Quarantine **5 → 3**. Row and quarantine
    line written **together per refusal**, suite green after each — the ordering fix that stops a
    limit leaving the tree red.
    - **The two not-commenced refusals are ONE PREDICATE, TWO RULES.** The guards are
      character-identical but decline different figures under different provisions — the Sch 7
      **minimum** every account-based pension has, versus the reg 6.01(2)(b)(ii) **maximum** only a
      TRIS has. Merging them would fuse floor and ceiling exactly where §3.9 keeps them apart.
      **Their agreement is a fact about FY-comparison arithmetic, not about the law** — neither
      instrument requires it to hold.
    - ⚠️ **Cluster 5's permanence premise is SHARED, in the MIRROR direction.** Below §3.9.1 the
      unwritten premise makes the model **over-permissive** (a lapsed ceiling still applied); here
      it makes it **under-permissive** — someone who ceased at 61 and returned to work takes no
      ground and is refused on a day permanence would have released them. **Verified by running
      it** (b. 1964-03-15, asked 2027-06-30, still working → `met: false, grounds: []`).
      **Both refusals hang on the same unretrieved reg 6.01(7) from opposite sides**, and §3.9
      resolves it for neither.
    - ⚠️ **The split confidence bites wider than the mapping.** `accessible: false` means *no ground
      §3.9 models is met* — **strictly narrower than *the benefit is preserved in law***, because
      items **102, 102A and 103 are `primary-verified` and reachable by no input this model has**.
      The refusal's own text asserts the wider claim; the row does not repeat it. Direction is
      conservative (blocks money the law may release → Person understated, never flattered), and it
      is as invisible as T118.
    - **Rules that exist only in code:** the floor's not-commenced rule (§3.9 says nothing about
      years before commencement — the choice to *refuse* rather than return cl 4's nil lived only
      in `src/`), and **the cashing restriction on the unreleased side** (§3.9 states the *released*
      direction only; the converse is the entire content of `PreservedBenefitError`).
    - **P3-29 near-miss, not a case:** the message quotes §7 verbatim, so it asserts no contradicted
      negative — but *"independent of age"* is loose **in the register first**, since one of the two
      grounds is *turning 65*. Register and code are loose in the same way.
- [x] **P3-32** ✅ 2026-09-28: the named fix is applied. `test/refusal-names.test.mjs` Direction 1 now demands the name in a Refusal-column cell (`namedInARefusalCell`), not anywhere in the document; the empty `MENTIONED_WITHOUT_A_ROW` ratchet and its test are deleted in the same change, as its own comment asked. Mutation: misspelling `MissingIndexNumberError`'s cell fails Direction 1 and the BUILT-status check (2 red).
  ⚠️ **The drift test lost a net, and good prose caused it.**, and good prose caused it.** Misspelling a name in a
  Refusal cell used to fail **2** tests; it now fails **1**. Direction 1 (*every refusal in `src/`
  is named in the register*) stops firing once a row's **prose** names its own class — the name is
  still "in the register", just not where the row claims. **Once a row discusses its own refusal by
  name, the `BUILT` status check is the only remaining guard against a misspelled Refusal cell.**
  Fix: have Direction 1 require the name in a **Refusal column cell**, not anywhere in the document.
  - ⚠️ **REVERTED 2026-09-20, same reconciliation pass — I ticked this and was WRONG.** I flipped it
    on "all eight sub-items are `[x]`". They are, but they are **Batch B, the quarantine work — a
    DIFFERENT job from this item's own named fix**, which is the line four above: *have Direction 1
    require the name in a Refusal column cell, not anywhere in the document.* That fix is not
    applied. **The lesson, and it is the mirror of this whole pass:** a parent box is not discharged
    by its children when the parent states a fix of its own. Count the parent's own verb, not just
    the ticks beneath it.
  - [x] **Batch B (3) — ✅ 2026-09-10. QUARANTINE IS ZERO.** All 42 built refusals are now named in
    the register. `MissingBracketTableError` → **§2.1.1** (scope refusal), `MissingSurchargeComponentError`
    → **§3.6.1** (input-shape guard), `MissingDeemingRatesError` → **§4.5.1** (scope refusal, and the
    only one with a *documented way out* — it names a Setting key and takes it).
    - ✅ **`MissingBracketTableError` SAT AGAINST RULING R9 — RESOLVED 2026-09-15 by R12, in R9's
      favour.** The tension was that this refusal **refused the tax itself** for FY2027-28 while
      SAPTO, LITO and the Medicare levy were projected for that year. R12 found the ground narrower
      than the refusal — exactly as recorded here, the gap was FY2027-28's **37% and 45%** rates and
      not the table — and carried both forward, `unverified`, with their direction of error stated.
      The refusal **narrowed rather than went**: no real input reaches it now, and a synthetic
      `TaxYear` in `test/core-income-tax.test.mjs` keeps it exercised. Register §2.1, §2.1.1.
    - **`MissingSurchargeComponentError` guards the Medicare levy surcharge base, which has NO
      section anywhere in the register** and no rate, threshold or function in `src/`. It sits under
      §3.6 because Div 293 is the only consumer of a definition it *borrows*.
    - **§4.5's rate table reads against its own refusal in one word** — the last row is stamped
      *"2026-09-20 onward"*; the code refuses every date **strictly after** 20 Sep 2026 (verified:
      09-20 answers, 09-21 refuses).
    - **Dead code found:** `period.deemingRates` is read **nowhere** in `src/` (and is stamped from
      each period's *start*, carrying rates across six months of dates the engine refuses); neither
      `surchargeIncome` nor `div293Income` is called anywhere in `src/`; `householdIncomeTax` has an
      unreachable `brackets === undefined` branch twenty lines after the call that already threw.
  - [x] **P3-32 — ✅ 2026-09-10.** Second ratchet `MENTIONED_WITHOUT_A_ROW` (9 names) beside the
    quarantine: refusals **named in the register but with no Refusal-column row**. Shrink-only.
    Direction 1 untouched. **Misspelling a Refusal cell now fails 2 again** — confirmed against a
    control with the new test removed.
    - ⚠️ **A one-keystroke bug meant a BUILT row was read by NOTHING.** §3.1.1 carried a **stray
      blank line** between its two rows; the table walker stopped there, so `NoticeOfIntentError`'s
      row was unchecked and Markdown drew it headerless. The prose-only set was really **ten**. Both
      fixed — blank line deleted, walker no longer terminates on a blank line. **My own gate
      reported nine for the same reason.**
    - ⚠️ **Hazard:** a `|` inside inline code in a table cell silently shifts the Status column and
      fails the BUILT check.
  - [x] **The mentioned-without-a-row refusals** — P3-26's *other* half, invisible until the ratchet
    existed. **9 → 6 → 0.** Ticked 2026-09-11 by P3-24 for the same reason as the parent: batch 3
    below records this ratchet at zero.
    - [x] **Batch 1, the §3.9 trio — ✅ 2026-09-10.** `PensionBalanceDateError` (input-shape guard),
      `MidYearProportioningError` (scope refusal), `CessationBeforePreservationAgeError` (scope
      refusal in its rarest flavour — **not an absent rule but a tie-break between two present
      ones**). §3.9.1's table 5 → 8 rows.
      - **The §3.6.1 case INVERTED.** `PensionBalanceDateError`'s ground was recorded **three**
        times — T56, §3.9's *"Which balance"* row, and **§9 requiring the class BY NAME**. Six
        mentions, no row. **What was missing was never the ground and never the name** — only that
        nothing asserted it was *built* or said which file it lives in.
      - ⚠️ **`CessationBeforePreservationAgeError` pre-empts every later guard**, verified by
        running: four different fact sets on one Person all raise it instead of the more specific
        refusal. The window is measured on **30 June**, so one history gives a computed range at 59,
        this refusal at 60–64, and the conversion refusal at 65.
      - ⚠️ **Deleting that guard returns `met: false` — which is §3.9's own sentence.** So the
        mutation is **invisible to any test written from the register's text**, and §9 names no
        mutation for it. The spec-correct answer and the refusal are indistinguishable from the
        register alone.
      - **Four rules exist only in code**, including a **caller convention living inside a refusal
        message**: `GainfulEmployment` holds one `ceasedOn`, and one Person (ceased 58, returned,
        ceased 62) gets three different answers depending on which fact the caller states.
    - [x] **Batch 2 — ✅ 2026-09-10.** New **§3.2.1**; TRIS phase row into §3.10.8. List **6 → 3**.
      - **The two indexation refusals decline OPPOSITE HALVES of one ratio** (s 960-285(5)):
        `MissingIndexNumberError` the **numerator** (the December quarter indexed *to* — forward
        series is a Setting, **O5**); `UnsourcedIndexBaseError` the **denominator** (the cap's own
        base quarter — letting a caller's numerator borrow the register's denominator builds the
        mixed pair **O41** forbids).
      - ⚠️ **`MissingIndexNumberError` CANNOT FIRE in Division 296's only computable year.** Div
        296's base quarter *is* that year's December quarter, so both guards test **one cell** and
        the first-written wins. §3.7 distinguishes them as *"a missing quarter"* vs *"a caller error
        and a different failure"* — **which name a caller sees was decided by guard order, in
        `src/` and nowhere else.**
      - **`indexCapFromCpiSeries` carries THREE bare `RangeError`s** duplicating both registered
        refusals exactly, all unreachable (every caller tests first) — outside R8's naming
        discipline and outside the table-reading test.
      - The **`'AWOTE'` wording of `UnsourcedIndexBaseError` is unreachable by construction** (both
        throws pass a CPI-keyed spec). And the **AWOTE half of the O5 citation is a reading** —
        AWOTE is named nowhere in §8, and there is **no O40 equivalent for the concessional cap**.
- [x] **P3-34 — ✅ 2026-09-11.** `UnsourcedIndexBaseError`'s
  message ends *"Nothing but a published figure is available."* **False since 2026-09-09**, when O11
  closed: §3.2 now carries ten December-quarter CPI numbers and reproduces nine published caps from
  them.
  - **The falsity was introduced by the very commit that narrowed the class.** `d7019b7` deleted
    *"Only the published year is available"* and wrote *"Nothing but a published figure is
    available"* — **the same claim in new words** — while adding a JSDoc three lines above stating
    *"that sentence is gone with the ground under it."* **A comment asserting the removal sits
    directly above the surviving copy.** Verified from the diff.
  - **This is the sharpest form of the family:** not a claim that went stale, but a correction that
    *reworded* a falsehood and then certified its own completeness. Fold into P3-33's fix — same
    class, and `superCaps.ts` now has a raw-source canary, so it will be enforceable.
    - [x] **Batch 3 — ✅ 2026-09-11. BOTH RATCHETS ARE ZERO.** New §2.7.1 and §4.4.1. **P3-26 is
      complete: every built refusal has a Refusal-column row.**
      - ⚠️ **A refusal you can evade by withholding information.** Same household, run twice: a
        Person on **$50,000 with no SAPTO**, family **$60,000** → **answers $1,000.00** with the
        spouse omitted, and **refuses** the moment the spouse ($10,000, SAPTO received) is supplied.
        **O30's ambiguity is live in both calls**; neither refusal fires in the first. Nothing says
        the refusal's reach is bounded by disclosure.
      - **O30's width recorded as a bound, not a band:** it fires below **1.25 × the larger**
        threshold — the whole of s 8(1)'s nil band *and* the shade-in band — stopping where the two
        readings agree. Undecided status preserved with O30's closing conditions verbatim.
  - **Both closed by one pass that hit a session limit mid-canary** — the tree was left **green**
    (560/0, +5 tests), all four `src/` corrections landed, and the test **was** renamed to *"a
    vacated home past the two-year cliff is assessable at a value this model may not read, so the
    calculation refuses"*. The layered absence canary was built too. **No mutation report survives**
    — I verified the load-bearing one myself: **narrowing the SAPTO guard to the shade-in band
    fails 2 tests**, so the mistake the wrong message invited is caught.
  - [x] **Re-check done 2026-09-11 — the interrupted pass's work is sound.** I ran the outstanding
    mutations myself: reinstating *"less than the s 8(2) reduction"* → **1**; the contradiction claim
    back in the **message** → **2**; the same claim in a **comment** → **1**. **None zero.**
    - **My prediction was wrong in the useful direction:** I expected the comment case to fail zero,
      because `core-age-pension-mutations.test.mjs` builds its corpus through `executableCode`,
      which strips comments. The age-pension canary reads **raw** source for this claim, so the
      comment is guarded after all.
    - *(Two of my own verification scripts were faulty first time — `grep -c` exits 1 on a zero
      count so a `||` fired spuriously, and an apostrophe inside a single-quoted JS string broke the
      build. Both produced misleading output before I caught them. **A mutation that fails to
      compile is not a caught mutation** and must be re-run, not counted.)*
- [x] **P3-37 — the canary that catches a REWORD, not a string — ✅ 2026-09-11.** Built while fixing
  P3-34, whose whole defect was a reword surviving a removal. A literal `doesNotMatch` would have
  watched that happen and passed.
  - **Four layers:** both historical wordings · a regex family of near shapes · a **vocabulary ban**
    (`published`, `register`, `only`, a second `available`) · **topic + sentence count** — each
    sentence must name one of the refusal's four subjects, and there must be exactly three.
  - ⚠️ **An adversarial on-topic reword failed ZERO tests against the first three layers**, slipping
    them by borrowing the word "series". Layer 4 was added *in response* and it now fails 1 — the
    zero was **fixed, not just reported**. A follow-up mutation confirmed the escape from a count
    pin (replace rather than append) is caught by the positive anchors.
  - **Deliberately NOT pinned with `assert.equal`** — `09d84c9` is this repo's record of a prose pin
    holding a falsehood in place. The canary forbids the claim; it does not freeze the text.
- [x] **P3-35 — ✅ 2026-09-11.** Messages wrong about their own FIRING CONDITION (not about the
  register). Two found in one batch, both verified by running:
  - `FamilySpouseNotSuppliedError` says the excess is *"less than s 8(2)'s reduction"*. It fires on
    `raw > 0` — a window **13.5× wider**. At the last firing cent the reduction is **4 cents**.
  - `MixedSaptoFamilyThresholdError` opens *"is inside the … family shade-in band"*, **false in the
    s 8(1) half of its own reach**. The guard implements O30's width; the message describes only the
    narrow band — **so trusting the message invites exactly the narrowing §9 forbids.**
    - **⚠️ 2026-09-21: the refusal this corrected is DELETED (O30 closed, P3-1f), so the message is
      gone with it.** The finding stands as a finding and the batch's other half is untouched. Note
      what it could not have caught: the message was wrong about its REACH, and the guard was right
      about its reach — both were downstream of a premise neither the message nor the canary
      questioned. A message canary polices the description, never the ground.
- [x] **P3-36 — ✅ 2026-09-11.** The eighth false-ground instance, datable to a 2h56m window.
  `UnvaluedAssessableHomeError` says *"The register contradicts itself here."* **False since
  2026-09-04**: T39 was resolved in favour of T42 by user ruling. The register records a **knowing
  law/scope divergence** — that *is* the resolution, not a contradiction.
  - **Message written `49caaf2` at 08:09; ruling landed `ff085db` at 11:05.** Untouched since.
    Verified from `git log`.
  - **Four copies** — the message, two `household.ts` comments, and **the name of the test covering
    it**. **§9's mutation row for this very refusal already dates its own supersession**, so the
    register flagged the staleness in the row that requires the class.
  - It also names the **wrong kind**: *"the register contradicts itself"* describes a **drift
    tripwire**, which this is not.
- [x] **P3-33 — ✅ 2026-09-11.**
  `src/core/minimumDrawdown.ts:131` tells the user the commencement-year balance is read on the
  commencement day *"not on 1 July, **which register §3.9 says** and which is the one thing in the
  row that is wrong"*. **§3.9 has said the opposite since 2026-09-09**; the old wording survives
  there only as quoted superseded text. The module was last edited **2026-09-08** (`4e26760`) — the
  day before — and its **file header carries the same stale sentence**. True when written, false
  now.
  - This is the **superseded** variant, like P3-30, not the contradicted-negative variant. The
    family now spans: *never retrieved* → *a negative the register contradicts* → **a claim about
    the register that the register has since corrected**.
  - **`minimumDrawdown.ts` has a raw-source canary** (unlike `superContributions.ts`), so this one
    **is** enforceable once corrected.
    `div293`, `incomeBases`, `incomeTax`, `minimumDrawdown`, `conditionOfRelease`,
    `superConcessional`).
  - ⚠️ **READ BEFORE THE NEXT CLUSTER — naming a quarantined refusal ANYWHERE in the register
    registers it.** A passing cross-reference to `TotalSuperBalanceDefinitionError` in a §3.7.1 row
    de-quarantined a sixth refusal and failed the shrink-only test immediately. Refer to an
    unregistered refusal by description, never by identifier.
  - ⚠️ **The status check was unenforced for the THIRD time, and is now self-discovering.**
    `refusal-names.test.mjs` read a hand-maintained list of sections (§3.10.8, §3.11.9), so
    §3.7.1's five `BUILT` claims were checked by nobody — marking one `proposed` failed **zero**
    tests. It now **discovers** every `| Refusal | … | Status |` table in the register, so a fourth
    table cannot be forgotten. Verified: that mutation now fails 1.
  - [x] **Both unsound grounds CORRECTED — ✅ 2026-09-10.** Four sites in `div296.ts`; no refusal's
    firing conditions changed, grounds and messages only. `Div296AttributionBasisError` now states
    the **weaker, true** absence (regs **were retrieved**, **not read in full** — O17) and survives
    on its narrower ground; `Div296BalanceDateError`'s check **stays**, with the s 296-40(2) ground
    qualified to FY2027-28+ and the transitional-year ground given separately.
    - ⚠️ **`div296.ts` and `superCaps.ts` have NO raw-source canary** — 12 test files carry one and
      neither module is read by any of them. So the mutation reinstating the false negative **in a
      comment** fails **zero** tests: a comment-only correction in those two modules is
      **unenforceable by construction**. The message-level correction *is* held. Adding a source
      scan for both is the fix.
    - ⚠️ **The `import-graph.test.mjs` foot-gun fired a SECOND time today** — a comment containing
      `from "neither regulation was retrieved"` was parsed as an import specifier. Any prose in
      `src/` following the word `from` with a quote trips it.
  - *(Original finding, both now fixed:)* **Two unsound grounds found and NOT fixed**:
    - **`Div296AttributionBasisError` asserts a false negative — same class as O70.** Its message
      says *"neither set of regulations was retrieved"*; **O17 records that `F2026L00726` WAS
      retrieved** (regs 296-65.01, 296-70.01 factor 0.825, 296-70.02, "not read in full"), and
      §3.7 cites that very instrument at `primary-verified`. *Retrieved but unread* is a **weaker**
      argument from absence than *never retrieved*, so **R6 forbids the stronger wording**. The
      same false sentence is in `superannuationEarningsFromWholeFund`'s doc comment and the file
      header.
    - **`Div296BalanceDateError`'s stated ground is contradicted for FY2026-27** — transitional
      s 296-1(2) strikes out the opening limb (T16), yet the opening *date* is still enforced in
      the only computable year. The check may still be wanted; the ground is not the one given.
  - **My brief carried a false premise, corrected by the pass:** I said the register recorded the
    Div 296 CGT phase-in as unreachable by any Person. It did **not** — that lived only in
    `div296.ts`'s header and P3-5a. It is now in §3.7.1, with *"a single-member fund is a small
    superannuation fund"* flagged as a **SIS Act definitional claim the register has no row for**.
  - *(Original finding:)* **28 of 39 refusals have no register row** — found 2026-09-10 by
  `test/refusal-names.test.mjs`. Only **11** of the codebase's 39 refusals are named anywhere in
  `docs/`. Whole clusters are missing: **every** Division 296 refusal, **every** franking refusal,
  and every TRIS refusal in `ttrPaymentRange.ts`. The recent ones are documented because their
  briefs made a register row a deliverable; the older ones never had one.
  - They are quarantined in the test's `UNREGISTERED_ON_ARRIVAL` set — **a finding, not an
    exemption**. The set is self-cleaning in three directions: registering a name fails the test
    ("delete this line"), deleting the class fails it, and renaming fails direction 1 under the new
    name. **It can only shrink.**
  - Burn it down in clusters, not one at a time — a refusal's register row belongs beside the rule
    it refuses to apply, so the Div 296 rows go in §3.7, franking in §5A, TRIS in §3.9/§3.10.6.
  - **A refusal with no register row is a decision the specification does not record.** That is the
    same defect as a rule consumed by nothing, pointing the other way: code refusing on grounds the
    spec never states.
- [x] **P3-24** ~~**Source WATO — the Working Australians tax offset** (register §2.8). It exists from
  FY2027-28, it is **already law**, and its **amount and taper are not captured**. Inside the
  planning horizon and larger than the `0.3` placeholder it sits beside; it is the FY2027-28 gap
  that will actually move a household's numbers. Small research pass.~~
  — ✅ 2026-09-11. `docs/research/p3-24-wato.md`, register **§2.8.1** and **§2.8.2**, figures and the
  s 63-10 application order in `src/data/assumptions/tax.ts`, the fifth income base in
  `src/core/incomeBases.ts`. **O15 closed. New open items O72 (s 25-130) and O73 (offset order).**
  - **There is no taper — the row that said there was one is the finding.** The amount is
    `min($250, the basic income tax liability net labour income alone would bear)`; limb (b) is a
    **shade-IN**, so the offset rises at the lowest marginal rate from the tax-free threshold and is
    then a **flat $250 at every income above ~$19,986, with no ceiling**. The old framing would have
    understated WATO for high earners — conservative, and therefore invisible.
  - **The shade-in point is derived and is not stored.** `TFT + max / lowest_rate` = $19,985.714… for
    FY2027-28, so $19,985.72 is the first whole cent at which the $250 binds. Budget Paper No. 2
    publishes **$19,985** and **$24,985** independently, and the second reproduces §2.2's $700 LITO
    maximum exactly — two derivations of two figures, agreeing.
  - **$250 is `config` and NOT indexed, on positive evidence:** Subdiv 61-E is absent from the
    s 960-265 table that s 960-270(1) makes the gateway. **$18,200 is `constant` and positively
    frozen:** ITRA s 3(1) plus the 2011 amendment to $19,400 having been repealed in 2015.
  - **Net labour income is a FIFTH income base** (s 61-155(2)) — T9 moves from *four bases, five
    brands* to **five bases, six brands** from FY2027-28. The tool cannot derive the labour /
    non-labour split, so it is a **Setting** defaulting to "all salary is labour income, labour
    deductions nil", in the shape the Div 293 seam already uses.
  - **The s 63-10 order is registered as a rule, it is MANDATORY, and it is worth $0 to a SAPTO
    couple — O73 RESOLVED 2026-09-15** (`docs/research/p3-24-o73-offset-order.md`). WATO is item 3,
    ahead of SAPTO at item 5, with LITO in item 20's residual, and s 63-10(1)'s "apply them … in
    the order shown in the table" is imperative. The order fixes **which** offset is the leftover;
    it does not fix **how much** transfers. **The earlier claim on this line — that applying WATO
    first increases the excess available to transfer — was FALSE and is withdrawn.** Item 5 defers
    the amount to the regulations, and reg s 12 computes it from the base rebate amount and the
    transferor's taxable income, never from the residual, so it is **order-blind**. Register §2.8.1,
    §2.6 and the `TAX.wato.applicationOrder.neutrality` record are corrected; the reg s 12 citation
    was verified **correct** and needs no re-check. Canaried in `test/assumptions-tax.test.mjs`
    ("O73 CANARY"), which fails if the couple BRA ever passes $1,830 or the tax-free threshold falls.
  - **What landed in the data layer, and how each figure is held so a mutation bites.** `TAX.wato`
    in `src/data/assumptions/tax.ts`: the `min` as `watoOffsetAmount` behind a `config-derived`
    record, the shade-in point as `watoShadeInPoint`/`watoShadeInPointFor` (formula stored, number
    never), `maximumOffset` `config` FY2027-28 with `maximumOffsetIndexed: false`,
    `entitlementThreshold` `constant` pinned in the test to `taxYear(fy).taxFreeThreshold` rather
    than to a second $18,200 literal (T14), and the s 63-10 table as **five separate item-number
    constants** with the order **derived by sorting on the item number** — so permuting the table is
    benign and the only expressible reorder is moving WATO off item 3. `NetLabourIncome`,
    `netLabourIncome()` and `netLabourIncomeFromSalary()` in `src/core/incomeBases.ts`; the Setting
    at `tax.wato.netLabourIncomeSplit` in `settings.ts`. Nothing is orphaned: every record is read by
    `explainAssumption`'s walk and by `test/assumptions-tax.test.mjs`.
  - **The nine "four income bases, five brands" sites are updated, not left standing.** T9,
    `incomeBases.ts`, `incomeTax.ts`, `superCaps.ts`, `superContributions.ts`,
    `core-income-tax-mutations.test.mjs`, `concept.md` ×2 and the two CGT/franking TODO rows. The
    franking and CGT sites are **narrowed rather than recounted**: a discounted capital gain and a
    franking gross-up are not labour amounts under s 61-155(2), so they raise four of the five bases
    and never the fifth. `docs/research/p3-div293-income-base.md` U3 still says "four income bases" —
    left alone deliberately, as a dated research artefact recording what was true on 2026-09-08.
  - **Still not built:** the offset itself (P3-39), and s 25-130 (P3-38).
    — **stamped 2026-09-15:** P3-39 is built. s 25-130 (P3-38) is still not, and it is now the only
    one of the two outstanding.
    — **stamped again 2026-09-15:** P3-38 is built too, for its WATO-base limb only. Its
    taxable-income limb has no call site until P4-1 and stays open as **O72**, narrowed in place.
    — **stamped 2026-09-17:** P4-1 chunk 3 built the call site. **O72 is CLOSED.** Both limbs of
    s 25-130 are wired and both read `standardDeductionAmountFor`.
- [x] **P3-38** **ITAA 1997 s 25-130 — the $1,000 standard deduction for work-related expenses**
  — ✅ **2026-09-15, for ONE of its two effects.** (register **§2.8.1**, **§2.8.2**, **O72**.)
  - **WHAT LANDED — the WATO-base limb, s 61-155(2) `labour deductions` limb (c).**
    `standardDeductionAmount` / `standardDeductionAmountFor` and the `TAX.s25130` block in
    `src/data/assumptions/tax.ts` — `max(0, min($1,000, assessable labour income) − reducers)`, the
    order of all three operations load-bearing, with the year gate `s25130AppliesToYear` mirroring
    `watoAppliesToYear` and answering **one year earlier**. `netLabourIncomeFromSalary(fy, salary,
    reducerDeductions)` in `src/core/incomeBases.ts` consumes it, so every WATO figure from
    FY2027-28 is now computed on a reduced base. All three arguments are **required**: a nil is a
    figure the caller states, never one they get by leaving a field out. The reducer sum is **one
    aggregate Setting**, `tax.s25130.reducerDeductions` — five categories, one formula, one sign —
    and the s 25-130(3) exclusions get **no field at all**, the same treatment the SG contribution
    gets. The $1,000 is written **once**; the gross wage for the full $250 (about **$20,985.71**) is
    **derived** from the shade-in point plus that maximum and stored nowhere.
  - **WHAT DID NOT LAND IN P3-38, and LANDED 2026-09-17 IN P4-1 CHUNK 3: the Div 25 taxable-income
    limb.** s 25-130 also reduces **taxable income**, worth up to $1,000 × the marginal rate per
    working Person **in FY2026-27**. P3-38's reason for stopping is kept here once, because it is
    what chunk 3 had to supply: *"There is no call site in `src/core` to wire it to: `taxableIncome()`
    is a bare boundary constructor over a number the caller already holds, `SaptoPerson.taxableIncome`
    is a required input, and nothing anywhere computes assessable income less deductions. That
    assembly is P4-1. Registered with no runtime consumer at `TAX.s25130.effectOnTaxableIncome`;
    O72 is narrowed in place to this limb and stays open, blocked on P4-1 — not closed, and not
    replaced by a new O-item. So this pass changes no FY2026-27 figure at all."* The assembly is
    `taxableIncomeFromSalary` in `src/core/projection.ts` and it **reuses
    `standardDeductionAmountFor`** — no second $1,000. **O72 is CLOSED**, no second O-item was
    opened, and P4-1 chunk 3 **does** change an FY2026-27 figure: $320 a year on a $78,000 salary.
  - **THE ACCEPTED OPTIMISM IS DISCHARGED FOR THE MODAL CASE AND NARROWED, NOT INHERITED.** For a
    wage earner with no other work deductions the default is now **exact**. What survives is a Person
    with real, unmodelled reducers, whose net labour income is over-stated by `max(0, actual −
    $1,000)` — nil for the common case, **not bounded above**, and bounded in this build only by
    WATO's $250. It **flatters the household** (R9's disfavoured direction) and there is **no honest
    refusal trigger**, because the tool cannot identify that population. **ACCEPTED 2026-09-15
    (P3-38) on its own dated ground**, at register §2.8.1, in `TAX.s25130.residualOptimism` and on
    both Settings.
  - **The tripwire was REPLACED, not deleted**, though its own prose said to delete it: the
    acceptance it pinned narrowed rather than vanished. `test/assumptions-tax.test.mjs` now pins the
    residual's **direction** and its **size** in two financial years, and goes red the day
    `reducerDeductions` stops being a Setting and becomes a derived record — the one event that
    would let the tool identify the affected Person and discharge this acceptance in turn.
  - **Contradiction found and FIXED before commit (see §2.8.1):** the Setting `reason` and
    `TAX.s25130.residualOptimism` both called the residual *"bounded by $1,000 × the applicable
    marginal rate"*, while `netLabourIncomeFromSalary`'s JSDoc said a $1,000 ceiling on it would be
    wrong — three shipped records, two files, and the JSDoc had the arithmetic right. Because
    `labourDeductions` comes out as `max(actual reducers, $1,000)`, a nil Setting over-states net
    labour income by `max(0, actual reducers − $1,000)`: nil at or below $1,000 and **unbounded
    above**. A false bound is arithmetic and not a matter of wording, so both records were corrected
    rather than left standing, and the $3,000 case is pinned in `test/assumptions-tax.test.mjs`.
  - **MUTATION BATTERY RUN 2026-09-15** (`fb0e2b8`), and it earned its keep: of the eight named
    mutations, **three survived the entire suite** — the T14 drift (a second `toCents(1_000)` at the
    call site), the Setting's **stated** default rewritten in prose with the code untouched, and the
    default made silent in code (`reducerDeductions: Cents = toCents(0)`, which every call site
    overrides so it moves no figure). **None of the eight was caught by a compile error** as the
    build stood. All three are closed, along with the s 25-130(3) exclusion leak that had no test
    anywhere; the rows are in register **§9**. Two of them — the drift and the stated default —
    **cannot be made structural** and rest on source/record canaries. Mutations 2, 3 and 7 were
    caught but each rested on a **single** test, because three exported functions were imported into
    `test/core-income-tax.test.mjs` and never called.
  - **as written, before the build:**
  (register **§2.8.2**, **O72**). Found by P3-24, not built. Inserted by Act No. 49 of 2026 **Sch 4**
  item 3 — the same Act as WATO — and applying **from FY2026-27, the CURRENT year**, not FY2027-28.
  The lesser of $1,000 and total assessable labour income, reduced not below zero by the Person's
  actual s 8-1 work deductions, Div 28 car expenses, s 25-100 travel, work-asset repairs and decline
  in value, and s 25-125 COVID-test deductions; s 25-130(3) excludes income-protection and
  professional-association fees from the reducers. **Not indexed** (no s 960-265 item).
  - **It reduces WATO's own base**: s 61-155(2) `labour deductions` limb (c) is "an amount you can
    deduct under section 25-130", so an ordinary wage earner with no other work deductions needs
    about **$20,985.71 of gross wage** for the full $250, not $19,985.71.
  - **The direction is conservative but the year is not forward.** Omitting a deduction over-states
    tax, which is R9's safe direction — but R9 was ruled about FY2027-28 and this is FY2026-27, worth
    up to $1,000 of taxable income per working Person **now**. That is the whole reason it gets its
    own item rather than a line under P3-24.
  - Needs a register row of its own, a decision on the reducer list, and a **Setting** for the
    Person's actual work deductions — which the tool cannot derive any more than it can derive the
    labour split.
  - **P3-38 DISCHARGES AN ACCEPTED OPTIMISM, added 2026-09-15 by P3-39.** The Setting default
    `netLabourIncomeFromSalary` (all salary is labour, no deductions) over-states net labour income,
    which raises WATO, which lowers net tax — so inside the shade-in band it **flatters the
    household**, the opposite direction from every other unsourced FY2027-28 figure
    (`CARRIED_FORWARD_DIRECTION`, R9). Ruled accepted as known, bounded and temporary
    (register **§2.8.1**). s 25-130 is `labour deductions` limb (c), so P3-38 fixes the **input**
    and the caveat stops being true: when it lands, revisit §2.8.1's `ACCEPTED 2026-09-15`
    paragraph, `netLabourIncomeFromSalary`'s JSDoc and the Setting's reason in the same change.
    `test/assumptions-tax.test.mjs` carries a tripwire that goes red the day a s 25-130 record
    joins the register, so this cannot be forgotten.
- [x] **P3-39** **Compute WATO** — the module P3-24 deliberately did not build — ✅ **2026-09-15**.
  `workingAustraliansTaxOffset` in `src/core/incomeTax.ts` (entitlement-gated, returns the raw
  entitlement, shaped like `lowIncomeTaxOffset`); limb (b) as
  `watoHypotheticalBasicIncomeTaxLiability` in `src/data/assumptions/tax.ts`; the s 63-10(1) item 3
  cap applied once, centrally, in `householdIncomeTax`, which **sequences WATO first** and reports
  `watoComputed` and `watoApplied` as two fields — the aggregate is order-blind (O73) but the
  attribution is not, and a $250 offset with no carry-forward has nothing else to report.
  `netLabourIncome` is optional on the Person and **required from FY2027-28**
  (`NetLabourIncomeNotSuppliedError`); `BasicIncomeTaxLiability` is a new brand that makes the
  pre-offset trap a compile error. Register **§2.8.1.1** tabulates which trap is structural and
  which is only tested. **One finding worth carrying forward:** limb (b) does **not** need R12's
  carried-forward rates — it is computable from the tax-free threshold and the lowest marginal rate
  alone — so `unverified` taints the **cap**, never the **amount**, and the last sentence of this
  item as originally written would have caveated every shade-in WATO figure wrongly. The original
  text follows, unedited.
  - **as written, before the build:** `src/core/` has no
  WATO arithmetic: the register carries the figures, the derivation and the order, and nothing
  applies them. Three things it must get right, all recorded in §2.8.1: limb (b) is **pre-offset**
  (LITO and SAPTO are s 4-10(3) step 3 and do not enter it); the s 63-10 item 3 cap is on **actual**
  basic income tax liability on **actual** taxable income, which is a different number from limb (b)
  and can waste the whole offset; and WATO carries **no Medicare-levy limb**, so it can never reduce
  the levy. **No longer blocked on O73** — closed 2026-09-15: the s 63-10 order is mandatory and
  WATO at item 3 has no dollar effect on a SAPTO couple's transfer or final tax, so WATO can be
  built without settling anything further about SAPTO. **No longer blocked on the FY2027-28 bracket
  table either** — R12 supplied it on 2026-09-15, so limb (b) has a rate ladder to run against; note
  that it is `unverified` and over-states tax, so a WATO computed on it is a conservative figure and
  must carry that provenance through.
- [ ] **P3-40** **Fetch the Explanatory Statement to F2025L01060** — *Income Tax Assessment (1936
  - **Fetched 2026-09-24; it does NOT settle the question.** The ES (legislation.gov.au/F2025L01060/asmade/2025-09-09/es/original/pdf; the dated
    `/asmade/<date>/es/original/pdf` path is the one that works) says only "tax payable". Its Example 4 is below the tax-free threshold, so it
    can't tell the readings apart. §2.6's gross reading stays a labelled inference. Still to check: the actual Schedule 3 text of Act No. 49 of 2026.
  Act) Regulations 2025* — and settle what "tax payable … (disregarding any credits or rebates)"
  in **s 12(1)(b)** reaches (register **§2.6**, residue of **O73**). One document. It is the
  cheapest remaining source that could resolve the gross-versus-ITAA-1936-only reading outright;
  failing that, the EM to Act No. 49 of 2026 Sch 3.
  - **Low priority BY DESIGN, not by neglect.** The two readings are worth **$0** for a resident
    couple while the couple base rebate amount stays under **$1,830**: the reg s 12(3)(b)(ii)
    transfer tapers to nil at $16,680 of taxable income and a non-refundable WATO cannot be applied
    below the $18,200 tax-free threshold, so the positive-transfer and positive-WATO regions are
    disjoint by $1,520. **That condition is a test, not a note** — "O73 CANARY" in
    `test/assumptions-tax.test.mjs` reads both figures from `src/data/assumptions/` and fails the
    moment they overlap. Raise this item's priority when that canary goes red.
  - The build already applies the gross reading, and has applied it to **LITO** since long before
    WATO existed: the SAPTO transfer gate in `src/core/incomeTax.ts` compares the base rebate
    amount against `taxOnTaxableIncome`, which subtracts no offset. Registered as a labelled
    inference in §2.6, **not** as `primary-verified` (R6).
- [x] **P3-41** ✅ **ALL 15 CONVERTED 2026-09-28.** Chunk 2 did the remaining 12 in the same pattern: PensionAccountBalance, MinimumDrawdown, FrankedDistribution, TotalSuperBalanceReference, Div296FundEarnings, SuperannuationEarnings, LowTaxContributions, TrisAccountBalance, PhaseYearFraction, Accumulation/RetirementPhaseInterest (one witness each, same symbol, so the member count stays 33) and TransferBalanceAccountDays. The sweep reads 0 holed / 15 closed. Three source-text pins were re-spelled to the witness form, no weaker. The two-step proof for the phase-discriminated interests needs `as const` on the lie, or it passes vacuously; recorded as `witnessLie` in the sweep. A forged `MinimumDrawdown` copy is TS2322, re-probed by LIZ. 3057 green. **Chunk 1** (`43dabb8`): `TransferBalanceLedger`, `ConditionOfRelease` and `TtrPaymentRange` now carry a private-member brand (a type-only `declare class …Witness`, which emits no JS). No reader churn, figures byte-identical. The sweep reads 12 holed / 3 closed. **Use private-member for the remaining 12:** the opaque form is also beaten by a two-step spread (an unannotated `const`, then the copy). The ledger's spread forgery is now TS2741/TS2322. `requireAConformingLedger` stays as the guard against `as` casts and JS callers. Stale comment left: `core-transfer-balance-ledger-battery-b.test.mjs` "no type can make it true".
  **Convert the object-shaped `unique symbol` brands to a form an object spread cannot
  defeat.** Opened 2026-09-16 on the user's ruling (option (ii)) at the close of P3-9 chunk 6: close
  the priced gaps, land the sweep canary, and carry the full conversion as **a separate numbered
  item** — explicitly NOT riding in on chunk 6. Everything below is **measured**, so nobody has to
  re-derive it.
  - **The defect, once.** A `[SYM]: true` member is an ordinary property. An object spread copies it
    into the type of the result, and excess-property checking never fires on the overridden field
    because that field is a *known* property of the target. So `{ ...aRealValue, anInvariant: aLie }`
    typechecks and carries the brand. **No tsconfig flag changes this.** A symbol brand in this repo
    therefore means *"these fields were computed together"*, **never** *"this invariant holds"*.
  - **The scope, as counted rather than estimated: 15 object-shaped types, from 14 symbols, across 8
    modules.** Fifteen and not fourteen because `SUPER_INTEREST` is declared once and worn by both
    `AccumulationInterest` and `RetirementPhaseInterest`. The **18** scalar brands are **structurally
    immune** and are not in scope: spreading one is TS2698 and cross-assigning two is TS2322.
  - **The three fix forms, probed with `tsc` and not reasoned about.** **Opaque type — WORKS**
    (TS2353): hide the figure behind the brand and read the fields through functions; cost is that
    every reader becomes an accessor call. **Class with a `private` member — WORKS** (TS2741): no
    object literal can produce a private member, spread or not; cost is that the values stop being
    plain frozen records. **Brand as a method signature (`[SYM](): void`) — DOES NOT WORK**: it looks
    like the cheap structural answer and compiles straight through, because a method is copied by the
    spread exactly as a property is. Pinned so the day any of those verdicts changes, the record must
    be rewritten.
  - **A real datapoint for pricing the job, measured on the type the probe did not need to touch:
    `npm run build` exits 0 with a private-member conversion applied to `TtrPaymentRange` and NO
    reader changes.** One type, one commit, no call-site churn — which is evidence the job is
    incremental rather than a flag day, not a promise that all fifteen behave alike.
  - **The acceptance checklist already exists and ratchets in BOTH directions:**
    `test/brand-spread-sweep.test.mjs`. A new holed brand fails it, and so does a brand that is
    silently FIXED — so a conversion cannot land without editing that file, and the list of edits
    left to make **is** the work breakdown. The set is discovered from `src/core/` rather than listed,
    pinned by a shape-blind count of 33 brand members, so a brand written in a shape neither
    derivation recognises surfaces as a missing row rather than as silence.
  - **The strongest argument for doing it, and it is a survivor rather than a theory.** It closes the
    DECLARED SURVIVOR in register **§9 → Transfer balance cap**: today the entire behavioural defence
    of the ledger witness is one `test()` call (two limbs × two seams = four mutations, the same
    single failing test each time), because the defence is a runtime re-derivation at two call sites.
    Converting `TransferBalanceLedger` makes `transferBalance` and `throughDay` **unreadable without
    the witness**, which is the only fix that is structural. The same applies to `ConditionOfRelease.
    met` — a named P13-5 mutation target that a spread sets directly — and to `TtrPaymentRange.
    ceiling`, neither of which is anywhere near P3-9.
  - **A runtime mitigation is not a closed hole.** Chunks 6-0, 6-1 and 6-2 addressed the *consequence*
    of three priced instances; all three types remain spreadable and all three still appear in the
    HOLED list. Only the stated-door rename (6-2) is structural, and it defends one door, not a type.

- [x] **P3-42** **The super fund's real 15%/0% earnings tax is not computed in a live forecast at
  all — every balance grows at `Settings.nominalReturn`, an assumed already-net figure, never the
  fund's actual legislated rate.** Newly surfaced 2026-09-22 while gating P6-8 (the sacrifice-vs-
  invest comparison), which is blocked on this. Independent defect, not merely P6-8's prerequisite.
  **BUILT ✅ 2026-09-22, all three microtasks** (`553f222`, `519bd54`, `a0fc0c9`) — see the
  IMPLEMENTED note after the two gates below for what shipped, what the mutation battery found,
  and the one scope decision made rather than merely taken.
  - 🟢 **GATE: GO — 2026-09-22 (LIZ), claims verified independently against the code, not taken on
    the agent's word.**
    - **`nominalReturn`'s meaning is silent, not ambiguous-and-blocking.** Its doc (`plan.ts:104-124`)
      states it compounds monthly onto every `SuperInterest.balance` and every parcel, and calls
      itself "one number, on purpose and for now" — banding is deferred to P2-11's Glide Path. It
      never says "net of the 15%/0% fund tax". So today's figure is neither proven to double-count
      that tax nor proven to omit it — it is an undocumented number the user typed in. A NEW, OPT-IN
      mechanic does not need to resolve that ambiguity to be safe; it only must not silently
      reinterpret what the user already stated.
    - **Both rates needed are already sourced and sitting unused.** `earningsTaxAccumulation` (0.15,
      ITAA 1997, "Accumulation Phase and TTR alike") and `earningsTaxRetirement` (0, ss 295-385/390)
      are both `primary-verified`, §3.1, in `src/data/assumptions/super.ts`. Confirmed independently:
      `grep -rn "fundEarningsTax(" src/` (excluding tests) returns exactly ONE hit, inside
      `superFranking.ts` itself — the function is real, tested and phase-aware, but has never been
      called from a live walk.
    - **Phase is already tracked live, per interest, every month — no prerequisite build.** Every
      `SuperInterest` carries `phase: 'accumulation' | 'accountBasedPension' | 'ttr'` as stated data
      (`household.ts:115`), read throughout `projection.ts`. The known caveat (phase is stated, never
      derived; no amount is checked against the transfer balance cap, P3-9) is inherited exactly as
      `superFranking.ts` already inherits it — not a new gap this item creates.
    - **CGT realised inside super is explicitly OUT OF SCOPE, and correctly so, not dodged.**
      `SuperInterest` carries a scalar `balance` — no parcels, no cost base, unlike `Person.parcels`
      outside super. `superPhase.ts` states in terms that `fundEarningsTax` "does not compose the
      fund's taxable earnings" — realised gains and the one-third discount are not decided there.
      With no disposal event modelled inside super, treating growth as unrealised and untaxed until
      draw is the legally correct treatment today, not an approximation — PROVIDED this item taxes
      only the **income** share of growth, never the whole balance's movement. The one-third discount
      rate has no citation anywhere in the register — correctly left out rather than invented.
    - **Zero-churn path exists, same shape as `investmentPayoutRate` (P3-22h).** A new OPTIONAL
      Setting for super's income-yield share, absent = today's exact behaviour, unread until step 2.
      `projection.ts:7157-7210` applies `nominalReturn` uniformly today with no phase branch — fixing
      that IN PLACE would move every fixture; building BESIDE it as an opt-in does not.
    - **Sized down from this file's own earlier guess.** The P6-8d note that surfaced this called it
      "M-L" as if the whole taxable-earnings base had to be built. It does not: scoping to the
      income-yield share (mirroring `investmentPayoutRate`, not building a super parcels/cost-base
      system) avoids that entirely.
    - **RULED BY LIZ on precedent, not escalated: build INCOME-ONLY, defer growth/CGT-within-super
      explicitly.** This matches how `investmentPayoutRate` already treats the non-super portfolio —
      the growth share stays untaxed until realised, in both cases, by the same legal reasoning.
    - **RULED BY THE USER 2026-09-22 — user-triggered, dated, never an automatic default.** A TTR
      never converts by inference from age or from a legal condition being met. It converts on a
      STATED date the user provides, the same shape as `RETIRE` or a mortgage's dated terms change —
      because real households genuinely split both ways: some convert TTR to an account-based pension
      from age 60 the moment they can, others stay in Accumulation Phase deliberately all the way to
      pension age. Neither is a default worth guessing. **This directly answers the escalation raised
      when this item was gated** (how a household with a live but unconverted TTR interest behaves)
      and is the resolution the conversion limb below has been missing since it was blocked
      2026-09-09. **This is a NEW DATED ENTRY, not a Setting** — it names the account and the day, on
      ADR-0002's one-mechanism rule, matching `MORTGAGE_TARGET`'s shape (a dated milestone entry, not
      a flag). Building this is what turns `TrisRetirementPhaseNotModelledError` from a permanent
      refusal into a refusal that clears the moment the user states their own date — and it is
      **P3-8's "conversion limb" sub-item, not a new one**: this ruling is the missing piece that
      unblocks it, not a parallel mechanism.
      - ✅ **CONFLICT RE-RULED BY THE USER 2026-09-22 — R13's backstop STAYS, and the earlier "never
        assume" line above is the one that is OVERTURNED.** Verbatim: *"preservation age to 64, user
        advises the move to account based, else auto happens at 65."* This IS **R13** (2026-09-16,
        `c2bbb4e`) restated exactly, word for word in substance: a stated changeover day wins
        whenever it falls before the 65th birthday; a silent household is still assumed to convert
        automatically at 65, understating exactly as every other missing figure here does. **No new
        contradiction, no new machinery for the default case** — the auto-65 backstop is EXISTING,
        BUILT logic (`trisConversionDayUnderItem106`), only unwired from a live walk, which was
        always the named follow-on below, not new scope. **What this build actually adds is narrower
        than first scoped: an early, USER-STATED override for the preservation-age-to-64 window**,
        for a Person the existing router would otherwise leave on the TTR rate until 65 or would
        refuse outright (the O65-overlap Person). The new entry's date is honoured only when it falls
        before that Person's 65th birthday — a stated day AFTER it is still refused, unchanged, per
        R13's own second contradiction (already correctly implemented, not this build's concern).
      - Wiring order once re-ruled: land the dated entry against P3-8's
      already-researched conversion machinery FIRST; only then does turning P3-42 on for a TTR
      household have somewhere real to land instead of the generic refusal.
    - **Microtasks, P3-22h's 3-step shape:** (1) one optional Setting, nothing reads it, zero risk.
      (2) at the year-end true-up, split each `SuperInterest`'s year's growth into
      `yield = rate × balance` (taxed via `fundEarningsTax`, keyed on the interest's own phase) and
      the untaxed remainder; net the tax out of the balance as a real cost, report it as its own
      line. (3) fold `frankingInSuper` in beside it (already built, already correct) — completes
      P6-8d and re-opens P6-8 for its own gate.
    - 🟢 **RE-GATED 2026-09-22 (LIZ), GO-WITH-CHANGE to step (2), after P3-8's conversion limb wired
      live and phase can now flip MID-financial-year — claims verified independently.**
      - **A mid-year conversion is not a corner case to defer — it is already solved by machinery
        this build was always going to call.** Confirmed directly in `src/core/superPhase.ts`:
        `fundEarningsTax` does not take a flat phase for the year — it REQUIRES a `phaseHeldFor:
        PhaseYearFraction`, and its `CHARGED` table already resolves a part-year Retirement Phase
        interest to the ACCUMULATION rate on the WHOLE year's earnings — a provable ceiling, not an
        apportionment. This is P3-25's ruling (R10), built 2026-09-10, sitting inside the exact
        function step (2) already calls. **Nothing new to build for the mid-year case.**
      - **Confirmed the conservative direction with the worked example, figures matched exactly
        against `docs/research/p3-25-ecpi-apportionment.md`:** statutory-correct $7,569.86; the
        bound this table produces, $11,250.00 (**overstates** tax by $3,680.14 — the safe
        direction); the naive year-end-phase read, $4,500.00 (**understates** by $3,069.86 — the
        wrong direction, and the one a careless implementation would reach for).
      - **Step (2) corrected**, the other steps unchanged: resolve `phaseHeldFor` off the SAME
        `conversionDay[personIndex][slot]` map `effectivePhaseFor` already closes over
        (`projection.ts:4358` on) — `phaseHeldForTheWholeYear(fy)` if no conversion day is recorded
        for that interest or it falls outside the FY being assessed, else `phaseHeldFrom(fy,
        conversionDay)`. No new plumbing: the map already exists and is already populated for the
        whole walk.
      - **Zero-churn reconfirmed, unaffected by the phase-flip wiring** — `nominalReturn`'s growth
        path reads fees only, never `.phase`, and none of the phase-flip call sites touch it.
        `fundEarningsTax(` still has exactly one hit outside tests, still not a live caller.
      - No open decision — the mid-year case is settled by existing, already-ruled precedent
        (charge the provable ceiling, never the floor), not a fresh judgement call.
    - 🟢 **IMPLEMENTED 2026-09-22 (three microtasks, three commits) — findings, not a restatement of
      the gate above.**
      - **Step 1** (`553f222`) — `Settings.superIncomeYieldRate`, `investmentPayoutRate`'s shape
        file-for-file: optional, undefaulted, plan-wide. Round-trips through `parsePlan.ts` and the
        settings panel; `project()` read it nowhere, asserted as behaviour (a digest that did not
        move), not merely claimed.
      - **Step 2** (`519bd54`) — `fundEarningsTax` wired live. `phaseHeldFor` is resolved off the
        SAME `conversionDay` map `effectivePhaseFor` closes over, exactly as the re-gate note
        required — no second resolver. **The mid-year conversion fixture the re-gate note asked
        for exists**: `test/core-super-earnings-tax.test.mjs` §4, a TTR interest converting via
        `TRIS_EARLY_CONVERSION` mid-FY2026-27, hand-derives BOTH the correct R10 bound ($1,800.00,
        the Accumulation rate on the whole year's $12,000.00 income share) and the naive,
        WRONG year-end-phase read the bound replaces ($0.00, no line at all) — and pins the
        correct one. **A genuine architectural gap surfaced and was worked around rather than
        fixed**: `fundEarningsTax` takes `superPhase.ts`'s BRANDED `SuperInterest` (built through
        `accumulationInterest`/`retirementPhaseInterest`, which gate on a real
        `ConditionOfRelease`), while the live walk's OWN `SuperInterest` (`household.ts`) is an
        unvalidated, purely-declarative `{ phase, balance }` with no such gate — the two types
        share a name and nothing else. For the Accumulation row this is harmless (`accumulationInterest`
        never reads `release.met`, so a minimal, always-succeeding release is supplied). For the
        Retirement row it is NOT harmless: a genuinely converted or declared-ABP interest whose
        Person this walk cannot establish a real Condition of Release for (an early conversion
        without a matching `RETIRE` entry, for instance) now reaches `PreservedBenefitError` for
        the FIRST time from a live walk, on data this build's own `household.ts` has never
        validated before. This is a correct, newly-reachable refusal, not a defect — but it is a
        new failure surface this item's build introduced, and it is recorded here rather than
        discovered later by a user's plan file.
      - **Step 3** (`a0fc0c9`) — `Settings.superIncomeYieldFrankedShare` and `frankingInSuper`
        wired. **`grep -n frankingInSuper src/core/projection.ts` now returns real call sites** —
        P6-8d's own literal checkpoint. Composition is REPLACEMENT, not addition: a franked share
        makes `frankingInSuper` the SOLE tax-and-credit computation for an interest (its own
        internal `fundEarningsTax` call taxes the grossed-up income share), never run alongside
        step 2's plain call on the same dollars — enforced STRUCTURALLY, not merely by test: the
        mutation that removes the branch's exclusivity (letting both paths fall through) is a
        **`tsc` compile error**, not a wrong number, because `Settings.superIncomeYieldFrankedShare`
        narrows from `number | undefined` only inside the branch that returns. A second mutation —
        charging the GROSS tax while still refunding the credit — is caught at runtime by
        `test/core-super-earnings-tax.test.mjs` §5's Accumulation, lightly-franked fixture (the one
        case where `frankingInSuper`'s "exactly one of `taxPayableAfterOffset`/`refund` is
        non-nil" invariant does not make the mutation vacuous).
      - ⚠️ **THE SCOPE DECISION, STATED RATHER THAN TAKEN SILENTLY.** P6-8d's own gate text
        describes the super side as needing "a payout-rate Setting, a payout mechanic,
        `frankingInSuper` folded into the true-up" — mirroring `investmentPayoutRate` /
        `investmentPayoutFrankedShare`'s OWN two-figure shape for a SEPARATE income stream (the
        fund's underlying Australian equity distributions). This build did not invent a second,
        independent income stream: `superIncomeYieldFrankedShare` is a share OF
        `superIncomeYieldRate`'s already-built income figure, not a share of a new distribution
        Setting. This is not a lesser version of the intended shape — it is the SAME modelling
        convention the individual side already uses (`investmentPayoutFrankedShare` is a share OF
        `investmentPayoutRate`'s figure too, not of an independent one) — but it is a real,
        considered narrowing of what "the fund's underlying holdings distribute" could mean, and a
        future author modelling the fund's OWN separate Australian-equity allocation (as opposed
        to treating its whole income share as partly franked) would be extending this, not merely
        reading it.
      - **P6-8 (the sacrifice-vs-invest comparison) — genuinely unblocked on P6-8d's own stated
        ground, not merely on the literal grep.** P6-8d's gate text: *"a credit modelled on one
        side only shifts the difference... Refundability is equal on both sides... the whole
        advantage is the rate differential."* Both are now true of a live walk: `frankingInSuper`
        composes correctly with the earnings tax (proven above), and the SAME modelling shape
        (a share of an already-computed income figure, converted to a credit) sits on both sides
        of the comparison. P6-8 itself — the guided template/UI — is NOT built here, per this
        item's own instruction, and needs its own gate.
      - **No fixture the demo walk or any existing test relies on moved** — `superIncomeYieldRate`
        and `superIncomeYieldFrankedShare` are both absent from every plan file in the suite except
        the new test file's own fixtures, confirmed by the full suite unchanged in count and result
        except for new tests, run before this item and after each of the three commits.

- [x] **P3-25** **Mid-year ECPI apportionment — ✅ 2026-09-10** (`6647121`, `f8750a2`). `docs/research/p3-25-ecpi-apportionment.md`, register **§3.11**, ruling **R10**. **O60's premise was false** — s 295-390 had been retrieved by the P1-11 franking pass on 2026-09-04; "never retrieved by any pass" was an unchecked negative (**O70**). **There is no apportionment**: each dollar is traced (s 295-385) or one proportion covers the year (s 295-390); s 295-410's days formula is for RSAs only. **The certificate is on the proportionate method**, not the segregated one. Superseded detail below is left as the record of what was believed:
  - ~~Retrieve ITAA 1997 s 295-390 and settle mid-year ECPI apportionment (O60)~~ — the
  **binding blocker** on P3-8's conversion limb, and it will block P4 too. Never retrieved by any
  pass. Fetching s 295-390 (with 295-395/400) is necessary but **not sufficient**: the
  `MidYearPhaseChangeError` refusal does not lift until a register row exists for the
  choice-of-method and apportionment rule. s 295-385(3)(b) shows the segregated method needs an
  actuary's certificate, so the choice is not free.


## Phase 4 — Projection engine

- [ ] **P4-1** `project(settings, household, entries) → Month[]` — pure, side-effect free, no DOM.
  ⚠️ **Reconciled 2026-09-23: the engine is BUILT and has driven the page since 2026-09-18.** Every
  chunk is ticked below, 5b included, although the chunk list in the next sentence stops at 5a.
  **The box stays open for one reason only: P4-1b part (A), which awaits a user ruling** (part (B)
  shipped at `1cc1376`). Tick this the day P4-1b closes.
  Signature corrected 2026-09-16: the horizon is an AGE and needs a date of birth, and the Age
  Pension means test is a Household assessment. ADR-0002's consequence line carries the dated
  amendment; chunks 0, 1, 2, 2b, 2c (P4-1c's forward indexation), 3 (tax), 4 (the Income
  Waterfall, the spending target and the balances) and 5a (balances that MOVE — growth only) are
  built
  - [x] **P4-1a** `project()` **never reads the clock**. "Today" is `settings.asAtDate`, carried
    in the plan file. A `Date.now()` anywhere under `project()` makes ADR-0002's promise that a
    comparison run months ago still reproduces simply false — the run would drift with the
    calendar. Assert it: a test that runs the demo couple under two fake system clocks and
    requires byte-identical `Month[]` — ✅ 2026-09-16 (P4-1 chunks 1 and 2). **Ticked on the
    behavioural test, not on the source canary.** `test/core-projection.test.mjs` runs the demo
    couple in two child processes under a preloaded clock override five years apart and requires
    byte-identical `Month[]`, which is exactly what this item asks for, and it carries a vacuity
    control that plants a clock read and requires the two outputs to DIFFER — so a harness whose
    override silently failed goes red instead of passing for the wrong reason. The canary over the
    module's source text is a second, weaker assertion and is not what discharges this: a read
    written `globalThis['Da'+'te'].now()` is invisible to it and caught by the two-clock test
    anyway. **Chunk 2 re-earned the tick rather than inheriting it.** Wiring in
    `agePensionEntitlement` put `data/assumptions/agePension.ts` on the call path, and `dayBefore`
    there calls `new Date(...)`; it is a constructor over a supplied string, and
    `test/core-projection-age-pension.test.mjs` proves it behaviourally with a second two-clock run
    over a fixture that actually produces an entitlement — an empty walk would agree under any two
    clocks. **Chunk 3 re-earned it a third time, on 2026-09-17.** Wiring the tax assembly put
    `core/incomeTax.ts`, `core/incomeBases.ts` and `data/assumptions/tax.ts` on the call path;
    `test/core-projection-tax.test.mjs` runs the two-clock harness over the working-couple fixture
    and asserts that the output carries the hand-worked tax figures for **both** FY2026-27 and
    FY2027-28, so an empty walk — or one whose only line is an Age Pension — cannot pass it
    vacuously. **Measured, not assumed:** planting `new Date().getFullYear()` into the monthly tax
    figure makes that test go red, which is the vacuity control. What is NOT covered, and is stated
    rather than implied: **chunk 4 adds the Waterfall to that call path and must re-run this test
    over a fixture that exercises what it added**
    — **done 2026-09-17, and with it P4-1a is FULLY EARNED for `project()` as it now stands.**
    `test/core-projection-waterfall.test.mjs` runs the same two-clock harness over the shortfall
    fixture and asserts four figures are in the compared bytes: the `$5,000.01` spending line, the
    hand-worked `$27,870.06` `Unfunded shortfall`, an `openingBalance` of `$1,893.28` and a
    `closingBalance` of `$4,067.82`. An empty walk, a line-less walk and a walk whose balances are
    all zero would every one of them agree under any two clocks, and none of them can pass this.
    Chunk 4 introduced no new module on the call path — the Waterfall is arithmetic in
    `projection.ts` itself — so there is no fifth import to re-earn the tick for; what it did
    introduce is the first output in which a BALANCE could drift, and that is what the new fixture
    puts in the bytes. **The claim is scoped to today's `project()`:** the tick is re-earned per
    call path, so chunk 5's super ledger owes its own run, exactly as chunks 2 and 3 did.
  - [x] **P4-1c** **The Age Pension is computable for seven months of a forty-eight-year walk —
    ✅ DISCHARGED 2026-09-16 by `a3daffc`, 579 of 579 months now compute.** `Settings.economicSeries`
    gained its first reader in the codebase; MTAWE arrives as a **level** in annualised cents,
    because 41.76% is a percentage *of* a dollar amount — and that is what lets a stated series
    **run out and say so**, which the four flat annual knobs structurally cannot. A short series
    raises `MissingPensionIndexationError` (§4.7.1) and `project()` deliberately does not catch it:
    supplying a series is a claim that it covers the walk. The before and after are both asserted in
    a live test rather than claimed here. T23 is held apart end to end — basic at max(CPI,PBLCI)
    floored at 41.76% MTAWE, supplement at CPI only, Energy Supplement not in the rate set at all,
    so it cannot be indexed by construction. Three threshold gaps the register never specified are
    **O74**, and **O75** records honestly that the Work Bonus is now a nominal freeze — conservative
    in direction, and exactly the thing this item refused to do to the rates. Original text kept
    below as the record of what was found.
    Found 2026-09-16 wiring chunk 2. `agePensionEntitlement` needs no missing operand — but it
    needs a **parameter period**, and `AGE_PENSION_PERIODS` is assembled from the register's
    published window, which covers **2026-03-20 → 2027-03-19** and nothing else. One day past it
    `agePensionPeriodAt` throws, correctly: those rates have not been determined and this project
    does not extrapolate a determined figure. So `project()` computes the pension through 2027-03
    and emits **no line at all** from 2027-04 — absent, never a zero, because a computed zero and
    an uncomputed entitlement are different facts. The walk, the assets split and the refusals are
    unaffected. **This blocks every P4 answer that involves the Age Pension**, including P4-5's
    Shortfall Age and Pension-Only Age, and it is the largest single source of error in the engine
    as it stands. The fix is forward indexation: `Settings.economicSeries` carries the MTAWE, CPI
    and PBLCI knobs for exactly this (ADR-0001 — the basic rate follows wages, the free areas and
    deeming thresholds follow CPI), and **nothing in `src/` reads them yet**. It cannot be done
    from `projection.ts`: `agePensionEntitlement` resolves its own period internally and has no
    injection point, so this is a change to `core/agePension.ts` and
    `data/assumptions/agePension.ts`, not to the walk. Do **not** discharge it by carrying the last
    determined rate set forward — that is a nominal freeze over four decades, and it is a forecast
    wearing an assumption's provenance
  - [x] **P4-1e** **Carrying the last published parameters forward — ✅ SHIPPED 2026-09-21, the
    switch thrown the moment O30 closed.** The original heading, kept because the gate is half the
    story: *"the ruling is taken, the argument is evidenced, the machinery is built, and the switch
    is BLOCKED ON O30"*. O30 closed the same day (P3-1f — the Medicare levy is assessed per
    taxpayer, so the mixed-SAPTO couple is no longer refused), and this landed in the commit after
    it, deliberately separated so that each commit's fixture moves measure one cause.
    - **What the switch is:** one branch in `agePensionPeriodAt` —
      `series === undefined && date > LAST_PUBLISHED_PARAMETER_DAY` returns
      `standingAgePensionPeriod(date)`. Everything else in this entry was already built.
    - **And four things had to land with it, because a carried figure that cannot be told from a
      legislated one is the whole risk.** `AgePensionEntitlement.standingFrom` (the period's mark,
      passed through); a **fifth `MonthNote` member**, `StandingParametersNote`, carrying the day
      and `STANDING_PARAMETERS_DIRECTION` itself rather than a second copy of it; `monthToRows`'s
      branch for it, with BOTH money columns blank because the money is already a LINE; and a
      **caveat** on the Age Pension line's provenance naming both record keys, the day they were
      determined for and the date they were applied to. A caveat and not a confidence downgrade:
      the records are the published ones and their confidence is unchanged — what is uncertain is
      their APPLICABILITY, which is a different axis.
    - **`agePensionParametersCover` lost its `series` parameter, and that was a decision.** With no
      upper bound the parameter decided nothing, and an unread one would have been worse than a
      dead one: a caller passing a SHORT series would read `true` as an assurance their series
      reached the date, which it never was. A short series still raises
      `MissingPensionIndexationError` out of the walk, uncaught. `LAST_AGE_PENSION_MONTH` was
      renamed `LAST_PUBLISHED_AGE_PENSION_MONTH` for the same reason — under the old name it meant
      *the last month for which any figure can be computed*, and that sentence became false.
    - ✅ **THE PENSION-ONLY AGE MARKER IS COMPUTABLE, AND THIS IS ITS FIRST APPEARANCE FROM A PLAN
      THAT STATES NO SERIES** (P7-5's open half). On the committed demo the answer is a computed
      **'never'** — the walk funds every month and never lives on the pension alone — so the chart
      carries `PENSION_ONLY_NEVER_NOTE` where it used to carry `PENSION_ONLY_UNCOMPUTABLE_NOTE`. On
      the same plan with spending raised to $120,000 the marker is **DRAWN at 2056-05, Dana 87 and
      Ash 96**, one month after the Shortfall Age. `PENSION_ONLY_UNCOMPUTABLE_NOTE` is **narrowed,
      not deleted**: it now fires only for a walk that BEGINS below the first determined parameters,
      and its sentence was rewritten because the old one ("the rates run out mid-forecast") became
      false. The gate stays a predicate and never a `catch`.
    - **THE CONTROL, and it is the one `5659308` used, re-run on the wired build.** A single-Person
      walk, 200 months, all 200 paid, **$507,667.99** of pension from the standing table against the
      same walk driven by a **unit indexation series** — every movement exactly 1.000, the MTAWE
      benchmark set where it cannot bind, so §4.7's mechanism computes what the table carries by a
      different code path. They agree to **$13.54 over 200 months**, largest monthly divergence
      **9 cents**, the mechanism paying the extra. That is O10's single-to-couple rounding residual
      and nothing else.
    - **THE FIXTURE MOVES: 39 tests across 17 files, and every one of them runs the same way — the
      Household has an income it did not have, so it spends less capital.** The largest: the
      byte-digest fixture in `core-non-super-parcels.test.mjs` goes from drawing Ken's released
      super in 112 months and ending at NIL to drawing it in 51 and ending at **$751,202.64**; the
      demo Shortfall Age marker moves **2045-08 → 2056-04**, ten years and eight months; the demo
      walk's total wealth falls in **12 months of 501 where it fell in 444**. Three that do NOT
      move are the controls: every super-growth series in `core-projection-growth.test.mjs` is
      identical to the cent, the month-0 asset split is unmoved, and the stripped byte digests moved
      only where a FIGURE moved.
    - ⚠️ **AND THE DEMO COUPLE IS PAID IN ONLY 99 OF 501 MONTHS**, which is worth knowing before
      reading any of the above as "the pension pays for everything": they are means-tested out of it
      for most of the walk, and what the standing table changed is that the months they DO qualify
      for can be computed at all.
    — the original entry follows, unchanged:
    **Carrying the last published parameters forward — the ruling is taken, the
    argument is evidenced, the machinery is built, and the switch is BLOCKED ON O30** — 2026-09-21.
    The user's ruling: *"as with other items, assume current numbers continue whilst awaiting future
    pertinent legislation"*, applied to the Age Pension. It **overturns the last sentence of P4-1c
    above** — *"do not discharge it by carrying the last determined rate set forward"* — which is
    kept, struck by this entry rather than deleted, because half of it was always right and the
    reversal needs something to point at. What was right: a nominal freeze over four decades
    understates the payment by the whole of wage growth. What changed: a carried figure now **says
    it was carried**, so it no longer wears an assumption's provenance.
    - **The defect it exists to close.** With no `Settings.economicSeries.agePension` — which is
      every realistic plan, since the field is deliberately not editable from the page — the walk
      emits **no Age Pension line at all** for the months past 19 Mar 2027. On the demo plan that is
      572 of 579 months: a retired household shown with no pension across the whole of its
      retirement.
    - ⚠️ **AND WIRING IT MAKES `project()` THROW ON THE DEMO PLAN, which is why the switch is not
      thrown.** Built and measured end to end on 2026-09-21: `agePensionPeriodAt` returning the
      standing period past the window, the walk emitting the line, a fifth `MonthNote` saying the
      figures were carried, and the caveat on the line's provenance. It works — and the demo couple
      then refuses when the walk settles **FY2030-31**. Ash is entitled, so Ash is *qualified* under
      s 160AAAA(2)(b) and receives SAPTO while Dana (born 1968) does not, so the couple holds two
      Medicare family income thresholds ($47,238 against $61,623) against a family income under
      1.25 × the larger, and `MixedSaptoFamilyThresholdError` refuses because the Act does not say
      which governs (research U2, **register O30**, unresolved and live). **72 of the 84 failures on
      the wired build were that one refusal**; the rest were fixture moves. ⚠️ **This is the
      IDENTICAL wall measured on 2026-09-19** for a plan that STATES a forward series (P7-5 below) —
      the ruling reaches it by the other road, and reaching it twice from two directions is what
      makes it structural rather than a property of the demo fixture. Any couple with one member
      over Age Pension age, the other not, and a family income under about $77,000 meets it, which
      is a large share of the households this tool is for.
    - **So the O30 ruling is the gate, and it is not the Age Pension's to take.** Narrowing the
      refusal means choosing between two readings of the Medicare Levy Act; catching it in the walk
      and emitting no tax line would run in the FLATTERING direction. **The one line that wires this
      is named in `agePensionPeriodAt`'s doc**, and a test fails the day anybody writes it without
      settling O30 first.
    - ✅ **What DID land, all of it green.** In `data/assumptions/agePension.ts`:
      `standingAgePensionPeriod` (the last published sets, carried verbatim, marked
      `AgePensionPeriod.standingFrom` — the same distance-not-confidence separation `tax.ts` makes
      with `standingLawFrom`), `STANDING_PARAMETERS_DIRECTION` (the argument), and
      `PENSION_RATE_HISTORY` (its evidence). Five mutations, five separate failures.
    - **THE ARGUMENT, which runs the OPPOSITE way to the tax standing table and is the reason this
      needed writing down.** A standing tax table OVER-states tax; a standing pension table
      UNDER-states the pension. Both leave the household with less money than the law would.
      **Limb 1 — a frozen RATE can only under-state**, on two grounds: *legal*, the CPI factor's base
      is the HIGHEST preceding June or December quarter (§4.7) so the factor cannot be below 1, and
      the MTAWE benchmark is a floor on top of that — nothing in the mechanism can lower a rate;
      *empirical*, `PENSION_RATE_HISTORY` holds **seventeen consecutive published movements**,
      20 Sep 2015 → 20 Mar 2024, of which **sixteen rose and one stood still and none fell**.
      **Limb 2 — frozen THRESHOLDS point the same way**: free areas and deeming thresholds index up
      by CPI, so freezing them holds the cut-off below where the law would put it while the
      household's assets inflate against it — more assessed, less pension. Lower ceiling, larger
      reduction: a standing Age Pension is **at most** the legislated one. Confirmed for the income
      test, the assets test and deeming alike; the deeming RATES are not in the argument at all,
      being a Setting past 20 Sep 2026 (T30, O2).
    - ⚠️ **THE BEST ROW IN THE EVIDENCE IS THE FLAT ONE.** At **20 September 2020** the rate did not
      move — $860.60 before and after — because the CPI had gone backwards and the indexation floors
      the factor at 1. It is why the claim is worded *never fallen* rather than *always risen*, and
      it is the legal limb showing up in the data. A history with no flat row would have meant the
      evidence had been smoothed.
    - **Where the evidence came from, and its cross-checks.** DVA CLIK's per-indexation-date rate
      tables (`secondary-only`: they are the service pension's maximum basic rate, the same pension
      MBR, but one remove from the DSS publication §4.2 quotes). Each page carries an *old rate*
      beside its *new rate* and **every page's old rate reproduces the previous page's new rate**,
      so the chain closes through all seventeen movements; the Energy Supplement row of the same
      tables reads **$14.10 / $10.60** throughout, reproducing `ENERGY_SUPPLEMENT` to the cent and
      T23's *never indexed* with it. Separately, the live Services Australia Age Pension page
      reproduces `PAYMENT_RATES['2026-09-20']` in all three columns — the right-column cross-check.
    - **THE CONTROL, on a walk O30 does not touch.** A single-Person fixture, wired build: 388 of
      395 months gained a pension, $825,489.77 in total, no shortfall month. Then the same walk with
      a **unit indexation series** — every movement exactly 1.000, the MTAWE benchmark set far below
      the rate so it cannot bind — which makes §4.7's mechanism compute what the standing table
      carries, by a different code path. The two walks agree to **$2.33 across 395 months** (total
      pension $825,489.77 against $825,492.10, largest monthly divergence **9 cents**), which is the
      documented 0.6633 single-to-couple rounding residual (O10) and nothing else. The standing
      table IS the mechanism run at its floor, and that is a two-route check rather than a restated
      figure.
  - [x] **P4-1d** **An entry dated before the forecast starts is read by its TYPE, not refused.**
    Chunk 2b, on the user's ruling of 2026-09-17 — ✅ 2026-09-17. Chunk 1 REFUSED every enabled
    entry dated outside the walk, deliberately, because nothing in `plan.ts` could tell a *level*
    from an *event* and inventing the distinction in the walk would have been a ruling made by
    accident. The ruling: **classify each entry TYPE once, by what the type means** — not a
    per-entry flag, and not a question asked in the UI. A **level** is a standing state that is
    still true (a 2020 `SPEND_CHANGE` is still this household's spending level, so it applies from
    month 0); an **event** already happened and was already paid (a 2020 `ONE_OFF_EXPENSE` is money
    already gone, and the stated balances already reflect it, so replaying it in month 0 would
    charge the household twice). Both apply normally when dated inside the walk; the classification
    is consulted for the before-the-walk case only.
    - **The discriminator is not "did it happen on a date"** — everything in the table does. It is
      whether the effect PERSISTS or COMPLETES. That is what settles the four the brief flagged:
      `RETIRE`, `VACATE_HOME`, `WORK_PATTERN_CHANGE` and `DEATH` are all levels, and `DEATH` is the
      case that proves the rule — read as an event it would bring the person back to life for the
      whole projection. **Eleven levels**: `RETIRE`, `WORK_PATTERN_CHANGE`, `SUPER_CONTRIBUTION`,
      `MORTGAGE_REFINANCE`, `RETURN_CHANGE`, `SPEND_CHANGE`, `VACATE_HOME`, `HEAS_DRAW`, `DEATH`,
      `ILLNESS_SEPARATION`, `CARE_EVENT`. **Eight events**: `LUMP_SUM_FROM_SUPER`,
      `MORTGAGE_TARGET`, `NON_SUPER_INVESTMENT`, `ONE_OFF_EXPENSE`, `CONTRIBUTION_SPLIT`,
      `SPOUSE_CONTRIBUTION`, `DOWNSIZE`, `DOWNSIZER_CONTRIBUTION`. Each carries its one-line reason
      in `src/core/plan.ts`.
    - **An unclassified type is a BUILD error, not a test failure.** `ENTRY_KIND` is
      `as const satisfies Record<EntryType, EntryKind>`, so a twentieth name in `ENTRY_TYPES` fails
      `tsc` (TS1360 at the map, TS7053 at `entryKindOf`) before any test runs — measured by adding
      one. There is no `default:` and no `?? 'event'` anywhere on the path, and a canary asserts
      both, because deleting the `satisfies` clause failed zero tests: with nineteen keys present it
      is a tripwire for a day that has not come, and a tripwire cannot be tested by walking round it.
    - **Superseded levels do not double-apply.** Three `SPEND_CHANGE`s predating the walk are ONE
      standing level at month 0, keyed by `type` AND `owner` — the owner because two people retiring
      is two standing facts, not one superseding the other. Latest date wins; a tie is broken by the
      Scenario's own order, last stated winning, which is the only reading an append-only journal
      supports. Tested with THREE, ordered so input, date and alphabetical order each pick a
      different one, each carrying a different `annualSpend` — so a wrong pick is a wrong NUMBER.
    - **Dated AFTER the horizon is still REFUSED**, and the asymmetry is the reason. The before-case
      had a meaning to recover and this one has none: a level dated past the last month has no month
      to stand from and an event has no month to occur in, so no reading makes the stated fact affect
      the projection. That makes it likelier to be a mistyped year than an intention, and dropping it
      silently would hide the typo where the user cannot see it. `enabled: false` is already the way
      to say "ignore this".
    - **Two consequences carried forward, stated rather than buried.** (i) `VACATE_HOME` as a level
      applied at month 0 would RESTART the 2-year Age Pension exemption clock that has partly or
      wholly run — **P3-15a must read that clock's start from the entry's own `date`, never from the
      month the level first applies in**. (ii) `SUPER_CONTRIBUTION` and `HEAS_DRAW` each cover a
      standing arrangement AND a one-off amount under one name (concept.md gives the first a
      *recurring flag*); both are classified `level` and both are likely two types wearing one name.
      Nothing can be built wrong meanwhile — their params are `UnspecifiedParams`, so no such entry
      is constructible — but whoever specifies those params owes this a second look
  - [x] **P4-1 chunk 3** **The taxable-income assembly — and the discharge of register O72.**
    ✅ 2026-09-17. `project()` now computes a taxable income **per Person per financial year** from
    an assessable income and a deduction set, feeds it to `householdIncomeTax`, and reports the
    result as `Salary, <name>` and `Income tax, <name>` `MonthLine`s. `taxableIncomeFromSalary`
    **reuses `standardDeductionAmountFor`** — no second $1,000, pinned by a source canary — and the
    year gate is tested across **both** FY2026-27 (the Div 25 limb) and FY2027-28 (the WATO-base
    limb), on a fixture spanning 2027-06 → 2027-07, because a single-year fixture cannot see it.
    **O72 CLOSED; no second O-item opened.**
    - **WHERE SALARY COMES FROM — the finding, verified rather than assumed.**
      `Person.employmentIncomePerFortnight` is the **only** income field on the model. It was added
      for the Work Bonus (T29) and its own doc says *"Employment and active self-employment income
      per fortnight"*, which is the s 25-130(4) / s 61-155(2) labour base. It is annualised at
      **26** — `FORTNIGHTS_PER_YEAR`, the constant chunk 2 already states once — and reported as a
      twelfth. **NO ENTRY TYPE SUPPLIES OR CHANGES A SALARY AMOUNT.** `WORK_PATTERN_CHANGE` carries
      `daysPerWeek` and nothing else; there is no day rate and no full-time week anywhere in the
      model, so `daysPerWeek: 3` cannot become a figure without inventing a five-day baseline —
      which would be a ruling made by accident. It is **not applied**, and the direction is stated:
      for a Person who cut their days this **over-states** salary, which **flatters** the household.
      Fixing it needs a field a caller states, and `plan.ts` was not chunk 3's to widen.
    - **The two cases that need no invented rate ARE applied, because both drive salary to nil.**
      `RETIRE` (whose `RetireParams` doc is explicit — *"the date is the fact. Gainful employment
      ceases on it"*), and `WORK_PATTERN_CHANGE` with `daysPerWeek === 0`. The first is monotone;
      the second is **reversible**, because a later positive-days entry is a level that supersedes
      it — which is what makes it a pattern and not a retirement. Ignoring `RETIRE` would pay a
      retired Person a salary for the remaining forty years of the walk.
    - **ANNUAL VERSUS MONTHLY — decided, not defaulted.** Tax is an annual assessment; the tick is
      monthly; `Month` carries no financial year. The walk **accrues monthly on the month's own
      state and settles nothing**: each month annualises the salary in force in THAT month, computes
      a full year's tax under the rules of the financial year that month falls in, and reports a
      twelfth. The alternative — one annual figure per financial year, sliced — was rejected because
      the walk begins at `asAtDate`, which is mid-year for every real plan, so the first financial
      year is a **partial** one whose annual figure nothing in the model defines.
    - ⚠️ **The residual, and which way it runs — THIS BULLET WAS FALSE AND WAS CORRECTED 2026-09-18
      BY P4-2.** It read: *"The rate scale is **convex**, so by Jensen `(1/12)·ΣT(yₘ) ≥
      T((1/12)·Σyₘ)`: taxing each month as though its rate ran all year **OVER-states tax and
      UNDER-states the household**, which is the required direction."* **The scale is not convex.**
      LITO's second-stage taper withdraws 1.5c in the dollar and **ENDS at a taxable income of
      $66,667**, so the effective marginal rate FALLS there and the scale is locally **concave**; the
      Medicare levy's family shade-in flattens above the family threshold and is concave there too.
      A within-year movement across either point **UNDER-charges**: half a year at $45,000 and half
      at $78,000 is **$15.00 short** of the tax on the $61,500 year it averages to ($80 of bracket
      convexity against $95 of LITO concavity), and a `project()` walk reaches the family-levy
      concavity for **$633.30** on the fixture in `test/core-projection-true-up.test.mjs`. What
      remains true: the sum of twelve monthly-annualised figures is not the tax on the year's actual
      income whenever the income moves within the year; the s 25-130 deduction runs the
      over-charging way in every case (a Person working half the year keeps half of it); the residual
      is **nil** for a Person whose salary does not move within a financial year, which is the modal
      case; and **since P4-2 the residual is SETTLED at year end rather than merely stated.**
    - **`Month` does NOT need a financial year, and none was added.** The year is
      `financialYearContaining(firstDayOf(month))` — string arithmetic on data the `Month` already
      carries, and a field would be a second spelling of it. **What genuinely needs P4-2 is the
      SETTLEMENT**: reconciling twelve accruals against one annual assessment needs somewhere to
      report an annual figure, and `Month` has no slot for one. **The boundary proposed: chunk 3
      owns the monthly accrual and its stated residual; P4-2 owns the financial year as a reported
      boundary and the year-end true-up, and P4-2 is what may widen `plan.ts`.** ✅ **Built
      2026-09-18 — and `plan.ts` was NOT widened.** The annual figure is reported as a `MonthLine`
      whose description names the year it settles (`TAX_TRUE_UP_LINE`), so the permission turned out
      not to be needed and `Month` still has no financial-year field.
    - **THE SECOND PARAMETER WINDOW, and it is much shorter than the Age Pension's.** `TAX.years`
      carries **FY2026-27 and FY2027-28 and nothing else**, and `taxYear` refuses a third year by
      design (register §2.1.1). So a forty-eight year walk could compute income tax for **at most
      twenty-four months of it**, and past that emitted **no tax line at all** — absent, never a
      zero. ✅ **RESOLVED 2026-09-17 by P2-10b, and the resolution was a reading rather than a
      figure.** Sch 7 Pt I cl 1(b)'s third table covers *"the 2027-28 year of income or a later
      year of income"*, so `taxYear` answers for the whole horizon and all 24 of these months
      became all 579. The window is still **closed below** — FY2025-26 and earlier are refused, and
      there the salary line is still emitted alone, because the salary is a fact this model holds
      and the tax on it is a fact about a year nobody determined.
    - **THE ONE RESIDUAL THAT FLATTERS THE HOUSEHOLD, recorded rather than buried.** Taxable income
      is built from **salary alone**. The Age Pension is assessable income (register §2.3 — inside
      `taxableIncome`, never an add-back) and it is **not** in it, so a pensioner's taxable income
      and tax are both **under-stated**. SAPTO and the seniors Medicare thresholds absorb most of it
      for a Household on a full pension, and nothing in the build relies on that. It is scope: the
      other assessable amounts — super pension payments, deemed and actual investment income,
      franked distributions — arrive with the chunks that compute them, and each goes into
      `taxableIncomeFromSalary`'s assessable limb and nowhere else.
    - **Two judgment calls the register did not settle.** (i) **`qualifiedForAgePension`** —
      s 160AAAA(2)(b)'s *"qualified for", not "receiving"* — is answered from the walk's **own**
      entitlement (`householdRatePerFortnight > 0` and the Person in `eligiblePersons`), never from
      a second determination, so it moves with the Age Pension line rather than against it. It is
      conservative at one boundary: a Person assessed at a **nil** entitlement is "qualified" on the
      Act's words and is denied SAPTO here. (ii) **An entry owned by `household`** reaches every
      Person. `plan.ts` deliberately does not enforce concept.md's owner column, so a
      `household`-owned `RETIRE` is constructible today; the reading taken stops a salary rather
      than continuing one, and it was **found as a surviving mutation** and is now tested.
    - **Three survivors found and killed, all of them the flattering-fixture pattern.** (1) the
      `owner === 'household'` limb failed **zero** tests — every other fixture owned its entries
      `personA`/`personB`; (2) flipping the income-tax line from `outflow` to `inflow` failed
      **zero** tests, because every assertion filtered on description and read only the amount —
      a tax line marked `inflow` is money paid TO the household; (3) hard-coding
      `qualifiedForAgePension: false` failed **one** test only after a working-pensioner fixture was
      added, because the working couple are 47 and the flag is false for them however it is
      computed. Each now has a test that fails on a **dollar figure**.
  - [x] **P4-1 chunk 4** **The Income Waterfall, the spending target, and the balances** — ✅
    2026-09-17. `drawWaterfall`, `monthlySpendFromAnnual`, `unfundedMiddleLimbs` and `SHORTFALL_LINE`
    in `src/core/projection.ts`; `test/core-projection-waterfall.test.mjs` (14 tests). The build
    goes 913 → 927 tests, all green from a clean `dist/`. **`plan.ts` and `household.ts` are
    untouched.** Details of the four limbs and the offset finding are under **P4-3/P4-3a/P4-3b**;
    the shortfall condition is under **P4-5**. What belongs here:
    - **THE TWELFTHS DECISION `SpendChangeParams.annualSpend` ASKS FOR BY NAME IS TAKEN.** Its doc:
      *"whoever first divides this owes a decision on the remainder … the rounding belongs in one
      place with a test, not at each call site."* The decision is **`Math.ceil`, round UP**, in
      `monthlySpendFromAnnual` and nowhere else. It is deliberately a DIFFERENT rule from
      `monthlyFromAnnual`'s half-away-from-zero, and the difference is the direction: those are
      inflows and a half-cent is a payment convention, this is the **outflow the whole Shortfall Age
      is measured against**, so the residual points AT the household. **Twelve of them do not sum to
      the annual figure and cannot**, so the honest invariant is a bound and is tested as one:
      `0 ≤ 12 × monthlySpendFromAnnual(a) − a ≤ 11` cents, i.e. **up to 11 cents a year MORE than
      stated, never less**. The exact-summing alternative (give the remainder to one nominated
      month) is rejected on the record: the walk begins at `asAtDate`, which is mid-year for every
      real plan, and a `SPEND_CHANGE` can arrive in any month, so **there is no "the twelve months"
      for a remainder to be given to** — a rule needing a year boundary the walk does not have would
      be a rule that silently picked one.
    - **`ONE_OFF_EXPENSE` is charged in its own month, once.** It is an `event` in `ENTRY_KIND`, so
      one dated before the walk was already paid and reaches no month at all, and one dated inside
      it is in exactly one bucket. **One line per entry, not one summed line**: two one-offs in a
      month are two facts `appliedEntryIds` cites, and a merged figure would be unauditable
      against them.
    - **`openingBalance` / `closingBalance` MEAN SOMETHING, and the meaning is assertable.**
      `closingBalance = openingBalance + Σ inflow − Σ outflow`, checked every month of every fixture,
      chained month to month, with `openingBalance[0] = nil`. Making `closingBalance` ignore the
      lines fails 8 tests; breaking the chain fails 7.
    - **A judgment call no spec settled: `SPEND_CHANGE` IGNORES `owner`.** `annualSpend` is *"the
      HOUSEHOLD's total spending per YEAR"*, so there is no per-Person spending level to keep
      separately, and concept.md's table gives the row the owner `household`. `plan.ts` deliberately
      does not enforce that column, so a `personA`-owned one is constructible; the reading taken is
      that it sets the same single level. Summing two would double the target for a user who
      re-stated the household figure against a person — the direction that invents a shortfall.
    - **A second judgment call: the salary limb is the month's NET income.** Income tax is
      subtracted (a dollar withheld cannot buy groceries) and the **Age Pension is folded in rather
      than made a limb**, because concept.md applies it *"wherever assessed"* — a pension payment
      arrives whether or not the target needs it, and a capped limb could decline it. Both are
      re-readings of lines already emitted above, never a second computation.
    - ✅ **THE FLATTERING RESIDUAL THIS CHUNK INHERITED IS CLOSED — P2-10b, 2026-09-17.** It read
      that `TAX.years` carried FY2026-27 and FY2027-28 only, so that from FY2028-29 the Waterfall
      spent the GROSS salary — about **$1,220 a month** of absent tax drag for forty-six of the
      forty-eight years. The chunk-4 assertion that measured the hole was written to *"go red the
      day it is fixed"*; it did, and it was **replaced rather than deleted** by one asserting the
      same $1,220.17 is present in July 2028 and that the step across the boundary is nil.
    - **Two DECLARED SURVIVORS, each with a reachability argument rather than a patch.** (1) the
      `Math.max(0, received)` floor on the salary limb — deleting it fails **zero** tests and always
      will: no Australian rate scale takes more than 100% of the income it applies to, so a negative
      `received` is unreachable from any `Household` this model can express. (2) the
      `closingBalance < 0` refusal — deleting it fails **zero** tests, provably: the shortfall is
      `t − min(t, netIncome + o)`, so the balance is `o + r − t ≥ 0` where `t ≤ r + o` and exactly
      `0` where it is not, with no third case. Both are kept and declared: they exist to fire on the
      day somebody changes the reconciliation, not to catch a case that exists today.
  - [x] **P4-1 chunk 5a** **BALANCES THAT MOVE — growth only** — ✅ 2026-09-17. `monthlyGrowthFactor`,
    `grownForOneMonth`, `PersonBalances` and `withBalances` in `src/core/projection.ts`, a per-month
    balance state threaded through `project()`'s existing loop, and
    `test/core-projection-growth.test.mjs` (11 tests). The build goes 942 → 953 tests, all green
    from a clean `dist/`. **`plan.ts` and `household.ts` are untouched** — `plan.ts` gains one
    sentence of comment on `nominalReturn` saying it finally has a reader, and nothing else.
    - **THE GAP THIS CLOSES.** Nothing in the model had a balance that could fall, rise or change at
      all: `splitAssets` re-read the **static** `Household` every month, so month 0 and month 575
      reported identical assets, and `Settings.nominalReturn` was read **nowhere in `src/`** — a
      clean empty seam. The walk now carries plain mutable locals (per Person: the super interest
      balances and `financialAssets`), exactly as `retired`, `worksNoDays`, `annualSpend` and
      `openingBalance` already are, and synthesises a **month-specific `Household`** from them for
      the means test. **Purity is unchanged**: the accumulator is local to the call, never
      module-level, and `project()` is still asserted pure and two-clock byte-identical.
    - **`splitAssets` IS REUSED VERBATIM, and that was the point.** The operand is substituted
      (`withBalances`), the operation is not forked. A second asset-splitting function taking a
      month and a balance table is the "one concept, two incompatible types" failure
      `household.ts`'s own header names, and the codebase already carries one instance of it.
    - **THE RULING, applied: monthly growth COMPOUNDS.** `(1 + r)^(1/12)`, never `r / 12`, in one
      function with one test. `(1 + r/12)^12 > 1 + r`, so a simple twelfth compounds to 6.697% on a
      6.5% Setting — $1,971.85 a year on a single million, and about 9.9% more terminal wealth over
      a forty-eight year walk, all of it flattering. **The rounding decision is `Math.floor`, DOWN,**
      stated with its direction on the same discipline as `monthlySpendFromAnnual`'s `Math.ceil`:
      this is the one figure whose residual accumulates 576 times in the same direction and it
      accrues to the household's WEALTH, so it is pointed away from the household. Cost: at most a
      cent per balance per month, under $5.76 over the whole walk. Iterated on the **carried**
      balance, not recomputed as stated × factor^n — which is what a ledger does and what 5b needs.
    - **WHICH BALANCES GROW, and which do not.** Grow: every `SuperInterest.balance` (in **every**
      phase and on **both** sides of the means-test split — the younger-partner exemption says what
      the Age Pension may *assess*, not whether the money earns) and every `Person.financialAssets`.
      Do **not** grow: `Person.workBonusBalance` (not an investment — §4.6 already says how it moves,
      $300 a fortnight banked and drawn down, so a rate here would be one concept under two rules);
      the **Offset Account**, i.e. `openingBalance`/`closingBalance` (its return is the *mortgage*
      rate, §5.12, and this model holds no mortgage balance and no mortgage rate — and crediting it
      without a `MonthLine` would break chunk 4's reconciliation); and the **home**, which under
      ADR-0005 has no value to apply a rate to. All three exclusions are asserted through a figure.
    - ✅ **CLOSED BY P4-4, 2026-09-18 — growth is now a `MonthLine` carrying `effect: 'wealth'`, one
      per Person per pool. The paragraph below is kept as the record of what was true until then.**
    - ⚠️ ~~**THE RESIDUAL THIS CHUNK ADDS, declared rather than discovered: growth moves
      `assessableAssets` with NO `MonthLine` against it.**~~ Unrealised growth enters the Age Pension
      means test with no cashflow line to explain it, so a `Month` reports a larger assessable
      figure than the sum of its own lines can account for. It is a **reporting** gap, not an
      arithmetic one — chunk 4's identity stays exact because the two are different quantities — and
      it is the same family as chunk 3's "salary alone in taxable income". **Direction: it runs
      AGAINST the household** (more assessable assets is a smaller Age Pension). Closing it is a
      `MonthLine` shape question — there is no non-cash direction — and belongs with **P4-4**.
    - **THE SHARPEST RISK, and it was silent.** `project()`'s ADR-0005 guard compares the two
      means-test call sites against each other, so it fires when they **disagree** and cannot fire
      when both are **uniformly stale** — which is precisely the pre-5a state. Measured, serially,
      from a clean `dist/`: switching only the `agePensionEntitlement` site fails **6** tests; only
      the `splitAssets` fallback fails **4**; **switching NEITHER fails 7** — and before this
      chunk's tests existed it would have failed **zero**, because every fixture in the suite held
      either nil assets or a deliberately constant amount. That is why the movement is asserted as
      hand-worked figures, inside the Age Pension parameter window and outside it.
    - **THE REST OF THE MUTATION RUN, all serial, all from a clean `dist/`, no survivors.**
      `r / 12` in place of the twelfth root → **10**; the exponent 12 in place of 1/12 → **11**;
      `Math.round` in place of `Math.floor` → **8**; growth applied at the START of the tick instead
      of the end → **8**; no growth at all → **7**; super does not grow → **7**; `financialAssets`
      does not grow → **2**; and growth wrongly applied to `workBonusBalance` → **1**, which is the
      one test written for exactly that and nothing else. The two thinnest (**1** and **2**) are
      thin because they are the only assertions that can see those two fields in isolation, and both
      fail on a **dollar figure** rather than on a shape.
    - **What is NOT in it, and is not settled by it.** No drawdown, no `minimumDrawdown` wiring, no
      CGT, no O57 ledger join. Because there is no drawdown, the **intra-month growth-versus-drawdown
      ordering question does not arise**, and it is deliberately left to 5b rather than decided by an
      accident of where the growth loop sits. The convention 5a *does* take is stated: growth is
      applied at the **end** of each tick, so month 0 is the Household as the user stated it at
      `asAtDate` and month n is n months of compounding — the same "a month reads its inputs at its
      own beginning" convention `firstDayOf` takes for the Age Pension parameters.

  - [x] **P4-1 chunk 5b** **THE ACCOUNT-BASED PENSION MINIMUM — the first balance that FALLS** — ✅
    2026-09-17. `balanceAfterDrawdownAndGrowth`, `minimumAvailableThisMonth` (→ **SUPERSEDED
    2026-09-17 by `9a767fa`**: split into `pensionAvailableThisMonth` and `minimumStillDueThisMonth`
    when the minimum became a FLOOR — see the P4-3 limb 2 ruling), `schedule7RelevantDay`,
    `annualPensionMinimum`, `accountBasedPensionMinimumLimb` and `PENSION_MINIMUM_LINE` in
    `src/core/projection.ts`; `test/core-projection-pension-drawdown.test.mjs` (15 tests). The build
    goes **953 → 968 tests**, all green from a clean `dist/`. **`plan.ts` and `household.ts` are
    untouched** — chunk 5b is the first READER of `StatedStreamSettings`, not an author of it.
    - **`minimumDrawdown.ts` is CALLED, not reimplemented.** Nothing outside it divides by a day
      count, a month count or a proportion: the call passes a financial year, a date of birth, a
      commencement day and a balance that knows which day it is a balance on, and cl 1(2)'s band and
      age, cl 3's day pro-rate, cl 4's nil, cl 4A/4B and cl 5's single $10 rounding all stay inside.
      The year is found with `financialYearContaining`, as chunk 3 already does — **no dependency on
      P4-2**.
    - **cl 1(2)(b)'s withdrawal benefit is a DECLARED, CAVEATED default**, `withdrawalBenefitOf`, in
      the same shape as `REDUCER_DEDUCTIONS`: the account balance, which is the ordinary APRA fund
      case `pensionAccountBalance`'s own doc names. It is never larger than the true figure, so the
      minimum is never over-stated. Doubling it fails **7** tests, so it is wired and not decorative.
    - **The determination happens on the day Sch 7 names and in no other month.** A walk that never
      opens a 1 July never determines that year's minimum and limb 2 is nil for the rest of it —
      a refusal, not a guess, because the `asAtDate` balance is not a 1 July balance and cl 3 alone
      is worth $8,260.00 on the commencement-year fixture.
    - **THE MUTATION RUN — serial, whole suite, clean `dist/`, counted with
      `grep -cE '^\s*not ok '`, each edit sha-verified and restored byte-identical.** growth before
      drawdown → **6**; the annual figure offered every month → **4**; a twelfth → **13**; balance
      falls with no line → **14**; line emitted with no write-back → **9**; a stated commencement day
      ignored → **2**; a commencement day GUESSED where absent → **2**; the cl 3 part-year rule
      dropped → **2**; the balance floor dropped → **2**; limb 2 drawn LAST → **5**; limb 2 drawn
      FIRST → **6**; the payment emitted as an outflow → **14**; the year determined once and never
      re-determined → **3**; the relevant-day month guard dropped → **2**; a TTR interest drawn as an
      ABP → **1**; the draw taken off `financialAssets` instead → **8**; the minimum determined off
      the grown balance → **4**.
    - **TWO SURVIVORS FOUND. One killed, one declared.** (1) **Reversing the allocation order across
      interests failed ZERO tests** — every fixture held one interest, and within one Person the
      order has no observable consequence at all, because `Month` reports the SUM. It is observable
      in exactly one place, WHOSE pension paid, so a two-Person fixture was added in which December
      spills from Pat's pension to Alex's inside one month; it now fails **1**. (2) **The
      unallocated-cents guard fails ZERO and always will** — `drawn ≤ Σ available` by
      `drawWaterfall`'s own `min`, and the loop exhausts `toAllocate` before it runs out of claims.
      Declared in the source in chunk 4's style, as the third such guard in this module. A third,
      the funded limb-2 note, also failed zero until it was asserted directly; it now fails **1**.
    - ⚠️ **THE RESIDUAL IT ADDS, AND IT FLATTERS** — see P4-3/P4-3a. The Waterfall draws to NEED and
      reg 1.06(9A)(a) requires the minimum to be PAID, so a month whose income meets the target draws
      nothing and that part of the minimum is never paid. $9,140.00 of $28,000.00 on the order
      fixture, asserted as a dollar figure.
    - ~~**Exhaustion is now REACHABLE and almost never reached**, which is the finding that rewrote
      **P4-5b**: limb 2 is capped at the minimum, the minimum is a PROPORTION of the opening balance,
      and a proportion never empties a balance. At the plan's own 6.5% the pension GROWS.~~
      **SUPERSEDED the same day by the FLOOR ruling at `9a767fa`, and the strikethrough is the
      record.** Limb 2 is no longer capped at the minimum — it offers the whole account balance — so
      the premise of every clause above is false: exhaustion is reachable at any return, including
      the plan's own 6.5%, and it is reached whenever the household's need outruns its income. The
      half of the finding that survives is that the Sch 7 figure is still PAID in the final month of
      the year whether it is needed or not; what does not survive is the claim that a proportion is
      all that may be drawn. Confirmed empirically by a read-only recon on 2026-09-18 — see
      **P4-5b**.
    - **P4-1a re-earned**, over a fixture whose bytes carry a hand-worked FALLING balance
      (`"assessableAssets":69865686`) and the payment line that took it down, with the growth-only
      figure asserted ABSENT so a walk that forgot to draw cannot pass.

    - **A test rewritten, not deleted.** `test/core-projection-age-pension.test.mjs`'s *"the reported
      assets ARE the figures the means test ran on"* asserted $700,000 and $400,000 **constant across
      five months**. Its ADR-0005 purpose is untouched and still holds; the "constant" literal was
      the stale half and is now five hand-worked moving pairs. The hand-worked ADR-0005 entitlement
      moved with it: one month of growth costs that Household **$11.96** of Age Pension
      ($1,368.25 → $1,356.29), and the walk's entitlement now falls every month as the assets test
      bites harder — which is the first time in this build that an output *moves* for a reason other
      than a legislated step.
  - [ ] **P4-1b** **Two things P3-9 handed to this item by name, recorded here so the handoff is not
    only in the register.** Added 2026-09-16 at the close of P3-9 chunk 6.
    - **Register O57's remaining WIRING ground.** `src/core/superPhase.ts` computes retirement-phase
      figures and **nothing joins a stated Retirement Phase interest to a Person's transfer balance
      account**, so no amount it produces has been tested against any cap — even though the personal
      cap, its indexation, the day history and the breach refusal are all built (P3-9 chunks 2, 3,
      6-4). O57 stays open on that ground alone and §8 names the Waterfall walk as its owner. The
      caveat text in that module must stop describing the residue on the day the join is made.
    - ✅ **BUILT 2026-09-18 at `1cc1376` — part (B), the forecast-window check.** The window `project()` had always
      derived is now a NAMED value: `src/core/forecastWindow.ts` exports `ForecastWindow`,
      `forecastWindow`, `horizonMonth` and the two day predicates, and `project()`'s two boundary
      refusals read it instead of deriving a private copy. `transferBalanceAccountShape` takes the
      window as a REQUIRED first parameter and refuses a stated `accountStartDay` that is not before
      `window.firstDay` when the declaration is `startedRetirementPhaseBeforeTheForecast`, so
      conjunct 1 of `UnknownPersonalTransferBalanceCapError` is corroborated rather than believed.
      *(This bullet said: "There is no forecast window anywhere in `src/`, so conjunct 1 … is declared
      and **not corroborable**". The first clause was already false when part (B) began —
      `project()` computed the window as two locals — and both clauses are false now.)*
      - **The second limb of the rule has no data path and was NOT written as a second `if`.**
        "Inside the window whenever the declaration is `neverARetirementPhaseRecipientBeforeTheForecast`"
        needs an `accountStartDay`, and the only one this module can see lives in stated Settings —
        which that declaration already refuses as a contradiction, whatever day they name. Discharged
        by that throw, asserted from both sides, and recorded in the classifier's doc.
      - **No production call site was created, and that is part (A)'s work, not part (B)'s.**
        `projection.ts` still imports neither `superPhase.ts` nor the transfer balance modules. The
        window module sits BELOW both so that part (A) can join them without a cycle.
      - The direction of the residue is unchanged and still the safe one: the false declaration is
        **refused** (or computes off a stated history), never silently flattered.
    - ⚠️ **DEFERRED 2026-09-18 — part (A), the ledger join, is NOT being built, and the ground is
      REACHABILITY rather than effort.** A read-only recon established that the join has no reachable
      arithmetic: it is the `SUPER_CONTRIBUTION` shape, where nothing can construct the input, so the
      wiring would have no call site. The four measured blockers — no entry type commences a pension,
      no debit path can fire, a pension commencing later in the window cannot be seeded, and the seven
      per-Person Settings have no input channel — are stated in full in register **O57**, which is
      **NARROWED IN PLACE, not closed**, on the O72 precedent: narrow now, close when the missing call
      site exists. O57 also carries the **two conditions that close it** and the **triggers that reopen
      the build decision** (a stream-commencing entry type, or real user input of an existing pension —
      P7/P8). `superPhase.ts`'s `UNCAPPED_ENTRY` caveat now names WHY the wiring is absent rather than
      only that it is. **P4-1b stays open**, on part (A) alone.
- [x] **P4-2** Monthly ticks with the financial year as a first-class boundary
  - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** The item's own body already opened *"✅ BUILT 2026-09-18"* and the commit is `9341892`. Only the box lagged.
  - ✅ **BUILT 2026-09-18 — the YEAR-END TRUE-UP, `projection.ts` chunk 3b.** The boundary was
    already first-class in behaviour (`financialYearContaining` decides every month's rates, the
    s 102-5 accumulator resets on it, the Sch 7 minimum is determined on the 1 July inside it). What
    was missing was the SETTLEMENT, and it is now there: when the walk leaves a financial year, the
    year it left is assessed **once** — on the salary each Person actually received in it and the net
    capital gain they actually realised in it — and the difference against everything already charged
    becomes an `Income tax year-end true-up, <name>, <financial year>` `MonthLine`, an **inflow**
    where the year was over-accrued and an **outflow** where it was under-accrued. One assessment
    function (`assessHousehold`) serves the monthly accrual, the disposal charge and the true-up, so
    the settlement is the same law read over a year instead of a month.
    - **No `plan.ts` change and no `Month` field.** The year is reported in the line's description;
      the shape of `Month` is pinned in `test/core-projection-true-up.test.mjs`.
    - **JULY carries it, both ways.** A refund does not exist on 30 June and a liability computed
      from a year that has not ended does not either, so both land in the first month of the next
      year. Stated in the source with the reason.
    - **DE-MINIMIS, declared in the source: a gap under $1.00 is not settled**, and is dropped rather
      than carried forward. Twelve rounded twelfths miss the annual figure by up to six cents, and
      without this every flat-salary walk grew a four-cent July line forever.
    - **The first, PARTIAL financial year is refused** — the walk must have seen all twelve months —
      on the same shape of refusal as chunk 5b's Sch 7 1-July rule. The over-charge in a part-year
      stands, which is the conservative direction, and it is what keeps
      `test/core-non-super-gain-tax.test.mjs`'s gain-then-loss fixture unrefunded.
    - ✅ **The CGT REFUND that chunk 5 deferred to this item BY NAME is closed by this one mechanism
      and NOT by a second one.** A loss realised after a charge in the same year — and the negative
      increment one Person's gain can create in the OTHER Person's assessment through the family levy
      or SAPTO — is no longer dropped: the year's final net capital gain and the tax charged on it
      both enter the year's accumulator, so the over-charge returns in the following July. $77.00 on
      the fixture.
    - ⚠️ **The item's real product is the CORRECTED DIRECTION** — see the corrected residual bullet
      under P4-1 chunk 3 above and register **O72**. "The monthly accrual always over-states tax" was
      false, and a fixture now pins the under-charge in both places it is reachable.
    - **Out of scope and stated:** concept.md:185's third limb, *"caps reset"*, is unreachable —
      `SUPER_CONTRIBUTION`'s params are `UnspecifiedParams` and `projection.ts` imports nothing from
      `superCaps.ts`. Nothing was built for it.
- [x] **P4-3** Income Waterfall: salary → ABP (minimum as a FLOOR, more when needed — ruled
  2026-09-17) → offset; Age Pension applied where assessed
  - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** The FLOOR-not-ceiling rewrite is in `src/core/projection.ts` — its header carries *"✅ THE MINIMUM IS A FLOOR, NOT A CEILING — the user's ruling of 2026-09-17, and it closed BOTH"* (`:115`). **Consequence for P4-7:** that item's stated blocker (*"until an above-minimum drawdown exists"*) is now DISCHARGED, and a third Moneysmart run is possible.
  - [x] **P4-3a** Revised 2026-09-04: the order is salary → ABP (minimum as a FLOOR) → **Non-Super
    Portfolio** → offset (P3-20b, ADR-0009). Before a Condition of Release the first two are
    unavailable or capped and the bridge carries the whole spending target
    - ⚠️ **SUPERSEDED 2026-09-23: SEVEN limbs, cash not offsetting a loan before the portfolio and the pension split at its minimum — see "Spend cash first" under Phase 8.**
    - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** `WATERFALL_LIMBS` (`projection.ts:802`) now holds FIVE limbs in this order — `salary`, `accountBasedPensionMinimum`, `nonSuperPortfolio`, `offsetAccount`, `releasedSuperannuation` — so the revised order is built, and the fifth limb settles the released-super question this item's parent left open.
  - **Built 2026-09-17 by P4-1 chunk 4, and what it does NOT yet do.** `drawWaterfall` in
    `src/core/projection.ts` holds the order in one array, `WATERFALL_LIMBS`, and applies it in one
    loop. **All four limbs are built, named and reported — including the two that draw nothing —
    and each states which kind of nothing it is** (`unfundedMiddleLimbs`). The order is tested on
    DOLLAR FIGURES that distinguish it from every adjacent transposition and from the full reversal,
    in `test/core-projection-waterfall.test.mjs`; swapping any two limbs fails 3 tests.
    - ✅⚠️ **RULED 2026-09-17 — THE MINIMUM IS A FLOOR, NOT A CEILING. Limb 2 must be rewritten,
      and the two defects below are ONE job.** The user's words, on being shown both ends: *agree*
      — to the rule **"pay at least the legal minimum, and take more if it is needed."**
      - **Today limb 2 treats the Sch 7 minimum as a CEILING.** It offers what is left of the annual
        minimum and no more, so a household whose need exceeds it **cannot reach its own money**.
        P4-7's Moneysmart run is the proof: $600,000 in an ABP, nothing else, a $64,370 target — we
        draw exactly **5.00%** and then report **$125,452** of "unfunded" spending across the walk
        while the balance **rises**. Moneysmart spends the same account to zero by 92. Nothing in
        the law caps a drawdown; the minimum is a floor.
      - **And it under-pays at the other end too, for the SAME reason** — the residual recorded
        below: because the Waterfall draws to NEED, a month whose other income covers the target
        draws nothing, so part of the year's legislated minimum is never PAID ($9,140.00 of
        $28,000.00 in the worked case) and the household ends richer than the law allows.
      - **Both ends are the same seam: withdrawals are decided from need alone, rather than from
        what the law REQUIRES plus what is needed.** Fixing only the above-minimum half leaves the
        unpaid-minimum half live in the same few lines, which means touching them twice. **Do not
        split this into two work items.**
      - **Precedent settles the surplus case, so it is not a further ruling:** where the minimum
        exceeds need, the excess is still PAID — it leaves the pension and lands in the Waterfall's
        running cash, exactly as limb 1's surplus already does. It does not stay in the ABP.
      - **Why it is load-bearing beyond its own item:** until this lands, **no scenario whose
        spending exceeds the minimum can be compared against ANY external authority**, because
        almost every real retirement spends above the floor. It is the blocker P4-7 identified.
    - ✅ **Limb 2, the ABP minimum, is FUNDED — P4-1 chunk 5b, 2026-09-17.** `minimumDrawdown` is
      CALLED and not reimplemented: `project()` determines each Account-Based Pension's annual
      minimum on the day Sch 7 names (1 July, or the commencement day in a commencement year),
      detected with `financialYearContaining` and **without any dependency on P4-2's settlement
      machinery**. Three rulings, each in one place with a test:
      **(i) DRAWDOWN FIRST, THEN GROWTH** (`balanceAfterDrawdownAndGrowth`), the user's ruling of
      2026-09-17 and a declared convention rather than a discovered fact — the conservative end of a
      bracket the engine cannot reach, worth $26.31 on one month of the register fixture, and it
      slightly UNDER-states a real household's balance.
      **(ii) THE ANNUAL MINIMUM IS A FLOOR ON THE YEAR, NOT A MONTHLY CAP**
      (`minimumAvailableThisMonth`): the limb offers what is LEFT of the year, with NO division. A
      twelfth was rejected because it would invent a payment schedule the Schedule does not impose
      and would manufacture an `Unfunded shortfall` — the headline P4-5a reads.
      — ⚠️ **STAMPED 2026-09-17, `9a767fa`: the second half of this heading was TRUE and the code
      did not honour it.** "Floor on the year" was implemented as a **cap on the walk**: the limb
      offered what was left of the minimum and refused to go beyond it, so the `Unfunded shortfall`
      this bullet feared was manufactured anyway — $125,452 of it on the P4-7 baseline. The
      function is gone, split into `pensionAvailableThisMonth` (capacity = the whole balance) and
      `minimumStillDueThisMonth` (what must be paid regardless). **The heading was right; the
      implementation read only its first six words.**
      **(iii) A STATED COMMENCEMENT DAY, OR NOTHING**: `StatedStreamSettings.commencementDay` is
      read (chunk 5b is its FIRST reader anywhere in `src/`), and where it is absent the limb stays
      nil with its own note. Guessing 1 July changes a legislated figure — $8,260.00 on the
      commencement-year fixture — so it refuses. **Both branches stay assertable**, the nil one in
      `test/core-projection-waterfall.test.mjs` and the funded one in
      `test/core-projection-pension-drawdown.test.mjs`.
      - ⚠️ **The residual it adds, and it FLATTERS.** The Waterfall draws to NEED; reg 1.06(9A)(a)
        requires the minimum to be PAID. A month whose other income meets the target draws nothing,
        so part of the year's legislated minimum is never paid — $9,140.00 of $28,000.00 on the
        order fixture. A compliant household moves that money from super (which grows) to the Offset
        (which does not), so this model's household ends RICHER. Bounded by the annual minimum and
        asserted as a dollar figure. Closing it changes what the Waterfall MEANS.
      - **The first partial financial year of a walk that does not begin on 1 July draws nothing**,
        because there is no 1 July balance to read and `minimumDrawdown` refuses a balance measured
        on any other day. Under-statement, safe direction, and asserted.
    - **Limb 3, the Non-Super Portfolio, draws nil and the blocker is CGT** (ADR-0009, §5.12,
      P3-20c/P3-21) plus a per-parcel cost base nothing in the model holds. `NON_SUPER_INVESTMENT`'s
      params are `UnspecifiedParams`, so no entry can fund or draw the pool at all today.
    - ✅ **THE ORDER NOW HAS A REACHABLE CONSEQUENCE IN `project()`, and the fixture chunk 4 said was
      owed has been written — P4-1 chunk 5b.** It stood here that with two limbs nil,
      `funded = min(target, income + offset)` whichever way round the live limbs were drawn, so no
      `Month` could distinguish the order, and that whoever funded a middle limb owed a
      `project()`-level order fixture. **Paid.** `test/core-projection-pension-drawdown.test.mjs`
      §2 walks a month in which limb 1 supplies $2,140.00 of a $21,000.00 target, limb 2 is
      PARTIALLY drawn at $18,860.00 of $28,000.00 available, and limb 4 holds $9,120.00 and draws
      NOTHING. Three orders, three closing balances: **$9,120.00 in the specified order, $0.00 with
      the offset drawn before the pension, $11,260.00 with the pension drawn before the wage** — and
      three different pension payments ($18,860.00 / $9,740.00 / $21,000.00) and three different
      next-month asset figures. The distinction is a dollar amount, not a count.
  - [x] **P4-3b** — ✅ **2026-09-18. `Household.openingOffsetBalance`, and the Offset Account IN the
    means test.** ⚠️ **THE OFFSET ACCOUNT HAD NO FIELD ANYWHERE IN THE MODEL — found 2026-09-17 by
    P4-1 chunk 4, and it is the chunk's largest finding.** `Household` is `{ persons, homeStatus }`
    and `Person` carries `financialAssets`, which ADR-0009 names as the **Non-Super Portfolio**'s
    seam — a different pool, drawn one place earlier, so the offset cannot be folded into it without
    making the two limbs indistinguishable. There is no mortgage balance either.
    - **What chunk 4 did instead, and it is a stand-in and says so:** the walk's own running cash
      balance — `Month.openingBalance` / `closingBalance` — IS the Offset Account. Surplus lands
      there, limb 4 draws from it, and it **starts at nil**, because nothing states an opening
      figure. A Household with a real offset therefore begins the walk unable to draw on it.
      **Direction: conservative** — a Shortfall Age earlier than the truth.
    - **The smallest honest resolution, proposed and NOT taken** (widening `household.ts` is not
      chunk 4's to do): one `Cents` field for the opening offset balance. It belongs on `Household`
      and not on `Person` — an offset is an account against the Household's home loan, the loan is
      a Household fact under ADR-0005's status model, and a per-Person split would invent an
      ownership question the user was never asked. Its means-test treatment needs no new rule:
      offset cash is assessable and deemed exactly as `financialAssets` already is (ADR-0009), so
      `splitAssets` gains a line and no branch. **The mortgage balance is a separate and larger
      question** (`MORTGAGE_REFINANCE` / `MORTGAGE_TARGET` are both `UnspecifiedParams`) and is not
      needed for the Waterfall — only for the interest the offset saves.
    - ✅ **THE RULING, 2026-09-18: BRANCH (i) — the Offset is assessed at its CURRENT balance.**
      The build was handed back at **1020 pass / 28 fail** with the fork open, because part 3 below
      is not behaviour-preserving and the two branches were *ship it and re-derive 28 fixtures* or
      *keep the offset line reading the STATED opening figure* (green that day, stale-static the
      moment a Household states an offset and spends it). **The user ruled for the first**, on the
      ground that offset cash is cash, cash is a financial investment, and ADR-0009 with register
      §4.8 already say what happens to one — so the 28 assertions were asserting something the law
      does not say. Register **T38** points the same way from the other side: unspent HEAS cash is
      *"assessable and deemed"*. All 28 were RE-DERIVED from the mechanism, never restamped from the
      run; the suite is **1052 pass / 0 fail**.
    - **The shape is FOUR parts, not the two proposed above.**
      1. **`Household.openingOffsetBalance?: Cents`**, OPTIONAL on the house convention
         (`Person.statedPriorRetirementPhase`, `SuperInterest.statedStreamSettings`), read with
         `?? toCents(0)`. On `Household` and not `Person`, for the ADR-0005 reason above.
      2. **The seed**: `project()`'s running cash local starts at that figure, so a stated offset is
         drawable by limb 4 in month 1. This is the only place the field seeds the walk; limb 4 and
         the month-to-month carry-forward read the local and needed no change.
      3. **The CURRENT-BALANCE WIRING, which the entry above never named.** `withBalances` spreads
         `...household`, so a `splitAssets` that reads the offset off the Household reports the
         STATIC Day-1 figure in every month — the stale-static-balance defect P4-1 chunk 5a fixed for
         parcels and super. `withBalances` therefore takes a THIRD, required, `offsetBalance` and the
         walk passes `openingBalance`.
      4. **The `livesOnPensionAlone` collision, ruled on P4-5b's precedent.** Once the Offset is
         assessable, a Household that banks pension surplus has `assessableAssets !== 0` from its
         second pension-only month. Exhaustion is an EVENT and living on the pension is a STATE, so
         conditions 1 to 4 exclude the Offset (*"holds nothing besides the Offset"*) and the marker's
         condition (5) still demands nil opening cash. The Offset is NOT made non-assessable — it is
         assessable, and that is the point of the item.
    - **WHAT MOVED, and every one of the 28 was priced against the mechanism that moved it before the
      new figure was accepted.** Two mechanisms and no others: (i) the offset joins
      `assessableAssets` / `deemedFinancialAssets`, so the REPORTED figure rises by that month's own
      opening cash and nothing else changes — 21 of the 28, in walks where the taper does not bind or
      no entitlement exists, and in every one of them the cash path is byte-identical to the
      pre-ruling build; (ii) the harder-binding test cuts the Age Pension, which then propagates. The
      (ii) cases, each checked against the taper the mechanism predicts and each agreeing to the cent:
      * `core-projection-age-pension` §ADR-0005 — October's payment $1,356.29 → **$1,352.04**, being
        $1,308.02 of banked September pension ÷ 1,000 × $3.00 = $3.924 a fortnight of extra assets
        taper, halved to the one eligible Person and × 26 ÷ 12 = **$4.25**. The five-month series
        falls by 0 / $4.25 / $8.64 / $12.97 / $17.27.
      * `core-projection-growth` § the nil-return control — $296.18 → **$294.77**: $216.45 of banked
        pension, 64.935c a fortnight of taper, $1.41 a month.
      * `core-projection-growth` § the Work Bonus — six IDENTICAL payments are now six FALLING ones,
        and the whole of the drift is **deeming**, not the assets test: $4,443.19 × 1.75% = $77.76 a
        year = $2.99 a fortnight, 50c taper, $3.25 a month. The Work Bonus claim was re-expressed as
        a DIFFERENCE between two walks ($3.42, unchanged by the ruling) rather than as a flat line.
      * `core-projection-tax` § the working pensioner — $1,518.18 → **$1,514.67**, deeming again.
      * `core-outcomes-pension-only-age` §4 — the **Pension-Only Age moves 2033-11 → 2033-10**, and
        the marker's own rule did not change. Five years of deemed income on the growing Offset paid
        a smaller pension every month, so the Household retired on **$247,730.19** rather than
        $254,483.76 and ran that balance to nil a month earlier. The EXHAUSTION moved; the marker
        followed it. §2's thrifty fixture (*"BANKING THE PENSION … $1,231.35 a month"*) never moved.
      * `age-pension-forward-indexation` § *"the walk does not FLATTEN"* — the 32.9-year window grew
        by 1.38 instead of 3.07, because that Household banks its whole pension for forty-five years
        and is eventually means-tested on **$3,346,238.83** of it. **The fixture gained a spending
        level**, which restores the pre-ruling ratios to the cent and isolates the RATE from the
        MEANS TEST; the hoarding walk is kept and asserted in its own right beside it.
    - **What was re-expressed rather than renumbered**, because its PREMISE died:
      * `core-non-super-buy` § *"THE DIRECTION of an under-funded buy … it FLATTERS the means test"*
        — that disclosure said in terms *"it is here as a number so that the day an Offset Account
        field lands, this test says what it was worth."* **That day was 2026-09-18 and the answer is
        nothing**: cash and parcels are now assessed alike, and the test asserts THAT.
      * `core-non-super-disposal` § *"BROKERAGE MOVES NO AGE PENSION FIGURE"* — NARROWED in its own
        title. The fee is $100 of cash that left, so the total DOES move by exactly $100; what
        survives is that the PORTFOLIO is read at market value and that no pension figure moves
        (at $18,702.55 assessed against a $333,000 free area, the taper would be 30c a fortnight).
      * `core-outcomes-pension-only-age` §3 — *"nil assessable assets in all 120 months"* is now
        false in 119 of them. The false positive it guards is closed from the other side: conditions
        1 to 4 still hold for sixty unbroken months (part 4 excludes the Offset on purpose), and what
        keeps the answer `'never'` is condition (5) alone. The fixture defends that instead, and the
        file's own re-derivation of conditions 1 to 4 carries the same exclusion.
    - **The prose that P4-3b made false was rewritten in the same change** — `projection.ts`'s header
      Waterfall block, the chunk 5a note, the `householdThisMonth` comment, limb 4's comment, the
      buy's funding comment and its *"the means test does not move"* claim, `PersonBalances`'s Offset
      paragraph; `outcomes.ts`'s retraction list, the Pension-Only Age doc comment and
      `livesOnPensionAlone`; and `test/core-outcomes-pension-only-age.test.mjs`'s header, which had
      been left alone pending the ruling.
    - **The four owed tests are in `test/core-offset-account.test.mjs`** (4 tests): a $500,000 offset
      drained across eight months with `assessableAssets` tracking it DOWN and the Age Pension rising
      $402.70 a month as it does; `splitAssets` gaining ONE assessable, deemed line with
      `protectedAssets` unmoved; a stated offset DRAWN by limb 4 in month 1 ($2,398.05, against a
      control that is short by the same $2,398.05); and absent ≡ stated nil, byte for byte.
    - **Mutations, re-measured against the finished suite** (baseline 1052/0). (a) dropping the
      `?? toCents(0)` at the seed **does not compile**, TS2322, with the correct version compiling as
      the positive control; as the runtime-equivalent `as Cents` cast it fails **138**. (b) reverting
      part 3's widening — **0 before this pass, 29 now**, and the named victim written for it is
      *"A DRAINING OFFSET IS A FALLING MEANS TEST"*. (c) removing the offset line from `splitAssets`
      — **0 before, 30 now**, and the line-level victim is *"a stated offset is ONE assessable,
      deemed line"*. (d) removing part 4's exclusion fails **3**: P4-5b's thrifty fixture and both
      P4-5c recovery fixtures.
    - **Still NOT done, and not this item's**: the mortgage balance and the interest the offset
      saves. The Offset earns no interest in this model (`MORTGAGE_REFINANCE` / `MORTGAGE_TARGET` are
      both `UnspecifiedParams`), which under-states the household and is the whole of the residual
      now that the pool no longer also starts at nil.
- [x] **P4-4** Per-month line-item breakdown and `appliedEntryIds[]` — **all three parts built, plus
  the polish, 2026-09-18.** `Month.lines` was never a stub: `closingBalance` is COMPUTED from it, so
  `openingBalance + Σlines === closingBalance` has held by construction since P4-1 chunk 4 and is
  asserted on dollar figures in seven test files. What was missing was the NON-CASH movement and the
  PROVENANCE, and both are now in.
    - **1. `MonthLine.effect: 'cash' | 'wealth'`, required, not optional-defaulting** — on
      `Entry.enabled`'s reasoning ("nobody said" and "it was cash" are different facts). The
      rejected alternative was widening `direction` with `'gain' | 'loss'`: `direction` is named in
      concept.md §2 and every consumer switches on its two values, so a third would silently
      reclassify a growth line as neither an inflow nor an outflow. A growth line is an `inflow` of
      `wealth`; a fall in value is an `outflow` of it.
    - **2. INVESTMENT GROWTH IS A LINE, and it closes P4-1 chunk 5a's declared residual** — the one
      that said growth moved `assessableAssets` with no `MonthLine` against it. One line per Person
      per POOL (the Non-Super Portfolio, and each superannuation interest separately), at the
      month's MOVEMENT and never the balance, under the pool name `splitAssets` gives the same
      money. The figures are computed once and used twice — the line and the end-of-tick write-back
      are the same number, which is `PENSION_MINIMUM_LINE`'s discipline taken unchanged.
      **`cashMovement` is the single expression every cash reduction in `project()` goes through**,
      so no closing balance in the suite moved: the strip-and-rehash in
      `core-non-super-parcels.test.mjs` reproduces the pre-P4-6 digests to the byte.
    - **3. `appliedEntryIds` cites the entries that GOVERN a month, not only those dated in it.**
      A 2019 `SPEND_CHANGE` appeared in month 0 and nowhere else, so month 200's `Household
      spending` line had no traceable cause in its own `Month` — the hole ADR-0002 and ADR-0006 ask
      this array to close. Every `ENTRY_KIND` `level` is now cited from the month it takes effect
      until something supersedes it; an `event` is cited in its own month alone. **ORDERED and
      DEDUPLICATED as before, and the widening is strictly an APPEND**: the month's own entries keep
      the Scenario's order at the front, the standing levels follow oldest-governing-first, and no
      id moves or is dropped.
    - ⚠️ **THE INVARIANT ASKED FOR COULD NOT BE SHIPPED AS ASKED, and the measurement is the
      finding.** `Σ(lines where effect === 'wealth') === Δ(protectedAssets + assessableAssets)` is
      FALSE in **90 of 90** month transitions of the fixture built for it. The cause is not growth:
      `protected + assessable` is TOTAL WEALTH (parcels + every super balance + the Offset), so it
      moves whenever money enters or leaves the Household. The EXACT identity needs four terms —
      `Δ offset`, the internal transfers (pension minimum, portfolio sale, portfolio purchase, which
      move wealth between pools and net to nil), and the **incidental costs of acquisition**, which
      are the one term not reconstructable from a `Month` at all: a purchase line carries the gross
      cash while the parcel it creates is worth `funded − brokerage`. It is written out and asserted
      in `test/core-projection-growth-lines.test.mjs`, which fails 0 of 90.
    - ~~**STILL NOT DONE, and it is what keeps this item open:** the Waterfall's discarded per-limb
      notes, brokerage itemisation (the fourth term above), and the empty-parameter-window notes.~~
      **✅ THE POLISH, 2026-09-18 — all three, and the first and third share ONE shape.**
    - **4. `Month.notes: readonly MonthNote[]`, a discriminated union on `subject`.** The Waterfall's
      per-limb `available`/`drawn`/`note` were computed for all four limbs every month and discarded
      — `project()` read `drawn` off two draws to allocate a payment and threw the rest away — and a
      month outside the Age Pension or tax parameter window emitted no line AND no note, so *"nil"*
      and *"nobody has legislated it"* were the same empty array. Both are notes about what did NOT
      move, so both are `Month.notes`; they are NOT lines, because `MonthLine.amount` is specified as
      always positive and a note is not a movement. The union is discriminated rather than one record
      with optional money fields, on `Entry.enabled`'s reasoning: an optional `available` would make
      "nobody supplied a figure" and "the figure was nil" the same value again. **The sharpest case
      the widening rescues is a limb with `available > 0` and `drawn === 0`** — $250,000 of parcels
      offered and never reached, which moves no money and so emitted nothing at all.
      `⚠️ agePensionParametersCover`'s own doc predicted this: *"`Month` has no slot for 'not
      computed' — and `plan.ts` is not this chunk's to widen"*. It is widened; the sentence is kept
      and marked superseded rather than deleted.
    - **5. BROKERAGE IS A LINE — `Non-Super Portfolio brokerage, <name>` — AND THE WEALTH IDENTITY
      LOSES ITS FOURTH TERM.** The purchase line carried the GROSS `funded` while the parcel it
      created was worth `funded − incidentalCostsOfAcquisition`, so the fee was the one movement in
      the walk with no line against it. It has one now and the purchase line is NET; the two sum to
      `funded` by construction, so **no closing balance, no assessable figure and no Shortfall Age
      moved** — the only dollar figures that moved are the purchase line's own ($50,030 → $50,000 +
      $30, and $20,030 → $20,000 + $30), and both are asserted against their superseded values.
      The identity in `test/core-projection-growth-lines.test.mjs` is now
      `Σ wealth = Δ(protected + assessable) − Δ offset + Σ internal transfers`, EXACT, 0 of 90
      failures, with **every term reconstructable from a `Month`**: the fee is external cash inside
      `Δ offset`, and the purchase, now net, is larger inside `Σ internal transfers` by exactly the
      term that used to sit beside it. The test's own canary — *"if brokerage ever gets a line of its
      own, the wealth identity above loses its fourth term"* — fired as designed and was rewritten to
      assert the NEW state rather than deleted.
    - **The digests.** `core-non-super-parcels.test.mjs`'s strip is now four layers deep
      (`accessibleAssets`, wealth lines and `effect`, `appliedEntryIds`, and now `notes`) and the
      PRE-P4-6 digests still reproduce to the byte: `3b796bb…` / 68,892 and `BEFORE_EMPTY` / 65,828.
      The new full digests are pinned beside every superseded one.
- [x] **P4-5a** **Shortfall Age** — `shortfallAge(months, household)` in `src/core/outcomes.ts`
  — ✅ 2026-09-17. ~~**P4-5 is NARROWED, not ticked whole**: the Shortfall Age is built and the
  Pension-Only Age is not buildable yet, for a reason that is arithmetic rather than effort
  (**P4-5b** below).~~ **Superseded 2026-09-18: P4-5b is built, so P4-5 is whole.** The narrowing is
  kept as the record of what was true for one day. The condition was already built by P4-1 chunk 4
  — a month the Waterfall could not fund carries an `Unfunded shortfall` inflow line for exactly the amount it fell short — and
  this reads it rather than recomputing anything. It is an `inflow` on purpose: the spending lines
  are emitted at what the Household NEEDED, never at what it could afford, so the gap needs a name
  on the other side of the reconciliation, and with it present `closingBalance` floors at nil
  instead of becoming an unstated loan at an unstated rate.
  - **THE RECOVERY RULE, which the definition does not settle.** CONTEXT.md says *"the age at which
    the Income Waterfall can no longer meet the spending target"* and concept.md §1 says the same in
    fewer words. Neither says what a Household that falls short and then RECOVERS has done, and a
    $30,000 roof paid for out of nothing in one month is plainly not the age the money ran out. The
    reading taken is **the FIRST month carrying the line**, with the competing reading reported
    beside it rather than absorbed into it. The reason it is not *"the first month of the final
    unbroken run"*: under that reading a Household that cannot fund twenty years and then recovers
    in the last month has **no Shortfall Age at all** — every other reading runs the FLATTERING way,
    and the headline number must not be the one place in this engine that points away from the
    household. *"Sustained for N months"* is refused outright: no document gives an N, and a
    threshold chosen here would be a policy decision made by a default.
  - **The competing reading is reported, not discarded.** `pointOfNoRecovery` is the first month of
    the unbroken run of short months that reaches the horizon, and is `undefined` when the walk ends
    funded; `recovered` says whether any short month was followed by a funded one; `monthsShort`
    counts them. A caller that wants the stricter marker has it. What it cannot do is get the
    stricter marker while believing it holds the headline.
  - **"Never, within the horizon" is SPELLED.** `outcome: 'never' | 'shortfall'`, so the common and
    correct answer cannot be confused with a missing value or with a shortfall in the last month —
    both of which are asserted, from both sides. An EMPTY `Month[]` is refused rather than answered
    `'never'`: a walk with no months has not told us the money lasted.
  - **WHOSE AGE: BOTH, and the engine refuses to choose.** CONTEXT.md calls it *"the tool's headline
    number"*, singular, and in a couple the two people are different ages in the same month. `ages`
    is every Person in `household.persons` order, each carrying its own name; the primary fact is
    the MONTH, which is what the chart marks (concept.md §7) and what the month table is keyed by.
    `Entry.owner`'s `personA`/`personB` ordering is about which Person a stated fact belongs to, not
    about whose life the plan is told from, so reading a headline off `persons[0]` would borrow an
    ordering to mean something it has never meant. **The alternative not taken:** report the YOUNGER
    Person's age, on the same reasoning `horizonMonth` uses to take the LATER hundredth birthday —
    rejected because it would silently switch people the day a `DEATH` entry lands.
  - **The age is taken on the FIRST day of the month**, which is the convention the walk already
    runs on (ADR-0005's asset split and the means test both do). A Person born on the 15th who first
    falls short in their 88th-birthday month is reported at 87, and the boundary is asserted on a
    fixture whose horizon month IS the birthday month.
  - **`project()` STILL RETURNS `readonly Month[]`, and that is a PROPOSAL not taken.** A richer
    return type would be the natural home for this marker and for P4-6's floor breach, but it
    changes the signature every caller and every test is written against, for a value derivable from
    the months with no state the walk holds privately. **The call is the user's.** Until then the
    marker is a pure function over the output, in its own `core/` module because it is a READING of
    a projection and not a part of one.
  - **A SURVIVOR was found and killed.** Dropping the `direction === 'inflow'` test from the line
    match failed **zero** tests: the walk only ever emits the line as an inflow, so no fixture built
    through `project()` reaches it. It is reachable through the exported signature, so it is killed
    by a hand-built `Month` carrying an OUTFLOW of that name — `MonthLine`'s own rule, *"direction
    carries the sign"* — rather than declared.
  - **The fixtures are built against the two flattering traps this chunk had.** A fixture whose
    first short month is also its final run's first month proves nothing about which definition was
    implemented, so the register fixture falls short, recovers for thirteen months, and falls short
    for good — the two answers fourteen months and a birthday apart. A Household whose two people
    are the same age cannot say whose age is reported, so every fixture is a couple born six and a
    half years apart and every age assertion is a pair of DIFFERENT numbers in a stated order.
- [x] **P4-21** ✅ **DONE 2026-09-21 — a fund's DOLLAR ADMINISTRATION FEE is a REAL figure
  (register O87, user ruling).** `SuperInterest.statedAdministrationFeePerYear` is raised to each
  month's price level before the twelfth is taken, through `core/priceLevel.ts`'s `inflateStated` —
  the third and only other call site, beside the spending level (O85) and the Contingency Floor
  (P4-14). There is still no second `(1 + cpi) ^ (n / 12)` anywhere in `src/`.
  - **Why it is REAL and the repayment beside it is not.** A dollar fee is a stated PRICE FOR A
    SERVICE, charged every year for as long as the forecast runs — `annualSpend`'s shape, not
    `Mortgage.monthlyRepayment`'s. A bank contracts a repayment in dollars; no fund contracts its
    fee for forty years. Held flat the household was modelled paying less and less in real terms:
    about a fifth of the stated fee gone over ten years and a third over forty, which UNDERSTATES a
    cost and therefore FLATTERS the plan — the direction O85 was fixed for.
  - **The basis is `Settings.asAtDate`**, exactly as for the spending level and for the same reason:
    every box on this page takes today's money (P2-7), so the fee box does too.
  - **The PERCENTAGE limbs are untouched, and that is asserted rather than assumed.** A share of a
    balance is charged on a figure already in the month's own nominal dollars, so it indexes itself;
    raising the rate as well would charge the price level twice. `test/core-super-fees.test.mjs`
    §5b runs two walks differing only in `cpi`, with no dollar fee stated, and they are the same walk
    to the byte — with a non-vacuous control that shows the pair DOES differ once a dollar fee is
    added.
  - **The mechanism is a LENS, not a figure or a date.** `monthlySuperFeesForOneMonth` takes
    `raisedToPriceLevel: (stated: Cents) => Cents` and stays the only reader of the field: a
    pre-raised number could be handed in against the wrong interest's balance, and a lens cannot be
    mismatched. It is REQUIRED and has no identity default, because a default here would silently
    restore the flat fee this ruling removed — which is why HEAD's own fee test had to be updated to
    compile, and why that was the only thing the zero-CPI control could break.
  - **THE CONSERVATION IDENTITY, and it is `annualSpend`'s own:** deflate a month's fee line by that
    month's own factor and twelve of them are the annual figure the user typed, in EVERY month. The
    residue is bounded by arithmetic rather than by observation — `mulCents` rounds to nearest
    (±0.5c on the annual figure) and the twelfth is ceiled AT the household (+1c), both then divided
    by a factor of at least 1, so it lies in (−0.05c, +1.05c) whatever the length of the walk; on
    the 122-month canary it runs −0.03c to +0.90c. **Drift is ruled out structurally rather than by
    tolerance**: each month's fee is re-derived in the test from the STATED figure and that month's
    factor alone, so there is nothing carried from the previous month for an error to accumulate in
    — and a walk that ever started indexing last month's fee would fail on the first cent.
  - **THE ZERO-CPI CONTROL, in P4-19's strong form.** With the factor forced to nil, HEAD's ENTIRE
    suite was run against the new engine: **1,971 of 1,978 passed**, the six dev-server tests were
    cancelled on the port as always, and the single failure was `monthlySuperFeesForOneMonth — nil,
    the cap, and the refusals` failing on ARITY (*"raisedToPriceLevel is not a function"*) rather
    than on a figure. **Not one number in the suite moved for any reason but the price level.** In
    the file itself, `cpi: 0` recovers the pre-ruling figures to the cent — 1,042 and 3,972 in month
    1, 10,103,409 and 10,087,246 in month 2 — and that control is now a test.
  - **What it cost the demo plan: NOTHING, and that is stated rather than left to look like luck.**
    The demo household states no dollar fee on either interest, so `raisedToPriceLevel(0)` is 0 and
    the whole 501-month walk is byte-identical — same SHA-256 before and after. **Shortfall Age is
    unchanged at 2055-12 (Dana 87, Ash 95), 150 short months.** The figures that did move are the
    fee fixtures: on a $125-a-year fee the charge goes 1,042 → 1,044 cents in the second month and
    1,077 by the sixteenth, and on the $1,200-a-year canary the last of 122 months is charged
    $128.28 instead of $100.00 — 28% more nominal cents for exactly the same fee in real terms.
  - **The O87 canary was REPLACED, not deleted.** `test/plan-money-basis-inventory.test.mjs` §4 used
    to assert the GAP (*"the administration fee now MOVES — if it was indexed, close O87 and rewrite
    this test"*); it now asserts the RULE. That is the shape that stops a silent fix from looking
    like a refactor, and it fired exactly as designed.
  - **The box says which money it is in.** *"Administration fee, dollars a year, in today's money"*,
    with one plain sentence behind the info button saying the forecast lifts it with prices and that
    the two rate boxes need no such lifting. A silent box beside labelled ones is read as agreeing
    with them, which is the rule O85 wrote and this change is the second application of.

- [x] **P4-20** ✅ **DONE 2026-09-21 — THE INVENTORY: every user-stated money figure in a plan, and
  which money it is in.** `test/plan-money-basis-inventory.test.mjs` is the machine-checkable half;
  this is the table. **It FIXES NOTHING** — the two figures it finds mistreated get register rows
  (**O87**, **O88**) and a canary that asserts the GAP, because the user asked to see the list before
  anything else moves.
  - **The test that decides which side a figure is on, in the user's own words:** does it name *an
    amount of money owed or contracted* — a loan balance, a repayment, a balance held today — or *a
    life the user wants to buy* — spending, a floor, a target? The first is NOMINAL; the second is
    REAL. Verified in the engine with `grep -a`, never inferred from the type: `inflateStated` had
    exactly TWO call sites in `src/` when this was written and has **THREE** since O87 was ruled on
    2026-09-21, and §1 of the test file counts them.

  | Field | Where | Indexed today? | Should be | Direction if wrong |
  |---|---|---|---|---|
  | `Settings.contingencyFloor` | `plan.ts:148` | **YES**, `outcomes.ts:597` | REAL — a buffer is a quantity of buying power | ✅ right since P4-14 |
  | `SpendChangeParams.annualSpend` | `plan.ts:451` | **YES**, `projection.ts:5656` | REAL — a life the household buys | ✅ right since P4-19 (O85) |
  | `SuperInterest.statedAdministrationFeePerYear` | `household.ts:309` | **YES**, `projection.ts` (the super-fee lens) | **REAL** — a price for a service, charged every year | ~~⚠️ **FLATTERS** — understates a cost; a fifth over 10 years, a third over 40.~~ ✅ **fixed 2026-09-21 (P4-21, O87)** |
  | `SalarySacrificeContributionParams.annualAmount` | `plan.ts:668` | no | **REAL, and possibly WAGE-indexed** — a standing share of a life | ⚠️ **UNDERSTATES** — less into super than meant. Conservative. **O88** |
  | `OneOffExpenseParams.amount` | `plan.ts:472` | no | **NOMINAL — RULED 2026-09-21** — an amount as at a date, so indexation is not relevant to it | ✅ **O86 CLOSED by user ruling**: the figure stands, and the form's *"Amount, as it will cost on the day"* is the label that resolves it |
  | `LumpSumFromSuperParams.amount` | `plan.ts:557` | no | NOMINAL — a withdrawal of a stated number of dollars on a day | fine; and it is capped by the balance, so an over-statement pays out what is there |
  | `NonSuperInvestmentBuyParams.amount` | `plan.ts:508` | no | **NOMINAL** — O86's family, a dated purchase | ✅ **closed with O86 on 2026-09-21**, and it buys a parcel rather than spending |
  | `NonSuperInvestmentBuyParams.incidentalCostsOfAcquisition` | `plan.ts:522` | no | NOMINAL — brokerage actually paid on the day | fine |
  | `NonSuperInvestmentSellParams.amount` | `plan.ts:585` | no | **NOMINAL** — O86's family, a dated disposal | ✅ **closed with O86 on 2026-09-21** |
  | `WorkPatternChangeParams.annualSalary` | `plan.ts:417` | ~~no~~ **YES, by WAGES** (`atWageLevel` in `projection.ts`, `economicSeries.awote`) | **ITS OWN QUESTION — wages, not prices** (P2-6, `economicSeries.awote`) | ~~reported, NOT changed: a wage indexed at CPI is a pay cut nobody agreed to~~ ✅ **RULED 2026-09-23: pay rises with wages.** Read in the wage level of `asAtDate` (never the entry's own date — `annualSpend`'s precedent), raised every month by `awote` |
  | `Person.employmentIncomePerFortnight` | `household.ts:453` | ~~no~~ **YES, by WAGES**, the same expression | as above | ~~reported, NOT changed — same knob, same ruling~~ ✅ **same ruling, 2026-09-23** |
  | `Mortgage.openingBalance` | `household.ts:584` | no | NOMINAL — a debt is a number of dollars | ✅ right |
  | `Mortgage.monthlyRepayment` | `household.ts:596` | no | NOMINAL — the bank does not index it | ✅ right, and §3 of the test file pins it flat across 176 months |
  | `MortgageRefinanceParams.openingBalance` | `plan.ts:719` | no | NOMINAL — as above, from a stated date | ✅ right, with one caveat: a refinance dated twenty years out is a FORECAST of a contract, not a contract |
  | `MortgageRefinanceParams.monthlyRepayment` | `plan.ts:728` | no | NOMINAL | ✅ right, same caveat |
  | `Household.openingOffsetBalance` | `household.ts:528` | no | NOMINAL — a STOCK, already in `asAtDate`'s money | ✅ right; indexing it would count the price level twice |
  | `SuperInterest.balance` | `household.ts:117` | no | NOMINAL — a stock, and it grows by `nominalReturn` | ✅ right |
  | `Parcel.costBase` | `household.ts:428` | ~~no~~ **no, and from 1 July 2027 the LAW indexes the later part (LR-1)** | NOMINAL — what was actually paid, on a past day. CGT is computed on it | ✅ right as stored. ~~indexing it would be the repealed indexation method~~ **Superseded 2026-09-29 (LR-1):** Act 49 revives indexation for the gain after 30 June 2027 (s 110-36(1A), s 960-275(1B)). The stored figure stays nominal; `realisationFromJuly2027` indexes the stamp (`Parcel.valueJustBefore1July2027`, NOMINAL too) at disposal, on the plan's forecast `cpi`, and labels the line a forecast |
  | `Parcel.marketValue` | `household.ts:430` | no | NOMINAL — a stock, and it grows by `nominalReturn` | ✅ right |
  | `Person.workBonusBalance` | `household.ts:455` | no | NOMINAL — a stock of banked credit; its $300 and $11,800 limits are legislated and indexed by their own register | ✅ right |

  - ~~**Two rows, and only two, are wrong.**~~ **Two rows were wrong when this table was written; ONE
    is now.** Both were RECURRING stated figures, which is the shape O85 had — a figure stated once
    and charged for forty years. Every STOCK is right and every CONTRACTED figure is right.
    - ✅ **O87 was ruled and fixed on 2026-09-21 — see P4-21 below.** The fund's dollar
      administration fee is REAL and is raised to each month's price level.
    - ✅ **O86 was ruled CLOSED on the same day, the other way: the one-off figures stay NOMINAL.**
      The user's reasoning: *a one-off is an amount as at a date, so indexing is not relevant to it.*
      That covers `OneOffExpenseParams.amount` and the two non-super buy/sell amounts, which are the
      same family. **No figure and no behaviour changed** — what changed is that the question is no
      longer open, and the form label shipped in `b410f99` (*"Amount, as it will cost on the day"*)
      is the sentence that makes the ruling visible on screen.
    - ~~⚠️ **O88 is still OPEN and is the only row left.** It is not O87 applied twice: a salary
      sacrifice may want the WAGE series rather than prices, and that is a separate ruling.~~
      ✅ **RULED CLOSED 2026-09-21 (P6-8 brief 4): a stated salary sacrifice stays a FIXED NUMBER OF
      DOLLARS and does NOT index — neither at prices nor at wages.** The user's answer to the
      question the row asked, taken as stated. **No figure and no behaviour changed**, and that is
      the point: `test/plan-money-basis-inventory.test.mjs` §4 is left exactly as it stands, because
      what it pinned as a gap is now what it pins as the ruling, and `inflateStated`'s call-site
      count is unmoved. What a user who means *"a share of my pay"* does instead is state the new
      amount from the month it changes — or, from this date, **stop the arrangement** — which is the
      same mechanism `WORK_PATTERN_CHANGE` gives them for the pay itself.
  - ~~**Salary is reported and NOT touched**, on the brief's instruction and on its own merits: the
    repo has an AWOTE knob (P2-6, and P6-12 already indexes the concessional cap off it), a wage
    indexed at CPI is a pay cut nobody agreed to, and `WORK_PATTERN_CHANGE` states its own new salary
    from its own date — which is the mechanism a user has today for saying their pay rises.~~
    ✅ **SUPERSEDED 2026-09-23 by the user's ruling: pay rises with wages** — by the AWOTE rate, not
    the CPI, exactly as this bullet said it would have to. See "Pay: the retirement month and wage
    growth" under Phase 8. The sacrifice (O88) stays nominal, on its own ruling.
  - **The structural half, and what it is for:** §1 of the test file asserts that `inflateStated` has
    exactly ~~two~~ ~~three~~ **four** call sites (the salary, raised by WAGES, since 2026-09-23) and names the figure at each. A ~~third~~ ~~fourth~~ **fifth** figure
    cannot be indexed without that test going red, which is what makes the next ruling visible
    instead of quiet — **and it worked exactly once already**: O87's fix could not ship until the
    count was raised and its inventory row written, which is the whole device. It also sweeps
    `src/core` and `src/app` for a second exponentiation of the CPI, which is the one-fact-two-
    expressions failure `priceLevel.ts` exists to prevent.

- [x] **P4-19** ✅ **DONE 2026-09-21 — the stated SPENDING LEVEL is a REAL figure (register O85,
  user ruling, option (b)).** `SpendChangeParams.annualSpend` is raised to each month's price level
  by `project()` before the twelfth is taken, through `core/priceLevel.ts` — the one expression
  `Settings.contingencyFloor` has used since P4-14, so there is no second `(1 + cpi) ^ (n / 12)` in
  the codebase.
  - **The ruling, in the user's words, and it is wider than this field:** *"as we agreed earlier we'd
    always reflect cpi impacts."* A household that says *"I want to live on $150,000"* means the
    standard of living and not the banknotes; held flat, the walk modelled them getting quietly
    poorer every year, which made the money last longer than it would and put the shortfall date
    LATER than the truth — the flattering direction, and the opposite of this project's standing
    conservative rule.
  - **The basis is `Settings.asAtDate` and NOT the entry's own date.** Every box on this page takes
    today's money (P2-7), so a `SPEND_CHANGE` dated 2040 read as 2040 dollars would show the user a
    figure smaller than the one they had just typed — the complaint that raised O85 in the first
    place. It also keeps two `SPEND_CHANGE`s comparable: $84,000 for 2026 and $84,000 for 2040 are
    the same standard of living, which is what a reader of the entry list assumes.
  - **Raised BEFORE the twelfth**, so `monthlySpendFromAnnual` keeps the only rounding decision and
    its conservative round-UP stays the last operation.
  - ⚠️ **`ONE_OFF_EXPENSE` IS DELIBERATELY NOT INDEXED, and that is a stated non-decision — register
    O86.** A one-off is frequently a PRICE quoted for a dated purchase (*"the $40,000 car in 2030"*),
    which is nominal, where a spending level is a standard of living. Nothing in the field tells the
    two apart, so the build does not guess: it is left as it was, its direction is recorded (read as
    today's money it understates a dated cost and so FLATTERS), and **the form now says which money
    each box wants** — *"Annual household spending in today's money…"* against *"Amount, as it will
    cost on the day"*. A silent box beside a labelled one is read as agreeing with it.
  - **The flat-target warning in `incomeHeadline.ts` is GONE**, and its test is replaced rather than
    deleted: what is pinned now is the identity that made it unnecessary — **in the today's-money
    view the spending figure printed IS the figure typed**, because the walk indexes by the same
    factor the page deflates by and the two cancel. Seen on the rendered page: the demo plan's
    headline reads *"against the $84,000 a year you plan to spend"*, and the month table's spending
    line reads −$7,000.00 in today's money in all 501 months.
  - ⚠️ **WHAT IT COST THE COMMITTED DEMO PLAN, and it is the largest movement in this suite.**
    Shortfall Age `never` → **2055-12** (Dana 87, Ash 95), 150 short months; Pension-Only Age →
    2056-01; the Offset empties in 2041-01 instead of 2044-12; the $700,000 floor is breached in 371
    months instead of 192; and **concept.md's own $100,000 default floor is breached for the first
    time in this repo's history** — 171 months, from 2054-03. The `SHORT_MONTHS` marker fixture moves
    2056-04 → **2044-07**.
  - ⚠️ **AND ONE MOVEMENT RUNS THE OTHER WAY: the demo couple's Age Pension months go 99 → 432.** A
    household that spends more holds less, and a household that holds less is assessed on less. The
    pension partly offsets the higher bill, which is why the first shortfall is 2055 and not 2048 —
    means-test feedback is a term in every asset prediction on this plan.
  - **THE ZERO-CPI CONTROL, run rather than asserted.** With the factor forced to `cpi = 0`, HEAD's
    ENTIRE test suite passes against the new engine — 1,964 of 1,971, the only failure being the
    prose test for the warning this change deletes. **Not one figure anywhere in the suite moved for
    any reason but the price level.** The walks are byte-identical at nil and differ at 2.5%.
  - **THE CONSERVATION IDENTITY the re-derivations were checked against:** deflate a month's own
    spending line by that month's own price-level factor and twelve of them are the annual figure the
    user typed, in EVERY month — bounded above by the twelfth's round-up (11 cents of annual figure)
    and below by `mulCents`'s round-to-nearest (half a cent), with no drift that grows with the walk.
    It is asserted over all 24 months of `core-projection-waterfall.test.mjs` §8.
  - **Fixtures: fourteen core files went to `cpi: 0` — the algebraic control, not a special case** —
    exactly as `app-todays-dollars.test.mjs` does for the Contingency Floor under P4-14, because
    their hand-worked figures are about the Waterfall, the drawdown and the means test rather than
    about indexation. Every demo-plan fixture kept the live 2.5% and was re-derived from the
    mechanism: the first released-super draw is 2041-01 because that month's bill is
    $84,000 × 1.025 ^ (172/12) ÷ 12 = $9,972.57 rather than $7,000.00, and the Offset it empties is
    the same $2,553.16 either way.
  - **Two mutations applied, counted, reverted: flattening the factor kills 31 tests**, and pointing
    the basis at the month itself kills the same 31. The entry-date mutation is killed by
    `app-plan-edits.test.mjs`, whose `SPEND_CHANGE` is dated 2030-01 — on the demo plan the level is
    dated `asAtDate` and would not have shown it.
  - ⚠️ **COLLATERAL, NOT FIXED AND RECORDED INSTEAD: `scripts/moneysmart-baseline.mjs` and
    `scripts/moneysmart-limb3.mjs` `--spend-basis real` now DOUBLE-INDEX.** They emit one
    `SPEND_CHANGE` per year at `1.025^k` because the engine did not index, and the engine now does.
    Their `nominal` basis has become the real one. It is NOT silently repaired: their deflator chain
    is `1.037 × 1.025^(age − 67)`, which has a kink the engine's own factor does not, so collapsing
    them to one entry would change the comparison's methodology and that is the next Moneysmart
    run's decision. Both script headers carry the warning.

- [x] **P4-5d** ✅ **DONE 2026-09-21 — the Pension-Only Age, SAID.** `src/app/incomeHeadline.ts`,
  `test/app-income-headline.test.mjs`, and a `#income-headline` block at the top of the page above
  the home loan one. `pensionOnlyAge` has had no consumer since it was built; this is its first.
  - **The user's question, in their words:** *"the thing a person wants to know is 'when does super
    and pension stop covering the desired income'."* They reported it as disconcerting that the Age
    Pension did not show as contributing to their income at all.
  - ⚠️ **AND THE ANSWER IS A SENTENCE RATHER THAN THE INCOME CHART IT LOOKS LIKE IT WANTS.** In this
    engine an income stack is very nearly uninformative: the Income Waterfall funds each month by
    drawing whatever the month needs, so a stack of income against the spending target hugs the
    target by construction — flat, exactly on the line, for decades, then a cliff. What the reader
    wants out of that picture is a DATE and a GAP, and both are better said than drawn. **An income
    chart remains unbuilt and is a separate piece of work**; nothing here is a step towards one.
  - **SIX ANSWERS, each with its own `kind` and its own sentence, because a field that can be empty
    for six reasons is where this repo has shipped a blank.** `ownMoneyLasts` (good — and the
    committed demo plan's own answer), `pensionOnlyShort` (the headline case, with the gap),
    `moneyRunsShort` (bad — short months and no pension-only month, and it must never wear the good
    answer's words), `pensionOnlyCovers` (a low spender; no hardship is implied), `pensionOnlyNoTarget`
    (a plan stating no spending — **not in the brief's list**, and reachable), and `notWorkedOut`
    (`pensionOnlyAge`'s refusal, caught and said in plain words, never turned into a `'never'`).
  - **The demo plan's actual answer**: *"Your own savings and super cover everything you plan to
    spend, right through to 2068-05 … You never reach a month where the Age Pension is all you have"*,
    with **Dana is 99 then / Ash is 108 then**. Raise its spending to $150,000 and it becomes
    *"From 2043-11 … about $31,754 a year, in today's money, against the $98,174 a year you plan to
    spend. That leaves you about $66,420 a year short."*
  - ⚠️ **THE PENSION-PAID COUNT GOES ON EVERY ONE OF THE SIX**, because the demo couple is paid in
    **99 of its 501 months** — so *"on the Age Pension alone"* can mean *"on very nearly nothing"*,
    and nothing on screen may imply the full rate. It is a COUNT of months carrying the line and
    **states no reason for the unpaid ones**: the first draft said the household was above the means
    test limits, which is false for every month a Person is simply not old enough yet.
  - ⚠️ ~~**AND A FINDING WORTH ITS OWN LINE: the spending target is FLAT in the engine's own future
    dollars.**~~ ✅ **SUPERSEDED 2026-09-21 — the user ruled the target REAL (register O85, option
    (b)), and the warning this paragraph describes is gone from the page. See P4-19. The paragraph
    is kept because it is the argument that produced the ruling.** A `SPEND_CHANGE` states one figure and the walk emits a twelfth of it every month
    until another supersedes it — nothing indexes it. Shown in today's money it therefore SHRINKS
    the further out the marker is ($150,000 stated in 2026 reads as $98,174 in 2043 at 2.5% CPI),
    and a user who typed $150,000 and is shown $98,174 will think the tool lost their figure. The
    sentence says so out loud, and only where it can bite. **Whether the target SHOULD index is a
    question for the user and is not decided here.**
  - **Three small exports were added rather than second copies written**: `HOUSEHOLD_SPENDING_LINE`
    (`projection.ts`, replacing a literal at its one emission site), `agesAt` (`outcomes.ts`, for the
    ages of a month no marker names), and `MONEY_VIEW_PHRASE` (`todaysDollars.ts`, the money view's
    wording cut down to fit inside a sentence).
  - **Twenty mutations applied, counted and reverted, and every one killed.** The four that matter:
    the good answer wearing the bad answer's shape (2), the bad answer wearing the good answer's
    words (1), the refusal answered as a `'never'` (2), and **the gap computed from the raw cents
    instead of from the printed figures — which survived the first battery at zero tests**, and now
    fails one: a 61 × 4 sweep of offsets and spending levels found ~60 fixtures where the two routes
    differ by a dollar, and the test pins one of them by parsing the three figures back out of the
    headline. `test/core-div293-charge.test.mjs`'s whole-description counter moves 4 → 5 with the
    new site named, and the one membership test it does NOT count is recorded rather than hidden.

- [x] **P4-5b** ✅ **DONE 2026-09-18 — `pensionOnlyAge(months, household, series)` in
  `src/core/outcomes.ts`, with `test/core-outcomes-pension-only-age.test.mjs` beside it.** Both
  requirements the 2026-09-18 recon found are built and each is closed by its own fixture with a
  dollar figure: the marker month must OPEN with nil cash (§3 answers `'never'` for a Household with
  nil assessable assets, no wage, an `Age Pension` line and **$254,483.76** in the bank; §4's month
  before the marker opens with **$5,071.56** and is not the marker), and an absent
  `economicSeries.agePension` is **REFUSED** rather than answered (§6, and the boundary is exact —
  the nine months inside the published window are answered, the tenth refuses).
  - ⚠️ **FOUR FIGURES IN THIS ENTRY AND IN P4-5c BELOW WERE MOVED BY P4-3b ON 2026-09-18, and the
    entries are left standing rather than rewritten because the reasoning is still the reasoning.**
    Once the Offset is assessed and deemed at its current balance, §3's worker banks a slightly
    smaller pension every month for five years and §4's runs dry a month sooner. Read
    **$254,483.76 → $247,730.19**, **$5,071.56 → $4,236.53**, the §4 marker **2033-11 → 2033-10**,
    and **twenty-eight months → twenty-seven**. $124,255.08, $338,486.36, $149,396.64's successor and
    §9's $26,865.89 did not move. The marker's RULE did not change: the exhaustion moved, and the
    marker followed it. §3's premise *"nil assessable assets in all 120 months"* died with the
    ruling and the fixture was re-expressed rather than renumbered — see **P4-3b**.
  - ⚠️ **A THIRD POOL THE RECON DID NOT NAME, FOUND IN THE BUILD: `protectedAssets`.** A younger
    partner's Accumulation Phase super is exempt from BOTH means tests (§4.8) and lands there at its
    full balance while the OLDER partner's claim is assessed — so `assessableAssets === 0` can hold
    while the Household holds **$338,486.36** of super, which §5 asserts over 166 such months. The
    marker requires `protectedAssets === 0` too; an occupied home pays nothing for that, because the
    home is protected and carries no value.
  - **The reading taken: exhaustion is an EVENT, living on the pension is a STATE.** The marker month
    needs nil opening cash; the months after it need only nil assets and no inflow but the Age
    Pension and `Unfunded shortfall`. Requiring nil cash EVERY month would answer `'never'` for a
    thrifty Household — §2 banks $1,231.35 of its first pension-only payment and climbs to
    $124,255.08 — and requiring it in no month would mark a Household with a six-figure Offset as
    pension-only in any month its pension happened to exceed its bill. `monthsPensionOnly` counts the
    run and `recoveredAt` reports where it broke (§7: a $20,000 buy out of banked pension money, and
    the one-month lag to 2033-02 is ADR-0005's first-of-the-month split, not an off-by-one).
  - **INDEPENDENT OF THE SHORTFALL AGE, asserted from both sides.** Two walks with the SAME
    Pension-Only Age (2030-07) and shortfall answers 73 months apart — §1 is short for all 73
    remaining months, §2 for exactly one. Nothing in `pensionOnlyAge` reads `shortfallAge`.
  - **The refused proxy cannot be reached by accident**, and the fixtures say so in months: §4's
    *"first `Age Pension` line and no `Salary, …` line"* is 2031-07 and the marker is 2033-11.
  - **NINE MUTATIONS, all killed** (each run against this file and the Shortfall Age file): dropping
    the `protectedAssets`, opening-cash, pension-line-present, no-other-inflow, `direction ===
    'inflow'` or either coverage-bound check; taking the LAST marker instead of the first; and
    requiring nil opening cash for every month of the run. ⚠️ **The lower-bound coverage check
    survived its first fixture** — a one-month walk has `first === last`, so the upper-bound check
    caught it — and the fixture is now a six-month walk opening in 2026-02, outside the window at the
    START and inside it at the end.
  - **NAMED FOLLOW-UP, not built:** the *"first month of the final unbroken run"* reading, which
    `shortfallAge` reports as `pointOfNoRecovery`. `recoveredAt` gives a caller the break in the
    first run, so no one can hold the first reading believing it is the last; a Household that
    empties, recovers and empties AGAIN gets the first break reported and not the second. Cheap to
    add on the same loop the day a caller wants it.
    - ✅ **DONE 2026-09-18 (P4-5c): `PensionOnlyAge.pointOfNoRecovery`**, the same name
      `shortfallAge` uses for the same reading, walked BACKWARD from the horizon on conditions 1 to
      4 like `fallsShort` beside it. §9 is the fixture that needed it: pension-only from 2030-07,
      a $20,000 buy, then the parcel sold to a restored $160,000 bill and pension-only again from
      **2033-09** for the last 34 months — 38 months after the marker, which `recoveredAt` alone
      could not say. No boolean was added: `recoveredAt !== undefined` already IS `recovered`.
      ⚠️ **The backward walk is FLOORED AT THE MARKER, and that floor is load-bearing in two
      fixtures already here.** Conditions 1 to 4 need no nil cash, so they hold for §3's Household
      from the month its wage stopped to the horizon — 60 months with $254,483.76 in the bank — and
      for §4's from 2031-07, twenty-eight months before its money ran out. An unfloored walk
      reports 2031-07 in a walk whose answer is `'never'`, and reproduces the refused retirement
      proxy exactly in §4. Condition (5) is still NOT re-checked on the run itself: §9 re-enters
      the state holding **$26,865.89** of parcel proceeds and is named there, four months before
      that run's first nil-opening month. Six mutations, all killed (floor to index zero; the
      `'never'` branch reporting the walk; (5) re-checked; off-by-one; the horizon guard dropped;
      the field derived from `recoveredAt` — the pre-P4-5c information, which §9 kills).
  - **`AGE_PENSION_LINE` is now exported from `projection.ts`** and the walk's own emission uses it.
    A marker defined in terms of a line description must not spell that description independently of
    the walk, or it answers `'never'` the day the wording changes.

  **The recon's own scoping notes are kept below**, because the two requirements above are only
  defensible with the reasoning that found them.
  CONTEXT.md: *"the age at which all assets are exhausted and the Household lives on Age Pension
  alone."* This entry used to say **"in this engine no asset can be exhausted"**, on the grounds that
  `splitAssets` re-read the STATIC `Household` and that limbs 2 and 3 both drew nil. **That sentence
  is RETRACTED.** Chunk 5a made the assets a month reports that month's, and chunk 5b draws limb 2's
  Sch 7 minimum, so **a super balance falls and can reach nil** — a fixture in
  `test/core-projection-pension-drawdown.test.mjs` walks one to zero and holds it there.
  ~~**What blocks it now is narrower and is the more useful fact.** Limb 2 is capped at the MINIMUM,
  and the minimum is a PROPORTION of the balance the year opened with (4% to 14% by age). A
  proportion of a balance never empties it: at any non-negative `nominalReturn` the balance
  asymptotes and never reaches nil, and at the plan's own 6.5% it GROWS. Exhaustion is reachable
  only through a catastrophic return. So the marker is now *computable* and would answer **never**
  for essentially every Household this tool is for — technically defined, substantively empty.
  **Unblocked by:** something that draws a super balance ABOVE its minimum — i.e. a decision that the
  Account-Based Pension is a pool the Household may SPEND, not one it must merely take a floor from,
  which is a change to what concept.md §4's Waterfall means and not a gap in `outcomes.ts` — plus
  P3-20c / P3-21 for limb 3.~~ ~~**P4-1c's forward-indexation residual bears on it too**: that entry
  already names *"P4-5's Shortfall Age and Pension-Only Age"* as what it blocks, and a marker named
  after the Age Pension cannot be built on a rate set that stops at 2027-03.~~

  ⚠️ **ALL THREE OF THE BLOCKERS STRUCK THROUGH ABOVE ARE DISCHARGED — read-only recon, 2026-09-18,
  and the text is superseded rather than deleted because the reasoning was right when it was
  written.** (i) The MINIMUM-AS-CEILING premise died at `9a767fa` the same day: the user ruled the
  Sch 7 figure a FLOOR, `accountBasedPensionMinimumLimb` offers *"the whole account"*, and a pension
  is spendable to nil at any return. (ii) **P3-21f shipped 2026-09-18** — limb 3 draws, so *"all
  assets"* no longer includes a pool that cannot move. (iii) **P4-1c was discharged 2026-09-16 by
  `a3daffc`**, so the 2027-03 cliff is gone WHERE A SERIES IS SUPPLIED — see the caveat below.
  - **The precondition is now EMPIRICALLY TRUE, not merely plausible from the doc comments.** A
    recon walk of a couple both 70, holding $240,000 of Account-Based Pension and $140,000 of
    parcels against $160,000 a year of spending, drives `assessableAssets` to **exactly nil in
    2030-06 and holds it at nil for all 78 remaining months**; the ABP pays out to zero by 2028-10
    and the last parcel sells in 2030-05. From 2030-06 the only inflow descriptions in the whole
    remainder of the walk are `Age Pension` and `Unfunded shortfall`. Nothing in the model prevents
    the state from being reached or from being held.
  - **AND THE MARKER IS NOT A SECOND SPELLING OF THE SHORTFALL AGE**, which is the thing worth
    knowing before it is built. In that first walk the two coincide to the month, because a household
    that spends more than the pension falls short the instant its assets are gone. Drop the spend to
    $40,000 from 2030-07 and the same household still empties at 2030-06, falls short in that ONE
    transition month, and then lives on the pension alone for six and a half years with a closing
    balance that climbs to $149,396.64. Pension-Only Age is a fact about ASSETS; Shortfall Age is a
    fact about the TARGET. They are independent and the second scenario proves it.
  - ⚠️ **THE BLOCKER THIS ENTRY NEVER NAMED, AND IT IS THE ONE THAT IS LEFT: `assessableAssets === 0`
    IS NOT "ALL ASSETS ARE EXHAUSTED".** `closingBalance` IS the Offset Account (P4-3b) and is limb
    4's drawable pool, and `splitAssets` never sees it — the walk's running cash is not in the means
    test and not in either reported asset figure. The second scenario above is the proof: **nil
    assessable assets and $149,396.64 of drawable cash in the same month.** A marker built on
    `assessableAssets === 0` alone would announce that a household lives on the Age Pension alone
    while it holds six figures of spendable money — the *same* class of false statement as the
    refused proxy below, reached by a different route. Whatever is built must require the Offset to
    be nil too, and must say so in its own doc comment.
    - **SUPERSEDED IN ITS MECHANISM BY P4-3b, 2026-09-18, and NOT in its conclusion.** *"`splitAssets`
      never sees it"* stopped being true when the user ruled that the Offset is assessed at its
      CURRENT balance: the running cash IS in the means test and IS in `assessableAssets` now. The
      requirement above survives that unchanged and is what `livesOnPensionAlone` condition (5)
      implements — because conditions 1 to 4 deliberately EXCLUDE the Offset (exhaustion is an EVENT,
      living on the pension is a STATE), so the same false positive would reopen one level up without
      it. The recon figure in this entry is pre-ruling: on the current build the second scenario
      closes at **$124,255.08** and the §3 worker holds **$247,730.19**, both smaller because deeming
      on the banked cash now cuts the pension that was being banked.
  - ⚠️ **AND THE PENSION SERIES IS OPTIONAL, so P4-1c's discharge does not travel with the
    Household.** `EconomicSeriesSetting.agePension` is `?`; omit it and the recon walk emits an
    `Age Pension` line for **9 of 125 months** and none after 2027-03, exactly as before the fix.
    For **P4-5a** that direction is safe and already declared — a missing pension line makes the
    Shortfall Age EARLIER than the truth. **For this marker it is NOT the same failure mode.** With
    no pension the assets are consumed faster, so assets-nil arrives EARLIER *and* the household is
    not living on the Age Pension at all in the months the marker would name — it is living on a
    line the walk declines to compute. An early Shortfall Age is a conservative answer to the right
    question; a Pension-Only Age computed off an absent pension is a confident answer to a question
    the walk cannot yet answer. So the marker must either require `economicSeries.agePension` to
    cover the walk or refuse, and that refusal is a decision for whoever builds it.
  - **The tempting proxy is still refused on the record**: *first month with an `Age Pension` line
    and no `Salary, …` line* is a RETIREMENT age, and would announce that a Household lives on the
    pension alone while it still holds the whole of its super — a false statement about assets
    dressed as a computed marker. **Do not resurrect this shape**; its discharge is not implied by
    anything above.
- [x] **P4-6** Contingency floor as a **continuous** constraint, checked every month — ✅ **2026-09-18.**
  `contingencyFloorBreach(months, household, floor)` in `src/core/outcomes.ts`, a sibling of
  `shortfallAge`, plus **`Month.accessibleAssets`** — the first liquidity figure the model has held.
  - ⚠️ **THE RULING THAT COST SOMETHING: the floor binds REACHABLE MONEY, not total wealth.**
    `concept.md:53-55` says only *"for late-life costs … a floor the balance never crosses"*, and the
    two readings are not the same number. Total wealth (`protectedAssets + assessableAssets`) was
    **free** — readable off a `Month` with no `project()` change — and was **rejected by the user**:
    it passes a household with $900,000 preserved and $9,000 in the bank, which is the flattering
    direction. The fixture that justifies the ruling asserts BOTH readings side by side on one walk
    (`$909,000` of wealth, `$9,000` reachable, breached in all 44 months).
  - **`accessibleAssets` = Offset + Non-Super Portfolio + super that has MET a Condition of Release**
    (an Account-Based Pension unconditionally — `retirementPhaseInterest` already passes
    `requireBenefitAccess`). **Reachability is decided by `conditionOfRelease.ts`, not re-derived**:
    no age comparison is written in the new code. TTR is gated exactly as accumulation.
  - **Two declared residuals, in opposite directions.** (i) The **employment ground can never fire** —
    `Person` holds no cessation date and a `RETIRE` entry is a flag, so only the age-65 item-106
    ground can make `met` true. Under-states reachable money → earlier breach, the safe direction.
    Inferring a cessation from `RETIRE` would also make `CessationBeforePreservationAgeError` a live
    refusal inside `project()`. (ii) **Released accumulation super is reachable in law and unspendable
    by any LIMB of this engine** — the flattering direction, taken deliberately. ✅ **FULLY
    DISCHARGED 2026-09-19 — first by ENTRY, then by LIMB 5 the same day.** The wording is kept in
    frame because it was true for months, and its reasoning is still why the limb was placed LAST.
    Superseded mid-sentence: `LUMP_SUM_FROM_SUPER` is specified and an entry now draws it, so the
    residual is no longer "unspendable" — it is "unspendable unless the plan says to spend it". The
    automatic limb remains deliberately unbuilt and is still an open question (a fifth limb changes
    `Month.notes` in every month of every projection); the residual's own wording above is kept
    because it is still true OF THE WATERFALL.
  - **Settled by precedent, and recorded so it is not re-litigated:** first breach is the marker with
    `pointOfNoRecovery` beside it; the backward walk is `shortfallAge`'s and is **unfloored** (a
    balance test is one predicate with no event/state split, so it cannot precede the first breach —
    unlike `pensionOnlyAge`, whose floor exists for that reason); breach is **strict** `<`; an empty
    walk and a `floor <= 0` both throw; and **the floor is a required positional argument, not a
    `Settings` field** (`plan.ts:53-55` forbids optional fields; a required one moves 37 settings
    literals across 17 test files). The persisted field is **P8-1**'s shape question; **P7-4** draws
    the line and **P10-2** is the solver consumer.
  - **Opening vs closing, and it was NOT resolved by touching the existing fields.**
    `accessibleAssets` is at the CLOSE (offset = `closingBalance`, super less this month's draw,
    parcels after this month's disposals **and** buys — a buy's cash is already out of
    `closingBalance`, so omitting the parcel would report money vanishing) and excludes growth,
    matching `closingBalance`. `assessableAssets` is at the month's OPENING cash (P4-3b part 3), so
    the two are **one month's transactions apart by construction** — visible as a $20,000 gap in the
    §2 fixture and asserted there.
  - ⚠️ **NO EXISTING FIGURE MOVED, and the two byte-digest pins prove it rather than being refreshed.**
    `digestOf` in `test/core-non-super-parcels.test.mjs` now also hashes the walk with
    `accessibleAssets` STRIPPED, and that digest and byte length are asserted against the **pre-P4-6**
    captures (`3b796bb…` / 68,892 and `BEFORE_EMPTY` / 65,828) — byte-identical. The new full digests
    are pinned beside them so the assertion still bites. **A refreshed digest proves nothing about
    whether a figure moved; a stripped-walk digest proves it did not.**
  - **Mutations, all compiled, each restored by re-editing and re-greened at 1057/0:** (a) `<` → `<=`
    kills **2** (both fixtures land a month exactly ON $100,000.00, and one of them IS the recovery);
    (b) `pointOfNoRecovery` = first breach kills **1** (2027-11 vs 2028-02); (c) preserved super
    included in `accessibleAssets` kills **6**, named victim the $909,000/$9,000 fixture; (d) the
    `floor <= 0` refusal removed kills **1**.
  - **The recovery mechanism in the breach→recover→breach fixture is a Condition of Release**
    (Sam turns 65, $60,000 released), not an inflow — the only mechanism in this engine that raises
    reachable money **without moving money**, and what makes `firstBreach` and `pointOfNoRecovery`
    genuinely different months.
- [x] **P4-7** ✅ **CLOSED 2026-09-21 after four runs — `docs/moneysmart-run4-2026-09-21.md`.**
  **It validated three of the four things it could have, and the reference tool disqualified itself
  on the fourth.**
  - ✅ **FEES — CONFIRMED QUANTITATIVELY, the first clean numerical result of the whole exercise.**
    Run 3 charged no pension-account fee; run 4 charges 0.14% + $69/yr. Solving for the real return
    that exhausts the balance at 92: **3.3093% → 3.1350%, a drop of 0.1743 points** against
    **~0.1515 predicted** from the stated fees. The residual is explained rather than waved away —
    **the flat $69 bites harder as the balance shrinks** (0.0115% of $600k but 0.035% of $200k).
    **Derived from the BALANCE PATH, so the pension defect below does not touch it.**
  - ✅ Also validated: the **assets-test free area and taper** (run 3 back-solved them to within
    **$52** of the stated balance), **growth compounding**, and the **depletion age**.
  - ⚠️ **NOT VALIDATABLE — THE AGE PENSION, which is the single biggest genuine overlap.** Run 3's
    frozen model (today's max rate held flat for 34 years, never indexed) predicts **run 4's** tail
    **to within 0.02%** at every age without refitting, and the year-on-year freeze fits **to the
    dollar**. **Two runs show the frozen behaviour, run 1 showed the indexed behaviour, on the same
    stated assumptions.** It contradicts their own PDF p8. **THE RULING STANDS AND IS BETTER
    EVIDENCED: do not change `enough` to match it** — we index off a dated `economicSeries` and are
    the more correct of the two.
  - **A prediction written down before the run, and it held:** income would FALL with fees charged.
    $51,853 → **$51,335**. A rise would have been a stop condition.
  - **Insurance was entered at $599 and NOT charged** — the balance fell only **$141**, the $59 admin
    fee alone. Confirms their stated rule that premiums stop at the earlier of 65 or retirement, and
    the household is 66. A useful thing established by accident.
  - ⚠️ **TWO TRANSCRIPTION SLIPS were caught by a row-sum invariant** (every year 67-91 must total
    the level income): age 72 carried run 3's figure over, age 80 duplicated age 79's. **Keep an
    invariant the rows must satisfy — it is what makes a hand-typed table checkable.**
  - **Never in scope for this shape:** income tax (they apply none to retirement income and say so,
    p14), CGT, salary sacrifice, the Superannuation Guarantee, Division 293.
  - ⚠️ **Still open and NOT closed here:** run 1's accumulation year ran +1.776% where its own rates
    predict +2.314%, and run 4's balance sits **$141** below run 3's on a change that should cost
    $59. Same scale of unexplained discrepancy in both. **Do not treat a divergence of that size in
    `enough` as a defect until it is explained.**
  - Superseded original text follows.
  ⚠️ **Validate the baseline against Moneysmart** — **RE-SCOPED 2026-09-17, and
  the old wording was not executable.** It read *"validate the no-entry baseline"*, with no
  acceptance criteria anywhere in this file. Two read-only recon passes established that **a literal
  no-entry baseline is not a retirement scenario at all**: with `entries = []`, `annualSpend` stays
  `undefined` and `retired` never flips — only `SPEND_CHANGE` and `RETIRE` set them
  (`projection.ts:1296,1299`) — so the household works to the planning horizon, spends exactly $0,
  and net income piles up in the closing balance. That answers *"what if I worked until 100 and never
  bought anything"*. Moneysmart answers *"what income will I have in retirement"*. There is no
  discrepancy to measure because they are not the same question. **Do not restore the old wording.**
  - ⚠️ **What Moneysmart actually is, and why it is not automatable.** It is not ASIC code: the
    page is a shell that loads a **Willis Towers Watson** Angular widget, and every projection is a
    POST to a **closed server-side actuarial engine** (`apps-au.willistowerswatson.com/fwb/api/projection`),
    HMAC-signed with a key embedded in the bundle. **No public API, no URL-parameter form, no
    client-side formulas to read.** Calling that endpoint directly is unsanctioned-use risk and is
    **ruled out**. A human typing into the form is the only legitimate route to a comparison figure
    — the user has taken that on. The **assumption constants are separately fetchable as static
    JSON** and need no UI: `…/fwb/assets/data/retirement/local-content-asic-en-au.json` (the
    "Assumptions we made" text) and `local-init-data-asic.json` (defaults). Stamped **July 2026**.
  - ⚠️ **The calculator REFUSES our natural scenario.** Verbatim: *"This calculator is not
    appropriate for members who are already retired and drawing an account based or other
    retirement-phase pension"*, and it *"does not allow for circumstances where a member has a
    previously established an account-based pension"*. So a drawdown-phase-only comparison — the
    obvious shape, and the first one proposed — **is dead**. It was proposed and withdrawn on
    2026-09-17; anyone reaching for it again should read this sub-item first.
  - **THE SCENARIO, and why it has this shape: make the accumulation phase one year long and empty.**
    **Current age 66, retirement age 67, salary $0.** SG is then nil (no salary to contribute on),
    insurance premiums are nil (they stop at the earlier of 65 or retirement anyway), and a single
    year separates the inputs from the drawdown under test. This keeps the calculator inside its
    supported envelope **and** makes the three things `project()` has no code path for contribute
    **zero** rather than needing reconciliation. Single, homeowner, super $600,000, **personal
    assets $0** (override their $25,000 default — it makes the ABP the only assessable asset, so any
    Age Pension divergence traces to one number instead of two), no investment assets, no other
    income, Age Pension included, inflation 2.5% / wage growth 3.7% left at their defaults.
  - **What to compare.** Results frequency set to annual, and the generated PDF carries the
    year-by-year arrays: balance at retirement (today's dollars **and** nominal); average estimated
    income p.a. and its **Age Pension component**; year-by-year income from age 67 split into
    *pension-account drawdown* vs *Age Pension*; year-by-year balance; the "super runs out" age.
    **Everything is in today's dollars** (their deflator is 2.5% post-retirement), so `enough` output
    must be deflated before any figure is set beside theirs. Getting this wrong manufactures a
    divergence that is purely a units error.
  - ⚠️ **Two divergences that will remain and are NOT defects — do not "fix" the engine to close
    them.** (1) **Fees.** Moneysmart charges pension admin of $69 p.a. + 0.14% of balance capped at
    $900, and quotes returns **net of investment fees and tax**; `enough` has no fee concept anywhere
    in `src/` and `nominalReturn` is **gross**. `enough` will run consistently rich. **Size this
    before trusting any residual** — an unsized fee gap will be misread as a model error.
    (2) **Retirement income tax.** Moneysmart applies **none**: *"No income tax has been applied to
    estimated retirement income in the results of the calculator."* `enough` computes income tax and
    Medicare every month. For this household they **should** agree anyway — ABP income after 60 is
    tax-free and the Age Pension plus deemed income sits under SAPTO — but that is a **prediction,
    not an assumption**. If they disagree, that is a genuine finding on our side and must be chased,
    not explained away.
  - **The overlap this gate actually validates is narrow, and saying so is the point — NARROWER
    AGAIN once the run was done, see RESULT below.** As designed it was expected to cover Age Pension
    means-testing, the ABP minimum drawdown and growth compounding. **The run exercises NEITHER the
    minimum drawdown NOR deeming** — the assets test binds every means-tested year and the draw never
    approaches the minimum from above. What it really covers is the **assets test, Age Pension rates
    and indexation, and growth compounding**. **It is NOT a whole-of-model check.** The **accumulation phase is off the
    table entirely** until `superGuarantee()` gets a caller — it exists in `superContributions.ts`
    and `projection.ts` **does not import it** — and likewise contributions tax, Div 293 and Div 296
    have no path from `project()`. Anyone reading "validated against Moneysmart" as "the model is
    right" will be wrong.
  - **A free regression vector needing no UI at all:** `…/fwb/assets/data/retirement/local-get-pdf-asic.json`
    is a complete saved run — single, age 45, $0 balances, $50,000 salary, retire 67 — carrying full
    annual `income[]` and `bal[]` arrays. Outputs `incomeR` $42,278.54 p.a. and `balR` $173,082.09
    (today's dollars), `balRFV` $363,704.82 nominal, run-out 92. Its **accumulation phase is
    untestable for us** (SG-driven, and we have no SG), but its drawdown years are free validation.
    Its country data is stamped `2025-09-01` — Age Pension single rate $30,646.20 there against
    $31,223.40 at July 2026 — so **re-stamp before use** or the comparison is against stale law.
  - ✅ **RESULT — the run was done 2026-09-17 and the gate has an answer.** Baseline committed at
    `672626b`: `docs/moneysmart-baseline-2026-09-17.md` (inputs, the hand-typed 34-row annual series,
    the reverse-engineered model) beside `docs/ASIC Retirement Planner.pdf`. Harness at
    `scripts/moneysmart-baseline.mjs` — it **asserts nothing and is not in the suite**, deliberately:
    the honest expected result here is divergence, so a green test would be the wrong shape. Six runs
    behind flags; no input was tuned to move a figure toward a baseline number.
    - ✅ **THE CORROBORATION, and it is exact.** Our single Maximum Payment Rate at 2026-07-01 is
      120,090c per fortnight — basic $1,100.30 + Pension Supplement maximum $86.50 + Energy
      Supplement $14.10 — **$31,223.40 a year, matching to the cent the rate back-solved from
      Moneysmart's printed output before our tables were consulted.** Two independently sourced
      paths to the same cent. Verified straight out of `dist/`, not through the harness. The only
      residual is a **currency step in THEIR favour to fix: we carry the 20 September 2026
      indexation to $32,180.20; their July 2026 stamp does not.** Theirs is stale, not wrong.
    - ⚠️ **THE STRUCTURAL GAP: `enough` NEVER EXHAUSTS. Baseline runs dry at 92; we do not, in any
      of six runs.** The cause is one number — at 67 we draw **exactly 5.00%**, the Schedule 7
      minimum. Limb 2 offers the minimum and no more, so a level-income solve's 8.99%-and-rising
      draw is unreachable. We report **$125,452 of unfunded shortfall** instead, and the balance
      **turns upward at 88**. **This is a declared absence, not a defect, and P4-3 predicted it in
      those words** — it stands there that a nil limb "would manufacture an `Unfunded shortfall`".
      It did. **It also cascades:** a balance that does not fall keeps the assets test binding,
      which is essentially the whole −$13k to −$25k pension gap from age 70 on. Do not read that
      column as a means-test defect.
    - ⚠️ **SUPERSEDED 2026-09-21 (register O85): `annualSpend` IS REAL NOW, and this paragraph is the
      finding that argued for it.** The engine raises the stated level to each month's price level,
      so the mismatch below is closed — and **`scripts/moneysmart-*.mjs --spend-basis real` now
      DOUBLE-INDEXES** (it emits one entry per year at 1.025^k and the walk raises each of them
      again). Do not run either script against a real-basis target without reading P4-19 first.
    - ⚠️ ~~**`annualSpend` is NOMINAL and their target is REAL — found by running it, not by reading.**~~
      `SpendChangeParams.annualSpend` is a level nothing indexes; their $64,370 is a today's-dollars
      income held flat for 25 years. **A single `SPEND_CHANGE` of $64,370 is therefore a DIFFERENT
      SCENARIO, not a different engine** — it asks for real spending decaying to $27,380 by age 100,
      which is why the shortfall vanishes after 76 and the balance turns. The real-indexed run (34
      entries at their level and their 2.5%) shortfalls in **all 34 years, $428,063**. Anyone
      comparing a today's-dollars target against this field without indexing it will get a
      confidently wrong answer.
    - **The doc's two residuals moved, in OPPOSITE directions.** *Accumulation:* at Conservative
      **5.6%** we land $610,993 against their $610,657 — **0.055% apart**; at Balanced 6.1%, $3,229
      apart. **This materially reopens the "they apply pension-phase returns before 67" hypothesis**
      the baseline doc had set aside. *Drawdown:* our growth-only probe compounds at **exactly
      3.024% real**, the predicted figure — so their implied 3.150% **is theirs**, and is still
      unexplained.
    - **Ours, small, and knowable:** our assets free area is **$333,000** flat in today's dollars
      against their back-solved $331,670 — about **$104/yr** of pension, below the noise of
      everything above.
    - ⚠️ **`RETURN_CHANGE` carries `UnspecifiedParams`, so their Balanced→Conservative glide path
      CANNOT BE EXPRESSED.** Reported, not worked around. The harness runs one rate at a time.
    - **What this gate now says is blocking:** until an **above-minimum drawdown** exists, no
      scenario whose spending exceeds the minimum can be compared against any external authority at
      all. That is the live successor question — see **P4-3** limb 3 and **P4-5b**.
    - ⚠️ **RUN 3 IS DONE — 2026-09-21, `docs/moneysmart-run3-2026-09-21.md`. THE REFERENCE TOOL IS
      WRONG ABOUT THE AGE PENSION, AND `enough` MUST NOT BE CHANGED TO MATCH IT.**
      - **Their Age Pension is NOT INDEXED in run 3** — it is today's nominal maximum ($31,286) held
        flat for the whole 34-year projection. Fit: `31,286 / 1.025^(age−67)` less the assets-test
        abatement, **exact to within $3 for every year 87→100**. It decays **−2.439%/yr** in today's
        money where their own PDF page 8 says the rate is inflated by wage inflation 3.7%
        (**+1.171%/yr** real), and where **run 1 of the same tool four days earlier demonstrably DID
        index**. By age 100 it understates the pension ~**2.4x**. Two causes tested and eliminated by
        the user: no partner, and the tool exposes no indexation setting.
      - **RULING: use run 1 for the Age Pension; run 3's column is unusable for it.** Ours indexes
        off a dated `economicSeries` and is the more correct of the two. *Establish which side is
        wrong before moving anything — this is the one comparison that would have had us "fix"
        working code.*
      - **What run 3 DID establish, and it is the first clean quantitative result of the exercise:**
        the **fee effect**. Run 1 carried a 0.14% pension admin fee, run 3 none; their implied real
        returns differ by **+0.159 points** (3.3093% vs 3.150%) — the removed fee, to within two
        hundredths. Derived from the BALANCE PATH, so the pension defect does not touch it.
      - **Also confirmed:** the assets-test free area **$331,670** and taper **$78/$1,000/yr**,
        back-solved to **$610,478** at age 67 against an actual **$610,530** — within **$52**, which
        confirms free area, taper and the frozen-rate model jointly.
      - ⚠️ **A CORRECTION TO THE COMPARISON DESIGN: their returns are ALREADY NET OF INVESTMENT
        FEES** (PDF p5, *"net of investment related fees, costs and tax"*). **The admin fee is the
        only separately-charged fee.** Matching all their fee fields would DOUBLE-COUNT. In `enough`:
        investment fee **zero**, return set to their already-net rate, admin fee only.
      - ⚠️ **Run 3 did NOT test fees as designed** — the pension account, where the whole drawdown
        happens, was left at 0%. A re-run with the corrected design is still wanted.
      - **A hypothesis that fitted and was still false, kept because the lesson is general:** the
        income drop from run 1's $64,370 to $51,853 was first explained as a changed averaging
        window, which reproduced $51,853 **to the dollar** — and was wrong, because the tail it
        implied was impossible for someone with no assets. **A hypothesis that reproduces one number
        while implying an impossible quantity is not an explanation.**
    - ✅ ⚠️ **THAT BLOCKER IS DISCHARGED — noted 2026-09-20 in the reconciliation pass, and P4-7
      IS NOW RUNNABLE AGAIN.** The above-minimum drawdown exists: P4-3's FLOOR-not-ceiling rewrite
      landed (`projection.ts:115`), and `WATERFALL_LIMBS` (`:802`) carries five limbs. **A third
      Moneysmart run is the outstanding work**, and it is the first one that can compare a scenario
      whose spending exceeds the minimum — which is the comparison runs 1 and 2 could not make.
      P4-7 stays `[ ]` for that reason, not for the old one. **Size the fee gap first (P3-17): the
      engine models no fees at all, so it is expected to run rich, and an unsized residual will be
      misread as agreement or disagreement on the wrong axis.**

---

## Phase 5 — Auditability

*Deliberately before the chart. If this slips, the tool is a black box.*

- [x] **P5-1** Month-by-month table
  - ⚠️ **Ticked 2026-09-20 in the reconciliation pass.** The month table shipped at `9d0132b` (*"P5-1/P5-2: the month table"*) — `src/app/renderTable.ts` — and P5-2 beneath it was already `[x]`. Only the parent box lagged.
- [x] **P5-2** Expandable row: opening balance, every inflow/outflow, closing balance, **what did NOT
      move and why (`Month.notes`), the ADR-0005 assets split (`protectedAssets` / `assessableAssets`),
      `accessibleAssets`, and each line's provenance**. *(This bullet read "opening balance, every
      inflow/outflow, closing balance" until 2026-09-18 — a `Month` four fields narrower than the one
      that exists. The superseded wording is kept here once, in this frame: it was written before
      P4-4 added `notes`, before P4-6 added `accessibleAssets` and before ADR-0005's split was
      reported per month, and a row built to it would have hidden every one of them. The three
      assets figures are three different questions — what Centrelink can see, what it cannot, and
      what the Household can actually reach — and none is derivable from the others.)* — ✅ 2026-09-18
      (`9d0132b`, `src/app/monthToRows.ts` + `src/app/renderTable.ts`). **The bullet above was itself
      still four fields narrower than the row that shipped**, per the commit's own words: it renders
      `MonthLine.attribution`, `Month.appliedEntryIds`, the month-level `Month.provenance` rollup, and
      `MonthLine.effect` (cash vs wealth — the two are never summed) as well. A row built to the six
      bullets alone would hide which entries caused each line and would let a wealth movement read as
      cash. Kept unstruck rather than rewritten again, on the same reasoning the note above gives for
      the first defect.
- [x] **P5-3** Show which entries applied to each month, and which assumptions drove each figure
  - [x] **limb 1 — which entries applied** — ✅ P4-4, `Month.appliedEntryIds`, "applied" meaning GOVERNED.
  - [x] **limb 2 — which assumptions drove each figure** — ✅ 2026-09-18. `MonthLine.provenance` is
        REQUIRED on every line and `Month.provenance` is the lines' records merged upward. Per-ROW,
        because ADR-0006's citation form is per-row ("from the assets test — month table, Mar-2034,
        Age Pension row"). Four registers carry a record (Age Pension, income tax, income tax on
        capital gain, the year-end true-up); the Age Pension row states WHICH TEST BOUND. A line with
        no register behind it says so (`basis: 'none'`), and the Account-Based Pension minimum says
        that Schedule 7 governs it and that this build does not carry the stamp (`basis: 'not
        carried'`) — see the residual below.
  - [ ] **The one register whose provenance is computed and still dropped: the Account-Based Pension
        minimum.** `minimumDrawdown` returns a `ComputedProvenance`; `annualPensionMinimum` returns
        `.amount` and discards it, and that function's `Cents` return is asserted at eight call sites
        in `core-projection-pension-drawdown.test.mjs`. Carrying it means widening that signature and
        the `pensionYears` record. Named on the line today rather than hidden.
  - [x] **Line → entry attribution** — ✅ 2026-09-18. `MonthLine.attribution` is REQUIRED on every
        line and is a three-member union for `LineProvenance`'s reason: `'entries'` carries a
        NEVER-EMPTY id list, `'none'` is a figure no entry states (the Age Pension, a Setting's
        return, a Waterfall draw), and `'not attributed'` is a figure an entry did cause and this
        build cannot apportion (the CGT increment, the year-end true-up, the pension payment that
        merges a Sch 7 minimum with a draw). `statedBy()` throws on `[]`, so the two kinds of nothing
        cannot collapse into one array. The rule is NARROW — the entry whose statement IS the figure,
        not every entry in the causal chain — and the cost of that is recorded on the `'none'` notes.
        A line's ids are a subset of its month's `appliedEntryIds`, asserted over a 362-month walk in
        `core-projection-attribution.test.mjs`.
  - [ ] **No emit site in the build produces TWO ids**, though the field is an array. The union of a
        `RETIRE` and a `WORK_PATTERN_CHANGE` on one salary line is unreachable (a `RETIRE` in force
        nils the salary, so there is no line), and every other attributed line is set by exactly one
        entry's params. The array shape is kept for the line that first needs it; narrowing it to a
        scalar is a decision, not a tidy-up.
- [x] **P4-8** ⚠️ **LIVE DEFECT — no entry reaches the Age Pension income test, `RETIRE` included.**
      ✅ **FIXED 2026-09-19.** `withBalances` takes the walk's in-force fortnightly income as a
      required fourth substitution. Exactly 60 months move on the §3 fixture, all UP, and
      `Δterminal wealth === Σ Δpension` to the cent ($67,859.65) — the Offset does not grow, so
      wealth can only move by pension, and only by pension it moved. Reverting the substitution
      fails 7 tests. **Superseded wording kept below, in frame.**
  Found 2026-09-19 while adding `WorkPatternChangeParams.annualSalary` (P6-6c), and **not fixed in
  that slice**: `applyWorkBonus` (`src/core/workBonus.ts`) reads `person.employmentIncomePerFortnight`
  raw, and `withBalances` (`projection.ts`) spreads `...person` and substitutes only the parcels, the
  super interest balances and the Offset — never the income. So the income test assesses the salary
  the HOUSEHOLD stated, for every month of the walk, whatever the journal says. This is **not new
  and not caused by the stated salary**: a Person who retires in 2030 is assessed on their working
  income for the next thirty years, and a `WORK_PATTERN_CHANGE` to no days is the same. The stated
  salary simply adds a third way to reach it.
  **Direction:** assessed income too high → pension too low → wealth **understated**. Conservative,
  and wrong — the honest direction does not make it correct, and it is the direction that hides a
  household's actual eligibility from them. **The fix** is a per-month employment income on the
  Household handed to the means test, the same substitution `withBalances` already performs for
  balances; the walk already computes the figure (`salaries`, annualised, per Person) and the means
  test wants it per fortnight. **The test that must go red first:** a fixture where a Person of Age
  Pension age retires mid-walk and the pension payment does NOT rise in the following month.
- [x] **P4-11** ✅ **2026-09-19.** ⚠️ The defect as it stood: *"Two figures in this engine now
  disagree about the same dollars. Exposed 2026-09-19 by Waterfall limb 5, not caused by it.
  `accessibleWealth` still passes `{ ceased: false }` to `conditionOfRelease` (its own residual 1),
  so a Household that retired at 60 has its **reachable money UNDER-stated** by `accessibleAssets`
  — while limb 5, which asks the real cessation day through `gainfulEmploymentAsAt`, goes ahead and
  spends that same money. The two contradict each other on a real fixture."*
  - Direction was **conservative** (`accessibleAssets` read low, so the contingency-floor line and
    Pension-Only Age both erred early), which is why it was a follow-up and not a stop-ship.
  - **Fixed as the entry said:** `accessibleWealth` takes the cessation as a required, undefaulted
    third parameter, and `project()` passes its own `gainfulEmploymentAsAt`. **One expression,
    three readers** — the entry path, limb 5, `accessibleWealth` — and no fourth copy of the rule.
  - **`CessationBeforePreservationAgeError` is now reachable from a REPORTED figure and is caught**
    exactly where `lumpSumGate` catches it for limb 5: the interest is left out, nothing new is
    refused by name, and `core-lump-sum-from-super.test.mjs` §7 pins that a walk with no withdrawal
    still completes and reports nil on both readings. No register row was needed.
  - **What is left of residual 1, narrower and stated in the doc:** the walk knows only the
    cessation an ENTRY carries, so a Person who retired before the walk and states no `RETIRE` is
    still `{ ceased: false }`. That residue is now identical in all three readers, so it can no
    longer put two figures out of step with each other.
  - Seven fixtures moved, every one of them an `accessibleAssets` figure and every one UPWARD; no
    driving figure moved (total wealth, the Age Pension, the tax and the shortfall counts are all
    to the cent what they were). The demo walk's $700k floor breach fell 60 → 46 months.
  - **The general shape, worth keeping: closing a gap in one reader can put it out of step with
    another reader of the same fact.** Limb 5 discharged P4-6's residual 2 and made residual 1
    visible in the same move.

- [x] **P4-12** ⚠️ **LIVE DEFECT — a per-Person entry whose owner names no Person SILENTLY DOES
  NOTHING, for two of the four per-Person types.** Found 2026-09-19 while scoping P8-5's household
  editor; **recorded, not fixed, and nothing in P8-5 relies on it.**
  - `RETIRE` and `WORK_PATTERN_CHANGE` are applied by iterating the Persons that EXIST —
    `household.persons.forEach((_person, index) => { if (!ownsPerson(entry.owner, index)) return; …})`
    in `projection.ts` — so a `personB`-owned entry in a one-Person Household matches nobody, the
    loop body never runs, and the entry is simply skipped. The plan parses, `project()` completes,
    and the page draws a plausible forecast in which a stated retirement never happened. No
    refusal, no `Month.note`, nothing on screen. It is the confidently-wrong output this project
    is organised against, arriving through a loop that reads as obviously correct.
  - **The asymmetry is the point, and it is what makes this a defect rather than a design.**
    `NON_SUPER_INVESTMENT` goes through `soleOwnerIndex`, which throws by name on a dangling owner
    (*"is owned by personB, and this Household has 1 Person"*) and again on a `household` owner;
    `LUMP_SUM_FROM_SUPER` refuses its own dangling cases too. So this engine already holds the
    ruling that a per-Person entry naming no Person is an error — it is applied at two of the four
    sites and missing at the other two.
  - **WHY IT IS RECORDED HERE AND NOW: it is the whole reason P8-5's household editor is ADD-ONLY**
    (user ruling, 2026-09-19). Adding a Person creates no orphan; taking one away creates exactly
    the entry this defect swallows, and it would do it to a user who had just been shown a control
    that said it was safe. `src/app/settingsPanel.ts` and `planEdits.ts` both carry the same note,
    and `test/app-settings-panel.test.mjs` fails if a removal control or a removal builder appears.
  - **The fix, when it is taken:** resolve the owner once, the way `soleOwnerIndex` does, and
    refuse a `personB` entry in a one-Person Household for every per-Person type rather than for
    two of them. **The test that must go red first:** a one-Person Household with an enabled
    `personB`-owned `RETIRE` dated inside the window, projecting today with no error and with the
    salary still running.
  - ✅ **FIXED 2026-09-20. The header above is kept unchanged as the record of the defect** — and
    because `test/app-settings-panel.test.mjs:1007` pins it, by design, as the stated reason the
    household editor has no removal control.
    - **`personsReachedBy(entry, household)`** (`projection.ts:3345`) replaces the
      `persons.forEach(... ownsPerson ...)` guard at the `RETIRE`/`WORK_PATTERN_CHANGE` site:
      `household` reaches every index that exists, a dangling `personA`/`personB` throws a plain
      `RangeError`. No named class and no register row — R8 governs named subclasses, and the
      walk-side precedent is `soleOwnerIndex`'s bare throw. `ownsPerson` stays for
      `SUPER_CONTRIBUTION`. `test/core-projection-dangling-owner.test.mjs`, 4 tests.
    - ⚠️ **THE FIX SKETCH THIS ITEM CARRIED WAS A TRAP, and the gate caught it.** *"Resolve the
      owner once, the way `soleOwnerIndex` does"* would have REVERSED a documented ruling:
      `soleOwnerIndex` refuses `owner: 'household'` on a ground that is specific to parcels (*"a
      non-super parcel belongs to a Person and to exactly one (P3-21c)"*), and
      `core-projection-tax.test.mjs:591` — itself written to kill a surviving mutation — asserts a
      `household`-owned `RETIRE` stops BOTH salaries. **Reuse the shape of a neighbouring refusal,
      never the function, until its ground is checked against your own.**
    - **Mutations, each confirmed to apply AND to compile before the count was believed:** deleting
      the `'household'` limb fails **2** (including `core-projection-tax.test.mjs:591`); making the
      dangling check return instead of throw fails **2**; inverting the index fails **19**. None
      failed zero.
    - **Zero existing fixtures moved and no dollar figure changed** — every `personB`-owned entry in
      `test/` sits in a genuinely two-Person Household. Scoped set 283/283 before, 287/287 after.
    - **Scope, stated because it is narrower than the title:** this covers *the Household has SOME
      Persons but not the one named* — the shape a removal control produces. A **`persons: []`
      Household never reaches the entry loop at all**; `forecastWindow`'s `horizonMonth` dies first
      on `Reduce of empty array`. Untouched, unrelated, and still ugly.
    - **`SUPER_CONTRIBUTION` is deliberately NOT changed — user ruling, 2026-09-20.** Its
      dangling-owner guard stays at the door (`checkContributionTargets`, `parsePlan.ts:805`).
      Household membership is static for the whole walk, so a month is never the right place to
      discover it, and a second walk-side copy would be **two expressions of one fact, free to
      drift**. Consequence accepted and recorded: a `personB` sacrifice in a one-Person Household
      handed **straight to `project()`**, bypassing `parsePlan`, still silently contributes nothing.
      Not reachable from the app, where every write goes through the door.
    - **No UI work needed:** `validatedPlan` (`planEdits.ts:1199`) already walks every Scenario at
      the save door, so the refusal surfaces as a rejected edit carrying the engine's own sentence.
    - ⚠️ **Follow-on, NOT taken here:** this was the whole reason P8-5's household editor is
      ADD-ONLY. With the orphan now refused rather than swallowed, that constraint can be
      revisited — but the removal builders and the canary above are unchanged, so nothing is
      unblocked by accident.

- [x] **P4-13** ✅ **FIXED 2026-09-22.** `INTERNAL_TRANSFER_LINES` is now exported from
  `projection.ts`, colocated right after `SUPER_LUMP_SUM_LINE` (the last of the four constants it
  names), and BOTH `test/core-projection-growth-lines.test.mjs` and `test/core-super-fees.test.mjs`
  build their `INTERNAL` regex from it (`new RegExp(\`^(${INTERNAL_TRANSFER_LINES.join('|')})\`)`)
  instead of hand-copying the pattern. Neither hand-copy exists as an independent literal anywhere
  in the suite any more — confirmed by grep across all of `test/`.
  - **Zero fixture flips, confirmed both ways.** `SUPER_LUMP_SUM_LINE`'s value
    (`'Superannuation lump sum'`) occurs zero times in either file's fixtures before or after; the
    full suite's pass/fail/cancelled counts (2242 / 0 / 6 of 2248) are identical before and after.
  - **No third hand-copy found.** `grep -rn "PENSION_MINIMUM_LINE.*PORTFOLIO_SALE_LINE" test/ src/`
    turns up only this file's own doc comment, not a regex construction; the other three test files
    that import `PENSION_MINIMUM_LINE` (`core-projection-pension-drawdown`,
    `core-projection-tris-conversion`, `core-projection-attribution`) build no `INTERNAL` regex at
    all.
  - Superseded description kept below as the record of what the drift looked like.
  ⚠️ **The wealth-identity test's list of INTERNAL TRANSFERS is incomplete, and the
  gap is invisible in the file that holds it.** Found 2026-09-20 building P3-17 slice 1.
  `test/core-projection-growth-lines.test.mjs:301`'s `INTERNAL` regex names **three** lines — the
  pension minimum, the portfolio sale and the portfolio purchase — but **`Superannuation lump sum`
  is just as internal** (super → cash, moving money between two of the Household's own pools), and a
  ~~**Division 293 release** is the same shape. Both are missing.~~
  - ✅ **CORRECTION, 2026-09-22 (LIZ), verified independently — only ONE line is actually missing,
    not two.** Confirmed by reading `projection.ts` directly: the only Division 293 CASH line
    (`DIVISION_293_RELEASE_REFUND_LINE`) is a REFUND from the ATO — external, same shape as every
    other refund on this list, not internal. The line that reads "released from superannuation"
    (`DIVISION_293_RELEASE_LINE`) is a WEALTH line, never touches cash, and is structurally outside
    this regex's scope entirely. Nothing Division-293-shaped belongs on the internal list. Only
    `SUPER_LUMP_SUM_LINE` was genuinely missing.
  - 🟢 **GATE: GO — 2026-09-22 (LIZ). And the drift this item warns about has ALREADY HAPPENED
    once, confirmed live**: `test/core-super-fees.test.mjs:346` carries a SECOND hand-copy of this
    exact regex, already correctly including `SUPER_LUMP_SUM_LINE`, citing this same $4,174.47
    finding — the two files have already disagreed with each other since 2026-09-20.
  - **Fixture risk: zero, confirmed.** `SUPER_LUMP_SUM_LINE` and every Division-293 line occur
    ZERO times across this file's own fixtures — no fixture states a salary or draws a lump sum
    from super, so adding the line changes nothing until a future fixture reaches it.
  - **Build order:** (1) one exported `INTERNAL_TRANSFER_LINES` array in `projection.ts`, colocated
    with the four constants it names, replacing two independent hand-copies at once. (2) both test
    files import it instead of hand-copying the regex. (3) full suite — expect zero fixtures to
    flip.
  - **RULED BY LIZ, not escalated:** the gate's one open item (correct this item's own Division 293
    claim, or leave it) — done above, on this project's own established precedent of correcting a
    prior claim in place rather than silently dropping it.
  - **Latent there, not live:** no fixture in that file ever draws on released super, so the identity
    closes anyway. It surfaced only because a P3-17 fixture spends its pension down, Waterfall limb 5
    fires, and omitting the line made the identity read **$4,174.47 out in exactly that month**.
  - **The fix is the rule, not the two names: BUILD THE LIST FROM THE LINE CONSTANTS, never by
    copying the regex.** A hand-maintained list of "which lines are internal" drifts every time a
    limb is added, and drifts silently, because the test still passes on every fixture that cannot
    reach the new limb. A third copy is how this recurs.
  - ⚠️ **The general lesson, worth more than the fix, and it corrected a brief I had written:**
    naming an existing test as the safety net for a new feature is a claim about its **FIXTURES**,
    not its assertions. `core-projection-growth-lines` was named as the thing that would fail if a
    fee moved money with no line against it; it does not, because every fixture in it states no fee,
    so there is no fee for an unlined one to hide. **An identity test only traps a walk that can
    spring it.** Check what a fixture exercises before promising a test will catch anything.
- [x] **P4-16** ✅ **The Contingency Floor is a STATED SETTING — 2026-09-21.** `Settings.contingencyFloor?`,
  in TODAY'S money, **no default**, and `main.ts`'s hard-coded `DEMO_FLOOR = $700,000` is GONE.
  **Absent means no band, no breach and nothing on screen** — the tool will not guess a figure about
  the user's own appetite for risk, which was the last place it did.
  - **A nil floor is REFUSED at the door**, by name and path, telling the user to leave the key out —
    so there is **one spelling of "no floor"**, on the same reasoning as the mortgage's nil balance.
    `null` is refused too (`optional()` treats `null` as *something said*) — a case the build found
    that my brief had not listed. **Third slice running where the build found a case I missed.**
  - **`Settings` now carries its first OPTIONAL field**, and two doc comments that said it never
    could (`plan.ts`'s header, `outcomes.ts`) are rewritten to the narrower true rule: *no absence
    may be answered by a guess*. `core-plan.test.mjs` pins it **from both sides** — a second optional
    field fails, and making this one required fails.
  - **The demo plan states no floor**, so the demo page draws no band until a figure is typed.
    ⚠️ `concept.md` §1's *"$100k, configurable"* default is deliberately NOT shipped — a doc/behaviour
    divergence, flagged and not touched.
  - See **P4-14**, settled in the same change.
- [x] **P4-14** ✅ **SETTLED 2026-09-21, in the same change that made the floor a Setting.** The two
  readings now come from **ONE expression**: `src/core/priceLevel.ts`'s `inflateStated`, called by
  both the drawn curve (`todaysDollars.ts`'s `statedInTodaysMoneyLens`) and the counted one
  (`outcomes.ts`'s `contingencyFloorAt`). **Equal to the cent by construction, not by two expressions
  that happen to agree.** Both now take a `StatedContingencyFloor` (`{todaysMoney, asAtDate, cpi}`)
  rather than a bare `Cents`, so **a caller can no longer supply the figure and guess the rate.**
  - ⚠️ **THE OLD COUNTED READING WAS UNDERSTATING BREACHES ~18-FOLD, in the flattering direction.**
    On the demo walk the breach count goes **15 → 279 of 501 months**. **I re-derived this myself
    from the raw projection rather than accepting it** — a flat $700,000 in 2068 is a third of the
    buffer that was actually asked for (the floor inflates to **$1,958,510** by then). Nothing in the
    walk moved; only the comparison was wrong.
  - **ADR-0001 is not violated and the source says why:** converting a stated REAL input UP to
    nominal is input normalisation, the opposite direction from the display conversion the ADR
    governs. Nothing deflated ever reaches a threshold, a rate or a taper.
  - Superseded description kept below as the record of what was wrong.
  ⚠️ **The floor the chart DRAWS and the floor the engine COMPARES AGAINST are now two
  different readings.** Opened 2026-09-21 by P2-7. The Contingency Floor is displayed as a figure
  stated in TODAY'S money (flat in the default view, inflating in the future view), but
  `ChartSeries.belowFloor` and `outcomes.ts`'s `contingencyFloorBreach` still compare reachable money
  to the **flat nominal** floor — the other reading.
  - **Not a live defect: NOTHING RENDERS EITHER ONE TODAY**, so no page contradicts itself. This is
    filed so it cannot be discovered by a user instead of by us.
  - ⚠️ **It becomes live the moment breach shading, a breach count or a Shortfall-vs-floor marker
    reaches a screen** — and **the ENGINE side is what has to move**, either to a per-month floor
    series or to making the comparison in the display basis. That is engine arithmetic, which is why
    P2-7 correctly did not do it.
  - The floor is ALSO still `DEMO_FLOOR`, hard-coded at $700,000 in `main.ts` with no Settings field.
    Whoever takes this should expect to make it a stated figure at the same time — a buffer is
    exactly the sort of personal number that must never be hard-coded.
- [x] **P4-17** ✅ **DONE 2026-09-21 — seven register rows corrected, struck not deleted.**
  Doc-only: `docs/assumptions-register.md`, +55/−6, nothing in `src/`. Verified by the **13 test files
  that actually read the register** — 274 tests, all green. (A full-suite run would have been
  reflexive here; the blast radius is those 13 files.)
  - **What changed:** the `ExcessConcessionalContributionsNotModelledError` and
    `MissingIndexNumberError` rows (the AWOTE clauses, the "named nowhere in §8" claim, and the
    O40-twin line — O79 exists and is closed); a **new** §3.2 AWOTE index-number table carrying both
    stamped quarters; **T40's SCOPE CAVEAT** (the ruling stands; its evidence is the current rate's
    example and no earlier period); §5.4's rate history and the 4.50% instrument; **O74 left OPEN**
    with what changed appended; and §4.2's transitional rate, still NOT MODELLED.
  - **T40's `2.2745` is really `2.27433`** — and ⚠️ **my own brief said `2.2747`, also wrong.** Both
    round to $2.27 so the conclusion stood either way. **The real repair is that the code now DERIVES
    it instead of quoting it**, which is the answer to both errors and to the whole class.
  - ⚠️ **THE FINDING, and it is worth more than the seven rows: NONE of them is pinned by anything.**
    All seven edits together failed **zero** tests. The register's canaries watch §1's trap counts,
    the Refusal tables' NAMES, and specific §3.10/§3.11 sentences — **§3.2's AWOTE side, §4.2, §5.4
    and O74 are unwatched prose.** A false figure in any of them ships silently. **That is exactly how
    the `2.2745` slip survived until today.** Filed as **P4-19**.
  - **The no-delete rule was proven, not assumed:** deleting (rather than striking) one *pinned*
    sentence elsewhere turned `core-tris-conversion-credit` red, confirming the register IS read as
    data and that a deletion can turn a canary green by removing what it looks for.
- [x] **P4-19** ✅ **CLOSED 2026-09-28.** The two dense rows named below were already corrected in place by P4-17 (`8d9fad30`, 30 minutes after this item was written): register :1387 reads "now DERIVED rather than missing", and :1530's "AWOTE named nowhere" / "no O40 twin" sentences are struck, citing O79. Re-checked against `superCaps.ts`, `projection.ts` and `super.ts` on 2026-09-28; the prose matches the code. The bullets below describe the state before that fix. 🔴 **Canary NO-GO, measured 2026-09-28** (read-only pass, script `measure.mjs` in that session's scratchpad). 292 cents figures in register table rows: 123 match a stamped Constant, 169 don't. A random 35 of the 169 held **0 true defects** (worked/ATO examples ~40%, rows captioned as derived fixtures ~25%, superseded rate history ~20%, deliberate wrong-answer columns ~10%, one regex truncation). A keyword narrowing cut 169 to 58, and 20 re-sampled still held 0. Whole-dollar matching is worse and also has a backtracking regex bug. So the precision is about 0%, below the ~10% that got the src/ canary refused. No wrong figure was found. The two dense rows below still want their own prose pass.
  ⚠️ **Most of the register is unwatched prose, and a false figure there ships silently.**
  Opened 2026-09-21 by P4-17's finding above. 13 test files read
  `docs/assumptions-register.md`, but they pin **trap counts, refusal NAMES, and a handful of named
  sentences** — not figures. Seven rows were corrected today and **not one test noticed**.
  - **The precedent for the fix already exists and was built today**:
    `test/assumptions-prose-figures.test.mjs` flags currency-with-cents in `src/data/assumptions/`
    prose that matches no stamped record. **The same shape could be aimed at the register's own
    tables** — a `$x.yy` in a register row that matches no `Constant` is either derivable, or
    promotable, or allowlisted with a reason.
  - ⚠️ **Measure precision BEFORE building it.** The general canary over `src/` was refused on exactly
    this ground (~10%, false positives clustering on the best-documented rows). The register is
    denser in legal citations — `s 294-50(3)`, `F2019L01613`, `Compilation No. 66` — so the
    false-positive rate may be worse. **Narrow the pattern, don't lower the bar.**
  O79 and the direction roll-up are corrected in place; these two are not, because they are dense and
  deserve their own pass rather than a hurried edit to the project's authoritative record.
  - **`ExcessConcessionalContributionsNotModelledError`'s row (~§3.1.1)** — its AWOTE clause still says
    later years have no index number.
  - **`MissingIndexNumberError`'s row (~line 1434)** — its *"from FY2027-28"* reasoning, and its
    observation that *"AWOTE is named nowhere in §8"* and has no O40 twin. **It now has one — O79,
    which is closed.** Also worth recording there: the refusal is now **unreachable from `project()`**
    for the concessional cap, and survives only for a year BEFORE the anchor and for public callers.
  - **§3.2's table** should carry the new Dec-2025 AWOTE record beside the Dec-2016 one. §3.2's
    "Algorithm verification" block is still exactly right and was what the build checked against.
- [x] **P4-18** ✅ **DONE 2026-09-21 — four figures promoted, a FIFTH added, and a narrow canary now
  guards the class.** 1935 tests. ⚠️ **AND THE CHECK FOUND SOMETHING, which was the point.**
  - ⚠️⚠️ **T40's EVIDENCE IS REAL BUT ITS SCOPE WAS NEVER STATED, AND THE SUPERSEDED PERIOD POINTS
    THE OTHER WAY.** T40 rules that HEAS interest compounds `annual ÷ 26`, pinned on Services
    Australia's worked example. Chasing the figures turned up **the SAME example at the superseded
    4.50% rate** (archived 2020-09-22), and **I verified its arithmetic myself**: fortnights 1 and 2
    ($1.29 on $750, $2.59 on $1,501.29) are reproduced **only by `×14/365`**, while fortnight 3
    ($3.90 on $2,253.88) is reproduced **only by `÷26`**. **The 2020 page contradicts itself.**
    T40 is **not wrong** — the current 3.95% example is internally consistent and decides `÷26` at
    fortnights 2 and 3 (fortnight 1 cannot discriminate at that rate). **What was wrong is the
    implicit universality: T40 is evidence about the CURRENT rate's example and about no earlier
    rate period.** Anyone backtesting into 2020-21 needs this. The 2020 example is now a stamped
    record marked `INTERNALLY INCONSISTENT`. **Generalises: a rule pinned to one worked example is
    pinned to that example's ERA, not to the rule for all time.**
  - **Verification beat the expectation on three of four.** B1 transitional rates **$963.60 /
    $778.20** — `primary-via-archive`, and **cross-checked**: the same table's normal rates
    reproduce `maximumBasicRate` to the cent in all three columns, the same "right column" check the
    AWOTE promotion used. B3 — `primary-verified`, live today. B4 the superseded **4.50%** —
    `primary-verified` from **F2019L01613 s 5** via the Federal Register's OData API, which also gave
    the repeal date and independently corroborated the existing note. **I had expected
    `secondary-only` here on the `DEEMING_DETERMINATIONS` precedent; the instrument was simply
    retrievable.**
  - ⚠️ **B2 could NOT be verified, and the honest stamp is `unverified`, NOT `secondary-only`** —
    *"`secondary-only` claims a secondary source was consulted; none was."* The primary source is
    SSA 1991 s 1191's rounding-base column; the Register serves only 46 MB compilation volumes and
    AustLII/DSS are Cloudflare-403. **O74 already records this gap.** What COULD be established is
    asserted by computation: every published 1 July movement is a whole multiple of its step, and for
    the assets free areas and deeming thresholds the step **is the gcd** (500, 200). **For the income
    free area the gcd is 8, not 2** — so the test asserts `notEqual` there, which is the record's own
    admission written so that it fails if anyone quietly upgrades it.
  - **The narrow canary shipped; the general one was correctly refused.** `test/assumptions-prose-figures.test.mjs`
    flags `$[\d,]+\.\d{2}` in a `note:`/`derivation:`/comment under `src/data/assumptions/` matching
    no stamped `value`. **13 hits before the work, 11 allowlisted with a reason each, 2 promoted —
    and TWO of the allowlisted came from the agent's OWN new prose, which is the guard working.**
    A hand-rolled span scanner, because a `//` regex matches inside `https://` — there is a test for
    that. One test asserts the sweep covers all seven modules by name, so aiming it at the audited
    three fails. Another asserts **nothing allowlisted is also stamped**, so an allowlist entry can
    never hide a promotion. I planted `$7,349.87` in a note myself and it fired, naming
    `heas.ts:481 $7,349.87 (in a note)`.
  - **Unaudited files fired and were reported, not silently allowlisted:** `super.ts:493`'s `$1.84`
    (derivable: $2.1m − 2 × $130k), `tax.ts:503`'s `$6,105.01` (a float-dust artefact, not a figure),
    and `tax.ts:803/876`'s `$19,985.71/.72` — the same WATO crossing point at two precisions, which
    is **exactly the "showing your working" case the general canary would have punished**.
    `settings.ts` and `franking.ts`: zero hits.
  - **Register rows now stale and NOT edited — see P4-17:** T40 (needs the scope caveat, and its
    `2.2745` is really `2.27433`; my own brief said `2.2747` and was also wrong — the code now
    DERIVES it instead of quoting it), §5.4's rate history, O74, §4.2.
  - **C2 and C3 remain open rulings for the user** and were deliberately left alone.
  - Superseded description follows.
  ⚠️ **LOAD-BEARING FIGURES THAT EXIST ONLY IN PROSE — four found, and the class has
  recurred once already.** Audited 2026-09-21 across `agePension.ts`, `heas.ts`, `tax.ts` (42
  candidates). **This is P3-27's defect** (2026-09-10: a multiplier and an age gate *"existed only
  inside the words"*), which was fixed and guarded — but **the guard watches CODE literals, so the
  class walked back in through PROSE**, as `2051.10` did.
  - **B1 `agePension.ts:154`** — the transitional pension rates **$963.60 / $778.20 per fortnight**,
    real published DSS money, stamped nowhere. It **borrows** the `source`/`retrieved`/`primary-verified`
    of the record it sits in, which was issued for a *different* table. **The 2051.10 shape exactly.**
  - **B2 `agePension.ts:831-832`** — the indexation step sizes **$2 / $500 / $200**. Nothing reads them
    today; they are what someone will copy out of a sentence the day the step is implemented.
  - **B3 `heas.ts:214`** — **$1,501.14 / $2.28 / $2.27**, the *entire evidentiary basis for T40* (that
    HEAS interest compounds `÷26`, not `×14/365`). I confirmed the arithmetic discriminates, by one
    cent. The record that asserts the convention does not carry the example, its URL or its date.
  - **B4 `heas.ts:378`** — the superseded **4.50%** HEAS rate. ⚠️ **`agePension.ts` handles the
    identical fact-shape CORRECTLY in the same directory** — `DEEMING_DETERMINATIONS['2020-05-01']` is
    a full record with `secondary-only` confidence, kept for backtests. Same fact-shape, two
    treatments, one register. **This one FLATTERS**: 4.50% > 3.95%, so a backtest that cannot see it
    accrues less interest and shows a smaller debt.
  - **Resolved, NOT a defect:** C1's `$1,324,500` **is** stamped — `test/assumptions-age-pension.test.mjs:141`.
    The published cut-offs live as fixtures exactly as the module header declares. **I could not see
    that from `src/` alone; the audit's boundary hid it.**
  - ✅ **BOTH RULINGS TAKEN 2026-09-21.**
    - **C2 — PASSES AS IT STANDS, on the user's condition "as long as it says unverified". Verified:
      it does.** `heas.ts:495-498` carries `confidence: 'unverified'` and a note opening `AMBIGUITY:`
      that sets out both irreconcilable readings of s 1134(1A)(b) and says *"Recorded, deliberately
      not implemented."* **Nothing to build.** The distinction worth keeping: the defect is a figure
      that **looks authoritative and carries no provenance** — this one has provenance and openly
      says it is unresolved. Forcing it to a number would mean choosing between two readings of the
      Act, which is what it deliberately refuses to do.
    - **C3 — RECORDED AS EVIDENCE, and the engine still refuses those years.**
      `LOWEST_MARGINAL_RATE_HISTORY` in `tax.ts` holds 16/16/15/14 for FY2024-25→FY2027-28.
      ⚠️ **I asked which of two readings the user meant before building** — record the figure as
      evidence, or actually model those past years — because the second would have reversed a
      deliberate refusal. They confirmed the first.
      - **Verified from the ATO myself**, the same page `ATO_RATES` already names: 2024-25 and
        2025-26 read *"16c for each $1 over $18,200"*, and the same fetch returned *"15c"* for
        2026-27 — **reproducing the already-stamped `FY2026_27.lowestMarginalRate`**, which is the
        right-column cross-check every promotion this week has used.
      - **Why it had escaped:** the years it belongs to are ones `taxYear` REFUSES, so there was
        nowhere in `YEARS` to put it. ⚠️ **A figure with no home reads as unimportant right up until
        the argument resting on it is questioned** — and `STANDING_TABLE_DIRECTION` is the whole
        reason this build answers FY2045-46 instead of refusing.
      - **Three tests, and they bite:** the ladder must be monotonically FALLING; the history must
        agree with what `taxYear` actually computes from (read through the public accessor, not a
        shape); and **`taxYear` must STILL refuse FY2024-25 and FY2025-26** — promotion must not make
        refused years answerable. **Proved: introducing a rise fails 2.** The argument now points at
        its own evidence in prose, so the claim can be checked rather than believed.
      - ⚠️ **An unreferenced record would itself have been a smell** — this file names the
        "record consumed by nothing" signature. It is exported and read by the tests, which is the
        whole point of it existing.
  - ⚠️ **THE GENERAL CANARY IS NOT WORTH BUILDING AND SHOULD NOT BE** — measured ~10% precision, and
    **its false positives cluster on the BEST-documented records**, because notes that show their
    working carry the most figures. *"A guard that punishes `18,200 + 250/0.14 = 19,985.714` teaches
    maintainers to stop showing their working."* **Build the NARROW one instead:** flag only
    `\$[\d,]+\.\d{2}` (currency-with-cents) in a note matching no stamped `toCents()` argument —
    ~9 hits on three files, catches B1 and B3, and a short allowlist takes it to 100%. ~30 lines.
- [x] **P4-15** ✅ **DONE 2026-09-21. Half A built, Half B measured and DELIBERATELY NOT BUILT.**
  1936 tests. `src/` byte-identical to HEAD throughout — verified by me after the run; only 7 test
  files changed (+132/−5). **No prose was reworded and none was found to be wrong.**
  - ⚠️ **THE MEASUREMENT, and it is the headline: 24 OF 78 PIECES OF ON-SCREEN PROSE COULD BE
    DELETED WITH THE WHOLE SUITE GREEN.** Found by **mutation sweep, not by grep** — every exported
    prose constant emptied, rebuilt, suite run, ~60s each, ~80 minutes. **That is why the run took
    so long, and it was the right instrument.**
  - **Three families, and only two are the defect.** **(A) 5 vacuous pins + 2 wholly vacuous tests**
    — an assertion that names the constant on both sides and cannot fail. **(B) 8 wiring-only pins**
    — `assert.match(PANEL, /infoButton\(X_SUMMARY, X_NOTICE\)/)` runs against `executableCode`,
    **which has already blanked every string literal**, so it matches a TOKEN and never the text.
    ⚠️ **That is the fourth time the literal-blanking trap has bitten in two days** — see
    [[enough-canary-stripped-code]]. **(C) 11 constants with NO assertion anywhere** — a gap, not
    false confidence, and left as a decision (below).
  - **13 constants + the 2 vacuous tests fixed**, by `CONTEXT.md`'s own working order (property →
    replacement → prove it fails on empty → only then touch prose). **All 14 proved: emptied,
    rebuilt, owning test run, 14 of 14 now fail where all 14 were green.** I reproduced one myself —
    emptying `PENSION_ONLY_UNCOMPUTABLE_NOTE` now fails exactly the two tests that were vacuous.
  - **The chart fix is not a restatement**: it routes a `SYNTHETIC_NOTE` the module cannot produce
    and asserts it reaches the subtitle at the real note's index, plus 4 lines, `Set.size === 4` (no
    line pasted over another) and a ≥40-char floor. **Dropping `...series.notes` from the subtitle
    fails it** — so it pins ROUTING, which the old pin never did.
  - ⚠️ **THE GENERAL GUARD WAS BUILT, SCORED AND REFUSED — 36% precision, ~38% of defects invisible
    to it.** Its false positives cluster on the **best-pinned** tests, for a structural reason worth
    keeping: **what makes a pin vacuous is not visible in the assertion's syntax.**
    `subtitle.text.includes(NOTE)` is the CORRECT way to pin routing; it becomes vacuous only if no
    *other* assertion in the same test has a term an empty string cannot satisfy. **That is a
    whole-test property, not a line property.** Third guard proposed this week, second refused on
    measurement. **The instrument that works is the mutation sweep itself** — 100% precision; the
    script is in the scratchpad.
  - **Half B — A COMPILER WALL IS AVAILABLE WITH NO NEW DEPENDENCY, AND IS STILL THE WRONG ANSWER.**
    Measured in a synthetic repo: project references fire correctly (`TS6307`), `core` and `data`
    must share one `pure` project (they import each other, and reference graphs must be acyclic),
    and `dist/` survives at the same paths. ⚠️ **THE RISK THAT DECIDES IT: with a solution
    `tsconfig.json`, a bare `tsc --noEmit` at the root EXITS 0 ON A REAL TYPE ERROR** — and
    **16 test files spawn `tsc --noEmit` as a type probe**, plus it is the reflex hand-check.
    **A build-system change that turns the repo's type check into a green that checks nothing is
    Half A's defect installed at the root.** **The tripwire is enough**, and `import-graph.test.mjs`
    already discovers the inventory from the directory and catches bare specifiers the compiler
    split would NOT. ⚠️ **If a wall is ever wanted it must land in the same change that replaces
    every `tsc --noEmit` in scripts, docs and agent instructions with `tsc -b`.**
  - ✅ **FAMILY (C) TRIAGED AND CLOSED 2026-09-21 — the count was WRONG and the answer is NOT "pin
    them all".** ⚠️ **It is THIRTEEN, not eleven** — I checked each for test references myself, and
    all thirteen had zero. **But they are not one problem, and reading what they SAY splits them:**
    - **TWO could cause a wrong decision, and are now pinned.** `SHARED_CHANGE_WARNING`
      (`app-scenario-panel.test.mjs`) — scenarios share changes BY REFERENCE, so switching one off
      alters **every other scenario**; that sentence is the only thing on the page that says so, and
      without it a user silently changes every scenario and then trusts the comparison.
      `NO_RELEASE_ELECTION_LABEL` (`app-settings-panel.test.mjs`) — an option label carrying the
      **consequence** of choosing it; reduced to "No election" it still reads as a complete choice
      while dropping where several thousand dollars of Division 293 charge comes from.
      **Both proved: emptied in `src/`, both pins fail; restored byte-identical.** Each has a
      positive control so it is a property and not a phrase.
    - **ELEVEN are headings and labels** (`CHART_TITLE`, `FIRST_RUN_HEADING`, `ACTIVE_LABEL`,
      `HINT_HEADING`, `HINT_TEXT`, `NO_PARCEL_PREFERENCE_LABEL`, `CARRIED_THROUGH_SUMMARY`/`NOTICE`,
      `RELEASE_ELECTION_SUMMARY`, `ASSUMPTIONS_SUMMARY`/`NOTICE`) and are **deliberately left
      unpinned**. If one vanishes the screen looks broken — **a defect that ANNOUNCES ITSELF**, which
      is the ordinary state of most software and is not what these tests are for.
    - ⚠️ **THE PRINCIPLE, and it is the reason the INVENTORY CANARY WAS NOT BUILT: a text pin earns
      its place when the text prevents a WRONG CONCLUSION YOU CANNOT SEE.** A canary keyed on name
      class (`_NOTICE`/`_SUMMARY`/`_LABEL`) would demand all thirteen, because **it cannot tell a
      warning from a heading — that distinction is in the MEANING, not the name.** Third guard
      refused on measurement this week, and refused for the same reason each time.
  - ⚠️ **Superseded: the decision below said 11 and asked whether to pin them.** Answered above.
    — the focused chart's title is not pinned at all. An **inventory canary** (discover `export const`
    prose from `src/app` by name class `_NOTICE`/`_SUMMARY`/`_NOTE`/`_LABEL`, floor each) is the
    high-precision shape and was NOT built, because it would fail today on all 11.
  - Superseded description follows.
  ⚠️ **ADR-0001's central rule is defended by a TEST, not by the compiler, and some
  neighbouring pins are VACUOUS.** Both found 2026-09-21 while building P2-7.
  - **`src/core` importing `src/app` COMPILES.** Verified by deliberately injecting
    `import { DEFAULT_MONEY_VIEW } from '../app/todaysDollars.js'` into `src/core/outcomes.ts`:
    `tsc --noEmit` was silent. The only thing that caught it was P2-7's own canary (which discovers
    the `src/core` inventory from the directory, so new modules are covered automatically). There is
    no `tsconfig` project boundary. **A tripwire, not a wall** — consider whether one is wanted.
  - ⚠️ **PRE-EXISTING VACUOUS PINS, and they are in the chart tests.** Emptying the chart prose left
    `subtitle.text.includes(CONSTANT)` and a character-budget assertion **GREEN**, because they
    compare a constant with itself — the `CONTEXT.md` trap by name. Only a length floor plus a
    distinctness assertion killed it. **More of these exist**; the fix is the working order already
    recorded in `CONTEXT.md` — find the PROPERTY the pin defends, replace, prove the new pin fails on
    empty text, and only then touch the prose.
- [ ] **P4-9** The income-tax **concavity through `project()`**, now that it is reachable.
  `test/core-projection-true-up.test.mjs`'s hand-worked $15.00 residual is pinned against
  `householdIncomeTax` alone, with a comment explaining that no entry could state a salary and that
  "the day an entry states a salary, this becomes a `project()` fixture and the figure above is what
  it must produce". That day was 2026-09-19 (P6-6c). The comment has been corrected to say so; the
  fixture is unbuilt. A mid-year `WORK_PATTERN_CHANGE` between two POSITIVE salaries is what builds
  it, and the year-end true-up is what must carry the $15.00.
- [x] **P5-4** Display the assumptions FY stamp wherever numbers are shown
  - [x] **The engine half** — ✅ 2026-09-18. `FigureProvenance.fy` is the year whose PARAMETERS
        produced the figure, which is not always the month's own year: a July true-up is stamped with
        the year it settles. `Month.provenance.stamps` is therefore a SET, and it is not
        `Month.financialYear` under another name — that field still does not exist and still must not.
  - [x] **The display half** — ✅ 2026-09-18 (`9d0132b`, `src/app/monthToRows.ts`'s `provenanceCell` +
        `src/app/renderTable.ts`'s `provenanceBlock`). `ProvenanceCell.stampLabel` reads `FY2026-27`
        or `FY2026-27, in part from an earlier year's figures`, and `renderTable.ts` puts it under a
        "Financial year" fact for every line and again in the month-level rollup section.
  - [x] **P5-4a** Display a **prior-year fallback** stamp distinctly from a current-year one — the Medicare levy thresholds must read as borrowed, not current
    - [x] **The engine half** — ✅ 2026-09-18. `provenanceOf` emits the borrowed sentence and the
          ordinary out-of-year sentence from mutually exclusive branches, and the merge to the
          `Month` is a set union of those strings, so a borrowed figure cannot acquire the ordinary
          wording on the way up. Asserted in both directions in `core-projection-provenance.test.mjs`.
    - [x] **The display half** — ✅ 2026-09-18, same commit as P5-4's. `monthToRows.ts`'s
          `caveatKind` classifies each caveat sentence as `'borrowed'` or `'out of year'` before it
          reaches the DOM, `CAVEAT_LABELS` gives each its own wording, and `renderTable.ts` writes
          both the label and a `data-kind` attribute per caveat — a borrowed figure cannot render
          with the ordinary out-of-year wording or styling.

---

## Phase 6 — Journal and scenarios

- [x] **P6-1** Journal Entry shape with mandatory `owner`
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). `EntryBase` requires `owner: EntryOwner` non-optionally (`plan.ts:801-810`); the parse door refuses `owner: 'household'` where wrong (`plan.ts:577`).
- [x] **P6-2** Append-only semantics — `enabled: false`, never delete
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). `enabled` threaded through `entryVisibility.ts` / `planEdits.ts` / `entryTable.ts`. Per ADR-0002 there is deliberately NO in-place edit: correcting a mistake is disable-then-re-add, both entries persist.
- [x] **P6-3** Dated Parameters resolve to synthetic entries; explicit supersedes synthetic
  - ✅ **CLOSED, NOT BUILT, 2026-09-24 (LIZ gate).** It has no consumer. All three Dated Parameters ADR-0002 names (retirement age, TTR start, TTR days a week) already ship as explicit entries (`RETIRE`, `WORK_PATTERN_CHANGE.daysPerWeek`, `plan.ts:567,685`). `Settings` has no field to synthesise from, and the Glide Path was ruled explicit too (P2-11). "What if I retire two years later" is answered by editing or overriding the `RETIRE` entry in a scenario. Reopen only if a real Setting that is shaped like an event appears.
  - ⬜ **Open box CONFIRMED CORRECT 2026-09-23, with one correction to the line below:** `RETURN_CHANGE`
    no longer carries `UnspecifiedParams` — it shipped as an ordinary EXPLICIT entry (P2-11,
    `45878ec`..`e88b7db`). The synthetic-resolution mechanism this item names is still not built.
  - ⬜ **VERIFIED NOT BUILT 2026-09-22** (LIZ audit). ⚠️ **THE ORIGINAL DESCRIPTION READS AS IF THIS EXISTS. IT DOES NOT.** `RETURN_CHANGE` is a declared entry-type NAME carrying `UnspecifiedParams` (`plan.ts:183,866`). Every 'synthetic entry' / 'supersedes' reference in the codebase is a PROSE COMMENT (`plan.ts:109,1652-3`, `projection.ts:2347`) describing an intended design. `grep -a` finds NO resolution mechanism, no `DatedParameter` symbol, nothing. A prior audit pass mis-read those comments as implementation — do not repeat that.
- [x] **P6-4** Scenario inheritance via `parentId` — ✅ 2026-09-19 (uncommitted at hand-off;
  `src/core/plan.ts`, `src/core/parsePlan.ts`, `src/app/loadPlan.ts`). `Scenario = { id, name,
  parentId, entryIds[] }` exactly as concept.md §4 writes it, and **plan file v2**: `entries` is
  now a shared POOL and `scenarios` + `activeScenarioId` are top-level members. **Inheritance is
  LIVE** (user ruling, 2026-09-19): `effectiveEntryIds(scenario, scenarios)` walks the parentId
  chain **fresh at projection time**, so an entry added to a parent after a child forked is in the
  child's forecast — ADR-0002's own justification, that two scenarios must *provably* share a
  change rather than happen to agree. Order is **ancestors first, then the scenario's own ids**,
  and an id re-listed by a descendant is emitted **once, at its most ancestral position**. A
  cycle **throws** in the resolver and is **refused by name** at the door, along with an empty
  `scenarios`, a duplicate scenario id, a dangling `parentId`, a dangling `entryIds` member, and
  an `activeScenarioId` naming no scenario — all reusing `PlanFileShapeError` /
  `PlanFileEntryError` rather than minting a name that would need a new register row (R8).
  `activeScenarioId` is **required** (user ruling): "the first one" is an implicit rule that goes
  wrong the moment the list is reordered. **A v1 file is migrated automatically on load** —
  `migratePlanV1toV2` in `loadPlan.ts`, one root Scenario named Baseline holding every id in the
  pool — and the upgraded plan is written back **only through `savePlan`**, which runs `parsePlan`
  AND `project()` first, so a migration the engine would refuse leaves the file byte-identical and
  calls the transport zero times (`test/app-scenarios.test.mjs` §4). The Baseline changes **no
  figure**: the migrated plan's digest equals the v1 plan's.
- [ ] **P6-5** Entry types: `RETIRE`, `WORK_PATTERN_CHANGE`, `SUPER_CONTRIBUTION`, `LUMP_SUM_FROM_SUPER`, `MORTGAGE_REFINANCE`, `SPEND_CHANGE`, `ONE_OFF_EXPENSE`, `VACATE_HOME`. **Still unticked — this
  - ⏸ **VACATE_HOME PARKED 2026-09-24 (user ruling).** The household doesn't plan to leave the home before aged care. The case that matters, moving into care (24 months, SS Act s 11A(9)(b)), moves to Phase 14 with `CARE_EVENT` (see P14-5). The general 12-month absence (s 11A(9)(a)) isn't built. Reopen only if a move away becomes a real plan. The other 7 types are done, so P6-5 has no remaining work for this household.
  - ⬜ **CURRENT 2026-09-24 (LIZ):** 7 of the 8 named types are specified and offered by the form (`OFFERED_ENTRY_TYPES` is `parsePlan`'s own parser table). Only `VACATE_HOME` is still refused, along with 7 others outside this list: `UNSPECIFIED_ENTRY_TYPES` = CONTRIBUTION_SPLIT, DOWNSIZE, VACATE_HOME, DOWNSIZER_CONTRIBUTION, HEAS_DRAW, DEATH, ILLNESS_SEPARATION, CARE_EVENT. The "five / fourteen" count below is as of P8-1 and is superseded.
  item is the journal/editor surface, not the parser** — but as of P8-1 (`13aac3a`, 2026-09-19), the
  parser-level question of which types this build can even honour has an answer: `Entry` names 19
  types in `plan.ts`, and `parsePlan.ts` has a params parser for five (`RETIRE`,
  `WORK_PATTERN_CHANGE`, `SPEND_CHANGE`, `ONE_OFF_EXPENSE`, `NON_SUPER_INVESTMENT`); the other
  fourteen are refused by name (`UnspecifiedEntryTypeError`), never silently dropped. Specifying a
  new type is now one edit to `PARAMS_PARSERS`, with no second list that can drift.
  - ⚠️ **COUNTS AS OF 2026-09-23 (reconciliation pass) — both earlier counts are superseded:**
    `ENTRY_TYPES` declares **22**; `parsePlan` can honour **14**; **8** are refused at the door
    (`UNSPECIFIED_ENTRY_TYPES`: `CONTRIBUTION_SPLIT`, `DOWNSIZE`, `VACATE_HOME`,
    `DOWNSIZER_CONTRIBUTION`, `HEAS_DRAW`, `DEATH`, `ILLNESS_SEPARATION`, `CARE_EVENT`). **This box
    stays open because `VACATE_HOME`, named in its title, is one of the eight** (P3-15, P6-5a).
  - ⚠️ **THE COUNTS ABOVE ARE STALE — corrected 2026-09-20 in the reconciliation pass. It is SEVEN
    and TWELVE, not five and fourteen.** Verified against `PARAMS_PARSERS` in `parsePlan.ts`, which
    holds `RETIRE`, `WORK_PATTERN_CHANGE`, `SPEND_CHANGE`, `ONE_OFF_EXPENSE`, `LUMP_SUM_FROM_SUPER`,
    `SUPER_CONTRIBUTION`, `NON_SUPER_INVESTMENT`. `LUMP_SUM_FROM_SUPER` and `SUPER_CONTRIBUTION`
    joined after this paragraph was written. **README.md already says seven and twelve and is
    correct**; this paragraph is the copy that drifted — precisely the "second list" the sentence
    above congratulates itself on not having.
  **Addendum 2026-09-19 (P6-6's second slice): the editor surface now exists for all five, and it
  is DERIVED from that parser table rather than listed a third time.** `planEdits.ts` exports
  `CONSTRUCTIBLE_ENTRY_TYPES = ENTRY_TYPES \ UNSPECIFIED_ENTRY_TYPES`, the form's type selector is
  built from it, and a test compares it against the keys of the form's own builder record — so a
  type gains a box when it gains a parser, and cannot be offered before. Of the eight types this
  item names, FIVE are now addable in the UI (`RETIRE`, `WORK_PATTERN_CHANGE`, `SPEND_CHANGE`,
  `ONE_OFF_EXPENSE`, and `LUMP_SUM_FROM_SUPER` as of 2026-09-19); `SUPER_CONTRIBUTION`,
  `MORTGAGE_REFINANCE` and `VACATE_HOME` are three of the now-THIRTEEN unspecified types and stay
  unofferable, which is the honest state and not an oversight. *(Superseded wording, kept in frame:
  this read "four are now addable" and "four of the fourteen" until `LUMP_SUM_FROM_SUPER` gained
  params — the counts are derived in code and were stale here within a day.)* **A measured surprise from building the surface: `WORK_PATTERN_CHANGE` is very
  nearly inert.** `projection.ts` reads `daysPerWeek` for exactly one thing —
  `worksNoDays = daysPerWeek === 0` — so three days a week and five days a week are the same walk
  to the cent, and only `0` moves a figure. The form's most inviting box therefore does nothing at
  any positive value; that is pinned by a test rather than hidden, and prorating the wage is
  Projection work, not editor work.
  - [ ] **P6-5a** `VACATE_HOME` stays a v1 entry — it changes Home Status and starts the two-year
    clock — but it must **not** imply a forecastable answer past two years. Any Scenario carrying
    one is forecastable only up to the cliff date; past it the projection refuses (P3-15b/c). The
    entry editor should say so when the entry is created, not at the moment the forecast fails.
    ⚠️ **`VACATE_HOME` is declared and dead.** It is a member of the `Entry` union (`plan.ts`) and of
    `ENTRY_TYPES`, and `parsePlan.ts` refuses it as one of the fourteen unspecified types (correct,
    for now) — but `projection.ts` has ZERO branches for it: `grep -ac VACATE_HOME
    src/core/projection.ts` returns `0`, confirmed both with and without `-a`. A reader of the type
    alone would assume it works. This item and P3-15's refusal work are the two halves of making it
    real: the engine branch, and the two-year cliff.
  - [~] **P6-5b** (skipped by the user 2026-09-25 with P3-18) Guided **equalisation templates**: pick the years, and the tool generates visible,
    individually-editable `CONTRIBUTION_SPLIT` and `SPOUSE_CONTRIBUTION` entries — the same way
    spending presets generate entries rather than applying a hidden curve (ADR-0004). The rules are
    **already covered** by P3-18 and P3-19 and are not duplicated here; only the click count
    changes. What the template must surface is the point of doing it: two Transfer Balance Caps of
    $2.1m each, and two sides of the Age Pension thresholds
  - [x] **P6-5c** New v1 entry types from ADR-0009: `NON_SUPER_INVESTMENT` (P3-20c),
    `MORTGAGE_TARGET` (P3-16a), and `RETURN_CHANGE` (P2-11a — synthetic unless explicitly overridden)
    — ✅ **Ticked 2026-09-23 in the reconciliation pass: all three are now end to end** (parser,
    walk, form). `MORTGAGE_TARGET` via P3-16a (`ce4ae5a`..`bb82bd7`), `RETURN_CHANGE` via P2-11
    (`45878ec`..`e88b7db`). The "synthetic unless overridden" half is P6-3's mechanism and is still
    unbuilt there — an explicit `RETURN_CHANGE` works today. The "one of the three" text below is
    the 2026-09-19 state.
    **One of the three is done end-to-end as of 2026-09-19**: `NON_SUPER_INVESTMENT` has a parser
    (P8-1), an engine branch (P3-21f chunks 3 and 4) and now an editor surface. `MORTGAGE_TARGET`
    and `RETURN_CHANGE` have none of the three and cannot be offered — they are two of the
    fourteen `UNSPECIFIED_ENTRY_TYPES`, so the form does not list them and the door refuses them.
    ⚠️ **The buy and the sell are TWO FORMS, not one form with optional boxes, and that is the
    finding of the slice.** Their `params` share no field list: `incidentalCostsOfAcquisition` is
    required on a buy and REFUSED on a sell, `parcelSelection` exists only on a sell. A flat form
    offering every field to both directions produces a plan `parsePlan` rejects on a key the user
    never filled in — a form with a missing check even though the door holds. So the direction
    selector swaps which fieldset is on the page, only the shown branch's inputs are read, and each
    branch calls its own builder whose form-values TYPE has no field the other branch owns; there
    is deliberately no `NonSuperInvestmentFormValues` carrying both, and adding one re-opens the
    hole. A second thing the walk half of the save gate caught here: an owner of `household`
    parses fine and makes `project()` throw (a parcel belongs to one Person, P3-21c), so it is a
    refused edit rather than a bricked page — the same class as the Planning Horizon case, reached
    by a different keystroke.
- [x] **P6-6** Entry editor UI — **shipped in two slices on 2026-09-19 and deliberately still
  - ✅ **VERIFIED BUILT 2026-09-22** (LIZ audit, checked against `src/`, not the checkbox). `entryForm.ts` (8 builders, lines 337-380), `entryTable.ts` (210 lines), tests `app-entry-form.test.mjs` + `app-entry-table.test.mjs`; save gate runs `parsePlan`+`project()` before write. ~~**Sub-items P6-6a (HEAS security-value prompt) and P6-6b (HEAS+refinance warning) remain open and are blocked on HEAS_DRAW having no parser at all.**~~
  - ✅ **P6-6a AND P6-6b BOTH BUILT 2026-09-25 (P9-1, slice 2)**, once `HEAS_DRAW` had a parser and a
    walk branch (slice 1) to build a control for. See both checkboxes below for what shipped.
  open.** Slice one (`a4a9a1f`): add a `SPEND_CHANGE`, switch any entry off, and the save gate.
  Slice two: the other four constructible types (see P6-5 and P6-5c). What the editor does is add
  and switch off, and **nothing else — there is no in-place edit of a dated entry, by user ruling
  on ADR-0002 (2026-09-19)**: correcting a mistake is disable-then-add, and both facts stay in the
  file. The gate is the property to preserve — `savePlan` runs `parsePlan` AND `project()` before
  `writePlan` is named, because a plan that parses and will not walk, written to disk, bricks the
  page with no banner.
  - [x] **P6-6a** Contextual prompt for the HEAS **Security Value**: asked only here, only when a
    `HEAS_DRAW` entry is created or enabled, and shown with the estimate warning it carries — the
    figure has no source and no confidence, so everything downstream of it is an estimate
    (ADR-0005, register §5.1). Never asked during household setup (P9-1c)
    — ✅ 2026-09-25: `entryForm.ts`'s `HEAS_DRAW` group has its own "Home value (your own estimate) $"
    box, and `HEAS_DRAW_ENTRY_NOTICE` (`planEdits.ts`) states the estimate warning beside it, behind
    the info button — `ENTER_CARE_ENTRY_NOTICE`'s own precedent. Nothing asks for it in the
    household/settings panel; it lives only on this one entry.
  - [x] **P6-6b** Warn when a Scenario holds both a `HEAS_DRAW` and a `MORTGAGE_REFINANCE`:
    increasing the Owner-Occupied Mortgage while a HEAS loan runs voids the No Negative Equity
    Guarantee (SS Act s 1144AA(3)(a)). Raise it as the second entry is added, not when the
    projection runs. The rule itself is **P9-1a** and register **T35** — this is only its surface
    — ✅ 2026-09-25: built as a REFUSAL rather than a warning — stronger than the item asks for, and
    raised at exactly the point asked: `checkHeasDraws` (`parsePlan.ts`, slice 1) refuses the save at
    the door, on `HEAS_DRAW_ENTRY_NOTICE`'s own plain-English statement of why, the moment the second
    entry is added — never buried in a projection error. No separate warning banner was built; the
    door's own refusal message, surfaced through `savePlan`'s existing gate, is the surface.
  - [x] **P6-6c** ✅ **2026-09-19 — settled neither by refusing the days nor by disclosing them:
    the caller now STATES the salary.** The open question was whether a non-zero `daysPerWeek`
    should be refused outright rather than merely disclosed as not modelled, because
    `projection.ts` read the figure only at zero and three days went on paying a full wage — the
    flattering direction. Both answers on the table were wrong: refusing the entry removes a fact a
    household really has, and disclosing it leaves the forecast wrong. `WorkPatternChangeParams`
    gained a **required `annualSalary`** (`plan.ts`), `parsePlan.ts` parses it, and `projection.ts`
    carries it as a third per-Person level beside `retired` and `worksNoDays`, replacing the
    annualised `employmentIncomePerFortnight` from the entry's own month. `RETIRE` still beats it in
    either order. `daysPerWeek` stays, descriptive, and zero stays distinguished.
    **No named refusal class and no register row under R8 were needed**, which is what the old text
    feared: nothing here is an unanswered question about the law. What `parsePlan.ts` added is three
    inline `PlanFileEntryError` refusals in the idiom already there — a negative salary, on the same
    ground as a negative `daysPerWeek`, and the **two contradictory pairs** (no days with money, days
    with no money), which is the only cross-field value check in that file.
    **Retired with it:** `workPatternChangeDisclosure`, the `data-not-modelled` row attribute and its
    stylesheet rule, and `DAYS_PER_WEEK_ENTRY_NOTICE`'s "not modelled … optimistic" wording — all of
    which had become false, and a stale warning is its own defect. The journal row now states the
    money. Every retired assertion was rewritten onto the new truth rather than dropped, including
    the planted *"this assertion exists so that the day a rate arrives, this test goes red"* pair in
- [x] **P4-10** ⚠️ **LIVE DEFECT — `Person.workBonusBalance` is never carried across months, and
      this one is UNSAFE.**
      ✅ **FIXED 2026-09-19.** `PersonBalances` gains `workBonusBalance` as a fifth required
      substitution in `withBalances`, and `workBonusBalanceAfterMonth` writes the month's closing
      figure back — `WorkBonusResult.balanceAfter` has a consumer at last.
      **The fortnight/month convention, and its residual.** The Work Bonus accrues and depletes per
      fortnight with a per-fortnight cap; the walk ticks monthly, and 26 does not divide by 12.
      `fortnightsInWalkMonth` takes the SAME convention `monthlyFromFortnightly` already takes —
      annualise at 26, take a twelfth — and applies it to a COUNT rather than to a dollar figure:
      ⌊26(n+1)/12⌋ − ⌊26n/12⌋, i.e. **2, 2, 2, 2, 2, 3** and twenty-six a year exactly. The residual
      lands in the count so that every fortnight is a whole one and every per-fortnight cap binds as
      §4.6 states it; scaling a fortnight's movement by 26/12 would have banked $650 in a fortnight
      whose cap is $300. **What it leaves:** the entitlement is computed once, on the balance the
      month OPENS with, so the month a balance runs out is still assessed as if it had not — one
      tick of the old over-statement, bounded, stated in `fortnightsInWalkMonth`'s doc.
      **The cap is `applyWorkBonus`'s own** and is not re-enforced by the carrier: $11,800, clamped
      inside the per-fortnight step, so no number of iterations can pass it. The register's $4,000
      new-claimant starting balance still has no consumer in `src/` and carrying does not give it
      one — every Household states its own figure. The `eligible` gate is untouched.
      **5 tests moved.** Two were call-site shape (the new required field); three were figures, and
      every one attributes to depletion or to accrual: the growth fixture's six payments (Val's $100
      empties in October, **depletion**, $108.33 a month of it), §2's restart (two months off bank
      $1,500, which wholly shelters a $1,000 wage — **accrual** — and is then spent down over
      February so March falls, **depletion**), and §5's nine months (a full $11,800 lasts 9.83
      fortnights and the shelter ends inside a rate period, **depletion**). Reverting the write-back
      one half at a time fails 7 tests (draw dropped) and 4 (accrual dropped); uncapping fails 4.
      **Superseded wording kept below, in frame.**
  Found 2026-09-19 while fixing P4-8, deliberately not bundled into it.
  `WorkBonusResult.balanceAfter` has **no consumer anywhere in `src/`** (`grep -a` confirmed), so the
  walk hands `agePensionEntitlement` the Person's *stated* Work Bonus balance every single month and
  never writes the used or accrued balance back. **This is the same stale-static-balance shape P4-3b
  fixed for the Offset Account, in the one pool it did not cover.**
  - **The direction is the dangerous one, and that is why this is not merely tidy-up.** A stated
    balance is never depleted, so a Person earning $1,500 a fortnight with $11,800 banked is paid the
    **maximum** rate in every in-window month — **wealth OVER-stated**, the flattering direction.
    (The mirror is safe: a Person who stops work never banks the unused accrual, which understates.)
    Nearly everything else this project refuses does so to avoid exactly this direction.
  - **A stop-then-restart accrual is therefore NOT observable through `project()` today.** It is
    tested at the level where the balance does carry, and both directions of the gap are pinned in
    `core-projection-means-test-income.test.mjs` §5 so the fix has a failing witness waiting.
  - Fixing it means carrying a per-Person Work Bonus balance in the walk and writing `balanceAfter`
    back each month — a new carried state variable, hence its own slice.

    `core-projection-tax.test.mjs`. **Still open beside it: P4-8** — none of this reaches the Age
    Pension income test, and neither does `RETIRE`.
  - [ ] **P4-10a** Two Work Bonus model gaps, left open on purpose rather than papered over —
    ⚠️ **needs a decision: implement the full register condition, or keep age-only and say so
    everywhere it matters.** (1) `applyWorkBonus`'s `eligible` is gated on **Age Pension age (67)
    alone** (`core/workBonus.ts:51-56`); the register's condition is "of Age Pension age **and
    receiving** Age Pension, Carer Payment or DSP", which the file's own doc calls circular in a
    means test — whether the Person receives the Age Pension depends on the assessed income this
    function produces. (2) the **$4,000 new-claimant starting credit is never seeded** by the
    engine — confirmed again alongside P4-10, no consumer anywhere in `src/`. Both are now **stated
    on screen** rather than silently assumed: `settingsPanel.ts`'s `WORK_BONUS_NOTICE` (~line 197)
    says plainly that this forecast checks age only and that nothing fills in the $4,000 for the
    user. Options for (1): accept age-only as a documented approximation (current state), or break
    the circularity with an iterate-to-fixed-point check the way `agePensionEntitlement` might need
    to anyway. Options for (2): seed `workBonusBalance` at $4,000 for a Household not yet drawing
    the pension, or leave it a user-typed figure as now and keep saying so.
- [x] **P6-7** Scenario list, create/clone/rename — ✅ 2026-09-19 (uncommitted at hand-off;
  `src/app/scenarioList.ts`). Three pure functions over a `readonly Scenario[]`, in
  `planEdits.ts`'s idiom: no DOM, no clock, no `crypto`, and **no second write path** — the caller
  puts the list back on the plan and sends it through the existing `savePlan` door. **A clone sets
  `parentId` to the source and starts with EMPTY `entryIds`**, which is the whole of "inheritance
  by reference, never a copy" (ADR-0002 §13, ADR-0006:44): copying the ids would pass every
  resolution test and still drift silently the first time the source was edited. There is **no
  delete** — children inherit live, so removing a Scenario would change every descendant's
  forecast, and the append-only-safe equivalent of `enabled: false` for a Scenario has not been
  ruled on. **No UI yet**: `main.ts` still projects the pool, which is what the single migrated
  Baseline resolves to, and wiring the selector belongs with **P7-1**.
- [x] **P6-8** **Salary sacrifice into super versus invest outside it** — the second central
  question, beside "discharge the mortgage from super" rather than below it. It is the question
  that decides whether a Liquidity Bridge ever exists, and it is the one the user is actually
  asking when they weigh an ETF as a vehicle (`concept.md` §5.12, ADR-0009). A guided template
  generating two visible, editable Scenarios from one dollar figure and a date range — the same
  proposes-not-disposes mechanism as the equalisation templates (P6-5b) and the spending presets
  (ADR-0004)
  - 🟢 **GATE: GO — 2026-09-22 (LIZ), third pass, claims verified independently.** First two passes
    (2026-09-19, and again earlier today) were NO-GO on P6-8d — franking not live on one side or
    the other. Both prerequisites shipped today (P3-42, P3-8's conversion limb) and this pass
    confirms the bar is actually cleared, not merely closer.
    - **P6-8d is met, confirmed by genuine call sites, not imports.** `frankingInSuper` is called
      inside the year-end true-up (`projection.ts:6304`), `fundEarningsTax` likewise (`:6264`);
      the individual side calls `frankingForIndividual`/`frankedDistributionFromShare` (`:6037`).
      Both sides run inside the same settlement.
    - **Both sides are the SAME shape of Setting, confirmed field-for-field.** `superIncomeYieldRate`/
      `superIncomeYieldFrankedShare` (`plan.ts:235,264`) mirror `investmentPayoutRate`/
      `investmentPayoutFrankedShare` (`plan.ts:177,201`) exactly — optional, undefaulted, plan-wide.
      **A user could hand-build both sides of this comparison in a plan.json TODAY** and get two
      honestly, comparably taxed forecasts — confirmed, not assumed.
    - **Entry types: 9 constructible, re-counted** (`test/app-entry-form.test.mjs:372`), only
      `TRIS_EARLY_CONVERSION` unwalked (unrelated to this comparison). `SUPER_CONTRIBUTION` and
      `NON_SUPER_INVESTMENT` both constructible AND walked.
    - **Not pure UI on a finished engine — two small NEW pieces of logic, both sized S.** (i) a
      scenario-pair crossover compute (given two scenarios' month series, find the date one side
      overtakes the other) has no existing precedent anywhere in `src/` — checked, no hits. (ii) the
      guided one-input-generates-two-scenarios mechanism P6-8 itself asks for has no shipped
      precedent either — its sibling P6-5b is itself still unbuilt. Both compose only already-
      shipped primitives (P6-7's scenario clone, P7-1's overlay chart, existing candidate-entry
      builders), so neither is new ENGINE work, just new assembly.
    - **RULED BY LIZ on precedent, not escalated: refuse an ineligible destination account in the
      template itself, before the user can pick it.** Matches this project's standing convention
      everywhere else (refuse plainly at the point of choice, name the reason, never let someone
      click through to a raw error) — most recently `TRIS_EARLY_CONVERSION`'s own door refusal.
    - ✅ **RULED BY THE USER 2026-09-22 — total after-tax spendable wealth.** The crossover marker
      (P6-8c) decides which side is "ahead" by TOTAL AFTER-TAX SPENDABLE WEALTH at each point in
      time — cash, liquid investments, and whatever super rules currently let this Person draw —
      matching my recommendation and the figure this tool already treats as the bottom line
      everywhere else on the chart. Confirmed with a plain "Yes" to the recommendation as put.
    - **Build order, five S-sized microtasks, each green:** (1) the crossover compute, pure
      function, unit-tested alone. (2) the guided-template generator — one dollar figure + a date
      range → clones two Scenarios, writes one `SUPER_CONTRIBUTION` candidate entry into one and one
      `NON_SUPER_INVESTMENT` candidate entry into the other, through the existing save gate. (3) the
      template's own input screen, landing on the existing overlay chart. (4) surface each
      scenario's existing Age Pension series side by side (display-only — the figures already
      exist). (5) wire the crossover date from (1) onto the chart, reusing the existing marker
      pattern rather than inventing new drawing code.
    - ✅ **ALL FIVE MICROTASKS SHIPPED 2026-09-22.** (1) `src/app/crossover.ts`'s `crossoverPoint` —
      pure, reads only `Month.accessibleAssets` (never `comparisonSeries.ts`'s own total-wealth
      line), reports the LAST stable sign flip ("first overtakes and stays ahead", not every
      wobble), refuses a tied final month rather than guessing a leader. Hand-worked fixtures only;
      two mutations run and reverted — (a) first-flip instead of last-flip, 2 kills; (b) total
      wealth instead of `accessibleAssets`, 7 kills — both genuine assertion diffs, none crashes.
      (2) `src/app/comparisonTemplate.ts`'s `superVsInvestTemplate` composes `scenarioCloned`
      (P6-7) and the existing candidate-entry builders to clone a source Scenario twice and write
      one `SUPER_CONTRIBUTION` into one clone and one `NON_SUPER_INVESTMENT` buy into the other,
      through the real `savePlan` door. `superDestinationRefusal` refuses a non-accumulation
      destination BEFORE anything is generated, on the door's own reasoning, in plain words. Stated
      scope decision: one entry per side means the two sides are shaped differently in time — the
      super side is a standing rate from the range's start, the invest side is a single lump-sum
      buy sized by the range's length (`annualAmount × years`), dated at the same start; the
      brokerage box is never defaulted to `0`. (3) `src/app/comparisonTemplateForm.ts` — the one
      input screen (dollar figure, date range, owner, super account, purchase costs), landing on
      the EXISTING overlay chart via a new `main.ts` `switchToComparison`. Banned-word sweep
      (franking/imputation/ECPI/gross-up/register tags/item ids) enforced structurally in
      `test/app-comparison-template-form.test.mjs`. Verified end to end with headless Chrome
      against a scratch origin provider: a fresh one-scenario demo plan went to three scenarios,
      the Compare radio checked itself, on one form submit. (4) P6-8b, below. (5) P6-8c, below.
  - [x] **P6-8 brief 1 — the `SUPER_CONTRIBUTION` entry type is CONSTRUCTIBLE ✅ 2026-09-19.**
    `SuperContributionParams` in `plan.ts`, a parser in `parsePlan.ts`, and **nothing in the walk**.
    Constructible types went 6 → 7, `UNSPECIFIED_ENTRY_TYPES` 13 → 12.
    - **The shape.** `{ kind, annualAmount, interestIndex }`, no optional field anywhere. `kind` is
      the discriminant and only `'salarySacrificed'` is specified — chunk 3's `NON_SUPER_INVESTMENT`
      precedent, which shipped the buy alone and gained the sell later. The name is
      `superConcessional.ts`'s own limb name, not a parallel vocabulary. `annualAmount` is a LEVEL
      per year in `annualSpend`'s idiom: no `recurring` flag, because concept.md's flag is what
      `ENTRY_KIND` calls "two types wearing one name" and the answer taken was to specify the
      standing arrangement and refuse the one-off. `interestIndex` is required on
      `LUMP_SUM_FROM_SUPER`'s ruling and is checked against the Household at the door.
    - **Refused by name, each with its own reason:** employer SG (it is COMPUTED by
      `superContributions.ts` and a stated one would be a second copy of a derived fact), personal
      deductible (s 290-170 needs an acknowledged notice of intent, and without it the same dollars
      are non-concessional under a cap four times the size), non-concessional (typically a LUMP, and
      this type states a level that would re-contribute it every year to the horizon), a nil or
      negative amount, a `household` owner, and an owner or an interest index the Household does not
      hold.
    - ~~⚠️ **GAP LEFT OPEN — stopping a standing arrangement on a date is not expressible.** `enabled:
      false` removes it from the whole walk, not from a date, and nil is refused rather than
      overloaded as "stop". Whoever wires the walk decides: a second `SUPER_CONTRIBUTION` at
      `annualAmount: 0` as the terminator (which needs the nil refusal narrowed), or a separate
      type. Do not resolve it by accident.~~ ✅ **CLOSED 2026-09-21 by P6-8 brief 4, and by NEITHER
      of the two routes this bullet named**: not by narrowing the nil refusal — which stands
      untouched — and not by a separate entry type. It is a second member of
      `SuperContributionParams`, `kind: 'stopped'`, on `NON_SUPER_INVESTMENT.direction`'s precedent.
      See the brief-4 item below.
    - ⚠️ **FINDING — a month CITES the entry it did not apply.** `Month.appliedEntryIds` is built
      from every entry dated in the month whatever its type, so a plan holding a `SUPER_CONTRIBUTION`
      produces a month naming it as governing while not one cent moved. Every FIGURE is identical
      (pinned in `test/core-parse-plan.test.mjs` §3a, which asserts `appliedEntryIds` is the only key
      that differs, over all 501 months). Left as found because closing it means touching the walk,
      which brief 1 was told not to do. **CLOSED by brief 2 chunk 1 below** — the walk acts on the
      entry now, so the citation is true.
    - **The silence is visible in two places, and the form is not one of them.**
      `planEdits.ENTRY_TYPES_NOT_YET_WALKED` is the single place the door/walk divergence is held
      open, `OFFERED_ENTRY_TYPES` is what the entry form is built from, so no user can add a
      contribution that changes nothing. A hand-edited `plan.json` still can, and
      `entryForm.describeParams` gives that row an explicit "NOT YET IN THE FORECAST" line rather
      than letting it fall to the silent `default`. `test/app-entry-form.test.mjs` asserts the set of
      `entry.type === …` names dispatched on in `projection.ts` EQUALS `OFFERED_ENTRY_TYPES`, so the
      list retires itself the day the walk gains a branch. **Both sentences were superseded by
      chunk 1 below:** the row now reads "ONLY HALF IN THE FORECAST", and the equality became a
      narrower rule because half a branch is a reason to keep a type back, not to offer it.
  - [x] **P6-8 brief 2 chunk 1 — the sacrifice REDUCES THE SALARY ASSESSED, and nothing else yet
    (2026-09-19).** `projection.ts` has its first `SUPER_CONTRIBUTION` branch: a fourth carried
    level beside `retired`, `worksNoDays` and `statedSalary`, subtracted from the salary fed to
    `taxableIncomeFromSalary` and `netLabourIncomeFromSalary` above every tax line, and stored in
    `taxYearToDate` as the ASSESSABLE figure so the year-end true-up settles the year the Person
    actually had. Supersession is the assignment: a later contribution for the same owner REPLACES
    the level and is not added to it.
    - **What falls:** Taxable Income (so the brackets, LITO and the Medicare levy), Net Labour
      Income (so WATO), and the Family Income the levy's family threshold reads.
    - **What does NOT fall, and why each.** **Rebate Income / SAPTO** — it is Taxable Income plus
      reportable employer super contributions and an effective sacrifice is exactly such a
      contribution, so `asSaptoPerson` reconstructs the GROSS (`salary + sacrificed`, which is exact
      because the sacrifice is capped at the pay it comes out of). That is the right answer, not a
      holding pattern, but it is not the right MECHANISM: chunk 2 owes a real add-back through
      `incomeBases.ts` that can also carry a net investment loss and a reportable fringe benefit.
      ⚠️ **BOTH SENTENCES ARE SUPERSEDED BY CHUNK 2 BELOW (same day) and are kept because the
      reasoning above is what chunk 2 was measured against.** The reconstruction is gone; the
      add-back is real; and "the right answer" turned out to be the right answer only at or above
      $1,000 of assessable salary — see chunk 2's finding for the $63.00 it was wrong by, in the
      flattering direction, below that line.
      **The Age Pension income test** — left on the gross, because the register holds no provision
      on Centrelink's treatment of salary sacrifice and nobody has ruled; gross assesses HIGHER and
      claims nothing.
    - ⚠️ ~~**THE BUILD IS NOW WRONG IN THE FLATTERING DIRECTION UNTIL CHUNKS 3 AND 4 LAND.** The tax
      falls, the pay packet is still the FULL salary (chunk 3) and no interest is credited and no
      15% contributions tax is charged (chunk 4) — so a Household with a sacrifice keeps the saving,
      keeps the cash, and sends nothing to the fund.~~ **SUPERSEDED BY CHUNK 3 (2026-09-20): the pay
      packet now falls too, so the direction FLIPPED to CONSERVATIVE — the money leaves and does not
      arrive, and wealth is under-stated by the whole sacrifice until chunk 4.** `SUPER_CONTRIBUTION` therefore STAYS in
      `ENTRY_TYPES_NOT_YET_WALKED` and stays out of the entry form; `entryForm.describeParams`'s row
      now reads "ONLY HALF IN THE FORECAST" and names both halves. `test/app-entry-form.test.mjs`'s
      "dispatches on the six and on nothing else" rule NARROWED rather than retiring: a held-back
      type may be dispatched on, the partial set is written out by name, and three source tripwires
      now watch for chunks 3 and 4 landing.
    - **FINDING — the s 8(7) refusal is reachable BY A SACRIFICE.** Any two-Person fixture in which
      a sacrifice would move one spouse's SAPTO and not the other's throws
      `MixedSaptoFamilyThresholdError` (register O30, unresolved), because the family INCOME does
      fall with the sacrifice even though Rebate Income does not. The SAPTO pin therefore had to be
      a single-Person fixture, and this is not a defect to fix here — it is O30 being reachable by a
      new road. **⚠️ SUPERSEDED 2026-09-21 — O30 is closed and the refusal deleted (P3-1f), so this
      road leads nowhere: a sacrifice now moves the two spouses' family-income position and both are
      assessed on their own thresholds. The fixture stays single-Person; the constraint is gone.**
    - **FINDING — the demo walk's true-up moves by $925.44 and the biggest term is the Medicare
      FAMILY shade-in**, not the bracket: at the reduced FY2030-31 salary the family income drops
      inside the shade-in and the levy is 10c in the dollar over $47,238 rather than a flat 2%.
      Worked to the cent in `test/core-parse-plan.test.mjs` §3a.
    - ⚠️ **NOT DONE, and each is named where it will be closed.** Chunk 2: the real Rebate Income
      add-back. ~~Chunk 3: the CASH — the `Salary` line still reports the gross, so `received` and the
      Waterfall are over-stated by the whole sacrifice.~~ **DONE 2026-09-20.** Chunk 4: crediting the interest and the 15%.
      Chunk 5: refusing a sacrifice over the concessional cap or over the salary (chunk 1 silently
      CAPS it at the month's gross instead, and drops the excess). Chunk 6: the Div 293 and SG
      caveats. Brief 1's "stopping a standing arrangement on a date is not expressible" is
      UNCHANGED and still nobody's.
    - ⚠️ **Brief 1's `appliedEntryIds` finding is DISCHARGED ON ITS OWN GROUND.** A month no longer
      cites an entry it did not act on: the walk acts on it. The §3a tripwire that pinned it has
      been re-derived rather than relaxed, and now asserts that every month up to and including
      2027-06 is bit-for-bit identical and 2027-07 is not.
  - [x] **P6-8 brief 2 chunk 2 — the Rebate Income add-back is the ACT's now, and it is worth $63
    at the bottom (2026-09-19).** `asSaptoPerson` no longer re-runs the assessment on
    `salary + sacrificed`. It builds Rebate Income through `incomeBases.ts`:
    `rebateIncome({ taxableIncome, reportableSuperContributions: reportableSuperannuationContributions({ salarySacrificed, … }), … })`,
    which is ITAA 1936 s 6(1) read literally — taxable income PLUS reportable superannuation
    contributions — with an effective sacrifice entering as a *reportable employer superannuation
    contribution* under ITAA 1997 s 995-1(1) and TAA 1953 Sch 1 s 16-182(1)(c)/(d). The other three
    add-backs and the FHSS disregard are written nil rather than defaulted, and the s 290-170
    acknowledgement is stated `false` rather than the brand reused.
    - **FINDING — NOT ONE FIGURE IN THE SUITE MOVED, and the reason is a computable one.** The two
      spellings differ by exactly `min($1,000, assessable) − min($1,000, gross)`: chunk 1 ran
      s 25-130(2)'s standard deduction against the GROSS salary, and the deduction is capped by the
      salary it is measured against. That is nil for every Person who leaves themselves $1,000 of
      assessable pay, which is every fixture in this repo. Chunk 1's SECOND named divergence — a
      gross rebuilt from twelve rounded twelfths of each half sitting cents from the real gross — is
      **retired by removal rather than by disproof, and it never moved a figure**: it was always a
      gap between the reconstruction and a gross nothing computed, and both spellings read the same
      two accumulators, so it could not put the two of them apart. Chunk 2 forms no gross at all.
      The residue that survives is the honest one and is inherent to a monthly walk: the amount
      added back is twelve rounded twelfths of the sacrifice, not the sacrifice, exactly as the
      taxable side is twelve rounded twelfths of the pay.
    - **FINDING — below $1,000 of assessable salary chunk 1 was wrong in the FLATTERING direction,
      and the new fixture prices it at $63.00.** Ida, single, a stated $20,000 salary with $19,500
      sacrificed and a $30,000 net capital gain in FY2026-27: Rebate Income is $49,500 and the tax
      on the gain $523.00, where chunk 1 assessed $49,000 and $460.00. The $63.00 is the 12.5c taper
      on $500 of Rebate Income ($62.50) plus the reg s 10(2) round-up of the offset to the whole
      dollar (50c). **A capital gain is not decoration in that fixture — it is the only way the
      difference is VISIBLE**, because below $1,000 of assessable salary the deduction takes taxable
      income to nil under either spelling and a nil taxable income has nothing for SAPTO to reduce.
    - **`test/app-entry-form.test.mjs`'s `sacrificedThisMonth` count fell 5 → 4 WITHOUT A LINE OF
      CODE MOVING**, because chunk 1 counted the raw file and one of the five was a sentence in a
      comment chunk 2 rewrote. The tripwire now counts the STRIPPED source, so prose cannot trip it
      and chunk 4's fifth site still will.
    - **O30 is NOT made reachable from any new direction by this chunk** and is untouched:
      `MixedSaptoFamilyThresholdError` is thrown out of the family-income limb, which chunk 2 does
      not go near. (**2026-09-21: O30 closed and that class deleted — P3-1f.**) The new fixture is single-Person for chunk 1's reason, not a new one.
    - **`inForceIncomePerFortnight` is untouched.** The user has RULED that the Age Pension income
      test assesses GROSS salary, unreduced by sacrifice; recording that ruling in the register is
      chunk 6's, and no caveat here claims it settled.
    - ⚠️ **STILL OWED.** ~~Chunk 3: the CASH — the `Salary` line still reports the gross, so `received`
      and the Waterfall are over-stated by the whole sacrifice.~~ **DONE 2026-09-20 — see chunk 3
      below.** Chunk 4: crediting the interest and
      charging the 15%. Chunk 5: refusing a sacrifice over the concessional cap or over the salary
      — and chunk 2 adds a reason of its own, `excessConcessionalContributions` is passed nil, so an
      over-cap sacrifice is added back IN FULL where s 995-1 would reduce it (Rebate Income
      over-stated, SAPTO shaded out further, the direction that claims nothing). Chunk 6: the
      Div 293 and SG caveats, and the income-test ruling. ~~The build remains wrong in the FLATTERING
      direction overall until chunks 3 and 4 land~~ **— SUPERSEDED BY CHUNK 3: it is wrong in the
      CONSERVATIVE direction now —** and `SUPER_CONTRIBUTION` stays in
      `ENTRY_TYPES_NOT_YET_WALKED`.
  - [x] **P6-8 brief 2 chunk 3 — the SACRIFICED CASH LEAVES THE PAY PACKET, and the build's error
    changes SIGN (2026-09-20).** The `Salary` line is now a twelfth of `assessableSalaries` — the
    pay actually received — instead of a twelfth of the gross, so `received` falls by the sacrifice
    and the Income Waterfall's limb 1 is handed what the Household actually holds. **One expression
    changed.** `WATERFALL_LIMBS` and `drawWaterfall` are byte-identical to HEAD, proved twice: a
    `git diff -U0 -- src/ test/ | grep -ac 'WATERFALL_LIMBS\|drawWaterfall'` of 0, and a shasum of a
    window around each declaration site against a detached worktree of 64425e6.
    - **The shape is a RE-READ, not a second subtraction.** The cash line reads the same
      `assessableSalaries` the tax lines are assessed on rather than subtracting
      `sacrificedThisMonth` again, so one subtraction exists in the walk and the cash and the
      assessment cannot round differently or drift apart. Consequence:
      `test/app-entry-form.test.mjs`'s `sacrificedThisMonth` code-site count is STILL 4, which is
      re-derived rather than bumped — a fifth site remains chunk 4 crediting the fund.
    - ⚠️ **THE DIRECTION OF THE REMAINING ERROR IS NOW CONSERVATIVE, AND THAT IS NOT A REASON TO
      OFFER THE TYPE.** Between this commit and chunk 4 the money leaves the pay packet and arrives
      nowhere: wealth is UNDER-stated by the whole arrangement. `SUPER_CONTRIBUTION` stays in
      `ENTRY_TYPES_NOT_YET_WALKED`; `entryForm.describeParams`'s row still says "ONLY HALF IN THE
      FORECAST" but names the other half and now ends "every figure above is WORSE than it should
      be". The ground `planEdits.ts` holds the type back on narrowed for the second time: from "it
      flatters" to "a forecast that loses the user's money is not the forecast they saved either".
    - **FINDING — TWO LIMB BOUNDARIES ARE CROSSED THAT WERE NOT BEFORE, and both are asserted as
      behaviour rather than absorbed into a moved number.** (i) `core-projection-tax.test.mjs`'s
      gain fixture: limb 1 falls from $4,015.51 to $2,390.51 against a $3,333.34 target, so **limb 3
      starts selling the Non-Super Portfolio in 2026-10** — $942.83, being the shortfall to the
      cent — where nothing was sold before the stated December sale. (ii) the over-sacrifice walk
      ($90,000 against $57,200 of pay): limb 1 becomes the Age Pension alone, the Offset Account is
      drained, and the month ends **UNFUNDED by $860.40**. The first sacrifice-made-unfundable month
      in the suite. The demo plan crosses NO boundary: limb 2 absorbs the whole $1,124.50 and limbs
      3-5 draw exactly what they drew before, which is asserted with a control that they drew nil.
    - **FINDING — the year's tax on a capital gain did NOT move even though the disposals did.** The
      gain fixture now sells the parcel in four pieces instead of one, but the whole parcel is still
      disposed of inside FY2026-27, so s 102-5's annual computation gives the same $30,000 net gain
      and the same $523.00/$460.00/$610.00. The DECEMBER line is still the whole charge, and for a
      new reason: the telescoped increment from October's and November's slices is nil, because a
      few hundred dollars of discounted gain against a nil salary is under the tax-free threshold.
      Pinned as `gainTax === gainTaxForTheYear` so a future change that makes those months carry tax
      cannot silently under-state.
    - **FINDING — the $63.00 fixture's Age-Pension control LOST ITS PREMISE and could not be
      restored, so it was re-expressed.** It asserted the pension was IDENTICAL across the three
      sacrifice levels. From chunk 3 the three walks differ in CASH by construction ($41.67 and
      $125.00 a month), so their assets and therefore the means test must differ: no fixture can
      make three different sacrifices produce one asset path. It now PRICES the movement instead —
      13c and 39c — from `Δassets × 3.75% × 50c ÷ 12`, agreeing to the cent, and the pension is not
      assessable income in this model so it cannot reach a tax figure at all.
    - ⚠️ **FINDING — THE MARGINAL DEEMING RATE IS THE UPPER ONE IN THAT FIXTURE, AND THE FIRST
      PREDICTION WAS OUT BY 2.14× BECAUSE IT USED THE LOWER.** Chased rather than accepted: Ida's
      ~$78,000 of financial assets are above the single deeming threshold, so the marginal dollar is
      deemed at 3.75%, not 1.75%. The two fixtures in this file disagree for a real reason — the
      `SACRIFICE_HOUSEHOLD` walk, whose assets are a few thousand dollars of swept surplus, does
      move at the LOWER rate ($1.51 on $2,073.34, which is 1.75% × 50c ÷ 12) — and both now agree
      with their own mechanism to the cent. No engine defect.
    - **What did NOT move, verified rather than assumed:** every income-tax figure in the suite (the
      assessable salary is chunk 1's and untouched), the year-end true-ups on both fixtures (the
      accumulator already banked the assessable figure), the Age Pension in the FIRST month of an
      arrangement (the means test reads opening balances), and `inForceIncomePerFortnight`, which
      stays on the GROSS salary by the user's ruling.
    - **The cash and the sacrifice sum to the gross, but only to the cent that one rounding allows.**
      $80,600 with $20,000 sacrificed gives $5,050.00 + $1,666.67 = $6,716.67 exactly; $20,000 with
      $19,000 sacrificed gives $83.33 of pay where the difference of the two twelfths is $83.34. The
      walk divides the remainder once, so the residue lands in the reported split and never in the
      money — the same residue class the settlement's one-dollar de-minimis absorbs, and it is
      pinned in `core-parse-plan.test.mjs` §3a rather than left to be rediscovered.
    - **MUTATIONS.** Reverting the cash line to the gross kills 6; subtracting the sacrifice twice
      kills 5; keeping the cash assessable while the year accumulator banks the GROSS kills 3 (the
      two true-up tests and the source tripwire, so the pair cannot diverge in either direction);
      transposing `WATERFALL_LIMBS` kills 32, so the ordering defence is not weakened.
    - ⚠️ **STILL OWED.** ~~Chunk 4: crediting the interest and charging the 15% — **until it lands,
      every Household with a sacrifice is short by the whole arrangement.**~~ **DONE 2026-09-20 —
      see chunk 4 below.** Chunk 5: refusing a
      sacrifice over the concessional cap or over the salary (still silently capped at the month's
      gross, and chunk 3 makes the excess more visible — a full sacrifice now empties the pay packet
      and can leave the month unfunded). Chunk 6: the Div 293 and SG caveats, and recording the
      income-test ruling in the register. Brief 1's "stopping a standing arrangement on a date is
      not expressible" is UNCHANGED and still nobody's.
  - [x] **P6-8 brief 2 chunk 4 — the SACRIFICED MONEY ARRIVES, and the forecast is honest end to
    end for the first time (2026-09-20).** `contributionsTax(fy, concessionalContributions({…}))`
    from `superConcessional.ts`, and `.netOfTax` credited to the interest the entry NAMES, at the
    end of the tick after the growth — the parcel-purchase convention, so money that arrives in
    month n earns its first return in n + 1. The credit is a **non-cash `MonthLine`** in P4-4's
    sense (`effect: 'wealth'`), so the Waterfall cannot spend money that went from the employer to
    the fund. `WATERFALL_LIMBS` and `drawWaterfall` are byte-identical to 0abf77b, proved twice: a
    `git diff -U0 -- src/ test/ | grep -ac 'WATERFALL_LIMBS\|drawWaterfall'` of 0, and identical
    shasums of a 140-line window around each declaration site against a detached worktree of HEAD.
    - **The fifth `sacrificedThisMonth` site is the credit, and it is a READING.** The month's
      contribution is `monthlyFromAnnual(sacrificedThisMonth[personIndex] ?? toCents(0))` — the
      figure already removed from the pay packet — so there is still one `Math.min` and one
      annual→monthly division of the LEVEL in the walk and the two sides cannot disagree by a
      rounding. `test/app-entry-form.test.mjs`'s count is re-derived 4 → 5 and the new site is named
      in the assertion, not just counted.
    - **`employerContributions` is nil and CAVEATED, and the 15% is nonetheless EXACT.** The
      Superannuation Guarantee is still stranded (brief 3), so the `ConcessionalContributions` built
      here is the sacrifice alone and the Person's real concessional total is higher. s 26(1)(a)'s
      rate is FLAT, so the charge on the sacrificed dollars does not depend on what else went in:
      understating the total understates the total and does not misprice the part. What an
      understated total WOULD misprice is the CAP, which is why nothing here calls
      `applyConcessional`.
    - ⚠️ **FINDING — EVERY SACRIFICE FIXTURE IN `core-projection-tax.test.mjs` NAMED AN INTEREST
      THAT DID NOT EXIST.** `interestIndex: 0` against Persons whose `superInterests` was `[]` —
      plans `parsePlan`'s `checkContributionTargets` would have refused, which reached `project()`
      directly and passed chunks 1-3 because nothing read the index. The walk now refuses it **by
      name**, on `LUMP_SUM_FROM_SUPER`'s precedent in the same file, rather than crediting nothing
      silently (the P4-12 shape). Nine tests went red the moment the refusal was written, which is
      the tripwire working; the fixtures were given a NIL Accumulation Phase interest, which was
      verified to move not one figure of the walks that have no sacrifice.
    - ⚠️ **FINDING — A LIMB BOUNDARY IS *UN*-CROSSED, reversing half of chunk 3's.** The
      over-sacrifice walk ($90,000 against $57,200 of pay) was unfunded in every month from 2026-11
      under chunk 3. Now the sacrifice arrives, Ida is 68 and her superannuation is released, so
      **limb 5 funds December onward in full** — $2,468.12, being the target less the Age Pension,
      with limbs 2-4 drawing nil. 2026-11 is still unfunded by $860.40, and that ordering is
      asserted: the first credit lands at the END of its own tick, after the Waterfall has run. The
      Household is not better off; it has paid 15% to get money into a fund and drawn it straight
      back out to buy groceries, which is what an arrangement bigger than the pay packet is.
    - **FINDING — THE MEANS-TEST ASYMMETRY IS NOW VISIBLE IN BOTH DIRECTIONS, and it is P6-8b's
      whole subject arriving early.** New file `test/core-projection-sacrifice-credit.test.mjs`.
      A couple where the CONTRIBUTOR is under Age Pension age (Nell 54, Owen 69): the credit is
      protected under §4.8's younger-partner exemption while the cash it came out of was assessed
      and deemed, so assessed assets FALL and **the Age Pension RISES** — 26c, 50c, 76c and $1.00 a
      month over the first four months, priced against the deeming chain. The same arrangement made
      by a Person who has REACHED Age Pension age (Ida, 68) **lowers** it, because her Accumulation
      Phase interest is assessed at the balance and deemed. Both signs are asserted against each
      other in one test, with the month the arrangement starts as the control that moves nothing.
    - ⚠️ **THE TAPER IS 25c IN THE DOLLAR, NOT 50c, AND THE FIRST PREDICTION WAS OUT BY 2× BECAUSE
      OF IT.** Only ONE member of that couple is eligible, so the eligible member loses half of the
      combined 50c reduction. Chased rather than accepted, and it is the same class of miss as
      chunk 3's deeming-limb error: a rate copied from a fixture that sits in a different limb of
      the rule. The check is asserted PER FORTNIGHT to within one cent, and the tolerance is
      derived rather than chosen — `deeming` rounds the annual figure and then the fortnightly one,
      against each walk's own absolute assets rather than against the gap, so two walks can round
      opposite ways. One cent against a ~34c taper still separates 25c from 50c by thirty standard
      errors.
    - **FINDING — a predicted asset movement missed by 214c and the miss was the FEEDBACK LOOP.**
      The gain fixture's assessable assets were predicted to rise by two months of credits and rose
      by 214c less: the extra assessed super costs Ida Age Pension in November, and less pension is
      less cash swept. Priced at the UPPER deeming rate (her ~$78,000 is above the single
      threshold), it is 216c — the whole of the gap. The $63.00 fixture's own pension pins moved
      13c → 2c and 39c → 6c exactly as predicted, because the 15% is all that now separates the
      three walks' assets at the margin instead of the whole sacrifice.
    - **What did NOT move, verified rather than assumed:** every income-tax figure in the suite
      (super balances and the Age Pension are not assessable income in this model); the year-end
      true-up ($510.04); the year's tax on the capital gain ($523.00/$460.00/$610.00 — the parcel is
      still wholly disposed of inside FY2026-27); the gain fixture's 2026-10 limb figures (the
      credit lands at the end of the tick); and **the demo plan's cash in every one of its months**,
      byte-identical to chunk 3, because Dana is 59 and her protected interest cannot reach the
      means test and no Age Pension is payable to that Household anyway.
    - ⚠️ ~~**AND THE TYPE IS STILL NOT OFFERED IN THE FORM. The ground narrows for the THIRD time.**~~
      **SUPERSEDED BY CHUNK 5 (2026-09-20): the cap is refused and the type IS offered.** The
      paragraph below is kept as the record of the last ground, which chunk 5 discharged.
      Chunk 4 closes the money path, so "it flatters" (chunk 1) and "it loses the user's money"
      (chunk 3) are both discharged — but chunk 5 is not, and an **over-cap sacrifice is now taxed
      at 15% and nothing else**: Div 291's excess treatment (the excess into assessable income, the
      15% offset, the excess concessional contributions charge) is not applied at all, which is
      wrong in the FLATTERING direction for exactly the Households most likely to use the feature.
      A sacrifice larger than the pay it comes out of is still silently capped and the excess
      dropped. `ENTRY_TYPES_NOT_YET_WALKED` keeps the type back on that ground alone now, stated in
      place; `entryForm.describeParams`'s row is re-derived from "ONLY HALF IN THE FORECAST" to
      naming the cap as the one thing left.
    - ⚠️ ~~**RESIDUAL OPENED — nothing checks the PHASE of the target interest.**~~ **CLOSED BY
      CHUNK 5 (2026-09-20): refused at the DOOR, in `checkContributionTargets`, for both
      retirement-phase kinds. The original paragraph follows.** A contribution is
      made to an ACCUMULATION interest; an account-based pension is closed to them and a real fund
      would open a new interest rather than add to the stream. This build credits whatever interest
      the entry names. Left open deliberately: the gate needs a ruling on what the walk should DO
      with the money, and inventing that in a tick would be the half-ruling this project refuses.
      Recorded here rather than in a caveat nobody reads.
    - **`plan.ts` gained a SIXTH `ProvenanceRegister`**, `'superannuation contributions tax'` — not
      a reuse of `'income tax'`, because the fund's flat charge and the member's marginal assessment
      are different registers and `superConcessional.ts` exists to keep them apart. It is the only
      member whose figure reaches a WEALTH line.
    - **MUTATIONS** (full-suite runs, `# fail` cross-checked against the `not ok` list, excluding
      the 6 known origin-provider socket failures). Crediting the GROSS instead of `.netOfTax` kills
      6; ignoring `interestIndex` and using interest 0 kills 2; crediting the WRONG Person's
      interest kills 6; crediting the fund while leaving the money in the pay packet — money from
      nothing — kills 8; making the credit a CASH line so the Waterfall can spend it kills 6.
    - ⚠️ **STILL OWED.** ~~Chunk 5: refusing a sacrifice over the concessional cap or over the salary,
      and it is now the ONLY thing holding the type out of the form.~~ **Chunk 5 landed 2026-09-20
      and refused the CAP alone; over the SALARY is still silently capped and is recorded as a
      residual in chunk 5's own entry below.** Chunk 6: the Div 293 and SG
      caveats, and recording the income-test ruling in the register. The phase residual above is
      unowned. Brief 1's "stopping a standing arrangement on a date is not expressible" is UNCHANGED
      and still nobody's.
  - [x] **P6-8 brief 2 chunk 5 — the CAP IS REFUSED, the PHASE IS GATED, and the type is OFFERED
    (2026-09-20).** Two refusals and one retirement.
    - **THE CAP, IN THE WALK, BY NAME.** `refuseStatedContributionOverGeneralCap` in
      `superConcessional.ts` raises `ExcessConcessionalContributionsNotModelledError` when the
      STATED annual amount alone exceeds the general concessional cap (ITAA 1997 s 291-20(2)) for
      the financial year the arrangement takes effect in. Called once per `SUPER_CONTRIBUTION`,
      from the entry-application loop, with the month's own `fy`. **Why the stated amount alone:**
      the Superannuation Guarantee is still stranded (brief 3), so every concessional total this
      walk can build UNDERSTATES the Person's real one — it can never prove a Person is inside the
      cap, and it can still prove they are outside it. The refusal fires on the half the
      understatement cannot touch. **Passing it is therefore NOT a finding of compliance**, the
      function returns nothing so no caller can read one out of it, and the credit line's own
      provenance says the year's total is higher than the amount taxed. Div 291 is NOT implemented:
      the excess into assessable income, the 15% offset and the excess concessional contributions
      charge are still unpriced, which is what the refusal exists to avoid pretending about.
    - **THE FIGURES USED, AND THE YEAR EACH CAME FROM.** FY2026-27 $32,500, the register's one
      published concessional cap (§3.1, `superannuation.caps.concessional`). FY2027-28 $35,000, on
      the SYNTHETIC AWOTE Dec-2026 driver of 2,200.00 already in `test/core-super-concessional.
      test.mjs` — a test fixture, never `src/`. Those two are the only computable years, and a
      fixture crossing the change exists only at the pure function: $34,000 is refused in FY2026-27
      and accepted in FY2027-28.
    - ⚠️ **THE BASE AMOUNT IS A FLOOR, AND IT IS WHAT KEEPS THE FEATURE USABLE PAST FY2026-27.**
      s 960-285 indexes cumulatively from $25,000 and the December 2016 quarter and never below
      that base (`indexCap`: factor ≤ 1 → base amount), so an arrangement within the base amount is
      within EVERY year's cap and needs no index number. Above it, a year with no AWOTE number
      raises `MissingIndexNumberError` through this call — which is the honest answer and not a
      guess (growing last year's cap by an assumed rate is T13). **Measured, not predicted:**
      without the floor, seven pre-existing tests went red, every one of them a sacrifice dated in
      FY2027-28 — including the demo-plan section of `core-parse-plan.test.mjs`.
    - **THE RESIDUAL THE ONCE-PER-ENTRY CHECK LEAVES IS ONE-SIDED AND NARROW.** The cap is tested
      in the year the arrangement takes effect and not in every later year, because no later year's
      cap is computable. An arrangement inside its own year's cap can breach a later year's only if
      AWOTE FALLS, since the cap indexes from a fixed base and is floored at it.
    - **THE PHASE GATE IS AT THE DOOR.** `parsePlan`'s `checkContributionTargets` refuses
      `phase !== 'accumulation'` for both retirement-phase kinds, in its existing shape and under
      `PlanFileEntryError` — no new named class, because the law's answer is known and the message
      states it. The phase is a fact about the Household and is static for the whole walk (nothing
      under `src/` assigns `SuperInterest.phase` after the file is read), so a month is never the
      place to discover it. Before this, the walk credited an account-based pension, which no fund
      would do.
    - ⚠️ **CHUNK 2'S RESIDUAL IS NOW UNREACHABLE, AND THE HANDLING STAYS.**
      `excessConcessionalContributions: nil` in the Rebate Income add-back overstated Rebate Income
      for an over-cap sacrifice (s 995-1 reduces reportable super contributions by the excess), and
      **no over-cap sacrifice can now reach that line at all** — the walk refuses the arrangement
      before any month is assessed. Recorded rather than deleted: a refusal can be lifted, and the
      day Div 291 lands the nil becomes wrong again rather than merely unreachable.
    - **NOT ONE FIGURE MOVED, as predicted — this chunk adds refusals.** What moved was the SHAPE of
      one fixture: the over-salary test in `core-projection-tax.test.mjs` stated $90,000 and $57,200
      against Ida's $57,200 of pay, and both are over the cap. It is re-built rather than re-based:
      Ida's salary is STATED at $30,000 and she sacrifices $32,500 — at the cap exactly, and $2,500
      more than she is paid — so the rule the test is for (a sacrifice bigger than the PAY is capped
      at the pay) survives the rule that killed its numbers. The credit is $2,125.00 a month
      ($30,000 ÷ 12 less 15%) and is identical to a $30,000 arrangement's: the excess over the
      salary reaches neither the pay packet nor the fund. The old fixture's UNFUNDED month is gone
      with it and the reason is computable — the income test is on the GROSS salary, so a Person
      stating $30,000 rather than $57,200 draws $2,000.33 of Age Pension instead of $868.18, which
      with the Offset Account covers the target.
    - ⚠️ **THE TYPE IS OFFERED FROM TODAY, and `ENTRY_TYPES_NOT_YET_WALKED` IS EMPTY.** Every ground
      the list ever carried for `SUPER_CONTRIBUTION` is discharged: it does not flatter (chunk 1),
      it does not lose the money (chunk 3), it credits the account the user named (chunk 4), and it
      no longer prices a plan it cannot price (this chunk). The list is kept, empty, because it is
      the one place the door/walk gap can be held open and the next parser-first type will need it.
      `entryForm.ts` gains the seventh builder, two boxes of its own and
      `SUPER_CONTRIBUTION_ENTRY_NOTICE`; `describeParams`'s row is re-derived from "IN THE FORECAST,
      EXCEPT THE CAP" to naming the three things that are still out of it. **Verified in a browser**:
      the rendered page carries seven `<option>`s, the two new inputs and the notice.
    - **WHAT IS STILL INCOMPLETE IS INCOMPLETE CONSERVATIVELY, AND ALL THREE ARE ON SCREEN.** The
      Superannuation Guarantee is not contributed (brief 3), so balances are UNDERSTATED; Division
      293's second 15% is not charged on the credit, so a Person near $250,000 pays more than shown;
      and an amount above the pay is capped at the pay with the excess dropped, so the arrangement
      forecast may be SMALLER than the one stated, never larger. The notice and the row say all
      three, each with its direction.
    - ⚠️ **STILL OWED, and none of it blocks the offer.** Refusing (or honouring) a sacrifice larger
      than the SALARY — today it is silently capped, which is a substitution the user is told about
      in the notice rather than refused. **Carry-forward is NOT run** (`applyConcessional`, P3-4b):
      a Person with unused cap space and a Total Super Balance under $500,000 may lawfully
      contribute above the general cap under s 291-20(4), and this build refuses them — an
      OVER-refusal, conservative, and it needs a contribution history the plan file has no field
      for. Div 291 itself. Chunk 6: the Div 293 and SG caveats in the register, and recording the
      income-test ruling. Brief 1's "stopping a standing arrangement on a date is not expressible"
      is UNCHANGED.
    - **MUTATIONS** (full-suite runs, `# fail` cross-checked against the `not ok` list, excluding
      the 6 known origin-provider socket failures; each diffed before running). Removing the cap
      refusal from the walk kills **2**; pointing the walk at TODAY's year instead of the month's
      kills **1**, and the same narrowing made inside the pure function — where the synthetic
      FY2027-28 driver can meet it — kills **3**; moving the boundary from `>` to `>=` kills **4**;
      deleting the phase gate kills **1**.
    - **`WATERFALL_LIMBS` and `drawWaterfall` are byte-identical to 70fea4b**, proved twice: a
      `git diff -U0 -- src/ test/ | grep -ac 'WATERFALL_LIMBS\|drawWaterfall'` of 0, and identical
      shasums of a 141-line window around each declaration site against a detached worktree of HEAD.
  - [x] **P6-8 brief 2 chunk 6 — the MID-YEAR TRUE-UP IS PRICED BOTH WAYS, and every caveat is on
    the record — ✅ 2026-09-20.** The closing chunk: one fixture and the documentation. No engine
    behaviour, and none was needed.
    - **THE TRUE-UP FIXTURE, AND WHAT IT ADDS TO CHUNK 1's.** Chunk 1 pinned a November start whose
      July settlement is an INFLOW of $510.04, with the mutation beside it. An inflow is the shape a
      reader generalises from — *a mid-year start always refunds* — and **it is false.** The
      settlement is a Jensen gap and nothing else: the walk accrues on the CHORD between the tax at
      the two salary levels and settles on the CURVE at the year's average, so **convex refunds and
      concave charges**. Two walks of the SAME arrangement now sit beside each other, same Person,
      same $18,000, same November, opposite signs.
    - **HAND-WORKED, PREDICTED BEFORE IT WAS RUN, AND EVERY FIGURE LANDED FIRST TIME.** Cass, 47,
      single, $78,000. FY2027-28 gross months: $77,000 taxable → $3,752.00 + $9,600.00 − $250.00
      WATO + $1,540.00 levy = $14,642.00, LITO nil → **$1,220.17** a month, four of them. Sacrificed
      months: $59,000 taxable → $3,752.00 + $4,200.00 − $115.00 LITO − $250.00 + $1,180.00 =
      $8,767.00 → **$730.58**, eight of them. Accrued **$10,725.32**. The year's ASSESSABLE salary is
      4 × $6,500.00 + 8 × $5,000.00 = **$66,000.00**, taxable $65,000.00 → $9,752.00 − $25.00 −
      $250.00 + $1,300.00 = **$10,777.00**. **July 2028 CHARGES $51.68.**
    - ⚠️ **THE CONCAVITY IS LITO's CUT-OUT, and it is the one the register's P4-2 note named.** The
      effective marginal rate in FY2027-28 runs 16% / 21% / 33.5% and then **FALLS to 32% above
      $66,667**, where LITO's second-stage taper ends. $65,000 and $77,000 straddle it, the chord
      slope is 32.64c and the curve climbs at 33.5c, and $6,000 × 1.5c ≈ the $51.67 gap. The control
      walk states $60,000 instead: $59,000 and $41,000 taxable, average $47,000, all below the
      cut-out, convex, and the same machinery REFUNDS **$333.32**.
    - **THE BRIEF'S THREE WARNINGS WERE ALL LIVE AND ALL AVOIDED BY DERIVING RATHER THAN COPYING.**
      The lowest rate is **14%** from FY2027-28 in this build and not 16% (Sch 7 Pt I cl 1(b)'s third
      table, P2-10b); the Medicare FAMILY shade-in can dominate a swing and does not arise here
      because the fixture is SINGLE; and the means-test feedback loop cannot put a term in any figure
      because Cass is 47 and draws no pension. The fixture is built to make the derivation closeable,
      and each exclusion is stated in it rather than left to be noticed.
    - ⚠️ **THE CAP CONSTRAINED THE FIXTURE AND THE COMPROMISE IS RECORDED RATHER THAN WORKED
      AROUND.** Chunk 5 refuses a stated amount above the year's general cap; only FY2026-27's
      $32,500 is published, and s 960-285(4)'s $25,000 base-amount floor is what makes any later year
      answerable at all. So a FY2027-28 fixture may state **$25,000 at most**, and the violent
      straddle that would show this effect at scale — $40,000 out of $150,000 — is unwalkable in this
      build. The straddle is bought with a modest salary instead: the SIGN is the finding, the $51.68
      is not. Opened as **O79**.
    - **THE REGISTER: one ruling, six open items, one amendment, all dated 2026-09-20 except R14.**
      - **§4.3.1 — RULED (R14), 2026-09-19, the user's ruling, recorded in substance:** the Age
        Pension **INCOME TEST assesses the GROSS salary**, unreduced by salary sacrifice. Two
        grounds: it is what Centrelink does (sacrificed super is added back for the income test), and
        it is the conservative direction — gross assesses more income, takes more pension off under
        the taper, and so **UNDERSTATES** the pension of anyone who sacrifices rather than flattering
        it. **Taken in the ABSENCE of a source, not against one**, `unverified`: the register has no
        provision on Centrelink's treatment and never had. A real provision SUPERSEDES it and does
        not have to overturn it, whichever way it runs. The three places in `src/` and `test/` that
        said *nobody has ruled* are corrected IN PLACE, superseded rather than edited away.
      - **O76** the Centrelink gap R14 stands in for; **O77** the three understating gaps on the
        user-facing notice (SG not contributed, Div 293's second 15% not charged, an amount above the
        pay silently capped at the pay) — with the direction of each stated separately, because
        **(ii) is the one that FLATTERS**; **O78** carry-forward not run, so lawful headroom is
        OVER-refused and the plan file has no contribution-history field to fix it with; **O79** the
        cap's one computable year and the s 960-285(4) floor; **O80** chunk 2's
        `excessConcessionalContributions: nil`, now unreachable and **live again the day the refusal
        lifts**; **O81** the target interest's phase is gated at the DOOR and never re-checked in the
        walk, which a mid-walk phase change would also defeat.
      - **O30 gains its second road**, and it is a USER ACTION rather than a fact about the
        Household: a sacrifice moves family income without moving SAPTO entitlement, so a couple
        clear of the 1.25× gate can be pushed under it by an arrangement that changes nobody's
        entitlement. **O40's concessional twin now exists** — §3.2's *"there is no O40 for the
        concessional cap"* is struck in place and points at O79.
    - ⚠️ **THE REGISTER ROWS WERE PROSE ENFORCED BY NOTHING, AND THAT WAS MEASURED, NOT ASSUMED.**
      Deleting the O79 row failed **ZERO** tests on the first run — this project's recurring defect,
      a rule consumed by nothing. Two canaries were then added to
      `test/core-projection-tax.test.mjs` and re-measured: deleting a row fails **1**, and so does
      deleting the DIRECTION sentence out of a row that survives, which is the half that matters.
      R14 is pinned as ONE contiguous subject-verb-object span (a keyword bag survives *"the income
      test MAY assess the gross"*), with the hedges banned and **the MODALITY of its ground asserted
      separately** — rewording *absence of a source* to *where the register happens to be quiet*
      fails **1**, and it is the difference between a provision superseding R14 and having to
      overturn it.
    - **MUTATIONS** (full-suite, `# fail` cross-checked against the `not ok` list, less the 6 known
      origin-provider socket failures; each diffed before running, each reverted from a `cp` copy).
      **(1) GROSS into `taxYearToDate.salary`** — chunk 1's mutation — now fails **6**, of which one
      (`the walk dispatches on the six…`) fires on the mutation's TEXT rather than its behaviour, so
      the behavioural count is **5** against chunk 1's 2: **chunk 6's three fixtures each kill it
      independently**, and the new fixture's $3,916.68 spurious charge is a different figure from
      chunk 1's ~$3,690, so the two are not one assertion twice. **(2) the sacrifice applied from the
      START of the financial year** rather than the entry's month fails **8**, three of them chunk
      6's. **(3) a register row deleted** — see above: **0 before the canary, 1 after.**
    - **`WATERFALL_LIMBS` and `drawWaterfall` are byte-identical to ebb1335**, proved twice: a
      `git diff -U0 -- src/ test/ | grep -ac` of **0**, and identical shasums of a 141-line window
      around each declaration against a detached worktree of HEAD, removed after.
    - **NOTHING MOVED, AS PREDICTED.** 1596 → 1601 tests, `# fail 0`, and no existing figure changed
      in any of them: the register is prose and the fixture is new.
  - [x] **P6-8 BRIEF 2 IS CLOSED — ✅ 2026-09-20.** Chunks 1-6 above were left `[ ]` while the brief
    was in flight and are ticked here; their own dated bodies are the record. **What the six
    delivered:** a salary sacrifice reduces the salary assessed (1), is added back to Rebate Income
    by the mechanism ITAA 1936 s 6(1) names (2), leaves the pay packet as cash (3), arrives in the
    named interest less the fund's 15% and is seen correctly by both means tests (4), is refused by
    name above the year's general cap and gated at the door on the target's phase (5), and settles
    the financial year correctly in both directions with every caveat on the record (6).
    `SUPER_CONTRIBUTION` is an OFFERED entry type and `ENTRY_TYPES_NOT_YET_WALKED` is empty.
    - **WHAT A USER CAN NOW HONESTLY FORECAST:** a standing salary sacrifice of up to the year's
      general concessional cap, priced end to end — the income tax it saves at the Person's own
      marginal rate, the cash it removes from the pay packet, the 15% the fund pays, the balance that
      arrives in the interest they chose, and what BOTH Age Pension tests make of the result,
      including the §4.8 asymmetry that lets a sacrifice by the younger member of a couple RAISE the
      entitlement. **WHAT IS STILL MISSING, all of it recorded and all but one of it conservative:**
      the Superannuation Guarantee (brief 3), Division 293's second 15% — the one gap that flatters —
      Division 291's excess treatment, carry-forward, an arrangement bigger than the pay, stopping an
      arrangement on a date, and Centrelink's actual provision behind R14.
    - **WHAT BRIEF 3 OWES:** the Superannuation Guarantee, contributed by the walk.
      `src/core/superContributions.ts` is built and reaches no walk, so **every** employed Person's
      super is understated today and no concessional total this build computes is complete —
      which is the exact ground on which chunk 5's cap refusal tests the STATED amount alone (O77).
      Brief 3 should expect to revisit that test: once the Guarantee is counted, the total can prove
      a breach the stated amount cannot, and it can still never prove compliance while Div 291 and
      carry-forward are out.
    - **RESIDUALS CARRIED FORWARD, with their homes:** O76 (Centrelink/R14), O77 (SG, Div 293,
      the over-pay capping), O78 (carry-forward over-refusal), O79 (one computable cap year),
      O80 (the unreachable nil), O81 (phase gated at the door only), O30's second road, and brief
      1's *stopping a standing arrangement on a date is not expressible*, which is UNCHANGED by all
      six chunks.

  - [x] **P6-8 brief 3 chunk 1 — the SUPERANNUATION GUARANTEE IS COMPUTED, AND CREDITED TO NOTHING
    ✅ 2026-09-20.** `src/core/superContributions.ts` was written in P3-3a and reached no part of
    the walk for nine days; it is CALLED now. The employer's Guarantee is computed from each
    employed Person's own earnings and surfaced in `Month.notes` as a fourth `subject`,
    `'superannuation guarantee'` — and **no money moves**: no balance, no concessional total, no
    cap. Proof, not assertion: the whole walk output of three scenarios (the 501-month demo
    included), notes aside, is BYTE-IDENTICAL to 4043b56.
    - **THE POINT OF THE CHUNK, PROVEN IN ISOLATION: the earnings base is honest.** SGAA s 10A(1)
      qualifying earnings replaced ordinary time earnings on 1 July 2026 (T17), and a sacrificed
      amount is part of them (ss 10A(1)(h), 10A(4)(b)). So the base is built from the salary
      ACTUALLY PAID plus the sacrifice ADDED BACK — which is the pre-sacrifice gross — and a Person
      on $120,000 is owed $14,400 a year whether they sacrifice nothing or $24,000. The plausible
      wrong answer, 12% of the $100,000 payslip gross, is $12,000, and
      `test/core-projection-super-guarantee.test.mjs` asserts against it by number.
    - **NOTHING IS GUESSED, and the two places it could have been are refusals instead.** The 12 is
      `SUPERANNUATION.superGuarantee.chargePercentage`, a dated `config` record read for the
      MONTH's financial year (never today's); the third limb of the base is nil BY STATEMENT under
      register O19 and the module's caveat saying so travels in every note.
    - ⚠️ **THE GUARANTEE IS COMPUTABLE IN FY2026-27 AND IN NO OTHER YEAR, which is O79 arriving by
      a new road.** The maximum contributions base is derived from the year's concessional cap
      (s 10A(5), T18) and the cap indexes on AWOTE, so from FY2027-28 `superGuarantee` raises
      `MissingIndexNumberError`; a walk that opens before 1 July 2026 raises
      `SuperGuaranteeEarningsBaseError` for its early months. Both are caught HERE — where nothing
      is credited, so no figure hangs on them — and reported as `annualAmount: null` with the
      register's own sentence. **A null, never a nil.** ⚠️ **Chunk 2 cannot do the same**: the
      moment the Guarantee is CREDITED, a year it cannot compute is a year it cannot contribute
      for, and that is a ruling the brief has to take rather than a catch.
    - **ONE EMPLOYMENT PER PERSON, and it is the conservative reading.** The ceiling is per employer
      (T18); this model holds one salary with no employer identity, so it charges one ceiling. At or
      below $270,830 the two readings agree exactly; above it, one ceiling is the LOWER answer.
    - **WHAT THIS CHUNK DID NOT DO, by instruction:** it credits nothing (chunk 2), it leaves
      `employerContributions: toCents(0)` in the concessional total (chunk 3) — pinned by a
      tripwire so the chunk that changes it has to come back and say so — it leaves
      `refuseStatedContributionOverGeneralCap` and O77's register row exactly as chunk 5 left them,
      and it does not touch `inForceIncomePerFortnight` (R14 stands).

  - [x] **P6-8 brief 3 chunk 2a — `SuperInterest` CAN NAME ITSELF AS THE GUARANTEE'S DESTINATION,
    and nothing is credited yet ✅ 2026-09-20.** The Guarantee has to land in a NAMED account.
    That was derivable for a Person holding exactly ONE accumulation interest and underivable for a
    Person holding two: `SuperInterest` carried `phase`, `balance` and the per-stream settings, and
    none of them says which fund an employer pays into. *"The one with the larger balance"* was
    available and is a guess wearing the costume of a derivation, so the user ruled (2026-09-20)
    that the missing field be ADDED and the underivable case go on being refused.
    `statedEmployerContributionDestination` is that field: OPTIONAL, per interest, one value
    (`'superannuationGuarantee'` — the only kind of employer money this build knows).
    - **FOUR KINDS OF ABSENCE, THREE OF THEM LEGAL, each with a fixture** (§3b of
      `test/core-parse-plan.test.mjs`). (1) Nobody stated it and the Person holds ONE accumulation
      interest — legal, and it is every plan file on every disk and every fixture in the suite.
      (2) Nobody stated it and the Person holds NO accumulation interest — legal. (3) Nobody stated
      it and the Person holds TWO — **legal at the door**, destination UNDETERMINED. (4) Stated on
      a retirement-phase interest, or on TWO interests of one Person — **refused by name**.
    - **THE OVER-REFUSAL IS THE MUTATION THIS CHUNK WAS BUILT AROUND.** A door that demanded the
      field wherever it could be stated rejects every plan written before today for a question its
      author was never put; measured, it fails **76** tests, and requiring the key on every
      interest fails **92**. Absence is legal, so **no migration is owed and none was written** —
      the file stays version 2.
    - **PERSISTENCE, which is where a new optional field really dies.** `planWithStatedPosition`
      REBUILDS each interest out of the two boxes the form has, so the nomination is carried
      through **by position**, beside `statedStreamSettings`: without that, a user who nominated a
      fund and then edited a balance would have the nomination silently dropped into a file that
      still parses and still draws a chart. ~~There is no control for it in `settingsPanel.ts`~~ — from 2026-09-29 the "Employer pays into" select
      states it (shown for a salary and two or more accumulation accounts; see the S4 follow-up); recorded in O82.
    - **NOTHING IS CREDITED, and it is pinned.** `projection.ts` names the field ZERO times; a
      household that nominates its destination walks to months byte-identical to one that does not;
      `employerContributions: toCents(0)` is untouched, as are
      `refuseStatedContributionOverGeneralCap`, O77 and `inForceIncomePerFortnight` (R14 stands).
    - **Register O82** records that the destination is now derivable, what is still undetermined,
      and the DIRECTION — an undetermined destination credits nothing, so it can only UNDERSTATE a
      Household, never flatter one. Canaried, because a row nothing reads enforces nothing.

  - [x] **P6-8 brief 3 chunk 2b — the SUPERANNUATION GUARANTEE IS CREDITED, net of the fund's 15%
    ✅ 2026-09-20.** The largest understatement this model carried is closed: from this chunk every
    employed Person's employer contribution reaches a superannuation balance. It is computed in one
    place (`superGuaranteeThisMonth`), reported in the `Month` note, written as a `'wealth'` line,
    and added to the interest AFTER the month's growth — one `ContributionsTax`, read three times,
    so the note, the line and the balance cannot disagree.
    - **NET, NEVER GROSS, and that was the brief's first instruction.** An SG contribution is an
      assessable contribution of the fund and Income Tax Rates Act 1986 s 26(1)(a)'s 15% falls on
      it, through the same `contributionsTax` chunk 4 of brief 2 built for the sacrifice. Crediting
      the gross and taxing it later would have left the model 15% rich in the interim. Mutation:
      crediting `monthly` instead of `tax.netOfTax` fails **25** tests.
    - **THE FLOOR IS WHAT MAKES A LATER YEAR COMPUTABLE, and it is a proof, not an approximation.**
      s 10A(5)'s ceiling is derived from the AWOTE-indexed concessional cap, so FY2026-27 is the
      only year this register can state it for. But ITAA 1997 s 960-285(4) makes the cap's $25,000
      base amount a FLOOR and the ceiling is monotone in the cap, so **every year's ceiling is at
      least `floor_to_10(25,000 × 100 ÷ 12) = $208,330`**. `superGuaranteeBelowTheFloor` charges 12%
      of the first $208,330 of qualifying earnings with **no index number consumed**; only the
      charge on earnings ABOVE that floor needs the year's own ceiling, and where it cannot be
      derived that excess is REFUSED BY NAME, per employment, while the rest is still paid.
      The figure is derived from the spec in `superContributions.ts` and appears as a literal in no
      walk — pinned by a source tripwire that also exercises both branches of `indexCap`.
    - **THE DESTINATION: derived, stated, or refused — never guessed (O82 closed).** One
      accumulation interest and no nomination resolves to it; a
      `statedEmployerContributionDestination` is taken at its word; **two accumulation interests
      with no nomination is REFUSED BY NAME IN THE WALK**, with a message that names the field and
      the value to state; **a salaried Person with NO accumulation interest is refused too**, on the
      user's ruling that the Guarantee must land in a named account. Mutations: guessing "the first
      one" for the ambiguous case, and ignoring a nomination, each fail **1** test — the two tests
      written for them, and no fixture in the suite reaches those shapes by accident.
    - ⚠️ **LATER-CHUNK WORK ABSORBED, and the chunk plan is revised for it.** Feeding the Guarantee
      into `concessionalContributions`'s `employerContributions` limb was assigned to a later chunk;
      it is done here, because the alternative was a gross credit. There are TWO
      `ConcessionalContributions` per Person-month — the sacrifice's, which still names a nil
      employer limb, and the Guarantee's, which names the month's credit — and the 15% is flat, so
      each line reports the charge on its own dollars. **What is NOT absorbed and is the next
      chunk: the CAP.** `refuseStatedContributionOverGeneralCap` still measures the stated sacrifice
      alone, so the engine can prove a breach and never compliance; both credit lines say so, and
      the `Month` note says it too.
    - **~33 salaried fixtures moved and every one was re-derived, not re-pasted.** The expectation
      is one shared helper (`test/fixtures/super-guarantee.mjs`) taking nothing but the fixture's
      own stated salary. ~20 of them gained a NIL accumulation interest, because a salary with
      nowhere to pay the Guarantee is now refused. **The demo plan's delta was predicted before it
      was read**: Dana is paid $3,100 a fortnight, so $685.10 a month lands for the 56 months she
      works, and compounded to the 2035-05 peak that is $57,223.95 against the $57,223.92 observed —
      three cents, being the walk's monthly floor-to-the-cent.
    - **THE AGE PENSION MOVES, in the direction §4.8 predicts, and both signs are asserted.** For a
      Person UNDER Age Pension age the credited Guarantee is exempt from both means tests and the
      pension does not move at all; for a Person OVER it the same credit is assessed and deemed, and
      the pension falls — 22 cents in the month after the first credit on a $39,000 salary, worked
      out long in `core-projection-tax.test.mjs` and `core-projection-means-test-income.test.mjs`.
    - **NOT CASH, and the Waterfall is untouched.** The line is `'wealth'`; the money goes from the
      employer to the fund and the Household never holds it. `WATERFALL_LIMBS` and `drawWaterfall`
      are BYTE-IDENTICAL to 4b86b18 (sha256 over the 5,647-byte window, and zero occurrences of
      "Guarantee" inside it). Mutation: making the line `'cash'` fails **43** tests.
    - **What this chunk did NOT do:** the cap (next chunk, and it has a user-visible consequence
      needing a release note), O77's row, `inForceIncomePerFortnight` (R14 stands), and O30.

  - [x] **P6-8 brief 3 FINAL CHUNK — the CAP MEASURES THE REAL TOTAL, and O77 is down to two gaps
    ✅ 2026-09-20.** `refuseStatedContributionOverGeneralCap` deliberately tested the stated
    sacrifice ALONE, because the Guarantee was stranded and every total the walk could build
    understated the Person's real one — it could prove a breach and never compliance. Chunk 2b
    discharged that ground, so the check is now `refuseConcessionalContributionsOverGeneralCap`, it
    takes the four s 291-25 **components** rather than an amount, and it builds the total with the
    one constructor (`concessionalContributions`) so no caller can hand it a single limb.
    - ⚠️ **RELEASE NOTE — A SACRIFICE THAT WAS LEGAL YESTERDAY CAN BE REFUSED TODAY, AND IT IS A
      BEHAVIOUR CHANGE, NOT A BUG.** The employer's Superannuation Guarantee counts towards the
      concessional cap in law, and from 2026-09-20 this build counts it. **$27,000 sacrificed
      against a $150,000 salary is $27,000 plus about $18,000 of Guarantee — $45,000 of concessional
      contributions against a $32,500 cap — and is refused by name where it was walked before.** A
      user whose saved plan projected yesterday and refuses today reads why in
      `SUPER_CONTRIBUTION_ENTRY_NOTICE`, which states the change, its date and that worked example
      in terms. The remedy is arithmetic and is in the message: the room left for a sacrifice is the
      cap less the Guarantee.
    - ⚠️ **AND THE FLOOR IS CROSSED BY TOTALS THAT NO LIMB CROSSES, WHICH IS THE SECOND HALF OF THE
      SAME NOTE.** s 960-285(4) floors every year's cap at $25,000, so a total within that needs no
      AWOTE number; above it the year's own cap is needed and FY2027-28 onwards has none. **A
      $10,000 sacrifice against a $130,000 salary cleared the floor on its own and does not clear it
      as a $25,600 total: from 1 July 2027 it raises `MissingIndexNumberError` by name.** The room in
      an unpublishable year is $25,000 less the Guarantee — $15,328 on an $80,600 salary, nil on a
      salary of $208,334 or more. Guessing a cap is the only thing that would make those walk, and
      it is the thing this build will not do (O79, widened).
    - **WHERE IT RUNS, AND WHAT THE MOVE PRE-EMPTS.** The check was in the entry loop, which runs
      before `inForceSalary` is derived — and the Guarantee is 12% of a salary. It now runs
      immediately after the month's Guarantee is computed, so it is **after** the means test, the
      Work Bonus write-back, the salary and income-tax lines, and — the one that matters —
      **after `superGuaranteeDestination`, whose two refusals now pre-empt it**: a Household with
      two unnominated accumulation interests, or a salary and no accumulation interest, hears about
      the destination first. It still pre-empts the whole of the rest of the tick and every later
      month, and still throws before the month is pushed, so no `Month` is produced for a year this
      build refuses to price.
    - **THE SACRIFICE LIMB IS THE AMOUNT ACTUALLY CONTRIBUTED** (`sacrificedThisMonth`, the month's
      `Math.min(gross, stated)`) and not the stated figure, so the over-pay gap makes the check
      weaker and never stricter, and the amount measured against the cap cannot differ by a cent
      from the amount paid into the fund. It is the seventh reading of that figure and it is argued
      for in `test/app-entry-form.test.mjs`, where the count is pinned.
    - **A PERSON WHO STATES NO SACRIFICE IS NEVER CHECKED — and cannot breach the cap.** SGAA
      s 10A(5)'s maximum contributions base is derived here as `floor_to_10(cap × 100 ÷ 12)`, so 12%
      of it is at most the cap itself. The check fires exactly where a breach is possible.
    - **IT STILL CANNOT PROVE COMPLIANCE, and now the residue runs BOTH ways.** Carry-forward
      headroom is not run (it would make the CAP larger — O78) and a personal deductible
      contribution has no field in this model (it would make the TOTAL larger). The function returns
      nothing, so no caller can read a clean bill out of it, and both credit lines say so.
    - **FIXTURES: five re-derived, none re-based.** Every one states a salary, so every one now
      carries a Guarantee, and each was rebuilt so the rule it exists for survives the rule that
      killed its numbers — the demo plan's sacrifice $20,000 → $15,000 (Dana, $80,600, SG $9,672,
      total $29,672 over the $25,000 FY2027-28 floor); Ada's $20,000 → $15,000 ($120,000, SG
      $14,400, total $34,400 over FY2026-27's $32,500); Ida's mid-year $20,000 → $15,000 ($57,200,
      SG $6,864, total $26,864 over the floor); Ida's over-the-pay fixture $32,500 against a stated
      $30,000 → $27,500 against $25,000 (SG $3,600, total $33,600 over the cap); Cass's $18,000 →
      $15,000 ($78,000, SG $9,360, total $27,360 over the floor). All figures hand-worked from the
      rate scale; three of the five reproduced the walk's true-up to the cent first time, including
      the Medicare family shade-in at $642.87.
    - **O77 SAYS TWO, NOT THREE, AND THE COUNT IS CANARIED BOTH WAYS.** The row's closed limb is
      struck through and kept, exactly once, inside its correction frame; the canary pairs the
      spelled count with the limbs the row actually enumerates, so prose moving alone fails and a
      limb moving alone fails. **Division 293 is the only flattering gap left in this feature**, and
      it is the next brief.
    - **MUTATIONS (applied, counted, reverted).** Testing the sacrifice alone again fails **6**;
      counting the Guarantee twice fails **25**; testing the total against the NEXT year's cap fails
      **10**; deleting O77's row fails **2**. Two more on the register prose: "TWO" → "Three" alone
      fails **2**, un-striking the closed limb fails **1**.
    - **NOT CASH, AND THE WATERFALL IS UNTOUCHED.** `WATERFALL_LIMBS` and `drawWaterfall` are
      BYTE-IDENTICAL to 498d87c (sha256 over the 5,648-byte window; zero diff hunks touch either
      name).
    - **What this chunk did NOT do:** Division 291's excess assessment (still refused by name),
      Division 293 (next brief, and its disclosure is untouched), `inForceIncomePerFortnight` (R14
      stands), and O30.

  - [x] **P6-8 brief 4 — a standing salary sacrifice can be STOPPED FROM A DATE ✅ 2026-09-21.**
    User ruling: *"make it stoppable to accommodate user financial choices and situation."* The case
    that was blocked is narrow and the work is scoped to it — **stopping voluntarily while still
    working**. Retirement was never the gap: `sacrificedThisMonth` is `Math.min(gross, stated)`, so
    a sacrifice already falls to nil when the salary does, and that is now a test rather than a
    claim.
    - **THE SHAPE, AND THE TWO THAT WERE REJECTED.** `SuperContributionParams` gains a second
      member, `kind: 'stopped'`, carrying nothing but the discriminant — the entry's date is the
      whole of the fact. It is `NON_SUPER_INVESTMENT.direction`'s precedent, which `plan.ts` already
      named as the way to grow this union: no existing member changed shape, no existing plan moved
      a byte, and every reader that switches on `kind` was made to decide what a stop means by the
      COMPILER. Rejected: **`endsOn` on the arrangement**, which would make this the only
      self-terminating level in a file where every other level is superseded by a later dated entry
      — a reader who learned that idiom here would look for it on `SPEND_CHANGE`; and **a separate
      entry type**, which splits one arrangement across two names, needs a `ENTRY_KIND` row, a
      README line and a form branch, and is the split `ENTRY_KIND`'s own doc refused when it declined
      to make this type mean both a level and a one-off. **Nil is still refused and `enabled: false`
      still means the whole walk**; the point of the ruling was a THIRD thing to say, not a second
      spelling of one of those two.
    - **THE ORDERING, RULED AND TESTED.** One door rule settles all of it: *the most recent
      `SUPER_CONTRIBUTION` for the same Person strictly before a stop must be an arrangement.* So a
      stop dated BEFORE the arrangement it means to stop is refused (a level does not reach forward
      and cancel a later one — it would sit in the plan and change no figure ever, the P4-12 silent
      no-op); a SECOND stop is refused (nothing is running by then); a stop in the SAME month as the
      arrangement is refused (the alternative is resolving it by position in the entry list, an order
      the user cannot see); and a **restart** is simply another arrangement, which supersedes the
      stop from its own date and is measured against the cap on its own amount. The comparison is on
      `date` and never on `enabled`, so switching an arrangement off cannot make a file stop loading.
    - **WHICH KIND OF NOTHING — six, and no two of them one value.** Never stated / stated but not
      started / running / stopped by the user / running but contributing nil because earnings are
      nil / switched off for the whole walk. The one with nothing to show for itself was the stop —
      the entry moves no money, so it has no line — and it gets the sixth `MonthNote`,
      `SalarySacrificeStoppedNote`, in EVERY month it governs, naming the Person, the entry and the
      date. `test/core-projection-sacrifice-stop.test.mjs` builds all six walks and asserts their
      signatures are six distinct values.
    - **THE CAP AND DIVISION 293.** Both follow from one absence: the stop clears `sacrificeLevel`,
      and every downstream figure is computed month by month off what is in force in that month.
      Nothing is recomputed backwards, so the months already run keep their contributions and their
      consumption of those years' cap. ⚠️ **The cap's RELEASE cannot be observed as a refusal that
      stops firing** — the cap check runs only in a month an arrangement is STATED, so after a stop
      no check is asked at all. It is observed instead through the figure the cap measures: the
      Guarantee note's s 10A(1)(h) add-back falls to nil, and the **Division 293 charge falls by
      exactly 15% of the arrangement** with the year-end settlement finding nothing to correct.
      ⚠️ **Finding: a sacrificing Person can only reach Division 293 in FY2026-27.** From FY2027-28
      the $25,000 floor governs where no cap is published, and anyone earning enough to reach the
      $250,000 base already owes more than $25,000 of Guarantee alone — so the arrangement is
      refused by the cap before Division 293 can see it. The fixture had to be built inside
      FY2026-27 for that reason.
    - **THE FORM.** A `kind` selector on the salary-sacrifice branch, two options in plain English —
      *"Sacrifice this much a year"* and *"Stop sacrificing, from this date"* — built the way the
      buy/sell pair is: the stop's builder cannot reach the amount box, so no figure can ride along
      on it. The stop branch has no boxes and carries one sentence instead of an empty space. The
      amount box's label now says which money it is in and that it does NOT index (**O88**, ruled the
      same day), because the boxes beside it are labelled and a silent box is read as agreeing with
      them. The notice's *"this build cannot say stop on this date — switch the entry off"* is
      superseded by the two acts stated side by side, because they differ in what they do to the
      PAST and a user must not have to guess which is which.
    - **BYTE-IDENTICAL, PROVED WITH A DIGEST AND NOT AN ASSERTION.** sha256 over the whole 501-month
      demo walk is `606a29d3…` at `7f067d9` and after: unchanged. And over a plan that STATES a
      $15,000 sacrifice and no stop — the case the demo cannot test — `73f48008…`, unchanged.
      Shortfall Age 2055-12 (Dana 87, Ash 95) before and after.
    - **MUTATIONS (applied, counted, reverted).** A stop that does not clear the level fails **6**;
      a stop applied one month LATE fails **4** (including the boundary and the note count); the stop
      dated a month EARLY fails **6**; a stop that erases the year's sacrifice accumulator fails
      **1** — and it survived until the Division 293 test was written, which is what the test was
      written for; the cap and Division 293 reading a "sticky" sacrifice the stop did not release
      fails **1**; emitting the note whenever nothing is sacrificed — the mutation that collapses
      *stopped* into *unpaid* — fails **4**, including a pre-existing demo canary.
    - **ON SCREEN.** Loaded headless against a scratch plan file on a scratch port. Both entries were
      created THROUGH the form; the plan file holds `{"kind":"stopped"}` and nothing else. The list
      reads *"2030-01-01 Salary sacrifice into super (Dana) — stop the salary sacrifice from this
      date"*; 2029-12 carries the contribution line and no note; 2030-01 carries no contribution and
      the note head *"Salary sacrifice stopped: Dana — stopped from 2030-01-01"*; and the page holds
      exactly 30 contribution lines, which is 2027-07 to 2029-12 inclusive.

  - [x] **P6-8a** ✅ *(Ticked 2026-09-23 in the reconciliation pass. The parent shipped with this box
    open. The comparison runs two whole `project()` walks, and each carries all three forces: the
    contributions tax via `superConcessional`, the CGT discount via P3-21b, and the lock-up, because
    `crossoverPoint` reads `Month.accessibleAssets` only.)*
    The three forces, priced together and never one at a time: **15% contributions
    tax** on the way in against the Person's marginal rate (P3-3); the **50% CGT discount** and
    tax-free super income from 60 on the way out (P3-21b); and the **lockup to a Condition of
    Release** as the price of both (P3-6). No two of them point the same way, which is why the
    answer has to be projected rather than reasoned about
  - [x] **P6-8b** ⚠️ It must report the **Age Pension entitlement dimension, not only the tax
    one.** A dollar in a younger Person's Accumulation Phase account is exempt from **both** means
    tests until they reach Age Pension age; the same dollar in an ETF is assessable and deemed from
    the day it is bought (P3-20f). A comparison showing tax alone is confidently wrong for every
    year the exemption is running. The rule is **P3-13** and **P3-13a** — cross-referenced, not
    restated
    - ✅ **SHIPPED 2026-09-22, display-only.** `comparisonSeries.ts`'s `agePensionSummary` counts
      the months of each Scenario's own walk in which `Month.lines` carried `AGE_PENSION_LINE` —
      the same read `incomeHeadline.ts`'s private `monthsPaidAPension` already made, no new engine
      figure — and names the first such month. A COUNT, deliberately, never a dollar amount: this
      comparison is about whether the pension turns up at all, on this item's own text, and a
      dollar figure would invite comparing pension INCOME across two Scenarios whose spending
      targets already differ for unrelated reasons. Printed beside the Shortfall Age in the
      Scenario list (`scenarioPanel.ts`), the same side-by-side place P7-1 already put the first
      comparison number. `pensionOnlyAge` is not asked, on `shortfallSummary`'s own reason: it
      throws on a walk the published Age Pension parameters do not cover. Structural exception,
      named: `test/core-div293-charge.test.mjs`'s raw-source canary pinning the count of
      `.description ===` whole-comparisons in `src/` moved 9→10 for the genuine new call site.
  - [x] **P6-8c** **Show the flip, and its date.** Because the exemption ends at the younger
    Person's Age Pension age — or earlier and permanently on any income stream, including a TTR —
    the better answer changes on a known day. Surface that day as a marker on the comparison
    (P7-5), not as a footnote: the failure mode is a user who reads the verdict during the exempt
    years and acts on it for the following twenty
    - ✅ **SHIPPED 2026-09-22.** `comparisonSeries.ts`'s `crossoverPairOf` finds the ONE
      unambiguous pair to ask `crossoverPoint` about — either the whole comparison is two
      Scenarios, or (the actual `superVsInvestTemplate` shape, where the source Scenario stays in
      the plan alongside its two clones) exactly one SIBLING PAIR shares a non-null `parentId` and
      no third Scenario shares it. Two different sibling pairs, or a sibling group bigger than two,
      both refuse to guess which pair is meant. `comparisonConfig.ts` draws the result as ONE MORE
      bare rule through the SAME `renderChart.ts` `comparisonRules` plugin a Shortfall Age rule
      already used — zero new drawing code — in a colour (`CROSSOVER_RULE_COLOUR`, black) disjoint
      from every Scenario's own palette and every focused-chart marker colour. No caption, matching
      this module's own `notes` ruling that a marker that IS drawn gets no duplicate sentence.
  - [ ] **P6-8d** ⬜ *(Reconciled 2026-09-23. **The condition is MET:** both sides are live, since
    `59d9ae5` for the individual and `a0fc0c9` for super, and the third-pass gate recorded under
    P6-8 confirmed it. The 2026-09-22 NO-GO below ("`grep frankingInSuper` returns NOTHING") is
    superseded. **The box stays open for one piece of work: the direct assertion this item asks
    for** — one fixture holding the same franked allocation on both sides, failing if either
    side's credit is zero while the other's is not. No such test exists yet. Each side is tested
    only on its own.)*
    ⚠️ **Franking is modelled on both sides of this comparison, or the comparison
    does not ship.** Added 2026-09-04 (P3-22, ADR-0010). Australian equity income earns imputation
    credits inside super as well as outside it, and inside super the case is stronger: a Retirement
    Phase fund pays 0% and has the credits **refunded in cash** (P3-7b), an Accumulation Phase fund
    offsets 15% (P3-7a). This comparison reports a **difference** between two after-tax returns,
    so a credit modelled on one side only shifts that difference by roughly the same magnitude as
    omitting it from both — the error changes sign, not size. Assert it directly: a fixture holding
    the same Australian equity allocation on both sides must show franking raising **both**
    projections, and the test fails if either side's credit is zero while the other's is not
    - **Sourced 2026-09-04 — register §5A.3 and §5A.6** (P1-11). Two things the register settles for
      this comparison. **Refundability is equal on both sides**, so it is *not* the super advantage —
      the whole advantage is the rate differential (0% / 15% against the marginal rate plus Medicare),
      and refunding on the super side while only offsetting on the individual side manufactures a
      spurious advantage of up to the full franking rate (T46). And the **qualified person gate is
      asymmetric**: the $5,000 small shareholder exemption is an individual's relief with **no super
      equivalent at any credit level** (T49, §5A.6) — but it is narrow, it contributes **zero** on
      established buy-and-hold parcels because both sides pass the 45-day rule anyway, and §5A.6's
      recommendation is to carry it as a structural note on this comparison rather than a numeric
      adjustment, because encoding it numerically on a passive portfolio **overstates** the super
      penalty

    - 🔴 **GATE: NO-GO — 2026-09-22 (LIZ), claims verified independently.** Re-gated fresh after P3-22h shipped all three steps live today — the 2026-09-19 gate is superseded, not reused.
      - **What changed since 2026-09-19 and cleared:** contribution/sacrifice tax is now genuinely reachable from a live walk — `projection.ts` imports `superConcessional`, `div293`, `division293Release`, `superContributions` and dispatches `SUPER_CONTRIBUTION` at line 4704; Division 293 settles at year-end true-up. Entry types constructible: **8**, not the stale 6 — confirmed by `test/app-entry-form.test.mjs:367`. Both entry types this template needs (`SUPER_CONTRIBUTION`, `NON_SUPER_INVESTMENT`) are constructible AND walked (`ENTRY_TYPES_NOT_YET_WALKED` is empty).
      - **What still fails this item's OWN rule, confirmed by grep, not restated:** `grep -n frankingInSuper src/core/projection.ts` returns NOTHING — confirmed independently. This item's own text is explicit and unticked: "Franking is modelled on both sides of this comparison, or the comparison does not ship." P3-22h's note (line 1779) already flagged itself as NOT satisfying this bar, in its own words, the same day it shipped — "P6-8d stays the checkpoint that will force it." That checkpoint has now been reached and it does not pass.
      - ⚠️ **THE GAP IS BIGGER THAN "ADD A CREDIT ON THE SUPER SIDE."** `grep -rn "fundEarningsTax(" src/` (excluding tests) returns exactly ONE hit, and it is INSIDE `superFranking.ts` itself — the live walk's monthly super growth uses an assumed, already-net `nominalReturn` and never computes the fund's real 15%/0% earnings tax at all. There is no live figure yet for a super-side credit to offset against. Wiring this is not P3-22h's shape repeated; P3-22h had `assessCapitalGainCharge`'s year-end true-up to plug straight into. This has no equivalent to plug into and needs the earnings-tax mechanic built first.
      - **RULED BY LIZ, not escalated — the recommendation to ship with the asymmetry named rather than fixed was rejected.** This comparison exists specifically to stop a quietly-wrong verdict on the single biggest decision the tool helps with. Shipping it with a KNOWN, SYSTEMATIC tilt toward "invest outside super" — for as long as the warning is needed, which on this project's own pace could be weeks — defeats the reason it was asked for. P6-8 stays blocked.
      - **What ships first, in order, before P6-8 can be re-gated:** (1) get the fund's real earnings tax into a live monthly/annual figure the walk actually computes — sized **M-L**, and is a pre-existing gap independent of franking, newly surfaced by this check, not previously named anywhere in this file; (2) mirror P3-22h's three-step shape for the super side (payout-rate Setting, a payout mechanic, `frankingInSuper` folded into the true-up) — sized **L**, bigger than P3-22h itself since (1) has to land underneath it; (3) only then does P6-8d clear and the guided-template UI itself becomes buildable — sized **S**, sitting on entry types that are already walked.
      - **New finding worth its own line, not buried in this one:** super's real earnings tax being unmodeled in the live walk is a defect independent of P6-8 — every super balance in every projection today is implicitly taxed at whatever `nominalReturn` assumes net of tax, not at the fund's actual legislated rate. Whether that is close enough to ship on, or worth its own item, is a question for whoever picks up (1) above.
- [x] **P6-9** **Division 293 — the second 15%, and the LAST gap in this model that FLATTERS the
  user.** O77(ii). `src/core/div293.ts` had been built, tested and stranded since P3-5;
  `projection.ts` had no occurrence of the name at all. Four chunks, all four done — ✅ 2026-09-20.
  ~~1, 2 and 3 are done and the charge is live from 2026-09-20 — no gap in this feature flatters the
  Household any more.~~ ⚠️ **THAT LAST CLAIM IS STRUCK BY CHUNK 4, WHICH IS THE ONE FINDING OF THIS
  ITEM WORTH READING TWICE.** The CHARGE flatters nobody — chunk 3 closed that. But the residual
  chunk 3 opened as **O84**, the Subdiv 293-B election to have the charge released from the fund,
  was written up as conservative and is the opposite: taking the charge from CASH leaves a
  means-test-EXEMPT accumulation interest standing and spends ASSESSED Offset cash instead, so the
  build assesses a released-election Person on FEWER assets than they would really hold and
  OVER-states their Age Pension. It is bounded (it bites only on a Person who would have made the
  election, and it is nil from that Person's own Age Pension age) and it is the ONLY gap left in
  this feature that runs the wrong way.
  - [x] **P6-9 chunk 1 — the INCOME BASE is built from the walk's own limbs, and NO CHARGE is
    computed ✅ 2026-09-20.** `div293IncomeForWalk` in `projection.ts` assembles the s 293-20(1)(a)
    base and `asSaptoPerson` carries one for every Person of every assessment — the monthly accrual,
    a disposal and the year-end true-up alike.
    - **THE LIMBS.** (a) taxable income, the sacrifice-REDUCED figure the brackets and LITO already
      read. (c) reportable superannuation contributions at their REAL value, because `div293Income`
      performs the disregard itself — passing nil here would be the right number by a wrong route.
      The other four are nil with the reason at the call site, in `rebateIncome`'s own vocabulary:
      no entry releases an FHSS amount; no entry states a family trust distribution; a reportable
      fringe benefits total is an employer fact no salary forecast can produce; both s 995-1
      investment-loss silos need a geared portfolio or a rental the model does not have. The
      s 301-20(3) nil is **consistent rather than convenient** — `superLumpSum.ts` REFUSES BY NAME
      every withdrawal below the tax-free age, so no modelled lump sum is ever in the offset's
      range, and the one it pays is taxed at nil at 60+ and never enters taxable income at all.
    - **THRESHOLD AND RATE ARE DATED RECORDS, NOT LITERALS**, and this chunk writes neither:
      `SUPERANNUATION.division293.threshold` / `.rate`, both `kind: 'constant', everyYear: true`,
      deliberately not indexed. The test pins the `kind` and `everyYear` rather than restating
      $250,000.
    - **NO FIGURE MOVED, AND IT WAS PROVED RATHER THAN ASSERTED.** 602 months over the demo plan and
      four fixtures, dumped from a detached worktree of `ea7961b` and from this build, `cmp` clean.
    - **WATERFALL BYTE-IDENTICAL to `ea7961b`** — zero diff hunks touch either name, and the
      `WATERFALL_LIMBS`…`waterfallLimbNotes` window shas identically.
    - ⚠️ **THE HONEST WEAK POINT: nothing consumes the base, so the CALL cannot be defended by a
      figure.** Feeding `asSaptoPerson`'s wrong figure in compiles, runs and moves nothing —
      mutation (3) survived the whole suite until a SOURCE pin was added for the call site. That pin
      is a stopgap and should be retired the day chunk 3 gives the base a consumer.
    - **MUTATIONS (applied, counted, reverted from a saved copy).** (1) `surchargeIncome` where
      `div293Income` belongs — **a compile error**, `SurchargeIncome` is not assignable to
      `Div293Income`; the type system stops it and no test is needed. (2) a non-nil
      `reportableFringeBenefitsTotal` fails **3**. (3) the gross instead of the sacrifice-reduced
      taxable income fails **1** — the source pin, and nothing else. (4) one Person of a couple
      given the other's base — **also a compile error** (excess property on a `SaptoPerson`
      literal), which fails **3**, including the suite's own "the honest dataset compiles" positive
      control.
    - **What this chunk did NOT do:** wire `lowTaxContributionsFromConcessional` (chunk 2), call
      `division293Tax` or emit a `Division 293 tax` line (chunk 3), touch the disclosure in
      `entryForm.ts` / `planEdits.ts` or close O77 (chunk 4) — the walk's existing note still says
      in terms that the further 15% is not charged, and the test pins that wording and its count.
  - [x] **P6-9 chunk 2 — the s 293-20(1)(b) LIMB, out of the CAP CHECK'S OWN COMPONENTS, and still
    NO CHARGE ✅ 2026-09-20.** Every Person who states a salary sacrifice now carries a
    `LowTaxContributions` for the year, built beside the figure that is measured against the general
    cap. `division293Tax` is still called from nowhere, there is no `Division 293 tax` line, and the
    walk's note still says in terms that the further 15% is not charged — **the count of 30 is
    re-asserted in chunk 2's own file** as the tripwire on having charged something by accident.
    - ⚠️ **THE BRIEF'S CONSTRUCTOR DOES NOT FIT THE WALK, and the fix is a third route rather than a
      hand-built assessment.** `lowTaxContributionsFromConcessional` wants a `ConcessionalAssessment`,
      which only `applyConcessional` produces, which needs a `CarryForwardHeadroom` — which refuses BY
      NAME (`MissingContributionHistoryError`) without a five-year contribution history and a Total
      Super Balance measured at the prior 30 June. The plan file has a field for neither, so that
      route is unreachable from `project()` *by construction*. `div293.ts` gained
      **`lowTaxContributionsFromComponents`**, which takes the four s 291-25 limbs and a STATED
      excess, adds them with `concessionalContributions` and nothing else, and carries **the same
      P3-5 U1 / O35 `unverified` label** the assessment route carries — because it is the same
      inference. The alternative, `lowTaxContributions`, would have produced identical cents today
      wearing the `primary-verified` label the stated s 293-30 route earns and this walk has not.
    - **ONE COMPONENTS OBJECT, READ TWICE.** `refuseConcessionalContributionsOverGeneralCap` and the
      Div 293 figure are handed the same `const components`, so the total measured against the cap
      and the total carried into Division 293 are one expression. A second, parallel total is the
      defect even when the two agree.
    - **s 293-25(b) IS UNREACHABLE FROM `project()` — register O83, kept and not deleted.** The cap
      refusal throws before any `Month` exists for any Household whose total exceeds the year's
      general cap, so the excess passed here is nil for everything the walk prices, and it is exact
      rather than conservative (s 291-20 measures the excess against the TOTAL cap, which is never
      smaller than the general cap). **Direction:** nothing is understated or overstated by a cent —
      the subtraction has nothing to subtract — but the figure is held at its MAXIMUM, since the
      subtraction only ever runs downward; dropping the branch would charge the second 15% on the
      very dollars s 293-10 exempts the day Div 291 is modelled and the refusal is lifted. Proved
      rather than asserted: two tests walk an over-cap Household and assert `project()` returned
      **no `Month` at all**, in FY2026-27 against the published cap and in FY2027-28 against no cap.
    - **NO FIGURE MOVED.** 910 months over the demo plan and four fixtures — including a walked
      sacrifice and a $260,000 Person — dumped from a detached worktree of `ac08f57` and from this
      build, `cmp` clean. **WATERFALL BYTE-IDENTICAL:** zero diff hunks name either symbol and the
      `WATERFALL_LIMBS`…`waterfallLimbNotes` window shas identically to `ac08f57`.
    - **MUTATIONS (applied, counted, reverted from a saved copy).** (1) a second, parallel components
      literal for the Div 293 call fails **3**. (2) a non-nil excess of $500 fails **1** — the source
      pin only; a $100,000 excess fails 30, but only because it exceeds the amounts it was measured
      out of and `buildLowTaxContributions` refuses it, which tests the constructor and not the call.
      (3) a $1,000 non-low-tax amount added to the SHARED components fails **16** — all of them the
      cap check's own fixtures, which is the sharing doing the work; added only on the Div 293 side
      it fails **3**, two of them source pins. (4) the figure stored for the wrong Person of a couple
      fails **1**, the source pin.
    - ⚠️ **THE HONEST WEAK POINT, AND IT IS THE SAME ONE CHUNK 1 RECORDED: nothing consumes this
      value.** Mutations (2), (3b) and (4) move no cent anywhere, so they are defended by SOURCE PINS
      and by nothing else — the contiguous call-site pin, the `components` count, and the
      `division293Tax` === 0 pin in `test/core-div293-low-tax-contributions.test.mjs`. **These are
      stopgaps. Retire them in chunk 3**, when a charge gives both limbs a consumer and a figure can
      defend the call. Chunk 1's fence in `test/core-div293-income-base.test.mjs` was WIDENED for the
      same reason and deliberately: `lowTaxContributions` is no longer pinned at zero occurrences but
      at an exact identifier list, so chunk 3's wiring cannot arrive there unreviewed.
  - [x] **P6-9 chunk 3 — THE CHARGE, and the last flattering gap is CLOSED ✅ 2026-09-20.**
    `division293Tax` is called, a `Division 293 tax, <name>` line is emitted monthly and settled at
    the year's end, and the money comes out of the PERSON's cash.
    - **THE FIGURE, hand-derived.** Val on $260,000 has a $259,000 base and $31,200 of Guarantee —
      a $290,200 sum, a $40,200 excess, so the CONTRIBUTIONS limb binds at 15% × $31,200 = $4,680 a
      year, **$390.00 a month**. The taper's other side needed a second fixture: at **$231,400** the
      sum is $258,168 and the EXCESS binds at 15% × $8,168 = $1,225.20, **$102.10 a month**, where a
      cliff would charge $347.10. The excess binds exactly while the annual salary is under
      $251,000 — `1.12 S − 251,000 < 0.12 S` — and it is over the threshold at all only above
      $224,107.15, which is a band about $27,000 wide and is why the boundary needed its own fixture.
    - ⚠️ **THE CHARGE IS WIRED TO THE GUARANTEE, NOT TO THE SACRIFICE, AND IT HAD TO BE.** Chunk 2
      built the low tax contributions only where a `SUPER_CONTRIBUTION` was stated. At $260,000 the
      Guarantee ALONE is $31,200 of a $32,500 cap, so an above-threshold Person who sacrifices
      anything worth modelling is refused before a Month exists — a charge wired to the sacrificing
      Person would have missed every ordinary high earner. The loop is widened; the CAP CHECK is
      not, because a Guarantee alone cannot breach the cap (SGAA s 10A(5)).
    - **THE SHAPE: a twelfth a month on the state in force this month, settled once when the walk
      leaves the year** — `Income tax`'s own shape, and the settlement really moves: a Person who
      stops work in January is REFUNDED $2,340 in the following July, and a Person whose salary
      rises mid-year OWES $1,649.97, because s 293-20(1)'s `min` is concave and twelve annualised
      months under-charge a moving income. **No charge at a disposal** (unlike income tax): a gain
      reaches the base only at the settlement, so in a first PARTIAL year it is dropped — stated,
      and the flattering direction.
    - **THE STOPGAPS ARE RETIRED.** Chunks 1 and 2 defended their call sites with source pins
      because nothing consumed the values. Gone: the base is now visible in the line's own
      `determination` (the $290,200 sum), the total is visible in the money, and a non-nil excess or
      the other Person's components move cents. What is KEPT is the one claim no figure can make —
      that the base is derived in ONE place and the four s 291-25 limbs are named in ONE helper
      (`concessionalComponentsOf`, which replaced the object literal so the settlement could not
      spell them a second time).
    - **MUTATIONS** (whole suite, `# fail`): the cliff instead of the taper **53**; the threshold
      moved $100 **15**; the settlement reading the wrong year's Guarantee **2**; the charge taken
      from the fund instead of cash **12**; 15% of the contributions with no threshold at all **42**.
      ⚠️ **`>` → `>=` at the threshold fails NOTHING, and it is a genuine no-op rather than a hole**:
      at a sum of exactly $250,000 the excess is nil under both readings, so the `min` is nil, the
      tax is nil and `binding` is `null`. What is observable is the threshold's VALUE, which is what
      the second mutation moves.
    - **FIGURES THAT MOVED**, all of them Val's at $260,000 and all of them $390.00 a month of cash:
      `core-non-super-buy` (net monthly salary $14,366.67 → $13,976.67), `core-non-super-disposal`
      (and its limb-3 draw rises by the same $390, which raises the CGT on it by 0.094 × $390),
      `core-non-super-limb-3` (the Offset holds 7 × $390 less by February). **One fixture was
      re-derived rather than re-based**: limb-3's `SHORT` spending level, whose whole design is that
      the gap is exactly P1's $40,000 market value — $652,400 a year left a $40,390 gap once the
      charge landed, so the level is now $647,720, stated as arithmetic in the fixture.
  - [x] **P6-9 chunk 4 — THE CLOSE-OUT, and the direction that was written backwards ✅ 2026-09-20.**
    Documentation and one tripwire; **no engine behaviour changed and NO FIGURE MOVED** — predicted
    before the work and confirmed after: 1661 pass / 0 fail / 6 cancelled (the origin-provider
    socket tests) before and after, and `WATERFALL_LIMBS`/`drawWaterfall` byte-identical to HEAD for
    the fifteenth straight commit.
    - ⚠️ **O84's DIRECTION WAS BACKWARDS, AND O84 FLATTERS.** Chunk 3 opened the row with *"same
      wealth, more super and less cash, which under-states the Age Pension below pension age"*. The
      first half is right and the conclusion is the exemption read in reverse: §4.8 exempts an
      accumulation interest held by a Person **below** Age Pension age from BOTH means tests, while
      Offset cash is assessed and deemed from the first dollar. So a build that takes the charge out
      of cash and leaves the interest alone assesses **FEWER** assets than the law would leave a
      released-election Person holding, and **OVER-states their Age Pension**. A second limb runs
      the same way: this model grows the Non-Super Portfolio and each superannuation interest and
      does **not** grow Offset cash, so at a positive `nominalReturn` the super it leaves standing
      compounds where the cash it took would not have, and total wealth runs high after the month
      too. The wrong sentence is **struck in place, counted once, and the corrected one is
      canaried**; the bound is stated with it, because a caveat without a bound stops meaning
      anything — the error is **nil** for the statutory default (which is what this build models)
      and **nil** again at and above the payer's own Age Pension age, where both pools are assessed
      alike.
    - **O77 is unchanged and was already correct**: ONE live limb, `(iii)` *an amount stated above
      the pay is silently capped at the pay*, the spelled count and the enumeration agreeing, both
      closed limbs struck in place with their numerals kept. What chunk 4 DID change in that row is
      its blanket: *"no gap in this feature now flatters the Household"* was too broad the moment
      O84 was opened, so it is struck in turn and replaced with the narrower true claim — no gap
      **listed in this row** flatters, and the residual O84 does.
    - **THE PREFIX TRAP: checked everywhere, found broken nowhere, and now fenced.**
      `DIVISION_293_TRUE_UP_LINE` starts with `DIVISION_293_LINE`, so a `startsWith` consumer counts
      the July settlement as a thirteenth accrual and adds one sign to twelve of the other. Every
      site that takes a description apart was read: `scripts/moneysmart-baseline.mjs` and
      `scripts/moneysmart-limb3.mjs` (three prefixes, all of them `Account-Based Pension minimum`,
      `Non-Super Portfolio sale` and `Income tax on capital gain` — none of which Division 293
      shares), the `/^Income tax/` filters in five test files (which Division 293 deliberately does
      not match — see `DIVISION_293_LINE`'s own doc), the `description.split(',')[0]` kind map in
      `core-projection-tax`, and this file's own `div293Lines`. **`src/` has no prefix consumer at
      all** — the only thing any module does to a description is compare it whole (`===`, four
      times, in `outcomes.ts`), so `monthToRows` and `renderTable` pass the new pair through
      unharmed and nothing groups or totals by name. That absence is now a test rather than a
      finding: `core-div293-charge.test.mjs` sweeps every `.ts` under `src/` for
      `.description.startsWith(` and its eleven relatives over literal-blanked code, with the four
      whole-comparisons pinned as the vacuity control.
    - **STRAGGLERS SWEPT AND CORRECTED, all struck in place:** `entryForm.ts`'s `describeParams` doc
      still said *"Two remain ... Division 293's second 15% is not charged"* and called it
      conservative; `planEdits.ts`'s door/walk list said *"Two gaps are left and NEITHER flatters"*
      and *"which moves no wealth and only its split"*; `superConcessional.ts`'s header said
      *"Division 293 is a seam, left open"* without saying the walk had closed it; `plan.ts` and
      `projection.ts` named O84 without its direction. `README.md`, `concept.md`, `CONTEXT.md` and
      `docs/adr/` make no claim either way — checked, nothing to fix. The research files under
      `docs/research/` are dated findings and are left alone.
    - **WHAT THE MODEL'S REMAINING GAPS ARE, AND WHICH WAY EACH RUNS.** In this feature: **O77(iii)**
      an amount above the pay is capped at the pay — CONSERVATIVE (a smaller arrangement than
      stated); **O78** carry-forward is not run — AGAINST the user (over-refusal, not a figure);
      **O79** only FY2026-27's cap is computable and the $25,000 base amount floors the rest —
      refused by name above it (`MissingIndexNumberError`); **O80** the Rebate Income nil add-back —
      UNREACHABLE today, live and false the day Div 291 lands; **O81** the contribution target's
      phase is checked at the door only — OVERSTATES, and it is reachable only by an in-memory
      caller, never through a plan file; **O82** the Guarantee's destination for a Person with two
      accumulation interests and no nomination — refused by name; **O83** s 293-25(b)'s excess
      subtraction is unreachable — EXACTLY nil, neither way; **O76/R14** the income test assesses
      GROSS in the absence of a source — AGAINST the Household. Refused by name rather than
      guessed: an excess over the concessional cap (Div 291), a year with no AWOTE number above the
      base amount, a contribution into a non-accumulation interest, a lump sum below preservation
      age. **Exactly one of the whole list flatters, and it is O84.**
    - **MUTATIONS** (whole suite, `# fail`): deleting O84's row **1**; deleting O84's corrected
      direction sentence alone, leaving the row **1** — which is the arm that matters, because that
      is a future author softening a caveat rather than removing one; rewording O77's spelled count
      from "ONE UNDERSTATING gap" to "Three" so it disagrees with the limbs it enumerates **2**;
      adding `taxGroup: line.description.startsWith('Division 293 tax') ? ... : null` to
      `monthToRows.lineRow` — which is exactly how the July settlement comes to be grouped with the
      twelve accruals on a user's screen — **1**.
    - **WHAT A USER CAN NOW HONESTLY FORECAST**, which is the point of the four chunks: a salary
      sacrifice arrangement priced end to end — the reduced salary taxed, the amount landing in a
      named interest net of the fund's 15%, the employer Guarantee credited on the pre-sacrifice
      salary and counted with the sacrifice against the year's general concessional cap, and
      **Division 293's further 15% charged** on the lesser of the low tax contributions and the
      excess over $250,000, accrued monthly and settled once when the walk leaves the year, in
      either direction. What they cannot forecast is refused by name rather than guessed, and the
      one thing left that runs in their favour is O84 — which pocket the Division 293 charge comes
      out of — named on the line, on the form's notice, on the entry row and in its own register
      row with its direction and its bound.

- [x] **P6-10** **O84 — the Subdiv 293-B election to have the Division 293 charge RELEASED FROM
  SUPER. DONE 2026-09-20 (M1–M4), and O84 is NARROWED rather than closed — see M4.** ~~The one open
  gap in the whole model that FLATTERS the Household~~ — and two of its residuals still do: this build always takes
  the statutory default (the ATO assesses the Person, the Person pays out of cash), and a Person who
  would elect release really holds less super and more cash than the forecast shows — which matters
  because an accumulation interest held below Age Pension age is exempt from both means tests (§4.8)
  while Offset cash is deemed from the first dollar. Four chunks: the field (M1), the resolver (M2),
  the debit (M3), the register and the doc comments (M4).
  - [x] **M1 — the field and its door refusals ✅ 2026-09-20. NO WALK BEHAVIOUR CHANGE, and no
    figure moved** — predicted before the work and confirmed after: every month of the demo walk,
    of every Scenario walk and of the demo re-read through the door, dumped from a detached worktree
    of HEAD and from this tree and `cmp`'d byte for byte; `WATERFALL_LIMBS`/`drawWaterfall`
    byte-identical for the sixteenth straight commit.
    - **`SuperInterest.statedReleaseAuthorityDestination?: 'division293'`** — a SIBLING of
      `statedEmployerContributionDestination`, not a reuse of it. That field says where the employer
      CREDITS and this one says where the ATO DEBITS: two events, two actors, and a Person may
      rationally nominate different interests for each (pay the Guarantee into the fund with the
      insurance, take the charge out of the one with the cash). Reusing one field would let a
      nomination made for one purpose silently authorise the other.
    - ⚠️ **PRESENCE IS THE ELECTION, AND SILENCE IS NEVER "DERIVE IT" — the one rule that makes this
      field different from the Guarantee's.** For the Guarantee, silence plus a single accumulation
      interest resolves BY DERIVATION, because the employer pays *somewhere*. Here the default is not
      an unnamed account, it is NO RELEASE AT ALL, so a silent Person has not omitted an account —
      they have declined an election, and deriving "the sole accumulation interest" from their
      silence would invent a choice they never made and re-open O84 in the OPPOSITE direction.
    - **Six kinds of absence, four legal:** (1) stated by nobody anywhere — legal, the statutory
      default, and it is every plan file on every disk; (2) on one accumulation interest — legal,
      the election; (3) on a retirement-phase interest — REFUSED (a release out of a stream is a
      commutation, which moves the transfer balance account and the Schedule 7 minimum, and this
      build has no path that commutes); (4) on two interests of one Person — REFUSED (a release
      authority is served on one interest; the alternative is this build choosing which fund is
      raided); (5) one interest each of two Persons — legal, the rule is per Person; (6) stated by a
      Person with no Division 293 liability — legal and INERT, not refused, because whether a Person
      is charged is a fact about a YEAR OF THE WALK and a door that refused a standing election
      would have to run the projection to know it was idle. Both refusals reuse
      `PlanFileHouseholdError`: they are well-formedness faults in one interest, nothing about the
      law is left unanswered, and a named class would have earned a register row for nothing.
    - **THE PERSISTENCE HAZARD APPLIES AND IS CLOSED.** `planWithStatedPosition` REBUILDS each
      interest from the two form boxes, so a field the form cannot show is dropped on the next
      position save — and here a drop does not leave a question unanswered, it silently ANSWERS it:
      the election becomes a decision not to elect. Carried by interest position, like the other
      three, and round-tripped through TWO saves in `test/app-settings-panel.test.mjs`.
    - **MUTATIONS** (whole suite less the six origin-provider socket tests, `# fail`): accepting two
      elections on one Person **1**; accepting an election on a retirement-phase interest **1**;
      **deriving the election from silence for any accumulation interest — 11**, which is the
      defect the field exists to prevent and it is defended BEHAVIOURALLY, not by prose; dropping
      the carry in `planWithStatedPosition` **2**.
    - ⚠️ **ONE SOURCE-PIN STOPGAP, TO RETIRE IN M2/M3.** Nothing under `src/` reads this field in
      M1, so "no resolver derives it from silence" cannot be shown by running anything — only the
      DOOR-level form of that defect is reachable, and that is what the 11 kills above defend. The
      residue is pinned by source: the last test of `§3c` in `test/core-parse-plan.test.mjs` counts
      the field's property accesses across every `.ts` under `src/` (household 1, parsePlan 1,
      planEdits 2) and sweeps for a `??`/`||` fallback. It is a ratchet, not a proof, and it should
      be rewritten the day `division293ReleaseDestination` exists and can be called with a silent
      Person. **Narrowed in M2 (2026-09-20), which is that day**: the derivation claim is now
      behavioural, and the count survives as a four-module ratchet only.
  - [x] **M2 — the resolver ✅ 2026-09-20. `src/core/division293Release.ts`, and NO FIGURE MOVED** —
    predicted before the work and confirmed after: every month of the demo walk, of every Scenario
    walk and of the demo re-read through the door, dumped from a detached worktree of HEAD and from
    this tree and `cmp`'d byte for byte (2,011 lines identical); `projection.ts` is untouched, so
    `WATERFALL_LIMBS`/`drawWaterfall` are byte-identical for the seventeenth straight commit. The
    resolver has NO caller under `src/` — that is the chunk boundary, and it is pinned.
    - **`division293ReleaseDestination(person)` → a DISCRIMINATED UNION tagged `election`, never
      `{ slot, interest } | undefined`.** Two result kinds and two refusals: `{ election: 'none',
      reason }` (no interest marked — including a Person holding none at all), `{ election:
      'released', slot, interest }` (exactly one accumulation interest marked, returned by object
      identity and at its position in the whole `superInterests` list), and a `RangeError` for each
      of the two illegal shapes. ⚠️ **The shape is the defence**: an optional result invites
      `dest?.interest`, `dest ?? …` and a truthiness test, each of which reads "no election" as "no
      answer yet" — which is the conflation that moves the charge out of the wrong pocket in
      silence. `result.slot` on the un-narrowed union is **TS2339**, because the `'none'` member
      declares the property in no form at all — not even `?: never`, which would hand the careless
      caller back a `SuperInterest | undefined` to fumble. Both results are frozen; neither is
      falsy, so `if (result)` cannot stand in for naming the case.
    - ⚠️ **SILENCE IS NEVER DERIVED, and this is the chunk where that became BEHAVIOURAL.** The
      input the defect needs — one accumulation interest, nothing stated, which is what
      `superGuaranteeDestination` resolves BY DERIVATION — now resolves to `'none'` in a test that
      calls the function. **Three accumulation interests and no election is the SAME answer**, not
      a harder question: the Guarantee's resolver refuses that shape (O82) because it must pick one,
      and here nothing is being picked, so refusing would be treating silence as an unanswered
      question wearing the other face.
    - **THE DOOR REFUSALS ARE MIRRORED IN THE RESOLVER, on O81's ground and `superGuaranteeDestination`'s
      precedent**: `parsePlan.ts` refuses both illegal shapes, but a door-only check is unreachable
      for a caller who builds a `Household` in memory and calls `project()` — which is every fixture
      in the suite and the demo page itself. `RangeError`, not a named class, for the same reason SG
      uses one: nothing about the law is left unanswered and the message names the Person, the
      position and the fix.
    - **MUTATIONS** (whole suite less the six origin-provider socket tests, `# fail`): deriving the
      sole accumulation interest from silence — **5**, and it is the defect this whole chunk exists
      to prevent, killed at the RESOLVER level for the first time; resolving the first accumulation
      interest rather than the marked one **3** (the fixture puts the mark at position 2 of 3 on
      purpose — a one-interest fixture cannot separate the two); accepting a mark on a
      retirement-phase interest **1**; collapsing the two results — **1** for the type collapse
      alone (only the `tsc` probe sees it; every runtime value is unchanged) and **9** once the tag
      is collapsed at run time too.
    - ⚠️ **SOURCE PINS, and they are stopgaps.** (i) "The resolver has no caller under `src/`" —
      `test/core-division293-release.test.mjs` §5, with a positive control that the same walker finds
      the declaration. **It retires in M3, which is the commit that gives it one.** (ii) The
      `??`/`||` fallback sweep over every `.ts` under `src/`, kept because the behavioural half only
      covers THIS resolver and a default could be written into any other module. M1's own count pin
      in `test/core-parse-plan.test.mjs` §3c is **narrowed, not deleted**: its load-bearing half
      (nothing derives the election) is now behavioural, and what remains is a four-module ratchet
      on its own stated ground.
  - [x] **M3 — the debit. DONE 2026-09-20.** The election is performed at the YEAR-END SETTLEMENT and
    nowhere else: an electing Person has every cent of the year's Division 293 cash accrual refunded
    (`DIVISION_293_RELEASE_REFUND_LINE`, `cash` inflow) and the year's assessed liability debited to
    the nominated interest (`DIVISION_293_RELEASE_LINE`, `effect: 'wealth'`, written back at the end
    of the tick beside the two contribution credits). **No existing fixture moved** — predicted, and
    proved against a detached worktree of HEAD: the demo walk, both Scenario walks and the
    parsed-demo walk dumped month by month and byte-identical, because absence of the field IS the
    statutory default. `WATERFALL_LIMBS`/`drawWaterfall` byte-identical for the eighteenth commit.
    - **THE MONTHLY ACCRUAL IS STILL CASH FOR EVERYBODY, and that is the design and not a shortcut.**
      It is a running estimate — a twelfth of a full year on the state in force this month — and the
      amount a release authority can NAME is the year's assessed liability. Debiting monthly would
      serve twelve authorities for twelve amounts, none of which is the liability, and would make
      every month's means test depend on an estimate. A source pin counts the resolver's calls in
      the walk: **exactly one**.
    - **`Division293ReleaseInsufficientBalanceError`** — a named class, with a register row in §3.6
      beside `ModifiedLowTaxContributionsError`, because the law's answer IS unknown here (partial
      payment, and a second authority on a second fund, are both unretrieved). It is the ONLY thing
      standing between the model and a negative super balance: with the guard removed the balance
      goes to −1 cent and nothing else in the walk notices.
    - ⚠️ **`superLumpSum.ts` IS NOT A CONSUMER, and the plan above was wrong to say it would be.**
      Those refusals guard a MEMBER BENEFIT paid to the member and taxed in their hands; a Subdiv
      293-B release authority pays the Commissioner and is not a member benefit. Routing through
      them would charge a Person under 60 lump-sum tax on money they never receive. The
      retirement-phase case the plan was reaching for is already refused, one layer earlier and on
      its own ground, by M2's resolver (a release out of a stream is a COMMUTATION).
    - **TWO RESIDUALS, NAMED AND NOT FIXED, each pinned in `test/core-division293-release-charge.test.mjs`
      §5.** (i) A FIRST or LAST PARTIAL financial year never reaches a settlement, so an electing
      Person's accrual there is never corrected and silently stands as the cash default — bounded by
      one year's charge at each end of the walk, and flattering in the same direction O84 records.
      (ii) The release is modelled at the JULY settlement where a real one follows the Commissioner's
      notice months later, so this build anticipates it and denies the fund that compounding —
      bounded and CONSERVATIVE.
    - **FIGURES, hand-derived and matched:** Val at $260,000 accrues $390.00 twelve times and the
      year settles at $4,680.00, so the refund and the release are the same $4,680.00 in opposite
      pockets; August 2027 opens with protected assets $4,680.00 lower and assessable $4,680.00
      higher and **the total unchanged to the cent**; and the older partner's **Age Pension falls by
      exactly $15.21 a month** — $4,680 ÷ $1,000 × $3.00 = $14.04 a fortnight of assets taper,
      halved to $7.02 because a couple's combined rate is halved once, × 26 ÷ 12, with the rounding
      cancelling because 702 × 26 ÷ 12 is a whole number of cents.
    - ⚠️ **THE PREDICTION THAT WAS WRONG, and it is the means-test feedback loop.** The asset delta
      was predicted to stay at a constant $4,680.00; it does not. Each month's delta is the previous
      one LESS the previous month's pension delta, because a smaller pension is less cash: $4,680.00,
      then $4,664.79, then that less September's own. It is asserted as that identity rather than as
      a table of figures.
    - **MUTATIONS** (whole suite, `# fail` cross-checked against `^not ok`): taking the release from
      cash as well as the fund **4**; never refunding the year's accrual **5**; debiting slot 0
      instead of the nominated slot **3**; making the release line `effect: 'cash'` **5**; deleting
      the insufficient-balance refusal **2**. ⚠️ **The wrong-slot fixture had to be REBUILT**: the
      first version "proved" the slot by having any other slot be too small to pay, and the other
      slot was the Guarantee destination and therefore never too small — the defence only looked
      structural, and scored its kills entirely through the refusal tests. It now pins BOTH
      interests' whole balance chains through their per-interest `GROWTH_LINE`s.
    - **STOPGAP RETIRED:** M2's "the resolver has NO caller under `src/`" pin is discharged on its
      own stated ground and **replaced, not deleted**, by a COUNT — exactly one reader, and it is
      `core/projection.ts`. The `??`/`||` fallback sweep is KEPT: it is about every other module.
  - [x] **M4 — the close-out. DONE 2026-09-20. DOCUMENTATION AND ONE CANARY; NO FIGURE MOVED, and
    that was predicted before the work.** Proved rather than asserted: every month of the demo walk,
    of both Scenario walks and of the demo re-read through the door was dumped before and after, and
    the ONLY differing leaf path in any of them is `notes[].note` — 224 Superannuation Guarantee
    notes carrying the reworded `SUPER_GUARANTEE_CREDITED`. With `note`/`determination` blanked the
    two dumps are byte-identical. `WATERFALL_LIMBS`/`drawWaterfall` byte-identical for the
    NINETEENTH straight commit.
    - ⚠️ **THE VERDICT ON O84, RE-DERIVED AND NOT ASSUMED: CLOSED FOR THE ELECTION, OPEN IN THREE
      NAMED RESIDUALS, AND TWO OF THEM STILL FLATTER.** The tempting answer was "struck, CLOSED",
      and it is wrong. What P6-10 closed is the ELECTION — a Person who states it now has the charge
      taken out of the fund they nominated. What it did not close:
      - **(i) THE PARTIAL FINANCIAL YEAR — FLATTERS**, in O84's own direction. A walk's first or
        last year never reaches a settlement (the true-up needs all twelve months), so an electing
        Person's accrual there is never refunded and never released and stands as the cash default.
        Bounded by one year's charge at each end of the walk.
      - **(ii) THE TIMING — CONSERVATIVE.** The release is taken at the July settlement where a real
        one follows the Commissioner's notice months later; the fund is denied that compounding.
        Under 3.3% of one year's charge at 6.5% nominal over a six-month lag.
      - **(iii) THE ELECTION MUST BE STATED, AND NO SCREEN OFFERS IT — FLATTERS.** The brief asked
        whether a Person who would elect in life but has not marked an interest is a gap or correct
        behaviour, and the answer is **both, at two different layers**. In the ENGINE it is
        correct and must stay correct: silence is a DECLINED election (s 293-65 makes the individual
        liable; Subdiv 293-B is a thing they may choose to do), and deriving an interest from
        silence re-opens O84 in the opposite direction — M2's resolver exists to refuse exactly
        that. In the PRODUCT it is a gap: the election can be stated only by hand-editing
        `plan.json`, because `planWithStatedPosition` carries the key through a rebuild but **no
        form box anywhere sets it**. So every plan built through the app takes the charge from cash,
        and the app's own notices now say so instead of saying the election is not modelled.
    - **THE §8 ROLL-UP IS HONEST AND STILL LOUD.** It reads, of O84: *PERFORMED from 2026-09-20
      (P6-10), and NARROWED rather than closed:* ⚠️ *ITS TWO FLATTERING RESIDUALS ARE THE ONE OPEN
      GAP IN THIS FEATURE THAT RUNS IN THE HOUSEHOLD'S FAVOUR* — naming both of them in the roll-up
      itself rather than pointing at the row, with the superseded form of the claim struck beside
      it. **So the answer to "does any known gap in this model still flatter" is YES**, and it is
      said in the roll-up, in the row, in `SUPER_GUARANTEE_CREDITED` on every Guarantee note, and in
      both user-facing notices.
    - **THE STRAGGLERS M3 LEFT, all of them now-false statements, all struck in place:**
      `SUPER_GUARANTEE_CREDITED` (`projection.ts` — user-visible on 224 notes of the demo walk, and
      the only reason a dump differs at all); `superGuarantee`'s doc in `plan.ts`;
      `SuperInterest.statedReleaseAuthorityDestination`'s own doc in `household.ts`, which still
      called O84 *the one open gap … that FLATTERS* in the present tense; the gap list and the
      `SUPER_CONTRIBUTION_ENTRY_NOTICE` in `planEdits.ts`; and `describeParams`' doc and its
      salary-sacrifice row string in `entryForm.ts`. **TWO TEST FILES ASSERTED THE FALSE SENTENCE**
      and are the reason this chunk could not be prose alone: `app-month-to-rows.test.mjs` and
      `core-div293-income-base.test.mjs` both pinned *"…is not modelled"* on the note. Each is
      NARROWED on its own ground rather than deleted — the new claim, the ABSENCE of the old one,
      and the two residuals now named on the note, so a "now modelled" reword that dropped the
      caveats fails. `README.md`, `concept.md` and `CONTEXT.md` needed nothing: **README and CONTEXT
      contain no occurrence of "293" at all**, and concept.md's two are a parameter-table row and
      the four-income-bases sentence, neither of which claims anything about the election.
    - **MUTATIONS** (whole suite, `# fail` cross-checked against `^not ok`): deleting O84's
      rewritten row **1**; deleting its residual/direction sentence alone and leaving the row
      **1**; rewording the roll-up to claim no gap in the feature flatters **1**; deleting M3's
      partial-year residual doc comment **1** — M3's source pin catches it, as M3 said it would.
    - **WHAT A USER CAN NOW HONESTLY FORECAST, and it is the point of the whole item:** a high
      earner's Division 293 charge, monthly and trued up at year end, out of cash by default — and
      out of a named superannuation interest if their plan file makes the Subdiv 293-B election,
      with the year's cash accruals refunded and the Age Pension consequences of the moved money
      falling out of the means test rather than being asserted. **What it still will not do:** ~~offer
      that election on any screen~~ (**P6-11, later the same day, gave it one**), settle a partial
      financial year, wait for the Commissioner's
      notice, pay a release out of two funds or out of one that cannot meet it (refused by name),
      commute a stream to satisfy an authority, or price Division 291, the transfer balance account
      or an excess concessional contribution.

- [x] **P6-11** **O84's residual (iii) — THE SUBDIV 293-B ELECTION GETS A SCREEN. DONE 2026-09-20,
  and it is the LAST flattering gap in the superannuation-contribution feature bar one.** P6-10
  modelled the election end to end and left it reachable only by hand-editing `plan.json`, so every
  plan built through the app took the Division 293 charge out of CASH — the flattering direction,
  because it leaves a means-test-exempt accumulation interest standing and spends assessed Offset
  cash, over-stating the Age Pension of a Household whose payer is below Age Pension age (§4.8). A
  control on the household form closes it. **UI AND DOCUMENTATION; NO FIGURE MOVED**, predicted
  before the work and proved after: the demo walk and both Scenario walks dumped leaf path by leaf
  path, 87,376 leaves each side, and the ONLY differing paths are 112 `notes[].note` — the reworded
  `SUPER_GUARANTEE_CREDITED` on the Guarantee notes. `WATERFALL_LIMBS`/`drawWaterfall`
  byte-identical for the TWENTIETH straight commit.
  - ⚠️ **THE SHAPE IS THE DEFENCE: ONE SINGLE-CHOICE CONTROL PER PERSON, NOT A CHECKBOX PER
    INTEREST.** The door refuses two marked interests and a mark on a retirement-phase interest, and
    a checkbox per interest is the shape that can express both and then has to be validated. A
    `<select>` per Person holds ONE value, so two marks cannot be written down at all; its options
    are `electableSuperInterests` — the accumulation positions and nothing else — so the commutation
    cannot be chosen. **Both door refusals are kept and are proved still live by positive controls**
    (`test/app-settings-panel.test.mjs` §1b): an unreachable refusal is not a refusal that has gone
    away, and an in-memory caller still reaches the resolver's.
  - **NOTHING IS PRE-SELECTED, AND THAT IS THE RULE THE ENGINE OWNS.** Presence IS the election and
    silence is a DECLINED one, so a Person with exactly one accumulation interest and no election
    opens on an explicit *"No election — the Division 293 charge is paid out of this person's own
    cash"*. Deriving the sole interest is the defect `division293ReleaseDestination` exists to
    refuse and it is not reintroduced one layer up: **6 kills.**
  - ⚠️ **THE PERSISTENCE HAZARD MOVED RATHER THAN CLOSING.** `planWithStatedPosition` used to carry
    `statedReleaseAuthorityDestination` through by interest POSITION because no box held it; the box
    holds it now, so the builder writes the key from the box and the carry is GONE. **Keeping both
    would have been worse than either** — two writers of one fact, and clearing the election would
    leave the charge coming out of the fund anyway, the user's own instruction ignored in the
    flattering direction. Round-tripped through two successive saves in test, and in the browser.
  - **CLEARING REMOVES THE KEY** rather than writing an undefined-valued one: the door counts keys
    whose value is `!== undefined` and `JSON.stringify` drops an undefined-valued key on the way to
    disk, so the two would disagree. **18 kills**, the largest of the five.
  - **A PHASE CHANGE REDRAWS THE FORM.** The one way a user can reach the illegal state is to elect
    an accumulation interest and then move that interest into a pension phase; the election list is
    rebuilt on the phase box's `change`, so the election drops out where the user can see it rather
    than silently at the save. `electedReleaseInterest` drops it again at build time, so the redraw
    is the courtesy and the builder is the guarantee.
  - ⚠️ **SEEN IN A HEADLESS BROWSER, NOT INFERRED FROM A GREEN SUITE** — a green suite has coexisted
    with a blank page here before. Against a scratch origin provider on port 4871 and a scratch data
    dir (never the user's `~/.enough/plan.json` and never port 4173): the page seeded itself from
    `DEMO_PLAN` and rendered TWO election controls, Dana's offering one accumulation interest and
    Ash's offering none but the no-election option, because her interest is an account-based
    pension. Setting Dana's to interest 1 and saving announced *"Saved. Changed:
    household.persons[0].superInterests[0].statedReleaseAuthorityDestination"*; the file on disk
    gained the key; a fresh load came back with that option selected; clearing it announced the same
    path and the key was **gone from the file**, not present-and-empty. Moving Dana's interest to
    `accountBasedPension` took her election list from two options to one and her value to blank in
    the same tick.
  - **THE REGISTER, AND THE ANSWER TO "IS ANYTHING LEFT THAT FLATTERS": YES, ONE THING.** O84's row
    strikes residual (iii) in place and keeps its numeral (O77's rule); the row's *"WHAT IS LEFT …
    THAT FLATTERS"* claim is narrowed from *"residuals (i) and (iii)"* to **residual (i) alone**;
    and the §8 roll-up now says that (i), the partial financial year, **is the only gap in the whole
    roll-up that runs in the Household's favour**. ⚠️ **That is a claim about this feature's rows —
    O76 to O84 — and not about every gap in the model**: the parameter-window notes elsewhere
    (income tax beyond the rate scale) still say FLATTERING on their own ground, and nothing here
    touches them. The roll-up's claim is enforced rather than asserted: the canary reads the row's
    sentence AND `src/app/settingsPanel.ts`, so deleting the control — or letting it pre-select —
    fails the register test as well as the panel's.
  - **THE CANARIES AND PINNED SENTENCES UPDATED, all narrowed in place and never deleted:**
    `SUPER_GUARANTEE_CREDITED` in `projection.ts` (user-visible on every Guarantee note — it said
    *"no screen offers that election"*); the same claim in `plan.ts`'s `SuperGuaranteeNote` doc,
    `household.ts`'s field doc, `planEdits.ts`'s gap list and `SUPER_CONTRIBUTION_ENTRY_NOTICE`
    (which now SENDS the user to the screen rather than telling them there is none), and
    `entryForm.ts`'s row doc; and four test files — `core-projection-tax` (the O84 row and the §8
    roll-up), `app-month-to-rows` and `core-div293-income-base` (the note), and `app-plan-edits`
    (the entry notice, newly pinned so the sentence cannot go stale unnoticed).
  - **MUTATIONS** (whole suite less the six origin-provider socket tests, `# fail` cross-checked
    against `^not ok`): pre-selecting the sole accumulation interest when none is stated **6**;
    offering every interest instead of the accumulation ones **2** (**1 before a second assertion
    was added in a different test — a one-test defence, and said so**); marking every accumulation
    interest when one is elected **3**; writing the key with an undefined value instead of omitting
    it **18**; writing to the transport before `parsePlan` and the re-projection **37**.
- [x] **P6-12** ✅ **CLOSED 2026-09-23 — `pblci` AND `mtawe` ARE NOW LIVE.** User ruling: *"Age pension and
  cutoffs should rise by default."* With no stated `economicSeries.agePension`, `project()` generates
  one (`defaultAgePensionSeries`) from `cpi`, `pblci` and `mtawe`, with MTAWE anchored to the ABS May 2026
  figure ($1,832.80/wk; O14 closed, the floor did NOT bind on 20 Sep 2026). A stated series is untouched.
  On a real plan the Age Pension start moved about 13 years earlier. Both notices now say the box moves the Age
  Pension and that later figures are a forecast. Finding: a cache key that dropped `mtawe` passed the
  whole suite, so it is now pinned. All four rate boxes are now live; the item's original text follows.
  **RULED 2026-09-21 — THE THREE INERT BOXES STAY, AND NOW SAY SO ON SCREEN.**
  The user's ruling: *"leave them sitting there as pension is a future phase in the plan"* — they are
  placeholders for planned work, which is a good reason to keep a box. **It is not a reason for the
  box to describe the law as though it were plumbed in**, which is what they were doing.
  - **A gate first established that two of them CANNOT be wired at all**, so "wire the boxes" was not
    available as asked:
    - **`pblci` and `mtawe` would REVERSE A DELIBERATE REFUSAL.** The Age Pension reads a DATED series
      of announced rates whose own doc says *"A flat annual rate can never run out, so a projection
      driven by one would always produce a number and would never be able to say it had left the
      ground it stands on. These are dated observations: the date they stop is the date the model
      stops."* A flat rate cannot run out, by construction. **`mtawe` is doubly blocked** — the
      benchmark is a PERCENTAGE OF A DOLLAR LEVEL, so a growth rate has nothing to be a percentage
      of, and **register O14 records the ABS level was never retrieved**. `pblci` cannot work alone
      either: it is one limb of `max(CPI, PBLCI)`, floored against MTAWE.
    - **`awote` is the WRONG SHAPE, not an unconnected wire.** `superCaps.ts` wants a **December-quarter
      index NUMBER in dollars** (s 960-285(5)); the box holds a growth RATE. The build holds exactly
      ONE AWOTE level (1533.4, Dec 2016) — the Dec 2025 figure 2051.10 exists **only inside a comment
      string**, so there is no anchor to compound from.
  - ✅ **`awote` IS NOW WIRED — 2026-09-21, on the user's ruling *"do it, and label it"*.** The cap
    indexes forward from the user's stated wage figure; see the closing note on this item. ⚠️ **My
    FY2035-36 cost figures below were WRONG and the build corrected me** — the cap indexes off the
    December quarter *immediately before* the year (s 960-285(5)), so FY2035-36 reads Dec 2034:
    **nine** compoundings from the Dec-2025 anchor, not ten. The true cost was **$15,000 / $20,000 /
    $22,500**, not $17,500 / $20,000 / $25,000. **The middle figure agreed at both counts, which is
    exactly why the error was easy to miss** — a single agreeing data point is not a check.
  - ⚠️ **THE COST OF LEAVING `awote` UNWIRED WAS REAL, AND I RE-DERIVED IT (figures corrected above).** Control first: 2051.10 /
    1533.4 = 1.338, x $25,000, floored to $2,500 = **$32,500 — the published FY2026-27 cap, exactly**.
    Forward, every later year is held at the $25,000 base, so the headroom lost in **FY2035-36 is
    $17,500 (2.5%) / $20,000 (3.5%) / $25,000 (4.5%) per person per year** — nearly the base amount
    again, and it also freezes the SG maximum contributions base. **A legal sacrifice is refused
    rather than guessed.** ⚠️ **But fixing it runs in the FLATTERING direction** — larger caps, fewer
    refusals, more into super at 15% — which is the direction every other unsourced-figure rule here
    is engineered against. **That is a ruling to take deliberately, not a wiring job.** Still open.
  - **WHAT SHIPPED: each of the three notices now carries a ⚠️ NOT USED YET disclosure** naming what
    the build does INSTEAD (reads announced rates and stops; holds the cap at the base amount and
    refuses). Before this, `PBLCI_NOTICE` told the reader their figure was *"one of the two limbs that
    decide the payment"* — **true of the Act, false of this build.** Same defect the fee, today's-money,
    mortgage and floor notices each exist to avoid.
  - **The pin is a PROPERTY, not a phrase** (§12): each notice must carry a disclosure AND name the
    substitute, so a bare "not used" cannot satisfy it. **Proven to fail on emptied text and on a
    stub, with a positive control that a REWORDED complete notice passes.** I removed one disclosure
    and confirmed the count dropped 3→2 before believing the failure — an earlier attempt at that
    mutation silently did not apply and returned a meaningless green.
  - Original text follows.
  ⚠️ **PARTLY OVERTAKEN 2026-09-21: `cpi` NOW HAS A REAL READER** — P2-7's today's-money
  conversion consumes it, so that box now changes every figure on the page and must NOT be removed.
  The item stands for the **other three** (`pblci`, `awote`, `mtawe`), which remain inert and still
  need the same decision: wire them up, or take them off the form. Original text follows.
  ⚠️ **The four economic-series rate boxes on the settings form change no figure —
  needs a decision: wire them up, or remove them from the form.**
  `Settings.economicSeries.{cpi,pblci,awote,mtawe}` (`settingsPanel.ts:713-716`) has **NO reader
  anywhere in `src/core`**: the walk's Age Pension indexation consumes the dated
  `economicSeries.agePension` series instead, and `superCaps.ts:110` mentions `awote` in a COMMENT
  only. **PROVEN BEHAVIOURALLY, not inferred** (positive control): setting each of the four to
  0.99 leaves the projection hash byte-identical, while nudging `nominalReturn` to 0.031 changes it
  — so the harness can detect a real input and the four are confirmed inert, not merely unread. The
  2026-09-20 disclosures (`CPI_NOTICE`/`PBLCI_NOTICE`/`AWOTE_NOTICE`/`MTAWE_NOTICE`,
  `settingsPanel.ts:307-340`) are a **mitigation, not a fix** — they say what each index governs IN
  LAW and never claim the box drives this forecast. Options: (a) wire each into a reader
  (indexation-by-series, replacing or supplementing `economicSeries.agePension`), or (b) remove the
  four inputs from the form and keep the disclosure as reference-only prose.
- [x] **P6-13** Dropdown OPTIONS still render raw identifiers: `vacatedProtectedPersonRemains`,
  `accountBasedPension`, `ttr` reach the screen verbatim. `settingsPanel.ts`'s `select()` (~line
  446) sets `choice.textContent = option` — the same string as `choice.value` — for every value it
  is given, so the option TEXT is never distinct from what is stored. **The fix already exists in
  this codebase for entry types**: `entryLabels.ts`'s `ENTRY_TYPE_LABELS` /
  `LabelledOption<T>` splits display text from the stored value. Give `select()` (or a labelled
  sibling) the same split for these three call sites; the STORED value must not change, only the
  `<option>` text shown.
  - ✅ 2026-09-24. `select()` now takes `LabelledOption<string>[]` and sets `value` and
    `textContent` from different fields. The three identifiers live in TWO call sites (home status;
    super phase — `accountBasedPension` and `ttr` share one box); the other two `select()` sites
    (at retirement, prior pension) already stored plain words and pass `label === value`, so every
    dropdown goes through the one labelled builder. `planEdits.ts` holds `HOME_STATUS_LABELS` /
    `SUPER_PHASE_LABELS` (`satisfies Record<…, string>`, replacing the `…_KEYS` records) and the
    `…_CHOICES` lists; the stored values are untouched and a plan holding each one round-trips
    byte-identical through the form. `SUPER_PHASE_NOTICE` quoted the old option text and now quotes
    the new. Seen in headless Chrome (`--dump-dom`, scratch port and data dir): home shows "Own it
    and live in it" … "Do not own a home"; phase shows "Still building up (accumulation)", "Paying
    you an income (account-based pension)", "Paying you while you still work (transition to
    retirement pension)". Mutations (option text = value; stored value renamed across `src`; either
    call site passed an unlabelled list; stored value = label) each turn
    `test/app-settings-panel.test.mjs` red.
  - ✅ 2026-09-24, follow-up. The two vacated-home labels stated a period, and the wrong one: the
    general exemption is 12 months and two years is the care case only (ADR-0005's 2026-09-24
    note). They now read "Own it, moved out, within the exemption period" / "… past the exemption
    period", and `HOME_NOTICE` names "the exemption period" with no length. No period is registered
    in `src/data/assumptions`, so none is stated; a test refuses any "N-year"/"N-month" in the home
    labels, summary and notice. Stored values unchanged.
  - ✅ 2026-09-24, the CLASS. The entry form had its own unlabelled `select(name, values)` that made
    each value its own text, so the buy/sell box showed `buy` / `sell`. That builder is deleted;
    every box goes through `labelledSelect`, and the direction shows `INVESTMENT_DIRECTION_LABELS`
    ("Buy — put cash into investments" / "Sell — turn investments back into cash", `entryLabels.ts`,
    `satisfies Record<direction, string>`). **Every `<option>` in `src/app` audited** (six sites,
    pinned by count in `test/app-entry-form.test.mjs`, each showing a label and never its value):
    entry form — type (`ENTRY_TYPE_LABELS`), owner (`ownerOptions`, names), sale order
    (`PARCEL_SELECTION_LABELS`), sacrifice kind (inline labels), direction (new); settings panel —
    phase, home (P6-13), Division 293 election (`releaseElectionOptionLabel`, "Super account N"),
    and at-retirement / prior pension, **the two whose stored value IS its label on purpose**:
    "Becomes a pension" / "Stays as it is" and "No" / "Yes" are plain English already; comparison
    template — owner (person names). The scenario list's radio stores an id and shows the name box.
- [x] **P6-14** A `test/core-*` file pins APP-layer wording, blocking a plain-English fix.
  `test/core-lump-sum-from-super.test.mjs:491` asserts `noteRow(...).of === 'Robin, interest 0'`
  and `:494` asserts `/Tax withheld: \$0\.00\./` — but `noteRow` (line 47) is imported from
  **`dist/app/monthToRows.js`**, not from `src/core`. Until this pin moves into an `app`-layer test
  file, the super-withdrawal row's `of` text cannot be reworded — "Dana, interest 0" reads a
  zero-based array index straight onto the screen. Mitigated only, not fixed: the tax figure is
  now also composed onto the visible label, so folding the text hid no dollar amount. See
  CONTEXT.md on tests that cross the core/app layer to pin wording.
  - ✅ 2026-09-24. Both `noteRow` pins left the core file (it no longer imports anything from
    `dist/app`); the row is pinned in `test/app-month-to-rows.test.mjs` ("a super withdrawal row
    …") on an engine-made note, over two withdrawals from two accounts. The head now reads
    **"Robin — superannuation interest 0"**: the month table's "Person — …" head, and the ENTRY
    TABLE's own words for the same account (`entrySummary` ends "… out of superannuation interest
    0"), asserted to agree. The tax stays on the page: `note` ends "Tax withheld: $0.00." and the
    label reads "Tax taken out of this withdrawal: $0.00 — …". Mutations (old ", interest N" head;
    a number different from the entry table's; tax dropped from the label; tax dropped from the
    note) each turn the new test red.
  - ~~⚠️ **STILL OPEN: the number is still zero-based**, because the scheme reused is. The entry form
    asks "which interest — 0 is the first" and the entry table echoes it; the settings panel
    (Division 293 election, fee objection) counts "Super account 1" one-based. The page has two
    numbering schemes for one account, and removing the zero-based one means changing the entry
    form, the entry table, the comparison template and this row together — a ruling, not a reword.~~
  - ✅ **RESOLVED 2026-09-24, by ruling: super accounts are numbered from 1 wherever the page shows
    one**, in the settings panel's own words. `entryLabels.ts`'s `superAccountName(position)` is
    the one expression ("super account N+1"); the entry table's four rows and this row's head
    ("Robin — super account 1") both read it. The entry form's four account boxes and the
    comparison template's box are labelled "Super account" and say "1 is the first";
    `interestIndexAsTyped` is the inverse (typed `1` → stored `0`, typed `0` → `-1`, refused at the
    door), and the comparison template reads its box through the same converter (a blank box used
    to be `Number('')` = the first account). **Stored positions do not move**: a built entry holds
    `interestIndex: 0` for account 1 and round-trips byte-identical. **Residue, not in the ruling's
    four places:** engine text still names the position from 0 — `parsePlan`'s refusals ("is 2, and
    … a whole number from 0"), `projection.ts`'s Division 293 release provenance ("released from
    superannuation interest 0"), and `getMonth`'s raw `interestIndex` field for the chat model.

---

## Phase 7 — Visualisation

- [x] **P7-1** N scenarios overlaid on one chart — ✅ 2026-09-19 (`f55afff`, plus `35ca04d`'s
  Delete). **This row was left unticked on the day and found stale on 2026-09-20 by the README
  audit** — the box is the only part of it that was wrong, and the commit message carries the work.
  ~~What is still missing is the app end — `main.ts` projects the POOL, not `activeScenarioId`'s
  resolved entries (identical today, because a migrated file has one Baseline holding everything,
  and NOT identical the moment a second Scenario exists), and there is no selector.~~ Both landed:
  `scenarioWalks.ts` is the one resolver both `main.ts` and the save gate go through, and on a
  two-scenario fixture the pool walk differs from the active Baseline's in 158 of 501 months, so the
  separation is proved rather than assumed. **Unblocked 2026-09-19 by P6-4 and P6-7**: a
  `PlanFile` holds `scenarios`, a clone is one call, and `effectiveEntryIds` resolves what any
  of them projects. The stacked area is a single-scenario visual; a comparison is N
  total-wealth lines, so `monthsToSeries.ts` and `chartConfig.ts` gained a second mode rather than
  being rewritten (`comparisonSeries.ts`, `comparisonConfig.ts`).
- [x] **P7-1b** ✅ **2026-09-22 — SWITCHING A CHANGE OFF IS PER SCENARIO.** The defect, found by a
  read-only investigation and reproducible in two clicks: pick a scenario with its radio, switch an
  existing change off, and it went off in EVERY scenario. **Two independent causes, either one
  enough on its own**, which is why both are fixed and both are pinned:
  1. `planWithEntryEnabled` set `enabled: false` on the entry in the shared POOL. Entries are one
     flat pool and a `Scenario` holds only ids, so there was nowhere scenario-local for
     *"switched off here"* to live at all.
  2. `entryForm.ts`'s `entryRows` mapped the whole pool with no scenario filter, so the "Change the
     plan" table listed every scenario's changes under a heading saying which scenario you were in,
     and offered a switch beside each one.
  **What was NOT broken, and was left alone:** the forecast path. `scenarioEntries` /
  `effectiveEntryIds` scope it correctly and a test already forbade regressing to the raw pool;
  persistence round-trips scenario ownership and `activeScenarioId` cleanly.
  - **The model: a TRI-STATE override per Scenario.** `Scenario.entryOverrides?` is entry id →
    `true` / `false`, and an **absent key is the third state — inherit**. Resolution
    (`resolvedEntryEnabled`, `core/plan.ts`) walks the same `parentId` chain `effectiveEntryIds`
    walks, **NEAREST ancestor wins**, and falls back to the entry's own `enabled` when nothing in
    the chain states anything. A disable-only LIST was rejected: a child must be able to switch an
    inherited change back **ON** — the parent says "stop working in 2030" and the child asks "what
    if I do not" — and a subtractive list can only express that by ceasing to inherit, which is the
    copy-on-write fork ADR-0002 exists to refuse. **Copy-on-write forking of the entry was
    considered and rejected outright**: it breaks live inheritance silently at the moment of a
    toggle, is not reversible, and reverses ADR-0002/ADR-0006. Inheritance by reference stays.
  - **ONE funnel, and it is the thing that could have shipped looking right and doing nothing.**
    Every read of `entry.enabled` on a decision path was traced first: `projection.ts:4049`,
    `outcomes.ts:830`, `sustainableSpend.ts:203/307`, `sustainableSpendHeadline.ts:114`,
    `entryVisibility.ts`, `main.ts`'s two panel summaries and `entryForm.ts`'s toggle. They are
    funnelled **not by rewriting each one** but by `scenarioEntries` resolving the override into the
    entry it hands out, so every consumer downstream of it reads a flag that is already **this
    Scenario's answer**. The pool's own object is returned unchanged where the two agree, so an
    untouched plan hands the engine exactly what it always did. The two `main.ts` summaries were the
    only reads left on the pool and were re-pointed at `activeEntries` — a heading counting the
    union of every scenario's changes over a table listing one scenario's is the same class of lie
    the panel was fixed for.
  - **Migration: none needed, and that is asserted rather than assumed.** An absent
    `entryOverrides` means "states no overrides", which is exactly true of every plan.json written
    before today; `parsePlan` does not fill it in and `JSON.stringify` drops it, so such a file
    round-trips byte-identical (pinned). Switching a change off and back **ON** drops the key rather
    than writing a `true`, so the file does not accumulate a statement per click and never holds a
    second copy of the entry's own flag beside it.
  - **`SHARED_CHANGE_WARNING` became FALSE and was rewritten, not deleted** — it is now
    `SWITCH_SCOPE_NOTE`, and its test moved with it. The old pin asserted the warning said the
    effect was *not local*; that was true, and it was the defect. What is left to warn about is the
    half of the sharing that remains and is still not what a reader assumes: **inheritance is LIVE**,
    so a change added to a parent turns up in every scenario built from it. The new pin is by
    SUBJECT — scoped-to-this-scenario, and live inheritance named as what IS shared — with a stub
    that states only the first half proved to fail it.
  - **The property the suite was missing, now asserted four ways** (`app-scenario-walks.test.mjs`
    §4–§5): switching off in one scenario does not move a SIBLING ROOT's walk; does not move a
    PARENT's; a parent's switch DOES still reach its child (inheritance working, the direction that
    must still cross); and a child can state the opposite of its parent with both statements in the
    file at once. Measured on a digest of the whole walk, never on terminal wealth, which is
    insensitive on this fixture. **Four mutations were applied and counted**: the resolver ignored in
    the walk (6 failures), the toggle writing the pool as well (6), nearest-wins turned into
    root-wins (2), and the table put back on the pool (1).
  - ⚠️ **What is NOT verified, because it only exists in the DOM.** No test here opens a browser, so:
    that the filtered table actually draws the active scenario's rows and redraws when the radio
    moves, that the new `data-inherited` left border is visible and survives the grey a switched-off
    row already gets, and that `SWITCH_SCOPE_NOTE` reads well at its length in the panel. The pure
    halves (`activeScenarioEntries`, `inheritedEntryIds`, `resolvedEntryEnabled`,
    `planWithEntryOverride`) are tested; the wiring is pinned only by raw-source canaries, as every
    DOM writer in this app is.
  - **`concept.md` §175 is now SUPERSEDED, not wrong**: it writes
    `Scenario = { id, name, parentId, entryIds[] }`, and a Scenario has an optional fifth member
    from today. Left as the user wrote it.
  - **2026-09-25 — the same isolation, at the DOOR: relation checks run per Scenario.** The class:
    a `parsePlan` check that relates entries to each other ("one per Person", "X needs a Y before
    it", "X voids Y") read over the whole pool, so a legitimate alternative in a sibling Scenario
    was refused (and an entry whose partner sat only in a sibling was wrongly accepted). Audit of the
    final sequence: household-only (employer / release-authority destinations) and single-entry
    (contribution / spouse / downsizer / TRIS / TTR targets, illness separation, death) stay
    pool-wide; `checkScenarioGraph` is structural. **Moved to the per-scope loop
    (`careCheckScopes`, scenario scopes only — the BUY_HOME lesson):** `checkHeasDraws`' three
    relations (one per Person, a couple's `securityValue`, T35 refinance) → `checkHeasDrawRelations`;
    the contribution stop's "something to stop" → `checkContributionStops`, scoped on MEMBERSHIP not
    switches (its 2026-09-21 ruling reads `date`, never `enabled`). The single-entry halves stay
    pool-wide, so a malformed entry cannot hide by being switched off. Already per scope before this:
    `checkEnterCares`, `checkSellHomes`, `checkRentOutHomes`, `checkBuyHomes`,
    `checkDownsizerContributions`. Pinned both ways in `core-scenarios` §7 and a care-routes test
    (route 4 beside a sibling's `HEAS_DRAW`); reverting HEAS to pool-wide reddens 4.
- [x] **P7-2** Wealth as stacked area: **Protected vs Assessable**, not a single net-worth line — ✅
  2026-09-18 (`2edbb21`, `src/app/monthsToSeries.ts` + `src/app/chartConfig.ts`). `bands` is a fixed
  two-member tuple keyed `'protected'` / `'assessable'` sharing one Chart.js stack group
  (`WEALTH_STACK`); a third band is not merely undone but untyped.
- [x] **P7-3** Age Pension eligibility band; flag years above the assets cut-off. ✅ 2026-09-25.
  **Most of it was already there:** the stepped "Full pension up to" / "No pension above" lines
  (`Month.assetsTestThresholds`, drawn over an assessable-at-the-bottom stack, same day) already
  showed where assessable assets sit against the free area and the cut-off. The gap was the flag:
  `ChartSeries.aboveCutOff` (`monthsToSeries.ts`, strict `>` on the month's own nominal figures, key
  absent where no month is over) and `chartConfig.ts`'s `aboveCutOff` dataset — the assessable
  band's own value in those months, `null` elsewhere, `fill: '-1'` down to the cut-off line. The
  demo walk is over the cut-off in 28 months (2031-06 to 2033-09). Tests:
  `test/app-months-to-series-home.test.mjs`. The history below is kept. **Was: PARTIAL, and the
  two halves are different pieces of work.** "Which test bound" is surfaced — per-line, in the month
  table's provenance `determination` (P5-3 limb 2) — but that is a table cell, not this item: no
  chart drawn by `chartConfig.ts` has an eligibility band, a shaded region, or a per-month flag for
  being above the assets-test cut-off. Nothing in `src/app/` computes or carries a cut-off figure.
- [x] **P7-4** Contingency floor line — ✅ 2026-09-18 (`8ae26d2`, `src/app/monthsToSeries.ts`'s
  `overlay('floor', …)` + `src/app/chartConfig.ts`'s dashed `OverlayDataset`). Required positional
  argument, no default in source — `main.ts`'s `DEMO_FLOOR` is a page choice, documented as one, not
  a recommendation: a personal financial figure gets no default in source.
- [x] **P7-5** Markers: Home Status changes, two-year exemption expiry, Shortfall Age, Pension-Only
  Age. **PARTIAL — three different readiness states, split out rather than left under one box:**
  - [x] **Shortfall Age** — ✅ 2026-09-18 (`8ae26d2`). Built and drawn: `outcomes.ts`'s
    `shortfallAge` is safe on any walk, `monthsToSeries.ts` calls it unconditionally and emits the
    `'shortfall'` marker, and `chartConfig.ts`'s `markerCaption` names every Person on it (P7-9's
    reasoning applies here too).
  - [x] **Pension-Only Age** — ✅ 2026-09-19. Drawn, and **GATED ON A PREDICATE RATHER THAN A
    `catch`**: `monthsToSeries.ts` checks `agePensionParametersCover` (`projection.ts`) on the walk's
    own first and last months — the identical endpoints `pensionOnlyAge` tests — before it asks the
    question, so a plan that cannot answer gets no marker, no throw and a NOTE saying which marker is
    missing and why (`PENSION_ONLY_UNCOMPUTABLE_NOTE`; `PENSION_ONLY_NEVER_NOTE` says the other
    thing, that the Household never runs out, which a blank space is otherwise ambiguous between).
    The module still contains no `try` and no `catch`, and its RAW SOURCE test now pins the ORDER —
    the predicate must appear before the call — rather than banning the call outright.
    `monthsToSeries` takes the walk's own `agePension` series as a fourth REQUIRED positional
    argument, on the rule `pensionOnlyAge` states for its own third.
    - ✅ **SUPERSEDED IN FULL ON 2026-09-21 (P4-1e): the demo fixture still states no forward series
      and no longer needs to.** The standing table carries the published parameters past 19 March
      2027, so the demo walk computes all 501 months, the Pension-Only Age is answerable from it —
      the answer is a computed 'never' — and the marker is drawn on the same plan with spending
      raised. The paragraph below is kept because the wall it describes was real and was measured
      twice, and because the way out of it was to settle **O30**, not to change the fixture.
    - **The demo fixture still states NO forward series, and that is now a finding rather than an
      omission.** Adding one to `DEMO_SETTINGS` was measured on 2026-09-19 and does not merely move
      figures: it makes `project()` **throw** on the demo plan from FY2030-31. With the Age Pension
      payable past the published window, Ash's entitlement makes Ash *qualified* under s 160AAAA(2)(b)
      → Ash receives SAPTO ($1,602) while Dana (born 1968, still under Age Pension age) does not, so
      the couple holds two different Medicare family income thresholds ($47,238 against $61,623)
      against a family income of $66,166.70 — under 1.25 × the larger — and
      `MixedSaptoFamilyThresholdError` refuses, exactly as **research U2 / register O30** (unresolved
      and live) requires. So the demo plan cannot state a forward series until O30 is settled: six
      app test files (123 tests) simply stop having a walk to run against. The marker is proved on a
      stated fixture in `test/app-months-to-series.test.mjs` §5b instead.
      - ⚠️ **AND IT IS NOT A PROPERTY OF THE SERIES — REACHED AGAIN FROM THE OTHER SIDE 2026-09-21
        (P4-1e). BOTH ROADS ARE OPEN NOW: O30 CLOSED THE SAME DAY.** Carrying the last published parameters forward on the user's ruling, with no
        series stated anywhere, lands on the **same refusal in the same financial year**: what O30
        answers to is *an entitlement exists past the published window*, by whatever road. Two
        independent roads to one wall make it structural, and it is now the gate on the Age Pension
        ruling as well as on this fixture.
  - [x] **Home Status changes / two-year exemption expiry** — ✅ 2026-09-25. Reachable once
    `SELL_HOME`, `BUY_HOME`, `ENTER_CARE` and `RENT_OUT_HOME` derived a status in the walk; the walk
    now reports it as optional `Month.homeStatus` (absent where no entry governs the home, so the
    demo walk is byte-identical). `monthsToSeries.ts` draws one rule per change against the month
    before (month 0 against the Household's stated status): "Home sold", "New home bought", "Home
    rented out" / "no longer rented out", "Moved into care — partner still at home", "Home left
    empty — not counted for two years" under `'homeStatus'`; "Home now counted for the Age Pension"
    and "Money kept for a new home now counted for the Age Pension" under `'homeExemptionEnds'`.
    No month is counted in the app — the two-year clocks are the walk's. ⚠️ `rentedOut` is not
    reachable through `project()` today (standalone it refuses; beside `ENTER_CARE` the care status
    outranks it), so its two labels are pinned on a synthetic status. **Was:** impossible today, not merely undone.
    `VACATE_HOME` is the only entry that can change Home Status or start the two-year clock, and it
    is declared in `Entry` but implemented nowhere: `grep -ac VACATE_HOME src/core/projection.ts`
    returns `0`. There is no Home Status transition anywhere in a projected `Month` for this marker
    to read. See **P6-5a** for the entry itself.
- [x] **P7-6** Household total with per-person split toggle — ✅ 2026-09-19 (engine half `f86d303`,
  UI half this commit). The blocker was that `Month` carried `protectedAssets` / `assessableAssets` /
  `accessibleAssets` at Household level only, so a toggle had nothing to switch to. Per microtask:
  - **It was a refactor and not new rules work, as the gate pass found.** Both figures were already
    computed per Person and then summed away: `splitAssets` (`household.ts`) built a per-line
    `owner` before pooling with `total()`, and `accessibleWealth` (`projection.ts`) already looped
    `household.persons.forEach`. No tax or means-test research was needed and none was done.
  - **The shape.** `PersonAssetFigures` (three `Cents`, no `name`) and
    `Month.assetsByPerson: readonly [PersonAssetFigures] | readonly [PersonAssetFigures,
    PersonAssetFigures]`, mirroring `Household.persons`'s own tuple union POSITIONALLY. A consumer
    indexes into `household.persons`; nothing matches on `owner`, because two Persons may be given
    the same name and a name match would silently pool them. The three Household scalars are
    untouched siblings — 30+ consumers still read them.
  - **One expression, not a second derivation.** `splitAssets` now collects its lines per Person and
    flattens them, and the one `total()` is given a different set of lines for a member than for the
    Household; `accessibleWealth` is now literally `accessibleWealthByPerson(...)` summed onto the
    Offset. So a member cannot be computed by a rule its own total does not use.
  - **The Offset Account is in NEITHER member, by decision** (P4-3b: it is a Household account and no
    Person owns a share of it). It is already reported in full as `openingBalance` /
    `closingBalance`. So the identity is `Σ member + the Offset === the scalar` — and **each figure
    reconstructs against the Offset at its own clock**: the means-test split is taken on the month's
    OPENING position and the reachable figure at its CLOSE, exactly as the scalars beside them are.
  - **No figure moved, and that is asserted rather than described.**
    `test/core-non-super-parcels.test.mjs`'s cumulative strip gained a seventh layer
    (`assetsByPerson` deleted): the stripped digests and stripped byte lengths of both Households
    reproduce their pre-change pins BYTE-IDENTICALLY, while the full digests moved by 4.0% and 4.3%
    of bytes — three integers per Person per month, no strings. Every superseded digest is kept and
    asserted against.
  - **New fixtures in `test/core-assets-by-person.test.mjs`** (5 tests): an asymmetric couple whose
    six figures are all different; Ben's two boundaries, at 65 (reachable moves, the assets test does
    not) and at 67 (the assets test moves, reachable does not); the reconstruction identity over two
    whole walks with a vacuity control that the Offset actually moved; the month-on-month per-Person
    identity that makes the closing position load-bearing; and the one-member tuple.
  - **Mutations, each applied to source, built, counted and reverted** (count method:
    `grep -cE '^not ok'` over `node --test test/core-*.test.mjs`, cross-checked against `# fail`):
    a super interest attributed to the wrong index **5**; the Offset folded into member 0, breaking
    the sum **6**; a wrong-length tuple for a one-Person Household **1**; the member computed from
    the OPENING rather than the CLOSING state **4**.
  - **Harness note:** `test/core-projection.test.mjs`'s two-clock determinism tests spawn a child and
    read the whole walk off a pipe; the widened walk crossed Node's default 1 MiB `maxBuffer` and the
    child was killed with `ENOBUFS`. The harness now states a buffer large enough to carry the walk —
    a test that cannot receive the output measures nothing.
  - **THE UI HALF — 2026-09-19.** A radio pair above the month table (`#assets-view-toggle`,
    `public/index.html`), following the two chart toggles' pattern: the default is read off the
    markup's own `checked`, nothing is re-projected when it flips, and `main.ts`'s `paintTable`
    redraws the table alone. `monthToRows.ts` gained `AssetsView`, and `Month.assetsByPerson` is read
    **inside the `'person'` branch only** — the Household scalars are the default view AND the
    default read path, and `MonthRow.assetsByPerson` is `null` in it.
  - **How the OFFSET reads in the split view, and why.** Its own third block under the Persons',
    headed `Offset Account — the Household’s, and no Person’s`, carrying **no figure of its own**: it
    shows the row's existing `openingBalance` and `closingBalance`, each under a heading naming which
    clock it is, and a note saying that no Person owns a share of it and that the members therefore
    do not add up to the Household totals. Not folded into a Person (that would invent an owner), not
    dropped (that would hide money), and not re-formatted (a second expression of the same cents is
    this repo's oldest trap).
  - **Both tuple shapes are written out** in `assetsSplitRows`, not `.map`ped: a `.map` would accept
    a labels array of the wrong length and pair person 0's money with person 1's name. A length
    mismatch is a `RangeError`. Labels come from `household.persons` BY INDEX (`personLabels`), which
    appends the position when two Persons share a name — a blank name becomes `Person N`.
  - **What the counts caught, and it was a real fact about the fixture:** the first draft asserted
    that a Person's figure is *never* the Household's. False from 2043-05, when the demo walk empties
    the Offset: from there Dana holds everything and the two are equal. The test now pins the two
    counts — 201 months differ on the assessable (opening) clock and 200 on the reachable (closing)
    one, which are exactly the counts of months with `openingBalance > 0` and `closingBalance > 0`.
    The gap between a member and its total **is** the Offset, and the two clocks are visible in it.
  - **Seen on the page, not inferred** (headless Chrome `--dump-dom`, against a temp data dir so the
    real plan file was never touched; the toggle driven by a real `change` event). Couple, household
    view: 501 Position sections, `$412,000.00 / $676,500.00 / $674,727.25`, 0 split blocks. Couple,
    split: 501 splits, 1002 Person blocks, 501 Offset blocks, Dana `$412,000 / $96,500 / $94,884` and
    Ash `$0 / $538,000 / $538,000` beside an Offset of `$42,000.00` opening / `$41,843.25` closing —
    which reconstructs both Household figures to the cent. One-Person Household (same plan, Ash
    removed): 501 splits, **501 Person blocks and no `data-person="1"`**, the one-Person shape
    sentence, and the Household view `$412,000 / $138,500 / $136,727.25` = Dana + the Offset.
  - **UI mutations** (count method: `grep -E '^not ok'` over `node --test test/app-*.test.mjs`,
    cross-checked against `# fail`; each applied to source, built, `git diff`ed to confirm it landed,
    then reverted): person 0's figures rendered for person 1 **1**; the two-member case collapsed to
    the first member **3**; the split showing the Household scalar while claiming to be the split
    **3**. Baseline 351 tests, 0 failures.
  - **One tripwire widened, deliberately:** `test/app-scenario-panel.test.mjs` counted the page's
    event listeners and required each to call `paintChart`. It fired on the third listener — which is
    what it is for. It now expects three, still forbids a walk or a series in any of them, and
    requires the table switch to repaint the table and **not** the chart.
- [x] **P7-7** Legend/colour that survives 4+ scenarios — ✅ 2026-09-19 (`f55afff`, with P7-1).
  ~~Moot until **P7-1**: there is one Scenario
  on the chart, so a legend collision between four cannot yet be produced, let alone survived.~~
  **Stale box found 2026-09-20 by the README audit, same as P7-1's.** Colour is keyed by a hash of
  the scenario ID and never by array position, assigned in lexicographic id order so it is invariant
  under reordering; 8 colours × 4 dashes, and the 33rd scenario is REFUSED rather than wrapping and
  drawing two plans identically; the legend has no `maxHeight`, because a capped legend silently
  drops the sixth scenario, and duplicate names get their id appended.
- [x] **P7-8** X-axis ticks anchored to the calendar, not to a point-count division — ✅ 2026-09-19
  (`208efae`, `src/app/chartConfig.ts`'s `xAxisTickPlan`). Not in TODO.md before this pass; the ID is
  the code's own — `chartConfig.ts` already says "the whole of what P7-8's fix decides." Chart.js's
  `maxTicksLimit` on a 501-point category axis just divided the point count (`2026-09, 2028-06,
  2030-03 …`); ticks now land on July — the FY boundary this engine is driven by — stepping in the
  smallest of 1/2/5/10 whole years that keeps the tick count under 24, derived from the walk's own
  length rather than hardcoded. Pinned across several walk lengths in
  `test/app-chart-config-ticks.test.mjs`.
- [x] **P7-9** Date/Age axis switch, both ages on one line each — ✅ 2026-09-19 (`fe78181`,
  `src/app/monthsToSeries.ts`'s `ageAxis` + `chartConfig.ts`'s `AxisMode`). Not in TODO.md before
  this pass — a user request, made and shipped the same day. **The axis shows EVERY person in the
  Household, one age-label line per person, never one age picked to stand for the couple**: this
  household's two people are nine years apart, and the younger partner's Age Pension age is the
  largest cliff a couple forecast has, because their Accumulation Phase super is invisible to both
  means tests only until *they* reach it — an axis naming one age (an average, an older partner's,
  whichever) would make that cliff look like it lands on an arbitrary date. `series` is built once;
  the toggle only rebuilds the same 501-point config under a different label set (asserted by
  series-identity in `test/app-chart-config.test.mjs`).

---

- [x] **P7-UX-1 (user request 2026-09-24): the month table grouped into financial-year rows, collapsed by default.** — ✅ 2026-09-24, built alongside chat stage 5 rather than after it; the month rows keep their structure so stage 5's anchors merge in.
  - **As built:** `src/app/financialYearRows.ts` (pure) and `renderTable.ts`. The grouping is `groupByFinancialYear` in `core/financialYear.ts`, now shared with the connector's `financialYearSummary.ts`, so app code still imports nothing from `chat/`. In today's money each month's flow goes through its OWN month's lens and the cents are summed, then rounded once, so a year is exactly the months under it; the connector instead converts a nominal year total at the year's last month, so the two can differ in today's money (not in future dollars). Ages are the year's first month's, in the axis's words (`Ages 58 (Dana) · 66 (Ash)`, `died`, `not yet born`). `revealMonth(month)` opens a year for the chips; a `#month-…` address opens its year on load and on `hashchange`. Tests: `test/app-financial-year-rows.test.mjs`, which drives the DOM through a stand-in `document`.
  - **Each year row** (for example "2027-28"):
    - opening = the year's first month;
    - net cash, income from super and Age Pension = the year's totals (exact, reusing the connector's financial-year summariser logic);
    - closing, total super, investments and total wealth = year end, so Total wealth = Closing + Total super + Investments still holds.
  - **Ages:** each person's age is shown against the year, for both people; after a death, the axis's own "died" word.
  - **Behaviour:** click a year to expand its months. EVERY year is collapsed on load. The today's-money toggle and whole dollars carry through. A chat chip that targets a month line opens its year automatically.
  - **Queued AFTER chat stage 5 merges,** because both change renderTable.ts.

## Phase 8 — Persistence

*Must exist before any real figure is entered.*

- [x] **P8-1** Single `PlanFile` JSON shape, versioned — ✅ 2026-09-19 (`13aac3a`,
  `src/core/parsePlan.ts`). `PLAN_FILE_VERSION = 1`, a bare integer, and `version` anything else is
  a named refusal (`PlanFileVersionError`) rather than coerced. `Entry` is a 19-member union and only
  five params parsers exist (`RETIRE`, `WORK_PATTERN_CHANGE`, `SPEND_CHANGE`, `ONE_OFF_EXPENSE`,
  `NON_SUPER_INVESTMENT`) — the other fourteen (`UNSPECIFIED_ENTRY_TYPES`, derived from `ENTRY_TYPES`
  minus the parser's own keys, never a second hand-kept list) are refused BY NAME, and the whole file
  is refused rather than the one unreadable entry dropped. The 19/14/5 counts and the fourteen names
  are pinned in `test/core-parse-plan.test.mjs`. This changes what P6-5's "add a new entry type"
  costs: one edit to `PARAMS_PARSERS`, no second list to keep in step.
  - [x] **P8-1a** `settings.asAtDate` is part of the shape — the plan carries its own "today"
    (P4-1a, ADR-0002) — ✅ 2026-09-19. `Settings.asAtDate: IsoDate` is REQUIRED in `plan.ts` and
    parsed as such in `parsePlan.ts`.
- [x] **P8-2** ✅ **TICKED 2026-09-21, and this time the condition was actually discharged.**
  The item's own sentence — *"Still needs a look, not a re-tick on faith … confirm before ticking"* —
  was the blocker. **I ticked it once on 2026-09-20 by reading past that sentence, and reverted my own
  tick.** This is the audit it asked for. **All 32 editable controls round-trip; nothing silently drops
  a value; NO wiring fix was needed**, so no behaviour change rides in the commit — the only file
  changed is the test.
  - **The deliverable is a TEST, not a report, and it DISCOVERS the fields rather than listing them.**
    `controlNames()` reads `settingsPanel.ts` and `firstRunPanel.ts` as raw text and finds every
    `input`/`select`/`rateBox` call site plus `chooser.name`; the discovered set is asserted **equal
    in both directions** to the round-trip table's keys. Only the sentinel VALUE per field is
    hand-stated — the field SET is not. **A prose "I checked them all" rots the moment someone adds a
    field, which is exactly how this item sat unverified for two days.**
  - ⚠️ **THE FINDING, and it is the reason the audit was worth doing. A control name that DRIFTS from
    its lookup — `field('workBonusBalanced')` against a box named `workBonusBalance` — failed
    ZERO tests before this. I verified it myself across the whole suite: 1905 tests, exactly ONE
    failure, and it is the new harvest assertion.** A box read by a name nothing renders reads empty,
    saves empty, parses, projects and draws a chart — **the user's typed figure gone, with no
    refusal.** That is precisely the defect class P8-2 names, and it was unguarded.
  - **Mutations I reproduced myself:** dropping a real field from the save builder fails **5**
    (naming `investmentFeeRate`); **adding a plausible new field to the form and leaving it unwired
    fails 3, all in the new section** — so the test is not decorative, which was the condition I set
    for believing it.
  - **Two independent failure modes, both now asserted**: the round trip proves builder → door →
    reader, but **cannot see the DOM half** — whether the form harvested the box at all. That is what
    the harvest check adds, and why the drift mutation had been invisible.
  - **Two blind spots in any source scan are pinned rather than assumed away**: a helper forwarding a
    non-literal name (there is exactly one, `rateBox`), and a hand-built element. A second wrapper or
    a fourth raw element fails with a message telling the next person to teach the scan about it.
  - `firstRunPanel.ts` is covered too — two editable boxes on the same write path, and it cost nothing.
  - Superseded original text follows.
  **Save: write through to `plan.json`** via the Node server on every change.
  Superseded "localStorage autosave" — the store is now a file on disk, and localStorage holds no
  plan data at all (ADR-0007, ADR-0008). Mechanism landed 2026-09-19 (`13aac3a`), built and used
  end to end — `src/store/files.ts`'s `writePlan` `PUT`s to `/api/plan`, the server writes it, and
  `loadPlan.ts` surfaces a failure as `PlanWriteFailure`.
  **CORRECTED 2026-09-20 — the paragraph below described a mechanism 073d03e retired.** There is no
  `loadOrSeedPlan` and no seed-on-absence branch any more: a first run with no plan on disk mounts
  `firstRunPanel.ts` instead, which asks for a name and date of birth and writes nothing until
  Finish is pressed (`main.ts`'s `save` at line ~110, wrapping `savePlan`). `main.ts` is no longer
  read-only either — the same `save` door (line ~381) is now also the write path for the entry
  editor (`mountEntryEditor`), the settings panel (`mountSettingsPanel`) and the scenario panel, so
  "on every change" has several call sites, not the zero-or-one this paragraph used to claim.
  **Still needs a look, not a re-tick on faith:** whether that is *every* change (e.g. does every
  settings-panel field write through, or only some) has not been re-verified since this correction;
  confirm before ticking.
  *(Superseded text, kept for the record rather than deleted: "on every change" has exactly one
  caller today, the first-run seed write in `loadOrSeedPlan`'s `stored === null` branch: `main.ts`
  is explicitly READ-ONLY (entry editing is Phase 6), so there is no second call site yet to
  exercise "every change" against. **Left UNTICKED on 2026-09-19 after review, though the mechanism
  is complete:** the item says *on every change*, and one seed write does not demonstrate that. A
  ticked box is skimmed and prose is not, so ticking here would overstate in the place people read
  and correct it in the place they don't. It flips the day Phase 6 gives it a second caller.)*
  - ⚠️ **REVERTED 2026-09-20, same reconciliation pass — I ticked this and was WRONG.** I flipped it
    on "mechanism landed at `13aac3a`, both sub-items `[x]`". **The item states an unmet condition in
    its own body and I read past it:** *"Still needs a look, not a re-tick on faith: whether that is
    every change (e.g. does every settings-panel field write through, or only some) has not been
    re-verified since this correction; confirm before ticking."* **The outstanding work is that
    audit** — walk every field in `settingsPanel.ts` and confirm each one reaches `savePlan`. It is
    small and worth doing; a field that silently does not persist is exactly the class of defect
    P8-2b's banners exist to make impossible.
  - [x] **P8-2a** `PUT`/`POST` to the server writes the working file; write atomically
    (temp file + rename) so an interrupted write cannot truncate a plan — ✅ 2026-09-04
    (`e0dda25`), **before Phase 8 work started**, not part of this slice: `server/index.mjs` already
    wrote to `${target}.tmp` then `rename`d it. Verified still in place at `13aac3a`; noted here
    rather than left silently unticked because the mechanism predates the item that names it.
  - [x] **P8-2b** Surface write failures in the UI. A silent failed save is worse than no save —
    the screen would keep showing figures that are no longer on disk — ✅ 2026-09-19 (`13aac3a`,
    `src/app/planStatus.ts`). Two distinct banners, not one: "would not load" (file untouched, shown
    unchanged) vs "would not save" (disk is now older than the screen) — a `console.error` is
    explicitly rejected in the file's own header as not a failure state, since nobody has the console
    open.
- [~] **P8-3** **Export** — a dated snapshot, taken deliberately, for archiving or handing over.
  Distinct verb from Save, which is continuous. The docs conflated the two only because there had
  only ever been one. Import reads either a snapshot or a working file, and checks the version —
  **deferred by the user, 2026-09-19.** `plan.json` already survives both a refresh and a reboot
  (P8-2), so Export's own reason to exist — a snapshot distinct from the continuously-saved working
  file — has no user need behind it yet. Reopen when handing a plan to someone else, or archiving a
  point in time, is an actual thing someone wants to do.
  - [~] **P8-3a** The export shape is a **security control**, not a serialisation detail: it must
    stay assertable field by field, so a test can prove what is absent from it (ADR-0006, P15-2) —
    **deferred with P8-3, same date, sharper reason.** This item's whole point is a test that proves
    an LLM API key is absent from the export; Phase 15 (the AI chat, and the only place an API key
    concept would exist) is entirely unbuilt — `grep -rn "apiKey"` under `src/` finds nothing — so a
    test today would assert the absence of a field nothing in this build can produce. Reopen when
    Phase 15 introduces the key, alongside P8-3 itself.
    **The key arrived on 2026-09-24 (P15-2, chat stage 4)**, and its absence is now asserted on the
    Working File's own shape, which the export will share (`test/app-chat-key-isolation.test.mjs`).
    When P8-3 reopens, that test should cover the Export function itself.
- [x] **P8-4** `.gitignore` — plan, ledger and imports excluded; committed fixtures negated back — ✅ 2026-09-24: all three
  sub-items are done. The golden file (`fixtures/golden/`) is tracked too: it's committed, and `git check-ignore` exits 1 on it.
  - [x] **P8-4a** Non-JSON import formats: `*.csv`, `*.ofx`, `*.qif`, `*.qfx`, `*.xls`, `*.xlsx`,
    `imports/`, plus `ledger.json` / `*.ledger.json` — ✅ 2026-09-03. Bank data does not arrive as
    JSON; the original rules caught none of it, and the README claimed they did
  - [x] **P8-4b** `!fixtures/` and `!fixtures/**` negations — ✅ 2026-09-03. `*.plan.json` would
    otherwise have excluded the demo couple and the golden files that P2-8 and P13-4 require
    tracked. ⚠️ The negations go **inert**, silently, if any parent of `fixtures/` is ever
    excluded — commented in the file itself
  - [x] **P8-4c** Test that the fixtures are actually tracked (`git check-ignore` over the
    fixture paths, run like any other test). The failure mode here is silent by construction.
    ~~**Blocked on P2-8, and not vacuously**: the negations themselves are correct today, but
    `fixtures/` does not exist as a directory at all — the demo couple that actually ships
    (`src/app/demoHousehold.ts`'s `DEMO_PLAN`) is a display fixture outside `fixtures/`, explicitly
    NOT P2-8's verification artefact (see that file's own header). A test run now would pass
    vacuously over zero tracked paths and prove nothing; it needs P2-8's fixture to exist first.~~
    **UNBLOCKED, ✅ 2026-09-24.** `test/demo-couple-fixture.test.mjs`'s `P8-4c` test runs
    `git check-ignore fixtures/demo-couple.plan.json` via `spawnSync` and asserts exit status 1
    (not ignored). Mutation-checked non-vacuously: temporarily adding the path back to
    `.gitignore` flips it to exit 0 and fails exactly this test, reverted after.

---

### Still-working warning — DONE 2026-09-23

- [x] **"X is still paid a salary when the plan ends" above the Change-the-plan table.** Found when
  a ret@64 scenario beat its ret@67 parent: it switched off the HOUSEHOLD Retire and added a Retire for
  one partner only, so the other earned to age 100 and nothing on the page said so (flattering direction). The rule
  (`src/app/retirementWarning.ts`): warn for each Person with no switched-on RETIRE reaching them
  (own or household) whose salary in force at the end is non-zero. That salary comes from the latest-dated
  WORK_PATTERN_CHANGE, or from the Household wage if there is none. Names any switched-off Retire that
  would have covered them. Tests: `test/app-retirement-warning.test.mjs`. Mutations killed:
  household reach dropped, switched-off counted as on, WPC ignored, WPC picked by file order,
  zero wage warned. Residual: a Retire dated after the plan's horizon still silences it.
  **Also found:** the "$80k missing" report was today's-money deflation ($80k shows as $59,852.81 in
  2038). The breakdown line doesn't say which money basis it is in, which is still open as a UX gap.

### Month table: Total super, Income from super, Age Pension — DONE 2026-09-23

- [x] **Three new summary columns in the month table, each through the row's own money view.**
  **Total super** is `Month.superBalance`, stored by the walk. It adds up every interest of every Person
  at the CLOSE, using the same balances `accessibleAssets` is built from: after the month's drawdowns,
  before its growth, Guarantee, sacrifice and Division 293 release. A Household with no super shows $0.
  It is required, not optional: unlike the mortgage, "no super" and "$0 of super" are the same fact.
  **Income from super** is `Month.incomeFromSuper`, also stored by the walk. It sums the lines in
  `INCOME_FROM_SUPER_LINES`:
  - `Account-Based Pension minimum` (renamed `Account-Based Pension payment` 2026-09-23): limb 2 plus the Sch 7 sweep, and a TTR once it converts.
  - `Superannuation lump sum`: a stated `LUMP_SUM_FROM_SUPER` AND limb 5's automatic draw.

  Those are the only two routes out of a fund. **There is no TTR payment line.** A TTR pays out only
  through a stated lump sum, or after it converts. Excluded: SG, sacrifice, spouse contribution, and the
  Div 293 release (that money goes from the fund to the ATO).
  **Why the income figure is summed in the walk, not in `monthToRows`:** the lines carry a Person's
  name. Picking them out in the app would mean matching on a description PREFIX, which
  `core-div293-charge.test.mjs` bans under `src/`. So the walk compares whole descriptions, built by
  `superPaymentDescription` — the same helper the three push sites use.
  **Age Pension** compares `AGE_PENSION_LINE` whole. That makes the ratchet's count of whole comparisons 10 → 11.
  **Tests:**
  - `test/core-projection-super-balance.test.mjs`: a four-interest couple at a nil return. Every month,
    `superBalance` = stated − paid out, and `incomeFromSuper` = that month's payment lines.
  - §10 of `test/app-month-to-rows.test.mjs`.

  **Mutations killed:**
  - An interest dropped from the total: 2 targeted tests red, plus 2 full-digest tripwires.
  - Limb 5 omitted: 3 red, plus 1.
  - SG included: 2 red.
  - Age Pension not converted to today's money: 1 red.

  **Digests:** both byte digests strip the two new keys and land on the SAME hash, so no existing figure
  moved. The full digests are re-pinned, with the old ones asserted against.
  **Not built:** a per-Person super split (`assetsByPerson` is untouched).

### Interest on running cash — BUILT 2026-09-23 (was BLOCKED the same day on ownership)

- [x] **Running cash (the Offset, `closingBalance`) earns interest.** Blocked earlier the same day
  because cash had no owner for income tax; the user ruled ownership and the rest, and it is built.
  - **Rate:** `Settings.cashInterestRate`, optional; ABSENT means the plan's own
    `economicSeries.cpi` (the sixth optional Setting, and the only one whose absence is filled — by
    another of the user's figures). A stated 0 is legal and means "earns nothing"; a negative rate
    is refused by name at the door.
  - **Base:** `max(0, cash − loan owing)` at the month's opening, the mirror of `mortgageMonth`'s
    `max(0, balance − offset)`: each dollar cancels loan interest or earns this rate, never both. A
    twelfth of the annual rate a month, rounded down. One cash inflow per owner,
    `Interest on cash, <name>` (`CASH_INTEREST_LINE`, `cashInterestDescription`).
  - **Ownership, for TAX only:** `Household.offsetShares`, per Person, summing to 1 (refused by name
    otherwise, at the door and in the walk — `offsetSharesOf`). Absent: 50/50 for a couple, 100% for
    one Person. Odd cents go to the last owner. The means test, `splitAssets.byPerson` and
    `accessibleWealthByPerson` are unchanged: the balance is still pooled, and no per-Person wealth
    figure takes a share of it (no reason found that it must).
  - **Tax:** each owner's share rides on every monthly `assessHousehold` (annualised, like salary) and
    on the Division 293 base, and the year's actual total joins the year-end settlement beside the
    distribution. **Not Age Pension income**: nothing reaches the means test; the cash is deemed.
  - **Pension-only:** `outcomes.ts`'s condition 4 now admits interest lines, on P4-5b's own ruling
    (the cash a pensioner holds is the pension's surplus; its interest is that surplus earning).
    Without that, the first interest line would end every thrifty Household's run after one month.
  - **Page:** a Settings box (blank follows CPI, `0` earns nothing) with `CASH_INTEREST_NOTICE`
    (follows inflation, taxed as the owner's income, not Age Pension income, only cash above the
    loan); one share box for a couple under the offset (the first Person's %, the second owns the
    rest; pre-filled 50, which writes no key).
  - **Proof of the sequence:** with an EXPLICIT 0 injected into every `project()` call, all 1,597
    walk digests across 81 test files are byte-identical to @66bac84. Then absent → CPI: 68 tests
    moved. 16 fixtures in 14 files whose subject is not interest state `cashInterestRate: 0` (the proved
    control); every demo-plan figure that moved is re-derived in place with its mechanism, the old
    value kept beside the new. `test/core-cash-interest.test.mjs` is the feature's own file.
  - `PersonBalances`' "DOES NOT GROW — the Offset" note is rewritten: the interest is a line, not
    growth. A plan whose loan is larger than its cash throughout
    earns no interest and walks byte-identical.

### A lump sum out of an Account-Based Pension — BUILT 2026-09-23; the "above the minimum" limb was NOT built

- [x] **`LUMP_SUM_FROM_SUPER` from a retirement-phase Account-Based Pension is paid, not refused.**
  `LumpSumFromPensionInterestNotModelledError` is deleted (register row marked RETIRED). The balance
  falls by what was paid and the cash rises by it. The month's `SuperWithdrawalNote` (on screen)
  says the s 294-80(1) item 1 transfer balance debit is NOT modelled (no credits are either, O57)
  and that the withdrawal does not count toward the year's minimum, which June still sweeps in
  full. The release gate is not asked of an Account-Based Pension (retirement phase is the
  release); the tax age still is. A TTR is unchanged: it passes both gates or is refused. Limb 5
  still offers nothing out of an Account-Based Pension (the check moved into
  `releasedSuperannuationOffer`, same note).
- [x] **NOT BUILT, and not needed: a Waterfall limb drawing an Account-Based Pension "above its
  minimum".** Limb 2 (`accountBasedPensionMinimum`) already offers the WHOLE balance (the
  2026-09-17 ruling that the Sch 7 minimum is a floor), pinned by
  `test/core-projection-pension-drawdown.test.mjs` ($99,763.34 drawn in one month against a $24,000
  minimum). A second limb after it could never draw. Two open follow-ups: the page still titles limb 2
  "Account-Based Pension minimum" (`WATERFALL_LIMB_TITLES`), which reads as a cap; and limb 2 draws only
  an interest with a stated commencement day (`held.fy === fy`), so an automatic switch into an
  Account-Based Pension must give the new stream a commencement day or it will draw nothing.
  **Both closed 2026-09-23 by the switch at retirement, below.**

### The switch at retirement — BUILT 2026-09-23 (user rulings)

- [x] **A RETIRE at 60 or older turns the Person's accumulation super into a retirement-phase
  account-based pension on the RETIRE day.** `src/core/retirementPension.ts` decides who, which
  accounts and which day off the plan (`retirementSwitches`); `project()` and the page's notice both
  read it. A TTR converts at the EARLIEST of its early-conversion day, the RETIRE day and the 65th
  birthday — RETIRE is treated as the notification day, which overrides register R5 (recorded under
  R5 in the register, with the residual's direction).
  - **The day:** the first switched-on RETIRE reaching the Person (own or household), behind
    `conditionOfRelease` (the age-60 test). Before 60: nothing switches, a `pension at retirement`
    note says so in plain words. Dated before the plan starts: the stated phase governs, noted.
  - **Commencement:** the switched account commences its pension on the switch day
    (`commencementDayFor`), so Sch 7 cl 3 pro-rates the first year and cl 4 makes a June start nil.
    A mid-month switch is determined in its own month, on the balance that month opens with. The
    month's Household carries that day in `statedStreamSettings`, so limb 2's nil note stays true.
  - **Transfer balance cap:** tested in the RETIRE month on the opening balance (plus any in-walk TTR
    credit) against the PUBLISHED $2,100,000 (`PUBLISHED_TRANSFER_BALANCE_CAP`; the cap never falls).
    Over it, nothing switches and the note says "splitting an account … is not modelled". A stated
    prior retirement-phase pension — or a stated account-based pension already held — also stops the
    switch (the cap left is unknowable). These are NOTES, not throws: the brief's own page sentence
    says the switch "doesn't apply" there, and a throw would take the whole forecast down.
  - **Opt-out:** `SuperInterest.keepInAccumulationAtRetirement` (optional boolean; refused on an
    account-based pension). A plan that states it walks byte-identically: the committed demo, kept
    out, lands on the pre-switch digest (`core-projection-pension-drawdown.test.mjs`).
  - **Page:** a per-account "At retirement, 60 or older" box (Becomes a pension / Stays as it is,
    hidden on an account-based pension) and a per-Person "Had a retirement-phase pension before" box
    (No by default; writes `statedPriorRetirementPhase`, which the form now edits). The ruled notice
    sits above the Change-the-plan table (`pensionAtRetirementNotices`).
  - **Labels:** growth, fee and earnings-tax lines name the EFFECTIVE phase (this also fixes a
    converted TTR's labels). `PENSION_MINIMUM_LINE` is now `Account-Based Pension payment` and the
    limb title `Account-Based Pension` (the limb offers the whole balance; the register keeps the
    rule's name).
  - **Refused:** a contribution (Guarantee, sacrifice, spouse) into a switched account, by name.
  - **Tests:** `test/core-retirement-pension-switch.test.mjs` (11). Mutations killed, reds in the
    full suite: age-60 test dropped 4; 65th birthday instead of RETIRE 19; no commencement day 19;
    commencement on the next 1 July 7, on the year's own 1 July 7; opt-out ignored 17; over-cap
    converts 2; labels on the stated phase 2; unspent minimum left in super 26.
  - **Fixtures:** where a fixture's subject is not the switch, it keeps its account out (named in
    place) and every figure stands unchanged. Every demo figure that moved is re-derived in place:
    AP months 495 → 473 (no pension 2031-06 to 2033-03), protected band 105 → 57 months, $120k
    marker 2047-11 → 2046-02, $700k floor breaches 304 → 357, terminal wealth $1,291,292.18 →
    $507,268.78 (the flows decomposed in `app-comparison-series.test.mjs`).
- [x] ~~**OPEN — the swept minimum piles up in cash that is never spent.**~~ **CLOSED 2026-09-23 by
  the draw-order ruling below.** Original text: The Offset is limb 4, after the pension (limb 2) and
  the parcels (limb 3), so each June's unspent minimum lands in cash earning CPI while 6.5% assets
  are sold. On the demo the Offset reaches ~$318,000 by 2040 and is never drawn; that and the lost
  growth are most of the $784,023.40 terminal fall.

### Spend cash first — the Waterfall order, BUILT 2026-09-23 (user ruling)

- [x] **The order is now seven limbs** (`WATERFALL_LIMBS`, whose doc is the one place it is written):
  salary → the pension up to what is still owed of this year's minimum → cash NOT offsetting the home
  loan → Non-Super Portfolio → the pension above its minimum → cash that IS offsetting the loan →
  released accumulation super. The split of cash is `max(0, cash − loan owing)` on the same
  `loanOwing` the interest on running cash is paid above, so a dollar spent early is one earning the
  cash rate and a dollar kept back is one cancelling loan interest (concept.md §5.12's reason, kept
  for exactly those dollars). The pension's two limbs read the same claims, split at
  `min(balance, remaining minimum)`; together they offer the whole account, and June still pays any
  minimum left (`minimumStillDueThisMonth`, unchanged). Page titles: "Account-Based Pension, this
  year's minimum", "Cash not offsetting the home loan", "Investments", "Account-Based Pension, above
  this year's minimum", "Cash offsetting the home loan".
  - "Limb 2/3/4/5" in older comments, tests and the register are NAMES (pension, portfolio, Offset,
    released super), not positions; the two new limbs are called by name only.
  - **Byte-identity:** a walk with no pension draw offered and no cash above a loan in any month is
    identical to HEAD once the two new nil limb notes are dropped and the Offset note's text is
    blanked — 127 of 127 such walks in the suite, by digest. Exact bytes cannot match: every month
    carries two more limb notes, and the Offset note now says which cash it is.
  - **Mutations killed** (full suite, non-server failures): old order restored 31; offsetting cash
    drawn early 4; June minimum sweep removed 25; cash above the loan after the portfolio 25; pension
    above its minimum before the portfolio 24.
  - Demo (committed): terminal wealth $507,268.78 → $921,573.75; the cash now empties in 2032-05.
- [x] **RULED 2026-09-24 (user): the surplus stays in cash. No reinvestment, no sweep, no setting.** This is the lowest answer, and it's what the household would actually do. Don't reopen it as a defect. — **OPEN — a late-life SURPLUS still piles up in cash.** Where the Age Pension alone exceeds the
  bills (late in a typical plan), each month's surplus and each June's unneeded minimum land in
  cash at the cash rate and nothing reinvests them — the order cannot spend money nobody needs. A real
  scenario can end with a large cash pile. Wants a ruling on reinvesting surplus.
- [~] **MERGED 2026-09-23 into "DEFECT — payoff-month cash is held back in the Offset limb" (Home
  loan payoff section below).** Same defect, found twice the same day. The later entry has the
  measurement, so it is the one to work from. — **OPEN — a `MORTGAGE_PAYOFF` month sells investments before using the offsetting cash.** The
  loan is owing when the month is priced, so its cash counts as offsetting and is drawn after the
  portfolio and the pension above its minimum — even though the payoff ends the loan that month.
  Pre-existing (the Offset was last before too); not changed by this ruling.
- [ ] **OPEN — no transfer balance account is kept.** The cap test is one comparison on the day; no
  credit, debit or later conversion is recorded against it (O57 stands).
  - 🔴 **GATE: NO-GO, 2026-09-24 (LIZ).** Wiring the account into the walk would change no figure for the demo household. The one-day test already adds up TTR and retirement-switch credits, each fixed at its own conversion, and it refuses a stated prior pension. The cap is pinned at $2.1M and never indexed, which errs the cautious way.
    - **What wiring would do:** it makes `UnknownPersonalTransferBalanceCapError` mandatory for every Person with a retirement-phase account and no `statedPriorRetirementPhase`. That's 30 of the 36 fixtures holding an ABP, and the demo's Ash, so `DEMO_PLAN` would stop walking.
    - **Prerequisite:** first decide how `statedPriorRetirementPhase` gets asked and migrated, with a UI question. That's a product decision, not wiring.
    - **Residual risk:** a first conversion decades out, with a balance above $2.1M but below the true indexed cap, would be wrongly REFUSED. That's loud, not silent.

### Pay: the retirement month and wage growth, BUILT 2026-09-23

- [x] **A RETIRE month pays the days worked (defect, no ruling needed).** The RETIRE date is the last
  day worked, so its month pays the in-force salary for the days from the 1st up to and including it,
  pro-rated by days — `daysInclusive` and one exact rounding, the SIS Reg Sch 7 cl 3 day count
  `ttrRateOverDays` already uses. Before, the whole month was nil: a 30 June retirement paid no June
  while super opened only in July (a phantom gap of several thousand dollars). The share scales the
  in-force salary itself, both periods, so the cash line, tax accrual, Guarantee, income test and
  Work Bonus all read one pro-rated pay; the sacrifice takes the same share. A RETIRE before
  `asAtDate` pays nothing. `test/core-projection-retirement-month-pay.test.mjs`.
  - **Decision taken, flagged:** a RETIRE on the 1st switches the account ON that day, so its one day
    of pay would have had its Guarantee refused as a contribution into a pension. The final pay's
    Guarantee and sacrifice are credited to the account as it is (`refuseContributionAfterSwitch`'s
    `fromFinalPay`); work after retirement is still refused.
  - Fixtures that used "RETIRE on the 1st" to mean "stops at the start of the month" were re-dated to
    the last day of the month before (byte-identical); the demo's 2031-05-14 moved and was re-derived.
- [x] **Pay rises with wages (user ruling).** Every stated salary — `employmentIncomePerFortnight`
  and a `WORK_PATTERN_CHANGE`'s `annualSalary` — is in the wage level of `asAtDate` and is raised to
  each month's by `economicSeries.awote`, through `priceLevel.ts`'s `inflateStated` (the fourth call
  site; the inventory test counts it). **The WPC salary is read in TODAY's wages, never its own
  date's**, on `SpendChangeParams.annualSpend`'s precedent. Raised first, then pro-rated in a RETIRE
  month. Tax, the Guarantee, Division 293, the income test and the Work Bonus read the raised figure;
  the salary SACRIFICE does not rise (O88). The Settings AWOTE notice, the pay box and the change-of-
  hours form now say so. `test/core-projection-wage-growth.test.mjs`.
  - **Control:** with the wage factor forced to 1, the whole pre-change suite passed but the
    inflateStated count. Fixtures whose subject is not pay state `awote: 0`, each proved figure-
    identical on the step-1 build; the demo plan kept 3.5% and was re-derived.
  - **Mutations killed** (non-server failures): pay at CPI 89; growth yearly 25; sacrifice indexed
    10; the Guarantee on the flat salary 22; the RETIRE month paying nothing 32; a 10th-of-the-month
    retirement paying the whole month 16.
  - Demo (committed): Age Pension months 470 → 452 — fifteen while Dana works (the income test's
    cut-off rises with prices, her pay with wages) and three in 2033; terminal wealth +$23,614.20.
- [x] **~~OPEN~~ FIXED 2026-09-23 — the cap was checked only in the month a sacrifice is STATED.**
  With pay rising, the Guarantee rises every month, so a sacrifice stated at the edge of the room
  went over the cap later and nothing looked. The stated-month refusal (a throw) is unchanged; the
  walk now also holds each year's ACTUAL Guarantee + sacrifice to date (the Div 293 accumulators)
  against that year's cap in every month, through the same comparison
  (`concessionalContributionsOverGeneralCap`, which the refusal now calls too), and in the month the
  total first passes the cap emits a `'concessional cap exceeded'` note, once per Person per year.
  **A note, not a throw** (switch-build precedent): the user changed nothing, and a forecast must not
  stop because wages grew. ⚠️ The excess is still walked at 15% — Div 291 is not modelled — so the
  note says the forecast is FLATTERING from that month by the marginal rate less 15% on the excess.
  A walk opening after 1 July holds only its walked months, so its first year is a lower bound.
  Div 293's `excessConcessionalContributions` stays nil (O83 now reachable, conservative: overcharges
  by ≤ 15% of the excess). Byte-identity: all 1,663 `project()` calls in the suite digested before
  and after — 1,657 without a note identical, the 6 with one identical once it is removed (Val's
  FY2026-27 fixture is $20k of sacrifice on $31.2k of Guarantee, never checked before).
  `test/core-projection-concessional-cap-year.test.mjs`. Mutations killed (non-server failures):
  check only in the stated month 2; SG left out 2; the first FY's cap for every year 6; a month's SG
  counted twice 3.

### Home loan payoff: what it draws, and a target that moves no money — 2026-09-23

- [x] **Month table names entries by their words, not their ids** (e419124). "Stated by these
  entries" and "Changes that applied this month" printed UUIDs.
- [x] **Payoff wording corrected: it is NOT "paid from cash".** `MORTGAGE_PAYOFF` adds the payout to
  the month's Waterfall target, funded like spending — the user's R@63 plan cleared $127,903 in
  2038-06 through a $136,257 Account-Based Pension payment with no lump-sum entry at all. The false
  claim sat in `describeParams`, and in comments in `parsePlan.ts` and `planEdits.ts`.
- [x] **A target date with the loan still owing says so** (`MortgageTargetHeadline.stillOwing`).
  `MORTGAGE_TARGET` moves no money; the user had set one beside a $120k lump sum from super and
  the loan ran on for years at $2,300 a month. Stated as a fact, not "target missed" — a target may
  mean "covered by the Offset". Mutation (condition inverted) fails 1.
- [x] **DEFECT — payoff-month cash is held back in the Offset limb — CLOSED 2026-09-24 (gated GO).**
  In a `MORTGAGE_PAYOFF` month `cashLimbs` now splits at `mortgageThisMonth.closingBalance` (nil),
  so all the running cash, a same-month `LUMP_SUM_FROM_SUPER` included, is `cashAboveLoan`; every
  other month still splits at the opening `loanOwing`. `test/core-mortgage-payoff-cash.test.mjs` (3):
  $150k cash against $118k paid off in 2026-11 offered $32,000 free cash, drew $52,837.18 above the
  minimum and closed on $118,000; now $150,000 free, nil above the minimum, closes on $65,162.82.
  Demo walk and connector fixture sha256 unchanged; no existing test's figure moved. Original entry:
  `cashLimbs` splits cash at the START-of-month `loanOwing`, so in the month the loan is paid off,
  up to the whole balance of cash is still treated as offsetting it and drawn after the portfolio
  and the pension above its minimum. R@63 with both a $120k lump sum and a payoff in 2038-06: the
  pension paid $56,912 needlessly and the month closed with $127,741 of cash, exactly the loan just
  cleared. Super + cash at 2040-06: $831,300 vs $834,311 for the payoff alone.
- [~] **Parked — a payoff that names a super interest (option B).** Gated GO 2026-09-23, but its
  premise was wrong: the plain payoff already draws super. It would only add naming the account and
  jumping ahead of cash and the portfolio. Not wanted unless the user asks again.

## Phase 9 — Home equity

**Gate 2026-09-24: CONDITIONAL GO for a narrow slice** (`docs/research/p9-heas-gate-2026-09-24.md`). `data/assumptions/heas.ts` is built,
sourced and tested, but nothing calls it: there's no `HEAS_DRAW` parser and no projection branch. Re-checked live, with no mismatches. The first slice
is fortnightly income only (no advances until the §5.3 advance-period rate is resolved against s1134(1A)(b)), home-only security, the debt
kept out of assessable assets (T38), and an explicit refusal for HEAS_DRAW with a refinance/redraw (T35). It defaults off, so no golden figure moves.

✅ **SLICE 1 LANDED 2026-09-24 (ENGINE ONLY — no entry-editor UI; `HEAS_DRAW` sits in
`planEdits.ENTRY_TYPES_NOT_YET_WALKED` until P6-6a/P6-6b build a form control for it).**
`HEAS_DRAW` (`owner: 'household'` only this slice — T37's per-Person split is a later one) takes
`securityValue`, `fortnightlyAmount` (a stated `Cents` or `'maximum'`) and an optional `stopDate`.
Door refusals: under Age Pension age at `date`; not a homeowner (`household.homeStatus`); a second
`HEAS_DRAW` in the file; a stated `fortnightlyAmount` over the ABSOLUTE 150% ceiling; `stopDate` on
or before `date`; a `MORTGAGE_REFINANCE` dated on or after the draw starts (T35, refuse rather than
warn). In `project()`: walked fortnight by fortnight within each month (`fortnightsInWalkMonth`),
paid into household cash, accrued via `heasAccrueFortnight` (reused, not reimplemented), and stopped
at the capacity cap (`maximumLoanAvailable`, age component fixed at the entry's own start date — the
T36 annual step function is deferred) with `HeasCapacityCapNote`, not a silent stop — interest keeps
compounding past the cap (T41). `Month.heasDebt` is a new LIABILITY field, kept OUT of
`assessableAssets`/`protectedAssets` (T38) and SUBTRACTED from total wealth (`monthToRows.ts`),
unlike `radHeld` which adds — because the draw is real cash that already landed in `closingBalance`.
The NNEG's `debt ≤ securityValue` bound is documented on `Month.heasDebt` rather than enforced: this
slice models no repayment event to clamp it against. Tests in `test/core-projection-heas.test.mjs`;
full suite green, golden byte-identical, 3 named mutations red. Not built this slice: advances
(§5.3), T36/T37, P9-1d's cross-Scenario Security Value display, and the entry-editor UI (P6-6a/b).

✅ **SLICE 2 LANDED 2026-09-25 (THE SCREEN — P6-6a/P6-6b, `HEAS_DRAW` leaves `planEdits.
ENTRY_TYPES_NOT_YET_WALKED`, offered count 16 → 17).** `entryForm.ts` gained the `HEAS_DRAW` group,
`enterCareEntry`'s own precedent: the security value (labelled as the household's own estimate), a
select choosing a stated fortnightly amount or "the most allowed", and an optional stop date —
`heasDrawEntry` (`planEdits.ts`) resolves the union by which STRING `fortnightlyAmount` is, never by
a second builder function, and a blank stop date is OMITTED rather than handed to `parsePlan` as an
empty string. `HEAS_DRAW_ENTRY_NOTICE` states the loan/interest/NNEG/refinance-voids-it facts in
plain English. The door refusals (age, homeowner, second entry, the 150% ceiling, a same-or-later
`MORTGAGE_REFINANCE`) all now show on screen through the ordinary save gate. `toolCatalogue.ts`,
`listEntries.ts` and `proposeEntries.ts` all gained the same shape — `listEntries` drops the second
money figure entirely when the draw is "maximum", since it is not a `Cents` figure. The chart gained
a fourth overlay, `heasDebt` (`monthsToSeries.ts`/`chartConfig.ts`), on the `accessible` overlay's
own footing — `Month.heasDebt` read straight off, no filtering — because neither wealth band nets
the debt out (T38): the stack reads high by the debt wherever a walk holds a `HEAS_DRAW`, and this
line is the only place on the chart the debt is drawn at all; `monthsToSeries.ts`'s own header now
says so, narrowing its "protected + assessable IS total wealth" claim. README's entry-type count
moved 16 → 17. Test files run green: `app-entry-form`, `app-plan-edits`, `app-chat-propose-entries`,
`app-chart-config`, `app-months-to-series`, `readme-claims`, `app-chat-list-entries`,
`app-chat-what-can-you-model`, `connector`, `core-parse-plan`.

- [ ] **P9-1** HEAS facility, **defaulting off**; 3.95% compounding fortnightly; No Negative Equity Guarantee
  - [x] **P9-1a** The NNEG is **voided by increasing the Owner-Occupied Mortgage** while the loan runs (s 1144AA(3)(a)) — must surface on any `HEAS_DRAW` + refinance or redraw Scenario, not be silently kept (T35) — ✅ 2026-09-24, slice 1: `parsePlan`'s `checkHeasDraws` refuses a `MORTGAGE_REFINANCE` dated on or after the `HEAS_DRAW`'s own date
  - [x] **P9-1b** ⚠️ **Gate for the whole phase.** HEAS capacity needs the home's **market value**, which ADR-0005 exists to exclude. Recorded as trap **T42**; the ADR is deliberately **not** amended yet. Resolve the tension before P9 is built — the proposed resolution is market value as an optional Setting read by **nothing but** HEAS capacity, with `HomeStatus` untouched as the means-test primitive and nothing in the assets test permitted to read it
    — ✅ 2026-09-04. Resolved across two ADR-0005 notes and closed here. The gate opened wider than
    proposed: the value is read by HEAS capacity alone *and* it is not a Setting. It lives in the
    `HEAS_DRAW` entry's `params` as the Security Value, so a plan with no HEAS entry carries no
    house price anywhere. See P9-1c for what that leaves to build
  - [x] **P9-1c** The Security Value is a **`HEAS_DRAW` entry parameter, not a Setting** (ADR-0005,
    "Where the value lives", 2026-09-04). Consequences: nothing collects it during household setup;
    it is absent from `Person`, `Household` and the Settings surface; the entry editor prompts for
    it (P6-6a); it is passed to the HEAS ceiling calculator as an argument and `core/agePension.ts`
    has no parameter to receive it through. `settings.ts` keeps its `SETTINGS_NOT_ASSUMPTIONS`
    entry for `heas.homeMarketValue` — that register answers *why no assumption backs this key*,
    which is unchanged — but the `HomeMarketValueSetting` **shape is now misnamed** and moves onto
    the entry's `params` type. Rename in the same commit that builds the entry, not before
    — ✅ 2026-09-25. Checked against the code: `HeasDrawParams.securityValue` (`src/core/plan.ts`) is
    the shape, read only by `personMaximumLoanAvailable` in `project()`'s HEAS_DRAW block; the entry
    form prompts for it (`src/app/entryForm.ts`, `heasSecurityValue`, P9-1 slice 2); `Person`,
    `Household`, Settings and `agePension.ts` carry nothing. The orphaned `HomeMarketValueSetting`
    (no importer anywhere) is DELETED from `settings.ts` rather than renamed — its replacement already
    existed; `SETTINGS_NOT_ASSUMPTIONS['heas.homeMarketValue']` kept, its reason now names
    `HeasDrawParams.securityValue` as where the value is stated
  - [x] **P9-1d** Two Scenarios may price HEAS off two different Security Values — a conservative
    valuation and an optimistic one — and be compared. That falls out of the entry-parameter
    decision and is the concrete reason it beats a global Setting; make sure the comparison view
    shows which value each Scenario used, since the difference is otherwise invisible
    — ✅ 2026-09-25. The door half landed in da8732b (a couple's securityValue agreement runs per
    Scenario, so siblings may disagree). The display half is new: `comparisonSeries.ts`'s
    `heasSummary` puts an optional `heas` ({ securityValue, text }) on each `ScenarioComparisonLine`,
    and the Scenario list prints it beside the Shortfall Age and Age Pension sentences
    (`scenarioPanel.ts`, `heasOf`). `test/core-projection-heas.test.mjs` "P9-1d" walks two siblings at
    $10,000 and $20,000 to capacities one and two age-component units apart, and pins each line's value
- [ ] **P9-2** HEAS capacity cap (needs P1-7); income stream and advances
  - [x] **P9-2a** ✅ 2026-09-25. Age component table as a frozen constant (`F2019L00420`, no indexation mechanism); security value floored to $10,000 **per Person on that Person's share** (T36, T37). **T36 verified**: F2019L00420 s 4(1)(b) and SS Guide 3.4.5.30 (already primary-verified in `heas.ts`'s `whoseAge`/`recalculationCadence`, four sources agree) — the age is the YOUNGER member of a couple, at last birthday, recalculated once every 12 months on that birthday, a STEP FUNCTION. `project()` now recomputes it every month off `ageAt(dob, firstDayOf(month))` in the `HEAS_DRAW` draw block itself (no more cached `heasCapacity` local, no more "fixed at entry's start"), so a birthday genuinely raises `capacity` and lets a previously-clamped draw resume — proved in `test/core-projection-heas.test.mjs` by replaying the same production functions across a multi-year walk and finding a bracket (age 74→75) where the table's own step (4.17%) beats the interest rate's fortnightly-compounded EFFECTIVE annual rate (≈4.03%): three separate binding episodes, three separate notes, and a month of full resumption in between. **T37 decided**: `data/assumptions/heas.ts`'s own `coupleStructure` fact (SS Guide-sourced, present since slice 1) is that EACH Person has their own loan against their own share of the security (50-50 by default), both loans priced off the SAME younger-partner age component — so this is TWO INDIVIDUAL loans, never one joint facility, and `HEAS_DRAW.owner` is now `personA`/`personB` only (`household` refused, `ENTER_CARE`'s own precedent) — at most one entry per Person, `checkHeasDraws` (`parsePlan.ts`) refuses a couple's two entries if they disagree about `securityValue` (the shared home). `personMaximumLoanAvailable` (already built in slice 1, now finally called from `project()` instead of `maximumLoanAvailable`) floors the $10,000 on the PERSON's OWN SHARE, not the whole value — proved by a couple whose $15,000 home gives each partner a nil $7,500 share (both draw nothing) against the SAME $15,000 flooring to one nonzero $10,000 unit if read as a single household figure. The 150% fortnightly cap and the "maximum" netted allowance are also now per-Person: half the couple's combined maximum payment rate (`entitlement.perPersonRatePerFortnight`'s own halving), not the household total. `HeasCapacityCapNote` now fires EVERY time a Person's draw newly binds (a `heasCapped[]` flag per Person, cleared the first month room reopens), not once for the whole walk. `src/app/entryForm.ts`'s owner selector was already generic (`ownerOptions`, `personA`/`personB`/`household` for every entry type) — no UI change was needed beyond the door widening; `src/app/planEdits.ts`'s `heasDrawEntry` doc updated to match.
  - [x] **P9-2b** ✅ 2026-09-25. `HeasDrawParams.advances?: { date, amount }[]`, optional, per Person (one `HEAS_DRAW` entry is already one Person's own loan). **T136 RESOLVED** (`docs/research/p9-2b-heas-advances-gate-2026-09-25.md`, GO): register §5.3's own pseudocode is right, the table row is a **26× error** read literally and is struck in place (not deleted) — pinned to the cent against Services Australia's "George" example ($15,323.10 − $10,000 = $5,323.10 ÷ 26 = $204.73/fn) in `test/assumptions-heas.test.mjs`'s new `heasFortnightlyDrawDuringAdvancePeriod`. `checkHeasDraws` (`parsePlan.ts`) refuses, by name: an advance outside the draw's own active span, a THIRD advance within any rolling 26-fortnight window keyed to that window's own first advance (s 1134A(2)(b), worked out in DATE order regardless of file order), and a window TOTAL over 50% of the annual maximum payment rate (s 1134A(3)(a), reusing `heasAdvanceCap`/`heasAdvanceAvailable`). `project()` walks each Person's own rolling window chronologically (`daysInclusive`, no `Date`): an advance joins the balance BEFORE that fortnight's interest (s 1135(3) Step 1A, T40's own order, at the first fortnight the month contributes) and counts toward the capacity cap; the fortnightly draw for the WHOLE month is `heasFortnightlyDrawDuringAdvancePeriod` whenever the window is active — applying from the SAME fortnight the advance lands, not merely the ones after it, per George. **T137, UNCONFIRMED and refused, not guessed**: the Act's floor for a genuine PART-RATE pensioner (`0 < pension_fn < MPR_fn`) during an advance window is settled by neither published example nor AustLII's text — `project()` throws a `RangeError` naming the Person, month and register row rather than show a possibly-wrong figure, restricting this slice to full-rate and nil-entitlement Persons (the gate's own scope). **T138, means-test consumption punted deliberately, T39/T42's own pattern**: an advance is ordinary deemed cash from day one on both tests in this build, no 90-day home-security exemption modelled — the CAUTIOUS reading of §5.7, stated in `heas.ts`'s notes and in `HEAS_DRAW_ENTRY_NOTICE`. `src/app/entryForm.ts` gained ONE advance-date/advance-amount box pair in the `HEAS_DRAW` group (no repeatable-row pattern existed to extend, so the form offers one advance per entry this slice; the underlying `advances` field is a real list, stateable by hand in the plan file); `planEdits.ts`'s `heasDrawEntry` and `src/app/chat/tools/proposeEntries.ts`'s HEAS_DRAW case both updated to match. `test/core-projection-heas.test.mjs` adds the door refusals (span, window count, window dollar cap, window rollover) and the wiring proofs (the whole month at the reduced rate, the window persisting with no new advance, the debt to the cent, the T137 refusal)
  - [x] **P9-2c** HEAS at $0 entitlement does **not** confer a Pensioner Concession Card (s 1137A) — the tool must not imply the facility rescues the retain-eligibility goal (T32) — slice 1 does not touch `AgePensionEntitlement.pensionerConcessionCard` at all, so a nil-entitlement HEAS household today reads whatever the PCC would have been WITHOUT HEAS (i.e. this specific T32 risk is not yet reachable — HEAS changes no Age Pension figure at all in slice 1, PCC included — but nothing yet warns a user of the real scheme's PCC rule either) — ✅ 2026-09-25. `HEAS_DRAW_ENTRY_NOTICE` (`planEdits.ts`) now ends: "A HEAS loan doesn’t give you a Pensioner Concession Card on its own: the card needs an Age Pension of at least a cent." (pinned in `test/app-plan-edits.test.mjs`). Engine checked, unchanged: `agePension.ts` sets `pensionerConcessionCard: householdRatePerFortnight > 0`, and no HEAS figure feeds that rate, so a nil-pension month under HEAS never reads the card as held; nothing under `src/app` displays the card
- [ ] **P9-3** `DOWNSIZE` — sale, rebuy, equity release
  - [~] superseded 2026-09-25: DOWNSIZE = SELL_HOME + BUY_HOME, no composite entry
- [x] **P9-4** 24-month proceeds exemption **and its income-test deeming** — the trap — ✅ done by P14-13c (2026-09-25)
- [x] **P9-5** `DOWNSIZER_CONTRIBUTION` — $300k/person, outside caps, counts to TSB and TBC — ✅ 2026-09-25: amount (today's money, raised to the date), receivingInterestIndex (owner's own accumulation account), statedOwnedTenYears (required true; 10-year test stated, not checked). Door refuses by name: no SELL_HOME in the scenario, before the sale or > 90 days after it (exact days, stricter than a 3-month rule; ATO extension not modelled), under 55, > $300k nominal at the date (not indexed), couple total > sale price, a second per Person, a non-accumulation interest. Waterfall-funded, set-aside first (the set-aside's protected figure shrinks by what it paid); `DownsizerContributionUnfundedError` if not fundable. One cash outflow `Downsizer contribution to super, <name>` + direct balance credit; no fund tax, no cap, no deduction. TSB: no special code — `totalSuperBalance()` takes a balance and the walk holds the credit. `test/core-projection-downsizer.test.mjs`; 4 mutations red
  - ⚠️ **Stricter than the law, on purpose (LIZ, 2026-09-25):** the door refuses a SECOND contribution for the same Person. s 292-102 limits a Person to ONE SALE, not one contribution, so two contributions from the same sale inside the 90 days are lawful. The refusal errs cautious. The workaround is to state them as one entry. Lift it if it ever bites.
- [x] **P9-6** Present downsizer as a trade-off, not a windfall: exempt asset → assessable balance — ✅ 2026-09-25. A "What does this cost in Age Pension?" button beside every switched-on `DOWNSIZER_CONTRIBUTION` row (`entryForm.ts`, P14-10's on-click idiom). `src/app/downsizerAgePension.ts` walks the scenario in view with the entry and with it switched off, and says, in today's whole dollars: "Moving $X into super: $A less Age Pension in total over the plan, and $B more in super at the end." — each month's Age Pension (bereavement payment included) converted at its own month, super at the last month, "more"/"less" flipped by sign. Tests: `test/app-downsizer-age-pension.test.mjs`

---

## Phase 10 — Solver

> ✅ **THE PHASE IS UNBLOCKED FOR EVERY PLAN — P10-4 LANDED THE SAME DAY (2026-09-21).** The two
> blocks below are kept, both of them, because each was true when it was written and the sequence is
> the record: the phase was blocked outright, then unblocked for parcel-free plans behind a refusal
> by name, and is now unblocked for all of them because the mechanism both blocks name is fixed. The
> refusal (`INVESTMENTS_REFUSAL`, the `holdsInvestments` kind) is DELETED with its tests.
>
> **The measurement that closed it**, on the very harness the parcel-free re-measurement was proved
> non-vacuous against — a plan holding a $900,000 parcel on a $200,000 cost base, 1,476 samples from
> k = 0.05 to k = 3.00: **147 violations of `pointOfNoRecovery`'s downward closure before P10-4 and
> ZERO after it**, with `shortfallAge().outcome === 'never'` at zero on both sides and the two
> markers passing on exactly the same 565 samples. The largest passing level moved **k = 0.642 →
> 1.178**. (The 864 below was the same shape of failure on the earlier harness; it is kept as
> written rather than restated.) **Cost is the one figure that moved the wrong way: ~48ms warm per
> walk instead of ~40ms on the demo plan, ~91ms on a plan that sells parcels every month.**
>
> ⚠️ **SUPERSEDED, KEPT: RE-MEASURED 2026-09-21 ON PARCEL-FREE PLANS, AND THE PHASE IS UNBLOCKED FOR
> THEM ONLY.** The block below stands for every plan that holds investments outside super; the user
> ruled that such a plan is **REFUSED BY NAME** by the solver and every other plan gets an answer.
> Both the original measurements and the re-measurement are kept, because the second only narrows
> the first.
>
> **The re-measurement, on plans holding NO parcels** (eleven shapes: accumulation only,
> retirement-phase pensions, one Person and two, salaries running and stopped, with and without a
> mortgage, with and without a stated floor, `asAtDate` on and off 1 July):
>
>   * **`shortfallAge().outcome === 'never'` — 0 violations of downward-closure in ~2,500 samples**,
>     coarse (k 0.05→3.00) and fine (0.002 steps through every boundary). 0 candidate refusals in the
>     same samples: with no parcel there is no sale, so no capital gain, so the
>     `withSpouseExcess` route that threw at $127,034 is closed with it.
>   * **The harness is not vacuous.** The same sweep on a parcel-holding plan takes **864**
>     violations of `pointOfNoRecovery`, which is P10-4's mechanism, still live and still measured.
>   * **`pointOfNoRecovery` is REJECTED as the objective anyway**, parcels or no parcels: it is the
>     final-unbroken-run reading, so a plan short for twenty years that recovers in its last month
>     passes under it.
>   * ~~**P10-5 is NOT closed by the refusal and decides the answer for a whole class of plans.**~~
>     **CLOSED 2026-09-21.** On a retired couple stated as at 1 September the search converged on
>     **$19,315 and $36,724** where the same households stated as at 1 July answered **$50,318 and
>     $82,210** — **2.6× and 2.2×** understated, because the opening part-year paid no pension
>     minimum. That nil had no clause behind it in SIS Reg Sch 7 and is gone; the refusal is deleted
>     and both classes of household are answered. See P10-5.
>   * **Cost, re-measured:** 501 months, **74.8ms cold and 36.7ms warm** per `project()`. The search
>     is **18 walks, ~0.7s**, on the UI thread behind a button.
>   * **Purity holds.** Two walks of the demo plan are byte-identical over 3,374,822 bytes.
>
> ⛔ **SUPERSEDED, KEPT: THE ORIGINAL BLOCK, WHICH STOOD FOR A PLAN HOLDING INVESTMENTS OUTSIDE
> SUPER UNTIL P10-4 LANDED.** A
> read-only gate was run on this phase at `aa45329` and re-run against `ef61665`; the re-run **withdraws the objective the first gate
> recommended**. Both `shortfallAge().firstShortfall` AND `shortfallAge().pointOfNoRecovery` are
> non-monotone in the spending level, by one named mechanism, and a binary search over either
> converges confidently on a wrong number. ~~**Do not build P10-1 until P10-4 lands.**~~ **P10-4 has
> landed.** The measurements, so nobody re-walks them:
>
>   * **`firstShortfall`** — 24 inversions in 401 samples on a portfolio-funded plan. The walk
>     that names the mechanism reports an `Unfunded shortfall` of **$566.10** in a month the
>     Household holds **$18,088,555** it can reach, and the shortfall is *equal to the cent* to that
>     month's `Income tax on capital gain`.
>   * **`pointOfNoRecovery`** — the first gate found 0 violations in 880 samples and that does not
>     survive re-measurement. On one legal plan the pass set is **inverted over a $20,000 band**:
>     every spend from $90,000 to $97,800 FAILS and every spend from $98,000 to $110,000 PASSES,
>     100 contiguous samples. A bisection would return the top of its own bracket.
>   * **`contingencyFloorBreach().pointOfNoRecovery`** and terminal `accessibleAssets` took 0
>     violations in ~2,800 samples — but neither is a sustainability test. The plan above ends the
>     walk holding $13.2m of reachable money after **231 of its 501 months** carried a shortfall.
>   * **A refusal still fires mid-search.** `MixedSaptoFamilyThresholdError` is gone (`e339a7f`),
>     but `withSpouseExcess`'s `s 8(4) excess of N cents for a Person with no s 8 reduction of
>     their own` (`core/incomeTax.ts`) throws at $127,034 and $128,034 on a plan whose neighbouring
>     candidates all walk — spending drives portfolio sales, sales drive capital gains, and the gain
>     moves the family Medicare shade-in. So P10-1 needs a **stated policy for a refusing
>     candidate** whatever else it does.
>   * **Cost, re-measured:** 501 months, **77.6ms cold and 39.1ms warm** per `project()`. A 20–40
>     walk search is 0.8–1.6s on the UI thread. `app/scenarioWalks.ts`'s header still says ~14ms
>     and ADR-0002 still says microseconds; both are stale in the same direction.
>   * **Purity holds.** Two walks of the demo plan are byte-identical over 3,456,746 bytes.

- [x] **P10-4** ✅ **THE WATERFALL FUNDS THE CAPITAL GAINS TAX ITS OWN SALE CAUSES** — 2026-09-21,
  `core/projection.ts`, user ruling option (a). **This was the blocker on the whole phase and it was
  a live reading defect, not only a solver problem**: the Shortfall Age on the page was wrong, in the
  ALARMING direction, for any household whose marginal dollar comes from selling units
  - **The defect.** Limb 3 drew to NEED and `chargeCapitalGain` charged the tax as a line against the
    same running cash, so a month funded by a sale came up short by exactly its own tax however much
    the Household could reach — **$566.10 short holding $18,088,555**. The source stated the choice
    deliberately (*"the liability is a LINE against the running cash and is not grossed into the
    sale"*), so it was a specification gap and the ruling was the user's to take
  - **THE RULING: GROSS LIMB 3'S DRAW UP, so each sale is self-funding** — *"it is what a real person
    does"*. Funding the charge from the limbs BELOW limb 3 was the other reading and was rejected
  - **THE METHOD, AND IT TERMINATES.** Write `A` for what the claims hold, `tax(x)` for what the walk
    would charge on a sale of `x`, `net(x) = x − tax(x)`. **Limb 3 offers `net(A)`** rather than `A` —
    what the portfolio can DELIVER after paying for itself — so the draw `d` is one it can deliver and
    the limbs below it are offered the rest where it cannot. **The gross-up solves `net(x) = d` for
    the least `x`**: a fixed point from below (`x₀ = d`, `xₖ₊₁ = d + tax(xₖ)`, which cannot overshoot
    while `tax` is non-decreasing and exits on integer equality — two or three steps in every case
    measured), with a **bisection of `[d, A]` behind it**, bounded at **53 halvings** because the
    bracket is inside `[0, Number.MAX_SAFE_INTEGER]`. No loop is controlled by a floating-point
    comparison, so the iteration count cannot drift and the walk stays digest-stable. A parcel
    realising a LOSS can make `tax` fall as the sale grows; that is detected and the bisection takes
    over. The proof is in the module at the block headed *THE SALE FUNDS ITS OWN TAX*
  - **ONE FACT, ONE EXPRESSION.** `chargeCapitalGain` was split into `assessCapitalGainCharge` (which
    decides, against the live accumulator or a copy) and `reportCapitalGainCharge` (which writes the
    lines and the year's totals), so **the figure grossed up for is the figure charged** and there is
    no second estimate of the liability. The split shipped first, on its own commit, moving nothing:
    the demo walk was identical over 3,505,769 bytes
  - **THE CONSERVATION IDENTITY, ASSERTED IN THE ENGINE AND NOT ONLY IN A FIXTURE:** an automatic
    sale's proceeds, less the tax that sale is charged, are what the Waterfall drew — to the cent, in
    every month, on six plan shapes including one holding only a LOSS parcel. The engine throws if it
    is ever false; that throw is a **declared survivor**, measured (making it unreachable breaks zero
    tests, because the search cannot return an `x` with `net(x) < d`)
  - **THE GENUINE-SHORTFALL BOUNDARY IS TESTED, and it is the case the fix must not swallow.** A
    portfolio worth $20,872.07 hands over $18,879.37 once its 9.4c is paid, so limb 3 offers
    $18,879.37, is drawn to the last cent, the portfolio is liquidated and **$17,143.96 is genuinely
    short** — one line, not two, because the tax was funded
  - **THE 864-VIOLATION SWEEP, RE-RUN** (`7741eeb`'s harness re-stated: Dana given a $900,000 parcel
    on a $200,000 cost base, 1,476 samples from k 0.05 to 3.00, a sample counted as a violation if it
    FAILS while some larger k PASSES). **147 violations of `pointOfNoRecovery`'s downward closure
    before, ZERO after** — and the two markers, which used to disagree, now pass on exactly the same
    565 samples. The largest passing level moved **k = 0.642 → 1.178**: the phantom was understating
    that household's sustainable spending by **83%**
  - **A PLAN HOLDING NO PARCEL IS BYTE-IDENTICAL**, proved with a digest: `b4406b4a505e81e0` over
    3,433,340 bytes of the demo household with its parcel removed, before and after
  - **Demo plan: the Shortfall Age does NOT move — 2055-11 (Dana 87, Ash 95), predicted before it was
    measured.** The demo's parcel is spent by 2040 and its shortfall is a 2055 super exhaustion, so
    the fix only reorders which pool paid the tax. What DID move is the last cent: Dana's released
    super holds $125.06 more in 2055-11 and the shortfall beside it is $125.06 smaller
  - **The price, stated rather than hidden.** Selling to cover the tax realises a little more gain and
    takes the money out of a parcel compounding at `nominalReturn` rather than out of Offset cash that
    earns nothing: the `core-non-super-parcels` fixture pays **$5,956.22** of CGT instead of $5,617.80
    and ends **$7,406.78** poorer, having been short in **21 of 221 months** and now in none. **A walk
    costs ~48ms warm instead of ~40ms** on the demo plan and ~91ms on a plan that sells every month,
    because the gross-up asks the engine's own assessment what each candidate sale would be charged
  - **Nine mutations, eight killed and one equivalent**: drop the gross-up entirely (77), gross up
    against a different tax figure (24), converge one iteration early (77), offer the whole market
    value so a genuine shortfall becomes a full liquidation (73), offer a household holding nothing
    one cent (394), let the probe mutate the live accumulator (94), return the failing end of the
    bisection's bracket (13), delete the conservation throw (0 — a declared survivor, argued above).
    The ninth, dropping the `portfolioHeld > 0` guard, is an EQUIVALENT mutant and is recorded as one
    in the source: selling nil out of no claims returns nil either way
  - ⚠️ **The second shortfall sweep below the Waterfall is NARROWED, not deleted, and is now a
    declared survivor too** — renaming its line breaks zero tests. An entry-driven sale brings its own
    proceeds and is charged less than them; what could still reach the sweep is an outflow the
    Waterfall's limbs never saw, of which the year-end true-up is one
- [x] **P10-5** The opening partial financial year paid no Account-Based Pension minimum — ✅
  2026-09-21, `core/minimumDrawdown.ts` + `core/projection.ts` chunk 5b. **It had no legal basis at
  all, and that is the finding.** SIS Reg Sch 7 cl 1(2)(a)(i) works the year's minimum out on the
  balance *"on 1 July in the financial year in which the payment is made"*; **cl 3 pro-rates only
  *"the year in which the commencement day … occurs"***; and **cl 4 — the Schedule's only nil —
  turns on the commencement day, not on when a forecast opens**. A pension running since 2021 owes
  its FULL FY2026-27 minimum whatever month the plan was written in. All three re-verified against
  the ATO Legal Database on 2026-09-21
  - **The law was complete and the INPUT was missing, and they are two different problems.** A walk
    opening 1 September cannot know the 1 July balance: the day is behind it. So the plan's own
    opening balance stands in for it, through `pensionAccountBalanceObservedLater` — the single
    declared route, refused in any direction but forward and any year but that one — and the walk
    reports it as a `PensionMinimumBasisNote` in the month it was taken. **Nothing else is
    substituted**: the age and the band are still taken at the day the Schedule names, and the year
    is not pro-rated. `PensionBalanceDateError` is **narrowed, not deleted**
  - **Direction of the residual error: NOT SIGNED, and the note says so.** An account takes payments
    out and earnings in between 1 July and the day the plan opens; either can be the larger. The
    **magnitude** is bounded by the factor times that movement. What it replaced was an error of
    100%, in the direction that under-stated the household
  - **`FIRST_YEAR_REFUSAL` and the `firstYearDecides` kind are DELETED**, with their tests, and the
    identity they stood in for is asserted instead: **the same household stated on two different
    days must be told the same figure.** Measured — a retired couple answers **$53,013** at 1
    September against **$52,749** at 1 July (0.5% apart) where it was refused and would have
    converged 2.2–2.6× low; a single retired person **$45,346** against **$45,161** (0.4%)
  - **Demo plan Shortfall Age 2055-12 → 2055-11**, one month EARLIER, and the prediction was made
    before the measurement: the demo is not short in its opening months, so the fix only reorders
    funding and money leaves super sooner. **The flattering direction shows up where it should** —
    the $120,000-a-year fixture, which IS short, moves 2044-07 → **2044-08**, and the Age Pension is
    paid in **435** months instead of 432
  - **The conservation identity: the year's `Account-Based Pension minimum` lines sum to at least
    the determined minimum, and to exactly it where need is the smaller** — $26,900.00 to the cent
    on the demo plan's FY2026-27, across nine months of drawing plus June's sweep
  - **A plan stated as at 1 July is unchanged to the byte**: `de0be565…` over **1,688,326** bytes of
    the demo walk with note prose stripped, identical before and after, 503 months. The only
    difference anywhere is one sentence — `unfundedMiddleLimbs` no longer lists a reason that has
    stopped existing
  - **The surprise**: the closed limb was also forcing PARCEL SALES. The demo walk's month one sold
    $1,616.00 of units and paid **$156.75 of capital gains tax** to cover a bill its own pension
    should have paid; that tax is gone, and it is the whole of the month's change, to the cent. One
    parcel-free fixture went from **ten short months to none**
  - **Five mutations, all killed**: pro-rate the opening year as though it commenced at `asAtDate`
    (84 tests), treat `asAtDate` AS the Schedule's day with no stand-in declared (28), drop cl 3's
    day pro-rate (40), restore the nil (30), accept a stand-in in any direction or year (30)
- [x] **P10-1** Sustainable-spend binary search over `project()` — ✅ 2026-09-21,
  `core/sustainableSpend.ts`. ~~**Built inside a named refusal**: a plan holding investments outside
  super gets no figure at all (P10-4), and the message says what cannot be answered, why, and where
  it is recorded.~~ ⚠️ **THAT REFUSAL IS GONE THE SAME DAY: P10-4 landed, the defect it named does
  not exist, and `INVESTMENTS_REFUSAL`, the `holdsInvestments` kind, the `holdsInvestments` predicate
  and their tests are deleted with it. SEVEN outcome kinds now, not nine.** What replaced the
  refusal's tests is the thing it stood in for: a parcel-holding plan is answered, the answer is
  written back into the plan and walked, no month is short, and every sale in that walk hands the
  month exactly what it needed after the tax — asserted as an identity over every selling month, plus
  the phantom as a CLASS (no month anywhere is short by exactly its own capital gains tax). **The
  committed demo plan, which holds a parcel, converges on $64,889 a year against the $84,000 it
  states**, in 18 walks and ~0.9 seconds. The predicate is `shortfallAge().outcome === 'never'` — NOT one short month
  anywhere — with `pointOfNoRecovery` rejected as the final-unbroken-run reading that passes a plan
  short for twenty years. **The surprise was the second refusal**: P10-5's opening part financial
  year decided the answer for every retired household whose plan was not stated as at 1 July, and
  understated it by 2.2–2.6×, so an answer whose binding months all fell in that window was refused
  too. ⚠️ **That refusal is GONE as of 2026-09-21** — P10-5 landed, the defect it named does not
  exist, and `FIRST_YEAR_REFUSAL`, the `firstYearDecides` kind and their tests are deleted with it.
  **EIGHT** outcome kinds now, each with its own sentence. 18 walks, ~0.7s
  - Settled in advance and not to be re-opened: a plan holding several `SPEND_CHANGE` entries is
    scaled by **a single factor k on each `annualSpend`**, preserving the shape of the plan;
    flattening to one level is refused (ADR-0004). `annualSpend` is a REAL figure, so **k scales the
    STATED figure and indexation applies on top** — scaling the indexed figure would compound
  - The knob is not a field: synthesise a new `readonly Entry[]` per candidate from the ACTIVE
    Scenario's resolved list (`app/scenarioWalks.ts`), never from `plan.entries`
  - `monthlySpendFromAnnual`'s `Math.ceil(annual / 12)` quantises anything finer than ~$12/yr —
    never converge tighter than the engine can express
  - Mortgage repayment is **excluded** from `annualSpend`, so a converged figure is not total
    outgoings and whatever states it must say so
  - **The stated policy for a refusing candidate**, which the gate said P10-1 owed whatever else it
    did: the engine's own words are carried out as `'candidateRefused'` and no figure is stated. No
    parcel-free candidate in ~2,500 samples reached one, so it is tested through an injected
    projector rather than left as an unexercised branch
- [x] **P10-2** Respect the contingency floor at every month, not just at the horizon — ✅
  2026-09-21. `contingencyFloorBreach` already read every month; the work was the pass predicate and
  **what a plan stating NO floor does**. Ruled: absence is judged on the shortfall alone, and the
  answer carries `floorApplied` so the headline says which of the two happened — neither a silent
  pass nor a silent fail. ⚠️ **The first cut merged the floor's failing months with the shortfall's
  and refused three fixtures under P10-5 that deserved an answer**: a household whose reachable money
  is under its own buffer in month one had not been caught by the pension-minimum defect, it had set
  a buffer it does not hold. The two limbs are still kept apart — P10-5's refusal is gone but
  `limitedBy` still has to say which one bound the answer, so the page does not describe a broken
  buffer as a month that could not be paid for
- [x] **P10-3** Show the converged spend with its Shortfall Age — ✅ 2026-09-21,
  `app/sustainableSpendHeadline.ts`, mounted from `main.ts` behind a **button** (the search is ~0.7s
  on the UI thread, so it runs when it is asked for, and the answer is cleared on every redraw —
  a figure worked out from a plan that has since been edited is a confident answer about a plan
  nobody is looking at). Nine cases, not the five the brief listed: the four extra are the answer
  being above the searched range, the P10-5 refusal, the P10-4 refusal, and the canary for a
  spending level this module read differently from the walk that spent it. ⚠️ **SEVEN since
  2026-09-21**: P10-5 and then P10-4 landed, and each case is deleted rather than left standing over
  a defect that no longer exists

---

## Phase 11 — Spending history

*Separable from the engine; can run in parallel from Phase 2 onward.*

- [ ] **P11-1** Transaction store, append-only, separate from the plan file
  - **Gate 2026-09-28: GO after decisions** (`docs/research/phase11-gate-2026-09-28.md`). Slice 1 (ledger type + append-only guard) needs no input. Four user decisions: CSV mapping persistence, re-import overlap handling (review it, never auto-drop), bulk-review granularity, and the baseline recompute trigger.
  - **Slice 1 BUILT 2026-09-28: the ledger core, no UI.** `src/core/ledger.ts` — `Transaction`, `Categorisation`, the branded `Ledger` (P3-41 private-member witness; `test/brand-spread-sweep.test.mjs` now 16 brands), the `parseLedger` door (version 1, absent → empty Ledger) and `appended`; `src/app/ledgerStore.ts` — `loadLedger`/`saveLedger`/`appendToLedger` over an injected transport, the writer refusing any candidate that is not the last-loaded Ledger plus records after it (`LedgerNotAnExtensionError`, before the transport). Seven refusals, register §11.2. **Append-only is NOT chronological:** a back-dated Transaction is legal — the gate doc's slice-1 "must fail if a day before the last entry is accepted" is superseded. **A Category is a separate appended `Categorisation`, not a Transaction field** (the last one naming a Transaction wins), so categorising never edits in place. `amount` is signed Cents, money OUT negative. A `reverses` must name an EARLIER, not-yet-reversed Transaction and cancel it to the cent. Nothing in `src/` imports the store yet, and nothing in the projection reads the Ledger (P11-10). `test/core-ledger.test.mjs`. ~~⚠️ Slice 2 decision due~~ **Decided and wired 2026-09-28 (slice 2, see P11-3).** `main.ts` now imports `writeLedger` and hands `{ readLedger, writeLedger }` to the Transactions panel, which tripped `test/import-graph.test.mjs`'s Reset tripwire as designed; Reset was EXTENDED and the tripwire now pins exactly the new wiring. **USER RULING (2026-09-28), Reset:** "Start again" asks separately **"Also delete my transaction history?"**, default **No**. No → the Ledger is untouched (bytes identical, never written). Yes → once the new plan has LANDED, the Ledger is replaced with the empty Ledger by `ledgerStore.replaceWithEmptyLedger` — the one sanctioned non-extension write, a distinct named function so `requireExtension` stays strict on every other write. A plan the door refuses leaves the Ledger alone either way, and the question is not asked at all over a Ledger that did not load
  - [x] **P11-1a** `ledger.json` — a **separate file** from `plan.json`, with its own sensitivity.
    A plan can be handed to an adviser; a ledger is a record of everything the household bought.
    Separate files make that a copy decision rather than a redaction problem
  - [x] **P11-1b** **No SQLite.** JSON wins on diffability, and auditability is the governing
    constraint (ADR-0004); every documented read is a whole-set read (ADR-0002); and the export
    shape is a security control that must stay assertable (ADR-0006:83-85). See ADR-0008
  - [ ] **P11-1c** SQLite is deferred to Phase 11 behind a **written trigger**: >250,000
    transactions, **or** a full ledger write measured above 250ms. Measured, not felt. The trigger
    is expected never to fire; if it does, it is evidence, and the argument gets reopened
- [x] **P11-2** CSV import with column mapping (bank formats differ)
  - **Decided by LIZ 2026-09-28:** Start again's delete also removes the saved bank formats (they live in `ledger.json`), and the question now says so: "(and the saved bank formats)". The account label is required on import, since it's part of the duplicate key. A blank line mid-file is listed, not skipped. Verified: 3131 green; LIZ mutation (manual entries counted as already imported) red.
  - **USER RULINGS 2026-09-28.** (1) A column mapping is remembered per bank CSV format, keyed by the header row (exact column names, order-independent): a known header re-uses the saved mapping with no questions, an unknown one asks once. Headerless exports (CommBank) are keyed by column count + a user-given format name. Mappings live in `ledger.json`, append-only: a changed mapping is a new record, last wins. (2) Rows already imported are skipped by MULTISET on (date, cents, raw description, account): k copies in the file over j imported copies held adds max(0, k − j); the page says "N added, M skipped as already imported". (3) Nothing is silently dropped: an unreadable row is listed with its line number and reason, and nothing is appended until "Import the N good rows" (or Cancel).
  - **BUILT 2026-09-28 (P11 slice 3).** `src/app/csv.ts` (a small parser: quoted fields, embedded commas/quotes/line breaks, CRLF/LF/CR, BOM, trailing blank lines dropped; an interior blank line is kept and listed; an unclosed quote refuses the whole file as `CsvSyntaxError`). `src/app/csvImport.ts` (the pure rules: `savedMappingFor` by sorted names, `savedHeaderlessFormats`, calendar-checked `parseDate` for DD/MM/YYYY (default and tie-break) / MM/DD/YYYY / YYYY-MM-DD / D MMM YYYY, `detectDateFormat`, `parseAmount` — ≤2 decimals, `$`, thousands, brackets, never rounded — `readRows`, `notYetImported`). `src/core/ledger.ts` gains `ImportMapping` under the optional top-level `importMappings` (written only once one exists, so earlier files round-trip to their own bytes; version stays 1; an older build refuses such a file by name rather than dropping the key), `LedgerImportMappingError`, and `requireExtension` over the third list. Columns are referred to BY NAME in every mapping; a headerless file's are "Column 1" …. **Headerless handling:** a first row holding a date and an amount is taken for data (the user can tick "the first row holds column names" to say otherwise); one saved headerless format of that width is used with no questions, several are offered by name, none asks for the mapping and a format name. The Transactions panel's import section: file input (read in the browser; written only to `/api/ledger`), mapping form guessed from column names (or first-row contents), live preview of the first 5 rows, bad-row list, account label (saved in the mapping, offered next time; changing it appends a new mapping). Rows and any new mapping are ONE append/write; a re-import with nothing new writes nothing. `test/app-csv-import.test.mjs` + mapping door tests in `test/core-ledger.test.mjs`; register §11.3; CONTEXT.md §Import Mapping. Mutations red: dedupe by set; a bad-date row silently dropped; mapping keyed by column order. The rendered page has not been seen. Start again's "delete my transaction history" also deletes saved mappings (they live in the same file)
- [x] **P11-3** Manual entry for cash and corrections
  - **Decided by LIZ 2026-09-28 (precedent, not escalated):** (1) an unreadable ledger cannot be wiped from the app, Reset included; the user fixes or removes `ledger.json` by hand (the conservative failure mode). (2) Amount boxes accept cents and the list shows whole dollars (the whole-dollars UI rule: storage stays exact). (3) A reversal carries the ORIGINAL's date, because it corrects a mistake; a later refund is a new money-in transaction, not a reversal. Verified: 3106 green; LIZ mutation (Reset ignores No) red; server serves the panel and `/api/ledger`. The rendered page has not been seen, so the user checks it in the browser.
  - **BUILT 2026-09-28 (P11-1 slice 2).** `src/app/transactionsPanel.ts`, mounted last in `main.ts` into `#transactions-panel` (collapsed `<details>`, the last panel on the page, below the chat settings and the comparison template; summary "Transactions (N recorded)"). Loads `ledger.json` through the door at startup (absent → empty). **A load refusal is shown in the panel, the panel is switched off, and the file is never written** — no form, no buttons, and Start again does not ask about it; the rest of the page is unaffected. One form: date, a money-out / money-in choice (default money out; the sign is never typed), amount in dollars (cents accepted, shown in whole dollars), description, account label. List newest-APPENDED first: date, description, whole-dollar amount with "out"/"in", category. Per row: **Reverse…** (arms a confirm; appends the exact negation dated as the original, `reverses` set; not offered on a reversed row or on a reversal, and a stale confirm is refused in plain words with nothing written) and a **category picker** (Committed / Discretionary / One-off + optional subcategory) that appends a `Categorisation`. **No edit, no delete, anywhere.** Nothing in the projection reads the Ledger (golden unchanged). `test/app-transactions-panel.test.mjs`. P11-4/P11-5 are reachable by hand from the picker but their rule/bulk work (P11-6) is not started
- [x] **P11-4** Fixed top-level categories: Committed / Discretionary / One-off (+ Other, slice 5: not spending)
  - **BUILT 2026-09-28 (P11-1 slices 1–2).** `CATEGORIES` in `src/core/ledger.ts`; the door refuses any other by name (`LedgerCategorisationError`); the per-row picker and the rule form offer exactly the three.
- [x] **P11-5** User-defined subcategories
  - **BUILT 2026-09-28 (P11 slice 4).** Free text under each Category, no separate store: `subcategoriesInUse` (`src/app/categorisationRules.ts`) gathers those already used by a Categorisation or a live rule, and the panel offers them back through one `<datalist>` per Category, followed by whichever Category is chosen (row picker and rule form).
- [x] **P11-6** Categorisation rules that **suggest**; bulk review before commit (ADR-0004)
  - **BUILT 2026-09-28 (P11 slice 4).** A rule = case-insensitive piece of the raw description, optionally one account label → Category + optional subcategory. Stored as the optional `categorisationRules` list in `ledger.json` (version still 1; a ledger without rules round-trips to its own bytes; an older build refuses the key by name); appended, last record per (text, case ignored; account) wins, retiring = a `retired: true` record. **User ruling 2026-09-28: WHOLE-BATCH review** — one card per rule, "N transactions match "WOOLWORTHS" → Committed / Groceries", **Accept all** appends one Categorisation per member carrying `ruleId`; **Reject** writes nothing and sets the card aside for this page load only (re-offered after reload or when its members change; retire the rule to stop it). A Categorisation with no `ruleId` was chosen by hand, and a Transaction whose current one is hand-made is in no batch. Two rules matching one Transaction: the most recently saved gets it; both cards say so. An import only offers. `src/app/categorisationRules.ts` (pure), panel in `transactionsPanel.ts`, `test/app-categorisation-rules.test.mjs`. **Deferred:** per-row unticking within a batch (user ruling); a stored "rejected" record (would make Reject write).
- [x] **P11-7** Derived Baseline from trailing 12 months
  - ✅ **DEFECT FIXED 2026-09-28 (reported by the user the same day: "From your transactions 2025-09 to 2026-08, your household spent about $240 a year").** Measured on the real data: 34 transactions dated 2026-08-30..2026-09-28 (31 in September), asAtDate 2026-09-25. **Two causes.** (1) The window was the 12 whole calendar months BEFORE asAtDate's month (2025-09..2026-08), so all 31 September rows were ignored and the headline named a year the Ledger barely touched. (2) What was left (the two August outflows, $19.98) was scaled by "months holding transactions" (1) × 12, so two days of data counted as a whole month → $240. **Fix (the class):** the window is by DATE — it ends on the latest date of any non-cancelled transaction and starts on the earliest or 364 days before the end, whichever is later (at most 365 days, both ends counted); every transaction in it counts, including ones after asAtDate. A window under 365 days is scaled by 365/days, and the headline says so ("From 30 Aug 2026 to 28 Sep 2026 (30 days, scaled to a year), …"); under 28 days is no offer ("not enough history …; import at least a month"). A month at or after asAtDate's is taken as recorded, never deflated. `monthsWithTransactions` is gone; `window` is `{ from, to, days }`. On the real ledger the figure is now $17,679 a year (30 days, $1,453.08 counted). Tests: the user's shape, a >1-year ledger's exact 365 days, the 27/28-day floor, a later month not deflated; the 12-month fixture re-derived by hand ($18,436.95 → $18,514.72: 'before' drops out, September's $77.77 comes in at k = 0). Mutations red: calendar window restored, month-count scaling restored, the floor removed.
  - **LIZ ruling 2026-09-28 (conservative failure mode):** a short history is scaled up to a year, and the page says so. An unscaled figure is too low and flatters every later year. The breakdown lines stay as recorded. ~~×12/months holding transactions~~ — **CORRECTED 2026-09-28: that scaling was the second cause of the defect above** (a month with two days of data counted as a whole month); it is now 365/days covered, with a 28-day floor. DEV's hand-worked $18,436.95 (re-derived by LIZ) was for the old calendar window; the same fixture is now $18,514.72.
  - **User ruling 2026-09-28 (trigger):** the baseline is worked out ONLY when the user clicks a button, never automatically after an import, and it enters the plan only on Accept (P11-10).
  - **BUILT 2026-09-28 (slice 5).** Gate and binding rulings: docs/research/p11-slice5-baseline-gate-2026-09-28.md. Pure `deriveBaseline(ledger, asAtDate, cpi)` in `src/app/derivedBaseline.ts` (the Ledger stays out of `core/`'s projection). ~~Window: the 12 whole calendar months before `asAtDate`'s month~~ (the first cause of the defect above; now the Ledger's last 365 days by date). Latest Categorisation wins; a reversal pair is dropped wherever it is dated; refunds net against their category; **uncategorised money OUT is counted and named, uncategorised money IN is left out and named** (an unlabelled inflow is more often income than a refund; netting it would understate spend). Figure = Committed + Discretionary + uncategorised out, whole dollars. A window with no transactions (or nothing counting as spending) → no offer and a sentence. **A fourth fixed category `Other`** (user ruling) marks not-spending — transfers, card repayments, mortgage payments, income, investment purchases; picker label "Other (not spending: left out of the spending figure)"; rules can suggest it; old ledgers byte-identical. ~~Open: fewer than 12 months with transactions is shown with a "likely too low" sentence but not scaled.~~ (Superseded: scaled by 365/days, above.)
- [x] **P11-8** ⚠️ Inflate history from past nominal dollars to today's before it becomes a Setting
  - **BUILT 2026-09-28 (slice 5).** Each month's net per line is raised by `inflateStated(net, cpi, historicalMonth, asAtDate)` — the price level pointed backwards, (1 + cpi)^(k/12) for k months back — at the plan's own `economicSeries.cpi` (a forecast rate applied to the past, said on screen).
- [x] **P11-9** Exclude One-off items from the recurring baseline ~~; re-add as amortised lines~~
  - **User ruling 2026-09-28:** One-offs are excluded and their 12-month total is shown beside the offer; nothing is amortised automatically — the user adds `ONE_OFF_EXPENSE` entries if they want them. BUILT (slice 5). The Other total is shown beside it too, to catch a misfiled real purchase.
- [x] **P11-10** Offer the baseline for acceptance — never silently bind
  - **BUILT 2026-09-28 (slice 5).** Transactions panel: "Work out my spending from transactions" is the only trigger; any Ledger write withdraws a shown offer. "Use this as my spending from today" appends ONE household `SPEND_CHANGE` dated `asAtDate` to the active Scenario via `planWithEntry` → the page's ordinary `save` (`parsePlan` + `savePlan`), after re-deriving at the click and refusing if the Ledger or plan changed; later-dated `SPEND_CHANGE`s stand. Cancel writes nothing. Nothing in the projection reads the Ledger (golden unchanged). `test/app-derived-baseline.test.mjs`. Note: an existing `SPEND_CHANGE` dated later in `asAtDate`'s own MONTH is superseded in that month by the accepted one (both in month 0's bucket, the appended one last).
- [x] **P11-11** Show provenance: which transactions, which window, which rule
  - **BUILT 2026-09-28 (slice 5).** The offer states the window, a per-line count and total (Committed, Discretionary, uncategorised out, One-off, Other, uncategorised in), and a "Show which transactions" disclosure listing each counted Transaction with its Category and "(by hand)" or "(by the rule …)". The accepted entry's note records the count and window.

---

## Phase 12 — Survivorship

- [x] **P12-1** `DEATH` entry — survivor moves to single rates, thresholds, deeming. The user's ruling
  "option A": the deceased's super comes to the survivor as ONE tax-free lump sum — ✅ **2026-09-24,
  five microtasks**
  - [x] **P12-1a Rule — 2026-09-24.** `core/bereavement.ts`: the lump sum bereavement payment, SS Guide
    3.1.5.70's 6 × (CCR − NR) + NDEP × (CCR − NR) / 14, nil where the single rate is not less.
    NDEP (days to the end of the entitlement period) needs a payday calendar the walk does not have,
    so it takes its least value, 1: never overstated. Records `agePension.bereavement.*`, register
    §4.11. A couple on the full rate at 20 Sep 2026 ($1,866.00) and a survivor on the full single
    rate ($1,237.70) give $3,814.67 (`test/core-death.test.mjs`)
  - [x] **P12-1b Entry and walk — 2026-09-24.** `DeathParams = NoParams`, owned by the Person who
    dies; the door refuses `household` and a Household of one. `deathOf` resolves it once per walk
    and refuses by name a second death, a death before the forecast, a death beside an
    `ILLNESS_SEPARATION`, and any entry reaching the deceased dated in or after the death's month
    (theirs, a `household`-owned one reaching both, or a `SPOUSE_CONTRIBUTION`). From the first of
    the death's month, one `deceasedNow` index: the super is cashed as ONE tax-free lump sum
    (`SUPER_DEATH_BENEFIT_LINE`, the balances zeroed at the same statement, the cash counted by the
    means test until the line lands); parcels move to the survivor at their own cost base and date
    (Div 128; a pre-1985 parcel at market value, re-acquired on the DEATH entry's day); salary,
    Guarantee, sacrifice and pension payments stop; the survivor is means-tested alone, at single
    rates; cash interest is all theirs; the bereavement payment is paid where both were pensioners
    (`AGE_PENSION_BEREAVEMENT_LINE`). Spending is unchanged: a household spending less states a
    `SPEND_CHANGE` — a stated choice. Income tax: single from the financial year AFTER the death (the
    year of the death is P12-1c). Offered on the form with no box. Unspecified 7 → 6, constructible
    15 → 16, offered 14 → 15, README with them; the `acquired` pin gains the pre-CGT line
  - [x] **P12-1c Tax in the year of the death — 2026-09-24: a couple's, SAPTO included (register §8
    O91); single from the next 1 July.** The Medicare levy half is sourced (a spouse who died during
    the year still counts for the family reduction). The SAPTO half is the named limit: the ATO's
    code table would give a widowed survivor code A unless D applies with the spouse under $12,494
    (a FY2024-25 figure); over a grid the couple's offset is never MORE than the code table's, so tax
    is overstated, the cautious direction. The accrual after the death carries the deceased's
    year-to-date SAPTO qualification, the true-up's own basis. **Refused by name:** a death with the
    super income yield Setting stated while the deceased holds a non-pension balance — its part-year
    fund earnings tax would go uncharged. Two `whatCanYouModel` limits: this one, and the
    bereavement payment's NDEP bound
  - [x] **P12-1d Display — 2026-09-24: no age for a Person who has died.** `Month.died` (indexes,
    OMITTED while nobody has — `mortgageBalance`'s widening, so no walk moves; the keyof pin moved).
    `agesAt` now takes the `Month`, not its name, so no caller can ask for ages without it; the
    compiler found the four that could (the income and sustainable-spend headlines, the mortgage
    target marker, the chat's `anonymousAges`). `AgeAtMonth.ages` holds the living only, with
    `died` beside it; the chat labels each age by its own Person (`agedPersonIndexes`), so the
    survivor stays Person B. The chart's age axis keeps each Person's line under its title and
    prints `died` instead of an age, `AGE_NOT_YET_BORN`'s own device
  - [x] **P12-1e Byte-identity — 2026-09-24.** With no `DEATH`, or one switched off, the demo walk's
    digest is unchanged (`72bfb895…`), and so is the connector fixture's (`a250af6a…`, pinned in the
    two chat tests); switched on, the demo walk moves. Mutation battery, 21 mutations in an isolated
    copy, every one red: couple rates, the lump sum missing / doubled / paid with the balance kept /
    seen twice by the means test / taxed two ways, the salary continuing, the bereavement payment
    missing / doubled / paid twice, an entry after the death accepted, the death a month early and
    a month late, parcels lost / stepped up, tax never single / single a year early, the cash in
    transit missed, `Month.died` dropped, the earnings-tax refusal dropped
- [~] **P12-2** (not needed: the user confirmed 2026-09-26 that a death pays out as a lump sum, with no reversionary nomination, which is option A as already built) Reversionary pension: 12-month TBC credit deferral at date-of-death value
- [~] **P12-3** Death benefit tax: tax-free to spouse; 15%/30% to non-dependant adult children — dropped 2026-09-25 by the user — tax on death benefits to adult children is not to be modelled.
- [x] **P12-4** `ILLNESS_SEPARATION` — single rate, combined means tests — ✅ **2026-09-24, four microtasks**
  - [x] **P12-4a Rules — 2026-09-24.** `agePensionEntitlement` has a third path behind
    `illnessSeparated`: the single maximum rate for each Person (`personsAtThatRate: 2`), against the
    COUPLE free areas, deeming threshold and combined means. The cut-offs reproduce the register's
    published illness-separated figures ($5,346.80 a fortnight, $1,324,500 homeowner). Fixture: a
    $700,000 homeowner couple on 20 Sep 2026 gets $631.50 each as a couple, $936.20 each
    illness-separated, and $136.70 as a single (`test/core-age-pension.test.mjs`)
  - [x] **P12-4b Entry — 2026-09-24.** `IllnessSeparationParams = NoParams`; a whole-file door
    check refuses one for a Household of one Person. A `level` in the walk, carried as a plain `let`
    (`SPEND_CHANGE`'s idiom, `owner` ignored on its ruling), in force from the entry's own month for
    the rest of the walk — no entry ends one. Offered on the form (no params box) with a row that
    says what changes and what does not. Unspecified 8 → 7; offered 13 → 14; README moved with them
    (`test/core-illness-separation.test.mjs`)
  - [x] **P12-4c Scope limit — 2026-09-24: tax still treats the pair as a COUPLE, SAPTO included
    (register §8 O90).** The separated SAPTO figures are sourced (§2.3, §2.4), but how a year the
    separation starts part way through is assessed is not (O16), so the walk gives no year the
    separated amounts. Couple $1,602 each against $2,040 separated: tax is OVERSTATED, the cautious
    direction, asserted over a grid. A mid-year separation is not refused. Listed in
    `whatCanYouModel`'s hand-kept limits
  - [x] **P12-4d Byte-identity — 2026-09-24.** With no `ILLNESS_SEPARATION`, or one switched off,
    the demo walk's digest is unchanged (`72bfb895…`), and so is the connector fixture's
    (`a250af6a…`); switched on, the demo walk moves, so the equality is not vacuous

---

## Phase 13 — Verification gates

- [x] **P13-1** Baseline vs ASIC Moneysmart retirement planner — ✅ **Ticked 2026-09-23 in the
  reconciliation pass: done as P4-7, CLOSED 2026-09-21 after four runs**
  (`docs/moneysmart-run4-2026-09-21.md`). Three of the four checks passed. On the fourth,
  Moneysmart turned out to be unable to judge it, so it counts as neither a pass nor a fail. It was
  run on the demo plan's shape, plus a portfolio in run 2, rather than on a P2-8 fixture, which still
  does not exist.
- [x] **P13-1b** Baseline vs Aware Super's public Retirement Calculator, run 2026-09-24 on the user's own single-person figures. The write-up is outside the repo: `~/.enough/verification/P13-1b-aware-comparison.md`.
  - ✅ **Super at retirement:** $1,004,984 vs Aware's $1,008,589 (−0.4%). On Aware's wage deflator it's $786,417 vs $786,852 (−0.1%). Explained: fee cap and day-count rounding.
  - ✅ **The deflator difference is by design:** `enough` deflates by CPI and Aware deflates accumulation by wages, a +8.1% presentation difference.
  - ⚠️ **OPEN, and the gap FLATTERS:** sustainable spend is $69,213 in 2026 dollars vs Aware's $58,704, **+17.9%**, and not decomposed.
    - Candidates: Aware's income target may be indexed to wages (3.7%) where `enough` holds CPI (2.5%); the objective differs (a constant real income to 95 vs the Shortfall Age); Age Pension indexation; the insurance premium (not modelled, $292 a year).
    - **Decomposed 2026-09-24,** one change at a time, in the private doc:
      - **Age Pension rate indexation, −$9,661 (92% of the gap).** `enough` grows the maximum rate with wages, as the law's earnings benchmark does, and as Aware's own PDF says it does. Aware's RESULT behaves as if the rate grew with CPI. So it's a cross-calculator disagreement, not a found defect.
      - **The exact fee, +$502.**
      - **Insurance, −$247.**
      - **Residual after these:** +$1,103 (+1.9%).
    - **Status:** no `enough` defect was found. But the figure the user sees depends on 33 years of wage-vs-CPI pension compounding, so the sustainable-spend headline should say it assumes the pension keeps pace with wages. Left open until that caveat ships.
    - ✅ **Caveat shipped 2026-09-24** (@7791b16, @ebc340c). The headline says the pension is assumed to rise with wages wherever the walk pays it, OR the quoted level is higher and anyone reaches pension age within the horizon (the cautious error).
- [x] **P13-1c** Baseline vs Aware Super's logged-in "My Retirement Planner" Statement of Advice (a couple, both retiring at 67),
  run 2026-09-24. The write-up is outside the repo: `~/.enough/verification/P13-1c-aware-soa-comparison.md`. **PASS:** the balance at 67 is
  +0.5% (nominal) and the sustainable real income to 95 is +2.5%, both measured on Aware's own mixed wage/CPI convention. The decomposition covers
  lifecycle returns, the fee schedule and the economic series. The remaining residual is in the flattering direction and is
  partly explained by the unmodelled insurance admin fee ($22.20/yr). Found along the way: the before-tax pay box was easy to fill with
  take-home pay. The label is fixed @b3ef36d.
- [ ] **P13-2** TTR arithmetic vs the fund's own TTR calculator
- [x] **P13-3** One hand-worked Age Pension figure vs Services Australia — ✅ 2026-09-24, and it found a defect.
  - **Runs 2 and 3 (Payment Finder, 20 Sep 2026 rates, the balance in Managed Investments because the finder has no super box):**
    $608,054 gave $769.50/fn each (enough had $769.42), and $609,900 gave $767.25 (it tells a $500 floor from a $250 or $1,000 one).
    **Cause: SSA 1991 point 1064-G7** disregards any part of a person's assets excess that isn't a multiple of $250, which works out
    as the combined excess floored to $500 for a couple. enough tapered the exact excess, understating the pension by up to $0.75/fn
    each. Fixed as register trap T135. Both runs are pinned to the cent in test/core-age-pension.test.mjs. The golden file and
    10 hand-worked tests were re-derived with their mechanism, and 2 were rewritten because the continuous-taper premise was false.
  - **Run 1, 2026-09-24 — INCONCLUSIVE.** Case: "R@63" at Dec 2039, deflated to 2026 $, with both people set to 67 (sheet and figures in
    `~/.enough/verification/`, outside the repo). Payment Finder returned the full couple rate ($933.00/fn each), meaning it
    counted neither assets nor deemed income. `enough` and a hand check from the published 20 Sep 2026 rates agree to the cent
    on an assets-test-reduced rate. The results page doesn't echo its inputs, so it can't show whether the super balances
    were counted. Next: screenshots of the input pages via "Estimate again".
- [x] **P13-4** Golden-file regression tests on the demo couple — ✅ 2026-09-24
  (`fixtures/golden/demo-couple.golden.json`, `scripts/golden-update.mjs`,
  `test/golden-demo-couple.test.mjs`). One row per financial year (47 years, 557 months,
  2026-09 to 2073-01), whole nominal cents, never rounded: per Person, salary/tax/super-drawn
  (a new per-Person breakdown, cross-checked to sum to `financialYearSummaries()`'s pooled
  household totals before the script will write a byte); household spending, mortgage
  balance/repayments, offset/cash, super balance, investments, total wealth, shortfall (read
  straight off `app/chat/tools/financialYearSummary.ts` and `Month`'s own fields, no new sum);
  plus the shortfall/payoff/retirement markers off `core/outcomes.ts`. Sustainable spend is NOT
  in it — `sustainableSpend.ts`'s solver re-runs `project()` ~20 times to converge, so it is a
  search and not a pure read of the one walk this file pins.
  Gate passed first: byte-identical output under `TZ=UTC` vs `TZ=Australia/Sydney` and under two
  faked system clocks a year apart (the same child-process technique
  `test/core-projection.test.mjs` uses), and a clean run to the horizon with no refusal.
  Mutation-checked non-vacuously, each restored from a scratchpad copy and reverted before the
  next: the fixture's `cpi` 0.025→0.026 (286 figures moved), the couple homeowner assets-test
  free area nudged by $1 in `src/data/assumptions/agePension.ts` (116 moved), the retire date
  moved a month (241 moved) — all three turned the test red with a readable `FY / line / old /
  new` message, first 10 shown.
  - [x] **P13-4a** ~~The golden baseline stays **zero non-super** (P2-8b). Landing P3-20 must not
    move a single golden figure — if it does, the pool is not defaulting to empty and P3-20e is
    unmet.~~ **SUPERSEDED, 2026-09-24 (the premise was already gone before this box was
    written — the demo couple carries a mortgage and a $10,000 offset, never zero non-super).**
    The demo couple **IS** the golden baseline, exactly as it ships: a mortgage, an offset, and
    (per P13-4's per-Person breakdown) no non-super investment parcels for either Person
    (`investmentsCents` is `0` in every golden row). Landing **P3-20** (a first-class non-super
    pool) must move **no** golden figure while the fixture states no parcels — if it does, the
    pool is not defaulting to empty and P3-20e is unmet; the day a fixture is given a parcel it
    stops being able to make that claim, and belongs in its own scenario. Bridge and CGT coverage
    goes in its own golden file against its own fixture (P13-7), so a change to one is never read
    as a regression in the other.
- [x] **P13-5** Mutation check — confirm tests fail when caps, tapers and the COR boolean are broken — ✅ 2026-09-25 ([checkpoint](docs/research/p13-5-sweep-checkpoint.md)). 135 rows swept, 132 kills, 2 survivors both closed by pinning tests (T129 @dc380d2; T36 couple-age in `test/core-projection-heas.test.mjs`), 1 artefact (the `maximumLoanAvailable` nil floor, a no-op).
  - **Planned 2026-09-24** (`docs/research/p13-5-sweep-plan.md`). Register §9 has **217** rows, not ~70. 63 were already applied and
    recorded, and 27 (T87-T113) are out of scope by ruling R1, leaving ~137. Many are already automated, including the SAPTO FY2027-28 case
    (test/assumptions-tax.test.mjs:438) and T135. There are no stale rows. The plan has 14 chunks of ~10 rows (~20 min each, ~5 h in all), each with a checkpoint file.
    Run first: three super rows with no confirmed test of their own (net-investment-loss silos, contributions tax wired to marginal, cap by one step).
  - [x] **P13-5a** ✅ 2026-09-25 — swept in full under P13-5 above. Use the ~70 mutations already written up in register §9, each naming its trap and the fixture that must fail. The SAPTO `0.15` case needs a test running **past 1 Jul 2027** — it cannot fail inside FY2026-27
- [x] **P13-9** **README's factual claims are canaried — ✅ 2026-09-20 (`test/readme-claims.test.mjs`).
  Added out of order because the drift it catches had already happened.** The register stayed
  accurate through a fortnight of daily change because a stale row fails a test; README drifted for
  exactly the opposite reason. At the 2026-09-20 audit it said *"all five entry types this build can
  honour"* and named five of the **seven** offered, *"the other fourteen … are refused at the door"*
  when **twelve** are, and that the app *"cannot create a second [Scenario] to compare"* four
  commits after the comparison chart shipped. All three are COUNTS or NAMES, which is exactly what a
  test can hold.
  - **PINNED: only claims with a computable truth value.** The offered-type count and every offered
    type's name, both derived from `OFFERED_ENTRY_TYPES`; the refused count from
    `UNSPECIFIED_ENTRY_TYPES`; and that the ADR index links every file in `docs/adr/` and no file
    that is not there (which is how ADR-0010 — cited in README's body and missing from its list
    since 2026-09-04 — was found).
  - **NOT PINNED, deliberately: prose.** The status paragraph, the feature descriptions and the
    limits section legitimately vary in wording, and a test that pins wording is a test somebody
    deletes the first time they improve a sentence. The limits are canaried where they are
    authoritative — register §8 — and README **points at** §8 instead of copying it, so the two
    cannot disagree.
  - **IT RATCHETS BOTH WAYS**, proved: restoring the pre-audit README fails **4**; putting
    `SPEND_CHANGE` into `ENTRY_TYPES_NOT_YET_WALKED` so the offered count falls to six, with README
    untouched, fails **1**.
  - **THE SAME AUDIT FOUND ONE FALSE CLAIM OUTSIDE README, in three places, and it is the
    Waterfall's length.** `CONTEXT.md`'s *Income Waterfall* and *Offset Account* entries and
    `concept.md`'s two copies of *"Offset is last"* all describe a FOUR-limb Waterfall; limb five,
    released superannuation, was added on 2026-09-19 (`1eefd9c`) and is drawn after the Offset. All
    four are struck in place, never deleted, and the design REASON is kept because it is still the
    reason the Offset comes after everything reachable before a Condition of Release. **Nothing
    canaries these two files' claims about the engine** — a `WATERFALL_LIMBS`-length canary over
    `CONTEXT.md` is the obvious next one and is not built.
    **BUILT 2026-09-24** (`test/waterfall-doc-claims.test.mjs`, @63a6893/@e746c35). It found four live spots still saying "fifth
    limb" after WATERFALL_LIMBS grew to seven, and one live "four-limb". All fixed. The test also rejects any live stale count.
- [ ] **P13-6** Only after all of the above: enter real figures
  - ⚠️ **Overtaken, recorded 2026-09-23:** real figures have been in use
    since about 2026-09-21, before P13-2 to P13-8 were done. The gate order was not followed. Until
    the remaining checks land, treat answers from a real plan as unverified in those areas: TTR
    against the fund, the Age Pension against Services Australia, CGT, and franking.
- [x] **P13-7** ✅ **2026-09-24 — independent reconciliation done.** Working committed BEFORE the
  test existed: `docs/verification/P13-7-cgt.md` (commit `f45ae66`), then
  `test/verification-p13-7-cgt.test.mjs`. A single person, salary $41,600/yr, one parcel held since
  2024 sold whole for $50,000 (cost base $20,000) on 2026-11-20 — the 50% discount, taxable income,
  LITO and the Medicare levy, all hand-worked from register §2.1/§2.2/§2.7. **First pass disagreed
  by $115.00** ($4,634.00 hand vs $4,519.00 engine) — the working had omitted the ITAA 1997 s 25-130
  $1,000 standard deduction (register §2.8.2, in force from FY2026-27), which reduces a salary's
  contribution to taxable income before the gain is added. Re-checked once, against the register,
  per the brief; the omission was found there and the corrected hand figure ($4,519.00) agrees with
  the engine to the cent. Recorded in full, including the wrong first pass, in the verification doc.
- [x] **P13-8** ✅ **2026-09-24 — independent reconciliation done, both halves in one task.** Working
  committed BEFORE the test existed: `docs/verification/P13-8-franking.md` (commit `f45ae66`), then
  `test/verification-p13-8-franking.test.mjs`. Hand-worked against register §5A, using the exact
  rationals (3/7 at 30%, 1/3 at 25%), not the ATO's rounded 2.3333:
  - (a) a SAPTO-eligible single individual, taxable income $22,000, a $16,800 fully franked
    distribution at 30% (credit $7,200, grossed up $24,000) — reconciled through LITO's taper
    ($700→$310), SAPTO's rebate-income taper ($2,230→$985) and the seniors Medicare levy shade-in
    ($173.20), giving additional tax $3,198.20 and a cash refund of $4,001.80
  - (b) a fund wholly in Retirement Phase, $42,000 fully franked at 30% (credit $18,000): 0%
    earnings tax, the whole credit refunded
  - (c) a fund wholly in Accumulation Phase, $36,000 fully franked at 25% (credit $12,000, the 1/3
    rational): 15% earnings tax $7,200, offset exceeds it, $4,800 refunded
  - **All three agree with the engine (`frankingForIndividual`, `frankingInSuper`) to the cent** —
    no discrepancy

---

## Phase 14 — v2: Aged care

**Slice 2 (2026-09-24):** the means-test formula comes from health.gov.au's "fee scenarios 1 Nov 2025" page (5-band taper, ÷364 FLOORED, which Raj's published $79.77
proves). The Sakura and Raj worked examples reproduce to the cent. Mutation-checked: the protected person, the home cap, the NCCC cap and the 50/50 split.

**Gate 2026-09-24: GO for a minimal slice** (`docs/research/p14-aged-care-gate-2026-09-24.md`): the means assessment as a sibling module
of `agePension.ts`, over ONE shared asset ledger with per-test exemptions (or RAD sizing is silently defeated); the home cap plus a
protected-person fact on Household; the fees, RAD, DAP and MPIR; `ENTER_CARE`/`RAD_PAYMENT` only; a chart band. Generalise the Age Pension's
3-dates-a-year indexation merge rather than adding a third calendar. NO-GO on the solver, Support at Home and the comparison view until
the slice ships. User decisions: care entry age, home value, RAD price (all stated inputs).

*Blocked on Phase 13. No free reference tool validates this — it needs a trusted engine underneath.*

- [x] **P14-1** Resolve the three figure discrepancies (income free area, home cap, NCCC daily)
  - **Researched 2026-09-24** (`docs/research/p14-aged-care-sources-2026-09-24.md`). concept.md's first figures were right at 1 Jul 2026, but
    indexation on 20 Sep 2026 has superseded them: the income free area is $36,454.60, the home cap $219,858.40, and the NCCC $109.45/day (health.gov.au schedule).
    These rates are indexed 3x a year (20 Mar, 1 Jul, 20 Sep), so Phase 14 needs an indexation function, not constants.
  - **Built 2026-09-24 (SLICE 1):** `src/data/assumptions/agedCare.ts` (register §12), all three 20 Sep 2026 figures pinned, provenance and
    confidence carried per figure — see `docs/research/p14-aged-care-sources-2026-09-24.md` for every source URL. Test:
    `test/assumptions-aged-care.test.mjs`.
- [x] **P14-2** Confirm the **1 Oct 2026** reclassification of personal care to clinical — ✅ 2026-09-25. Re-confirmed live (`docs/research/p14-2-clinical-reclassification-2026-09-25.md`). It changes nothing in the residential engine; it acts only through P14-11 (Support at Home), which is unbuilt. The box had stayed open a day after its own confirmation note.
  - **Confirmed 2026-09-24, and it is narrower than assumed:** it applies to Support at Home ONLY (personal care moves from
    Independence to Clinical, a 0% contribution). The residential hotelling contribution and the NCCC are unchanged.
  - **Recorded 2026-09-24 as data** (`agedCare.supportAtHome.reclassification1Oct2026`, register §12.5) — **Support at Home scope
    only, and only as a fact**: no contribution-bucket arithmetic (Clinical/Independence/Everyday Living) is built here, that's
    P14-11. Left unticked for that reason.
- [x] **P14-3** Re-source from health.gov.au and myagedcare.gov.au directly
  - **Done 2026-09-24** — `docs/research/p14-aged-care-sources-2026-09-24.md` is the primary-sourced record; every figure it lists that
    is "buildable now" (§"What Phase 14 can safely build now vs. what's still open") is in `src/data/assumptions/agedCare.ts`:
    residential schedule, MPIR (both quarters), the grandfathering three-tier structure and its two old-regime caps, RAD retention,
    and the Support at Home classification budgets. Forward indexation past 20 Sep 2026 is `unverified` by design (register §12.3):
    no linkage citation was retrieved, so `indexAgedCareSchedule` runs the caller's own CPI on the conservative side of each figure
    rather than inventing a rule. Statute-level confirmation (legislation.gov.au) and the CHSP-exclusion clause remain open, as the
    research doc itself says.
- [x] **P14-4** Aged Care Means Assessment as a second, separate means test — ✅ **wired 2026-09-24** (slice 3a, `ENTER_CARE` in `src/core/projection.ts`; pure function `src/core/agedCare.ts`, slice 2). Each month, every Person alive and in care is assessed off the SAME ledger (cash after the RAD left it, the RAD added back, the home) `test/core-projection-aged-care.test.mjs` pins to the cent
- [x] **P14-5** Former home capped per person; **protected person = 100% exempt** — ✅ **both halves wired.** The AGED CARE side wired 2026-09-24 (slice 3a): `homeIsProtected` is derived monthly from `careOn`/`deceasedNow` — at least one Person both alive and not in care — and drops the month a partner also enters care or dies (pinned by the death test). **P14-5a, the Age Pension side, wired 2026-09-25** — see below, no longer deferred.
  - ⚠️ **2026-09-24: the exemption periods are corrected** ([research/p6-5-home-absence.md](docs/research/p6-5-home-absence.md), ADR-0005 note). Moving into care keeps the home exempt for **2 years** (s 11A(9)(b)), after which the person is a non-homeowner and the home is assessable. A general absence is exempt for only 12 months. This is where the household's likely path, the move into aged care, gets modelled, because VACATE_HOME is parked. Register the 2-year figure as a sourced Constant before building it.
  - [x] **P14-5a** The **Age Pension** side of the same event, deferred here from P3-15 on
    2026-09-04 — ✅ **wired 2026-09-25.** Re-verified against a live fetch of DSS Guide 4.6.3.70
    (confirms the research doc): past the 2-year care-situation cliff the home is assessable AND the
    recipient a non-homeowner (`homeTreatment` corrected — was `homeowner: true`, now `false`).
    `core/household.ts`'s `splitAssets` gained a third, optional parameter,
    `careVacatedHomeAssessment`, supplied only by `project()` — never a `Household` field, never
    read by `agePension.ts`/`deeming.ts`/`workBonus.ts` off the Household itself — carrying the
    `ENTER_CARE` entry's stated `homeValue` forward on CPI from the entry's own day and netted
    against any mortgage still owing (the SAME figure the aged-care fee test already reads: "one
    ledger"). `homeUnprotectedFrom` is derived from `careOn`/`death` (never a stored clock), never
    from the manually-set `homeStatus`, which a `ENTER_CARE`-driven Household now overrides monthly
    (`derivedHomeStatus`) — a Household with no `ENTER_CARE` at all is untouched. **What is refused
    against what is assessed, unchanged in substance:** no `ENTER_CARE` at all (the pre-existing
    `VACATE_HOME`/manual-`homeStatus` path) still throws `UnvaluedAssessableHomeError`; an
    `ENTER_CARE`-driven Household now computes past the cliff. **Not built:** s 1121(5)'s HEAS-debt
    deduction (no fixture runs `HEAS_DRAW` past a care cliff) and the rented/sold cases
    (`SELL_HOME`/`RENT_OUT_HOME`, still open) — ADR-0005's 2026-09-25 note states both gaps by name.
    Four hand-worked tests in `test/core-projection-aged-care.test.mjs` (a lone survivor's clock, a
    couple's clock running from the SECOND entry, a partner still at home never assessed, the
    refusal kept with no `ENTER_CARE`); three mutations run (the clock never ending, the home
    counted from day 1, the value not CPI-carried) — all three red.
    - ✅ 2026-09-25: the HEAS-debt deduction is built (`docs/research/p9-heas-debt-netting-2026-09-25.md`;
      SS Act s 1121(5), DSS Guide 3.4.5.20, Aged Care Act 2024 s 330(1),(8)). One walk-local
      `heasDebtOpening` (the month's opening debt, both Persons) comes off `careVacatedHomeAssessment`
      past the cliff, in full, nil-floored, and off the aged care `homeNetValue` before the cap.
      Absent `HEAS_DRAW` it is 0: golden and every existing test unchanged. Two tests in
      `test/core-projection-aged-care.test.mjs`; mutations red: AP deduction dropped (1, by exactly
      `feb.heasDebt`), aged care deduction dropped (1), applied after the cap (1), a later-than-opening
      debt (2).
- [x] **P14-6** Couples: combined assets split 50/50 — ✅ **wired 2026-09-24** (slice 3a): `enterCareCouple` calls `agedCareMeansAssessment` with both Persons' names whenever neither has died, on the household's combined income/assets
- [x] **P14-7** Basic daily fee; hotelling contribution (**uncapped**); NCCC with its lifetime cap — ✅ **wired 2026-09-24** (slice 3a): a day-by-day loop over `agedCareFees`, one call per calendar day (`daysInMonth`, `data/assumptions/periods.ts`), so the NCCC's day-count cap is exact and its running balance (`AgedCareNcccCapBalance`) is carried month to month exactly as the Work Bonus balance is (P4-10's own pattern) — `test/core-projection-aged-care.test.mjs` pins the multi-month carry to the cent. Full lifetime-cap exhaustion (~3.5 years at these rates) is outside a hand-worked `project()` test's practical reach for a fresh admission and stays pinned at the pure-function level (`core-aged-care.test.mjs`)
- [x] **P14-8** RAD / DAP / split; MPIR; RAD retention — ✅ **wired 2026-09-24** (slice 3a): the RAD lump sum is funded through the running cash the Waterfall produces and refused (not left as an `Unfunded shortfall`) if it cannot be paid in full; DAP is computed daily off the outstanding balance at the period's own MPIR. RAD retention (`agedCareRadRetentionDeduction`) is NOT wired — nothing in this slice computes a departure/refund figure, so there is no deduction to apply yet
- [x] **P14-9** Model the RAD asymmetry: Centrelink-exempt, aged-care-assessable — ✅ **wired 2026-09-24**, and structurally rather than by convention: a paid RAD leaves the household's own cash/parcels (so `splitAssets`/`agePensionEntitlement` cannot see it — there is no field to add it to) and is tracked ONLY in a walk-local `radBalance` ledger that `agedCareMeansAssessment` reads explicitly via `combinedRadPaid`. Mutation-tested 2026-09-24: forcing the RAD into `meansTestCash` (Age Pension) or zeroing `combinedRadPaid` (aged care) both turn `test/core-projection-aged-care.test.mjs` red
- [x] **P14-10** **RAD sizing solver** — the real lever, not sell-vs-keep
  - Gate 2026-09-25: NO-GO on a solver. On the demo couple with care in 2056, end wealth rises with every extra dollar of RAD and so do the months short of cash, so the answer is always one end of the affordable range. Replace with a pay-least vs pay-most headline.
  - ✅ 2026-09-25: the replacement shipped. "Deposit: least vs most" beside an `ENTER_CARE` row (same cell as "Compare ways to pay for care", click only, not kept across a redraw) calls `app/radDeposit.ts`: `radDepositEnds` walks the scenario in view with `radPaidAsLumpSum` 0, then at `radPrice`; on `RadPaymentUnfundedError` it bisects the stated deposit in $1,000 steps (the error's "could fund only" figure is message text only, and nominal), ≤12 walks for a $750,000 room. `radDepositSentences` gives the two sentences, end wealth in today's money whatever the page view. Four tests in `test/app-scenario-care-routes.test.mjs`; three mutations red (most = unfundable radPrice 3, sentences swapped 1, future dollars 1).
- [ ] **P14-11** Support at Home: 8 levels, three contribution buckets
  - 🔴 **GATE 2026-09-25: NO-GO** (`docs/research/p14-11-support-at-home-gate-2026-09-25.md`). The budgets, bucket bounds and caps are sourced, but (1) no rule or worked example gives the contribution rate BETWEEN the thresholds, and (2) the claim that the lifetime cap is shared with the residential NCCC has lost its source page (404). Re-run when either turns up.
- [~] **P14-12** (not applicable, 2026-09-26: the user is not in care, and the plan's care entries are all future-dated, so every entry falls under the post-1 Nov 2025 rules the engine uses. Reopen if anyone modelled was in residential care before 1 Nov 2025 or approved for home care by 12 Sep 2024.) Grandfathering for entry before 1 Nov 2025
  - ⚠️ **2026-09-24:** for Support at Home, the cutoff that matters is **12 Sep 2024** (HCP approval or waitlist status),
    not 1 Nov 2025. There is also a second "no worse off" contribution track that concept.md doesn't mention. The lifetime cap is
    $140,652.80, not "$130k". See the research doc.
- [~] **P14-13** Entries: `ENTER_CARE`, `SELL_HOME`, `RENT_OUT_HOME`, `RAD_PAYMENT` — 🔶 **`ENTER_CARE` shipped 2026-09-24 (slice 3a), with the RAD lump sum FOLDED IN** (the gate's own reading: "`ENTER_CARE` and `RAD_PAYMENT` only... because the protected-person case needs neither" — the RAD a resident pays on entry is `ENTER_CARE`'s own `radPaidAsLumpSum`, so a separate `RAD_PAYMENT` entry is for a LATER top-up, not the entry-day lump sum). Renamed from the unspecified `CARE_EVENT` placeholder (`plan.ts`); owner is `personA`/`personB` only, and a second `ENTER_CARE` for the same Person is refused at the door. **The UI followed the same day (slice 3b):** `entryForm.ts` gained the three boxes (home value, room price — "a refundable deposit, RAD" — and how much of it is paid as a lump sum now), all labelled as the household's own estimate; `enterCareEntry` in `planEdits.ts`; `ENTER_CARE` left `ENTRY_TYPES_NOT_YET_WALKED` and is offered. Every line description in `projection.ts` was reworded so "RAD" never stands alone (`AGED_CARE_LINE_PREFIX`, a shared prefix). `proposeEntries`/`listEntries` (the connector/chat) gained the same boxes.
  ⚠️ **`SELL_HOME` shipped whole 2026-09-25** (engine and screen in one change, `MORTGAGE_REFINANCE`'s own precedent — the eighteenth offered type, `README.md`): `salePrice` and optional `sellingCosts` (`SellHomeParams`, both the household's own estimate, `EnterCareParams.homeValue`'s own reasoning). Verified against primary sources (live Chrome-UA fetch where it answered, wayback snapshots where the DSS Guide 403s automation — register O12's own finding): the main residence CGT exemption is total (ato.gov.au "Eligibility for main residence exemption", 22 Jun 2026) — there is no CGT parcel for a home to begin with (ADR-0005), so no charge is ever computed, and the 6-year rule for a later-rented home ("Treating former home as main residence", same date) is `RENT_OUT_HOME`'s, not this one's; DSS Guide 4.6.3.70/4.6.3.80 (wayback 2021-09-26 / 2022-01-17) makes the seller a non-homeowner from settlement (`HomeStatus.noHome`, reachable for the first time) and DOES carry a 12-or-24-month sale-proceeds assets-test exemption for proceeds intended for a new home — **the set-aside AMOUNT is modelled from P14-13c below; ending it with an actual purchase (`newHomePurchaseDate`) is still not**. The proceeds land in cash net of any mortgage still owing (`MORTGAGE_REFINANCE`'s balance-reset precedent, zeroed unconditionally the moment the entry applies) and any Home Equity Access Scheme debt — **the FIRST repayment event `Month.heasDebt` has ever had**, capped at the sale price (SS Act s 1144AA, the No Negative Equity Guarantee, applied rather than merely stated) and discharging the whole debt regardless of the cap; a bug found and fixed while wiring it: the HEAS draw/interest block had no `homeSold` guard at all and would have kept drawing and accruing in the very month the debt was repaid. Aged care sees the sale immediately too: `homeNetValue` and `homeIsProtected` both go to nil once sold, so the home exemption cap simply has nothing left to apply to and the proceeds are assessed as ordinary cash instead. `checkSellHomes` (`parsePlan`) refuses a household with no home to sell (`!homeTreatment(household.homeStatus).homeowner`) and a second `SELL_HOME`. Twelve hand-worked tests in `test/core-projection-sell-home.test.mjs` (a couple's mortgage repaid and Age Pension taper, hand-worked off the same `agePensionEntitlement()` the walk calls, with a "wrong homeowner threshold" control that would zero the pension outright; a survivor in care selling loses the home cap the same day and again for a pre-dated past sale; a HEAS debt repaid in full and capped), golden byte-identical, three named mutations (proceeds not assessed, the mortgage not repaid, thresholds not switched) all red. `RENT_OUT_HOME` and a later top-up `RAD_PAYMENT` are still open, and so is a form-level warning that a resident still in care after 2027-09-19 (the published aged care rate window's own end) is refused by the walk when it gets there — nothing on the form says so yet.
- [x] **P14-13c** `SELL_HOME`'s sale-proceeds exemption — ✅ shipped 2026-09-25, the set-aside amount and its automatic expiry, sourced live via the Wayback Machine proxy (Chrome UA; guides.dss.gov.au 403s a direct curl) against DSS Guide 4.6.3.90 (Internet Archive snapshot 2025-11-16, "Version 1.333 - Released 3 November 2025", "Last reviewed: 22 September 2025"): for a sale on or after 1 January 2023 (every sale this forecaster can state), the part of the proceeds intended for a new home is exempt from the Age Pension ASSETS test for up to 24 months from settlement, the household is "continue[d] to be assessed as a homeowner" throughout despite there being no home (`HomeStatus.noHomeSaleProceedsExempt`, `homeowner: true`), and the amount is still DEEMED for the income test, at the LOWER rate only, separately from the household's other financial assets and the pooled deeming threshold (`AgePensionEntitlement.saleProceedsSetAsideDeemedPerFortnight`). `SellHomeParams` gains `newHomeAmount?` (checked at the door against `salePrice − sellingCosts`) and `newHomePurchaseDate?`. **`BUY_HOME` judged too big for this slice**: ending the window with an actual purchase needs a new entry type (the price leaving cash, the household becoming a homeowner again) — out of scope, so this build models the window and its UNCONDITIONAL 24-month expiry only (no discretionary 12-month extension to 36 months, SSAct s 1118(2B)) and `parsePlan` refuses `newHomePurchaseDate` by name as not yet built, `T137`'s own "refuses it by name rather than guess" precedent. `household.ts`'s `splitAssets` gains a fourth parameter, `saleProceedsSetAside`, carving the set-aside out of the Offset Account line (clamped to what the household actually holds) rather than adding a second claim on the same cash. Six new hand-worked tests added to `test/core-projection-sell-home.test.mjs` (eighteen in the file, total): the exemption during the window (assets test exclusion, homeowner status, the separate lower-rate deeming, hand-computed to the cent), the 24-month expiry (cross-checked against `project()` itself, both sides of the cliff), and every door refusal (nil or negative, over net proceeds, `newHomePurchaseDate` stated, a household already mid-window with nothing left to sell or to HEAS-draw against). Two mutations confirmed red by hand (the window never closing; the set-aside silently not deemed). The two screen fields read "Of that, set aside for a new home $" and "Buying the new home on (optional)" (`entryForm.ts`'s `sellHomeFields`); `SELL_HOME_ENTRY_NOTICE` and the chat tool catalogue updated to match.
  ⚠️ **`RENT_OUT_HOME` shipped whole 2026-09-25** (engine and screen in one change, `SELL_HOME`'s own precedent — the twentieth offered type, `README.md`): `weeklyRent` and four optional yearly costs (`annualRates`/`annualInsurance`/`annualAgentFees`/`annualRepairs`, `RentOutHomeParams`, all the household's own estimate) and an optional `endDate`. Verified against primary sources (live Chrome-UA fetches, and one DSS Guide page live for the first time — 4.6.3.60/.70, both fetched live 2026-09-25, no 403 this time): ato.gov.au "Treating former home as main residence" (22 Jun 2026) — the 6-year rule; beyond it only a PARTIAL exemption applies, apportioned by days, which this build cannot compute, so a `SELL_HOME` more than 6 years after a `RENT_OUT_HOME`'s own `date` is refused by name. DSS Guide 4.6.3.60 "temporary vacation of property" (wayback 2025-12-03) — a household not intending to return makes the home an assessable, non-homeowner asset, with NO 12-month grace modelled (the conservative reading) — the new `HomeStatus.rentedOut`, reachable ONLY in the standalone case (no `ENTER_CARE`) and ALWAYS unvalued there (`RentOutHomeParams` carries no `homeValue` of its own, by design), so it always refuses via the EXISTING `UnvaluedAssessableHomeError` — reachable and tested, not unreachable. DSS Guide 4.6.3.70 "care situations" (wayback 2026-02-16) — "the rent received... is exempt from the income test for the period that the principal home is exempt", confirming BOTH that rent is otherwise ordinary income AND that it is excused while an `ENTER_CARE`-protected home stays exempt; once past the cliff the exemption ends and the rent counts. servicesaustralia.gov.au's aged care "Real estate income" page (wayback 2021-04-12) — gross rent less rates/insurance/agent's fees/repairs, and "if you make a loss... we count that income as zero... you can't offset this loss against... any other source of income" — floored at nil for BOTH means tests, but NOT for income tax, where ordinary negative gearing applies unfloored; the aged-care means test sees the rent REGARDLESS of the Age Pension's own exemption (`combinedAssessableIncome` adds it back in when the Age Pension excluded it). **A real design fix found while wiring the tax side:** `assessedOn`'s `gains` argument feeds `taxableIncomeWithNetCapitalGain`, which refuses a negative value (s 102-5 has no negative capital gain) — a genuine rental LOSS broke that refusal the first time it was tried, so net rent rides a NEW, separate `otherIncome` parameter on `asSaptoPerson`/`assessHousehold`/`div293IncomesOn` instead, applied after the ordinary salary-and-gain figure and re-floored at nil, never folded into `gains` and never touching `netLabourIncome`'s own WATO base. Door refusals: no home to rent, overlapping tenancies, renting on or after a sale, and — the reverse order — entering care while a tenancy is already active (leaving a home you don't live in is not modelled). A walk-time refusal for whole-home-only: renting while a partner still lives in the home (`vacatedProtectedPersonRemains`) is refused by name, since only a room would be rentable and this build has no field for that. Sixteen hand-worked tests in `test/core-projection-rent-out-home.test.mjs` (cash lines exact; the whole-home-only and standalone-unvalued refusals; the Age Pension exemption while protected and its end past the cliff, hand-worked off the same `agePensionEntitlement()` the walk calls; aged care assessing the rent either way; net rent reaching each owner's own tax; a loss reducing tax unfloored), golden byte-identical (1986 affected tests green), two named mutations (rent not taxed, rent not in the income test) both red. A later top-up `RAD_PAYMENT` is still open.
- [x] **P14-14** Funding-route comparison: sell + RAD · keep + rent + DAP · keep + vacant + DAP · HEAS
  - 2026-09-25, slice 1: **3 of 4 routes.** "Compare ways to pay for care" beside an `ENTER_CARE` row (`entryForm.ts`, weekly-rent box) calls `app/careRoutes.ts`, which makes up to three children of the scenario in view — sell + full RAD (+ `SELL_HOME` in the care month at `homeValue`), keep + rent + DAP (`RENT_OUT_HOME` from the month after), keep + vacant + DAP — each switching the parent's `ENTER_CARE` off and adding its own copy. A route the door or the walk refuses is not created and is reported in one line; a blank rent skips the rent route; a re-run skips routes already made (derived scenario ids, `scenarioList`'s duplicate-id rule). The door's `checkEnterCares`/`checkSellHomes`/`checkRentOutHomes` now run PER SCENARIO over its effective switched-on entries (`careCheckScopes`), plus each entry switched on nowhere, alone. **HEAS pending** the debt-netting gap (`docs/research/p1-heas.md` ~577, 705-709: whether a HEAS debt reduces the home's value in the aged-care means assessment is unverified).
  - 2026-09-25: the HEAS route is **unblocked** — the debt-netting gap is closed and built (see P14-5a). The fourth route itself is not built yet.
  - 2026-09-25: ✅ **4 of 4.** Route 4 "Keep home, draw HEAS, pay daily": `ENTER_CARE` copy with RAD 0 + a `HEAS_DRAW` for the care entry's owner from the care month, `'maximum'`, `securityValue` = `homeValue`. Skipped with a reason when a home loan is stated (`household.mortgage` or a switched-on `MORTGAGE_REFINANCE` in the scenario — the security would need it netted) or that Person already has a `HEAS_DRAW` in the scenario. `checkHeasDraws` is still pool-wide, so once route 4 exists that Person can hold no other `HEAS_DRAW` anywhere in the plan — **fixed 2026-09-25**: its relations run per Scenario now (see P7-1b).
- [x] **P14-15** Care cost as its own chart band, not folded into general spending — ✅ shipped 2026-09-24 (slice 3b), as a third OVERLAY rather than a third stacked band: `monthsToSeries.ts`'s `bands` stays fixed at exactly two by a hard invariant the tests enforce (`protected + assessable` IS total wealth; a third stacked band double-counts), so `careCost` joins `accessible`/`floor` as a line drawn OVER the stack instead. Net CASH only, this month alone (the RAD lump sum and refund included, the RAD retention excluded — it moves no cash and is already inside `radHeld`/`protectedAssets`), isolated by `AGED_CARE_LINE_PREFIX`. Mutation-checked: folding the filter into "every cash line" (i.e. general spending) reddens 2 tests.
- [x] **P14-16** ⚠️ **The RAD vanishes from wealth (found at review, 2026-09-24)** — ✅ fixed 2026-09-24. Slice 3a kept the paid RAD in
  a walk-local `radBalance` no `Month` figure reported, so total wealth dropped by the whole deposit on entry and was never restored.
  Now `Month.radHeld` (OPTIONAL, OMITTED for a walk with no `ENTER_CARE`, `mortgageBalance`'s own terms) carries the RAD net of
  retention, at the month's CLOSE; the app's "Total wealth" table column adds it in
  (`closingBalance + superBalance + closingNonSuperPortfolio + radHeld`), and the OPENING figure (before this month's own
  payment/retention, on `assets.protectedAssets`'s own clock) is folded into `Month.protectedAssets` and `assetsByPerson[i]`
  (the RAD's own resident, never pooled onto a partner) — so the stacked wealth chart and `comparisonSeries.ts` carry it too, for
  free, since both read `protectedAssets` at the source. It stays OUT of `assessableAssets` (3a's Age Pension exemption intact) and
  is never added to a Person's `parcels`/`openingBalance`, so the Waterfall still cannot draw on it (pinned: a genuine shortfall
  leaves `radHeld` untouched, falling only by retention). Retention (2%/year, calculated daily, capped at 5 years —
  health.gov.au "RAD and RAC retention") now runs monthly via `agedCareRadRetentionDeduction` (built in slice 2, unused until now),
  as its own `effect: 'wealth'` line (`AGED_CARE_RAD_RETENTION_LINE`) — no cash moves, only what a future refund would return.
  **The refund**, confirmed against health.gov.au: the balance less retention (and any other amount owing, not modelled) is paid
  to the estate within a stated period; modelled here as landing in household cash in the SAME month as the resident's `DEATH`
  entry (`AGED_CARE_RAD_REFUND_LINE`, `effect: 'cash'`), assessed for the Age Pension from that same month on (`meansTestCash`
  widened alongside the super death benefit it already carried). **A departure from care with no death is NOT modelled** —
  `ENTER_CARE`'s own doc already says nothing in this build lets a resident leave care alive, and the refund block is the only
  route a paid RAD ever reaches cash again. Six new tests in `test/core-projection-aged-care.test.mjs` (continuity of total wealth
- [x] **P14-17** ⚠️ **CRITICAL DEFECT (found at review, 2026-09-25): aged care was unusable for any real plan.** `AGED_CARE_PERIODS`
  covered exactly one published year (20 Sep 2026 – 19 Sep 2027), and `project()` REFUSED any month with a resident in care
  outside it — `indexAgedCareSchedule` (built in slice 1) existed and was correct but NOTHING called it. A user entering care at
  85 in 2056 got a hard refusal. ✅ **Fixed 2026-09-25**, mirroring `agePension.ts`'s own answer to the identical published-window
  problem: `agedCareScheduleThrough`/`agedCarePeriodsThrough` (`data/assumptions/agedCare.ts`) extend the residential schedule
  forward on its own 20 Mar / 1 Jul / 20 Sep calendar, through the SAME `mergeCalendarBoundaries` machinery `agedCarePeriods`
  already used — each generated set is `indexAgedCareSchedule(previous, cpi-per-step, projectedSingleBasicPensionRate)`, where the
  per-step CPI movement is `core/priceLevel.ts`'s `priceLevelFactor` run from the PREVIOUS schedule date (never re-derived from the
  2026-09-20 origin) and the pension rate is read off the SAME `indexationSeries` the walk pays the Age Pension line from
  (`agePensionPeriodAt`), so the basic fee tracks the pension this walk actually pays. The MPIR is NOT extended — nothing
  retrieved states a forward rule for it (§12.2) and it is fixed per resident at entry anyway — so it is simply left to hold at
  its last determined quarter, which `mergeCalendarBoundaries`'s own `latestOnOrBefore` already does without new code.
  `agedCareParametersCover` narrowed to ONE bound (a date before 20 Sep 2026 is still refused; nothing above it is any more), and
  `agedCareProvenance` marks a generated period `unverified` and names it PROJECTED, not published — `agePensionProvenance`'s own
  `AGE_PENSION_GENERATED_KEY` shape. The published 2026-09-20 figures are untouched (byte-identical: pinned in
  `test/assumptions-aged-care.test.mjs`), and `fixtures/golden/demo-couple.golden.json` stays byte-identical too (no `ENTER_CARE`
  in that fixture). This also lifts the bound P14-5a's own tests noted: a `DEATH` can now be walked 24 more months through the
  vacated-home cliff without hitting the old one-year aged-care ceiling — `test/core-projection-aged-care.test.mjs` adds the
  literal version (a couple, one dies, the survivor already in care, the clock runs from the death, the home becomes assessable
  at month 25) beside the single-Person stand-in the earlier slice used. New tests: 5 in `test/core-projection-aged-care.test.mjs`
  (a resident entering care in 2056 walks to the horizon with the fee genuinely re-indexed — not a stale carry —, the one-sided
  refusal below 2026-09-20, the mid-walk fee jump at the real 2027-03-20 boundary, the literal death-through-the-cliff couple) and
  4 in `test/assumptions-aged-care.test.mjs` (published figures unchanged, a 30-year horizon with no refusal, the basic fee
  85%-of-pension-÷14-floored in a far year, the NCCC daily max CPI-carried and rounded up). Mutations run in an isolated
  scratchpad copy: generation disabled past the published year (4 tests red) and the basic fee wired to a fixed figure instead of
  the projected pension rate (2 tests red) — both reverted, not left in the tree.
  across the entry month, the chart band, retention to the cent, the death-month refund exact to the cent with a matched-pair
  Age Pension comparison, and the Waterfall-can't-draw-it shortfall case); `test/core-plan.test.mjs`'s `Month` field-name canary
  re-pinned. Golden file (`test/golden-demo-couple.test.mjs`) stays byte-identical — the demo has no `ENTER_CARE`. Mutation-checked
  in an isolated copy: dropping `radHeld` from total wealth reddens 4 tests, skipping the refund reddens 1.
- [x] **P14-18a** **Review finding, 2026-09-25 (demo couple + `ENTER_CARE` 2056-01-01, home $1.2m, RAD $750k / $300k lump sum):**
  the low hotelling ($322→$79→$24/month) and nil NCCC looked "far too low" against a $807k-super/$64k-cash/$300k-RAD household —
  but hand-worked, **the walk is CORRECT, not a defect.** Instrumented `agedCareMeansAssessment`'s exact inputs for 2056-01/2057-01:
  combined assessable assets $1,179,586.69 (super IS in it — both are ABP by 2056 and past Age Pension age, so `superInterestTreatment`'s
  younger-partner exemption, an accumulation-phase/under-pension-age rule, does not apply). Per-person share $589,793.35 sits between
  the 2056 CPI-carried "second" and "third" asset-band boundaries — NOT past the uncapped top band — so the health.gov.au
  17.5%/0%/7.8%/0%/7.8% taper (pinned to the cent against its own Sakura/Raj worked examples in `core-aged-care.test.mjs`) gives
  $160.62/day. The 2056 maximum accommodation supplement — itself CPI-carried from $73.73 (2026) to ~$150.22/day, the SAME movement
  every other figure here moves by — is subtracted FIRST (`FEE_WATERFALL_ORDER`'s own quoted waterfall), leaving ~$10.40/day for
  hotelling and nothing for the NCCC — the SAME shape health.gov.au's own Raj example shows (moderately-above-the-free-area resident,
  below the hotelling max, zero NCCC). The reviewer's hand-check ("well above the free area, so the max should apply") did not
  account for the two 0%-rate bands or the accommodation-supplement pre-offset; being 4× the free area is not the same as being
  past the fourth (uncapped) threshold. **No source change.** New test in `test/core-projection-aged-care.test.mjs` ("demo couple
  review fixture: 2056-01 hotelling/NCCC hand-worked, and low is correct") pins the walk's actual 2056-01 hotelling/NCCC to the cent
  by (a) a floor on `Month.assessableAssets` well above what cash alone could produce (catches a super-excluded regression), (b) an
  independent second call to `agedCarePeriodsThrough` (never read off `project()`'s own closure) for the period thresholds, and (c)
  feeding the walk's own assessable-assets figure through the already-Sakura/Raj-verified `agedCareMeansAssessment`/`agedCareFees`
  pair and asserting equality against the walk's emitted lines; the income test is bounded (deeming can never exceed the plan's own
  upper rate on the whole pool, and even that ceiling sits under the 2056 free area) rather than re-derived. Mutation (isolated
  scratchpad copy): zeroing `combinedAssessableAssetsExcludingHomeAndRad` at the call site (simulating assets left out of the
  aged-care assessment) reddens 5 tests, including this new one.
- [x] **P14-18b** **Review finding, 2026-09-25: a paid RAD lump sum could only be funded from running cash**, refusing
  `radPaidAsLumpSum: $750,000` against a household holding $800k in superannuation with "household has 37257999 cents on hand" —
  even though most retirees pay a RAD out of super. ✅ **Fixed**: the RAD lump sum now joins `target` in `projection.ts`, on
  `MORTGAGE_PAYOFF`'s own precedent rather than `NON_SUPER_INVESTMENT`'s, so the WHOLE Waterfall — salary, both Account-Based
  Pension limbs, the Non-Super Portfolio, running cash and (last) a released superannuation lump sum — funds it, the way most
  retirees actually pay one. The cash-only refusal moves to just after the Waterfall runs, now keyed off `result.shortfall > 0`
  (gated to a month a RAD is actually due, so an unrelated shortfall in an ordinary month is untouched) — same REFUSAL, never an
  `Unfunded shortfall`, wider funding source. The RAD stays exempt for the Age Pension, assessable for aged care, and locked once
  paid — none of that changed. Two new tests in `test/core-projection-aged-care.test.mjs`: a $750,000 RAD funded almost entirely
  from the Account-Based Pension when cash ($10,000) cannot cover it (super falls via the pension-payment draw line, `radHeld`
  rises, total wealth does not fall by anything near the RAD), and a RAD beyond EVERYTHING the household has — cash and a small
  super balance both — still refused. Mutation (isolated scratchpad copy): reverting to the cash-only check/refusal reddens 1 test
  (the super-funded case, with the exact old cash-only refusal message). Full affected-file sweep (489 tests across
  `core-mortgage*`, `core-projection-waterfall`, `core-waterfall-released-super`, `core-projection-pension-drawdown`,
  `app-entry-form`, `app-plan-edits`, `app-months-to-series`, `app-chat-propose-entries` and others) and the demo-couple golden
  file stay green/byte-identical.
- [x] **P14-19** ✅ 2026-09-25 — `BUY_HOME` built, engine and screen: purchasePrice + optional purchaseCosts (today's money, raised to the settlement date); only after a `SELL_HOME` in an earlier month of the same scenario, once, not with an `ENTER_CARE` or a later `HEAS_DRAW` (all refused by name); paid first from the set-aside, the rest through the Waterfall, `HomePurchaseUnfundedError` if it cannot be paid in full; occupied/exempt from its month, the exemption and its deeming end. `newHomePurchaseDate` stays refused, its message now points at `BUY_HOME`; no box added back. `test/core-projection-buy-home.test.mjs`; 4 mutations red. Original note: `SELL_HOME`'s `newHomePurchaseDate` has no box on the form (removed 2026-09-25, at the
  merge of P14-13/P14-13c): the engine refuses it whenever it is stated, because `BUY_HOME` — the entry
  that would actually end the sale-proceeds exemption window with a purchase — is not built, so a box
  for this field could only ever be typed into and then refused. `SellHomeParams.newHomePurchaseDate`
  and `parsePlan`'s door refusal both stay on record for the day `BUY_HOME` exists to give it a real
  answer; only the UI box was removed. Building `BUY_HOME` is what would put the box back.

---

## Phase 15 — v3: AI chat interface

*Blocked on Phase 13. An explainer over an unverified engine produces fluent, confident, wrong
answers — worse than no tool, because the fluency stops anyone checking. Defaults off; the app
must stay 100% functional without it. See ADR-0006.*

**Planned 2026-09-23 in [`plan_ai.md`](./plan_ai.md)** — eight stages, each gated. Five decisions
await the user (D1-D5). The main one: stages 1-3 attach no model and could start before Phase 13
closes. §11 adds an alternative to building a chat into the app: an "Export for AI" brief file,
and a local tool connector (MCP) that lets Claude call the real engine. Recommended: the brief
first, then the connector instead of the in-app chat, at the cost of the chip guard. **Built since (2026-09-24):** the connector (stage 1 read tools) AND the in-app chat through stage 5 — panel, chips, guard, review and accept. See the ticked boxes below.

- [x] **P15-1** Provider adapter: bring-your-own key, browser calls the API directly, no intermediary server
  — ✅ 2026-09-24 (stage 4). `src/app/chat/anthropic.ts`: Anthropic's Messages API over plain
  `fetch()` to `<endpoint>/v1/messages`, with no SDK. Usage is read from every response, and failures
  come back as plain English (unreachable, key refused, rate limit, overloaded, refused in the
  provider's own words). The only provider is Anthropic: stage 0 measured its CORS preflight from
  `localhost:4173` as open, and found no Ollama installed (P15-3 stays open). The loop is
  `conversation.ts`: tool calls go through the figure store, at most 8 rounds a turn, then chips and
  the guard. The tool catalogue (`toolCatalogue.ts`) is now shared with the connector.
  - [x] **P15-1a** The local origin provider (P2-2a) is **not** an intermediary: the browser calls
    the provider itself, and no request to a model ever passes through the Node server. Route one
    through it and this claim is gone — ✅ 2026-09-24. `endpointRefusal` turns away several endpoints
    before any request is made: enough's own origin, a relative path, a non-`https://` address, and
    one carrying a query or credentials. `test/app-chat-key-isolation.test.mjs` asserts that every
    request carrying the key goes to the endpoint. Mutation-checked: routing the call through the page
    origin, or allowing a same-origin endpoint, turns a test red
- [x] **P15-2** Key handling — localStorage only; **assert it is absent from Export and from the `PlanFile` shape**
  — ✅ 2026-09-24. `chatSettings.ts` keeps it under the one key `enough.chat`
  - [x] **P15-2a** Still correct under the file-on-disk store, and now sharper: localStorage holds
    **no plan data at all**, so the API key is the only thing in it. The key never reaches the
    Node server, never reaches `plan.json`, and never reaches an export. Assert all three — ✅
    2026-09-24, with one amendment. localStorage now also holds the chat's own settings and this
    month's spend, still under one key and still no plan data (ADR-0008, 2026-09-24 note).
    `fetch` is intercepted through a load, two questions and two saves with the chat on, and all
    three are asserted. The export is asserted on the Working File's own shape, because the Export
    verb itself is deferred (P8-3). Mutation-checked: the key written into the plan, or sent to the
    server in a header, turns a test red
- [ ] **P15-3** Local-model option over `localhost` (Ollama or equivalent) — the posture-preserving path
  - **Confirmed still not built, 2026-09-26.** `chatSettings.ts:19`: "Ollama is not offered: not
    installed where stage 0 measured (2026-09-24)." `anthropic.ts` is the only provider adapter;
    `chatSettings.ts`'s `CHAT_PROVIDERS` names only `'anthropic'`. **Blocked on:** no local model was
    available to measure tool-call support against (plan_ai.md stage 0). Unblocking needs a local
    server to test against and a second adapter (`provider.ts` already generalises the endpoint
    refusal, so the adapter is the remaining piece)
- [ ] **P15-4** Redacted mode: reason over the demo couple's shape or scaled relative figures, never real balances
  - **Confirmed still not built, 2026-09-26.** No `redact` identifier anywhere under `src/`
    (grepped). **Not blocked technically** — the in-app chat now has a chip renderer (P15-10) that
    §11.2's original objection ("no chip renderer on your side") no longer applies to — but no design
    decision was taken to build it after the connector→in-app pivot (ADR-0011); D2's "opaque
    figures" choice was recorded before that pivot and was never revisited for the in-app chat
- [x] **P15-5** Feature flag, **off by default**; graceful no-op when the key is missing or the provider is unreachable
  — ✅ 2026-09-24. `DEFAULT_CHAT_SETTINGS.enabled` is `false`, and nothing else has a default. A
  question is refused, with a plain reason and no request, when the chat is off, a setting (endpoint,
  model name, key, prices, ceiling) is missing, or this month's spend has reached the user's monthly
  ceiling. The model name and the prices come only from settings, and no model name is anywhere in
  `src/`. With the chat off, and with it on but unused, the demo walk is still `72bfb895…` and the
  connector fixture still `a250af6a…`. Each of these is mutation-checked
- [ ] **P15-6** Read-only tools: `runProjection`, `getMonth`, `getMarkers`, `compareScenarios`, `solveSustainableSpend`, `explainAssumption`
  - **Ruled 2026-09-26 (LIZ):** `compareScenarios` was withdrawn by decision (plan_ai.md §12.10, ADR-0011), so this box closes on the other five, which are all built and tested. It stays open only for `proposeScenario` (see P15-7).
  - **Checked against `toolCatalogue.ts`, 2026-09-26: 5 of the 6 named tools are built and each has
    its own test** — `runProjection` (`test/app-chat-run-projection.test.mjs`), `getMonth`
    (`test/app-chat-get-month.test.mjs`), `getMarkers` (`test/app-chat-get-markers.test.mjs`),
    `solveSustainableSpend` (`test/app-chat-solve-sustainable-spend.test.mjs`), `explainAssumption`
    (`test/app-chat-explain-assumption.test.mjs`). The catalogue also ships three more this box
    doesn't name: `listEntries`, `listAssumptions`, `whatCanYouModel`.
  - **`compareScenarios` is not a gap — it was withdrawn by decision** (plan_ai.md §12.10, ADR-0011:
    "the AI never compares two options"; `plan_ai.md`'s own tool table marks it
    `~~compareScenarios(idA, idB)~~ — Withdrawn`). No such tool exists in `toolCatalogue.ts` or
    `server/connector.mjs`, and none is planned. This box's own wording is stale against that later
    decision — left open rather than ticked because, as written, it names a tool that will not be
    built; a builder should edit the box to drop `compareScenarios` rather than try to close it
- [x] **P15-7** Proposing tools: `proposeEntries`, `proposeScenario` — write to a review queue, **never to the plan file**
  — ✅ 2026-09-24 (stage 5), for `proposeEntries`. Each call the tool passed comes back with the
  turn's answer (`conversation.ts`), is re-checked against the plan the page holds now and queued
  (`src/app/chat/reviewQueue.ts`). A card shows the entries in the entry table's wording and the
  trial walk's effect as chips. **Accept** builds each entry with the entry form's own builder under a
  fresh id, adds it to the suggestion's scenario with `planWithEntry` (switch-offs via
  `planWithEntryOverride`) and hands the candidate to the page's own `save`, so `savePlan`: a refusal
  writes nothing and the card stays. **Reject** drops the card and calls nothing. Mutation-checked:
  accept wired past `savePlan`, accept ignoring a refusal, and reject writing each turn a test red
  - [x] `proposeScenario` ✅ 2026-09-28, `src/app/chat/tools/proposeScenario.ts`: `proposeScenario(name, parentId, whatIf?, basis?)`. It queues a child scenario, optionally with entries of its own, which are checked against the parent through `proposeEntries`' own path, since a child with no entries forecasts as its parent. Accept uses the Clone button's `scenarioCloned` with a fresh id and empty `entryIds`, then one `save`; Reject calls nothing. Refusals: `UNKNOWN_SCENARIO`, `BLANK_NAME`, `DUPLICATE_NAME` (the page itself has no duplicate-name rule), re-checked on Accept (`NAME_TAKEN`, `PLAN_MOVED_ON`). Mutations red: copies the parent's entries (3), skips save (6), a missing parent accepted (1), duplicate name accepted (2, re-checked by LIZ). Was: not built
    — **confirmed 2026-09-26**, `toolCatalogue.ts`'s `TOOLS` array has 9 entries (`listEntries`,
    `runProjection`, `getMonth`, `getMarkers`, `solveSustainableSpend`, `explainAssumption`,
    `listAssumptions`, `whatCanYouModel`, `proposeEntries`), none named `proposeScenario`. Not
    blocked; simply not attempted since D5 dropped suggestion codes (plan_ai.md §12.4)
  - [x] **P15-7a** The queue is **in memory**, not IndexedDB and not localStorage. The persisted
    design belonged to the retired browser-sandbox architecture (ADR-0008); with the plan a file on
    disk there is nothing left in browser storage but the API key, and it stays that way. A
    proposal not accepted before the tab closes is discarded — intended, not a limitation: an
    unaccepted suggestion that survives a decision is a binding in disguise (ADR-0004)
    — ✅ 2026-09-24. A list in the panel's closure; the chat off drops it, a reload empties it, and
    the test asserts nothing of it reaches localStorage (a queue that persists there turns it red)
- [x] **P15-8** Enforce the split in code: no tool edits a Setting, disables an entry, or writes the plan
  — ✅ 2026-09-26. `test/import-graph.test.mjs`: "app/chat/ never imports store/ and never names
  `savePlan` or `writePlan`" scans every file under `src/app/chat/` (both `chat/` directly and
  `chat/tools/`, asserted non-empty so the check can't pass vacuously) for a `store/` import or the
  bare identifiers `savePlan`/`writePlan` anywhere in the text — comment, string or call. A second
  test in the same file proves the check actually catches a `store/` import and a writer reference.
  A real "disable" or "edit a Setting" can only reach the user's plan through those same two writers
  (`planWithEntryOverride`/`planWithEntry` build a candidate in memory; only `savePlan` persists it),
  so the one rule covers all three verbs the box names
- [x] **P15-9** Context budget — financial-year rows plus markers from `runProjection`; full months only via `getMonth`
  — ✅ 2026-09-26. `src/app/chat/tools/runProjection.ts`: compact (the default) returns one row per
  financial year of headline differences (`headlinesOf`) plus every marker; `detail: 'full'` returns
  "every figure of every year" (`HEADLINES_EXPLAINED`) — still year-granularity, never a month's line
  items. `src/app/chat/tools/getMonth.ts` is the one tool that returns a month's full line breakdown
  with `appliedEntryIds`. `test/app-chat-run-projection.test.mjs:508` holds the demo's compact output
  to 10 KB or less for a retirement-moving-every-later-year what-if
- [ ] **P15-10** Provenance rule: every prose figure cites its month and line item; render figures as chips from the tool result, not model text
  - **Stage 7 harness built 2026-09-28 (`f20ef3d`):** the golden report now gives the struck-figure count per question and in total (`TOTAL x/13 passed; struck figures N, unresolved markers M`). An echo of the user's own figure counts as struck, per D3 and the page's guard. The measurement itself waits on the user's live run (see P15-14). Once it exists, record it as "Stage 7 as built" in plan_ai.md.
  - **Stage 3, the figure store (2026-09-24):** `src/app/chat/figureStore.ts`. Every tool result in a
    conversation is stored under `t1`, `t2`, …, and each money figure in it under a path
    (`⟦t2:difference.differenceByYear.fy2034-35.agePension⟧`, `⟦t3:lines[4].amount⟧`, `…wording#1` for a
    figure inside a sentence), with its RAW value: nominal cents and month, a spending level stated in
    today's money, a salary in today's wages, or a legislated figure and its stamp. The model is shown
    each figure as its marker plus a whole-dollar labelled value. The tools are not forked: under
    `figureCapture.ts` the two labelling sites append the raw value, and outside a capture every tool's
    output is byte-identical (asserted). A labelled figure with no raw value refuses the result.
  - **Stage 3, chips and the guard (2026-09-24):** `chips.ts` replaces each marker with a chip showing
    the ENGINE's value, converted at display time in the page's basis, in whole dollars, linked to
    `#month-YYYY-MM(-line-N)`. The month table has no such anchors yet: the panel (stage 5) adds them.
    A marker that resolves to nothing is a red "no such figure" chip, never text. `guard.ts` strikes
    every currency-like figure outside a chip, echoes of the user's own included, and any other digit
    number not word for word in the question or a tool result (D3). W6's sentence is a fixture.
  - **Stage 3, the instructions (2026-09-24):** `instructions.ts`. Every figure is written only as its
    marker, never a number of money, and numbers only as D3 allows. The rules the connector already
    states are its own sentences, now exported from here and imported by `server/connector.mjs`
    (its `initialize` output is byte-identical). `test/import-graph.test.mjs` now holds all of
    `app/chat/`, not just `tools/`, to the no-`store/`, no-writer rule.
    **Still open:** the golden count of struck figures (stage 7).
  - **Stage 5, on the page (2026-09-24):** the panel renders replies through `chips.ts`, with CSS for
    the chip, the struck text ("not from the engine") and the red chip. `src/app/monthAnchors.ts` gives
    the month table's rows `month-YYYY-MM` and lines `month-YYYY-MM-line-N` (additive: no column
    changed), and following a chip opens that month and marks the line. A chip linking nowhere is
    mutation-checked three ways (the href, the anchors, `main.ts` not anchoring).
  - **Still open, confirmed 2026-09-26: the golden count of struck figures (stage 7).** The
    mechanism itself (figure store, chips, guard, month anchors) is fully built and tested, so
    every prose figure the model could write bare is caught. What's missing is the live
    measurement plan_ai.md names for stage 7: no "Stage 7 as built" section exists in `plan_ai.md`
    (last progress entry is stage 5, 2026-09-24), and `scripts/chat-golden.mjs` still runs its 13
    questions against the CONNECTOR (`server/connector.mjs`, via `claude -p` over MCP) — the route
    with no chip guard at all — not against the in-app chat this box's mechanism was built for.
    There is no golden run yet that reports a struck-figure count for the shipped chip/guard path
- [x] **P15-11** Proposal review UI — accept/reject each proposed entry individually, same review surface as P11-6
  — ✅ 2026-09-24 (stage 5), `src/app/chat/chatPanel.ts`. A chat settings box in the settings area
  (on/off, off by default; provider address; model name; the key in a password box; the two prices;
  the monthly limit; this month's spend against it; the notice that figures go to Anthropic and
  names and dates of birth don't), reading and writing through `chatSettings.ts` only. The panel is
  not in the page while the chat is off. Accept and reject act on one suggestion (one
  `proposeEntries` call) at a time, not on each entry within it. Tested through a stand-in DOM
  (`test/fixtures/fakeDom.mjs`) in `test/app-chat-panel.test.mjs`, including a whole panel session
  under stage 4's shared `fetch` interceptor (`test/fixtures/chatFetch.mjs`) with the key in no
  request to the local server
- [x] **P15-12** Refusal path for out-of-scope questions (aged care pre-Phase 14, CGT, Monte Carlo, investment property, sell-to-rent) with a pointer, never an improvised answer
  — ✅ 2026-09-24. The code was already right: `whatCanYouModel.ts` reads `UNSPECIFIED_ENTRY_TYPES` live, and the non-derivable
    limits live in one `NOT_MODELLED` list, each with a reason and a pointer. CGT is in neither list, and a new test pins that (@0fb46f7).
  - ⚠️ **The list above is out of date (noted 2026-09-23):** CGT has been in scope since
    2026-09-04 (ADR-0009), and the engine computes it. `plan_ai.md` §5 derives the refusal list
    from `UNSPECIFIED_ENTRY_TYPES`, the Parked list and register §8, so it cannot drift again.
- [x] **P15-13** Persist the turn behind each accepted entry as its origin; discard idle conversation
  - **Built 2026-09-28.** `EntryBase.origin?: EntryOrigin` (`src/core/plan.ts`) — `{ question, reply,
    model, date }`, provenance like `createdAt`, never read by `project()`. **Accept** (`reviewQueue.ts`)
    records it on EVERY entry a suggestion adds, when the panel hands one in (`AcceptDeps.origin`);
    `chatPanel.ts` builds it at the moment of Accept from the turn that produced the suggestion: the
    question as typed, the reply as plain text with each chip its whole-dollar value and basis as the
    page shows it then (`chips.ts` `replyText`; a struck figure and an unresolved marker are written
    as `[not from the engine: …]` and `[no such figure]`), the model the settings named when asked,
    and when the reply came back (`toISOString`). Turns that suggest nothing, and rejected
    suggestions, are held only in memory and discarded on reload, as before. **Reject** still writes nothing.
  - **The door** (`parsePlan.ts` `parseOrigin`) reads exactly the four keys and refuses, by path,
    under `PlanFileEntryError` (a non-object, an unknown or missing key, a non-string, an empty
    question or model, a text past `ORIGIN_QUESTION_MAX` 4,000 / `ORIGIN_REPLY_MAX` 50,000 /
    `ORIGIN_MODEL_MAX` 200 characters) or `PlanFileDateError` (a date not in `toISOString`'s exact
    form, or not a real instant). The question box's `maxLength` is the door's bound.
  - **Absent is byte-identical**: the demo plan and `fixtures/demo-couple.plan.json` re-save to the
    sha256 the build at a398b71 wrote (measured on that build), and a second load/save moves nothing.
    An origin on every entry leaves the golden fixture's and the demo's walk byte-identical, and
    `listEntries`, `proposeEntries` and `runProjection` return identical text with and without it.
    `test/app-chat-origin.test.mjs` (10 tests); `test/app-chat-panel.test.mjs` extended.
  - **The warning (ADR-0006).** There is no export screen: Export is P8-3, deferred by the user
    2026-09-19. The warning (`ORIGIN_SAVED_NOTE`) is on the nearest save surface, the chat's review
    box where Accept writes the turn to `plan.json`. **When P8-3 reopens, its screen carries it too.**
  - **One stage-4 assertion narrowed.** The panel's whole-session key test asserted the model name
    reaches no request to the local server; §7.3 puts it in `origin.model` by design, so the test now
    strips `origin` before looking and separately asserts the one saved `origin.model`. The key, and
    the chat's storage key, are still asserted absent from every byte.
  - **Not done:** a model's draft entry may itself carry an `origin` key and pass the trial walk; it
    is dropped at Accept (the form's builder rebuilds each entry) and replaced by the real turn, so
    nothing forged is saved, but `proposeEntries` does not refuse it.
- [ ] **P15-14** Golden-question regression suite over the demo couple — fixed questions, known answers, run like any other test
  - **Re-pointed 2026-09-28 (`f20ef3d`):** `scripts/chat-golden.mjs` now drives the IN-APP chat by default (the page's conversation loop, tools, figure store, chips and guard, headless against the demo couple). `--route connector` keeps the old path, and `--score <dir>` re-scores saved transcripts. It is proven on a fake provider in `test/chat-golden-scorer.test.mjs` (a bare "$12,345" counts 1 struck); making the count ignore struck figures turns 2 tests red. **What's left is one live run, which only the user can do, since it bills their key:** `npm run build && ENOUGH_CHAT_API_KEY=<key> node scripts/chat-golden.mjs --model <id> --input-price <$/M> --output-price <$/M> --max-budget-usd 2`. It stays outside `npm test` by design. Gap: "valid proposals" is counted, not scored.
  - **Partly built, checked 2026-09-26.** `scripts/chat-golden.mjs` holds the 13 fixed questions
    (`QUESTIONS`, W1-W6/B1-B3/R1-R3/C1) with known-answer scoring, and its scorer is self-tested on
    canned transcripts in `npm test` (`test/chat-golden-scorer.test.mjs`; the full suite is 3022
    tests, all passing as of this check). What's short of the box's own words ("run like any other
    test"): the live suite is opt-in by design and explicitly excluded from `npm test` because each run calls a real,
    billed model (`scripts/chat-golden.mjs`'s own header: "Opt-in only, and never inside `npm test`:
    each run costs money"). It also still targets the CONNECTOR (`CONNECTOR = server/connector.mjs`,
    driven by `claude -p` over MCP), not the in-app chat that ADR-0011's trigger (2026-09-24) built
    — the "live golden suite re-pointed at the in-app chat" step named in plan_ai.md §14's stage
    order has not happened (no stage-7/8 section follows stage 5 in `plan_ai.md`)
- [ ] **P15-15** Measure tokens and cost for a representative turn; record the figure in `concept.md` §6
  - **Not built, confirmed 2026-09-26.** `concept.md:933` still reads verbatim "v3 chat token cost
    per turn is unmeasured". A cost figure does exist, but only for the connector route on one live
    call (plan_ai.md: "One live call (W4, spending cut): $0.1359", 2026-09-24) — it was never carried
    into `concept.md` §6, and it measures the connector, not the in-app chat that shipped

---

## Phase 16 — Three life phases in the UI (user-approved 2026-09-25)

The tool now covers three phases: **before retirement**, **retirement** and **aged care**. They are
**per person**, not per household: a couple overlaps (one working while the other is retired; one in
care while the other is at home). Each is derived from existing entries (RETIRE, ENTER_CARE, DEATH),
never stored. The user reviewed a mock-up and approved options 1 and 3. Options considered and not
chosen: shading phases on the charts (maybe later), grouping Change-the-plan by phase (later, once
the entry list grows), and separate tabs per phase (rejected: tabs hide how an early decision plays
out late in life).

- [x] **P16-1 Life-stages strip (option 1).** One row per person above the wealth chart: coloured
  segments Working / Retired / In aged care, with a label at each boundary giving the year and age
  (e.g. "Retires 2034 · 63"), a light year axis and a legend. Derived from the walk and the entries,
  with nothing new in the plan file. A person with no care entry has no care segment. A death ends
  that person's row, and it's labelled. — ✅ 2026-09-25. `app/lifeStages.ts` (pure) +
  `app/renderLifeStages.ts` (DOM), `#phase-timeline` above `#chart-box`. Transitions are read
  chronologically, not assumed "retire then care" — a Person can enter care before a stated `RETIRE`
  date, and `ENTER_CARE` is treated as permanent (`plan.ts`'s own word): once in care, a later
  `RETIRE` changes no boundary. Year ticks bracket the walk's own first/last month plus round years
  at a step chosen from the span, never July-anchored (that is `chartConfig.ts`'s `xAxisTickPlan`,
  for the wealth chart's own reason).
- [x] **P16-2 One headline sentence per phase in Financial Situation (option 3)**, each with a small
  coloured phase label:
  - *Before retirement:* "At 63 you'll have $X in super and $Y in total." (the month of the
    household's, or each person's, retirement);
  - *Retirement:* "You can spend about $Z a year, and the Age Pension starts in 20NN.";
  - *Aged care* (only when an ENTER_CARE exists): "About $W a year in care costs; the $R room
    deposit is refunded to the estate." — ✅ 2026-09-25. `app/financialSituationPhases.ts`, in its own
    new `#phase-sentences` box, placed FIRST inside Financial Situation — the mock-up's own three
    colours reused, but not its three boxes: it painted these sentences INTO
    `income-headline`/`mortgage-headline`/`sustainable-spend` as a shortcut, and TODO.md's own
    instruction ("keep the existing headline") ruled that out for the real build. `Z` reads the LAST
    "Work out what I could spend" result this redraw has run — `undefined` before it runs (the
    sentence says how to get one), and a refusal's own `reason` is shown verbatim. The Age Pension
    year is the first month `AGE_PENSION_LINE` pays in the walk ALREADY on screen — independent of
    the search and of whichever level it settles on. `W` sums `AGED_CARE_BASIC_FEE_LINE` /
    `_HOTELLING_LINE` / `_NCCC_LINE` / `_DAP_LINE` (flowSeries.ts's own `agedCareCosts` group,
    exact-matched) over the first 12 months from the entry's own governing month, each month through
    its own money lens before summing (`flowSeries.ts`'s own rule for adding a year priced at
    different dates). Screenshot compared against the mock at
    `/private/tmp/claude-501/.../scratchpad/p16-full.png` — matches closely.
  All in the page's money basis, whole dollars, plain English. A phase that doesn't occur gets no
  sentence (the absence rule the home loan follows).
- [x] **P16-3** ✅ 2026-09-25. BLOCKER for P16-2's retirement sentence, closed. **The premise in the
  original brief was wrong: a LOWER spend does not fund a RAD worse.** Measured directly — a sweep of
  the demo-couple + $750k-RAD fixture from `k = 0.01` to `k = 4` shows `project()`'s own RAD funding
  monotone in the expected direction (worse at a HIGHER factor, exactly as spending more for thirty
  years before the RAD falls due should make it): every `k ≤ 1` funds it in full, and it is
  `HIGHEST_FACTOR` (4×, genuinely emptying the household before the RAD falls due) that threw
  ("the Waterfall could fund only 962984 of the 78782755 cents"), not `LOWEST_FACTOR`. **The actual
  defect was `sustainableSpend()`'s search architecture**: `walk()` treated that ONE candidate's
  exception exactly like every other refusal — abandon the whole search — discarding the fact that
  `LOWEST_FACTOR` had already passed. Fixed by naming the refusal (`RadPaymentUnfundedError extends
  RangeError`, `projection.ts`, carrying `month`) and catching it specifically in `sustainableSpend.ts`'s
  `walk()`, read back as a FAILING `Verdict` (`shortAt: [error.month]`) in exactly the shape an
  ordinary `SHORTFALL_LINE` month already takes — every OTHER exception `project()` can throw is still
  `'candidateRefused'`, unchanged. **The as-written walk's own $5,505 "Unfunded shortfall" in the RAD
  month is CORRECT, not a second bug**: P14-18's ruling scopes the whole-Waterfall refusal to the RAD
  lump sum alone, and the household's ongoing aged care fees due the same month are a deliberately
  separate, later outflow ("a resident whose fees the household cannot quite meet this month is a
  genuine shortfall, not a reason to refuse the whole plan" — `projection.ts`, P14-18, shipped the same
  day) — the RAD itself is funded in full in that month; a minimal fixture in `test/core-projection-
  aged-care.test.mjs` now pins the two staying apart (an emptied account funds the RAD to the cent and
  still reports a genuine shortfall for the fees). Tests: `test/core-sustainable-spend.test.mjs` §7
  (the solver answers a plan whose top-of-range candidate can't fund a RAD; a sweep confirms no factor
  funds the RAD after a higher one has already failed to), `test/core-projection-aged-care.test.mjs`
  (the refusal is a named class carrying `.month`; the RAD/fee-shortfall separation fixture). Two
  mutations confirmed red (reverting `sustainableSpend.ts`'s catch to the old catch-all; nothing else
  needed reverting since the refusal's own message and door behaviour are unchanged).
- [x] **P16-4** ✅ 2026-09-25. T137's RangeError guard in `projection.ts` deleted — the research
  (`docs/research/p9-2b-part-rate-advances-2026-09-25.md`) proves `heasFortnightlyDrawDuringAdvancePeriod`
  already correct for a genuine part-rate pensioner given the door's own 50% annual advance cap, so the
  guard refused a case the formula had never gotten wrong. Register T137 updated from UNCONFIRMED to
  RESOLVED. A hand-built fixture (`test/assumptions-heas.test.mjs`, labelled: no official Services
  Australia example covers `0 < pension_fn < MPR_fn` during an active advance window) re-derives the
  research doc's own worked numbers — MPR $1,200.90/ft, pension $700/ft, the legal maximum advance
  $15,611.70 lifting the combined payment to exactly MPR — rather than merely quoting them, so a
  regression in the formula itself is caught, not only a regression in the deleted guard.
  `test/core-projection-heas.test.mjs`'s T137 wiring test now asserts `project()` walks the same
  genuinely-part-rate household to a figure instead of refusing. Mutation confirmed red (restoring the
  guard, `test/core-projection-heas.test.mjs`'s T137 test fails on the exact old message).
- [x] **P16-5 — ENTER_CARE/SELL_HOME/RENT_OUT_HOME/HEAS_DRAW money params are stated in TODAY'S
  money, not nominal at the entry's date (register O92)** ✅ 2026-09-25. Fourteen fields across four
  entry types were built treating a household's own estimate of a facility's room price, a sale
  value, a weekly rent or a HEAS security as nominal at whatever date the entry fell — the same class
  of defect O85 closed for the spending level, and it halved a 2056-dated RAD in real terms. Audit
  and full basis table: register O92, `docs/assumptions-register.md` §8.1. Converted through ONE new
  shared lens, `projection.ts`'s `atTodaysMoney` (itself one `inflateStated` call): ENTER_CARE's
  `homeValue`/`radPrice`/`radPaidAsLumpSum` and SELL_HOME's `salePrice`/`sellingCosts`/`newHomeAmount`
  and HEAS_DRAW's `securityValue` raise ONCE, to the entry's (or advance's) own day, and hold there;
  RENT_OUT_HOME's five figures and a STATED `fortnightlyAmount` raise EVERY MONTH, `annualSpend`'s own
  footing, because a rent or a drawn income keeps rising rather than being fixed once. `'maximum'` is
  untouched. P14-5a's own vacated-home carry is corrected in the same change: it now inflates
  `homeValue` from `asAtDate`, not the ENTER_CARE entry's own day, which telescopes into the ONE
  multiplication `inflateStated` already did. Debts (`MortgageRefinanceParams`, `Mortgage.openingBalance`)
  stay nominal, O86's own boundary restated. `parsePlan.ts`'s `checkHeasDraws` gained two of its own
  `inflateStated` calls, raising a STATED `fortnightlyAmount`/`advance.amount` to nominal before
  comparing it against the door's nominal legislated caps. `test/plan-money-basis-inventory.test.mjs`
  §1's call-site count moves from FIVE to EIGHT, each site named and cited. Labels: every converted
  box in `entryForm.ts` says "in today's money"; the entry table's own row text and the chat's
  `listEntries`/`proposeEntries` figures say so too (`statedFigures` reclassified `'nominal'` →
  `'todaysMoney'`; a `Stated` tuple gained an optional own-date, since a HEAS advance's day is not the
  entry's). Every existing hand-worked aged-care/sale/rent/HEAS test whose figures moved was
  re-derived via `inflateStated`/`priceLevelFactor` from the SAME stated cents and dates, never
  re-typed — including two `sustainableSpend`/life-stages fixtures whose RAD needed its STATED figure
  recomputed as the factor's own inverse once the correctly-larger nominal RAD made the old stated
  figure unfundable. Mutation confirmed red: reverting `radPaidAsLumpSum` to nominal-at-entry fails 8
  tests in `test/core-projection-aged-care.test.mjs`. Golden byte-identical — the demo plan holds none
  of these four entry types.

Mock-up: `phase-mock.html` and the screenshot, built from real engine figures (not committed; the
scratchpad of session 2026-09-25).

---

## Show the rules in force (user-requested 2026-09-28, not yet scoped)

- [ ] **The app should show the current rates** — the legislated figures it is using (tax scales,
  Age Pension rates and thresholds, super caps, deeming, …) and the date they apply from. Today
  nothing on screen names the rules' vintage: the Forecast assumptions notice says the legislated
  figures "are not editable anywhere", and the only trace is the per-line `legislated` provenance
  label in the month table. Raised while building `userguide.md` (its chapter "How *enough* keeps
  up with the rules" will describe this view). Read-only; needs a gate on shape (one panel vs.
  per-area) before a build brief
- [x] **Stale help text: the investment payout boxes** (found writing `userguide.md` ch 30,
  2026-09-28). `INVESTMENT_PAYOUT_SUMMARY` / `INVESTMENT_PAYOUT_NOTICE` (`src/app/settingsPanel.ts`
  ~520-540) still say neither box "changes your forecast today" and that tax already paid "is not
  yet counted" — false since P3-22h: `projection.ts` pays the distribution at the year-end true-up
  and credits the franked share. Rewrite both to what the engine does; check for a canary pinning
  the old wording
  **Done 2026-09-28 (P17-3):** both now say the payout is taxed once a year, reinvested, and that the
  already-taxed share reduces the tax; the canary was `test/app-settings-panel.test.mjs`'s "P3-22h — the
  two boxes are asked for in PLAIN WORDS", now inverted to forbid the interim copy

## Phase 17 — The user guide inside the app (approach approved 2026-09-28, SHIPPED 2026-09-28)

*Six rulings from a design interview on 2026-09-28. The guide is **reference**: something you go and read,
not help that sits beside the numbers. It opens in its own tab, and each ⓘ box is a way in.*

- [x] **P17-1** **Convert at build time.** A small script in `scripts/`, run by `npm run build`, turns
  `userguide.md` into `dist/help.html`. The markdown is the only thing anyone edits: no hand-edited
  HTML and no copied-in markdown library. It is served by the app's existing server and works offline.
  The page layout (decided by LIZ, not a ruling): a chapter list on the left, grouped under the six
  Parts, which fold open and closed. "Which chapter do I need?" and the dictionary are pinned at the
  top. There is no search box of our own; the browser's ⌘F does the job.
  **Done 2026-09-28** (`scripts/build-guide.mjs`, last step of `npm run build`): every construct the guide uses converted; the markdown's own Table of Contents is left off the page because the sidebar replaces it.
- [x] **P17-2** **Permanent labels, not chapter numbers.** Each link target in the guide gets a fixed
  name (e.g. `{#investment-payout}`), which can sit on a chapter heading or on a section inside a
  chapter. Links use the name. The build writes the current chapter number and title into the link
  text, so renumbering chapters breaks nothing. **The build fails** when a label an ⓘ box uses does
  not exist in the guide, or when a label appears twice.
  **Done 2026-09-28:** 85 labels (84 chapters + the signpost), all 372 links moved to them; `[N](#…)` in "Chapters 8 to 13" gets the number only, since a full title there reads badly. Code names a page with the string `guide:some-label`; the build scans `src/` for it.
- [x] **P17-3** **Each ⓘ box links to the guide.** Every `infoButton` (56 call sites) may end in
  "Read more → chapter N: Title". Rule: an ⓘ box says *what this box does* in one or two lines. It
  **never restates a figure, a threshold or a rule**; those live only in the guide. This needs a
  one-off pass through all 56 boxes to remove restated rules and figures, starting with the stale
  investment payout item above.
  **Done 2026-09-28:** 49 of 56 call sites link a `'guide:…'` label (13 new section labels) and read their title from `dist/app/guideTitles.js`, which the build writes from the headings; the 7 left unlinked carry engine output (caveats, rule details, notes, the load error), not help, and the 25 rules below left the boxes without the guide stating them.
- [x] **P17-3a** **Rules that left an ⓘ box and are not in the guide yet** (P17-3, 2026-09-28). Each was
  taken out of a box under the "never restate a rule" ruling; the guide should say it, or a person should
  rule it unnecessary. Tests that used to pin them say so where the pin was dropped.
  **Done 2026-09-28:** all 25 written into the chapter/section their box's `guide:` label already
  points to (law cited in plain words, no Act/section numbers; PBLCI/MTAWE named once each); items 4
  and 7 say plainly where the app's own simplification flatters the answer. Every dropped test pin
  found by grepping the P17-3 comments is restored against `guideSection(label)`.
  1. As-at date: moving the date FORWARD past a standing level (a spending level, a retirement) makes it apply from the forecast's first month.
  2. Work Bonus: the law also requires being paid the Age Pension, Carer Payment or DSP; the forecast checks age only.
  3. Employment income: why before tax (the income test assesses gross); the fortnight is Centrelink's assessment period.
  4. At retirement: a pension counts in the assets test at any age and accumulation super only from Age Pension age, so a younger partner can get LESS Age Pension after the switch; a TTR becomes a full pension at the switch; an over-cap account is not split.
  5. Prior retirement-phase pension: it used part of the transfer balance cap and what is left is unknown, which is why the switch is skipped.
  6. Super fees: charged before growth, the percentage and its cap on the month's balance; the dollar fee and cap are indexed and the percentage is not; the pension fee set indexes differently from the accumulation set.
  7. Home: a vacated home past its exemption period is left OUT of the assets test, which understates assets (flatters).
  8. Offset: assessed on the balance the forecast reaches, not the typed one; it always counts in the assets test (settings box and the month table's offset box).
  9. Home loan: nothing is paid into the offset; repayments stop when it is repaid and the last is partial; a home loan is not deducted from assets for the Age Pension and the offset still counts in full (settings box and the month table's "What this figure is").
  10. Mortgage entry: a $0 balance is refused (use "Home loan — pay off in full").
  11. Planning horizon: 100 is the figure the build was designed around.
  12. Nominal return: compounded monthly; it does not touch offset cash, the Work Bonus balance or the home.
  13. Investment holdings: the cost base never changes; growth is added to the value only.
  14. Investment payout: a share of value, not dollars, because a dollar figure understates in the household's favour; a nil typed is refused.
  15. Super income yield: the fund's own (lower) rate, nil in pension phase with the whole credit refunded in cash; a share of the balance, not dollars (flatters); a nil is refused, and the second box alone is refused.
  16. Cash interest: only cash above what is owed on the home loan earns it.
  17. Contingency buffer: a nil typed is refused (empty is "none").
  18. CPI: the All Groups, eight-capital-cities measure; which Age Pension thresholds follow it.
  19. PBLCI/MTAWE: the basic rate rises each 20 March and 20 September by the larger of PBLCI and CPI, then is lifted to 41.76% of MTAWE (anchor $1,833 a week, May 2026); rates are published to 19 March 2027; a stated series overrides the boxes.
  20. AWOTE: the cap moves in $2,500 steps from $32,500 (published for 2026-27 only); 0 keeps it at $32,500; salary-sacrifice amounts are not indexed.
  21. Salary sacrifice: the 20 September 2026 change (the Guarantee now counts) and its worked example; from July 2027 sacrifice plus Guarantee must fit in $25,000 or the plan is refused; only an accumulation account can receive it; the Guarantee is paid on the salary before the sacrifice.
  22. Division 293 election: the law (ITAA 1997 Subdiv 293-B release authority; a release from a pension account would be a commutation).
  23. HEAS: the loan alone gives no Pensioner Concession Card (s 1137A).
  24. Renting out: the home is valued from an aged-care entry's estimate, or the entry is refused.
  25. Downsizer: the $300,000 limit is not raised with inflation.
- [x] **P17-4** **Pip and Jo's figures are checked, not trusted.** Tag each Pip-and-Jo dollar figure in
  the guide. A test runs their plan file and fails when a tagged figure no longer matches the app's
  result, so a person rewrites the sentence around it. The figures are not filled in automatically,
  because the words around a number ("drops to…") can become wrong too. Rule amounts such as caps
  and thresholds are out of scope for now; they can be checked later against `src/data/assumptions/`.
  **Done 2026-09-28:** 79 `{{fig KEY ROUNDING|$…}}` tags over 39 keys, read in `test/userguide-figures.test.mjs` (one reader per key; plan facts, the Before-retirement figures, sustainable spend, Age Pension, the two shortfall what-ifs); every one matches today, so `FIGURES_KNOWN_WRONG` is empty. Not tagged: "By the 2050s, the income test takes over" — `Month` does not say which test binds.
- [x] **P17-5** **Quoted button and box names are checked.** Tag each place the guide quotes the app's
  own wording (e.g. **Change the plan**). The build fails when a tagged name no longer appears in the
  app's code. It uses the same tagging mechanism as P17-4.
  **Done 2026-09-28:** 433 `{{name|…}}` tags, checked against `src/` + `public/index.html` (curly and straight quotes equal). Seven quotes paraphrased the app; LIZ changed the guide to the app's own words, so `NAMES_THE_APP_DOES_NOT_SHOW` is empty (da83017).
- [x] **P17-6** **Screen text cut** (user ruling 2026-09-28: visible text only if it helps with what the user is doing now). **Done 2026-09-28:** the demo couple's rendered page went from 3,702 to 2,655 words; explanations moved into ⓘ details or the guide, the flattering-answer warnings stay on screen in short form, fee rate boxes show a "%" after the box, and the length floors on on-screen lines became "not empty + key phrase".

## Legislation refresh 2026-09-29 — findings that need work

The refresh found every figure in the code matching current law. These are what it found that
the code does not yet do. Research reports: scratchpad of that session (not kept); sources are in
guide Chapter 85.

- [x] **LR-1 CGT from 1 July 2027 (LAW, material; user ruled BUILD IT 2026-09-29. Gate GO, 4 slices. S1 pure calculation DONE; S2 walk + S3 minimum tax must land together; S4 labels/guide).** ✅ 2026-09-29, all four slices.
  **Findings.** S1 split and indexation as separate pure functions; S2+S3 wired them and Div 119 into
  the walk (demo: +$1,615 FY2032-33, +$2,156 FY2033-34, FY2034-35's $1,793 refunded at the July
  true-up once Dana is on the pension). S4: the `Income tax on capital gain` line carries
  `CGT_MINIMUM_TAX_DETERMINATION` where the Person's assessment has a Div 119 gap (a provenance
  change only, no figure); the household panel now writes `valueJustBefore1July2027` (it dropped it,
  so a plan dated after 1 July 2027 could not be re-saved), with a box shown only when the as-at date
  is after 1 July 2027; the chat's `whatCanYouModel` names the unsettled death rule and the forecast
  indexation; the guide lost every "does not model this yet" on CGT and gained the death paragraph;
  Chapter 85 has Div 119 and s 115-30 rows. **Residual:** indexation runs on the plan's flat `cpi`,
  not published quarterly index numbers (labelled on the line).
 Treasury Laws
  Amendment (Tax Reform No. 1) Act 2026 (No 49 of 2026) Sch 1: for an individual, the 50% discount
  is replaced by cost-base indexation for gain after 30 June 2027. ITAA 1997 s 112-155 deems every
  asset held on 30 June 2027 sold and bought back just before 1 July 2027, so the gain to that
  date keeps the discount. New Div 119: a 30% minimum tax on capital gains, not payable in any
  year the person gets the Age Pension or another listed payment (s 119-15), which makes a new
  pension cliff. `projection.ts` `discountedCapitalGain` applies a flat 50% with no date cut-off.
  An exposure draft (Tax Reform No. 3 Bill 2026) may offer another way to split the gain; unconfirmed.
- [x] **LR-2 Retirement item gap can close (user ruled CLOSE IT 2026-09-29).** ✅ 2026-09-29. SIS Regs reg 6.01(7) is now
  read: stopping work at 60 or over is "retirement", Sch 1 item 101. `retirementItemMapping` and
  `ConditionOfReleaseItemNotIdentifiedError` hold the gap; closing it sets the 60-64 fund earnings
  tax case instead of refusing it.
  **Finding.** reg 6.01(7)(b)(i): an employment arrangement ending on or after the 60th birthday
  is a retirement with no further condition. enough's employment ground fires only for a cessation
  at or after Preservation Age (60), so every case it makes out is (b)(i): `retirementItemMapping`
  is now `{ item: '101', ageAtCessation: 60 }`, primary-verified, and `schedule1ItemFor` answers
  101. The refusal had no case left and is deleted; `conditionOfRelease.ts` instead refuses to load
  if Preservation Age were ever below the record's 60. **Not mapped, still refused:** reg
  6.01(7)(a) (preservation age under 60) and (b)(ii) (stopped before 60, retired at 60 only if the
  trustee is satisfied of an intention never to work again, full- or part-time). enough holds no
  intention fact; `CessationBeforePreservationAgeError` keeps (b)(ii)'s window. **No figure moved:**
  nothing in `project()` calls `schedule1ItemFor`, the walk already treats a RETIRE at 60+ as a
  retirement (`retirementPension.ts`), and `trisInterestOrRefuse` still reads the STATED item —
  deriving it there would move every un-stated retiree from the generic refusal to
  `TrisNotificationNotStatedError`, a routing call LR-2 did not make. O59 / U28 closed in the register.
- [x] **LR-1 R1 ruling (user, 2026-09-29): option (b).** ✅ 2026-09-29. **Finding.** No new mechanism
  was needed: the death block already passed every non-pre-CGT parcel to the survivor unchanged, so
  deleting `DeathWithDeferredCapitalGainError` carries the stamp, the deferred gain and the later cost
  base. The discount and indexation clocks read `Parcel.acquired`, which is the original purchase day,
  as s 115-30(1) item 4 requires. No survivor is unreachable (the door refuses a death in a Household
  of one and a second death), so no estate path needed a refusal. No existing figure moved. A
  clock-restarted-at-death mutant cannot even be represented: a stamped parcel with a post-reform
  acquisition day is refused by `realisationFromJuly2027`.
  Original entry: A death after 1 July 2027 with a parcel
  stamped at 30 June 2027: the surviving partner takes it over WITH its deferred pre-2027 gain,
  taxed when they sell (mirrors Div 128 cost-base inheritance). Replaces S2's
  `DeathWithDeferredCapitalGainError` refusal; the guide must say the law has not settled this.
- [x] **LR-2a Derive the TRIS item from the Condition of Release? CLOSED AS MOOT, no code.** ✅ 2026-09-29.
  **Finding.** Retire flow S1 asks the FACT, not the item: choosing Retire asks "stopping work for
  good" or "cutting down with a TTR pension" (`src/app/retireChoice.ts`). For good writes RETIRE,
  and the law derives item 101 from age + cessation (reg 6.01(7)(b)(i), primary-verified in LR-2);
  a user could never answer "which Schedule 1 item". TTR writes a WORK_PATTERN_CHANGE, which is not a
  retirement (item 110). `trisInterestOrRefuse` has no caller in `project()`; the live TTR
  conversion is `retirementPension.ts`, where RETIRE is the notification. So no figure depends on the
  stated item, and there is nothing left to derive. Original entry kept below.
  `trisInterestOrRefuse` limb 2b still reads the item the user states. Deriving it from the
  now-verified item 101 mapping would move retirees with no stated item from
  `TrisRetirementPhaseNotModelledError` to `TrisNotificationNotStatedError`. That changes a
  refusal, not a figure. Offered to the user 2026-09-29.
  **User answer 2026-09-29:** the retire flow must ASK (permanent vs TTR), remind the user to move
  super to an account-based pension and require them to confirm it is done, and allow a return to
  work. Gate running; see "Retire flow redesign" once scoped.
  **User ruling 2026-09-29: the ABP switch HOLDS OFF until the user confirms it is done** (option b,
  against my recommendation of a). Asked whether that applies to future-dated retirements too
  (which could never be confirmed, and would lose the tax-free pension phase) or only once the
  date has passed.
  **Gate 2026-09-29: GO for (a)+the existing `retiredBeforeThePlan` arm, 3 slices** (ask
  permanent/TTR; "converted? Done" writes the ABP phase + commencement via planWithStatedPosition;
  return to work restores pay, new contributions preserved until next retirement at 60+ or 65).
  Proposed to the user as the reading of their ruling: past retire dates hold off until Done,
  future ones switch. Decided by me: reminder clock = today's real date, names the active
  scenario; "for good" before 60 is NOT the 6.01(7)(b)(ii) intention; LR-2a closes as moot.
  **User rulings 2026-09-29:** S4 (a TTR_START entry with a date) — YES. The switch stays an
  "unconfirmed" fact until the user closes the loop, past OR future date. S2 (the Done reminder)
  is HELD: it belongs in the Open Items concept below. S1, S3, S4 may proceed after CGT.
  Gate write-up: session scratchpad gate-retireflow.md.
- [x] **Retire flow S4: `TTR_START`, a dated TTR start (user ruling 2026-09-29, "need a start ttr
  date").** ✅ 2026-09-29 (page path for a salaried Person: the "Employer pays into" select, below). Owner, date, which account, optional rate (4%-10%; blank pays the
  minimum). **Mechanism: a phase change of an account the plan already states, never a new
  account** (the walk cannot open one mid-walk). The user states the money they will move as a
  SECOND accumulation account; the entry names it. The walk reads it as accumulation before the
  date (younger-partner exemption intact) and `'ttr'` from it (paid, assessed and deemed for the
  Age Pension, closed to contributions, earnings still taxed as accumulation), and converts it on
  the existing `conversionDay` map: a later RETIRE (the switch, unchanged) or item 106 at 65. That
  closes the gate's NO-GO (a future `ttr` phase in plan state is assessed from month 0). The
  Guarantee's destination skips a started account, so the other accumulation account is derived;
  a sacrifice into it after the start is refused by name; `TTR_RATE_CHANGE` may name it from its
  start. Door refusals by name: household owner, not accumulation, the employer's nominated
  account, no other accumulation account, before the plan's date, under 60, on or after 65; per
  scenario: on or after that Person's RETIRE, a second start for one account (walk repeats both).
  Retire's "cutting down" answer now writes WORK_PATTERN_CHANGE + TTR_START on the same date when
  no TTR is running, replacing S1's "not built yet" refusal. Offered on its own in the form and to
  chat. No existing figure moved. Not built (held): unconfirmed-fact tracking (Open Items).
  Residual: the amount moved is fixed today as the second account's balance; the split cannot be
  made on the start date itself.
- [x] **Retire flow S3: going back to work after RETIRE (user ruling 2026-09-29, "the user may
  also elect to return to work").** ✅ 2026-09-29. A `WORK_PATTERN_CHANGE` with days > 0 dated
  strictly after the Person's stop is a return: `workSpells` (`retirementPension.ts`) is the one
  expression, read by the walk, the Life stages strip, the still-working warning, the switch and
  chat's HONOURED_ONCE (a Retire after a return is not a second one). The salary pays again, so
  tax, the income test, the Work Bonus and the Guarantee follow. **Law:** reg 6.12(1)/6.18(2)(a)
  keep money accrued by the stop released; new contributions are preserved until the next stop at
  60+ (item 101) or 65 (item 106); the ABP keeps paying. **Mechanism:** the walk tracks release per
  Person, so `gainfulEmploymentAsAt` says not-ceased from the return month until the next stop
  (released the month after) or 65: every accumulation account of theirs is locked from limb 5,
  a stated lump sum and `accessibleWealth`, under-permissive by at most those balances on the
  return day, said in a `back at work` note. While back (and in the re-stop month) an account that
  switched at retirement is closed to the Guarantee, as a started TTR is, so a kept-out account is
  derived as its destination; with none left the walk refuses by name (it cannot open an account).
  A second stop is its own cessation and switches nothing, unless the first stop was before 60 and
  switched nothing, in which case the switch is at the first stop that releases (the 2026-09-23
  ruling applied to the real retirement); a `stopped again` note says so. Refused by name: a return
  in the same month as the stop; a `TTR_START` after a return (lawful under item 110, not
  modelled: which later stop converts it is unbuilt). Life stages shows "Back at work YYYY · age"
  and "Retires again". Flipped `app-plan-edits` "a later work pattern un-retired a retired person"
  (17 → 34 salary months, re-derived: every month from the return equals the zero-day-stop walk to
  the cent). The ordering fixture in `core-projection` chunk 2b now uses a zero-day pattern (its
  three-day one became a return). No demo figure moved. Register §3.9 Finding 2 answered. Not built
  (held): unconfirmed-fact tracking (Open Items).
- [x] **S4 follow-up (2026-09-29, CLOSED): a per-Person "Employer pays into" select** (the Division
  293 election's shape, P6-11) in Household and settings. It lists that Person's accumulation
  accounts as "Super account N (accumulation)" and writes `statedEmployerContributionDestination`
  for the chosen one. ONE condition (`employerPaysIntoShown`: two or more accumulation accounts, salary or
  not — amended by LIZ @ff5574d so a nomination survives saves until a return to work) shows it AND lets it write, like the 1 Jul 2027 box; hidden, it writes nothing (so one
  account writes nothing, the door's default). The blank "Choose an account" option writes nothing,
  so O82's refusal stands for a plan that still names nothing. Guide Chapter 25 (#ttr-start) no
  longer says to name it in `plan.json`.
- [ ] **Open Items — CONCEPT ONLY, user said DO NOT BUILD (2026-09-29).** One list of everything
  the forecast relies on but the user has not recently confirmed: unconfirmed dated actions
  (ABP switch, TTR start, planned sale, downsize, lump sums), overdue legislation re-checks (a
  20 Mar / 1 Jul / 20 Sep change date passed since the last refresh), overdue bank imports, stale
  balances (asAtDate). Principles offered: unconfirmed is a status, not a behaviour — the forecast
  keeps its assumption and the item says what it assumed; every item has one closing action,
  including "not doing this", which feeds the plan; the list never blocks the forecast.
- [x] **RF-1 Return to work locks too much (DONE 2026-09-30, from retire flow S3).** Finding:
  `gainfulEmploymentAsAt` said `{ ceased: false }` for a returner, so EVERY accumulation account was
  locked (limb 5, lump sums, `accessibleWealth`). In law (SISR 6.03, 6.10(1), 6.18(2)) only the
  amount unrestricted at the stop stays cashable, as a FIXED dollar figure; money paid in since and
  all post-stop earnings are preserved. Built per the rulings: per Person per non-pension account,
  the balance at the start of the month of a stop that freed it (the note's `freed` test), less every
  draw to the return, cut to the balance on the return; while back at work cut to the balance after
  every debit and reduced by every draw (entry path and limb 5), never grown; cleared at the next
  stop (which captures its own, used from the month after it), death and 65. A lump sum above it is
  capped to it, the real balance less what was paid written back. `accessibleWealth` adds
  `min(released, balance)`. A stop or return before the plan releases nothing (unchanged). Limb 5
  says so in a new `releasedInPartClaimNote` (registered in `chat/tools/identity.ts`). Evidence:
  `test/core-projection-return-to-work.test.mjs` flips the two "all locked" tests to exact figures at
  6% ($102,956.27 released vs $105,999.94 held on the return; $89,213.18 after a loss at -10%) and
  adds tests that each go red under a mutation: capture at close (M1), released grows (M2), limb 5
  not decremented (M3), capped write-back (M4), no clamp after fees/loss (M5), `accessibleWealth`
  uncapped (M6), set on a stop before 60 (M7), not re-set at the next stop (M8), growth to the
  return released (M9). Words: the `back at work` note, the guide's back-to-work chapter, the
  register (conditionOfRelease section, RF-1 paragraph).
- [x] **RF-2 `TTR_START` after a return to work (DONE 2026-09-30).** Lawful (Sch 1 item 110). Built
  per the rulings: refused only while stopped (the latest `workSpells` change on or before the start
  is a stop), in `parsePlan` `checkTtrStarts`, the walk and `ttrRefusal` (the form counts its own
  cutting-down change as the return); then a new refusal, after the old ones, for an account the
  first stop switched. It converts at the NEXT stop after its start or at 65, whichever is first, and
  that stop converts only the TTR (new note outcome `stopped again, TTR converted`, registered in chat
  identity). Cap-tested with its own balance as a TTR at its Retire is; over it, it runs to 65. A stop
  that is also the first switch names it in `switched`. `ttrStartNeeded` writes a new start after a
  stop unless one exists since it. Limb 5 no longer says "released in part" for such a TTR. A start
  with no earlier stop is untouched (a kept TTR started before the first stop runs to 65, pinned).
  Evidence: `core-projection-return-to-work.test.mjs` RF-2 tests (e.g. $50,000 TTR from 2027-09-01:
  six $138.33 payments, converted 2028-03-01, $830.02 of the year's minimum paid in June 2028; to 65
  with no later stop, 16 payments to 2028-12), `app-retire-choice.test.mjs`; 13 mutations each fail
  a test (first/last stop, no guard, no 65 backstop, any-Retire refusal at the door and in the form,
  no switched refusal x3, every kept account converting, old note text, TTR left out of the cap,
  "released in part" on a TTR). Guide Chapters 18 and 25, register (conditionOfRelease section,
  RF-2 paragraph).
- [ ] **RF-3 A TTR needs a second accumulation account split by hand.** The walk cannot open or
  split an account mid-walk; guide Chapter 25 tells the user. Revisit if the walk ever can.
- [ ] **RF-4 Life stages "Retires ·" label reads a pre-plan stop's plan-start month** (existing
  quirk, noted by retire flow S3; cosmetic).
- [ ] **RF-5 Retire flow S2, the "have you switched to an account-based pension? Done" confirmation
  — HELD by the user** until Open Items (below) is built. Not to be built on its own.
- [ ] **LR-3 Low income super tax offset (LISTO) not modelled at all** — today $500; from 1 July
  2027 a $45,000 threshold and $810 maximum (C2026A00008 Sch 4). Only matters for a partner
  earning under the threshold.
- [ ] **LR-4 Aged care accommodation supplement restructure — announced for 20 March 2027, not yet
  law.** Top tier $77.30 a day; `agedCare.ts` holds one $73.73 figure. Wait for the instrument.
- [ ] **LR-5 The rate that turns a room deposit into a daily payment (MPIR) is to be replaced by 1
  July 2027 — announced, not law, no formula published.** The guide carries a caveat; revisit at
  the next refresh.
- [ ] **LR-6 Seventeen appendix links (AustLII, DSS Social Security Guide) refuse automated
  checks (403).** They were checked through Internet Archive copies up to 15 months old; the user
  should open one or two in a browser to confirm they still load.

## Phase 18 — Try changes: a slider sandbox over the chart (designed 2026-09-30, SHIPPED @22c2551)

*Rulings from a design interview on 2026-09-30. The idea: play with a few big choices against the
chart, then keep the version you like. **A sandbox is an unsaved child Scenario.** It needs no new
engine code and no second way of stating changes, and "save" means giving it a name.*

- [x] **P18-1 The model.** The sandbox is a child `Scenario` (`parentId` = the selected Scenario),
  held in memory only and never written to the plan file. Each slider writes entries into it:
  - it switches the parent's entry off via `entryOverrides`;
  - it adds its own replacement to `entryIds`.

  Its entries come after the parent's, so they win (`effectiveEntryIds`). Parent edits made while
  the sandbox is open flow through live, exactly as for a saved child.
  — ✅ 2026-09-30 built as `sandbox.ts`'s `sandboxCandidate`, one whole candidate `PlanFile` through `parsePlan`; a replacement keeps the parent entry's fields under a new id and `createdAt` (and drops `origin`), and an unmoved slider writes nothing, so an untouched sandbox is an empty child.
- [x] **P18-2 Three sliders, entry-based only (ruling: no Settings levers).** Return and CPI are
  plan-wide Settings, and a Scenario cannot hold them, so they could not be saved. "What if returns
  are lower?" is a separate future feature, not a slider whose effect disappears when you save.
  - **Retirement age:** moves each existing `RETIRE` entry. A household `RETIRE` gets one slider;
    per-person entries get one slider each. Shown as an age, in 1-month steps; the range runs from
    next month to age 75.
  - **Spend level:** one ×% factor applied to EVERY `SPEND_CHANGE`, per the P10 ruling that a phased
    plan is never flattened. The range is 50–150%. The label shows the resulting first-year spend in
    whole dollars.
  - **Refinance loan amount:** moves `openingBalance` on the Scenario's `MORTGAGE_REFINANCE`. The
    range runs from $0 to 2× the parent's figure, in whole dollars. If the Scenario has several
    refinances, the slider moves the earliest; confirm this at the gate.
  - **A slider with nothing to move is greyed with its reason** (e.g. "No refinance in this
    scenario"). It never invents an entry: adding one is the entry form's job.
  — ✅ 2026-09-30 earliest enabled per owner via `scenarioEntries`; spend replaces only ENABLED `SPEND_CHANGE`s. Rulings taken in the build: a household `RETIRE`'s range ends when the FIRST Person turns 75, every range is widened to include where the entry already sits, and $0 on the refinance is left to `parsePlan`'s own nil-`openingBalance` refusal (shown by name) rather than clamped.
- [x] **P18-3 The chart shows the pair only.** While the sandbox is open the Compare chart draws the
  parent and "Sandbox (unsaved)" and nothing else. `comparisonSeries` only finds a crossover for a
  single pair on screen (`scenarioSelection.ts` header). The ticked set is restored on close.
  — ✅ 2026-09-30 `main.ts`'s `sandboxPair` takes the Compare chart while open and the picker is hidden; the ticked set is never written, so it is simply what comes back. The chart view is switched to Compare on open and restored on close.
- [x] **P18-4 Four figures beside the sliders:** Selected | Sandbox | difference.
  - Money lasts until (`shortfallAge`): live.
  - Living on the Age Pension alone from (`pensionOnlyAge`): live.
  - Mortgage paid off (`mortgagePayoff`): live.
  - Sustainable spend: about 18 walks, around 1 s. Work it out about 0.5 s after dragging stops and
    show "updating…" until it lands. Never compute it on every drag step.
  — ✅ 2026-09-30 `sandboxFigures` + `sustainableRow`; the search runs 500 ms after the last input, the parent's once per plan, and an unmoved sandbox reuses the parent's answer instead of a second 18-walk search.
  — LIZ page check 2026-09-30 (headless, demo couple): one 498 ms long task after a drag stops, nothing during it. At 110% spend the gap read "−$2", which is solver noise: gaps within `RESOLUTION_CENTS` ($12) now read "same". **Sustainable spend does not move with the spend slider, by design:** the search scales the same levels by its own factor, so it is invariant under a uniform pre-scale. It moves with retirement and the loan.
- [x] **P18-5 Live while dragging: measured feasible.** `project()` on the demo couple takes about
  60 ms (56–72 ms warm, 107 ms cold, 2026-09-30). Redraw at most once per animation frame, and
  always draw the position the slider stops at. The parent's walk is cached, so only the sandbox
  re-projects. **Re-measure on the user's real plan at the gate**, since it has more entries than the
  demo.
  — ✅ 2026-09-30 one `requestAnimationFrame` per burst reading the positions when it fires; the parent's walk is `main.ts`'s cached `walks`. A frame is `parsePlan` + one walk: 110–124 ms cold on the demo couple plus a refinance (2026-09-30).
- [x] **P18-6 Refusals blank, not stale.** If a combination can't be forecast (e.g. retiring
  before an existing `TTR_START`, a known refusal), the Sandbox line and its figures go blank and
  the refusal is shown by name. The last good figures are never left on screen looking current.
  — ✅ 2026-09-30 both doors refuse by name: `sandboxCandidate` catches `parsePlan` and `sandboxWalk` catches `project()`. Found: retiring before a `TTR_START` is refused by `parsePlan`, not the walk. The pair falls back to the parent's line alone and the sandbox column blanks.
- [x] **P18-7 Save as scenario.** It asks for a name, then writes through the existing `save` door
  (`parsePlan` then `project()`). The result is a **live child of the parent** (ADR-0002): it
  stores only the slider entries and switch-offs, never a copy. The saved Scenario becomes the
  selected one and the sandbox closes.
  — ✅ 2026-09-30 `sandboxSaved` renames the child, keeps `parentId`, selects it, and goes through `main.ts`'s own `save`; the panel then closes. Round trip through `parsePlan` pinned in `test/app-sandbox.test.mjs`.
- [x] **P18-8 Leaving with unsaved changes (ruling: ask).**
  - If any slider has moved, switching Scenario asks **"Save these changes as a scenario, or
    discard?"**. If none has moved, it switches without asking.
  - Slider positions never carry over to another Scenario: "+2 years" means something different
    there.
  - A page reload with moved sliders gets the browser's leave-page warning. Nothing is kept between
    sessions.
  — ✅ 2026-09-30 only the Scenario panel is handed the asking save (`saveAskingFirst`), since it is where the selection changes; OK saves then switches, Cancel discards, and cancelling the name prompt stays put. Closing the panel with moved sliders asks the same question. `beforeunload` warns.
- [x] **P18-9 Parent edits remove a slider's target.** If the parent's refinance or `RETIRE` is
  deleted while the sandbox is open, that slider goes grey and its change is dropped, with a
  one-line notice.
  — ✅ 2026-09-30 `reconcilePositions` keys each slider on its target entry's id, so a target that changed or went drops that slider's change with a one-line notice and the slider greys.
- [x] **P18-10 Gate — GO (LIZ, 2026-09-30).** Findings:
  - **Timing:** measured on a real household plan (35 entries, 12 Scenarios, resolved through
    `scenarioEntries`). Each Scenario takes 49–114 ms (the first, cold run is 112 ms). Live dragging
    stands.
  - **Which entry each slider moves:** in that plan every Scenario has exactly ONE enabled
    `RETIRE` (household) and at most one enabled refinance. Ruling:
    each slider moves the **earliest enabled** entry of its kind per owner, and later ones (e.g. a
    second `RETIRE` after a return to work) are left alone. If a move puts dates out of order, the
    forecast refuses and P18-6 shows the refusal by name.
  - **The age label for a household `RETIRE`** shows every person's age at that date, e.g.
    "Alex 63y 0m · Sam 61y 0m", because a couple is never reduced to one age (the P7 ruling).
  - **Validation:** the sandbox is best built as a whole candidate `PlanFile` (the plan plus the new
    entries plus the child Scenario). That way `parsePlan`, `scenarioEntries` and `save` all take it
    unchanged, and Discard simply drops the candidate.
  - **Placement and guide text:** left to the build, under the screen-text rule.

## Parked — not scoped

- [~] Monte Carlo and sequencing risk — excluded on merit; deterministic answers the actual
  questions. **Still parked as at 2026-09-04.** The Glide Path (P2-11) is *not* a partial entry
  for this: phased deterministic returns are one input and one reproducible projection, where a
  distribution is a different method with a different verification story
- [~] ~~CGT and franking credits — nothing outside super to tax~~ — **both un-parked 2026-09-04**,
  in two steps and for different reasons:
  - **CGT is no longer parked.** It is v1 scope, as **P3-21**. Admitting the Non-Super Portfolio
    (P3-20, ADR-0009) made the stated reason false — it described a balance sheet, not a rule, and
    it expires the day the Household buys its first ETF. A bridge modelled without its tax
    overstates spendable money in exactly the years the bridge is the answer, and the tax has to be
    in place *before* the money is, or the tool cannot be consulted about committing it. The fresh
    argument was made and accepted; this is that mechanism working, not scope creep
  - ~~**Franking credits stay parked**, on a replacement reason since the original died with
    CGT's: distributions are modelled as cash without imputation, understating after-tax return on
    Australian equity in the conservative direction, for a second rules area's worth of gross-up,
    offset and refundability. Reopen if the portfolio ever becomes the main holding (P3-21e)~~
  - **Franking credits are no longer parked either — un-parked 2026-09-04, the same day, on a
    user ruling that overturned the replacement reason above.** They were parked twice and both
    reasons are now dead. The first, shared with CGT, was *"nothing outside super to tax"*, which
    described a balance sheet and expired with it (P3-20, ADR-0009). The second, written to
    replace it within the hour, was that distributions modelled as cash understate after-tax
    return **in the conservative direction** — true, and the wrong test. Conservatism is sound for
    a figure nobody is deciding on and wrong for the figure being decided: the understatement is
    of the order of **1.0–1.5% a year** on Australian equity and is **systematic in one
    direction**, so it tilts the sacrifice-versus-invest comparison (P6-8) toward super — the
    comparison ETFs were admitted to inform. ⚠️ The condition of entry is that franking is
    modelled on **both** sides: a fund pays 0% in Retirement Phase and has the credits refunded in
    cash, and 15% in Accumulation Phase, which they offset. One side only is a different wrong
    answer, not a partial one. Now **P3-22**, with **P3-7a/b** on the super side, **P6-8d** on the
    comparison, **P13-8** for verification, and **P1-11** for the figures — the last of which
    closed **2026-09-04**, landing the figures in register §5A
    ([ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md))
  - **The double-parking is kept above, struck through rather than deleted, because it is the
    point.** A parked entry can be re-parked on a fresh reason and still be wrong, and the record
    of how long the second reason survived — hours — is what makes the mechanism honest instead of
    decorative
- [~] Investment property — not held, and **that is no longer the load-bearing half of the reason**
  (2026-09-04). A listed portfolio is not held either and it is in scope as a capability (P3-20), so
  what keeps property out is the rest: negative gearing, rental income, land tax, stamp duty, and an
  indivisible asset with its own means-test treatment — a rules area of its own, none of which
  follows from supporting an ETF. P3-20 admits liquid holdings with a per-parcel cost base and
  extends no further
- [~] Sell-to-rent — Rent Assistance caps ~$5,400/yr against losing an exempt asset

*Each would need a fresh argument to enter scope. CGT got one on 2026-09-04, and franking credits
got two the same day — one to kill the original reason and one to overturn the replacement. A
reversal needs a better argument than the entry it reverses, not merely a newer one.*
