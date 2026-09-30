# `enough` — a personal Australian retirement & cashflow forecaster

**Concept document.** Written 2026-09-03, revised after a design interview the same day, and
again on 2026-09-04 to fold in an accepted design amendment — §5.12, §5.13 and
[ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md) are the substantive additions.
Terminology is defined in [CONTEXT.md](./CONTEXT.md); decisions in [docs/adr/](./docs/adr/).

## 1. What this is

A local, interactive tool that forecasts a couple's financial position in the Australian
market — superannuation, transition to retirement, Age Pension, mortgage and cashflow — and
lets what-if scenarios be built as dated **Journal Entries** and compared side by side.

### What it answers

Three questions, one engine:

| | Question | How |
|---|---|---|
| a | Does the money last? | **Shortfall Age** — when the Income Waterfall can no longer meet the spending target |
| b | What can we sustainably spend? | Binary search over (a) — ~20 projections |
| c | Is Scenario A better than B? | The comparison chart. This is the frame; (a) is the headline metric |

(b) is affordable only because `project()` is pure and a run costs microseconds. That makes
side-effect freedom a hard constraint, not a preference.

### The situation being modelled

| | |
|---|---|
| Household | Couple, both modelled to a **Planning Horizon of 100** |
| Super | The only substantial asset |
| Non-Super Portfolio | **Supported, and currently empty.** No ETFs and no other investment outside super are held today; the model carries the pool anyway — the pre-60 **Liquidity Bridge**, assessable and deemed from the first dollar |
| Offset Account | Exists; part of the bridge as well as a mortgage reduction |
| Mortgage | Owner-occupied, interest not deductible |
| Home | Shelter, and the late-life reserve behind HEAS — not part of the bridge |
| Contingency floor | **$100k** intended — a *continuous* constraint, not an end-state target. **Stated, never defaulted** (`Settings.contingencyFloor`, 2026-09-21): it is in today's money, and left empty the band is not drawn and no breach is counted, because no figure about this household's own appetite for risk may be guessed |

All figures above are **inputs, not constants** — the model is built for the whole range, not
for one point on it. In particular it must handle both sides of the Age Pension assets cut-off
gracefully, since which side you land on is an output.

**The Non-Super Portfolio is a capability, not a holding.** The Household owns no investments
outside super today — only the Offset Account — and expects to own none until a deliberate decision
changes it. But ETFs are a vehicle under consideration, so the pool is first-class in the model
**from the start and defaults to empty**.
Zero is a supported state: with nothing in it the projection is exactly what it would have been
without the pool at all. It is built ahead of the money because the decision to put money there is
one of the questions the tool exists to answer, and a model that only supports non-super assets
once they exist can never be asked whether to acquire them. See §5.12 and
[ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md).

The contingency floor is for late-life costs, so it must hold at *every* age. The
sustainable-spend solver respects it throughout and the chart draws it as a floor the balance
never crosses — an end-state check would be the wrong constraint.

**This shapes everything.** With super as the dominant asset and a 33-year retirement:

- **Age Pension accuracy dominates the answer**, well ahead of the return assumption. The
  means-test logic is the load-bearing calculation, not one section among many. A bridge measured
  in a few hundred thousand dollars does not change that — it is not large enough to displace the
  means test, and it is assessable, so it feeds straight back into it.
- **Retiring before a Condition of Release is fundable only with a bridge, and the question is
  how long a bridge reaches.** Revised 2026-09-04: the Non-Super Portfolio is a modelled pool, so
  stopping work at 55 is a scenario the engine prices rather than refuses — and on today's
  holdings it prices it at *not long*, because the pool is empty. Before 60 the sources are
  salary, a TTR (which requires still working), and whatever bridge has been built by then. See
  §5.12 and [ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md).
- **Two central questions now, not one.** "Discharge the mortgage from super" keeps its place,
  and beside it sits **salary sacrifice into super versus invest outside it** — the question that
  decides whether the bridge ever gets built. It turns on the 15% contributions tax, the CGT
  discount, the lockup to Preservation Age, and the means-test asymmetry that makes a younger
  Person's accumulation account invisible where an ETF is deemed (§5.12).
- Survivorship never fires in the base case, so it is a what-if, built last.

### Phasing and exclusions

**Phase 2:** full aged-care modelling — means-tested care fees, accommodation payments, Support
at Home. Deferred because it is a *second means-testing system* that treats the home differently
to the Age Pension test, and because **no free reference tool exists to validate it against**.
It is the one component that would be both unverifiable and entangled with everything else if
built into v1.

**Excluded:** Monte Carlo and sequencing risk; investment property; selling to
rent — Rent Assistance caps at ~$5,400/yr for a couple against converting an exempt asset into an
assessable one plus a permanent CPI-linked expense.

**No longer excluded — CGT, un-parked 2026-09-04.** It was parked for one reason, "nothing outside
super to tax", and that reason described a balance sheet, not a rule: it expires the day the
Household buys its first ETF, and building the tax in afterwards means building it in under
pressure. Drawing a taxable ETF down
through a Liquidity Bridge realises gains, and modelling the draw without the tax overstates
spendable money in precisely the years the bridge is the whole answer. It is a substantial rules
area and it enters scope deliberately rather than by implication: §5.12, TODO P3-21,
[ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md).

**No longer excluded — franking credits and dividend imputation, un-parked 2026-09-04**, the same
day and by the same mechanism, one ruling later. Franking was parked alongside CGT on a single
shared reason, "nothing outside super to tax". When that reason died, franking was re-parked on a
*replacement* argument — distributions modelled as cash without imputation, understating after-tax
return in the conservative direction — and that argument has now been **overturned**. Erring
conservative is sound for a figure nobody is deciding on and wrong for the figure being decided:
franking on an Australian equity ETF is of the order of 1.0–1.5% a year of return the model would
never see, and the omission is systematic in one direction. It pushes the sacrifice-versus-invest
comparison toward super — the exact comparison the Non-Super Portfolio was admitted to inform, so
the model would be thumbing the scale on the question being asked.

⚠️ **It is modelled on both sides, or it is worse than not modelling it.** Franking attaches to
Australian equity income wherever that income arises, and inside super it is arguably stronger: a
fund pays **0%** on earnings in Retirement Phase, so the credits are refunded to it in cash, and
**15%** in Accumulation Phase, which they largely or wholly offset. Model the non-super side alone
and the comparison is still biased, only in the other direction. §5.14, TODO P3-22,
[ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md). No franking figure is
sourced yet and none is hard-coded until it is (§6, P1-11).

## 2. Form factor: a browser app served locally

TypeScript compiled by `tsc` to native ES modules and served as-is; Chart.js vendored as a
committed file and imported by relative path; state in a single JSON document on disk. No
bundler, no framework, no accounts, no cloud. One dev dependency, `typescript`, and nothing at
runtime. Tests run on `node:test`. See
[ADR-0007](./docs/adr/0007-served-locally-over-http.md).

**Served, not opened.** The app runs at `http://localhost`, never from `file://`. Chrome gives a
`file://` page an opaque origin and refuses to load ES modules across it, so the "double-click
`index.html`" form factor was never actually available — it contradicted the ES modules this
document has specified from the start. A **~40-line Node server** (`node:http` + `node:fs`, zero
runtime dependencies) closes it: it serves the static files and reads and writes `plan.json` and
`ledger.json` on disk. That is the whole server. It holds no state, computes nothing, and
contains no application logic — the browser is pure UI, and an origin provider is not a data
intermediary.

**The plan file is the working file.** There is no localStorage store and no browser file-picker
dance: the app writes through to `plan.json` on every change, and any text editor can read it.
Export is a separate verb — a dated snapshot, taken deliberately, for archiving or handing to
someone else. See [ADR-0008](./docs/adr/0008-the-plan-is-a-json-file-on-disk.md).

**No network dependency at runtime**, and the plan file is readable without the app. That is the
durability requirement — not that a 2026-vintage binary still runs in 2031. It should not: its
tax brackets, pension rates and deeming figures would be five years stale and it would answer
confidently anyway, which is the exact failure this project is organised against. What has to
last is the data.

**Why not a spreadsheet.** The journal decides it. In a sheet, "extra $20k contribution in
Mar-2029" can only be a hand-edited cell — there is no way to keep entries as *data* separate
from the projection. Multi-scenario charting points the same way: a sheet needs one tab per
scenario plus manual chart-range editing every time a scenario is added.

**What that costs, and the mitigation.** A sheet gives auditability free — click a cell, see
the formula. A web app must earn it. **In v1 scope, ahead of the chart:** render the full
month-by-month table, every row expandable to opening balance, each inflow/outflow, and which
Journal Entries applied. Without this the tool is a black box, and it will not be trusted for a
decision as large as discharging a mortgage.

## 3. Prior art — why build at all

Nothing free does {TTR days-per-week + mortgage + dated entries + N-scenario overlay +
local-only}:

| Tool | Gap |
|---|---|
| ASIC Moneysmart retirement planner | Best AU rules available, but single-shot: no saved scenarios, **no mortgage at all**, no export |
| Moneysmart account-based pension calc | Scoped to <2 yrs from retirement, excludes Age Pension, no TTR-while-working |
| Super fund TTR calculators (ART, Aware, HESTA) | Correct on TTR tax, but locked to that fund's fees, no non-super assets, no mortgage |
| ProjectFi | Closest fit — dated events, scenario comparison, AU-specific — but paywalled and **cloud-account only** |
| AU FIRE spreadsheets | Free and auditable, but single-baseline; a what-if means duplicating the whole sheet |
| ProjectionLab | Exactly the right UX, but US-tax-shaped and subscription |

## 4. Domain model

See [ADR-0002](./docs/adr/0002-journal-entries-as-overlay.md) for the reasoning.

- **Baseline** = base inputs only. A **Scenario** = Baseline + an ordered, append-only list of
  Journal Entries. Never mutated.
- **Scenarios inherit:** `Scenario = { id, name, parentId, entryIds[], entryOverrides? }`, so
  "extend mortgage" and "…+ discharge from super" provably share the first entry. Inheritance is
  **live and by reference, never a copy**: a clone starts with an empty `entryIds` and resolves its
  parent's on every read, so an entry added to the parent afterwards applies to the child too.
- **A Scenario can switch an inherited entry off without touching it.** `entryOverrides` maps an
  entry id to a boolean, resolved up the `parentId` chain with the **nearest** statement winning and
  the entry's own `enabled` as the base. An absent key means "inherit", and an absent map means the
  Scenario states nothing — so a plan file written before this field round-trips unchanged. The map
  is tri-state on purpose: a child can switch an inherited entry back **on** as well as off, which a
  disable-only list cannot express. Copy-on-write forking of the entry was rejected — it breaks live
  inheritance silently at the moment of a toggle, and is not reversible.
- **Journal Entry:** `{ id, date, owner, type, params, note, enabled, createdAt }`, plus an optional `origin` — `{ question, reply, model, date }`, the chat turn behind an entry accepted from a chat suggestion (P15-13, plan_ai.md §7.3). Provenance only: the projection never reads it.
  `enabled: false` is the append-only-safe delete. `owner` is mandatory — `personA` |
  `personB` | `household`. The entry's `enabled` is the POOL's answer and a Scenario may override
  it; nothing outside `scenarioWalks.ts` reads one without the other.
- **Two kinds of base input.** *Settings* have no date and hold throughout (returns, CPI, wage
  growth, Planning Horizon). *Dated Parameters* are events wearing a parameter's clothes
  (retirement age, TTR start, TTR days/week) and **resolve into synthetic Journal Entries**
  before projection, so there is exactly one mechanism. An explicit entry supersedes the
  synthetic one.
- **Time:** monthly ticks, with the financial year as a first-class boundary — caps reset,
  1 July balances snapshot, minimum drawdown recalculates.
- **Money:** integer cents. **Computed nominal, displayed in today's dollars** — see
  [ADR-0001](./docs/adr/0001-nominal-dollars-internally.md). Three knobs required: **CPI**,
  **wage growth (AWOTE)**, and **deeming rates as a manual policy input** (they are ministerial
  discretion, not an index).
- **Income Waterfall:** salary → Account-Based Pension (its minimum is a **floor**, not a ceiling)
  → **Non-Super Portfolio** →
  Offset Account, with Age Pension applied wherever assessed. Draw super above the minimum only
  when the spending target demands it — over-drawing into cash is worse for both earnings tax and
  the means test. ~~Offset is last on purpose~~ — **superseded 2026-09-19: released superannuation,
  drawn after the Offset, was added to the Waterfall (`WATERFALL_LIMBS`). The design reason
  below stands and is why the Offset is still drawn ahead of every pool reachable before a Condition
  of Release.** `WATERFALL_LIMBS` now lists seven limbs, and released superannuation is the last of
  them — ~~a fifth limb~~ as of 2026-09-19, it grew to seven on 2026-09-23, when idle cash and the
  Account-Based Pension were each split into two limbs — a dollar there earns the mortgage rate
  risk-free and untaxed, which makes it the most expensive dollar in the Household to spend (§5.12).
- **Home Status, not home value.** The home carries a time-varying exemption status derived each
  month from entries — occupied / vacated with a Protected Person / vacated with nobody /
  sold — and its means-test treatment follows from that. See
  [ADR-0005](./docs/adr/0005-home-is-a-status-not-a-value.md). Every month reports
  `protectedAssets` and `assessableAssets` separately, and the Age Pension consumes only the
  assessable figure. This is v1, not phase 2: the two-year exemption clock is an Age Pension rule
  and applies whether or not aged care is ever modelled.
- Each month records `appliedEntryIds[]` plus a line-item breakdown.

### Entry types

| Type | Owner |
|---|---|
| `RETIRE` | person |
| `WORK_PATTERN_CHANGE` | person — days/week; how TTR is expressed |
| `SUPER_CONTRIBUTION` | person — concessional flag, recurring flag |
| `LUMP_SUM_FROM_SUPER` | person — gated on Condition of Release |
| `TTR_START` | person — from a date, one of the person's accumulation accounts becomes a Transition-to-Retirement pension (interestIndex, optional drawdownRate); it converts to a full pension at a later `RETIRE` or the 65th birthday. The account must be a second one: the employer's Guarantee still needs an accumulation account. Refused before 60, on or after 65, before the plan starts, and on or after that person's `RETIRE` |
| `TRIS_EARLY_CONVERSION` | person — an early, user-stated day a Transition-to-Retirement interest converted to a full Retirement Phase pension, honoured only before that person's 65th birthday |
| `TTR_RATE_CHANGE` | person — a new yearly drawdown rate (4%–10%) for one Transition-to-Retirement interest, from a date until another replaces it; a change mid-year re-sets that year's remaining payments |
| `INSURANCE_COVER_CHANGE` | person — P3-17a slice 3: cancel or scale back the death, TPD or both cover on one super interest from a date; interestIndex, benefit, coverFraction (0 ≤ f < 1, 0 cancels); that benefit's premium is × f from then on, a later change for the same interest and benefit replaces it, and the insurance admin fee stops once both premiums are nil; raising cover (f ≥ 1), an interest with no premium for the benefit, and a date on or after the owner's 70th birthday are refused |
| `MORTGAGE_REFINANCE` | household |
| `MORTGAGE_TARGET` | household — a dated payoff or offset milestone, checked against the retirement date and drawn as a marker |
| `MORTGAGE_PAYOFF` | household — pay the home loan off in full in this month: the whole balance plus that month's interest, out of cash; the loan's terms stay, so a later `MORTGAGE_REFINANCE` is a new loan |
| `NON_SUPER_INVESTMENT` | person — buy into or draw from the Non-Super Portfolio; a draw realises CGT |
| `RETURN_CHANGE` | person — a new investment return assumption from a date; a user-stated entry, not synthesised — see §5.13 |
| `SPEND_CHANGE` | household — phasing, seeded by optional go-go/slow-go/no-go presets |
| `ONE_OFF_EXPENSE` | household — car, travel, roof |
| `CONTRIBUTION_SPLIT` | person → person |
| `SPOUSE_CONTRIBUTION` | person → person |
| `DOWNSIZE` | household — sell and rebuy cheaper; releases equity, starts the 24-month proceeds window |
| `VACATE_HOME` | person/household — **v1**; changes Home Status and starts the 2-year Age Pension clock |
| `DOWNSIZER_CONTRIBUTION` | person — P9-5: up to $300k of home sale money into the owner's own accumulation account, today's money raised to the date (the cap is not indexed); amount, receivingInterestIndex, statedOwnedTenYears (must be true, not checked); needs a SELL_HOME in the same scenario, 55+ on the date, within 90 days of the sale, once per Person, the couple's total at most the sale price; paid from the set-aside first, then through the Waterfall, refused if it cannot be paid in full; no contributions tax, no cap, no deduction; in TSB through the next 30 June balance |
| `HEAS_DRAW` | household — start/stop a Home Equity Access Scheme income stream or advance |
| `DEATH` | person — what-if only; built last |
| `ILLNESS_SEPARATION` | household |
| `ENTER_CARE` | person — Phase 14 slice 3a: move into permanent residential aged care; homeValue, radPrice, radPaidAsLumpSum |
| `SELL_HOME` | household — P14-13: sell the home outright; salePrice, sellingCosts (optional); proceeds net of the mortgage and any Home Equity Access Scheme debt land in cash, and the household becomes a non-homeowner from that date, UNLESS newHomeAmount (optional, P14-13c) sets part of the net proceeds aside for a new home — excluded from the Age Pension assets test and homeowner-treated for up to 24 months, still deemed at the lower rate only; the window closes unconditionally at 24 months; a purchase ends the window through a BUY_HOME entry |
| `RENT_OUT_HOME` | household — P14-13: rent the whole home out from a date to an optional end date; weeklyRent, annualRates/annualInsurance/annualAgentFees/annualRepairs (all optional except weeklyRent); net rent is assessable income for tax, the Age Pension and aged care (never deemed, floored at nil for the two means tests but not for tax); the home becomes an assessable, non-homeowner asset once nobody protects it, valued from an ENTER_CARE entry's own estimate or refused if none exists; a later SELL_HOME more than 6 years after this date is refused |
| `BUY_HOME` | household — P14-19: buy a new home after a SELL_HOME in the same scenario; purchasePrice, purchaseCosts (optional, stamp duty and fees), both today's money raised to the settlement date; paid first from the sale's set-aside, then through the Waterfall, refused if it cannot be paid in full; the household is a homeowner again from that month and the sale-proceeds exemption ends; a first home without a sale, and a second purchase, are refused |

Spending presets **generate visible entries** rather than applying a hidden curve, so every
step can be seen and overridden — see
[ADR-0004](./docs/adr/0004-the-tool-proposes-you-dispose.md).

### Spending history

The forecast's largest single input is the spending figure, and guessing it wastes more accuracy
than any tax rule recovers. So the tool derives it from observed history rather than assumption.
This is a distinct kind of data — **observed, past, append-only** — as against the computed
forecast, and it must not be conflated with it.

- **Sources:** CSV import for bulk, manual entry for cash and corrections. No cloud means no
  bank API. Imported Transactions live in `ledger.json`, a **separate file** from the plan, and
  are the most sensitive data in the project — a plan file can be handed to an adviser, a ledger
  cannot. `.gitignore` covers both files and the import formats they arrive in.
- **Categories:** fixed top level — **Committed** / **Discretionary** / **One-off** — with
  user-defined subcategories beneath. The top level is fixed because the projection depends on
  it: the mortgage leaves Committed at payoff, and spending presets act on Discretionary only.
- **Categorisation:** saved rules *suggest* in bulk and are reviewed before commit. A rule never
  silently reclassifies data already categorised.
- **Derived Baseline:** trailing 12 months, with One-off items excluded from the recurring
  figure and re-added as their own amortised line — otherwise a single new roof lands in ongoing
  monthly spend and makes the forecast permanently pessimistic.
- ⚠️ **History is in past nominal dollars.** The derived baseline must be inflated to today's
  dollars before it becomes a Setting, or the longer the history imported, the more it
  understates current spending.
- The baseline is **offered and accepted, never silently bound**.

## 5. Rules to encode

All figures FY2026-27, verified 2026-09-03 against ato.gov.au and servicesaustralia.gov.au
unless flagged in §6.

### 5.1 Access — the most important rule in this model

Preservation age is **60 for everyone** — safe as a constant. **But age 60 alone does not
release super.** Ages 60–64 require a Condition of Release: ceasing gainful employment with no
intent to return to ≥10 hrs/week, or ceasing any employment arrangement after 60. Age **65** is
automatic regardless of work status.

⇒ Carry **`met_nil_cashing_COR` as a boolean independent of age**, per person. This is the most
common modelling error in the domain, and it is the gate on discharging the mortgage from
super. Benefits from a taxed source paid at 60+ are tax-free.

### 5.2 TTR

| Rule | Value |
|---|---|
| Minimum drawdown | 4% of 1 July balance (under 65) |
| **Maximum drawdown** | **10%** — exceeding it voids the income stream for the year |
| Fund earnings tax, TTR | **15%** (no ECPI) |
| Fund earnings tax, retirement phase | **0%** |
| Payments at 60+ | Tax-free, no PAYG |

Converts to retirement phase at 65, or on the date the member **notifies the fund** — not the
date they retired. On conversion the 10% cap falls away, ECPI starts, and a transfer balance
cap credit arises at that day's value.

### 5.3 Contributions and caps — all strictly individual

| Item | FY2026-27 | Config? |
|---|---|---|
| Concessional cap | $32,500 | yes — AWOTE, $2,500 steps |
| Non-concessional cap | $130,000 | yes — 4× concessional |
| Contributions tax | 15% | constant |
| SG rate | 12% | yes |
| Carry-forward concessional | TSB < $500,000, 5-year lookback, oldest first | yes — **not indexed** |
| Bring-forward by TSB at 30 Jun 2026 | <$1.84m → $390k/3y; $1.84–1.97m → $260k/2y; $1.97–2.1m → $130k; ≥$2.1m → nil | yes — **derived**, never literals |
| Division 293 | extra 15% where income + concessional > $250,000 | **not indexed** — pure creep |
| **Division 296** | Schedule 1 commenced **1 Apr 2026**; **first applies to the 2026-27 income year**. 15% on the earnings proportion attributable to TSB above $3m, **plus a further 10% on the proportion above $10m — both against the same earnings base**. First assessment on TSB at 30 Jun 2027 | yes — CPI, $150k/$500k steps |
| General transfer balance cap | $2.1m | yes — CPI, $100k steps |

**Store the application year, not the commencement date.** A commencement date in the assumptions
object produces a Division 296 liability three months early. And the "30%/40% marginal bands"
framing every commentator uses is wrong: the Act computes two proportions of the *same* total
earnings figure and taxes them at 15% and 10%. That reconciles below $10m and produces wrong
numbers above it. The **single-date TSB test is 2026-27 only** — from 2027-28 it is
`max(opening, closing)`.

**The SG base changed to *qualifying earnings* on 1 July 2026**, and a salary-sacrificed amount is
itself qualifying earnings — **salary sacrifice no longer reduces the SG base**. The maximum
contributions base is now **annual and per employer at $270,830**, not quarterly.

**Bring-forward tiers are derived** from the transfer balance cap and the general
non-concessional cap, with **strict** inequalities: at a TSB of exactly $1,840,000 the Person gets
the two-year arrangement, not the three. Gated on being **under 75** at any time in the first
year. Once triggered the cap is **frozen** at the first year's cap × 3 — $390,000, not the
$410,000 that summing three indexed years would give.

**Cap indexation is cumulative from each cap's own base amount and base quarter, never chained**
off last year's cap — the floor-to-multiple applies once, to the cumulative product. Index, base
amount, base quarter and rounding step all differ per cap; one shared indexation routine is a bug.

**Carry-forward is a five-year rolling ledger, and it should be visible as one.** Unused
concessional cap from each of the previous five years, oldest consumed first, available only while
Total Super Balance is under $500,000 at the prior 30 June. Peak-earning years are where a
catch-up contribution is worth the most and where the headroom is hardest to work out by hand, so
the tool shows the remaining headroom per Person per year and offers a contribution entry against
it — offered, never bound ([ADR-0004](./docs/adr/0004-the-tool-proposes-you-dispose.md)). The
$500,000 gate is what makes this urgent rather than perennial: it is a nominal constant that never
indexes (T21), so the window closes on its own.

**Personal transfer balance cap indexes proportionally** on unused percentage — anyone who has
ever used 100% gets none. ⇒ Track **highest-ever transfer balance**, not current balance.

Minimum drawdown by age: <65 4% · 65–74 5% · 75–79 6% · 80–84 7% · 85–89 9% · 90–94 11% ·
95+ 14%. On the 1 July balance, rounded to $10, pro-rated for part-years, nil if commenced on
or after 1 June.

### 5.4 Personal income tax

2026-27: nil to $18,200 · **15%** to $45,000 · 30% to $135,000 · 37% to $190,000 · 45% above.
Medicare levy 2%.

⚠️ **Thresholds are not indexed and never have been.** The 16%→15% cut applied 1 July 2026 and
a cut to **14% lands 1 July 2027** — *rate* changes only, thresholds unchanged. The bracket
table is year-indexed config, not constants. The LITO *amount* and both its tapers are unindexed,
and so are the SAPTO *amounts* — but **SAPTO's thresholds are derived from the year's marginal
rates**, so they moved on 1 July 2026 and move again on 1 July 2027. Store the formula (register
§2.4 — reg s 9(4)–(8), **both** branches and the `> $37,000` test between them), never the
published threshold table.

Salary sacrifice reduces salary before PAYG; personal deductible contributions reduce taxable
income via a s290-150 notice. Benefit = (MTR + 2% ML) − 15%, or − 30% once Div 293 bites. Both
add back as reportable super contributions, so model taxable income and the Div 293 / offset
income base **separately**.

**There are four distinct income bases, and reusing one is wrong in three of the four cases:**
LITO on **taxable income** · SAPTO on **rebate income** · the Medicare levy on taxable income
(single) or the sum of both Persons' taxable incomes (family) · Division 293 on income for
surcharge purposes plus low-tax contributions.

Bracket creep concentrates in the **working years**. A retiree drawing only super income from a
taxed source is nearly bracket-insensitive, because that income is tax-free from 60.

### 5.5 Age Pension — the only jointly-assessed component

Qualifying age **67**. Entitlement = the **lesser** of the income-test and assets-test results.
**Computed on combined Household means, then halved.** Per-person calculation is the classic
couple bug.

**Entitlement is an output, never an assumption** — see
[ADR-0003](./docs/adr/0003-age-pension-eligibility-is-computed.md). Above the assets cut-off it
is zero, not minimal.

**The financial year holds three parameter sets, not two.** Rates index 20 March and 20 September;
free areas, assets free areas and deeming thresholds index **1 July**. All couple figures below
are per fortnight, each / combined.

| Item | 20 Mar–30 Jun 2026 | 1 Jul–19 Sep 2026 | From 20 Sep 2026 |
|---|---|---|---|
| Maximum **basic** rate | $829.40 / $1,658.80 | unchanged | $855.90 / $1,711.80 |
| Pension Supplement (max) | $65.20 / $130.40 | unchanged | $66.50 / $133.00 |
| Energy Supplement | $10.60 / $21.20 | unchanged | unchanged — **never indexed** |
| **Maximum payment rate** (the three summed) | $905.20 / $1,810.40 | unchanged | $933.00 / $1,866.00 |
| Income free area (combined) | $380 | **$396** | unchanged |
| Assets free area (homeowner) | $481,500 | **$499,000** | unchanged |
| Assets free area (non-homeowner) | $739,500 | **$766,000** | unchanged |
| Deeming threshold (combined) | $106,200 | **$110,600** | unchanged |
| Deeming rates | 1.25% / 3.25% | unchanged | **1.75% / 3.75%** |
| Work Bonus | $300/ft per Person, start $4,000, bank max $11,800 | unchanged | unchanged |

Income taper 50c per $1 over the free area; assets taper $3.00/ft per $1,000 over it. Both tapers
are constants. **Cut-offs are derived** — `free_area + rate ÷ taper` — and therefore move on all
three dates: the couple homeowner assets cut-off is $1,121,000 from 20 Sep 2026. Never hard-code
a cut-off; use the published ones as test fixtures.

**Store the three rate components separately, never one blended number.** The basic rate is
MTAWE-benchmarked, the Pension Supplement is CPI-only, and the Energy Supplement has never been
indexed and has been $14.10 single / $10.60 each since 2014. Indexing the blended total at CPI
understates the payment; indexing it at wage growth overstates it. The Energy Supplement **is**
payable to a new claimant — the 19 September 2016 closure applied only to Family Tax Benefit and
the Commonwealth Seniors Health Card — so it belongs in the payment, held as a nominal constant
that decays to roughly a third of its present real value by the end of the Planning Horizon.

**The indexation asymmetry is a first-order 40-year effect.** The basic rate is wage-linked, the
supplements are CPI-only, and the free areas and deeming thresholds are CPI-only — so the means
tests bite harder in real terms every single year, indefinitely. One "indexation" Setting cannot
express this.

Account-Based Pensions: **assets test = account balance, income test = deemed.** Grandfathering
out of deeming needs **both** limbs — commenced before 1 Jan 2015 **and** continuously on a
pension or allowance since 31 Dec 2014 — which is structurally unreachable for this Household.
Hard-code `false`; exposing it as a Setting invites a silent, undetectable overstatement. The
principal home is exempt.

**Two rules that dominate a staggered-age forecast:**
- If only one Person has reached 67, they **claim alone but are paid the couple (half) rate**,
  tested on combined means.
- The **younger Person's accumulation super is exempt from both tests until they turn 67**,
  then becomes fully assessable — usually the largest single cliff in a couple forecast, and
  the thing the chart most needs to show. ⚠️ The exemption also ends, **at any age**, the moment
  the fund starts paying **any** income stream — including a TTR. Starting a TTR for the younger
  Person before the older Person claims destroys the exemption early.

**Retaining minimal eligibility is a stated goal**, because any entitlement confers the
Pensioner Concession Card. Modelled as a **checked constraint with an eligibility band on the
chart**, not a floor in the engine.

### 5.6 Couple levers — move balance between people, never share a cap

Every super and tax threshold is individual. The transfer balance cap is not poolable and
unused cap is not transferable on death. The only lever is shifting balance between partners:
two people under a threshold beats one over it.

**Contribution splitting.** Max = lesser of **85% of that year's concessional contributions**
and the concessional cap. Concessional only. Applied the financial year **after** the
contribution year. Receiving spouse must be under preservation age, or under 65 and not
retired, tested at date of application. Still counts **100% to the contributor's cap**, but is
a rollover — so it moves TSB between people, which is the point.

**Spouse contribution offset.** 18% of the lesser of $3,000 → **max $540/yr**. Full if spouse
income < $37,000, nil at $40,000. Receiving spouse TSB < $2.1m and under their NCC cap.

Over a fifteen-year horizon both are equalisation levers rather than one-off transactions, and
hand-entering fifteen years of them is the kind of friction that stops a scenario being run at
all. **Neither is where this paragraph originally assumed as of 2026-09-22.**

**`SPOUSE_CONTRIBUTION` was BUILT 2026-09-22 (P3-19)**, but as a single stated entry, not a
guided template — a household planning fifteen years of contributions states fifteen entries by
hand today. A guided template (pick the years, the tool generates the visible entries) remains an
explicit, un-built follow-on, on `SPEND_CHANGE`'s own preset precedent.

**`CONTRIBUTION_SPLIT` was NOT BUILT, and was explicitly PARKED 2026-09-22 (P3-18).** It needs a
kind of engine mechanic that does not exist anywhere in this codebase for anything: one financial
year's fact reaching forward to change a *different Person's* result the following year. Building
a one-off mechanism for a single feature was judged against this project's own discipline; the
item is parked until a second feature needs the same shape, so the cost is shared. The 85% split
limit this paragraph assumes is also, separately, not yet sourced into the assumptions layer.

What the eventual template must surface, whenever either is templated: two Transfer Balance Caps
of $2.1m each, and two sides of the Age Pension thresholds.

### 5.7 Mortgage vs super

**No rule restricts using released super to discharge a mortgage** once a Condition of Release
is met. Preservation is an *access* gate, not a *use* gate. Before that, TTR pays income only.

Owner-occupied ⇒ `is_deductible = false`: an extra repayment returns the **full nominal rate,
risk-free and untaxed**. The Offset Account is economically identical but liquid. Keep the flag
— an investment mortgage would flip the comparison.

Salary sacrifice returns `(1 − t_contrib) × amount` compounding at the gross return less 15% in
accumulation / 0% in retirement phase, exiting tax-free at 60+. Break-even is the mortgage rate
against that after-tax compounded return over the years to the Condition of Release.

**Second-order effects, and the reason this needs a model rather than a rule of thumb:**
- Liquidity lock-up until the Condition of Release. Less absolute than it was — a Liquidity
  Bridge is now buildable (§5.12), though nothing has been put in one yet — but a dollar
  salary-sacrificed is a dollar not in the bridge, so the lock-up is a *three*-way trade:
  mortgage, super, bridge. The super-versus-bridge leg of it is the second central question, and
  it carries a means-test asymmetry that the mortgage leg does not (§5.12, P6-8 — **BUILT
  2026-09-22**).
- **The Age Pension means test — discharging the mortgage converts assessable super into an
  exempt principal home, *raising* entitlement.** Given the retain-eligibility goal, this is
  the strongest argument in favour and the one most analyses miss.
- Div 296 above $3m.

### 5.8 Survivorship — what-if only

Never fires within the Planning Horizon, so it is built last. A **reversionary** pension defers
the transfer balance cap credit **12 months from date of death**, at the date-of-death value. A
lump sum to a spouse is **tax-free**; to a non-dependant adult child the taxed element is
**15%** and the untaxed element **30%** (+2% Medicare if paid direct). The survivor moves to
single rates, thresholds and deeming — note the Age Pension single rate is *higher* per person.

### 5.9 Fees — the largest controllable drag

Omitted from the first draft of this concept, and material: median total super fees run **0.88%
at $50k and 0.74% at $500k**; a large fund's balanced investment fee is ~**0.53%**. At ~0.75% a
year over 30 years the drag costs roughly **20% of terminal balance**; at 1.0%, ~26%. That is
larger than most of the tax logic in this document, and unlike the tax logic it is within your
control — "what if we switched to a cheaper fund" is a scenario worth being able to run.

Model per account: **admin fee as fixed $ + %**, **investment fee as %**, **insurance premium as
$ with a stop age**. Note fixed-dollar admin fees are charged *per account* and so are duplicated
across two people and across separate accumulation and pension accounts. Insurance in super
typically ceases at 65 (TPD) / 70 (death) and account-based pensions generally carry none, so
post-retirement premium drag is ≈ $0 and can be simplified away.

**Premiums are not flat, and over fifteen years that is the whole story.** Life, TPD and income
protection cover in super is age-rated: the annual premium for a given sum insured climbs steeply
through the fifties and sixties, so a figure taken from today's statement and held constant to 65
understates the drag by a wide margin in exactly the decade before retirement. Model the premium
as an **age-scaled schedule** rather than a fixed dollar amount, and support the two entries that
act on it — **scale the cover back** at a date, or **cancel it at age X**. That is a real lever:
cover bought to protect a mortgage and dependants is not obviously worth its price once the
mortgage is discharged and the bridge is funded, and the tool should let the result argue rather
than assume either way.

### 5.10 Home equity — the largest omitted lever

The home is not just shelter; it is the reserve that makes the post-90 tail survivable. The
Liquidity Bridge (§5.12) does not change that — a bridge sized to carry five years to 60 is spent
long before the tail, and it is the wrong asset for the job anyway.

**Home Equity Access Scheme.** Government-run reverse mortgage. Interest **3.95% p.a.**
compounding fortnightly, unchanged since 2022, ministerially set. **No Negative Equity
Guarantee.** Critically, eligibility requires only *qualifying* for the Age Pension — **people
receiving $0 because of means testing are eligible**. Combined pension + loan is capped at
**150% of the maximum Age Pension**, so a nil-pension couple can draw **$70,605.60/yr** without
selling. Advances are capped at 2 per 26 fortnights. ⚠️ The **150% cap is against the fortnightly
rate; the 50% advance cap is against the ANNUAL rate** — reading the 50% as fortnightly
understates the lump sum by a factor of 26 ($452.60 instead of $11,767.60 per Person).

Modelled as a facility **defaulting off** — an option to explore, not an assumption. Total
capacity is `age_component × floor(security_value ÷ 10,000)` (SS Act s 1135A(1)), where the age
component is a frozen 36-row age→dollars table (`F2019L00420` s 4(2), unchanged since 2019 and
carrying no indexation mechanism at all — register §5.2). For a couple it is keyed to the
**younger member's age at last birthday** and recalculated once a year on that birthday, a step
function while the debt compounds fortnightly. Security value rounds **down** to $10,000, per
Person on that Person's share.

**Three findings that change the plan rather than fill it in:**
- **HEAS at $0 Age Pension entitlement does not confer a Pensioner Concession Card.** A full-loan
  recipient is taken not to be receiving a pension (SS Act s 1137A). The card goal and the HEAS
  lever are **independent**, and the tool must never let a HEAS scenario imply otherwise.
- **Lump sum advances are deemed for income from day one and assessable for assets after 90
  days**; the fortnightly stream is neither. The two draw modes are not means-test equivalent.
- **Increasing the Owner-Occupied Mortgage while a HEAS loan runs voids the No Negative Equity
  Guarantee** (s 1144AA(3)(a)). Redraw is already in this model's vocabulary, so any Scenario
  combining a HEAS draw with a refinance must surface this rather than silently keep the guarantee.

And the counter-intuitive one: for home-only security the HEAS debt is invisible to the assets
test, while unspent cash from it is assessable and deemed. **Drawing HEAS and not spending it
strictly reduces Age Pension entitlement.**

**The Security Value, and where it lives.** HEAS capacity needs the home's market value, which
[ADR-0005](./docs/adr/0005-home-is-a-status-not-a-value.md) exists to keep out of the model. That
was trap **T42**, and it is resolved: the value is read by HEAS capacity alone, `HomeStatus` stays
the means-test primitive, and no part of the assets or income test may read it. The user ruling of
2026-09-04 made "never" literal — there is no vacated-home exception (T39).

It is **not a Setting**. It is a parameter of the `HEAS_DRAW` Journal Entry, held in that entry's
`params` and prompted for in the entry editor at the moment the entry is created or enabled. A
plan with no HEAS entry therefore carries no house price at all — not in `Person`, not in
`Household`, not in Settings, not anywhere. It is passed to the HEAS ceiling calculator as an
argument, and `core/agePension.ts` has no parameter through which to receive it.

That placement buys something a global would not: two Scenarios can price HEAS off two different
valuations, conservative and optimistic, and be compared. And the cost is unchanged and still
stated — the figure is a user's estimate carrying no source and no confidence, so Maximum Loan
Available, remaining headroom and projected debt are all **estimates** and are displayed as
such.

**Downsizer contributions.** $300k per person / $600k per couple, age 55+, 10-year ownership,
within 90 days of settlement, once per lifetime. Does **not** count toward the contribution caps
and has **no total-super-balance eligibility test**.

⚠️ **But it is not free money.** It converts an assets-test-**exempt** home into an
assets-test-**assessable** super balance, and it counts toward the transfer balance cap on
conversion to pension phase. For a household pursuing the retain-eligibility goal it may well be
net-negative. The model must present it as a trade, and let the result argue.

**The proceeds trap.** Sale proceeds intended for a new home are assets-test exempt for **24
months** (extendable to 36) — but are **still deemed for the income test**, at the lower deeming
rate on the exempt portion. A model that treats exempt proceeds as invisible to both tests will
overstate the Age Pension in exactly the transition years a downsizing scenario is about.

### 5.11 Aged care — phase 2, but the facts are in

Researched 2026-09-03. Deferred to phase 2, but recorded now because **the stated funding plan
("sell the home to fund care") is wrong in the most likely scenario**, and because a naive
implementation would hard-code exactly that.

**Aged care has its own means assessment, separate from the Age Pension test.** The divergence
on the home is the whole story:

| | Age Pension assets test | Aged care means assessment |
|---|---|---|
| Former home, spouse remains | Exempt indefinitely | **100% exempt** (protected person) |
| Former home, nobody remains | Exempt 2 years, then **full market value, uncapped** | Capped at ~~$214,884~~ **$219,858.40 per person** (20 Sep 2026) |
| RAD (Refundable Accommodation Deposit) | **Exempt** | **Fully assessable at face value, no cap** |
| Rental income from the home | Assessable | Assessable (exemption abolished 2016) |

**That RAD asymmetry is the pivot.** A RAD is the only large asset invisible to Centrelink and
fully visible to aged care — so sizing it *raises* the Age Pension and *raises* the care
contribution simultaneously. **The real lever is how much goes into the RAD, not sell-vs-keep.**

**Protected person exemption.** If a spouse continues living in the home, it is 100% exempt from
*both* tests, indefinitely. Since the common path is one partner entering care first, selling in
that scenario destroys a total exemption and replaces it with a fully assessable RAD.

**Costs (from 20 Mar 2026 / 1 Nov 2025 reforms; re-indexed 20 Sep 2026, see `docs/research/p14-aged-care-sources-2026-09-24.md`):**
- Basic daily fee ~~$66.80~~ **$68.93/day** (85% of the single basic Age Pension) — everyone pays.
- **Hotelling contribution** max **$22.15/day**, means-tested, **no annual or lifetime cap**.
- **Non-clinical care contribution** max ~~$107.32~~ **$109.45/day**, capped at 1,460 days or ~~$137,917.01~~ **$140,652.80**
  lifetime.
- Max RAD without pricing-authority approval ~~$758,627~~ **$789,686**. **MPIR 8.43%** (Sep 2026 quarter, a
  14-year high; **8.51% from 1 Oct 2026**) — DAP = RAD × MPIR ÷ 365, so a $650k RAD ≈ $150/day.
- RAD retention of 2% p.a. for up to 5 years (max 10%) applies to new entrants.

**Two structural traps.** The Aged Care Act 2024 commenced **1 Nov 2025**: the old means-tested
care fee with its annual (~~$35,910~~ $37,055.98) and lifetime (~~$86,185~~ $88,934.57) caps is gone for new entrants, replaced
by a lifetime cap ~60% higher — and the **hotelling contribution has no cap at all**, payable for
life. Anyone already in permanent care before 1 Nov 2025 is **grandfathered onto the cheaper old
caps**.

**Support at Home** (confirmed commenced **1 Nov 2025**, not 1 July): 8 levels, ~~$10,731 to
$78,106~~ **$11,010.01 to $80,137.12 p.a.** (1 Jul 2026) Contributions split three ways — clinical care 0% for everyone, independence
5–50%, everyday living 17.5–80%, by means. **While the couple lives in the home it is exempt from
the Support at Home assets test**, which is what makes home care the cheap path.

✅ **Resolved 2026-09-24 from primary sources** (health.gov.au schedule from 20 Sep 2026; research doc above): the first figure of each pair below was right at 1 Jul 2026, and all three have since been re-indexed (income free area $36,454.60, home cap $219,858.40, NCCC $109.45). The 1 Oct 2026 change is confirmed and applies to **Support at Home only**. Support at Home grandfathering keys on **12 Sep 2024**, not 1 Nov 2025. ~~⚠️ **Figure discrepancies to resolve before coding:** income free area $35,521.20 vs $35,313.20;
home cap $214,884 vs a stale $210,555; NCCC $107.32 vs a stale $105.30/day. A change is also
flagged for **1 Oct 2026** reclassifying personal care to clinical (0% contribution) — one month
away. health.gov.au and myagedcare.gov.au both timed out on direct fetch, so all of the above is
from reputable secondary sources.~~

### 5.12 Assets outside super — the bridge, and the tax that comes with it

Added 2026-09-04. See [ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md) for why a
framing fact this document repeated everywhere was corrected — not because the fact changed, but
because it was being read as permanent when it only ever described a balance sheet.

The **Non-Super Portfolio** holds taxable ETFs, cash, and the Offset Account balance. **Its
investment sleeve is fundable and currently empty** — the Household owns no ETFs and no other
investment outside super, and expects to own none until it decides otherwise. The only non-super
money it holds today is the Offset Account, which is already assessable and already deemed. The
pool is modelled anyway, in full, from the start.

Its job in this model is the **Liquidity Bridge** — the years between stopping or reducing work and
the Condition of Release at 60, which super cannot fund because super cannot be reached. Without a
bridge, "can I stop at 55?" has no answer but *no*. With one, the answer is a date, which is the
kind of answer this tool exists to produce. On today's holdings the honest answer is still *no*,
and that is a finding rather than a limitation: the tool has to be able to say how much bridge buys
how many years *before* the money is committed, which it cannot do if the pool only exists once
funded.

**Empty is a supported state, not a special case.** A Household with an unfunded investment sleeve
projects exactly as it did before this section existed: no waterfall step fires on a zero balance, no asset
line appears in the means-test split, no CGT event occurs. That is the standard every part of the
pool is built to, and it is why the capability costs nothing to carry while unused.

**Means-test treatment is the blunt part.** Money outside super is **assessable and deemed from
the first dollar**, in both tests, with none of the shelter super gets. Compare the three pools a
dollar can sit in for a Household approaching 67:

| Pool | Assets test | Income test |
|---|---|---|
| Super, younger Person, Accumulation Phase, under Age Pension age | Exempt | Exempt |
| Super, Retirement Phase or any income stream | Assessable at balance | Deemed |
| Non-Super Portfolio and Offset Account | Assessable at market value | Deemed |
| Owner-occupied home | Exempt while `HomeStatus` exempts it | n/a |

⇒ A bridge built larger than the bridge needs to be is an Age Pension cost later. That is a
genuine trade with two defensible sides, and the tool's job is to price it, not to recommend.

⚠️ **The trap: the asymmetry has a date on it, and the answer flips when it passes.** The first
two rows of that table are the same money in different wrappers, and the difference is not a
discount — it is total. Verified against the built code: in `core/household.ts`, `financialAssets`
are classified assessable **and** deemed with no age gate and no phase gate, while Accumulation
Phase super held by a Person under Age Pension age is classified protected and undeemed, so it
enters neither `assessableAssets` nor `deemedFinancialAssets` — the only two figures
`agePensionEntitlement` consumes. It is invisible to **both** tests.

So while the younger partner is under 67, a dollar in their accumulation account is means-test-free
and the same dollar in an ETF is deemed and assessed. At the couple assets taper of $3.00 per
fortnight per $1,000, $50,000 outside super costs about $3,900 a year of entitlement that $50,000
in that partner's accumulation account costs nothing. Then it ends — in one step on their 67th
birthday, or earlier and permanently if they start any income stream including a TTR (§5.5, T27).

**A comparison that reports only the tax difference is therefore wrong for a stretch of years and
right afterwards, with nothing on the screen to say which.** The tool must show the
pension-entitlement dimension alongside the tax one, and show the date the balance tips — **BUILT
2026-09-22, P6-8.** Months paid is shown beside each Scenario rather than a dollar figure (pension
income is a different amount for a different reason on each side and comparing the two directly
would mislead), and the tipping date is drawn as a marker on the wealth chart. The exemption itself
is §5.5 and P3-13; this section only records that it decides a question people would otherwise
answer on tax alone.

**The second central question: salary sacrifice, or invest outside super.** It sits beside
"discharge the mortgage from super", not below it — it is the question that decides whether a
bridge exists at all, and the user is weighing ETFs as a vehicle precisely here.

| | Super | Non-Super Portfolio |
|---|---|---|
| On the way in | 15% contributions tax against a marginal rate up to 47% | After-tax dollars, full marginal rate |
| While held | 15% on earnings, nil in Retirement Phase | Earnings taxed at the Person's marginal rate |
| On the way out | Tax-free from 60 from a taxed source | CGT on the gain, halved past 12 months |
| Access | Locked to a Condition of Release | Any day |
| Age Pension | Exempt in a younger Person's accumulation account, until 67 | Assessable and deemed from the first dollar |

The first three rows favour super in most cases; the last two are what the difference buys. The
tool prices the trade over the whole horizon rather than asserting a winner — the same discipline
as the mortgage question, and for the same reason (ADR-0004).

**The Income Waterfall gains a step, and its position matters.** The order becomes: salary →
Account-Based Pension (its minimum is a **floor**, not a ceiling) → **Non-Super Portfolio** →
Offset Account, with Age Pension
applied wherever assessed. Before a Condition of Release the first two are unavailable or capped,
so the bridge carries the whole target. ~~Offset stays last~~ — **superseded 2026-09-19, and the same
correction stands on the other copy of this claim in the domain model above: released
superannuation, ~~limb five~~, is drawn after the Offset. `WATERFALL_LIMBS` now lists seven limbs,
and released superannuation is the last of them (see §4's Income Waterfall bullet)** —
because a dollar there is earning the
mortgage rate risk-free and untaxed (§5.7) — it is the most expensive dollar in the Household to
spend, and drawing the portfolio before it is right for the same reason.

**CGT.** Un-parked by ADR-0009. A draw is a disposal, and a disposal on a growth asset held
through a fifteen-year accumulation is mostly gain.

- **Cost base per parcel, never per account.** The 12-month discount and parcel selection both
  turn on which parcel is sold, and an average cost base can express neither. Track acquisition
  date and cost per parcel; select parcels explicitly, default to a stated rule.
- **The discount is 50% for an individual** on a parcel held more than 12 months, applied to the
  nominal gain, and the discounted gain is added to **taxable income** — so it interacts with the
  brackets, with LITO, with SAPTO's rebate income and with the Medicare levy. It is not taxed on
  its own schedule (§5.4's income bases apply unchanged — the four a non-labour amount can raise;
  a discounted capital gain is not a labour amount, so it never enters WATO's net labour income).
- **A realised gain is per Person**, on that Person's parcels. It is not a Household figure and
  it cannot be shifted between Persons after the fact — which makes *whose* name the bridge is in
  a decision made years before it matters.
- **The retirement-year interaction is the point of modelling it at all.** A gain realised in a
  year with low salary is taxed at a low marginal rate; the same gain realised in the final full
  working year can be taxed at 39%. Sequencing disposals against the retirement date is the
  largest single lever in this section, and it is invisible without a model.

**Mortgage alignment.** `MORTGAGE_TARGET` records a planned payoff date or an offset milestone as
a dated entry, so the chart can mark it against the target retirement date and the projection can
say plainly whether the two meet. It changes no arithmetic — amortisation is §5.7 and P3-16 — it
makes an intention checkable, which is the same reason spending presets generate visible entries.

### 5.13 Investment return phasing — the glide path

**RULED OUT by the user, 2026-09-30: there is no Glide Path.** Age bands of returns, set once and resolved automatically, will not be built and are not to be re-offered. A change of assumed return is stated as an ordinary `RETURN_CHANGE` entry ("Change the investment return"), one rate from one date, like any other entry. The rest of this section is kept as the record of the idea.

Added 2026-09-04. Returns are a **Setting**, and a single number held for forty years is a poor
one for a Household that intends to de-risk as it approaches and enters retirement.

⚠️ **BUILT 2026-09-22 (P2-11) via a different, narrower shape than the paragraph below
originally proposed — gated GO-VIA-DIFFERENT-SHAPE rather than as written.** `RETURN_CHANGE` is
an ordinary, user-STATED dated entry — "from this date, my return assumption changes to X%" —
carried per Person, reusing `SPEND_CHANGE`'s own "standing level until superseded" mechanism.
**It resolves nothing automatically and synthesises no entry.** A user wanting several age bands
states each `RETURN_CHANGE` by hand today; a wizard that generates a band structure from one input
is an explicit, separate follow-on, not built. Per-account rates (one household could hold several
accounts, each stepping down at a different pace) are also not built — one rate applies to all of
a Person's accounts together.

**Why the original design below was not built as written: the generic mechanism it depends on
does not exist.** The paragraph originally read *"it is a Dated Parameter, so it resolves into
synthetic Journal Entries before projection, exactly as retirement age and TTR start do"* — but
that generic "a Setting silently becomes visible entries" mechanism (ADR-0002's own promise) has
never been built for ANYTHING in this codebase, retirement age and TTR start included (see P6-3,
verified not built 2026-09-22). Building it just for the glide path would have meant inventing a
large, general piece of machinery for one feature. The explicit-entry shape instead reuses a
mechanism (`SPEND_CHANGE`'s) that was already real and proven — matching how every other feature
shipped this session that hit the same gap chose to work around it rather than build it.

The paragraph as originally written, kept as the record of what was proposed and not built:

~~The **Glide Path** expresses the return assumption as age bands — High Growth to 55, Balanced
55–65, Conservative from 65 — per Person and per account. **It is a Dated Parameter, so it
resolves into synthetic Journal Entries** (`RETURN_CHANGE`) before projection, exactly as
retirement age and TTR start do. There is one mechanism, the bands appear in the month table as
entries that applied, and an explicit `RETURN_CHANGE` supersedes the synthetic one — so a Scenario
can hold a band structure and still override one date.~~

⚠️ **This does not reopen Monte Carlo or sequencing risk, and must not be read as doing so.** A
glide path is a *deterministic* assumption that steps at known ages: one input, one reproducible
projection, one number to check. Monte Carlo is a distribution, and the Parked entry's reasoning
for excluding it is unchanged — deterministic answers the questions actually being asked, and a
fan chart invites reading a confidence interval that the return assumptions cannot support. The
two happen to share a motivation. They do not share a method, a cost, or a verification story.

The cost of the glide path, stated: a lower assumed return in the later bands produces a lower
terminal balance and an earlier Shortfall Age, and that is not conservatism for its own sake — it
is what a de-risked portfolio actually earns. Setting the bands is a judgement the user makes, and
the tool shows both the bands and their effect rather than picking for them.

### 5.14 Franking credits and dividend imputation

Added 2026-09-04, after being parked twice —
[ADR-0010](./docs/adr/0010-franking-credits-are-in-scope-on-both-sides.md) holds the reversal and
its reasoning. **BUILT 2026-09-22, both sides, exactly to this design** — the individual side
(P3-22), the super side and its live wiring (P3-42), composing correctly with each other and with
the year-end true-up rather than as two independent mechanisms. An Australian company paying a franked dividend has already paid tax on the profit
behind it. The shareholder includes **both** the cash and the attached credit in assessable income
— the **gross-up** — and then claims the credit as a **tax offset**. Australia's distinguishing
feature is that the offset is **refundable**: a holder whose tax on the grossed-up amount is less
than the credit receives the difference **in cash**, rather than merely wasting it. A retiree with
low taxable income, and a superannuation fund in Retirement Phase, are exactly that holder.

**It applies wherever Australian equity income arises, inside super and outside it.**

| Holder | Tax on the income | What the credit does |
|---|---|---|
| Super fund, Retirement Phase | 0% (§5.1, P3-7) | Nothing to offset — **refunded to the fund in cash** |
| Super fund, Accumulation Phase or TTR | 15% | Largely or wholly offsets the liability; the excess is refundable |
| Individual, marginal rate above the gross-up rate | marginal | Reduces tax payable |
| Individual, low or nil taxable income | low or nil | Excess **refunded in cash** |

**Modelling one side only is not a partial answer, it is a wrong one.** The sacrifice-versus-invest
question (§5.12, P6-8) is a *difference* between two after-tax returns. Omitting franking from both
sides biases that difference toward super; adding it to the non-super side alone biases it toward
the portfolio by roughly as much. Neither error is visible on the screen. This is the single
requirement that governs the whole section.

- **The grossed-up amount is taxable income**, so it runs through the brackets, LITO, SAPTO's
  rebate income and the Medicare levy — the four of §5.4's income bases that a non-labour amount
  can raise, unchanged, exactly as the
  discounted capital gain does (§5.12). The gross-up *raises* every one of those bases even where
  the offset cancels the tax, which is the counter-intuitive half: a franked distribution can cost
  Age Pension–adjacent offsets while being tax-neutral in itself.
- **The credit is not cash until it is assessed.** It arrives as an annual tax outcome, not as
  money in the Income Waterfall in the month of the distribution. The engine must not let a refund
  fund spending before it exists.
- **The 45-day holding rule is in scope as a stated assumption, not as machinery.** A buy-and-hold
  ETF position satisfies it without effort, and a small-shareholder exemption exists below a credit
  threshold. Building day-level qualification tracking would be machinery for a case the Household
  is not in — but disposal sequencing (§5.12) is precisely what could put it in that case, so the
  engine **assumes qualification, states the assumption, and flags a disposal that lands inside the
  window** rather than silently crediting it.
- **The franking percentage is a portfolio characteristic, not a legislated rate.** How much of an
  actual ETF's distribution is franked depends on what it holds and changes year to year. It is a
  **Setting** the user supplies, shown on the chart with everything else, never a constant hidden
  in the engine.
- **The cost, stated:** franking raises the projected after-tax return of both pools, so Shortfall
  Age moves later on both sides of the comparison. That is not optimism — it is money that is
  actually received. The honest number was never either side's return on its own; it is the
  difference, and only modelling both makes the difference honest.

**Nothing here is sourced yet.** The gross-up rate, the refundability provisions for an individual
and for a complying super fund, and the holding-rule threshold all entered scope without a primary
source behind them, and no figure for any of them appears in this document. The Phase 1 gate holds:
P1-11 closes them, and nothing is hard-coded first.

## 6. Assumptions register

Every rate and threshold lives in **one visible `assumptions` object, stamped with its
financial year, displayed on the chart.**

**[`docs/assumptions-register.md`](./docs/assumptions-register.md) is the authority for what goes
in that object.** This document describes the design; the register holds the figures, their
sources, their retrieval dates and their confidence, and it is the direct input to P2-5. Where the
two disagree, the register wins.

**Closed by Phase 1**, all primary-sourced and all recorded in the register:
- LITO — amount, both tapers, and the taxable-income base.
- SAPTO — the fixed parameters, the derived thresholds, and the unused-offset transfer between
  spouses (reg s 12), which was the largest hole in this section.
- FY2026-27 contribution caps, direct from the ATO. The secondary sourcing is retired.
- Division 296 against the Act rather than professional commentary — commencement, first
  application year, indexation basis and the actual calculation.
- The **20 September 2026** Age Pension reindexation. The rates were published 20 August 2026.
- Work Bonus — $300/ft accrual, $4,000 starting balance, $11,800 bank maximum.
- The **HEAS capacity formula** and the full 36-row age component table, from the legislative
  instrument itself.
- Non-homeowner assets-test thresholds. The differential is **$267,000**, not the ~$250k this
  document previously carried.

**Genuinely still open:**
- **FY2026-27 Medicare levy low-income thresholds do not exist.** They are not legislated as at
  2026-09-03. FY2025-26 figures are carried as a **labelled prior-year fallback**, stamped with
  the year they actually belong to so the mismatch shows on the chart. These thresholds are
  legislated retrospectively in the following Budget, so P1-6 is expected to close late.
- **Deeming rates beyond 20 September 2026.** No formula, no announced terminal rate, six-monthly
  Ministerial discretion. Unknowable rather than unresearched — so it is a Setting with a scenario
  lever, and for this Household it is the single most sensitive Age Pension input.
- **Whether the Age Pension age moves past 67, and whether SG moves past 12%.** Policy risk, not
  parameters. Holding both flat for 40 years is an assumption, recorded as one.
- Act-level text for ITAA 1936, ITAA 1997 and the Medicare Levy Act came from the **ATO Legal
  Database — a CCH consolidation** — not the Federal Register compilation. Corroborated by ATO
  guidance and exact arithmetic; the channel is not the Register.
- **Medicare Levy Act s 8(2)**, the family reduction formula, is served as a GIF. Its coefficients
  are inferred from the repealed pre-2013 formula and verified by reconciliation against every
  published upper threshold — not read.
- The assets taper **"$3.00 per $1,000"** is derived exactly from two published figures. No
  verbatim primary quotation: Social Security Guide 4.2.3 is 403.
- **SSA 1991 s 1195** — the 41.76% MTAWE benchmark — is confirmed from DVA, not from the Act.
- **CPI index numbers for December 2016 and December 2025 were not retrieved**, so the cap
  indexation algorithm has not been reproduced end-to-end against a published cap.
- **Nothing about franking is sourced.** Imputation entered scope on 2026-09-04 (§5.14) and the
  register has no franking section at all. Open: the gross-up rate — the corporate rate the paying
  company actually paid, which is not the same for every company; the refundability provisions for
  an individual and for a complying superannuation fund; and the 45-day holding rule with its
  small-shareholder exemption threshold. The **1.0–1.5% a year** that carried the argument is an
  order-of-magnitude estimate of the size of the bias, not a retrieved figure, and the franking
  percentage of any actual ETF is a portfolio characteristic rather than a legislated rate. P1-11
  closes the legislated half; the rest is a Setting.
- **Aged-care research is incomplete** — three figure discrepancies and the 1 October 2026
  reclassification of personal care to clinical. Phase 14; §5.11 holds them.
- **v3 chat token cost per turn is unmeasured**, and whether a locally-hosted model holds the
  tool-calling discipline is unknown. The never-compute rule only survives if the model reliably
  calls a tool instead of answering from its own arithmetic; a hosted frontier model is assumed
  capable, a 7–14B local model is not.

The full open list is **§8 of the register, items O1–O23**, each with what would close it.

**Fetch note.** Four research passes established the following. It is recorded here because it
saves the next pass hours.

- `ato.gov.au` returns **403 to the WebFetch tool but 200 to plain `curl` with a browser
  User-Agent** — web pages, the ATO Legal Database and `/law/view/pdf/` alike. The earlier note
  that the site blocks automated fetch was wrong about the site and right about the tool.
- `legislation.gov.au` HTML now serves an **SPA shell** with no legislative text in it. The
  **download endpoints** (`/latest/downloads` → `.../text/original/word`, and the PDF path) and the
  OData API work with `curl`. That is how the authorised Act and instrument text was obtained.
- `servicesaustralia.gov.au` **works via `curl`.** The previously recorded timeout was a WebFetch
  limitation, not a site block.
- `dss.gov.au` including its `/system/files/` PDFs, `aga.gov.au` and `dva.gov.au` — all retrieved
  successfully.
- `guides.dss.gov.au` and `ministers.dss.gov.au` — **403 to everything**, both tools, with full
  browser headers and referer. The Social Security Guide is reachable through the Wayback Machine,
  which is why some HEAS rows in the register are marked `primary-via-archive`.
- `austlii.edu.au` — **Cloud flare 403**, all mirrors.

Nearly everything in this document is now primary-sourced. The secondary-source caveat survives
only in §5.11 (aged care) and two named rows of the register.

## 7. Verification

Three checks, all free, all before any real decision rests on this:

1. **Baseline with no entries** against the ASIC Moneysmart retirement planner.
2. **TTR arithmetic** against your own fund's TTR calculator.
3. **One hand-worked Age Pension figure** at a known date against Services Australia's
   published rates.

A shared engine bug shifts every Scenario equally and looks entirely plausible — comparison
cannot detect it. Only an external reference can.

## 8. Risks

- **Auditability slipping** turns the tool into a black box. It is the one thing the
  spreadsheet would have given free.
- **~~localStorage is one cleared cache from total loss.~~** Resolved: the plan is a JSON file on
  disk, written through by the local server, and a cleared browser cache costs nothing. The
  residual risk is ordinary file risk — the user's own backup of `plan.json`. **This will become
  a git repo — `.gitignore` is in place and covers the plan, the ledger and the import formats;
  keep the real files outside it.**
- **Couple bugs are silent:** Age Pension computed per person; the younger partner's super
  assessed too early; a split counted at 85% against the contributor's cap instead of 100%.
- **Scope creep toward Monte Carlo and aged care.** CGT and franking credits are no longer on
  this list — both were admitted deliberately on 2026-09-04 (§5.12, §5.14, ADR-0009, ADR-0010),
  which is the opposite of creep. Franking is the sharper case, because it was admitted by
  *overturning* the replacement argument that had re-parked it, and "the last argument was
  reconsidered" is exactly what creep sounds like from outside. The difference is that the
  reconsideration was quantified and directional — a known bias, on the known question. The watch
  item now is what the portfolio drags in next: investment property, then a reason to reconsider
  Monte Carlo because the portfolio "deserves" it. Each still needs its own argument, and a
  *reversal* needs a better one than the entry it reverses.
- **The bridge is the newest and least-verified part of the engine.** Neither CGT nor franking has
  a free reference tool the way Moneysmart covers the baseline, so P13 gains a hand-worked disposal
  (P13-7) and a hand-worked franked distribution (P13-8) rather than trusting a comparison that
  cannot detect a shared bug. The franking check is the one that has to cover both sides — an
  individual's refund and a fund's — because a credit modelled outside super and forgotten inside
  it produces two plausible numbers and one wrong comparison.

## 9. Build order

Revised: the Age Pension means test is promoted, because it dominates the answer. Admitting the
Non-Super Portfolio (2026-09-04) does not demote it — a bridge is not large enough to displace the
means test, and being assessable it feeds straight back into it.

1. **Assumptions object** — year-indexed, three inflation knobs, per-account fees, unit-tested
   against hand-worked examples.
2. **Age Pension means test** — combined-then-halved, both tests, deeming, the younger-partner
   exemption. The load-bearing calculation.
3. **Projection engine** — `project(settings, entries) → Month[]`, two people, no UI. Validate
   the no-entry baseline against Moneysmart before going further.
4. **Non-Super Portfolio, CGT and franking** — the pool, its place in the Income Waterfall,
   per-parcel cost base, the 12-month discount, and the discounted gain landing in taxable income.
   **Franking lands here on the non-super side and in step 3 on the super side** — inside a fund it
   is an adjustment to the earnings tax the engine already computes each tick, and it must be built
   in both places or in neither (§5.14). Built empty,
   and built here rather than later on both counts: the waterfall is engine-shaped, so retrofitting
   a step into it after the month table and the chart are built means revisiting both — and the
   capability has to be in place before the money is, since whether to commit the money is one of
   the questions being asked. The glide path lands alongside it, since it is a Setting the engine
   reads on the same tick. See §5.12, §5.13 and ADR-0009.
5. **Month table with expandable breakdown** — auditability ahead of the chart, deliberately.
6. **Journal Entries + Scenario inheritance**, including synthetic entries for Dated Parameters.
7. **Chart overlay** — N scenarios, household total with per-person split, Age Pension
   eligibility band, the contingency floor line, and markers for Shortfall Age and
   Pension-Only Age.
   **Wealth is drawn as a stacked area splitting Protected from Assessable assets**, not as a
   single net-worth line — a single line hides the entire exemption mechanism. Mark every date
   the Home Status changes, and mark the expiry of a two-year exemption clock as a distinct
   cliff: that is the moment a previously invisible asset becomes fully assessable and
   entitlement can disappear overnight.
8. **Export/Import** — before real data is entered. Save is already continuous by this point:
   the working file is written through on every change, so there is nothing to "save". Export is
   the other verb — a dated snapshot for archiving or handing over — and Import reads either a
   snapshot or a working file. Versioned shape, and the schema version checked on read.
9. **Home equity** — HEAS facility and `DOWNSIZE` / `DOWNSIZER_CONTRIBUTION` entries, including
   the 24-month proceeds window and its deeming treatment. Early rather than late: it changes
   the answer to the question actually being asked.
10. **Sustainable-spend solver** — binary search over the engine, respecting the contingency floor
   at every month.
11. **Spending history module** — CSV import, rule-based suggestion with bulk review, Derived
    Baseline offered for acceptance. Separable from the engine; can proceed in parallel.
12. **Survivorship** — `DEATH` and `ILLNESS_SEPARATION` what-ifs.
13. **Phase 2: aged care** — behind the validated engine, once the research hole is closed.
14. **Phase 3: AI chat** — natural language in, proposed Journal Entries out, the engine computes,
    the chat explains the returned `Month[]` with a citation to the month and line item it came
    from. Read-only query tools separated from plan-proposing tools; nothing writes the plan file.
    Last, and behind the verification gates: an explainer over an unverified engine produces
    fluent, confident, wrong answers.

The **demo couple** — fictional, round numbers — ships in the repo as first-run defaults and as
the golden-file regression fixture, so the tool is demonstrable and testable without any real
data.

## 10. Delivery scope

### v1

**Engine** — pure `project(settings, entries) → Month[]`; monthly ticks on financial-year
boundaries; integer cents; nominal internally, displayed in today's dollars; three knobs (CPI,
wage growth, deeming rates); year-stamped assumptions object; per-account fees with age-scaled
insurance premiums; the return **Glide Path** as age bands resolved to synthetic entries.

**Rules** — Age Pension (combined means then halved, both tests, deeming, Work Bonus,
younger-partner exemption, entitlement always computed); super per person (phases, caps,
carry-forward with visible rolling headroom, bring-forward, Div 293, Div 296, highest-ever
transfer balance); TTR (4%/10%, 15% earnings tax, conversion); Condition of Release as a boolean
independent of age; year-indexed income tax; the spouse contribution offset (BUILT 2026-09-22, a
single stated entry — no template yet, and contribution splitting stays parked, see §5.12);
**franking credits received inside super**, offsetting the
15% earnings tax in Accumulation Phase and refunded in cash at 0% in Retirement Phase.

**Assets outside super** — added 2026-09-04 (§5.12,
[ADR-0009](./docs/adr/0009-the-non-super-portfolio-is-funded.md)). The Non-Super Portfolio as a
first-class, drawable pool **defaulting to empty**; its place in the Income Waterfall ahead of the
Offset Account; assessable and deemed in both Age Pension tests; the pre-60 **Liquidity Bridge** as
a first-class scenario; the **sacrifice-versus-invest comparison**, reporting the pension
entitlement as well as the tax; **CGT** — per-parcel cost base, the 12-month 50% discount, the
discounted gain landing in taxable income and therefore in LITO, SAPTO and the Medicare levy,
realised per Person; **franking credits and dividend imputation** — gross-up, the offset, and the
refundability of excess credits, modelled on **both** sides of the sacrifice-versus-invest
comparison (§5.14, ADR-0010); `NON_SUPER_INVESTMENT` and `MORTGAGE_TARGET` entries. This enlarges v1 and is
not deferrable: the capability has to exist before the money does, or it cannot inform the decision
to commit the money — and a bridge modelled without its tax overstates spendable money in exactly
the years the bridge is the answer, which is the failure mode this whole project is organised
against.

**Home and equity** — owner-occupied mortgage and offset; Home Status derived monthly with
`protectedAssets` / `assessableAssets` reported separately; `VACATE_HOME` and the two-year
exemption clock; HEAS defaulting off; `DOWNSIZE` and `DOWNSIZER_CONTRIBUTION` with the 24-month
proceeds window and its deeming treatment.

**Scenarios** — Baseline plus append-only Journal Entries (disabled, never deleted); live
inheritance by `parentId`, with per-Scenario `entryOverrides` so a Scenario can switch an inherited
entry off or back on without moving its parent's answer; Dated Parameters resolved to synthetic
entries; `DEATH` and `ILLNESS_SEPARATION` what-ifs.

**Spending history** — CSV import and manual entry stored separately from the plan; fixed
top-level categories with user-defined subcategories; rules suggest in bulk and are reviewed
before commit; Derived Baseline from a trailing 12 months, inflated to today's dollars, offered
for acceptance.

**Outputs** — month table with expandable drivers, built before the chart; chart with N scenarios
overlaid, wealth stacked Protected vs Assessable, eligibility band, contingency floor, Home
Status markers and the exemption-expiry cliff; Shortfall Age and Pension-Only Age; sustainable
spend solver honouring the floor every month; Export/Import; synthetic demo couple.

### v2

Aged care, per §5.11 — the Aged Care Means Assessment as a second means test; residential care
costs including the uncapped hotelling contribution; RAD/DAP with MPIR and the
exempt-for-Centrelink/assessable-for-care asymmetry; **RAD sizing as a solver**; Support at Home;
grandfathering. New entries `ENTER_CARE`, `SELL_HOME`, `RENT_OUT_HOME`, `RAD_PAYMENT`, plus a
funding-route comparison view (sell + RAD · keep + rent + DAP · keep + vacant + DAP · HEAS).

It reuses v1's Home Status and protected/assessable split, so the data model is already in place.
It is deferred because it is a second means-testing system with **no free reference tool to
validate against**, and because of the open figures in §6.

### v3

An optional AI chat, per [ADR-0006](./docs/adr/0006-the-chat-never-computes.md). Natural language
in → one or more proposed Journal Entries → the existing pure `project(settings, entries) →
Month[]` engine computes → the chat explains the rows that come back. **It never computes a
number itself.** An LLM doing arithmetic on tax brackets or means tests would silently discard
everything Phases 1 and 13 were built to guarantee, and would do it in fluent prose — the single
most important constraint in this scope.

**Tool surface, split and enforced.** Read-only: run a projection (financial-year rows plus
markers), fetch one month's full line-item breakdown, list the markers, compare two Scenarios,
run the sustainable-spend solver, explain an assumption with its FY stamp and source.
Plan-proposing: propose Journal Entries, propose a Scenario. Both write to a review queue that
lives **in memory** — never to the plan file, and not to browser storage either. A proposal the
user does not accept leaves no trace, which is the intended behaviour: a suggestion that survives
a decision is a binding in disguise. There is no tool that edits a Setting and no tool that disables an entry —
[ADR-0004](./docs/adr/0004-the-tool-proposes-you-dispose.md) applied to its cleanest case yet.

**Provenance is a gate on output.** Every figure stated in prose cites the month and line item it
came from, the same provenance the month table shows. A claim that cannot be traced to an engine
row is not uttered. A 40-year projection never enters context whole: financial-year rows plus
on-demand month fetches keep the citation checkable without paying for ~500 months of line items
per turn.

**Refusal, not improvisation.** Aged care is v2, and Monte Carlo, investment property and
sell-to-rent are not scoped. Asked about any of them, the chat says the engine cannot answer it and
points at §5.11, Phase 14 or the Parked list. CGT and franking credits both came *off* that refusal
list on 2026-09-04 — the engine computes them now (§5.12, §5.14), so the chat quotes the engine's
figure like any other and never its own.

**Privacy is the price.** A hosted model means real balances, salaries and spending leave the
machine — the "no cloud" half of the shape, knowingly broken. Bring-your-own API key, entered by
the user, held in localStorage, **never written into the plan file and never exported**, so the
plan JSON stays safe to hand to someone else and stays safe under `.gitignore`. The browser calls
the provider directly, with no intermediary server — the local Node server serves files and
reads and writes the plan, and **never proxies a model call**; a provider whose CORS policy
forbids a browser-origin call is unsupported rather than proxied. A **local-model option** over
`localhost`
keeps the original posture fully intact, and a **redacted mode** reasons over the demo couple's
shape or scaled relative figures for anyone unwilling to send real numbers. The chat **defaults
off**, exactly as the HEAS facility does: the tool is 100% functional with it absent or the
provider unreachable, and nothing in the engine, month table or chart may come to depend on it.

Turns that produced accepted entries are persisted with those entries; idle conversation is not.
A decision that changed a plan should have its reasoning recoverable months later.

It sits behind Phase 13's verification gates for the same reason v2 does. An explainer over an
unverified engine does not produce obviously bad answers — it produces fluent, confident, wrong
ones, which is worse than no tool at all, because the fluency is what stops a reader checking.

### Not scoped

Monte Carlo and sequencing risk; investment property; sell-to-rent. Excluded on
merit rather than deferred — each would need a fresh argument to enter v2.

**CGT left this list on 2026-09-04** and is v1 scope, because admitting the Non-Super Portfolio
made its stated reason ("nothing outside super to tax") false — a reason that described a holding
and expired with it. That is the fresh argument working as intended.

**Franking credits left this list on 2026-09-04 too, and took two rulings to do it.** They were
parked on the same dead reason as CGT, then re-parked on a replacement — distributions modelled as
cash without imputation, understating after-tax return in the conservative direction. The
replacement has been overturned. The bias is roughly 1.0–1.5% a year on Australian equity and it is
systematic in one direction, so it does not wash out over a horizon: it tilts the
sacrifice-versus-invest comparison toward super, which is the question the portfolio was admitted
to answer. Conservatism is the right default for a figure nobody is acting on and the wrong one for
a figure being acted on. ⚠️ The condition of entry is that franking is modelled **on both sides** —
inside super, where a Retirement Phase fund has the credits refunded in cash at 0% and an
Accumulation Phase fund offsets 15%, as well as outside it. §5.14, P3-22, ADR-0010.

**Investment property stays out, and "not held" is now the weaker half of its reason.** So is a
listed portfolio, and that no longer keeps it out — so the reason that carries the entry is the
rest of it: negative gearing, rental income, land tax, stamp duty and an indivisible asset with its
own means-test treatment are a rules area of their own, and none of it follows from supporting an
ETF. The capability admitted here is liquid holdings with a per-parcel cost base, and it extends no
further. Sell-to-rent is untouched: it turns an exempt asset into an assessable one against Rent
Assistance capped at ~$5,400/yr, which was never an argument about what the Household holds.

The **Glide Path** (§5.13) is not a Monte Carlo concession. Phased deterministic returns are one
input producing one reproducible projection; a distribution is a different method with a different
verification story, and the reasoning that parked it stands.

---

*All figures FY2026-27 as at 2026-09-03. See §6 for unverified items.*
