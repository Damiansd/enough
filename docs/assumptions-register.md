# Assumptions register

The single source of truth for every legislated rate, threshold, formula and structural rule the
engine encodes. Consolidated 2026-09-03 from the four Phase 1 research passes in
`docs/research/`, extended 2026-09-04 by the **franking and dividend imputation** pass
(P1-11, three chunks — §5A), corrected 2026-09-05 in **§2.7** by the **Medicare levy family
shade-in** pass (P3, `docs/research/p3-medicare-family-shadein.md`), which closed O7, and extended
2026-09-05 in **§3.6** by the **Division 293** pass (P3-5,
`docs/research/p3-div293-income-base.md`), which confirmed every §3.6 row verbatim and added the
component list, the taper and O35, and **corrected 2026-09-09 in §3.9** by the **minimum drawdown and
TTR** pass (P3-10 and the part-year limb of P3-8,
`docs/research/p3-minimum-drawdown-and-ttr.md`), which **closed O36**, opened O37–O39 and added traps
T56 and T57, and **extended 2026-09-09 by a new §3.10** (and corrected in §3.1 and §3.9) by the
**transfer balance cap** pass (P3-9, `docs/research/p3-transfer-balance-cap.md`), which closed O11,
opened O40–O65, added traps T58–T125 and carries nine user rulings **R1–R9**, and **extended
2026-09-10 by a new §3.11** (and corrected in §3.10, §8 and §10) by the **exempt current pension
income** pass (P3-25, `docs/research/p3-25-ecpi-apportionment.md`), which **closed O52 and O60 / U30
by correcting them**, discharged U23's retrieval dependency, opened O67–O71 and U34–U37, added traps
T126–T134 and the mutation test M-P3-25-1, and carries a tenth user ruling, **R10**.
**This file is the direct input to P2-5** (the `assumptions` object). Nothing
in the engine should need the research reports; they remain as the evidence record.

Target financial year: **FY2026-27** (1 Jul 2026 – 30 Jun 2027), Age Pension periods from
20 Mar 2026.

## How to read this

**Kind** — the distinction P2-5 must encode:

- **config** — legislated to change. Stored per financial year (or per effective date), stamped,
  and displayed with its stamp. Most rows are config.
- **config (derived)** — must not be stored as a literal at all. Computed from other assumptions
  by a formula recorded here. Published values become test fixtures, never the source of truth.
- **constant** — structural. One value for every year of the Planning Horizon. The exception, not
  the rule. §7 lists the complete set.

**Confidence** — carried forward from the research passes verbatim. Confidence is never laundered
upward by consolidation.

- **primary-verified** — read from a statute, legislative instrument, or Commonwealth agency page.
- **primary-via-archive** — primary Commonwealth policy text, retrieved through the Wayback
  Machine because `guides.dss.gov.au` returns 403. Content is primary; the channel is not.
- **ruling-verified** — read from a public ruling (a Law Companion Ruling or Taxation Ruling),
  binding on the Commissioner. Stronger than `secondary-only`, and **not** the same as
  `primary-verified`: the words are the Commissioner's, not the statute's.
- **secondary-only** — corroboration only; no primary text obtained.
- **unverified** — recorded but not confirmed. §8 lists every one.

**Prior-year fallback** — a figure whose FY2026-27 value does not exist yet. Stamped with the year
it actually belongs to, so the mismatch is visible on the chart. Currently: the Medicare levy
low-income thresholds, and nothing else.

Every row carries its retrieval date. All are **2026-09-03** except the franking rows in §5A and the
Medicare levy rows in §2.7, which are **2026-09-04**, the Division 293 rows in §3.6, which are
**2026-09-05**, and the minimum-drawdown and TTR rows in §3.9, which are **2026-09-08**. Every row in
**§3.10**, and the rows corrected by that pass in §3.1 and §3.9, are **2026-09-09**. Every row in
**§3.11**, and the §3.10 rows corrected by that pass, are **2026-09-10**. Where a row is
dropped or refreshed, update the date on that row, not on the file.

---

## 1. Traps

Structural findings that change **how the code is written**, not just what number it holds. Each
is a bug that would produce plausible, wrong output. Read this section before writing any rules
module. Every trap maps to at least one mutation test in §9 — **with one stated exception, and it is
no longer the transfer balance cap cluster.**

**Exception 1 — DISCHARGED 2026-09-16 (O66), and the arithmetic is kept because the round number is
still misleading.** The transfer balance cap traps are **T58–T125**. There are **68** of them, but
**27 are deliberately untested**: T87–T113 are **RECORDED-NOT-LIVE** under ruling **R1** (see the
marker note above the §C table), written against an excess-transfer-balance-tax implementation that
will now never exist, and R1 says in terms *"do not schedule tests for them"*. That leaves **41 in
scope** — T58–T86 and T114–T125. All 41 were given §9 rows on 2026-09-16: **7** by P3-9 chunk 6 and
Battery E (T58, T65, T71, T73, T84, T115, T116) and **34** by O66 batches 1, 2 and 3 (T59–T64,
T66–T70, T72, T74–T83, T85, T86, T114, T117–T125), so **41 are covered and 0 are outstanding**. The
stale figure this paragraph used to carry — *"the 68 traps have no §9 mutation tests"* — was true
when it was written on 2026-09-09 and has not been true since. **What discharging this exception
does NOT say:** the 27 are **out of scope, not covered**, and §9's *Transfer balance cap* subsection
carries its own R1 EXCLUDED note so a reader of that table does not read the 27-row gap as missed
work.

**Exception 2 — the ECPI traps T126–T134, and it STANDS. It is also smaller than this paragraph said
until 2026-09-16.** Of the nine, **five carry a §9 row** — T132 and T130 through **M-P3-25-1**, and
T126, T129 and T133 through the three ECPI rows beside it — and **four do not: T127, T128, T131 and
T134**. The wording here until this date was *"exactly one mutation test between them, M-P3-25-1,
which asserts T132"*, which was true on 2026-09-10 and stopped being true when the other three rows
landed in §9; it is corrected by derivation rather than by hand, below. **Discharging Exception 1
discharges nothing here.**

So the opening claim is true of **T1–T57**, of all **41** in-scope transfer balance cap traps and of
**T126, T129, T130, T132 and T133** — and it is **not** yet true of **T127, T128, T131 or T134**. Do
not read the presence of a trap in this section as evidence that a test asserts it.

**Which of these counts is authoritative, since this paragraph counts what a test also counts.**
The **test** is: `test/assumptions-register-o66.test.mjs` derives every figure — 68, 27, 41, the
covered/outstanding split, and since 2026-09-16 the ECPI five/four split as well — by parsing §1's
own trap rows, R1's RECORDED-NOT-LIVE range and the Trap column of §9's *Transfer balance cap* and
*Superannuation* tables, and then asserts that the numbers written in this paragraph
agree with what it computed. **The tables are authoritative and this prose is checked against
them**, in both directions: adding a §9 row without editing this paragraph fails, and so does
editing this paragraph without the row.

### Income tax and offsets

| # | Trap | Implementation consequence |
|---|---|---|
| T1 | The SAPTO transfer formula's **$6,000** and **0.15** are frozen literals in reg s 12(3)(b)(ii), not tax parameters. | Store as `sapto.transferIncomeFloor` and `sapto.transferReductionRate`. Wiring `0.15` to the lowest marginal rate is correct for the whole of FY2026-27 and silently wrong from **1 Jul 2027**, when the lowest rate falls to 14% and the regulation's 0.15 does not move. |
| T2 | The SAPTO couple **eligibility gate** (ITAA 1936 s 160AAAA(4)) uses **half combined rebate income**; the **amount** (reg s 11(2)) uses the Person's **own** rebate income. | Two different income figures in one calculation. A Person can pass the gate on half combined income and still receive $0 on their own. Never reuse one value for both. |
| T3 | A transfer changes the amount but **not** the gate — reg s 12(3) applies "for the purposes of subsection 11(2) (but not section 10)". | Compute eligibility first, from untransferred figures. Do not re-open the cut-out test after adding a transferred amount. |
| T4 | The transferee's shade-out threshold must be **recomputed** on the augmented base rebate amount (note to reg s 12(3)). | It is **not** the published table threshold. Re-derive through reg s 9(4)–(8) with `BRA*`. Most secondary sources omit this step entirely. |
| T5 | SAPTO thresholds are **derived from the year's marginal rates**, not fixed numbers. | Every threshold moved on 1 Jul 2026 (16%→15%) and moves again on 1 Jul 2027 (15%→14%). Store the formula (§2.4), not the table. |
| T6 | The reg s 9(5) simple branch is not always the right one. With `lowest_rate = 0.15` the s 9(6) branch is reached only once a transfer is added; **from FY2027-28 at 14% it becomes the default even with no transfer**. | An implementation of s 9(5) alone is correct in FY2026-27 and wrong from FY2027-28. Implement both branches and the `> $37,000` test between them. |
| T7 | The main ATO SAPTO page (QC72197) publishes **prior-year** thresholds with **no year label**. | $34,919 / $30,994 / $33,732 are FY2025-26 (they reconcile at 16%). The obvious page gives the wrong year silently. Source FY2026-27 from QC104015 or derive from the regulation. |
| T8 | The Medicare levy seniors/pensioners threshold switch keys off **SAPTO actually received > $0**, not SAPTO eligibility. | The half-combined gate can make a Person eligible while their own rebate income zeroes the offset. That Person gets the ordinary thresholds, not the seniors thresholds. |
| T9 | LITO is tested on **taxable income**; SAPTO on **rebate income**; the Medicare levy on **taxable income** (single) and the sum of both Persons' taxable incomes (family); Div 293 on income for surcharge purposes plus low tax contributions; **WATO on net labour income (ITAA 1997 s 61-155(2)), from FY2027-28**. | **Five income bases, six brands — from FY2027-28.** It was *four bases, five brands* until 2026-09-11, when P3-24 sourced WATO and added the fifth base (§2.8.1). Tracking one number and reusing it is wrong in four of the five cases. `core/incomeBases.ts` also carries `Div293Income` — the *same* sum as surcharge income minus limb (c), which s 293-20(1)(a) disregards. It is a **projection of** surcharge income and **not a base of its own**, and it earns its own brand precisely because swapping the two double-counts a salary-sacrificing Person's own contributions: once in the income and again in the low tax contributions Div 293 adds on top. That is why the brand count runs one ahead of the base count, and it always will. **Net labour income is the opposite case, and it is why the base count moved:** s 61-155(2) defines it inside one Subdivision, nothing else uses it, and it is not a projection of anything — it excludes interest, dividends, rent, net capital gains, superannuation income streams and the Age Pension, and it subtracts a deduction set of its own. Do not fold it into taxable income, and do not "correct" the base count back to four. |
| T10 | FY2026-27 Medicare levy low-income thresholds **do not exist**. | Carry FY2025-26 stamped `2025-26`, labelled prior-year fallback, so the display shows the mismatch. Do not silently relabel them FY2026-27 — multiple secondary sources already do exactly that. |
| T52 | The **s 8(3)(c) gate**: the Medicare levy family reduction is apportioned between spouses **only if the spouse "would be liable to pay levy … but for this section and section 9"**. **s 7 is not excluded from that hypothetical**, so a spouse at or below their own s 3(1) `threshold amount` is not liable, the gate does not open, and the liable Person keeps the **entire, unapportioned** reduction. | Apportioning unconditionally is a silent halving of a real household's benefit — the ATO's Ashton example gives **$229.76** instead of **$92.90**. It is not an edge case: for a seniors couple both spouses liable needs family income above **$88,536**, past the **$77,028** top of the band, so **apportionment never happens anywhere in the seniors family band**. The gate needs the **spouse's own taxable income and the spouse's own SAPTO switch**, so the levy cannot be a per-Person function (§2.7). |
| T53 | **s 7(2) applies to a married Person**, and runs **before** s 8. s 7 has no married-person carve-out and s 7(2) is expressly a ceiling on the levy "but for sections 8 and 9". | Returning a flat 2% once a family income is supplied over-charges any Person whose **own** taxable income is between their own `threshold amount` and `phase-in limit` — `TI = $30,000` with `FI = $70,000` pays $600.00 instead of $198.90, **outside the family band entirely**, so a shade-in refusal does not protect against it. Compute the s 7 ceiling first, unconditionally; s 8 may only reduce it further. |

### Superannuation

| # | Trap | Implementation consequence |
|---|---|---|
| T11 | The Div 296 large-balance threshold **plateaus for years then steps by $150,000**. CPI must lift $3,000,000 past $3,150,000 — a cumulative 5% move — before it changes at all. | Modelling it as smooth annual escalation is materially wrong. Same shape for the VLSBT ($500,000 steps, 5%) and, more gently, the general Transfer Balance Cap ($100,000 on $2.1m ≈ 4.8%). Run the real step formula every year; accept flat results. |
| T12 | Div 296 **commencement** (1 Apr 2026) is not its first **application** year (2026-27). | Store the application year. A commencement date in the assumptions object produces a liability three months early. |
| T13 | Cap indexation is computed **cumulatively from the original base amount and base quarter**, never chained off last year's cap. | Multiplying last year's cap by an annual factor and re-rounding drifts, because the floor-to-multiple applies once to the cumulative product. Project the index number forward, apply the formula against the fixed base. |
| T14 | Three different index/step combinations coexist: concessional cap on **AWOTE**/$2,500; Transfer Balance Cap on **CPI**/$100,000; Div 296 thresholds on **CPI**/$150,000 and $500,000 from a **different base quarter**. | Do not share one indexation routine's parameters across caps. Parameterise index, base amount, base quarter and rounding amount per cap. |
| T15 | Div 296 is **not** marginal bands over earnings. ss 296-40 and 296-45 each compute a proportion of the **same** total earnings figure from two threshold-vs-TSB ratios; the results are taxed 15% and 10%. | The universal "30% / 40%" commentary framing reconciles below $10m and produces wrong numbers above it. Implement from §3.7. |
| T16 | For **2026-27 only**, the Div 296 TSB test uses the **end-of-year balance alone**. From 2027-28 it is `max(opening, closing)`. | A single rule applied to every year is wrong in the first year — the one most likely to be hand-checked. |
| T17 | The SG base changed from ordinary time earnings to **qualifying earnings** on 1 Jul 2026, and **a salary-sacrificed amount is itself qualifying earnings**. | Computing SG on post-sacrifice salary now understates employer contributions. Salary sacrifice no longer reduces the SG base. |
| T18 | The maximum contributions base is now **annual and per employer** ($270,830), not quarterly ($62,500). | A model carrying the quarterly construct forward is wrong from FY2026-27 on. |
| T19 | Bring-forward tiers are **derived** from the Transfer Balance Cap and the general NCC cap, with **strict** inequalities. | Hard-coded tiers go stale the moment either cap indexes. At TSB exactly $1,840,000 the Person gets the 2-year arrangement, not the 3-year. |
| T20 | Once triggered, the bring-forward cap is **frozen** — first-year cap × 3, not a sum of three indexed years. | $390,000, not $410,000. |
| T21 | Div 293's $250,000 and carry-forward's $500,000 are **nominal constants with no indexation provision**. | Over a 40-year nominal projection they erode in real terms and progressively capture more Persons. Model the creep; do not inflate them. |
| T54 | **Division 293 is a TAPER, not a cliff.** s 293-20(1) charges the **lesser** of the low tax contributions and the excess over $250,000, so the tax phases in dollar for dollar over a band exactly as wide as the Person's own low tax contributions. | Charging 15% on the whole of the low tax contributions once the threshold is crossed **overstates by 3x at the margin** — the ATO's own worked example ($240,000 of income, $15,000 of contributions) gives **$750**, and a cliff gives **$2,250**. At a sum of $250,001 the correct tax is **15 cents**. §3.6 carried this only implicitly, in the words "the lesser of", until 2026-09-05. |
| T55 | **Using carry-forward headroom INCREASES a Person's Division 293 exposure.** s 293-25(b) subtracts the excess concessional contributions, and the excess is measured against the cap **as increased** by s 291-20(3)–(7) — so a bigger cap makes a smaller excess and **more** survives into the low tax contributions. | Counter-intuitive and ATO-confirmed, which is why it is a trap: a future reader will "fix" it the wrong way round. A Person over $250,000 who contributes $60,000 against a $32,500 cap plus $27,500 of carry-forward pays the second 15% on the whole $60,000; without the headroom, $27,500 of it is excess and escapes Div 293 altogether (Div 291 taxes it at marginal rates instead). **Any UI presenting carry-forward as an unambiguous win is misleading them** (§3.6). |
| T56 | **A pension that commences mid-year has no 1 July balance, and Schedule 7 does not want one.** Sch 7 cl 1(2)(a)(ii) reads the balance **on the commencement day** in the commencement year, and cl 1(2) reads the **age on that same day** — then applies the **full annual factor** to it, with all the part-year adjustment left to cl 3. Register §3.9 said "on the 1 July balance" until 2026-09-09, flatly and without the exception. | A 1 July balance for a pension that started in October is not a wrong number, it is a **different number multiplied by the same factor** — plausible, and invisible in the output. The age limb is the same shape: a Person who turns 65 in September and commences in October takes **5%**, not the 4% their 1 July age gives, and a 4% here is off by a quarter with nothing to notice it by. `minimumDrawdown` takes a balance that **carries the day it was measured on** and a date of birth rather than an age, so neither substitution can be made at a call site: the wrong day is `PensionBalanceDateError`. Also carried nowhere in the register before 2026-09-09: **cl 1(2)(b)**, which substitutes the **withdrawal benefit** where it exceeds the account balance — ordinarily the same number, which is exactly why it gets dropped (§3.9, O36 closed). |
| T57 | **The TTR maximum is not the minimum's mirror image, and in a commencement year the floor drops while the ceiling does not move.** The 10% lives in **reg 6.01(2)(b)(ii)** — the *definition* of a transition to retirement income stream, **not** reg 1.06(9A) and **not** Schedule 7 — so Sch 7 cl 3 (confined to "the minimum total payment") and cl 5 (confined to "an amount determined under **this Schedule**") do not reach it. It is **not pro-rated, not rounded, not age-varying, not switched off by the cl 4 1 June nil rule, and takes the plain balance without the cl 1(2)(b) substitution**. | A maintainer pro-rating the ceiling "for consistency" turns **$50,000** into **$37,397.26** on a 1 October TRIS at $500,000 — a 25% cut to a Person's legal headroom, with a plausible-looking number where the right one was. The reverse is worse: **exceeding the 10% is catastrophic, not marginal** — the TRIS ends for income tax purposes **at the start of the year** and **every** payment in it becomes an assessable lump sum, so the cap is a hard constraint and a plan needing more is **infeasible**, not taxable. Note the epistemic basis: the three provisions are primary-verified, but "not pro-rated, not rounded" is an **argument from the absence of a provision**, corroborated by explicit ATO instruction and nothing primary — `secondary-only`, O38 (§3.9). |

### Age Pension

| # | Trap | Implementation consequence |
|---|---|---|
| T22 | The year contains **three** parameter periods, not two. Rates index 20 Mar / 20 Sep; free areas, assets free areas and deeming thresholds index **1 July**. | A single flat rate set for "20 Mar – 19 Sep 2026" is wrong from 1 Jul 2026. See §4.1 — the register lists all three explicitly for exactly this reason. |
| T23 | The maximum basic rate is **MTAWE-benchmarked**, the Pension Supplement is **CPI-only**, the Energy Supplement is **never indexed**. | Indexing the blended total at CPI understates the payment (~92% follows wages); indexing it at wage growth overstates it. Hold three separate constants. |
| T24 | Free areas and deeming thresholds are **CPI-only while the payment is wage-linked**. | The means tests bite progressively harder in real terms every year, indefinitely. This is a first-order 40-year effect and cannot be captured by one "indexation" Setting. |
| T25 | Income and assets **cut-offs are derived**: `free_area + (total_rate ÷ taper)`. They move on all three indexation dates. | Hard-coding them decouples them from the rates and free areas that generate them. Derive; use the published values as fixtures. |
| T26 | The non-homeowner free area is the homeowner free area **plus one indexed differential** — the extra allowable amount, **$267,000** from 1 Jul 2026 (was $258,000). | Two independent series will drift apart. Store one constant plus an offset. `concept.md`'s "~$250k" was stale by $17,000. |
| T27 | The younger-partner accumulation exemption ends at the earlier of Age Pension age **or the fund starting to pay any income stream — including a TTR**. | Starting a TTR for the younger Person before the older Person's claim destroys the exemption early, at any age. A silent couple bug of exactly the kind §8 of `concept.md` warns about. |
| T28 | Account-Based Pension grandfathering needs **both** limbs: commenced before 1 Jan 2015 **and** continuously on a pension/allowance since 31 Dec 2014. | Structurally unreachable for this Household. Hard-code `false`. Exposing it as a Setting invites a silent, undetectable overstatement of Age Pension. |
| T29 | Work Bonus is **per Person and never poolable**, applies only to employment and active self-employment income, and is applied **before** the income test. | Pooling it across the Household, or applying it to deemed investment income, overstates entitlement. The benefit reaches the Household only through the combined income test. |
| T30 | Deeming rates have **no formula and no announced terminal rate** — a discretionary Ministerial instrument on a six-monthly AGA review cycle, currently stepping +0.5%. | Must be a user-editable Setting with a scenario lever. Not a constant, not an indexed series. For this Household it is the single most sensitive Age Pension input. |
| T31 | The Energy Supplement **is** payable to a new Age Pension claimant — the 19 Sep 2016 closure applies only to Family Tax Benefit and the Commonwealth Seniors Health Card. But it has **never been indexed** and has been $14.10 / $10.60 since 2014. | Include it in the payment; hold it as a nominal constant that never indexes. Worth ~1.2% of the single payment today, roughly a third of that by the end of the Planning Horizon. |
| T135 | The assets test taper is **not continuous** — SSA 1991 s1064 point 1064-G7: *"disregard any part of the excess that is not a multiple of $250."* The rule is **per Person**, and each member of a couple takes half the combined excess (point 1064-G5), so the floor is on the COMBINED excess in steps of **$500** for any couple (living together or illness-separated — both are two Persons' means) and **$250** for a single Person. Found 2026-09-24 (P13-3 run 2), measured against Services Australia Payment Finder: `enough` gave $769.42/fn each on $608,054 of assessable assets where Payment Finder gives $769.50, an 8-cent understatement traceable to applying the taper to the raw $109,054 excess instead of the $109,000 it floors to. | Treating the taper as continuous **understates** the pension by up to $1.50/fn combined for a couple ($0.75/fn each) whenever the assets test binds and the excess is not already a $500 multiple — the household is worse off in the model than in reality. Floor the excess before applying the taper, not after; a $250 floor on the combined figure (rather than $500) or a $1,000 floor both reproduce the wrong published cut-offs. |

### HEAS

| # | Trap | Implementation consequence |
|---|---|---|
| T32 | HEAS at **$0 Age Pension entitlement does not confer a Pensioner Concession Card** (SS Act s 1137A; SS Guide 3.4.5.60). A part-pensioner using HEAS keeps the card; a nil-entitlement Person using HEAS does not. | The card goal and the HEAS lever are **independent**. The tool must never let a HEAS scenario imply it rescues the retain-eligibility goal. Also lost: family assistance means-test concessions, CCS concessions, and any bereavement payment to the partner or estate. |
| T33 | The **150%** cap is against the **fortnightly** maximum rate; the **50%** advance cap is against the **ANNUAL** maximum rate. | Reading the 50% as fortnightly understates the lump sum by a factor of **26** ($452.60 instead of $11,767.60 per Person). |
| T34 | Lump sum advances are **deemed for income from day one** and **assessable for assets after 90 days**; the fortnightly stream is neither. | The two draw modes are **not** means-test equivalent. Modelling them identically overstates Age Pension in every advance scenario. |
| T35 | Increasing the Owner-Occupied Mortgage while a HEAS loan runs **voids the No Negative Equity Guarantee** (s 1144AA(3)(a) — a non-HEAS charge created or increased after participation begins). | Redraw is already in the model's vocabulary. Any Scenario combining `HEAS_DRAW` with a refinance or redraw entry must raise this, not silently keep the guarantee. |
| T36 | HEAS **capacity uses the YOUNGER member's age at last birthday**, and is recalculated **once a year on that birthday** — a step function, while the debt compounds fortnightly. | Age next birthday, the older partner's age, or continuous capacity growth all overstate available headroom. ✅ **Implemented 2026-09-25 (P9-2a).** Verified against F2019L00420 s 4(1)(b) and SS Guide 3.4.5.30 (already `primary-verified` in `heas.ts`'s `whoseAge`, four sources agree): the younger member of a couple, at last birthday, recalculated once every 12 months on that birthday. `project()` no longer caches the age component at the `HEAS_DRAW` entry's own start date — it is recomputed every month, off `ageAt(dob, firstDayOf(month))`, in the draw block itself. A birthday can now genuinely raise `capacity` and let a clamped draw resume; `HeasCapacityCapNote` fires again each time the cap newly binds, not once for the whole walk. `test/core-projection-heas.test.mjs` proves both by replaying the same production functions across a multi-year walk and finding a table bracket (age 74→75) whose annual step (4.17%) exceeds the interest rate's fortnightly-compounded EFFECTIVE annual rate (≈4.03%) — most brackets sit just under that line and stay permanently capped once first bound, which the file also asserts as the control case. |
| T37 | Security value rounds **down** to the nearest $10,000, per Person on that Person's share, and is **nil below $10,000**. | Round-to-nearest overstates capacity. The per-Person rounding costs up to $10,000 of counted security per Person; modelling once at Household level errs by up to one age component per Person (≈$2,700 at 67). ✅ **Implemented 2026-09-25 (P9-2a).** Decided from `heas.ts`'s own `coupleStructure` fact (SS Guide-sourced): a couple's loan is **TWO INDIVIDUAL loans**, each Person against their own share of the security (50-50 by default), never one joint facility — so `HEAS_DRAW.owner` is now `personA`/`personB` only (`household` refused at the door, `ENTER_CARE`'s own precedent), at most one entry per Person, and a couple's two entries must agree on `securityValue` (the same shared home). `project()` now calls `personMaximumLoanAvailable` (built in slice 1, unused until now) instead of `maximumLoanAvailable` on the whole household figure, so the $10,000 floor applies to each Person's OWN SHARE — a couple whose home is worth $15,000 has NIL capacity for both (each share $7,500), though the SAME $15,000 read as one household figure floors to a real, nonzero $10,000 unit. The 150% fortnightly ceiling and the "maximum" netted allowance are likewise per-Person: half the couple's combined maximum payment rate. |
| T38 | For home-only security, the HEAS debt is **invisible to the assets test** (it offsets an already-exempt asset) while unspent cash from it is **assessable and deemed**. | Drawing HEAS and not spending it **strictly reduces** Age Pension entitlement. This is the opposite of the intuition that a loan against an exempt asset is means-test-free, and it must be stated wherever the tool presents the facility. |
| T39 | The one exception to T38 is datable: when a vacated home loses its exemption at the 2-year cliff (ADR-0005), s 1121(5) switches on and the accumulated HEAS debt is deducted from the now-assessable home **in full**. | **Resolved 2026-09-04 — in favour of T42, by user ruling: "House value is an input field. House value is not part of the means test."** The trap text on the left is a correct statement of the law and is kept as written; the resolution is that **v1 deliberately does not implement it**. The market value is read by HEAS capacity alone and never enters `assessableAssets` — including at this cliff, for which no exception is made. The law says one thing and v1 scope does another, knowingly: see the 2026-09-04 note in `docs/adr/0005-home-is-a-status-not-a-value.md`. The consequence is that **a vacated-home Scenario past two years cannot be forecast and is refused** — `agePensionEntitlement` throws `UnvaluedAssessableHomeError` rather than compute an entitlement that omits a house. Full assessment treatment moves to Phase 14 (TODO P3-15, P14-5a). Cross-reference T42. — Original consequence, kept as the evidence record: a HEAS loan running at that moment cushions the cliff dollar for dollar. Argues for modelling HEAS and `VACATE_HOME` together, not in separate phases. |
| T40 | Interest compounds at `annual ÷ 26`, **not** `annual × 14/365`, and the draw is added to the balance **before** interest is charged. | Pinned by arithmetic against Services Australia's own worked example: at a $1,501.14 balance, `r/26` gives $2.28 (published) and `r × 14/365` gives $2.27. ⚠️ **SCOPE, stated 2026-09-21 (P4-18) — this is a CAVEAT and not a correction: the ruling stands.** The example is a record from that date (`heas.interest.publishedWorkedExample`) and at 3.95% it is internally consistent, deciding the convention at fortnights 2 and 3. **But Services Australia published the SAME example at the superseded 4.50% rate and it contradicts itself** — fortnights 1 and 2 come out **only** on `× 14/365` and fortnight 3 **only** on `÷ 26` (`heas.interest.supersededWorkedExample`, marked INTERNALLY INCONSISTENT; the figures are in §5.4). So this row is evidence about the **current** rate's example and about **no earlier rate period** — the universality was never stated and is not claimed. A backtest into 2020-21 must not assume it. |
| T41 | Interest keeps compounding after the maximum loan available is reached, after exit from the scheme, and after death. Hitting the MLA is an **automatic exit**, not a default. | Payments stop; the balance does not. |
| T42 | HEAS needs a **home market value**, which ADR-0005 deliberately excludes from the model. | **Resolved 2026-09-03** — the amendment note is appended to `docs/adr/0005-home-is-a-status-not-a-value.md`: the market value is a **user-supplied Setting**, read by HEAS capacity alone, and it never enters `assessableAssets`, `protectedAssets` or the Age Pension calculation. **Extended 2026-09-04 by the user ruling that also resolved T39 against this one: "House value is an input field. House value is not part of the means test."** — so "never" is now literal, with no vacated-home exception. The trap and its rule stand as written below; only the outstanding action is closed. The confidence consequence is in §5.1. — The value is required only inside the HEAS facility (and later `DOWNSIZE`), which defaults off. Keep `HomeStatus` as the means-test primitive; introduce market value as an optional Setting **read by nothing but HEAS capacity**. Nothing in the assets test may read it. **Needs an ADR-0005 amendment note before P9 is built.** |
| T136 | §5.3's own table row for "the fortnightly rate during an advance period" was a **26× error** if implemented literally: `1.5 × MPR − advances_taken`, with no annualising step, subtracts a whole LUMP-SUM dollar figure from a FORTNIGHTLY rate. | **RESOLVED 2026-09-25 (P9-2b, `docs/research/p9-2b-heas-advances-gate-2026-09-25.md`) in favour of §5.3's OWN pseudocode line**, `max(0, (heas_headroom_annual − advances_in_period) / 26)`, pinned to the cent against Services Australia's own "George" example ($15,323.10 − $10,000 = $5,323.10 ÷ 26 = $204.73/fn). ✅ **Implemented** — `heasFortnightlyDrawDuringAdvancePeriod` (`data/assumptions/heas.ts`), wired into `project()`'s `HEAS_DRAW` block: an advance updates the Person's own rolling 26-fortnight window BEFORE that month's fortnightly draw is priced, so the reduced rate applies from the SAME fortnight the advance is taken, for the whole window — never merely the fortnights after it. §5.3's table row is struck in place, not deleted, as the evidence record. |
| T137 | The "greater of MPR" floor in s 1134(1A)(b) collapses to the pseudocode's `max(0, …)` on the loan-only component whenever the Person's own pension is nil or already at their own maximum payment rate — both of Services Australia's published examples (George, Olli) are one of these two cases. Whether the floor behaves the same way for a genuine PART-RATE pensioner (`0 < pension_fn < MPR_fn`) during an active advance window — whether it lifts the COMBINED payment to MPR (a windfall) or floors only the loan component at zero — was settled by neither published example nor by AustLII's own text. | **RESOLVED 2026-09-25 (P16-4, `docs/research/p9-2b-part-rate-advances-2026-09-25.md`) by algebra, not by a third example.** Given the 50% annual advance cap `checkHeasDraws` already enforces at the door (s 1134A(3)(a)), `combined_fn = pension_fn + max(0, headroom_annual − advances_taken)/26 ≥ MPR_fn` for ANY `pension_fn` in `[0, MPR_fn]`, with equality exactly at the legislated maximum advance — so the "greater of MPR" floor is automatically satisfied by the plain unfloored formula and the two candidate readings above were never actually different outcomes. ✅ **Implemented** — the `RangeError` guard in `project()` naming this Person, this month and this register row is deleted; `heasFortnightlyDrawDuringAdvancePeriod` (`data/assumptions/heas.ts`) needed no change and now runs for a genuine part-rate pensioner too. `test/assumptions-heas.test.mjs` pins a hand-built fixture (MPR $1,200.90/ft, pension $700/ft, no official example exists) re-deriving the algebra; `test/core-projection-heas.test.mjs`'s T137 test now confirms `project()` walks the SAME household the full-rate/nil-rate tests already confirm is genuinely reduced-but-non-nil, to a figure rather than a refusal. |
| T138 | Lump-sum advances are means-test **deemed for income from day one and assessable for assets after 90 days** where the home was the security (T34, §5.7) — but the whole means test stays blind to HEAS in this build (T39/T42: no home market value reaches `assessableAssets`). | **Punted, deliberately (P9-2b), the SAME pattern T39 already uses for the vacated-home cliff.** An advance's cash is modelled as ORDINARY DEEMED CASH the moment it lands — assessed under both tests from DAY ONE, with no 90-day home-security exemption at all. That is the CAUTIOUS reading of §5.7's rule, never the generous one: it assesses an advance SOONER and MORE FULLY than the law requires, so it can only understate the Age Pension the model shows, never overstate it. Stated in `heas.ts`'s `meansTest.advanceDeemedFromDayOne`/`advanceAssetExemptDays` notes and in the entry form's own notice (`HEAS_DRAW_ENTRY_NOTICE`). |

**T39/T42, narrowed again 2026-09-25 (P14-5a) — not by a Setting.** ADR-0005's own 2026-09-04 reopen
condition ("let the means test read the same Setting HEAS reads, at the cliff date only") is now
exercised, but through a narrower door than that sentence names: `ENTER_CARE`'s own `homeValue`
param (Phase 14, `plan.ts`), not `heas.homeMarketValue`. Past the care-situation 2-year cliff
(`AGE_PENSION.assetsTest.careVacatedHomeExemptionMonths`, s 11A(9)(b)) with an `ENTER_CARE` entry
behind it, `agePensionEntitlement` now computes — `core/household.ts`'s `splitAssets` takes a third,
optional parameter the walk alone supplies, `Household` itself still carrying no home value
anywhere. **Unchanged**: a `homeStatus` set to `vacatedBeyondTwoYearExemption` by hand, with no
`ENTER_CARE` behind it, still throws `UnvaluedAssessableHomeError` — this narrows T39's refusal on
its own stated ground (the care-situation case) and no wider; the general 12-month absence
(s 11A(9)(a), `VACATE_HOME`) stays refused (P3-15). **Built 2026-09-25**: s 1121(5)'s HEAS-debt
deduction this row's own trap text states — the month's opening debt, in full, off the assessable
home only, nil-floored (SS Act s 1121(5), DSS Guide 3.4.5.20 and Aged Care Act 2024 s 330(1),(8); `docs/research/p9-heas-debt-netting-2026-09-25.md`). **Not built here**: the rented/sold cases (`SELL_HOME`/`RENT_OUT_HOME`). See ADR-0005's
2026-09-25 note.

### Franking and dividend imputation

| # | Trap | Implementation consequence |
|---|---|---|
| T43 | There is **no portfolio-level gross-up rate in law.** s 202-60(2) fixes the rate to *the entity making the distribution*, so a diversified ETF spans both the 25% and the 30% rate and no single legislated rate exists for it. | The effective franking rate is a **user input / Setting**, never a constant in the engine and never a register figure (P3-22h; the forecast side of the P2-5d boundary). What the Household actually holds is an AMMA statement reporting franked amount and franking credit as separate dollar figures, after which `grossed_up = franked + credit` needs no rate at all. |
| T44 | The gross-up is an **addition of the credit** (s 207-20(1)), not a rate applied to the cash — and `credit = f × D × r/(1−r)` must be computed **directly**. | Materialising the gross-up rate as a rounded decimal and dividing by it is what the ATO's own worked examples do: 2.3333 gives $42,857.75 on a $100,000 distribution at 30%, against $42,857.142857 exact. **60c wrong per $100,000.** Store the formula (§5A.1), never the decimal. |
| T45 | **s 207-90 on its own destroys the Retirement Phase credit.** It denies the gross-up *and* the offset where the distribution is exempt income, and it has no superannuation carve-out. The rescue is one Subdivision later — **s 207-110**, in Subdiv 207-E, headed "Exceptions to the rules in Subdivision 207-D", which names ss 295-385 / 295-390 / 295-400 and disapplies it. | Reading Division 207 without reaching Subdivision 207-E gives **exactly the wrong answer**: no credit at all for a Retirement Phase fund, instead of the whole credit refunded in cash. And s 207-110 disapplies ss 207-90 and 207-95 **only** — it is no shelter from the Subdiv 207-F denials, including the qualified person gate. |
| T46 | Refunding excess credits on the **super** side while merely **offsetting** them on the individual side manufactures a spurious super advantage of **up to the full franking rate**. | Excess credits are refundable in cash on **both** sides (§5A.3). Model each as `credit − rate × grossed_up`, floored at a full cash refund, and the comparison is honest. This is the modelling bug the whole both-sides requirement — P3-22a, P6-8d, ADR-0010 — exists to prevent. |
| T47 | A **related payment does not disqualify.** It switches the test to the **secondary** qualification period (±45 / ±90 days) instead of the primary one — s 160APHO(1)(b). | `window = SECONDARY if related payment else PRIMARY`; `qualified = holding_period_ok(window) OR (individual AND credits ≤ $5,000 AND no related payment)`. Treating a related payment as a disqualifier denies the credit to a holder who did satisfy 45 days in the secondary window. |
| T48 | The **$5,000** small shareholder ceiling is a **frozen constant with no indexation mechanism at all**, and is the deliberate exception to this register's default that an Australian tax or super dollar figure is indexed config. | **Never apply a CPI or AWOTE uplift to it, in any forecast year.** Why the exception is legitimate is in §5A.5: the provision containing it was repealed in 2006, and what ITAA 1997 s 207-145(1)(a) imports is Division 1A *as in force at 30 June 2002* — a fixed historical snapshot with no live provision to amend. Its real-value erosion since FY1999-2000 is a **feature** of the projection. A future maintainer "fixing" this by indexing it is the specific failure the trap is written against. |
| T49 | The small shareholder exemption is **individuals only** — s 160APHT(1)(a), "the taxpayer is an individual". A complying superannuation fund, APRA-regulated or SMSF, has **no equivalent relief at any credit level**. | Never apply the individual's relief to the super side of the P6-8 comparison. The asymmetry is real but narrow (§5A.6): on established buy-and-hold parcels both sides pass the 45-day rule anyway, so it contributes zero. Carry it as a documented structural note, not a numeric adjustment — encoding it as a live difference on a passive portfolio **overstates** the super penalty. |
| T50 | There are **two different $5,000 rules** and they behave differently. Former ITAA 1936 s 160APHT relieves the **holding period** rule and **does** apply where the distribution flows indirectly; ITAA 1997 s 207-157(4) relieves the **dividend-washing** rule and **does not**. | Conflating them produces a wrong gate whichever way the confusion runs. Search results routinely merge them, because both are "$5,000 exemptions for individuals". §5A.7 holds them side by side for exactly this reason. |
| T51 | The holding-period count **always excludes the day of acquisition**; it excludes the day of disposal **only if there was a disposal** (s 160APHO(2)). Days of material diminution are excluded **without breaking continuity** (s 160APHO(3)). | 45 countable days needs **46 calendar days** of ownership on an undisposed parcel. Counting the acquisition day credits a parcel one day early — invisible everywhere except at the boundary, which is the only place the rule ever bites. |

### Transfer balance cap

**Added 2026-09-09** from `docs/research/p3-transfer-balance-cap.md` (P3-9). The rules these guard are
in **§3.10**; these rows are the lookup form and cite §3.10 rather than restate it. Four source
chunks: **§A** the cap and its indexation (T58–T72), **§B** credits and debits (T73–T86), **§C**
excess and enforcement (T87–T114), **§D** the entry test and the TRIS conversion (T115–T125).
**68 traps, T58–T125, canonically numbered — do not renumber.**

**Two markers appear in this table, and both come from user ruling R1 (2026-09-09).** The engine
**hard-refuses to project any financial year containing an end-of-day cap breach** and **does not
implement excess transfer balance tax** (§3.10; research §C.8). So:

- **RECORDED-NOT-LIVE (R1)** — **T87–T113**. Written against an excess-tax implementation that will
  now never exist. They are kept, not deleted: they are the fixtures a reversal of R1 would have to
  satisfy, **and the hand-worked numbers in them are the point of keeping them**. A trap against code
  that will not be written is still a trap against someone later writing it. Do not schedule tests
  for them; do not remove them.
- **GUARDS THE REFUSAL BOUNDARY (R1)** — **T114**, and from §A **T67** and **T68**. These survive the
  ruling and **must be built**. They are the latching `hasEverExceededCap` machinery, which the
  refusal cannot replace: refusing only prevents *new* breaches and cannot undo one that predates the
  projection, and without the flag the model silently restores a proportional indexation entitlement
  s 294-40(1)(b) has already removed permanently.

**Independent rediscoveries — both IDs and both fixtures are kept, deliberately.** Two passes that
were not looking for each other's conclusion landing on the same trap is evidence, not duplication,
and the research doc's own precedent is to keep both fixtures:

| Pair | The one trap | Route 1 | Route 2 |
|---|---|---|---|
| **T58 ↔ T84** | the indexation numerator is the all-time **high-water mark**, never the current balance | §A, from the s 294-40(2) arithmetic | §B, from the Settings-availability triage |
| **T79 ↔ T116** | a TRIS converts on the **notification** day, not the retirement day | §B, from the credit table inward | §D, from the entry test outward |
| **T80 ↔ T117** | attaining **65 needs no notification** — item 106 is absent from (3)(b)(ii)'s list | §B, from the credit table inward | §D, from the entry test outward |
| **T67 ↔ T114** | one end-of-day excess **permanently** kills proportional indexation — latch it | §A, from the indexation side | §C, from the breach side |

**Transcriber's notes, flagged rather than fixed (E2b, 2026-09-09).** (i) T73, T75 and T76 speak of
the tool "reporting a breach" and emitting remediation; under R1 the report is a **named refusal** and
there is no tax line — the fixtures are transcribed as written and the reconciliation is §3.10's.
(ii) T85's refusal name `CappedDefinedBenefitIncomeStreamNotModelledError` is transcribed verbatim and
carries no `Error` suffix, unlike every other refusal in this codebase — R8's standing instruction to
collect the refusal names into one module before any is registered covers it.

| # | Trap | Implementation consequence |
|---|---|---|
| T58 | **Use the current transfer balance as the indexation numerator instead of the all-time high-water mark.** *Same trap as T84, found independently by §B — both fixtures kept.* | **Wrong move:** reads `transferBalance` at 30 June instead of `highestEndOfDayTransferBalance`. **Fixture (§A's, hand example 2):** credit $1,200,000 on 1 Sep 2025, debit $300,000 on 15 Mar 2026. Personal cap FY2026-27 must be **$2,040,000**, not $2,055,000. |
| T59 | **Let a debit lower the high-water mark.** | **Wrong move:** implements field 4 as `transferBalance` rather than a monotone `max`. **Fixture:** same as T58; also a fixture that commutes the *whole* pension to nil — the numerator must stay **$1,200,000** and the unused percentage must stay **40%**. |
| T60 | **Use the general cap for the indexation year as the denominator, instead of the personal cap on the high-water day.** | **Wrong move:** divides the high-water balance by `generalCap[thisFY]`. **Fixture:** LCR 2016/9 Example A1 step 2 — `$1,525,000 ÷ **$1,613,000**` → 94% → cap **$1,625,000**. Dividing by the FY2022-23 general cap of $1,700,000 gives 89% → **$1,635,000**. |
| T61 | **Round the percentage the wrong way** — to nearest, or round the *unused* percentage down, or skip rounding. | **Wrong move:** applies `round()` or omits the `floor` in s 294-40(2)(c). **Fixture (hand example 3):** balance **$1,234,567** against a $2,000,000 cap. The increase must be **$39,000** (cap **$2,039,000**), not $38,000 and not $38,271.65. **A cents-bearing personal cap is always a bug.** |
| T62 | **Apply proportional indexation in the year the transfer balance account first starts.** | **Wrong move:** forgets the s 294-40(1) parenthetical "other than the financial year in which you first start to have a \*transfer balance account". **Fixture:** a Person who starts a $500,000 pension on **1 July 2026** — personal cap must be exactly **$2,100,000**, not $2,100,000 plus a proportioned slice of the FY2026-27 increase. |
| T63 | **Multiply the unused percentage by the *general cap* rather than by the *indexation increase*.** | **Wrong move:** `unusedPct × generalCap` instead of `unusedPct × (generalCap[n] − generalCap[n−1])`. **Fixture (hand example 2):** 40% × $2,100,000 = $840,000 → cap $2,840,000. The correct increase is 40% × **$100,000** = **$40,000**. |
| T64 | **Cache the unused-cap percentage as a stored constant and reuse it.** | **Wrong move:** computes the percentage once and carries it forward instead of recomputing from the all-time high each indexation year. **Fixture:** LCR Example A1 — the percentage is **13%** in FY2021-22 and **6%** in FY2023-24, because a new credit reset the high-water mark. A cached 13% gives $26,000 → $1,639,000 instead of **$1,625,000**. |
| T65 | **Treat investment earnings, investment losses or pension drawdowns as credits or debits in the transfer balance account.** | **Wrong move:** reuses the Retirement Phase balance as the transfer balance. **Fixture:** LCR 2016/9 ¶27 (Darius) — the interest is worth **$1.05m** at 1 Jul 2019 and the transfer balance is still **$1.1m**. Only a **commutation** (s 294-80(1) item 1) debits it. |
| T66 | **Measure the transfer balance intraday rather than at the end of the day.** | **Wrong move:** evaluates the maximum, or the excess, after each individual credit. **Fixture:** LCR 2016/9 ¶51 (Alice) — a credit and a debit on the **same day** (1 July 2017) that would breach intraday. She must have **never** had an excess transfer balance and must **remain eligible** for indexation. |
| T67 | **GUARDS THE REFUSAL BOUNDARY (R1) — must be built.** **Key the s 294-40(1)(b) bar off "had excess transfer balance", or un-latch it once the excess is commuted away.** *Same trap as T114, reached independently by §C from the breach side.* | **Wrong move:** resets `hasEverExceededCap` when the balance falls back under the cap, or equates the bar with excess transfer balance tax liability. **Fixture:** a Person who exceeds by **$50,000** on one day in FY2021-22 and commutes it out the next week must get **nil** indexation in FY2023-24, FY2025-26 **and** FY2026-27. Also LCR ¶76: a transitional-period excess that was *disregarded* for tax **still bars indexation**. **Under R1 this fixture must be expressed as Setting-fed history, not as projected days** — a projected day that would breach is refused. |
| T68 | **GUARDS THE REFUSAL BOUNDARY (R1) — must be built.** **Treat an exact equality as leaving indexation entitlement intact.** | **Wrong move:** tests `balance > cap` for the *bar* and then computes a positive unused percentage anyway. **Fixture:** LCR Example A2 — balance **exactly** $1,600,000 against a $1,600,000 cap → 100% used → **0%** unused → the personal cap stays **$1,600,000** in FY2021-22 and forever. |
| T69 | **On an indexation factor of 1 or less, hold last year's cap.** | **Wrong move:** implements s 960-285(4) as "cap unchanged", as register §3.2's pseudocode currently reads. **Fixture:** a deflation fixture — s 960-285(4) says "You do not index **the amount**", and the amount under s 294-35(3)(b) is the **base amount $1,600,000**, so the cap **reverts**, it does not hold. **Confidence: labelled inference** (research §A.4). Practically unreachable, but the pseudocode should not teach the wrong rule. |
| T70 | **Hard-code the indexation increase as $100,000.** | **Wrong move:** assumes one $100,000 step per indexation event. **Fixture:** LCR Example A1 step 2 — the FY2023-24 increase was **$200,000** ($1.7m → $1.9m). And FY2019-20, FY2020-21, FY2022-23 and FY2024-25 each had an increase of **$0**. |
| T71 | **Write the high-water day on a tie.** | **Wrong move:** updates `highestBalanceDay` on `>=` rather than `>`. **Fixture:** hand example 2 holds $1,200,000 for **195 consecutive days** spanning 1 Jul 2026. s 294-40(2)(b) takes the **earliest** of the tied days, so the denominator must be the cap on **1 Sep 2025**. |
| T72 | **Freeze the general transfer balance cap as a constant.** | **Wrong move:** stores $2,100,000 as a code constant rather than a config series. **Fixture:** it is **item 10A of the s 960-265 table** — this project's own gateway test for CONFIG. A 20-year projection must not hold $2.1m flat, and the engine must be able to produce the **indexation increase**, which needs two consecutive years. |
| T73 | **Modelling the transfer balance as the current value of the retirement-phase interests.** | The transfer balance is a cumulative record of *transfers into* retirement phase and moves only on the five credit and eight debit events; **it does not track the account**. **Fixture:** commence a pension at $1,500,000 on 1 July 2027; run to 30 June 2035 with drawdowns exceeding earnings so the account balance falls to $1,100,000; commence a second pension with $900,000. The transfer balance must be **$2,400,000**, not $2,000,000, and the second commencement must be reported as a breach. A model that revalues gives $2,000,000 and reports compliance. |
| T74 | **Debiting a pension payment.** | A minimum (or above-minimum) pension drawdown is a superannuation income stream benefit, and s 307-65(1) defines a superannuation lump sum as "*a \*superannuation benefit that is not a \*superannuation income stream benefit*", so it can never satisfy s 294-80(1) item 1. **Fixture:** a **$2,050,000** pension with **$110,000** of drawdowns in the year must leave the transfer balance at exactly **$2,050,000** at 30 June. Any debit is wrong. |
| T75 | **Crediting investment earnings.** | **Fixture:** a **$1,800,000** pension that grows to **$2,150,000** over five years with no further contributions must leave the transfer balance at **$1,800,000** and must **not** report a cap breach, even though the account now exceeds the general cap. That is the trap's tell — the wrong model reports a breach that does not exist, and the user is advised to commute for no reason. |
| T76 | **Offering "draw down more" as the remedy for an excess.** | LCR 2016/9 ¶25 is explicit that a large pension drawdown does not reduce the transfer balance. **Fixture:** given a transfer balance of **$2,200,000** against a cap of **$2,100,000**, the only remediation the tool may emit is a **commutation** of at least the excess (plus accrued s 294-235 earnings); any suggestion framed as an increased pension payment is a failure. |
| T77 | **Valuing an item 2 credit at 1 July instead of the commencement day.** | s 294-25(1) item 2 reads "*the \*value **on the starting day***". **Fixture:** a pension commenced on **1 October 2026** with **$500,000** on the commencement day and **$487,000** at the preceding 1 July must credit **$500,000**. The 1 July figure is a different number multiplied by nothing — it is simply the wrong day. This is the **opposite day rule** from §3.9's Schedule 7 minimum in a non-commencement year (cf. T56), which is exactly why the two get crossed. |
| T78 | **Treating a TRIS conversion as crediting only the amount originally put into the TRIS.** | The credit is the value of the supporting interest **on the conversion day**, full stop. **Fixture:** a TRIS commenced at 60 with **$800,000** that has grown to **$1,050,000** by the member's 65th birthday must credit **$1,050,000** on the birthday. Crediting $800,000 understates the balance by the entire TTR-phase growth and can hide a breach. |
| T79 | **Using the retirement day rather than the notification day as the TRIS starting day.** *Same trap as T116, found independently by §D — both fixtures kept.* | s 307-80(3)(b)(ii) keeps the stream out of retirement phase until the provider is notified. **Fixture (§B's):** retirement on **28 June 2027**, notification on **12 July 2027** → the account starts in **FY2027-28**, the personal cap is the FY2027-28 general cap, and the credited value is the balance on **12 July 2027**. A model that uses 28 June gets a different cap year *and* a different valuation day from one two-week input. |
| T80 | **Requiring notification for an age-65 TRIS conversion.** *Same trap as T117, found independently by §D — both fixtures kept.* | Item 106 (attaining 65) sits in s 307-80(2)(c)(iv), which is **not** in the (3)(b)(ii) notification list. **Fixture (§B's):** a TRIS held by a Person who turns 65 on **3 November 2028** and never notifies the fund must convert on **3 November 2028** and credit the balance on that day. A model that waits for a notification flag never converts the stream, never opens the account, and silently forecasts a TRIS running past 65 — also wrong for the fund's earnings tax exemption and for the §3.9 10% ceiling. **R5:** the conversion day is a **stated Setting**, and an absent conversion-day Setting for a Person holding a TRIS must raise a **named refusal**, never a silent skip — silence is conservative on the tax side but **flattering on the cap side**. **Confidence — RULED (R6), DO NOT NARROW: `inference from an express enumeration` — specifically, an argument from the ABSENCE of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — CORROBORATED BY A PUBLIC RULING. It is NOT bare `primary-verified`, and must never be recorded as such.** What makes it stronger than a bare negative: (i) the enumeration is **express and closed** — (b)(ii) lists three subparagraphs by number, so the omission is a drafting choice, not a silence; (ii) it sits **eight lines below** a paragraph that enumerates all four, so the drafter had the fourth in hand; (iii) there is **no residual or catch-all limb** in (3)(b) for it to fall into. Corroboration is **LCR 2016/9 ¶15** (first bullet, no notification words) and **Example 1A ¶¶30A–30B**. **What is still missing, and why the label is not upgraded:** no primary provision says in terms that attaining 65 converts a TRIS without notification — it is read off a list and confirmed by a ruling. See T117, O50, O65. |
| T81 | **Inferring a commutation from a large withdrawal.** | The same cashflow is a $100,000 debit or nothing depending on the member's act (s 307-65(2); LCR 2016/9 ¶41). **Fixture:** an above-minimum withdrawal of **$100,000** with no explicit `partialCommutation` characterisation must produce **no** debit; the same withdrawal marked `partialCommutation` must produce a **$100,000** debit on the day of receipt. Also assert the default is `pensionPayment` — the direction that does not invent headroom. |
| T82 | **Routing a full commutation through item 6 instead of item 1.** | Item 6 is expressly conditioned on "*items 1 and 5 do not apply*". **Fixture:** a full commutation producing a **$1,000,000** lump sum received on **7 July 2030** must debit **$1,000,000 on 7 July 2030** (item 1: "*the amount of the superannuation lump sum*", "*at the time you receive*"), not the interest's value just before the stop time on the stop day (item 6). Construct the case so the two differ — e.g. a market move between the instruction and the receipt, or a boundary at 30 June. |
| T83 | **Closing the transfer balance account when the last pension is commuted.** | s 294-15(1)'s "*or have at any time been*" and s 294-45's "*ceases when the retirement phase recipient dies*" together mean the account survives. **Fixture:** commence **$1,000,000** in FY2027-28, fully commute in FY2030-31, then commence a new pension in FY2034-35. The personal cap must still be the **FY2027-28** general cap (indexed only proportionally on the unused percentage measured against the historical high), **not** the FY2034-35 general cap. A model that closes and reopens the account hands the Person a free cap upgrade worth hundreds of thousands. |
| T84 | **Deriving the s 294-40 unused cap percentage from the current balance instead of the historical high.** *Same trap as T58, found independently by §A — both fixtures kept.* | s 294-40(2)(a) identifies "*the **highest** \*transfer balance … at the end of any day up to the end of the previous \*financial year*". **Fixture (§B's):** balance peaks at **$1,900,000**, is commuted to **$1,200,000**, then indexation occurs. The unused cap percentage must be computed off **$1,900,000**, not $1,200,000. **Cross-check on the rounding direction:** s 294-40(2)(c) rounds the *used* percentage **down**, which rounds the *unused* percentage **up** — LCR 2016/9 ¶17G works $1.4m/$1.6m = 0.875 → **87%** used → **13%** unused. |
| T85 | **Treating an account-based pension as capped defined benefit, or vice versa.** | **Fixture:** a Person flagged as holding a defined benefit lifetime pension must raise `CappedDefinedBenefitIncomeStreamNotModelledError` and must **not** credit the user's stated capital value; the correct number under s 294-135(2) is **annual entitlement × 16**, which the tool does not compute. **The test asserts the refusal, not a number.** *(Concern, transcribed not fixed: the drafted name carries no `Error` suffix — R8's one-home instruction for refusal names covers it.)* |
| T86 | **Pooling or transferring cap between spouses.** | **Fixture:** a couple with **$3,600,000** of super must not be able to commence **$2,600,000** for Person A and **$1,000,000** for Person B without Person A being reported in breach, however much unused cap Person B has. Div 294 is drafted wholly per individual and contains no aggregation provision. **Confidence:** the per-individual drafting is primary-verified; **the non-existence of an aggregation provision is a labelled inference from the absence of one** (§3.10). |
| T87 | **RECORDED-NOT-LIVE (R1).** **Taxing the excess instead of the earnings on the excess.** | A $200,000 excess must **not** produce `$200,000 × 15% = $30,000`. It produces **15% of $5,715.99 = $857.40** over 90 days. **Fixture:** a $200,000 excess for 90 days at an **11.43%** annual GIC rate returns tax of **$857.40**, and no code path multiplies a cap-excess by 0.15 or 0.30. |
| T88 | **RECORDED-NOT-LIVE (R1).** **Simple interest instead of daily compounding.** | s 294-25 item 3 credits each day's earnings back "at the start of the next day", so `E × r × N` is wrong. **Fixture:** the same fixture must return **$5,715.99**, not **$5,636.71** — a **1.39%** gap over 90 days that widens with the period. Assert the closed form `E × ((1+r)^N − 1)`. |
| T89 | **RECORDED-NOT-LIVE (R1).** **Annualising or re-dividing the s 8AAD(1) rate.** | s 8AAD(1) already divides by the days in the calendar year. **Fixture:** feed the engine an annual GIC rate of **11.43%** and assert the daily rate it uses is **0.000313150684931507**, not 11.43% and not 0.0000008579. |
| T90 | **RECORDED-NOT-LIVE (R1).** **Dividing by 365 unconditionally, or by the days in the *financial* year.** | s 8AAD(1) says *"the number of days in the **calendar** year"*. **Fixture:** a day in February 2028 must divide by **366**; 31 December 2027 must divide by **365**; and an excess period spanning 1 January must use **both**. |
| T91 | **RECORDED-NOT-LIVE (R1).** **Using the s 8AAD(1A) Division 296 rate (base + 3) for transfer balance purposes.** | Inserted into the same section on 1 April 2026 by No 8 of 2026. s 294-235(2)(a) cites *subsection 8AAD(1)* by number. **Fixture:** the excess-transfer-balance rate and the Div 296 rate differ by exactly `4 ÷ days-in-calendar-year` on any given day, and the transfer balance path consumes the **+7** one. |
| T92 | **RECORDED-NOT-LIVE (R1).** **Holding the rate constant across a calendar quarter boundary.** | The base interest rate changes on **1 Jan / 1 Apr / 1 Jul / 1 Oct** — not on 1 July only. **Fixture:** a 90-day excess beginning 1 August 2026 must produce **$5,729.06** (61 days at 11.43%, 29 at 11.51%), not $5,715.99. |
| T93 | **RECORDED-NOT-LIVE (R1).** **Storing a rounded daily rate as config.** | s 8AAD(4) rounds only the **base interest rate**, to 2 dp; the ATO's published 8-dp daily rate is a display figure. **Fixture:** the config record must hold the base or annual rate **per quarter**; assert **no 8-decimal literal daily rate exists under `src/data/`**. |
| T94 | **RECORDED-NOT-LIVE (R1).** **Treating a determination period as ordinary compounding, or as ordinary simple interest.** | Once a determination issues, s 294-25(2) stops the item 3 credit and s 294-230(3)(b) substitutes `r² · E · D(D−1)/2` on top of `D · r · E`. **Fixture:** a 90-day period run entirely as a determination period must yield **$5,715.26**, distinguishable from **both** $5,715.99 (compounded) and $5,636.71 (simple). |
| T95 | **RECORDED-NOT-LIVE (R1).** **Missing that a determination period ends early on any credit.** | s 294-25(2)(b)(ii): the period ends *"if a \*transfer balance credit arises … before that day — the day on which that credit arises"*. **Fixture:** a new pension commenced during a determination period must **re-arm item 3 compounding** from that day. |
| T96 | **RECORDED-NOT-LIVE (R1).** **Treating the excess transfer balance period as a financial year.** | s 294-230(2) is *"a continuous period of one or more days"* with no year boundary. **Fixture:** a period running **20 June to 20 July** is **one** period, not two, and the 15%/30% test applies to it once. |
| T97 | **RECORDED-NOT-LIVE (R1).** **Not breaking the period on a single compliant day.** | **Fixture:** 40 excess days, one compliant end-of-day, then 40 more excess days = **two** periods. If the first started on or after 1 July 2018, the second is taxed at **30%**, not 15%. |
| T98 | **RECORDED-NOT-LIVE (R1).** **Implementing "subsequent breach" as "the second breach ever".** | Imposition Act s 5(2) requires **both** that the current period starts on or after 1 July 2018 **and** that a previous liability arose for a period that *also* started on or after 1 July 2018. **Fixture:** a first period starting **1 March 2018** followed by a second starting **1 March 2019** must be taxed at **15%**, not 30%. |
| T99 | **RECORDED-NOT-LIVE (R1).** **Requiring a determination before the 30% rate can be primed.** | s 5(2)(b) says "has previously been **liable**"; s 136-10(1) Note says liability arises with or without a determination. **Fixture:** a prior period with **no determination and no assessment** must still prime 30%. |
| T100 | **RECORDED-NOT-LIVE (R1).** **Indexing 15% or 30%.** | Neither appears in ITAA 1997 s 960-265 — this project's indexation test — and the Imposition Act has no indexation provision and has never been amended. **Fixture:** the constants must be `kind: 'constant'`, and a mutation that FY-keys them must fail a register-consistency test. |
| T101 | **RECORDED-NOT-LIVE (R1).** **Booking the tax as a cash outflow in the year of the breach.** | s 294-240: due **21 days** after notice of assessment; s 294-245 for amendments. The assessment date is not fixed by statute. **Fixture:** the accrual year and the payment year must be **separable inputs**, and the engine must refuse to assume they are the same year rather than silently assuming it. |
| T102 | **RECORDED-NOT-LIVE (R1).** **Paying the tax from superannuation.** | TAA Sch 1 s 131-5(1) lists excess concessional, excess non-concessional, Div 293, Div 296 and FHSS. Excess transfer balance tax is **not** there. **Fixture:** whatever release-authority machinery exists for Div 293/296 must **not** accept an excess transfer balance liability. |
| T103 | **RECORDED-NOT-LIVE (R1).** **Sizing the s 294-80(1) item 5 debit at the reduction amount.** | It is *"the \*value of the \*superannuation interest that supports it"* — the **whole interest**. **Fixture:** a **$2.3m** interest with a **$200,000** reduction amount and a non-compliant provider must produce a **$2.3m** debit. |
| T104 | **RECORDED-NOT-LIVE (R1).** **Applying s 307-80(4) retrospectively to the transfer balance account.** | s 294-50(3) disregards s 307-80(4) for TBA purposes at every time before the end of the 60-day period. **Fixture:** credits and debits recorded earlier in that income year must be **untouched**; the item 5 debit must arise **at the end of the 60-day period**, not at the start of the income year. |
| T105 | **RECORDED-NOT-LIVE (R1).** **Applying s 294-50(3) to the earnings tax exemption.** | s 294-50(1) scopes it to *"(a) whether you have a \*transfer balance account; (b) the \*transfer balance in your transfer balance account"* and nothing else. **Fixture:** in a non-compliance year the interest must lose exempt current pension income for the **whole income year** while the transfer balance account is adjusted only **from the end of the 60 days**. The two dates deliberately differ; a test asserting they are the same is asserting the bug. |
| T106 | **RECORDED-NOT-LIVE (R1).** **Treating "no election" as "no correction".** | s 136-10(6)–(7) put the default commutation notice in the determination at the outset, and s 136-55(4) makes it mandatory on silence. **Fixture:** a member who does nothing for 60 days must **still be commuted**, on the default notice's streams. |
| T107 | **RECORDED-NOT-LIVE (R1).** **Treating a partial election as a ceiling.** | s 136-55(3): a short election is topped up with default-notice authorities. **Fixture:** an election covering **$50,000** of a **$200,000** commutable amount must produce authorities totalling **$200,000**. |
| T108 | **RECORDED-NOT-LIVE (R1).** **Letting the total of reduction amounts exceed the commutable amount.** | s 136-55(6) and s 136-65(4) both cap it. **Fixture:** a second round under s 136-65 must be capped at the commutable amount **less** lump sums notified under s 136-85 and **less** item 5 debits already arisen. |
| T109 | **RECORDED-NOT-LIVE (R1).** **Running the provider's 60 days from the determination.** | s 136-80(1): *"within 60 days after the **commutation authority** is issued"*, while s 136-20(4)'s 60 days runs from the **determination** — two separate 60-day clocks, in series, with an unbounded Commissioner gap between them. **Fixture:** the earliest possible correction is **≥120 days** after the determination, never 60. |
| T110 | **RECORDED-NOT-LIVE (R1).** **Assuming the provider must always comply.** | s 136-80(2) (capped defined benefit) and (3) (recipient has died) are both *"may choose not to comply"*, and limb (1)(b) caps the payment at the maximum available release amount. **Fixture:** a capped defined benefit stream must **not** be assumed commutable. |
| T111 | **RECORDED-NOT-LIVE (R1).** **Opening the s 136-70 valve without a determination.** | s 136-70(1) opens with *"at the end of a day **after the Commissioner has issued an \*excess transfer balance determination** to you"*. **Fixture:** an uncorrectable excess with **no determination** gets **no** item 7 debit and keeps accruing tax. |
| T112 | **RECORDED-NOT-LIVE (R1).** **Sizing the item 7 debit at the crystallised reduction amount.** | Item 7 is *"the amount of the \*excess transfer balance **stated in the notice**"* — the excess **now**, not the crystallised amount from the determination. Those differ by every debit and every day's compounding since. **Fixture:** the two must be **independently sourced**. |
| T113 | **RECORDED-NOT-LIVE (R1).** **Remitting accrued tax when the item 7 debit lands.** | The debit ends the excess transfer balance period **prospectively**; nothing remits tax already accrued. **Fixture:** tax for the days **before** the notice survives. |
| T114 | **GUARDS THE REFUSAL BOUNDARY (R1) — must be built.** **Forgetting that one end-of-day excess permanently kills proportional indexation.** *Same trap as T67; §A reached it from the indexation side, §C from the breach side.* | s 294-40(1)(b): *"at no time **before the start of that financial year** has the \*transfer balance … at the end of a day exceeded your transfer balance cap"*. **Fixture:** a **one-dollar, one-day** excess in FY2027-28 must freeze the personal cap for **every** later year in the projection, even after the excess is fully corrected. **This is the largest money consequence in the cluster and the easiest to omit.** The field is `hasEverExceededCap` (R1's spelling, §A.3 field 7) — latching, and under R1 its only live write path is the **user-supplied history**, because a projected breaching day is refused. |
| T115 | **Reading s 307-80(3)(b) alone and ignoring the conjunction with (a) and (aa).** | (3) excludes only where **(a) AND (aa) AND (b)** all hold. **Fixture:** an ordinary account-based pension (not a listed kind), benefit payable, recipient has satisfied no condition of release and has notified nobody, must be **retirement phase** — paragraph (a) fails, so the carve-out cannot bite. An implementation that tests only "(b)" returns accumulation and taxes exempt earnings at 15%. |
| T116 | **Treating a met condition of release as sufficient to convert a TRIS.** *Same trap as T79, found independently by §B — both fixtures kept.* | For items 101, 102A and 103 it is **not** sufficient: (3)(b)(ii) requires the member to have **notified the provider**. **Fixture (§D's):** member retires **1 March**, notifies the provider **1 September**. Phase must be **accumulation** throughout 1 March – 31 August and **retirement** from 1 September. An implementation keyed on `release.met` converts on 1 March, exempts six months of fund earnings that are taxable, and dates the transfer balance credit six months early at the wrong value. |
| T117 | **The mirror error: requiring notification for the age-65 limb.** *Same trap as T80, found independently by §B — both fixtures kept.* | Item 106 is absent from (3)(b)(ii)'s enumerated list, so **no notification is required**. **Fixture (§D's):** member attains 65 on **14 February**, has told nobody, still holds a TRIS. Phase must be **retirement** from 14 February, and a s 294-25 item 2 credit must arise on that day for the **whole supporting interest's value**. An implementation that demands notification leaves the stream in accumulation indefinitely, taxes exempt earnings at 15%, and — worse — **misses the transfer balance credit entirely**, so a member who is over their cap looks compliant. **The fixture must also state that the member satisfied *none* of items 101, 102A or 103 before turning 65** — otherwise it silently encodes one side of an unresolved reading (**O65**, U16, O50). **R5:** an absent conversion-day Setting for a Person holding a TRIS must raise a **named refusal**, never a silent skip. **Confidence — RULED (R6), DO NOT NARROW: `inference from an express enumeration` — specifically, an argument from the ABSENCE of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — CORROBORATED BY A PUBLIC RULING. It is NOT bare `primary-verified`, and must never be recorded as such.** What makes it stronger than a bare negative: (i) the enumeration is **express and closed** — (b)(ii) lists three subparagraphs by number, so the omission is a drafting choice, not a silence; (ii) it sits **eight lines below** a paragraph that enumerates all four, so the drafter had the fourth in hand; (iii) there is **no residual or catch-all limb** in (3)(b) for it to fall into. The corroboration is **LCR 2016/9 ¶15** — a public ruling, whose first bullet carries no notification words — and **Example 1A ¶¶30A–30B** (Robert, over 65 on 1 July 2017, $900,000 credit, notification never mentioned). **What is still missing, and why the label is not upgraded:** no primary provision says in terms that attaining 65 converts a TRIS without notification — it is read off a list and confirmed by a ruling. |
| T118 | **Conflating reg 6.01(2)'s "Nil cashing restriction" set with s 307-80(2)(c)'s four-item set.** | The SISR set is **strictly larger**: it also contains items 102, 104 and 105(b). **Fixture:** member satisfies item 104 (termination of employment with a standard employer-sponsor, with preserved benefits under $200). The TTR maximum must **fall away** (reg 6.01(2)(b)(ii)'s "unless" fires) while the phase must remain **accumulation** at 15% with **no** transfer balance credit — item 104 is not in s 307-80(2)(c). An implementation that derives phase from "the 10% no longer applies" exempts the earnings and creates a credit that does not exist. |
| T119 | **Collapsing the ceiling event and the phase event onto one day.** | On the 101/102A/103 route the ceiling falls away on the day the condition is **satisfied** (reg 6.01(2)(b)(ii) has no notification word) and the phase changes on the day of **notification** (s 307-80(3)(b)(ii)). **Fixture:** member retires **30 June**, notifies **15 July**. For 30 June there must be **no maximum**, **15%** fund earnings tax and **no** transfer balance credit — three answers that no single "converted" boolean can produce. |
| T120 | **Treating the conversion as a commencement.** | It is not — the same stream continues. **Fixture:** TRIS commenced 2020, member turns 65 on **1 December 2026**. The FY2026-27 Schedule 7 minimum must be computed on the **1 July 2026 balance**, the **age at 1 July 2026**, with **no pro-rating** and no cl 4 nil rule. An implementation that re-reads the balance on 1 December and pro-rates **211/365** produces a smaller, entirely plausible minimum. (Contrast T56 — the commencement-year rules that do *not* apply here.) |
| T121 | **Crediting the transfer balance account with the wrong amount.** | s 294-25(1) item 2 credits "the \*value on the starting day of the \*superannuation interest **that supports** the superannuation income stream". **Fixture:** a **$900,000** TRIS converting must credit **$900,000** on the conversion day — not the year's pension payments, not the growth since commencement, not the amount "moved" (**nothing is moved**). |
| T122 | **Treating a reverted TRIS as not in retirement phase because the beneficiary has met no condition of release.** | (3)(aa) takes it out of the carve-out entirely. **Fixture:** a TRIS reverts to a **45-year-old** reversionary beneficiary who has satisfied nothing and notified nobody. On the statute the stream **is** in retirement phase. This project should **refuse** rather than compute it (research §D.3) — so the test asserts a **named refusal** (`ReversionaryStreamNotModelledError`, R8), not a 0% rate, and must fail if the code silently returns either 15% or 0%. |
| T123 | **Treating a 10% breach as costing one year.** | TR 2013/5 ¶20: the stream "cannot recommence meeting the SISR requirements in a future year"; ¶101: a new stream must be commenced and the proportioning rule reapplied. **Fixture:** a scenario that breaches in FY2027-28 must **not** show the same stream running normally in FY2028-29. If the model cannot represent the death of a stream, it must **refuse the breaching year** rather than continue past it. |
| T124 | **Citing TR 2013/5 ¶71B's plain-English gloss instead of s 307-80(3)(b)(ii).** | ¶71B says a TRIS "will not be in the retirement phase unless the person **has met a specified condition of release**", omitting notification. **Fixture:** the same fixture as T116. Any comment, docstring or register row whose wording follows ¶71B rather than the statute will encode the wrong answer for Case B; a **source-text canary**, asserting that the notification requirement appears in the module's own reasoning, is the cheap guard. |
| T125 | **Treating entry into retirement phase as an act the user chooses.** | On the item-106 route it is **automatic**. **Fixture:** a member with a **$2.4m** TRIS who turns 65 in FY2026-27 and does nothing must show a **$2.4m** credit on their birthday, an **excess transfer balance** against the **$2,100,000** cap, and — under s 294-40(1)(b) — **permanent loss of proportional indexation**. A model that only creates credits when the user commences a pension shows this member as compliant forever. *(Transcriber's note: under R1 the excess in this fixture makes the year a refused year; the credit and the s 294-40(1)(b) consequence are still live — see T114.)* |

---

### Exempt current pension income (ECPI)

**Added 2026-09-10** from `docs/research/p3-25-ecpi-apportionment.md` (P3-25). The rules these guard
are in **§3.11**; these rows are the lookup form and cite it rather than restate it. **Five of the
nine carry a §9 mutation row** — T132 and T130 through **M-P3-25-1**, and T126, T129 and T133
through the three ECPI rows beside it in §9's *Superannuation* table — and **four do not: T127,
T128, T131 and T134**. The sentence here until 2026-09-16 said *"only T132 has a mutation test … the
other eight do not yet"*, which was true when it was written and stopped being true when those three
rows landed. **Where the remaining four are tracked, said plainly because their old tracker has
closed:** they were carried with the outstanding transfer balance cap traps under **O66**, and O66
was **discharged on 2026-09-16** when the last of those was tested. They are **not** discharged with
it. Until they are given an open item of their own they are tracked **here and in §1's Exception 2
only**, and §1's Exception 2 is the one a reader is sent to — it is derived from §9's Trap column by
`test/assumptions-register-o66.test.mjs`, so the four cannot quietly become zero.

| # | Trap | Implementation consequence |
|---|---|---|
| T126 | **The s 295-387 disregarded-small-fund-assets threshold is $1,600,000 and it is FROZEN.** It is a literal in s 295-387(2)(c)(i), never amended, and **absent from the s 960-265 indexation table**. | **Wrong move:** wiring it to the general transfer balance cap, which puts it at **$2,100,000** for FY2026-27 — the two look alike and one of them moves. **Fixture:** a member with TSB **$1,800,000** at 30 June 2026 who was a retirement phase recipient then → the fund **is** DSFA and **must** use the proportionate method; the wired version exempts it. **Test:** s 960-265's complete table contains no s 295-387 item (§3.11.4). |
| T127 | **Deemed segregation is not chosen — it arrives by itself.** Where every interest is in the retirement phase, all the fund's assets are dealt with solely for RP liabilities and, for an account-based pension, are segregated current pension assets under s 295-385(4) with **no certificate and no trustee act**. | **Wrong move:** reading "segregated" as "the trustee segregated", so a fund that goes 100% retirement phase mid-year is treated as unsegregated. **Fixture:** §3.11.7 F4 branch 1 — **$4,296.58**, not $3,069.86, unless the s 295-385(9) election was actually made. **Confidence:** a reading of the operative words corroborated three times inside the statute, **not** bare `primary-verified` (R6). |
| T128 | **DSFA reaches ACROSS funds.** s 295-387(2)(c)(ii) applies *"whether or not the fund is the superannuation income stream provider"*. | **Wrong move:** testing the $1.6m TSB limb and the retirement-phase-recipient limb against **this** fund's interests only. **Fixture:** a spouse with a **$1.9m APRA-fund pension** and a $200,000 SMSF interest → the **SMSF** is DSFA and loses both the segregated method and the s 295-385(9) election. |
| T129 | **DSFA is tested at the PREVIOUS 30 June, not at the conversion.** | **Wrong move:** testing "as at the conversion", which catches the conversion year and misses the next — exactly backwards. **Fixture:** a first pension commencing 14 Dec 2026 → **not** DSFA in FY2026-27 (the member was not a retirement phase recipient at 30 Jun 2026), and DSFA in FY2027-28 if TSB at 30 Jun 2027 exceeds $1.6m. The apportionment question arises in the year the test does **not** bite. |
| T130 | **A days-based split of the conversion year's earnings is not the law under either method.** The one express days formula in Subdivision 295-F is **s 295-410**, and it is for **retirement savings accounts**. | **Wrong move:** implementing `earnings × days_in_retirement_phase / 365` at 0% and the rest at 15%, on the strength of s 295-410. **Fixture:** §3.11.7 F4 — that formula gives **$3,069.86**, which is the **proportionate** answer, on facts where the fund is on the **segregated** method and owes **$4,296.58**. **Confidence:** *expressio unius* — an argument from the absence of the equivalent provision for a fund, and under **R6** never recorded as bare `primary-verified`. |
| T131 | **s 295-385(5)'s "at all times during the income year" is satisfied VACUOUSLY in the conversion year** — the fund had no retirement-phase liabilities for the first part of it. | **Wrong move:** reading (5) as requiring RP liabilities to have existed all year, and so denying the **certificate-free** s 295-385(4) route in exactly the year it is needed. **Confidence: a reading, not a retrieved answer — U34.** Nothing contradicts it and s 295-390(7) uses the identical formulation, but no authority was found either way. **Record it, do not bury it.** |
| T132 | **The naive lift of `MidYearPhaseChangeError` lands on the flattering extreme.** | **Wrong move:** deleting the `phaseHeldForTheWholeYear` guard and using each interest's stated phase. **Fixture:** §3.11.7 F3 — returns **$4,500.00** where the statutory figure is **$7,569.86** and the bound is **$11,250.00**, understating the fund's tax by **$3,069.86** in the first year of the strategy the tool exists to evaluate. It is identical to the **provable floor**: not an approximation of the right answer, the worst available answer in the wrong direction. **This is the mutation guard for the whole refusal — M-P3-25-1.** |
| T133 | **The s 295-390 exempt proportion applies to the WHOLE year's income**, including income derived months before any pension existed. | **Wrong move:** applying the proportion only to post-conversion income, which double-counts the part-year effect — the proportion is already a **year-average** liability ratio. **Fixture:** §3.11.7 F1 — `$75,000 × 32.7123%`, **not** `$75,000 × (199/365) × 32.7123%`. |
| T134 | **An ATO 404 body is ~101.5 KB from the Legal Database and ~257 KB from a guidance path.** | **Wrong move:** memorising §10 recipe 12's "~257 KB" as a success/failure signal. **Every one of the P3-25 pass's twelve Legal Database 404s would have read as a success.** The body size of a 404 is not a constant, so it is not a signal at all — **read the status code** (§10 recipe 12, corrected 2026-09-10). |

---

## 2. Income tax and offsets

Income base by Person, never by Household — even where the eligibility gate reads combined income.

### 2.1 Rates and levy

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Tax-free threshold | $18,200 | 2026-27 | config | [ATO resident tax rates](https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents) | 2026-09-03 | primary-verified |
| Lowest marginal rate | 0.15 | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Second lowest marginal rate | 0.30 | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Bracket table | nil to $18,200 · 15% to $45,000 · 30% to $135,000 · 37% to $190,000 · 45% above | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Tax-free threshold, FY2027-28 **and every later year** | $18,200 | 2027-28 → | config | [Income Tax Rates Act 1986 s 3(1)](https://www.legislation.gov.au/C2004A03348/latest/2026-07-01/text/original/epub/OEBPS/document_1/document_1.html) — *"tax-free threshold means $18,200"*, a **standing definition**, not year-tabled | 2026-09-17 | primary-verified |
| Lowest marginal rate, FY2027-28 **and every later year** | **0.14** | 2027-28 → | config | ITRA 1986 Sch 7 Pt I cl 1(b), third table item 1; corroborated by ATO new-legislation QC104015 (*"This measure is now law"*) | 2026-09-17 | primary-verified |
| Second lowest marginal rate, FY2027-28 **and every later year** | 0.30 | 2027-28 → | config | ITRA 1986 Sch 7 Pt I cl 1(b), third table item 2 | 2026-09-17 | primary-verified |
| Third marginal rate, FY2027-28 **and every later year** | 0.37 | 2027-28 → | config | ITRA 1986 Sch 7 Pt I cl 1(b), third table item 3 | 2026-09-17 | primary-verified |
| Top marginal rate, FY2027-28 **and every later year** | 0.45 | 2027-28 → | config | ITRA 1986 Sch 7 Pt I cl 1(b), third table item 4 | 2026-09-17 | primary-verified |
| Bracket table, FY2027-28 **and every later year** | nil to $18,200 · **14%** to $45,000 · 30% to $135,000 · 37% to $190,000 · 45% above | 2027-28 → | config | assembled from the five rows above | 2026-09-17 | primary-verified (as weak as its weakest rate, and its weakest rate is the Act) |
| Bracket thresholds indexed? | **No** — never have been | — | constant | ADR-0001; ATO | 2026-09-03 | primary-verified |
| Medicare levy rate | 2% | 2026-27 | config | [ATO resident tax rates](https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents) | 2026-09-03 | primary-verified |
| Rounding of tax payable, LITO, WATO and the Medicare levy (P3-1d) | **whole cents, no rounding** — the law states no rounding rule for any of the four: ITAA 1997 s 4-10(3) (the method statement), ss 61-110/61-115 (LITO), ss 61-155/61-160 (WATO), *Medicare Levy Act 1986* ss 7, 8. SAPTO alone rounds, **up**, by reg ss 9(8), 10(2) (§2.3, built). **Immaterial:** at current rates a whole-dollar income gives exact cents (every bracket rate, the 2% levy and the 10% s 7(2) shade-in are whole percentages; LITO's 5% and 1.5% tapers can leave a half-cent, which `mulCents` rounds); cents inside taxable income move tax by < 47c per dollar of cents (45% top rate + 2% levy) — under $1 a year. The TODO's former premise, *"the ATO rounds to whole dollars on assessment"*, is **unsourced**: no provision or ATO publication stating it was found, so it is not applied | — | constant | ITAA 1997 s 4-10(3), ss 61-110, 61-115, 61-155, 61-160; Medicare Levy Act 1986 ss 7, 8 | 2026-09-30 | primary-verified (absence of a rule in the provisions named); pinned by `test/core-tax-rounding.test.mjs` |

**Sch 7 Pt I has now been read directly — open item O8 is CLOSED (2026-09-17, P2-10b).** The Act
was retrieved from the Federal Register's epub text endpoint (the SPA page serves no text):
Compilation No. 66, compilation date 1 July 2026, including Act No. 50 of 2026. Clause 1(b) carries
**three** tables and the third one is the finding:

| Heading, verbatim | Rates |
|---|---|
| *Tax rates for resident taxpayers for the 2024-25 or 2025-26 year of income* | 16 / 30 / 37 / 45 |
| *Tax rates for resident taxpayers for the 2026-27 year of income* | 15 / 30 / 37 / 45 |
| ***Tax rates for resident taxpayers for the 2027-28 year of income or a later year of income*** | **14 / 30 / 37 / 45** |

bands: *exceeds the tax-free threshold but does not exceed $45,000* · *$45,000 – $135,000* ·
*$135,000 – $190,000* · *exceeds $190,000*.

Two consequences, and they are the whole of P2-10b:

1. **R12's three "carried-forward" FY2027-28 rates were never assumptions.** The Act states them.
   They are re-sourced here and their confidence moved from `unverified` to `primary-verified` —
   the one direction the §9 laundering rule permits, because a primary text was actually read.
2. **There is no last year.** The third table names every later income year in its own heading, so
   the ladder for FY2028-29 → FY2074-75 is sourced, not projected from a guess.

The ATO's own rate page (retrieved 2026-09-17, HTTP 200, *last updated 13 August 2026*) publishes
resident rates **only to FY2026-27** — its own subtitle reads *"for income years from 2027 back to
1984"* — and so cannot source FY2027-28 or later at all. That is why the Act, not the ATO table, is
the citation on every row above from FY2027-28 on.

**The rule this section declines by, and its boundary (R12, 2026-09-15 — Finding 1 below, closed).**
Until R12 this document stated the rule **nowhere**: it lived in `src/core/incomeTax.ts`'s header
and in TODO P3-1, and a task list is not a specification. The rule is:

> **The engine applies a bracket table it holds; it never derives one.** A financial year is
> computed only where this section carries a rate ladder for it. A ladder may be carried forward
> from the last verified year where — and only where — carrying it forward can only **over-state**
> tax (R9, R12); thresholds are never carried forward as an estimate at all, because they are
> **never indexed**. Where the SOURCE ITSELF names later years — as Sch 7 Pt I cl 1(b)'s third
> table does, *"or a later year of income"* — applying it to those years is not a carry-forward at
> all and carries the source's own confidence; what it carries instead is **distance**, recorded
> on the answer as `standingLawFrom` rather than folded into its confidence. Where no ladder
> exists, the engine **refuses by name**. It does not interpolate, inflate or invent one.

**The boundary after R12, stated by year, because "any future year" was the thing this row used to
get wrong:**

| Year | What happens | Why |
|---|---|---|
| **FY2025-26 and earlier** | refused by a **bare, nameless `RangeError`** from `taxYear` — *"no tax assumptions for FY2025-26"* | the year is below the window. Sch 7's other two tables name their years expressly and there is no standing table running backwards. **Outside R8's naming discipline, and R12 accepts that** |
| **FY2026-27** | computed, `primary-verified`, **STATED** | full ATO table |
| **FY2027-28** | computed, `primary-verified`, **STATED** | the last year this register states as a record of its own. All four rates are Sch 7 Pt I cl 1(b)'s third table; the 0.14 is also QC104015's second stage |
| **FY2028-29 and every later year** | computed, `primary-verified`, **PROJECTED** — marked `standingLawFrom: '2027-28'` | the Act's third table is headed *"or a later year of income"*. Figures identical to FY2027-28's; the answer is **distinguishable from a stated one only by the marker**, never by the number |
| **A year present in the year table but carrying no `brackets`** | refused by name — `MissingBracketTableError`, §2.1.1 | **no such year exists in the build.** `brackets` is an optional field, so the guard stands as defence in depth and is exercised by a **synthetic** year record in `test/core-income-tax.test.mjs` |

**What replaced the carry-forward, and what did not change.** The ladder is no longer carried
forward at all — it is transcribed, from a source whose own words cover every year of the walk. The
residual is therefore **amendment, not absence**, and it runs the same safe way: every movement in
this ladder on record is a cut (16% → 15% → 14%), so the standing table **over-states tax or is
exactly right**. `test/assumptions-tax.test.mjs` asserts by name that the 1 Jul 2027 cut is the only
fall anywhere in a fifty-year sweep. **TODO P2-10**, the annual refresh, remains the mechanism that
re-reads the Act; what it now guards against is an amendment nobody noticed rather than a guess
nobody replaced.

#### 2.1.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the row below is
enforced from the moment it exists, status included. It is §2's first addition to that inventory. It
was in `src/core/incomeTax.ts` before this table existed and was named **nowhere in this document**
— the P3-26 quarantine, which is a finding and not an exemption: a refusal with no register row is
a decision the specification does not record.

**It belongs to §2.1 because the record it refuses on is §2.1's own bracket-table row — but its reach
is wider than this section, and that is the placement's one difficulty.** The class is constructed
in a single helper — `bracketTableOf` since R12, `bracketsFor` before it — and **two call paths
arrive there**: `taxOnTaxableIncome`, which is §2.1's own arithmetic, and the reg s 12 tax-payable
precondition inside `seniorsAndPensionersOffset`, which is **§2.6's**. Both paths are still there;
what changed on 2026-09-15 is that neither can now carry a year that fires it. Verified by running
rather than reasoned about, **before R12**: a SAPTO-eligible couple whose transfer test was actually
reached raised this refusal for FY2027-28 out of a §2.6 function, and `householdIncomeTax` raised it
for the same year *after* SAPTO had been computed and thrown away. Since R12 that couple is
computed. §2.6 carries no row about the dependency either way. The only statement
anywhere that §2.6's answer depends on §2.1's table being present is a comment above the
precondition list — *"the tax-payable test — the only one needing a bracket table — is reached
last"* — so the refusal has already shaped the order of a section that never mentions it.

**It is a scope refusal** — §3.5.1's and §3.11.9's fourth kind, not a rule of law, not an input-shape
guard and not a drift tripwire on this register's own records. What is missing, where it fires, is a
**table to apply to the year**.

**NARROWED 2026-09-15 by R12, and the narrowing left it reachable by no real input.** FY2027-28 was
the one year that reached it; §2.1 now carries that year's ladder, so **no year in this build omits
`brackets`** and the refusal fires for nothing the engine can be asked for. It was **not deleted** —
that is the naive repair and R12 forbids it: `brackets` remains an optional field, so a table-less
year record stays constructible and the guard is what stops one reaching the arithmetic. Because an
unreachable guard is decoration, the guard now takes the **year record** as a parameter
(`bracketTableOf`) and `test/core-income-tax.test.mjs` drives it with a clearly labelled
**synthetic** `TaxYear` that carries no table. Synthetic drivers are permitted in `test/` and
nowhere in `src/`.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingBracketTableError`** | a financial year whose `TaxYear` record carries **no `brackets`** reaches the bracket-table guard. One throw site, now in `bracketTableOf`, which takes the year record rather than fetching it; the two call paths are unchanged — `taxOnTaxableIncome`, which is §2.1's own arithmetic, and, through `seniorsAndPensionersOffset`, §2.6's reg s 12 tax-payable precondition. **NARROWED 2026-09-15 by R12 and now reachable by NO REAL INPUT.** FY2027-28 was the only year in the build that omitted a table; §2.1 carries its ladder as of R12, so every year the engine holds has one, and a year absent from the year table altogether raises `taxYear`'s **bare, unnamed `RangeError`** before this guard is reached (FY2025-26 → *"no tax assumptions for FY2025-26"*, verified by running; the example was FY2030-31 until P2-10b, which made that year computable). The named refusal remains the **inner** boundary and the outer one remains **nameless**, outside R8's naming discipline — R12 accepts that expressly. **It was not deleted, and deleting it is forbidden:** `brackets` is an optional field, so a table-less year record is still constructible and this is the guard that stops one reaching the arithmetic. **Reachability is now a test's job, not an input's:** a clearly labelled **synthetic** `TaxYear` in `test/core-income-tax.test.mjs` drives `bracketTableOf` directly and asserts the throw, and deleting the guard fails that test. **Finding 1 — CLOSED 2026-09-15.** §2.1 now states the rule (*the engine applies a table it holds and never derives one*) and tabulates its boundary by year, so it no longer lives only in `src/core/incomeTax.ts`'s header and TODO P3-1. **Finding 2 — CLOSED, and it is what R12 turned on.** The message used to claim a FY2027-28 table *"would be an assumption the register does not make"*; the register made most of it, and the gap was two numbers — the **37% and 45%** — not a table. Both were carried forward under R12, `unverified`, each with its direction of error recorded, and **the message was rewritten**, because after R12 the register did make the assumption and the old wording would have been simply false. **Superseded 2026-09-17 by P2-10b:** Sch 7 Pt I cl 1(b)'s third table states both rates expressly, so neither is carried forward any more, both are `primary-verified`, and the message was rewritten a second time — the refusal's example year also moved from FY2030-31 (now computed from standing law) to FY2025-26 (below the window), because opening the window upward moved the only reachable boundary downward. **Finding 3 — RESOLVED by R12 in R9's favour.** R9 does govern the bracket table: bracket figures are not indexed, so carrying them forward is the explicit assumption *no legislated change*, it can only over-state tax, and refusing the tax for a year projected for SAPTO, LITO and the Medicare levy was incoherent. **Finding 4 — CLOSED 2026-09-15.** `householdIncomeTax` no longer handles an absence it cannot see: the `brackets === undefined ? [] : …` provenance branch is gone, replaced by the same guarded lookup the arithmetic uses, so the table is either present or the call has already refused | **BUILT** — `src/core/incomeTax.ts`. One throw site, **two call paths** — §2.1's arithmetic and §2.6's transfer precondition — and no input in the build reaches either; the refusal is exercised by a synthetic year record in `test/core-income-tax.test.mjs` |

### 2.2 LITO — ITAA 1997 Subdiv 61-D

Income base: **taxable income** (s 61-115(1)(a)). Not rebate income, not adjusted taxable income.
Non-refundable. Not indexed — changes only by amendment.

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Maximum offset | $700 | 2026-27 | config | [ITAA 1997 s 61-115](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-115%22) · [ATO QC105020](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset) | 2026-09-03 | primary-verified |
| Stage-1 phase-out threshold | $37,500 | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Stage-1 taper | 5c per $1 over $37,500 | 2026-27 | constant | as above | 2026-09-03 | primary-verified |
| Stage-2 phase-out threshold | $45,000 | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Stage-2 base amount | $325 | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| Stage-2 taper | 1.5c per $1 over $45,000 | 2026-27 | constant | as above | 2026-09-03 | primary-verified |
| Eligibility ceiling | taxable income ≤ $66,667 | 2026-27 | config | [ITAA 1997 s 61-110(1)(b)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-110%22) | 2026-09-03 | primary-verified |
| Refundability | non-refundable | — | constant | ATO QC105020 | 2026-09-03 | primary-verified |

**Statutory table (s 61-115(1)) — a step function on bands, not one continuous formula:**

```
if taxable_income <= 37,500:                    offset = 700
elif taxable_income <= 45,000:                  offset = 700 - 0.05 * (taxable_income - 37,500)
elif taxable_income <= 66,667:                  offset = 325 - 0.015 * (taxable_income - 45,000)
else:                                           offset = 0
offset = max(0, offset)
```

The limbs join cleanly at $45,000 ($700 − 5% × $7,500 = $325). At $66,667 the second limb computes
to −$0.005 — **clamp at zero**. Implement the s 61-110(1)(b) gate as well as the amount table even
though both give the same answer.

### 2.3 SAPTO — fixed parameters

Income base: **rebate income** (ITAA 1936 s 6(1)) = taxable income (disregarding assessable FHSS
released amounts) + reportable superannuation contributions + total net investment loss + adjusted
fringe benefits total. Salary sacrifice and personal deductible contributions **add back**. Age
Pension payments are assessable and therefore already inside it.

Statutory home: ITAA 1936 s 160AAAA, with every dollar figure and formula in the **Income Tax
Assessment (1936 Act) Regulations 2025** (`F2025L01060`, commenced 1 Oct 2025), Part 5 Div 1,
ss 9–12. All rows below sourced from the Authorised Version PDF at
`https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf`.

| Name | Value | FY | Kind | Retrieved | Confidence |
|---|---|---|---|---|---|
| `rebateMaximumAmount` (reg s 4) | $445 | 2026-27 | config | 2026-09-03 | primary-verified |
| `rebateReductionRate` (reg s 4) | 0.015 | 2026-27 | config | 2026-09-03 | primary-verified |
| `rebateReductionThreshold` (reg s 4) | $37,000 | 2026-27 | config | 2026-09-03 | primary-verified |
| Base rebate amount — single (not a spouse at any time) | $2,230 | 2026-27 | config | 2026-09-03 | primary-verified |
| Base rebate amount — each member of a couple | $1,602 | 2026-27 | config | 2026-09-03 | primary-verified |
| Base rebate amount — each member of an illness separated couple | $2,040 | 2026-27 | config | 2026-09-03 | primary-verified |
| Taper rate (reg s 11(2)(b)) | 12.5c per $1 over the shade-out threshold | — | constant | 2026-09-03 | primary-verified |
| Rounding (reg ss 9(8), 10(2)) | thresholds and offset rounded **up** to the whole dollar | — | constant | 2026-09-03 | primary-verified |
| Refundability | non-refundable | — | constant | 2026-09-03 | primary-verified |
| Base rebate amounts indexed? | **No** | — | constant | 2026-09-03 | primary-verified |

Multiple-item rule (reg s 9(2)(b)): if more than one item applies during the year, use the
**greatest** entitlement. Reg s 9(3): permanent separation ⇒ not spouses ⇒ the $2,230 single
amount; an *illness* separation gives $2,040.

**Part of a year (2026-09-30, O90).** The ATO's SAPTO page gives the illness-separated row to a
couple where *"at any time during the year you and your spouse had to live apart due to illness or
because one of you was in a nursing home"*, and adds: *"If more than one item in this table applies
to you during the income year, we base your offset on the amount giving you the greatest
entitlement."* So a separation in any month gives $2,040 for the whole year, not a share of it.
Source: ato.gov.au, "Seniors and pensioners tax offset", retrieved 2026-09-30.

### 2.4 SAPTO — the derived thresholds (store the formula, not the numbers)

**Trap T5/T6.** Reg s 9(4)–(8) derives the shade-out threshold from the year's marginal rates.
Every threshold moved when the lowest rate fell 16%→15% on 1 Jul 2026, and moves again at 14% on
1 Jul 2027.

```
# reg s 9(5) — ordinary branch
T5 = tax_free_threshold + (rebateMaximumAmount + BRA) / lowest_marginal_rate

if T5 > rebateReductionThreshold:                                   # reg s 9(4)(b)
    # reg s 9(7)
    S7 = rebateReductionThreshold
         * (rebateReductionRate + second_lowest_rate - lowest_rate)
    # reg s 9(6)
    T  = (lowest_rate * tax_free_threshold
          + rebateMaximumAmount + BRA + S7)
         / (rebateReductionRate + second_lowest_rate)
else:
    T = T5

shade_out_threshold = ceil(T)                                        # reg s 9(8)
cut_out_threshold   = ceil(BRA / 0.125 + shade_out_threshold)         # reg s 10(1)
offset              = ceil(BRA - 0.125 * max(0, rebate_income - shade_out_threshold))
```

At `lowest_rate = 0.15`, `T5 > $37,000` exactly when `BRA > $2,375` — so in FY2026-27 the s 9(5)
branch always applies to an untransferred amount, and s 9(6) is reached **only** once a transfer
is added. At 0.14 in FY2027-28 the single case alone gives `18,200 + 2,675/0.14 = $37,307`, so
**s 9(6) becomes the default with no transfer at all**.

**Golden fixtures — published values, never the source of truth:**

| FY | Case | Shade-out | Cut-out | Kind | Source | Confidence |
|---|---|---|---|---|---|---|
| 2026-27 | Single | $36,034 | $53,874 | config (derived) | [ATO QC104015](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer) | primary-verified |
| 2026-27 | Couple, each | $31,847 | $44,663 | config (derived) | as above | primary-verified |
| 2026-27 | Illness separated, each | $34,767 | $51,087 | config (derived) | as above | primary-verified |
| 2025-26 | Single | $34,919 | $52,759 | fixture | [ATO QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | primary-verified |
| 2025-26 | Couple, each | $30,994 | $43,810 | fixture | as above | primary-verified |
| 2025-26 | Illness separated, each | $33,732 | $50,052 | fixture | as above | primary-verified |

The formula reproduces all six to the dollar, including the round-up. **QC72197 publishes the
FY2025-26 set with no year label** — trap T7.

### 2.5 SAPTO — eligibility

Two conditions, both required (ITAA 1936 s 160AAAA(2)–(4)).

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Age Pension age (social-security limb) | 67 | 2026-27 | config | [ATO QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | 2026-09-03 | primary-verified |
| "Qualified for", not "receiving" | a $0-entitlement Person still satisfies s 160AAAA(2)(b) | — | constant | [ITAA 1936 s 160AAAA](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19360027%2F160AAAA%22) | 2026-09-03 | primary-verified |
| Income gate, partnered Person | **half** of combined rebate income vs the cut-out | — | constant | ITAA 1936 s 160AAAA(4) | 2026-09-03 | primary-verified |
| Amount basis, partnered Person | the Person's **own** rebate income | — | constant | Reg 2025 s 11(2) | 2026-09-03 | primary-verified |
| Gaol exclusion | no offset if in gaol for the whole year | — | constant | ITAA 1936 s 160AAAA(2) | 2026-09-03 | primary-verified |

**Trap T2 fixture** (ATO worked example, *Ying and Li Jun*): combined $79,697, halved = $39,848.50
< couple cut-out ⇒ both eligible; Ying's own rebate income $54,020 exceeds the cut-out ⇒ Ying
receives **$0** while Li Jun receives the full $1,602.

### 2.6 SAPTO — transfer between spouses (reg s 12)

Preconditions, all required: transferor entitled to SAPTO; transferor's base rebate amount exceeds
their tax payable (disregarding credits and rebates); they had a spouse at any time in the year;
**the spouse is themselves entitled to SAPTO**; the spouse's SAPTO is less than their own base
rebate amount. There is no transfer to a spouse who is not SAPTO-eligible. Applied automatically
by the ATO on lodgment; no election.

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| `sapto.transferIncomeFloor` | **$6,000** taxable income | — | **constant** (frozen literal) | Reg 2025 ss 12(3)(b)(ii), 12(4)(a) | 2026-09-03 | primary-verified |
| `sapto.transferReductionRate` | **0.15** | — | **constant** (frozen literal, **not** the marginal rate) | as above | 2026-09-03 | primary-verified |
| Resident formula (TI > $6,000) | `max(0, BRA − (TI − 6,000) × 0.15)` | — | constant | Reg 2025 s 12(3)(b)(ii) | 2026-09-03 | primary-verified |
| Residual formula (TI ≤ $6,000 or non-resident rates) | `BRA − tax payable`, disregarding credits and rebates ⇒ with an $18,200 tax-free threshold, the **full** base rebate amount transfers | — | constant | Reg 2025 ss 12(1)(b), 12(3)(b)(i) | 2026-09-03 | primary-verified |
| Exempt-pension add-back | transferor's income computed as if DSP (SSA Pt 2.3), Carer Payment (SSA Pt 2.5) and VEA Pt III Div 4–5 invalidity/partner service pensions were assessable. **Age Pension is not in this list** — it is already assessable | — | constant | Reg 2025 s 12(5) | 2026-09-03 | primary-verified |
| Transferee threshold recomputed | **yes** — re-derive §2.4 with `BRA* = own_BRA + transferred` | — | constant | Reg 2025 s 12(3) note | 2026-09-03 | primary-verified |
| Effect on the eligibility gate | **none** — s 12(3) applies for reg s 11(2) but not reg s 10 | — | constant | Reg 2025 s 12(3) opening words | 2026-09-03 | primary-verified |
| Meaning of "tax payable … (disregarding any credits or rebates)" | **gross basic income tax liability, before every offset** — WATO, LITO and SAPTO alike | — | constant (rule) | Reg 2025 s 12(1)(b); ITAA 1997 s 63-10(1) item 5 calls the s 160AAAA amount a \*tax offset while s 160AAAA and Regs 2025 s 11 call it a *rebate* | 2026-09-15 | **primary-verified statutory text; reading INFERENTIAL** — see below |
| Whether the transfer amount depends on the s 63-10 application order | **no** — reg s 12 is order-blind (§2.8.1) | — | constant (rule) | Reg 2025 ss 12(1)(b), 12(3); ITAA 1997 s 63-10(1) item 5 | 2026-09-15 | primary-verified |

**The "disregarding any credits or rebates" reading is a registered inference, not a verified
rule** (recorded 2026-09-15 by O73; same treatment as O27 and the U-group, and **it must not be
narrowed to `primary-verified`** — R6). The words of s 12(1)(b) are primary-verified. What is
inferential is what "rebates" reaches:

* **The reading adopted — the gross reading.** "Rebate" is the ITAA 1936's generic word for what
  the ITAA 1997 calls a tax offset, and the two are used for the same amount in the same breath:
  s 63-10(1) item 5 calls the s 160AAAA amount a \*tax offset, while s 160AAAA and Regs 2025 s 11
  call it a *rebate*. On that reading the quantity is basic income tax liability **gross of every
  offset**, so it is measured **before** WATO and before LITO.
* **Its basis, stated: the instrument does not expressly resolve it.** Neither Regs 2025 s 4
  (Definitions — read in full: it defines *base rebate amount*, *lowest marginal tax rate*,
  *rebatable benefit amount*, *rebate maximum amount*, *rebate reduction rate*, *rebate reduction
  threshold* and *rebate threshold*) nor ITAA 1936 s 6(1) (read in full) defines **"rebate"** or
  **"tax payable"**. The absence is `primary-verified`; the resolution is not. The competing
  reading — that "rebates" reaches only ITAA 1936 rebates, so an ITAA 1997 offset *would* reduce
  "tax payable" and open the gate more easily — is `unverified` and disfavoured, not excluded.
* **It is pre-existing, and not new with WATO.** The build has applied the gross reading all along:
  `src/core/incomeTax.ts` compares the base rebate amount against `taxOnTaxableIncome(...)`, which
  subtracts no offset, so **LITO** has never been deducted before the comparison either. WATO
  raises the same question LITO already raised; it does not introduce it.
* **Direction, and why this is currently worth $0.** The two readings can only disagree where a
  positive transfer and a positive WATO coexist, and for a resident couple they cannot: the
  s 12(3)(b)(ii) formula reaches nil at taxable income `6,000 + BRA / 0.15` = **$16,680** on the
  $1,602 couple base rebate amount, while WATO cannot be *applied* at all below the **$18,200**
  tax-free threshold (s 63-10(1) item 3 is non-refundable, so it is capped by actual liability).
  The regions are disjoint by **$1,520** of taxable income. The competing reading is the one that
  **opens** the gate, so adopting the gross reading is the **narrower** of the two — it can only
  ever withhold a transfer, never invent one, and the withheld amount is $0 across the whole
  resident domain while the condition holds. **The condition expires** if the couple base rebate
  amount rises above **$1,830** (`(18,200 − 6,000) × 0.15`) or if the tax-free threshold falls; reg
  s 12's 0.15 is a frozen literal (T1) and does **not** follow the lowest marginal rate down to 14%
  in FY2027-28, so the FY2027-28 rate cut does not move $16,680. **This is not prose — it is a test:**
  `test/assumptions-tax.test.mjs` reads both figures from `src/data/assumptions/` and fails the
  moment the two regions begin to overlap.
* **Sources exhausted — P3-40 closed 2026-09-30.** The Explanatory Statement to F2025L01060 (fetched
  2026-09-24) says only "tax payable", and its Example 4 sits below the tax-free threshold, so it
  cannot tell the readings apart. The Schedule 3 text of Act No. 49 of 2026 settles the **order**,
  not the reading: its item 2 inserts WATO as s 63-10(1) **item 3**, from FY2027-28, ahead of the
  SAPTO items 5 and 10 — which is the order the build already uses. Sch 3 amends **only** the
  ITAA 1997; it does not touch the 1936 Act Regulations, so nothing in it speaks to what reg
  s 12(1)(b)'s "rebates" reaches. The gross reading therefore **stays a labelled inference**, and
  there is no cheaper primary source left to fetch. It is worth **$0** while the O73 canary in
  `test/assumptions-tax.test.mjs` is green; re-run 2026-09-30, the canary turns red under each of
  its three expiry conditions (couple base rebate amount raised to $1,831; the $16,680 nil point
  moved up to $18,280 via the floor; the FY2026-27 tax-free threshold lowered to $16,600). Reopen
  when it goes red, not before.

**The register's citation of reg s 12 was verified CORRECT on 2026-09-15 — do not re-check it.**
F2025L01060 is the *Income Tax Assessment (1936 Act) Regulations 2025*, made 4 September 2025,
registered 9 September 2025, InForce; its **s 12** is headed *"Transfer of unused base rebate amount
from individual taxpayer to spouse or spouse's trustee"* and sits in Part 5 Division 1 beside s 9
(Key concepts), s 10 (Entitlement) and s 11 (Amount). No citation error. (The 2025 Regulations use
*sections*, not *regulations*, so "reg s 12" is mildly redundant — not wrong.) `primary-verified`.

**Best available regression fixture — ATO Example 9** (FY2025-26, illness separated, spouse
taxable income $10,000, own rebate income $48,000): transferred **$1,440**; recomputed rebate
threshold **$39,912**; SAPTO **$2,469**. One case exercising the transfer formula, the s 9(6)
branch and the round-up rule together.

**FY2026-27 worked check** (couple, spouse TI $10,000): transferred = 1,602 − (10,000 − 6,000) ×
0.15 = $1,002; BRA* = $2,604; T5 = $38,526.67 > $37,000 ⇒ s 9(6); S7 = 37,000 × 0.165 = $6,105;
T = 11,884 / 0.315 = **$37,727**. At rebate income $42,000: SAPTO = 2,604 − 0.125 × 4,273 =
**$2,070**.

### 2.7 Medicare levy low-income thresholds and the family shade-in — PRIOR-YEAR FALLBACK

**FY2026-27 figures do not exist as at 2026-09-03.** Not an incomplete search: the thresholds are
lifted retrospectively in the Budget following the year they apply to. The last uplift (Act No. 58
of 2026 Sch 5, ~2.9%) applies retrospectively to **2025-26**. FY2026-27 values will not exist
until roughly the 2027 Budget. Every row below is stamped **2025-26** and must display as such.

*(Confirmed independently twice on 2026-09-04: the Act's own history notes stamp every dollar figure
below as inserted by **Act No. 58 of 2026, s 3 and Sch 5 items 4–7**, "applicable in relation to
assessments for the **2025-26** year of income and later"; and Federal Register **Compilation No. 53,
compilation date 1 July 2026** — the compilation in force for FY2026-27 — carries exactly those
figures. This confirms the fallback finding. §8 O1 stays open.)*

**Corrected 2026-09-05 on audit**, against `docs/research/p3-medicare-family-shadein.md` (retrieved
2026-09-04), which read *Medicare Levy Act 1986* s 8 in full and closed **O7**. This section
previously stopped one subsection short, at s 8(2), and described the family shade-in as a rate. Six
things it said or omitted were wrong. Each is marked in place below rather than deleted, because
code and tests were written against them:

1. the family formula row read *"primary-verified **by reconciliation only** — the formula is a GIF
   in the ATO Legal Database and was not read"*. **The GIF was read** — see *How the formula was
   read* at the end of this section — and the formula was then confirmed two further, independent
   ways;
2. *"Shade-in rate, families — 10% effective"* is **not** the family taper. The taper in s 8(2) is
   **0.08**, and 8% / 10% / 18% are three different effective rates depending on whose income moves.
   The `medicareLevy.shadeInRateFamilies` constant that carried this row's 0.1 was **read by
   nothing** and was **removed** on 2026-09-05 rather than relabelled: it was not a duplicate of the
   taper but one of the three effective rates, and a constant named like a taper and valued like a
   marginal rate is a mislabel a future reader would wire in. The three rates now sit on
   `familyShadeInTaper`, at the point of use;
3. the seniors family upper threshold was sourced to **s 8(7)**, which contains no upper threshold.
   **No upper family threshold exists anywhere in the Act.** All three upper rows are ATO
   arithmetic and drop to `secondary-only`;
4. **s 8(3)** — the apportionment of the reduction between spouses, and the **s 8(3)(c) gate** that
   switches it off — was never mentioned (T52);
5. **s 8(4)** — the spillover of an unused reduction onto the spouse — was never mentioned;
6. the section was silent on **s 7(2) applying on the family path** (T53). That silence let a test
   enshrine a levy three times too high as a golden value, corrected in `89c9e7f`.

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Single lower (`threshold amount`, s 3(1) para (c)) | $28,011 | **2025-26 fallback** | config | [Medicare Levy Act 1986 s 3(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F3) · [ATO QC27031](https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners) | 2026-09-04 | primary-verified (for 2025-26) |
| Single upper (`phase-in limit`, s 3(1) para (c)) | $35,013 | 2025-26 fallback | config | as above | 2026-09-04 | primary-verified (for 2025-26) |
| Seniors/pensioners single lower (`threshold amount`, s 3(1) para (a)) | $44,268 | 2025-26 fallback | config | [Medicare Levy Act s 3(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F3) | 2026-09-04 | primary-verified (for 2025-26) |
| Seniors/pensioners single upper (`phase-in limit`, s 3(1) para (a)) | $55,335 | 2025-26 fallback | config | as above | 2026-09-04 | primary-verified (for 2025-26) |
| Family lower (`family income threshold`) | $47,238 | 2025-26 fallback | config | [Medicare Levy Act s 8(5)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8) · [ATO QC27032](https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income) | 2026-09-04 | primary-verified (for 2025-26) |
| Seniors/pensioners family lower | $61,623 | 2025-26 fallback | config | [Medicare Levy Act s 8(7)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8) — substitutes this figure for $47,238 in ss 8(5) and 8(6), and does nothing else | 2026-09-04 | primary-verified (for 2025-26) |
| Family lower uplift per dependent child | +$4,338 | 2025-26 fallback | config | Medicare Levy Act s 8(5) — **not** substituted by s 8(7), so a seniors family threshold with children is $61,623 + $4,338 × N | 2026-09-04 | primary-verified (for 2025-26) |
| Family upper (**display only**) | $59,047 | 2025-26 fallback | config | ATO QC27032 — **not in the Act**: `familyLower × 1.25`, truncated | 2026-09-04 | **secondary-only (ATO arithmetic)** *(was primary-verified — corrected 2026-09-05)* |
| Seniors/pensioners family upper (**display only**) | $77,028 | 2025-26 fallback | config | ATO QC27032 — **not in the Act**: `seniorsFamilyLower × 1.25`, truncated | 2026-09-04 | **secondary-only (ATO arithmetic)** *(was primary-verified, sourced to s 8(7), which contains no upper threshold — corrected 2026-09-05)* |
| Family upper uplift per dependent child (**display only**) | +$5,423 | 2025-26 fallback | config | ATO QC27032 — **not in the Act**: `4,338 × 1.25 = 5,422.50`, **rounded up** | 2026-09-04 | **secondary-only (ATO arithmetic)** *(was primary-verified — corrected 2026-09-05)* |
| Shade-in rate, singles | 10% of the excess over the `threshold amount` | — | constant | [Medicare Levy Act s 7(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F7) — amended by Act (20% → 10%, No. 55 of 2006); not indexed | 2026-09-04 | primary-verified |
| Family shade-in **base rate** | **0.02** — "2% **of the family income threshold**", not of anybody's income | — | constant | Medicare Levy Act s 8(2) formula | 2026-09-04 | primary-verified |
| Family shade-in **taper** | **0.08** per $1 of family income above the family income threshold | — | constant | Medicare Levy Act s 8(2) formula | 2026-09-04 | primary-verified *(replaces "Shade-in rate, families — 10% effective … by reconciliation only"; corrected 2026-09-05)* |
| Effective marginal rate in the family band | **three cases, not one:** 8% where the **spouse's** income rises; 10% where the **liable Person's own** income rises and they are above their own `phase-in limit` (0.02 + 0.08); **18%** where their own income rises inside their own s 7(2) shade-in (0.10 + 0.08, the two shade-ins stacking) | — | constant (derived) | ss 6(1), 7(2), 8(2) | 2026-09-04 | primary-verified derivation |
| Upper : lower ratio at a 2% levy | 1.25 | — | constant (derived) | **two different provisions give the same ratio by coincidence**: singles from s 7(2) (`0.02x = 0.10(x − T)`), families from s 8(2) (`0.02·FIT = 0.08(FI − FIT)`). Amend either pair alone and the two ratios diverge | 2026-09-04 | primary-verified |
| Income base | taxable income (single); family income = **sum of both Persons' taxable incomes** (s 8(5)(a)) | — | constant | Medicare Levy Act ss 7, 8(5) | 2026-09-04 | primary-verified |
| Apportionment ratio (s 8(3)) | the **spouse's** share of combined taxable income is **subtracted** from the reduction, leaving the Person their own share: `reduction_P = raw × TI(P) / FI` | — | constant (rule) | Medicare Levy Act s 8(3) | 2026-09-04 | primary-verified |

**The order of operations is ss 6 → 7 → 8 → 9, and it is load-bearing.** s 8(2) reduces "the amount
of the levy payable by the relevant person upon the taxable income of the relevant person **but for
this section and section 9**" — that is the amount surviving ss 6 **and 7**.

```
1. s 6(1)  gross     = 2% × TI(P)
2. s 7(1)  if TI(P) <= threshold_amount(P)                       -> levy 0, STOP
   s 7(2)  if TI(P) <= phase_in_limit(P)   base = min(gross, 10% × (TI(P) − threshold_amount(P)))
           else                            base = gross
3. s 8(1)  if married/dependants and FI <= FIT                   -> levy 0, STOP
   s 8(2)  raw = max(0, 0.02 × FIT − 0.08 × (FI − FIT))
   s 8(3)  if married AND the spouse would themselves be liable at step 2:
                reduction = raw − round(raw × TI(S)/FI)          [ = raw × TI(P)/FI ]
           else reduction = raw                                  [ the WHOLE reduction ]
   s 8(4)  levy = base − reduction; any excess reduces the SPOUSE's levy
4. s 9     pro-rata by prescribed-person days — not modelled, this Household has none
```

**s 8(1) — the nil band.** Where the person was **married on the last day of the year of income**
(or is entitled to a Subdiv 61-A or notional Subdiv 961-B offset in respect of a child) and family
income **does not exceed** the family income threshold, **no levy is payable**. Para (d) was repealed
by No. 70 of 2015.

**s 8(2) — what the formula reduces.** `raw = 0.02 × FIT − (0.08 × (FI − FIT))`. Three things follow
from the words, and none of them was recorded here before 2026-09-05:

- it is a **reduction of a levy already computed on the Person's own taxable income**, not a levy on
  family income. The base being reduced is 2% of `TI(P)`, capped by s 7(2). Family income enters
  only through the reduction;
- **"the amount (if any)"** floors a negative result at nil. That floor is the *only* reason an
  "upper threshold" exists at all;
- **"Subject to subsection (3)"** — s 8(2) alone is not the answer.

**s 8(3) and the s 8(3)(c) gate — T52. This is the single most consequential thing this section used
to omit.** s 8(3) reduces the reduction by "the same proportion as the amount of the taxable income
of the spouse bears to the family income", so each spouse keeps their own share and the household
gets the reduction exactly once. **But s 8(3) applies only where paragraph (c) is satisfied: "but for
this section and section 9, the spouse of the person would be liable to pay levy upon the taxable
income of the spouse".** **s 7 is not in that exclusion.** A spouse at or below their own s 3(1)
`threshold amount` is therefore **not liable**, the gate does not open, and the liable Person keeps
the **entire, unapportioned** reduction.

> **For a seniors couple the gate can never open inside the live band.** Both spouses liable needs
> each above **$44,268**, i.e. a family income above **$88,536** — above the **$77,028** top of the
> seniors family band. So in the whole of the seniors family shade-in band the reduction is **not
> split**: one spouse takes all of it and the other pays nil under s 7(1).

Apportioning unconditionally halves a real retiree household's benefit. On the ATO's own Ashton
example it gives **$229.76** where the right answer is **$92.90** (§9).

For an ordinary (non-seniors) couple the gate is reachable, but only for `FI ∈ ($56,022,
$59,047.50]` — and across that whole window each spouse's own income is necessarily below $35,013,
so s 7(2) is capping both of them at the same time.

**s 8(4) — the spillover.** Where s 8(3) applied and the reduction exceeds the Person's own levy,
"the amount of levy payable by **the spouse** … shall be reduced by the amount of the excess". Where
neither spouse is s 7(2)-capped this is provably unreachable: `raw < 0.02 × FIT < 0.02 × FI`, so each
apportioned share is below 2% of that Person's own taxable income. It is reachable only through
s 7(2), and in every reachable instance both levies end at nil either way — which is why its
mutation is unfalsifiable (§9) and why the mutual-circularity question is recorded as open (§8 O33).

**s 7(2) applies to a married Person — T53.** s 7 speaks of "a person" and contains **no
married-person carve-out**, and s 7(2) is expressly a ceiling on the levy "but for sections 8 and 9".
So a Person whose **own** taxable income sits between their own `threshold amount` and their own
`phase-in limit` is capped at 10% of the excess **whatever their family income is**, including well
outside the family band. Omitting this over-charged a married Person at `TI = $30,000` with
`FI = $70,000` by **$401.10** — $600.00 instead of $198.90 — on a case the family shade-in refusal
never protected. The ATO's Ashton example is exactly this shape and confirms it to the cent.

**The band test is `raw > 0`, never `FI ≤ upper`.** The published uppers do not round consistently:
`lower × 1.25` reproduces every one — 35,013.75→35,013, 55,335.00, 59,047.50→59,047, 77,028.75→77,028
all truncate, but 5,422.50→**5,423** rounds up. **Store the published uppers; do not derive them; do
not test against them.** The Act's own operative test is "the amount (if any)", i.e. `raw > 0`, which
is exact in integer cents and sidesteps the rounding entirely. The uppers are kept for display and
for reconciling against ATO tables. *(Corrected 2026-09-05: this paragraph previously called the
uppers "derived" and left them sourced as primary. They are not in the Act at all.)*

**Rounding.** Where both taxable incomes are whole dollars the whole calculation is exact in integer
cents — every product is a whole number of cents — which is why the ATO's worked examples land on
clean figures. The **single** genuine rounding point is the s 8(3) apportionment `raw × TI(S)/FI`,
and the Act prescribes no rule for it (§8 O32). Follow the statutory order: compute the **subtracted**
share and subtract it, rather than computing `raw × TI(P)/FI` directly.

**The seniors threshold switch** (T8): Medicare Levy Act s 3(1) selects the seniors `threshold
amount` and `phase-in limit` "for a person who is entitled to a rebate under section 160AAAA",
and s 8(7) does the same for the family threshold. ATO's operative qualification: *"You must be
entitled to at least $1 of SAPTO in order to use the threshold"*, and explicitly, a Person whose
SAPTO is reduced to zero **is not entitled to use it**. Key the switch off the **computed offset >
$0**, not off eligibility. **s 8(7)'s test is per Person** — "a person who is entitled" — so a couple
where only one spouse receives SAPTO holds **two different family income thresholds against one
family income**, and nothing in s 8 says which governs. That is open (§8 O30) and refused in code.

**Crossover note:** the seniors single upper threshold is partly unreachable — SAPTO for a single
cuts out at $53,874 (FY2026-27) below the $55,335 phase-in limit, so above the cut-out the ordinary
thresholds apply. The crossover point moves every time either figure moves.

**Do not encode ATO QC27032's eligibility bullet.** It states that the family reduction requires
*"Your individual taxable income was more than $35,013 ($55,335 for seniors …)"*. **The ATO's own
worked example on the same page contradicts it** — Ashton's taxable income is $49,700, below
$55,335, and he plainly receives the reduction. The statute imposes no such condition: s 8(2)
applies whenever `FI > FIT`. Recorded so that a future maintainer reconciling against QC27032 does
not "correct" the model into agreement with a wrong sentence.

**s 3(3)(a) "living separately and apart"** deems a person **not** married, yet the ATO applies
family income to the Ashton couple, who "live apart due to illness" — and the arithmetic matches to
the cent, so the ATO reads the phrase as marital separation, not illness separation. Unresolved on
the text (§8 O34). Live only if the model computes an illness-separated household, which it can:
SAPTO already has an `illnessSeparatedEach` branch.

**Reconciliation — ATO QC27032, Ashton, exact to the cent.** `TI(P) = $49,700`, `TI(S) = $21,700`,
seniors, no children. s 6(1) gross $994.00 → s 7(2) cap `10% × (49,700 − 44,268)` = **base $543.20**
→ `FI = $71,400`, `FIT = $61,623` → `raw = 0.02 × 61,623 − 0.08 × 9,777 = 1,232.46 − 782.16 =
$450.30` → spouse's $21,700 ≤ $44,268 so s 8(3) is **not engaged** and the whole $450.30 is kept →
levy **$92.90**, which is the figure the ATO publishes. This one example discriminates against every
competing reading (§9). The companion single example reconciles s 7(2) the same way: `10% × (29,000 −
28,011) = $98.90`.

**How the formula was read — a retrieval fact worth keeping.** s 8(2)'s formula is served as an
**image** in the ATO Legal Database, and that stopped this item at "not read" for months. **An ATO
formula GIF is fetchable and is a first-class primary source.** The path pattern is
`/law/view/sgif/cch-leg2/formula_<section>_<id>_<timestamp>.gif` and the provision is named in the
`<img>` element's `title` attribute; for s 8(2) it is
[`formula_s_8_2_534582216_20260709t135745-968.gif`](https://www.ato.gov.au/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif)
(HTTP 200, 15,071 B, 380×118). **"It is an image" is not a reason to fall back to a secondary
source.** Two further independent primary confirmations of the same formula: the **Federal Register
PDF compilation's text layer** carries the operands and the `0.08` coefficient as extractable text
(the `.docx` drops the formula to an empty paragraph, so the PDF is the route); and the ATO page's
own **plain-text history notes** give the two predecessor formulae, `A − (0.085(B − C))` and
`A − (0.185(B − C))`, with their variable definitions — the structure `A − (k(B − C))` is continuous
across all three versions. Also: the section-level Legal Database URLs in this register were the
title-only `?LocID=` shells; the working form is **`?DocID=PAC%2F19860110%2F<section>`**, verified
HTTP 200 on ss 3, 6, 7, 8 and 9. See §10.

#### 2.7.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below are
enforced from the moment they exist, statuses included. They are §2.7's additions to that inventory,
and the last of the P3-26 quarantine on the income-tax side. Both were in `src/core/incomeTax.ts`
before this table existed and were named in this document only in **prose** — this section's *seniors
threshold switch* paragraph, **O30** in §8, and two §9 mutation rows. That is a finding and not an
exemption: naming a refusal in a paragraph makes it findable; it does not assert that it is built or
say which file it lives in, and no drift signal fires when either changes.

**The two guard one function and they are not the same kind, and the difference is who is missing
what.** `FamilySpouseNotSuppliedError` is an **input-shape guard**: everything s 8(3) needs is in
this section already — T52, in full, gate included — and what is absent is a **field the caller
withheld**, which is the same test §3.2.1 uses to separate `UnsourcedIndexBaseError` from
`MissingIndexNumberError`. `MixedSaptoFamilyThresholdError` was a **scope refusal** — §3.5.1's and
§3.11.9's fourth kind: the couple it refused is lawful and perfectly well formed, and what was
thought to be missing was a **rule to apply to it**, which was O30. Neither is a **rule of law** —
s 8 forbids nothing here, it was read as *silent*, which is a different thing and is exactly why one
of them refused. **⚠️ SUPERSEDED 2026-09-21: s 8 is not silent, and the second refusal is DELETED.**
The Act answers **per taxpayer** and the two thresholds are both correct at once, so the missing rule
was never missing — see the row below and **O30**. The paragraph is kept because the distinction it
draws between an input-shape guard and a scope refusal still holds, and because it is the clearest
statement of the mistake: a scope refusal is only as good as the search for the rule, and this one
was raised on a **regularity observed in the symmetric case** rather than on anything s 8 says. Neither is a
**drift tripwire on this register's own records**, because neither reads one record of this document
against another.

| Refusal | Fires when | Status |
|---|---|---|
| **`FamilySpouseNotSuppliedError`** | `medicareLevy` is on the family path — a `familyIncome` was supplied — s 8(2) still leaves a reduction to grant, and the `spouse` argument is `undefined`. One throw site, in `src/core/incomeTax.ts`. **It is an input-shape guard, but it does not sit where one usually sits, and that is this row's one difficulty.** It is not at the entry point: it runs *after* the s 8(5) sum check, *after* the s 8(1) nil-band return (and, until 2026-09-21, *after* the s 8(7) mixed-threshold guard, which has since been deleted with O30 — one fewer thing between the entry point and this throw, and the ordering finding this row records is unchanged by its removal), and only once `raw` has been computed. The identical omission is **accepted** outside the band and **refused** inside it, so the guard is on the shape of the argument list but is **positioned by the statute** — s 8(3) is what makes the field load-bearing, and only where a reduction exists for it to apportion. Verified by running: `TI = $30,000` with `FI = $80,000` and no spouse answers **$198.90**; `TI = $29,000` with `FI = $58,000` and no spouse refuses. **It is not a scope refusal**, and the contrast with the row below is the cleanest instance of that distinction in this register: nothing is missing from this document — §2.7 states s 8(3), the s 8(3)(c) gate and T52 in full — and the answer is computable the moment the caller supplies a figure they already hold. **FINDING 1 — the message's arithmetic is false across nearly the whole of its own firing range, and this is a defect of the message, not of the refusal.** It reports that family income *"exceeds the family income threshold of X cents **by less than s 8(2)'s reduction**"*. The condition it actually fires on is `raw > 0` — this section's own *band test* paragraph, and the right test — which is `FI − FIT < 0.25 × FIT`. *"By less than the reduction"* is `FI − FIT < raw`, i.e. `FI − FIT < 0.0185 × FIT`, a window **13.5 times narrower**. Verified by running: at `FI = $58,000` against `FIT = $47,238` the message calls an excess of **$10,762** *less than* a reduction of **$83.80**; at the last firing cent, `FI = $59,047`, the reduction is **4 cents** against an excess of **$11,809**, and `FI = $59,048` answers instead of refusing. The register is not what is wrong here — `raw > 0` is stated correctly above and the code follows it; the message paraphrases it and the paraphrase does not hold. **FINDING 2 — the demand is conditional, and nothing outside `src/` says so.** §9's mutation row reads *"it must not compile / must refuse: the s 8(3)(c) gate is not decidable from one Person's figures"*, which states no condition at all. The gate is not decidable from one Person's figures **outside** the band either, and outside the band the engine answers anyway — rightly, because there s 8(2) grants nothing and s 8(3) has nothing to apportion. That the spouse is demanded **only where `raw > 0`** lives in `src/core/incomeTax.ts` and in this class's own JSDoc, and in no row of this document. **FINDING 3 — its nearest neighbour in the same function is nameless.** Twenty lines above, a `familyIncome` that is not the sum of the two taxable incomes (s 8(5)) raises a **bare, unnamed `RangeError`**, sitting outside R8's naming discipline and outside the reach of the test that reads this table — the same shape as §2.1.1's outer year boundary and §4.5.1's outer period boundary, and the third instance of it in this register. **`spouse: null` is the s 8(5)(b) path and is not a workaround**: it is how a Person on the family path through dependants alone says there is no spouse, and this section's s 8(1) paragraph carries the child limb it rests on | **BUILT** — `src/core/incomeTax.ts`, one throw site. `test/core-medicare-family-shade-in.test.mjs` exercises it directly rather than reading a throw from elsewhere, and asserts the outside-the-band acceptance as well as the refusal. **The stated ground is sound; one sentence of the message is arithmetically wrong about the band it is standing in** — recorded here, not corrected, because `src/` is out of scope for the brief that wrote this row |
| **`MixedSaptoFamilyThresholdError`** | **⚠️ DELETED 2026-09-21 — O30 CLOSED ON THE PRIMARY LAW AND THIS REFUSAL'S PREMISE WAS REVERSED, NOT NARROWED.** The Medicare levy low-income reduction under s 8 is computed **per taxpayer**: each spouse applies **their own** family income threshold to the **shared** family income, so a mixed-SAPTO couple holding $61,623 and $47,238 at once is the Act's outcome and not a conflict to be refused. Every operative limb — ss 8(1), (2), (3), (5), (7) — is framed on *"a person"* / *"the relevant person"*; *"family income threshold"* is defined **"in relation to a person"** while *"family income"* is expressly the shared sum; **s 8(5)(b) shows the drafter's express technique for pulling a spouse's circumstances into a per-person term** (*"the relevant person **or the spouse of the relevant person**"*, for the child uplift) and **s 8(7) does not use it**; and s 8(7) uses the identical *"a person who is entitled to a rebate under section 160AAAA"* formula as s 3(1)'s `threshold amount` and `phase-in limit`, which this engine has always applied per Person. s 8(3)'s ratio is TI(spouse)/family income and contains **no threshold at all**, so two asymmetric reduction amounts apportion perfectly well. **Where the error came from, because it must not be repeated:** the research note observed that two spouses' reductions *"sum to raw — the household gets the reduction once"*, which is true **only in the symmetric case**; this row elevated an artefact of that case into a statutory constraint, found it broke under asymmetry, and concluded the Act was silent. **A regularity observed only in the symmetric case is not a rule.** The three FINDINGS below were all findings **about the refusal**, and they are discharged with it rather than fixed. **The text that follows is SUPERSEDED and kept because the reasoning it records is the reasoning that was wrong** — ⟨superseded 2026-09-21⟩ a couple on the family path where **exactly one** of the two Persons receives SAPTO — `(spouse.saptoReceived > 0) !== seniors`, T8's switch read on each Person separately — and the **larger** of the two family income thresholds still leaves a reduction to grant. One throw site, in `src/core/incomeTax.ts`. **This is a scope refusal** — §3.5.1's and §3.11.9's fourth kind. The couple is lawful and the input perfectly well formed: two taxable incomes, one family income and two SAPTO figures, which is the commonest mixed couple in the country and exactly what a household one birthday apart looks like. Nothing is mis-shaped, so it is not an input-shape guard; it reads no record of this document against another, so it is not a drift tripwire; and no provision forbids the couple, so it is not a rule of law. What is missing is a **rule to apply**: s 8(7) substitutes the seniors family income threshold *"in relation to **a person** who is entitled"* to SAPTO — a **per-Person** test — so the couple holds **two different family income thresholds against one family income**, `raw` is not a single household number, and s 8(3) has two different amounts to apportion. **Nothing in s 8 resolves it**, and it is **refused in code, not decided** — **O30**, which is **unresolved and live**. **What would close it, from O30 and not from here:** an **ATO worked example or ruling on a mixed SAPTO couple**, or the **ATO Medicare levy calculator** (research **U8**, which would settle O30–O33 at once but is an interactive tool with no URL API and **was not run**). Until one of those arrives the choice is not this register's to make, and this row decides nothing. **The refusal is deliberately WIDER than the shade-in band, and that width is the load-bearing part of it.** The same ambiguity decides **s 8(1)** — on the larger threshold family income does not exceed it and the levy is **nil**; on the smaller the reduction has already run out and the Person pays a **full s 7 levy** — so the guard fires wherever the larger of the two thresholds still leaves a reduction to grant, which is every family income below **1.25 × the larger threshold**: the whole of s 8(1)'s nil band on that threshold *and* the whole of its shade-in band. It stops exactly where even the larger threshold grants nothing, because there the two readings agree and the choice between them cannot change a number. §9's mutation row states the width in terms — *"including below the larger threshold where the s 8(1) nil band is what is in dispute"* — and `test/core-medicare-family-shade-in.test.mjs` prices both ends: a Person on $50,000 receiving SAPTO with a spouse on $10,000 who does not is refused at family income **$60,000**, below the **$61,623** seniors family threshold, where the two readings are **nil or $573.20**; Ying and Li Jun at **$79,697** compute, above **1.25 × 61,623 = $77,028.75**. **`larger` is compared and not assumed**, which is right: the two thresholds are separate config rows in the table above and could invert, and both are uplifted by the **same** per-child amount, as this section's uplift row requires — s 8(7) substitutes the threshold and not the +$4,338. **FINDING 1 — the message narrates the narrow case and so contradicts the width the register insists on.** It opens *"family income of X cents **is inside the Medicare levy family shade-in band**"*. In the s 8(1) half of the refusal's reach that sentence is false on both readings at once: verified by running, family income **$60,000** against a seniors family threshold of **$61,623** produces that message, and $60,000 is *below* that threshold — s 8(1)'s nil band, not any shade-in band. The **guard** implements O30's width correctly and the **message** describes only the band it was first written for, so a reader who trusts the message will read the wider firings as a bug and narrow the guard — which is the one thing §9's mutation row forbids. Recorded and not fixed: `src/` is out of scope for the brief that wrote this row. **FINDING 2 — the width is bounded by whether the caller disclosed the spouse, and that bound is stated nowhere outside `src/`.** The guard requires `spouse` to be present, because a spouse's SAPTO switch cannot be read off a spouse who was not passed. Where the spouse is omitted **and** the Person's own threshold already leaves no reduction, `raw` is nil, `FamilySpouseNotSuppliedError` does not fire either, and the function **answers**. Verified by running the same household twice: a Person on **$50,000 with no SAPTO** and family income **$60,000** answers a levy of **$1,000.00** with the spouse omitted, and refuses with this class the moment the spouse — **$10,000, SAPTO received** — is supplied. O30's ambiguity is live in both calls, since $61,623 exceeds $60,000 and the seniors reading gives s 8(1)'s **nil** against the ordinary reading's **$1,000.00**, and only one of the two refuses. So the reach O30 describes is the reach against a **fully disclosed** couple, and against a partly disclosed one the engine answers on the Person's own threshold without ever testing whether a second one exists. Nothing in O30, in §9 or in §2.7 says so. **FINDING 3 — the ground is registered twice and the pointer at the end of the message is not a specification.** Unusually for this quarantine the rule this refusal carries out is **not** a decision living only in `src/`: O30 states it and §9's mutation row requires it. But the message closes *"see TODO P3-1c"*, and TODO.md is a task list — the same shape as §2.1.1's Finding 1 — on which **P3-1c is ticked `[x]`** at one line and described as one that *"stays open"* at another. The refusal's own citation of record is **O30**, which is in this document and is where a reader should be sent | **DELETED 2026-09-21 — deliberately removed, and not renamed.** No class of this name exists under `src/`, there is no throw site, and nothing replaced it: `src/core/incomeTax.ts` simply has **no branch at all** on the couple being mixed, which is the point — s 8 never asks. What stands in its place is a construction and its canaries: `test/core-medicare-family-shade-in.test.mjs` holds two spouses' hand-worked figures on two different thresholds (Ada $73.66 on $61,623, Ben $98.90 on $47,238, family income $75,000) and sweeps the whole of the deleted guard's former reach for an answer, and `test/core-income-tax-mutations.test.mjs` turns the P3-35 prose canary around so the module can neither describe a refusal it no longer has nor describe O30 as live. **⚠️ EVIDENCE PROVENANCE — the closing condition this row and O30 both named was NOT met.** They named *an ATO worked example or ruling on a mixed SAPTO couple*, and **no such example exists**: the only ATO family worked example has **both** spouses on SAPTO. What closed it is the **primary law**, supported by the ATO's **per-taxpayer myTax Worksheet 2** (two spouses enter different amounts at the SAPTO row with no reconciliation step) and the ATO's express statement resolving within-couple SAPTO asymmetry on **individual** entitlement. That is a **stronger** evidence type than the one named, and a **different** one. The substitution was made knowingly by the user's ruling of 2026-09-21. **And the provenance of the provenance, because this row is about honesty of evidence:** ss 3 and 8 were re-read from the ATO Legal Database on 2026-09-21 (Compilation No. 53, C2026C00295) and every ground above is quoted from what was read. The **myTax Worksheet 2** and the ATO statement on within-couple SAPTO asymmetry come from the user's ruling and were **not** re-fetched here — two candidate ATO instruction URLs returned 404 and the search was stopped rather than padded. They are corroboration; the primary law is the ground. |

**What this pair changes about §2.7, and O30 is the reason it matters.** This section states the
thresholds, the formula, the s 8(3)(c) gate, the s 7(2) interaction and the Ashton reconciliation,
and until now it never said that the machinery **refuses** rather than choosing. Two of the
commonest households it will ever meet — a couple one birthday apart, and any caller who asks for a
family levy without naming the spouse — get **no answer at all**, and which of the two refusals they
meet depends on the order the guards run in. That order is in `src/core/incomeTax.ts` and in no row
of this document: the s 8(7) mixed-threshold guard runs **first**, so a fully disclosed mixed couple
inside the band is refused on **O30** and never reaches the spouse guard, while the same couple with
the spouse omitted is refused on the **shape** of the call and told to supply a figure that will then
produce the other refusal.


### 2.8 Forward items inside the Planning Horizon

| Name | Value | Effective | Kind | Confidence |
|---|---|---|---|---|
| Lowest marginal rate falls to 14% | 0.14 | 1 Jul 2027 | config | primary-verified — already law |
| Working Australians tax offset (WATO) | **the lesser of $250 and the basic income tax liability that net labour income alone would bear**; non-refundable; for residents whose **net labour income** exceeds the tax-free threshold. **No taper, and no income ceiling** — see §2.8.1 | from 2027-28 | config | primary-verified — ITAA 1997 Subdiv 61-E read from the as-made Act **and** the ATO consolidation, independently |
| ITAA 1997 s 25-130 — the $1,000 standard deduction for work-related expenses | **the lesser of $1,000 and total assessable labour income, reduced but not below zero by the s 25-130(2) reducers** — `max(0, min($1,000, assessable labour income) − reducers)`. **Not indexed** (no s 960-265 item). **Two effects and BOTH are now wired:** it is `labour deductions` limb (c) of s 61-155(2), so it reduces **WATO's base** (BUILT, P3-38, `netLabourIncomeFromSalary`), and it is a Div 25 deduction, so it also reduces **taxable income** (BUILT 2026-09-17, P4-1 chunk 3, `taxableIncomeFromSalary` in `src/core/projection.ts`; **O72 CLOSED**). The superseded wording of this clause read *"only one is wired … (REGISTERED, NOT WIRED — no call site exists until TODO P4-1)"*. The reducer sum is a Setting, `tax.s25130.reducerDeductions`, defaulting to nil — see §2.8.1 for the dated acceptance of what that default costs. Detail at §2.8.2 | from 2026-27 | config — not indexed | primary-verified — ITAA 1997 s 25-130 as inserted by Act No. 49 of 2026 Sch 4 item 3, applied by Sch 4 Pt 1 item 17, read from the as-made Act |
| ITAA 1936 s 160AAAA(2)(a)(i) amendment (Act No. 17 of 2025 Sch 8 item 34) | omits "(other than Part VII)"; saving provision for VEA Pt VII | 1 Jul 2026 | constant | primary-verified |

#### 2.8.1 WATO — ITAA 1997 Subdivision 61-E

Source pass: `docs/research/p3-24-wato.md` (2026-09-11). **Statutory home:** ITAA 1997 ss 61-150,
61-155, 61-160, inserted by *Treasury Laws Amendment (Tax Reform No. 1) Act 2026* (**Act No. 49 of
2026**) Sch 3 item 1. Schedule 3 commenced 1 Jul 2026; the amendments apply **in relation to
assessments for the 2027-28 income year and later income years** (Sch 3 Pt 2 item 4). Assent
26 Jun 2026. Not touched by Act No. 71 of 2026, and the ATO consolidation of Subdiv 61-E carries one
history note only.

**The two routes agree word for word** on ss 61-155 and 61-160 — the as-made text on the Federal
Register and the ATO's consolidation — which is the strongest corroboration this project has yet
had for any provision.

**There is no taper.** This is the correction that matters, and it is recorded as a correction
because the row above said otherwise until 2026-09-11: it read *"amount and taper not captured"*,
which invited a reader to go looking for a shade-out that does not exist. The single quoted copy of
that superseded claim is the one in this paragraph. The amount is

```
WATO(NLI) = 0                                     if NLI <= tax_free_threshold   # s 61-155(1)(b): must EXCEED
          = lowest_marginal_rate × (NLI − TFT)    while that is under $250       # s 61-160(b), the shade-IN
          = 250                                   at and above the shade-in point  # s 61-160(a)
```

so limb (b) is a **shade-IN at the bottom**, not a phase-out at the top, and **above the shade-in
point the offset is a flat $250 at every income with no ceiling of any kind**. A Person on $400,000
of salary receives the same $250 as a Person on $30,000. There is no s 61-110(1)(b)-style
eligibility ceiling of the LITO kind and no s 61-115-style band table. **The direction of the old
framing's error:** a reader who implemented a taper would have understated WATO for high earners —
i.e. over-stated their tax — so the false claim was conservative, which is exactly why nothing would
have caught it.

**Limb (b) is pre-offset.** It is the basic income tax liability a *hypothetical* taxable income
equal to net labour income would bear. LITO and SAPTO are tax offsets applied at ITAA 1997
s 4-10(3) step 3, *after* basic income tax liability is worked out at step 2, so **neither enters
limb (b)**. Computing limb (b) net of LITO gives nil for everyone below roughly $23,200 and is
wrong.

| Name | Value | Effective | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Maximum offset | **$250** | 2027-28 | config | [ITAA 1997 s 61-160](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F61-160) · Act No. 49 of 2026 Sch 3 item 1, as-made | 2026-09-11 | primary-verified |
| Maximum offset indexed? | **No — and this is positive evidence, not an absence.** Subdiv 61-E is **absent from the ITAA 1997 s 960-265 table**, which s 960-270(1) makes the gateway to indexation; the Subdivision contains no indexation words and no reference to an index number. Same mechanism as LITO's $700 (§2.2) | — | constant | [ITAA 1997 s 960-265](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-265) | 2026-09-11 | primary-verified |
| Entitlement threshold | **$18,200**, being the ITRA 1986 s 3(1) *tax-free threshold*, which s 61-155(1)(b) adopts by reference. **Positively frozen:** s 3(1) reads *"tax-free threshold means $18,200"*, and its history note records that No 150 of 2011 would have substituted $19,400 from 2015-16 and that this was **repealed** by No 72 of 2015 so that the threshold *"remains at $18,200 for the 2015-16 year of income and later years of income"* | — | constant | [ITRA 1986 s 3](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F3) | 2026-09-11 | primary-verified |
| Entitlement test | net labour income must **exceed** the threshold — not reach it | — | constant | ITAA 1997 s 61-155(1)(b) | 2026-09-11 | primary-verified |
| Residency test | Australian resident **at any time during** the income year | — | constant | ITAA 1997 s 61-155(1)(a) | 2026-09-11 | primary-verified |
| Shade-in point | **derived — store the formula, never the number.** `tax_free_threshold + maximum_offset / lowest_marginal_rate`, which for FY2027-28 is $19,985.714…, so $19,985.72 is the first whole cent at which limb (a) binds. It moves whenever either input moves | 2027-28 | config-derived | derivation; corroborated by Budget Paper No. 2 2026-27 pp 16-17, which publishes **$19,985** | 2026-09-11 | primary-verified (arithmetic), corroboration secondary-only |
| Refundability | non-refundable, non-transferable, **no carry-forward** | — | constant | ITAA 1997 s 63-10(1) item 3 | 2026-09-11 | primary-verified |
| Medicare-levy limb | **none.** Unlike s 63-10 items 21 and 22, item 3 carries no Medicare-levy limb, so WATO can never reduce the Medicare levy. It is capped by basic income tax liability alone | — | constant | ITAA 1997 s 63-10(1) | 2026-09-11 | primary-verified |

**Do not store $19,985.71 and do not store $24,985.71.** Both are derived. The second is the
combined WATO + LITO effective threshold, `18,200 + (700 + 250) / 0.14`, and BP2's independently
published *"up to $24,985 for workers eligible for the Low Income Tax Offset"* reproduces §2.2's
$700 LITO maximum exactly. Two independent derivations of both figures agree; that is as close to a
published fixture as this measure has, and it is corroboration for the formula rather than a figure
to keep.

**The income base is a FIFTH one — net labour income, ITAA 1997 s 61-155(2)** — and it is neither
taxable income, nor Rebate Income, nor family income, nor income for surcharge purposes. See T9,
which this row moves from four bases to five. Three different figures do three different jobs:

| Job | Base | Provision |
|---|---|---|
| Entitlement — must *exceed* $18,200 | net labour income | s 61-155(1)(b) |
| Amount, limb (b) — the hypothetical basic liability | net labour income, treated as if it were the whole taxable income | s 61-160(b) |
| Usability — the non-refundable cap | **actual** basic income tax liability on **actual** taxable income | s 63-10(1) item 3 |

The third is a separate cap and it is not limb (b)'s number. A Person with net labour income of
$50,000 and an actual taxable income of $3,000 has a limb (b) figure of $250 and an actual liability
of nil: the offset is computed in full and then **entirely wasted**. An implementation that stops at
s 61-160 over-credits that Person.

`labour amounts` (s 61-155(2)) are amounts **included in assessable income**: assessable labour
income, sole-trader business income (expressly *not* partnership or trust business income), personal
services income, s 83A-25 ESS discounts, and labour-hire payments under TAA 1953 Sch 1 s 12-60.
`assessable labour income` is defined by **s 25-130(4)** as each amount included in assessable
income from which an amount must be withheld under TAA 1953 Sch 1 ss 12-35, 12-40, 12-45, 12-47,
12-50, Subdiv 12-C or para 12-110(1)(ca). `labour deductions` are the matching work deductions,
sole-trader business outgoings, **the s 25-130 standard deduction** (§2.8.2), s 40-25 and
Subdiv 328-D decline in value on work assets, and s 25-130(2)(d)–(g) amounts. s 61-155(3): where two
paragraphs cover one amount, count it once.

Net labour income therefore **excludes** interest, dividends, rent, net capital gains,
superannuation income streams and the Age Pension. **For this Household, in the years both Persons
draw only a superannuation income stream and the Age Pension, net labour income is nil, WATO is nil,
and omitting it is exactly right.** It bites in the working and TTR years, at $250 per working
Person per year.

**The tool cannot derive the labour / non-labour split, so it asks.** Computing net labour income
exactly needs, per Person per year, the split of assessable income into labour and non-labour
amounts *and* the split of deductions into labour and non-labour. Neither is derivable from a salary
forecast, so the split is a **Setting**, in the same shape §3.6's Div 293 seam uses for the four
s 995-1(1) limbs a forecast cannot produce: `tax.wato.netLabourIncomeSplit`, defaulting — **as
amended 2026-09-15 by P3-38** — to **all salary is labour income, and labour deductions are the
s 25-130 standard deduction the Person is entitled to by law**: `max(0, min($1,000, salary) −
reducers)` from FY2026-27, and nothing before then, because the provision does not exist. The
reducer sum is a second Setting, `tax.s25130.reducerDeductions`, defaulting to nil. **The wording
this replaced, and the acceptance it carried, are quoted once below** — this paragraph asserted a
nil-deduction default until that date, and it no longer does. With the reducers stated truthfully
the default is **exact** for a Person whose only income is wages; left at nil by a Person who has
real work deductions it still **over-states** net labour income, and therefore WATO, and therefore
flatters the household — which is what the dated acceptance below is about. Above the shade-in point
neither error is an approximation at all, because WATO is already the flat $250; inside the band, and
for a Person whose actual basic liability is under $250, it is.

**Order of application — ITAA 1997 s 63-10(1), and WATO goes first.** Act No. 49 of 2026 Sch 3
item 2 inserted WATO as **table item 3**, ahead of SAPTO. That placement is a choice, not an
accident of numbering.

| s 63-10 item | Offset | What happens to any excess |
|---|---|---|
| **3** | **WATO — Subdiv 61-E** | lost: no refund, no transfer, no carry-forward |
| 5 | SAPTO — ITAA 1936 s 160AAAA | **transferred** to the spouse under the regulations |
| 10 | SAPTO, trustee assessed under s 98 — s 160AAAB | transferred under the regulations |
| 15 | s 160AAA beneficiary / pensioner offset | transferred under the regulations |
| **20** | any tax offset not covered by another item — **this is where LITO lands** | lost |

So the order is **WATO → SAPTO → s 160AAA → LITO**; LITO has no item of its own and is caught by
item 20's residual. **The order is mandatory** — s 63-10(1) says "apply them against your basic
income tax liability **in the order shown in the table**", with no "may" and no purposive
limitation — and what it governs is **which offset survives as the leftover**, because the table's
third column attaches a different consequence to each item's remainder. `primary-verified`.

**Corrected 2026-09-15 (O73). The order has no dollar effect for a SAPTO couple.** This section
previously said the ordering is *"NOT neutral for a SAPTO couple"* and that *"applying WATO first
consumes basic income tax liability ahead of SAPTO and thereby increases the SAPTO excess available
to transfer wherever liability is scarce"*. **That claim is false and is withdrawn.** It read
s 63-10(1) item 5's "excess" as the amount transferred; item 5 transfers nothing itself — it says
the entitlement "is transferred **in accordance with regulations made under that Act**", and the
regulation supplies the quantity. **Reg s 12 computes the transfer order-blindly**, from the base
rebate amount and the transferor's **taxable income** — `max(0, BRA − (TI − 6,000) × 0.15)` under
s 12(3)(b)(ii), or `BRA − tax payable (disregarding any credits or rebates)` under s 12(1)(b) — and
it never asks what actually consumed the liability, or in what order. So **WATO's placement at
item 3 cannot change a SAPTO couple's transfer, and cannot change their final tax.**
`primary-verified` — s 63-10(1) item 5 read with Regs 2025 ss 12(1)(b) and 12(3); worked in
`docs/research/p3-24-o73-offset-order.md`.

The abstract mechanism in §2.2 and §2.3 is unaffected and still stated correctly there: "the
relative order of two non-refundable offsets cannot change the net figure" holds while every excess
is lost, and SAPTO's excess is indeed the one excess in the table that is **transferred** rather
than lost. What does not follow — and what the withdrawn sentence asserted — is that the size of
that transfer moves with the order. It does not. **The live risk this correction removes is a
future implementer building an order-sensitive transfer the regulation does not authorise.**

**It stacks with LITO.** Nothing in Subdiv 61-D or 61-E excludes the other, and BP2's $24,985 figure
is only arrivable by stacking them.

**Where this section lives in the code, so a later pass can check it is still consumed rather than
orphaned.** `TAX.wato` in `src/data/assumptions/tax.ts` carries every row of the table above:
`maximumOffset` (config, FY2027-28) with `maximumOffsetIndexed: false`, `entitlementThreshold`
(constant), `entitlementTest`, `residencyTest`, `incomeBase`, `refundable`, `transferable`,
`carryForward`, `reducesMedicareLevy`, `firstIncomeYear`, and two `config-derived` formulas —
`amount` (`watoOffsetAmount`, the s 61-160 `min`) and `shadeInPoint` (`watoShadeInPoint`, the
formula and never the figure). The s 63-10 order is five item-number `constant`s plus a derived
`order` that sorts on the item number, so permuting the table is benign and the only way to express
"apply WATO after SAPTO" is to move WATO off item 3. `NetLabourIncome`, `netLabourIncome()` and
`netLabourIncomeFromSalary()` are in `src/core/incomeBases.ts`; the split is the Setting
`tax.wato.netLabourIncomeSplit`.

**The offset is COMPUTED as of 2026-09-15 (P3-39).** This sentence previously read *"Nothing in
`src/core/` computes the offset yet — TODO P3-39"*, and the one quoted copy is the one in this
paragraph. `workingAustraliansTaxOffset(fy, netLabourIncome)` in `src/core/incomeTax.ts` is the
entitlement-gated wrapper, shaped like `lowIncomeTaxOffset`: it returns the **raw entitlement** and
the s 63-10(1) item 3 usability cap is applied once, centrally, in `householdIncomeTax`, where the
actual liability exists. Limb (b) itself is `watoHypotheticalBasicIncomeTaxLiability` in
`src/data/assumptions/tax.ts`, beside the other WATO derivations. `netLabourIncome` is an optional
field on the Person that is **required from FY2027-28** — omitting it raises
`NetLabourIncomeNotSuppliedError` — and `TaxPersonResult` reports `watoComputed` and `watoApplied`
as two separate figures.

#### 2.8.1.1 P3-39 — how the three traps are enforced

| Trap | Enforcement |
|---|---|
| **Limb (b) is pre-offset** — LITO and SAPTO are s 4-10(3) step 3 | **Structural, twice over.** Limb (b) lives in `src/data/assumptions/tax.ts`, which is imported *by* `src/core/incomeTax.ts` and never the reverse, so neither offset is reachable from it without a TDZ import cycle. And `WatoAmountInputs.hypotheticalBasicIncomeTaxLiability` is typed `BasicIncomeTaxLiability`, a brand minted only by `taxOnTaxableIncome` and by limb (b) itself — neither of which subtracts an offset — so `subCents(limbB, lito)` no longer compiles without a visible cast. Backed by a canary that asserts the naive post-offset answer is WRONG |
| **The s 63-10 item 3 cap is a different number** from limb (b) | **By test, and by the shape of the result.** `workingAustraliansTaxOffset` is not given actual taxable income and so cannot apply the cap itself; `householdIncomeTax` caps against `gross`. `watoComputed` and `watoApplied` are separate fields precisely so a wasted offset is visible rather than absorbed, and both the total-waste and partial-waste fixtures are asserted |
| **No Medicare-levy limb** | **Structural, by ABSENCE.** `MedicareLevyInput`, `MedicareLevyPerson` and `MedicareLevySpouse` carry no WATO field and no generic offsets-applied field, so there is no parameter a WATO amount could be threaded through — the P3-1a pattern. Adding one requires a visible interface change, which a source canary in `test/core-income-tax.test.mjs` asserts against |

**Limb (b) does NOT depend on the R12 carried-forward rates, and `unverified` therefore taints the
CAP and not the AMOUNT.** TODO P3-39's phrasing — *"R12 supplied it, so limb (b) has a rate ladder
to run against"* — reads as though limb (b) needed the FY2027-28 bracket table. It does not, and
following it literally would put an `unverified` caveat on every shade-in WATO figure that does not
deserve one. Limb (b) is computable from the **tax-free threshold** and the **lowest marginal rate**
alone, both legislated and `primary-verified` for FY2027-28, because:

1. below the second bracket's upper bound of **$45,000** the ladder *is* `rate × (NLI − TFT)` — the
   first bracket ends at the tax-free threshold and the second carries the lowest rate — so the
   closed form and the ladder agree **exactly** for every net labour income at or under $45,000;
2. above $45,000 the closed form is a **lower bound** on the ladder, every further rate being
   non-negative — so it can only ever under-state, never flatter;
3. both pass the $250 maximum long before $45,000, at `18,200 + 250/0.14 = $19,985.72`, and neither
   decreases: at $45,000 both are **$3,752**.

So `min($250, closed form) = min($250, ladder)` at **every** net labour income, and the carried
30/37/45 are never consulted. What genuinely does depend on them is the **s 63-10(1) item 3 cap**,
which runs the Person's *actual* taxable income through the full ladder — so the applied figure is
derived from the same `taxOnTaxableIncome` call every other figure uses, and the existing
`TaxProvenance` machinery carries the caveat with no new plumbing. Points 1–3 are properties of the
year's records rather than of the function, so `test/core-income-tax.test.mjs` proves all three
steps against the shipped ladder, for every year the build holds.

**The LITO crossover is EXACTLY $23,200, not "roughly".** This section says computing limb (b) net
of LITO *"gives nil for everyone below roughly $23,200"*. The figure is exact and derivable: LITO's
maximum is $700 and `0.14 × $5,000 = $700`, so the naive post-offset limb (b) is nil for every net
labour income at or below `18,200 + 5,000 = $23,200` and positive from $23,200.01. It is exact
because both inputs are exact, and it moves only when the lowest marginal rate or LITO's maximum
moves. The P3-39 canary is pinned to that boundary.

**The Setting default's optimism — ACCEPTED 2026-09-15 (P3-39), DISCHARGED for the modal case the
same day by P3-38, and what survives is narrower and carries its own dated acceptance below.** The
finding, kept because the reasoning is what the correction rests on: the default
`netLabourIncomeFromSalary` **over-states** net labour income, which only ever **increases** WATO,
which **lowers** net tax — so inside the shade-in band it **flatters the household**. That is the
opposite direction from every other unsourced figure in this year: `CARRIED_FORWARD_DIRECTION` in
`src/data/assumptions/tax.ts` records that the carried rates can only over-state cost, and
RULINGS.md R9 is built on that one-way safety. The arithmetic above was right, but it evaluated the
default only through a *"is WATO too big or too small"* lens and never through the household-flattery
lens, which is why the divergence went unnamed until 2026-09-15.

**What the acceptance said, superseded and kept here once, inside this correction frame:** the
default was *"all salary is labour income and labour deductions are nil"*, accepted as bounded by the
$250 maximum, confined to the shade-in band, and **discharged by TODO P3-38**. **P3-38 landed on
2026-09-15 and that sentence is now FALSE.** s 25-130 is `labour deductions` limb (c) of
s 61-155(2) (§2.8.2), so from FY2026-27 the default subtracts `max(0, min($1,000, salary) −
reducers)` rather than nothing. For the Person the acceptance was written about — a wage earner with
no other work deductions — the default is now **exact**, not optimistic. **That is a discharge, not
a relabelling**, and it is the whole of the modal case.

**ACCEPTED 2026-09-15 (P3-38), on its own ground and expressly NOT inherited from the paragraph
above.** A Person who leaves the Setting `tax.s25130.reducerDeductions` at its nil default while
having real s 25-130(2) reducers is given labour deductions of $1,000 where the truth is
`max(actual, $1,000)` — their actual work deductions are themselves labour deductions under limbs
(a) and (b), quite apart from reducing limb (c). So the tool **under-states** labour deductions,
**over-states** net labour income, **over-states** WATO and **flatters the household**: R9's
disfavoured direction, and the same shape as the acceptance it replaces.

* **The residual is `max(0, actual − $1,000)`.** It is **nil** for every Person with $1,000 or less
  of real work deductions, which is the modal wage earner, and that is why the earlier acceptance is
  discharged rather than renamed. It is **strictly narrower** than what it replaces — the same error
  less $1,000 at every income.
* **It is not bounded above.** A Person with $4,000 of real work deductions has their net labour
  income over-stated by **$3,000**, not by $1,000. What bounds it *in this build* is the only limb it
  feeds: WATO, capped at $250 in total by s 61-160(a), and applied no higher than actual basic income
  tax liability by s 63-10(1) item 3. **Finding, found and FIXED before commit (2026-09-15):** the
  Setting's own `reason` and `TAX.s25130.residualOptimism` both said the residual was *"bounded by
  $1,000 × the applicable marginal rate"*. That is true of the limb (c) effect taken alone and
  **false of the residual as a whole**, while the JSDoc on `netLabourIncomeFromSalary` said the
  opposite in the same working tree (*"any record claiming a $1,000 ceiling on this residual would
  be wrong"*) — three shipped records in two files, disagreeing, and the JSDoc was the one with the
  arithmetic right. **This was not a wording preference but a false claim about a bound**, so it was
  corrected rather than accepted: both records now state the residual as `max(0, actual reducers −
  $1,000)`, nil at or below $1,000 and unbounded above. `test/assumptions-tax.test.mjs` pins the
  $3,000 case, so the $1,000 ceiling cannot be re-asserted anywhere without a red test.
* **It is accepted rather than refused because there is no honest trigger.** The tool holds one
  aggregate reducer figure and has no way to test whether the caller's nil is true, so a refusal
  would fire on every caller and would block the answer for the population the provision was written
  for. This is a Setting whose default is stated and wrong for some Persons, not an unknown figure.
* **It reaches a second limb, and that limb is now wired too.** The same nil default also
  over-grants the Div 25 deduction against taxable income. The superseded clause here read *"once
  anything computes one — nothing does today (§2.8.2, O72, TODO P4-1), which is why the bound named
  above is a bound on this build rather than on the provision"*. Since **2026-09-17 (P4-1 chunk 3)**
  something does: `taxableIncomeFromSalary` in `src/core/projection.ts`. So the bound named above is
  now a bound on the provision as this tool applies it, and the residual acts **twice** for a Person
  with real reducers — once on WATO's base from FY2027-28 and once on taxable income from FY2026-27.
  The direction is unchanged on both limbs.

The same dated pair of records is on `netLabourIncomeFromSalary` in `src/core/incomeBases.ts`, on the
Setting `tax.wato.netLabourIncomeSplit`, on the Setting `tax.s25130.reducerDeductions` and in
`TAX.s25130.residualOptimism`. The P3-38 tripwire in `test/assumptions-tax.test.mjs` was **replaced
rather than deleted** when it went red: it now pins the **direction** and the **size** of the
residual in two financial years, and goes red again the day `reducerDeductions` stops being a
Setting and becomes a derived assumption — which is the one event that would let the tool identify
the affected Person and so discharge this acceptance in its turn.

| Refusal | Fires when | Status |
|---|---|---|
| **`NetLabourIncomeNotSuppliedError`** | a Person reaches `householdIncomeTax` for FY2027-28 or later with **no `netLabourIncome` field** — `undefined`, not a stated nil. One throw site, in `src/core/incomeTax.ts`. **An input-shape guard** (§3.5.1's distinction), and deliberately narrow on two axes: a **stated** nil computes an honest $0 and does not fire, and no year before FY2027-28 fires at all, because the offset does not exist in law then and `$0` is a **fact** for those years rather than an estimate. Making `netLabourIncome` unconditionally required was considered and **rejected**: it would break every FY2026-27 caller for no benefit in a year WATO cannot apply, which is the over-broad-refusal shape the register warns about. The doctrine it enforces is `src/core/incomeBases.ts`'s — *a nil is a figure the caller states, never one they get by leaving the field out* — and it bites because net labour income is a **fifth income base** that the tool cannot derive from a salary forecast, while being numerically equal to taxable income for exactly the Person a fixture would use. **Distinct from `MissingBracketTableError`**, which refuses because the true figure is unknown; here the true figure is known to the Person and unknown to the tool | **BUILT** — `src/core/incomeTax.ts`, one throw site |
| **`MissingNetLabourIncomeComponentError`** | either of the two s 61-155(2) limbs handed to `netLabourIncome()` is not a finite number — omitted, `undefined`, `null` or `NaN`. One throw site, in `src/core/incomeBases.ts`. The exact counterpart of `MissingSurchargeComponentError` and, like it, unreachable within TypeScript because both fields are required `Cents`: it exists because the split arrives from a stored **Setting** (`tax.wato.netLabourIncomeSplit`) and from JavaScript callers. **It was a bare, unnamed `RangeError` until 2026-09-15**, which is §3.9 Medicare finding 3's naming-discipline gap (**R8**) reproduced *inside one file*, between two adjacent guards doing the same job on the same shape of input — `sumSurchargeComponents` had a name and `netLabourIncome()` did not. **Finding — the negative-component guard beside it is still nameless.** The very next statement raises a bare `RangeError` on a negative limb, exactly as `sumSurchargeComponents`'s does, so one of this function's two guards remains outside R8's discipline; recorded here, not fixed, because the brief that named this one scoped the missing-component case only | **BUILT** — `src/core/incomeBases.ts`, one throw site |

**Still unverified after this pass** (all recorded in `docs/research/p3-24-wato.md` §4; none of them
moves a figure above):

* **Part-year and mid-year cases.** s 61-155(1)(a)'s *"at any time during the income year"* on its
  face gives the **full** $250 with no apportionment, and s 61-155(1)(b)'s adopted tax-free
  threshold is ITRA s 3(1)'s flat $18,200 rather than the Sch 7 part-year-resident reduced
  threshold. Both readings are primary but neither is checked against ATO guidance — the same shape
  as O16 for SAPTO, and it joins O16 rather than opening a second item.
* **ITRA 1986 Sch 7 Pt I was again not read** (O8) — **superseded 2026-09-17 by P2-10b, which read
  it.** The FY2027-28 lowest rate of 0.14 is now sourced to cl 1(b)'s third table, with the ATO and
  BP2's independently published $19,985 as corroboration rather than as the source, so the shade-in
  point no longer inherits that dependency.
* `*personal services income` (Div 84/85) and the TAA 1953 Sch 1 withholding provisions behind
  `assessable labour income` were not read. They decide the exact boundary of "labour" — in
  particular whether an employment termination payment counts, which Subdiv 12-C's presence in the
  s 25-130(4) list **suggests it does**. That is an inference from a cross-reference, not a reading
  of the provision, and it would matter to a retirement-year projection.
* **No sweep of bills before Parliament** for a pending amendment to Subdiv 61-E, and the ATO
  consolidation's currency date was not read off the page, so "no later amendment" rests on that
  consolidation plus a check of Act No. 71 of 2026.
* **A citation slip in the ATO/CCH consolidation, recorded so it is not propagated:** the s 25-130
  history note attributes the application provision to *"Sch 1 item 17"* of Act No. 49 of 2026. In
  the as-made Act it is **Schedule 4 Part 1 item 17**. The as-made text governs.

**WebSearch is not a source in this project, and on this pass it produced a false claim** — it
volunteered that WATO "was announced in Australia's 2024-25 budget". It was announced in the
**2026-27** Budget on 12 May 2026. Every figure above comes from `curl` against legislation.gov.au,
ato.gov.au, budget.gov.au, ministers.treasury.gov.au or aph.gov.au.

#### 2.8.2 ITAA 1997 s 25-130 — the $1,000 standard deduction

Found by the WATO pass on 2026-09-11, reported rather than resolved; **registered and half built on
2026-09-15 by P3-38**. This heading read *"enacted and unregistered"* and this paragraph read *"it
is law now, for FY2026-27, and no section of this register carries a row for it"* until that date.
Both are now false and are kept here once, in this correction frame: §2.8 carries a row, `TAX.s25130`
carries twelve records, and the provision is wired into one of its two effects.

* Inserted by **Act No. 49 of 2026 Sch 4 item 3** — the same Act as WATO — effective 1 Jul 2026, and
  Sch 4 Pt 1 item 17 applies the amendments *"in relation to assessments for the **2026-27** income
  year and later income years"*. That is **the register's current year**, not a forward one.
* s 25-130(2): the deduction is the **lesser of $1,000 and total assessable labour income**, reduced
  (not below zero) by the taxpayer's actual s 8-1 work deductions, Div 28 car expenses, s 25-100
  travel, repairs and Subdiv 40-B/40-D decline in value on work assets, and s 25-125 COVID-test
  deductions. s 25-130(3) excludes income-protection, personal-sickness and accident-insurance
  premiums and trade or professional association fees from the reducers.
* **Not indexed either** — no s 960-265 item.
* **It couples to WATO.** s 61-155(2) `labour deductions` limb (c) is *"an amount you can deduct
  under section 25-130"*, so the standard deduction **reduces WATO's own base** by up to $1,000. For
  an ordinary wage earner with no other work deductions the *gross wage* needed for the full $250 is
  therefore about **$20,985.71**, not $19,985.71. BP2's $19,985 is stated on net labour income and
  is not wrong, but it is not a gross-wage figure.
* **Direction of the error, in R9's terms, while it was unmodelled:** omitting a deduction
  over-states taxable income and therefore over-states tax, so the omission was conservative and
  R9's logic covered it. But it was a **current-year** gap rather than a forward one, worth up to
  $1,000 of taxable income per working Person in FY2026-27. That is why it got its own item.

**What P3-38 built on 2026-09-15, and what it did NOT.** The section has **two independent effects**
and they do not share a call site, so only one of them could be built:

* **BUILT — the WATO-base limb, s 61-155(2) `labour deductions` limb (c).**
  `standardDeductionAmount` and `standardDeductionAmountFor` in `src/data/assumptions/tax.ts` hold
  `max(0, min($1,000, total assessable labour income) − reducers)` with the year gate
  `s25130AppliesToYear`; `netLabourIncomeFromSalary(fy, salary, reducerDeductions)` in
  `src/core/incomeBases.ts` consumes them, so every WATO figure from FY2027-28 is now computed on a
  net labour income the deduction has already reduced. The reducer sum is a **Setting**,
  `tax.s25130.reducerDeductions`, required rather than defaulted, with the acceptance §2.8.1 dates.
  The $1,000 is written **once**, in `S25130_MAXIMUM_DEDUCTION`, and the gross wage a wage earner
  needs for the full $250 is **derived** from the shade-in point plus that maximum — about
  **$20,985.71** — and stored nowhere, exactly as `watoShadeInPoint` forbids storing $19,985.71.
* **BUILT 2026-09-17 by P4-1 chunk 3 — the taxable-income limb.** s 25-130 sits in Division 25, so
  it also reduces **taxable income** by the same amount, worth up to $1,000 × the marginal rate per
  working Person from FY2026-27. This bullet read **NOT BUILT** until 2026-09-17, and its reason is
  kept here once because it is what the fix had to supply: *"There is no call site in `src/core` to
  wire it to, and this is a fact about the code rather than a scoping preference: `taxableIncome()`
  in `src/core/incomeBases.ts` is a bare boundary constructor — it range-checks a number the caller
  already holds and brands it — and nothing anywhere in `src/core` computes assessable income less
  deductions. `SaptoPerson.taxableIncome` is a required **input** field, never derived. That
  assembly is Phase 4's unbuilt `project()` (TODO P4-1)."* The assembly now exists:
  **`taxableIncomeFromSalary(fy, salary, reducerDeductions)` in `src/core/projection.ts`** computes
  `max(0, salary − (reducers + standardDeductionAmountFor(fy, salary, reducers)))` per Person per
  financial year and hands it to `householdIncomeTax`, which reports it as an `Income tax, <name>`
  `MonthLine`. `taxableIncome()` is still a bare boundary constructor and
  `SaptoPerson.taxableIncome` is still a required input — what changed is that a caller now computes
  the number rather than holding it. `standardDeductionAmountFor` is **reused**, so the $1,000 is
  still written once in `S25130_MAXIMUM_DEDUCTION`; a source canary in
  `test/core-projection-tax.test.mjs` forbids a second one in the walk. **O72 is CLOSED.**
* **The consequence for FY2026-27, stated plainly:** the *WATO-base* limb changes **no** FY2026-27
  figure, because WATO does not exist until FY2027-28 and that limb reaches nothing else. The
  *taxable-income* limb does, and it is the current year's whole point: a Person on $78,000 of
  salary pays **$320 a year less tax in FY2026-27** than the same build produced on 2026-09-16 —
  $300 of marginal rate on $1,000 plus $20 of Medicare levy — and that figure is hand-worked in
  `test/core-projection-tax.test.mjs`. The superseded sentence here read *"O72's own complaint —
  that this is the only open item about the current year — therefore survives P3-38 intact, and
  survives until P4-1"*. P4-1 chunk 3 has arrived and it does not survive it.
* **One approximation, accepted and bounded.** s 25-130(4)'s `total assessable labour income` is the
  **withholding-tested** subset (TAA 1953 Sch 1 ss 12-35, 12-40, 12-45, 12-47, 12-50, Subdiv 12-C,
  para 12-110(1)(ca)), which is **narrower** than s 61-155(2)'s `labour amounts` — the latter also
  reaches sole-trader business income, personal services income, s 83A-25 ESS discounts and s 12-60
  labour-hire payments. The tool asks for one `labourAmounts` figure with no breakdown by source, so
  the cap is run against the broader base. A Person whose labour income is of those other kinds is
  over-credited, by at most $1,000 of deduction and only where their withheld labour income is under
  $1,000. Recorded at `TAX.s25130.labourIncomeApproximation`. A refusal was considered and rejected
  as over-broad: it would block the provision for the PAYG case this Household actually is, over an
  edge case no fixture exercises and the tool cannot detect.

### 2.9 Spouse contribution offset — ITAA 1997 Subdiv 290-D

**GATE: GO — 2026-09-22 (LIZ), figures fetched and confirmed independently** against the ATO's own
T3 2026 instructions page, cross-checked on AustLII's indexed text of ss 290-230 and 290-235
(TODO P3-19).

| Name | Value | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|
| Base | $3,000 | constant | ITAA 1997 s 290-230(2) col 3 item 1 | 2026-09-22 | primary-verified |
| Lower threshold | $37,000 | constant | ITAA 1997 s 290-230(2) col 2 item 1 | 2026-09-22 | primary-verified |
| Rate | 18% | constant | ITAA 1997 s 290-230(1) step 3 | 2026-09-22 | primary-verified |
| Maximum offset | $540 | constant | ITAA 1997 s 290-235 | 2026-09-22 | primary-verified |

**Formula:** `offset = 0.18 × min(max(0, $3,000 − max(0, spouse income − $37,000)), contribution made)`,
capped at $540 for the income year. "Spouse income" for this test is the **receiving** spouse's
assessable income + reportable fringe benefits total + reportable employer super contributions —
**not** simply taxable income, and there is no income test on the contributor.

* **$40,000 is not a stored figure.** It is where the $3,000 reduction is exhausted —
  `lowerThreshold + base` — and is computed, never read off a table, on `watoShadeInPoint`'s own
  "store the formula, never the number" doctrine (§2.8).
* **Not indexed, flagged for periodic recheck.** No indexation provision exists in Subdiv 290-D.
  The four figures have stood since the *Treasury Laws Amendment (Fair and Sustainable
  Superannuation) Act 2016* (effective 1 July 2017) — nine years unchanged is evidence of the
  freeze and not proof it is permanent, so the record is `kind: 'constant', everyYear: true`
  (`CARRY_FORWARD.totalSuperBalanceTest`'s own convention, `super.ts` §3.4), not a `config` row
  stamped to one financial year.
* **s 63-10(1) placement — a reasoned inference, not a fetched item number.** No item of the
  fetched s 63-10(1) table (items 3, 5, 10, 15, 20, 21, 22, 40, 45 — `docs/research/p3-24-o73-
  offset-order.md`) names Subdiv 290-D. It therefore falls into **item 20**, "any tax offset not
  covered by another item" — the same residual LITO occupies (`S63_10_TABLE` in `tax.ts`) —
  non-refundable, non-transferable, no carry-forward, and its order against LITO and SAPTO's
  already-resolved figure is immaterial for the same reason O73 found WATO/SAPTO/LITO's aggregate
  order-blind: every offset in the residual is lost-if-unused, so `householdIncomeTax` sums LITO,
  SAPTO's (already transfer-resolved) figure and this offset and caps the sum once, rather than
  capping three times in sequence — the two are arithmetically identical for a "lost, not
  transferred" offset.
* **Eligibility beyond the income test — two exclusions, both structural rather than coded gates.**
  (i) *Permanently separated couples*: this build has no fact for "living permanently separately"
  distinct from Household shape — a 2-Person Household is already read as `relationship: 'couple'`
  everywhere else in `incomeTax.ts` (SAPTO, the Medicare levy family path), with `illnessSeparated`
  unreachable from `project()` (no entry type constructs it). `SPOUSE_CONTRIBUTION` reuses that
  same reading rather than inventing a second one: it is reachable only where the Household holds
  two Persons, which this codebase already treats as "a couple, not separated." (ii) *A contribution
  already claimed as a personal deduction*: structurally excluded rather than flagged. s 290-150's
  personal-contribution deduction applies only to a contribution to the **contributor's own**
  interest (s 290-155(a)); `SPOUSE_CONTRIBUTION` is definitionally paid into the **receiving
  spouse's** interest, so it can never be the same dollars a personal-deduction entry could claim.
  No field or flag is needed for either exclusion.

### 2.10 The CGT reform from 1 July 2027 — Act No. 49 of 2026 Sch 1 (LR-1)

**Slices 1 to 3 of 4, 2026-09-29: the arithmetic, the walk, and Div 119's minimum tax.** Read from
the as-made Act (C2026A00049, registered 26/06/2026), each amended section re-read on the ATO legal
database on 2026-09-29 (ss 119-5, 119-10, 119-15 and 4-25 again for slice 3). Every capital gain
from a CGT event on or after 1 July 2027 is now worked out and taxed under the reform. Slice 4 owes
the surfaces: the line's provenance caveat, the chat and connector wording, and the guide.

| Name | Value | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|
| Reform start (`tax.cgt.reformStart`) | 1 July 2027 | config, effective 2027-07-01 | ITAA 1997 s 112-155(1)–(2), s 110-36(1A)(a) | 2026-09-29 | primary-verified |
| Pre-CGT cutoff (`tax.cgt.preCgtCutoff`) | acquired before 20 September 1985 | constant | ITAA 1997 s 104-10(5)(a); s 112-175(2) from the reform start | 2026-09-29 | primary-verified |
| Indexation factor places (`tax.cgt.indexationFactorDecimalPlaces`) | 3, a fourth decimal of 5 or more rounding up | constant | ITAA 1997 s 960-275(5) | 2026-09-29 | primary-verified |
| Minimum tax rate (`tax.cgt.minimumTaxRate`) | 30% of the minimum tax capital gain | config, effective 2027-07-01 | ITAA 1997 s 119-10(2) step 1 | 2026-09-29 | primary-verified |

* **The split** (`realisationFromJuly2027`). A parcel held through 30 June 2027 is deemed sold just
  before 1 July 2027 at its market value and reacquired for the same (s 112-155(2)–(3)(a)). The
  deferred gain or loss (s 112-160) is that value less the cost base, discounted if held more than 12
  months at the REALISATION day (s 112-160(3)(c)). The gain from 1 July 2027 runs from that value,
  indexed (s 110-36(1A), s 960-275(1B)) and never discounted (s 115-100(f)). A pre-CGT parcel has a
  nil deferred part (s 112-175(2)).
* **The 12-month rule reads the original acquisition** (s 114-10(9), s 112-160(5)), on the P3-21b
  "more than 12 months" reading.
* **Losses are never indexed** (s 114-5(1) note 2): proceeds between the value and the indexed value
  give nil.
* **Step 1's order** (`netCapitalGainFromJuly2027`): losses reduce deferred gains before later gains.
  The minimum tax capital gain (s 119-5) is the later gains left, deferred ones excluded.
* **The index quarters are a forecast**, on `Settings.economicSeries.cpi` through `priceLevelFactor`.
  No quarter the factor can need is published yet. From slice 2 every `Income tax on capital gain`
  line from 1 July 2027 says so in its determination (`CGT_INDEXATION_FORECAST_DETERMINATION`).
  Once a plan's `asAtDate` passes the first publication of the September 2027 quarter, published
  quarters become the legal figures and a quarterly published series is needed (TODO on
  `cgtIndexationFactor`).
* **Pre-CGT before the reform.** A pre-CGT parcel's gain or loss from a disposal before 1 July 2027
  is disregarded (s 104-10(5)(a)); until 2026-09-29 it was taxed in full.
* **Where the value just before 1 July 2027 comes from (slice 2).** A plan starting on or before
  1 July 2027 walks through that day: the walk stamps each parcel acquired before it with its
  market value at the OPENING of July 2027, which is its value at the close of June, because growth
  lands at the end of each month. It is the walk's projection, not a valuation. A plan starting ON
  1 July 2027 takes its stated opening values, by convention. A plan starting later must state the
  figure on every parcel acquired before 1 July 2027, and no other plan may state it (`parsePlan`).
* **A distribution reinvested on or after 1 July 2027** is cost base of the part from 1 July 2027
  (`Parcel.reinvestedFromJuly2027`), not of the deferred part. It is NOT indexed, because one figure
  cannot carry each reinvestment's own quarter. Over-states the gain, the safe direction.
* **Death from 1 July 2027.** Nothing is pre-CGT any more (s 112-175(2)), so a pre-CGT parcel passes
  to the survivor unchanged, value included, instead of being re-acquired at the death.
* **Death from 1 July 2027 with a deferred gain or loss — ruling R1 (user, 2026-09-29, option b).**
  Act 49 does not amend Div 128, and the law does not say whether the deferred gain (s 112-160(3))
  is taxed at the death, carried to the survivor, or disregarded by s 128-10. **Ruled: carried.**
  The survivor takes the parcel over with its value just before 1 July 2027, its deferred gain or
  loss and its later cost base intact, on Div 128's own pattern (the death is disregarded, s 128-10;
  the heir takes the deceased's cost base, s 128-15(4)). The deferred gain is taxed when the
  survivor sells. **The discount on it turns on the ORIGINAL purchase date plus 12 months**:
  s 115-30(1) item 4 treats an asset that passed to a beneficiary, other than a pre-CGT asset, as
  acquired "when the deceased acquired the asset" (checked 29 Sep 2026, ATO legal database). The
  indexation clock (s 114-10(9)) reads the same day. **Direction: a reading, not a settled answer.**
  Taxing it at the death would bring the tax forward; disregarding it would drop it. Carrying it is
  in the middle on timing and never loses it. **No survivor is not reachable**: the door refuses a
  `DEATH` in a Household of one and a second `DEATH`, so no estate path holds a parcel.
* **Div 119's minimum tax (slice 3, `minimumTaxGapAmount` in `incomeTax.ts`).** The gap is 30% of
  the minimum tax capital gain, less the tax on taxable income, less the tax on taxable income
  reduced by that gain (not below nil), rounded DOWN to the whole dollar, if more than nil
  (s 119-10(2)). It is part of basic income tax liability (s 4-25), so WATO's item 3 cap, LITO,
  SAPTO and the spouse contribution offset are all applied against the raised figure. The Medicare
  levy is not: it is levied on taxable income, which Div 119 does not change. The Treasury "Jack"
  case (a $10,000 gain wholly in the 14% band) is topped up by $1,600.
* **The exemption is per Person and per income year** (s 119-15(1): "if you receive, at any time
  during the income year", a listed payment). The only listed payment this build models is the age
  pension, read off the walk's own figure as `receivesAgePensionThisMonth` — the same expression as
  SAPTO's `qualifiedThisMonth` today, under its own name so a later widening of SAPTO cannot widen
  the exemption. A charge at a sale reads the year to date and the month; the July true-up reads the
  whole year, so a Person first paid the pension later in the year is refunded then. The first
  part-year has no true-up and keeps the over-charge (the conservative direction). **Residual,
  flattering:** the pension is paid fortnightly in arrears, so an entitlement starting late in June
  may first be received in July; monthly granularity then exempts that year one year early.
* **A charge at a sale uses the disposal month's annualised salary**, as for every gain. In a year a
  Person stops work, a sale after the last pay can meet a low annualised income and pay the gap;
  the July true-up assesses the whole year's salary and gives back what the year does not owe.
* **Gross-up: up to a dollar either way.** The indexed cost base is floored, so one more cent of
  proceeds can LOWER the gain by a cent. And Div 119's gap is floored to whole dollars, so one more
  cent of proceeds can add a dollar of tax (part of the gain below the 30% band) or take one off
  (taxable income in the 37% band). `net` is then not monotone and the search does not find the
  least sale: it finds one that funds the draw, and the spare, up to a dollar, lands in cash.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingValueJustBefore1July2027Error`** | a parcel acquired before 1 July 2027 reaches `realisationFromJuly2027` with no `valueJustBefore1July2027` | **BUILT** — `src/core/projection.ts`. From `project()` only on a household that bypassed `parsePlan`, which requires the figure where the walk cannot stamp it |
| ~~`DeathWithDeferredCapitalGainError`~~ | — | **DELETED 2026-09-29** on ruling R1 (option b): the survivor inherits the deferred gain (see *Death from 1 July 2027 with a deferred gain or loss* above). Its only ground was that the law's answer was unruled |

---

## 3. Superannuation

Every figure per Person, never per Household.

### 3.1 Contribution caps

| Name | Value | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Concessional contributions cap | $32,500 | 2026-27 | config — AWOTE-indexed | [ATO contributions caps](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps) · ITAA 1997 s 291-20(2) | 2026-09-03 | primary-verified |
| Non-concessional contributions cap | $130,000 | 2026-27 | config (derived) — **4 × concessional cap** | ATO, same page · ITAA 1997 s 292-85(2)(a) | 2026-09-03 | primary-verified |
| General Transfer Balance Cap | $2,100,000 | 2026-27 | config — CPI-indexed | **Derived, not copied.** ITAA 1997 **s 294-35(3)** (base **$1,600,000** for 2017-18, "indexed annually" — **the subsection contains $1,600,000, not $2,100,000**) + **s 960-265 item 10A** + **s 960-285(2), (3)(b), (5)(b), (6), (7) item 3** + **s 960-280(1)** + **ABS CPI, All Groups, weighted average of 8 capital cities: Dec 2016 = 76.38, Dec 2025 = 100.32**: `100.32 / 76.38 = 1.313433 → 1.313 → 1,600,000 × 1.313 = 2,100,800 → floor $100,000 =` **$2,100,000**. Corroborated by [ATO transfer balance cap](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/transfer-balance-cap) (last updated 27 Apr 2026), 2026–27 = 2.1 | 2026-09-09 | primary-verified — **the same s 960-285 arithmetic reproduces all nine published general caps, 2018-19 through 2026-27** (§3.10). *(Corrected 2026-09-09, O45: the row previously cited s 294-35(3) alone, which is the one figure that subsection does not contain; the row was in truth `secondary-only` until the index numbers were retrieved.)* |
| Contributions tax (fund low tax component) | **15%** | — | **constant** | Income Tax Rates Act 1986 s 26(1)(a) | 2026-09-03 | primary-verified |
| Non-arm's-length / non-complying fund rate | 45% | — | constant | Income Tax Rates Act 1986 | 2026-09-03 | primary-verified |
| Fund earnings tax, Accumulation Phase / TTR | 15% | — | constant | ITAA 1997 | 2026-09-03 | primary-verified |
| Fund earnings tax, Retirement Phase (ECPI) | 0% | — | constant | ITAA 1997 ss 295-385, 295-390 — **how a fund gets between the two rates in a year where an interest changes phase is §3.11** | 2026-09-03 | primary-verified |

The NCC cap moves in **$10,000 steps** because it is 4× a cap that moves in $2,500 steps. It is not
separately indexed. The carry-forward increase under s 291-20(4) is expressly **excluded** from the
NCC cap calculation — carrying forward concessional cap does not enlarge the NCC cap.

**One stale ATO sentence to ignore:** the *Contributions caps* page still says in present tense
"The general transfer balance cap is $2 million from 1 July 2025." Two other ATO pages and the
bring-forward arithmetic ($2.1m − $260k = $1.84m; $2.1m − $130k = $1.97m) give **$2,100,000** for
FY2026-27.

#### 3.1.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
reads it.** Since 2026-09-10 that test **discovers** the tables rather than being told where they
are: any table in this document whose header row is `| Refusal | … | Status |` is read, so the row
rows below are enforced from the moment they exist, statuses included. They are §3.1's additions to
the inventory. The first is recorded here because what it defends is this section's own published
pair of figures; the second because what it decides is **which of those two figures** a contribution
is measured against. Both were in `src/` before this table existed — in `src/core/superCaps.ts` and
`src/core/superConcessional.ts` — and were named **nowhere in this document**: the P3-26 quarantine,
which is a finding and not an exemption, since a refusal with no register row is a decision the
specification does not record.

| Refusal | Fires when | Status |
|---|---|---|
| **`PublishedCapMismatchError`** | a cap this section **publishes a figure for** is recomputed from its own indexation spec for that same year and the two disagree. **The ground is that the published figure is a fixture for the machinery and not a second source of truth** — §3.1 says so of the general Transfer Balance Cap in as many words (*"Derived, not copied"*), and the assumptions layer says it of the concessional cap (*"the source of truth is the spec plus the index"*). A disagreement is therefore not a choice between two figures; it means the spec, the index number or the multiple is wrong, and the engine refuses rather than silently preferring one. **There are three throw sites and they do not guard the same thing.** **(1) The concessional cap** (s 291-20(2), $32,500) — reached only when an AWOTE number is supplied for the published year; it guards the whole s 960-285 machinery, the base amount, the base quarter, the index the cap is keyed to (**T14**) and the $2,500 step, and it is reachable by input: last year's AWOTE number filed against this year computes $30,000 against a published $32,500. **(2) The non-concessional cap** (s 292-85(2)(a), $130,000) — **this one guards the multiple and nothing else, and no input can reach it.** The concessional cap it multiplies has already been reconciled against its own published figure by site (1), so for FY2026-27 `concessionalContributionsCap` returns exactly $32,500 or throws; the only way 4 × that can miss $130,000 is a wrong `caps.nonConcessionalMultiple`. That record became a **number** only on 2026-09-10 (P3-27); until then the module hand-held a literal `4` and this check was the only thing standing behind it. **Deleting this throw failed ZERO tests** before 2026-09-10 — the suite appears to cover it, but the throw it observes comes from the concessional call nested inside. It now fails exactly one, and that one reads the module's **text**; no behavioural test can reach the branch, because nothing can. **(3) The general Transfer Balance Cap** (s 294-35(3), $2,100,000) — guards the CPI reference base (**O41**), the s 960-285(6) three-decimal round-up and the $100,000 floor, and is reachable and exercised at the boundary: a December 2025 index number of 100.248 tips the factor from 1.313 to 1.312 and is refused, where 100.249 is not. What it does **not** do on agreement is adopt the computed figure — the **published** one is returned, so a computed year carries O41's open reference base in its confidence and the published year does not | **BUILT** — `src/core/superCaps.ts`, three throw sites. **The stated ground is sound, but at site (2) it is wider than what the code can actually be telling you:** *"one of them is wrong"* can only mean the multiple there, and since no caller reaches it, that site is a check on the assumptions layer's internal agreement rather than on anything a user supplied |
| **`NoticeOfIntentError`** | `personalDeductibleContributions` is asked to brand a **positive** personal contribution as deductible while the caller states that the s 290-170 notice of intent was **not acknowledged** by the fund. One throw site. **This is a rule of law, and it fires on a fact the caller states rather than on anything the engine computes** — a notice of intent is a **taxpayer act**, in the same family as §5A.4.1's qualified-person gate: no input can make it fire from the rules in the tables above, because the acknowledgement is not derivable from a contribution figure. It is **not** an input-shape guard (the facts describe one perfectly coherent Person: someone who made a personal contribution and never lodged a notice), **not** a drift tripwire, and **not** a scope refusal (the law's answer is known and the message states it — the amount is non-concessional). **Why it belongs to §3.1 and not to §3.4 or §3.6.** What it decides is *which of this section's two published caps the money counts against*: with the acknowledgement the amount is concessional and runs at the $32,500 cap and, above it, into §3.4's window; without it the amount is an ordinary non-concessional contribution and runs at the $130,000 cap instead. §3.4's carry-forward machinery is downstream of that classification and never makes it; §3.6 reads the same fact for a different purpose (see below). **The finding is that the rule this refusal applies is recorded nowhere in this register.** §3 stops at the caps and the rates and never states what a concessional contribution **is** — ITAA 1997 s 291-25 and Subdiv 290-C have no row in any section — so the s 290-150 entitlement, the s 290-170 notice, and above all the **acknowledgement** that is this refusal's actual trigger exist only in `src/core/superConcessional.ts`. The one place the register comes near it is **§3.6's income-base component list**, which glosses limb (c) as *"the personal deductible contributions (s 290-150, with the s 290-170 notice) already modelled"* — a description of a **Div 293 limb**, not a rule of this section, and it does not mention the acknowledgement at all. **A near-miss of the P3-29 pattern, recorded because the next reader will hit it.** The refusal's own message asserts no negative about the register, but the JSDoc three lines below it does: *"The register carries nothing on Subdiv 290-C at all (§3 stops at the caps and the rate)"*. §3.6's gloss was added by P3-5 on 2026-09-05, after that comment was written, and it names both provisions — so the sentence is false as it stands. The **narrower true claim** — that no section records Subdiv 290-C's *conditions*, and that the gloss sits in the Div 293 income base rather than in §3 — supports the refusal exactly as well. Recorded, not fixed (`src/` is out of scope for the brief that wrote this row). **Two details are load-bearing.** The guard is `amount > 0 && !acknowledged`, so a **nil** personal deductible contribution with no notice is branded and returned rather than refused — sound, because nothing is deducted and nothing is reclassified, and `test/core-super-concessional.test.mjs` asserts it in both directions. And the same acknowledgement decides a **second** figure: under §3.6 limb (c) a Subdiv 290-C deduction is part of *reportable superannuation contributions*, which Div 293 then disregards, so an unacknowledged notice treated as acknowledged moves money in the contribution caps **and** in the Div 293 income base | **BUILT** — `src/core/superConcessional.ts`. **The ground is sound but unsourced in this document**: the statute says what the message says, and no row of this register does |
| **`ExcessConcessionalContributionsNotModelledError`** | a plan states a salary sacrifice whose **annual amount PLUS the Person's employer Superannuation Guarantee** exceeds the **general** concessional contributions cap (s 291-20(2)) for the financial year the arrangement takes effect in. One throw site, `refuseConcessionalContributionsOverGeneralCap` in `src/core/superConcessional.ts`, called once per stated `SUPER_CONTRIBUTION` level from `projection.ts` — **after the month's salary and Guarantee are derived**, which is why it is not in the entry loop. **This is a scope refusal** — §3.5.1's fourth kind. The law's answer is known and this build does not implement it: **ITAA 1997 Div 291** includes the excess in the Person's own assessable income with a 15% tax offset and adds an excess concessional contributions charge, and none of that is in this register (the `EXCESS_CAVEAT` §3.1 has carried since P3-3b). Walking such a plan charges the fund's 15% and stops, which understates the tax and **overstates the Household — the flattering direction, for exactly the Households most likely to be over the cap**. **THE TEST WAS THE STATED AMOUNT ALONE UNTIL 2026-09-20 AND IS THE TOTAL NOW (P6-8 brief 3, final chunk).** The old scope was correct on its own ground — the Guarantee reached no part of the walk, so every total the engine could build understated the Person's real one — and chunk 2b discharged it by crediting the Guarantee. The function now takes the four s 291-25 **components** and builds the total with `concessionalContributions`, so no caller can pass one limb. **Passing it is still not a finding of compliance**, for a smaller reason that runs BOTH ways: s 291-20(4) carry-forward headroom is not run (it would make the cap larger — O78) and a personal deductible contribution has no field in this model (it would make the total larger). The function returns nothing, so there is no clean bill to read out of it. **The sacrifice limb is the amount actually contributed** (`Math.min(gross, stated)`), not the stated figure, so O77's over-pay gap makes this check weaker and never stricter. **The cap is the YEAR's, and from 2026-09-21 (P6-12) EVERY year of the Planning Horizon has one** (§3.2). The floor is unchanged and still runs first: s 960-285 indexes cumulatively from $25,000 and the December 2016 quarter and never below that base, so an amount **within the base amount** is within every year's cap and is accepted with no index number at all. **Above the floor the year's own cap is now DERIVED rather than missing** — the published December 2025 AWOTE level grown at the wage growth rate the plan itself states — so what this refusal now reports is an amount over even the **indexed** cap. **The message says which kind of cap it measured against**: the published figure for FY2026-27, or, for every year after it, that the figure **is a FORECAST AND NOT THE LAW**, derived by growing the last published wage level at a rate the reader can edit, and moving in $2,500 steps when they do. ⚠️ **`MissingIndexNumberError` is no longer reachable through this call from `project()`**; it survives here for a year BEFORE the anchor (compounding backwards would invent December quarters the ABS has already published) and for a caller who supplies no series. ⚠️ **The direction moved with it**: the indexed cap is larger than the floor, so fewer arrangements are refused and more money walks into super at 15% — the flattering direction, taken as a user ruling on the ground that a cap frozen at the base for forty years is not cautious but wrong (**O79**, closed 2026-09-21). ~~above the base amount a year with no AWOTE number raises `MissingIndexNumberError` through this call instead … while an amount above it in an unpublishable year is refused rather than measured against some other year's figure~~ — struck on 2026-09-21: forward of the anchor there is no unpublishable year left. **The residual that leaves is one-sided and narrow:** the check is made once, in the year the arrangement takes effect, so an arrangement inside that year's cap could breach a LATER year's only if AWOTE FELL. **A Person who states NO sacrifice is never checked, and cannot breach the cap:** SGAA s 10A(5)'s maximum contributions base is derived in this build as `floor_to_10(cap × 100 ÷ charge percentage)`, so 12% of it is at most the cap itself. Recorded in TODO.md P6-8 brief 3 | **BUILT** — `src/core/superConcessional.ts`, one throw site |
| **`CatchUpRefusedError`** | the "Add a catch-up" button on a financial-year row (P3-4b slice 2) cannot write its one-year salary sacrifice pair, and writes nothing: the Person has no carried-forward cap room that year; a salary sacrifice is already running in the year (the pair would replace it and its stop would end it); the forecast has no concessional cap for the year; the Person's pay cannot carry the amount (the walk would sacrifice less than offered); or the pair, walked through the save door, would take the year over its total concessional cap (general cap plus carry-forward, §3.4). **An input-shape and offer refusal, not a rule of law**: the offer is never bound (ADR-0004), so refusing it forecasts exactly what the plan already says. The amount offered is the year's remaining room rounded DOWN to whole dollars, with one $1 retry for cent rounding | **BUILT** — `src/app/planEdits.ts`, five throw sites, one refusal |

### 3.2 Indexation machinery — ITAA 1997 Subdiv 960-M, s 960-285

**Store the formula. Trap T13/T14.**

```
index_ratio = index_number(quarter ending 31 Dec immediately before the FY)
            / index_number(base_quarter)                       # s 960-285(5)

factor = round_up_to_3dp(index_ratio)   # 3 dp, rounding up if the 4th decimal >= 5, s 960-285(6)

if factor <= 1:   cap = base_amount                             # s 960-285(4) — "You do not index
                                                               # THE AMOUNT". For the general transfer
                                                               # balance cap that amount is $1,600,000
                                                               # (s 294-35(3)(b)), NOT last year's cap:
                                                               # the cap REVERTS, it does not hold.
                                                               # Trap T69. Labelled inference —
                                                               # s 960-285(4) read with s 294-35(3)(b).
else:             cap = floor_to_multiple(base_amount * factor, rounding_amount)   # s 960-285(2)
```

Indexation is computed **cumulatively from the original base amount and base quarter every year**,
never chained off last year's cap.

| Cap | s 960-265 item | Index | Base amount | Base quarter | Rounding (floor) |
|---|---|---|---|---|---|
| Concessional contributions cap | 9 | **AWOTE** (s 960-280(4)) | $25,000 (2017-18) | 31 Dec 2016 | $2,500 |
| General Transfer Balance Cap | 10A | **CPI** (s 960-280(1)) | $1,600,000 (2017-18) | 31 Dec 2016 | $100,000 |
| Div 296 large super balance threshold | 10B | **CPI** | $3,000,000 (2026-27) | **31 Dec 2025** | $150,000 |
| Div 296 very large super balance threshold | 10C | **CPI** | $10,000,000 (2026-27) | **31 Dec 2025** | $500,000 |
| Non-concessional contributions cap | — | not separately indexed | — | — | derived: 4 × concessional |

**Index definitions.** CPI (s 960-280(1)) = All Groups CPI, weighted average of the 8 capital
cities, **as first published**; if the ABS re-bases, only new-reference-period numbers are used
after the change (s 960-280(3)). AWOTE (s 960-280(4)) = full-time adult average weekly ordinary
time earnings for the **middle month** of the quarter, as first published — for the December
quarter that is **November**. ABS revisions are ignored. The re-basing rule does **not** apply to
AWOTE (s 960-280(5)).

**Algorithm verification (AWOTE, ATO Table 40):** Dec 2016 $1,533.40; Dec 2024 $1,975.80; Dec 2025
$2,051.10.

- 2025-26: 1975.80/1533.40 = 1.28853 → 1.289; 25,000 × 1.289 = 32,225 → floor $2,500 → **$30,000** ✔
- 2026-27: 2051.10/1533.40 = 1.33765 → 1.338; 25,000 × 1.338 = 33,450 → floor $2,500 → **$32,500** ✔

Both are golden fixtures.

**AWOTE index numbers — the two RECORDS the block above was checked against (added 2026-09-21,
P4-17, after P6-12).** The verification block is the *arithmetic*; these are the stamped figures,
and neither of them is a number inside a sentence any more.

| December quarter | AWOTE level | Record | Confidence | Retrieved |
|---|---|---|---|---|
| **31 Dec 2016** — the concessional cap's base quarter | **$1,533.40** | `capIndexation.awoteBaseQuarterIndexNumber` | `primary-verified`, ATO Table 40 | 2026-09-03 |
| **31 Dec 2025** — the latest quarter the ATO publishes | **$2,051.10** | `capIndexation.awoteLatestPublishedQuarterIndexNumber` | `primary-verified`, ATO Table 40 | 2026-09-21 |

**Every December quarter AFTER 2025 is a FORECAST, and is stamped as one.** From 2026-09-21 (P6-12)
the forward series is the Dec 2025 level grown at `Settings.economicSeries.awote` — the wage growth
rate the plan itself states — and every quarter it produces carries **`unverified`**, so every cap
derived from one says so where it is used. **The anchor is untouchable**: no rate a user can type
moves a published quarter, so FY2026-27 still reproduces **$32,500** exactly and
`PublishedCapMismatchError` cross-checks it on every call. ⚠️ **The series does not run BACKWARDS** —
a year before the anchor would need a December quarter the ABS has already published, and
compounding into it would invent figures, and invent them low — so `MissingIndexNumberError` (§3.2.1)
survives there and nowhere forward of the anchor. ⚠️ **This runs in the FLATTERING direction** —
larger caps, fewer refusals, more into super at 15% — and was taken as a user ruling on the ground
that a cap frozen at the base amount for forty years is **not cautious but wrong** (**O79**, closed).

**Algorithm verification (CPI, ATO/ABS).** ABS All Groups CPI, weighted average of the 8 capital
cities, **current reference base**, retrieved 2026-09-09 from the ABS SDMX data API (§10):
Dec 2016 **76.38** · Dec 2017 77.87 · Dec 2018 79.24 · Dec 2019 80.70 · Dec 2020 81.40 ·
Dec 2021 84.23 · Dec 2022 90.85 · Dec 2023 94.53 · Dec 2024 96.81 · Dec 2025 **100.32**.
Against the general Transfer Balance Cap's base — $1,600,000, base quarter 31 Dec 2016, floor
$100,000:

| FY | ratio | factor | × $1,600,000 | floor $100,000 | published |
|---|---|---|---|---|---|
| 2021-22 | 1.065724 | 1.066 | 1,705,600 | **$1,700,000** | $1.7m ✔ |
| 2022-23 | 1.102776 | 1.103 | 1,764,800 | **$1,700,000** | $1.7m ✔ |
| 2023-24 | 1.189447 | 1.189 | 1,902,400 | **$1,900,000** | $1.9m ✔ |
| 2024-25 | 1.237628 | 1.238 | 1,980,800 | **$1,900,000** | $1.9m ✔ |
| 2025-26 | 1.267478 | 1.267 | 2,027,200 | **$2,000,000** | $2.0m ✔ |
| 2026-27 | 1.313433 | 1.313 | 2,100,800 | **$2,100,000** | $2.1m ✔ |

All six are golden fixtures, as are **2018-19** (1.020 → $1.6m), **2019-20** (1.037 → $1.6m) and
**2020-21** (1.057 → $1.6m). That is **all nine** published general transfer balance caps, 2018-19
through 2026-27, reproduced by the s 960-285 arithmetic from one base amount and one base quarter —
which is what turns the machinery in this section from **asserted** into **demonstrated**, and is
also T13's proof: nothing here is chained off last year's cap. **O11 is closed** (§8).

**FY2026-27 cleared its rounding step by $800.** `1,600,000 × 1.313 = 2,100,800`, against a
$100,000 floor at $2,100,000. One thousandth of the indexation factor is worth **$1,600** at this
base amount, so the published figure survives its floor by half a thousandth of the factor. Treat
the margin as real fragility: it is an argument for computing the cap and never freezing it (T72),
and for the reference-base discipline immediately below.

**CPI reference base — record it with every index number (O41). This is an instruction, not an
observation.** The ABS has **re-referenced** the CPI series. The superseded series gives Dec 2016 =
**110.0** and has **no Dec 2025 number at all** — it ends at Sep 2025 — so the old base cannot
supply the FY2026-27 numerator even in principle. s 960-280(3) settles which to use: only index
numbers published in terms of the **new** reference period are used after the change, and the
new-base pair is the pair that reproduces every published cap above. But the two bases already
diverge in the **third decimal of the factor** — the decimal the whole calculation turns on — in
**2018-19** (1.020 vs 1.019), **2020-21** (1.057 vs 1.056), **2021-22** (1.066 vs 1.065) and
**2024-25** (1.238 vs 1.237). No published cap turns on the difference *yet*.

> **Every stored index number must carry its reference base, and an indexation factor must never be
> computed from a mixed pair.** A numerator and a denominator drawn from different reference
> periods is a silent, plausible, wrong answer — exactly the failure class §1 exists to catch.

The base is `unverified` as a *label*: the ABS codelist endpoint returns a calendar-year label
("2025 = 100.0") that does not reconcile with the observed series (the calendar-2025 average is
99.045), so the codelist does **not** authoritatively name the reference period. The two-point
arithmetic above is what establishes which series is which — see **O41 / U9** in §8.

#### 3.2.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below
are enforced from the moment they exist, statuses included. They are §3.2's additions to that
inventory. Both refusals were in `src/` before this table existed and were named in this document
only in **prose** — §3.5.1's list of what it deliberately does not register, §3.7's one-computable-year
paragraph, and O11 and O44 in §8 — the P3-26 quarantine, which is a finding and not an exemption: a
refusal with no register row is a decision the specification does not record. Naming a refusal in a
paragraph makes it findable; it does not assert that it is built or say which file it lives in, and
no drift signal fires when either changes.

**They are the two halves of s 960-285(5), they decline different rules, and they are not the same
kind.** The subsection is a ratio, and each refusal declines one side of it. **`MissingIndexNumberError`
declines the NUMERATOR** — the index number for the December quarter immediately before the year
asked for — and it is a **scope refusal**: what is missing is a *fact nobody has supplied*, because
the forward series is a Setting and not an assumption (**O5**), and the alternative is T13's
mutation. **`UnsourcedIndexBaseError` declines the DENOMINATOR** — the cap's own base quarter — and
it is an **input-shape guard**: since 2026-09-09 it can fire only on a series the *caller* supplied,
because the register's own series carries both base quarters (the table above), and what makes the
shape matter is **O41**. Neither is a **rule of law**: s 960-285 says how to index and forbids
nothing here. Neither is a **drift tripwire on this register's own records** — that is
`PublishedCapMismatchError`'s job (§3.1.1), which reads two records of this document against each
other and is the third refusal these functions can raise.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingIndexNumberError`** | the index series has no number for the December quarter the financial year asked for indexes *to* — `decemberQuarterBefore(fy)` — and that year is not one this register publishes a figure for. **Three throw statements in two modules, and one row** — R8's one-refusal-one-home rule, the same judgement §3.11.9 makes for `PhaseYearMismatchError`; the sites guard different caps, not different refusals. Two are in `src/core/superCaps.ts` — the **concessional contributions cap** (s 291-20(2), AWOTE, $2,500 step) and the **general Transfer Balance Cap** (s 294-35(3), CPI, $100,000 step) — and the third is in `src/core/div296.ts`'s `indexedThreshold`, reached from **two** call sites, the large and very large super balance thresholds (s 960-265 items 10B and 10C). Two further functions raise it through a nested call and have no throw of their own: `maximumContributionsBaseFor` (§3.5.1 records the pointer) and `bringForward` (§3.3). **This is a scope refusal**, §3.5.1's and §3.9.1's fourth kind. It is **not a rule of law** — no provision forbids anything here, and s 960-285 is the machinery it is trying to run. It is **not an input-shape guard**: a financial year two years out and a series that ends at the last published quarter describe one perfectly coherent request, and nothing is mis-shaped. It is **not a drift tripwire**, because it reads no record of this register against another. What is missing is a **number that does not exist yet**, and the message says so: the forward series is a **Setting**, not an assumption (**O5**), so supplying it is the caller's act and inventing it is T13. **The two modules do not mean quite the same thing by it, and the difference is the published year.** Both `superCaps.ts` sites are guarded `if (published.fy !== fy)`, so in **FY2026-27** a missing December quarter is **forgiven** and this section's published figure returned; `div296.ts` has **no such exemption and cannot have one**, because Division 296's base quarter *is* the published year's December quarter. For FY2026-27 `spec.baseQuarter` and `decemberQuarterBefore('2026-27')` are the same cell — `2025-12-31` — so the two guards test **one number**, and the one written first wins: a Division 296 series that cannot furnish December 2025 raises `UnsourcedIndexBaseError`, and **this refusal cannot fire in Division 296's only computable year at all**. §3.7 above distinguishes the two as "a missing quarter" and "a caller error and a different failure"; in the one year published data reaches, which name a caller sees is decided by **guard order**, and the guard order is in `src/` and in no row of this register. **A second thing the message compresses.** `indexNumberFor(spec.index, fy, indexNumbers)` matches on the index **and** the year, so a CPI number filed against the AWOTE-indexed concessional cap for the right year is reported as *no number* rather than as *the wrong index* — T14's mutation arrives wearing T13's refusal. `test/core-super-caps.test.mjs` asserts exactly that and is right to; the refusal is correct and the message is narrower than the fact. ~~**The AWOTE half of the stated ground is not in §8.**~~ — **struck on 2026-09-21: it is in §8 now, as O79.** O5 reads "CPI, PBLCI, MTAWE and wage-growth forward series"; ~~**AWOTE is named nowhere in §8**~~ — struck on 2026-09-21: **O79 names it in terms**, opened 2026-09-20 and closed 2026-09-21. What follows is still the reading O5 itself supports, and is kept for it: the concessional cap's forward years rest on the reading that *wage-growth forward series* reaches full-time adult average weekly ordinary time earnings (s 960-280(4)). It is a fair reading and it is a reading — contrast the CPI side, which has **O40 / U10** naming FY2027-28's general Transfer Balance Cap by year. There is ~~**no O40 for the concessional cap**~~ — **from 2026-09-20 there is one: O79 below, opened by P6-8 brief 2 chunk 6 — and from 2026-09-21 it is CLOSED (P6-12), because every year became computable** — and ~~this document does not record that the concessional cap is unknowable beyond FY2026-27 for the same calendar reason~~ — **it does from 2026-09-20: §3.1.1's `ExcessConcessionalContributionsNotModelledError` row states it, and states what the engine does about it (the base amount is a floor below which no year's cap can fall, so an amount within it needs no index number, and an amount above it in a year with no AWOTE number raises THIS refusal rather than being measured against another year's figure).** ~~The O40 gap itself is unchanged: no row names FY2027-28's concessional cap.~~ — struck on 2026-09-21. No row **publishes** FY2027-28's cap and none ever will until the ATO does, but the gap that sentence described has stopped being load-bearing: §3.2 now carries the **Dec 2025 AWOTE level as a record** (2,051.10, `primary-verified`), and every later December quarter is that level grown at `Settings.economicSeries.awote` and stamped **`unverified`**, so FY2027-28 and every year after it has an index number and a cap. **⚠️ THE CONSEQUENCE FOR THIS REFUSAL: it is UNREACHABLE FROM `project()` for the concessional cap from 2026-09-21.** Two things keep the guard alive and neither is the walk. **(i) A year BEFORE the anchor** — the series deliberately does not run backwards, because compounding a forecast rate into the past would invent figures the ABS has already published, and invent them low, so it returns nothing and this refusal fires. **(ii) Direct callers of the public `superGuarantee` and `maximumContributionsBaseFor`**, who may supply no series at all. The parenthetical above describes what the engine did until 2026-09-21 and is kept as the record of it; what it does now is measure the total against the year's **indexed** cap and label that cap a forecast. **An unnamed duplicate of this guard sits one layer down and no input reaches it:** `indexCapFromCpiSeries` in `src/data/assumptions/super.ts` throws a bare `RangeError` — *"has no index number for the quarter ending …"* — on the identical condition, but both callers test it first, so it is unreachable. Being a bare `RangeError` it is outside R8's naming discipline and outside the reach of the test that reads this table, the same shape as §3.5.1's fifth guard and §3.9.1's three | **BUILT** — `src/core/superCaps.ts` (two throw sites) and `src/core/div296.ts` (one, reached from two call sites). **The stated ground is sound.** Its O5 citation is exact for CPI and is an unstated reading for AWOTE, and the published-year divergence between the two modules is recorded here and nowhere else |
| **`UnsourcedIndexBaseError`** | a **supplied** `CpiSeries` has no index number for the indexing spec's own **base quarter** — December 2016 for the general Transfer Balance Cap, December 2025 for both Division 296 thresholds — so s 960-285(5) has no denominator and the ratio cannot be formed at all. One throw statement in `src/core/superCaps.ts` and one in `src/core/div296.ts` (reached from two call sites); **one row**, R8. **Narrowed on 2026-09-09 when O11 closed — see O44 — and this is what is left of it.** It used to fire for every year but the published one, on the ground that the Dec 2016 and Dec 2025 CPI numbers had not been retrieved. They are in the table above, and the ground went with them. **This is an input-shape guard, and no record of this register can reach it.** Both functions default to the register's own series, which carries both base quarters, so the *only* way to raise it is to pass a different series: it is a statement about the caller's argument, not about the world. A numerator with no denominator is a mis-shaped input rather than an invalid fact, and what the Act supplies is only **why the shape matters** — s 960-285(5) is a ratio, and **O41**'s instruction is that a factor must never be computed from a mixed reference-base pair, which is enforced here by refusing to let a caller's numerator borrow the register's denominator. `test/core-super-caps.test.mjs` prices that refusal: 100.32 over the superseded 110.0 gives a $1,400,000 cap where 100.32 over 76.38 gives $2,100,000. It is **not a rule of law**, **not a drift tripwire** (it reads no record of this document against another), and **not a scope refusal** — nothing is missing from the register; the caller withheld it, which is exactly what distinguishes it from the row above. **FINDING — one sentence of its message is FALSE against this register, and has been since 2026-09-09.** The message ends *"Nothing but a published figure is available."* That was true while O11 was open. It is not true now: the table above carries ten December quarter CPI numbers, all nine published general Transfer Balance Caps are reproduced from them, and Division 296's base quarter — December 2025 — is one of them. **The falsity was introduced by the very commit that narrowed the class.** The predecessor sentence read *"Register O11: … Only the published year is available"*; on **2026-09-09** that message was rewritten and the claim **kept in new words**, while the class's own JSDoc three lines above says of the O11 sentence that *"that sentence is gone with the ground under it"*. It was **reworded, not removed**, and the comment asserting its removal sits directly above the surviving copy. Recorded and not fixed — `src/` is out of scope for the brief that wrote this row. **The refusal itself stands on the rest of its own message**, which is sound: *this* series has no denominator, and the register's numbers may not be substituted into it. **The published year is treated asymmetrically, and nothing outside `src/` says so.** In `generalTransferBalanceCap` this guard runs **before** the published-figure fallback, so for **FY2026-27** a series missing December **2016** is refused outright while a series missing December **2025** falls back to the published $2,100,000 and is not. For the one year this register publishes a figure, a missing **denominator** is fatal and a missing **numerator** is forgiven. Both behaviours are asserted in `test/core-super-caps.test.mjs`; neither is a rule this document states. **Its AWOTE wording is unreachable by any input.** The constructor takes the index as an argument, and both throw statements pass `spec.index` off a CPI-indexed spec, so no call can construct the AWOTE sentence. The module gives the reason and this document does not: the AWOTE base-quarter figure is a **register record** (`capIndexation.awoteBaseQuarterIndexNumber`), not a caller input, so a missing AWOTE number is always a missing *December quarter* and the row above's business. That is the load-bearing half — it is why this refusal is CPI-only and why there is no AWOTE twin — and it lives in `src/core/superCaps.ts` alone. **An unnamed duplicate sits one layer down, unreachable for the same reason as the row above's:** `indexCapFromCpiSeries` throws a bare `RangeError` — *"has no index number for the base quarter …"* — on the identical condition, after every caller has already tested it | **BUILT** — `src/core/superCaps.ts` and `src/core/div296.ts`. **The refusal is sound and one sentence of its message is not:** *"Nothing but a published figure is available"* is false against §3.2 as it stands, false since **2026-09-09**, and is recorded here rather than corrected |

**What these two rows change about §3.2, and it is the same thing twice.** This section states the
formula, the four caps' parameters, the index definitions and ten CPI numbers, and until now it
never said that the machinery **refuses** rather than estimating. Every forward year in a
twenty-year projection meets one of these two refusals or the published-figure fallback, so which
of the three a caller gets was, before this table, a decision a reader of the register could not
discover — the same absence §3.9.1 records for its own eight.

**Three things reachable from these functions are deliberately not rows here.**
`PublishedCapMismatchError` is registered at **§3.1.1**, whose ground — the published figure is a
fixture for the machinery and not a second source of truth — covers its Transfer Balance Cap and
Division 296 throw sites by its own terms. `Div296NotApplicableError` is registered at **§3.7.1**
and guards the *year* before either threshold is indexed at all, so a pre-FY2026-27 year never
reaches this section's machinery. And `indexCapFromCpiSeries`'s T14 guard — *"a CPI-indexed cap
cannot be indexed from a CPI series"* for a spec that is not CPI-keyed — is a **third** bare
`RangeError` in `src/data/assumptions/super.ts`, unreachable because both callers read the index
off the spec they were given. All three bare guards in that file sit outside R8's naming discipline
and outside the reach of the test that reads this table.


### 3.3 Bring-forward — derived, not literals (T19, T20)

```
GTBC      = general Transfer Balance Cap for the first year
gen_cap   = 4 * concessional_cap
cap_space = GTBC - TSB(immediately before the start of the first year)   # s 292-85(3)(e)

if TSB >= GTBC:                cap = 0             # s 292-85(2)(b)
elif cap_space > 2 * gen_cap:  cap = 3 * gen_cap   # s 292-85(5)(b), 3-year
elif cap_space > 1 * gen_cap:  cap = 2 * gen_cap   # s 292-85(5)(a), 2-year
else:                          cap = gen_cap
```

Inequalities are **strict**. FY2026-27 outputs, which reproduce the ATO table exactly:

| TSB at 30 Jun 2026 | First-year NCC cap | Bring-forward period | Kind | Confidence |
|---|---|---|---|---|
| < $1,840,000 | $390,000 | 3 years | config (derived) | primary-verified |
| $1,840,000 to < $1,970,000 | $260,000 | 2 years | config (derived) | primary-verified |
| $1,970,000 to < $2,100,000 | $130,000 | none | config (derived) | primary-verified |
| ≥ $2,100,000 | nil | n/a | config (derived) | primary-verified |

Other rules, all ITAA 1997 s 292-85, all **primary-verified**:

| Name | Value | Kind |
|---|---|---|
| Age gate | Person must be **under 75 at any time in the first year** (s 292-85(3)(c)) | constant |
| Trigger | contributing more than the general cap in the first year — not elective (s 292-85(3)(a)) | constant |
| Frozen cap | indexation during the bring-forward period does **not** apply; total = first-year cap × 3 (or × 2) | constant |
| Year 2/3 cut-out | remaining cap reduced to **nil** if TSB at the previous 30 June ≥ the general Transfer Balance Cap for that year (s 292-85(6)(a), (7)(a)) | constant |
| NCC cap nil outright | where TSB at the preceding 30 June ≥ the general Transfer Balance Cap (s 292-85(2)(b)) | constant |

**The refusal on this section's Total Super Balance input is registered at §3.8.1, not here.**
`bringForward` reads the balance through the same guard `carryForwardHeadroom` uses, so s
292-85(3)(e)'s cap space and s 291-20(3)'s eligibility test share **one** refusal rather than
having one each — and registering it twice would be one refusal with two rows, against R8. §3.8.1
also records what the two Total Super Balance refusals between them make uncomputable, which bears
directly on this section.

### 3.4 Carry-forward concessional — ITAA 1997 s 291-20(3)–(7)

| Name | Value | Kind | Confidence |
|---|---|---|---|
| TSB eligibility test | **< $500,000** | **constant** — bare figure, no indexation provision | primary-verified |
| Test date | TSB just before the start of the financial year (30 June immediately prior) | constant | primary-verified |
| Look-back window | previous **5** financial years | constant | primary-verified |
| Application order | earliest year first | constant | primary-verified |
| Earliest generating year | 2018-19 | constant | primary-verified |

The $500,000 is a **nominal** constant (T21): its real value erodes and more Persons fall inside it
each year of a 40-year projection. Flag it as legislated-fixed, not structural.

**The general cap is consumed before any carry-forward amount** (added 2026-09-04, previously
implied but never stated). "Application order: earliest year first" above is the **intra-window**
order — which *unused year* is drawn on first — and was being read as if it settled the prior
question of whether the window is touched at all. It does not. s 291-20(4) **increases** the
general cap by the unused amounts; it does not open a second pool alongside it. So a Person only
reaches into the window once the general cap for the year is spent.

This is **not cosmetic**. Window-first yields the same total cap in the year, but leaves the
general cap unspent while burning look-back years that are about to expire — so it silently
manufactures fresh headroom in later years. Consuming general-first is what `applyConcessional`
and `carryForwardHeadroom` both implement, and the two would disagree about a single contribution
history under the other reading.

**How the walk runs it — P3-4b slice 1 (2026-09-30).** `project()` computes each Person's total
concessional cap (general cap + carry-forward) once per financial year, reports it on every
`Month` as `concessionalCapByPerson`, and measures both concessional cap checks — the refusal in
the month a sacrifice is stated and the year-to-date note — against it. Division 293 is unchanged.

- **What is unused of each earlier year is a ledger the walk keeps.** A year is never *missing*
  from the window, so `MissingContributionHistoryError` is unreachable from the walk; a year the
  ledger holds nothing for is **fully used** (nil unused). That is the ruling for every year the
  forecast cannot see:
  - **Years before the plan** count as fully used unless `Person.statedUnusedConcessionalCap`
    states what is left of them — the unused amount myGov shows, per year. `parsePlan` accepts
    only the five years before the plan's first financial year, non-negative whole cents, and no
    more than that year's general cap where this build can state it (FY2026-27's published cap,
    or a later year's derived from the plan's wage rate); a year before FY2026-27 has no cap in
    this register and is taken as stated.
  - **The plan's first year, when the plan opens after 1 July,** also counts as fully used: its
    walked months are not the year, and treating them as the year would manufacture the unused cap
    of the months before the plan.
  - **A year the walk walked whole** adds its general cap less the Guarantee and sacrifice it put
    in, where that was less.
- **At each year's end** the part of the year's contributions above its general cap is taken out
  of the ledger **earliest year first**, including a year that expires with that one. A year whose
  Total Super Balance closed the window takes nothing from it: above its general cap was excess.
- **The Total Super Balance** is the sum of the Person's interests at the close of the prior
  30 June — after June's growth and contributions, **before** the July settlement credits (the
  low income super tax offset, a franking refund, the earnings tax) — and is re-measured every
  year. ~~In the plan's first year it is the balance the plan states, as at `asAtDate`: the forecast
  holds no earlier one. That is the one reading here that is not a 30 June figure, and it is
  recorded as such (TODO P3-4b).~~ **Ruled 2026-09-30 (P3-4b slice 2): in the plan's first year it
  is a 30 June figure too, or nothing.** A plan dated 1 July states that 30 June close, so its
  balance is read. A plan dated any other day reads `Person.statedTotalSuperBalanceAt30June` (the
  figure myGov shows; `parsePlan` refuses it on a 1 July plan), and without it the balance is **not
  known** — `totalSuperBalance: null` — and the first year's window is **closed**. The balance as at
  `asAtDate` is never read for this test: it is usually higher than the 30 June one, but not always.
- **`carryForwardHeadroom` agrees with the walk (slice 2).** Its over-cap loop searched only the
  current window, so a year inside it that had spent an amount since rolled out charged the spend
  to a younger year instead ($5,000 low on slice 1's fixture, and $7,500 low — $71,500 for $79,000 —
  on the P3-4 suite's FY2027-28 fixture, which had pinned the wrong figure). It now runs a ledger over
  every supplied year, each over-cap year drawing on the five years before IT, earliest first; the
  history may reach back before the window, must be unbroken, and a year before the earliest one
  supplied counts as fully used (a short history gives the lower figure). An optional
  `carryForwardClosed` on a year says its own $500,000 test failed, so its over-cap part spent
  nothing — the walk's rule.
- **A year with no general cap** (before FY2026-27) keeps the general-cap-only check it always had,
  reports `null`, and adds nothing to the ledger.

Every rule above errs toward **less** headroom: an over-refusal forecasts nothing, and an invented
headroom invites a deduction the Person is not entitled to.

#### 3.4.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document.** The row below is
§3.4's addition to that inventory. It was in `src/core/superCaps.ts` and named **nowhere in this
document** — the P3-26 quarantine, a finding and not an exemption. The **other** refusal
`carryForwardHeadroom` can raise is the Total Super Balance date guard it shares with §3.3; that
one is registered at **§3.8.1**.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingContributionHistoryError`** | `carryForwardHeadroom` is asked for a year and one or more financial years **inside the look-back window** has no contribution history entry at all — not a nil entry, none. The window is this section's own: the previous five years, clipped at the **earliest generating year, 2018-19**, so a year before 2018-19 is outside the window and its absence is not this refusal. **The ground is that absence is not zero, and the error runs one way.** s 291-20(4) *increases* the general cap by the unused amounts, so a missing year read as nil contributions generates a **full cap** of unused headroom: the arithmetic does not fail, it returns a headroom figure larger than the Person has, and headroom is a number a Person acts on by making a deductible contribution they turn out not to be entitled to. **The finding is that this section records no rule for an incomplete history.** §3.4 fixes the window, the intra-window order, the $500,000 test and the earliest generating year, and says nothing about a look-back year that is simply absent — so until this row the decision to refuse existed only in `src/core/superCaps.ts`. The refusal itself is sound, and on the same one-way reasoning §3.4 already uses when it says window-first consumption *silently manufactures fresh headroom in later years*; what was missing is that the specification never recorded it, which is the P3-26 finding running in the other direction | **BUILT** — `src/core/superCaps.ts` |

### 3.5 Superannuation Guarantee

| Name | Value | FY | Kind | Source | Confidence |
|---|---|---|---|---|---|
| SG charge percentage | **12%** | 2026-27 | config — flat, no forward schedule | SGAA 1992 s 17A(2); [ATO super guarantee](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee) | primary-verified |
| SG earnings base | **qualifying earnings** (replaced ordinary time earnings 1 Jul 2026) | 2026-27 | **constant** — structural | SGAA s 10A(1) | primary-verified |
| Salary sacrifice is itself qualifying earnings | yes — sacrificing no longer reduces the SG base | 2026-27 | constant | SGAA ss 10A(1)(h), 10A(4)(b) | primary-verified |
| SG payment frequency | each payday (Payday Super) | 2026-27 | constant | Act No. 57, 2025 | primary-verified |
| Maximum contributions base | **$270,830 per financial year, per employer** | 2026-27 | config (derived) | SGAA s 10A(5) | primary-verified |
| Maximum contributions base formula | `floor_to_10(concessional_cap × 100 ÷ charge_percentage)` | — | constant | SGAA s 10A(5) | primary-verified |

`32,500 × 100 ÷ 12 = 270,833.33 → $270,830` ✔ matches ATO Table 23. Pre-1 Jul 2026 it was
**$62,500 per quarter** — the construct itself changed (T18).

Holding SG at 12% for 40 years is an **assumption about future policy**, not a legislated fact.
There is no legislated increase past 12%.

#### 3.5.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below
are enforced from the moment they exist, statuses included. They are §3.5's additions to that
inventory. All three were in `src/core/superContributions.ts` before this table existed and were
named **nowhere in this document** — the P3-26 quarantine, which is a finding and not an exemption:
a refusal with no register row is a decision the specification does not record.

All three stay here. Each has **one throw site**, and each declines to apply a rule that is §3.5's
own — the 1 July 2026 boundary, the per-employer ceiling (T18), and the earnings base itself (T17)
— so unlike §5A.3.1's year guard none of them belongs to a neighbouring section. Two other refusals
are reachable from this module and are **not** registered here, because what they decline belongs
elsewhere: `maximumContributionsBaseFor` raises **`PublishedCapMismatchError`** on its own $270,830
cross-check (registered at **§3.1.1**, whose ground covers this fourth throw site by its own terms —
the published figure is a fixture for the machinery, not a second source of truth), and the
concessional cap call nested inside it raises **`MissingIndexNumberError`** for a year with no AWOTE
number (§3.2). A fifth guard has **no name at all**: `qualifyingEarnings` throws a bare
`RangeError` on a negative component, so it is outside R8's naming discipline and outside the reach
of the test that reads this table.

**They are not three refusals of the same kind, and the rows say so.** One enforces a commencement
date; one is an **input-shape guard** with a statutory reason for caring about the shape; one is a
**drift tripwire on this register's own records** that no input can reach.

| Refusal | Fires when | Status |
|---|---|---|
| **`SuperGuaranteeEarningsBaseError`** | a Superannuation Guarantee figure is asked for a financial year **earlier than FY2026-27**. One throw site, the first statement of `maximumContributionsBaseFor`; `superGuarantee` has **no year guard of its own** and inherits this one entirely from the ceiling call it makes second. **The ground is the commencement of SGAA s 10A(1) on 1 July 2026 plus the register's own emptiness before it** — the base was ordinary time earnings, the maximum contributions base was a *quarterly* $62,500 and the construct itself changed (T17, T18), so applying this section's rules backwards is T17 run in reverse and produces a plausible figure rather than a failure. **Finding 1 — the rule to refuse is nowhere in §3.5.** This section states that the base changed and that the construct changed; it does not state that the engine declines an earlier year rather than computing one, and neither T17 nor T18 says so. The decision lived only in `src/core/superContributions.ts` until this row. **Finding 2 — the boundary is a literal, not a record.** The year is a module constant, `QUALIFYING_EARNINGS_FROM = '2026-27'`; §3.5 carries 1 Jul 2026 only inside the parenthetical of the *SG earnings base* value cell, there is no row for the commencement date and no record for it under `src/data/assumptions/`, so `explainAssumption` has nothing to answer with when asked why FY2025-26 is refused. The module's header forbids a literal **dollar amount**, which by its letter licenses a literal date; the drift argument is the same one. **Finding 3 — despite its name this refusal never reads the earnings base.** It compares two financial years. The §7 constant *SG earnings base — qualifying earnings* **is** carried in code (`superannuation.superGuarantee.earningsBase`), but it is read by `EarningsBaseChangedError` below, not by this one. **Finding 4 — one limb of the stated ground is unsound, and it is recorded here rather than fixed.** The refusal message asserts that the register carries *"neither the ordinary time earnings definition nor a pre-2026 charge percentage nor the quarterly $62,500 maximum contributions base (§3.5)"*. The first two limbs hold — neither appears anywhere in this document or in `src/`. **The third does not:** §3.5 states *"Pre-1 Jul 2026 it was **$62,500 per quarter**"* three lines below its own table, and the data layer repeats it in `maximumContributionsBase.note`. The true and narrower claim is that the figure is **prose and a note, not a record** — no year stamp, no source of its own, nothing a computation can consume — which is enough to carry the refusal. The sentence in `src/` overstates it while citing the very section that contradicts it, and the comment above the test copies the overstatement verbatim | **BUILT** — `src/core/superContributions.ts` |
| **`DuplicateEmployerError`** | two `Employment` records in one call carry the **same `employer` string**. One throw site, inside `superGuarantee`'s per-employer loop, on the second appearance. **This is an input-shape guard, not a rule of law, and the row must not dress it as one.** SGAA s 10A(5) fixes the maximum contributions base per financial year per **employer** (T18); it says nothing about how a caller may describe an employer, and no statute is breached by naming one twice. What the Act supplies is why the shape matters: the ceiling is applied inside the loop and the total is a sum of the capped charges, so two records for one employer hand that employer **two ceilings**, and for a Person above $270,830 the overstatement is the second ceiling's worth of charge — the exact arithmetic T18 exists to prevent, arrived at through the input rather than through the rule. **Finding — §3.5 records no rule for it.** *Per financial year, per employer* is stated twice, in the table and in the period constant; what happens when one employer arrives twice is a decision that existed only in code. **A stated limitation:** identity is the **exact string**, with no trimming, no case folding and no ABN, so *Acme Pty Ltd* and *acme pty ltd* are two employers and take two ceilings each. The guard catches the duplicate a loop produces and not the one a typist produces, and the model carries no employer identity anywhere else to check either spelling against. Nil is not an error: an empty employment list returns a nil charge | **BUILT** — `src/core/superContributions.ts` |
| **`EarningsBaseChangedError`** | `SUPERANNUATION.superGuarantee.earningsBase` is no longer `'qualifying earnings'`, or `salarySacrificeIsQualifyingEarnings` is no longer `true`. **It is neither a rule of law nor a guard against a malformed caller — it is a drift tripwire on this register's own records**, and it is the only guard of its kind in `src/` (verified: no other module compares an assumption record's value against an expected literal). **The ground is sound and is about types rather than arithmetic:** `QualifyingEarnings` is a brand with no widening constructor and every component of it is **added**, so if the base stopped including the sacrificed amount the shape would be wrong while the arithmetic still ran and still returned a plausible number (T17). Refusing is the correct response to that, because the fix is a change of shape and not of figures. **Finding 1 — no input can reach it.** Both values are read off `SUPERANNUATION`, which is `deepFreeze`d at module load; the guard takes no argument, there is no Setting that overrides either record, and for any given build the condition is constant-false. It can fire only if someone edits `src/data/assumptions/super.ts` and rebuilds — a compile-and-run tripwire, not a refusal any user can meet. Same family as §3.1.1's site (2), except that there it is one of three throw sites and here it is the whole refusal. **Finding 2 — it has no test.** `test/core-super-contributions.test.mjs` imports the other two refusals in this table and not this one; outside the P3-26 quarantine list its name appears nowhere in `test/`. **One guard, two callers** — `qualifyingEarnings` and `superGuarantee` both call it, `superGuarantee` before it reaches the ceiling — **and zero tests on either.** **Finding 3 — §3.5 records no rule for it,** and neither does any other section: this document nowhere states that a module may pin the record values its types are built on, so both the tripwire and its ground exist only in code. **Finding 4 — the two records it reads are stamped in a way that contradicts the refusal above it.** Both are `kind: 'constant'` with `everyYear: true`, which asserts that qualifying earnings is the SG base in **every** year of the Planning Horizon — precisely what `SuperGuaranteeEarningsBaseError` refuses to act on for years before FY2026-27 — while §3.5's own rows stamp both **FY 2026-27**. The register year-stamps them, the data layer marks them every-year, and the guard that reads them takes no year at all. Recorded, not fixed | **BUILT** — `src/core/superContributions.ts` |

**What §3.5 does not record, beyond the three rules above.** Each row's *Finding — the rule is
nowhere in §3.5* is the P3-26 finding running in the other direction, and here it is unanimous:
**all three** refusals are decisions the specification does not carry. §3.5 is eight rows of figures
and two paragraphs of prose, and every one of the three questions the module actually has to answer
about them — what happens before the commencement date, what happens when one employer arrives
twice, what happens if the base itself moves — is answered only in `src/core/superContributions.ts`.
§9's superannuation mutation table carries two SG rows, *compute SG on post-salary-sacrifice salary*
(T17) and *treat the maximum contributions base as quarterly* (T18); **neither is one of these three
refusals**, so removing any of the three guards is a mutation §9 does not name. Unlike §5A, the data
layer is not the gap here: every §3.5 figure except the commencement date is stored, stamped and
sourced under `src/data/assumptions/super.ts`, and the §7 constant this section contributes is one
the code genuinely reads.

#### 3.5.2 Low income super tax offset (LISTO) — LR-3, 2026-09-30

Superannuation (Government Co-contribution for Low Income Earners) Act 2003 ss 6(1)(b), 12B, 12C(1),
12E(2), read on the ATO legal database (PAC/20030110) on **2026-09-30**. From the 2027-28 income
year, Act No. 8 of 2026 (C2026A00008) Sch 4 items 1–3 replace the $37,000 with *"the dollar amount
mentioned in item 1 of the table for that income year in Part I of Schedule 7 to the Income Tax
Rates Act 1986"* and the $500 with the new s 12E(3A) amount. That amending text was read as the CCH
note on the ATO legal database quotes it; the Act itself refused automated retrieval, so the two
rows it creates are `secondary-only` until someone reads Sch 4 directly.

| Name | Value | FY | Kind | Source | Confidence |
|---|---|---|---|---|---|
| Rate | **15%** of the year's concessional contributions | every year | constant | s 12E(2)(a) | primary-verified |
| Minimum | **$10** | every year | constant | s 12E(2)(c) | primary-verified |
| Share of total income from employment or business | **10% or more** (at least, so exactly 10% qualifies) | every year | constant | ss 12C(1)(c), 6(1)(b) | primary-verified |
| Adjusted taxable income threshold | **$37,000** — not exceeded, so exactly $37,000 qualifies | to 2026-27 | config (effective 1 Jul 2017) | s 12C(1)(b) | primary-verified |
| Maximum | **$500** | to 2026-27 | config (effective 1 Jul 2017) | s 12E(2)(b) | primary-verified |
| Threshold from 2027-28 | top of Sch 7 Pt I item 1 for the year — **$45,000** for 2027-28 | 2027-28 on | config (derived) | C2026A00008 Sch 4 item 1; ITRA 1986 Sch 7 Pt I | secondary-only |
| Maximum from 2027-28 | `threshold × SG charge % ÷ 100 × 15 ÷ 100` — **$810** for 2027-28 | 2027-28 on | config (derived) | C2026A00008 Sch 4 items 2–3 (s 12E(3A)); SGAA s 17A(2) | secondary-only |
| Not a contribution | a Government co-contribution in law (s 12B), so outside ITAA 1997 s 292-90's non-concessional contributions (s 292-90(2)(c)(i)), outside the concessional total and Division 293's low tax contributions, and not taxed as a contribution in the fund | every year | constant | s 12B; ITAA 1997 s 292-90(2)(c)(i) | primary-verified |

Neither FY2027-28 figure is stored: `lowIncomeSuperTaxOffsetThreshold` reads the year's own bracket
table and `lowIncomeSuperTaxOffsetMaximum` multiplies it by the SG charge percentage, so both move
if either does. The SG charge percentage is stamped FY2026-27, so every later year's figure carries
O4's caveat.

**How the walk applies it (`project()`, the July year-end settlement).** Complete financial years
only, like the income tax true-up. Concessional contributions are the year's Superannuation
Guarantee plus salary sacrificed (no deductible personal contribution exists in this model).
Adjusted taxable income (Family Assistance Act Sch 3, disregarding cll 3 and 3A) is taken as Rebate
Income on the settlement's own inputs, with a rental loss from `RENT_OUT_HOME` taken as nil, since
Sch 3 adds a net investment loss back; reportable fringe benefits, target foreign income and child
maintenance are nil in this model. The 10% test compares gross pay (salary plus the sacrifice)
with assessable income plus reportable employer contributions (s 8). Residency and no temporary
visa (s 6(1)(f)) are assumed and written on the line. The amount is credited in the July after the
year it is for (the O28 refund-timing precedent) into the account the Guarantee would go to. **If
every account is a pension or a started TTR by then, the offset is left out with a
`low income super tax offset not paid` note: an understatement, since the ATO would still pay it.**

### 3.6 Division 293 — ITAA 1997 Div 293

**Extended 2026-09-05** by `docs/research/p3-div293-income-base.md` (P3-5). That pass confirmed
**every row below verbatim**: §3.6 was **incomplete, not wrong**. What it lacked was the component
list behind "income for surcharge purposes", an explicit statement that the charge is a **taper**,
and the Imposition Act's number. All three are added below the table; no row was changed except the
Rate row's citation.

| Name | Value | Kind | Source | Confidence |
|---|---|---|---|---|
| Threshold | **$250,000** | **constant** — bare figure, **not** in the s 960-265 indexation table | ITAA 1997 s 293-20(1); [ATO Div 293](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax) | primary-verified |
| Rate | **15%** | **constant** | Super (Sustaining the Superannuation Contribution Concession) Imposition Act 2013 (**No. 87, 2013**) s 5 — *Act number added 2026-09-05. The row previously named the Act without a number, and **No. 82 of 2013 is a different Act** — the one that inserted Div 293 itself — so an unnumbered citation invites exactly the wrong reconstruction. §10 already carries the right title id, `C2013A00087`* | primary-verified |
| Income base | *income for surcharge purposes* (**disregarding reportable superannuation contributions**) **plus** *low tax contributions* | constant — structural | ITAA 1997 s 293-20 | primary-verified |
| Taxable contributions | the **lesser** of low tax contributions and the excess over $250,000 | constant | ITAA 1997 s 293-20(1) | primary-verified |
| Low tax contributions | low tax contributed amounts (s 293-30) **less** excess concessional contributions | constant | ITAA 1997 s 293-25 | primary-verified |
| Low tax contributions vs the codebase's concessional contributions | the s 291-25 and s 293-30 exclusion lists differ **in both directions**, so `concessional − excess` is a **near**-identity, not an identity | constant — structural | ITAA 1997 ss 291-25(2)(e), 293-30(4)(c) | **primary-verified** that the two lists differ; the **consequence is INFERRED from statutory structure, not stated in terms** — **unverified**, and carried as **O35** |

Not indexed — pure creep, confirmed against primary source. The Div 293 income base and the
personal income tax base must be tracked **separately** (T9).

#### It is a TAPER, not a cliff (T54)

The table row says "the **lesser** of", and that is the whole rule — but a reader skimming the row
can still implement a step, so it is written out:

```
sum                   = div293_income + low_tax_contributions   # s 293-20(1)(a) + (b)
excess                = max(0, sum − 250,000)                   # "exceeds": strictly
taxable_contributions = min(low_tax_contributions, excess)      # s 293-20(1) — THE TAPER
tax                   = 0.15 × taxable_contributions            # Imposition Act 2013 s 5
```

- At a sum of **$250,001** the tax is **15 cents**. There is no step anywhere.
- The shade-in band is **exactly as wide as the Person's own low tax contributions**. Only above
  `250,000 + low tax contributions` is the whole of them taxed.
- **The ATO's own worked example is the check.** Div 293 income $240,000, low tax contributions
  $15,000 → sum $255,000, excess $5,000, taxable contributions `min(15,000, 5,000)` = $5,000 →
  **$750**. A cliff charges 15% of $15,000 = **$2,250**: a **3× overstatement at the margin**, and
  wrong for every Person inside the band, not just at its edge.
- The 15% falls on the **taxable contributions** — the `min(...)` output — and never on the low tax
  contributions as a whole.
- **s 293-20(2)** ("you do not have taxable contributions if the low tax contributions are nil") is
  a redundancy guard, not a second rule: `min(0, excess)` is already nil. Do not write it as a
  branch, and do not read it as a threshold.

#### "Income for surcharge purposes" — the component list, ITAA 1997 s 995-1(1)

Four additive limbs, **two disregards inside limb (a)**, and a **subtractive fifth** amount. The
statute is closed on this — the ATO's plain-English list reproduces every limb *and every sign*, so
two independent routes agree. **Confidence: primary-verified** for every row's statutory text. The
**compute-vs-Setting column is an engineering judgement on top of that text**, not a legal finding.

| # | Limb | Component | Sign | compute or **Setting** | Why |
|---|---|---|---|---|---|
| 1 | (a) | **Taxable income** — ITAA 1997 s 4-15 | + | **compute** | already modelled |
| 2 | (a) | Disregard: the s 313-20 **assessable FHSS released amount** | **−** | **Setting**, nil by default | depends on an FHSS release request; `rebateIncome` already carries the same field |
| 3 | (a) | Disregard: **ITAA 1936 Sch 2F s 271-105(1)** — that subsection *reduces* assessable income where family trust distribution tax was paid, so disregarding it **adds the reduction back** | **+** | **Setting**, nil by default | requires family trust distribution tax to have been paid. Note the direction: this disregard **increases** the base |
| 4 | (b) | **Reportable fringe benefits total** — FBTAA s 135N, the sum across employers of the s 135P amounts | + | **Setting — the user must supply it** | it is **grossed up** by `1 ÷ (1 − 0.47)` by the *employer*, against a **31 March FBT year**, behind a **$2,000** entry test the tool cannot see. Nothing in a salary forecast produces it; the Person reads it off their income statement |
| 5 | (c) | **Reportable superannuation contributions** — see below. The limb **Div 293 disregards** | + | **partly compute, partly Setting** | the salary-sacrificed amount and the Subdiv 290-C deductions are modelled, and so is the excess concessional subtraction; the **above-SG employer remainder the Person can influence** is a Setting |
| 6 | (d) | **Total net investment loss** — two silos: net financial investment loss, net rental property loss | + | **Setting — the user must supply it (both)** | needs deductions attributable to financial investments (margin-loan interest, borrowing costs) and to rental property, each net of that silo's gross income. Not in the modelled world |
| 7 | — | **less** the **s 301-20(3) amount**, where the Person is entitled to the s 301-20(2) offset: the 0%-taxed slice of a superannuation lump sum taken between preservation age and 60, capped at the low rate cap (s 307-345) | **−** | **compute *if* lump sums are modelled**; otherwise a **Setting**, nil by default | the 15% slice above the low rate cap is **not** removed |

**Four of the seven are Settings the tool genuinely cannot derive** — the reportable fringe benefits
total, **each** of the two net-investment-loss silos, and the above-SG RESC remainder. **This seam
closes by asking the user, not by computing.** That is a **UI consequence**, not an implementation
note: the tool must put four fields in front of the Person and let them state a nil, because a
component that is nil by omission is a component that has quietly left the calculation. The three
remaining edge inputs (the FHSS disregard, the family-trust add-back, the s 301-20(3) subtraction)
are nil-by-default and nil **by choice** on the same reasoning.

**Limb (c) is *reportable superannuation contributions*, not "reportable *employer*"
contributions.** s 995-1(1):

> **reportable superannuation contributions** … means the **sum of** (a) the individual's
> \*reportable employer superannuation contributions; **and** (b) the individual's **deductions
> under Subdivision 290-C**; **reduced (but not below zero)** by the amount of any \*excess
> concessional contributions for the corresponding financial year.

- **RESC** — TAA 1953 Sch 1 s 16-182(1) — turns on the Person's **capacity to influence** the size
  of the contribution or the way it was made. **Salary sacrifice is a RESC; Superannuation
  Guarantee at the legislated rate is not**, because the employee cannot influence it.
- **Subdiv 290-C deductions** are the personal deductible contributions (s 290-150, with the
  s 290-170 notice) already modelled.
- **Why the scope of this limb matters more than any other:** s 293-20(1)(a) then **disregards limb
  (c) entirely**, so what counts as limb (c) decides **which of the Person's own contributions are
  double-counted** — once in the income base and again in the low tax contributions on the *same*
  side of the same sum. Getting it wrong pulls Persons over $250,000 who are not over it.

**The two net-investment-loss silos are each floored at zero, and are never netted against each
other.** s 995-1(1) writes "the amount (if any) by which … exceed" **twice**, once per paragraph,
and then sums the two. A financial-investment **profit** does **not** offset a rental **loss**.
Netting them understates the base.

#### The $250,000 is CONFIRMED FROZEN — and its freeze is WEAKER than the franking $5,000's

This is not "no indexation provision found". It is confirmed frozen on **three independent
primary grounds** (T21):

1. **No indexation language anywhere in Division 293.** All **30 sections** were fetched and swept
   for `indexation` / `indexed` / `index number` / `index factor`: **zero hits**. The $250,000
   appears in exactly five places (ss 293-1, 293-10, **293-20(1)**, 293-155(1), 293-200(1)), each
   as a bare literal.
2. **It is absent from the s 960-265 table, and that table is the gateway.** s 960-270(1): "**Some**
   provisions of this Act require amounts to be indexed." s 960-265 is the exhaustive list. The
   **concessional cap** (item 9), **CGT cap** (10), **general transfer balance cap** (10A), **both
   Div 296 thresholds** (10B, 10C) and the **low rate cap** (11) are listed by name. **Division 293
   is not, and the string "293" does not appear in ss 960-265, 960-270 or 960-275 at all.**
   Parliament added the Div 296 thresholds to that table in 2026 and still did not add Div 293.
3. **It has only ever moved by textual amendment.** $300,000 → $250,000 by the *Treasury Laws
   Amendment (Fair and Sustainable Superannuation) Act 2016* (**No 81 of 2016**) Sch 2 **items
   14–18** — one item per occurrence, rewriting all five strings at once, applying from 2017-18.

⚠️ **This freeze and the franking $5,000's (T48, §5A.5) must not be filed under one label.** They
are different **kinds** of frozen, and the difference is a real forecasting risk:

| | Div 293 **$250,000** | s 160APHT **$5,000** |
|---|---|---|
| Indexation provision | none | none |
| Is the containing provision live? | **YES** — s 293-20 is current, amendable law | **NO** — repealed 2006; imported by s 207-145(1)(a) as a frozen **30 June 2002** snapshot |
| Can Parliament index it without new machinery? | **YES** — one new item in the s 960-265 table | **NO** — structurally incapable; it would need a wholly new provision |
| Has it ever moved? | **YES** — No 81 of 2016 | once, at introduction |
| Model as | **frozen nominal constant, with a documented policy-change risk** | frozen, full stop |

**Both are held flat in every projected year** — the modelling instruction is identical, and T21
and T48 both stand. What differs is how surprised to be if it changes: the $250,000 needs one table
item, the $5,000 needs a new Act.

#### Carry-forward *increases* Div 293 exposure (T55)

Counter-intuitive, ATO-confirmed, and recorded here because a future reader will otherwise "fix" it
the wrong way. Low tax contributions are the low tax contributed amounts **less excess concessional
contributions** (s 293-25(b)), and the excess is measured against the cap **as increased** by
s 291-20(3)–(7). So a **bigger cap ⇒ a smaller excess ⇒ a smaller subtrahend ⇒ MORE surviving into
the low tax contributions** and charged the second 15%.

A Person contributing $60,000 against a $32,500 general cap plus $27,500 of carry-forward has
**$60,000** of low tax contributions and no excess. The same Person without the headroom has
$32,500 of low tax contributions and $27,500 of excess — and the excess **escapes Div 293
entirely**, being taxed instead at marginal rates under Div 291. ATO, in terms: *"if your
concessional contributions cap has increased due to the use of carried-forward amounts, **all**
contributions included in your higher cap amount are counted for Division 293 purposes."*

**Any UI that presents carry-forward as an unambiguous win is misleading a Person above the
threshold.**

#### The open reading — SIS Act s 99G(6) refunded amounts (O35, research U1)

**INFERRED FROM STATUTORY STRUCTURE, NOT STATED IN TERMS. Confidence: unverified.** Carry that
label wherever this appears; it is not `primary-verified` and it is not `secondary-only`, because no
source states it at all.

- **What *is* primary-verified:** ITAA 1997 **s 291-25(2)(e)** (inserted by No 127 of 2021 Sch 3
  item 71) excludes an amount mentioned in **SIS Act s 99G(6)**, refunded in accordance with that
  subsection, from **concessional contributions**; and **s 293-30(4) has no matching exception**.
  Both provisions were retrieved in full.
- **What is inferred:** that such an amount therefore **remains a low tax contributed amount while
  ceasing to be a concessional contribution** — so a figure derived as `concessional − excess`
  would **UNDERSTATE** low tax contributions, and so the tax, in a year one occurs.
- **Why it stays open: SIS Act s 99G was never retrieved**, and no ATO material or explanatory
  memorandum was found addressing whether the omission from s 293-30 is deliberate.
- The mismatch runs the **other** way too, and that one *is* primary-verified: an SGAA Part 8
  **amnesty** charge payment is excluded from the low tax contributed amounts by s 293-30(4)(c) and
  is **not** excluded by s 291-25. Historic (the amnesty closed 7 September 2020) and irrelevant
  forward, but it is why the identity is a **near**-identity in both directions.
- **How the codebase carries it:** the derived route (`concessional − excess`) consumes
  `superannuation.division293.lowTaxContributedAmountDivergence` and reports **unverified**; a
  caller who states the s 293-30 amount itself keeps **primary-verified**. The weakness lands on
  the numbers that depend on it rather than on every Div 293 figure the model produces.

**Also not retrieved (research U2), and refused rather than approximated:** Subdivisions **293-D**
(defined benefit interests), **293-E** (constitutionally protected State higher level office
holders) and **293-F** (Commonwealth justices) each modify low tax contributions (s 293-25 Notes 1
and 2). Subdiv **291-C** modifies the *concessional* contributions for the same interests by
different rules, so neither can be computed from the other.

#### 3.6.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below
are enforced from the moment they exist, statuses included. They are §3.6's additions to that
inventory. Both were in `src/` before this table existed — the first in `src/core/div293.ts`, the
second in `src/core/incomeBases.ts` — and named **nowhere in this document**: the P3-26 quarantine,
which is a finding and not an exemption, because a refusal with no register row is a decision the
specification does not record.

**The first stays here, and the placement is not the obvious one.** What it declines is the s 293-25
subtraction, which is this section's *"Low tax contributions"* row, and its ground is this section's
own closing paragraph — so it belongs to §3.6 rather than to §3.1, whose caps it never reads, or to
§3.4, whose window it never enters. That matters because the figure it refuses to build is consumed
by **both** of this module's constructors, including the one that starts from a
`ConcessionalAssessment` computed under §3.1 and §3.4.

**The second is here because §3.6 is the only section of this register that carries the list it
enforces — and the list is not §3.6's own.** The guard stands over the seven ITAA 1997 s 995-1(1)
limbs, and those are the **Medicare levy surcharge** base; the constructor it guards says so itself,
*"the Medicare levy surcharge base; **not** Division 293's"*. **The Medicare levy surcharge has no
section anywhere in this register** — §2.7 is the *levy's* low-income thresholds and family shade-in,
a different rule about a different thing — and no rate, no threshold and no function for the
surcharge exists under `src/`. The one home the limb list has in this document is §3.6's
*"Income for surcharge purposes" — the component list*, which carries it in order to build the
s 293-20(1)(a) base that leaves limb (c) out. So the guard sits under Division 293 not because
Division 293 owns the definition, but because Division 293 is the only consumer this project has of
a definition it **borrows**. Its two rows are not two refusals of the same kind: the first is a
**scope refusal** (above), the second an **input-shape guard** — §3.5.1's second kind — and it is
the one of the pair whose rule this section states in terms.

**A THIRD ROW JOINED THEM ON 2026-09-20 (P6-10 M3), and it is a scope refusal of the first kind.**
`Division293ReleaseInsufficientBalanceError` belongs to the Subdiv 293-B **release election** — O84
— which this build now performs at the year-end settlement: an electing Person's monthly cash
accruals are refunded in full and the year's assessed liability is debited to the one interest they
nominated. It sits in `src/core/division293Release.ts`, beside the resolver that reads the election,
and it fires where that interest cannot meet the liability. **The register carries it because the
law's answer to that case is genuinely not held here** — partial payment with the balance left
against the individual, and a second release authority served on a second fund, are both things
Subdiv 293-B and the TAA 1953 Sch 1 Div 131 machinery provide for, and neither rule is retrieved.
That is the distinction against M1's and M2's refusals, which are bare `RangeError`s under R8's
discipline because their right answer is known and stated in the message.

| Refusal | Fires when | Status |
|---|---|---|
| **`ModifiedLowTaxContributionsError`** | the `SuperannuationInterestFacts` handed to either low-tax-contributions constructor states **any** of the three modified interests — a **defined benefit interest** (Subdiv 293-D), a **constitutionally protected State higher level office** (Subdiv 293-E), or a **Commonwealth judicial office** (Subdiv 293-F). **This is a scope refusal** — §3.5.1's and §3.11.9's fourth kind, not a rule of law, not an input-shape guard and not a drift tripwire. Each of these interests is lawful and each fact is perfectly well formed; what is missing is a **rule to apply to it**. **The ground is sound and, unusually for this quarantine, it is already recorded here**: §3.6's closing paragraph states in terms that Subdivs 293-D, 293-E and 293-F were **not retrieved (research U2)** and that they are *"refused rather than approximated"*, and that no fallback exists because Subdiv **291-C** modifies the *concessional* contributions for the same interests by different rules, so neither is derivable from the other. **So this row is the P3-26 finding at its narrowest**: not a rule that lives only in `src/` (§3.4.1, §3.5.1), and not a message asserting a negative the register contradicts (**P3-29**) — the register asserts the same negative, in the same words, and simply never named the class that carries it out. **There are three throw sites and all three are reachable by input.** They sit in one module-private guard, `refuseModifiedInterests`, called from the single builder both public constructors go through, so neither the stated route (`lowTaxContributions`) nor the derived route (`lowTaxContributionsFromConcessional`) is a back door around the other; `test/core-div293.test.mjs` exercises each of the three flags against its own `subdivision` and the derived route against one of them. **What the three sites do not do is describe a Person with more than one such interest.** The guard tests them in a fixed order and the first true flag throws, so a defined benefit member who is also a Commonwealth judge is always refused on **293-D**, and the `subdivision` field — which the tests assert on — names one Subdivision where two apply. Nothing turns on it here, because any one of the three is disqualifying on its own, but the field reads as an identification and is really a first-match | **BUILT** — `src/core/div293.ts`, three throw sites. **A bound on all three worth stating: no other module under `src/` imports `div293.ts` at all**, so as shipped the only callers are `test/`. The refusal is reachable by input in the sense that matters — the interests are a required, caller-stated parameter of a public constructor, unlike §3.1.1's site (2), which no input can reach — but no engine path reaches it yet, and §9 lists no mutation for it |
| **`MissingSurchargeComponentError`** | any of the seven s 995-1(1) components handed to `surchargeIncome` **or** to `div293Income` is not a finite number — omitted, `undefined`, `null` or `NaN`. **One throw site, in the module-private `sumSurchargeComponents`, which is the single sum *both* public constructors go through**, so neither base can be built out of a short component list while the other is guarded, and the s 293-20(1)(a) disregard stays one argument at one call site rather than a subtraction each caller has to remember. **This is an input-shape guard, not a rule of law** (§3.5.1's distinction): nothing in s 995-1(1) tells a caller they must state a nil, and a Person with no reportable fringe benefits breaks no law by having none. What the statute supplies is why the shape matters. **The ground is sound and — unusually for this quarantine — this section already states it in terms.** §3.6's component list closes with *"the tool must put four fields in front of the Person and let them state a nil, because a component that is nil by omission is a component that has quietly left the calculation"*, and that sentence is this refusal's whole rule, written here before the class existed. §3.6 calls it a **UI consequence**; the refusal is that same consequence enforced one layer lower, and the register never says the engine does so. **Finding 1 — the type system cannot see this guard, by construction.** All seven fields are required `Cents` on `SurchargeIncomeComponents`, so within TypeScript it is unreachable; the cast that widens the looked-up field to *possibly undefined* exists because the components arrive from stored **Settings** and from JavaScript callers — exactly the population §3.6 says the tool must ask. Without it an omission propagates as `NaN` through the additions and surfaces three frames away as *"not a whole number of cents: NaN"*, naming neither the limb nor the function. **Finding 2 — it guards a shape, and the shape is only half of what §3.6 asks for.** It catches an **absent** limb; it cannot catch a **wrong** one, and the four components §3.6 says the tool genuinely cannot derive are precisely the four nothing here can check. A Person who states nil reportable fringe benefits because nobody asked them is indistinguishable, at this guard, from one who has none. **Finding 3 — the two checks beside it have no names.** The very next statement raises a **bare `RangeError`** on a negative component, and the below-nil check on the total at the end of the same function raises another, so two of this function's three guards sit outside R8's naming discipline and outside the reach of the test that reads this table — the same gap §3.5.1 records for `qualifyingEarnings`. **Finding 4 — nothing under `src/` calls either constructor.** Neither `surchargeIncome` nor `div293Income` is invoked anywhere in `src/`; both are reached only from `test/`. The surcharge constructor has no consumer at all because the surcharge is not modelled, and the Division 293 constructor's only possible consumer is `div293.ts`, which the row above already records as imported by no other module. So this refusal is reachable **by input** — the components are a required parameter of a public constructor — and by **no engine path as shipped** | **BUILT** — `src/core/incomeBases.ts`. One throw site, reached through both constructors; `test/core-income-tax.test.mjs` exercises it on each |
| **`Division293ReleaseInsufficientBalanceError`** | a Person elected under ITAA 1997 Subdiv 293-B to have the Division 293 liability released from a nominated superannuation interest, and at the moment the release authority is served that interest holds LESS than the year's assessed liability. **One throw site**, `refuseReleaseAboveBalance` in `src/core/division293Release.ts`, called from `projection.ts` at the end of the tick the year-end settlement lands in — **after** that month's investment growth and after that month's two contribution credits, so the balance tested is every cent the interest really holds when the authority is served. **This is a scope refusal** — §3.5.1's and §3.11.9's fourth kind, not a rule of law and not an input-shape guard. The election is lawful and well formed; what is missing is a **rule for the shortfall**. The release in this build is **all-or-nothing out of the ONE nominated interest**, and the two alternatives are refused rather than invented: paying what the interest holds and leaving the rest against the individual (a rule this model has no path for, and one that would leave a real liability unpaid by anybody, so the Household keeps cash it owes), and serving a second authority on a second fund (which would require this build to choose which of their funds is raided next — the very choice §O84's resolver refuses to make when two interests are marked). **Both alternatives flatter**, which is why this is a stop and not a warning. **It cannot fire for a Person who made no election**: the resolver reports `{ election: 'none' }` from silence and never derives an interest from it, so the whole release path — refund, `wealth` outflow and debit alike — is unreachable without a mark in the plan | **BUILT** — `src/core/division293Release.ts`, one throw site |

### 3.7 Division 296

**Application year 2026-27** (T12). Schedule 1 of the Treasury Laws Amendment (Building a Stronger
and Fairer Super System) Act 2026 (`C2026A00008`) **commenced 1 April 2026**; the first income year
it applies to is 2026-27 (Income Tax (Transitional Provisions) Act 1997 s 296-1(1)). **Store the
application year.**

| Name | Value | FY | Kind | Source | Confidence |
|---|---|---|---|---|---|
| Large super balance threshold (LSBT) | $3,000,000 | 2026-27 | config — CPI, $150,000 steps, base quarter Dec 2025 | C2026A00008 Sch 1; ITAA 1997 s 296-30 | primary-verified |
| Very large super balance threshold (VLSBT) | $10,000,000 | 2026-27 | config — CPI, $500,000 steps, base quarter Dec 2025 | ITAA 1997 s 296-35 | primary-verified |
| Base rate | **15%** of taxable superannuation earnings | — | **constant** | Superannuation (BSFSS) Imposition Act 2026 s 5 | primary-verified |
| Additional rate | **+10%** of the very large super balance earnings component | — | **constant** | as above | primary-verified |
| Basis of "earnings" | **realised** — from the fund's taxable income. **Unrealised gains are NOT included as enacted.** | — | constant — structural | ITAA 1997 s 296-60(1) | primary-verified |
| Total Super Balance after death | taken to be **nil** | — | constant | ITAA 1997 s 296-50 | primary-verified |
| Exclusions | child recipient of a superannuation income stream at any time in the year; structured settlement contribution ever made | — | constant | ITAA 1997 ss 296-20, 296-25 | primary-verified |

**Indexation — one computable year, and the reason is the base quarter (added 2026-09-09).** Both
thresholds index under s 960-285 from the **December 2025** quarter (s 960-265 items 10B and 10C),
and December 2025 is the **most recent December quarter the ABS has published** (§3.2). The base
quarter is therefore also the newest number in the series: FY2026-27's factor is `100.32 / 100.32`
— exactly 1, on either reference base, so the published year owes **O41** nothing — and there is no
later December quarter in existence to index *to*. `src/core/div296.ts` takes a `CpiSeries` all the
same, on the same shape as `generalTransferBalanceCap` and for the same O41 reason, so FY2027-28
becomes computable the day the ABS publishes December 2026. Supplied nothing, it refuses that year
with `MissingIndexNumberError` — a missing **quarter**, which is what is actually missing; a series
that cannot furnish December 2025 gets `UnsourcedIndexBaseError`, which is a caller error and a
different failure. Nothing about this is a gap in the register: contrast the general Transfer
Balance Cap, which indexes from December **2016** and therefore has nine computable years.

> **This is why the FY2026-27 fixtures cannot check the arithmetic on their own.** $3,000,000 is
> the right answer for the only year published data reaches, so a hard-coded $3,000,000 passes
> every test that can be written from published numbers. `test/core-div296.test.mjs` drives a
> second and third year from a **synthetic**, clearly-labelled series (unverified, "synthetic test
> driver — not published", on a reference base that names itself as not an ABS series) under the
> 2026-09-04 ruling. It exercises machinery and asserts nothing about the world. **No synthetic
> index number may appear under `src/`.**

**The calculation (T15) — two proportions of the same base, not marginal bands:**

```
TSB_ref = max(TSB just before start of year, TSB at end of year)     # s 296-40(2)
# 2026-27 ONLY: transitional s 296-1(2) strikes out the opening limb.
# Use the 30 June 2027 balance alone. From 2027-28, max(opening, closing).

if TSB_ref > LSBT and total_super_earnings > 0:
    pct_LSBT  = round_2dp_up((TSB_ref - LSBT) / TSB_ref * 100)        # s 296-40(3)
    taxable_super_earnings = pct_LSBT / 100 * total_super_earnings

if TSB_ref > VLSBT:
    pct_VLSBT = round_2dp_up((TSB_ref - VLSBT) / TSB_ref * 100)       # s 296-45(3)
    vlsbt_component = pct_VLSBT / 100 * total_super_earnings

tax = 0.15 * taxable_super_earnings + 0.10 * vlsbt_component          # Imposition Act s 5
```

Percentages round to 2 dp, rounding **up** if the third decimal is ≥ 5. The VLSBT component is an
**additional** slice on the same earnings.

**Fund earnings definition (s 296-60(1)):** relevant taxable income or loss − assessable
contributions + net exempt current pension income − non-arm's-length component + pooled
superannuation trust component. Attribution to a Person is "on a fair and reasonable basis, having
regard to the matters prescribed by the regulations" (s 296-65(3)), with a separate prescribed
method for small superannuation funds (s 296-65(5)).

**Transitional CGT phase-in** — Income Tax (Transitional Provisions) Act 1997 s 296-60(2), factors
prescribed by `F2026L00726` reg 296-60.01, registered 18 Jun 2026. **Does not apply to a small
superannuation fund** (s 296-60(3)); SMSFs get a cost-base reset at 30 Jun 2026 instead.

| Income year | Net-capital-gain factor | Kind | Confidence |
|---|---|---|---|
| 2026-27 | 0.2 | config | primary-verified |
| 2027-28 | 0.4 | config | primary-verified |
| 2028-29 | 0.6 | config | primary-verified |
| 2029-30 | 0.8 | config | primary-verified |
| 2030-31 onwards | no discount (spent) | config | primary-verified |

#### 3.7.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
reads it.** The rows below are §3.7's additions to that inventory, recorded here because they are
Division 296 refusals rather than transfer-balance or ECPI ones. All five were in
`src/core/div296.ts` before this table existed and were named **nowhere in this document** — the
P3-26 quarantine, which is a finding and not an exemption: a refusal with no register row is a
decision the specification does not record, the mirror of a rule consumed by nothing.

**What this table does not yet do, and it is the same bug again.** That test reads the **Status**
column of §3.10.8 and §3.11.9 only. It does not read this one, so the five `BUILT` claims below are
checked by nobody and a row that lied would keep passing; the *names* are enforced, because the
test's other direction scans this whole document for the identifiers, but the statuses are not.
That is **R11**'s finding recurring, and it closes by adding `#### 3.7.1` to the list of tables
`test/refusal-names.test.mjs` parses. Out of scope for the brief that wrote this table — recorded
so it is not rediscovered as a surprise.

| Refusal | Fires when | Status |
|---|---|---|
| **`Div296NotApplicableError`** | any Division 296 figure is asked for a year **before FY2026-27** — the two thresholds, the Total Super Balance reference, the Person's stated earnings, or the fund's earnings. One guard, four call sites, so the year is refused wherever the division is entered. **The ground is T12 and it is this section's opening paragraph:** ITTPA 1997 s 296-1(1) makes 2026-27 the first income year, and Sch 1 of `C2026A00008` commenced **1 Apr 2026** — a commencement date is not an application year, and computing from it produces a liability three months early, which is a wrong number rather than a visible failure. Note what it does **not** guard: it tests the year alone, and a FY2025-26 reference balance is refused a second time, on its own ground, by the §3.8 Total Super Balance definition refusal — which is still in the P3-26 quarantine and gets its row from a later brief, so it is deliberately not named here | **BUILT** — `src/core/div296.ts` |
| **`Div296BalanceDateError`** | a balance handed to the Total Super Balance reference carries the wrong measurement date — the opening one not measured just before the start of the year, or the closing one not at its end. The ground is that s 296-40(2)'s two balances are **a year apart**, so the right number from the wrong 30 June cannot be told from a correct one by its result; the date stamp is the only defence there is. **Finding, not fixed:** the message gives its ground as "s 296-40(2) reads one balance just before the start of the year", and in **FY2026-27** it does not. Transitional s 296-1(2) strikes the opening limb out (T16) and `div296TotalSuperBalanceReference` discards the opening value entirely — yet the opening **date** is still enforced in that year, which is the only year published data can compute at all. Enforcing it may well be right (a caller who mis-stamps one balance has plausibly swapped the two), but that is a **different ground** from the one the message states | **BUILT** — `src/core/div296.ts`. **The stated ground is contradicted by T16 for the application year; a later brief corrects the message, not the check** |
| **`TotalSuperBalanceAfterDeathError`** | a Person died during the year, the year is **after FY2026-27**, and their opening balance was **not nil**. s 296-50 takes the Total Super Balance after death to be nil; from FY2027-28 s 296-40(2) also reads the balance just before the start of the year, which is a balance **before** death. On one reading the opening limb survives and the reference is that balance; on the other the Person has no Total Super Balance at all and the reference is nil. The two readings give different tax, **this section does not say which**, and the engine refuses rather than choosing. **The two cases where it does not fire are as load-bearing as the one where it does:** FY2026-27, where the opening limb is struck out so a nil closing balance is nil under either reading, and a nil opening balance, where the readings agree. **Confidence: this is an argument from THIS SECTION's silence, not a reading of s 296-50** — it must not be recorded as `primary-verified` (**R6**), and it closes by §3.7 stating which limb survives death, not by the code picking one | **BUILT** — `src/core/div296.ts` |
| **`Div296AttributionBasisError`** | `superannuationEarningsFromWholeFund` is given a fund the Person does **not** wholly hold — that is, any attribution needing an apportionment. **The ground the message states is unsound, and this row does not adopt it.** The message says *"neither set of regulations was retrieved (§3.7)"*, and (a) **this section makes no retrieval claim at all** — it quotes s 296-65(3) and s 296-65(5) and stops; (b) **O17 records the opposite** for the s 296-65(5) limb: `F2026L00726` **was** retrieved and contains regs **296-65.01, 296-70.01 (prescribed factor 0.825) and 296-70.02**, "not read in full" (`docs/research/p1-super-caps.md` §8 item 2). It is the same instrument this section cites at `primary-verified` for the CGT phase-in factors below; (c) for the s 296-65(3) limb no document says either way, so "was not retrieved" is asserted of a thing nothing records. *Retrieved but unread* and *never retrieved* are **different arguments from absence** and the register's is the weaker; **R6** forbids a row recording the stronger one. **The refusal itself stands on the narrower ground the message also gives** — a share of the fund apportioned on a basis this model invented would be a number with no source, and a regulation nobody has read cannot be implemented — and that ground survives O17 untouched | **BUILT** — `src/core/div296.ts`. **The non-retrieval sentence is false against O17 and is not corrected here** (`src/` is out of scope for the brief that wrote this row): the refusal stays, the sentence does not |
| **`Div296NegativeEarningsError`** | total superannuation earnings are **negative** *and* the Total Super Balance reference is **above the very large balance threshold** — and only then. The ground is a guard asymmetry visible in this section's own pseudocode above: the s 296-40 limb is guarded with `total_super_earnings > 0` and the s 296-45 limb is not, so above the VLSBT one reading gives nil taxable superannuation earnings and the other takes a proportion of a negative figure and charges 10% of it. **Below** the VLSBT the two readings agree on nil and the engine computes nil rather than refusing, which is why this is not a "negative earnings are invalid" check. **The ordering is part of the refusal:** a Person excluded by s 296-20 or s 296-25 returns nil *before* this test, so it cannot fire against someone with no liability at all. It closes by §3.7 saying whether the s 296-45 limb carries the same guard — not by the code choosing a reading | **BUILT** — `src/core/div296.ts` |

**What `Div296AttributionBasisError` makes unreachable, and it is recorded nowhere else in this
register.** The only attribution route `src/core/div296.ts` offers is the identity one, and that
route's own premise — stated in the code, not here — is that a fund whose only member's interest is
this Person's **is a small superannuation fund**, which s 296-60(3) excludes from the transitional
CGT phase-in tabulated above. So the 0.2 / 0.4 / 0.6 / 0.8 factors are computed and reported **at
the fund**, and no Person's Division 296 assessment in this model can currently reach them. Until
now that conclusion lived in `src/core/div296.ts`'s header comment and in `TODO.md`'s P3-5a entry
and **not in this specification**, which is the same failure as an unregistered refusal running the
other way. Three things about it are load-bearing:

- the premise *a single-member fund is a small superannuation fund* is a **SIS Act definitional
  claim this register carries no row for** — it is `unverified` here and must not be repeated as
  though §3.7 established it;
- the identity route is deliberately **not** refused even though it runs through the same unread
  s 296-65(3); it carries **`unverified`** on the resulting figure instead, and that label is the
  whole of the weakness. **Do not narrow it** (R6), and do not add a blanket caveat to every
  Division 296 number in its place;
- none of this closes **O17**. Reading `F2026L00726` Schedule 1 in full is what closes O17, and it
  is also what would tell us whether the identity attribution needs the s 296-65(5) method rather
  than no method at all.

### 3.8 Total Super Balance definition — changed 1 July 2026

Schedule 2 of `C2026A00008` inserts ITAA 1997 **s 307-230A** *total superannuation balance value*.
The default (s 307-230A(1)(b)) is the total superannuation benefits that **would become payable if
the Person voluntarily caused the interest to cease** — a withdrawal-benefit test, replacing the
repealed *accumulation phase value* construct. Applies from just before 1 July 2026.

For ordinary Accumulation Phase accounts and Account-Based Pensions this is the account balance and
the model needs no change — but the definition now feeds the bring-forward test, the carry-forward
test **and** Division 296. Confidence: **primary-verified**.

#### 3.8.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document.** The two rows below
are §3.8's additions to that inventory. Both were in `src/core/superCaps.ts` and named **nowhere in
this document** — the P3-26 quarantine, a finding and not an exemption.

They are recorded here rather than under §3.3 or §3.4 on a deliberate reading of what they refuse.
Neither declines to apply the bring-forward or the carry-forward rule: both decline to build or to
accept the **balance** those rules read, and §3.8 is where that balance is defined. The date one in
particular is raised from a **single guard with two callers**, so a row under each of §3.3 and §3.4
would be one refusal registered twice — the duplication R8 exists to stop.

| Refusal | Fires when | Status |
|---|---|---|
| **`TotalSuperBalanceDefinitionError`** | `totalSuperBalance` — the one constructor — is asked to build a balance measured **before 30 June 2026**. **The ground is this register's scope rather than the statute:** s 307-230A applies from just before 1 July 2026, and the *accumulation phase value* construct it replaced is repealed and **is not carried in this document**. An earlier balance is therefore a different quantity under a definition nothing here holds, and computing with it would mix two definitions with nothing in the result to show which one was used. That is an argument from this register's own contents and not an argument from absence about the world (**R6**) — the accumulation-phase-value row is missing because it was never written, which is checkable right here. Two details are load-bearing: the cut-off **is derived, not written down**, from the definition record's `effective: '2026-07-01'` through the same *just before the start of the year* phrase §3.8 uses for both tests, so a hand-written 30 June cannot drift one day away from the record; and a definition record whose effective date is **not** the start of a financial year fails at **module load** with an unnamed `RangeError`, because that is the one shape the derivation would silently get wrong, pulling a mid-year date back to the previous 30 June | **BUILT** — `src/core/superCaps.ts` |
| **`TotalSuperBalanceDateError`** | a Total Super Balance is handed to a year's test carrying a measurement date that is not the 30 June **immediately before** that year. One guard, two callers, and it refuses two different rules: §3.3's s 292-85(3)(e) cap space and §3.4's s 291-20(3) eligibility test. **The ground is that the wrong year's balance is a plausible number, not an invalid one.** Both tests read that one date and no other — §3.4 carries it as an explicit *Test date* row, §3.3's pseudocode says *immediately before the start of the first year* — the two balances are a year apart, and nothing in either result would show which year's balance produced it, so the date stamp is the only discriminant there is. Note the case it does **not** cover: a balance correctly dated but built on the repealed definition is caught by the row above, not by this one, and the two checks sit in different functions precisely because one is about constructing the quantity and the other about consuming it | **BUILT** — `src/core/superCaps.ts` |

**What the two of them make uncomputable together, and this register records it nowhere else.** The
earliest balance `totalSuperBalance` will build is 30 June 2026, and 30 June 2026 is exactly the
date FY2026-27's two tests require. For FY2025-26 the required date is 30 June 2025, which the
definition refusal will not build; for FY2026-27 it is 30 June 2026, which is the earliest it will.
So **FY2026-27 is the first financial year the bring-forward cap space (§3.3) and the carry-forward
headroom (§3.4) can be computed at all**, and no combination of Settings reaches an earlier one.
Three things about that are worth keeping:

- it follows from these two refusals together with s 307-230A's start date. This section states the
  start date and not the consequence, so — exactly as with §3.7.1's CGT phase-in — the conclusion
  lived in the code and not in the specification;
- it is **not** in tension with §3.4's *earliest generating year, 2018-19*. The look-back years
  supply contribution history, not balances, and no Total Super Balance is built for any of them;
- it means §3.3 and §3.4 are currently exercised in **one** financial year only, so a defect in
  either that is wrong in a later year has a single published year in which to be caught. That is
  the same narrow exposure the non-concessional cross-check at §3.1.1 has, arrived at by a
  different route.

### 3.9 Access — structural constants, the Schedule 7 minimum drawdown, and the TTR range

**Corrected 2026-09-09** by `docs/research/p3-minimum-drawdown-and-ttr.md` (P3-10, and the part-year
limb of P3-8), read off the *Superannuation Industry (Supervision) Regulations 1994* — `F1996B00580`,
**Compilation No. 159**, compilation date **1 July 2026** — by two independent primary routes, and
against ATO guidance for the two points the instrument does not state. **That pass closed O36.**

**Corrected again 2026-09-09**, in four places, by `docs/research/p3-transfer-balance-cap.md` (P3-9):
the Access table's **Condition of Release** row now carries the SISR Schedule 1 item numbers (C3); the
**"TTR maximum — when it falls away"** row no longer says the stream becomes an ordinary
retirement-phase pension (C1); the **"Exceeding the maximum"** row's citation was wrong and its
confidence is now **split** (C2); and a pointer to **§3.10** closes the section (C4).

**The columns grew.** §3.9 previously carried four — name, value, kind, confidence — and no source and
no retrieval date, which is how a row could say "rounded to $10" without anyone being able to check
which direction, and "on the 1 July balance" without anyone being able to check the clause. Every
figure below carries a name, a value, an FY stamp, config-vs-constant, a source and a confidence, as
every other section does.

**Superseded text, kept as the evidence record.** Two rows read, until 2026-09-09:

> | Minimum drawdown factors | <65 4% · 65–74 5% · 75–79 6% · 80–84 7% · 85–89 9% · 90–94 11% · 95+ 14%; **on the 1 July balance, rounded to $10, pro-rated for part-years**, nil if commenced on or after 1 June | config | primary-verified |
> | TTR minimum drawdown | 4% (under 65) | constant | primary-verified |

**Every factor, every band boundary and the 1 June rule were confirmed exactly.** What was wrong or
missing was everything around them, in seven places: (i) "on the 1 July balance" is **wrong in a
commencement year**; (ii) "rounded to $10" did not say the **direction**; (iii) nothing said the
**order** of rounding against pro-rating; (iv) "pro-rated" did not say **days**; (v) two clauses were
not carried at all — the cl 1(2)(b) withdrawal-benefit substitution, and that the factor age is the
age on the **commencement day** in a commencement year; (vi) the cl 4A/4B relief was absent, and it
is the only FY-keyed thing here; (vii) the TTR rows were cited to nothing, understated the minimum,
and read as though the maximum were the minimum's mirror image. **It is not** — see the asymmetry
table below, which is trap **T57**.

#### Access

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Preservation Age | **60** for everyone | — | **constant** | ITAA 1997 · SIS Regulations (P0 pass) | 2026-09-03 | primary-verified |
| Condition of Release | a **boolean per Person, independent of age** — ceasing gainful employment after 60, or turning 65 — **and, from 2026-09-09, the Schedule 1 ITEM as well as the boolean.** ITAA 1997 s 307-80(3)(b) turns on **which item** was satisfied, not on `met`, so the item identity is load-bearing for phase (§3.10) and is no longer merely a citation | — | **constant** — structural | **SISR Schedule 1, Part 1 (Regulated superannuation funds)**, retrieved at `REG/19940057/Sch1`, columns 1–3 verbatim: **101 Retirement — Nil**; **102 Death — Nil**; **102A Terminal medical condition — Nil**; **103 Permanent incapacity — Nil**; **106 Attaining age 65 — Nil** · ITAA 1997 · SIS Regulations (P0 pass) | 2026-09-09 | **SPLIT.** The item numbers and their column-3 'Nil' cashing restrictions are **primary-verified**; §3.9's "turning 65" is **item 106**, primary-verified. **The mapping of "ceasing gainful employment after 60" onto item 101 (Retirement) is primary-verified from 2026-09-29 (LR-2; O59 / U28 closed)**: under SISR reg 6.01(7)(b)(i) an arrangement of gainful employment ending on or after the 60th birthday is a retirement with no further condition. Only that limb is mapped; reg 6.01(7)(a) and (b)(ii) turn on the trustee being satisfied of an intention never to work again, which the model does not hold. `ConditionOfReleaseItemNotIdentifiedError` was deleted with the mapping |
| Benefits from a taxed source at 60+ | tax-free, no PAYG | — | constant | ITAA 1997 · SIS Regulations (P0 pass) | 2026-09-03 | primary-verified |

#### The account-based pension minimum — SISR reg 1.06(9A)(a) and Schedule 7

Sources below are the SIS Regulations 1994 at `F1996B00580` Compilation No. 159 (compilation date
1 July 2026), cross-read in the ATO Legal Database at `REG/19940057`; retrieval date **2026-09-08**
on every row. The ATO guidance page named on two rows is *Income stream (pension) rules and
payments*, last updated 29 April 2026.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| The formula | `account balance × percentage factor` — **a bare product, no divisor**; the ÷100 is carried by the word *percentage* and by the table's column heading | — | **constant** — structural | [SISR Sch 7 cl 1(1)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1) | 2026-09-08 | primary-verified — read out of the compilation's own embedded drawing records **and** again as text in the Legal Database |
| The standard it satisfies | the **total** of the year's payments must be **at least** the cl 1 amount, and payment must be made **at least annually**. A floor on the annual total, **not a payment schedule** | — | **constant** — structural | [SISR reg 1.06(9A)(a)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2F1.06%289A%29) | 2026-09-08 | primary-verified |
| Percentage factors | <65 **4** · 65–74 **5** · 75–79 **6** · 80–84 **7** · 85–89 **9** · 90–94 **11** · 95+ **14**. Bands inclusive at both ends; no gaps, no overlaps | — | **constant** — hard numbers in the instrument's own table, **never indexed** | [SISR Sch 7, Table](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-5) | 2026-09-08 | primary-verified |
| **Which balance** | the balance on **1 July** of the year the payment is made — **except in the year the pension commences, where it is the balance on the COMMENCEMENT DAY**, and the **full annual factor is applied to it directly**. There is no annualisation of the balance; all the part-year adjustment lives in cl 3 | — | **constant** — structural | [SISR Sch 7 cl 1(2)(a)(i)–(ii)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1) | 2026-09-08 | primary-verified |
| **Which balance, when the forecast opens AFTER 1 July** | the rule is unchanged and the **input is missing**: cl 1(2)(a)(i) still names the **1 July** balance, and a plan stated as at any later day does not hold it. **There is no provision that makes the minimum nil for such a year** — Schedule 7's only nil is **cl 4**, which turns on the **commencement day**, and cl 3 pro-rates only *"the year in which the commencement day … occurs"*. So a pension already running owes its **full annual** minimum whatever month the plan was written in. `project()` determines that year in the walk's **first month** on the balance the plan states, declared through `pensionAccountBalanceObservedLater` and reported as a `PensionMinimumBasisNote`; the **age** and the **band** are still taken at 1 July. **Direction: unsigned; magnitude bounded** by the factor times the account's movement over those weeks. **Superseded 2026-09-21 (P10-5):** until then the engine determined no minimum at all for such a year, which under-stated a retired household by the whole of it and was recorded as merely *"the safe direction"* | — | **derived** — the clause is primary-verified; the substituted input is a modelling necessity, not a rule | [SISR Sch 7 cl 1(2)(a)(i)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1) · [cl 3](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-3) · [cl 4](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4) | 2026-09-21 | **primary-verified as to the law; the stand-in balance is an ASSUMPTION and is labelled on every month it touches** |
| Withdrawal-benefit substitution | where the account balance is **less than the withdrawal benefit** the beneficiary would get on a full commutation, the **withdrawal benefit is substituted**. Ordinarily the same number, and inert; it bites on an exit fee, a surrender value or an unallocated reserve | — | **constant** — structural | [SISR Sch 7 cl 1(2)(b)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1) | 2026-09-08 | primary-verified |
| **Which age selects the factor** | age at **1 July** — **except in the commencement year, where it is the age on the COMMENCEMENT DAY**. A Person turning 65 in September who commences in October takes **5%**, not the 4% their 1 July age gives | — | **constant** — structural | [SISR Sch 7 cl 1(2)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1), *percentage factor* | 2026-09-08 | primary-verified |
| Part-year pro-rating — the **numerator** | **DAYS**, and **the commencement day itself counts**: *"the number of days in the financial year that **include and follow** the commencement day"*. **The word "month" appears nowhere in Schedule 7.** Applies only where the commencement day is a day other than 1 July | — | **constant** — structural | [SISR Sch 7 cl 3](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-3) | 2026-09-08 | primary-verified |
| Part-year pro-rating — the **denominator** | the number of days in the financial year — **365, or 366 where it contains 29 February**. **The instrument does not state it**; cl 3 gives the numerator only. FY2026-27 has 365 days | — | **constant** (from the calendar) | SISR Sch 7 cl 3 states no denominator · ATO, *Income stream (pension) rules and payments* (29 Apr 2026): *"divide by 365 (or 366 in a leap year)"* | 2026-09-08 | **secondary-only** — the only coherent reading, and ATO states it, but **it is not in the instrument**. O37 |
| **Rounding — the direction** | **nearest $10, ties UP**, verbatim: *"rounded to the **nearest** 10 whole dollars. If the amount ends in an **exact 5 dollars**, it is to be **rounded up** to the next 10 whole dollars."* **Not a ceiling and not a floor.** `$987,654.32 × 5%` → **$49,380**; a ceiling gives $49,390 and is wrong | — | **constant** — `$10` step, half-up | [SISR Sch 7 cl 5](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-5) | 2026-09-08 | primary-verified |
| **Rounding — the order** | **pro-rate first; round ONCE, LAST.** cl 1(1) is *"Subject to clauses 3, 4, 4A and 4B"*, so cl 3 and the relief multiplier are **inside** the cl 1 determination; cl 5 then rounds *"an amount determined under **this Schedule**"* — the Schedule's output, not an intermediate. `$1,009,078` at 4% commencing 1 Aug 2026 → **$36,940**; rounding the annual figure first gives $36,930 | — | **constant** — structural | SISR Sch 7 cll 1(1), 3, 5 | 2026-09-08 | **primary-verified as to the text; the ordering is a reading of that text** — corroborated to the dollar by the ATO's own worked example (below) |
| Nil for a late commencement | **NIL — no payment is required for that financial year** — where the commencement day is **on or after 1 June**. **Operative, not permissive**: cl 1(1) is expressly subject to it and the fund's rules need say nothing (contrast reg 1.06(9) for a market-linked pension, where the same rule is only permissive). **A 1 June commencement is itself nil** | — | **constant** — `1 June` | [SISR Sch 7 cl 4](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4) | 2026-09-08 | primary-verified |
| **Drawdown relief multiplier** | **`1` for FY2026-27 — the full table, no halving.** cl 4A halves the cl 1 amount for years commencing 1 Jul 2008/2009/2010/2019/2020/2021/2022; cl 4B gives 75% for 1 Jul 2011/2012. **Both are closed enumerations of named years, not sunset clauses** — 1 July 2026 is in neither, and the last extension was `F2022L00498`, effective 2 Apr 2022, with no amendment since | **2026-27** | **config** — FY-keyed. **The only config row in this section** | [SISR Sch 7 cl 4A](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4A) · [cl 4B](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4B) · FRL Compilation No. 159 | 2026-09-08 | primary-verified |

**Keep the relief slot; do not delete it as spent history.** A bare `1` is untestable — nothing can
fail if the multiplier is dropped — and the slot is what makes the ATO's own worked example runnable
(Thavi, below, is an FY2022-23 case at the halved 2.5%). The shape of a shock to this number is
settled by the two clauses: **a year-keyed multiplier on the formula output, applied before the cl 5
rounding, never a change to the table.** With the slot, the next relief year is a data change; without
it, a structural one.

**The order of operations, in full** (§4.1 of the research pass):

```
cl 4     commencement day in this FY and >= 1 June          -> minimum = 0, STOP
cl 1(2)  B = balance on the commencement day (commencement year) else on 1 July
         if B < withdrawal benefit                          -> B = withdrawal benefit
cl 1(2)  f = table factor at the age on that same day
cl 3     d = days from and including the commencement day to 30 June (commencement year,
             commencement day other than 1 July), else d = D
         D = 365, or 366 if the FY contains 29 February
cl 4A/4B m = the relief multiplier for this FY               -- 1 for FY2026-27
cl 5     minimum = ROUND_HALF_UP_TO_$10( B x f/100 x d/D x m )   <- THE ONLY ROUNDING
```

The three multiplicative steps commute and none of them is rounded on its own, so the order **among
them** is immaterial. What is not immaterial is that **cl 5 fires once, after all three**.

**The ATO worked example that pins four of these at once.** *Income stream (pension) rules and
payments*, 29 Apr 2026: Thavi commences an account-based pension on 1 January 2023 aged 66 with
`$250,000` on the start day; `$6,250 × 181 ÷ 365 = $3,099.315` → **`$3,100`**. It confirms (i) the days
basis; (ii) **181** days — inclusive of the start day; (iii) the **commencement-day** balance, not a
1 July one; and (iv) **one rounding, after pro-rating**. (The 2.5% is the FY2022-23 halved factor for
age 66, which also confirms cl 4A's mechanics.)

**Two wording points, recorded so a future reader does not conclude a source is wrong.** First, the
instrument pro-rates the **factor** (*"the applicable value specified in column 3 of the table must be
applied proportionally"*) while the ATO pro-rates the **annual amount**; the two are algebraically
identical, neither intermediate is rounded, and the outputs are bit-identical — so there is no
intermediate "pro-rated percentage factor" needing its own rounding. Second, the ATO's *"if the
pension starts **from** 1 June"* is looser than the instrument's *"**on or after** 1 June"*; encode
the instrument's, which settles that 1 June itself is nil.

#### The TTR range — SISR reg 6.01(2), not Schedule 7

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **TTR maximum drawdown** | **10%** of the pension account balance. Flat, never indexed | — | **constant** | **[SISR reg 6.01(2)(b)(ii)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2F6.01%282%29)** — the *transition to retirement income stream* **definition**. **Not reg 1.06(9A) and not Schedule 7**, which is where the register formerly implied it lived and where nobody will find it | 2026-09-08 | primary-verified |
| TTR maximum — which balance | the balance on **1 July**, or **on the commencement day** in the year the pension commences — **the same day the minimum reads**, but **without** the cl 1(2)(b) withdrawal-benefit substitution, which is a Schedule 7 concept | — | **constant** — structural | SISR reg 6.01(2)(b)(ii)(A), (B) | 2026-09-08 | primary-verified |
| **TTR maximum — what does NOT apply to it** | **not pro-rated** for a part year, **not rounded** to $10, **does not vary with age**, **not switched off** by the cl 4 1 June nil rule, and **no cl 1(2)(b) substitution**. In a commencement year **the floor drops and the ceiling does not move** | — | **constant** — structural | Sch 7 cl 3 is confined to *"the minimum total payment"* and cl 5 to *"an amount determined under **this Schedule**"*; the maximum is determined under reg 6.01(2), which supplies no replacement · ATO, *Transition to retirement income streams (TRIS)* (2 Apr 2025) instructs the reader, in three bullets, **not** to reduce it for a part year, **not** to vary it by age and **not** to round it | 2026-09-08 | **secondary-only.** The three provisions are primary-verified; **the conclusion is an argument from the ABSENCE of a provision** — no competing provision found and ATO states the negatives explicitly, but **no Explanatory Statement or ruling was retrieved**. O38 |
| TTR maximum — when it falls away | the 10% limb ceases to constrain once the pensioner **satisfies** a condition of release whose Schedule 1 column 3 cashing restriction is **'Nil'** — items **101, 102, 102A, 103, 104, 105(b) and 106**, a **wider** set than the four items ITAA 1997 s 307-80(2)(c) uses for the tax phase. **Three consequences the previous wording collapsed:** (i) the stream is **not** thereby in the retirement phase — items 104 and 105(b) leave it at **15% with no transfer balance credit** (§3.10, T118); (ii) even on the shared items the ceiling falls away on **satisfaction** while the phase changes only on **notification**, so there is a window with **no maximum, 15% fund tax and no credit** (§3.10, T119); (iii) the product **remains a transition to retirement income stream** under the SISR — s 307-80(3)(a)(i) presupposes exactly that. **The Schedule 7 minimum survives**, because reg 6.01(2)(b)(i)'s limb is unqualified: the *"unless"* is punctuated inside (b)(ii) | — | **constant** — structural | SISR reg 6.01(2)(b)(ii) · [SISR Sch 1 Pt 1, column 3](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch1) · ITAA 1997 ss 307-80(2)(c), (3)(a)(i), (3)(b)(ii) | 2026-09-09 | primary-verified — a comparison of two retrieved lists, not an inference. *(Corrected 2026-09-09: the row previously said the stream "becomes an ordinary retirement-phase pension", which is wrong three times over — see §3.10.)* |
| Exceeding the maximum | **catastrophic, PERMANENT, and not marginal.** Where the member holds only preserved or restricted non-preserved benefits, the TRIS **ends for income tax purposes at the START of that income year**; **every** payment in the year — not just the excess — becomes an assessable superannuation lump sum; **the fund loses ECPI for the WHOLE income year**; and **the stream cannot recommence** — it must be commuted and a new stream started, which is itself a s 294-80(1) item 1 debit followed by a fresh s 294-25(1) item 2 credit at the new commencement value, a round trip that can **increase** the transfer balance (§3.10, T123). **A hard constraint the model must never breach**, not a soft target: a plan needing more than 10% in a TTR year is **infeasible** | — | **constant** — structural | **The mechanism:** **TR 2013/5** ¶¶18–20, 100–101 and Example 6 (¶¶42–44), quoted verbatim below, read with ITAA 1997 **s 307-65(1)** (the lump-sum characterisation) and ss 307-75(1), 295-385(3)(a) (the ECPI limb). **The application to the 10% maximum:** TR 2013/5 ¶18's general words only, read with ¶4 and ¶99 · ATO, *Transition to retirement income streams (TRIS)* (2 Apr 2025). **NOT ITAA 1997 s 307-70** — see the note below | 2026-09-09 | **SPLIT.** The cessation **mechanism** is **`ruling-verified`** — TR 2013/5, a public ruling, retrieved 2026-09-09. Its **application to a breach of the 10% MAXIMUM** remains **`secondary-only`**: an inference from ¶18's general words, because the ruling's own reasoning runs to the **minimum** (reg 1.06(1) → reg 1.06(9A) → Sch 7 cl 1) and reg 1.06(9A) contains no maximum. **O61 / U31** |
| **TTR minimum drawdown** | **the whole of Schedule 7** — age-banded, pro-rated, rounded and nil for a June commencement, exactly as above. **Not a flat 4%**: 4% is only the under-65 band, and a TRIS held at 65 takes 5%. *(Corrected 2026-09-09. The row previously read "4% (under 65) — constant", which understates the rule and invites a second, drifting 4% in the codebase.)* | — | **constant** — the **same** factor table as the ordinary minimum, never a separate scalar | **[SISR reg 6.01(2)(b)(i)](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2F6.01%282%29) → reg 1.06(9A) → Sch 7** | 2026-09-08 | primary-verified |

**What TR 2013/5 says, and the citation it replaces.** *(Added 2026-09-09; the row above previously
recorded the mechanism as "not retrieved", which is no longer true, and cited a provision that does not
contain it.)* The ruling, verbatim:

> "A superannuation income stream is taken to have ceased for income tax purposes if any of the
> requirements of the SISR 1994 relating to the payment of the superannuation income stream are not met
> in a financial year" (¶18); "The trustee is taken not to have been paying a superannuation income
> stream **at any time during the income year**" (¶19); "the superannuation income stream will be taken
> to have **ceased at the start of that income year** … any payments made during that income year or
> subsequently are **superannuation lump sums**" (¶100); "**it cannot recommence** meeting the SISR
> requirements in a future year … any income stream payable from the superannuation interest **must
> cease (for example, by commutation) and a new superannuation income stream must commence**" (¶20),
> with the proportioning rule reapplied (¶101).

**The citation was wrong, and the replacement is not a like-for-like swap.** ITAA 1997 **s 307-70
contains no cessation rule at all**: it is a bare delegation — *"A superannuation income stream has the
meaning given by the regulations"* (s 307-70(2)). The operative definition is **ITAR (1997 Act) 2021
s 307-70.02(1)** (TR 2013/5 ¶52 and fn [1B]), which is **still not retrieved — O58 / U32**. The
lump-sum characterisation comes from **s 307-65(1)**: *"A superannuation lump sum is a superannuation
benefit that is not a superannuation income stream benefit"*.

**Do NOT cite TR 2013/5 as stating the 10%-breach consequence.** Its reasoning at ¶¶96–101 runs
reg 1.06(1) → reg 1.06(9A) → Sch 7 cl 1 — i.e. the **minimum** — and its only example (Example 6, ¶43)
is a minimum failure. **reg 1.06(9A) contains no maximum**; the 10% is in reg 6.01(2)(b)(ii) (T57). Only
¶18's general words reach a maximum breach, read with ¶4 (the ruling applies to a TRIS) and ¶99 (*"the
rules (standards) must be met, or given effect to, in practice"*). That reading is the only one on offer
and **no source applies it**. Cite the ruling as stating the **mechanism a 10% breach is inferred into**,
never as stating the consequence itself. **O61 / U31.**

**The asymmetry, side by side — trap T57.** The minimum and the maximum come from two different
provisions with two different machineries, which is the structural reason none of Schedule 7's
adjustments reaches the ceiling:

| | Minimum — Sch 7 via reg 1.06(9A)(a) | Maximum — reg 6.01(2)(b)(ii) |
|---|---|---|
| Rate | age-banded, 4%–14% | flat **10%**, never varies with age |
| Part-year pro-rating | **YES** — cl 3, days basis | **NO — no such provision exists** |
| Rounding | **YES** — cl 5, nearest $10, ties up | **NO — no such provision exists** |
| Nil on or after 1 June | **YES** — cl 4 | **NO — the full 10% is available** |
| Balance in a commencement year | commencement-day balance — cl 1(2)(a)(ii) | commencement-day balance — para (B). **Same** |
| Withdrawal-benefit substitution | **YES** — cl 1(2)(b) | **NO** — plain "pension account balance" |
| cl 4A/4B relief multiplier | **YES** (spent) | **NO** — the maximum was never reduced |

A TRIS commencing **1 October 2026** on `$500,000` at age 61: **minimum $14,960** (4%, 273/365,
rounded), **maximum $50,000** (the flat 10%, unreduced) — against `$20,000 – $50,000` in a full year.
Pro-rating the ceiling "for consistency" would give `$37,397.26`. Commencing **on or after 1 June**:
**minimum nil, maximum still the full 10%** — a whole year's ceiling available in under a month.

**What the stream becomes on conversion is §3.10**, not this section: the entry test is ITAA 1997
s 307-80, the conversion day differs by route, and the two events — the ceiling lapsing and the phase
changing — are not the same event on the same facts on the same day.

**One divergence between this section and `src/`, recorded rather than fixed here.**
`superannuation.access.minimumDrawdownFactors` is stamped `kind: 'config'`, `fy: '2026-27'` in
`src/data/assumptions/super.ts`, because FY2026-27 is the compilation the table was read from. This
section and §7 class the factor table as a **constant** — it is never indexed and moves only by
amending regulation, and what genuinely varies by year is the cl 4A/4B multiplier beside it, which is
its own record. Reconciling the stamp is a data change for whichever chunk next touches that file;
nothing computes differently either way. `superannuation.access.ttrMinimumDrawdown` (a flat `0.04`)
remains in `src/` **deliberately unconsumed**, guarded by a test asserting that nothing under `src/`
imports it — the floor of a TTR range is `minimumDrawdown(...)` reading the factor table.

#### 3.9.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below
are enforced from the moment they exist, statuses included. They are §3.9's additions to that
inventory. Every one of them was in `src/` before this table existed and was named **nowhere in
this document** — the P3-26 quarantine, which is a finding and not an exemption: a refusal with no
register row is a decision the specification does not record. The first three are
`src/core/ttrPaymentRange.ts`'s; the rest, added 2026-09-10, are `src/core/minimumDrawdown.ts`'s
and `src/core/conditionOfRelease.ts`'s.

**All eight stay here rather than going to §3.10.6, and the first one is the reason the question had
to be asked.** Each has **one throw site**. The first three each decline to state **the ceiling** —
the reg 6.01(2)(b)(ii) limb this section owns; the next three decline to state **the floor**, the
Sch 7 cl 1 limb this section owns just as squarely — one for want of any rule about the years
before commencement, one because the figure it was handed is stamped with the wrong day, and one
because cl 3 knows a single proportioning event and was handed a second; and the **last two**
decline the prior question all of those presuppose — **whether a benefit may be paid out of
superannuation at all** — which is the Access table's own Condition of Release row and belongs to
no other section. Those two divide the question between them: the seventh refuses to spend a
benefit the model finds preserved, and the eighth refuses to say whether the benefit is preserved
at all, in the one window where this section's words and the definition they cite disagree. The conversion refusal
in particular looks like a §3.10.6 row and is not one: what it declines is the *maximum*, on the day the *ceiling* event happens, over the
*seven*-item Nil set; the phase event is a different event on a different day over a different set
(T118, T119), it is decided by §3.10.6's module and it has **its own** refusal registered at
§3.10.8. Registering this one beside the entry test would fuse the two events in the register after
`src/` stopped fusing them on 2026-09-10.

| Refusal | Fires when | Status |
|---|---|---|
| **`TrisConversionNotModelledError`** | the Condition of Release asserted on the **last day of the year** is `met` on either of this section's two grounds, so reg 6.01(2)'s *"unless"* bites and there is no ceiling left to state. **First of the module's three checks**, ahead of the commencement test and the balance-date test. **The ground is the *"TTR maximum — when it falls away"* row above, read as a refusal:** for such a Person there is no maximum at all, returning the 10% anyway caps a plan that is not capped, and the day the ceiling lapsed is not a day this function is given — so the year cannot be split here either. **What the row must not do, and what the message stopped doing on 2026-09-10, is fuse the ceiling event with the phase event.** The ceiling lapses on **satisfaction**, across all seven Nil items; the phase changes on **notification** for items 101, 102A and 103 and **automatically on the 65th birthday** for item 106; and the stream **stays a TRIS** either way, because s 307-80(3)(a)(i) presupposes it. This refusal settles the ceiling only. **Note what it buys, which no other row records:** **O64 / U29** — whether the *"unless"* removes the ceiling for the **whole** financial year or only from the day of satisfaction — is unresolved and differs by up to the whole balance, and this refusal is what stops that question from having to be answered, because it refuses on either reading. **Finding 1 — half the stated ground is now stale, and `src/` disagrees with itself about it.** The message says the conversion limb of P3-8 *"is blocked on mid-year ECPI apportionment (O60) and on the stated conversion-day Setting (R5)"*. **O60 is CLOSED** — 2026-09-10 by P3-25, §3.10.6's own row is stamped **RESOLVED**, §3.11 carries the answer (there is no apportionment) and **R10 steps 1–4 are built**, so `fundEarningsTax` now charges a conversion year at §3.11.6's provable upper bound instead of refusing it. The phase module's refusal already says exactly that — *"O60 no longer blocks it independently"* — so **two modules ship contradictory statements about one limb of one item**. The **R5 limb stands**: no conversion-day Setting exists, and §3.10.8 still carries the absent-conversion-day refusal as required-but-unnamed. Not the O70 defect and not a false negative about retrieval — a blocker that has since been discharged, with the discharge written into one module and not the other; this file was last edited earlier the same day, before R10 was built. Recorded, not fixed (`src/` is out of scope for the brief that wrote this row) | **BUILT** — `src/core/ttrPaymentRange.ts`. **The O60 half of the stated ground no longer holds**; the R5 half does, and the refusal stands on its own first sentence regardless of either |
| **`TrisNotCommencedError`** | the financial year asked for **ends before the stream's commencement day**. One throw site, the second of the module's three checks. **The ground is that reg 6.01(2)(b)(ii) limits *"total payments … made in a financial year"* for a pension that exists**, and a range returned for an earlier year would read in a forecast as a stream that is running, may be drawn on and must be paid from: a nil floor and a live ceiling are facts about a stream, not about its absence. **Finding 1 — §3.9 records no rule for a year before commencement.** This section fixes which balance and which age apply in the commencement year and in every later one, and simply does not address the years before it; the decision to refuse rather than return nil existed only in `src/core/ttrPaymentRange.ts` until this row. Schedule 7's own equivalent refusal on the **floor** side — **`PensionNotCommencedError`**, a separate class with its own single throw site in `src/core/minimumDrawdown.ts` — was likewise stated nowhere in this document when this row was written, and left the P3-26 quarantine on 2026-09-10 in the row immediately below; **one predicate, two rules**, and the row below sets out why they are not one refusal guarded twice. **Finding 2 — its reachability is bounded by the refusal above it, and the bound runs the wrong way.** The release gate is tested **first**, on 30 June of the year asked for, so a Person who has met a Condition of Release by that day is refused with the **conversion** refusal even for a year in which their stream **does not yet exist** — verified: FY2025-26, a Person aged 71, commencement day 1 Oct 2026 raises `TrisConversionNotModelledError`, not this one. So this refusal is reachable **only** for a Person who has not met a condition, and the conversion refusal is reachable for years in which there is no TRIS to have a ceiling. Neither outcome is wrong — both are refusals — but the message a caller reads names the wrong defect | **BUILT** — `src/core/ttrPaymentRange.ts` |
| **`TrisMaximumBalanceDateError`** | the balance handed in carries a `measuredAt` that is not the day reg 6.01(2)(b)(ii)(A) or (B) names — **1 July**, or the **commencement day** in the commencement year. Third and last of the module's three checks. **The ground is the *"TTR maximum — which balance"* row above:** the wrong day's balance is not an invalid number, it is a **different** number that would be multiplied by the same 10% and never noticed, so the date stamp on the figure is the only discriminant there is. In a commencement year **two provisions name the same day by two different routes** — Sch 7 cl 1(2)(a)(ii) for the floor, para (B) for the ceiling — and the module checks it **twice**, deliberately, rather than letting one check stand for both. **Finding 1 — the second of those two checks cannot be reached through the range.** `minimumDrawdown` derives the same relevant day and refuses the same balance with **`PensionBalanceDateError`**, but it is called **after** the ceiling's check, so for any balance `ttrPaymentRange` is given the TTR check fires first and Schedule 7's never does. The coincidence is genuinely checked twice, but the second check is observable only by calling `minimumDrawdown` directly — which `test/core-ttr-range.test.mjs` does, in the same test, rather than reading the range's throw as coverage of both. **Finding 2 — §9 names the floor's balance-date refusal and not the ceiling's.** §9's superannuation table carries *"Read the 1 July balance in a commencement year"* against T56 and requires `PensionBalanceDateError` **by name**; its four TTR-maximum mutations — pro-rate it, round it, switch it off for a June commencement or vary it by age, and change the 10% to 12% — name no refusal and none of them touches the day the ceiling's balance is read on. **Reading the 1 July balance for the *ceiling* in a commencement year is a mutation §9 does not name**, though this module's own fixtures assert it in both directions, (A) and (B) | **BUILT** — `src/core/ttrPaymentRange.ts` |
| **`PensionNotCommencedError`** | the financial year asked for **ends before the pension's commencement day** — `compareFinancialYears(commencementYear, fy) > 0`, character-for-character the predicate the row above guards. **One throw site**, and it is the **first** of `minimumDrawdown`'s guards, ahead of the balance-date test and the commutation test. **This is a scope refusal** — §3.5.1's, §3.6.1's and §3.11.9's fourth kind, and not one of the other three. It is **not a rule of law**: no provision forbids anything here. It is **not an input-shape guard** — a date of birth, a commencement day in a later year and a balance measured on that day describe one perfectly coherent Person, and nothing is mis-shaped. It is **not a drift tripwire**, because it reads no record of this register against another. What is missing is a **rule to apply**, and the refusal's own message says so in terms: Sch 7 determines *"the amount of payments"* for a pension **that exists**, reg 1.06(9A)(a) requires payment *"at least annually"* **once it has commenced**, and *"neither says anything about the years before it"*. **The alternative is not merely wrong but unrepresentable, and that is the load-bearing detail.** `MinimumDrawdownFigure` is a discriminated union whose `nil: true` arm carries **`nilFrom`** — the 1 June that **cl 4** measures against — so a nil for a year in which no pension exists could not be built without stamping it with cl 4's date and claiming a clause that never fired. The two nils are different facts: cl 4's is *"the pension is running and requires nothing this year"*, and this one would be *"there is no pension"*. The message names exactly that risk — a nil here *"would read in a forecast as a pension that is running and requires nothing"* — so the discriminated union and the refusal are one design, not two. **Finding 1 — this and `TrisNotCommencedError` are ONE PREDICATE AND TWO RULES, not one rule guarded twice.** The two guards test the identical expression on the identical facts, but they decline **different figures under different provisions**: this one declines the Sch 7 cl 1 / reg 1.06(9A)(a) **minimum**, which every account-based pension has, and the other declines the reg 6.01(2)(b)(ii) **maximum**, which only a TRIS has and which §3.9's *"what does NOT apply to it"* row establishes is not a Schedule 7 concept at all. Collapsing them into one row would fuse the floor and the ceiling in the specification exactly where this section keeps them apart, and it would leave the minimum for a plain account-based pension — a stream with no ceiling and therefore no TRIS refusal — governed by a row about a provision that does not reach it. It is the **same judgement §3.9.1 already made for the balance-date pair**, where two provisions name the same day by two routes and the code checks it twice deliberately; the difference is that the balance-date pair also diverge in substance (no cl 1(2)(b) substitution on the ceiling side), while these two predicates do not diverge at all. **The agreement is therefore a fact about FY-comparison arithmetic and not a fact about the law**, and nothing in either instrument requires it to hold. **Finding 2 — no input reaches this throw site through any `src/` caller, and the tests handle that honestly.** `ttrPaymentRange` is the **only** module under `src/` that imports `minimumDrawdown`, and it tests the same predicate at its own line and throws `TrisNotCommencedError` **before** `minimumDrawdown` is ever called — verified: FY2026-27, born 1964-03-15 and still working (so the release gate does not bite), commencement day 1 Oct 2027 raises `TrisNotCommencedError`. So as shipped this refusal is observable only by calling `minimumDrawdown` directly, which `test/core-minimum-drawdown.test.mjs` does rather than reading the range's throw as coverage of both — the same honesty the row above records for `PensionBalanceDateError`, and the same **unreachable-through-the-engine** bound §3.6.1 records for its own refusal. **Finding 3 — the rule this refusal applies is recorded nowhere in this section, and neither is the decision to refuse.** §3.9 fixes which balance and which age apply in the commencement year and in every later one and says nothing about the years before it; the row above records that absence for the ceiling, and it is the **same absence**, unremarked, on the floor side, where §3.9's minimum-drawdown table is the longest in the section and still has no row for a year the pension does not exist in. Until this row, the choice to **refuse** rather than return cl 4's nil lived only in `src/core/minimumDrawdown.ts`. **Finding 4 — §9 names neither not-commenced refusal.** §9's superannuation table requires `PensionBalanceDateError` by name against T56 and lists ten further Schedule 7 and TTR mutations; **deleting either not-commenced guard is a mutation §9 does not name**, on the floor side or the ceiling side | **BUILT** — `src/core/minimumDrawdown.ts`, one throw site. **The stated ground is sound and is an argument from silence, which is what a scope refusal is**: it rests on what Sch 7 and reg 1.06(9A) do **not** say about years before commencement, and no provision was retrieved that contradicts them |
| **`PensionBalanceDateError`** | the `PensionAccountBalance` handed to `minimumDrawdown` carries a `measuredAt` that is not the day Sch 7 cl 1(2)(a) names for the year asked about — **1 July**, or the **commencement day** in the commencement year. **One throw site**, the **second** of that module's three guards: after the not-commenced test in the row above and ahead of the commutation test in the row below. **This is an input-shape guard** — §3.5.1's second kind, the same shape as `DuplicateEmployerError`, and the row must not dress it as a rule of law. No provision forbids measuring a balance on some other day, and nothing here is out of scope: the rule is stated in this section and is **primary-verified**. What cl 1(2)(a) fixes is **which day's figure is the operand**, and a balance from another day is not an invalid number but *a different number that would be multiplied by the same factor and never noticed* — the date stamp is the only discriminant there is, which is why `pensionAccountBalance` makes the day part of the figure rather than a parameter of the call. It is the **floor-side twin** of `TrisMaximumBalanceDateError` two rows above, and the deliberate second check that row records is this one. **Finding 1 — its ground was already recorded, and so was its name; this is the §3.6.1 case inverted.** At §3.6.1 the register stated the ground in as many words and had simply never named the class. Here the class is named in **three** places and was never given a row: **T56** states cl 1(2)(a)(ii) in terms and closes *"the wrong day is `PensionBalanceDateError`"*; §3.9's own **"Which balance"** row states the rule with the commencement-year exception in capitals; and **§9's superannuation mutation table** requires the class **by name** against T56 — *"a balance measured on any other day must raise `PensionBalanceDateError`, not compute"*. Six mentions and no row. What was missing was never the ground and never the name: it is that **nothing asserted the class was built, or said which file it lives in**, which is the one thing this table's Status column supplies. **Finding 2 — the message asserts a negative this register contradicts, and the date is checkable (the P3-29 pattern, live).** It tells the caller the commencement year reads the commencement-day balance *"not on 1 July, which register §3.9 says and which is the one thing in the row that is wrong"*. §3.9 has said the opposite since **2026-09-09**: the *"Which balance"* row carries the exception in capitals, and *"on the 1 July balance"* survives only as the **superseded text** quoted at the head of this section as an evidence record. The module was last edited **2026-09-08** (`4e26760`), the day before that correction, and its file header carries the same stale sentence — *"§3.9's 'on the 1 July balance' is wrong for that year"*. Both were true when written and neither is now. Recorded, not fixed (`src/` is out of scope for the brief that wrote this row), and the refusal stands without the sentence. **Finding 3 — no input reaches this throw site through any `src/` caller.** `ttrPaymentRange` is the only module under `src/` that imports `minimumDrawdown`; it derives the same relevant day by reg 6.01(2)(b)(ii)(A) and (B) and refuses the same balance with `TrisMaximumBalanceDateError` **before** the call — verified: FY2026-27, still gainfully employed, commencing 1 Oct 2026 with a 1 July 2026 balance raises `TrisMaximumBalanceDateError`. That row records the same bound from the ceiling side, and `test/core-ttr-range.test.mjs` calls `minimumDrawdown` **directly** in the same test rather than reading the range's throw as coverage of both. **Finding 4 — it fires ahead of cl 4, which is not the order this section records.** §3.9's *"order of operations, in full"* block puts cl 4 first and **stops** there: *"commencement day in this FY and on or after 1 June → minimum = 0, STOP"*. The module tests the balance day first — verified: a pension commencing **10 Jun 2027** with a 1 July 2026 balance is refused for FY2026-27, a year whose minimum is **nil** under cl 4 and in which no balance is multiplied by anything. It is defensible rather than wrong, because the nil arm still **carries** the balance as a reported field and a wrongly stamped figure would be reported as the balance that determination was made on; but in that branch the guard checks a reported figure rather than an operand, and the departure from this section's own recorded order is written down nowhere. **Finding 5 — an unrecorded premise: one date stamp, two clauses' figures.** `PensionAccountBalance` carries a **single** `measuredAt` and **two** amounts — the cl 1(2)(a) account balance, whose day this section states, and the cl 1(2)(b) **withdrawal benefit**, whose day this section states **nowhere**: the *"Withdrawal-benefit substitution"* row gives the substitution and no date for it. This refusal therefore enforces cl 1(2)(a)'s day on cl 1(2)(b)'s figure as well, and the premise that the two are measured on the same day lives only in the type in `src/core/minimumDrawdown.ts` | **BUILT** — `src/core/minimumDrawdown.ts`, one throw site. **The stated ground is sound and this section states it in terms** — the only refusal out of the P3-26 quarantine whose ground, name and required behaviour were all already in this document, and which still had nothing saying it exists |
| **`MidYearProportioningError`** | `minimumDrawdown` is told the pension was **commuted or rolled over during the year** — the required `commutedOrRolledOverDuringYear` fact is `true`. **One throw site**, the **third and last** of that module's guards, after the balance-date test in the row above. **This is a scope refusal** — §3.5.1's, §3.6.1's and §3.11.9's fourth kind. It is **not a rule of law**: nothing forbids commuting or rolling over a pension part way through a year, and this refusal states no consequence for having done it. It is **not an input-shape guard**: the fact is a required boolean about the year, as well formed as a boolean gets, and it describes a Person a fund sees every day. It is **not a drift tripwire**, because it reads no record of this register against another. What is missing is a **rule to apply**: Sch 7 cl 3 proportions the minimum for **one** event — the year the commencement day falls in — and says nothing about a commutation or a rollover. **Finding 1 — the ground is recorded, the decision to refuse is recorded, and the class is named: this refusal is §8's O39 with a Status column added.** O39 reads *"Open, and refused in code rather than decided"*, carries the same ATO sentence the message quotes — *"the minimum payment amount will be a proportion of the annual amount if the income stream starts, **is commuted or rolled over** part way through the year"* — calls it *"a proportioning event with no clause behind it in the Schedule as read"*, names this class, and records that the commutation limb was **explicitly out of the P3-10 brief's scope**, so the gap is by construction rather than an oversight. **The message asserts no negative this register contradicts**, unlike the row above it: the two agree sentence for sentence, and O39's quotation is the source of the refusal's own. What an open item cannot say is that the class **exists and is built** — that is what this row adds and all it adds. **Finding 2 — it is the only refusal in this table reachable through this section's own engine path, and that reachability is not its own doing.** Verified: FY2026-27, born 30 Jun 1964 and **still gainfully employed**, a pension running since 1 Jul 2020, a balance stamped 1 Jul 2026, the year stated as commuted — `ttrPaymentRange` raises `MidYearProportioningError`, and `test/core-ttr-range.test.mjs` asserts that call rather than a direct one, which is genuine coverage of this class from that site and not a throw observed from elsewhere. `ttrPaymentRange` has **no commutation rule of its own**: it takes the flag as a required parameter, documented there as *"`minimumDrawdown` refuses a year it cannot proportion"*, and passes it straight through — so the ceiling module inherits this guard entirely, the same shape §3.5.1 records for `SuperGuaranteeEarningsBaseError`, which `superGuarantee` inherits whole from the ceiling call it makes. **Finding 3 — reaching it through the range means passing the release gate first, so it stands behind the unwritten permanence premise recorded below.** The reg 6.01(2) *"unless"* is asserted on **30 June** and tested before anything else, so a Person who has met a Condition of Release by that day is refused with `TrisConversionNotModelledError` even for a commuted year, and a Person in the 60-to-64 cessation window with the row below. The commutation question is only ever put about a Person one day's assertion has already let past. **Finding 4 — it fires in a cl 4 nil year, where O39's open question cannot change the answer.** Verified: a pension commencing **10 Jun 2027** with a balance stamped that day, stated as commuted during FY2026-27, raises this refusal — but cl 4 makes that year's minimum **NIL** outright, *"operative, not permissive"*, and §3.9's own *"order of operations, in full"* block puts cl 4 first and **stops** there. A proportion of nil is nil under either reading of the ATO sentence, so in that branch the refusal declines a figure the Schedule determines without the missing clause being needed at all. Same ordering shape as the row above, and unrecorded in the same way: the guard sits ahead of the clause that would have answered it, and this section states no order between them. **Finding 5 — its "way out" is not §4.5.1's, and should not be read as one.** The message closes *"State the year as uncommuted, or close U7 first"*. §4.5.1 records that `MissingDeemingRatesError` has *"a documented way out"* none of the other scope refusals has, because it names a **Setting key** in its own message and takes that Setting in preference to any determination — a demand for an input. This one offers a restatement of the facts, which describes a different Person, or a research pass. For the Person whose pension actually was commuted it is a dead end, exactly as §3.6.1's modified interests are. **Finding 6 — §9 names no mutation for it.** §9's superannuation table carries four Schedule 7 mutations about the minimum's arithmetic, one about its balance date and one about the cl 4A/4B slot, and none about the commutation limb — so **deleting this guard is a mutation §9 does not name**, and what it would return is the **full-year** minimum, which is one of the two candidate answers O39 declines to choose between, with nothing in the mutation table to catch the substitution | **BUILT** — `src/core/minimumDrawdown.ts`, one throw site. **The stated ground is sound and is §8's O39 in the module's own words**: the ATO asserts a second proportioning event, the Schedule as read supplies no clause for it, and the refusal declines to pick between the full-year figure and a proportion rather than approximating either |
| **`PensionBalanceProxyError`** | a caller offers `pensionAccountBalanceObservedLater` an `observedOn` that is **not strictly after** the day Sch 7 cl 1(2)(a) names, or that falls in a **different financial year** from it. **One throw site**, in `src/core/minimumDrawdown.ts`, and it is the tripwire on the one substituted input the module admits (**P10-5, 2026-09-21**). **This is an input-shape guard** — §3.5.1's second kind, the same family as `PensionBalanceDateError` directly above, and it exists because that refusal was **narrowed rather than deleted**. **Why anything was narrowed.** cl 1(2)(a)(i) works the minimum out on the balance *"on 1 July in the financial year in which the payment is made"*. A forecast that opens on any later day **cannot supply that balance** — the day is behind the walk — and until P10-5 `project()` responded by determining **no minimum at all** for that year, so limb 2 offered nothing and a retired household could not reach its own pension for up to eleven months. **That nil had no clause behind it.** The only nil in Schedule 7 is **cl 4**, which turns on the **commencement day** and says nothing about when a forecast opens; cl 3 pro-rates *"the year in which the commencement day … occurs"* and no other year. So the LAW was complete and the **INPUT** was missing, which are two different problems, and the fix is to the input. **What the substitution is bounded by.** The stand-in must be later, in the same year, and it is stamped onto the figure as `proxiedFrom`, which `project()` reports as a `PensionMinimumBasisNote` in the month it was made. Nothing else is substituted: the **age** is still taken at the day the Schedule names, the **band** is that day's, and the year is **not** pro-rated. **Direction: NOT SIGNED, and the row must not invent one.** Between 1 July and the day the plan opens an account takes payments out and earnings in, and either can be the larger. What is bounded is the **magnitude** — the percentage factor times the account's movement over those weeks. The behaviour it replaced was wrong by the **whole** of the minimum, and in the direction that under-states the household | **BUILT** — `src/core/minimumDrawdown.ts`, one throw site. **Reachable from the engine**, unlike the three rows above it: `project()` is the caller, and `test/core-projection-pension-drawdown.test.mjs` exercises both the stand-in and its four refused shapes |
| **`PreservedBenefitError`** | `requireBenefitAccess` is asked to let a stated purpose be paid out of superannuation on a date on which `benefitAccess(...).accessible` is **false** — that is, on which **no Condition of Release this section models is met**. **One throw site**, in `src/core/conditionOfRelease.ts`, and it is the model's single gate: it throws rather than returning `false` *"because the failure this is here to stop is a forecast that quietly continues with money it may not have"*. **This is a rule of law** — the first of §3.5.1's four kinds, and not the scope refusal directly above it. It is not a scope refusal: the law's answer is known and the message states it, where the two not-commenced rows decline for want of any rule at all. It is not an **input-shape guard**: a Person of 62 who is still gainfully employed is the most ordinary Person this tool has, perfectly well formed, and the answer the law gives them is **no**. It is not a **drift tripwire**: it reads no record of this register against another. **Finding 1 — THE SPLIT CONFIDENCE, and it must be carried into this row intact (R6).** §3.9's Condition of Release row is a **SPLIT**: the SISR Schedule 1 item numbers and their column-3 *Nil* cashing restrictions are **`primary-verified`**, *"turning 65"* is **item 106** and is **`primary-verified`**, and **the mapping of *"ceasing gainful employment after 60"* onto item 101 (Retirement) is `unverified` and must not be asserted**, because the SISR definition of *retirement* is **reg 6.01(7), never retrieved (O59 / U28)**. Two distinct things follow and neither may be dropped for the other. **(i) On its own trigger the split does not bite, and that is by construction, not by luck.** This refusal is decided by the **boolean** `release.met` and never by the item, and it fires only where `met` is **false** — the one state in which no item has to be named. The refusal that holds the item-101 line is `ConditionOfReleaseItemNotIdentifiedError` (§3.10.8), and it fires only on a **met** condition, so the two are disjoint by their own predicates and this one asserts the unverified mapping nowhere. **(ii) On its COMPLEMENT the split bites hard, and this is the half a one-line row would silently collapse.** `accessible` is computed from **§3.9's two grounds**, not from the Schedule 1 item set that same row records verbatim. Of the five Nil-restriction items retrieved — **101, 102, 102A, 103, 106** — the model reaches **106** on the verified age ground and, at most, **101** by a route it is forbidden to name; **102 (Death), 102A (Terminal medical condition) and 103 (Permanent incapacity) are primary-verified items that no input to this model can reach at all**. So `accessible: false` means, exactly and only, ***no ground §3.9 models is met***, which is strictly narrower than ***the benefit is preserved in law***. The refusal's own text asserts the wider claim in both halves — `benefitAccess`'s reason is *"no Condition of Release is met — the benefit is preserved, whatever the Person's age"* and the message is *"spending money that cannot lawfully be withdrawn"* — and **a register row repeating that sentence is precisely where a split confidence quietly becomes one verified claim**, so this row does not repeat it. **What is recorded instead:** the refusal is sound on the age ground (verified), is taken on the employment ground without the item being nameable (`unverified`, O59 / U28), and is **over-broad as against the law** for a Person on items 102, 102A or 103. Recorded and **not narrowed**: nothing here says the refusal is wrong, and nothing here says the item-101 mapping is safe. **Direction of the over-breadth:** it **blocks** money the law may release, so the Person is understated and never flattered — the same conservative direction as T118 and the same invisibility, since the item is a fact about the Person that never arrives at this function. **Finding 2 — it shares the permanence premise recorded below for the conversion refusal, in the opposite direction, and §3.9 states it neither way.** `BenefitAccess` carries `on` and is asserted on **one date**; `ConditionOfRelease` documents itself as *"a boolean **on a date**, not a permanent property"*. Below, the unwritten premise makes the model **over-permissive** — a met condition asserted on 30 June may already have lapsed. Here it makes it **under-permissive**: a Person who ceased gainful employment at 61 and later went back to work is stated `{ ceased: false }`, takes **no ground at all**, and is refused by this class on a date on which, if satisfaction were permanent, they had already been released — verified: born 1964-03-15, `{ ceased: false }`, asked on 2027-06-30 at 63, `met: false`, `grounds: []`, `PreservedBenefitError`. **Whether a reversed cessation still satisfies the ground is the same reading of reg 6.01(7) that O59 turns on**, so the two refusals hang on one unretrieved provision from opposite sides and this section resolves it for neither. **Finding 3 — the rule this refusal applies is recorded in no row of this register.** §3.9's Access table states Preservation Age, the Condition of Release **boolean**, the Schedule 1 items with their **Nil** restrictions (the *released* side) and the tax treatment at 60+. **It never states the converse** — that a benefit for which no condition is met is **preserved** and may not be cashed — which is the whole content of this refusal. The nearest thing the project has is **ADR-0009**'s *"Retiring before a Condition of Release is essentially unfundable"*, which the message cites: an architecture decision about funding, not a rule of this specification. Until this row the rule lived in `src/core/conditionOfRelease.ts` and in an ADR. **Finding 4 — the message quotes the register accurately and inherits its imprecision, which is a near-miss of P3-29 rather than a case of it.** The message says *"Register §3.9 makes the Condition of Release a boolean per Person that is independent of age"*; §7's constants table says **verbatim** *"a boolean per Person, independent of age"*, so no negative is asserted that this register contradicts. Two narrower things are true. Since 2026-09-09 §3.9's own row is **no longer only a boolean** — it carries the Schedule 1 **item** as well, because s 307-80(3)(b) turns on the item — so the quotation is current for §7 and incomplete for §3.9. And *"independent of age"* is loose **in this register first**: one of the two grounds is *turning 65*, which is nothing but an age, and the module carries `automaticReleaseAgeItem` for it. The phrase means independent of **Preservation Age**, which is what the message's next clause says and what the code does. Register and code agree, and are loose in the same way; recorded, not fixed (`src/` is out of scope for the brief that wrote this row). **Finding 5 — §9 requires this refusal's behaviour and names no refusal for it.** §9's superannuation table carries *"Set `metNilCashingCOR = (age >= 60)`"* against P13-5 and requires that a Person aged 60–64 still working have a lump sum **"blocked"** — which is this class and nothing else — while naming `PensionBalanceDateError` **by name** three rows further down. The same shape as the ceiling's balance-date gap already recorded above | **BUILT** — `src/core/conditionOfRelease.ts`, one throw site. **A bound worth stating: no engine path reaches it as shipped.** `requireBenefitAccess` has exactly **one** call site under `src/` — `retirementPhaseInterest` in `superPhase.ts` — and that constructor has **no** `src/` caller either, so both are public entry points and the only callers as shipped are `test/`. It is reachable **by input** in the sense §3.6.1 distinguishes — the release is a caller-stated parameter — and `test/core-condition-of-release.test.mjs` exercises it directly and across an age × employment sweep, while `test/core-super-phase.test.mjs` exercises it **through** `retirementPhaseInterest`, which is genuine coverage of this class from this site and not a throw observed from elsewhere |
| **`CessationBeforePreservationAgeError`** | `conditionOfRelease` is asked about a Person who **ceased gainful employment before reaching Preservation Age** and who, on the date the boolean is asserted for, is **at or over Preservation Age and under the age that releases benefits by itself** — the 60-to-64 window, and nowhere else. **One throw site**, inside `conditionOfRelease` itself, so it precedes `benefitAccess`, `requireBenefitAccess` and the row above: a Person in the window never reaches the gate at all. **This is a scope refusal** — §3.5.1's, §3.6.1's and §3.11.9's fourth kind, the second in this table after the commutation row. It is **not a rule of law**: no provision forbids anything here, and the refusal states no answer — it declines to state one. It is **not an input-shape guard**: a date of birth, a cessation at 58 and a date at 62 describe one perfectly coherent Person, and the required discriminated union accepted them without complaint. It is **not a drift tripwire**, because it reads no record of this register against another. What is missing is a **rule to apply**, and this is that kind's rarest flavour — **not an absent rule but a tie-break between two present ones**. §3.9's Access table states the ground affirmatively, *"ceasing gainful employment after 60"*, which this Person did not do, so on the register's words they are not released until 65; the SISR definition of *retirement* that the same row cites gives, on the module's reading, a different answer inside that window and only there. **Until 2026-09-29 the register determined neither, because SISR reg 6.01(7) was never retrieved (O59 / U28). It is now read (LR-2; quoted at §3.10.8's `ConditionOfReleaseItemNotIdentifiedError` row): paragraph (b)(ii) retires this Person at 60 only if the trustee is reasonably satisfied they intend never again to be gainfully employed, full-time or part-time. The model holds no such fact, so the refusal stands — on a missing fact now, not an unread provision.** **Finding 1 — THE SPLIT CONFIDENCE, carried in and not narrowed (R6).** §3.9's Condition of Release row is a **SPLIT**: the SISR Schedule 1 item numbers and their column-3 *Nil* cashing restrictions are **`primary-verified`**, *"turning 65"* is **item 106** and is **`primary-verified`**, and the mapping of *"ceasing gainful employment after Preservation Age"* onto **item 101 (Retirement)** is **`unverified`** and must not be asserted, because item 101's content is reg 6.01(7). Three things follow and none may be dropped for another. **(i) This refusal names no item and cannot.** It fires on a cessation that did **not** make out the employment ground, so there is no ground to map and `schedule1ItemFor` is never in play; the mapping's guardian was `ConditionOfReleaseItemNotIdentifiedError` (§3.10.8, deleted 2026-09-29 when the mapping was verified), which fired only on a **met** condition. The two were disjoint by their own predicates, so this one asserted the then-unverified mapping nowhere — the same construction the gate's row above relies on. **(ii) The second limb of its stated ground IS a positive claim about the unretrieved provision, and that is where the split bites.** *(Superseded 2026-09-29: the message now cites reg 6.01(7)(b)(ii), which was read that day, so this limb is primary-verified.)* The message told the caller that *"on the SIS 'retirement' definition §3.9 cites but does not reproduce, an intention never to be gainfully employed again can release them at Preservation Age"*. That described the content of reg 6.01(7), then unread, so it was **`unverified`** and this row did not repeat it as fact. **What the refusal actually needs is weaker, and is sound:** that this document **does not determine the case**. §3.9 states one ground, this Person does not make it out, and whether some other reading releases them is exactly what is unknown; the unknown alone warrants the refusal, without any claim about what the unread provision says. **(iii) Recorded and NOT narrowed.** Nothing here says the register's words govern the window, and nothing here says reg 6.01(7) releases the Person: writing either would decide O59 from a register row, which **R6** forbids. **The window's two edges, by contrast, rest on verified figures** — Preservation Age **60** and the automatic release age **65** with its item 106, both `primary-verified` — so the refusal's *extent* is not in doubt even where its *content* is, and `test/core-condition-of-release.test.mjs` asserts both edges from the outside as well as the throw between them. **Finding 2 — deleting this guard returns the answer §3.9's own words give, which is what makes the mutation invisible.** The throw sits in the `else` of the *ceased at or after Preservation Age* test; without it `grounds` stays empty, `met` is `false`, and the model reports the register's reading as a settled fact rather than as one of two. The mutation therefore produces no implausible figure — it produces this section's own sentence — and any test written from §3.9's text alone would pass it. **§9 names no mutation for it**: its only Condition of Release row is *"Set `metNilCashingCOR = (age >= 60)`"* against P13-5, which is the gate and not this window, so **deleting this guard is a mutation §9 does not name** and one behavioural test stands behind it. **Finding 3 — it is reachable through the engine, and it pre-empts every later guard in `ttrPaymentRange`.** The range asserts the Condition of Release **first**, on 30 June of the year asked about, so a Person in the window is refused with this class in place of every refusal below it — verified across four fact sets on one Person (born 30 Jun 1964, ceased 30 Jun 2022 at 58, FY2026-27): a running pension with a correct balance, a **year in which the stream does not yet exist**, a balance stamped with the **wrong day**, and a **commuted** year all raise `CessationBeforePreservationAgeError` and never `TrisNotCommencedError`, `TrisMaximumBalanceDateError` or `MidYearProportioningError`. It is the same *the bound runs the wrong way* shape `TrisNotCommencedError` records, one guard further out: what the caller reads is a Condition of Release they may not have been asking about. **Finding 4 — the window is measured on the assertion date, so it moves with the financial year rather than with the Person.** Verified on that same Person: at **59** on 30 June the pre-60 cessation makes out no ground, `met` is `false`, and the range returns a full Schedule 7 floor and a live 10% ceiling; from **60 to 64** it refuses; at **65** item 106 fires and the answer is `TrisConversionNotModelledError`. One unchanging history therefore yields a computed range, then a refusal, then a different refusal, on three consecutive years. **Finding 5 — an unrecorded premise: the input holds ONE cessation, and which one is stated decides the outcome.** `GainfulEmployment` is a two-cell union carrying a single `ceasedOn`, so a Person who ceased at 58, returned to work and ceased again at 62 has three statable versions and gets three different answers — verified: the earlier cessation refuses, the later one is `met: true` on the employment ground, and `{ ceased: false }` is `met: false` with no ground at all. The message instructs the caller which to state — *"State the cessation that happened after Preservation Age if there was one"* — so the model's correctness in this window rests on a **caller convention recorded only inside the refusal's own message**, and this section records no such convention. It is the same premise family as the permanence note below, which §3.9 also states neither way and which reg 6.01(7) (read 2026-09-29) does not answer either | **BUILT** — `src/core/conditionOfRelease.ts`, one throw site. **Both limbs of the stated ground are sound from 2026-09-29**: §3.9 does not determine this window, and reg 6.01(7)(b)(ii) makes the answer turn on an intention the model does not hold |
| **`LumpSumBelowTaxFreeAgeError`** | a `LUMP_SUM_FROM_SUPER` entry is applied for a Person who has **not reached the age at which a benefit from a taxed source is tax-free** — 60, held as `superannuation.access.benefitsFromATaxedSourceFromAge`, the numeric sibling this section's *"Benefits from a taxed source at 60+ — tax-free, no PAYG"* row gained on 2026-09-19. **One throw site**, in `superLumpSumWithdrawal`. **This is a scope refusal, not a rule of law:** the law states the answer — ITAA 1997 Div 301 taxes the **taxable component** of a lump sum taken between preservation age and 60, with the s 301-20(2) offset up to the s 307-345 low rate cap and ordinary rates above it — and what is missing is the **fact**. A `SuperInterest` in this model is a `phase` and a `balance`; nothing anywhere splits it into taxable and tax-free components, and §3.1's fifth surcharge-income limb already records `lowRateCapLumpSumComponent` as *a Setting, nil by default*, because *"lump sums are not modelled"*. **Direction, which is the whole reason it refuses rather than approximates:** every available approximation understates the tax and therefore overstates the money the household may spend — the flattering direction, and the same one ADR-0009 names for CGT. **It is not the release gate and must never be read as one.** `PreservedBenefitError` two rows above decides whether the benefit may be PAID and is decided by `conditionOfRelease` from stated employment facts; this decides what it would be TAXED at. Both are applied, in that order, and neither is implied by the other: a 62-year-old still gainfully employed clears this one and is refused by that one. The age is a **third** record beside `preservationAge` and `automaticReleaseAge` for exactly that reason — it shares the number 60 with the first of them today and answers a different question | **BUILT** 2026-09-19 — `src/core/superLumpSum.ts`, one throw site, reached only from the `LUMP_SUM_FROM_SUPER` block in `src/core/projection.ts`. **Reachable by input, and by input only from an entry a user wrote:** no automatic limb draws super, so no Household that states no withdrawal can meet it |
| **`TtrPaymentBelowTaxFreeAgeError`** | a **transition to retirement income stream payment** would be made to a Person who has not reached the age at which a benefit from a taxed source is tax-free — the same `superannuation.access.benefitsFromATaxedSourceFromAge` record the row above reads. **One throw site**, `requireTtrPaymentAge` in `src/core/superLumpSum.ts`, called by the walk immediately before each TTR payment (`TTR_PAYMENT_LINE`, 2026-09-23) and only where a payment is about to be made. **A scope refusal on the row above's missing fact:** below that age an income stream benefit is assessable on its TAXABLE COMPONENT, less a tax offset (ITAA 1997 Div 301), and this model holds no component split. **Reachable only by a statement to check:** preservation age is 60 for everyone born after 30 June 1964, so no lawful TTR holder in a forecast from 2026 is under 60. At and above 60 the payment is non-assessable non-exempt and carries no tax line; the line's provenance (`TTR_PAYMENT_PROVENANCE`) asserts the nil and discloses the TAXED-SOURCE assumption in the same words as the lump-sum `taxNote` | **BUILT** 2026-09-23 — `src/core/superLumpSum.ts`, reached only from the TTR payment block in `src/core/projection.ts` |
| **`LumpSumFromPensionInterestNotModelledError`** | a `LUMP_SUM_FROM_SUPER` entry names an interest whose `phase` is **`accountBasedPension`**. **One throw site**, in `superLumpSumWithdrawal`, and it is the **first** of its three checks — before the tax age and before the release gate, because it is a question about the TARGET rather than about the Person. **A scope refusal on a missing FACT and a missing computation.** §3.10 and **T81** settle the rule: a payment out of a retirement-phase stream is a pension payment or a **partial commutation**, *"the same cashflow is a debit or nothing depending on the member's act — it cannot be inferred from size"*, and only a commutation is an ITAA 1997 s 294-80(1) **item 1** debit. `project()` computes **no transfer balance account at all** — `src/core/transferBalanceAccount.ts` has no caller in the walk — so the engine can neither ask the member which act they performed nor report what it cost them in cap space. **The residual is stated rather than hidden:** because no transfer balance is computed anywhere in the walk, honouring the withdrawal would move **no figure this tool reports**; it is refused because it would be silently wrong the day the ledger is wired, and because the household already has that money — **Waterfall limb 2 offers an Account-Based Pension's WHOLE BALANCE** to the month's spending (the 2026-09-17 ruling that Sch 7's minimum is a floor, not a ceiling), so refusing here withholds nothing a plan needs. The per-stream fact that would close it exists and is unwired: `StatedStreamSettings.statedWithdrawalCharacterisation` in `src/core/household.ts` | **RETIRED 2026-09-23 — the class is deleted and the withdrawal is PAID.** In law a retirement-phase stream may pay any amount above its minimum and may be partially commuted, so refusing withheld nothing the law withholds. What the refusal stood on is now DISCLOSED instead, on the month's `SuperWithdrawalNote` and so on screen: the s 294-80(1) item 1 debit is **not modelled** (the walk records no transfer balance credits either — O57), and the withdrawal is **not counted toward the year's Sch 7 minimum**, which is still swept in full in June. Direction of both: the first leaves no figure wrong today because no transfer balance figure exists; the second moves more out of the fund than a member counting the commutation would, so the fund is understated, never flattered. The release gate is not asked of an Account-Based Pension (retirement phase is the release; limb 2 already pays the same balance without asking); the tax age still is (`LumpSumBelowTaxFreeAgeError`). A TTR is unchanged: it still passes both gates or is refused. Limb 5 still offers nothing out of an Account-Based Pension, with the same note, now written in `releasedSuperannuationOffer` |

**The T118 gap the first refusal cannot see, and which this document has recorded only as a
statement of law.** `conditionOfRelease` models **two** grounds and reg 6.01(2)(b)(ii)'s Nil set has
**seven** items. For item 102, item 104, item 105(b) and any 101 or 103 route the two grounds do not
reach, the gate returns `met: false`, this section's *"when it falls away"* row does not fire, and
the engine reports a **10% ceiling that does not legally exist**. The direction is conservative — it
caps income that is not capped, so the Person is understated and never flattered, which is why it
has gone unnoticed — and **nothing given to the function could reveal it**, because the item is a
fact about the Person that never arrives there. T118 and §3.10.6 state the *legal* comparison, that
the Nil set is strictly larger than s 307-80(2)(c)'s four; **that the engine currently reports the
non-existent ceiling** was carried in the module's own comment and in no row of this register until
now. Closing it needs the **item set** as an input — input 5 of the seven the entry test requires
under **R7** — and the mapping of *"ceasing gainful employment after Preservation Age"* onto item 101
is item 101 under reg 6.01(7)(b)(i) (O59 / U28 closed 2026-09-29) — but the items this gap is
about are the ones neither ground reaches, so the two grounds still cannot supply the set.

**A premise of the first refusal — and, since 2026-09-10, of the fifth as well — that this section
does not carry: permanence.** The gate is
asserted **once**, on 30 June, and one test on the last day is sound only if a Condition of Release
once met stays met. §3.9 states the two grounds affirmatively — *"ceasing gainful employment after
60, or turning 65"* — and says nothing either way about permanence; `ConditionOfRelease`'s own
figure documents itself as *"a boolean **on a date**, not a permanent property"*; and the input shape
can express its loss, because `GainfulEmployment` is a two-cell union and a Person who ceased
gainful employment at 61 and later went back to work is stated `{ ceased: false }` and takes no
ground at all. Such a Person is handed a 10% ceiling in a year in which satisfaction had already
switched it off. Same direction as T118, same invisibility, and — unlike T118 — **the fact needed to
detect it is one the model can already hold**. Recorded here rather than decided: whether a
cessation that has been reversed still satisfies the *"unless"* is a reading of SISR reg 6.01(7),
which (read 2026-09-29, O59 closed) says when retirement *occurs* and nothing about a later return
to work. **`PreservedBenefitError` hangs on the identical
premise from the other side** — the same reversed cessation makes that refusal fire where, on the
permanent reading, the benefit was already released — so one unanswered question decides both an
over-permissive and an under-permissive outcome, and this section says nothing either way. See
Finding 2 of its row above.

**Answered 2026-09-29 (retire flow S3, return to work built).** For the money accrued by the
cessation, the reversed cessation still satisfies the ground: SISR reg 6.12(1) makes the benefits
preserved *"at that time"* unrestricted non-preserved, and reg 6.18(2)(a) ties cashing to what had
accrued when the condition was satisfied. New contributions after the return are preserved until the
next cessation at 60 or older (item 101) or 65 (item 106). An account-based pension is not gated and
keeps paying. A stop after the return is its own cessation (`workSpells`), which the fund-earnings-tax
interest also reads.

**RF-1 (built 2026-09-30): the released amount is a FIXED dollar figure, per Person per account.** SISR
6.03 and 6.10(1) make the amount unrestricted at the stop a dollar amount, and 6.18(2) preserves
everything that accrues after it, earnings on the released money included. So `project()` keeps, for a
stop that met a condition of release (the `back at work` note's `freed` test), each non-pension account's
balance at the START of the stop month (before that month's growth and Guarantee), takes off every draw
until the return, and cuts it to the balance on the return. While back at work it is cut to the balance
after every debit (fees, insurance, fund tax, Div 293, losses) and reduced by every draw; it never grows.
It is cleared at the next stop (which captures its own), at death and at the automatic release (65).
`gainfulEmploymentAsAt` still says `{ ceased: false }`; the entry path and limb 5 give the gate the
freeing stop's cessation and `min(released, balance)`, and write back the real balance less what was
paid, and `accessibleWealth` adds the same `min(released, balance)`. A lump sum above it is capped to it,
on the cap-at-balance precedent. **Residual, the safe direction:** a stop before the plan starts, or a
return before it, releases nothing here (all of it locked while back at work), and growth between the
stop and the return is read as preserved on the strict reading.

**RF-2 (built 2026-09-30): a transition to retirement pension started after a return to work.** Lawful:
SISR Sch 1 item 110 turns on preservation age, not on work, so a `TTR_START` is refused only while the
Person is stopped (the latest `workSpells` change on or before its day is a stop), and, after those,
from an account the first stop already switched (`retirementSwitches`' `switches` slots, `retireDay` on
or before the start). Rulings: it converts at the NEXT stop after its start, or at 65, whichever is
first, and that stop converts only the TTR account. `keepInAccumulationAtRetirement` governs the first
switch only; such a TTR converts at its stop regardless, including for a Person who holds a pension from
before the plan. The conversion is tested against the transfer balance cap exactly as a TTR converting at
its Retire is: the TTR's own balance plus what earlier conversions in the walk credited; over the cap it
stays a TTR until 65. Where that stop is itself the first switch (an earlier stop before 60), the TTR
switches with the other accounts and is named in the `switched` note. **Left as it was:** a start with
no stop before it takes the old path, so a TTR started before the first stop on an account kept in
accumulation ignores every stop and runs to 65. **Residual:** the page cannot check which account a
cutting-down answer names against the switch, only that one is left; the door refuses a switched one by
name.

**RF-3 (built 2026-09-30): a `TTR_START` with an `amount` opens its own account.** The walk adds a nil
accumulation account after the Person's stated ones (`ttrAccountsOpened`), names the start at it, and
on the first of the start's month moves `min(amount, the source's balance)` in, before the switch and
cap test, RF-1's released amounts, the means test and the Sch 7 determination read a balance. The
source stays accumulation. **Refusals that change:** with an amount, the door no longer refuses the
account the employer pays into, nor a Person's only accumulation account (`checkTtrStartTargets`), and
the page's `ttrRefusal` needs one account still building up, not two; without an amount every refusal
stands (the only-account one now also says an amount can be stated). An RF-2 start with an amount is
tested against the first stop's switch on its SOURCE. **Rulings:** the new account copies the source's
stated fee fields (a second administration fee: conservative) and none of its insurance; RF-1's released
amount stays with the source (understates access); a `TTR_RATE_CHANGE` naming the source changes the new
account; until its month the new account is in no switch, no back-at-work list and no limb 5 note, and
from month 0 it is closed to the Guarantee and LISTO. A capped move is reported in the month's note.

**Everything reachable through this module now has a row, and the list of what does not is worth
keeping.** `ttrPaymentRange` calls `conditionOfRelease` and then `minimumDrawdown`, and both can
refuse on their own grounds. Until 2026-09-10 four of those refusals were in the P3-26 quarantine
and this paragraph was where a reader had to find them; all four —
**`PensionNotCommencedError`**, **`PensionBalanceDateError`**, **`MidYearProportioningError`** and
**`CessationBeforePreservationAgeError`** — are now rows above, and per their own findings only
the **last two** can actually be reached through this module. `ConditionOfReleaseItemNotIdentifiedError`
(§3.10.8) was never reachable from here and was deleted on 2026-09-29 (LR-2): nothing in
`ttrPaymentRange` calls `schedule1ItemFor`, so the item question is never put on this path. **Three further guards in this module have no name at all** — a bare `RangeError` at
module load if the 10% is not exact at the integer scale, a bare `RangeError` if the ceiling's
multiplication leaves safe-integer range, and `assertIsoDate`'s — so they sit outside R8's naming
discipline and outside the reach of the test that reads this table, the same shape as §3.5.1's fifth
guard.

**What §3.9 does not record, beyond the eight rules above.** The P3-26 finding running in the other
direction is **not** unanimous here, unlike §3.5.1: **three** of the eight refusals decline a rule
this section states in terms — the *"when it falls away"* row and the TTR *"which balance"* row,
both above in the TTR table, and Schedule 7's own *"Which balance"* row in the minimum table — and
the other **five** decline a rule that is **absent or undetermined**. Two of the five are the years
before commencement, on the ceiling side and on the floor side, which nothing here addresses; one
is the **second proportioning event**, which the ATO asserts and the Schedule as read supplies no
clause for (§8, O39); one is the **cashing restriction on the unreleased side**, which the Access
table states only in its released direction; and the last is the only one of the eight whose
missing rule is a **tie-break** rather than a silence — the 60-to-64 window, where this section's
words and reg 6.01(7)(b)(ii) (read 2026-09-29, O59 / U28 closed) disagree unless the trustee is
satisfied of an intention never to work again — a fact the model does not hold. What is missing in **all eight** cases is the same thing: this section states the rules
and never states that the engine **refuses** rather than computing, so which of these eight
conditions is a hard stop and which is a caveat was, until this table, a decision a reader of the
register could not discover.


### 3.10 The transfer balance cap — ITAA 1997 Div 294, and the retirement-phase entry test in s 307-80

**Added 2026-09-09** by `docs/research/p3-transfer-balance-cap.md` (P3-9), read off the ATO Legal
Database (ITAA 1997 `PAC/19970038`; TAA 1953 `PAC/19530001` and `PAC/19530001/Sch1-…`; SIS Regulations
1994 `REG/19940057`; *Income Tax Assessment (1997 Act) Regulations 2021* `REG/20210206`), the Federal
Register of Legislation (`C2016A00080`), the **ABS SDMX API** (CPI, All Groups, weighted average of 8
capital cities), and two **public rulings** — **LCR 2016/9** *Superannuation reform: transfer balance
cap and transition-to-retirement reforms* and **TR 2013/5**. Every row is **retrieved 2026-09-09**
unless it says otherwise.

**This is one section merged from four research chunks** (§A the cap and its indexation, §B credits and
debits, §C excess and enforcement, §D the entry test and the TRIS conversion), each of which drafted a
competing §3.10. Where the chunks disagreed, **nine user rulings dated 2026-09-09 (R1–R9)** settled the
question; each is marked **RULED** below, with the reasoning, because the reasoning is what stops it
being reopened by accident.

**What this section does not carry.** The §1 trap rows (**T58–T125**) and the §8 open items
(**O40–O65**) and unknowns (**U9–U33**) are tabled separately; this section cites them by ID only. §3.1
carries the **general** cap amount and its derivation; §3.9 carries the Schedule 7 minimum and the TTR
10% ceiling, and **§3.9's TTR range is where a stream comes from — §3.10 is what it becomes**.

---

#### 3.10.1 Two caps, and only one of them is config

| | **General** transfer balance cap | **Your** (personal) transfer balance cap |
|---|---|---|
| Scope | one national figure per FY | **per Person** |
| FY2026-27 | **$2,100,000** (§3.1) | anything from **$1,600,000** up |
| Kind | **config** — CPI-indexed, **s 960-265 item 10A** | **per-Person persisted state**, not config |
| Authority | s 294-35(3) + s 960-285 | s 294-35(1), (2); s 294-40 |

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Personal cap — seeding | seeded **once**, from the general cap for the financial year in which the Person's **transfer balance account starts** | — | **constant** — structural | ITAA 1997 s 294-35(1) | 2026-09-09 | primary-verified |
| Personal cap — carry-forward | **s 294-35(2) carries LAST YEAR'S PERSONAL CAP forward and never re-reads the general cap.** A Person who seeded at $1,600,000 in FY2017-18 and never qualified for an increase still has a **$1,600,000** cap in FY2026-27 — **$500,000 below** the general cap. s 294-40 is the only thing that ever moves it | — | **constant** — structural | ITAA 1997 ss 294-35(2), 294-40 | 2026-09-09 | primary-verified |
| Account start day | the **later** of 1 July 2017 and the day the Person **first starts to be** a retirement phase recipient | — | **constant** — structural | ITAA 1997 s 294-15(2) | 2026-09-09 | primary-verified |
| Account end | **death of the retirement phase recipient, and nothing else.** Commuting every pension does not close it; s 294-15(1) reads *"or have at any time been"* | — | **constant** — structural | ITAA 1997 ss 294-45, 294-15(1) · LCR 2016/9 ¶12 | 2026-09-09 | primary-verified |
| General cap, FY2026-27 | **$2,100,000** — derived from the ABS index numbers, not copied. See §3.1 for the full derivation | 2026-27 | **config** — CPI-indexed | ITAA 1997 s 294-35(3) + s 960-265 item 10A + s 960-285 + s 960-280(1) + ABS CPI Dec 2016 = **76.38**, Dec 2025 = **100.32** | 2026-09-09 | primary-verified — **the same arithmetic reproduces all nine published general caps, 2018-19 through 2026-27** |
| General cap beyond FY2026-27 | **not derivable.** FY2027-28 needs the December 2026 quarter CPI, published late January 2027 | 2027-28 | — | — | 2026-09-09 | **gap, recorded not filled — O40.** It must become a Setting driven by a CPI assumption run through the s 960-285 machinery, **never a hard-coded $100,000 step** (T70, T72) |
| Spouse cap pooling | **does not exist.** Two accounts, two caps; Div 294 is drafted wholly per individual | — | **constant** — structural | ITAA 1997 ss 294-15, 294-30, 294-35 | 2026-09-09 | the per-individual drafting is **primary-verified**; **the non-existence of an aggregation provision is a labelled inference from the absence of one** (T86) |
| Negative transfer balance | permitted; **no consequence** | — | **constant** — structural | ITAA 1997 s 294-30(2) Note 2 · LCR 2016/9 ¶20 | 2026-09-09 | primary-verified |

---

#### 3.10.2 Proportional indexation — ITAA 1997 s 294-40

```
# at the start of each financial year, per Person
capThisFY = capPrevFY                                              # s 294-35(2)
if accountStartFY != thisFY                                        # s 294-40(1) parenthetical
   and generalCap[thisFY] > generalCap[prevFY]                     # s 294-40(1)(a)
   and not hasEverExceededCap:                                     # s 294-40(1)(b) — latching
    increase  = generalCap[thisFY] - generalCap[prevFY]            # the "indexation increase"
    unusedPct = 100 if highestEndOfDayBalance < 0 else \
                100 - floor(100 * highestEndOfDayBalance / capOnHighestBalanceDay)  # (2)(c) FLOOR, then (2)(d)
    capThisFY = capPrevFY + unusedPct * increase / 100
```

**Corrected 2026-09-16 (P3-9 chunk 2), and the superseded line is quoted once here so the error is
not re-derived.** The negative-balance limb read `usedPct = 100 if highestEndOfDayBalance < 0`,
which subtracts to **0%** unused — the exact opposite of what s 294-40(3) says, and contradicted by
**three** things on this page at the time it was written: the same line's own trailing comment
(`(3) => 100 if negative`), the operand table's *"negative balance | unused percentage **taken to
be 100%**"* row below, and §3.10.9's own fixture (*"unused 100% → +$100,000 → $2,100,000"*).
Executing the pseudocode literally left that fixture Person at **$2,000,000**. The build implements
**the statute, not the pseudocode**, and routes the negative case straight to 100% unused rather
than through a *used* percentage s 294-40(3) never computes. **A hand-worked expected value is only
as good as the spec behind it** — this one was caught because §3.10.9's fixture and §3.10.2's code
disagreed, which is the only reason a reader would look twice.

| Operand | Definition | Provision | Confidence |
|---|---|---|---|
| numerator | the **highest transfer balance at the end of any day** from account start to the end of the **previous** FY — a **high-water mark that never falls** | s 294-40(2)(a) | primary-verified |
| the day | the **earliest** day the maximum was attained, where it was attained on more than one day | s 294-40(2)(b) | primary-verified |
| denominator | the **personal** cap **on that day** — not the general cap, not the current cap | s 294-40(2)(c) | primary-verified |
| rounding | the **used** percentage is **floored to a whole number BEFORE the subtraction**, so the unused percentage rounds **up**. The direction favours the taxpayer and is load-bearing | s 294-40(2)(c), (d) | primary-verified |
| negative balance | unused percentage **taken to be 100%** | s 294-40(3) | primary-verified |
| the multiplicand | the unused percentage multiplies the **indexation INCREASE**, never the general cap | s 294-40(2) | primary-verified (T63) |

**Invariant.** A personal transfer balance cap is always a whole multiple of **$1,000**, and
`unusedCapPercentage` is always an integer in **[0, 100]**. A cents-bearing personal cap is always a
bug. *(Derived by arithmetic from primary-verified provisions — a labelled inference, not a quoted
rule.)*

**Two ways to lose indexation, and they are different rules.** An end-of-day balance that **exceeded**
the then-current cap disapplies s 294-40 outright and permanently (s 294-40(1)(b)); one that merely
**equalled** it leaves the section applying but with a **0%** unused percentage, which is equally
permanent because the high-water mark never falls. LCR 2016/9 ¶17 collapses them — *"ever equalled or
exceeded … you will permanently lose your entitlement"* — and **¶76** warns the bar is **not** the same
as having had excess transfer balance: *"even though your excess transfer balance is **disregarded** for
the transitional period … your transfer balance **has still exceeded** your transfer balance cap and you
will **not** be entitled to increase your transfer balance cap"*. So a Person can have been relieved of
excess transfer balance tax and still be barred from indexation. Traps **T67**, **T68**.
Confidence: **primary-verified** on the provisions, **ruling-verified** on the collapse of the two
routes into one bar.

**s 294-40 does not apply in the seeding year at all** — s 294-40(1)'s parenthetical excludes *"the
financial year in which you first start to have a transfer balance account"*. A Person who starts a
pension on 1 July 2026 has a personal cap of exactly **$2,100,000** (T62).

---

#### 3.10.3 Highest-ever tracking — the high-water mark

The crux of this section, and the field two independent research routes arrived at separately (§A from
the indexation formula's operands, §B from what a user can be asked for).

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| The high-water mark | **monotone non-decreasing**, over every day from account start to the end of the previous FY. **Never reduced by a later debit** — commuting the whole pension to nil leaves the numerator where it was | — | **constant** — structural | ITAA 1997 s 294-40(2)(a) | 2026-09-09 | primary-verified (T58, T59, T84) |
| Measured at the **END of a day** | never intraday. A credit and a debit on the **same day** net out and the intraday spike never happened | — | **constant** — structural | ITAA 1997 ss 294-30(1), 294-230(2) · **LCR 2016/9 ¶51** (Alice: same-day credit and debit on 1 July 2017 — she must have **never** had an excess and must **remain** eligible for indexation) | 2026-09-09 | primary-verified on the provisions; **ruling-verified** on the worked application (T66) |
| The tied day | write `highestBalanceDay` only on a **STRICT** increase, never on a tie — s 294-40(2)(b) takes the **earliest** of the tied days | — | **constant** — structural | ITAA 1997 s 294-40(2)(b) | 2026-09-09 | primary-verified (T71) |
| May be negative | the high-water mark may itself be negative; s 294-40(3) then takes the unused percentage to be 100% | — | **constant** — structural | ITAA 1997 ss 294-30(2) Note 2, 294-40(3) | 2026-09-09 | primary-verified |
| Do **not** cache the percentage | the unused percentage is recomputed from the all-time high at **every** indexation event; it is not carried forward | — | **constant** — structural | ITAA 1997 s 294-40(2) | 2026-09-09 | primary-verified (T64) |

**State the engine must persist, per Person, across financial-year boundaries** — this is also the
Settings block of §3.10.7, because for a Person whose account predates the forecast every one of these
is user-supplied:

| # | Field | Starting point | Updated |
|---|---|---|---|
| 1 | `transferBalanceAccountStartDay` | later of 1 Jul 2017 and the first retirement-phase-recipient day | once (s 294-15(2)) |
| 2 | `personalTransferBalanceCap` | general cap for the FY containing the start day | each 1 July (ss 294-35(2), 294-40) |
| 3 | `transferBalance` (may be negative) | 0 | at each s 294-25 credit / s 294-80 debit |
| 4 | `highestEndOfDayTransferBalance` (**monotone**) | the first day's closing balance | `max()` at the **end of every day** |
| 5 | `highestBalanceDay` | the account start day | only on a **strict** increase (T71) |
| 6 | `personalCapOnHighestBalanceDay` | the seed cap | snapshotted with field 5 |
| 7 | `hasEverExceededCap` (**latching**) | `false` | end of every day, against **that day's** cap |

**Order of operations at a financial-year boundary:** the s 294-40 increase is guarded on
`hasEverExceededCap` **as at the start of the financial year**. An exceedance during FY *n* does not
claw back the increase already granted on 1 July of FY *n*; it bars FY *n+1* onwards.

**Field 6 exists because field 5 is not enough.** The denominator in s 294-40(2)(c) is the Person's
**personal** cap on the high-water day, and recomputing it later would need the Person's entire cap
history. **Field 7 is persisted, not derived**: the derivation `field 4 > field 6` rests on an
assumption about Subdiv 294-E (child recipients) that has never been read — **U12 / O43**.

---

#### 3.10.4 The account is a transaction ledger valued at commencement, not a balance

**The one sentence that governs everything else.** The transfer balance is a **cumulative record of
capital moved into retirement phase**, not a valuation of the retirement-phase assets. It moves only on
the five credit events in s 294-25(1) and the eight debit events in s 294-80(1). Between events it is
**inert**.

> **A pension started at $1.6m and now worth $900k still carries a $1.6m transfer balance and ZERO
> remaining cap space.** And a pension started at $1.1m and now worth $2.0m still carries a $1.1m
> transfer balance and has headroom a balance-based estimate would deny. **The error from using the
> balance is unsigned and unbounded in both directions**, which is why there is no conservative
> approximation available (§3.10.7). Traps **T65**, **T73**, **T75**.

**Credits — s 294-25(1), the exhaustive table** (*"The following table sets out when a credit arises …
and the amount of the credit"*):

| # | Trigger | Value credited | Day | Modelled? |
|---|---|---|---|---|
| **1** | retirement phase recipient **just before 1 July 2017** | value just before 1 July 2017 | 1 July 2017; reversionary: last day of the 12 months | **no** — pre-forecast history is a Setting |
| **2** | **you start to be** a retirement phase recipient on a day (the **starting day**) on or after 1 July 2017 | **the value ON THE STARTING DAY** of the superannuation interest that supports the stream | **on the starting day**; reversionary: at the end of 12 months, still at the **starting-day** value | **YES — the only credit this tool computes** |
| **3** | **excess transfer balance at the end of a day** | excess transfer balance earnings for that day | at the **start of the next day** (daily capitalisation) | **no** — the engine refuses the year (R1) |
| **4** | an **LRBA repayment** in a small superannuation fund (s 294-55) | the increase in value caused by the payment | at the time of the payment | **no** — refuse |
| **5** | regulations: **reg 294-25.01** (consideration for a deferred stream), **294-25.02** and **294-25.03** (capped defined benefit commutations and successor-fund transfers) | per the regulation | per the regulation | **no** — none touches an ordinary account-based pension |

**Debits — s 294-80(1)**:

| # | Trigger | Value debited | Day | Modelled? |
|---|---|---|---|---|
| **1** | a **superannuation lump sum** received because a retirement-phase stream is **commuted, in full or in part** | the amount of the lump sum | **at the time you receive it** | **YES — the only debit this tool computes** |
| **2** | a **structured settlement contribution** | the amount | later of the contribution and the account start | **no** — refuse |
| **3** | s 294-85 **reduced superannuation** (fraud with a conviction; bankruptcy) | per s 294-85 | per s 294-85, **and only on notification in the approved form** | **no** — refuse |
| **4** | s 294-90 **payment split** | the split proportion of the value on the day | later of the operative time and the account start, **on notification** | **no** — refuse |
| **5** | stream stops being in retirement phase under **s 307-80(4)** (provider missed the 60 days) | **the value of the WHOLE supporting interest**, at the end of that period | at the end of that period | **no** — refuse |
| **6** | stream stops being in retirement phase at a **stop time**, *"but items 1 and 5 do not apply"* | the value just before the stop time | at the stop time | **no** — refuse |
| **7** | the Commissioner gives a **s 136-70** non-commutable excess notice | the amount **stated in the notice** | when the notice issues | **no** — refuse |
| **8** | regulations: **reg 294-80.01** (CPI-exclusive reduction in a capped defined benefit stream), **294-80.02** (deferred streams); **reg 294-80.03** switches items 5 and 6 off for those streams | per the regulation | per the regulation | **no** |

**The two counter-intuitive negatives — and they do NOT have the same epistemic status.** Preserving
the difference is the point: one is a definitional exclusion, the other is an argument from absence.

| Negative | Value / rule | Source | Confidence |
|---|---|---|---|
| **Investment earnings create NO credit** (and losses no debit) | there is **no item** in the s 294-25(1) table triggered by the interest growing. Item 3 is triggered by *excess transfer balance* and its amount is *notional* earnings on the excess; item 4 needs an LRBA repayment in a small fund | s 294-25(1), read as exhaustive — all five items and all three item-5 regulations retrieved · LCR 2016/9 ¶¶24, 24A, 27, 39F | **primary-verified as an exhaustive-table reading, and corroborated in terms by a public ruling — but the negative itself is an ARGUMENT FROM THE ABSENCE OF A TABLE ITEM.** It must never be recorded as bare `primary-verified` |
| **A pension drawdown creates NO debit** | s 294-80(1) item 1 requires a **superannuation lump sum**, and s 307-65(1) defines one as *"a superannuation benefit that is **not** a superannuation income stream benefit"*. A pension payment is an income stream benefit, so it can never satisfy item 1 | ITAA 1997 ss 294-80(1) item 1, 307-65(1), 307-70(1) · LCR 2016/9 ¶¶24A, 24B, 25 | **primary-verified — a POSITIVE DEFINITIONAL EXCLUSION, not an absence.** Stronger than the row above, and the two must not be flattened into one label |

**Consequence for advice, not just for arithmetic.** Because a drawdown is not a debit, *"draw down
more"* is **never** a remedy for an excess; the only remediation the tool may ever emit is a
**commutation** (T76).

**Valuation — the day implementers get wrong.**

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| The item 2 credit value | *"the **value on the starting day** of the superannuation interest that supports"* the stream. **Not the 1 July value, not the prior 30 June balance, not the Total Super Balance.** The only day 1 July is right is when the pension actually commences on 1 July | — | **constant** — structural | ITAA 1997 s 294-25(1) item 2 | 2026-09-09 | primary-verified (T77) |
| "Value" of an account-based interest | s 307-205(b): *"the total amount of all the superannuation lump sums that could be payable from the interest at that time"*. reg 307-205.02(2)(b)(ii) **excludes** account-based streams from the regulation method, so limb (a) is empty and (b) governs | — | **constant** — structural | ITAA 1997 s 307-205 (as amended by No 8 of 2026, eff 1 Apr 2026) · reg 307-205.02(2) | 2026-09-09 | **primary-verified as to the statutory chain; the LAST STEP — "the whole interest is commutable, therefore value = balance" — is a LABELLED INFERENCE** (U16 in §B's numbering; O56 / O62 for `*value` generally) |
| A one-shot photograph | *"Once a superannuation income stream has commenced and a credit arises …, subsequent changes in the value of the supporting superannuation interest do not affect your transfer balance"* | — | **constant** — structural | LCR 2016/9 ¶24, worked at ¶27 (Darius: $1.1m at 1 Jul 2018, interest worth $1.05m at 1 Jul 2019, transfer balance **still $1.1m**) | 2026-09-09 | **ruling-verified** |
| Partial commutation | debit = **the lump sum**, on the day it is **received**. The same cashflow is a debit or nothing **depending on the member's act** — it cannot be inferred from size | — | computed, **on a user characterisation** | ITAA 1997 ss 294-80(1) item 1, 307-65(2) · LCR 2016/9 ¶¶41, 43 | 2026-09-09 | primary-verified. Default the characterisation to `pensionPayment` — the direction that does not invent headroom (T81) |
| A full commutation is **item 1, not item 6** | item 6 is expressly conditioned on *"items 1 and 5 do not apply"* | — | **constant** — structural | ITAA 1997 s 294-80(1) items 1, 6 | 2026-09-09 | primary-verified (T82) |
| Capped defined benefit income streams | **REFUSED, not modelled.** Special value is annual entitlement **× 16** (lifetime) or × remaining term (life expectancy / market linked), and s 294-140 replaces the excess rule with a lesser-of-two-excesses test | — | refusal | ITAA 1997 ss 294-125, 294-130, 294-135(1)–(3), 294-140, 294-145 · TAA 1953 Sch 1 s 136-80(2) | 2026-09-09 | primary-verified as to the machinery; **Subdiv 294-D was read, Subdiv 294-E (child recipients) was not — O43, O54, O55** (T85) |

**Cross-reference to §3.9, and a helper that must NOT be shared.** The transfer balance credit reads the
**commencement-day** value **once, ever**, and never reads 1 July at all — but *"commencement day"* here means
**the s 294-25(1) item 2 STARTING DAY, which for a converted TRIS is the conversion day and not the day the
stream started paying** (added 2026-09-16 by P3-9 chunk 5b-5, which built the first consumer that could confuse
them). A TRIS commences in **accumulation** phase: s 307-80(3) excludes it from retirement phase on that day, so
no credit arises then and none may arise for it later. Crediting both days would double-count one interest,
against the one-shot photograph above. `creditTrisConversionUnderItem106` never reads
`StatedStreamSettings.commencementDay`, and `test/core-tris-conversion-credit.test.mjs` asserts the absence over
the module's executable text rather than trusting this sentence; the Schedule 7 minimum reads
the commencement-day balance in the commencement year and the **1 July** balance in every later year
(T56). Different rules, different days. A shared *"pension balance as at"* helper is a bug waiting to
happen. The `pensionPayment` / `partialCommutation` characterisation, by contrast, **is** one input read
by both — a `partialCommutation` produces a debit here **and** does not count toward the §3.9 minimum
— and must be read consistently by both (**O47**).

---

#### 3.10.5 The settled refusal — the engine will not project a breaching year

> **RULED (R1), 2026-09-09.** The engine **hard-refuses to project any financial year containing an
> end-of-day cap breach** — any year in which a Person's transfer balance exceeds their transfer
> balance cap at the end of any day. Not a warning, not a silently-modelled tax: a **named refusal**,
> thrown at the point the excess would arise. **Excess transfer balance tax is NOT implemented.**
> **But the latching `hasEverExceededCap` flag is built regardless.**

**Why, in one line:** *"warn and continue" has no conservative form.* Continuing forces the model to
decide where commuted capital goes, and the default an implementer naturally reaches for — leave it at
0% ECPI and add a little tax — **flatters the household by 15% of earnings, forever**. Refusal is the
only option whose failure mode leaves the tool **understating**. The ruling was reached independently
from two directions: from the breach side (§C) and from the indexation side (§A).

The arithmetic behind it, recorded so a reversal has to argue with the numbers:

| Consequence of a $200,000 excess held for 90 days | Amount |
|---|---|
| Excess transfer balance tax at 15% | **$857** |
| Permanent loss of proportional cap indexation, s 294-40(1)(b) | **every future indexation step on the personal cap, for life** |
| Capital forced from 0% ECPI to 15% accumulation on correction | **15% of earnings on the commuted capital, every year, forever** |

Modelling the $857 and calling the breach handled is the **flattering** error.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **The refusal's trigger** | an **end-of-day** transfer balance exceeding the personal cap. **Do NOT refuse** on a negative transfer balance (s 294-30(2) Note 2: *"There is no consequence for having a negative transfer balance"*), and **do NOT refuse** on a large total super balance — only on retirement-phase capital | — | **constant** — structural | ITAA 1997 ss 294-30(1), (2), 294-230(2) | 2026-09-09 | primary-verified |
| **The refusal's message** | must name **the amount by which the cap is exceeded**, **the personal cap it was tested against**, and **the s 294-40(1)(b) permanent-indexation consequence** — because that consequence is what makes the answer *"declare less capital as retirement phase"* rather than *"accept the tax"* | — | — | R1 · §C.8 | 2026-09-09 | **RULED** |
| **`hasEverExceededCap` — latching, and mandatory** | s 294-40(1)(b) requires that *"**at no time before the start of that financial year** has the transfer balance … **at the end of a day** exceeded your transfer balance cap"*. **One end-of-day excess, of any size, at any time, permanently disqualifies the Person from every future indexation increase.** Correcting the excess does not restore it. It is a bare boolean over the Person's entire history | — | **constant** — structural | [ITAA 1997 s 294-40(1)(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-40) | 2026-09-09 | primary-verified |
| The flag's only live write path | **the user-supplied history.** Under R1 a projected day that would set the flag throws instead, so the end-of-day test becomes the **detector that fires the refusal** and the Setting is what feeds the flag. **T67's fixture must therefore be expressed as Setting-fed history, not as projected days** | — | — | R1 read with §A.3 | 2026-09-09 | **RULED** — consequence of R1 |
| Excess transfer balance tax | **NOT IMPLEMENTED.** Recorded and not built: the daily-compounding earnings formula and the two determination-period formulae, the **15%** first-breach and **30%** subsequent-breach rates, the "subsequent breach" test, the 21-day payment timing, the finding that this tax **cannot be paid from superannuation**, the TAA 1953 Sch 1 Div 136 correction chain, the two-sided s 294-50 asymmetry, and the s 136-70 safety valve | — | **recorded, not implemented** | *Superannuation (Excess Transfer Balance Tax) Imposition Act 2016* (`C2016A00080`) · ITAA 1997 ss 294-230, 294-235 · TAA 1953 s 8AAD(1), Sch 1 Div 136, ss 131-5, 131-45 · full detail in `docs/research/p3-transfer-balance-cap.md` §C | 2026-09-09 | primary-verified **as research**; traps T87–T114 are the fixtures a reversal of R1 would have to satisfy, **not tests to write now** |
| **One adjacent rate trap, live even under the refusal** | the **Div 296** GIC rate is TAA 1953 **s 8AAD(1A)**, base **+3**, inserted 1 Apr 2026. s 294-235(2)(a) points at **s 8AAD(1)**, base **+7**. Wherever a GIC rate is stored for §3.7, the record must say **which subsection** it came from | — | **constant** — structural | TAA 1953 s 8AAD(1), (1A) | 2026-09-09 | primary-verified (T91) |

**What is given up by accepting R1.** The tool cannot answer *"what if I deliberately over-transfer?"* —
a question no household asks. It cannot model an inherited or reversionary-pension breach that a real
household could genuinely be walked into by a death; that case is a **separately named** refusal
pointing at Subdiv 294-D and **O54**, not a silent gap.

---

#### 3.10.6 The retirement-phase entry test — ITAA 1997 s 307-80 — and the TRIS conversion

**Phase is not a property of an account. It is a test applied to an income stream at a time**, and
§3.1's two rates hang off it: s 307-80 decides phase → **s 307-75(1)** turns a retirement-phase
stream's benefits into *RP superannuation income stream benefits* → **s 295-385(3)(a)** makes the assets
supporting *those* benefits segregated current pension assets, whose income s 295-385(1) exempts. A TRIS
sits at 15% because **No 81 of 2016 Sch 8 item 1** substituted *"RP superannuation income stream
benefits"* into s 295-385(3)(a), effective 1 January 2017 and applicable from 2017-18.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **The positive limb** | a superannuation income stream is in the **retirement phase** at a time if a superannuation income stream benefit **is payable** from it at that time | — | **constant** — structural | [ITAA 1997 s 307-80(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F307-80) | 2026-09-09 | primary-verified |
| **The deferred limb** | also in retirement phase if it is a **deferred** stream, a benefit **will be** payable after that time, and the person has satisfied SISR Sch 1 item **101, 102A, 103 or 106**. **No notification is required on this limb** | — | **constant** — structural | ITAA 1997 s 307-80(2) | 2026-09-09 | primary-verified — **not modelled; refuse** |
| **The TRIS carve-out is a CONJUNCTION** | a stream from which a benefit is payable is **not** in retirement phase only if **(a)** it is a TRIS or one of the four other listed kinds, **AND (aa)** the recipient is not a reversionary beneficiary, **AND (b)** the condition/notification test is failed. **Any one of the three failing leaves the stream IN retirement phase** | — | **constant** — structural | ITAA 1997 s 307-80(3) | 2026-09-09 | primary-verified (T115) |
| **(b), the condition/notification test** | failed if **(i)** the recipient has satisfied **none** of items 101/102A/103/106, **or (ii)** has satisfied item **101, 102A or 103** but **has not notified the superannuation income stream provider of that fact** | — | **constant** — structural | ITAA 1997 s 307-80(3)(b) | 2026-09-09 | primary-verified |
| **Attaining 65 converts a TRIS AUTOMATICALLY, with NO notification** | (3)(b)(i) points at **paragraph (2)(c)** — all four items — while (3)(b)(ii) points at **subparagraphs (2)(c)(i), (ii) or (iii)** — three of the four. **Item 106 is in the first list and not the second**, so for a member who has turned 65 both limbs of (b) are false and there is nothing left to notify. Conversion is on the **65th birthday** | — | **constant** — structural | ITAA 1997 ss 307-80(2)(c), (3)(b) · [SISR Sch 1 Pt 1 item 106](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch1) *"Attaining age 65 — Nil"* · **LCR 2016/9 ¶15** (first bullet, no notification words) and **Example 1A ¶¶30A–30B** | 2026-09-09 | **RULED (R6): `inference from an express enumeration` — specifically, an argument from the ABSENCE of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — CORROBORATED BY A PUBLIC RULING. It is NOT bare `primary-verified`, and must never be recorded as such.** What makes it stronger than a bare negative: (i) the enumeration is **express and closed** — (b)(ii) lists three subparagraphs by number, so the omission is a drafting choice, not a silence; (ii) it sits **eight lines below** a paragraph that enumerates all four, so the drafter had the fourth in hand; (iii) there is **no residual or catch-all limb** in (3)(b) for it to fall into. **What is still missing, and why the label is not upgraded:** no primary provision says in terms that attaining 65 converts a TRIS without notification — it is read off a list and confirmed by a ruling. **Do not narrow this label.** T117, O50, O65 |
| **Retiring is NOT enough; the NOTIFICATION is the conversion** | for items 101, 102A and 103 the stream enters retirement phase on the day the provider is **notified**, not the day the condition was satisfied. **A fortnight is worth a year:** retiring in one FY and notifying in the next moves the account-start year, the personal cap fixed by s 294-35(1), the valuation day of the credit, and the year the fund's earnings become exempt | — | **constant** — structural | ITAA 1997 s 307-80(3)(b)(ii) · **LCR 2016/9 Example 1B ¶30D**: retired 30 June 2019, notified 15 July 2019, *"The TRIS is in the retirement phase on 15 July 2019 (the time of notifying …)"* | 2026-09-09 | primary-verified as to the requirement; **the DAY is fixed by a public ruling's worked example — `ruling-verified`** (T79, T116) |
| **The notification is a USER-SUPPLIED FACT and is PER-STREAM** | s 307-80(3)(b)(ii) names *"the superannuation income stream provider **for the superannuation income stream**"*. One Person with two TRISs may have notified one provider and not the other, so the fact belongs **on the interest, not on the Person** — a `ConditionOfRelease`, which carries no stream identity, cannot hold it. It is **an act, not an anniversary**: no date the model holds produces it | — | **Setting** — required, never defaulted | ITAA 1997 s 307-80(3)(b)(ii); contrast ss 294-85(1)(b), 294-90, which **do** say *"in the approved form"* | 2026-09-09 | primary-verified as to the words; **the absence of any form, deadline, content or evidentiary rule is `unverified` — U27 / O63** |
| **A counter-source that would mislead an implementer** | **TR 2013/5 ¶71B** paraphrases s 307-80(3) and **drops the notification requirement entirely** (*"will not be in the retirement phase unless the person has met a specified condition of release"*). On the operative text that paraphrase is **wrong** for the retired-but-not-notified case | — | — | TR 2013/5 ¶71B and fn [36E], against ITAA 1997 s 307-80(3)(b)(ii) and LCR 2016/9 ¶15 | 2026-09-09 | recorded as a **known-bad shortcut**: an implementer who reaches for the shorter sentence exempts a whole year's fund earnings that are taxable |
| **The reversionary carve-out** | a TRIS paid to a **reversionary beneficiary** is in retirement phase regardless of that beneficiary's own conditions of release and notifications, because (3)(aa) fails and the conjunction collapses | — | **constant** — structural | ITAA 1997 s 307-80(3)(aa), inserted by **No 8 of 2019** Sch 8 item 43, eff 1 Apr 2019 · LCR 2016/9 ¶15 third bullet | 2026-09-09 | primary-verified — **REFUSED in code**: death benefits, the s 294-25(1) item 2(b) 12-month reversionary deferral, Subdiv 294-E and SISR reg 6.21 are all absent from this register, and modelling (aa) without them gives **0% fund tax with no cap check for a year — the most flattering wrong answer available** |
| **The commutation-authority carve-out** | a stream specified in a Commissioner's commutation authority whose provider fails to pay within 60 days is not in retirement phase for that income year **and every later one** | — | **constant** — structural | ITAA 1997 s 307-80(4) | 2026-09-09 | primary-verified — **not modelled; refuse** |
| **Div 294 and Subdiv 295-F can disagree** | for transfer balance cap purposes only, s 294-50(3) requires you to *"disregard the operation of subsection 307-80(4), if the time is before the end of the 60-day period"* — so the same stream can be **out** of retirement phase for ECPI and **in** it for the cap | — | **constant** — structural | ITAA 1997 s 294-50(3) | 2026-09-09 | primary-verified — not modelled |
| **The SISR "Nil" set is STRICTLY LARGER than s 307-80's four-item set** | reg 6.01(2)(b)(ii)'s *"unless"* tests **Schedule 1 column 3**, and the Nil items are **101, 102, 102A, 103, 104, 105 (the 6.01(5)(b) limb) and 106** — seven, against s 307-80(2)(c)'s four. **Items 104 and 105(b) switch off the 10% ceiling and do NOT convert the phase**: no maximum, still 15%, no transfer balance credit | — | **constant** — structural | SISR reg 6.01(2)(b)(ii) · SISR Sch 1 Pt 1 column 3 · ITAA 1997 s 307-80(2)(c) | 2026-09-09 | primary-verified — **a comparison of two retrieved lists, not an inference** (T118) |
| **The two events happen on different days** | reg 6.01(2)(b)(ii)'s *"unless"* has **no notification word**, so on the 101/102A/103 route the **ceiling falls away on the day the condition is satisfied** while the **phase changes on the day of notification**. In between: no maximum, 15% fund earnings tax, no credit | — | **constant** — structural | SISR reg 6.01(2)(b)(ii) against ITAA 1997 s 307-80(3)(b)(ii) | 2026-09-09 | primary-verified (T119) |
| **The stream stays a TRIS** | conversion changes the stream's **tax phase**, not its SISR identity. s 307-80(3)(a)(i) applies to a stream that **is** a TRIS and then asks separately, in (b), whether the recipient has satisfied and notified — so if satisfying a condition ended the product's TRIS character, (3)(b) would be dead text. The ATO's own term is *"TRIS in the retirement phase"* | — | **constant** — structural | ITAA 1997 s 307-80(3)(a)(i) · LCR 2016/9 Examples 1A/1B headings | 2026-09-09 | primary-verified — **corrects the shipped refusal message in `src/core/ttrPaymentRange.ts`, which says the stream "is no longer a transition to retirement income stream"** |
| **The conversion is NOT a commencement** | so the conversion year's Schedule 7 minimum is a **full-year** minimum on the **1 July** balance at the **1 July** age — no cl 3 pro-rating, no cl 4 nil rule. And the Schedule 7 floor **survives** conversion because reg 6.01(2)(b)(i)'s limb is unqualified | — | **constant** — structural | SISR reg 6.01(2)(b)(i), (b)(ii) · Sch 7 cll 1(2)(a)(ii), 3, 4 · TR 2013/5 ¶10 (commencement is *"the first day of the period to which the first payment … relates"*) | 2026-09-09 | **primary-verified as to the provisions; the conclusion is a READING of them — U29 / O64** (T120) |
| **Conversion creates a transfer balance credit automatically** | the conversion day is the **starting day** for s 294-25(1) item 2; the credit is the **value on that day of the WHOLE superannuation interest** supporting the stream — **including every dollar of growth accumulated while the TRIS was out of retirement phase**; and it is also the day the transfer balance **account** starts (s 294-15(2)(b)) and therefore the year that fixes the personal cap (s 294-35(1)). On the item-106 route **the member does nothing** and can be pushed into excess and lose s 294-40(1)(b) indexation permanently | — | computed | ITAA 1997 ss 294-20(1), 294-25(1) item 2, 294-15(2), 294-35(1), 294-40(1)(b) · LCR 2016/9 ¶30D | 2026-09-09 | primary-verified as to **when** and **of what**; the measurement of *value* is the s 307-205 chain above (T78, T121). **BUILT 2026-09-16 by P3-9 chunk 5b-5** — `creditTrisConversionUnderItem106` in `src/core/trisConversionCredit.ts`, which composes R13's day (`trisConversionDayUnderItem106`, chunk 5b-3) with the item 2 credit (`creditOnCommencement`, chunk 4) and asserts exactly the first clause of this cell: **the conversion day IS the starting day**. It adds no rule and no refusal — R13's three contradictions propagate out of it unchanged and unworded, because the day is resolved before the ledger is touched. **The `value` is an EXPLICIT parameter and is not looked up**, spelled `valueOfSupportingInterestOnTheConversionDay` for `creditOnCommencement`'s own stated reason: the only balance this codebase holds for a TRIS is `SuperInterest.balance`, which carries no day at all, and both figures are `Cents`. The O62 inference above is **untouched and not re-researched** — the function takes the value it is given. **It has NO production caller and that is a finding, not coverage** (the O72 / P3-38 registered-and-unreachable pattern): joining a Person's stated interest to a ledger and a dated value is **O57**, which the register assigns to **P4-1** by name, so `trisInterestOrRefuse` still discards the day rather than inventing a figure to credit |
| **Every conversion is mid-year, so every conversion year needs an ECPI answer — and there is no apportionment** | a 65th birthday and a notification day are both arbitrary days. **See §3.11**, which carries the answer: neither method splits a part-year, the certificate-free segregated route is s 295-385(4) with reg 295-385.01 and the method that **always** needs a certificate is the proportionate one (s 295-390(4)). Under **R10** the conversion year is computed at the **provable upper bound** — 15% on the whole year's earnings — and `MidYearPhaseChangeError` is **narrowed**, not left standing | — | — | **§3.11** · ITAA 1997 ss 295-385(1), (4); 295-390(1), (3), (4) · ITAR (1997 Act) 2021 reg 295-385.01 | 2026-09-10 | **RESOLVED 2026-09-10 by P3-25 — this row said the opposite until today.** It attached the certificate to the wrong method and asserted an unchecked cross-pass negative (**O70**). O60 / U30 and O52 are **closed**; the labels move to §3.11 |

**The decision procedure, in full.** Order matters, and (3) applies only where a benefit **is payable**:

```
(2)  deferred stream + benefit will be payable + any of items 101/102A/103/106
         -> RETIREMENT PHASE           [no notification required on this limb]
(1)  else benefit payable now
         -> candidate RETIREMENT PHASE, then test (3):
(3)  EXCLUDED  iff   listed stream kind                                      (a)
               AND   NOT a reversionary beneficiary                          (aa)
               AND ( no item of 101/102A/103/106 satisfied                   (b)(i)
                     OR  item 101/102A/103 satisfied but provider not notified )  (b)(ii)
     -- item 106 appears in (b)(i)'s reference and NOT in (b)(ii)'s, so 65 escapes (b)
(4)  commutation authority + provider failed to pay within 60 days
         -> NOT retirement phase for that income year and every later one
         -- but for Div 294 only, s 294-50(3) disregards (4) before the 60 days end
```

**The overlap case is NOT settled — O65.** Paragraph (b) is a **disjunction**. A member who retired at
62 on **item 101**, never notified, and then turns 65 satisfies limb (b)(ii) **on its own terms**, so on
the bare text s 307-80(3) keeps excluding the stream and it never converts. The enumeration argument
above does not reach that case, because there the operative limb is **engaged** rather than **absent**.
The register implements the ATO's reading (65 converts) and carries the anomaly as the labelled
inference above — **O50 / O65 / U16**. **Any fixture asserting automatic conversion at 65 must state
that no item 101, 102A or 103 was satisfied before the birthday** (T117), or it asserts a proposition
the statute's bare text denies.

> **RULED (R5), 2026-09-09 — the conversion day is a stated Setting, not derived from date of birth.**
> **And the mitigation is part of the ruling:** an **absent conversion-day Setting for a Person holding
> a TRIS must raise a NAMED REFUSAL**, never silently skip the conversion. Silence is conservative on
> the tax side (the stream stays at 15% instead of 0%) but **flattering on the cap side** — with no
> credit, the transfer balance account never records the conversion and a real breach goes undetected.
> **Mixed-direction errors do not get the benefit of R1; they get a refusal.**
>
> **OVERRIDDEN IN PART BY USER RULING, 2026-09-23 — a `RETIRE` entry is TREATED AS the s 307-80(3)(b)(ii)
> notification day.** A TTR now converts at the EARLIEST of its stated early-conversion day, the day of
> the Person's first switched-on `RETIRE` at or past Preservation Age, and the 65th birthday
> (`retirementPension.ts`, `projection.ts`'s `conversionDay`). R5 required the notification to be a
> stated Setting; the user ruled that retiring IS the notification, knowingly and without a stated
> day. What is NOT overridden: a stated `statedNotificationDay` still reaches R13's backstop exactly
> as before, and the absent-conversion-day refusal still stands for a stream the RETIRE does not reach
> (before 60, or kept out with `keepInAccumulationAtRetirement`). The same ruling switches an
> ACCUMULATION interest to a retirement-phase account-based pension on that RETIRE day, commencing
> that day for Sch 7; it is refused, with a note in the month, where the balance on the day exceeds
> the published general transfer balance cap ($2,100,000 — splitting an account is not modelled) or
> where the Person states, or holds, a retirement-phase pension from before the plan (the cap left is
> unknowable). **Direction of the residual:** RETIRE is not proof a fund was notified, so a household
> that never notified is shown converted earlier than its fund would convert it — its earnings untaxed
> from the year after the switch (the flattering direction on tax), and its pension assessed under the
> Age Pension assets test from the switch (the conservative direction there). Recorded, not refused,
> on the ruling.

> **RULED (R7), 2026-09-09 — the entry test takes seven inputs, not three.** §B's three are what the
> **credit** needs once the phase answer is known; these seven are what the **entry test** needs to
> reach that answer. Both are required, for different questions.

| # | Input the entry test requires | Provision | Where it is today |
|---|---|---|---|
| 1 | the time `t` | (3) chapeau | `release.on` — present |
| 2 | whether a benefit **is payable** at `t` | (1) | implied by which constructor is called — **must become explicit** |
| 3 | **the stream kind** — is it one of (3)(a)(i)–(v)? | (3)(a) | `SuperIncomeStream`, today *"a label on the result; nothing in the rate lookup reads it"* — **the entry test makes it the discriminant** |
| 4 | **whether the recipient is a reversionary beneficiary** | (3)(aa) | **absent entirely** |
| 5 | **which Schedule 1 ITEMS** were satisfied at or before `t` | (2)(c), (3)(b) | **absent** — `ConditionOfRelease` carries two `ReleaseGround` values and no item numbers. §3.9's Access row now supplies the provenance |
| 6 | **the notification fact** — per stream, an act not an anniversary | (3)(b)(ii) | **absent, and underivable** — a required Setting |
| 7 | commutation-authority facts | (4), s 294-50(3) | **absent.** Out of scope; **refuse** |

Four of the seven are absent from `src/core/superPhase.ts` today.

---

#### 3.10.7 The Settings this section requires

> **RULED (R3), 2026-09-09 — the per-Person Settings block is the SEVEN fields of §3.10.3, not a
> six-field alternative that asks for the account-start *year* and omits `personalCapOnHighestBalanceDay`
> and `hasEverExceededCap`.** Not a matter of taste: the shorter list is **arithmetically
> insufficient** — reconstructing a personal cap from a start year alone requires replaying every
> intervening s 294-40 increase, which needs the very history the Person cannot supply.

> **RULED (R4), 2026-09-09 — the account start is captured as a DAY, not a financial year.** The
> transfer balance credit is valued on the stream's **starting day** (s 294-25(1) item 2), never on
> 1 July, so a year-granular input cannot express the figure the statute asks for.

**Per Person** (fields 1–7 of the §3.10.3 state table): `transferBalanceAccountStartDay` (a **day**),
`personalTransferBalanceCap`, `transferBalance`, `highestEndOfDayTransferBalance`, `highestBalanceDay`,
`personalCapOnHighestBalanceDay`, `hasEverExceededCap`.

**Per stream, and not in conflict with the block above** — these answer different questions and are
additional, not alternatives: each stream's **commencement day**; the **TRIS conversion day** (R5, a
stated Setting) and, on the 101/102A/103 route, the **notification day**; the Schedule 1 **item set**
satisfied (R7 input 5); the **reversionary** flag (R7 input 4); and each above-minimum withdrawal's
**characterisation** — `pensionPayment` | `partialCommutation`, defaulting to `pensionPayment` (O47).

**Why the per-Person block cannot be derived, and why there is no conservative approximation.** The
personal cap for a Person whose account predates the forecast is a function of five things the tool does
not have: the account's start day; the general-cap series back to it; every dated credit and debit
since; the high-water mark and its earliest day; and the personal cap on that day, which is itself the
recursive output of the first four for every prior year. **And the current balance is neither an upper
nor a lower bound** — earnings and drawdowns are invisible to the account in both directions (§3.10.4) —
so the error from guessing is **unsigned and unbounded**. That rules out a conservative approximation
and leaves a refusal.

**Scope the refusal narrowly.** A Person who has **never** been a retirement phase recipient before the
forecast starts is **fully computable and must be computed**: the account starts inside the forecast,
the seed cap is the general cap for the seeding year, s 294-40 does not apply in the seeding year at
all, and every subsequent credit and debit is generated by the engine's own Scenario. **O42.**

**Where a real user gets these numbers:** the ATO publishes the individual's transfer balance account —
including the personal cap and the highest-ever balance — in ATO online services (myGov → ATO → Super →
Information → Transfer balance cap). **This project has not verified the labels or the shape of that
screen — U14** — so the Settings prompt must be written from a verified screenshot or ATO guidance page
before it ships.

---

#### 3.10.8 Named refusals

> **RULED (R8), 2026-09-09, and it is an INSTRUCTION, not a preference:** three independent research
> passes invented three names for the same two refusals. **Before any of these is registered, collect
> the refusal names into a single module**, so a fourth pass cannot mint a fourth spelling.

**R8's ordering was honoured and its "single module" was read narrowly — stamped 2026-09-15, and the
ruling's words above are not rewritten.** The narrower reading is §8 **O48**'s, adopted 2026-09-10:
*"§3.10.8 **is** the one home … there is no drift in built code to relocate."* What R8 asks for is
**one spelling per refusal**, and that is enforced by this table plus `test/refusal-names.test.mjs`
reading it in both directions — not by one `.ts` file holding every refusal in the codebase, which
no other cluster in this register has and which would mean relocating 39 working, tested classes for
no functional gain. So **P3-9 chunk 1** built the ten ledger-side refusals into a new
`src/core/transferBalanceAccount.ts`, beside the ledger that will raise them, and the two entry-test
refusals into `src/core/superPhase.ts`, beside the entry test — the same placement `ecpiMethod.ts`,
`conditionOfRelease.ts` and `div296.ts` already have. **The instruction's own ordering constraint was
kept in full: every name below was settled and registered before any arithmetic that throws it
exists.** The blocker sentence *"do not register it until the refusal module of R8 exists"*, in the
cap-breach row below, is **discharged on that ground and on that ground only**.

**This table is load-bearing, and `test/refusal-names.test.mjs` enforces it.** The **Status** column
is read by that test: **`BUILT`** means the class exists in `src/` and names the file it is in;
anything else — `proposed`, `RULED`, `name not ruled` — means it does **not** exist in `src/` yet.
`RULED` settles a *name*, not a shipping date, so a ruled-but-unbuilt refusal flips to `BUILT` on the
day it is registered. The same test asserts that every refusal in `src/` is named somewhere in this
register, which is the other half of R8's one-home instruction.

| Refusal | Fires when | Status |
|---|---|---|
| **`UnknownPersonalTransferBalanceCapError`** | a Scenario needs a personal cap for a Person whose transfer balance account started before the forecast, and the seven Settings are not supplied. Carries the list of fields the user must supply | **BUILT** 2026-09-15 — `src/core/transferBalanceAccount.ts`; **WIRED 2026-09-16 by P3-9 chunk 6-4**, at exactly one throw site: `transferBalanceAccountOrRefuse` in `src/core/transferBalanceAccountSettings.ts`, which refuses on the **conjunction** — the Person *declared* a pre-forecast retirement-phase account (`Person.statedPriorRetirementPhase`) **and** the seven §3.10.3 Settings are absent — and on the `notStated` third state, where the question was never put. *(This cell said, until 6-4: **no throw site yet**: the Person-level aggregation that raises it is P3-9 chunk 6.)* **O42 is scoped in the code, not only in the message:** a Person who declared `neverARetirementPhaseRecipientBeforeTheForecast` and supplies no Settings returns `computedInFull` from that same door and is never refused, and `test/core-transfer-balance-account-settings.test.mjs` asserts both the single-site count and that this Person does not reach it. The classifier `transferBalanceAccountShape` stays total and throws nothing, so no existing consumer of the shape can be refused by asking for it. **RULED (R2)** — this name wins over `PreForecastTransferBalanceNotDerivable`. Cosmetic choice, settled so two modules do not ship two names for one condition. The message carries all seven §3.10.3 fields by name, R3's insufficiency argument and R4's day-not-year point, and says in terms that a Person who has never been a retirement phase recipient before the forecast is computed and not refused (**O42**) — the one scoping mistake that would turn this refusal into a regression. **It also carries U14 forward:** the ATO screen those seven labels have to be findable on has never been retrieved, so the field names in the message are the statute's, not the ones the user will be reading |
| **`ReversionaryStreamNotModelledError`** | the recipient is stated as a reversionary beneficiary (s 307-80(3)(aa)) | **BUILT** 2026-09-15 — `src/core/superPhase.ts`. **Throw site added 2026-09-16 by P3-9 chunk 5a**: R7 input 4 arrived as `DeclaredRecipient.reversionaryBeneficiary`, and all three interest constructors refuse on it **before** any other test they apply — including before `retirementPhaseInterest`'s preservation gate, because (3)(aa) failing collapses the conjunction whatever the beneficiary's own conditions of release, so T122's 45-year-old must refuse AS a reversionary stream. **An input guard and nothing more:** the fact is stated or it is nothing — a constructor handed a condition of release cannot detect an undeclared reversionary beneficiary, which is why the trigger in the middle column is the word *stated*. **RULED (R8)** — wins over `ReversionaryPensionNotModelled`: *"Stream"* matches the statutory term (s 307-80(3)(aa) speaks of the beneficiary of an income **stream**, wider than a pension) and the `Error` suffix matches every other refusal in this codebase |
| **`TransferBalanceCapExceededError`** | an **end-of-day** transfer balance exceeds the personal transfer balance cap (**R1**, §3.10.5). **Not** on a negative transfer balance (s 294-30(2) Note 2) and **not** on a large total super balance — only retirement-phase capital, only at the end of a day. **This is a scope refusal, not a rule of law:** breaching the cap is not unlawful and Div 294 supplies a complete answer to it, which this tool declines to implement. The message names all three things §3.10.5 requires — the excess, the personal cap it was tested against, and the **s 294-40(1)(b)** permanent loss of every future indexation increase — plus the third consequence R1 was reasoned from, the move of the commuted capital from 0% to 15% for ever, and it tells the household the one action that is actually available: declare less capital as retirement phase. **The `cap` parameter is a `PersonalTransferBalanceCap`,** the fourth brand (T60), so a general cap cannot be reported as the figure a Person was tested against without an explicit cast | **BUILT** 2026-09-15 — `src/core/transferBalanceAccount.ts`. **ONE THROW SITE, added 2026-09-16 by P3-9 chunk 3**: the end-of-day check inside `advanceTransferBalanceDay`, which is the only comparison in that module that decides a breach and is reached from every day the engine closes. **This is the FIRST of the twelve P3-9 refusals to become reachable**, and `test/core-transfer-balance-account.test.mjs`'s tripwire — which asserts that none of them has a throw site — had exactly this one name struck from its list in the same change as this cell, with the other eleven left standing; that test's vacuity guard is now this name's own site, so the strike cannot outlive the code it was made for. Name settled on the proposal `TransferBalanceCapExceeded` plus R8's `Error` suffix. **The blocker this cell used to carry — *"do not register it until the refusal module of R8 exists"* — is discharged by O48's narrower reading of R8, stamped above, and by nothing else** |
| **The absent-conversion-day refusal** — *no second name was minted, and this row deliberately has no name of its own in the first column* | a Person holds a TRIS and the R5 conversion-day Setting is absent | **DISCHARGED 2026-09-15 by `TrisRetirementPhaseNotModelledError`**, which is already BUILT and already refuses exactly this. The question this row left open below — *"the row two above may already be this refusal … it is recorded here, not decided"* — is decided: it is. **Checked against R5's words, not assumed:** R5 requires that *"an absent conversion-day Setting for a Person holding a TRIS must raise a NAMED REFUSAL, never silently skip the conversion"*, and every Person for whom a conversion could be due reaches that class's one throw site, because it fires on `release.met === true` and a Person who has **not** met a condition needs no conversion day at all. **The cover is BROAD, not exact, and the residue is the narrowing this section already calls for:** it also refuses Persons on the 101/102A/103 route who have satisfied a condition, not notified, and for whom no conversion is due — which is refusing a case the register answers, and which presupposes **O65** and R5's Setting to fix. **A second name would have been R8's own defect** — a fourth spelling for a condition already spelled — so this row stays nameless rather than gaining one, and the class's own doc comment in `src/core/superPhase.ts` carries the discharge |
| **`TrisRetirementPhaseNotModelledError`** | `transitionToRetirementInterest` is asked to build a TRIS interest for a Person whose `ConditionOfRelease` is `met`. **One throw site**, the constructor's first line, and the return type carries the rest: the function returns an `AccumulationInterest`, so there is no way to say *a TRIS is in Retirement Phase* in that module which survives `tsc`. **This is a scope refusal** — §3.5.1's and §3.9.1's fourth kind, and the rarest variety yet recorded here, because **the rule is not the thing that is missing**. §3.10.6 above states *when* a TRIS converts, in full: on **notification** for SISR Schedule 1 items 101, 102A and 103 (s 307-80(3)(b)(ii); LCR 2016/9 Example 1B ¶30D), and **automatically on the 65th birthday** for item 106, which (3)(b)(ii)'s enumeration omits. What is missing is the **fact**: under **R5** the conversion day is a *stated Setting* and is **NOT** derived from date of birth, §3.10.7 lists it among the per-stream Settings this section requires, and — until **2026-09-16** — no such Setting existed. **P3-9 chunk 5b-2 built it** (`StatedStreamSettings` in `src/core/household.ts`: the stated changeover day, the notification day and the Schedule 1 item, per stream), **chunk 5b-3 built R13's resolution over it** (`trisConversionDayUnderItem106` in `src/core/trisConversionDay.ts`) and **chunk 5b-4 took the item-106 half of the narrowing this section calls for below**. So the *fact* is no longer missing on that one route, and this class now refuses the residue rather than everyone. It is **not a rule of law** — no provision forbids a Person from holding a TRIS after meeting a Condition of Release; that is the ordinary case and §3.9's TTR rules govern it. It is **not an input-shape guard**: a TRIS held by a Person who has met a condition is one perfectly coherent Person, and the commonest Person this refusal will ever meet. It is **not a drift tripwire**, because it reads no record of this register against another. **Re-expressed on R5, and the ground it stands on today is not the ground it was built with.** Before §3.10.6 existed it meant *the register does not say when a TRIS converts*; §3.10.6 answers that, so the refusal survived on a **narrower and different** ground — the day is a Setting nobody has stated — and its message was rewritten to say so on **2026-09-09 and 2026-09-10**. A refusal whose ground is replaced rather than removed is the case this register keeps meeting from the other side, and here the message was brought with it. **R6 is load-bearing inside the message and this row does not weaken it.** The item-106 finding is an `inference from an express enumeration` corroborated by a public ruling — T80's ground, with LCR 2016/9 ¶15 and Example 1A ¶¶30A–30B as the corroboration — and it **must never be recorded as bare `primary-verified`**. The message says exactly that, in terms. The direction is what makes it work: `src/core/superPhase.ts` states **no confidence of its own**, so the only way it could break R6 is by **deriving** a phase from that finding, which is why phase remains *stated by the caller, per interest*, and is never derived there. **Every claim the message makes about this register, checked as it stands today.** *"§3.10.6 now states when that happens"* — true. *"O60 no longer blocks it independently, because under ruling R10 `fundEarningsTax` now charges the conversion year at the proven upper bound"* — true: §8 records O60 CLOSED 2026-09-10 and §3.11.6 carries R10. *"No such Setting exists yet"* — **REMOVED from the message on 2026-09-16 by P3-9 chunk 5b-4, because it had become false.** It is recorded here rather than deleted, with the nuance it used to carry: §3.11.8's placements table registers `FundType` and the ECPI method as **BUILT** on 2026-09-10 and does **not** register the conversion day, and no interest constructor in that module carries a field for it — but the same module's `phaseHeldFrom(fy, from)` **takes a conversion day as its argument**, and §3.11.9's `PhaseYearMismatchError` row names that argument *"the R5 Setting"*. So the **consumer was built and the Setting was not**. Chunk 5b-2 built the Setting, in `household.ts` and per stream rather than as a field on an interest here; the message now says that it exists, names the module that resolves it, and keeps the half that was and remains true — that **this module** holds neither the notification fact nor the Schedule 1 item. *"This module holds neither the notification fact nor the Schedule 1 item"* — true **of that module**, and narrower than the codebase: `ConditionOfReleaseItemNotIdentifiedError` above records `schedule1ItemFor` as BUILT in `src/core/conditionOfRelease.ts`, where it states item 106 by name and refuses item 101, and `src/core/superPhase.ts` imports only `benefitAccess` and `requireBenefitAccess` from it. **The item-106 half of the narrowing this section calls for below WAS one import away, and P3-9 chunk 5b-4 took it — 2026-09-16.** It was taken as a **new door and not as a change to this class**, which is the shape every narrowing in this register should have when the refusal's return type is itself a defence: `trisInterestOrRefuse` in `src/core/trisInterest.ts` takes a date of birth, the stream's stated Settings and the `ConditionOfRelease`, resolves the day through `trisConversionDayUnderItem106` and calls **`retirementPhaseInterest`** for a Person whose `release.grounds` is **exactly** the automatic-release ground; everyone else it hands straight to `transitionToRetirementInterest`, which refuses exactly as it did before. So this refusal's **trigger, its one throw site and its `AccumulationInterest` return type are untouched** — what narrowed is the set of Persons who arrive at it, and `test/core-tris-interest.test.mjs` asserts from the other side that the old door still refuses the very Person the new door now converts. What is **not** closed is the item-101 mapping (**O59 / U28**) and, separately, **O65's overlap**: a Person carrying the employment ground *and* the automatic-release ground fails the router's `grounds.length === 1` test and keeps landing here, deliberately. **No caller under `src/` reaches this throw site.** Nothing in `src/` calls `transitionToRetirementInterest`, so as shipped the refusal is observable only by calling the constructor directly — which `test/core-super-phase.test.mjs` does, rather than reading a throw from elsewhere as coverage; the same honesty §3.9.1 records for `PensionNotCommencedError`. **And the row two above may already be this refusal.** *"A Person holds a TRIS and the R5 conversion-day Setting is absent"* is the condition this class fires on, because a Person who has **not** met a condition needs no conversion day at all — the stream is squarely Accumulation Phase and the message says so. Whether R5's requirement is discharged by this built class or wants the separate name is a naming question and is ruled elsewhere; it is recorded here, not decided | **BUILT** 2026-09-10 — `src/core/superPhase.ts`, one throw site. **The stated ground is sound, and it is an argument from an absent Setting rather than an absent rule** — which makes it the one scope refusal in this register that needs no further research to close: it closes when R5's Setting is built, and the message names that Setting. **Its item-106 limb closed on 2026-09-16**, when 5b-2 built the Setting and 5b-4 routed around this class rather than through it; the message now names the Setting, the module that resolves it and the door that answers for that route. **Two limbs are still open and this class still fires for both**, and as of **2026-09-16 (P3-9 chunk 5b-6)** the second is NARROWER than this cell used to describe: O65's overlap, and the part of the 101/102A/103 route that **is not** limb 2b's — a Person who has stated no Schedule 1 item at all, or who has stated one **and** the notification day. The middle case, a stated item of 101/102A/103 with the notification day absent, now refuses under `TrisNotificationNotStatedError` instead, at its one throw site. *(This cell said, until 5b-6, simply "the 101/102A/103 route", which was true when written and is now too wide by one case.)* |
| `TrisNotificationNotStatedError` | a listed-kind stream whose recipient satisfied item 101, 102A or 103 at or before `t`, with the notification fact unstated. Replaces the 101/102A/103 half of `TrisRetirementPhaseNotModelledError`. **A scope refusal on a missing FACT, not a missing rule:** §3.10.6 states the rule in full, and the fact is per stream, is an act rather than an anniversary, and is underivable (R7 input 6). The message carries the *fortnight is worth a year* consequence and names **TR 2013/5 ¶71B** as the known-bad shortcut that drops the notification requirement, because an implementer who reaches for the shorter sentence exempts a whole year of taxable fund earnings. It also says in terms that it does **not** apply to item 106, which is T80 / T117 | **BUILT** 2026-09-15 — `src/core/superPhase.ts`. **WIRED 2026-09-16 by P3-9 chunk 5b-6**, at exactly one throw site: **limb 2b of `trisInterestOrRefuse`** in `src/core/trisInterest.ts`, which refuses on a **conjunction of three** — the Person holds the **employment** ground and **not** the automatic-release one, the stream's **stated** `statedSchedule1Item` is one of **101, 102A or 103**, and `statedNotificationDay` is **absent**. *(This cell said, until 5b-6: **no throw site yet**: routing into it needs the Schedule 1 item (R7 input 5), which that module does not hold; chunk 5b wires it. Both halves of that are discharged — R7 inputs 5 and 6 arrived as `StatedStreamSettings.statedSchedule1Item` and `.statedNotificationDay` in chunk 5b-2, and the routing lives beside `superPhase.ts` rather than in it, so that module still holds neither fact.)* **The item is READ and never DERIVED, and that is the O59 / U28 scoping:** `schedule1ItemFor` is one import away and appears nowhere in this module's executable text, because the employment-ground to item-101 mapping is `unverified` and deriving it here would pick a side of an open question — the same precedent `trisConversionDay.ts` took in 5b-3. **O65 is untouched:** limb 2b fires only where the automatic-release ground is **absent**, so the retired-at-62-then-turned-65 Person carries both grounds, fails limb 2b's exclusion as well as limb 2's `length === 1`, and keeps landing on `TrisRetirementPhaseNotModelledError`. **The replacement of `TrisRetirementPhaseNotModelledError`'s 101/102A/103 half is PARTIAL, not complete, and the residue is honest rather than hidden:** a Person on that route who **stated** the notification day still falls through to the older refusal, because **no converted-101/102A/103 interest constructor exists anywhere in `src/`** — building one means handing `retirementPhaseInterest` a conversion day that is the notification day and then crediting it, and neither the day nor the credit has a caller. That gap is the same shape as 5b-5's uncalled credit and is recorded in the module's own header, not only here |
| `ConditionOfReleaseItemNotIdentifiedError` | *(no longer fires)* a met condition whose `ReleaseGround` could not be mapped onto a Schedule 1 item — s 307-80(3)(b) turns on **which item**, not on `met`. Its one case was the employment ground, item 101, pending SISR reg 6.01(7). SISR reg 6.01(7), retrieved 2026-09-29 at `REG/19940057/6.01(7)`: *"For the purposes of Schedule 1, the retirement of a person is taken to occur: (a) in the case of a person who has reached a preservation age that is less than 60 - if: (i) an arrangement under which the member was gainfully employed has come to an end; and (ii) the trustee is reasonably satisfied that the person intends never to again become gainfully employed, either on a full-time or a part-time basis; or (b) in the case of a person who has attained the age of 60 - an arrangement under which the member was gainfully employed has come to an end, and either of the following circumstances apply: (i) the person attained that age on or before the ending of the employment; or (ii) the trustee is reasonably satisfied that the person intends never to again become gainfully employed, either on a full-time or a part-time basis."* The employment ground fires only for a cessation at or after Preservation Age (60), which is paragraph (b)(i), so `schedule1ItemFor` now answers item 101 and no case is left. Paragraph (a) needs a preservation age under 60 and `conditionOfRelease.ts` refuses to load if the record ever says so; paragraph (b)(ii) is `CessationBeforePreservationAgeError`'s window | **DELETED 2026-09-29 (LR-2)** — was in `src/core/conditionOfRelease.ts` from 2026-09-10 |
| `CommutationAuthorityNotModelledError` | s 307-80(4) / TAA 1953 Sch 1 Div 136 facts are stated. **A scope refusal.** Its message carries the reason it cannot be approximated by ignoring the authority: **s 294-50(3)** requires s 307-80(4) to be *disregarded* for transfer balance cap purposes while the 60-day period runs, so the same stream is out of retirement phase for ECPI and in it for the cap, and one answer taken for both is wrong in one direction with nothing to say which | **BUILT** 2026-09-15 — `src/core/transferBalanceAccount.ts`. **Throw site added 2026-09-16 by P3-9 chunk 5a**, in `src/core/superPhase.ts`: R7 input 7 arrived as `DeclaredRecipient.commutationAuthority`, a two-member union whose guard tests the SUPPORTED value — no authority issued — so a third member added later refuses by default rather than falling through. The class stays beside the ledger because the s 294-80(1) item 5 debit it names is ledger work; only the guard crossed the module boundary. **Nothing is computed from the fact**, and the 60-day period is neither counted nor represented |
| `CappedDefinedBenefitIncomeStreamNotModelledError` | a defined benefit lifetime pension is declared. The test asserts **the refusal, not a number** (T85). **A scope refusal**, and it fires **on the declaration** rather than on any attempt to classify a stream that was not declared as one, because the width of the trigger is itself unverified (**O49 / U20**) and Subdiv 294-E was never retrieved (**O55 / U12**) | **BUILT** 2026-09-15 — `src/core/transferBalanceAccount.ts`, **no throw site yet**: nothing in the model can declare a defined benefit pension, so there is no input to guard until one exists |
| `LRBACreditNotModelledError` · `DeferredAndCappedDefinedBenefitCreditsNotModelledError` · `StructuredSettlementNotModelledError` · `FraudAndBankruptcyDebitsNotModelledError` · `PaymentSplitNotModelledError` · `StreamCeasedOutsideCommutationNotModelledError` | the credit and debit items this tool does not compute — between them, **credit items 1, 4 and 5, the reversionary limb of item 2, and debit items 2–8**. **Six scope refusals and six classes, deliberately not one parameterised `ItemNotModelledError(item)`:** a single class would let a mutation change which item a message names without changing anything a test asserts on, and it would collapse six statuses in this table into one | **BUILT** 2026-09-15 — `src/core/transferBalanceAccount.ts`, all six, **none with a throw site**. *(Ground NARROWED 2026-09-16 by P3-9 chunk 4, which discharged the one this cell gave. It said “there is no credit or debit function in `src/` at all yet (chunk 4), so none of the six is reachable by any input” — `creditOnCommencement` and `recordCommutation` now exist, so that sentence is false and the conclusion needs a narrower reason. It has one: those two functions are handed a **day and an amount**, and nothing in that input can declare itself an LRBA repayment, a structured settlement, a payment split, a s 294-85 reduction or a stream ceasing outside a commutation. Those facts arrive at the entry test and in the per-stream Settings — chunks 5a and 6 — which is where the six will gain throw sites, if they do.)* Registered and unreachable, the O72 / P3-38 pattern, recorded here as a finding and not as coverage. **O48**. That leaves item 2 credits and item 1 debits, which is the honest scope of a tool that models two people's own account-based super |

**Narrow, do not widen, the existing refusal.** `TrisRetirementPhaseNotModelledError` currently fires
for **every** Person with `release.met === true`. Once this section exists the **item-106 case is
answered by the register**, and refusing a case the register answers is its own kind of error — but the
narrowing presupposes the overlap case of **O65** and R5's stated conversion day, so it must be done
with both in hand.

**HALF DONE — P3-9 chunk 5b-4, 2026-09-16, and both preconditions were in hand.** O65 is documented in
§3.10.6 above and R5's stated conversion day is `StatedStreamSettings` (chunk 5b-2), resolved by
`trisConversionDayUnderItem106` (chunk 5b-3). **The mechanism is a new door, not a smaller refusal, and
that distinction is the instruction's own word "narrow" taken seriously:** `transitionToRetirementInterest`
returns an `AccumulationInterest`, and that return type is what makes *a TRIS in Retirement Phase*
unwriteable in `src/core/superPhase.ts` — a narrowing that deleted or weakened its throw would have
taken the pin with it. So `trisInterestOrRefuse` in **`src/core/trisInterest.ts`** was added beside it
instead, holding the two facts that module may not hold (a date of birth, and the per-stream Settings)
and choosing between the constructors that already exist:

  1. `release.met === false` → `transitionToRetirementInterest`, which answers;
  2. `met`, and `release.grounds` is **exactly** the automatic-release ground → the day is resolved by
     `trisConversionDayUnderItem106` (whose refusals propagate, including the stated-day-after-the-65th-birthday
     contradiction) and the interest is built by **`retirementPhaseInterest`**;
  3. anything else → `transitionToRetirementInterest`, which refuses exactly as it always has.

**The half that is NOT done, and it is deliberate.** Limb 3 is where **O65** and the **101/102A/103**
route both land. The `grounds.length === 1` test in limb 2 is the non-resolution of O65 written as code:
a member who retired at 62 on item 101, never notified, and then turned 65 carries **both** grounds, and
converting them would be picking a side of a disagreement between the bare statutory text and the ATO's
reading that this register expressly leaves open.

**CORRECTED 2026-09-16 by P3-9 chunk 5b-6, which is the last sub-step of chunk 5b.** The sentence that
closed this paragraph — *"The notification route's own refusal, `TrisNotificationNotStatedError`, still
has **no throw site** and is chunk 5b-6's"* — is corrected here rather than deleted. That refusal now has
**exactly one** throw site: **limb 2b** of `trisInterestOrRefuse`, tested after limb 1 and **before**
limb 3, because every Person it answers for also fails limb 2's ground test and a limb 2b placed after
the catch-all would be unreachable. It fires on a conjunction of three — the **employment** ground
**without** the automatic-release one, a **stated** Schedule 1 item of **101, 102A or 103**, and **no**
stated notification day. **So limb 3's population is narrower by one case and is not empty. Exactly two
limbs remain open, and they are different in kind:**

  * **O65's overlap**, unchanged and deliberately so. The retired-at-62-then-turned-65 Person carries
    both grounds; limb 2b's exclusion of the automatic-release ground is that non-resolution restated,
    so they fail limb 2 *and* limb 2b and keep the refusal that has always met them. Neither limb picks
    a side.
  * **A stated Schedule 1 item of 101, 102A or 103 WITH the notification day stated** — the Person who
    answered the question. There is **no converted-101/102A/103 interest constructor in `src/`** for
    them to land on: building one means handing `retirementPhaseInterest` a conversion day that is the
    notification day and crediting it on that day, and neither has a caller. They therefore get the
    *generic* refusal rather than a specific one, which is a worse message for the better-informed
    user, and that is recorded as a **finding of this chunk** rather than smoothed over. It is the same
    shape as 5b-5's `creditTrisConversionUnderItem106`, which ships tested and with no production
    caller.

**Chunk 5b is COMPLETE as of 2026-09-16.** What it delivered end to end: the per-stream Settings
(5b-1/5b-2), R13's conversion-day resolution (5b-3), the item-106 door (5b-4), the s 294-25(1) item 2
credit on that day (5b-5) and this refusal's throw site (5b-6). What it did **not** deliver, stated here
so the next chunk starts from the truth: **no production caller reaches any of it**. Nothing under `src/`
calls `trisInterestOrRefuse`, `creditTrisConversionUnderItem106` or `trisConversionDayUnderItem106`, so a
TRIS still converts for nobody in a running forecast. The Person-level wiring is chunk 6's and the ledger
join is **O57**, assigned to P4-1.

---

#### 3.10.9 Golden fixtures

Every figure below traces to `docs/research/p3-transfer-balance-cap.md` §A.2. The first three are worked
in **LCR 2016/9** itself.

| Fixture | Facts | Required answer |
|---|---|---|
| **LCR 2016/9 Ex A1, step 1** | $1.4m credit 1 Mar 2018; seed cap $1.6m; FY2021-22 increase $100,000 | 87% used → 13% unused → **+$13,000** → **$1,613,000** |
| **LCR 2016/9 Ex A1, step 2** | +$125,000 on 31 Dec 2022 → $1.525m; FY2023-24 increase **$200,000**; denominator **$1,613,000** | 94% used → 6% → **+$12,000** → **$1,625,000** |
| **LCR 2016/9 Ex A2** | $1.6m credit against a $1.6m seed cap | 100% used → **0%** → **$1,600,000**, in FY2021-22 and forever |
| **High-water mark** | $1.2m credit 1 Sep 2025; $300k debit 15 Mar 2026; FY2026-27 increase $100,000 | 60% used → 40% → **+$40,000** → **$2,040,000** (not $2,055,000); headroom **$1,140,000** |
| **Rounding direction** | $1,234,567 credit 1 Jul 2025 against a $2.0m cap | 61% used → 39% → **+$39,000** → **$2,039,000** (not $38,000, not $38,271.65) |
| **Negative balance** | $500,000 structured settlement debit; $300,000 credit 1 Sep 2025 → −$200,000 | s 294-40(3): unused **100%** → **+$100,000** → **$2,100,000** |
| **Seeding year** | pension starts 1 Jul 2026 | cap exactly **$2,100,000**; s 294-40 does not apply |
| **Ledger, not balance** | $1.5m pension commenced 1 Jul 2027; run to 30 Jun 2035 with drawdowns exceeding earnings so the account falls to $1.1m; then commence a second pension with $900k | transfer balance **$2,400,000** (not $2,000,000), and the second commencement is a **breach** |
| **Growth is invisible** | $1.8m pension grows to $2.15m over five years, no further contributions | transfer balance stays **$1,800,000** and the tool must **not** report a breach |
| **TRIS conversion at 65** | TRIS commenced at 60 with $800,000, worth **$1,050,000** on the 65th birthday, no item 101/102A/103 satisfied earlier | credit **$1,050,000** on the birthday — the whole interest, including TTR-phase growth |
| **The fortnight worth a year** | retires 28 Jun 2027, notifies 12 Jul 2027 | account starts in **FY2027-28**; the personal cap is the FY2027-28 general cap; the credited value is the balance on **12 Jul 2027** |
| **Account survives commutation** | commence $1m in FY2027-28, fully commute in FY2030-31, commence again in FY2034-35 | the personal cap is still seeded from **FY2027-28**, not FY2034-35 |

---

#### 3.10.10 Cross-references

- **§3.1** — the general cap amount, its s 960-285 derivation, and the CPI index numbers behind it.
- **§3.2** — the indexation machinery s 294-35(3) routes through (s 960-265 item 10A, s 960-285).
- **§3.9** — the Schedule 7 minimum and the reg 6.01(2)(b)(ii) 10% ceiling. §3.9 is the stream's payment
  range; §3.10 is its phase. The two read **different days** and must not share a balance helper.
- **§3.7** — Division 296, and the s 8AAD(1) / s 8AAD(1A) GIC rate trap between them.
- **§3.11** — ECPI, which is the consequence of the phase answer. **It states, as the answer rather
  than as a gap, that there is no apportionment rule for a fund**: neither method splits a part-year,
  the only express days formula in Subdivision 295-F is s 295-410 and it is for **RSAs** (T130), and
  the conversion year is charged at the R10 bound. O60 is closed; §3.11 replaces it.
- **§5A.3** — the franking side of the same phase answer: the credit survives s 207-90 via
  s 207-110(2)(b) and is refunded in full under **both** ECPI methods.
- **§9 → Transfer balance cap** — the mutation rows for this section's built code, added 2026-09-16
  from P3-9 chunk 6 and its batteries. **Two of them are DECLARED SURVIVORS and fail nothing**: read
  them before treating a green suite as evidence that §3.10's brands are structurally safe. They are
  not — TODO **P3-41** is the conversion that would make them so.

---

### 3.11 Exempt current pension income — ITAA 1997 Subdivision 295-F

**Added 2026-09-10** by `docs/research/p3-25-ecpi-apportionment.md` (P3-25), read off the ATO Legal
Database (ITAA 1997 `PAC/19970038`; ITAR (1997 Act) 2021 `REG/20210206`) and the **Federal Register
of Legislation** authorised Word compilation of `F2021L00206` (Compilation No. 16, 27 June 2026).
Every row **retrieved 2026-09-10** unless it says otherwise.

**§3.1 carries the two rates (15% / 0%). §3.11 is how a fund gets from one to the other in a year
where an interest changes phase.** Subdivision 295-F is ss 295-385, 295-387, 295-390, 295-395,
295-400, 295-405, 295-407 and 295-410 — **bounded by probe**, not assumed: the sections either side
were fetched and 404, which is what makes the absences below citable.

**This section is a fund-level computation.** Everything else in §3 is per Person; ECPI is not, and
that is why it is its own section rather than a row in §3.1 or §3.10.

**What this section does not carry.** The §1 traps **T126–T134**, the §8 open items **O67–O71** and
unknowns **U34–U37**, and the §9 mutation test **M-P3-25-1** are tabled in those sections and cited
here by ID only.

**It closes O52 and O60 / U30 — and corrects them.** Both asserted that s 295-390 had never been
retrieved by any pass. It had been, by the **franking pass on 2026-09-04**, and this register's own
§10 said so. The process finding is **O70**, and it is the reason three shipped artefacts carry a
false negative in a refusal message.

---

#### 3.11.1 Two mechanisms, and the certificate is attached to the OTHER method

> **CORRECTION, 2026-09-10.** Until today this register stated, at §3.10 and in O52 / O60, that
> *"s 295-385(3)(b) shows the segregated method needs an actuary's certificate"* and that
> **s 295-390 had never been retrieved**. Both halves are wrong. **s 295-385(4)** with **reg
> 295-385.01** gives a **certificate-free** segregated route for allocated, market linked and
> **account-based** pensions — every pension a household SMSF is likely to pay — while **s 295-390(4)
> requires a certificate always**. The certificate was attached to the wrong method. The superseded
> sentences have been replaced, not annotated.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **Two mechanisms, not two alternatives** | s 295-385 exempts income **from** particular assets, traced, **"at a time"**; s 295-390 exempts **one proportion** of the whole year's income. A fund can be on both at once: s 295-390(2)(d) and the *average value of current pension liabilities* definition each strip out what s 295-385 has already exempted | — | **constant** — structural | ITAA 1997 ss 295-385(1), (3), (4); 295-390(1), (2)(d), (3) | 2026-09-10 | primary-verified |
| **Segregated method — s 295-385(3) route** | assets dealt with **solely** for retirement-phase liabilities, **AND** the trustee obtains an **actuary's certificate** before the return's lodgment date | — | **constant** — structural | ITAA 1997 s 295-385(3)(a), (b) | 2026-09-10 | primary-verified |
| **Segregated method — s 295-385(4) route: NO CERTIFICATE** | assets dealt with for the **sole purpose** of discharging RP liabilities in respect of **prescribed** benefits — **allocated, market linked and account-based pensions** (reg 295-385.01(a)) — need **no actuary's certificate at all**. Gated by (5): at all times in the year, such RP liabilities as the fund had must have been prescribed ones | — | **constant** — structural | ITAA 1997 s 295-385(4), (5) · **ITAR (1997 Act) 2021 reg 295-385.01(a)** (fetched twice, ATO Legal Database and the FRL authorised compilation, agreeing) | 2026-09-10 | primary-verified — **this is the half of the provision the register was missing** |
| **Proportionate method ALWAYS needs a certificate** | s 295-390(4): the liability values *"**must be specified in an actuary's certificate** obtained by the trustee … before the date for lodgment"*. s 295-390(6)'s roll-forward shortcut still needs certificates for the asset values | — | **constant** — structural | ITAA 1997 s 295-390(4), (5), (6) | 2026-09-10 | primary-verified |
| **s 295-390(7) is a DEAD LETTER** | the one escape from (4)–(6) applies only to benefits *"prescribed by the regulations for the purposes of this subsection"*, and **no such regulation has ever been made**. So the certificate requirement in (4) has no escape | — | **constant** — structural | Absence verified against the **complete** ITAR (1997 Act) 2021, `F2021L00206` Compilation No. 16 (27 Jun 2026): Subdiv 295-F of those Regulations contains **reg 295-385.01 and nothing else**, table of contents agreeing | 2026-09-10 | **an argument from the absence of a regulation, verified exhaustively against the full compilation — NOT bare `primary-verified` (R6). U35** |
| **The exempt proportion** | `average value of current pension liabilities ÷ average value of superannuation liabilities`, **for the income year**. The numerator excludes liabilities backed by segregated current pension assets; the denominator excludes those and segregated non-current assets | — | **constant** — structural | ITAA 1997 s 295-390(3) | 2026-09-10 | primary-verified |
| **The Act does not prescribe the averaging** | *"average value **for the income year**"* — no daily, monthly or opening/closing rule anywhere in the Act or the Regulations, and a regulation could have prescribed one. **Daily time-weighting is actuarial convention, not law**, and every figure derived from it inherits that label. Two actuaries may certify different percentages on identical data, both correctly | — | — | ITAA 1997 s 295-390(3), read against the exhaustive ITAR check above | 2026-09-10 | **`unverified` — U37. This is why the exempt proportion is a Setting or a bound and never a computation presented as certified** |

---

#### 3.11.2 There is no apportionment — and the days formula that exists is for RSAs

**The answer O60 was opened for, stated once.** Neither method splits a part-year. Under s 295-385
nothing is apportioned at all: each dollar is exempt or not according to **when it was derived and
from what**. Under s 295-390 the year is **not split**: one proportion covers the whole year's
income, including income derived months before any pension existed. A mid-year start reaches the
s 295-390 answer only *indirectly*, through a lower **average** liability value for the year.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **A part-year change is NOT apportioned by days** | not days, not asset values, not a two-period split. The two mechanisms give **different numbers on the same facts** (§3.11.7), so the method is not assumable | — | **constant** — structural | ITAA 1997 ss 295-385(1)(b), (3); 295-390(1), (3) | 2026-09-10 | primary-verified |
| **The days formula that exists is for RSAs only** | **s 295-410** apportions by `days the pension was paid ÷ days the RSA existed`, reached through **s 295-405 item 3** (*"for **part** of the period"*). Parliament had the part-year problem and a days formula in hand and wrote it **only for RSAs**; there is no equivalent for a complying superannuation fund | — | **constant** — structural | ITAA 1997 ss 295-405 items 2, 3; 295-410 | 2026-09-10 | **inference from an express provision elsewhere in the same Subdivision (*expressio unius*) — an argument from the ABSENCE of the equivalent provision for a fund. NOT bare `primary-verified` (R6). T130** |
| **The fund-level proportion decomposes into a per-interest time weight** | with one pooled return, liability value = account balance, daily averaging and no segregated assets, `exempt income = Σ_p (income of interest p × fraction of the year p was in retirement phase)` — **arithmetically identical** to s 295-390(3), verified to the cent against §3.11.7 fixture F1 | — | computed | derived from ITAA 1997 s 295-390(3) | 2026-09-10 | **arithmetic given four stated assumptions — (i) one pooled return, (ii) liability value = account balance, (iii) daily averaging, (iv) no segregated assets — and the assumptions are `unverified` (U37).** This is what makes `fundEarningsTax`'s per-interest shape salvageable: it needs a **fraction**, not a boolean |

---

#### 3.11.3 Deemed segregation, and the s 295-385(9) election

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **Deemed segregation** | if **every** interest in the fund is in the retirement phase at a time, the fund has no other liabilities, so **all** its assets are dealt with solely for RP liabilities and — for an account-based pension — are **segregated current pension assets automatically**, with no certificate and no trustee act. **It arrives on the conversion day by itself** | — | **constant** — structural | ITAA 1997 s 295-385(4) read with reg 295-385.01(a)(iii); **corroborated by ss 295-385(9), (10)(a) and 295-387(3)**, each of which presupposes it | 2026-09-10 | **a reading of the operative words applied to a fund with no other liabilities, corroborated three times inside the statute — NOT bare `primary-verified` (R6). T127** |
| **The s 295-385(9) election exists ONLY for the mid-year case** | available **iff** all interests were in the retirement phase **at one or more times** in the year (9) **and not at all times** ((10)(a)) **and** the assets are not DSFA ((10)(b)). Its effect: **none** of the fund's assets are segregated current pension assets for the **whole** year (8) → s 295-390 for the whole year, certificate required | — | **constant** — structural | ITAA 1997 s 295-385(8), (9), (10), inserted by **No 10 of 2022** Sch 5 item 1, eff 1 Apr 2022, applicable **2021-22 and later** | 2026-09-10 | primary-verified |
| **The election changes the number, and which way depends on WHEN income was derived** | one member, $900,000, converting 14 Dec 2026, $45,000 of income of which a **$15,000 gain realised 20 Nov**: segregated → **$4,296.58**; election → **$3,069.86**. Same facts, **$1,226.71 apart** — and moving the gain to March flips the sign | 2026-27 | — | ITAA 1997 ss 295-385(1), (8)–(10); 295-390(1), (3) | 2026-09-10 | primary-verified as to the provisions; the figures assume **daily averaging (U37)** and even accrual of the non-gain income |
| **Prescribed streams: the segregated pool is capped at the account balance** | assets supporting a prescribed benefit are **not** segregated current pension assets *"to the extent that the **market value** of the assets **exceeds the account balance** supporting the benefit"* | — | **constant** — structural | ITAA 1997 s 295-385(6) | 2026-09-10 | primary-verified — **NOT MODELLED: needs per-asset market values. Refuse** |

---

#### 3.11.4 Disregarded small fund assets — ITAA 1997 s 295-387

This is the **disqualifying-circumstances rule**: where it bites there is no choice of method at all.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **DSFA FORCE the proportionate method** | if s 295-387(2) is met the fund's assets are DSFA **at all times in the year** and can be **neither** segregated current pension assets (s 295-385(7)) **nor** segregated non-current assets (s 295-395(3)); the (9) election is removed too (s 295-385(10)(b)). **Whole year, proportionate, certificate required, no choice** | — | **constant** — structural | ITAA 1997 ss 295-387(1), (2); 295-385(7), (10)(b); 295-395(3) | 2026-09-10 | primary-verified |
| **The DSFA threshold — $1,600,000, FROZEN** | s 295-387(2)(c)(i), a literal in the subsection, **never amended**, and **absent from the s 960-265 indexation table**, whose opening words are *"This table sets out the provisions for which indexation is relevant"* | — | **constant — NOT config** | ITAA 1997 s 295-387(2)(c)(i) · **s 960-265**, complete table (items 1, 2, 3, 3A, 5–10, 10A, 10B, 10C, 11, 12, 13, 13A, 14) | 2026-09-10 | primary-verified as to the literal; **the non-indexation is an argument from absence in an exhaustive table and keeps that label (R6)**. **T126 — never wire it to the general transfer balance cap ($2,100,000 for FY2026-27)** |
| **DSFA is tested at the PREVIOUS 30 June** | (c)(i) and (c)(ii) are both tested **just before the start of the income year**. In the year a first pension commences the person was not a retirement phase recipient at the previous 30 June, so (c)(ii) fails and the fund is **not** DSFA — in the very year the apportionment question arises | — | **constant** — structural | ITAA 1997 s 295-387(2)(c) | 2026-09-10 | **a reading of the timing words applied to a first conversion — labelled inference, not bare `primary-verified` (R6). T129** |
| **DSFA reaches ACROSS funds** | (c)(ii) applies *"**whether or not the fund is the superannuation income stream provider**"*, so a large **APRA-fund** pension held by one spouse can taint the couple's SMSF | — | **constant** — structural | ITAA 1997 s 295-387(2)(c)(ii) | 2026-09-10 | primary-verified. **T128** |
| **DSFA has its own escape** | a fund all of whose assets would, but for s 295-385(7), be segregated current pension assets **at all times** in the year is **not** DSFA — so a fund that is 100% retirement phase all year is never DSFA | — | **constant** — structural | ITAA 1997 s 295-387(3), inserted by **No 111 of 2021** Sch 3 item 1, eff 1 Oct 2021, applicable 2021-22 and later | 2026-09-10 | primary-verified |

**DSFA is computed, not asked** (§3.11.8). Everything s 295-387 needs is state the projection already
carries — TSB at the previous 30 June (§3.8) and retirement-phase-recipient status at that day — and
the test has three timing traps a user will get wrong. Asking a user to self-assess a rule with a
frozen $1.6m threshold that *looks* like an indexed cap is inviting **T126** into the Settings file.

---

#### 3.11.5 No form, no Commissioner, no definition of the certificate

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **No Commissioner, no form, no notification** | Subdivision 295-F prescribes **no** form, deadline, content, lodgment or retention rule for the s 295-385(9) election, and involves the Commissioner nowhere. The words *Commissioner*, *approved form* and *notify* do not appear in any of the five core sections | — | — | search of the full retrieved text of ss 295-385, 295-387, 295-390, 295-395, 295-400 | 2026-09-10 | **argument from absence across the retrieved Subdivision — labelled, not `primary-verified` (R6). U36 — and it is why a user-stated method cannot be checked against anything** |
| **"actuary" is defined; "actuary's certificate" is not** | *actuary* means **a Fellow or Accredited Member of the Institute of Actuaries of Australia**. The Dictionary has **no** definition of *actuary's certificate*, so the Act prescribes no form or content for the document the whole proportionate method rests on | — | **constant** — structural | ITAA 1997 s 995-1 (`actuary`); absence verified by searching the full retrieved s 995-1 document — the only `certificate` hits are *NRAS certificate*, *registered PGO certificate* and *shipping exempt income certificate* | 2026-09-10 | primary-verified as to *actuary*; **the absence is an argument from absence in an exhaustive dictionary — U34** |

---

#### 3.11.6 The conversion year is charged at the BOUND — RULED (R10)

> **RULED (R10), 2026-09-10 — narrow `MidYearPhaseChangeError`; do not lift it, and do not leave it
> standing as it is.** Four steps, in order:
>
> 1. **Rewrite the refusal message unconditionally.** It asserts three things now known false —
>    including the unchecked cross-pass negative that s 295-390 *"has never been retrieved by any
>    pass"* (**O70**). Owed whether or not the refusal survives.
> 2. **Replace `phaseHeldForTheWholeYear: boolean` with a fraction.** §3.11.2 shows the fund-level
>    proportion decomposes exactly into a per-interest time weight, so the existing per-interest API
>    shape survives the change; the boolean is a fraction collapsed to its two endpoints. The natural
>    input is the **conversion day** — the R5 Setting, which must exist anyway for the transfer
>    balance credit — not a second Setting.
> 3. **Compute the conversion year at the provable UPPER BOUND — 15% on everything — by default,
>    disclosed by name** in the caveats: *"the conversion year is charged at the accumulation rate on
>    the whole year's earnings. This is a proven upper bound on the fund's liability under both
>    ss 295-385 and 295-390, not the fund's actual ECPI; the true figure requires an actuary's
>    certificate (s 295-390(4)) or asset-level tracing (s 295-385(1)(b)). It understates the
>    household."*
> 4. **Keep named refusals** for the segregated method and for an unstated s 295-385(9) election
>    (§3.11.9).

**Why step 3 is not a plausible default — it is a bound with a PROOF, which is a different object.**

> **Let `taxableEarnings ≥ 0`.** The exempt proportion under s 295-390 lies in **[0, 1]** by
> construction — s 295-390(3)'s two averages are non-negative and the numerator's liabilities are a
> subset of the denominator's — and the exempt amount under s 295-385 lies in
> **[0, the year's income]**. Therefore, under **either** method, **fund earnings tax ≤ 15% ×
> taxable earnings**.

**The non-negative condition is part of the proof, not a footnote to it — CORRECTED 2026-09-10
(P3-31).** Until this correction the proof above read *“under **either** method and on **any**
facts”*, with no condition on the sign, and **it claimed more than it establishes**. The second
interval gives it away: *“[0, the year's income]”* is not an interval at all when the income is
negative. For a loss year the inequality **reverses** — with an exempt proportion `p` in [0, 1] the
assessable amount is `(1 − p) × income`, so `15% × income` is the **most negative** figure the two
methods can produce rather than the least. Charging a part-year loss wholly at the accumulation rate
would be the **largest notional refund available**, which is the flattering direction this bound
exists to prevent — the same direction as F3, arrived at from the other side. **R10 is not touched
by this**: the ruling is sound and its four steps stand. What was over-broad was the justification
written under it.

**Worked example — the mirror of Example A's Alex (§3.11.7), and the figure the bound would produce
on a loss.** Same interest, same conversion on 14 December 2026, same 199 of 365 days, with the
$45,000 of income replaced by a $45,000 **loss**:

```
the bound, applied anyway   −45,000.00 × 0.15                            =  −$6,750.00
the proportionate figure    exempt        −45,000 × 199/365 = −$24,534.25
                            assessable    −45,000 − (−24,534.25)          = −$20,465.75
                            −20,465.75 × 0.15                              =  −$3,069.86
```

On a gain the bound sits **$3,680.14 above** the statutory answer (F2 − F1). On a loss of the same
size it sits **$3,680.14 below** it. **Confidence — `computed`, and the arithmetic is the whole of
the claim.** It is *not* a statement that a complying fund's negative earnings are what ss 295-385
and 295-390 take as their input, or that §3.11's machinery applies to a loss at all; that question is
open and is deliberately not resolved here (§3.11.9 records that the same underlying fact is computed
under Division 296 and refused under Subdivision 295-F, and that nothing in this register reconciles
the two). The example shows only which way the *bound* would err if it were applied — and that is
enough to fix the proof, because a bound that can err downward is not a bound.

**What makes the condition safe in practice: `FundLossNotModelledError` runs ahead of the rate
lookup.** In `fundEarningsTax` the negative-earnings refusal is the **last of the four input
guards**, standing between the whole-number check and `CHARGED[phase][coverage]`, so a loss never
reaches the charge table,
never acquires a `basis` and can never be returned as a bounded figure. **The load-bearing property
is not the line's position but that the guard is unconditional over `coverage`** — moving it below
the lookup while leaving it unconditional changes no result (the lookups are pure and total), whereas
narrowing it to whole years only — the repair an implementer reaches for once told the part year is
“covered by the bound anyway” — returns **−$6,750.00 on the facts above, labelled as an upper
bound**. **Until 2026-09-10 that narrowing failed no test in the suite** (the loss fixture was
charged over a whole year); `test/core-super-phase.test.mjs`, *“a PART-year loss is refused too”*, is
the fixture that now fails against it, and it asserts the refusal **rather than** a charge — no
`tax`, no `basis`, no bound caveat comes back. **Confidence on the “failed no test” claim — an
argument from absence over this repository's suite as run on 2026-09-10, and under **R6** not
`primary-verified`.**

**The same over-broad sentence survives in two places this correction does not reach.**
`src/core/superPhase.ts` repeats *“under **either** method on **any** facts”* in two comments (the
module header and the charge-table comment), and `docs/research/p3-25-ecpi-apportionment.md` carries
it in §5 and in its findings table. Both are **recorded and not fixed** — `src/` and the research
reports are out of scope for the brief that wrote this row, and neither statement changes a computed
figure, because the code's own guard is what keeps the claim true.

Charging a conversion year wholly at the accumulation rate is therefore a **ceiling on the true
liability**, verified against both worked examples ($11,250.00 ≥ $7,569.86; $6,750.00 ≥ $4,296.58 and
≥ $3,069.86). It is not an estimate that happens to look safe: it is arithmetic, and its failure mode
**overstates fund tax and understates the household**.

**Why R9's reasoning governs this and R1's does not.** R1 refused because *"warn and continue"* had
no conservative form — continuing forced the model to decide where commuted capital went, and the
natural default flattered the household. R5 refused for the same class of reason: silence there was
conservative on the tax side but **flattering on the cap side**, because with no conversion there is
no s 294-25 credit and a real breach goes undetected. **Neither shape arises here.** The bound
*records the conversion*: the interest changes phase on the conversion day, the s 294-25 item 2 credit
still arises, and the cap check still runs. All that changes is that the conversion year's earnings
keep the 15% rate. **Every arrow points the same way**, so this is **R9's case, not R1's** — refusing
would trade a conservative answer for no answer, inside the planning horizon the tool exists to talk
about.

**The naive repair lands on the flattering extreme, which is why the refusal is narrowed and not
lifted.** Deleting the guard and honouring each interest's stated phase returns **$4,500.00** against
a statutory **$7,569.86** and a bound of **$11,250.00** — identical, to the cent, to the *provable
floor* (§3.11.7). It is not an approximation of the right answer; it is the worst available answer in
the wrong direction, and **M-P3-25-1** (§9) is the mutation that catches it.

> **RESOLVED 2026-09-10 BY RULING R11, AND BUILT — O69, the SMSF/APRA discriminant. R10 does NOT settle it.**
> All of the machinery in §3.11 bites **only for an SMSF**. For an APRA-fund member ECPI is
> invisible: the fund computes it and the member's balance simply arrives net, so the 15% / 0%
> per-interest model is a *modelling convention* for such a member, not a description of what the
> fund does. **The model NOW HAS an SMSF/APRA discriminant — `fund?: FundType` on the interest, absent by default, dispatched in `src/core/ecpiMethod.ts` before any ECPI question is asked (was: no discriminant).** Step 3's **upper bound is conservative for
> either fund type**, so it is safe to build ahead of this; **step 4's refusals are unscoped and must
> not reach an APRA household.**

---

#### 3.11.7 Golden fixtures — the hand-worked figures

Every figure traces to `docs/research/p3-25-ecpi-apportionment.md` §5 and is reproducible by hand.
Both examples run **FY2026-27** (365 days) with a conversion on **14 December 2026**: 166 days of
accumulation, **199 days** of retirement phase, `199 / 365 = 0.545205479452…`.

**Example A — a two-member household SMSF, one member converting.** Alex $900,000 (converts 14 Dec),
Sam $600,000 (accumulation all year), fund taxable earnings **$75,000**, balances held flat. Not DSFA
(both limbs of s 295-387(2)(c) fail — **T129**); not 100% retirement phase at any time, so the (9)
election is unavailable and no assets are segregated. **Proportionate method, whole year.**

```
average value of current pension liabilities  =  900,000 × 199/365   =    $490,684.93
average value of superannuation liabilities   =                         $1,500,000.00
exempt proportion                             =  0.3271232877  =  32.71232877%
exempt income      =  75,000.00 × 0.3271232877                       =  $24,534.25
assessable income  =  75,000.00 − 24,534.25                          =  $50,465.75
fund earnings tax  =  50,465.75 × 0.15                               =   $7,569.86
```

| Fixture | Facts | Required answer |
|---|---|---|
| **F1 — Example A, statutory** | as above | **$7,569.86** — in cents, `taxableEarnings = 7_500_000`, `exemptProportion = 0.3271232877`, `tax = 756_986` (`5_046_575 × 0.15 = 756_986.25`, rounded half away from zero by `mulCents`) |
| **F2 — Example A, the upper bound** | whole year at the accumulation rate | **$11,250.00** = `1_125_000` cents, **+$3,680.14** against F1. Any implementation returning **less** than this for a conversion year with no stated exempt proportion is flattering the household |
| **F3 — Example A, the naive fix (and the provable floor)** | drop `phaseHeldForTheWholeYear`, take each interest's stated phase: Alex 0% on $45,000, Sam 15% on $30,000 | **$4,500.00** = `450_000` cents, **−$3,069.86** against F1 — **identical to the provable floor**. A test asserting the engine does **not** return this is the mutation guard for the whole refusal (**M-P3-25-1**, **T132**) |
| **F4 — Example B, both branches** | single member, $900,000, converts 14 Dec, income $45,000 of which a **$15,000 gain realised 20 Nov**; deemed segregation from 14 Dec under s 295-385(4) | segregated → **$4,296.58** (`429_658` cents); s 295-385(9) election → **$3,069.86** (`306_986` cents). **$1,226.71 apart on identical facts** — the fixture that proves the method choice is not assumable. Both sit under that year's bound of $6,750.00 |

**Cross-check of the decomposition (§3.11.2).** Per-interest and time-weighted, Alex's share of the
income is $45,000, of which 199/365 is exempt → **$24,534.25**, identical to the fund-level figure to
the cent.

**Every figure on this page that depends on `199/365` inherits U37**: daily averaging is convention,
not law. They are reproducible; they are not certified.

---

#### 3.11.8 Placements — what is computed, what is a Setting, what is refused

| Fact | Placement | Why |
|---|---|---|
| Whether the fund is a *small superannuation fund* (≤ 6 members) | **computed** | the tool models a couple's own super; a two-person SMSF is one by definition |
| Whether s 295-387 **DSFA** applies | **computed**, from state the model already holds | (c)(i) is TSB at the previous 30 June (§3.8); (c)(ii) is retirement-phase-recipient status at that day, which the projection knows once a conversion day exists. **Compute it; do not ask** (T126, T128, T129) |
| The **$1.6m DSFA threshold** | **frozen constant**, not config | absent from s 960-265 (§3.11.4) |
| Whether the fund is **100% retirement phase** at a time | **computed** — a property of the modelled interests | drives s 295-385(9) availability and deemed segregation |
| Whether the fund is an **SMSF or an APRA-regulated fund** | **Setting — per INTEREST, absent by default, no default value and specifically not `smsf`** (**R11**, closing **O69**). **BUILT** 2026-09-10 — `FundType` and `heldInFund` in `src/core/superPhase.ts` | a Person may hold an SMSF interest and an APRA one at once, and it is the *interest* that carries phase, so it is the interest that carries fund type. A default would silently decide which of the refusals below apply, which is the O69 defect rather than the fix. It is required **only** where a computation turns on it — `ecpiMethod` — and is refused there by name; `fundEarningsTax` neither reads it nor needs it, because §3.11.6's bound is a ceiling under either method and so is conservative for either fund type |
| **Which ECPI method the fund is on** | **Setting — required, never defaulted, per fund per year** where the fund is 100% RP for part of the year; **derivable** otherwise | a genuine binary election (s 295-385(9)) whose better branch depends on **when income was derived** (F4). No notification, no approved form, no Commissioner to check it against (U36) |
| The **exempt proportion** under s 295-390 | **Setting where the household holds a certificate; the stated bound of §3.11.6 where it does not** | s 295-390(4) makes the percentage a document the trustee **must** obtain before lodging, so for a historical year the number exists on paper and asking for it is asking for a fact the user has. For a **forecast** year the certificate does not exist and never will. What the tool must never do is *compute* the percentage and present it as though certified |
| **Segregated-method tracing** — which asset produced which dollar, and when | **NAMED REFUSAL** | needs an asset-level ledger with derivation dates; the model has interests and balances. **No assumption closes it conservatively — F4 shows the error runs both ways** |
| **s 295-385(6)** — market value exceeding the account balance | **NAMED REFUSAL**, or out of scope | needs per-asset market values |
| **s 295-395** segregated non-current assets · **s 295-400** pooled superannuation trusts | **out of scope, and said so** | a household SMSF paying an account-based pension has no reason to hold either, and both need the same asset ledger |
| **NALI and Subdiv 295-C amounts** (ss 295-385(2), 295-390(2)) | **out of scope, and it is safe** | both methods exclude them identically; §5A.3 already carries the 45% NALI rate |

---

#### 3.11.9 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs` reads
both tables.** The rows below are §3.11's additions to that inventory and are recorded here because
they are ECPI refusals, not transfer-balance ones. A row flips to `BUILT` on the day the class is
registered, and not before — and R8's instruction stands: collect the names into one module before
any more of them ship.

**The scoping is built (R11, 2026-09-10).** The two ECPI refusals were recorded here as *unscoped*
and gated on **O69**. O69 is closed: the SMSF/APRA discriminant is a per-interest Setting
(§3.11.8), absent by default, and `ecpiMethod` dispatches on it as a total lookup **before** any
ECPI question is asked. Neither refusal can fire for an APRA-fund interest.

| Refusal | Fires when | Status |
|---|---|---|
| **`SegregatedEcpiNotModelledError`** | **an SMSF interest only.** The caller states the fund is on the **segregated** method, and the fund was not 100% retirement phase at all times (where it was, deemed segregation answers the question and nothing is traced). Asset-level tracing; the error runs both ways (F4) | **BUILT** 2026-09-10 — `src/core/ecpiMethod.ts`. **Scoped by R11**: reached only through `BY_FUND_TYPE.smsf`, and the class is not named in the APRA branch |
| **`EcpiMethodNotStatedError`** | **an SMSF interest only.** The s 295-385(9) election is available — every interest was in the retirement phase at one or more times but not at all times — and no Setting says which branch was taken. Do **not** silently take either | **BUILT** 2026-09-10 — `src/core/ecpiMethod.ts`. **Scoped by R11**, as above |
| **`MidYearPhaseChangeError`** | **narrowed by R10 and no longer a conversion-year refusal.** It fires on the one route left to the 0% row: a `PhaseYearFraction` counted against a *different* financial year, where 365 of 366 days would pass a whole-year test while describing a year in which the phase changed | **BUILT** — `src/core/superPhase.ts`. R10 steps 1–3 done 2026-09-10: the message no longer asserts O70's false cross-pass negative or the certificate backwards, and a part year is charged at §3.11.6's bound |
| **`FundLossNotModelledError`** | `fundEarningsTax` is handed a **negative** taxable earnings figure for the year. One throw site, and its position in the guard sequence is load-bearing: it runs **after** both year guards and the whole-cents check and **before** any rate is looked up, so a loss never reaches the rate table at all and never acquires a `basis`. **This is a scope refusal — not a rule of law, and not an input-shape guard** (§3.5.1's distinction). A complying fund can and does make a loss; a negative earnings figure is well formed and lawful, and nothing about it is a mis-shaped input. What is missing is a **rule to apply to it**. **The negative the message asserts is true, and it is an argument from THIS document's contents rather than about the world (R6):** *“the loss is carried forward and deducted against a later year's assessable income, and the register records no rule for that at all”* — checked here, and this register carries no tax-loss rule for a superannuation fund anywhere, which is the opposite of the pattern **P3-29** records in three other modules. **What it does assert without a source is the positive limb**: that a complying fund does not receive 15% of its loss back and the loss is instead carried forward. That is a proposition of law, it decides which way this refusal points, and **this register holds no row and no citation for it** — the refusal stands on the negative alone, which is enough, and the rule it names is unrecorded | **BUILT** — `src/core/superPhase.ts` |
| **`PhaseYearMismatchError`** | a day that fixes phase is stated in one financial year and used against another. **Two throw sites and one row** — R8's one-refusal-one-home rule, the same judgement §3.8.1 makes for the balance-date guard; the sites guard different inputs, not different refusals. **(1) `phaseHeldFrom(fy, from)`** — the **conversion day** (the R5 Setting, §3.10) falls outside `fy`, so no `PhaseYearFraction` is built. It is **refused, not clamped**: clamping to 1 July or 30 June would manufacture a whole year or a one-day year out of a caller's mistake, and a whole year at the Retirement Phase row is exactly the flattering answer §3.11.6's bound exists to stop. **(2) `fundEarningsTax`** — the interest's own phase-statement day `interest.on` falls outside the year being charged. **This is an input-shape guard, not a rule of law.** No provision is breached by stating a phase on a day in another year; what the Act supplies is only **why the shape matters**, and that is the ground the message gives: phase is a fact about what the Person has done with the money **at a point in time** and not a permanent property of the account, because a retirement phase pension can be commuted back to accumulation — §3.10.4's ledger reading, with s 294-80(1) item 1 as the only debit. **The wrong year's phase statement is a plausible fact, not an invalid one**: the two statements are a year apart, nothing in a `FundEarningsTax` result would show which one produced it, and the date stamp is the only discriminant there is | **BUILT** — `src/core/superPhase.ts`, two throw sites. **The message fits site (2) and misdescribes site (1):** it opens *“the phase of this interest was stated on …”*, and `phaseHeldFrom` has no interest in scope — it was handed a conversion day, which its own docstring describes correctly. `src/` is out of scope for the brief that wrote this row, so this is recorded and not fixed |
| **`FundTypeNotStatedError`** | an ECPI mechanism is asked for and one or more of the fund's interests does not say whether it is an SMSF interest or an APRA one. R5's mitigation pattern: needed and missing gets a name, never a default. **Narrow** — it is raised only by `ecpiMethod`, the one computation that turns on fund type, and never by `fundEarningsTax` | **BUILT** 2026-09-10 — `src/core/ecpiMethod.ts` (**R11**, closing **O69**) |

**The two rows above joined this table on 2026-09-10 (P3-26).** Both were in
`src/core/superPhase.ts` and named **nowhere in this document** — a finding and not an exemption:
a refusal with no register row is a decision the specification does not record. They are recorded
here rather than under §3.10 because neither declines to apply §3.10's entry test. Both decline
inputs to **this** section's machinery — R10 step 2's `PhaseYearFraction` and the §3.11.6 bound
that consumes it — and §3.11.9 already holds the third guard of that same function. §3.11.6's
sentence *“the existing negative-earnings refusal in `src/core/superPhase.ts` needs no change”*
was, until these rows existed, the only place in this register that acknowledged the loss refusal at
all, and it named it by description rather than by name.

**What this register says about a fund making a loss, in full.** Three places, and none of them
is a rule this refusal could apply. **§3.10.4 / T65** — investment *losses* create **no transfer
balance debit**, which is a rule about the ledger and not about tax. **§3.7** — s 296-60(1) defines
fund earnings as *“relevant taxable income **or loss** −…”*, so Division 296 has an express
statutory limb for a fund going backwards, and `Div296NegativeEarningsError` refuses a negative only
**above** the very large balance threshold and **computes nil below it**, its own row saying in terms
that it *“is not a ‘negative earnings are invalid' check”*. **§5A** — the s 67-25(1C)/(1D)
conversion of excess franking credits into a **tax loss**, recorded precisely because it does **not**
reach a complying fund. **So the same underlying fact — the fund went backwards — is computed in
§3.7 and refused in §3.11, and nothing in this document reconciles the two or notes the difference.**
That is not an inconsistency in the code: the two sections compute different taxes under different
Divisions and may well be entitled to differ. It is that the specification never says they differ, or
why, so a reader who meets the Division 296 treatment first has no way to predict this one.

**§3.11.6's bound has an unstated premise, and the loss refusal is what discharges it.** The proof
reads *“under **either** method and on **any** facts, fund earnings tax ≤ 15% × taxable
earnings”*, and its own construction quietly assumes non-negative earnings: the s 295-385 interval
is written as *“[0, the year's income]”*, which is not an interval at all when the income is
negative. For a loss year the inequality **reverses** — with an exempt proportion `p` in [0, 1] the
assessable amount is `(1 − p) × income`, so `15% × income` becomes the most negative figure
available rather than the least, and charging a part-year loss wholly at the accumulation rate would
be the **largest** notional refund rather than a ceiling. It is `FundLossNotModelledError` — which
fires before the rate lookup — that keeps R10's proof true in practice, and **§3.11.6 states the
proof with no such condition on it and does not mention a loss year anywhere.** That premise was
unrecorded until this row; the code enforces it and the specification did not say it. **Both halves
were closed on 2026-09-10 by P3-31**: §3.11.6 now states the non-negative condition as a condition of
the proof, and the missing fixture — a loss in a *part* year, the only case where the bound's
direction is in question — is `test/core-super-phase.test.mjs`, *"a PART-year loss is refused too"*.
Until it existed the whole-year loss fixture was the only one, and narrowing the refusal to whole
years failed nothing.

**Two names now cover one class of condition in one function, and the collision is R10's doing.**
`MidYearPhaseChangeError` and `PhaseYearMismatchError` are thrown on adjacent lines of
`fundEarningsTax`, and after R10's narrowing **both fire on a fact counted against the wrong financial
year** — the first on the fraction, the second on the phase-statement day. This table's own row for
the first describes it purely as a year-mismatch guard, which is accurate and is no longer what its
name says: it is named for a mid-year phase change and can no longer refuse one. Nothing is wrong with
either check, and no rename is proposed here — R8 settles names through this register and not in
passing — but a reader hunting for the wrong-year refusal will find two, and only one of them is
called that.

---

#### 3.11.10 Cross-references

- **§3.1** — the two rates (15% / 0%) this section moves a fund between.
- **§3.8** — Total Super Balance, which is the s 295-387(2)(c)(i) input, read at the **previous**
  30 June (T129).
- **§3.10** — the phase answer ECPI consumes, the conversion day (R5) that step 2's fraction is
  derived from, and the s 294-25 credit that the bound of §3.11.6 leaves intact.
- **§5A.3** — the franking consequence of the phase answer: the credit survives s 207-90 via
  s 207-110(2)(b) and is refunded in full **under both methods**.
- **§8** — O67–O71, U34–U37. **§9** — M-P3-25-1. **§1** — T126–T134.

### 3.12 Downsizer contribution — ITAA 1997 s 292-102

Three figures, `constant` for every year, read from s 292-102 on the ATO legal database
(PAC/19970038/292-102) on 2026-09-25 (`docs/research/p9-5-downsizer-2026-09-25.md`), and moved
from `core/parsePlan.ts` literals into `superannuation.downsizer` on 2026-09-30 with no change of value:

| Key | Value | Provision |
|---|---|---|
| `superannuation.downsizer.minimumAge` | 55 | s 292-102(1)(a) — 55 or older when the contribution is made |
| `superannuation.downsizer.cap` | $300,000 per Person | s 292-102(3)(a) — not indexed; the couple's total is also capped at the sale proceeds (s 292-102(3)(b)) |
| `superannuation.downsizer.windowDays` | 90 | s 292-102(1)(g) — days after the change of ownership; the Commissioner's extension is not modelled |

---

## 4. Age Pension

### 4.1 The three-period structure

**Trap T22. Different parameters index on different dates, so a single financial year contains
three distinct parameter sets.** The register lists all three explicitly so a flat rate set cannot
be coded by accident.

| Indexed thing | Indexation date(s) | Index |
|---|---|---|
| Maximum basic rate | 20 Mar, 20 Sep | higher of CPI / PBLCI, then MTAWE-benchmarked |
| Pension Supplement | 20 Mar, 20 Sep | CPI only |
| Energy Supplement | **never** | — |
| Income free area | **1 July** | CPI (March quarter reference) |
| Assets free areas (homeowner and non-homeowner) | **1 July** | CPI (December quarter reference) |
| Deeming thresholds | **1 July** | CPI |
| Deeming rates | irregular, by Ministerial determination | AGA recommendation, not an index |
| Income and assets cut-offs | 20 Mar, 20 Sep **and** 1 July | derived: free area + (rate ÷ taper) |

Source: [DVA indexation ready reckoner](https://www.dva.gov.au/access-benefits/pensions-and-payments/ready-reckoners/indexation-of-income-support-pensions-and-allowances) · cross-check [Services Australia assets test](https://www.servicesaustralia.gov.au/assets-test-for-age-pension) ("reviews these limits and cut off points in **March, July and September** each year") · retrieved 2026-09-03 · **primary-verified**.

**The three parameter sets covering 20 Mar 2026 → 19 Mar 2027:**

| Period | Effective | Rates | Free areas / deeming thresholds | Deeming rates |
|---|---|---|---|---|
| 1 | 2026-03-20 – 2026-06-30 | 20 Mar 2026 set | old (to 30 Jun 2026) | 1.25% / 3.25% |
| 2 | 2026-07-01 – 2026-09-19 | 20 Mar 2026 set | **new** (1 Jul 2026) | 1.25% / 3.25% |
| 3 | 2026-09-20 – 2027-03-19 | **20 Sep 2026 set** | unchanged (1 Jul 2026) | **1.75% / 3.75%** |

### 4.2 Payment rates — three separate components (T23)

All per fortnight. Hold the basic rate, Pension Supplement and Energy Supplement as **three
constants**, never one blended number — they index on three different bases.

**Effective 2026-03-20** — `primary-verified`, [Services Australia](https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get) and the DSS 20 Sep 2026 rates list "Previous Amount" column, retrieved 2026-09-03:

| Component | Single | Couple (each) | Couple (combined) | Kind |
|---|---|---|---|---|
| Maximum basic rate | $1,100.30 | $829.40 | $1,658.80 | config |
| Pension Supplement — maximum | $86.50 | $65.20 | $130.40 | config |
| Pension Supplement — basic amount | $30.10 | $24.80 | $49.60 | config |
| Pension Supplement — minimum amount | $46.60 | $35.10 | $70.20 | config |
| Energy Supplement | $14.10 | $10.60 | $21.20 | **constant, never indexed** |
| **Maximum payment rate (total)** | **$1,200.90** | **$905.20** | **$1,810.40** | config (derived) |

**Effective 2026-09-20** — `primary-verified`, [DSS rates list, 20 September 2026 indexation](https://www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf), **published 20 Aug 2026**, retrieved 2026-09-03:

| Component | Single | Couple (each) | Couple (combined) | Kind |
|---|---|---|---|---|
| Maximum basic rate | $1,135.40 | $855.90 | $1,711.80 | config |
| Pension Supplement — maximum | $88.20 | $66.50 | $133.00 | config |
| Pension Supplement — basic amount | $30.70 | $25.30 | $50.60 | config |
| Pension Supplement — minimum amount | $47.50 | $35.80 | $71.60 | config |
| Energy Supplement | $14.10 | $10.60 | $21.20 | **constant, never indexed** |
| **Maximum payment rate (total)** | **$1,237.70** | **$933.00** | **$1,866.00** | config (derived) |

Transitional rate (no pre-2009 pensioner in this Household — recorded for completeness, not
modelled): single $963.60 + $14.10; couple each $778.20 + $10.60.

**From 2026-09-21 (P4-18) those two figures are a RECORD and not a sentence** — `AGE_PENSION.transitionalMaximumRate`, effective 20 Mar 2026, `primary-via-archive` (the 20 March rate
period is closed and its page has been overwritten by the 20 September one, so it was read off an
Internet Archive capture of the primary page). **It is cross-checked, which is what makes the capture
trustworthy**: the same archived table's **normal** rates reproduce the stamped `maximumBasicRate` above
to the cent in all three columns, so the right page, the right date and the right column were read.
⚠️ **It is still NOT MODELLED — promoting a figure is not modelling it.** Nothing in `src/` reads the
record; `maximumPaymentRate` and both means tests go on using the normal maximum basic rate. It is one
figure and not four: the transitional pensioner receives this maximum rate plus the Energy Supplement and
no Pension Supplement at all.

**Non-resident note** (relevant only to a "move overseas" Scenario): from 20 Sep 2026 pensioners
paid outside Australia lose the Pension Supplement **basic amount** entirely. `primary-verified`.

#### 4.2.1 The maximum basic rate HISTORY — evidence for a direction, not a rate table (2026-09-21)

`AGE_PENSION.rateHistory`, `secondary-only`, retrieved 2026-09-21 from
[DVA CLIK](https://clik.dva.gov.au/compensation-and-support-reference-library/payment-rates/historical-payment-rates)'s
per-indexation-date *"Income support payment rates"* tables. **Eighteen dated figures, 20 Sep 2015 →
20 Mar 2024**, single maximum basic rate per fortnight, rising from **$788.40** to **$1,020.60**.

**Why it exists.** The user's ruling of 2026-09-21 — *"assume current numbers continue whilst
awaiting future pertinent legislation"* — is safe only because a frozen nominal rate can only
UNDER-state the entitlement, and half of that is an empirical claim. Until this record the register
held two consecutive published sets, which evidence exactly one movement.
**Seventeen movements: sixteen rises, one stand-still, no falls.** ⚠️ **The stand-still is the
important row**: at 20 Sep 2020 the rate did not move — $860.60 before and after — because the CPI
had gone backwards and §4.7's factor floors at 1. It is why the claim is *never fallen*, not *always
risen*. See `STANDING_PARAMETERS_DIRECTION` in `src/data/assumptions/agePension.ts` for the full
argument, **§4.7.0** for the wiring it licenses (switched on 2026-09-21) and TODO.md **P4-1e**.

**Confidence, and the two cross-checks.** These are the **DVA service pension** maximum basic rates —
the same pension MBR the Age Pension pays, on the same calendar with the same components — but read
as an Age Pension series they are one remove from the DSS publication the tables above quote, so
`secondary-only` and not `primary-verified`. Each CLIK page carries an *old rate* beside its *new
rate*, and **every page's old rate reproduces the previous page's new rate**, so the chain closes
through all seventeen movements; and the Energy Supplement row of those same tables reads **$14.10 /
$10.60** at every one of those dates, which reproduces §4.2's own never-indexed constant to the cent.

⚠️ **NOT A RATE TABLE.** Nothing in `src/` computes with it. `maximumPaymentRate` uses the published
sets above, and a carried-forward period carries the **20 Sep 2026** set and nothing from here.

### 4.3 Income test

| Name | Value | Effective | Kind | Confidence |
|---|---|---|---|---|
| Income free area — single | $226.00 /ft | 2026-07-01 | config | primary-verified |
| Income free area — couple combined | $396.00 /ft | 2026-07-01 | config | primary-verified |
| Income free area — single (prior) | $218.00 /ft | 2026-03-20 | config | primary-verified |
| Income free area — couple combined (prior) | $380.00 /ft | 2026-03-20 | config | primary-verified |
| Income taper | **50c per $1** over the free area | — | **constant** | primary-verified |
| Couple application | 50c on **combined** income producing a **combined** reduction; the halving to 25c each is a presentation step | — | constant | primary-verified |

Source: [DSS rates list, 1 July 2026](https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf) · [Services Australia income test](https://www.servicesaustralia.gov.au/income-test-for-age-pension), verbatim "Over $396 | 25 cents for each dollar over $396" against "Amount each person's pension will reduce by" · retrieved 2026-09-03.

**Cut-offs are derived (T25):** `cut_off = free_area + total_rate ÷ 0.50`.

| Effective | Single | Couple combined | Couple illness-separated |
|---|---|---|---|
| 2026-03-20 | $2,619.80 | $4,000.80 | $5,183.60 |
| 2026-07-01 | $2,627.80 | $4,016.80 | $5,199.60 |
| **2026-09-20** | **$2,701.40** | **$4,128.00** | **$5,346.80** |

Check: (2,701.40 − 226.00) × 0.50 = $1,237.70 = the single total rate ✔; (4,128.00 − 396.00) ×
0.50 = $1,866.00 = the couple combined total rate ✔. **Fixtures, not stored values.**

#### 4.3.1 Salary sacrifice and the income test — RULED (R14)

**This section records no provision on Centrelink's treatment of salary sacrifice, and it never
has.** The income test rows above are the free areas and the taper; what *counts* as income for
SS Act 1991 s 8(1) is not tabulated anywhere in §4, and P6-8 brief 2 needed an answer in order to
walk a `SUPER_CONTRIBUTION` at all. So this is a **RULING taken in the ABSENCE of a source, not
against one.**

> **RULED (R14), 2026-09-19 — the Age Pension INCOME TEST assesses the GROSS salary, unreduced by
> salary sacrifice.** An effective salary sacrifice arrangement takes the sacrificed amount out of
> assessable income for ITAA 1997 s 6-5 (TR 2001/10), and §2's tax bases follow it down. **The
> income test does not.** The walk assesses the salary the Person would have been paid without the
> arrangement, in every month, for as long as it runs.
>
> **Two grounds, and they point the same way.**
> 1. **It is what Centrelink does.** Salary sacrificed to superannuation is added back for the
>    income test — an employer-provided benefit, in the same family as the reportable
>    superannuation contributions §2.3 adds back for Rebate Income. Sacrificing into super does
>    not raise a person's pension in the real system, and a model in which it did would be
>    advising a lever that does not exist.
> 2. **It is the conservative direction, whatever the provision turns out to say.** Gross assesses
>    MORE income, so it takes MORE pension off under the 50c taper (25c where only one member of a
>    couple is eligible — §4.3's couple application, and the figure a sibling fixture will get
>    wrong). The error therefore runs **against the Household**: this build UNDERSTATES the Age
>    Pension of anyone who salary sacrifices, and can never flatter one.
>
> **Confidence: `unverified`.** No primary text was read for it and none is cited here. It is a
> choice made to keep a forecast honest, not a finding about the law.
>
> ⚠️ **A real provision SUPERSEDES this ruling; it does not have to overturn it.** R14 holds the
> place open and nothing more. If SS Act 1991 s 8 and the Guide to Social Security Law are read
> into §4.3 and they say something else, the sourced answer wins on the day it lands, whichever
> direction it runs — including if it runs *for* the Household. Do not cite R14 as authority, and
> do not let its presence stand in for the research it is a placeholder for (**O76**).

**Where it is in the code:** `src/core/projection.ts` derives the month's means-test income from the
gross salary while every tax base takes the reduced one, and
`test/core-projection-tax.test.mjs` pins the two against each other — the sacrificing walk and the
no-sacrifice walk report the SAME Age Pension, with a stated-lower-salary walk beside them as the
control that proves the income test responds to salary at all.

⚠️ **This does NOT mean a sacrifice cannot move the pension.** It moves it through the ASSETS
test and the deemed income on the assets, in both directions: cash that would have been swept into
the Offset Account is assessed and deemed, and accumulation superannuation held by a Person under
Age Pension age is exempt from both tests (§4.8), so a sacrifice by the younger member of a couple
can RAISE the entitlement. R14 is about the income test's treatment of the WAGE and about nothing
else.

### 4.4 Assets test

| Name | Homeowner | Non-homeowner | Effective | Kind | Confidence |
|---|---|---|---|---|---|
| Assets free area — single | $333,000 | $600,000 | 2026-07-01 | config | primary-verified |
| Assets free area — couple combined | $499,000 | $766,000 | 2026-07-01 | config | primary-verified |
| Assets free area — couple, one partner eligible | $499,000 | $766,000 | 2026-07-01 | config | primary-verified |
| Assets free area — single (prior) | $321,500 | $579,500 | 2026-03-20 | config | primary-verified |
| Assets free area — couple combined (prior) | $481,500 | $739,500 | 2026-03-20 | config | primary-verified |

| Name | Value | Effective | Kind | Confidence |
|---|---|---|---|---|
| **Extra allowable amount** (non-homeowner − homeowner) | **$267,000** | 2026-07-01 | config — **one constant plus an offset** (T26) | primary-verified |
| Extra allowable amount (prior) | $258,000 | 2026-03-20 | config | primary-verified |
| Assets taper | **$3.00 per fortnight per $1,000** above the free area | — | **constant** | **primary-verified by exact derivation** — no verbatim primary quotation obtained (see §8) |
| Principal home exemption | home + up to the first **2 hectares** of adjacent land on the same title | — | constant | primary-verified |
| Homeowner test | a right or interest in the occupied home giving reasonable security of tenure | — | constant | **primary-verified in substance**; the exact "security of tenure" test is in Social Security Guide 4.6.3, which is 403-blocked |

$333,000 + $267,000 = $600,000 and $499,000 + $267,000 = $766,000 — both exact.

**The taper steps, it does not run continuously (T135):** SSA 1991 s1064 point 1064-G7 disregards
any part of a person's assets excess that is not a multiple of $250. Each member of a couple takes
half the combined excess, so `runAssetsTest` floors the COMBINED excess to a multiple of **$500**
for a couple and **$250** for a single Person before the $3.00/$1,000 taper is applied. This was a
measured defect against Services Australia Payment Finder (P13-3 run 2, 2026-09-24), not a reading
from the primary text alone — see T135.

**Cut-offs are derived (T25):** `cut_off = free_area + total_rate ÷ 3.00 × 1,000`, rounded up to
the next $250.

| Effective | | Single | Couple combined | Couple, one eligible | Couple illness-sep. |
|---|---|---|---|---|---|
| 2026-03-20 | Homeowner | $722,000 | $1,085,000 | $1,085,000 | $1,282,500 |
| 2026-03-20 | Non-homeowner | $980,000 | $1,343,000 | $1,343,000 | $1,540,500 |
| 2026-07-01 | Homeowner | $733,500 | $1,102,500 | $1,102,500 | $1,300,000 |
| 2026-07-01 | Non-homeowner | $1,000,500 | $1,369,500 | $1,369,500 | $1,567,000 |
| **2026-09-20** | **Homeowner** | **$745,750** | **$1,121,000** | **$1,121,000** | **$1,324,500** |
| **2026-09-20** | **Non-homeowner** | **$1,012,750** | **$1,388,000** | **$1,388,000** | **$1,591,500** |

Check: couple homeowner ($1,121,000 − $499,000) ÷ 1,000 × $3.00 = **$1,866.00 exactly** = the
couple combined total rate ✔.

**Owner-occupied with a mortgage ⇒ homeowner.** Mortgage debt is **not** deductible from other
assets — it is netted only against the asset it secures, which is itself exempt. That asymmetry is
correct and load-bearing.

Entitlement = the **lesser** of the income-test and assets-test results, computed on **combined**
Household means then halved. Per-Person calculation is the classic couple bug. Entitlement is an
output, never an assumption (ADR-0003).

#### 4.4.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the row below is
enforced from the moment it exists, status included. It is §4.4's addition to that inventory and the
**last** of the P3-26 quarantine: with it, every refusal in `src/` that this register merely mentions
now has a row of its own. Unlike §4.5.1's and §2.1.1's, this one was **not** unnamed here — **T39**
names the class in terms and says the calculation throws it, and §9's mutation row requires it. What
was missing is the row: nothing asserted that it was built, nothing said which file it lives in, and
no drift signal fired when either changed.

**It is a scope refusal** — §3.5.1's and §3.11.9's fourth kind, and it is a **third variety** of that
kind, distinct from both §4.5.1 records. `MissingIndexNumberError`'s and
`ModifiedLowTaxContributionsError`'s missing rule is **unretrieved** (research U2 — a Subdivision
nobody fetched). `MissingDeemingRatesError`'s is **undetermined** (O2 — a Ministerial act that has
not happened; no research pass can close it). This one's is **neither**: the rule is retrieved and
stated here in full — T39, s 1121(5), *"a correct statement of the law"* in its own words — and the
figure it needs **exists**, as the user-supplied market value T42 and ADR-0005 already carry for HEAS
capacity. What is missing is **permission to connect them**, withheld by a user ruling on
**2026-09-04**: *"House value is an input field. House value is not part of the means test."* So it
closes by **decision** rather than by research or by a Minister, and T39 says where the decision has
gone — Phase 14 (TODO P3-15, P14-5a). The input is as lawful and well formed as an input gets: an
enumerated member of `HomeStatus`, which is the means-test primitive T42 requires the model to keep.

| Refusal | Fires when | Status |
|---|---|---|
| **`RadPaymentUnfundedError`** | `project()` reaches an `ENTER_CARE` month whose RAD lump sum the whole Waterfall cannot fund (P14-18). Carries the `month`. | **BUILT** — `src/core/projection.ts`, one throw site. Refused in a single walk; read as a FAILING candidate by `sustainableSpend()` (P16-3, 2026-09-25), so an unaffordable RAD at a high spend factor limits the answer instead of abandoning the search. |
| **`HomePurchaseUnfundedError`** | `project()` reaches a `BUY_HOME` month whose price and costs — less what the sale's set-aside pays — the whole Waterfall cannot fund (P14-19, 2026-09-25). Carries the `month`. | **BUILT** — `src/core/projection.ts`, one throw site. `RadPaymentUnfundedError`'s precedent: refused in a single walk, read as a FAILING candidate by `sustainableSpend()`. |
| **`DownsizerContributionUnfundedError`** | `project()` reaches a `DOWNSIZER_CONTRIBUTION` month whose contribution — less what the sale's set-aside pays — the whole Waterfall cannot fund (P9-5, 2026-09-25). Carries the `month`. The door's own refusals (no sale in the scenario, under 55, over $300,000 at the date — not indexed, the couple over the sale price, more than 90 days after the sale — the ATO's extension is not modelled, a second for one Person, a non-accumulation interest, `statedOwnedTenYears` not true — the 10-year test is stated, never checked) are `PlanFileEntryError`s. | **BUILT** — `src/core/projection.ts`, one throw site. `HomePurchaseUnfundedError`'s precedent: refused in a single walk, read as a FAILING candidate by `sustainableSpend()`. |
| **`UnvaluedAssessableHomeError`** | `agePensionEntitlement` is given a Household whose `homeStatus` is `vacatedBeyondTwoYearExemption` — the home is past the two-year cliff, so it is a homeowner's home that is **no longer exempt**, and this model holds no value to assess it at. One throw site, in `src/core/agePension.ts`, on the `AssetSplit.homeIsAssessableButUnvalued` flag that `splitAssets` sets from the status alone. **It fires on the status and on nothing else**, before either means test runs, on any date, whatever the Household holds; the other four `HomeStatus` members all compute, and `test/core-age-pension.test.mjs` asserts that the three exempt ones give the **same** answer — the home's exemption is worth its whole value and its value is worth nothing. **FINDING 1 — the message asserts something about this register that is no longer true, and it is datable to a single day.** It ends: *"ADR-0005 and register T42 say the market value is read by HEAS capacity alone and never enters `assessableAssets`, while T39 says the home enters `assessableAssets` in full at exactly this moment. **The register contradicts itself here.**"* That was true when it was written. It is **false now**. **T39 was Resolved 2026-09-04 in favour of T42**, by the user ruling quoted above; T39's consequence column carries the resolution, names this class as its consequence, and moves full assessment treatment to Phase 14. **T42 was Resolved 2026-09-03 and Extended 2026-09-04** by the same ruling, so its *"never"* is *"now literal, with no vacated-home exception"*. The register does **not** contradict itself on this case. It records a **knowing divergence between the law and v1 scope** — T39's trap text is kept deliberately, as the evidence record — and that divergence is the **resolution**, not the problem. **The date is a single day, and a window inside it.** The message was written in `49caaf2` at **08:09 on 2026-09-04**; the ruling landed in `ff085db` at **11:05 on 2026-09-04**, two hours and fifty-six minutes later, and the message has not been touched since. Read off the two commits, not inferred. **FINDING 2 — the stale claim has four copies and only one of them is this refusal.** The same sentence lives in `src/core/household.ts` twice — `homeTreatment`'s JSDoc (*"The register contradicts itself on exactly this case"*) and `AssetSplit.homeIsAssessableButUnvalued`'s field comment (*"T39 vs T42 — the register's one self-contradiction"*) — and a fourth time as the **name of the test** that covers the refusal in `test/core-age-pension.test.mjs`: *"the register contradicts itself on the vacated-home cliff, so the calculation refuses"*. So the superseded reading is also what the suite calls the behaviour, and it is asserted in three files a reader would reach before reaching T39. **FINDING 3 — this register dated its own supersession and the code never heard.** §9's mutation row for this very refusal says in terms: *"The pre-2026-09-04 form of this row — asserting the debt reduces the now-assessable home in full — belongs to Phase 14, not v1."* The document marked the reading superseded, with the date, **in the row that requires this refusal**; four files away the message still carries that reading as a live contradiction. **FINDING 4 — the message names the wrong *kind* as well as a stale fact.** *"The register contradicts itself here"* describes a **drift tripwire on this register's own records** — this document's third kind — and this refusal is not one. It reads `homeStatus`, and neither T39 nor T42 is present in `src/` in any form a guard could compare; §3.1.1's `PublishedCapMismatchError`, which reads two records of this document against each other, is what that kind actually looks like. **FINDING 5 — it is a dead end, and deliberately, which is the opposite of §4.5.1's.** `MissingDeemingRatesError` names a Setting key in its own message and takes that Setting in preference to any determination, so it is a demand for an input. This one names no input that would let it compute, and by T42's extended ruling **none exists**: the market value is forbidden to enter the means test even where the user has already supplied it for HEAS. TODO P3-15b states the trap in terms — *"Do not add a market-value read to the means test to make it compute — that is the reopen condition in ADR-0005, not a fix"* — but that is a task list, not a specification, and no row of this register says that supplying the value is the wrong repair. **A bound worth stating: no module under `src/` calls `agePensionEntitlement` at all**, so as shipped this refusal is observable only from `test/`, the same bound §3.6.1 records for its own three sites. **And its sibling flag is read by nothing:** `splitAssets` sets `homeIsProtectedButUnvalued` beside it, and no code under `src/` reads that field — only a `test/core-household.test.mjs` assertion does | **BUILT** — `src/core/agePension.ts`, one throw site. **The refusal is sound and one sentence of its message is not.** Refusing beats silently under-assessing by the value of a house, and that half of the message stands. *"The register contradicts itself here"* is **false against this register as it stands, and false since 2026-09-04** — recorded here rather than corrected, because `src/` is out of scope for the brief that wrote this row |

**`INSURANCE_COVER_CHANGE` — raising cover (a door refusal, `PlanFileEntryError`, so not a row above).** An `INSURANCE_COVER_CHANGE` states a `coverFraction` of 1 or more (P3-17a slice 3, 2026-09-25): more cover needs the fund's underwriting (health evidence), and this build cannot know the answer — a scope refusal. The door's other refusals — no premium stated for the benefit (either, for `'both'`), a date on or after the birthday the account's cover for that benefit ends (`statedDeathCoverEndsAtAge` / `statedTpdCoverEndsAtAge`, 70 when absent; for `'both'`, once EITHER has ended, and the message names which), a `household` owner, an account not in the file — are input-shape guards. All `PlanFileEntryError`s. Status: **BUILT** — `src/core/parsePlan.ts`, `PARAMS_PARSERS.INSURANCE_COVER_CHANGE` and `checkInsuranceCoverChangeTargets`. The walk's own missing-account `RangeError` is unreachable through the door.

**Death and TPD cover end ages — stated per account (2026-09-29).** `statedDeathCoverEndsAtAge` and `statedTpdCoverEndsAtAge` on a `SuperInterest`, whole numbers 16 to 70, set the age each cover ends; absent is 70, Aware's own end age (Insurance Handbook p.4) and the last its tables price to (they stop at 69). The age is a fund's product term, not law, so there is no default other than Aware's — a fund that ends TPD at 65 must say so. A stated age above 70 (or below 16, or not a whole number) is refused at the door by name (`PlanFileHouseholdError`); `checkInsuranceAges` and `checkInsuranceCoverChangeTargets` read the age for each benefit, so the walk's `RangeError` stays unreachable. The premium is charged while the age last birthday is below the stated age. Income protection's end at 65 is fixed. Status: **BUILT** — `src/core/superInsurance.ts` (`insuranceCoverEndsAtAge`), `src/core/parsePlan.ts`.

### 4.5 Deeming

**Thresholds** — indexed 1 July, CPI. `primary-verified` (DSS 1 Jul 2026 rates list; [Services Australia deeming](https://www.servicesaustralia.gov.au/deeming)).

| Name | Value | Effective | Kind |
|---|---|---|---|
| Deeming threshold — single | $66,800 | 2026-07-01 | config |
| Deeming threshold — couple combined (at least one on a pension) | $110,600 | 2026-07-01 | config |
| Deeming threshold — member of a couple, **neither** on a pension | $55,300 each | 2026-07-01 | config |
| Deeming threshold — single (prior) | $64,200 | 2026-03-20 | config |
| Deeming threshold — couple combined (prior) | $106,200 | 2026-03-20 | config |

**Rates** — Ministerial determination, **no formula, no index** (T30).

| Effective | Lower | Upper | Kind | Confidence |
|---|---|---|---|---|
| 2020-05-01 – 2025-09-19 | 0.25% | 2.25% | historical | **secondary-only** (Challenger; adviser-grade) |
| 2025-09-20 – 2026-03-19 | 0.75% | 2.75% | historical | primary-verified |
| 2026-03-20 – 2026-09-19 | 1.25% | 3.25% | config | primary-verified |
| **2026-09-20 onward** | **1.75%** | **3.75%** | config | primary-verified — **determined**, not recommended |

Source: [AGA deeming rate recommendation, September 2026](https://aga.gov.au/publications/deeming-rate-recommendation-september-2026) and the [AGA letter to the Minister, 31 Jul 2026](https://aga.gov.au/sites/aga.gov.au/files/sites/aga.gov.au/files/publications/2026-08/p2026-799305.pdf) · retrieved 2026-09-03.

**Forward mechanism.** The COVID freeze at 0.25%/2.25% ended. Three +0.50% steps have occurred
(20 Sep 2025, 20 Mar 2026, 20 Sep 2026). From 2026 the Australian Government Actuary reviews at
least every six months and recommends to the Minister; **the Minister sets the rates by legislative
instrument and the AGA cannot change them**. The AGA has capped each recommended increase at 0.5%
and states the upper rate remains "well below the estimated overall earning rate". There is **no
legislated formula and no announced terminal rate**. Model as a user-editable Setting with a
scenario lever — for this Household, whose entire assessable wealth becomes deemed financial assets
at 67, it is the single most sensitive Age Pension input.

#### 4.5.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the row below is
enforced from the moment it exists, status included. It is §4's first addition to that inventory,
and the last of the P3-26 quarantine. It was in `src/core/deeming.ts` before this table existed and
was named **nowhere in this document** — a finding and not an exemption: a refusal with no register
row is a decision the specification does not record.

**It stays here, and this one is the narrowest case in the whole quarantine.** Unlike §3.5.1's three
or §2.1.1's, the rule it applies is not a decision that lived only in `src/`: this document states it
**three times** — **T30** (*"must be a user-editable Setting with a scenario lever. Not a constant,
not an indexed series"*), §4.5's own *Forward mechanism* paragraph (*"no legislated formula and no
announced terminal rate … Model as a user-editable Setting"*), and §8's **O2**, which is blunter than
either: *"Deeming rates beyond 20 Sep 2026 — **Unknowable.** … Nothing can close it."* What no
section says is that the engine **throws**. The rule is registered; the refusal that carries it out
was not.

**It is a scope refusal** — §3.5.1's and §3.11.9's fourth kind — and it has one feature none of the
others has: **a documented way out**. §3.6.1's modified interests and §3.11.9's fund loss refuse and
stop; this one names a Setting key in its own message and takes that Setting in preference to any
determination, so it is a demand for an input rather than a dead end (the scenario lever T30 asks
for). It differs from them in one more way. Their missing rule is **unretrieved** — research U2, a
Subdivision nobody fetched. This one is **undetermined**: the rule does not exist anywhere to be
found, because the next determination is a Ministerial act that has not happened. No research pass
can close it, which is precisely what O2 says.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingDeemingRatesError`** | `resolveDeemingRates` is asked for a date **after the last determination** and the caller supplied no rates Setting. One throw site, in the module's **only** entry point: `deemingThreshold` and `deemedIncome` both take rates as an argument, so there is no route into the deeming arithmetic that goes around it, and a supplied Setting wins even where a determination exists — that inversion **is** the scenario lever. **The input is as lawful and well formed as an input gets: a date.** What is missing is a rule to apply to it, which is why this is a scope refusal rather than an input-shape guard, and why no statute makes it a rule of law. **Finding 1 — §4.5's rate table reads against it, in one word.** The last row is stamped **"2026-09-20 onward"**, which reads as *these rates apply from that day until replaced* — and in law that is exactly what a determination does. The code refuses every date **strictly after** 2026-09-20. Verified by running: 2026-09-20 answers 1.75%/3.75%, 2026-09-21 refuses. The refusal is therefore deliberately **narrower than the law**: it declines to assert that a determination still in force *will still be in force*, because the AGA reviews at least six-monthly and the next review falls inside the window this table covers. §8's O2 says *beyond 20 Sep 2026* and agrees with the code exactly; §4.5's table cell says *onward* and does not, so a reader who reads the table and not O2 will read this refusal as a bug. Recorded, not fixed — the cell is a sourced record and changing it is not this row's business. **Finding 2 — the refusal's window is bounded above by a nameless one.** `agePensionEntitlement` resolves the parameter period **before** the rates, and `AGE_PENSION_PERIODS` covers 20 Mar 2026 – 19 Mar 2027, so this refusal is reachable only from 21 Sep 2026 to 19 Mar 2027; from 20 Mar 2027 a **bare `RangeError`** — *"no Age Pension parameter period covers …"* — takes over instead. Verified by running all four dates. Same shape as §2.1.1's: the named refusal is an **inner** boundary of the model and the outer one is **nameless**, outside R8's naming discipline and outside the reach of the test that reads this table. **Finding 3 — a record beside it carries the very figure it refuses, and nothing reads that record.** `agePensionPeriods` stamps every period with a `deemingRates` field resolved from the period's **start** date, so the third period carries 1.75%/3.75% across a window running to 19 Mar 2027 — six months of dates this refusal declines. The engine never reads it: it calls `resolveDeemingRates(date, …)`, and `period.deemingRates` is read **nowhere** under `src/`. A record consumed by nothing, holding an answer to the question its neighbour refuses to answer — this project's recurring signature, here pointing both ways at once. **Finding 4 — the Setting is required and the type says optional.** `AgePensionInput.deemingRates` is an optional field whose doc comment reads *"Required from 21 September 2026"*, so the requirement is a comment plus a run-time throw and nothing the compiler enforces — for the input this section itself calls the single most sensitive one the Household has (T30), on every projected date past September 2026 | **BUILT** — `src/core/deeming.ts`. One throw site. The Setting key it names, `agePension.deeming.ratesAfterLastDetermination`, is carried in `SETTINGS_NOT_ASSUMPTIONS` and answers `explainAssumption`, so unlike §5A.3.1's refusals this one's ground **is** reachable from code |

### 4.6 Work Bonus (T29)

| Name | Value | Effective | Kind | Confidence |
|---|---|---|---|---|
| Starting balance, new claimant | **$4,000** | current (page updated 2026-07-21) | config | primary-verified |
| Fortnightly accrual | **$300** /ft | current | config | primary-verified |
| Maximum accumulated balance | **$11,800** | current | config | primary-verified |
| Scope | **per Person**, never poolable across the Household | — | constant | primary-verified |
| Eligible income | employment and self-employment income **earned from active participation** | — | constant | primary-verified |
| Excluded income | investment income — assessed under deeming, outside the definition | — | constant | primary-verified |
| Accrual without work | accrues whether or not the Person works | — | constant | primary-verified |
| Sub-$300 fortnight | eligible income reduced to zero; the remainder of that fortnight's $300 is banked | — | constant | primary-verified |
| Order of application | applied to eligible income **before** the income test | — | constant | primary-verified |
| Eligibility | of Age Pension age and receiving Age Pension, Carer Payment or DSP. **Not available on the transitional rate.** | — | constant | primary-verified |

Sources: [Work Bonus balance](https://www.servicesaustralia.gov.au/work-bonus-balance) · [How the Work Bonus works](https://www.servicesaustralia.gov.au/how-work-bonus-works) · [Work Bonus and your partner's income](https://www.servicesaustralia.gov.au/work-bonus-and-your-partners-income) · retrieved 2026-09-03.

The one-off $4,000 boost for claims lodged 1 Dec 2022 – 30 Jun 2024 is **spent**. A first-time
claim simply starts at $4,000.

### 4.7 Indexation mechanism — store this, not the dollar figures (T23, T24)

```
# 20 March and 20 September, in order:
combined_couple_basic = combined_couple_basic * max(cpi_movement, pblci_movement)
benchmark             = 0.4176 * annualised_MTAWE          # SSA 1991 s 1195
combined_couple_basic = max(combined_couple_basic, benchmark)
single_basic          = 0.6633 * combined_couple_basic

pension_supplement    = pension_supplement * cpi_movement   # CPI only, never benchmarked
energy_supplement     = energy_supplement                   # never indexed

# 1 July, separately:
free_areas, assets_free_areas, deeming_thresholds  *= cpi_movement
```

| Name | Value | Kind | Confidence |
|---|---|---|---|
| Combined couple MTAWE benchmark | **41.76%** of annualised MTAWE | constant | **primary-verified** (DVA, Commonwealth) for the mechanism; SSA 1991 s 1195 itself **secondary-only** as retrieved |
| Single : combined-couple basic rate ratio | **0.6633** (66.33%) | constant | primary-verified |
| Effective single benchmark | ~27.7% of MTAWE (0.4176 × 0.6633) | derived — **do not store** | primary-verified |
| Annualised MTAWE figure | 52 × the ABS *Average Weekly Earnings, States and Australia* MTAWE amount | input series | primary-verified |
| MTAWE reference quarter | December quarter for 20 March; June quarter for 20 September | constant | primary-verified |
| CPI/PBLCI reference quarters | December (for 20 Mar) and June (for 20 Sep); base is the **highest** June or December quarter before the reference quarter | constant | primary-verified |

Ratio check against published figures: $1,135.40 ÷ $1,711.80 = 0.66327 ✔ (20 Sep 2026);
$1,100.30 ÷ $1,658.80 = 0.66332 ✔ (20 Mar 2026).

**Long-run behaviour, which is a first-order 40-year effect (T24):**

| Component | Indexed by | MTAWE-benchmarked | Real behaviour |
|---|---|---|---|
| Maximum basic rate | higher of CPI/PBLCI, floored at 41.76% MTAWE | **Yes** | tracks **wages** |
| Pension Supplement | CPI only | No | flat in real terms |
| Energy Supplement | nothing | No | **decays to nothing** |
| Income and assets free areas | CPI (1 July) | No | flat in real terms |
| Deeming thresholds | CPI (1 July) | No | flat in real terms |
| Deeming rates | Ministerial discretion | n/a | unmodellable from a formula |

Indexing the whole payment at CPI **understates** it; indexing it at wage growth **overstates** it.
And because the free areas are CPI-only while the payment is wage-linked, **the means tests bite
progressively harder in real terms every year, indefinitely**.

#### 4.7.0 THE STANDING TABLE IS WIRED (P4-1e, 2026-09-21) — what a month with no series gets

⚠️ **SUPERSEDED FOR THE WALK ON 2026-09-23 BY A USER RULING: a plan with no series is INDEXED, not
carried.** `project()` walks `stated ?? defaultAgePensionSeries(economicSeries, horizon's last day)`:
each 20 March and 20 September moves CPI and PBLCI by √(1 + the plan's annual rate) and grows the
O14 MTAWE level by √(1 + `mtawe`); each 1 July moves both CPI quarters by (1 + `cpi`). The chain
starts after the 20 September 2026 rates and the 1 July 2026 means test. A line computed from it
names the series as **generated**, not caller-stated, at the same `unverified` rank, and no month of
a walk carries a `standing parameters` note any more. What follows describes the standing table,
which is still what `agePensionPeriodAt` answers a direct caller who passes no series at all.

**Where a plan states no `Settings.economicSeries.agePension`, every date past 19 March 2027 is
computed from the sets published for that day, carried forward verbatim.** The user's ruling is
*"assume current numbers continue whilst awaiting future pertinent legislation"*; the argument that
makes it safe is `STANDING_PARAMETERS_DIRECTION` in `src/data/assumptions/agePension.ts` and its
evidence is §4.2.1. The gate on wiring it was **O30**, which closed on 2026-09-21; the machinery
landed the day before with the switch off.

**What the shipped behaviour is, in four places, because a carried figure that cannot be told from a
legislated one is the whole risk:**

| Where | What it carries |
|---|---|
| `AgePensionPeriod.standingFrom` | the day the sets were published for. Absent on every published period and on every indexed one |
| `AgePensionEntitlement.standingFrom` | the same value, passed through — the walk reads it here and nowhere else |
| `Month.notes` | a `StandingParametersNote` (`plan.ts`'s **fifth** member), carrying `standingFrom` and `STANDING_PARAMETERS_DIRECTION` itself, not a second copy of it |
| the line's `provenance` | a caveat naming both record keys, the day they were determined for and the date they were applied to, plus the direction. **A caveat and not a confidence downgrade**: the records consumed are the published ones and their confidence is unchanged — what is uncertain is their APPLICABILITY to the date, which is a different axis |

**Three boundaries, each deliberate.** (i) A **stated series still wins wherever it reaches**, and a
stated series that runs short still raises `MissingPensionIndexationError` — §4.7.1's row — because
a claim with a hole in it is not the same as claiming nothing. (ii) The **deeming rates are NOT
carried**: they are a Ministerial determination with no formula (T30, register **O2**), so past 20
September 2026 they still come from a Setting and `deemingRatesAt` still answers `undefined`.
(iii) The window is still **closed BELOW**: §4.7's mechanism indexes forward from a published set
and there is no table running backwards, so a date before 20 March 2026 is refused exactly as
before — which is now the ONLY thing `agePensionParametersCover` tests, and why that predicate lost
its `series` parameter rather than keeping an unread one.

**The control that was run, and it is a two-route check rather than a restated figure.** A
single-Person walk of 200 months, all 200 paid, **$507,667.99** of pension from the standing table,
against the identical walk driven by a **unit indexation series** — every movement exactly 1.000 and
the MTAWE benchmark set far below the rate, so §4.7's mechanism computes what the table carries by a
different code path. The two agree to **$13.54 over 200 months**, largest monthly divergence **9
cents**, in the conservative direction (the mechanism pays the extra). That is the documented
single-to-couple rounding residual (**O10**) and nothing else: the standing table is the mechanism
run at its floor.

**The §9 rows below it were applied, counted and reverted on 2026-09-21**, so none of them is a row
stating a hope: the boundary slip fails **2** tests, dropping `standingFrom` from the period fails
**12**, dropping the month's note fails **9**, and carrying the deeming determination forward fails
**1**. ⚠️ **The deeming row needed a second attempt and the first one is worth recording**: reading
`deemingRatesAt(LAST_PUBLISHED_PARAMETER_DAY)` instead of `deemingRatesAt(date)` failed **0** tests,
because both dates are past the last determination and both answer `undefined` — an EQUIVALENT
mutation, not a surviving one. The row is killed by a date that is not (`'2026-09-20'`), and by
exactly one assertion, which is thin: it is a single `assert.equal(standing.deemingRates, undefined)`
in `test/assumptions-age-pension.test.mjs`, and no walk can see the difference while every fixture
supplies `Settings.deemingRates`.

#### 4.7.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the row below is
enforced from the moment it exists, status included. It is §4.7's addition to that inventory, and
the first refusal in this register that guards a **forward** parameter rather than a published one.

**It is a scope refusal** — §3.5.1's and §3.11.9's fourth kind — and it is the **same variety** as
`MissingIndexNumberError` rather than a fourth: the rule is retrieved and stated in full (§4.7
above, SSA 1991 ss 1195 and 1197), the input is as well formed as an input gets (a date), and what
is missing is **a number that does not exist yet**. The forward CPI, PBLCI and MTAWE series is a
Setting and not an assumption (**O5**), so supplying it is the caller's act and inventing it is T13.
Like `MissingDeemingRatesError` and unlike §4.4.1's, it has **a documented way out**: it names the
Setting key in its own message, so it is a demand for an input rather than a dead end.

**Why MTAWE enters as a LEVEL and CPI/PBLCI as MOVEMENTS.** The benchmark is 41.76% *of a dollar
amount*; a growth rate has nothing to be a percentage of. ~~This register publishes **no MTAWE level
at all** — **O14** records that the ABS June 2026 MTAWE figure was never retrieved and O14 is open —
so there is no base here to grow.~~ **Superseded 2026-09-23: O14 is closed and the ABS May 2026
figure, $1,832.80 a week, is `AGE_PENSION.indexation.mtaweAnchor`**, which the generated default
series grows at `Settings.economicSeries.mtawe` (§4.7.0). Backing one out of the published 20 Sep 2026 rate is refused for
the reason O14 itself gives: it would assert that the benchmark bound in a year this document says
it can only infer that it did.

**A consequence for §4.5.1's Finding 2, recorded here rather than rewritten there.** That finding
says `MissingDeemingRatesError` "is reachable only from 21 Sep 2026 to 19 Mar 2027" because
`AGE_PENSION_PERIODS` runs out and a bare `RangeError` takes over from 20 Mar 2027. That bound was
a fact about the **published window**, and with a series supplied the window extends: the deeming
refusal is now reachable on **every** projected date past 20 Sep 2026, which is the behaviour T30
always described. The outer bound is still nameless where **no** series is given.

| Refusal | Fires when | Status |
|---|---|---|
| **`MissingPensionIndexationError`** | the caller supplied an Age Pension forward series (`Settings.economicSeries.agePension`, register O5) and it carries no observation for an indexation date the requested date depends on. **Two throw sites in one module and one row** — R8's one-refusal-one-home rule, the same judgement §3.11.9 makes for `MissingIndexNumberError`'s three sites: the two guard the **two indexation calendars** of T22 — 20 Mar / 20 Sep for the maximum basic rate and the Pension Supplement, 1 July for the free areas and the deeming thresholds — and §4.7 runs **one** mechanism on both. Both are in `src/data/assumptions/agePension.ts`, reached from `agePensionPeriodAt`, which `src/core/agePension.ts` and `src/core/projection.ts` both call. **The chain is cumulative, so a missing observation is a STOP and not a gap:** each indexation date indexes the set the previous one produced, and on the far side of a missing date there is no set to index from — which is exactly why the model must not step over it. **What it exists to prevent is named in the message: a nominal freeze.** Carrying the last determined rates forward across a forty-eight year horizon understates the payment by the whole of wage growth while wearing an assumption's provenance, and T23 records the blended-rate form of the same error. ⚠️ **HALF OF THAT SENTENCE IS SUPERSEDED BY A USER RULING OF 2026-09-21 and is kept because the other half still holds.** The understatement is real and is limb 1 of `STANDING_PARAMETERS_DIRECTION`; what the ruling changes is *"wearing an assumption's provenance"* — a carried set is marked `AgePensionPeriod.standingFrom`, so nothing can read one without being able to see that it was carried. **THIS REFUSAL IS UNTOUCHED EITHER WAY**: it fires only where a series was STATED and ran short, and a stated series with a hole in it is a claim that failed, which is a different thing from claiming nothing. See §4.2.1 for the evidence and §4.7.0 for the wiring, which landed 2026-09-21 once O30 closed. **It does not fire where no series is given**, because a caller who supplies nothing has claimed nothing; there the standing table answers every date above the published window and the window's LOWER boundary is still the nameless `RangeError` §4.5.1 Finding 2 describes. ⚠️ **The clause that followed — *"there the published window is the whole of the model and its outer boundary"* — is superseded for the UPPER boundary and kept, because it is the sentence the standing table reversed.** **The refusal is deliberately not caught by `project()`.** A walk that dropped the Age Pension line for the last twenty years because the user's series ran short would be the silent flattening this item exists against | **BUILT** — `src/data/assumptions/agePension.ts`, two throw sites |

### 4.8 Treatment rules

| Name | Rule | Kind | Source | Confidence |
|---|---|---|---|---|
| Account-Based Pension, assets test | assessed at the **account balance** | constant | [Services Australia income streams](https://www.servicesaustralia.gov.au/income-streams) | primary-verified |
| Account-Based Pension, income test | assessed as a **financial asset under the deeming rules** | constant | as above | primary-verified |
| ABP grandfathering | requires **both**: commenced before 1 Jan 2015 **and** continuously on a pension or allowance since 31 Dec 2014. **Structurally unreachable for this Household — hard-code `false`** (T28) | constant | as above | primary-verified |
| Younger-partner exemption | super in **Accumulation Phase** held by a Person under Age Pension age is exempt from **both** tests, including when assessing the older partner's claim | constant | [Services Australia superannuation](https://www.servicesaustralia.gov.au/superannuation) | primary-verified |
| Younger-partner exemption — end trigger | the **earlier of** the younger Person reaching **67**, **or the fund starting to pay any income stream — including a TTR** (T27) | constant | as above | primary-verified |
| One Person of age | means assessed on **combined** Household income and assets, at the couple thresholds; explicit "Couple (combined), including where only one partner is eligible" row at the same $499,000 / $1,121,000 | constant | DSS rates list; Services Australia | primary-verified |
| Energy Supplement eligibility | **payable to a new Age Pension claimant.** The 19 Sep 2016 closure applies only to Family Tax Benefit and the Commonwealth Seniors Health Card (T31) | constant | [Who can get Energy Supplement](https://www.servicesaustralia.gov.au/who-can-get-energy-supplement) | primary-verified |
| Energy Supplement on losing Age Pension | continues on a Commonwealth Seniors Health Card only if claimed within **6 weeks**, and only for people on an income support payment on or before 19 Sep 2016 — **so not this Household** | constant | as above | primary-verified |
| Pensioner Concession Card | comes with **any** Age Pension entitlement, however small — but **not** via HEAS at $0 entitlement (T32) | constant | CONTEXT.md; SS Guide 3.4.5.60 | primary-via-archive |

### 4.9 Qualifying age and residency

| Name | Value | Kind | Source | Confidence |
|---|---|---|---|---|
| Age Pension qualifying age | **67** | config | [Who can get Age Pension](https://www.servicesaustralia.gov.au/who-can-get-age-pension) — *"There are no plans to change this."* | primary-verified |
| Minimum total Australian residence | 10 years | config | [Residence rules](https://www.servicesaustralia.gov.au/residence-rules-for-age-pension) | primary-verified |
| Of which unbroken | 5 years | config | as above | primary-verified |
| Australian resident on the day of claim | required | constant | as above | primary-verified |

The staged increase to 67 completed 1 Jul 2023. **No further legislated increase exists.** Model 67
as current law with an explicit note that this is a policy risk, not an indexed parameter.

### 4.10 Refresh cadence

The DSS `/system/files/documents/<YYYY-MM>/` rates-list URL pattern is stable and the PDFs parse
cleanly. Re-fetch **four times a year**: late Feb, late May, late Aug, late Nov.

| Date | What changes |
|---|---|
| 2026-09-20 | Rates, cut-offs and deeming rates take effect as recorded above |
| ~2027-02-20 | DSS publishes the 20 Mar 2027 rates list; AGA publishes its next deeming recommendation (~late Jan 2027) |
| 2027-03-20 | Next rate indexation; next likely deeming step |
| ~2027-05 | DSS publishes the 1 Jul 2027 list |
| 2027-07-01 | Free areas, assets free areas and deeming thresholds reindex |

### 4.11 When one of a couple dies — bereavement (P12-1, 2026-09-24)

Read from the Internet Archive (the Guide's origin refuses curl) on 2026-09-24. Full notes:
`docs/research/p12-survivorship.md` §1.

| Name | Rule | Kind | Source | Confidence |
|---|---|---|---|---|
| Lump sum bereavement payment | **LBP = 6 × (CCR − NR) + NDEP × (CCR − NR) / 14** where notification is prompt (NEPED = 0). CCR is the combined couple rate that would have been payable but for the death; NR the survivor's new single rate; NDEP the days from and including the death to the end of the entitlement period | constant | SS Guide 3.1.5.70 | primary-via-archive |
| Who is paid it | the survivor, where the couple were **both pensioners** (or both long-term social security recipients, or the survivor one and the deceased a pensioner), and the new single rate is **less** than the couple's combined rate. A single rate of nil still pays it; a single rate higher than the couple's pays arrears and no lump sum | constant | SS Guide 3.1.5.70 summary · 3.1.5.30 table | primary-via-archive |
| Single rate from | the day of the partner's death, where both were pensioners. **The walk has months: the survivor is assessed as single from the first day of the month the `DEATH` is dated in** | constant | SS Guide 3.1.5.30 | primary-via-archive |
| **NDEP — a DECLARED BOUND, not a source** | **1**, its least value. NDEP depends on which fortnight Services Australia pays on, and a monthly walk has no payday calendar. The definition allows 1 to 14, so the payment is **never overstated**, and is understated by at most 13/14 of one fortnight's gap | — | `core/bereavement.ts` `BEREAVEMENT_DAYS_TO_PERIOD_END` | — |
| Illness-separated couples | the Guide gives a different formula, working the payment out as if they lived together and subtracting what the separated rates overpaid. **Not built: a death while an `ILLNESS_SEPARATION` is in force is refused by name** | — | SS Guide 3.1.5.70 | primary-via-archive |

---

## 5. Home Equity Access Scheme

Facility **defaults off** (ADR-0004 / concept.md §5.10). Everything below is `primary-verified`
unless the row says otherwise; where the retrieval channel was the Wayback Machine because
`guides.dss.gov.au` returns 403, the row reads **primary-via-archive** and stays that way.

### 5.1 The capacity formula

> **SS Act 1991 s 1135A(1):** maximum loan available = **age component amount × (value of real
> assets ÷ 10,000)**

| Name | Rule | Kind | Source | Confidence |
|---|---|---|---|---|
| Capacity formula | `age_component × floor(security_value / 10,000)` | **constant** — structural | SS Act s 1135A(1) | primary-verified |
| Security rounding | round **down** to the next lower multiple of $10,000 | constant | s 1135A(2)(a) | primary-verified |
| Nil floor | value of real assets **< $10,000 ⇒ nil** | constant | s 1135A(2)(b) | primary-verified |
| Whose age | the **younger member of the couple**, at **last birthday** | constant | F2019L00420 s 4(1)(b); SS Guide 3.4.5.30; Services Australia | primary-verified (four sources) |
| Couple structure | **each Person has their own loan against their own share** of the security, both using the younger partner's age component. A **50-50 arrangement** operates where one Person owns more than 50%, and also where a Person is qualified for but not receiving an income support payment | constant | SS Guide 3.4.5.30 | **primary-via-archive** |
| Recalculation cadence | **once every 12 months, on the younger Person's birthday** — a step function (T36) | constant | SS Guide 3.4.5.30 | **primary-via-archive** |
| Security value | `home_market_value − outstanding_owner_occupied_mortgage − nominated_amount` | input | Services Australia; SS Act s 1133(4), s 1136(1A)(b) | primary-verified |
| Nominated amount | a voluntary equity carve-out, changeable at any time by signed written request | Journal Entry field | SS Act ss 1136, 1137 | primary-verified |
| Insurance condition | buildings insured for **≥ 90%** of value, standard events | constant `HEAS_MIN_INSURANCE_PCT = 0.90` | SS Act s 1133(1)(cc) | primary-verified |
| Eligible property | any Australian real property. **Not** retirement village units without freehold title | constant | SS Guide 3.4.5.20; Services Australia | primary-verified |
| Value changes | must be notified; the maximum loan available moves **both ways** | constant | Services Australia | primary-verified |

**Combined couple capacity equals the single-formula result on the whole security** because
2 × (component × half ÷ 10,000) = component × (all ÷ 10,000) — but the **rounding happens per
Person on the per-Person share** (T37). Model per Person to be exact; the Household-level error is
at most one age component per Person (≈$2,700 at 67).

**The security value is a user estimate, and it is the only one in this register** (T42, resolved
2026-09-03). Every other figure here carries a source and a confidence rating; the home's market
value carries neither, because there is no statute, instrument or agency page to read it from — the
user types it. The formula around it is `primary-verified`; the number entering it is not verified
at all. So **everything downstream of it is an estimate and must be presented as one**: Maximum Loan
Available, remaining headroom, and projected HEAS debt. They may not be displayed alongside sourced
figures as though they carried the same confidence, and no test fixture may treat a market value as
a known quantity.

### 5.2 The age component table — F2019L00420 s 4(2), in full

Dollars of maximum loan per **$10,000** of security value. Effective **1 July 2019, unchanged
since**. Compiled 11 Jul 2026 (Compilation No. 1); the only amendment ever made was the 2026 scheme
rename (`F2026L00944`), which touched **not one number**.

**Kind: CONSTANT** (`HEAS_AGE_COMPONENT` — a frozen age→dollars lookup, stamped `effective
2019-07-01`). It is a legislative instrument with **no indexation mechanism at all**. Ship it
hard-coded, not as a user-editable Setting.

| Age (last birthday) | Age component | Age (last birthday) | Age component |
|---:|---:|---:|---:|
| **55, and each earlier year** | $1,710.00 | 75 | $3,750.00 |
| 56 | $1,780.00 | 76 | $3,900.00 |
| 57 | $1,850.00 | 77 | $4,050.00 |
| 58 | $1,920.00 | 78 | $4,210.00 |
| 59 | $2,000.00 | 79 | $4,380.00 |
| 60 | $2,080.00 | 80 | $4,560.00 |
| 61 | $2,160.00 | 81 | $4,740.00 |
| 62 | $2,250.00 | 82 | $4,930.00 |
| 63 | $2,340.00 | 83 | $5,130.00 |
| 64 | $2,430.00 | 84 | $5,330.00 |
| 65 | $2,530.00 | 85 | $5,550.00 |
| 66 | $2,630.00 | 86 | $5,770.00 |
| 67 | $2,740.00 | 87 | $6,000.00 |
| 68 | $2,850.00 | 88 | $6,240.00 |
| 69 | $2,960.00 | 89 | $6,490.00 |
| 70 | $3,080.00 | **90, and each later year** | $6,750.00 |
| 71 | $3,200.00 | | |
| 72 | $3,330.00 | | |
| 73 | $3,460.00 | | |
| 74 | $3,600.00 | | |

**Clamping:** every age below 56 takes the 55 value ($1,710); every age above 89 takes the 90 value
($6,750). Both endpoints are open-ended in the instrument.

Sources, three independent, agreeing on **all 36 rows to the cent**:
[F2019L00420](https://www.legislation.gov.au/F2019L00420/latest/downloads) (`primary-verified`) ·
[Services Australia age component](https://www.servicesaustralia.gov.au/age-component-for-loans-under-home-equity-access-scheme) (`primary-verified`) ·
DSS SS Guide 3.4.5.30 (`primary-via-archive`). Retrieved 2026-09-03.

**Worked examples — use as test fixtures:**

| # | Situation | Security | Age used | Calculation | Result |
|---|---|---|---|---|---|
| 1 | Single, 70 | $256,000 | 70 → $3,080 | 25 × $3,080 | **$77,000** |
| 2 | Couple, 70 / 69 | $256,000 | **69** → $2,960 | 25 × $2,960 | **$74,000** |
| 3 | Single, 70, nominated $80,000 | $180,000 | 70 → $3,080 | 10 × $3,080 | **$30,800** |
| 4 | Couple 72/68, joint, each nominates $45,000 | $240,000 | **68** → $2,850 | per Person: ($120,000 − $45,000) → floors to $70,000; 7 × $2,850 | **$19,950 each** |

Example 4 is the important one: it exercises the per-Person halving, the nominated-amount deduction
**and** the round-down (75,000 → 70,000, losing $5,000 of security) in a single case.

### 5.3 Draw modes

| Name | Value | Kind | Source | Confidence |
|---|---|---|---|---|
| `HEAS_FORTNIGHTLY_CAP_MULTIPLE` | **1.5 × maximum payment rate**, on a **FORTNIGHTLY** basis | constant | SS Act s 1134(1A)(a)(i) | primary-verified |
| Cap counts the Age Pension already received | yes — the loan is the **difference** | constant | SS Act s 1134(1A); SS Guide 3.4.5.40 | primary-verified |
| "Maximum payment rate" | maximum basic rate **+ Pension Supplement + Energy Supplement + Rent Assistance** (Pension Rate Calculator A, Module A, Step 4) | constant | SS Act s 1064 | primary-verified |
| `HEAS_ADVANCE_CAP_MULTIPLE` | **0.5 × maximum payment rate**, on an **ANNUAL** basis (T33) | constant | SS Act s 1134A(3)(a) | primary-verified |
| `HEAS_MAX_ADVANCES_PER_PERIOD` | **2** per period | constant | SS Act s 1134A(2)(b) | primary-verified |
| `HEAS_ADVANCE_PERIOD_FORTNIGHTS` | **26**, **rolling** from the day the first advance was worked out — per Person, not a calendar or financial year | constant | SS Act s 1133AA(1) | primary-verified |
| Second advance | capped at 0.5 × annual MPR **less the previous amount** | constant | SS Act s 1134A(3)(b) | primary-verified |
| Advance also capped by | maximum loan available **less** current debt | constant | SS Act s 1134A(3)(c) | primary-verified |
| Fortnightly rate during an advance period | ~~`max( MPR , 1.5 × MPR − advances_taken )` — a floor of **100%** of MPR~~ — **STRUCK 2026-09-25 (T136, P9-2b): a 26× error if implemented as written.** See the correction immediately below | constant | SS Act s 1134(1A)(b) | ~~primary-verified~~ — **wrong as transcribed, see T136** |

```
heas_fortnightly_draw   = 1.5 × MPR_fn − age_pension_actually_received_fn
heas_headroom_annual    = (1.5 × MPR_fn − pension_fn) × 26
heas_fn_during_advance  = max(0, (heas_headroom_annual − advances_in_period) / 26)
```

**T136, RESOLVED 2026-09-25 (P9-2b, `docs/research/p9-2b-heas-advances-gate-2026-09-25.md`): the
pseudocode above is right; the table row it replaced, read literally, is a 26× error and is struck,
not implemented.** The table row's `1.5 × MPR − advances_taken`, read with no annualising step,
subtracts a whole LUMP-SUM dollar figure from a FORTNIGHTLY rate — for a $10,000 advance against a
$15,323.10 annual headroom that floors the fortnightly rate at bare MPR for the **whole** 26
fortnights, forfeiting the ENTIRE year's loan top-up instead of correctly spreading the $10,000
across it ($10,000 ÷ 26 = $384.62/ft off the $589.35/ft rate, leaving $204.73/ft). Services
Australia's own worked example ("George" — see the source list at the top of §5) settles it, cent
for cent, in favour of the pseudocode: *"George also gets the maximum $589.35 ($15,323.10 yearly)
rate of loan payments... he wants a lump sum payment of $10,000... $15,323.10 yearly − $10,000
(advance payment) = $5,323.10 divided by 26 = $204.73 for 26 fortnights."* `heasFortnightlyDrawDuringAdvancePeriod` in
`data/assumptions/heas.ts` implements the pseudocode line and is pinned against this example, to the
cent, in `test/assumptions-heas.test.mjs`. **Applies to the WHOLE 26-fortnight window from the
advance's own date, not merely the fortnights after it** — George's own fortnight (the one the
$10,000 lands in) already draws the reduced $204.73, per the example above.

A full-rate pensioner can draw only the remaining **50%**; a **$0-entitlement Person can draw the
full 150%**. A full-rate pensioner taking the maximum advance gets **nothing** fortnightly for 26
fortnights; a part- or nil-rate pensioner keeps access up to 100% of MPR. **T137, RESOLVED 2026-09-25
(P16-4):** the "greater of MPR" floor collapses to the pseudocode's `max(0, …)` on the loan-only
component whenever `pension_fn ≥ MPR_fn` (a full-rate pensioner) or `pension_fn = 0` (nil) — both of
Services Australia's published examples (George, Olli) are one of these two. **For a genuine
part-rate pensioner (`0 < pension_fn < MPR_fn`), neither example settles it, but the Act's own
numbers do**: given the door's 50% annual advance cap, `combined_fn ≥ MPR_fn` for any `pension_fn` in
`[0, MPR_fn]`, so the floor is automatically satisfied by the plain unfloored formula and this build
no longer refuses that case (the `RangeError` in `src/core/projection.ts` is deleted).

**Dollar figures at the 20 Mar 2026 rates** — do **not** duplicate these into HEAS constants; derive
from the Age Pension assumption in §4.2, which reindexes 20 Sep 2026.

| | Single /ft | Couple each /ft | Couple combined /ft |
|---|---:|---:|---:|
| Maximum payment rate | $1,200.90 | $905.20 | $1,810.40 |
| Annual (× 26) | $31,223.40 | $23,535.20 | $47,070.40 |
| **150% cap /ft** | $1,801.35 | $1,357.80 | $2,715.60 |
| **150% cap /yr** | $46,835.10 | $35,302.80 | **$70,605.60** |
| **Max advance per 26 fortnights** | $15,611.70 | $11,767.60 | $23,535.20 |

`concept.md` §5.10's "~$70,600/yr" is **exact** for a nil-entitlement Household at the 20 Mar 2026
rates. The Act computes annually and divides by **364** for a daily rate (s 1064A1), so annual =
fortnightly × 26 exactly, with no 365/366 drift.

### 5.4 Interest

| Name | Value | Effective | Kind | Confidence |
|---|---|---|---|---|
| `HEAS_INTEREST_RATE` | **3.95% p.a.** | 1 Jan 2022, unchanged | **config, dated** | primary-verified |
| Compounding | **fortnightly** | — | constant | primary-verified |
| `HEAS_COMPOUNDING_PER_YEAR` | **26** — the periodic rate is `annual ÷ 26`, **not** `× 14/365` (T40) | — | constant | primary-verified by arithmetic against a primary worked example |
| Order of operations | draw is added to the balance **first**, then interest is charged: `balance = (balance + draw) × (1 + 0.0395/26)` | — | constant | primary-verified |
| Set by | the Minister for Social Services, by **legislative instrument** under s 1135(4) — administrative, disallowable, can move without notice | — | — | primary-verified |
| Rate history | 4.50% from 1 Jan 2020 → 3.95% from 1 Jan 2022. **The 4.50% rate is a record of its own from 2026-09-21** (`heas.interest.supersededRates`), read primarily from the instrument: *Social Security (Pension Loans Scheme – Rate of Compound Interest) Determination 2019* (**F2019L01613**), **s 5** — "the rate of compound interest is 4.50 per cent per annum" — made 10 Dec 2019, commencing 1 Jan 2020. **The repeal is confirmed too**: 1 Jan 2022, by **F2021N00323**, retrieved through the Federal Register of Legislation's OData API, which independently corroborates the end date the prose had claimed. ⚠️ **Services Australia's own worked example at this rate does NOT support T40's compounding convention** — see the convention fixture below | 1 Jan 2020 – 31 Dec 2021 | config, dated | **primary-verified** (upgraded from unstamped 2026-09-21) |
| Legacy pre-1996 scheme | 7% **simple**, closed to new entrants — irrelevant | — | — | primary-verified |

Instrument: *Social Security (Home Equity Access Scheme – Rate of Compound Interest) Determination
2026* (**F2026L00945**), made 6 Jul 2026. It **repealed and remade** the 2021 Determination — partly
for the scheme rename, partly because the 2021 version had been "inadvertently registered
incorrectly" as a notifiable rather than legislative instrument. **The rate did not change**; cite
F2026L00945, not the 2021 instrument.

**Convention fixture (T40):** at a balance of $1,501.14, Services Australia publishes $2.28.
`r/26` gives $2.2806 → 2.28; `r × 14/365` gives **$2.27433** → 2.27 (~~$2.2745~~ — struck on
2026-09-21: an arithmetic slip, and it rounds to $2.27 either way, so the conclusion it supports
stands). The published figure settles it. **The example itself is a record from 2026-09-21**
(`heas.interest.publishedWorkedExample`, `primary-verified`), and the counterfactual is now
**DERIVED** from the rate record in `test/assumptions-heas.test.mjs` rather than quoted here — which
is the real repair, and the reason the slip could happen at all: a figure typed into a sentence has
nothing checking it, and a *stored* counterfactual would be worse still, because it can agree with a
wrong rate.

⚠️ **SCOPE — THE SAME EXAMPLE AT THE SUPERSEDED 4.50% RATE CONTRADICTS ITSELF (2026-09-21, P4-18).**
Fortnights 1 and 2 are reproduced **only** by `× 14/365` — $1.29 of interest on $750, and $2.59 on
$1,501.29, against the 26ths' $1.30 and $2.60 — while fortnight 3 is reproduced **only** by `÷ 26`:
$3.90 on $2,253.88, against the 365ths' $3.89. That example is a record of its own,
`heas.interest.supersededWorkedExample`, `primary-via-archive`, marked **INTERNALLY INCONSISTENT**.
**T40 is NOT wrong**: the current 3.95% example is internally consistent and decides the convention
at fortnights 2 and 3, fortnight 1 being unable to discriminate at that rate. What was wrong is the
**implicit universality** — this fixture is evidence about the CURRENT rate's example and about **no
earlier rate period**, and anyone backtesting into 2020-21 must not assume the convention held
there.

**Debt method statement (s 1135(3)):** Step 1 pension received under the scheme → Step 1A add
advances → Step 2 add registration costs payable under s 1143(4) → Step 3 subtract the pension that
would have been received anyway → Step 4 add fortnightly compound interest → Step 5 subtract
repayments. **Registration costs are added to the debt and themselves accrue interest.**

Interest continues to accrue after the maximum loan available is reached, after exit, and after
death (ss 1139(2A)(a), 1142A(2)). Hitting the maximum loan available **ends participation
automatically** from the start of the next instalment period (s 1141) — payments stop, compounding
does not (T41).

### 5.5 No Negative Equity Guarantee — SS Act s 1144AA, from 1 July 2022

On repayment or recovery, where the debt exceeds the **adjusted value** of the real assets, the
Commonwealth "is not entitled to recover" the excess and the debt and charge are discharged to that
extent **by force of the paragraph** (s 1144AA(1)(f)–(g)). Automatic — not a discretion, not an
application.

**Adjusted value** (s 1144AA(5)–(6); *HEAS—Market Value* Determination 2022, `F2022L00998` s 5) =
market value less encumbrances, where market value is, in order: (a) the sale price if sold before
the event; (b) a value agreed between the Secretary and the Person; (c) an accredited valuer's
valuation from within the **3 months** before the event, absent material change; (d) an accredited
valuer's valuation at the event time. **Anti-avoidance** (s 5(3)): a sale price depressed by a sale
not in good faith, not on fair and reasonable terms, or not at arm's length reverts to a valuer's
figure. **Adjustment** (s 5(4)): reduced by charges and encumbrances **other than** the HEAS charge
itself — so a **pre-existing mortgage reduces the NNEG ceiling**. The valuation is free to the
borrower.

**Two ways the guarantee is lost (s 1144AA(3)) — both `primary-verified`:**

1. **a non-HEAS charge or encumbrance over the security is created or increased**, by or with the
   Person's express consent, **after** participation began, where it affects the Commonwealth's
   ability to recover — **this is T35: increasing the Owner-Occupied Mortgage voids the NNEG**;
2. fraud or misrepresentation in relation to participation, including in relation to the real
   assets.

If either applies, the full loan balance must be repaid.

**Worked example** (SS Guide 3.4.5.55, `primary-via-archive`): debt $300,000; pre-existing mortgage
$200,000; home falls to $450,000 at death → adjusted value $250,000 → the Commonwealth recovers
$250,000 and **$50,000 is extinguished**.

### 5.6 Eligibility

| Criterion | Rule | Confidence |
|---|---|---|
| Age | Person **has reached pension age (67)**, **or is the partner of** someone who has | primary-verified |
| Qualifying payment | **receiving *or qualified for*** Age Pension, DSP or Carer Payment (s 1133(1)(a)) | primary-verified |
| **$0 entitlement does not disqualify** | **confirmed, four sources.** Qualification survives means testing; payability does not. HEAS keys off **qualification** | primary-verified |
| Termination vs continuation | HEAS **terminates** on loss of *qualification* (e.g. failing residency), but **continues** through loss of *payability* | primary-via-archive |
| Residency | not a separate HEAS test — arrives through Age Pension qualification. Claims **cannot be lodged from overseas**; payments continue overseas once granted and are **not** subject to portability rules | primary-via-archive |
| Bankruptcy | Person, partner and any co-owner must not be bankrupt or under a Part X agreement | primary-verified |
| Both partners must sign | s 1136(2)(b) — "even if they don't own the property" | primary-verified |
| Asset hardship provisions | mutually exclusive — must choose one | primary-verified |
| DVA service pension / ISS | HEAS not available; the VEA scheme applies instead (s 1133(3A)) | primary-verified |

### 5.7 Means-test treatment

| Question | Answer | Confidence |
|---|---|---|
| Fortnightly stream assessed as income? | **No.** Participating does not change the existing entitlement; the loan is delivered *as* the pension at an increased rate (s 1134(1A)) | primary-via-archive |
| Fortnightly stream taxable? | **No** — a voluntary non-taxable loan | primary-verified |
| Unspent cash from the fortnightly stream? | an assessable financial investment, **deemed** like any other cash | primary-verified |
| **Lump sum advance, income test** | **deemed from day one** | primary-verified |
| **Lump sum advance, assets test** | **assessable after 90 days**; exempt for the first 90 days **only where the principal home was the security** (`HEAS_ADVANCE_ASSET_EXEMPT_DAYS = 90`) | primary-verified |
| HEAS debt in the assets test | s 1121(5) reduces the value of the charged real assets by the debt; s 1121(1A) makes this the exclusive mechanism. **But where the principal home is the ONLY security, no reduction occurs — the home is already exempt** (T38) | primary-via-archive |
| Debt against assessable real assets | where the loan is secured by assessable real assets **and** the home, the **full** value is deducted from the assessable asset — apportionment-of-encumbrances rules do **not** apply to HEAS | primary-via-archive |
| Pensioner Concession Card at $0 entitlement | **NOT conferred** (T32). SS Act s 1137A: a Person is taken not to be receiving a pension merely because they receive it at a HEAS rate, **except** where but for the Division they would have received a rate greater than nil. Also lost: family assistance means-test concessions, CCS concessions, and any bereavement payment to the partner or estate | primary-via-archive |

**Net direction of travel (T38):** drawing HEAS and **not** spending it strictly **reduces** Age
Pension entitlement. Drawing and spending it is neutral. State this wherever the tool presents the
facility.

**The one datable exception (T39):** at the ADR-0005 two-year vacated-home cliff the home enters
`assessableAssets` and s 1121(5) switches on — the accumulated HEAS debt is then deducted from it
in full, cushioning the cliff dollar for dollar.

**Not implemented in v1** (T39, resolved 2026-09-04). The market value stays outside the means
test, so the model never reaches the state this paragraph describes: that Scenario is refused, not
computed. The law above is recorded because Phase 14 will need it, not because v1 encodes it.

**Advances are punted the SAME way, and the direction is CAUTIOUS (T138, P9-2b, 2026-09-25).** The
day-one deeming / 90-day assets exemption rows above are the law; `project()` does not wire them.
An advance's cash is ordinary DEEMED CASH from the day it lands — assessed under both tests
immediately, with no 90-day exemption modelled at all — which assesses the advance SOONER and MORE
FULLY than the law requires, so it can only understate the Age Pension the model shows relative to
the true entitlement, never overstate it. Stated in `heas.ts`'s `meansTest` notes and in the entry
form's own notice.

### 5.8 Exit, death, sale

| Event | Treatment | Confidence |
|---|---|---|
| Voluntary repayment | allowed in part or full at any time, no penalty (s 1142A(1)) | primary-verified |
| General recovery bar | the Commonwealth is not entitled to recover "until after the person's death" (s 1139(1)) | primary-verified |
| Death, single | recovered from the **estate**, generally after **14 weeks**. Charge continues; interest continues | primary-verified |
| Death, surviving partner | recovery deferred until the survivor's death, if they (i) survive, (ii) **have the use of** the secured assets, and (iii) have reached pension age. "Use" includes living in it, using it as a holiday home, or taking its rent. **Interest keeps accruing throughout** | primary-verified |
| Surviving partner qualified in own right | may continue in the scheme; recovery deferred to their death | primary-via-archive |
| Sale of the home | either **transfer the loan to another property** or repay at settlement; notify **≥ 14 days** before the agreed settlement date. Disposal by sale, transfer, **gift or will** all count (s 1140(2A)). The charge is enforceable against a new owner except a bona fide purchaser for value without notice | primary-verified |
| Entry to aged care | **no HEAS-specific rule exists** — a verified negative finding. Qualification survives, so HEAS continues; the home remains security while retained; if sold to fund a RAD the loan must be repaid or transferred at settlement | primary-verified (as a negative) |
| Withdrawal | at any time by signed written request; debt repayable immediately or from the estate; interest continues either way | primary-verified |
| Registration costs | payable by the borrower for registering **and** discharging the charge; may be added to the debt, where they attract interest | primary-verified |
| Security mechanism | statutory charge under s 1138; in practice a **caveat** on title (a "notice of charge" in Queensland) | primary-verified |

### 5.9 Reference implementation sketch

```
age        = age_at_last_birthday(younger_person, date)      # steps on the birthday
component  = HEAS_AGE_COMPONENT[clamp(age, 55, 90)]
security   = home_market_value − mortgage_balance − nominated_amount
share      = security / 2                                    # per Person; 50-50 rule
mla_person = component * floor(share / 10_000)

mpr        = age_pension_max_payment_rate_fn(date)           # incl. supplements
draw_fn    = 1.5 * mpr − age_pension_received_fn              # BEFORE any advance-period reduction

# T136 (P9-2b) — an advance due this month updates the Person's own rolling 26-fortnight window
# FIRST, then the fortnightly rate for the WHOLE month is reduced if that window is active:
if window_active:
  headroom_annual = draw_fn * 26
  draw_fn = max(0, (headroom_annual − advances_in_window) / 26)   # NOT `draw_fn − advance_amount`

draw_fn    = min(draw_fn, remaining_capacity)
balance    = balance + advance_due_this_fortnight                # s 1135(3) Step 1A — BEFORE interest
balance    = (balance + draw_fn) * (1 + 0.0395 / 26)
if balance > mla_person: stop payments; keep compounding      # s 1141
```

### 5.10 Terminology

**"Nil Real Assets Determination" does not exist** under that name — a verified negative finding
across Part 3.12 Div 4, the complete SS Guide HEAS chapter, the Services Australia site tree, DVA
CLIK 5.4, and an OData enumeration of every Federal Register instrument titled "Home Equity Access"
(five instruments, all cited here). **Drop the term.** The two mechanics it might denote — the
s 1135A(2)(b) nil floor below $10,000, and qualification at a nil rate — are already captured.

Naming: the legislative rename from "Pension Loans Scheme" commenced in primary legislation on
**5 Dec 2025**, with instruments following **10–11 Jul 2026**; the policy rename happened 1 Jan
2022. Sources straddle both names. **Same scheme throughout** — do not read it as two regimes.

---

## 5A. Franking and dividend imputation

Consolidated **2026-09-04** from the three P1-11 research chunks — `docs/research/p1-11-franking-grossup.md`
(the gross-up and the corporate rate), `p1-11-franking-refundability.md` (refundability, both sides) and
`p1-11-franking-holding-rule.md` (the qualified person gate). Franking entered scope on 2026-09-04 by
[ADR-0010](./adr/0010-franking-credits-are-in-scope-on-both-sides.md), which requires it to be modelled on
**both** sides of the super / non-super comparison or on neither. Everything below is **FY2026-27**,
retrieved **2026-09-04**.

**Numbered 5A rather than 6, deliberately.** `TODO.md`, `concept.md` and four files under `src/` already
cite register §5, §7, §8 and §9 by number. Renumbering the tail of this file to make room for a sixth
domain section would break those citations silently — the exact failure mode this register exists to
prevent. The franking pass therefore sits with the other domain sections and leaves the numbering behind
it untouched.

### 5A.1 The gross-up — an addition, and there is no rate

The gross-up is **not** a rate applied to a dividend. s 207-20(1) *adds the franking credit itself* to
assessable income, and s 207-20(2) gives a tax offset equal to the same amount. The rate lives one level
down, in how the **paying company** computed the credit it attached:

```
gross_up_rate(r)          = (1 − r) / r                        # ITAA 1997 s 995-1
max_franking_credit(D, r) = D × r / (1 − r)                    # s 202-60(2), simplified
franking_credit(D, f, r)  = f × D × r / (1 − r)                # s 203-35 rearranged
grossed_up_income         = D + franking_credit(D, f, r)       # s 207-20(1)
                          = D / (1 − r)   when f = 1 (fully franked)
```

`D` = the frankable distribution in cash, `r` = the **payer's** corporate tax rate for imputation
purposes, `f` = the franking percentage (0 ≤ f ≤ 1).

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Franked distribution gross-up | Assessable income **includes the franking credit**, in addition to the distribution | 2026-27 | **config (derived)** — a formula, never a stored number | [ITAA 1997 s 207-20(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-20) | 2026-09-04 | primary-verified |
| Franking tax offset | Offset = the franking credit on the distribution | 2026-27 | **config (derived)** | [ITAA 1997 s 207-20(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-20) | 2026-09-04 | primary-verified |
| Maximum franking credit | `frankable distribution × 1 / applicable gross-up rate` = `D × r/(1−r)` | 2026-27 | **config (derived)** | [ITAA 1997 s 202-60(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-60) | 2026-09-04 | primary-verified |
| Corporate tax gross-up rate | `(100% − r) / r`, `r` = the payer's corporate tax rate for imputation purposes | 2026-27 | **config (derived)** | [ITAA 1997 s 995-1](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1) | 2026-09-04 | primary-verified |
| **Whose rate applies** | **The entity making the distribution**, for the income year the distribution is made — **not** the recipient's, and **not** a market-wide rate | 2026-27 | constant (rule) | [ITAA 1997 s 202-60(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-60) | 2026-09-04 | primary-verified |
| Maximum franking percentage | **100%** — anything above is taken to be 100%; 100% means 100% of the *payer's own* maximum, so 3/7 per $1 cash at 30% and 1/3 per $1 cash at 25% | 2026-27 | constant | [ITAA 1997 s 203-35(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F203-35), s 202-55 | 2026-09-04 | primary-verified |
| Effective franking rate for the Household's portfolio | **No legislated figure exists.** A **Setting** (T43, P3-22h) | 2026-27 | **Setting — not an assumption** | s 202-60(2) fixes the rate per payer; a diversified ETF spans both rates | 2026-09-04 | n/a — this is a forecast input |

**Two things the engine must do (T43, T44).** First, take the credit as an **input**: an AMMA or annual
tax statement reports the franked amount and the franking credit as separate dollar figures, after which
`grossed_up = franked + credit` needs no rate at all. Second, where a credit *is* derived, compute
`D × r/(1−r)` **directly**. The ATO's own worked examples round the gross-up rate to 2.3333 and then
divide, which is **60c wrong per $100,000** at the 30% rate ($42,857.75 published against $42,857.142857
exact). The statute prescribes no rounding of the gross-up rate.

### 5A.2 The corporate rate that feeds the credit

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Full company tax rate | **30%** | 2026-27 | config | [ITRA 1986 s 23(2)(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23) · [ATO QC 54063](https://www.ato.gov.au/tax-rates-and-codes/company-tax-rate-changes) | 2026-09-04 | primary-verified |
| Base rate entity company tax rate | **25%** | 2026-27 | config | [ITRA 1986 s 23(2)(a)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23) · ATO QC 54063 | 2026-09-04 | primary-verified |
| Base rate entity test | **Both** limbs: base rate entity passive income ≤ **80%** of assessable income **and** aggregated turnover **< $50m** | 2026-27 | **config (derived)** | [ITRA 1986 s 23AA](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AA), s 23AB | 2026-09-04 | primary-verified |
| Aggregated turnover threshold | **$50,000,000** — hard-coded in the statute, **not indexed** | 2026-27 | config | [ITRA 1986 s 23AA(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AA) | 2026-09-04 | primary-verified |
| Rate **for imputation purposes** — year tested | The **previous** income year's turnover, passive income **and** assessable income (25% flat if the entity did not exist then) | 2026-27 | **config (derived)** | [ITAA 1997 s 995-1](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1) | 2026-09-04 | primary-verified |
| Company tax rate change in FY2026-27 | **None announced or legislated** | 2026-27 | — | [Budget 2026-27 Tax reform](https://budget.gov.au/content/04-tax-reform.htm) · ATO QC 54063 (updated 2026-09-04) | 2026-09-04 | primary-verified |

The **imputation** rate and the company's **own** rate are two different tests answered from two different
years' data, and they diverge: a company crossing $50m in the current year still franks at 25% that year.
The model only ever needs the imputation column — and, per T43, normally does not need even that, because
the credit arrives as a dollar figure on a statement.

### 5A.3 Refundability — both sides, and equally

The whole question is a five-provision chain: s 207-20(1),(2) (gross-up and offset) → s 207-90 (denies
both on exempt or NANE income) → **s 207-110 (disapplies s 207-90 for ECPI)** → s 67-25(1) (Division 207
offsets are subject to the refundable tax offset rules) → s 63-10(1) item 40 ("**You can get a refund of
the remaining amount**").

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Excess credits refundable — **individual** | **true**, in cash. No income test, no age test, no dollar cap | 2026-27 | constant | [ITAA 1997 s 67-25(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F67-25) · [s 63-10(1) item 40](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F63-10) | 2026-09-04 | primary-verified |
| Excess credits refundable — **complying** super fund | **true**, in cash. A complying fund is not a corporate tax entity, so the s 67-25(1C)/(1D) denials that convert a company's excess credits to a tax loss do not reach it | 2026-27 | constant | [ITAA 1997 s 960-115](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-115) · s 67-25(1) | 2026-09-04 | primary-verified |
| Excess credits refundable — **non-complying** fund or ADF | **false** | 2026-27 | constant | [ITAA 1997 s 67-25(1A)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F67-25) | 2026-09-04 | primary-verified |
| Retirement Phase (ECPI) | Earnings tax **0%**; the credit survives s 207-90 via s 207-110(2)(b) and is refunded **in full**. Applies to both the segregated and the proportionate method | 2026-27 | constant (rule) | [ITAA 1997 s 207-110](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-110) · ss 295-385, 295-390 | 2026-09-04 | primary-verified |
| Accumulation Phase / TTR | Credit offsets the **15%** liability; any excess is refunded in cash. Because 25%/30% > 15%, a fully franked distribution produces a **net refund**, not a net payment | 2026-27 | constant (rule) | Income Tax Rates Act 1986 s 26(1)(a) · s 63-10(1) item 40 | 2026-09-04 | primary-verified |
| Australian residence required | **true** — a non-resident's franked dividend is NANE (ITAA 1936 ss 128B(3)(ga), 128D), so s 207-90(1)(c) denies gross-up and offset outright | 2026-27 | constant (rule) | [ITAA 1997 s 207-90](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-90) | 2026-09-04 | primary-verified |
| Denials that survive exempt status | Subdiv 207-F — **the qualified person gate (§5A.4)**, s 177EA and s 204-30 determinations, dividend stripping, distribution washing (s 207-157), foreign income tax deductions (s 207-158) | 2026-27 | constant (rule) | [ITAA 1997 ss 207-145, 207-150](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-145) | 2026-09-04 | primary-verified |

⚠️ **The trap this section exists for (T46).** Refundability is **equal** on both sides, so refundability
itself is **not** a super advantage — the entire franking advantage is the **rate differential** (0% in
Retirement Phase, 15% in Accumulation, against the individual's marginal rate plus the 2% Medicare levy).
Crediting a refund on the super side while merely offsetting on the individual side manufactures a
spurious advantage of **up to the full franking rate**. It flips to a dead heat — never to a positive
non-super franking advantage, since 0% is the floor on both sides — only where the individual's effective
rate after LITO and SAPTO falls below 15%.

#### 5A.3.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document** — so the rows below
are enforced from the moment they exist, statuses included. They are §5A's additions to that
inventory. All three were in `src/core/superFranking.ts` before this table existed and were named
**nowhere in this document** — the P3-26 quarantine, which is a finding and not an exemption: a
refusal with no register row is a decision the specification does not record.

They sit here rather than under §5A.1 on a reading of what each throw site declines to do. Two of
them are §5A.3's own rows read backwards — the non-complying line and the residence line. The third
is placed here because the year stamp it enforces is **set** by §5A.1's two constructors but
**compared** against nothing there; the comparison exists only where the credit is set against a
year's liability, which is this section's chain.

| Refusal | Fires when | Status |
|---|---|---|
| **`FrankingYearMismatchError`** | the distribution supplied carries a financial year that is not the year the franking outcome is being computed for. It is the **first** check in the module's one outcome function, ahead of all three fact gates, so a distribution stamped for the wrong year is refused on the year even where the facts would have refused it too — the opposite ordering to §3.7.1's Division 296 year guard, which is reached only after the exclusions. **The ground is that a franking credit is an offset in the year the distribution is made, and the earnings tax it is set against is a figure for one year:** one year's credit against another year's liability is not a fund's return, and because the offset is refundable in full (this section's chain, ending at s 63-10(1) item 40) nothing floors the error at nil — a mismatched year produces a plausible cash figure rather than a failure. **The finding is that §5A records no rule for it.** Every table in this section is stamped `2026-27`, and the only place §5A speaks of "the income year" at all is §5A.5's aggregation of the $5,000 ceiling, which is a different rule about a different thing. So the year in which a franking credit is an offset is a decision that lived only in `src/core/superFranking.ts` until this row — the same shape as §3.4.1's absent look-back year, and the P3-26 finding running in the other direction. **Why it is not delegated downstream:** `fundEarningsTax` already refuses a phase fraction counted against a different financial year (`MidYearPhaseChangeError`) and an interest dated outside the year, but it is never handed the distribution, so this is the only place the credit's own year can be checked. Three year checks, three different inputs, and only this one covers the credit | **BUILT** — `src/core/superFranking.ts` |
| **`NonComplyingFundError`** | the caller states the fund is **not** a complying superannuation fund — a non-complying fund or an approved deposit fund. It is the **first of the three fact gates**, tested before residence and before the qualified person gate, so a fund that fails more than one is always refused on this one. **The ground is not that the credit is denied — it is not.** s 67-25(1A) makes the excess *non-refundable*, which this section records as a flat `false` and stops. What the refusal actually protects is the module's decomposition: it answers **one distribution at a time**, and `tax(other) + tax(grossed-up) − credit` is the same number in any assembly order **only while nothing is floored at nil** on the way through. Remove refundability and the credit has to run against the fund's whole liability for the year, which this module never sees. **Neither that liability nor the fate of the unusable remainder is anywhere in this register** — the complying-fund row explains why the s 67-25(1C)/(1D) tax-loss conversion does not reach a complying fund, and nothing says what does happen to a non-complying fund's remainder. That is an argument from **this document's** contents, checkable right here, and not an argument from absence about the world (**R6**). **One thing nothing cross-checks:** this is a caller-stated boolean, and the model carries no other shape for a non-complying fund or an ADF — the interest's own fund-type discriminant has two cells and both are complying-fund shapes — so a fund stated non-complying here and typed as complying elsewhere would not be caught by either | **BUILT** — `src/core/superFranking.ts` |
| **`NonResidentFrankedDistributionError`** | the caller states the holder is **not an Australian resident**. Tested second, after the complying gate and before the qualified person gate. **The ground is this section's own residence row:** ITAA 1936 ss 128B(3)(ga) and 128D make the distribution non-assessable non-exempt income, and ITAA 1997 s 207-90(1)(c) denies the gross-up and the offset outright. **This is the one route on which s 207-90 really is the end of the chain** — s 207-110 disapplies it for the ss 295-385 / 295-390 / 295-400 amounts, and a NANE distribution to a non-resident is not one of them, so there is no exception left to reach. It is refused rather than answered as a nil credit on the T45 reasoning: a zero produced by this module is indistinguishable from the reading that destroys the Retirement Phase credit, which is the model's best case reported as its worst. **Two findings.** **(a) This section's row does not say whose residence it is about** — it reads "a non-resident's franked dividend is NANE", where the statute's non-resident is the recipient; the code resolves it to the **fund** and says so. **(b) Whether the gate is reachable in law is a question this register cannot answer:** it is read only after the fund has been stated complying, and whether a fund can be complying and a non-resident at once turns on the *Australian superannuation fund* definition, **for which this register carries no row, in §5A or anywhere else**. Recorded as an open question and **not** as a claim of unreachability (**R6**) — the branch is reachable by input whatever the law says, because the two facts are independent booleans supplied by the caller | **BUILT** — `src/core/superFranking.ts` |

**What these three refusals can be checked against — CLOSED 2026-09-15 by P3-28, with one limb
corrected rather than discharged.** This paragraph carried a standing finding: *"§5A is the only
domain section of this register with **no records at all** under `src/data/assumptions/`"*. That
was true when written (2026-09-10) and is now false: `src/data/assumptions/franking.ts` carries
§7's twelve franking constants as fourteen `Assumption` records — fourteen because §7's single
*Excess franking credits refundable* row holds three values sourced from three provisions, and a
record holds one source — wired into `ASSUMPTIONS` under the key `franking`, reachable by
`explainAssumption` at `franking.*`, and pinned by `test/assumptions-franking.test.mjs`. What was
NOT true even when written is marked below. Three absences bore on the rows above; two are closed
and the third was a mistake:

- **No refundability record — CLOSED.** The two fact-gate refusals are grounded in this section's
  three refundability rows, and all three are now stored, stamped and sourced:
  `franking.excessCreditsRefundable.individual` (`true`, s 67-25(1) · s 63-10(1) item 40),
  `.complyingFund` (`true`, s 960-115) and `.nonComplyingFundOrAdf` (`false`, s 67-25(1A)).
  `explainAssumption` now answers why a non-complying fund is refused. **What has not changed:**
  the fact itself is still a caller-stated boolean on `FundFrankingFacts`, and nothing
  cross-checks it — the record is the *provenance* of the rule, not a new source of the fact.
- **~~No corporate rate record.~~ THE CLAIM WAS FALSE WHEN WRITTEN, and the error is quoted once
  here so it is not re-derived.** The superseded sentence read: *"§5A.2's 25% and 30% appear in
  §7's constants list and nowhere in the data layer… In fact **none** of the twelve franking
  constants §7 lists is carried in code."* **§5A.2's rates do not appear in §7 at all, under any
  tag.** §7's twelve franking rows are the small shareholder ceiling, the eligible-entities rule,
  the `credits <= 5000` boundary, the dividend-washing ceiling, the 45/90-day holding period, the
  widely-held-trust variant, the qualification windows, the 0.30 at-risk delta, the day-counting
  rule, LIFO, the 100% maximum franking percentage and the refundability rule — and not one
  corporate rate among them. §5A.2 types every one of its rows `config` or `config (derived)` and
  stamps them `2026-27`, so §7's own rule — *"everything not on this list is config and must be
  year-stamped"* — excludes them **structurally**, the same way it excludes the general transfer
  balance cap (T72). This conflated two adjacent tables the document otherwise keeps carefully
  apart. **What survives of the sentence, on its own words:** the reading that *T43 forbids a
  **portfolio** rate, not the two legislated **payer** rates* is correct — but it was never a T43
  question, because those rows were never proposed as §7 constants. Whether to build them is an
  ordinary build-config-with-no-consumer question, and it is **ANSWERED 2026-09-15 (P3-28, R-B):
  not built**, on §5A.2's own closing sentence — *"The model only ever needs the imputation column
  — and, per T43, normally does not need even that, because the credit arrives as a dollar figure
  on a statement."* The decision is recorded in
  `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` so the omission is a ruling and not
  an oversight waiting to be "fixed".
- **No Setting boundary for the effective franking rate — CLOSED, and §9's row is now built in
  both halves.** `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']` exists, and
  `test/assumptions-franking.test.mjs` asserts both halves §9 demands. **Their strengths are not
  equal and the difference is stated rather than smoothed over.** The half *"the §7 constants list
  must not contain one"* is **fully structural**: the test reads §7 out of this file and pins its
  twelve franking rows by name, so a thirteenth fails whatever it says. The half *"the effective
  franking rate must resolve from a Setting"* tops out at **"required, undefaulted parameter +
  absent literal"** — `frankedDistributionFromRate`'s `payerCorporateTaxRate` is required and
  undefaulted, so omitting it is a `tsc` error, but TypeScript cannot forbid a numeric literal that
  resembles a rate, and the "never *also* stored" half rests on a source canary over
  `src/core/superFranking.ts`. Do not read that half as a compiler guarantee.

None of that ever made the three refusals unsound; each stands on text quoted in this section.
What has changed is that a row above citing a §5A figure is now citing a **record**, not prose.
**What has NOT changed, and must not be read as more than it is:** `franking.ts` has **no runtime
consumer at all**. Nothing computes from it, `superFranking.ts` does not import it, and that is by
the P3-22e ruling that day-level qualification machinery is out of scope — declared in the module
header on the O72/P3-38 precedent, not discovered later. Franking is not "modelled" because the
records exist.

#### 5A.3.2 Named refusals — the individual side (P3-22)

`src/core/individualFranking.ts` is §5A read for an **individual holding shares outside super**, and
it is the other half of P3-22a's "both sides or neither". It ships on the same footing as
`superFranking.ts`: a pure, sourced, tested module with **no call site in `project()`**. Making a
distribution move a live forecast figure needs a way to STATE one, which is **P3-22h**, and is a
separate item — so a reader must not infer from the absence of call sites that these refusals are
proposals. They are built and they fire.

Its three refusals are registered here, beside §5A.3.1's, because the same three grounds decide
both sides and the differences are the point. **Two of §5A.3.1's grounds do not exist on this side
at all**: there is no complying-fund gate, because s 67-25(1A) is a superannuation provision and an
individual's Division 207 offset is refundable with no income test, no age test and no dollar cap
(this section's `excessCreditsRefundable.individual` row); and s 207-110 is never reached, because
Subdiv 207-E rescues a fund's exempt current pension income and an individual has none. **One
ground exists only on this side**: §5A.5's $5,000 relief, which is why the qualified-person refusal
below can be escaped and §5A.4.1's cannot.

| Refusal | Fires when | Status |
|---|---|---|
| **`IndividualFrankingYearMismatchError`** | the `FrankedDistribution` supplied carries a financial year that is not the year being assessed. It is the **first** check, ahead of both fact gates, as `FrankingYearMismatchError` is on the super side. **The ground is sharper here than there**, and it is worth stating because it is not the fund's: this module answers by assessing the Household **twice in one year** and differencing the result, so a distribution stamped for another year would be grossed up into the wrong brackets, the wrong LITO taper and the wrong Medicare levy thresholds — and would still return an entirely plausible cash figure, because nothing in the chain is floored at nil. §5A records no rule for the year in which a franking credit is an offset; that finding is §5A.3.1's and it applies unchanged | **BUILT** — `src/core/individualFranking.ts` |
| **`NonResidentIndividualDistributionError`** | the caller states the individual is **not an Australian resident**. Tested **first of the two fact gates**, before qualification, because a NANE distribution has no gross-up to tax and so nothing for the qualification gate to be about. The ground is this section's residence row: ITAA 1936 ss 128B(3)(ga) and 128D make it non-assessable non-exempt income and ITAA 1997 s 207-90(1)(c) denies gross-up and offset outright. **This is the row where §5A.3.1's finding (a) is answered rather than repeated**: that row records that this section does not say *whose* residence it is about, and resolves it to the fund; the statute's non-resident is the **recipient**, so on this side the code and the provision are talking about the same person, and the resolution is not an interpretation. Refused rather than answered as a nil credit, so that no nil credit is ever produced by either franking module | **BUILT** — `src/core/individualFranking.ts` |
| **`IndividualNotAQualifiedPersonError`** | the caller states the individual is **not a qualified person** for the distribution **and** §5A.5's relief does not reach them. **Unlike `NotAQualifiedPersonError` on the super side, this one can be escaped, and that escape is the whole §5A.6 asymmetry made executable.** Two ways it still fires. **(a) The year's credits exceed the ceiling.** The test is on the individual's franking credits **for the whole income year across the whole portfolio** — aggregation is at taxpayer and income-year level, not per parcel and not per company — so it is a figure only the caller has, and it is a **required, undefaulted** field on `IndividualFrankingFacts`. Defaulting it to this distribution's own credit would let a holder with six $1,000 distributions claim a relief a single $6,000 one is denied. The relief is **all-or-nothing** (T48): a holder above the ceiling claims nothing and cannot cap the claim at $5,000. **(b) A related payment was stated.** s 160APHT(2) defeats reliance on the exemption. Note the direction, which T47 says is the easy one to get backwards: a related payment does **not** disqualify by itself — it switches the holding-period test to the secondary ±45/±90 window and costs the shelter, and since this model does not count days (P3-22e) the only thing left for it to do here is take the relief away. **What it does not do: it does not count.** The 45-day machinery is not built on either side; the fact is stated, and the assumption reaches `provenance.caveats` on every result — naming §5A.4's uncounted rule where the caller stated qualification, and naming §5A.5 and §5A.6/O27 where the relief carried it instead | **BUILT** — `src/core/individualFranking.ts` |

**What this side has that §5A.3.1's does not, and what it therefore cannot check.** The relief is
applied on a caller-stated dollar figure and a caller-stated boolean, and **nothing cross-checks
either**. There is no portfolio in this model that distributes anything (`parcelsGrownForOneMonth`
grows 100% into market value and pays out nothing until a sale), so the year's total franking
credits cannot be derived and compared — the same shape as §5A.3.1's closing note on the
non-complying boolean. That is an argument from **this model's** contents, checkable here, and not
an argument from absence about the world (**R6**).

### 5A.4 The qualified person gate — whether the credit exists at all

This gates everything above: fail it and there is no gross-up and no offset, on either side, exempt
status or not. The operative rules were **never rewritten into ITAA 1997**. They are ITAA 1936 **former
Division 1A of Part IIIAA**, applied *as in force on 30 June 2002*, imported by the express words of
**ITAA 1997 ss 207-145(1)(a) and 207-150(1)(a)** and construed that way by the binding public ruling
**TD 2007/11**. It is **not** the *Income Tax (Transitional Provisions) Act 1997* that preserves them —
that Act has no Division 207 at all. Correct any downstream citation that says otherwise.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Holding period | **45 continuous days at risk**; **90 days** for preference shares | 2026-27 (text frozen at 30 Jun 2002) | constant | ITAA 1936 (former) s 160APHO(1)–(2) | 2026-09-04 | primary-verified |
| Holding period — investor in a **widely held trust** | **45 days flat** on the *units*, with **no** 90-day preference variant, referenced to the trust's own ex-distribution date | 2026-27 | constant | ss 160APHP(1), 160APHE(2) | 2026-09-04 | primary-verified |
| Day counting | Exclude the **day of acquisition always**; exclude the **day of disposal only if disposed of**; exclude days of material diminution **without breaking continuity** | 2026-27 | constant (rule) | s 160APHO(2), (3) | 2026-09-04 | primary-verified |
| Qualification windows | **Primary** — acquisition day + 1 to the 45th/90th day after ex-dividend. **Secondary** — ±45 / ±90 days around ex-dividend | 2026-27 | constant | s 160APHD definitions | 2026-09-04 | primary-verified |
| "At risk" test | Materially diminished if the net position **by delta** retains **less than 30%** of the risks and opportunities. **Strict**: below 0.30 fails, exactly 0.30 passes | 2026-27 | constant | s 160APHM(2), (3) | 2026-09-04 | primary-verified |
| Related payments | **Do not disqualify.** They switch the test from the primary to the **secondary** window (s 160APHO(1)(b)), and they cost the $5,000 exemption (s 160APHT(2)) | 2026-27 | constant (rule) | ss 160APHN, 160APHO(1) | 2026-09-04 | primary-verified |
| Related payments — the ETF carve-out | A trustee distributing a dividend to a **presently entitled** beneficiary is **not** making a related payment — s 160APHN(5). This is why an ordinary ETF or managed-fund distribution does not trip the rule | 2026-27 | constant (rule) | s 160APHN(5) | 2026-09-04 | primary-verified |
| Trustee gate | If the trustee or partnership through which the distribution flows is not a qualified person, **no beneficiary is**, despite any other provision — and no exemption survives it | 2026-27 | constant (rule) | s 160APHU(1) | 2026-09-04 | primary-verified |
| Parcel disposal order | **LIFO** across substantially identical securities | 2026-27 | constant | s 160APHI(4) | 2026-09-04 | primary-verified |
| "Once per parcel" | Satisfying the holding rule once for a parcel carries forward to later distributions on that parcel, **unless** the related payments rule applies — which is tested per distribution | 2026-27 | constant (rule) | s 160APHD "primary qualification period"; ATO *Franking credit trading* | 2026-09-04 | primary-verified as to the statute; ATO's phrasing is secondary but follows from the definition |

The decision procedure, with the related-payments correction of 2026-09-04 (T47) applied:

```
window    = SECONDARY if related_payment else PRIMARY          # s 160APHO(1)(a)/(b)
qualified = trustee_gate_ok                                    # s 160APHU(1), recursive
            AND ( holding_period_ok(window)                    # s 160APHO / s 160APHP
                  OR (is_individual AND credits <= 5000 AND NOT related_payment) )  # s 160APHT
```

**What this means for this Household.** A passive investor holding broad-market ETFs bought and held
satisfies the gate **continuously** — 45 countable days needs 46 calendar days on the parcel, once, and
s 160APHL(13) preserves a unitholder's interest as vested and indefeasible despite continuous
creation and redemption of units. The gate bites only on churn near an ex-distribution date, a
derivative overlay dropping net delta below 30%, or a non-fixed trust interposed in the chain. That is
why **P3-22e assumes qualification, states the assumption on screen, and flags a disposal landing inside
the window** rather than building day-level machinery.

#### 5A.4.1 Named refusals

**§3.10.8 is the register's one home for refusal names (R8), and `test/refusal-names.test.mjs`
discovers and reads every `| Refusal | … | Status |` table in this document.** The row below is
§5A.4's addition to that inventory. It was in `src/core/superFranking.ts` and named **nowhere in
this document** — the P3-26 quarantine, a finding and not an exemption. It is registered here
rather than at §5A.5 or §5A.6 because what it declines to apply is **this section's gate**: the
decision procedure above, whose `is_individual` limb is dead on the super side. The other three
refusals in the same module are at **§5A.3.1**.

| Refusal | Fires when | Status |
|---|---|---|
| **`NotAQualifiedPersonError`** | the caller states the fund is **not a qualified person** for the distribution. It is the **third and last** of the three fact gates, so a non-complying or non-resident fund never reaches it. **The ground has two limbs and they are of different evidential strengths, which is the whole reason this row is long.** **Limb 1, primary-verified:** s 207-110 disapplies ss 207-90 and 207-95 **only** — Subdiv 207-E is headed *Exceptions to the rules in Subdivision 207-D* — so it is no shelter from the Subdiv 207-F denials, of which this section's gate is one (§5A.3's *Denials that survive exempt status* row, and T45's closing sentence). Exempt current pension income therefore does **not** rescue a failed holding rule, and a Retirement Phase fund that fails the gate loses the credit outright; §9's mutation *"Let s 207-110 also disapply Subdivision 207-F"* is exactly this limb. **Limb 2, and its label is load-bearing:** the reason the refusal does not soften below $5,000 is that §5A.5's small shareholder relief is **individuals only**, so a complying fund — APRA-regulated or SMSF — has no equivalent at any credit level. That is **primary-verified as to the statutory words** (ITAA 1936 former s 160APHT(1)(a) opens *"the taxpayer is an individual"*) and **inferential as to the conclusion**: the ATO frames two separate alternatives and **never negates the fund case in one sentence** (§5A.6, open item **O27**). **O27 is CLOSED — ACCEPTED 2026-09-04 by user ruling**, shipped as a labelled inference and **not to be reopened without new evidence**. This row therefore must not be read as an ATO statement, and **R6 forbids narrowing the label**: the code carries the conclusion on a named constant at `secondary-only`, never at a bare `primary-verified`, and the refusal's own message reproduces both the statutory words and the *inferred from statutory structure, not stated in terms* qualification — so the label survives to the point where a reader meets it. **Why a refusal and not a nil credit:** the T45 reason, at its sharpest here. A zero produced by this module is indistinguishable from the reading that gives a Retirement Phase fund nothing, and this is the gate a reader is most likely to expect exempt status to rescue. **What it does not do: it does not count.** This section's day-level machinery — the primary and secondary windows, the LIFO parcel order, the 0.30 net-delta test, the related-payments switch — is not built; the fact is **stated** by the caller (P3-22e), and the assumption reaches `provenance.caveats` on every result, naming both §5A.4's uncounted holding rule and §5A.6's absent relief. So the refusal fires only on a stated fact, and no input can make it fire from the rules in the table above, because those rules exist here and not in code | **BUILT** — `src/core/superFranking.ts` |

### 5A.5 The $5,000 small shareholder exemption — a FROZEN CONSTANT, deliberately

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Small shareholder ceiling | **$5,000** of total franking credit tax offset entitlement for the income year. **Never indexed** | 2026-27 | **constant — frozen** (T48) | ITAA 1936 (former) s 160APHT(1)(b) | 2026-09-04 | primary-verified |
| Who it relieves | **Individuals only.** A qualified person for **all** dividends for the year, without satisfying the 45-day rule | 2026-27 | constant | s 160APHT(1)(a) | 2026-09-04 | primary-verified |
| Boundary | **`credits <= 5000` qualifies** — the statute says "does not exceed $5000" | 2026-27 | constant (rule) | s 160APHT(1)(b) | 2026-09-04 | primary-verified — the ATO's *Refund of franking credits for individuals* page states it loosely as "less than $5,000" **and** "$5,000 or more" and is wrong at the boundary either way |
| Aggregation | Taxpayer- and income-year-level, **across the whole portfolio** — not per parcel and not per company | 2026-27 | constant (rule) | s 160APHT(1)(b); ATO guidance | 2026-09-04 | primary-verified |
| Shape | **All-or-nothing. No taper, no shade-out, no partial claim.** A holder above the ceiling who fails the holding rule claims **nothing** — they cannot cap the claim at $5,000 | 2026-27 | constant (rule) | s 160APHT; ATO guidance, expressly | 2026-09-04 | primary-verified |
| Indirect distributions | **Covered** — the words are "held **or held an interest in**", so a distribution through a trust or partnership is inside the exemption, and it rescues a beneficiary-level at-risk failure | 2026-27 | constant (rule) | s 160APHT(1); ATO worked Example 1 (non-widely-held trusts) | 2026-09-04 | primary-verified |
| Related payments | **Not** switched off by the exemption — a related payment by the taxpayer or an associate defeats reliance on it | 2026-27 | constant (rule) | s 160APHT(2) | 2026-09-04 | primary-verified |

⚠️ **This register's default is that an Australian tax or super dollar figure is *indexed config*. The
$5,000 is a deliberate, sourced exception, and it must never receive a CPI or AWOTE uplift in any
forecast year.** The reason, stated here so a future maintainer does not "fix" it:

1. **On its face.** s 160APHT(1)(b) reads "does not exceed **$5000**". No index factor, no companion
   indexation section, no regulation-making power over the amount, no CPI or AWOTE linkage anywhere in
   Division 1A. The Division's delegated-legislation hooks — ss 160APHJ(1), 160APHM(1), 160APHR(1)(j)/(2)
   and 160APHR(3)/(4) — reach delta, material diminution, electors and prescribed related payments.
   **None of them reaches the $5,000.**
2. **There is no live provision to amend.** The section containing it was repealed on 14 September 2006,
   and what s 207-145(1)(a) imports is Division 1A **as in force at 30 June 2002** — a fixed historical
   snapshot. Indexing this figure would require Parliament to legislate a *new* provision. It has not, in
   the 26 years since the $5,000 form took effect.

In FY2026-27 it is $5,000; in FY2036-37 it is still $5,000 absent new legislation. **Its real-value
erosion since FY1999-2000 is a genuine feature of the projection, not a bug** — the same shape as the
Division 293 $250,000 and the carry-forward $500,000 in §7, and stronger, because those two at least sit
in live provisions that Parliament could move.

### 5A.6 The super-versus-individual asymmetry — direct input to P6-8

> **An individual with $5,000 or less of total franking credits in an income year is a qualified person
> for *all* their dividends without ever satisfying the 45-day holding rule (ITAA 1936 former s 160APHT).
> A complying superannuation fund — APRA-regulated or SMSF — has no equivalent relief at any credit
> level, and must satisfy the 45-day holding rule for every parcel. The related payments rule binds both
> equally.**

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Small shareholder relief on the **super** side | **None, at any credit level** | 2026-27 | constant (rule) | s 160APHT(1)(a) "the taxpayer is **an individual**" | 2026-09-04 | **primary-verified statutory text; conclusion inferential** — ATO's guidance consistently frames two *separate* alternatives (individuals → $5,000; funds → benchmark ceiling) but never negates it in one sentence. Open item **O27** |
| The fund's alternative route | s 160APHR(1)(g) benchmark-portfolio ceiling election. **Do not assert it is available.** Paragraph (g) covers "the trustee of a fund **(other than an excluded fund)**", and the SIS Act compilation in force 1 July 2002 has **no "excluded fund" definition** — so whether an **SMSF** may elect is unresolved (**O24**), as is whether the election operates at all after 1 July 2002 (**O25**) | 2026-27 | — | ss 160APHR(1)(g), (11) | 2026-09-04 | **unverified — treat as open, not available** |
| Second-order asymmetry | An **individual** can also be rescued at the *beneficiary* level where their interest in an interposed non-fixed trust is not held at risk. A **super fund** beneficiary of such a trust cannot be | 2026-27 | constant (rule) | s 160APHT with s 160APHL(10); ATO Example 1 | 2026-09-04 | primary-verified |

**Sizing it for the model, so P6-8 does not overstate it.** The gap opens only for a holder with
**≤ $5,000** of credits who **also** fails the 45-day test. Above $5,000 both sides face the identical
rule. On established buy-and-hold positions both sides pass permanently after ~46 days, so the asymmetry
contributes **zero**. It appears only under churn near an ex-distribution date, a hedging overlay below
30% net delta, or a non-fixed trust interposed on the non-super side. **Recommended default: treat both
sides as passing the gate, and carry this asymmetry as a documented structural note against P6-8 rather
than a numeric adjustment** (T49). Encoding it as a live numeric difference on a passive portfolio
overstates the super penalty.

**The refusal that consumes this asymmetry is registered at §5A.4.1, not here.**
`NotAQualifiedPersonError` is the only place the O27 conclusion decides anything — it is why a fund
with under $5,000 of credits that fails the 45-day rule is refused rather than waved through on the
individual's relief — but what it declines to apply is §5A.4's gate, so the row sits beside that
gate and this section carries the pointer; registering it in both places would be one refusal with
two rows, against R8. On the computing path the conclusion changes **no number**, which is why the
code carries it as a caveat line at `secondary-only` rather than as a confidence downgrade on
figures that do not depend on it. Its label travels with it in both places: **primary-verified
statutory text, inferential conclusion, O27, accepted 2026-09-04 by user ruling and not to be
reopened without new evidence.** Do not restate the conclusion bare, and do not upgrade it here or
downstream.

### 5A.7 The two $5,000 rules — do not conflate them (T50)

| | **s 160APHT** (ITAA 1936, former) | **s 207-157(4)** (ITAA 1997, inserted by No 68 of 2014) |
|---|---|---|
| Relieves you of | the **holding period rule** | the **dividend / distribution washing rule** |
| Who | individuals | individuals |
| Threshold | "does not exceed **$5000**" | "is **$5000 or less**" |
| Indirect distributions | **Yes** — applies to an interest held through a trust or partnership | **No** — s 207-157(5)(b) works the sum out *not* disregarding the Subdivision for interposed entities |
| Indexed? | **No — frozen literal** | **No — frozen literal** |

Both are FY2026-27, **constant**, primary-verified, retrieved 2026-09-04
([s 207-157](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-157)). The conflation
risk is live: a search on "$5,000 franking credits trust" surfaces both and merges them, and the widely
circulated claim that "the small shareholder exemption does not apply to indirect distributions" is
**true of s 207-157(4) and false of s 160APHT**. A separate widely circulated "$2,000 ceiling reduced by
$4 for every $1 of excess" claim is simply **wrong** — there is no taper on either rule.

---

## 6. Cross-report consistency

The four passes were run independently. **No figure in one contradicts a figure in another.** The
overlaps that could have diverged and did not:

- Age Pension age **67** — tax-offsets pass (SAPTO social-security limb) and age-pension pass agree.
- Maximum payment rate at 20 Mar 2026 (**$1,200.90 / $905.20 / $1,810.40**) — HEAS pass §3.1 and
  age-pension pass §2.1 agree to the cent; the HEAS pass correctly defers to the Age Pension
  assumption rather than duplicating it.
- Div 296 indexation to **CPI** — super-caps pass confirms against the Act what `concept.md` had
  from commentary.
- **Qualification vs payability** at $0 entitlement — the tax-offsets pass finds it in ITAA 1936
  s 160AAAA(2)(b) and the HEAS pass in SS Act s 1133(1)(a). Same structural point, two statutes.

**One unresolved tension, not a disagreement:** the HEAS pass requires a **home market value**,
which ADR-0005 deliberately excludes. Its proposed resolution — market value as an optional Setting
read by nothing but the HEAS facility, with `HomeStatus` unchanged as the means-test primitive —
is recorded as T42 and needs an **ADR-0005 amendment note** before P9 is built. Not resolved here.

**Resolved 2026-09-03**, after this consolidation: the amendment note is appended to ADR-0005 and
the proposed resolution is the one adopted — market value is a user-supplied Setting read by HEAS
capacity alone, `HomeStatus` unchanged as the means-test primitive. See T42 and §5.1.

---

## 7. The constants

The complete set of figures that hold for every year of the Planning Horizon. Everything not on
this list is config and must be year-stamped.

| Constant | Value | Domain |
|---|---|---|
| Preservation Age | 60 | super |
| Condition of Release | a boolean per Person, independent of age | super |
| TTR maximum drawdown | **10%** — flat, and **not pro-rated, not rounded, not age-varying, not switched off by the 1 June nil rule** (T57, §3.9). SISR **reg 6.01(2)(b)(ii)**, not Schedule 7 | super |
| TTR minimum drawdown | **the whole Schedule 7 factor table**, via reg 6.01(2)(b)(i) → reg 1.06(9A) — **not a flat 4%**; 4% is only the under-65 band *(corrected 2026-09-09)* | super |
| Schedule 7 minimum drawdown factors | the 7-band table in §3.9 — 4 / 5 / 6 / 7 / 9 / 11 / 14 — **never indexed**, amended only by amending regulation | super |
| Minimum drawdown rounding | **$10, nearest, ties UP** — not a ceiling; and it fires **once, last**, after cl 3 has pro-rated (Sch 7 cl 5) | super |
| Minimum drawdown nil date | **1 June** — a commencement on or after it makes the year's minimum **nil**, operative and not permissive; **1 June itself is nil** (Sch 7 cl 4) | super |
| Minimum drawdown pro-rata basis | **days**, and the commencement day **counts** (Sch 7 cl 3). The **denominator** — 365, or 366 with a 29 February — is `secondary-only`, **not stated in the instrument** (O37) | super |
| Contributions tax (low tax component) | 15% | super |
| Fund earnings tax, Accumulation Phase / TTR | 15% | super |
| Fund earnings tax, Retirement Phase | 0% | super |
| Division 293 rate | 15% | super |
| Division 293 threshold | $250,000 — **nominal, never indexed** | super |
| Carry-forward TSB test | $500,000 — **nominal, never indexed** | super |
| Carry-forward look-back | 5 years, earliest first | super |
| Bring-forward age gate | under 75 at any time in the first year | super |
| Division 296 base rate | 15% | super |
| Division 296 additional rate | 10% | super |
| SG earnings base | qualifying earnings | super |
| Low income super tax offset rate, minimum and work-income share | 15%, $10, 10% or more (§3.5.2) | super |
| Low income super tax offset is not a contribution | a Government co-contribution in law (§3.5.2) | super |
| LITO stage-1 taper | 5c per $1 | tax |
| LITO stage-2 taper | 1.5c per $1 | tax |
| LITO income base | taxable income | tax |
| SAPTO taper | 12.5c per $1 | tax |
| SAPTO rounding | up, to the whole dollar | tax |
| SAPTO income base | rebate income | tax |
| `sapto.transferIncomeFloor` | **$6,000** — frozen literal | tax |
| `sapto.transferReductionRate` | **0.15** — frozen literal | tax |
| Medicare levy shade-in rate, **singles** (s 7(2)) | 10% of the excess over the `threshold amount` | tax |
| Medicare levy family shade-in **base rate** (s 8(2)) | **0.02** — of the family income *threshold*, not of income | tax |
| Medicare levy family shade-in **taper** (s 8(2)) | **0.08** per $1 of family income above the threshold | tax |
| Medicare levy family apportionment (s 8(3)) | the **spouse's** share of combined taxable income, subtracted | tax |
| Age Pension income taper | 50c per $1 | Age Pension |
| Age Pension assets taper | $3.00 /ft per $1,000 | Age Pension |
| MTAWE combined-couple benchmark | 41.76% | Age Pension |
| Single : couple basic rate ratio | 0.6633 | Age Pension |
| Energy Supplement | $14.10 single / $10.60 each — **never indexed** | Age Pension |
| Principal home land exemption | 2 hectares | Age Pension |
| ABP grandfathering | **`false`** — structurally unreachable | Age Pension |
| `HEAS_AGE_COMPONENT` | the 36-row table in §5.2 | HEAS |
| `HEAS_SECURITY_ROUNDING` | floor to $10,000; nil below $10,000 | HEAS |
| `HEAS_FORTNIGHTLY_CAP_MULTIPLE` | 1.5, **fortnightly** basis | HEAS |
| `HEAS_ADVANCE_CAP_MULTIPLE` | 0.5, **annual** basis | HEAS |
| `HEAS_MAX_ADVANCES_PER_PERIOD` | 2 | HEAS |
| `HEAS_ADVANCE_PERIOD_FORTNIGHTS` | 26, rolling | HEAS |
| `HEAS_ADVANCE_ASSET_EXEMPT_DAYS` | 90 (assets test only) | HEAS |
| `HEAS_COMPOUNDING_PER_YEAR` | 26 | HEAS |
| `HEAS_MIN_INSURANCE_PCT` | 0.90 | HEAS |
| Small shareholder ceiling | **$5,000** — frozen; **no mechanism exists to index it**, and it must never be uplifted (T48, §5A.5) | franking |
| Small shareholder exemption — eligible entities | **individuals only** — no super equivalent at any credit level (T49) | franking |
| Small shareholder boundary | `credits <= 5000` qualifies — "does not exceed $5000" | franking |
| Dividend-washing small-holder ceiling | **$5,000** — a **separate** rule, direct distributions only (T50) | franking |
| Holding period | 45 days ordinary / **90 days** preference shares | franking |
| Holding period, widely held trust investor | 45 days flat — no preference-share variant | franking |
| Qualification windows | primary: acquisition + 1 → ex-div + 45/90. Secondary: **±45 / ±90** around ex-div | franking |
| At-risk minimum net delta | **0.30** — strictly below fails; exactly 0.30 passes | franking |
| Day counting | exclude the acquisition day **always**; the disposal day **only if disposed** (T51) | franking |
| Parcel disposal order | **LIFO** across substantially identical securities | franking |
| Maximum franking percentage | **100%** of the payer's own maximum | franking |
| Excess franking credits refundable | **true** for an individual and for a **complying** fund; **false** for a non-complying fund | franking |

Everything else — every dollar threshold, every rate that a Parliament or a Minister can move, and
every derived value — is **config, stamped with its financial year or effective date**.

**Two transfer balance cap figures are deliberately NOT on this list (2026-09-09, P3-9).**

- **The general transfer balance cap ($2,100,000 for FY2026-27) is config, not a constant (T72).**
  It is CPI-indexed under s 960-265 item 10A and moves in $100,000 steps, so it is year-stamped in
  §3.1 and derived in §3.2. Listing it here would assert it holds for every year of the Planning
  Horizon, which is exactly the drift T14 describes. **Do not move it into this table.**
- **The excess transfer balance tax rates (15% first breach, 30% subsequent) and the GIC uplift of
  7 percentage points are NOT listed here, although they are genuinely frozen.** Their provenance
  is settled — verified against the s 960-265 indexation table, which carries only the general cap
  at item 10A, so they do not index. But **ruling R1 means no code reads them**: the engine
  hard-refuses a financial year containing an end-of-day breach and does not implement excess
  transfer balance tax. They are recorded as *recorded-not-live* in §3.10.5. Putting an unread
  figure in this table would recreate the failure this project has hit repeatedly — a rule written
  down, consumed by nothing, and silently diverging from the law it came from. **If R1 is ever
  reversed, they move here and the provenance above is what justifies them.**

---

## 8. What is still open

Carried forward from the four passes without laundering. Nothing here blocks Phase 2.

**Genuinely unresolved:**

| # | Item | Status | What would close it |
|---|---|---|---|
| O1 | **FY2026-27 Medicare levy low-income thresholds** | **Do not exist.** Not legislated as at 2026-09-03. FY2025-26 carried as a labelled prior-year fallback (§2.7). *(Confirmed independently twice on 2026-09-04 — the Act's own history notes stamp every figure "applicable … for the **2025-26** year of income and later", and FRL Compilation No. 53 of 1 July 2026 carries exactly those figures. A confirmation of the finding, not a closure of the gap.)* | Re-check Medicare Levy Act ss 3(1), 8(5), 8(7) after the 2027 Budget. **TODO P1-6 stays open.** |
| O2 | **Deeming rates beyond 20 Sep 2026** | **Unknowable.** No formula, no announced terminal rate, discretionary six-monthly Ministerial instrument | Nothing can close it. Must be a Setting with a scenario lever |
| O3 | **Whether Age Pension age rises beyond 67** | No legislation exists; Services Australia states "no plans" | Nothing can close it. Policy risk, not a parameter |
| O4 | **SG rate beyond 12%** | SGAA states a flat "charge percentage means 12"; ATO shows 12.00% for "1 July 2027 onwards" | Nothing to fetch. Holding it flat for 40 years is an assumption about future policy, and must be recorded as one |
| O5 | **CPI, PBLCI, MTAWE and wage-growth forward series** | Out of scope of Phase 1 | These are Settings, not legislated constants — P2-6 |
| O85 | **CLOSED 2026-09-21 — the stated SPENDING TARGET is a REAL figure and is raised to each month's price level** | **Decided by the user, option (b), in one sentence: *"as we agreed earlier we'd always reflect cpi impacts"* — a standing principle wider than this field.** ~~Open, and it is a USER question rather than a legal one. A `SPEND_CHANGE` states one annual figure and `project()` emits a twelfth of it every month until another supersedes it. Nothing indexes it: the line is the same nominal cents in month 0 and in month 500, so the target is held flat in the engine's own FUTURE dollars and therefore FALLS in real terms across the whole walk. Direction, stated: this **understates** what the household will actually need and therefore **flatters** the plan — the opposite direction from this project's standing residual rule, and the only such item currently on a headline. On the demo plan with spending raised to $150,000 a year, the sentence reported **$98,174** in today's money in 2043 at 2.5% CPI.~~ **As shipped:** `project()` multiplies the standing `annualSpend` by `priceLevelFactor(economicSeries.cpi, asAtDate, month)` before taking the twelfth — `core/priceLevel.ts`, the one expression `Settings.contingencyFloor` has used since P4-14, so there is no second copy of `(1 + cpi) ^ (n / 12)` anywhere. The basis is `asAtDate` and NOT the entry's own date: every box on this page takes today's money (P2-7), and reading a 2040-dated entry as 2040 dollars would show the user back a figure smaller than the one just typed. The form says which money it is asking for, on the label and behind the info button, and `incomeHeadline.ts`'s flat-target warning is gone — in the today's-money view the figure printed IS the figure typed, because the walk indexes by the factor the page deflates by. **What it cost the demo plan, stated because it is large:** Shortfall Age `never` → **2055-12** (Dana 87, Ash 95), 150 short months, and the Age Pension paid in **432** of 501 months instead of 99 — a household that holds less is assessed on less. | Closed. `ONE_OFF_EXPENSE` is the question this leaves open — see **O86** |
| O86 | **CLOSED 2026-09-21 — a dated `ONE_OFF_EXPENSE` is a NOMINAL figure, and so are the non-super buy and sell amounts** | **Decided by the user, and decided the OTHER way from O85 and O87: it stays as it is.** The reasoning, in the user's own terms: *a one-off is an amount as at a date, so indexation is not relevant to it.* **NO FIGURE AND NO BEHAVIOUR CHANGED** — what changed is that the question is shut. `OneOffExpenseParams.amount`, `NonSuperInvestmentBuyParams.amount` and `NonSuperInvestmentSellParams.amount` are the same family and are all covered. The ambiguity this row was raised over is resolved on SCREEN rather than in the engine: the form label shipped in `b410f99` — *"Amount, as it will cost on the day"* — tells the user which figure the box wants, so the nominal reading is the one they were asked for. That label is the ruling and must not be softened. **The text below is SUPERSEDED and kept entire** — ⟨superseded 2026-09-21⟩ **Open, and deliberately left open by the ruling that closed O85 (2026-09-21).** `OneOffExpenseParams.amount` sits in the same Waterfall target as the spending level and is charged as the cents the entry states, in whatever month it falls, with nothing indexing it. It was NOT changed with the spending level because the two are not the same kind of figure: a spending level names a life the household wants to buy (real), while a one-off is very often a PRICE somebody has been quoted for a dated purchase — *"the $40,000 car I will buy in 2030"* — which is a nominal fact. Nothing in the field distinguishes the two readings and guessing would answer a question the user was never put. **Direction, stated:** read as today's money a nominal one-off UNDERSTATES a dated cost and therefore **flatters** the plan — the demo plan's $38,000 roof in 2029 is $35,142 of 2026 roofing at 2.5% CPI. The form says which money it is asking for (*"Amount, as it will cost on the day"*) so that a user is not left to assume it follows the spending box. | Closed by user ruling. The direction recorded below is the direction a user who ignores the label would be flattered in, and the label is what answers it |
| O87 | **CLOSED 2026-09-21 — a fund's DOLLAR administration fee is a REAL figure and is raised to each month's price level** | **Decided by the user on O85's own standing principle — *"as we agreed earlier we'd always reflect cpi impacts"* — and shipped the same day (TODO P4-21).** `SuperInterest.statedAdministrationFeePerYear` is a stated PRICE FOR A SERVICE charged every year for up to forty years, which is `annualSpend`'s shape and not `Mortgage.monthlyRepayment`'s: a bank contracts a repayment in dollars, no fund contracts its fee for forty years. **As shipped:** `projection.ts` builds ONE lens for the month — `(stated) => inflateStated(stated, economicSeries.cpi, asAtDate, month)` — and hands it to `monthlySuperFeesForOneMonth`, which stays the only reader of the field. The basis is `asAtDate`, as it is for the spending level and for the same reason (P2-7: every box on this page takes today's money). The raise happens BEFORE the twelfth so the ceil at the household stays the last operation. **A LENS and not a pre-raised figure**, because a number could be handed in against the wrong interest's balance and a lens cannot be; **required and never defaulted to the identity**, because such a default would silently restore the flat fee this ruling removes. **The PERCENTAGE limbs are untouched and that is asserted, not assumed:** a share of a balance is charged on a figure already in the month's own dollars, so it indexes itself, and `test/core-super-fees.test.mjs` §5b shows two walks differing only in `cpi` to be the same walk to the byte with no dollar fee stated — and to differ once one is. **The identity that replaced the canary:** deflate a month's fee by that month's own factor and twelve of them are the figure typed, with a residue bounded by arithmetic in (−0.05c, +1.05c) whatever the length of the walk, and no drift — each month's fee is re-derived in the test from the stated figure and that month's factor ALONE, so nothing is carried between months. **The control:** with the factor forced to nil, HEAD's entire suite passes against the new engine — 1,971 of 1,978, the one failure being HEAD's own fee test failing on ARITY rather than on a figure. **Cost to the demo plan: nil.** It states no dollar fee, so its 501-month walk is byte-identical and Shortfall Age stays 2055-12. On a $1,200-a-year fee the 122nd month is charged $128.28 instead of $100.00 — 28% more nominal cents for the same fee in real terms, and every figure downstream moves the conservative way. **The text below is SUPERSEDED and kept entire, because it is the argument that produced the ruling** — ⟨superseded 2026-09-21⟩ **Open, found by the O85 inventory on 2026-09-21 and deliberately NOT fixed in the same change.** `SuperInterest.statedAdministrationFeePerYear` (`household.ts:309`) is a RECURRING stated figure with `annualSpend`'s exact shape: the user says *"$1,200 a year"* and `monthlySuperFeesForOneMonth` charges the same twelfth in 2068 that it charges in 2026. A fund's dollar fee is a price for a service and prices rise, so held flat it shrinks in real terms — a fifth over ten years, a third over forty. **DIRECTION: it UNDERSTATES a cost and therefore FLATTERS the household**, which is the direction O85 was fixed for. The percentage limbs (`statedAdministrationFeeRate`, `statedInvestmentFeeRate`) are rates on a balance and are not affected. `test/plan-money-basis-inventory.test.mjs` §4 asserts the GAP and its direction, so closing it turns that canary red. | Closed. The one remaining row from the P4-20 inventory is **O88**, and it is not this one applied twice: a salary sacrifice may want the WAGE series |
| O88 | **CLOSED 2026-09-21 — a standing SALARY SACRIFICE stays a FIXED NUMBER OF DOLLARS and does not index, at prices or at wages** | **Ruled by the user (P6-8 brief 4), and the ruling is that the figure is what it says it is: $20,000 a year means $20,000 a year until the user says otherwise.** **No figure and no behaviour changed by the closure** — `inflateStated` gains no call site, the demo walk is byte-identical, and `test/plan-money-basis-inventory.test.mjs` §4 is kept WORD FOR WORD: what it pinned as a gap is now what pins the ruling, and a build that started indexing this figure would turn it red, which is what the row now wants. What a user who means a share of their pay does instead is restate the amount from the month it changes, or STOP the arrangement from a date (P6-8 brief 4, `kind: 'stopped'`) — the same mechanism `WORK_PATTERN_CHANGE` gives them for the salary itself. **The text below is SUPERSEDED and kept entire, because it is the argument the ruling answers** — ⟨superseded 2026-09-21⟩ **Open, found by the same inventory (2026-09-21).** `SalarySacrificeContributionParams.annualAmount` (`plan.ts:668`) is the other recurring stated figure, and its own doc says it is *"annual for `annualSpend`'s reason"* — the same idiom, now treated the other way. A person who says *"I put $20,000 a year into super"* usually means a share of a life, and the cap it is measured against indexes on AWOTE (P6-12) while this does not. **DIRECTION: it puts LESS into super than the household means to and so UNDERSTATES the plan** — the conservative direction, which is why this is a row and not a defect. ⚠️ **And the index may be the WAGE series rather than CPI**, which is what makes it a separate ruling from O85 rather than an application of it. | Closed by user ruling. `test/plan-money-basis-inventory.test.mjs` §4 stands unchanged and now pins the ruling rather than the gap |
| O89 | **CLOSED 2026-09-21 — the Income Waterfall's portfolio limb GROSSES ITS DRAW UP for the capital gains tax that draw causes, so a sale funds its own tax** | **Ruled by the user, option (a) of two, and shipped the same day (TODO P10-4).** The reasoning, in the user's own terms: *it is what a real person does* — you sell enough to cover the bill AND the tax on the sale. ~~The superseded direction, in `projection.ts`'s own words: *"the liability is a LINE against the running cash and is not grossed into the sale … it does not enlarge the disposal, and a household that cannot meet it reports an `Unfunded shortfall` in some later month rather than quietly selling more"*.~~ **WHAT IT COST WAS A PHANTOM SHORTFALL OF EXACTLY THE TAX, IN EVERY MONTH A SALE WAS THE MARGINAL FUNDING** — limb 3 drew to NEED and the tax on that draw was charged afterwards against the same cash, so one measured walk reported **$566.10 short beside $18,088,555 the Household could reach**, and on the `core-non-super-parcels` fixture **21 of 221 months were short and the shortfall equalled that month's capital gains tax TO THE CENT in all 21**. It was never only a solver problem: the **Shortfall Age on the page** was wrong, in the ALARMING direction, for any household whose marginal dollar comes from selling units. **What ships:** limb 3 OFFERS `net(A)` — market value less the tax selling the whole of it would cause — and the draw is grossed up to `x` with `net(x) = drawn`, solved by a fixed point from below with a bisection of an integer bracket behind it (bounded at `GROSS_UP_FIXED_POINT_STEPS + 53` probes, terminating on integer equality and never on a tolerance, so the walk stays digest-stable). **The tax grossed up for is the tax CHARGED**: both come out of `assessCapitalGainCharge`, one expression asked twice, so there is no second estimate of the liability anywhere in the walk. **The conservation identity is asserted in the engine**: an automatic sale's proceeds less the tax it is charged are what the Waterfall drew, to the cent, in every month. **THE DIRECTION, STATED, AND IT IS NOT ONE-WAY.** Removing the phantom FLATTERS — fewer short months, later Shortfall Ages, and the sustainable-spend answer for a parcel-holding plan rose 83% on the swept fixture (k 0.642 → 1.178). What runs the other way is the CASH: selling to cover the tax takes money out of a parcel compounding at `nominalReturn` instead of out of Offset cash that earns nothing, and it realises a little more gain — the `core-non-super-parcels` walk pays **$5,956.22** of capital gains tax instead of $5,617.80 and ends **$7,406.78 poorer**. Both are the household's real position rather than an artefact, which is the whole of the ruling. **What is NOT grossed up:** an entry-driven `NON_SUPER_INVESTMENT` sell, because the user stated the amount; and nothing is pre-funded — the charge is still made in the disposal's own month, on the year to date, exactly as it was. **A portfolio that cannot fund the month PLUS its own tax is a GENUINE shortfall and is still reported as one:** limb 3 offers everything it has, the limbs below it are offered the rest, and the residue is short. That boundary is tested on a portfolio liquidated to the last cent | Nothing. The ruling is the user's and the mechanism is built, tested and measured. What it unblocked is recorded at TODO P10-4 and P10-1: `INVESTMENTS_REFUSAL` and the `holdsInvestments` outcome kind are DELETED, because a refusal is not left standing over a defect that no longer exists |
| O90 | **CLOSED 2026-09-30 — an illness-separated couple takes SAPTO's separated amount, $2,040 each, for the WHOLE financial year the separation falls in (TODO P12-4e)** | **Built.** Until 2026-09-30 the walk taxed an illness-separated couple as a couple ($1,602 each), a cautious limit that overstated tax. Reg s 9(2)(a) item 3 gives a member of an illness separated couple $2,040; items 1 and 2 read *"at any time during the year"*, and reg s 9(2)(b) takes whichever applicable item gives the greatest rebate. The ATO applies the separated row where *"at any time during the year you and your spouse had to live apart due to illness"* and says *"if more than one item in this table applies to you during the income year, we base your offset on the amount giving you the greatest entitlement"* (§2.3). $2,040 is greater than $1,602, so a year with a separation in ANY month is a separated year, with no apportionment — which closes O16 for this case. They are still spouses: the eligibility test reads half their combined Rebate Income and the reg s 12 transfer applies (ATO Example 9: $1,440 transferred, threshold $39,912, SAPTO $2,469). In the walk the monthly accrual uses the separated amount from the separation's own month, and the July true-up — and the franking assessment inside it — reads whether the COMPLETED year had a separated month, never the live level, because July's own entries are applied before it runs. The Medicare levy has no separate category and needs nothing: it treats them as a family and reads the SAPTO they receive (O34). Walk tests to the cent in `test/core-illness-separation.test.mjs`, including Example 9's household on FY2027-28 rates ($1,440.07, $41,105, $2,619). The earlier grid stays, now as the direction of the change: the separated amounts never make anyone pay more. | — |
| O91 | **In the financial year of a DEATH the survivor is taxed as one of a COUPLE — SAPTO included; single from the next 1 July (P12-1 scope limit, 2026-09-24)** | **Open, accepted, and in the CAUTIOUS direction.** From the year after the death the survivor is assessed as a single person and the deceased as the nil single assessment they are. For the year OF the death the walk keeps the couple's assessment, with the deceased's part-year income. **The Medicare levy half of that is SOURCED, not a limit:** a spouse who died during the year, with no other spouse before its end, still counts for the family reduction, and family taxable income includes theirs (ATO, "Medicare levy reduction – family taxable income", and the myTax 2025 spouse-details instruction). **The SAPTO half is the limit.** The ATO's SAPTO codes (myTax 2025, "Tax offset codes") give a widowed survivor code A, the single amounts, unless code D also applies (lived together, both eligible) and the spouse's taxable income was under $12,494, when D is used; the walk gives D, or E where the deceased was not eligible, with the couple's transfer. **Measured over a grid** (survivor and deceased $0–$100,000 in $2,500 steps, deceased eligible or not, FY2026-27 and FY2027-28): the couple's offset is **never more** than the code table's, and strictly less in over 1,000 cells (`test/core-death.test.mjs`). With the levy a family's either way, less offset is never less tax. The deceased's own final return is a couple's, which the code table agrees with. The accrual after the death carries the deceased's year-to-date qualification (s 160AAAA(2)(b) "at any time during the year"), so it estimates on the true-up's basis. **Why not built:** the code table's $12,494 is a FY2024-25 figure with no later one found, and this engine's reg s 12 transfer (only to a Person whose own offset has started to shade) does not reproduce it, so choosing between A and D in the walk would rest on a threshold nobody has published for the years it would run in. Relatedly O16 — the code table answers O16's *"the year of a spouse's death"* for SAPTO, so O16 now stands only for mid-year changes of status in general | A published code-table threshold for the forecast years, and a reading of reg s 12 that reproduces it; then give the survivor the larger of the two offsets for the year of the death |
| O92 | **CLOSED 2026-09-25 — every price ESTIMATE a household types on ENTER_CARE/SELL_HOME/RENT_OUT_HOME/HEAS_DRAW is in TODAY'S money, `SpendChangeParams.annualSpend`'s own basis, not nominal at the entry's date** | **Ruled by the user: these boxes were built (P14-13/P9-1/P9-2) treating the household's own estimate of a facility's room price, a home's sale value, a weekly rent or a HEAS security as NOMINAL at whatever date the entry falls, which halved a 2056-dated RAD in real terms and understated every other estimate dated more than a few months out — the same class of defect O85 closed for the spending level.** The audit table (every money param on every entry type, and its basis) is at the end of this section, just before §9. **Two conversion SHAPES, not one:** ENTER_CARE's radPrice/radPaidAsLumpSum/homeValue, SELL_HOME's three figures and HEAS_DRAW's securityValue are each raised ONCE, to the entry's (or the advance's) own day, and then held at that nominal figure for the life of the fact — the RAD, the sale, the security never re-price themselves afterwards. RENT_OUT_HOME's five figures and a STATED `fortnightlyAmount` are raised EVERY MONTH the arrangement runs, `annualSpend`'s own footing, because a rent or a drawn income stream is a standing figure that keeps rising, not a one-off price agreed on a single day. `'maximum'` is unaffected — it is already netted off the month's own Age Pension entitlement. **P14-5a's own vacated-home carry is corrected as part of this, not a second ruling:** it inflated `homeValue` from the ENTER_CARE entry's own day, which was already wrong on the new basis; it now inflates from `asAtDate`, which — because `homeValue` is itself in today's money — telescopes the two multiplications `core/priceLevel.ts`'s `inflateStated` was always going to need into the ONE it already had. **Debts are the boundary, restated rather than touched:** `MortgageRefinanceParams`' three figures and `Mortgage.openingBalance` stay nominal, O86's own ground (*"a one-off is an amount as at a date, so indexation is not relevant to it"*), extended here to *"a contracted sum is a number of dollars, not a standard of living"*. **One shared expression, `projection.ts`'s `atTodaysMoney`, itself one `inflateStated` call** — every one of the fourteen converted figures reads through it, so `test/plan-money-basis-inventory.test.mjs` §1's count moves from FIVE call sites to EIGHT (the new lens, plus TWO in `parsePlan.ts` where a STATED `fortnightlyAmount`/`advance.amount` must be raised to nominal before the door can compare it against a nominal legislated cap), not fourteen — the ONE-expression rule an inflated call count would otherwise have hidden. **LABELS: every converted box (`entryForm.ts`) says "in today's money"; the entry table's own row text and the chat's `listEntries`/`proposeEntries` figures say so too** (`statedFigures` reclassified from `'nominal'` to `'todaysMoney'`, `labelledStated`'s own existing branch — built for `annualSpend` — needed no new logic, only a `Stated` tuple threaded with the ADVANCE's own date, since it is not the entry's). **Every existing hand-worked aged-care/sale/rent/HEAS test whose figures moved was RE-DERIVED, never re-typed:** each now computes its own expected nominal figure via `inflateStated`/`priceLevelFactor` from the SAME stated cents and dates the fixture already had, including two `sustainableSpend`/life-stages fixtures whose RAD, unfundable once correctly larger, needed its STATED figure recomputed as the inverse of the same factor so the fixture's own point (a plan that funds a RAD at all) survived. **Mutation, asserted:** reverting the RAD (`entered.params.radPaidAsLumpSum`) to nominal-at-the-entry's-day turns 8 tests in `core-projection-aged-care.test.mjs` red. **Golden byte-identical** — the demo plan holds none of these four entry types | Nothing. Shipped, tested, mutation-checked |
| O24 | **Whether the s 160APHR(1)(g) benchmark-portfolio election is open to an SMSF at all** | **Unresolved.** Paragraph (g) covers "the trustee of a fund **(other than an excluded fund)**", and s 160APHR(11) gives "excluded fund" the meaning in s 10(1) of the SIS Act 1993 — but the SIS Act compilation in force 1 July 2002 contains **no such definition** (it defines "self managed superannuation fund" at s 17A instead). Raised on audit 2026-09-04 | Trace the SIS Act "excluded fund" → "self managed superannuation fund" transition and check whether s 160APHR(11) was consequentially amended before Part IIIAA ceased to apply. **Until then the register must not assert the (g) route is available to a fund of either kind** (§5A.6) |
| O25 | **Whether a s 160APHR election can still be made and given effect after 1 July 2002** | **Unresolved.** s 160APHR is inside Division 1A and so is preserved, but its *consequence* — Subdiv BA of Div 7 of former Pt IIIAA, and the s 160AQZH "benchmark portfolio of shares" definition — is outside Division 1A and outside what s 207-145(1)(a) and TD 2007/11 preserve. TD 2007/11 is silent | A TD/TR/ATO ID addressing s 160APHR post-2002. **Low impact** — a fund holding a long-term diversified portfolio passes the plain 45-day rule anyway |
| O26 | **Whether any regulations were ever made under Division 1A's delegated-legislation hooks** — ss 160APHJ(1) (delta), 160APHM(1) (material diminution), 160APHR(1)(j)/(2) (electors), 160APHR(3)/(4) (prescribed related payments) | **Unverified.** No evidence of any found; the Income Tax Regulations were not searched | Search the regulations for references to 160APHJ / 160APHM / 160APHR. Since Part IIIAA is repealed, any such regulations are almost certainly spent. **None of these hooks reaches the $5,000**, so §5A.5's conclusion does not depend on this |
| O30 | **CLOSED 2026-09-21 — Medicare levy: a mixed-SAPTO couple holds two family income thresholds, and BOTH are right** | **Closed on the primary law, and it was a MIS-FRAMING rather than an ambiguity.** The s 8 low-income reduction is computed **per taxpayer**: each spouse applies **their own** family income threshold to the **shared** family income, so a couple one birthday apart holds $61,623 and $47,238 at once and both answers are simultaneously correct. Every operative limb — ss 8(1), 8(2), 8(3), 8(5), 8(7) — is framed on *"a person"*/*"the relevant person"*; *"family income threshold"* is defined **"in relation to a person"** while *"family income"* is expressly the shared sum; **s 8(5)(b) shows the drafter's express technique for pulling a spouse into a per-person term** (*"the relevant person **or the spouse of the relevant person**"*, the child uplift) and **s 8(7) does not use it**; s 8(7) uses the same *"a person who is entitled to a rebate under section 160AAAA"* formula as s 3(1)'s `threshold amount` and `phase-in limit`, applied per Person here since P3-1a; and s 8(3)'s ratio contains **no threshold at all**, so two asymmetric reductions apportion perfectly well. **WHERE THE ERROR CAME FROM, and it is the part worth keeping:** the research note observed that two spouses' reductions *"sum to raw — the household gets the reduction once"*. That is an artefact of the **symmetric** case, true only when both share a threshold. This row elevated it into a statutory constraint, found it broke under asymmetry, and concluded the Act was silent. **A regularity observed only in the symmetric case is not a rule** — and the one ATO family worked example available to check it against (Ashton, QC27032) is itself symmetric. `MixedSaptoFamilyThresholdError` is **DELETED**, not narrowed: §9's mutation row and §2.7's refusal row are rewritten on the reversed premise rather than circumvented. **The consequence is immediate and was the point of closing it:** this row was the gate on the Age Pension standing table (P4-1e), and on the demo plan in FY2030-31. TODO **P3-1f**. **The text below is SUPERSEDED, kept entire, and is the record of the mistake** — ⟨superseded 2026-09-21⟩ **Unresolved and live.** s 8(7) substitutes the seniors family income threshold "in relation to **a person** who is entitled" to SAPTO — a **per-Person** test. A couple where one spouse is under Age Pension age therefore holds **two different family income thresholds against one family income**, so `raw` is not a single household number and s 8(3) has two different amounts to apportion. Nothing in s 8 resolves it. Research U2. **A SECOND ROAD TO IT, FOUND 2026-09-19 (P6-8 brief 2 chunk 1), and it is a USER ACTION rather than a fact about the Household: a salary sacrifice.** Family income is the sum of both Persons' TAXABLE incomes and an effective sacrifice reduces the sacrificing spouse's; **Rebate Income does not fall with it** (§2.3's add-back), so SAPTO entitlement does not move while family income does. A couple sitting clear of the 1.25× gate can therefore be pushed under it by an arrangement that changes nobody's entitlement, and the whole assessment is refused from that month on. Every two-Person `SUPER_CONTRIBUTION` fixture in the discriminating range hits this — which is why chunk 1's fixtures are single-Person, and why `test/core-projection-sacrifice-credit.test.mjs` states $95,000 as the salary expressly to stay clear of it, recording that $75,000 and $85,000 both throw. The refusal is right and is doing its job; what is new is the road. **⚠️ AND FROM 2026-09-21 IT IS THE GATE ON A USER RULING, WHICH IT WAS NOT BEFORE — O30's THIRD ROAD, and the first one that blocks a whole feature rather than a fixture.** The ruling is *"assume current numbers continue whilst awaiting future pertinent legislation"*, applied to the Age Pension (TODO.md P4-1e): carry the last published parameters forward past 19 Mar 2027 instead of emitting no pension line at all. Wire it and the **demo plan itself stops projecting** — the older Person becomes entitled, therefore *qualified* under s 160AAAA(2)(b), therefore on SAPTO while the younger is not, and the couple's family income in **FY2030-31** sits under 1.25 × the larger threshold. **72 of 84 test failures on the wired build were this one refusal.** It is the same wall P7-5 measured on 2026-09-19 for a plan that STATES a forward series, reached from the opposite direction: what O30 answers to is *an Age Pension entitlement exists past the published window*, by whatever road. The standing table therefore ships as machinery, evidence and argument with the switch NOT thrown, and **O30 is now the gate on throwing it**. It cannot be narrowed from the Age Pension side: the ambiguity is in the Medicare Levy Act | **CLOSED, and NOT on the condition this row named.** It named *an ATO worked example or ruling on a mixed SAPTO couple*, or the **ATO Medicare levy calculator** (research U8, never run). **No such worked example exists**: the only ATO family example has **both** spouses on SAPTO. What closed it is the **primary law** (ss 3, 8, Compilation No. 53, C2026C00295, in force 1 July 2026, re-read 2026-09-21), corroborated by the ATO's **per-taxpayer myTax Worksheet 2** — two spouses enter different amounts at the SAPTO row with no reconciliation step — and the ATO's express statement resolving within-couple SAPTO asymmetry on **individual** entitlement. A **stronger** evidence type than the one named and a **different** one; the substitution was made knowingly on the user's ruling. **U8 remains unrun, and O31–O33 are untouched by this** — closing O30 on s 8's own words says nothing about them |
| O31 | **Whether the s 8(3)(c) gate reads "liable" as including s 7** | The text excludes only ss 8 and 9, so s 7 survives the hypothetical and a spouse below their own `threshold amount` is not liable. **That is the plain reading and the Ashton example rules out the alternative** — reading "liable" as s 6 alone would apportion in Ashton's case and give $229.76, not the published $92.90. What is untested is only the **boundary**: Ashton's spouse is at $21,700, far below $44,268. Research U1 | An ATO example, ruling, or calculator output for a couple with one spouse just **above** their `threshold amount` and family income inside the band. **Confidence in the reading is high; this is flagged, not doubted** |
| O32 | **No statutory rounding rule for the s 8(3) apportionment** | The *Medicare Levy Act 1986* was read in full (ss 1–11 plus endnotes) and contains no rounding provision. `raw × TI(S)/FI` is the **only** genuine rounding point in the whole of s 8 — everything else is exact in integer cents on whole-dollar taxable incomes. Also unresolved: the **direction** of the subtraction, since `raw − raw×TI(S)/FI` and `raw×TI(P)/FI` can differ by a cent once rounded. The statutory order is followed. Research U3, U5 | An ATO calculator output, or the ITAA 1936 Part VIIB assessment machinery. **At most 1 cent**, and only in the narrow ordinary-couple window where s 8(3) is reachable at all |
| O33 | **s 8(4) is mutual and the statute does not resolve the circularity** | Where both spouses generate an excess reduction at once, each subsection-(4) reduction feeds the other. Applied as a single non-recursive pass from the pre-spillover levies. Research U4 | An ATO example or calculator output for family income just above **$56,022** with both spouses just above **$28,011**. **Unobservable in every instance found** — both levies end at nil either way — which is also why the mutation is unfalsifiable (§9) |
| O34 | **s 3(3)(a) "living separately and apart" vs an illness-separated couple** | s 3(3)(a) deems such a person **not** married, which would give Ashton family income of his own $49,700, below $61,623, and a **nil** levy under s 8(1) — not the published $92.90. The ATO evidently reads the phrase as **marital** separation, not illness separation; the arithmetic match confirms the practice but the point is unresolved on the text. Research U6, D9 | ATO guidance on "living separately and apart" for Medicare levy purposes, or ITAA 1936 s 251R. **Live for this project** — SAPTO already carries an `illnessSeparatedEach` branch and the v1 `ILLNESS_SEPARATION` what-if reaches it. *2026-09-30: the walk now reaches it (O90). For the levy it treats the pair as a family, as for any couple — which is the ATO's reading here, and the one the Ashton arithmetic matches; only SAPTO takes the separated amount* |
| O35 | **Whether a SIS Act s 99G(6) refunded amount is a low tax contributed amount while no longer being a concessional contribution** | **Open, and INFERRED FROM STATUTORY STRUCTURE — NOT STATED IN TERMS.** Primary-verified: ITAA 1997 s 291-25(2)(e) excludes such an amount from *concessional contributions*, and s 293-30(4) has **no** counterpart. The **consequence** — that it stays a low tax contributed amount, so `concessional − excess` **UNDERSTATES** Div 293 in that year — is drawn from the absence of a matching paragraph, not from any source. **SIS Act s 99G was never retrieved** and no ATO or explanatory material addresses the asymmetry. Research P3-5 U1; §3.6 | Retrieve *Superannuation Industry (Supervision) Act 1993* **s 99G** and the explanatory memorandum to **No 127 of 2021 Sch 3**. **Carried in code, not decided**: the derived route consumes `lowTaxContributedAmountDivergence` and reports **unverified**, while a stated s 293-30 figure keeps primary-verified — so the weakness lands only on the numbers that rely on the inference |
| O36 | **Minimum drawdown: the four details §3.9 did not determine** — (a) the **direction** of the "rounded to $10"; (b) the **order** of rounding against pro-rating; (c) the **basis** of the part-year pro-rate (days or months); (d) **which balance** applies in a commencement year, when a pension starting mid-year has no 1 July balance | **CLOSED 2026-09-08 / 2026-09-09.** Closed by `docs/research/p3-minimum-drawdown-and-ttr.md`, which read **SIS Regulations 1994 reg 1.06(9A) and Sch 7 cll 1–5** off `F1996B00580` **Compilation No. 159** (compilation date 1 July 2026) two independent primary ways — the FRL Word compilation, including the cl 1(1) formula read out of its **embedded WMF drawing records**, and the same clauses as plain text in the ATO Legal Database at `REG/19940057`. All four are answered on the operative text: **(a) nearest $10 with an exact $5 going up** (cl 5, verbatim) — so $49,380, not the ceiling's $49,390; **(b) pro-rate first, round once, last** (cl 1(1) is "Subject to clauses 3, 4, 4A and 4B"; cl 5 rounds "an amount determined under this Schedule") — so $36,940, not $36,930; **(c) days, inclusive of the commencement day** (cl 3, "include and follow"; "month" appears nowhere in the Schedule) — so $14,960, not the months basis's $15,000; **(d) the commencement-day balance, with the full annual factor applied to it** (cl 1(2)(a)(ii)). The ATO's Thavi worked example reproduces the combined reading to the dollar ($3,100). **§3.9 was rewritten on 2026-09-09** and carries all four plus the two rules it never had — the cl 1(2)(b) withdrawal-benefit substitution and the commencement-day age — as traps **T56** and **T57**. Three residues remain, and they are **O37, O38 and O39**, not this item | — |
| O37 | **Sch 7 cl 3 does not state the denominator of the part-year proportion** | **Open, and `secondary-only`.** cl 3 gives the numerator only — "the number of days in the financial year that include and follow the commencement day" — and never says what it is a proportion *of*. Days in the financial year (**365, or 366 where it contains 29 February**) is the only coherent reading and the ATO states it expressly, **but it is not in the instrument**. **Immaterial for FY2026-27**, which has 365 days; **live from FY2027-28**, which contains 29 Feb 2028. Carried in code as its own record — `minimumDrawdownProRataDenominator`, `secondary-only` — and consumed **only** by a part-year determination, so a full-year minimum does not inherit its confidence (§3.9) | An ATO ruling, or the Explanatory Statement to the regulation that inserted Schedule 7 (SLI 2007 No. 50 / the *Superannuation Legislation Amendment (Simplification) Regulations 2007*). **Not retrieved.** A web-guidance sentence is what is already held and does not raise it |
| O38 | **The TTR maximum's negatives rest on the ABSENCE of a provision** — that the 10% is not pro-rated, not rounded, not age-varying and not switched off by Sch 7 cl 4 | **Open, and `secondary-only`.** The three provisions are primary-verified and were read in full — Sch 7 cl 3 is confined to "the minimum total payment", cl 5 to "an amount determined under **this Schedule**", and reg 6.01(2) supplies no replacement anywhere in it, in reg 6.01AB or in reg 1.06(9A). **No competing reading has been found**, and the ATO instructs the reader in three separate bullets **not** to reduce the maximum for a part year, **not** to vary it by age and **not** to round it. But **no primary provision says it**, which is why the §3.9 row and `ttrMaximumUnadjusted` carry the basis in the same cell as the confidence rather than a bare `primary-verified`. **Impact low** — the reading and the ATO instruction agree, and it runs toward a *larger* legal headroom, so the tool is not over-stating a Person's position | An ATO **ruling or determination** stating it (a web-guidance bullet is what is already held), an SMSF auditor contravention-report instruction, or the **Explanatory Statement to the 2005 regulation that inserted the TRIS definition** — which would settle intent. **Not retrieved** |
| O39 | **Mid-year commutation or rollover proportioning of the minimum** | **Open, and refused in code rather than decided.** Sch 7 cl 3 proportions the minimum for **one** event — the year the commencement day falls in — and says nothing about a commutation or a rollover. ATO guidance recognises a second: *"The minimum payment amount will be a proportion of the annual amount if the income stream starts, **is commuted or rolled over** part way through the year"* — a proportioning event with **no clause behind it in the Schedule as read**. The full-year minimum and a proportioned one are different numbers, so `minimumDrawdown` raises **`MidYearProportioningError`** for such a year instead of choosing one. **Nil impact on a pension that starts once and runs; medium the moment a Scenario commutes or rolls over mid-year** | A research pass against reg 1.06(9A), TR 2013/5 and the ATO commutation guidance. **Explicitly out of the P3-10 brief's scope** (that brief was confined to reg 1.06(9A) and Schedule 7), so this is a gap by construction, not an oversight |
| O40 / U10 | **The general transfer balance cap for FY2027-28 and beyond** | **Unknowable until late January 2027**, when the ABS publishes the December 2026 quarter CPI. FY2026-27's **$2,100,000** is now derived from primary index numbers (§3.1, §3.10); no later year is derivable at all. It also drives each later year's **indexation increase**, and through that every Person's personal cap and the §3.3 bring-forward tiers | Nothing can close it before Jan 2027. Same class as O2 and O5 — a **Setting driven by a CPI assumption**, with the s 960-285 machinery applied to a projected index number. **The engine must never hard-code the $100,000 step** (T72) |
| O41 / U9 | **Which CPI reference base supplies the s 960-285(5) index numbers after the ABS re-reference** | **Open — labelled inference, and the label must stay.** s 960-280(1) says the index number "**first published**", and the number first published for Dec 2016 was **110.0** (old base); the current ABS series publishes Dec 2016 as **76.38**, and Dec 2025 (**100.32**) exists **only** on the new base. s 960-280(3) points to new-base numbers "after the change" but does not say in terms that the historic *base quarter* is restated. The new-base pair reproduces all nine published caps — strong corroboration, not a statement of the rule. **Four published years (2018-19, 2020-21, 2021-22, 2024-25) already differ in the third decimal on the two bases**, one thousandth is **$1,600** at the $1.6m base, and FY2026-27 cleared its $100,000 step by **$800** | An ATO or Treasury statement of the index numbers used for a named year's cap; the ABS re-reference note in the December 2025 quarter CPI release saying whether the historical series is restated; or an ATO ruling on s 960-280(3). **Carried, not decided:** store the reference base alongside every index number and refuse to compute a factor from a mixed pair |
| O42 | **A personal transfer balance cap cannot be derived for a Person whose transfer balance account started before the forecast** | **Refused, not decided.** Seven inputs are required and none is inferable from a current balance; the error from guessing is **unsigned and unbounded**. **Refused in code** as `UnknownPersonalTransferBalanceCapError` (**R2**), against the seven-field Settings block of **R3** — §B's six-field list is arithmetically insufficient, because reconstructing a cap from a start year alone means replaying every intervening s 294-40 increase — whose account-start field is a **day, not a financial year** (**R4**, since the credit is valued on the stream's starting day, never on 1 July) | Nothing to fetch — a data-availability fact, not a legal gap. Scoped to pre-existing pensions only: a Person who enters retirement phase **inside** the forecast is fully computable |
| O44 | **`generalTransferBalanceCap()` cannot produce an indexation increase** | **CLOSED 2026-09-09.** `src/core/superCaps.ts` now computes the cap under s 960-285 for every year the CPI series covers, and the register's December quarter numbers are in the data layer as `superannuation.capIndexation.cpiDecemberQuarterIndexNumbers` (§3.2). All nine published caps, 2018-19 through 2026-27, are reproduced by the code and asserted as fixtures, so **two consecutive years** — and therefore the s 294-40 indexation increase — are available. `UnsourcedIndexBaseError` **survived, narrowed**: it no longer fires for a year, only where the *supplied series* has no index number for the spec's own base quarter. `div296.ts` followed on **2026-09-09** — the two Division 296 thresholds now take a `CpiSeries` on the same shape, raise `UnsourcedIndexBaseError` only for a supplied series that cannot furnish December 2025, and refuse a year with no December quarter number with `MissingIndexNumberError`. **Their base quarter is December 2025, which is the latest published December quarter**, so exactly one year is computable from published data — a limit of the calendar, not of the register (see §3.7). A year with no December quarter number now gets `MissingIndexNumberError`, which is the truer refusal: the forward series is a Setting (O5). **Two things did not close with it.** **(a)** The parameter is a whole **`CpiSeries`**, not the `indexNumbers` list this row proposed, because O41 governs: a series names its reference base once and both halves of the factor are read out of it, so a mixed pair is not something the API can express. **(b)** O41 / U9 is consumed as its own `unverified` record, so every *computed* cap arrives unverified naming the reference base; the published FY2026-27 figure is returned from the ATO record at `primary-verified` with the computation run against it as a cross-check | — (closed). **O40 / U10 and O41 / U9 remain open**: FY2027-28 is still unknowable until the ABS publishes the December 2026 quarter, and a forecast must be supplied as a series carrying its own base and its own confidence |
| O45 | **The §3.1 General Transfer Balance Cap row cited s 294-35(3) for $2,100,000** — the one figure that subsection does not contain (it contains **$1,600,000**) | **CLOSED 2026-09-09 by this pass.** Mis-sourced, not wrong: the figure was in truth `secondary-only` (ATO rate table plus a CCH note) until the ABS index numbers were retrieved. The §3.1 row now cites **s 294-35(3) + s 960-265 item 10A + s 960-285 + s 960-280(1) + ABS CPI Dec 2016 = 76.38, Dec 2025 = 100.32**, shows the arithmetic, and earns `primary-verified` because the same arithmetic reproduces **all nine** published general caps, 2018-19 through 2026-27 | — |
| O46 | **The `unused cap percentage` needs the historical high, and it is a DISTINCT input from the opening transfer balance** | **CLOSED 2026-09-09 by ruling R3.** s 294-40(2) requires the highest end-of-day transfer balance up to the end of the previous financial year **and the earliest day it occurred**; neither is derivable for a pre-forecast account, and both silently collapse into the opening balance unless named. R3 settles the Settings block as §A's **seven fields**, which carry `highestEndOfDayTransferBalance`, `highestBalanceDay`, `personalCapOnHighestBalanceDay` and `hasEverExceededCap` | — **Residue, not the item:** trap **T84** — that the fields are actually *consumed* — is not yet asserted by a test |
| O47 | **The withdrawal characterisation Setting (`pensionPayment` vs `partialCommutation`) is not in the model, and §3.9's drawdown code has no slot for it** | **Unresolved — a design decision, not a legal gap.** The distinction changes **both** the transfer balance (a partial commutation is a s 294-80 item 1 debit; a pension payment is not) **and** whether the withdrawal counts toward the Schedule 7 minimum (§3.9). It has to be **one** input read by both, or the two reports will disagree about the same withdrawal | A decision on where the characterisation lives, plus a **§6 cross-report consistency test**: a withdrawal marked `partialCommutation` produces a debit here **and** does not count toward the minimum there. *(NARROWED 2026-09-16 by P3-9 chunk 4. The first half is done: `WithdrawalCharacterisation` and `DEFAULT_WITHDRAWAL_CHARACTERISATION = 'pensionPayment'` live in `src/core/transferBalanceAccount.ts`, the module that owns the s 294-80(1) item 1 event, and the debit side reads it by way of two separate functions rather than one branching on it. **The rest is untouched and the row stays open:** `minimumDrawdown.ts` and `ttrPaymentRange.ts` still have no slot for the characterisation, so the two reports can still disagree about one withdrawal, and the §6 cross-report test does not exist.)* |
| O48 | **The named refusals for this cluster are drafted but not registered in code** | **Partly ruled.** Ten names were proposed; **R2** settles `UnknownPersonalTransferBalanceCapError` and **R8** settles `ReversionaryStreamNotModelledError`. Of the remaining eight, `ConditionOfReleaseItemNotIdentifiedError` was **BUILT** in `src/core/conditionOfRelease.ts` and its §3.10.8 status was corrected to match on **2026-09-10**; it was **deleted on 2026-09-29 (LR-2)** once reg 6.01(7) mapped its one case. The other seven are `proposed` in §3.10.8 and shipped nowhere: the cap-breach refusal (name **not** ruled), the R5 absent-conversion-day refusal (required, name not ruled), `TrisNotificationNotStatedError`, `CommutationAuthorityNotModelledError`, `CappedDefinedBenefitIncomeStreamNotModelledError`, and the credit/debit set `LRBACreditNotModelledError` · `DeferredAndCappedDefinedBenefitCreditsNotModelledError` · `StructuredSettlementNotModelledError` · `FraudAndBankruptcyDebitsNotModelledError` · `PaymentSplitNotModelledError` · `StreamCeasedOutsideCommutationNotModelledError` | **R8 is an instruction, and it comes first: collect the refusal names into a SINGLE module before any of these is registered** — three passes have already minted three names for the same two refusals, and one home is what stops a fourth. **Narrower reading adopted 2026-09-10:** §3.10.8 *is* the one home — all 39 refusals in `src/` already carry the `Error` suffix, so there is no drift in built code to relocate — and `test/refusal-names.test.mjs` now enforces it in both directions (nothing refuses in code the register does not name; §3.10.8's statuses must be true). Then assert each name is reachable from at least one input configuration. **LARGELY CLOSED 2026-09-15 by P3-9 chunk 1**, which registered all twelve remaining names in the same change as their §3.10.8 rows: ten in a new `src/core/transferBalanceAccount.ts` (`UnknownPersonalTransferBalanceCapError`, `TransferBalanceCapExceededError` — the cap-breach name, settled as the proposal plus R8's suffix — `CommutationAuthorityNotModelledError`, `CappedDefinedBenefitIncomeStreamNotModelledError` and the six credit/debit item refusals) and two in `src/core/superPhase.ts` (`ReversionaryStreamNotModelledError`, `TrisNotificationNotStatedError`). The R5 absent-conversion-day refusal gained **no name**: it is discharged by the already-built `TrisRetirementPhaseNotModelledError`, checked against R5's words. **What is NOT closed, and it is the second half of this row's own remaining-work sentence: the reachability assertion.** **Narrowed 2026-09-16 by P3-9 chunk 3, and again the same day by chunk 5a — THREE of the twelve are now reachable and nine are not.** `TransferBalanceCapExceededError` has a throw site and a test that reaches it from a closing balance one cent over a cap (chunk 3). `ReversionaryStreamNotModelledError` and `CommutationAuthorityNotModelledError` have theirs as **input guards** on the three `superPhase.ts` interest constructors, reached by declaring the fact each refuses (chunk 5a) — which is the only trigger either could honestly have, since neither fact is derivable from a condition of release. The remaining **nine** are still registered-and-unreachable, because there is no credit or debit function, no Schedule 1 item, no notification fact and no declared defined-benefit stream in `src/` for any of them to fire on. **Narrowed again 2026-09-16 by P3-9 chunk 6-4: FOUR are now reachable and EIGHT are not.** `UnknownPersonalTransferBalanceCapError` has a throw site — `transferBalanceAccountOrRefuse` in `src/core/transferBalanceAccountSettings.ts` — reached by a Person who declares a pre-forecast transfer balance account without the seven §3.10.3 Settings, or who was never asked. The rest of the assertion can only be written as the remaining throw sites land. *(Count CORRECTED 2026-09-16 by P3-9 chunk 5b-6: **FIVE are now reachable and SEVEN are not**, and this cell's own remaining-work sentence said, until that day, "of the eight, `TrisNotificationNotStatedError` waits on chunk 5b (blocked on a pending ruling), and the other seven still have no Schedule 1 item and no declared defined-benefit stream in `src/` to fire on". **R13 ruled on 2026-09-16**, which unblocked it, and the same day chunk 5b-6 gave it a throw site — limb 2b of `trisInterestOrRefuse` in `src/core/trisInterest.ts` — reached by a Person with the employment ground alone who **stated** a Schedule 1 item of 101, 102A or 103 and stated no notification day. R7 inputs 5 and 6 arrived as `StatedStreamSettings.statedSchedule1Item` and `.statedNotificationDay` in chunk 5b-2, which is what stopped "no Schedule 1 item … in `src/`" from being true of this one — and it is an item the USER STATED, never one `schedule1ItemFor` derived, because the employment-ground mapping is still O59 / U28. The STRUCK list in `test/core-transfer-balance-account.test.mjs` had this name struck in the same change, and its `names.length` ratchet went from 8 to 7.)* The remaining **seven** still have no declared defined-benefit stream in `src/` to fire on, and for the six credit/debit refusals the narrower reason is chunk 4's, restated below. *(Ground CORRECTED 2026-09-16 by P3-9 chunk 5b-5. This cell said the seven "still have no credit or debit function" — false since chunk 4 built `creditOnCommencement` and `recordCommutation`, and doubly so now that `creditTrisConversionUnderItem106` composes one of them with R13's conversion day. §3.10.8's own row for the six item refusals was corrected on the same ground on 2026-09-16 and this one was not, which is one module knowing and the register not. The narrower reason those seven are still unreachable is chunk 4's and it is unchanged: every credit and debit function in `src/` is handed a **day and an amount**, and nothing in that input can declare itself an LRBA repayment, a structured settlement, a payment split, a s 294-85 reduction or a stream ceasing outside a commutation.)* |
| O49 / U20 | **Four provisions cross-referenced but never read** — reg 294-130.01 (streams *prescribed* as capped defined benefit, s 294-130(2)); regs 307-205.02C / 02D / 02E (further valuation methods); reg 294-145.01 (the `debit value` method for s 294-145(7)); and *Income Tax (Transitional Provisions) Act 1997* Subdiv 294-A / 294-B | **Unread, and one of the four is live.** reg 294-130.01 was seen only by cross-reference from reg 294-80.01(1)(b)(ii). If it prescribes something an ordinary retiree can hold, the `CappedDefinedBenefitIncomeStreamNotModelledError` trigger is **mis-scoped**, and a mis-scoped refusal either fires on healthy inputs or fails to fire on the ones it exists for. The ITTPA transitional excess relief (LCR 2016/9 ¶74 — *"operate only to disregard your excess transfer balance for this 6-month period"*) is **almost certainly spent** for FY2026-27, but that has **not** been verified | Four fetches: the three ITAR sections at `REG%2F20210206%2F<section>` (prefix confirmed, §10), and the ITTPA at the ATO Legal Database's transitional-provisions DocID |
| O50 | **The s 307-80(3)(b)(ii) textual anomaly, and which side the tool codes** | **DECIDED, not resolved.** The tool implements **the ATO's reading** — turning 65 converts a TRIS automatically (T80, T125) — because LCR 2016/9 ¶15 is a public ruling the Commissioner is bound by. **The confidence label is fixed by R6 and is §D's in full: `inference from an express enumeration`** — an argument from the **absence** of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list, corroborated by a public ruling. **Never bare `primary-verified`, and it must not be narrowed**, because an absence-based reading silently promoted to a verified fact is exactly the failure the confidence labels exist to catch. The underlying textual question is **O65** and stays open | The EM to *Treasury Laws Amendment (2017 Measures No. 2) Act 2017* (No. 55 of 2017) Sch 1 item 13, or a ruling addressing the overlap. **Neither retrieved** |
| O52 | **ITAA 1997 Subdivision 295-F was never retrieved — an assertion that was FALSE WHEN WRITTEN** | **CLOSED 2026-09-10 by P3-25.** The Subdivision has now been retrieved in full — ss 295-385, 295-387, 295-390, 295-395, 295-400, 295-405, 295-407 and 295-410, plus **ITAR (1997 Act) 2021 reg 295-385.01** and the complete `F2021L00206` compilation — and §3.11 carries the analysis. **Record why it was false, not merely that it was:** ss 295-385, 295-387 and **295-390** had been fetched by the **franking pass on 2026-09-04**, and §10's own *Franking — P1-11* list said so. What this item actually described was *"not retrieved by **this** pass"*, written down as *"never retrieved by **any** pass"* — a cross-pass negative asserted without checking the register's own source index. That process finding is **O70**, and it is live: two `src/` files still carry the negative in shipped text | — (closed). **Its consequences are not closed:** §3.11 replaces the missing rule, **O70** carries the process rule, and the refusal message correction of **R10 step 1** is owed to `src/core/superPhase.ts` |
| O57 | **`src/core/superPhase.ts`'s `UNCAPPED_ENTRY` caveat still says the cap is "not modelled"** | **Live code gap.** The caveat reads *"the transfer balance cap that limits how much capital may enter Retirement Phase is not modelled (P3-9) — no amount here has been checked against it"*. Under **R1** that sentence is no longer true in the way it says it: the cap **is** checked, and a breaching year is **refused** | Replace the caveat with the actual check and the named refusal. **The gating clause this cell used to carry — *"once O48's refusal module exists"* — is discharged 2026-09-15: the refusal is built and named, `TransferBalanceCapExceededError` in `src/core/transferBalanceAccount.ts`. A second clause is discharged 2026-09-16 by P3-9 chunk 3: the end-of-day check now exists, as `advanceTransferBalanceDay` in the same module. O57 stays OPEN on the ground that is left, and it is now a WIRING ground rather than a missing-check one:** nothing in `src/` calls the check, so no amount computed in `superPhase.ts` has been tested against any cap and the caveat's sentence is still literally true today. It was left standing rather than rewritten ahead of the call site. **CORRECTED 2026-09-16 by P3-9 chunk 6-4:** the caveat no longer says the P3-9 build has not happened — it now names what IS built (the personal cap, its indexation, the day history, the breach refusal and `UnknownPersonalTransferBalanceCapError`), keeps the superseded sentence once inside a dated correction note, and states the residue exactly: **nothing joins a stated Retirement Phase interest to a Person's transfer balance account**, so no figure `superPhase.ts` produces is put to any check. O57 stays OPEN on that WIRING ground alone, and its owner is the **P4-1 Waterfall walk**. **NARROWED, still on the wiring ground, 2026-09-16 by P3-9 chunk 5b-5:** the join now has a **function on the far side of it** — `creditTrisConversionUnderItem106` in `src/core/trisConversionCredit.ts` takes a ledger, a date of birth, the stream's stated Settings and the conversion-day value, and produces the s 294-25(1) item 2 credit on R13's day. So what is missing is no longer "a credit function to wire to" but the **two facts a caller must bring**: a Person's ledger, and the value of the supporting interest measured **on a day nothing in `src/` yet computes**. `trisInterestOrRefuse` holds neither and still discards the day; nothing under `src/` calls the new function at all, which `test/core-tris-conversion-credit.test.mjs` pins as a tripwire over the whole of `src/` — the O72 / P3-38 registered-and-unreachable pattern, recorded as a **finding** and not as coverage. When P4-1 makes the join, that tripwire is **rewritten rather than deleted**, and this cell stops saying that nothing joins a stated Retirement Phase interest to a transfer balance account. **Do not leave it saying "not modelled" once it is not.** **NARROWED IN PLACE, not closed, 2026-09-18 by P4-1b — part (A), the ledger join, is DEFERRED, and the ground is now REACHABILITY rather than wiring-not-yet-done.** Part (B) shipped at `1cc1376`: `src/core/forecastWindow.ts` names the window `project()` had always derived, and `transferBalanceAccountShape` takes it as a REQUIRED parameter, so conjunct 1 of `UnknownPersonalTransferBalanceCapError` is corroborated rather than believed. What is left of O57 is the join alone — and the reason the join is unbuilt is no longer that nobody has written it: **there is no reachable arithmetic behind it.** It is the `SUPER_CONTRIBUTION` shape, where nothing can construct the input, so the wiring would have no call site. Four blockers, each measured against the code on 2026-09-18: (i) **no entry type COMMENCES a pension** — `SuperInterest.phase` (`src/core/household.ts`) is a statically declared field, READ in `household.ts`’s means test and in `projection.ts`’s limb-2 predicate, its per-month pension gate and its pool naming, and WRITTEN nowhere in `src/`; no name in `ENTRY_TYPES` starts an income stream, so s 294-25(1) item 2 cannot fire inside a forecast at all. (ii) **No debit path can fire** — `recordCommutation` is the ledger’s only negative movement, `recordPensionPayment` is explicitly `movement: 0` (s 307-65(1)), and every limb-2 draw the walk makes is a pension payment: the ledger would be **inert for the whole walk**. (iii) **A pension commencing later in the window cannot be seeded** — `seedPersonalTransferBalanceCap` reads `generalTransferBalanceCap`, whose default CPI series ends at the **December 2025** quarter, so a start day in FY2027-28 or later raises `MissingIndexNumberError` (**O40**), and `project()` has no dated series to pass instead, because `Settings.economicSeries.cpi` is a flat rate and not a series. Only a commencement inside the published cap year, FY2026-27, can be seeded today, which is the first months of a walk and no more. (iv) **No input channel** — `project(settings, household, entries)` has no fourth parameter, `Person` carries `statedPriorRetirementPhase` (a declaration) but no account, and the `settingsByPerson` map holding §3.10.3’s seven is constructed in `test/` and nowhere under `src/`. **THE TWO CONDITIONS THAT CLOSE O57, so the next reader has a test and not a judgement:** (1) a production path under `src/` joins a stated Retirement Phase interest to a Person’s transfer balance account and puts a figure to the cap check — a caller, not a fixture; and (2) `superPhase.ts`’s `UNCAPPED_ENTRY` caveat stops saying that nothing joins them. Both, not either: one without the other is a half-made change, and this row has been on the wrong side of that before. **THE TRIGGERS THAT REOPEN THE BUILD DECISION** (a different question from what closes the item): a stream-commencing entry type coming into existence — a `COMMENCE_PENSION` beside the names `ENTRY_TYPES` already carries — or the app gaining real user input of an existing pension (**P7/P8**). Until one of those lands, a Person’s stated transfer balance history is a test-only fact and the cap check has no consumer; after either, the check acquires one and this row is a build item again rather than a deferral. (Were R1 ever reversed, the caveat would at minimum have to name the **15%-versus-0%** direction of the error) |
| O59 / U28 | **SISR reg 6.01(7) — the definition of "retirement" — was never retrieved** | **CLOSED 2026-09-29 (LR-2).** Retrieved: SISR reg 6.01(7), retrieved 2026-09-29 at `REG/19940057/6.01(7)`: *"For the purposes of Schedule 1, the retirement of a person is taken to occur: (a) in the case of a person who has reached a preservation age that is less than 60 - if: (i) an arrangement under which the member was gainfully employed has come to an end; and (ii) the trustee is reasonably satisfied that the person intends never to again become gainfully employed, either on a full-time or a part-time basis; or (b) in the case of a person who has attained the age of 60 - an arrangement under which the member was gainfully employed has come to an end, and either of the following circumstances apply: (i) the person attained that age on or before the ending of the employment; or (ii) the trustee is reasonably satisfied that the person intends never to again become gainfully employed, either on a full-time or a part-time basis."* So the employment ground (a cessation at or after 60) is item 101 under (b)(i); `retirementItemMapping` is primary-verified and `ConditionOfReleaseItemNotIdentifiedError` is deleted. The intention limbs, (a) and (b)(ii), are not mapped: the model holds no intention fact, and `CessationBeforePreservationAgeError` still refuses (b)(ii)'s window. No projection figure moved: nothing in the walk calls `schedule1ItemFor`. *Before closure:* s 307-80(3)(b) turns on **which Schedule 1 item** was satisfied, not on a boolean, and item 101 is "Retirement", whose content is in reg 6.01(7). The mapping from this model's `'ceasing gainful employment after Preservation Age'` ground to item 101 is therefore **`unverified`**. If the Person is not on item 101 they are not on the notification limb at all and item 106 answers the phase question by itself — so getting this wrong in the **60–64 window** either exempts fund earnings that are taxable or taxes earnings that are exempt, for as long as the Person is in that window. `conditionOfRelease.ts` already refuses the window where the register's wording and the SISR definition disagree (`CessationBeforePreservationAgeError`), and `ConditionOfReleaseItemNotIdentifiedError` — **BUILT** in the same module, §3.10.8 — refuses the mapping itself | Fetch `REG%2F19940057%2F6.01%287%29` — the `6.01(2)` form is confirmed working, so the same shape should serve. **R7 makes it urgent:** the entry test takes §D's **seven** inputs, four of which are absent from `src/core/superPhase.ts` today |
| O60 / U30 | **Mid-year ECPI apportionment — "ITAA 1997 s 295-390 has never been retrieved by any pass"** | **CLOSED 2026-09-10 by P3-25 → §3.11. Both of its premises were wrong.** (a) s 295-390 was retrievable on a prefix this project had confirmed on more than twenty sections, and had **already been retrieved** on 2026-09-04 (**O52**, **O70**). (b) *"s 295-385(3)(b) shows the segregated method needs an actuary's certificate"* is **half the provision**: s 295-385(4) with reg 295-385.01 gives a **certificate-free** segregated route for account-based pensions, and it is **s 295-390(4), the proportionate method, that always requires one**. **The answer it was opened for:** there is **no apportionment** — neither method splits a part-year, and the only express days formula in the Subdivision is **s 295-410, for RSAs** (T130). The conversion year is now computed at the **provable upper bound** under **R10**, disclosed by name, with `MidYearPhaseChangeError` narrowed rather than lifted or left standing | — (closed). **What remains is not this question:** **O69** (the SMSF/APRA discriminant, which gates shipping the R10 refusals), **U37** (the averaging convention), **U34** (the s 295-385(5) vacuous-truth reading) and the code changes of R10 steps 1–4 |
| O61 / U31 | **No source applies TR 2013/5's retrospective-cessation mechanism to a breach of the reg 6.01(2)(b)(ii) 10% MAXIMUM** | **Unresolved, and the existing §3.9 note is now wrong about it.** The ruling's reasoning at ¶¶96–101 runs through reg 1.06(1) / 1.06(9A), which contains **no maximum**; only ¶18's general words reach it, and **no example applies them**. If a 10% breach does **not** fall within ¶18 it is a preservation / payment-standards contravention with entirely different consequences, and §3.9's "the plan is infeasible" conclusion is wrong **in kind**, not in degree. **This supersedes the "not retrieved" half of the existing §3.9 note — that statement is now false, and the TR 2013/5 citation attached to the maximum is now wrong** | An ATO ID, private ruling, determination, or SMSF auditor contravention guidance addressing a TRIS that exceeded the 10% maximum |
| O63 / U27 | **The s 307-80(3)(b)(ii) notification has no prescribed form, deadline, content or evidentiary standard, and the SMSF member-trustee case is unaddressed** | **Unresolved.** The section says only "has not notified the \*superannuation income stream provider … of that fact" — **not** "in the approved form" (contrast ss 294-85(1)(b) and 294-90, which both say exactly that), no time limit, and nothing about notice given before the condition is satisfied or later disputed. **The notification day *is* the conversion day**, and it fixes (i) the day fund earnings go from 15% to 0%, (ii) the day and the amount of the s 294-25 item 2 credit, and (iii) the financial year whose general cap becomes the **permanent** personal cap. LCR 2016/9 Example 1B moves all three across a year boundary on a **fifteen-day** delay. For an SMSF the member and the provider are the same people, so if the notification is a minuted trustee resolution the member controls the date — a **planning lever, not a fact** | ATO guidance or a ruling on the form and evidencing of the notification, particularly for an SMSF. **Carried as a stated fact, not derived:** under **R5** the conversion day is a Setting, an absent one for a Person holding a TRIS must raise a **named refusal** and never a silent skip (silence is flattering on the cap side), and the provenance must say the day was **stated** |
| O64 / U29 | **Whether reg 6.01(2)(b)(ii)'s "unless" removes the 10% ceiling for the WHOLE financial year in which the condition is satisfied, or only from the day it is satisfied** | **Unresolved.** The provision limits "total payments … made in a financial year"; the "unless" describes a **state of the pensioner**, not a date. A member turning 65 in March could, on the whole-year reading, draw the entire balance in April; on the from-that-day reading, the July–February payments are still tested against 10%. The two readings differ by **up to the whole balance**, and the wrong one either declares a feasible plan infeasible or lets a forecast breach a limit whose breach is now known to kill the stream (O61) | The **Explanatory Statement to the 2005 regulation that inserted the TRIS definition** — the same document **O38** wants, so **one retrieval closes both** — or an ATO ruling. On legislation.gov.au, not the ATO database. **Not retrieved** |
| O65 / U16 | **The retire-then-turn-65 overlap in s 307-80(3)(b)(ii) — GENUINELY UNRESOLVED, and §B's and §D's readings are NOT consistent as written** | **Open, and deliberately not resolved here.** Paragraph (b) of s 307-80(3) is a **disjunction**. A member who satisfied item 101 (retirement) at 62, never notified the provider, and then turns 65 **still literally satisfies limb (b)(ii)** on its own terms — they *have satisfied* a condition in subparagraph (2)(c)(i)–(iii) and *have not notified* — so on the bare text s 307-80(3) keeps excluding the stream indefinitely, and turning 65 adds a **fourth** condition without un-satisfying it. §D's automatic-conversion finding rests on an **enumeration** argument that cannot reach this pattern, because here the operative limb is **engaged** rather than absent, and §D's four-case table does not contain the overlap. **Nothing in §D closes U16**, so O50's decision to code the ATO's reading stands on §B's reasoning alone. The ATO's contrary view (LCR 2016/9 ¶15's standalone bullet "*is 65 years old or older*", and the ¶30B example, which turns on age alone) is unqualified — but it is **not the statute** | The EM to *Treasury Laws Amendment (2017 Measures No. 2) Act 2017* (No. 55 of 2017) Sch 1 item 13, or a ruling addressing the overlap **directly** — LCR 2016/9 ¶15 does not, because it presents the two limbs as alternatives without saying what happens when **both** are engaged. **Neither retrieved.** *Consequences already recorded:* T117's fixture must state that no item 101, 102A or 103 was satisfied before the birthday; and the "conversion day derived vs stated" question cannot be settled toward "derived" without settling this first |
| U14 | **What the ATO actually shows a member, and under what labels** | **Unresolved, and it is the failure mode of R3's Settings block.** The seven fields must name things a user can find in ATO online services. "Highest ever balance" and "personal transfer balance cap" appear in LCR 2016/9's language, but **the ATO online screen was never retrieved** — the two consumer-facing paths tried both 404'd, which shows the path has moved, not that the page does not exist. If the prompt asks for something the user cannot locate they will type their **pension account balance**, the single wrongest number available, producing exactly the **unsigned, unbounded** error O42's refusal exists to prevent | Retrieve the ATO guidance page describing the transfer balance account view in ATO online services, or a help article naming the fields |
| U18 | **What the interest is worth on the conversion day when the fund has not yet allocated the year's earnings** | **Unresolved, and it is the SMSF case specifically.** An SMSF converting a TRIS on, say, 14 March must value the supporting interest **on that day**, which needs an interim revaluation of assets and an interim allocation of earnings — a trustee act that may happen after the fact. An APRA fund's unit price does it automatically. On $1,000,000 at 7% over eight months that is roughly **$47,000** of transfer balance, which is either inside or outside a cap | ATO guidance on interim valuation for transfer-balance-account purposes — an SMSFR, or the SMSF valuation guidelines. **Not retrieved** |
| U33 | **Whether the conversion year's Schedule 7 minimum is genuinely a FULL-YEAR minimum** | **Open, and it rests on the CONFINEMENT of three provisions rather than on any statement — no source says it.** The argument is cl 3's confinement to "the commencement day", cl 1(2)(a)(ii)'s confinement to "the year the pension commences", and TR 2013/5 ¶10's definition of commencement: a converting TRIS did not commence in the conversion year, so nothing proportions its minimum. **Same class of label as O37 and O38, and under R6 it must not be narrowed to `primary-verified`.** On a $500,000 balance the difference between a full-year and a part-year minimum in the conversion year is several thousand dollars of **forced** drawdown, and the minimum is a floor the plan must clear | An ATO worked example of a TRIS converting mid-year, or **O39's** commutation / rollover proportioning research pass — it touches the same clause |
| O66 | **DISCHARGED 2026-09-16 — all 41 in-scope transfer balance cap traps carry a §9 mutation row** | **Closed, and it closed smaller than the row was filed under.** Of T58–T125, **27 (T87–T113) are RECORDED-NOT-LIVE under R1 and are not to be tested at all**, leaving **41**. §9's *Transfer balance cap* subsection carries all 41: 7 from P3-9 chunk 6 / Battery E, 12 from batch 1 (T59–T64, T66–T70, T72, fourteen mutations), 12 from batch 2 (T74–T83, T85, T86, twenty-one mutations) and 10 from batch 3 (T114, T117–T125, seventeen mutations), every one applied to `src/`, built, run against the whole suite, counted and reverted, all on 2026-09-16. The original wording — *"§9 … cites none of T58–T125"* — was stale from the first batch. **A trap with no test is a comment**, and there is no such trap left: all 41 in-scope traps carry at least one §9 row, and the count is derived rather than asserted by `test/assumptions-register-o66.test.mjs`. **Two things this row does NOT close.** The 27 are **out of scope, not covered** — §9 carries an R1 EXCLUDED note saying so. And the **four untested ECPI traps T127, T128, T131 and T134**, which were carried here by reference, are **not** discharged with this row; §1's Exception 2 is where they now live, and it is derived from §9's Trap column | Nothing. The item is closed. If the ECPI four are to be scheduled they need an open item of their own — this one is not it |
| O69 | **§3.11 bites only for SMSFs, and nothing in the model distinguishes fund types** | **Open, and it GATES SHIPPING the R10 refusals.** For an APRA-regulated fund ECPI is invisible to the member: the fund computes it and the balance arrives net, so the 15% / 0% per-interest model is a *modelling convention* for such a member, not a description of what the fund does. **`SegregatedEcpiNotModelledError` and `EcpiMethodNotStatedError` (§3.11.9) would fire on households they cannot apply to.** **R10 does not settle this** — its **upper bound is conservative for either fund type**, so step 3 may be built ahead of it; its **refusals are unscoped and must not reach an APRA household** | An SMSF/APRA discriminant on the interest, or an explicit, recorded statement that all modelled super is SMSF. It is a scoping decision, not a retrieval |
| O70 | **Three shipped artefacts assert a cross-pass negative that was never checked** | **Open, and it is a PROCESS finding, not a legal one.** `src/core/superPhase.ts` (header comment **and** `MidYearPhaseChangeError`'s message, in capitals), `src/core/ttrPaymentRange.ts` (two places) and register §3.10 all said ITAA 1997 s 295-390 *"has never been retrieved by any pass"*. It had been, on **2026-09-04**, by the franking pass, and §10's own source index said so. The register half is corrected (§3.10, §3.11, O52, O60); **the two `src/` files still ship the false statement**, and a refusal that misstates its own grounds is worse than a refusal, because the next agent acts on the grounds and not on the register. Cost: six days and a blocked build limb, on a provision sitting in the source index the whole time | **The rule, and it is the closure: verify a cross-pass negative against §10 before writing it down, and NEVER assert one inside a refusal message.** A refusal may say what this pass did not do; it may not say what nobody has done. Then apply **R10 step 1** to both files — it is owed unconditionally, whatever else is decided |
| O71 / U36 | **Whether a s 295-385(9) election, once made, is recorded anywhere the tool could read** | **Open.** Subdivision 295-F prescribes **no** form, deadline, content, lodgment or retention rule for the election and involves the **Commissioner nowhere** — verified by searching the full retrieved text of all five core sections for *Commissioner*, *approved form* and *notify*: no hits (**an argument from absence across the retrieved Subdivision, labelled under R6, not `primary-verified`**). It is presumably a trustee minute, and possibly a field in the SMSF annual return. **Consequence, and it is why the item exists: a user-stated ECPI method cannot be validated against anything the tool can reach** — which is exactly why §3.11.8 makes it a Setting that is never defaulted | The SMSF annual return instructions, if a live URL can be found; or ATO guidance on evidencing the election. Neither retrieved (see O67) |
| U34 | **Whether s 295-385(5)'s "at all times during the income year" is satisfied VACUOUSLY** in a year where the fund had no retirement-phase liabilities for part of it | **Open, and load-bearing.** It gates the **certificate-free s 295-385(4) route in exactly the year it is needed** — the conversion year (**T131**) — and it is what makes fixture F4's segregated branch ($4,296.58) stand. Nothing retrieved contradicts the vacuous reading, and **s 295-390(7) uses the identical formulation**, but no authority was found either way. Recorded, not buried: an implementer who reads (5) as requiring RP liabilities to have existed all year denies the (4) route in the conversion year. **Related and separate:** *"actuary's certificate"* is **undefined** in the ITAA 1997 Dictionary — verified by searching the full s 995-1 document — so the Act prescribes no form, content or retention rule for the document the whole proportionate method rests on | An ATO ruling, PCG or guidance page addressing s 295-385(5) in a first-conversion year (**O67**), or the EM to No 10 of 2022 (**O68**) |
| U37 | **The averaging convention in ITAA 1997 s 295-390(3)** | **Open, and every hand-worked figure in §3.11.7 depends on it.** The provision says *"the average value **for the income year**"* and stops there: no daily, monthly or opening/closing rule anywhere in the Act or the Regulations, and **a regulation could have prescribed one and none exists** (checked against the complete `F2021L00206` compilation). **Daily time-weighting is actuarial convention, not law.** Two actuaries given identical fund data may certify different percentages, both correctly — which is precisely why §3.11.8 makes the exempt proportion a **Setting or the R10 bound**, never a computation the tool presents as certified. Every figure in §3.11.7 that depends on `199/365` inherits this label, F1's $7,569.86 included | An ATO PCG or guidance page on the averaging (**O67**), or an actuarial professional standard. **It cannot be closed by the Act — the Act does not say** |
| O72 | ~~**ITAA 1997 s 25-130 — the $1,000 standard deduction — reaches TAXABLE INCOME as well as WATO's base, and the taxable-income limb is still unwired**~~ — **CLOSED 2026-09-17 by P4-1 chunk 3** | **CLOSED.** What discharged it: **`taxableIncomeFromSalary` in `src/core/projection.ts`**, the `project()` assembly that computes a taxable income from an assessable income and a deduction set — `max(0, salary − (reducers + standardDeductionAmountFor(fy, salary, reducers)))`, per Person, per financial year, fed to `householdIncomeTax` and reported as an `Income tax, <name>` `MonthLine`. It **reuses `standardDeductionAmountFor`**, exactly as the disposition column of this row required, so the $1,000 remains written once in `S25130_MAXIMUM_DEDUCTION`; a source canary in `test/core-projection-tax.test.mjs` fails on a second literal in the walk. The **year gate is respected and is TESTED ACROSS BOTH YEARS**: the Div 25 limb applies from **FY2026-27** and the s 61-155(2) WATO-base limb from **FY2027-28**, and the fixture spans 2027-06 → 2027-07 so a single-year test cannot hide the gap. **The superseded wording is kept here once**: the row read *“Open, NARROWED IN PLACE 2026-09-15 by P3-38, and still the only open item in this table about the CURRENT year… WHAT SURVIVES, and it is the whole of this row now: the DIV 25 limb against taxable income. s 25-130 also reduces taxable income by the same amount, worth up to $1,000 × the marginal rate per working Person in FY2026-27, now — and there is nothing in `src/core` to wire it to. `taxableIncome()` is a bare boundary constructor over a number the caller already holds, `SaptoPerson.taxableIncome` is a required input, and nothing anywhere computes assessable income less deductions… Registered with no runtime consumer at `TAX.s25130.effectOnTaxableIncome`”*, and before that it read *“is enacted, applies from FY2026-27 and is registered nowhere”*. Both are false now. `taxableIncome()` is still a bare boundary constructor and `SaptoPerson.taxableIncome` is still a required input — what changed is that a caller **computes** the number it is handed. `TAX.s25130.effectOnTaxableIncome` is no longer a record with no runtime consumer and says so. **What is worth in FY2026-27, hand-worked and pinned:** a Person on $78,000 of salary pays **$320 a year less** — $300 of marginal rate on $1,000 plus $20 of Medicare levy. **No second O-item is opened.** Two residuals are recorded against P4-1 chunk 3 in TODO.md instead, because neither is about s 25-130: (i) taxable income is built from **salary alone**, so the assessable Age Pension and every other assessable amount are missing, which under-states tax and **flatters** the household — scope, not oversight, and each arrives with the chunk that computes it; (ii) income tax is **accrued monthly on the month’s own annualised salary**. ✅ **SETTLED 2026-09-18 BY P4-2**, which added the year-end true-up (`projection.ts` chunk 3b): a completed financial year is assessed once, on the salary actually received and the gain actually realised in it, and the difference is an `Income tax year-end true-up, <name>, <fy>` `MonthLine` — an inflow where the year was over-accrued, an outflow where it was under-accrued, landing in the following JULY, suppressed below a declared $1.00 de-minimis, and refused altogether for a first PARTIAL financial year the walk entered part-way through. ⚠️ **AND THE DIRECTION STATED IN THIS ROW WAS FALSE.** The superseded wording, kept once: *“which by the convexity of the rate scale **over-states** tax where income moves within a year”*. The rate scale is **not convex**: LITO’s second-stage taper withdraws 1.5c in the dollar and **ends at a taxable income of $66,667**, so the effective marginal rate falls there and the scale is locally **concave**, and the Medicare levy’s family shade-in flattens above the family threshold and is concave there too. A within-year movement across either point **UNDER-charges** the household: half a year at $45,000 and half at $78,000 is **$15.00 short** of the tax on the $61,500 year it averages to — $80 of bracket convexity against $95 of LITO concavity — and the family-levy concavity is worth **$633.30** on a `project()` fixture in `test/core-projection-true-up.test.mjs`, in the same month as an $8,161.10 refund to the other Person. Both are hand-worked there. What remains true: the s 25-130 limb runs the over-charging way in every case, and the residual is nil where a salary does not move within a year. **No new O-item is opened**; the true-up settles the residual and the corrected direction is recorded here and in TODO.md. Full finding at **§2.8.1 / §2.8.2** |
| O73 | **Whether offsets must be applied in ITAA 1997 s 63-10(1) order, and where the reg s 12 SAPTO transfer's tax-payable precondition sits relative to WATO** | **CLOSED 2026-09-15 — as a CORRECTION, not a confirmation** (`docs/research/p3-24-o73-offset-order.md`). **Limb 1:** the order **is** mandatory — s 63-10(1) "apply them … **in the order shown in the table**" is imperative, and what it governs is the identity of the leftover offset and hence its fate. `primary-verified`. **Limb 2:** this row previously said the ordering is *"not neutral"* for a SAPTO couple and that the reg s 12 precondition's placement relative to WATO was unsettled. **Both halves of that are withdrawn.** Reg s 12 fixes the transferred amount from the base rebate amount and the transferor's **taxable income**, not from the s 63-10 residual, so it is **order-blind**: WATO at item 3 cannot change a SAPTO couple's transfer or their final tax. §2.8.1's paragraph and `TAX.wato.applicationOrder.neutrality` are corrected to match. **The register's citation of reg s 12 was verified CORRECT** — F2025L01060 = *Income Tax Assessment (1936 Act) Regulations 2025*, s 12 = "Transfer of unused base rebate amount…" — so nobody need re-check it. **What survives, downgraded from blocker to a labelled inference in §2.6:** whether "tax payable … (disregarding any credits or rebates)" in s 12(1)(b) is gross of ITAA 1997 offsets. The gross reading is adopted, it is what the build already does for LITO, and it is worth **$0** while the couple base rebate amount stays under **$1,830** — canaried, not asserted | **Nothing. Closed.** The residual §2.6 inference is non-blocking and is tracked as TODO P3-40; the Explanatory Statement to F2025L01060 would settle it

| O74 | **The 1 July indexation of the Age Pension THRESHOLDS is specified only half way** | **Open, and opened by P4-1c, which had to index them to compute a forward year.** §4.1 names the date and the index for all three — income free area **1 July, CPI, March quarter**; assets free areas **1 July, CPI, December quarter**; deeming thresholds **1 July, CPI** — so nothing here is invented. **Three things are genuinely absent.** (a) **No reference quarter for the deeming thresholds.** §4.1 and §4.5 both stop at "CPI". `indexMeansTestParameters` puts them on the **December** limb with the assets free areas, and says in its own doc comment that this is a judgment call and not law. (b) **No indexation rule at all for the extra allowable amount** (T26's non-homeowner differential), which §4.4 carries as a dated config figure and §4.1's table does not list. It is indexed on the December limb, because T26's whole point is that it is the assets free areas' offset and a second series would drift. (c) **No ROUNDING rule for any of them.** The published figures move in steps — $2 a fortnight for the income free area, $500 for the assets free areas, $200 for the deeming thresholds — and §4.7's pseudocode is a bare multiplication. The step is **not modelled**; the indexed figure is **floored to the cent**, which is the direction that does not flatter the household, and the residual is at most one cent per parameter per year. **⚠️ THE THREE STEPS ARE A RECORD FROM 2026-09-21 (P4-18), AND THIS ROW STAYS OPEN.** `AGE_PENSION.indexation.publishedRoundingSteps` carries $2 / $500 / $200 as data instead of as three numbers inside a doc comment — but promoting a figure is not applying it: `indexMeansTestParameters` still floors to the cent and still does not step, so (c) is unchanged as a gap. **The record is stamped `unverified`, not `secondary-only`**, because the primary source that would settle it — SSA 1991 s 1191's indexation table and its **rounding base** column — could not be reached (the Federal Register serves the Act only as whole compilation volumes, and AustLII and the DSS Guide both refuse automated retrieval), and no secondary source was consulted either. **What CAN be computed is asserted instead**, from this file's own published parameter sets: every published movement is a whole multiple of its step, and for the **assets free areas** and the **deeming thresholds** the step IS the greatest common divisor of those movements. ⚠️ **For the income free area it is NOT: the gcd is 8, not 2** — a $2 step is consistent with that and so are three other step sizes — and `test/assumptions-age-pension.test.mjs` asserts the **inequality** deliberately, so that anyone quietly upgrading the record's confidence fails a test. Closing this row still means reading s 1191, not relabelling the record. **What this row does NOT cover, because the register covers it: the deeming RATES.** O2 and T30 say they have no formula and no index, and `MissingDeemingRatesError` already refuses them — P4-1c indexes nothing there and must not | The DVA indexation ready reckoner's own wording on the deeming-threshold reference quarter, and either a rounding rule in SSA 1991 s 1198 / the Guide or a decision that the step is not modelled. **Until then the three choices above are recorded as choices** |
| O75 | **The Work Bonus figures are registered with no indexation rule whatever** | **Open, and it is the one Age Pension parameter P4-1c indexes by NOTHING.** §4.6 gives $4,000 starting balance, $300 a fortnight accrual and an $11,800 maximum, all marked `config` and `primary-verified`, and neither §4.6 nor §4.1's indexation table says whether any of them moves. So they do not: over a forty-eight year walk they stay nominal. **That is conservative and it is not free.** A frozen Work Bonus excludes a shrinking real amount of employment income, so more income is assessed, so the entitlement is lower — the error runs **against** the household, which is the required direction for an unsourced choice. But it is a **nominal freeze**, which is the exact thing this item refused to do to the payment rates, and it is recorded here rather than hidden | A DVA or Services Australia statement on whether the Work Bonus balance and accrual are indexed. If they are, they belong on the same Setting as the rest (O5) and not on a constant |
| O76 | **Centrelink's treatment of salary sacrifice is recorded NOWHERE in this register, and a ruling is standing in for it** | **Open, and it is the gap R14 was taken in.** §4.3 tabulates the free areas and the taper and never states what counts as income for SS Act 1991 s 8(1); no section of §4 mentions salary sacrifice, reportable employer superannuation contributions or employer-provided benefits at all. P6-8 brief 2 had to answer the question to walk a `SUPER_CONTRIBUTION`, and **§4.3.1 R14 (2026-09-19) rules that the income test assesses the GROSS salary** — in the absence of a source, not against one, `unverified`, on the two grounds recorded there. **Direction of the error while this is open: AGAINST the Household.** Gross assesses more income, so more pension is taken off under the taper, so this build understates the Age Pension of anyone who sacrifices and can never flatter one. **The specific risk of leaving it open is not that the answer is wrong — it is that R14 is read as authority.** It is a placeholder with a rationale, and a sourced provision supersedes it on the day it lands, in whichever direction it runs | Read SS Act 1991 s 8(1) (the `income` definition, and the employer-provided-benefit limbs) together with the Guide to Social Security Law 4.3 chapters, and write the rule into §4.3 as a sourced row. Then R14 is retired on its own stated ground — *the absence of a provision* — whatever the provision says |
| O77 | **ONE UNDERSTATING gap a walked `SUPER_CONTRIBUTION` carries, on the user-facing notice — and it was THREE until 2026-09-20** | **Open, accepted, and on screen.** `SUPER_CONTRIBUTION` became an OFFERED entry type on 2026-09-20 (P6-8 brief 2 chunk 5) with three gaps still in it, and **two of the three closed the same day** — (i) by brief 3's chunks 1–2b and its final chunk, and (ii) by P6-9 chunk 3. **THE NUMBERING IS NEVER REUSED: a closed limb keeps its numeral and is struck in place**, which is what went wrong when (ii) was briefly renumbered to (i) on the day it closed. Every gap here makes the Household look **worse** than it is except the one that is marked — and since 2026-09-20 that one is closed, so every gap LISTED HERE is conservative — which is not the same as the feature being free of a flattering gap, because the residual O84 is one (P6-9 chunk 4). **~~(i) The Superannuation Guarantee is not contributed by the walk~~ — CLOSED 2026-09-20.** `superContributions.ts` reached no part of `project()` and an employed Person's super grew by their sacrifice and by earnings and by nothing else. It is now computed from SGAA s 10A(1) qualifying earnings, credited net of the fund's 15% to a destination the plan states or derives (O82), and **counted towards the general concessional cap** together with the sacrifice. The sentence *"the Superannuation Guarantee is not contributed by the walk"* is kept here, struck through, because this row's count is what the canary in `test/core-projection-tax.test.mjs` reads. **~~(ii) Division 293's second 15% is not charged~~ — CLOSED 2026-09-20 (P6-9 chunk 3).** §3.6's machinery existed and no walk called it, so a Person over the $250,000 threshold was taxed at 15% on concessional contributions where the law charges 30% — the exception in DIRECTION and the only flattering gap this feature had. It is charged now: a monthly `Division 293 tax, <name>` line on 15% of the lesser of the low tax contributions and the excess over the threshold, trued up when the walk leaves the year, out of the Person's own cash. The struck sentence is kept because this row's count is what the canary in `test/core-projection-tax.test.mjs` reads. What is left of it is **O84**, which is about which POCKET pays and not about whether the tax is charged. **(iii) An amount stated above the pay packet is silently capped at the pay** — `Math.min(gross, stated)`, so a $40,000 arrangement against $30,000 of wages sacrifices $30,000, the excess reaches neither the pay packet nor the fund, and nothing in the month distinguishes it from a $30,000 arrangement. From the final chunk of brief 3 it also makes the cap check weaker, since the cap is measured on the amount actually contributed. **The direction, stated honestly rather than as a blanket:** the one gap left understates the Household's superannuation and therefore its wealth. ~~**(ii) understates the TAX and so OVERSTATES the Household**, and it is the one gap here that flatters.~~ **That sentence was true until 2026-09-20 and is struck. ~~no gap in this feature now flatters the Household~~ — THAT replacement was itself too broad and is struck in turn (P6-9 chunk 4): no gap LISTED IN THIS ROW flatters the Household, but the residual O84 — which POCKET pays the Division 293 charge — DOES flatter, through the §4.8 younger-partner exemption, and O84's own row states that direction and its bound.** The claim is kept, struck, because a reader who remembers the old row must be able to see that it was retired rather than lost | ~~(ii) needs Div 293 wired into the walk against the year's concessional contributions — the module is built and the caller is missing, and it is the next brief.~~ Done 2026-09-20. (iii) needs a decision, not research: either refuse an arrangement larger than the pay by name, or report the capping in the month it happens. It stays on the form's notice until then |
| O78 | **~~Carry-forward is not run~~, so a Person with LAWFUL headroom above the general cap is OVER-refused — NARROWED 2026-09-30 (P3-4b slice 1): carry-forward IS run, and the over-refusal is now confined to unused cap from years before the plan that the plan does not state** | **Open, narrowed, and still the one gap in this cluster that runs AGAINST the user rather than for them.** *Since P3-4b slice 1 the walk computes each Person's total cap every year (§3.4, "How the walk runs it"), both cap checks measure against it, and `Person.statedUnusedConcessionalCap` takes the unused amounts myGov shows for the five years before the plan. What remains of this row is the conservative default: a year before the plan that is not stated, and the plan's own first year when it opens after 1 July, count as FULLY USED. The text below is the row as opened, kept for the record.* `ExcessConcessionalContributionsNotModelledError` (§3.1.1) measures a stated sacrifice against the **general** cap for the year alone. ITAA 1997 s 291-20(4) gives an unused-cap carry-forward across five years to a Person whose Total Super Balance was under $500,000 on the preceding 30 June, and `applyConcessional` in `src/core/superConcessional.ts` implements it — **and no walk calls it.** So a Person with $60,000 of genuine headroom who states $40,000 has their plan refused, and the refusal is wrong about them. **Why it is accepted rather than fixed: the input does not exist.** Carry-forward is a function of the Person's contribution HISTORY — what they actually contributed in each of the five preceding years — and the plan file has **no field for it** (§11), nor does `Household`. There is nothing to compute from. Inventing a history would be worse than the over-refusal: it would move real money on a fabricated fact, where this merely refuses to forecast. **Direction: conservative.** An over-refusal forecasts nothing at all; an under-refusal would forecast a tax bill that is too low | **Built 2026-09-30 in the form of the stated UNUSED amount per year (what myGov shows), not the contributions, and the 30 June balance is the walk's own.** The input boxes, the first-year 30 June balance (`Person.statedTotalSuperBalanceAt30June`, blank = the first year closed) and the offered catch-up entry followed the same day (P3-4b slice 2). As opened: a plan-file field for per-Person prior-year concessional contributions (and the 30 June Total Super Balance the s 291-20(3) gate tests), then `applyConcessional` is called with it and the refusal narrows to the amount that is over the **available** cap. Nothing legal is missing — §3.4 already carries the machinery |
| O79 | **The general concessional contributions cap has exactly ONE computable year, and the base amount is what saves the other forty-seven** | ✅ **CLOSED 2026-09-21 — EVERY YEAR IS NOW COMPUTABLE, and this row's whole premise is superseded.** The ATO's Table 40 December-quarter AWOTE level for **Dec 2025 (2,051.10)** is now a stamped record (`awoteLatestPublishedQuarterIndexNumber`, `primary-verified`, retrieved 2026-09-21, verified independently against ato.gov.au), and every quarter after it is grown from `Settings.economicSeries.awote` and stamped **`unverified`**, so every cap derived from it says so where it is used. FY2026-27 still reproduces **$32,500 exactly** at every rate a user can type, because the published quarter is the anchor and no rate can move it — `PublishedCapMismatchError` cross-checks it on every call. **The over-refusal described below is GONE**: the measured cost was **$15,000 / $20,000 / $22,500** of headroom per person in FY2035-36 at 2.5 / 3.5 / 4.5% (indexing off the quarter ending 2034-12-31 — **nine** compoundings from the anchor, not ten). ⚠️ **This was taken as a user ruling and it runs in the FLATTERING direction** — larger caps, fewer refusals — on the ground that a cap frozen at the base for forty years was **not cautious but wrong**. ⚠️ **`MissingIndexNumberError` is now unreachable from `project()` for this cap**; the guard is kept because `superGuarantee`/`maximumContributionsBaseFor` are public, and a year BEFORE the anchor still raises it rather than compounding backwards over quarters the ABS has already published. **Superseded text follows.** ~~Open, and it is the concessional twin of O40 — which this document did not have until now.~~ §3.1 publishes $32,500 for **FY2026-27** and no other year; the cap is indexed to AWOTE in $2,500 steps (§3.2, s 960-285), AWOTE is a forward series this register does not hold (**O5**, which names *wage-growth* and never names AWOTE in terms), so **every year from FY2027-28 on is unknowable from the register alone** and `concessionalContributionsCap` raises `MissingIndexNumberError` for it. **What stops that being fatal is s 960-285(4): the base amount is a FLOOR.** Indexation never produces a figure below the $25,000 base, because a factor of 1 or less leaves the base standing. So *within* $25,000 the answer is known for **every** year without any index number — the cap cannot be lower than that — and `refuseConcessionalContributionsOverGeneralCap` answers from the floor and never asks for an index. Above $25,000 in an unpublished year it refuses by name rather than measuring the amount against some other year's figure. **⚠️ AND FROM 2026-09-20 IT IS THE TOTAL THAT CROSSES THE FLOOR, WHICH MOVED THE BOUNDARY FOR EVERY SALARIED PERSON** (P6-8 brief 3, final chunk): the amount tested is the sacrifice PLUS 12% of the salary, so the room left in an unpublishable year is $25,000 less the Guarantee — $15,328 for a $80,600 salary, $13,600 for a $95,000 one, $0 for a salary of $208,334 or more. **An arrangement that walked before that date can refuse after it**, by name, and that is a behaviour change with a reason rather than a defect. **The consequence a user meets:** a sacrifice whose total is over $25,000 dated FY2027-28 or later cannot be forecast at all, even though the real cap is certainly higher than $25,000 and probably $35,000. That is an over-refusal in the O78 family and it is the same trade — refuse rather than guess. **The consequence a TEST author meets, recorded because it constrains every fixture:** a mid-year-sacrifice fixture in FY2027-28 must keep the sacrifice AND the Guarantee inside $25,000 together, so the straddles it can build are modest ones — four fixtures were re-derived on 2026-09-20 for exactly this | The ATO's published concessional cap for FY2027-28, or the AWOTE December-quarter number the year indexes to, written into §3.1 with the same *derived, not copied* discipline as the general Transfer Balance Cap. Until then the floor is doing the whole job and should not be removed — without it, seven pre-existing fixtures go red, every one of them a sacrifice dated in FY2027-28 |
| O80 | **The Rebate Income add-back's `excessConcessionalContributions: nil` is UNREACHABLE, not RIGHT — and it goes live again the day Div 291 lands** | **Open, and deliberately kept in the code.** §2.3's Rebate Income adds back *reportable superannuation contributions*, and ITAA 1997 s 995-1(1) EXCLUDES from that figure any amount that is **excess concessional contributions** — so a Person over the cap must not have the whole sacrifice added back. `reportableSuperannuationContributions` takes that limb and P6-8 brief 2 chunk 2 passes **nil** into it, on the ground that this build does not compute the excess. From chunk 5 (2026-09-20) **no over-cap sacrifice reaches the call at all** — it is refused first (§3.1.1) — so the nil is now unreachable rather than wrong. **It was not deleted, and deleting it is the mistake this row exists to prevent.** The day Division 291 is modelled the refusal lifts, over-cap contributions start reaching Rebate Income, and the nil becomes **live and false** in the same commit — with no test failing, because nothing can currently drive the argument off nil. **Direction, when it goes live: it would OVERSTATE Rebate Income**, which understates SAPTO and overstates tax — against the Household, but wrong, and wrong in a way that only bites Persons already over the cap | Div 291 modelled, and the excess figure threaded into this argument in the SAME change that lifts the refusal. Whoever lifts the refusal owns this line; §3.1.1's row and `src/core/projection.ts`'s comment both say so |
| O81 | **The contribution target's PHASE is checked at the DOOR only — the walk never re-checks it** | **Open, and the shape is this project's recurring one: a guard in the layer above, relied on by the layer below.** A retirement-phase income stream is closed to contributions and this build cannot open the accumulation interest a real fund would, so `checkContributionTargets` in `src/core/parsePlan.ts` refuses a `SUPER_CONTRIBUTION` naming one (`PlanFileEntryError`, P6-8 brief 2 chunk 5). **`project()` does not repeat the check.** A caller that builds a `Household` and an entry list in memory and walks them — which every test in `test/` does, and which nothing forbids — credits a contribution into a retirement-phase interest with no complaint. **A second, narrower hole of the same kind: the phase is checked when the plan is LOADED, and an interest's phase can change DURING the walk** (a condition of release, a TRIS converting at 65 — §3.9, §3.10). A sacrifice that was legal in its first month can be pointed at a retirement-phase interest by month forty, and nothing looks. **PARTLY DISCHARGED ON 2026-09-20 (P6-8 brief 3, chunk 2b), FOR THE GUARANTEE ONLY.** The employer Superannuation Guarantee's destination IS phase-checked in the WALK: `superGuaranteeDestination` in `src/core/projection.ts` resolves only an accumulation interest, refuses a destination stated on a retirement-phase one by name, and refuses a salaried Person who holds no accumulation interest at all. It runs every month, so the mid-walk conversion half is closed for that credit too. **The SACRIFICE target is unchanged and this row stands for it**: `project()` still credits a stated `SUPER_CONTRIBUTION` into whatever interest it names. **Direction: it OVERSTATES the Household** — money lands in an interest that could not have received it, and in the exempt-earnings phase at that. No fixture in the suite does it, and no plan file can; the exposure is a future caller's | Either re-check the target's phase in the walk, at the month of the credit, and raise a named refusal there; or state in terms that `project()` trusts `parsePlan` and give the trust a test. The second is cheaper and is a decision, not research — but it does not close the mid-walk conversion half, which needs the check to be in the walk |
| O82 | **The Superannuation Guarantee's DESTINATION is derivable from the plan file from 2026-09-20 — and it is still UNDETERMINED for a Person who holds two accumulation interests and has nominated neither** | **Open, and it is what is LEFT of the destination problem after P6-8 brief 3 chunk 2a (user ruling, 2026-09-20).** The Guarantee must land in a NAMED account, and until this chunk nothing in the model marked one: `SuperInterest` carried `phase`, `balance` and the per-stream settings, all silent on which fund an employer pays into. *"The one with the larger balance"* was available and was refused as what it is — a guess wearing the costume of a derivation. **What landed:** `SuperInterest.statedEmployerContributionDestination`, an OPTIONAL per-interest member whose one value names the kind of employer money the interest receives (`'superannuationGuarantee'`; there is no other kind in this build, and any other value is refused against that one). **So the destination is derivable in three of the four cases.** (1) A Person with exactly ONE accumulation interest and nothing stated — the ordinary case, every plan file written before this date, every fixture in `test/` — resolves to that interest with nothing guessed. (2) A Person with NO accumulation interest has no destination and that is a fact about the Household. (3) A Person who NOMINATES one is taken at their word, including where the nomination is redundant. **(4) A Person with TWO OR MORE accumulation interests and no nomination is the residue, and it is deliberately not refused at the door**: their file is well formed, predates the field, and answers a question its author was never put. Refusing it would reject every such plan on every disk for an absence nobody could have avoided — the over-refusal this register keeps having to record (O78). **Two things ARE refused at the door, by name (`PlanFileHouseholdError`, `checkEmployerContributionDestinations` in `src/core/parsePlan.ts`):** a destination stated on a retirement-phase interest, on exactly the ground O81's row states — a stream closed to contributions, and no path in this build that opens the accumulation interest a real fund would — and TWO interests of one Person both claiming it, because a Person has one fund their employer pays into or none, and the alternative to refusing is this build choosing one. **AND THE WALK READS IT FROM 2026-09-20 (chunk 2b).** The Guarantee is credited to the resolved interest, net of the fund's 15%, through the same `contributionsTax` the salary sacrifice goes through; `concessionalContributions` names it in its `employerContributions` limb; the `Month` note reports the month's credit and which interest received it. **Case (4) is REFUSED BY NAME IN THE WALK** (`superGuaranteeDestination`, `src/core/projection.ts`) with a message that names the field and the value to state, and so is a fifth case chunk 2a did not enumerate: **a Person who is PAID and holds NO accumulation interest at all** — the Guarantee must land in a named account, this build will not invent one, and crediting nothing would be the P4-12 silent no-op at 12% of a salary a month. **Direction: nothing is understated by this residue any more, because there is no residue left to understate — it is refused by name in the walk instead.** An undetermined destination was a silent understatement while nothing was credited; from chunk 2b it stops the walk with a message naming the fix, which is the OVER-refusal direction and is recorded as such: a Household whose plan file predates the field, and whose author holds two accumulation accounts, cannot be forecast until they name one. The one direction this must never take is a destination this build GUESSED, which is what the refusals exist to make unreachable. **AND THE CAP SEES IT FROM THE FINAL CHUNK OF BRIEF 3 (2026-09-20).** The sentence here read *"what is still understated after chunk 2b is the CAP, not the destination: `refuseStatedContributionOverGeneralCap` measures a stated sacrifice alone and never the sacrifice plus the Guarantee"*, and that is now false: the credited figure is a limb of the total measured against the year's general cap (§3.1.1) | Close the residue for good by letting a Person with two accumulation interests nominate one **in the form** — `SuperInterestFormValues` still has no control for it, so today the field is reachable by hand-editing `plan.json` alone, and the walk's refusal is the only thing that tells them |
| O83 | **ITAA 1997 s 293-25(b) — the excess concessional contributions subtraction is UNREACHABLE from `project()`** | **Open, recorded, and KEPT IN CODE — not deleted (P6-9 chunk 2, 2026-09-20).** The walk builds a `LowTaxContributions` for every Person who states a salary sacrifice, out of the same `ConcessionalContributionComponents` the cap check reads — and it passes a **nil excess**, because `refuseConcessionalContributionsOverGeneralCap` has already thrown `ExcessConcessionalContributionsNotModelledError` (or `MissingIndexNumberError` in a year with no derivable cap) for any Household whose total exceeds the year's general cap, **before any `Month` is returned**. The nil is exact rather than conservative: s 291-20 measures the excess against the TOTAL cap, which is the general cap plus any carry-forward increase and so never smaller. **Direction: with the excess necessarily nil the low tax contributions equal the low tax contributed amounts exactly, so the unreachability neither understates nor overstates the figure by a cent — it removes a subtraction that has nothing to subtract.** What it does is hold the figure at its **maximum**: the subtraction only ever runs downward, so a build that dropped the branch as dead code would, the day Division 291's excess treatment is modelled and the refusal is lifted, charge the second 15% on the very dollars s 293-10 exempts. The branch is therefore kept, exercised directly by `div293.ts`'s own unit tests (`test/core-div293-low-tax-contributions.test.mjs`) and canaried there together with this row — the same ground on which P6-8 brief 2 chunk 5 kept chunk 2's unreachable Rebate Income residual | Modelling Division 291's excess treatment (TODO P6-9 and beyond), which is what lifts the refusal and makes the branch live. Nothing to fetch — this is a fact about which of two modules refuses first, not a gap in the law |
| O84 | **ITAA 1997 Subdivision 293-B — the election to have the Division 293 charge RELEASED FROM THE FUND ~~is not modelled~~ IS PERFORMED from 2026-09-20 (P6-10), and what is left of the gap is THREE NAMED RESIDUALS** | **NARROWED, NOT CLOSED — P6-10, 2026-09-20: M1 the field, M2 the resolver, M3 the money, M4 this row.** ~~Open, accepted, and named on every line and every screen that mentions the charge (P6-9 chunk 3, 2026-09-20).~~ The charge is taken from the INDIVIDUAL, out of the same cash the salary arrives in, which is the statutory default: the ATO assesses the Person and the Person pays. Subdiv 293-B lets them instead give the Commissioner a release authority so the amount comes out of a superannuation interest. ~~This build holds no field for that election and does not offer it, so it always takes the first route.~~ **SUPERSEDED, and the whole of P6-10 is inside that strike.** `SuperInterest.statedReleaseAuthorityDestination` carries the election (M1); `division293ReleaseDestination` resolves it or reports `{ election: 'none' }`, and NEVER derives one from silence (M2); and at the year-end settlement — once a year, and nowhere else — the whole year's cash accrual is refunded to the Person and the whole assessed liability is debited to the one interest they nominated (M3). ⚠️ **THE DIRECTION ARGUMENT THAT FOLLOWS IS UNCHANGED AND NOT STRUCK, because it is now the direction OF THE RESIDUALS BELOW** — the same error, in a smaller population. **The direction, which is not nil, is not a wealth error in the month the charge is made — and which FLATTERS. CORRECTED BY P6-9 CHUNK 4 (2026-09-20), having been stated BACKWARDS when this row was opened earlier the same day.** A Person who would have elected release ends the month of the charge with the SAME total wealth, split differently: MORE superannuation and LESS cash than the law would leave them, by the cents of every charge. The split is not neutral for the means test — an accumulation interest held by a Person below Age Pension age is EXEMPT from BOTH means tests (§4.8, the younger-partner exemption) while cash in the Offset Account is assessed and deemed from the first dollar — so **this build assesses a released-election Person on FEWER assets than they would really hold, which OVER-states their Age Pension**. The superseded sentence is kept, struck, so that a reader who remembers the old row can see it was retired rather than lost: ~~so this build assesses a released-election Person on MORE assets than they would really hold, which UNDER-states their Age Pension. That is the conservative direction~~ — which is the exemption read backwards, and it was wrong from the moment it was written. The error falls to NIL at and above the charged Person's own Age Pension age, where both pools are assessed and deemed alike; it is largest in the §4.8 case, a Person below Age Pension age paying Division 293 while their older partner draws the payment. **And the split stops being wealth-neutral the month after it is made, the same way.** This build grows the Non-Super Portfolio and each superannuation interest and does NOT grow Offset cash, so at a positive `nominalReturn` the superannuation this build leaves standing compounds where the cash it took would not have: total wealth runs HIGH thereafter too. Both limbs run the same way and neither is conservative.  **THE THREE RESIDUALS, EACH WITH ITS DIRECTION, AND ~~TWO OF THE THREE FLATTER~~ ONE OF THE THREE FLATTERS — IT WAS TWO UNTIL 2026-09-20, WHEN (iii) WAS CLOSED BY A CONTROL ON THE HOUSEHOLD FORM (P6-11).** **(i) THE PARTIAL FINANCIAL YEAR — FLATTERS.** A walk's first or last financial year never reaches a settlement at all, because the true-up needs all twelve of the year's months, so an electing Person's accrual in such a year is never refunded and never released: it silently stands as the cash default they did not choose. That is this row's original error in miniature and in this row's own direction, bounded by one year's charge at each end of the walk. **(ii) THE TIMING — CONSERVATIVE.** The release is taken at the JULY settlement, where a real one follows the Commissioner's Division 293 assessment notice and the release authority given on the back of it, months later. So this build takes the money out of the fund EARLIER than it really goes and denies the fund those months' compounding — bounded by one year's charge times a fraction of a year's return (under 3.3% of one year's Division 293 tax at 6.5% nominal over a six-month lag), and it runs the Household's way in no respect. **~~(iii) THE ELECTION MUST BE STATED, AND NO SCREEN OFFERS IT — FLATTERS.~~ (iii) THE ELECTION MUST BE STATED, AND A SCREEN OFFERS IT FROM 2026-09-20 — CLOSED (P6-11).** A Person who would elect in life but has not marked an interest gets the cash default. **In the ENGINE that is correct and is not a gap**: silence is a DECLINED election — s 293-65 makes the individual liable and Subdiv 293-B is a thing they may choose to do — and deriving an interest out of silence would re-open this row in the opposite direction, moving the charge out of super for a Person who really pays it in cash. ~~**In the PRODUCT it is a gap**, because the election can be stated only by hand-editing `plan.json`: `planWithStatedPosition` carries the key through a rebuild, but no form box anywhere sets it, so a user of the app alone cannot reach the treatment they chose in life and their forecast flatters them in exactly the way this row describes.~~ **CLOSED 2026-09-20 (P6-11), and the struck sentence is kept because it was true for as long as the field had no control.** The household form states the election: **one single-choice `<select>` per Person** in `src/app/settingsPanel.ts` (`electionRow`), whose options are that Person's ACCUMULATION interests and an explicit *"No election — the Division 293 charge is paid out of this person's own cash"*. **The two shapes this register refuses are UNCONSTRUCTABLE rather than validated**: one control per Person holds one value, so two marked interests cannot be written down, and `electableSuperInterests` never offers a retirement-phase interest, so the commutation `checkReleaseAuthorityDestinations` refuses cannot be chosen — both door refusals are kept and are proved still live by positive controls in `test/app-settings-panel.test.mjs`, because an unreachable refusal is not a refusal that has gone away. **NOTHING IS PRE-SELECTED AND NOTHING IS DERIVED**: a Person with exactly one accumulation interest and no election opens on "no election", because presence IS the election and silence is a DECLINED one — the engine's rule is untouched, which is the whole of why this was a residual of the SURFACE and not of the walk. `planWithStatedPosition` writes the key from that control and NO LONGER carries it through by interest position: two writers of one fact would mean a cleared election left the charge coming out of the fund anyway, so clearing REMOVES the key rather than writing an undefined-valued one. It was recorded here rather than only on the screen that lacked it, because a gap named only on its own screen is a gap nobody adds up — and it is closed here for the same reason. ~~⚠️ **THIS IS THE ONE OPEN GAP IN THE SUPERANNUATION-CONTRIBUTION FEATURE THAT FLATTERS THE HOUSEHOLD**, and it is bounded rather than blanket: it bites only on a Person who WOULD make the election~~ — **struck because its SUBJECT is gone: the election itself is modelled, and only the residuals are left to flatter.** ⚠️ **WHAT IS LEFT OF THIS ROW IS STILL THE ONE OPEN GAP IN THE SUPERANNUATION-CONTRIBUTION FEATURE THAT FLATTERS THE HOUSEHOLD** — ~~residuals (i) and (iii) above~~ **residual (i) ALONE from 2026-09-20 (P6-11), the partial financial year, (iii) having been closed by the control described above**, and nothing else in the feature runs the Household's way. It is narrower than it was and it is still bounded rather than blanket: it bites only on a Person who WOULD make the election, and for the statutory default — which is what this build still does, and does correctly — the error is nil. **Not a refusal, because the default is a real and correct treatment**, unlike a figure this model cannot compute: refusing every high earner would be an over-refusal of the kind this register keeps having to record | ~~Needs a field on the Person (or on the entry) stating the election, and a release path that debits the named interest instead of cash — at which point the charge becomes a second consumer of `superLumpSum.ts`'s refusals, since a release is a payment out of a fund.~~ **DONE by P6-10 — except the last clause, which was WRONG and is struck with the rest**: a release authority pays the COMMISSIONER and is not a member benefit, so `superLumpSum.ts` is not a consumer of it (M3), and the retirement-phase case that clause was reaching for is refused one layer earlier by M2's resolver, because a release out of a stream is a COMMUTATION. **What would close the three residuals, in the order they are worth doing:** ~~(iii) a form control for the election, which is the only one of the three an ordinary user can hit today~~ — **DONE 2026-09-20 (P6-11), `settingsPanel.ts`'s `electionRow`, and the instruction is struck rather than deleted so that a reader can see it was discharged;** (i) a settlement for a partial financial year, or an explicit refusal of an electing Person whose walk starts or ends mid-year; (ii) the Commissioner's notice lag, which needs a timing rule this build does not hold and is conservative until it does. ~~Until then the limitation is named in the note's `determination`, in `SUPER_GUARANTEE_CREDITED`, and in the two user-facing notices~~ — **all four of those now say the election IS performed, and name residual (iii) in its place (M4)** |

**THE SUPERANNUATION-CONTRIBUTION FEATURE'S OPEN GAPS AND THE DIRECTION OF EACH — P6-9 chunk 4, 2026-09-20.** Stated in one place because a direction scattered across nine rows is a direction nobody adds up. **O76/R14** the income test assesses GROSS in the absence of a source — AGAINST the Household. **O77(iii)** an amount stated above the pay is capped at the pay — CONSERVATIVE. **O78** carry-forward is not run — AGAINST the user, as an over-refusal rather than a figure. **O79** ✅ **CLOSED 2026-09-21 — every year is now computable**, indexed from the stamped Dec-2025 AWOTE level and the user's own wage figure, each derived year stamped `unverified`. ⚠️ **This is the ONE item in this roll-up that moved in the FLATTERING direction**, taken as a ruling because the frozen base was wrong rather than cautious. ~~only FY2026-27's general cap is computable and the $25,000 base amount floors every other year — refused by name above it.~~ **O80** the Rebate Income nil add-back — UNREACHABLE today, live and false the day Div 291 lands. **O81** the contribution target's phase is checked at the door only — OVERSTATES, and reachable by an in-memory caller alone. **O82** the Guarantee's destination for a Person with two accumulation interests and no nomination — refused by name. **O83** s 293-25(b)'s excess subtraction is unreachable — EXACTLY nil, neither way. **O84** the Subdiv 293-B release election — **PERFORMED from 2026-09-20 (P6-10), and NARROWED TWICE rather than closed (P6-11 the same day)**: ⚠️ **ITS ONE REMAINING FLATTERING RESIDUAL — (i), THE PARTIAL FINANCIAL YEAR — IS THE ONLY GAP IN THIS WHOLE ROLL-UP THAT RUNS IN THE HOUSEHOLD'S FAVOUR**: an electing Person's first or last PARTIAL financial year never reaches a settlement, because the settlement needs all twelve of the year's months, so that year's accrual stands as the cash default they did not choose. Every other item listed above is conservative, neutral, refused by name, or unreachable, and none of them runs the Household's way. ~~ITS TWO FLATTERING RESIDUALS ARE THE ONE OPEN GAP IN THIS FEATURE THAT RUNS IN THE HOUSEHOLD'S FAVOUR~~ and ~~NO SCREEN OFFERS THE ELECTION, so only a hand-edited plan file can make it~~ — both struck on 2026-09-20 (P6-11): the household form states the election, one single-choice control per Person offering their accumulation interests and an explicit "no election", so residual (iii) is closed and only (i) is left to flatter. Its row carries the reasoning, the bounds, and the third residual, which is conservative. ~~FLATTERS: it is the ONE open gap in this feature that runs in the Household's favour~~ — the superseded form of the same claim, struck in place: it was said of the ELECTION, which is now modelled, and it survives only of the residuals named above. Everything this build cannot price is refused by name rather than guessed: an excess over the concessional cap (Div 291), a year with no AWOTE number above the base amount, a contribution into a non-accumulation interest, a lump sum below preservation age, and a Division 293 release out of an interest that cannot meet the liability (`Division293ReleaseInsufficientBalanceError`, P6-10 M3).

**Verified in substance, primary text not obtained:**

| # | Item | Status | What would close it |
|---|---|---|---|
| O6 | legislation.gov.au compilation text for **ITAA 1936 and ITAA 1997** | All Act-level section text came from the **ATO Legal Database**, footered "provided by CCH Australia Limited". Corroborated by ATO guidance and exact arithmetic. `F2025L01060` is **not** in this category — its Authorised Version PDF was retrieved in full. *(Narrowed 2026-09-05: the **Medicare Levy Act 1986** is no longer in this row. FRL **Compilation No. 53** — the compilation in force for FY2026-27 — was retrieved in both Word and PDF on 2026-09-04 and reproduces ss 3, 6, 7 and 8(1)–(7) word for word against the Legal Database version.)* | Fetch the Federal Register compilations. The OData `documents/find(…)` route in §10 works and is the way — `format='Word'` or `'Pdf'`, `volumeNumber=0` on a single-volume Act, and **no** `/content` suffix |
| O7 | **Medicare Levy Act s 8(2)** family reduction formula | **CLOSED 2026-09-04.** The formula was read **three independent ways**: the ATO Legal Database GIF fetched and read directly at `/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif`; the **Federal Register PDF** text layer of **Compilation No. 53** (1 July 2026); and the ATO's own **plain-text history notes**, which give both predecessor formulae with their variable definitions. `0.02 × FIT − 0.08 × (FI − FIT)` is now primary-verified and no longer inferred, and ss 8(1), 8(3), 8(4), 8(5), 8(6) and 8(7) were read with it — see `docs/research/p3-medicare-family-shadein.md` and §2.7. **The retrieval fact is the reusable part: an ATO formula GIF is fetchable and is a primary source** (§2.7, §10). Reading s 8 in full raised O30–O34 below | — |
| O8 | **Income Tax Rates Act 1986 Sch 7 Pt I** | **CLOSED 2026-09-17 (P2-10b).** Read directly from the Federal Register, **Compilation No. 66** (compilation date 1 July 2026, incl. Act No. 50 of 2026), via the epub text endpoint `https://www.legislation.gov.au/C2004A03348/latest/2026-07-01/text/original/epub/OEBPS/document_1/document_1.html` — the SPA route at `/latest/text` serves no text and is the trap. The ATO figures reconcile exactly. **The finding is bigger than the confirmation:** cl 1(b) carries three tables, the third headed *"for the 2027-28 year of income **or a later year of income**"* — so the 14/30/37/45 ladder is legislated for every later income year, R12's three "carried-forward" rates were never assumptions, and §2.1 now covers the whole Planning Horizon from a primary source. `tax-free threshold means $18,200` is s 3(1), a standing definition outside all three tables, which is *why* the bracket thresholds have never been indexed. **The retrieval fact is the reusable part: the epub `document_1.html` endpoint returns a full compilation as text** (§10) | — |
| O9 | **Age Pension assets taper "$3.00 per $1,000"** verbatim | Derived exactly from two published primary figures. No verbatim primary quotation obtained; Social Security Guide 4.2.3 is 403-blocked | Guide 4.2.3 via a different route, or the National Library's Australian Government Web Archive mirror |
| O10 | **SSA 1991 s 1195 (41.76% MTAWE) and s 1197** from the Act itself | Confirmed verbatim from **DVA** (Commonwealth) and a search-engine snippet of the Act; the Act text was not retrieved. **Secondary-only as retrieved** | Fetch the SSA 1991 compilation, Volume 5 / Ch 3 Pt 3.16 Div 2 |
| O11 | **CPI index numbers** for Dec 2016 and Dec 2025 | **CLOSED 2026-09-09** by the transfer balance cap pass (P3-9). The ABS All Groups CPI, weighted average of the 8 capital cities, was retrieved from the **ABS SDMX data API** — not the release page the earlier note 404'd on (§10) — giving **Dec 2016 = 76.38** and **Dec 2025 = 100.32**, plus Dec 2017 through Dec 2024. The s 960-285 arithmetic on those numbers reproduces **all nine** published general transfer balance caps, 2018-19 through 2026-27, so the machinery is now demonstrated rather than asserted. The table is in **§3.2**. **Two things survive the closure and must not be lost with it.** **(a) The residue is O41 / U9** — the ABS has re-referenced the CPI, the superseded series has no Dec 2025 number at all, and the two bases already differ in the third decimal of the factor in four published years; every stored index number must carry its reference base (§3.2). **(b) The consequence was O44, and it was live code — now CLOSED 2026-09-09.** `src/core/superCaps.ts` threw `UnsourcedIndexBaseError` for every financial year except FY2026-27 **because O11 was open**; with O11 closed the refusal lost its ground and the cap is now computed under s 960-285 for every year the series covers, reproducing all nine published caps. See O44 for what survived: the narrowed error, and O41 / U9 as an `unverified` record on every computed year. | — (closed). **O41 / U9 remains open and carries the residue** (O44 closed 2026-09-09 with the code change); do not treat this closure as closing it |
| O12 | **General homeowner-status legal test** | Stated in substance by Services Australia; the "reasonable security of tenure" test is in Guide 4.6.3, 403-blocked | Same as O9. Not load-bearing — this Household is unambiguously a homeowner |
| O13 | **Deeming rates 2020–2025 history** | The 1 May 2020 0.25%/2.25% row is **secondary-only** (Challenger) | Historic DSS rates lists. Only matters if the model backtests |
| O14 | **Which index bound the 20 Sep 2026 basic rate** | ✅ **CLOSED 2026-09-23 — THE MTAWE FLOOR DID NOT BIND; the CPI/PBLCI limb did.** ~~The 3.20% six-month rise suggests the MTAWE benchmark bound rather than CPI/PBLCI, but this is **inference, not fact**~~ — the inference was wrong. **MTAWE, May 2026: $1,832.80 a week** — ABS *Average Weekly Earnings, Australia*, May 2026 (released 13 Aug 2026), **Males, All employees average weekly total earnings, original series**, https://www.abs.gov.au/statistics/labour/earnings-and-working-conditions/average-weekly-earnings-australia/latest-release, retrieved 2026-09-23, **primary-verified**. The ABS surveys in May and November, so the May figure is the **June-quarter** observation §4.7 names for a 20 September indexation. 41.76% × 52 × $1,832.80 ÷ 26 = **$1,530.75 a fortnight**, against the published combined couple basic rate of **$1,711.80**: the floor sat 10.6% below the rate, and would have bound only at an MTAWE of $1,711.80 × 26 ÷ 0.4176 ÷ 52 = $2,049.57 a week. **What it is used for:** stored as `AGE_PENSION.indexation.mtaweAnchor` (effective 2026-06-30) and grown at `Settings.economicSeries.mtawe` by `defaultAgePensionSeries`, the forward series a plan that states none is walked on (user ruling 2026-09-23) — never backed out of a published rate | — |
| O27 | **An express ATO statement that the small shareholder exemption is unavailable to a superannuation fund** | The statutory words "the taxpayer is **an individual**" (s 160APHT(1)(a)) are **primary-verified**; the *conclusion* is an inference from those words plus ATO's consistent framing of two separate alternatives. **The ATO never negates it in one sentence.** The §5A.6 row carries this label rather than a bare `primary-verified` | An ATO ID, private ruling or SMSF-specific page saying it directly. The 2019 SMSF annual return franking-credit instructions were fetched and do not address the qualified person test at all. **CLOSED — ACCEPTED 2026-09-04 (user ruling).** Shipped as labelled inference; the express ATO statement is not to be chased. Reasons: the statutory words are unambiguous, the structural corroboration is consistent, and the inference runs toward **less** relief — if it is wrong the tool is conservative, not confidently over-stating, which is the failure mode this project exists to prevent. Practical weight is small: a buy-and-hold portfolio passes the 45-day rule anyway, in super or out. **Do not reopen without new evidence.** |
| O28 | **The refund *machinery* and its timing** — TAA 1953 Pt IIB (ss 8AAZL–8AAZLH) | The **entitlement** to a refund is primary-verified (s 63-10(1) item 40); the machinery that turns it into money — running balance account, offset against other tax debts, interest on overpayment — was **not fetched**. Matters for cash flow: the refund arrives **after assessment**, not at distribution date (P3-22g) | Fetch TAA 1953 ss 8AAZLA and 8AAZLF. Until then the engine must not fund spending from a refund in the year the distribution is paid |
| O58 / U32 | **ITAR (1997 Act) 2021 s 307-70.02(1)** — the operative definition of "\*superannuation income stream" | **Substance held for the only limb this tool engages; the instrument itself never fetched — which is why it sits here rather than above.** ITAA 1997 s 307-70(2) delegates the definition to the regulations, and the whole of the retrospective-cessation mechanism turns on it. What **is** held is **TR 2013/5 ¶52's reproduction of subparagraph (a)(ii)** — a Commissioner's public ruling reproducing the operative words of the very limb an account-based pension and a TRIS occupy — and that mechanism was established from **both** of its sources, not one. What is **not** held is paragraphs (b)–(d) and subsections (2)–(6): the ruling says at fn [25] that it "does not specifically consider pensions that are covered by paragraphs (b) to (c) … or rights covered by paragraph (d) … and they have not been reproduced". Paragraph (d) (rights arising on death) is what extends ECPI past a member's death — a case this tool **refuses** (`ReversionaryStreamNotModelledError`, R8), not one it computes. **The residue is therefore the unread limbs, not the reading this project relies on** | Fetch s 307-70.02 in full, paragraphs (b)–(d) and subsections (2)–(6) included. **It is now a one-line fetch and was called "the single highest-value unfetched document":** the §D pass skipped it only because the prefix was unknown at the time, and the §B pass has since established it — `REG%2F20210206%2F307-70.02`. The ATO Legal Database `REG%2F19940057%2F` prefix serves the **SIS Regulations** and does not serve the ITAR, and the guessed `SAL%2FITAR2021%2F` form 404s |
| U11 | **Whether the *earliest*-tie rule in s 294-40(2)(b) is ever displaced** | **The inverse of the usual row in this group: the primary text WAS obtained and admits only one reading — what was not obtained is corroboration.** s 294-40(2)(b) takes the **earliest** day on which the highest end-of-day balance occurred, but **no ATO example works a tied maximum** and LCR 2016/9's examples all have a single maximum day. The tie decides the **denominator**: in the pass's hand example 2 the maximum is tied across **195 days spanning a cap increase**, and taking the latest tied day instead of the earliest raises the denominator and **over-states** the cap | An ATO worked example with a tied maximum straddling 1 July. **Low risk** — the statutory words admit only one reading — but the fixture should exist regardless (T60, T63) |
| U17 / U25 / O56 / O62 | **The `\*value` of a superannuation interest** — the amount of every s 294-25 item 1/2 credit and of the s 294-80 item 5 debit | **Settled for the only kind of interest this Household holds; unretrieved for the rest.** For a fully commutable retirement-phase **account-based pension**, s 307-205(b) — *"the total amount of all the \*superannuation lump sums that **could be payable** from the interest at that time"* — equals the account balance; LCR 2016/9 uses "value" and "balance" interchangeably throughout its examples; and reg 307-205.02(2)(b)(ii) was read this pass and **excludes** streams based on "the amount available in the member's account", leaving s 307-205(b) to govern them. **It is an inference from the words plus consistent ruling usage, not a stated rule.** Not held: the s 995-1 defined term `\*value`; **`F2024L01023`** (*Income Tax Assessment Amendment (Transfer Balance Account Value for Certain Superannuation Income Streams) Regulations 2024*), which modifies it for some streams; and regs 307-205.02C / 02D / 02E, **one of which may reach a product an ordinary retiree holds** (O49). **O62 is recorded here rather than as its own item:** the conversion limb of P3-8 does **not** own this question — it asserts the **starting day** and that the credit is of the **whole** supporting interest, and asserts nothing about how value is measured — so it must not be re-researched there | A ruling or determination stating that the value of an account-based retirement-phase interest is the account balance; plus the s 995-1 `\*value` definition, `F2024L01023` and regs 307-205.02C / 02D / 02E. Those three are needed **only** before sizing a credit or the item 5 debit for a stream **other than** a plain account-based pension — every one of which this tool refuses |
| O67 | **No ATO guidance or PCG on the ECPI method choice was retrieved** | **The inverse of the usual row in this group, like U11: the primary text WAS obtained — what was not is corroboration.** Nine URL forms 404'd and there is **no usable ATO search from this environment** (§10 recipe 13). Guidance would corroborate two readings §3.11 carries as labelled inferences — **deemed segregation** (T127) and the **averaging convention** (U37) — and neither would change a number in §3.11.7 | A working guidance URL, or a PCG DocID — **the prefix is `COG`, not `PCG`** (§10 recipe 20). A PCG was fetched successfully on 2026-09-10 purely to establish that prefix |
| O68 | **The Explanatory Memorandum to Act No 10 of 2022 was not retrieved** | **Corroboration, not substance.** The (8)–(10) election was enacted by No 10 of 2022 Sch 5 item 1 **for precisely the mid-year case**, so the EM would corroborate §3.11.3's deemed-segregation reading (T127) directly. The FRL OData API exposes only the Act's own Epub/Pdf/Word for `C2022A00010`; `aph.gov.au` answers **200** to `curl` with a browser User-Agent but needs a **bill id**, and discovery — not access — is the obstacle | The bill id for the *Treasury Laws Amendment (Enhancing Superannuation Outcomes For Australians and Helping Australian Businesses Invest) Bill 2021*, then the APH EM route (§10 recipe 22) |

**Out of scope for this Household, recorded so they are not rediscovered:**

| # | Item |
|---|---|
| O15 | ~~**WATO** (Working Australians tax offset) — amount, taper and the definition of "net labour income" not captured. Available from 2027-28; affects the working / TTR years only~~ — **CLOSED 2026-09-11 by P3-24** (`docs/research/p3-24-wato.md`, register **§2.8.1**). All three limbs discharged: the amount is **the lesser of $250 and the basic income tax liability net labour income alone would bear** (s 61-160), **there is no taper** — limb (b) is a shade-IN at the bottom and the offset is a flat $250 above the shade-in point with no ceiling — and "net labour income" is s 61-155(2)'s own definition, a **fifth income base** (T9). Recorded here rather than deleted because a future reader looking for the taper this row promised will not find one, and needs to be told that is the answer and not a gap. What is *not* closed by it: the labour / non-labour split is a Setting the tool asks for, and the s 63-10 ordering question for a SAPTO couple is open — both in §2.8.1. **This row stays in the "out of scope for this Household" group only for its last clause**, which is still true: WATO is nil in the years both Persons draw only a superannuation income stream and the Age Pension |
| O16 | **Part-year and residency edge cases in SAPTO.** Reg s 9(2) and s 160AAAA(2) both operate on "at any time during the year", which suggests **no apportionment** — not confirmed. Matters directly for the v1 `DEATH` and `ILLNESS_SEPARATION` what-ifs. **2026-09-24: it is why `ILLNESS_SEPARATION` is walked for the Age Pension only and taxed as a couple (O90)**. **2026-09-24 (P12-1): the year of a spouse's DEATH is answered for SAPTO by the ATO's code table — see O91 — so this item now stands for other mid-year changes of status**. **2026-09-30: CLOSED for an illness separation (O90)** — the ATO applies the separated amount if they lived apart at any time in the year and takes the greatest applicable amount, so the whole year is a separated one. It stands now only for other mid-year changes of status, and for WATO's own part-year reading (§2.8.1) |
| O17 | **Div 296 attribution for small superannuation funds** (s 296-65(5), `F2026L00726` regs 296-65.01, 296-70.01 factor **0.825**, 296-70.02) — instrument retrieved, not read in full |
| O18 | **Div 296 defined-benefit interests** (ss 296-70, 296-75) — existence confirmed only |
| O19 | **Payday Super "qualifying earnings" full definition** — s 10A(1)(a)–(h) and the s 10A(3) exclusions; only the salary-sacrifice limb was read closely. Determination `F2026L00784` found but not read. Read in full before coding SG if any Scenario involves bonuses, allowances or termination payments |
| O20 | **HEAS s 1144AA(4) NNEG guidelines** — the Secretary *may* make them; none found on the Register. Nil forecasting impact; the s 1144AA(3) statutory exclusions are what the model needs and they are verified |
| O21 | ~~**HEAS debt vs the Aged Care Means Assessment** (a different statute, *Aged Care Act 2024*). Fold into the Phase 14 aged care pass~~ — **CLOSED 2026-09-25** (`docs/research/p9-heas-debt-netting-2026-09-25.md`): s 330(1) imports SS Act Part 3.12 Div 1, s 1121(5) included, and s 330(8) caps the home value "after applying subsection (1)", so the debt comes off BEFORE the cap. Built in `project()`. Resting on the statute's words alone: no agency page addresses it. Whether debt growth alone triggers a re-determination (s 331) is unsourced |
| O22 | **HEAS interest rounding convention** — whether Services Australia rounds per fortnight or carries full precision. Cents over decades; means the model will not tie to a Centrelink statement to the cent |
| O23 | **Aged care figures** — three discrepancies and the 1 Oct 2026 personal-care reclassification remain open. Phase 14; `concept.md` §5.11 and TODO P14-1..P14-3 hold them |
| O29 | **Franking odds and ends, all immaterial to this Household:** ITAA 1997 s 295-400 (PST current pension liabilities) and s 207-158 (foreign income tax deductions) — named in the chain, text not read; the Division 1A **commencement/application** provisions (the ATO cites 1 Jul 1997 for the general rule and 31 Dec 1997 for the trust-specific machinery — almost certainly two different commencements, not a conflict, and every holding in a FY2026-27 forecast long postdates both); and what an **AMIT/AMMA statement is obliged to report** about franked distributions (Division 276, not Division 1A — the *negative* finding that Division 1A imposes no certification duty is primary-verified) |
| O43 / O54 / U13 | **Capped defined benefit income streams — ITAA 1997 Subdivision 294-D was never retrieved.** They surface in **four** places in this cluster: TAA Sch 1 s 136-70(1)(c)(i), s 136-80(2), the s 294-25(1) Note 1 (*"modified for certain capped defined benefit income streams: see Subdivision 294-D"*) and the s 294-30(1) Note. For such a stream the credit is a **special value**, not the account balance, so the high-water mark and every downstream percentage would be wrong. Out of scope for a two-adult account-based household — but the scope decision has to be **enforced**: declaring a defined benefit pension must be a **refusal** (`CappedDefinedBenefitIncomeStreamNotModelledError`, §3.10.8, T85), not a silent treatment as an account-based pension, and the width of that trigger is itself unverified (**O49 / U20**). *Residue that is live and must not be laundered:* §A.3's argument that `hasEverExceededCap` is derivable assumes nothing but s 294-40 ever moves a personal cap — Subdiv 294-D and 294-E being unread is precisely why that assumption **stays labelled**. Closes by reading Subdiv 294-D with **LCR 2016/10** and **LCR 2017/1**, both named in LCR 2016/9's footnotes |
| O55 / U12 | **Child recipients — ITAA 1997 Subdivision 294-E was never retrieved**, though the s 294-35(1) Note names it as a **cap modification**: it is the only known mechanism other than s 294-40 that moves a personal cap. Out of scope for a two-adult household forecaster; recorded so the dangling Note is not rediscovered, and because it also reaches a death scenario in which a child receives a death benefit income stream. Closes by reading ss 294-170 onwards. Carries the same live residue as O43 — the §A.3 derivability label stays as it is |
| U15 | **Whether a reversionary beneficiary's deferred credit shifts the high-water day.** s 294-25(1) item 1(b) and item 2(b) defer the credit to "the end of the period of **12 months**", which moves it into a later financial year and possibly across a cap increase, changing both the numerator's timing and the denominator. **Reversionary streams are refused, not modelled** — `ReversionaryStreamNotModelledError` (R8) — so this is recorded, not live. It becomes live only if the v1 `DEATH` what-if (O16) is built out. Closes by LCR 2016/9's reversionary paragraphs read with s 294-25 items 1 and 2 against a death-in-FY fixture |
| O51 / U19 / U21 | **MOOT UNDER R1 — the GIC base interest rate, and any s 294-235(3) determination.** The engine **hard-refuses to project any financial year containing an end-of-day cap breach, and excess transfer balance tax is not implemented** (R1), so the s 8AAD(1) rate is a door deliberately not entered rather than an open question. Recorded, not live, with the three things a reversal would need. **(a) O51** — the GIC base rate is a **quarterly** CONFIG and the register has no shape for one: §7 has no slot for a quarterly-moving rate and §3's config rows are FY-keyed. Proposed shape: a `quarter → baseInterestRate` map keyed `2026-Q3`, with the s 8AAD(1) `+7` and the days-in-calendar-year divisor as **structural constants** beside it, refreshed roughly two weeks before each quarter; §4.10's twice-yearly Age Pension cadence is the nearest precedent. **(b) U21** — whether any instrument has ever been made under **s 294-235(3)**: s 294-235(2) takes *"the lower of"* the GIC daily rate and a determined rate, so a determination would make every notional earnings figure too high. The 2026-09-09 title-text search (`contains(name,'Excess Transfer')` → 1 result; `contains(name,'Transfer Balance')` → 3, none a rate determination) is **suggestive, not conclusive** — an instrument could be titled without either phrase; a Federal Register search **by enabling provision** would settle it. **(c) U19** — if the tax is ever priced, the daily GIC series and any s 294-235(3) instrument become live inputs, and neither was retrieved. Using the higher of the two candidate rates is the conservative direction for a *tax* figure |
| U22 | **MOOT UNDER R1 — whether excess transfer balance tax can be paid from superannuation by any route.** TAA 1953 Sch 1 s 131-5(1) lists **five** triggers for a release request and this tax is **not** among them; s 131-5(1)'s five paragraphs are `primary-verified`, but **the conclusion that no release route exists is an argument from absence within one section** and keeps that qualifier (R6). It decides whether the tax is a household **cash** outflow — reducing non-super assets and moving the Age Pension assets test — or a super outflow, which are materially different projections for a retiree whose wealth is mostly in super. Not live while R1 stands: there is no tax figure to place. Closes by reading TAA Sch 1 Div 131 in full (only ss 131-5 and 131-45 were retrieved) and Div 135, plus checking for any Commissioner own-motion release power |
| U24 | **MOOT UNDER R1 — where a s 136-80 commutation lump sum goes.** The provision says "pay by way of commutation … a superannuation lump sum" and **names no destination**; whether it may be retained in accumulation phase inside the same fund is the difference between **15% fund earnings tax and the member's marginal rate**, plus deeming and the Age Pension assets test on the money if it leaves super. **This unknown is harmless only because R1 refuses to project breaching plans. If R1 were ever reversed it becomes a blocker** — it is the exact point at which "warn and continue" has to decide where commuted capital goes, and the natural default flatters the household by 15% of earnings, forever. Closes by SIS Regulations Part 6 (cashing rules) and the payment standards, plus ATO guidance on responding to a commutation authority |
| O53 / U26 | **MOOT UNDER R1 — TAA 1953 Sch 1 Division 155 was never retrieved, and the Commissioner has no stated deadline.** ss 136-10(1) and 136-55(1) impose no time limit on the Commissioner's own acts, and s 294-240 keys the due date to an assessment whose timing is unstated — so nothing bounds the length of the **excess transfer balance period**, which is the exponent in `E((1+r)^N − 1)`, or fixes which financial year the cash outflow lands in. Div 155 also supplies the amendment periods that bound how far back a breach can be assessed. Both consequences sit **inside** the computation R1 refuses. Closes by reading TAA Sch 1 Div 155 — three sections were retrieved and **not read** |
| U23 | **MOOT UNDER R1 — whether the earnings tax exemption is really unmodified by s 294-50 in a s 307-80(4) case.** s 294-50(1) scopes its subsections (2) and (3) to two questions only — whether you have a transfer balance account, and what your transfer balance is — so on its face nothing softens s 307-80(4)'s **retrospective, whole-income-year** loss of exempt current pension income when a provider does not comply with a commutation authority. On a $2.3m interest earning 5% that is roughly **$17,000** of fund tax: a whole year rather than the tail of one. The reading of s 294-50(1)'s scoping words is `primary-verified`; **the absence of a competing softener elsewhere in Subdiv 295-F is `unverified`** and keeps that qualifier (R6). A s 307-80(4) case can only arise after a breach, which R1 refuses to project. **Amended 2026-09-10: the retrieval dependency is DISCHARGED.** The retrieval this row said would close it — ss 295-385 and 295-390 and the meaning of *segregated current pension assets* — is done (§3.11, O52 and O60 closed), and nothing retrieved in Subdiv 295-F softens s 307-80(4). **The item stays moot under R1 on its own terms, but the reason given for it being open no longer holds**, and the residual `unverified` label is now an absence checked across the **whole** retrieved Subdivision rather than an unread one |
| U35 | **Whether a regulation for ITAA 1997 s 295-390(7) was ever contemplated.** The absence is **verified exhaustively against the complete current compilation** — `F2021L00206` Compilation No. 16, 27 Jun 2026, whose Subdiv 295-F contains reg 295-385.01 and nothing else — so **s 295-390(7) is inoperative today and the s 295-390(4) certificate requirement has no escape** (§3.11.1). What is *not* checked is every repealed version since 2007. **A repealed regulation would not change today's answer**, which is why this sits here rather than above; it would only explain why the subsection exists |

### 8.1 O92's audit — every money param on every entry type, and its basis (2026-09-25)

The test this table pins to is `test/plan-money-basis-inventory.test.mjs` §1 (call-site count) — this table is the human-readable register of the same census, one row per `EntryType`'s own money field, `plan.ts`'s own order. **Debt** is a contracted sum and is never indexed; **today's money** is raised by `core/priceLevel.ts`'s `inflateStated` (once, to the entry's own day, unless noted "every month"); **today's wages** is the one basis this ruling does not touch, raised by `economicSeries.awote` instead of `cpi`.

| Entry type | Money param | Basis (before O92) | Basis (after O92) |
|---|---|---|---|
| `SPEND_CHANGE` | `annualSpend` | today's money (O85) | unchanged |
| `ONE_OFF_EXPENSE` | `amount` | nominal at the entry's date (O86) | unchanged |
| `NON_SUPER_INVESTMENT` (buy) | `amount`, `incidentalCostsOfAcquisition` | nominal at the entry's date (O86 family) | unchanged |
| `NON_SUPER_INVESTMENT` (sell) | `amount` | nominal at the entry's date (O86 family) | unchanged |
| `LUMP_SUM_FROM_SUPER` | `amount` | nominal at the entry's date | unchanged — a withdrawal decided on the day, `ONE_OFF_EXPENSE`'s own family |
| `SPOUSE_CONTRIBUTION` | `amount` | nominal at the entry's date | unchanged — paid once, on the day, same family |
| `SUPER_CONTRIBUTION` (salary sacrifice) | `annualAmount` | flat nominal forever (O88, open on which series) | unchanged — a distinct, still-open ruling |
| `WORK_PATTERN_CHANGE` | `annualSalary` | today's WAGES (`economicSeries.awote`) | unchanged — the one basis this ruling does not touch |
| `MORTGAGE_REFINANCE` | `openingBalance`, `monthlyRepayment` | nominal / contracted (a debt) | unchanged — the boundary this ruling restates, never crosses |
| `SuperInterest` | `statedAdministrationFeePerYear` | today's money (O87) | unchanged |
| `Settings` | `contingencyFloor` | today's money (P4-14) | unchanged |
| **`ENTER_CARE`** | `homeValue` | **nominal at the entry's date** | **today's money, raised to the entry's own day; the P14-5a vacated-home carry now inflates from `asAtDate`, not the entry's day** |
| **`ENTER_CARE`** | `radPrice` | **nominal at the entry's date** | **today's money, raised to the entry's own day, held there for the life of the stay** |
| **`ENTER_CARE`** | `radPaidAsLumpSum` | **nominal at the entry's date** | **today's money, raised to the entry's own day** |
| **`SELL_HOME`** | `salePrice` | **nominal at the entry's date** | **today's money, raised to the settlement day** |
| **`SELL_HOME`** | `sellingCosts` | **nominal at the entry's date** | **today's money, raised to the settlement day** |
| **`SELL_HOME`** | `newHomeAmount` | **nominal at the entry's date** | **today's money, raised to the settlement day, held there for the 24-month window** |
| **`RENT_OUT_HOME`** | `weeklyRent` | **nominal at the entry's date, flat for the whole tenancy** | **today's money, raised EVERY MONTH the tenancy runs, `annualSpend`'s own footing** |
| **`RENT_OUT_HOME`** | `annualRates`/`annualInsurance`/`annualAgentFees`/`annualRepairs` | **nominal at the entry's date, flat for the whole tenancy** | **today's money, raised every month, same as `weeklyRent`** |
| **`HEAS_DRAW`** | `securityValue` | **nominal at the entry's date** | **today's money, raised to the entry's own day, held there for the life of the loan** |
| **`HEAS_DRAW`** | `fortnightlyAmount` (STATED only) | **nominal at the entry's date, flat forever** | **today's money, raised every month; `'maximum'` is untouched — already netted off the month's own entitlement** |
| **`HEAS_DRAW`** | `advances[].amount` | **nominal at the entry's date** | **today's money, raised to the ADVANCE's own day (not the entry's)** |

**Nothing else was flagged as the same kind of estimate.** `NON_SUPER_INVESTMENT`/`ONE_OFF_EXPENSE`/`LUMP_SUM_FROM_SUPER`/`SPOUSE_CONTRIBUTION` are all "an amount as at a date" (O86's own test), not an unknowable future price for an asset nobody has valued yet, so they stay nominal on O86's own ground, not by oversight.

---

## 9. Proposed mutation tests — input to P13-5

P13-5 requires confirming that tests fail when caps, tapers and the Condition of Release boolean
are broken. The list below extends that to every trap in §1. **Each row is a deliberate code change
that MUST cause at least one test to fail.** If it does not, the test suite does not cover that
trap.

**Column "FY2026-27 blind" marks mutations that are invisible to a first-year test.** Those tests
must run a projection **past 1 Jul 2027**, or across a multi-year horizon, or they prove nothing.

### Income tax and offsets

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| Replace `sapto.transferReductionRate` with the year's lowest marginal rate | T1 | a transfer case in **FY2027-28**, where 0.15 ≠ 0.14 | **YES — the exemplar.** Identical, correct output for all of FY2026-27 |
| Replace `sapto.transferIncomeFloor` with the tax-free threshold | T1 | any transfer with transferor taxable income between $6,000 and $18,200 | no |
| Compute the SAPTO gate on the Person's own rebate income | T2 | *Ying and Li Jun*: both must be **eligible** on half combined income | no |
| Compute the SAPTO amount on half combined rebate income | T2 | *Ying and Li Jun*: Ying must receive **$0**, Li Jun the full $1,602 | no |
| Re-test the cut-out gate using the augmented `BRA*` | T3 | a transferee whose augmented amount would push them past the cut-out | no |
| Use the published table threshold for the transferee instead of recomputing | T4 | **ATO Example 9**: threshold $39,912, SAPTO $2,469 | no |
| Hard-code the FY2026-27 shade-out thresholds as literals | T5 | the **FY2025-26** fixture set ($34,919 / $30,994 / $33,732) and any FY2027-28 assertion | partly — FY2025-26 catches it |
| Implement reg s 9(5) only; delete the s 9(6) branch | T6 | the **FY2027-28** single base case (T5 = $37,307 > $37,000) and any FY2026-27 transfer case | **YES** for the no-transfer path |
| Source SAPTO thresholds from ATO QC72197 | T7 | the FY2026-27 fixture set ($36,034 / $31,847 / $34,767) | no |
| Key the Medicare seniors threshold off SAPTO *eligibility* | T8 | a Person eligible on half combined income whose own SAPTO computes to $0 | no |
| Feed rebate income into the Medicare levy test (or taxable income into SAPTO) | T9 | a Person with reportable superannuation contributions — the bases must differ | no |
| Stamp the Medicare thresholds `2026-27` | T10 | a stamp assertion: the FY2026-27 Medicare rows must report `2025-26 (prior-year fallback)` | no |
| Remove the LITO zero clamp | — | taxable income above $66,667 must give exactly $0, never negative | no |
| Index the tax brackets, LITO or SAPTO base amounts by CPI | ADR-0001 | a 10-year projection: all three must be nominally flat | **YES** |
| Apportion the s 8(2) reduction unconditionally — drop the s 8(3)(c) gate | T52 | the ATO **Ashton** example: $92.90. Unconditional apportionment gives `450.30 × 49,700/71,400` and a levy of **$229.76** | no |
| Open the s 8(3)(c) gate on any positive spouse taxable income instead of the spouse's own `threshold amount` | T52 | the same Ashton example — the spouse is at $21,700, so this is the same $229.76 | no |
| Use the s 8(5) **family** threshold as the s 8(3)(c) gate instead of the s 3(1) `threshold amount` | T52 | an **ordinary** couple at `TI = $29,000` each, `FI = $58,000`: the spouse is above $28,011 so the gate must **open** and the $83.80 reduction be halved, giving a levy of **$57.00** each. Gating on the family threshold instead leaves the whole $83.80 and gives **$15.10**. (Not testable on a seniors couple — there the Person is never liable in the first place) | no |
| Replace the s 8(2) taper 0.08 with 0.085 (the pre-2014 value) | §2.7 | Ashton: **$141.79** instead of $92.90 | no |
| Replace the s 8(2) taper 0.08 with 0.10 — i.e. treat the "10% effective" rate as the taper | §2.7, T52 | Ashton: **$288.44** instead of $92.90 | no |
| Wire the s 8(2) base rate to `medicareLevy.rate` instead of its own constant | §2.7 | a tripwire assertion that the two are equal **and separately declared**: they have moved together historically but are separate literals in separate provisions, and the taper did **not** move proportionally (1.5%/0.085 → 2%/0.08) | **YES** — invisible until either moves alone |
| Apply s 8 before s 7(2) — reduce the 2% levy first, then cap | T53 | Ashton: capping after the reduction gives `min(994.00 − 450.30, 543.20)` = $543.20, not **$92.90** | no |
| Skip s 7(2) whenever a family income is supplied | T53 | Ashton (**$543.70** instead of $92.90) and `TI = $30,000` / `FI = $70,000` (**$600.00** instead of $198.90 — outside the band, so a shade-in test alone does not catch it) | no |
| Test the family band as `FI <= familyUpper` instead of `raw > 0` | §2.7 | **two dependent children**, `familyLower = $55,914`, published `familyUpper = $69,893` (`59,047 + 2 × 5,423`, the per-child uplift being the one that rounds **up**): at `FI = $69,893` the exact nil point is $69,892.50, so `raw = −$0.04` and s 8 grants nothing, while `FI <= familyUpper` says the couple is still in the band. **A whole-dollar disagreement.** Childless, the two disagree only on cents of income — `FI = $59,047.25` is $0.25 past the published upper and still worth 2c of reduction | no |
| Test each spouse's own taxable income against the **family** threshold | T9, T53 | Ashton: $49,700 ≤ $61,623 would give **$0.00**, not $92.90 | no |
| Levy 2% of family income, reduce, then split by income share | §2.7 | Ashton: **$680.56** instead of $92.90. s 8(2) reduces a levy on the Person's **own** taxable income; it is not a levy on family income | no |
| Compute the family levy per Person, without the spouse's taxable income and SAPTO switch | T52 | it must not compile / must refuse: the s 8(3)(c) gate is not decidable from one Person's figures, and `FamilySpouseNotSuppliedError` is the refusal | no |
| Compute BOTH spouses of a mixed-SAPTO couple on ONE household-wide family income threshold — the larger, or the smaller | O30 | the per-taxpayer pair in `core-medicare-family-shade-in.test.mjs`: Ada $46,000 on $61,623 pays **$73.66** and Ben $29,000 on $47,238 pays **$98.90** at family income $75,000. The larger for both makes Ben **$36.14**; the smaller for both makes Ada **$173.20** | no |
| Read the SPOUSE's SAPTO switch when choosing a Person's own s 8(7) family threshold | O30 | the same fixture, asserted as the two `lowerThreshold`s rather than as the levies, because that is the line the mutation touches — and read off the $46,000 Person both ways round, since the $29,000 one falls under s 7(1)'s $44,268 before any family threshold is chosen | no |
| Reinstate a refusal anywhere in the reach `MixedSaptoFamilyThresholdError` used to have | O30 | a sweep of the deleted guard's whole former reach — every mixed couple under 1.25 × $61,623 — at $500 steps of family income across four splits, both ways round, each point required to answer. **This row REPLACES the P3-35 row that required the refusal to be RAISED**: the premise was reversed on 2026-09-21, not narrowed, and a mutation row is rewritten when that happens rather than walked round | no |
| Encode ATO QC27032's eligibility bullet (individual taxable income must exceed $35,013 / $55,335) | §2.7 | Ashton again — his $49,700 is below $55,335 and he receives the reduction. The ATO page contradicts its own worked example | no |

**Two Medicare levy mutations were tried and found unfalsifiable. They are recorded so a future
reader does not think they are simply missing.**

- **s 7(2)'s "lesser of" — replacing `min(2% × TI, 10% × (TI − threshold amount))` with the s 7(2)
  figure alone.** No income distinguishes the two readings, because **every published `phase-in
  limit` is its `threshold amount` × 1.25**, truncated or exact — which is precisely where the two
  expressions cross. Below the limit the s 7(2) figure is already the lesser; at and above it s 7(2)
  does not apply. The `min` is still written, because the identity is an arithmetic coincidence of
  the current figures and either pair can be amended alone (§2.7, the 1.25 row).
- **s 8(4)(a)'s condition — spilling an excess reduction onto the spouse whether or not s 8(3)
  applied.** An excess can only arise where s 7(2) has capped a levy below 2%, and where s 8(3) did
  **not** apply the spouse is by definition not liable and already pays nil under s 7(1). The extra
  reduction lands on a nil levy and changes nothing. Unfalsifiable on the arithmetic, not merely
  uncovered by the current fixtures.

**WATO and ITAA 1997 s 25-130 — the $1,000 standard deduction (P3-38, run 2026-09-15).** Unlike
every block above, these rows are **not proposed**: all eight were applied to `src/`, counted, and
reverted, at `658bf0e`. **Three survived the entire suite**, and none of the eight was caught by a
compile error as the build then stood. Every row below now fails at least one test (`fb0e2b8`).

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| Delete the `$1,000` cap, so the deduction runs unbounded | §2.8.2 | caught **12 ways** before hardening — the widest-blast mutation in this block, because the cap feeds WATO's base and so reaches the shade-in, the flat $250, the s 63-10 cap and the provenance rows | no |
| Remove the "reduced, but not below zero" floor of s 25-130(2) | §2.8.2 | a Person whose real reducers exceed $1,000 — **$80,000 salary with $1,200 of reducers must give $0**, not a negative deduction. Caught by **one** test before hardening, now three | no |
| Add the reducers instead of subtracting them | §2.8.2 | $1,500 income / $300 reducers must give **$700**. Caught by **one** test before hardening | no |
| Widen the year gate one year earlier than FY2026-27 | §2.8.2 | the deduction must be **$0 in FY2025-26** — the provision does not exist, and that nil is a **fact**, not an estimate | no — but it needs a year *before* FY2026-27 in the fixture, the mirror image of this column's usual warning |
| Remove the year gate entirely | §2.8.2 | same: FY2025-26 must be $0 | no, same mirror |
| **T14 drift — write `toCents(1_000)` at the `standardDeductionAmountFor` call site instead of reading `S25130_MAXIMUM_DEDUCTION`** | T14 | **SURVIVED THE WHOLE SUITE.** A second literal agrees with the record today and diverges the year s 25-130(2) is amended, moving no fixture in between. Now caught by a source canary pinning the s 25-130 block's numeric-literal set to `['0', '1_000']`. **Cannot be made structural** — a second `toCents(1_000)` is a perfectly good `Cents` | no |
| Apply the cap *after* the reducers — `min($1,000, income − reducers)` | §2.8.2 | the orderings must be cap, then reduce, then floor. Caught by **one** test before hardening | no |
| **Rewrite the Setting's STATED default from nil to $1,000 in `settings.ts`, leaving the code untouched** | R6, §2.8.1 | **SURVIVED THE WHOLE SUITE.** Unpinned prose. Now tied to the code in **two** financial years. **Cannot be made structural** — prose is prose | no |
| **Make the default silent in code — `reducerDeductions: Cents = toCents(0)`** | §2.8.1 | **SURVIVED THE WHOLE SUITE.** Every call site passes the nil explicitly, so it moves no figure and no runtime test can see it. Now caught **structurally**, by a `tsc` arity probe | no |
| Add a `professionalAssociationFees` field and subtract it | §2.8.2 | s 25-130(3) amounts have **no field to be filed under**. Refused **structurally** as an excess property, with a vocabulary ban and a two-year runtime half as backstops. Run specifically so the exclusion test is proved against a real field invention rather than only its own positive control | no |

**The lesson this block records for the next battery.** Mutations 2, 3 and 7 *were* caught, but each
rested on a **single** test, because `standardDeductionAmount`, `standardDeductionAmountFor` and
`s25130AppliesToYear` were imported into `test/core-income-tax.test.mjs` and **never called** — the
arithmetic was reachable only through `netLabourIncomeFromSalary`. **A test file importing a function
it never calls is a reliable sign that a property is tested through one indirect path only**, and it
is cheap to grep for.

**Two canary shapes generalise beyond s 25-130:** a Setting's *stated* default must be pinned to the
code in **two** financial years, and any "required, never defaulted" doctrine needs a `tsc` **arity
probe**, because a parameter default that every caller overrides is invisible to every runtime test.

### Superannuation

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| Escalate the Div 296 LSBT smoothly by CPI each year | T11 | a synthetic 2% year: the LSBT must stay at **$3,000,000** where `3,000,000 × 1.020 = 3,060,000` floors back to it, then step to $3,150,000 at a 9.3% cumulative move | no — **covered since 2026-09-09** by a synthetic CPI series; published data reaches one year only |
| Same for the VLSBT ($500,000) and the Transfer Balance Cap ($100,000) | T11 | as above, with their own step sizes: the VLSBT holds at $10,000,000 and steps to $10,500,000 | no — as above |
| **Hard-code a *correct* $3,000,000 LSBT (or $10,000,000 VLSBT) in place of the indexation** | T11 | the synthetic 9.3% year, where the thresholds must be **$3,150,000** and **$10,500,000**. Against published data alone this mutation fails **zero** tests, because the literal is right for the only computable year — it was dead from P3-5a until 2026-09-09 | no — **but it was blind against every published year, which is worse** |
| Swap the two Div 296 step sizes ($150,000 ↔ $500,000) | T11, T14 | the synthetic 9.3% year: $500,000 steps give the LSBT $3,000,000 (6.558 → 6) and $150,000 steps give the VLSBT $10,800,000 (72.866 → 72) | no |
| Assess Div 296 from its **commencement** date (1 Apr 2026) | T12 | first liability must arise for the **2026-27** income year, not earlier | no |
| Chain cap indexation off last year's cap instead of the fixed base | T13 | the AWOTE two-point fixture over 2025-26 and 2026-27 ($30,000 then $32,500) | **YES** — a single year cannot see it |
| Swap the concessional cap index to CPI | T14 | the 2026-27 fixture: AWOTE 2051.10/1533.40 → $32,500 | **YES** |
| Swap the Transfer Balance Cap or Div 296 index to AWOTE | T14 | the published $2.1m and the Div 296 plateau | **YES** |
| Use the Div 296 Dec-2016 base quarter instead of Dec 2025 | T14 | the LSBT must be $3,000,000 in 2026-27 | no |
| Replace `floor_to_multiple` with round-to-nearest | T13 | the **2025-26** concessional cap: 25,000 × 1.289 = 32,225 → floor $2,500 = **$30,000**; round-to-nearest gives $32,500 | **YES** for 2026-27 alone (33,450 rounds the same way either method) |
| Implement Div 296 as marginal bands over earnings | T15 | a TSB above **$10,000,000**: the two proportions apply to the **same** earnings base | no |
| Apply `max(opening, closing)` TSB in 2026-27 | T16 | a 2026-27 case where the opening balance exceeds the closing one — must use **closing alone** | no |
| Apply the closing-only rule in 2027-28 | T16 | the mirror case in 2027-28 — must use `max(opening, closing)` | **YES** |
| Compute SG on post-salary-sacrifice salary | T17 | a Person sacrificing salary: SG must not fall | no |
| Treat the maximum contributions base as quarterly ($62,500) | T18 | a Person on >$270,830: SG must cap at the annual figure | no |
| Hard-code the bring-forward tiers as literals | T19 | a year in which the Transfer Balance Cap or concessional cap indexes — the tiers must move with them | **YES** |
| Change a bring-forward inequality from strict to non-strict | T19 | TSB exactly $1,840,000 must give the **2-year**, $260,000 arrangement | no |
| Sum three indexed years' caps during a bring-forward period | T20 | a 3-year arrangement must total **$390,000**, not $410,000 | **YES** |
| Index the Div 293 $250,000 or the carry-forward $500,000 | T21 | a 20-year projection: both must stay nominally flat | **YES** |
| Charge 15% on the whole of the low tax contributions once the threshold is crossed (a cliff instead of the taper) | T54 | the ATO's worked example — $240,000 of Div 293 income and $15,000 of low tax contributions must give **$750**, not the $2,250 a cliff charges | no |
| Take `max` where s 293-20(1) says the **lesser** | T54 | the same fixture: `max(15,000, 5,000)` gives $2,250. Also a sum of **$250,001**, which must give **15 cents** | no |
| Include reportable superannuation contributions in the s 293-20(1)(a) sum — pass income for surcharge purposes where the Div 293 base belongs | T9, T54 | a Person sacrificing $25,000: that amount must be counted **once**, in the low tax contributions only. `SurchargeIncome` is not assignable to `Div293Income`, so the mutation must fail to **compile** — the `tsc` case is the test | no |
| Net the two net-investment-loss silos against each other | — (§3.6) | a Person with a financial-investment **profit** and a rental **loss**: s 995-1(1) floors each paragraph at nil separately, so the whole rental loss must still raise the base | no |
| Change the concessional cap, the NCC cap, or the Transfer Balance Cap by one step | P13-5 | the cap-breach and excess-contributions assertions | no |
| Set `metNilCashingCOR = (age >= 60)` | P13-5 | a Person aged 60–64 still working: a lump sum must be **blocked**; the same Person at 65 must be released regardless of work status | no |
| Change the TTR maximum from 10% to 12% | P13-5 | the TTR drawdown ceiling assertion | no |
| Wire the 15% contributions tax to the marginal rate | — | a high-income Person: contributions tax must stay 15% (Div 293 adds the second 15% separately) | no |
| Round the Schedule 7 minimum **up** to the next $10 (a ceiling) instead of to the nearest $10 with ties up | T56, §3.9 | `$987,654.32` at 5%, full year: the minimum must be **$49,380**, not the ceiling's $49,390. cl 5 is "nearest", and its second sentence exists only to break the exact-$5 tie upward | no |
| Round the annual figure **before** pro-rating (round twice) | T56, §3.9 | `$1,009,078` at 4% commencing **1 Aug 2026**: `40,363.12 → 36,935.72 → $36,940`. Rounding first gives `40,360 → 36,932.71 → $36,930`. cl 5 rounds "an amount determined under **this Schedule**", once, last | no |
| Pro-rate the minimum on **months** instead of days | T56, §3.9 | `$500,000` at 4% commencing **1 Oct 2026**: `273/365 → $14,960`. Months give `9/12 → $15,000`. The word "month" appears nowhere in Schedule 7 | no |
| **Exclude the commencement day** from cl 3's day count | T56, §3.9 | the same case: 272 days instead of 273 gives `$14,900`, not **$14,960**. cl 3 counts the days that "**include** and follow the commencement day" | no |
| Read the **1 July balance** in a commencement year | T56 | a pension commencing **1 Oct 2026**: cl 1(2)(a)(ii) reads the **commencement-day** balance and applies the full annual factor to it. A balance measured on any other day must raise **`PensionBalanceDateError`**, not compute — the two are the same shape and differ only in value | no |
| **Determine no minimum at all** for a financial year whose 1 July the walk never opened | T56, §3.9, P10-5 | a pension commenced **2021-09-01**, plan stated as at **2026-09-01**: every month from 2026-09 to 2027-06 must carry an `Account-Based Pension minimum` line and the year's lines must sum to **at least** the determined minimum. A nil there is the defect P10-5 fixed and has no clause behind it — Sch 7's only nil is cl 4's, which turns on the commencement day | no |
| **Pro-rate** the opening part-year as though the pension commenced at `asAtDate` | T56, §3.9, P10-5 | the same plan: cl 3 reaches *"the year in which the commencement day … occurs"* and this pension commenced in 2021, so the **full annual** factor applies. Pro-rating 303/365 would understate the year by ~17% under the appearance of a rule | no |
| Let a **stand-in balance** be accepted on or before the day Sch 7 names, or from another financial year | T56, §3.9, P10-5 | `pensionAccountBalanceObservedLater` with `observedOn` of 2026-07-01, 2026-06-30, 2027-07-01 or 2025-09-01 against a required day of 2026-07-01 must raise **`PensionBalanceProxyError`**. Widening it in either direction re-opens the wrong-day substitution `PensionBalanceDateError` exists to refuse | no |
| Apply the stand-in to a plan that **already opens on 1 July** | T56, P10-5 | such a walk has the real balance and must be **byte-identical** to the behaviour before P10-5 and emit **no** `PensionMinimumBasisNote`. Measured on the demo plan at `asAtDate` 2026-07-01: 503 months, digest unchanged | no |
| Drop the **cl 1(2)(b) withdrawal-benefit substitution** — take the account balance unconditionally | T56 | a balance of `$480,000` against a withdrawal benefit of `$500,000`: the minimum must be worked out on **$500,000**. The substitution is inert for a plain APRA account-based pension, which is exactly why omitting it must fail a test rather than a Person | no |
| Take the factor age at **1 July** in a commencement year | T56 | a Person born **15 Sep 1961** commencing **1 Oct 2026**: cl 1(2) reads the age on the **commencement day**, so **5%**, not the 4% their 1 July age gives | no |
| **Pro-rate the TTR maximum** for a part year | T57 | a TRIS commencing **1 Oct 2026** on `$500,000`: the maximum must stay **$50,000**. Pro-rating gives `$37,397.26`. Sch 7 cl 3 is confined to "the minimum total payment" | no |
| **Round the TTR maximum** to the nearest $10 | T57 | a balance whose 10% is not a multiple of $10 — the maximum must be the exact 10%, truncated at the cent because it is a ceiling. Sch 7 cl 5 is confined to "an amount determined under **this Schedule**" | no |
| Switch the TTR **maximum** off for a commencement on or after 1 June, or vary it with age | T57 | a TRIS commencing **10 Jun 2027**: minimum **nil** (Sch 7 cl 4), maximum **the full 10%**. And a TRIS at 65: the maximum stays 10% while the *minimum* band moves to 5% | no |
| Use a **flat 4%** as the TTR floor | T57, §3.9 D2 | a TRIS held at **65**: the floor must be **5%**, from the same Schedule 7 table as any other account-based pension (reg 6.01(2)(b)(i) → reg 1.06(9A)). Guarded structurally as well: a test asserts nothing under `src/` consumes `access.ttrMinimumDrawdown` | no |
| Delete the cl 4A/4B relief multiplier as spent history instead of keeping a year-keyed slot valued `1` | §3.9 | the ATO's **Thavi** example — FY2022-23, age 66, `$250,000` on a **1 Jan 2023** start day, at the **halved 2.5%**: `6,250 × 181/365 = 3,099.315` → **$3,100**. A bare `1` is untestable; the slot is what makes the only end-to-end worked example in the source material runnable | **YES** — FY2026-27's multiplier is 1, so the mutation is invisible in the forecast year alone |
| **M-P3-25-1 — the conversion year must never be cheaper than the R10 bound without a stated exempt proportion.** Delete the `phaseHeldForTheWholeYear` guard and honour each interest's stated phase | T132, T130, §3.11.6 | **§3.11.7 fixture F1's facts with no ECPI Setting: any fund earnings tax below $11,250.00 for FY2026-27 fails.** The mutation returns **$4,500.00** — the provable **floor**, $3,069.86 below the statutory $7,569.86 — and it is the repair an implementer reaches for first | no |
| Apply the s 295-390 exempt proportion only to post-conversion income | T133 | §3.11.7 F1: `$75,000 × 32.7123%` = **$24,534.25** exempt, not `$75,000 × (199/365) × 32.7123%` | no |
| Split the conversion year's earnings by days — 0% for the retirement-phase days, 15% for the rest | T130 | §3.11.7 F4: the days split gives **$3,069.86** on facts where the segregated method owes **$4,296.58**. s 295-410 is an **RSA** provision | no |
| Wire the s 295-387 DSFA threshold to the general transfer balance cap | T126 | a member with TSB **$1,800,000** at 30 Jun 2026 who was then a retirement phase recipient: the fund **must** be DSFA and on the proportionate method. At $2,100,000 it is not | **YES** — and worse than blind: the wired literal is wrong in **every** year, but only a fixture that straddles $1.6m–$2.1m sees it |
| Test DSFA at the conversion day instead of the previous 30 June | T129 | a first pension commencing 14 Dec 2026: **not** DSFA in FY2026-27, DSFA in FY2027-28 on a TSB above $1.6m. A single-year test sees neither | **YES** — it needs both years |

### Transfer balance cap

**Added 2026-09-16 from P3-9 chunk 6 and Battery E.** Every row here was applied to `src/` by hand,
run, counted and reverted. **Two rows are DECLARED SURVIVORS — mutations that fail NOTHING — and they
are IN this table rather than left out**, because a green suite must never be read as compile-time
safety. The reason most of these defences are runtime rather than structural is recorded once:
**every object-shaped `unique symbol` brand in `src/core/` is defeated by a plain object spread**
(`{ ...aRealValue, someInvariantField: aLie }` typechecks, because the brand is an ordinary property
the spread copies and excess-property checking never fires on a field the target already knows). The
inventory is `test/brand-spread-sweep.test.mjs` — **15 object-shaped types from 14 symbols across 8
modules**, all holed today; the 18 scalar brands are structurally immune. The full conversion is
**TODO P3-41**, deliberately a separate work item.

**R1 EXCLUDED — T87–T113 are not in this table and are not missing from it.** The subsection covers
the transfer balance cap traps **T58–T125**, which is **68** rows in §1 but only **41** rows of work:
**T87–T113 (27 traps) are RECORDED-NOT-LIVE under ruling R1**, written against an excess transfer
balance tax implementation that will now never exist, and R1 says in terms *"Do not schedule tests
for them; do not remove them."* §1's §C table carries the same marker on every one of those rows;
this note is its counterpart here, because a reader arriving at §9 sees a table that jumps from T86
to T114 and has no way to tell a ruling from an omission. **They are out of scope, not covered** —
do not read this note as coverage, and do not close the gap by writing rows for them. The note is
deliberately **prose and not a table row**: `test/assumptions-register-o66.test.mjs` derives the
covered set from this subsection's **Trap column**, and a row citing T87–T113 would make the ruling
register as 27 tests. The remaining **41 are all covered** as of 2026-09-16 (O66, discharged).

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| **Override a ledger's `transferBalance` past its own trail** — `{ ...realLedger, transferBalance: $(2_000_000) }`, which `tsc` accepts | T73, T65, §3.10.4 | **§3.10.9's "ledger, not balance" fixture: the trail says $2,400,000 and the override says $2,000,000** — the register's own named wrong answer for that row. `requireAConformingLedger` re-derives the Σ of `entries[].movement` at the module's two seams (`appended`, `closingBalanceOn`) and raises a bare `RangeError` naming both figures; a corrupted value is not a breach, so it must **not** be `TransferBalanceCapExceededError`. Direction: lowering the stored total can only manufacture headroom — $25,000 of space against a $2,025,000 cap this Person has already exceeded by $375,000 | no |
| **Override a ledger's `throughDay`** — the same spread, one field along, so the balance witness above is untouched | T84, T71, §3.10.3 | the same fixture asked about **1 Aug 2026: $2,400,000 is returned where $1,500,000 is true.** The witness is the entries' own `day` — `appended` is the only writer and refuses an entry dated before `throughDay`, so the last entry's day **is** `throughDay` for every ledger the four producers build. Direction: a **phantom** breach, not a missed one ($2,400,000 is over the $2,025,000 cap, $1,500,000 is under it) — wrong, and wrong in the conservative direction | no |
| **Spread a TRIS interest into `phase: 'retirement'`** — `{ ...transitionToRetirementInterest(release), phase: 'retirement' }`, which walks *under* chunk 5a's constructor guards rather than through them | T115, T116, §3.10.6, §3.11 | **$100,000 of fund earnings: $15,000 at the 15% Accumulation/TTR row against $0 laundered** (§3.1's two rows; the laundering ran one way and was worth $15,000 a year). `fundEarningsTax` — the one function that turns a phase into money — re-derives the precondition from `interest.release`, which a TRIS can only carry unmet, and re-raises `PreservedBenefitError` rather than minting a refusal for the spread. `incomeStream` and `reason` were available and deliberately NOT used: both are constructor-written literals the same spread can restate for free | no |
| **Spread a computed day state through the stated door with the high-water mark zeroed** — `transferBalanceAccountDaysAsStated({ ...real, highestEndOfDayTransferBalance: toCents(0) })` | T58 ↔ T84, §3.10.3 | **a COMPILE ERROR — TS2561, and it is the strongest result in chunk 6: the only one of the three gaps closed structurally rather than by a runtime guard.** The door's five parameter keys carry a `stated` prefix (`statedThroughDay`, `statedHighestEndOfDayTransferBalance`, `statedHighestBalanceDay`, `statedPersonalCapOnHighestBalanceDay`, `statedHasEverExceededCap`), so a spread of a real state supplies **none** of them; renaming only the key being lied about fails the same way. No runtime witness was available and that is the point — the day state carries no trail. Priced by §3.10.9's high-water fixture: honest **$2,040,000**, laundered **$2,055,000**, and the direction is one-way, since a zeroed mark can only ever RAISE the cap. *(The diagnostic is TS2561 and not the TS2345 one would predict: with an explicit member present `tsc` reports the unknown property and stops. An assertion pinned to the predicted code would have failed against a working fix.)* | no — structural, so no year can be blind to it |
| **Refuse the O42 Person** — make `transferBalanceAccountOrRefuse` throw on absent Settings alone, instead of on the conjunction | O42, §3.10.7, §3.10.8 | **the §3.10.8 scoping regression, which is the one mistake that turns this refusal into a bug:** a Person who declared `neverARetirementPhaseRecipientBeforeTheForecast` and supplies nothing must return `computedInFull` and be computed, never refused — their account starts inside the forecast, s 294-40 does not apply in the seeding year, and every later credit and debit is the engine's own output. The refusal's own message promises exactly that Person in terms, so the message is pinned as one **contiguous** subject-verb-object regex plus a ban on the hedges (`may still`, `might`, `for the caller`, `is a question`) — a keyword match survived a reversal that kept every keyword and said the opposite | no |
| **Read `notStated` as either answer** — default the tri-state to `neverARetirementPhaseRecipientBeforeTheForecast`, **or** let the `notStated` arm fall through to `statedHistory` whenever Settings happen to be supplied | O42, §3.10.7 | **both halves, and the second is the one a single fixture misses: $440,000 between the two readings of the same silence.** A Person never asked, with a stated history in the Map: read as "no" gives the seeding-year computation and a FY2026-27 cap of **$2,040,000**; read as "yes" gives their stated **$1,600,000**. Silence is evidence for neither, so the door refuses, and the refusal's ground must stay "has not stated whether", not "are not supplied". A boolean has no spelling for "nobody asked" — it arrives as `false` and answers, flatteringly, a question never put | no |
| **Drop the Settings door's defensive copy, its freeze, or either one alone** — return `{ statedAccountStartAndCap, statedLedger, statedDays }` directly | O42, §3.10.7, U14 | **$1,600,000 against $2,000,000 — $400,000 of cap the Person does not have, permanently, because next year's carry-forward starts from it.** The two cross-checks run once, at construction, against an object the caller still holds a reference to, so editing `capPrevFY` afterwards restates §3.10.3 field 2 *behind* the guards — including past the start-day guard that refuses that exact value three tests above. Both layers are asserted, so a freeze without a copy (or a copy without a freeze) fails | no |
| **DECLARED SURVIVOR — no test fails, and this row exists so the green suite cannot be read as coverage.** Delete either seam of the ledger witness, or either of its two limbs (the Σ-movement identity, the `throughDay` identity) at either of its two call sites (`appended`, `closingBalanceOn`) | T73, T84, §3.10.4 | **nothing new. Four separate mutations, one failing test each, and it is the SAME single `test()` call every time** — the entire behavioural defence of the ledger witness rests on one test; deleting a seam outright adds only a *textual* failure from the call-site count tripwire. Measured 2026-09-16 (Battery E). **Declared rather than closed on purpose:** a second test would be the same four assertions in another file, drifting from the priced pair rather than reinforcing it. The real fix is making `transferBalance` and `throughDay` unreadable without the witness — i.e. the brand conversion, **TODO P3-41**, which is the strongest argument for doing it. **Downgraded 2026-09-28 by P3-41 chunk 1 (`43dabb8`), not closed:** `TransferBalanceLedger` now carries a private-member brand, so a spread forging `transferBalance`/`throughDay` is TS2741/TS2322 in one step or two. The runtime witness now guards only against an `as` cast or a JavaScript caller. The mutation coverage above is unchanged (still one test), so the row stays declared | no |
| **DECLARED SURVIVOR — no test fails.** Replace the `Exclude<…>` on the answerable-account type with the hand-spelled union of the two kinds | O42, §3.10.7 | **nothing, and pinning it would be a text canary over a refactor rather than over a defect.** The fourth-`kind` case the `Exclude` appears to prevent is actually caught by **TS2366** on the door's own `switch` (not every code path returns a value), so the `Exclude` is drift protection for the spelling, not the guarantee a reader would take it for. Measured 2026-09-16 (Battery E) | no |

**Added 2026-09-16 by O66 batch 1 — §A's remainder (T59–T64, T66–T70, T72), twelve traps and
fourteen mutations.** Same discipline as the block above: every mutation below was applied to `src/`
by hand, built, run against the whole suite, counted with `grep -c '^not ok '` and reverted. The
count in each row is the number of **failing tests**, measured, not predicted — the baseline is
**796 tests, 0 failures**. Two traps carry two mutations each because the trap has two edges
(T66 intraday: the repeated day and the running maximum; T68 equality: the breach test and the
unused percentage), and **T67 carries three**, one of which is a partial survivor and says so.
Nothing here needed a new golden fixture: §3.10.9's own hand-worked rows, LCR 2016/9's examples and
the day-level fixtures already price all twelve. The one test added by this batch is the priced
T66 fixture named in its row.

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| **Let the mark follow the balance** — in `advanceTransferBalanceDay`, write `highestEndOfDayTransferBalance: closingBalance` in place of `isAStrictIncrease ? closingBalance : state.highestEndOfDayTransferBalance` | T59, T84 | **12 tests**, led by §3.10.9's high-water row (`core-transfer-balance-day.test.mjs` *"a later debit does not lower the high-water mark, and the cap it produces is $2,040,000"*, and *"commuting the whole pension to nil leaves the numerator exactly where it was (T59)"*). The numerator is a maximum over a closed set of past days and a debit makes a new, lower day — it does not edit an old one. Note **what does the killing**: the function's own monotone re-check raises before any cap is computed, so the mutation is caught as a refusal rather than as a wrong figure | **YES** — the mark taken in one year only changes a cap on the following 1 July |
| **Divide by this year's general cap** — in `indexPersonalTransferBalanceCap`, `100 - Math.floor((100 * highest) / denominator)` with `denominator` replaced by `capThis.amount` | T60 | **22 tests**, the widest blast radius in this block. Priced by LCR 2016/9 Example A1 step 2 (`core-personal-transfer-balance-cap.test.mjs`): `$1,525,000 ÷ $1,613,000` → 94% → **$1,625,000**, where dividing by the FY2022-23 general cap of $1,700,000 gives 89% → $1,635,000. The denominator is s 294-40(2)(c)'s **personal** cap on the high-water day, snapshotted with the day, never a later year's general cap | **YES** |
| **Round the used percentage instead of flooring it** — `Math.floor` → `Math.round` on the same line | T61 | **5 tests**, led by *"the used percentage is floored before the subtraction, so the unused one rounds up"*. §3.10.9's hand example 3: $1,234,567 against $2,000,000 is 61.72835% used → floor **61** → **39%** unused → **+$39,000** and a cap of $2,039,000; rounding gives 62 → 38% → $38,000. s 294-40(2)(c) floors the **used** percentage *before* (2)(d) subtracts, so the direction runs one way and it is the taxpayer's | **YES** |
| **Index in the seeding year** — delete the `compareFinancialYears(thisFY, startFY) === 0` early return, so s 294-40(1)'s parenthetical stops applying | T62 | **4 tests**, led by *"the seeding year gets the whole general cap and no indexation, and the year after refuses (O40)"*. A pension started 1 July 2026 has a personal cap of **exactly $2,100,000** that year, even though the general cap rose $100,000 on the same morning. The early return also deliberately does **not** re-derive the seed from a general cap: a "check" would be as good a doorway for the error as a computation | no — this is the one trap in the block that a first-year test sees, because the seeding year *is* the first year |
| **Multiply the unused percentage by the general cap** — `(unusedCapPercentage * increase) / 100` → `(unusedCapPercentage * capThis.amount) / 100` | T63 | **19 tests**. §3.10.9 hand example 2: 40% × **$100,000** = **$40,000**, not 40% × $2,100,000 = $840,000. Both operands are correctly-typed `Cents` and no brand can separate them, so this is priced by fixtures plus the source canary *"the general cap is read only to be subtracted, and that is a TEXT assertion (T63)"* in `core-personal-transfer-balance-cap.test.mjs` — a second `capThis.amount` anywhere in the function is either T63 or the doorway to it | **YES** |
| **Cache the unused percentage across years** — add a module-level `Map<string, number>` keyed on `state.accountStartDay`, read it before computing and write it after | T64 | **7 tests**, led by LCR 2016/9 Example A1, which is the register's own fixture for it: the percentage is **13%** in FY2021-22 and **6%** in FY2023-24 because a new credit reset the high-water mark, and a cached 13% gives $26,000 → $1,639,000 instead of **$1,625,000**. The defence is shape as much as arithmetic: `PersonalCapCarryForward` has **no** percentage field, so the cache has to be smuggled in as module state | **YES** — a single indexation event cannot see it; it needs two |
| **Close a day twice** — `if (day <= state.throughDay)` → `if (day < state.throughDay)` in `advanceTransferBalanceDay` | T66 | **2 tests** after this batch (**1 before it**): the ordering guard test, and the new priced fixture *"LCR 2016/9 ¶51 (Alice) — the same day closed twice would resurrect the intraday spike (T66)"* in `core-transfer-balance-day.test.mjs`. The pre-existing test asserted only that the second close throws; it named no figure, which is why the fixture was added — a credit of $1,700,000 and a commutation of $100,000 on **1 July 2017** close at $1,600,000 against a $1,600,000 cap, so the intraday figure would both breach by $100,000 and write a $1,700,000 numerator that the honest day never had | no |
| **Return the intraday running maximum** — in `closingBalanceOn`, replace `return requireAConformingLedger(ledger).transferBalance` with a loop over `entries[].movement` returning the running peak | T66 | **2 tests**, led by `core-transfer-balance-ledger.test.mjs`'s *"a credit and a debit on the same day net out, and the intraday spike never happened"* — the Alice fixture in full: she must have **never** had an excess and must **remain** eligible (0% unused, not `null`, in FY2021-22). This is the mutation the trap's own wording describes — *"evaluates the maximum after each individual credit"* — and it is the one the ledger, not the day machinery, has to refuse | no |
| **Delete the s 294-40(1)(b) bar** — remove the `if (state.hasEverExceededCap)` early return from `indexPersonalTransferBalanceCap` | T67 | **2 tests**: *"one end-of-day excess, ever, kills every later increase — the same Person, two years"* and *"a stated hasEverExceededCap survives every later day, in two financial years"*. Under R1 the fixture is **Setting-fed history**, not projected days — a projected day that would breach is refused — so the Person breached by $50,000 before the forecast, was corrected, and is still barred in FY2025-26 **and** FY2026-27. **T114 is the same rule reached from the breach side by §C and is deliberately NOT claimed here**: it is a §D trap, its own fixture is written against the excess side, and a later batch must decide it on its own facts rather than inherit this row | **YES** |
| **Un-latch the flag when the balance falls back under the cap** — `hasEverExceededCap: state.hasEverExceededCap` → `closingBalance > personalCapOnDay ? state.hasEverExceededCap : false`. Under R1 the true arm is unreachable (the breach threw), so the flag is cleared on every projected day | T67 | **2 tests**: the latch fixture above, and the source canary *"the strict increase and the breach test are each written exactly once (T58, T71, R1)"*, which fires on the second `>` this edit introduces. Correcting an excess restores nothing: LCR ¶76's transitional excess was *disregarded for tax* and **still** bars indexation | **YES** |
| **PARTIAL SURVIVOR — 1 test, and it is a TEXT canary.** Un-latch only on a strict increase — `hasEverExceededCap: closingBalance > state.highestEndOfDayTransferBalance ? false : state.hasEverExceededCap` | T67 | **nothing behavioural.** Only the *"written exactly once"* source canary fires. Recorded rather than patched, because the escape looks reachable and is not: a flag latched by a real breach implies a mark **above** the cap on its own day (that is what latched it), a barred Person's cap never indexes, and a projected day above the cap throws under R1 — so no later day can be a strict increase. The residue is a *stated* history that pairs a true flag with a mark **below** its own day's cap, which the stated door permits and no honest ATO record produces. Measured 2026-09-16 | **YES** |
| **Refuse a balance that merely equals the cap** — `if (closingBalance > personalCapOnDay)` → `>=` in `refuseAnEndOfDayBreach` | T68 | **4 tests**, led by *"a balance EQUAL to the cap is not a breach, and costs indexation anyway — LCR 2016/9 Ex A2"* and the Alice fixture, whose closing figure is **exactly** the cap. Equalled is not exceeded: s 294-40 keeps applying and the answer is 0% unused, which is the second of §3.10.2's *two ways to lose indexation* — a different rule with the same permanence | no — the breach edge is a one-day fact |
| **Treat an exactly-used cap as fully unused** — `unusedCapPercentage = highest === denominator ? 100 : 100 - Math.floor(…)` | T68 | **6 tests**, led by LCR 2016/9 Example A2: a balance of **exactly $1,600,000** against a $1,600,000 cap is 100% used → **0%** unused → the personal cap stays **$1,600,000** in FY2021-22 and forever, and the FY2017-18 retiree is still at $1,600,000 in FY2026-27, **$500,000 below** the general cap. There is no clamp to hide in — a mark *above* its own day's cap with the flag false is refused, not `Math.max(0, …)`-ed | **YES** |
| **Delete s 960-285(4)'s floor** — remove `if (factor <= 1) return spec.baseAmount;` from `indexCap` in `src/data/assumptions/super.ts` | T69 | **1 test**, and it is the register's own: *"T69 — on a factor of 1 or less the cap REVERTS to $1,600,000, it does not hold"*. The amount under s 294-35(3)(b) is the **base amount**, not last year's cap, so a deflation year reverts to **$1,600,000** where holding gives $2,100,000. **Confidence: labelled inference** (research §A.4) — practically unreachable, and the pseudocode must still teach the right rule. One failing test is thin coverage and is left thin deliberately: the fixture is synthetic (a 74.0 December 2028 index number) and a second copy of it would be the same arithmetic in another file | **YES** — it needs a synthetic later year; no published year deflates |
| **Hard-code the step** — `const increase = capThis.amount - capPrev.amount` → `capThis.amount === capPrev.amount ? 0 : 100_000_00`, i.e. one $100,000 step per indexation event | T70 | **4 tests**, led by LCR 2016/9 Example A1: the FY2023-24 increase was **$200,000** ($1.7m → $1.9m), and FY2019-20, FY2020-21, FY2022-23 and FY2024-25 each had an increase of **$0**. The T63 source canary fires too, since the subtraction it pins is what disappears | **YES** |
| **Freeze the general cap** — in `superCaps.ts`, `const amount = indexCapFromCpiSeries(spec, series, quarter)` → `const amount = published.value`, so every year answers $2,100,000 | T72 | **37 tests — the widest failure in P3-9 to date**, across nine suites. It is item **10A of the s 960-265 table** and this project's own gateway test for CONFIG: *"§3.2 — the s 960-285 arithmetic reproduces all nine published general Transfer Balance Caps"* is the row that makes the series computed rather than copied, and a 20-year projection must not hold $2.1m flat. The engine must also be able to produce the **indexation increase**, which needs two consecutive years — a frozen constant has none | **YES** |

**Added 2026-09-16 by O66 batch 2 — §B's remainder (T74–T83, T85, T86), twelve traps and
twenty-one mutations.** Same discipline as the two blocks above: every mutation was applied to
`src/` by hand, built, run against the whole suite, counted with `grep -cE '^\s*not ok '` and
reverted from a copy taken before the edit. The baseline is **800 tests, 0 failures**.

**Four of the twenty-one failed ZERO tests, and they are the batch's finding rather than its
footnote** — T76's remediation sentence, T82's debit day, T85's stated ground and T86's per-Person
lookup. Each is closed by one new priced test (800 → **804**), and the rows below give the count
**before** and **after** that test, because the pair is the measurement. What the four have in
common is worth stating once: each was *asserted* — the refusal existed, the debit function existed,
the aggregation returned a list — and none was asserted **in the direction the trap runs**. A name,
an arity and a return shape are not a defence.

**Three traps could only be mutated through the SHAPE of a parameter, not its value**, because the
figure they are about is supplied by the caller and this module cannot tell one figure from another:
T77 and T78 (the credit is valued on a day the code never sees) and T81 (the same cashflow is a
debit or nothing depending on the member's act). For those the mutation is the rename the module's
own comment says is the whole defence — *"`value` on its own is the name of the mistake"* — and it
is applied to its one `src/` call site as well, so what is measured is the defence and not a
compile error in unrelated code.

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| **Debit the drawdown** — in `recordPensionPayment`, `movement: 0 as Cents` → `(0 - payment.amount) as Cents`, and the balance written → `(ledger.transferBalance - payment.amount) as Cents` | T74 | **9 tests**, led by `core-transfer-balance-ledger.test.mjs`'s *"a $300,000 commutation debits and a $300,000 pension payment does not — $300,000 of cap space apart"* and *"a pension started at $1.6m and now worth $900k carries $1.6m and ZERO cap space"*, where five years of $80,000 payments leave the balance at $1,600,000. s 294-80(1) item 1 requires a superannuation **lump sum** and s 307-65(1) defines one as a benefit that is **not** a superannuation income stream benefit, so no drawdown can satisfy it. The ledger's Σ-movement witness fires as well, which is the design working: the trail and the total move together, and both disagree with the fixtures. Direction: one-way — a debit that is not there **invents** headroom | no |
| **Infer a commutation from SIZE** — same function, `movement: (payment.amount > 5_000_000 ? 0 - payment.amount : 0) as Cents`, i.e. any withdrawal over $50,000 debits | T81 | **9 tests**, the same set: §3.10.4 says the same cashflow *"is a debit or nothing **depending on the member's act**— it cannot be inferred from size"*, and the $300,000-payment fixture is the priced statement of it. This is the mutation a threshold-shaped implementation actually looks like, and it is worth measuring apart from the flat debit above because a reader would expect a conditional to be harder to catch than an unconditional one. It is not: the two fail the identical nine | no |
| **Flip O47's default** — `DEFAULT_WITHDRAWAL_CHARACTERISATION` from `'pensionPayment'` to `'partialCommutation'` | T81 | **1 test** — *"the characterisation defaults to pensionPayment, which does not invent headroom (T81)"*. Thin, and deliberately left thin: the constant has no consumer in `src/` yet (O47's retrofit of `minimumDrawdown.ts` and `ttrPaymentRange.ts` is later work), so there is no fixture for it to move a figure in. The asymmetry is the whole content of the row — defaulting to a commutation debits an account the member never commuted, and manufactures cap space out of an ordinary drawdown | no |
| **Credit investment growth through the read seam** — in `closingBalanceOn`, `return requireAConformingLedger(ledger).transferBalance` → `return (… .transferBalance * 1.05) as Cents` | T75 | **13 tests**, led by §1's own T75 fixture in `core-transfer-balance-ledger.test.mjs`: *"an $1.8m pension that grows to $2.15m stays at $1,800,000 and does not breach"*. That is the trap's tell — the revaluing model reports a breach that does not exist and advises a commutation for no reason — and it is caught in dollars, not by vocabulary. There is **no item in the s 294-25(1) table triggered by the interest growing** (LCR 2016/9 ¶¶24, 24A, 27, 39F), and §3.10.4 is explicit that this negative is an argument from the absence of a table item and must never be recorded as bare `primary-verified` | no |
| **Add the function the absence-based negative is about** — an exported `recordEarnings(ledger, { day, amount })` that credits the balance through `appended` | T75 | **1 test**, and it is battery B's *"no fourth mutator, and no earnings vocabulary"*: the export-set `deepEqual` catches the name and the `appended(` call-site count catches an unexported one. **No fixture moves a dollar and none can** — the function has no caller — so this is the weaker of T75's two rows and is kept beside the priced one rather than instead of it | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Rewrite `TransferBalanceCapExceededError`'s remediation sentence from *"declare LESS capital as retirement phase: reduce the amount entering the retirement phase"* to *"take MORE out of the pension: increase the pension payments drawn from the retirement phase account"* | T76 | **the one piece of advice this tool may ever emit about an excess, which nothing was reading.** LCR 2016/9 ¶25 is explicit that a large pension drawdown does not reduce the transfer balance, and the refusal is where a user meets that advice — yet every assertion on this class was about its excess, its cap and its s 294-40(1)(b) sentence. The new fixture *"a drawdown is worth NOTHING against an excess, and a commutation is worth all of it (T76)"* prices both acts on one day: a $2,200,000 balance against the $2,100,000 FY2026-27 cap, where $150,000 of pension payments — half again the excess — leave the refusal reporting the identical **$100,000**, and a $100,000 commutation closes the day at exactly the cap. The message is pinned as one **contiguous** subject-verb-object regex plus a ban on the vocabulary the wrong remedy cannot be written without (`draw down`, `drawdown`, `pension payment`, `withdraw`, `take more`, `minimum`), because a keyword match survives a reversal that keeps every keyword | no |
| **Value the item 2 credit on 1 July** — in `creditOnCommencement`, `day: commencement.startingDay` → the 1 July of the calendar year in the starting day | T77 | **12 tests**, across the ledger, the Settings door and the TRIS conversion credit — *"a STATED changeover day wins, and the credit lands on it rather than on the birthday"* and *"the leap-year Person is the second computable case, and it resolves to 1 March"* among them. s 294-25(1) item 2 reads *"the \*value **on the starting day**"*, and 1 July is not a different valuation of the same event: it is a different day, in a possibly different financial year, with a different general cap behind it | no |
| **Take the day out of the parameter's NAME** — rename `valueOfSupportingInterestOnStartingDay` to `value` in `creditOnCommencement` and at its one `src/` call site in `trisConversionCredit.ts` | T77 | **18 tests**, the widest in this batch, and the row exists because the amount axis of T77 has no other mutation: the figure is the caller's and this module cannot tell a starting-day value from a 1 July balance. The module says so itself — *"`value` on its own is the name of the mistake: a caller with a pension balance in hand will pass it"* — and the count is what makes that claim more than a comment, since it includes the `tsc` probe in `core-tris-conversion-credit.test.mjs` and battery B's vacuity anchor on the identifier | no |
| **Take the day out of the TRIS credit's name too** — `Item106ConversionValue.valueOfSupportingInterestOnTheConversionDay` → `value` | T78 | **6 tests**, led by *"the value arrives in a NAMED field, so a dayless balance cannot be passed positionally"* and the `tsc --noEmit` probe beside it. The mistake is closer here than at `creditOnCommencement`: the only balance this codebase holds for a TRIS is `SuperInterest.balance`, which carries **no day at all**, and the credit is the value on the conversion day — *"crediting $800,000 understates the balance by the entire TTR-phase growth and can hide a breach"* | no |
| **Credit on the stream's own commencement day** — in `creditTrisConversionUnderItem106`, `startingDay` → `stated?.commencementDay ?? startingDay` | T78 | **6 tests**, led by *"the stream's own commencementDay is an ACCUMULATION-phase fact and is never a starting day"* and both conversion fixtures. This is T78's day axis: the day the TRIS started is the day the *accumulation* interest started, and the item 2 credit belongs to the day the stream entered retirement phase. Two of R13's three refusals fail too, because a Person taken off the item-106 route by their own stated facts would still be credited | no |
| **Let a derived day stand in for the notification day** — delete the `statedNotificationDay` guard from `trisConversionDayUnderItem106`, so a Person on the 101/102A/103 route is handed their 65th birthday | T79 | **5 tests**, led by *"a stated NOTIFICATION day takes the stream off this route, and the backstop is unreachable"* and *"REFUSAL 1 — a stated notification day takes the stream off this route, and no credit is made"*. s 307-80(3)(b)(ii) keeps the stream out of retirement phase until the provider is notified (LCR 2016/9 Example 1B: retired 30 June 2019, notified 15 July 2019), and the register's own §B fixture is a **fortnight worth a financial year** — a retirement day of 28 June 2027 against a notification day of 12 July 2027 changes both the cap year and the valuation day. **T116 is the same trap reached from the entry test by §D and is deliberately NOT claimed here** | no |
| **Stop requiring the notification at all** — in `trisInterest.ts`, `notificationRouteWithTheFactUnstated`'s third conjunct `return stated?.statedNotificationDay === undefined` → `return false` | T79 | **5 tests**, led by *"5b-6 — the exact trigger throws the NAMED refusal, on each of the three enumerated items"* and *"NEAR MISS: a STATED notification day falls through to the OLD refusal, and that is the gap"*. The refusal is R5's, and what it protects is that on the notification route there is no day this model can derive — so the Person must state one or be refused, never be converted on the retirement day | no |
| **Require notification for the age-65 conversion** — add `'106'` to `NOTIFICATION_ROUTE_ITEMS` in `trisInterest.ts` | T80 | **1 test**, and it is a behavioural fixture rather than a canary: *"5b-6 — NEAR MISS: item 106 stated on the employment ground does NOT fire the notification limb"*. Item 106 sits in s 307-80(2)(c)(iv), which is **not** in (3)(b)(ii)'s list — an express, closed enumeration, corroborated by LCR 2016/9 ¶15 and Example 1A ¶¶30A–30B (**R6**, and the confidence label must not be narrowed to bare `primary-verified`). One failing test is thin for a trap this consequential, and the thinness is the finding: the literal set is the enumeration, and a member added to it changes which streams refuse | no |
| **Never convert without a stated day** — in `trisConversionDayUnderItem106`, `if (statedDay === undefined) return automatic;` → throw instead | T80 | **13 tests**, across the day resolution, the conversion credit and the phase router. This is the trap's own consequence spelled out: a model that waits for a notification *"never converts the stream, never opens the account, and silently forecasts a TRIS running past 65"* — wrong for the cap, for the fund's earnings tax exemption and for the §3.9 10% ceiling. Note which tests die: *"with nothing stated, the conversion day is the 65th birthday (T117 stated, not assumed)"* and the KNOWN-UNSAFE row beside it, so the backstop and its own recorded limitation stand or fall together | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Date the item 1 debit at the ledger's previous `throughDay` — item 6's *stop day* — instead of `commutation.dayReceived` | T82 | **the 30 June boundary the register asks for in terms.** Item 6 is expressly conditioned on *"items 1 and 5 do not apply"*, so a full commutation that produces a lump sum is answered by item 1 — *"the amount of the superannuation lump sum"*, *"at the time you receive"* it — and the two only differ when the days differ. The new fixture *"the item 1 debit is dated the day the lump sum is RECEIVED, across a 30 June boundary (T82)"* makes them differ: a $1,000,000 pension closes FY2025-26 on **30 June 2026** and the lump sum is received on **7 July 2026**. Dated on receipt, the ledger has moved past 30 June and `closingBalanceOn` refuses to answer for it; dated on the stop day, 30 June 2026 silently answers **$0** — the last day of the year s 294-40(2)(a) measures the next year's mark against, $1,000,000 out of the year it belongs to | no |
| **Close the account when a commutation empties it** — in `appended`, return `openTransferBalanceLedger(entry.day)` whenever the new balance is zero and the ledger already had entries | T83 | **1 test**, and it is the register's own T83 fixture: *"a full commutation is item 1, and the account it empties keeps its original seeding year"*. s 294-15(1)'s *"or have at any time been"* and s 294-45's *"ceases when the retirement phase recipient dies"* together mean the account survives; a model that closes and reopens hands the Person the **later** year's general cap as a fresh seed, which is a free cap upgrade worth hundreds of thousands and is invisible in the year it happens | **YES** — the upgrade only appears when a later year re-seeds |
| **Add the function that could close it** — an exported `closeTransferBalanceAccountOnCommutation(ledger, day)` returning a fresh ledger when the balance is nil | T83 | **1 test** — battery B's export-set `deepEqual` again, which is the fence that stops a close-and-reopen door being added quietly. The same caveat as the `recordEarnings` row: no fixture moves a dollar, because the new export has no caller. Both halves of T83 are therefore covered by exactly one behavioural test and one shape pin, which is the honest description of it | **YES** |
| **Rename the refusal** — `this.name = 'CappedDefinedBenefitIncomeStreamNotModelledError'` → `'CappedDefinedBenefitIncomeStream'`, i.e. R8's `Error` suffix dropped, which is §1's own transcribed concern for this trap | T85 | **1 test** — *"every refusal in the vocabulary is a RangeError that answers to its own name"*. This is the whole of what T85 used to have, and the next row is why that was not enough | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Reverse the refusal's stated ground: *"Its transfer balance credit is a SPECIAL VALUE … and **not** the value of an account"* → *"may be taken as the value of the account that supports it, since the annual entitlement is one way of arriving at that value"* | T85 | **the proposition T85 exists to forbid, written into the refusal that forbids it, failing nothing.** §1 says *"the test asserts the refusal, not a number"* — and the tests asserted the refusal's **name**, its `RangeError` base and its arity, never its ground. The new test pins the s 294-135(1)–(3) special value as one contiguous subject-verb-object regex, pins the consequence sentence (*"a wrong credit, a wrong highest-ever balance and every later s 294-40 percentage wrong for life"*) and the O43 / O54 scope decision (*"refused where it is declared rather than guessed at where it is not"*), and bans the hedges the reversal needs (`may be taken`, `is one way`, `approximat`, `stand in for`) | no |
| **Compute a special value in the credit path** — in `creditOnCommencement`, derive an `annualEntitlement` and credit `annualEntitlement * 16` | T85 | **2 tests**: the new T85 canary, which forbids `annualEntitlement`, `specialValue`, `remainingTerm` and a `× 16` in the module's **executable** text, and the named-field test beside it. This is the second half of §1's T85 fixture — *"must **not** credit the user's stated capital value"* — reached from the only side available today. **The first half cannot be run and the row says so:** this refusal has **no throw site**, because nothing a Person can state declares a defined benefit pension, so *"a Person flagged as holding a defined benefit lifetime pension must raise …"* is a fixture with no door. The direction of that gap is stated in the test rather than labelled: a declared stream would be credited whatever account value its caller supplied, and the error is unsigned | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Pool the spouses' Settings — `settingsByPerson.get(person.name)` → `settingsByPerson.get(person.name) ?? [...settingsByPerson.values()][0]` | T86 | **one Person's stated transfer balance account answering for the other, silently.** The existing aggregation test pins that the Household walk returns a **list and never a total**, which is the pooling this codebase was never going to do; nothing pinned that a Person's **own name** is what selects their history, which is the pooling one line performs. The new fixture gives Ada a stated $1,600,000 history and Bea none: Bea must be `notAnswerable` and must reach `UnknownPersonalTransferBalanceCapError`, never Ada's figures. It also prices §1's own T86 couple — $3,600,000 between them, A commencing **$2,600,000** against the $2,100,000 FY2026-27 cap and B **$1,000,000** — so A breaches by **$500,000** while B's **$1,100,000** of headroom is not an operand of anything A's account reads. Div 294 is drafted wholly per individual, and the non-existence of an aggregation provision is a **labelled inference from the absence of one** | no |


**Added 2026-09-16 by O66 batch 3 — §D's remainder (T117–T125) and §C's one live trap (T114), ten
traps and seventeen mutations.** Same discipline as the two blocks above: every mutation was applied
to `src/` by hand, built, run against the whole suite, counted with `grep -cE '^\s*not ok '` and
reverted from a copy taken before the edit. The baseline is **804 tests, 0 failures**; nine new
tests take it to **813**, and the rows below give the count **before** and **after** wherever the two
differ, because the pair is the measurement.

**Four of the seventeen failed ZERO tests, and all four are the same defect wearing four faces: a
rule this project holds ONLY in prose.** T118's item 102, T120's conversion-year pro-rating, T123's
whole breach doctrine and T124's own anti-shortcut warning. Three of them live in a doc comment or a
refusal message, which a green suite does not read; the fourth — T118 — was *asserted*, by a loop of
`message.includes(item)` over seven item numbers, in which **`'102A'` answers for `'102'`**. That is
the reusable part and it is narrower than batch 2's: **a substring test over a set whose members are
prefixes of one another asserts nothing about the shorter ones.** The set is now parsed out and
compared as a set.

**T114 is the largest money consequence in the cluster and it rested on ONE test.** Two independent
ways of losing the s 294-40(1)(b) latch — dropping it at the `carryPersonalCapForward` seam, and
refusing at the stated door the Person who honestly declares it — each failed the **same single**
test, the one T67's row already leaned on. It now has three, and the register's own one-dollar
fixture is one of them. Measuring it also produced the batch's most useful negative: **under R1 the
latch and the mark-above-cap refusal are nearly redundant in the money**, because a projected
breaching day throws, so a mark is never below the cap on its own day — which is why **batch 1's
declared partial survivor on T67 is re-measured at 1 test and left declared**. Its residue and
T114's are the same residue, and it is not closeable without a stated history no honest ATO record
produces.

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| **Drop the latch at the s 294-40 seam** — in `carryPersonalCapForward`, `hasEverExceededCap: state.hasEverExceededCap` → `false`, so the day machinery keeps the true flag and the formula never sees it | T114, T67 | **3 tests after this batch (1 before it)**, led by the new *"T114 — a ONE-DOLLAR, one-day excess freezes the cap for every later year, and costs $96,000"* in `core-transfer-balance-day.test.mjs`. §1's own fixture, priced: a **$1.00** excess on 15 November 2022 against a $1,700,000 cap, fully corrected, still freezes the cap at **$1,700,000** through FY2025-26 and FY2026-27 — where the same account whose worst day was $900,000 (48% unused) reaches **$1,796,000**. The register calls T114 *"the largest money consequence in the cluster and the easiest to omit"* and its entire behavioural defence was one `test()` call | **YES** — a breach in one year only changes a cap on a later 1 July |
| **Refuse the Person who states a real breach** — remove `!stated.statedHasEverExceededCap &&` from `transferBalanceAccountDaysAsStated`'s contradiction guard, so a mark above its own day's cap is refused **whatever** the flag says | T114 | **3 tests after this batch (1 before it)**, the same three. This is T114's omission from the other side and it is the more plausible edit, because the guard reads like a consistency check that has been weakened by a condition: under R1 the **stated history is the only live write path for the flag** (§3.10.5), so a door that refuses the honest declaration leaves the Person only the flattering one — the same $96,000, reached by refusing to hear the fact rather than by forgetting it | **YES** |
| **Delete R1's end-of-day breach test** — empty `refuseAnEndOfDayBreach`'s body, so a day that exceeds the cap closes normally | T114, §3.10.5 | **15 tests**, across six suites, led by *"an end-of-day balance over the cap refuses, and the refusal names the excess and the cap"* and the new T125 fixture. This is the *detector*: under R1 nothing else can observe an excess, because the flag is never set by a projected day. The overlap with T68's equality edge is deliberate and stated — T68 owns the `>`/`>=` boundary, T114 owns the existence of the comparison at all | no |
| **Demand a notification on the age-65 route** — in `trisInterestOrRefuse`, limb 3's guard becomes `!automaticReleaseAlone(release.grounds) || stated?.statedNotificationDay === undefined` | T117, T80 | **6 tests**, led by *"a clean item-106 Person with a resolvable day gets a RetirementPhaseInterest, not the refusal"*. §D's own fixture is a member who attains 65 on 14 February and **has told nobody**; item 106 sits in s 307-80(2)(c)(iv), which (3)(b)(ii) does not enumerate, so there is nothing to notify. A model that waits leaves the stream in accumulation indefinitely, taxes exempt earnings at 15% and — worse — **misses the s 294-25 item 2 credit entirely**, so a member over their cap looks compliant. T80 is the same trap from §B and its row is batch 2's; this one is the **router**, not the item set | no |
| **Let the notification refusal reach the item-106 ground** — delete `if (grounds.includes(AUTOMATIC_RELEASE_GROUND)) return false;` from `notificationRouteWithTheFactUnstated` | T117, O65 | **2 tests**: *"MUTATION — the routing demands the automatic-release ground ALONE"* and *"5b-6 — NEAR MISS: the O65 overlap Person carrying BOTH grounds keeps the old refusal"*. The mirror error reached through limb 2b rather than limb 2, and it lands exactly on the Person **O65 is open about** — retired at 62 on item 101, never notified, then turned 65 — who must keep falling to the generic refusal rather than being told a notification is missing | no |
| **Shrink reg 6.01(2)(b)(ii)'s "Nil" set to s 307-80(2)(c)'s four** — in `ttrPaymentRange.ts`, the refusal message and both gate comments, `101, 102, 102A, 103, 104, 105(b), 106` → `101, 102A, 103, 106` and *seven* → *four* | T118 | **2 tests after this batch (1 before it)**, the pre-existing message fixture and the new *"T118 — the 'Nil' set is seven items, parsed as a SET, and the three s 307-80 does not have"*. The SISR set is **strictly larger** and the three extras — **102** (death), **104** (termination with preserved benefits under the threshold), **105(b)** — are the whole trap: an implementation that derives the phase from *"the 10% no longer applies"* exempts the earnings and creates a transfer balance credit that does not exist | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Drop item **102** alone from the same list | T118 | **the assertion that was not one.** The pre-existing fixture loops `message.includes(item)` over the seven item numbers, and **`'102A'` satisfies `includes('102')`** — so item 102, death, could be struck from reg 6.01(2)(b)(ii)'s "Nil" set and the suite stayed green. The new test parses the set out of the refusal, compares it as a **set**, checks the spelled count *seven* against the length of the list it introduces, and pins the extras over s 307-80(2)(c) as exactly `['102', '104', '105(b)']`. **The general form is worth more than the instance: a substring test over a set whose members are prefixes of one another asserts nothing about the shorter ones** | no |
| **Slave the ceiling event to the phase event** — `if (release.met)` → `if (release.met && release.grounds.includes(the automatic-release ground))` in `ttrPaymentRange` | T119 | **2 tests after this batch (1 before it)**: the existing two-ground refusal fixture and the new *"T119 — the ceiling lapses on SATISFACTION, and no ground and no notification reaches that gate"*, whose fixture is LCR 2016/9 Example 1B's fortnight — ceased employment **30 June 2027**, notified **15 July 2027**. For 30 June there must be **no maximum**, **15%** fund earnings tax and **no** transfer balance credit: three answers no single *converted* boolean produces. reg 6.01(2)(b)(ii)'s *"unless"* contains no notification word and no item number, so the new test also bans `grounds.includes`, `notif`, `phase` and the three phase modules from this function's executable text — the fusion cannot be **written** here without first widening the parameter list | no |
| **BROKEN PROBE, recorded so it is not mistaken for a defence — 2 tests, and neither is about the defect.** The T120 pro-rating below, written with a hand-typed `65` | T120 | **nothing about the conversion year.** The failures are `core-minimum-drawdown.test.mjs`'s unsourced-literal canary (*"hard-coding a factor, the $10 step, the 1 June date or 365 instead of the records"*) and, after this batch, the new T120 fixture. The canary fires on the **literal**, not on the pro-rating, so a mutation written the way an implementer would actually write it — reading `superannuation.access.automaticReleaseAge` — walks past it. Reshaped into the row below, which is the measurement | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Pro-rate the conversion year in `minimumDrawdown`: `proRated` also true when the **65th birthday** falls in the year, with the age read from `superannuation.access.automaticReleaseAge` | T120 | **§1's own T120 fixture, which no test held.** A TRIS commenced 2020 whose member turns 65 on **1 December 2026**: the FY2026-27 Schedule 7 minimum is computed on the **1 July 2026** balance, at the **age on 1 July 2026** (64 → 4%), with **no** pro-rating and no cl 4 nil rule — **$500,000 × 4% = $20,000**. The mutation pro-rates 212/365 to **$11,620**, *"a smaller, entirely plausible minimum"*. Nothing in the suite held a Person who turned 65 in a year their pension did not commence in, so the one edit that moves this figure moved it silently. The conversion is **not** a commencement: it is the same stream continuing, and cl 3 reaches only the year a pension commences | no |
| **Credit the amount MOVED, which is nothing** — in `creditOnCommencement`, `movement: amount` → `0` and the running total left where it was | T121 | **23 tests**, across the ledger, the settings door, the day machinery and both conversion suites. §1's T121 row names the three figures the item 2 credit is not — the year's pension payments, the growth since commencement, and *"the amount 'moved' (**nothing is moved**)"* — and the third is the one an implementer reaches for, because on a TRIS conversion no money changes hands. s 294-25(1) item 2 credits *"the \*value on the starting day of the \*superannuation interest **that supports** the superannuation income stream"*, and the ledger's Σ-movement witness fires alongside the fixtures, which is the design working: the trail and the total move together and both disagree | no |
| **Delete the reversionary limb** — remove `if (declared.reversionaryBeneficiary) throw new ReversionaryStreamNotModelledError(on);` from `requireModelledRecipient` | T122 | **9 tests**, led by *"T122 — a TRIS reverted to a 45-year-old who satisfied nothing refuses, in two financial years"* and — the one that matters for §1's instruction — *"POSITIVE CONTROL — a genuinely built retirement phase interest is still charged 0%"*. §1 requires the test to assert **a named refusal, not a rate**, and to **fail if the code silently returns either 15% or 0%**: it does, in both directions, because the refusal is asserted by class on all three constructors and the only route to a rate is through a constructor that refuses. s 307-80(3)(aa) takes a reverted stream out of the carve-out entirely, so on the statute the 45-year-old **is** in retirement phase — the refusal is the honest answer, not the conservative one | no |
| **Resolve the day before the recipient guard** — in `trisInterestOrRefuse` limb 2, call `trisConversionDayUnderItem106` first and `retirementPhaseInterest` last | T122 | **1 test** — *"a declared reversionary beneficiary refuses AS that fact, ahead of the day resolution"*. T122's **ordering**, which the module's own comment calls out: (aa) failing collapses s 307-80(3)'s conjunction whatever Schedule 1 item the recipient satisfied, so refusing them over a stated changeover day masks the declared fact with a refusal the declaration had made irrelevant, and sends the reader to fix the wrong input. Thin, and thin is right: the ordering has exactly one observable consequence and one fixture is what asserts it | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Rewrite `ttrPaymentRange.ts`'s breach note from *"the stream **cannot recommence** in a later year — it must be commuted and a **new** stream started, with the proportioning rule re-struck"* to *"the stream resumes meeting the SISR requirements in the FOLLOWING year — the breach costs that one year and no more"* | T123 | **the whole of TR 2013/5 ¶20 and ¶101, held in a doc comment nobody read.** Nothing in `src/` computes a breach of the 10% ceiling — the register's own instruction is that a model which cannot represent the death of a stream *"must refuse the breaching year rather than continue past it"* — so the rule exists in this codebase only as reasoning beside the rate, and reasoning is exactly what a green suite does not read. The new canary pins the four propositions (ceased **at the start of the income year**, every payment a lump sum, ECPI lost for the **whole** year, **cannot** recommence) and bans the six ways the one-year reading can be written, because a reversal that keeps *recommence* and drops *cannot* keeps every keyword | no |
| **Restate the refusal in ¶71B's gloss** — in `TrisNotificationNotStatedError`'s message, replace the notification ground with *"will not be in the retirement phase unless the person has met a specified condition of release … so the stream enters the retirement phase on the day the condition was satisfied"* | T124 | **1 test** — *"5b-6 — the message carries the consequence and the known-bad shortcut, through THIS door"*. TR 2013/5 ¶71B paraphrases s 307-80(3) with the notification requirement **dropped**, and on the operative text that paraphrase is wrong for the retired-but-not-notified case: taking it exempts a whole year of fund earnings that are taxable and dates the transfer balance credit in the wrong financial year (LCR 2016/9 Example 1B) | no |
| **SURVIVOR, CLOSED — 0 tests before this batch, 1 after.** Reverse the **docstring** above that refusal — the paragraph headed *"The shortcut this refusal exists to stop"* — into an endorsement of ¶71B | T124 | **the warning that was not read.** The refusal's *message* was pinned; the paragraph that tells the next implementer **why not to reach for the shorter sentence** could be turned into an instruction to reach for it, and the suite stayed green. §1's T124 row asks for exactly this — *"any comment, docstring or register row whose wording follows ¶71B rather than the statute will encode the wrong answer for Case B; a **source-text canary** … is the cheap guard"* — so the new test sweeps **all of `src/`**: it counts the files carrying the gloss (exactly one today), requires each to attribute it to ¶71B, to say the paraphrase is **wrong**, and to carry s 307-80(3)(b)(ii) and the notification act beside it, and bans the five sentences the reversal needs | no |
| **Credit only where the member chose** — in `creditTrisConversionUnderItem106`, `if (stated?.statedTrisConversionDay === undefined) return ledger;` after the day resolves | T125 | **6 tests after this batch (5 before it)**, led by the new *"T125 — a member who does nothing is credited $2,400,000 on their birthday, and breaches by $300,000"*. §1's fixture in full: on the item-106 route entry to the retirement phase is **automatic**, so a member with a **$2.4m** TRIS who turns 65 in FY2026-27 and does nothing must show a **$2,400,000** credit on the birthday and an excess against the **$2,100,000** cap. The mutation is the trap's own words — *"a model that only creates credits when the user commences a pension shows this member as compliant forever"* — and the fixture carries its own control: the uncredited ledger closes the same day at **$0** and does not throw. Under R1 the excess makes the year a refused year, which is what is asserted; the s 294-40(1)(b) half is **T114's** and is pinned in the same refusal's message | no |

### Age Pension

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| Collapse 20 Mar – 19 Sep 2026 into one parameter set | T22 | a July 2026 fortnight: free areas must be $226 / $396 and assets free areas $333,000 / $499,000 | no |
| Reach the standing table INSIDE the published window — `>=` for `>` on `LAST_PUBLISHED_PARAMETER_DAY` | §4.7.0 | `agePensionPeriodAt(LAST_PUBLISHED_PARAMETER_DAY).standingFrom` must be `undefined`: a legislated month restamped as carried is a true figure wearing a false provenance | no |
| Let the standing table win over a STATED series | §4.7.0 | `agePensionPeriodAt(date, series)` must never carry `standingFrom`, and a series that runs short must still raise `MissingPensionIndexationError` rather than falling back | no |
| Drop `standingFrom` from the period, the entitlement, the note or the line's caveats | §4.7.0 | a carried month is IDENTICAL to the month it was carried from in every figure, so only these say which it is — each of the four is asserted separately, in `assumptions-age-pension.test.mjs` and `core-projection-age-pension.test.mjs` | no |
| Carry the deeming rates forward with the rest of the set | T30, O2 | `standingAgePensionPeriod(date).deemingRates` must be `undefined` past the last determination — a Ministerial discretion is not a table to freeze | no |
| Run the standing table BACKWARDS, below the first determined day | §4.7.0 | a date before 2026-03-20 must still be refused, and `pensionOnlyAge` must still refuse a walk that opens there | no |
| Index the blended total payment at CPI | T23 | a 20-year projection against a wage-growth assumption above CPI | **YES** |
| Index the Pension Supplement at MTAWE, or apply the benchmark to it | T23 | as above | **YES** |
| Index the Energy Supplement at all | T23, T31 | a 20-year projection: it must stay $14.10 / $10.60 nominally forever | **YES** |
| Index the free areas or deeming thresholds at wage growth | T24 | a 20-year projection: the cut-off must fall relative to wages, not hold | **YES** |
| Hard-code the income and assets cut-offs | T25 | change the basic rate and assert the cut-off moves: `free_area + rate ÷ taper` | no |
| Change the assets taper from $3.00 to $2.50 per $1,000 | P13-5, T25 | the couple cut-off must be $1,121,000 at the 20 Sep 2026 rates | no |
| Remove the $250/$500 floor on the assets excess — tax the raw excess continuously | T135 | a $608,054 homeowner couple must be $769.50/fn each, not the continuous $769.42 | no |
| Floor the combined assets excess to $250 instead of $500 for a couple | T135 | a $609,900 homeowner couple must be $767.25/fn each, not $766.88 off a $250 step | no |
| Floor the combined assets excess to $1,000 instead of $500 | T135 | the same $609,900 couple must be $767.25/fn each, not $768.00 off a $1,000 step | no |
| Change the income taper from 50c to 40c | P13-5 | the couple income cut-off $4,128.00 | no |
| Apply the income test per Person instead of combined-then-halved | — | a couple with asymmetric income: the result must be identical to the combined calculation | no |
| Store the non-homeowner free areas as two independent series | T26 | a 1 July indexation: both must move by exactly the extra allowable amount's change | **YES** |
| Set the extra allowable amount to $250,000 | T26 | the non-homeowner free areas $600,000 / $766,000 | no |
| End the younger-partner exemption at 65 or at Preservation Age | T27 | the exemption must run to **67** | no |
| Keep the exemption alive after the younger Person starts a TTR | T27 | a TTR at 60: the younger Person's super must become assessable **immediately** | no |
| Expose ABP grandfathering as a Setting, or default it true | T28 | the deemed-income assertion for any Account-Based Pension in this model | no |
| Pool the Work Bonus across the Household | T29 | one Person working and one not: only the worker's income may be offset | no |
| Apply the Work Bonus to deemed investment income | T29 | a Household with financial assets and no employment income | no |
| Apply the Work Bonus after the income test | T29 | any working-pensioner case | no |
| Auto-step the deeming rates +0.5% every six months | T30 | the rates must come from the Setting and hold unless the Setting changes | **YES** |
| Drop the Energy Supplement from a new claimant's payment | T31 | the total rate $1,237.70 / $933.00 from 20 Sep 2026 | no |
| Apply a floor or minimum Age Pension entitlement | ADR-0003 | a Household above the assets cut-off must receive **zero** | no |

### HEAS

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| Take the 50% advance cap against the **fortnightly** rate | T33 | Olli: **$11,767.60** per Person, not $452.60 | no |
| Take the 150% cap against the **annual** rate | T33 | the $70,605.60/yr nil-entitlement Household figure | no |
| Use the older partner's age, or age next birthday | T36 | fixture 2: couple 70/69 on $256,000 → **$74,000**, not $77,000 | no |
| Recalculate capacity continuously rather than on the younger Person's birthday | T36 | a monthly projection across a birthday: capacity must step, not ramp | no |
| Round the security value to the nearest $10,000 | T37 | fixture 4: $75,000 → **$70,000**, 7 × $2,850 = $19,950 each | no |
| Apply the formula once at Household level instead of per Person | T37 | fixture 4, where per-Person rounding differs from whole-security rounding | no |
| Drop the s 1135A(2)(b) nil floor | T37 | security of $9,999 must give **nil** capacity | no |
| Exclude supplements from the maximum payment rate | T33 | the 150% cap $1,801.35/ft single at the 20 Mar 2026 rates | no |
| Compute the draw as 1.5 × MPR without subtracting the Age Pension received | T33 | a full-rate pensioner: the draw must be the remaining 50% only | no |
| Charge interest at `r × 14/365` | T40 | the $1,501.14 balance fixture: **$2.28**, not $2.27 | no |
| Charge interest before adding the fortnight's draw | T40 | the Services Australia annuity example: $50/ft for 130 fortnights → **$7,191.20** | no |
| Stop compounding when the maximum loan available is reached | T41 | a projection past the exit point: the balance must keep growing | no |
| Treat a lump sum advance as means-test neutral | T34 | a Household taking an advance: deemed income from day one; assessable assets from day 91 | no |
| Apply the 90-day exemption to the income test | T34 | deeming must apply from **day one** | no |
| Confer a Pensioner Concession Card on a $0-entitlement HEAS Household | T32 | the card must be **absent** in that Scenario, present for a part-pensioner using HEAS | no |
| Keep the NNEG intact after an Owner-Occupied Mortgage increase | T35 | a Scenario combining `HEAS_DRAW` with a refinance or redraw: the guarantee must be void | no |
| Deduct the HEAS debt from `assessableAssets` while the home is the only security | T38 | a home-only-security Household: assessable assets must be unchanged by the debt | no |
| Compute an entitlement for a vacated home past the 2-year cliff instead of refusing | T39 | a `VACATE_HOME` Scenario past the cliff: `agePensionEntitlement` must throw `UnvaluedAssessableHomeError`, never return a rate. The pre-2026-09-04 form of this row — asserting the debt reduces the now-assessable home in full — belongs to Phase 14, not v1 | no |
| Read the home market value from the assets test | T42 | any assets-test assertion — the value must be invisible outside the HEAS facility | no |
| Drop the ÷26 in `heasFortnightlyDrawDuringAdvancePeriod` (subtract the advance from the fortnightly rate directly) | T136 | Services Australia's "George": $15,323.10 − $10,000 = $5,323.10 ÷ 26 = **$204.73/fn**, not $5,323.10/fn and not nil | no |
| Apply the advance's fortnightly suppression only to the fortnights AFTER the advance, not the one it lands in | T136 | George's own fortnight (the one the $10,000 lands in) draws **$204.73**, not the un-reduced $589.35 | no |
| Do not enforce the maximum of 2 advances per rolling 26-fortnight window | T136 | a third advance within 26 fortnights of the first must be **refused**, `checkHeasDraws` (`parsePlan`) | no |
| Do not enforce the 50% annual dollar cap on a window's TOTAL advances | T136 | two advances each under the cap, whose sum exceeds it, must be **refused** | no |
| ⚠️ **SUPERSEDED 2026-09-25 (P16-4) — T137's refusal is DELETED, and computing a figure is now the CORRECT behaviour, not a mutation to catch.** Kept as the record of what the old refusal guarded. | T137 | a part-rate pensioner (`0 < pension_fn < MPR_fn`) with an advance in force: the pre-P16-4 build's `project()` threw, never returned a rate; RESTORING that throw is now the mutation `test/core-projection-heas.test.mjs`'s T137 test catches | yes (restoring the guard) |
| Assess an advance's cash under the 90-day assets-test exemption instead of from day one | T138 | this build's OWN scope (T138 punts the exemption deliberately): an advance must be assessed as ordinary deemed cash from day one, never exempted | no |

### Franking

**Ten of these seventeen rows have NO CODE PATH TO RUN AGAINST, and the caveat is stated here for the
same reason O66's is stated in §1: no row is marked BUILT, but nothing stops a reader assuming a
listed mutation is a live test.** The individual (non-super) side of franking is **P3-22**, and that
module does not exist — so every row that needs it has nothing to mutate: T46's super-versus-
individual comparison, both T47 related-payment rows, both T51 day-counting rows, T50's
indirect-distribution row, the s 160APHU(1) beneficiary row, the T48 taper and `credits < 5000`
boundary rows (no small-shareholder computation exists on either side), the individual half of
T49's asymmetry row, and the P3-22g/O28 cash-timing row (there is no Income Waterfall yet). Their
*figures* are recorded — `src/data/assumptions/franking.ts` carries §7's twelve constants, added
2026-09-15 by P3-28 — but a record is not a test, and that module has no runtime consumer at all.
*(True when written. Since 2026-09-30 `src/core/individualFranking.ts` reads the $5,000
small-shareholder ceiling from `franking.smallShareholder.ceiling` rather than its own literal.)*
**What IS live today:** T44's 2.3333 gross-up row and both T45 s 207-90/s 207-110 rows, in
`test/core-super-franking.test.mjs`; the *super* half of T49, as `NotAQualifiedPersonError`; the
T48 indexation row, as `test/assumptions-franking.test.mjs`'s assertion that the $5,000 carries no
year stamp and so cannot be uplifted; and the portfolio-rate row below, **BUILT 2026-09-15 in both
halves** — see §5A.3.1 for which half is structural and which is a source canary. The "tax the cash
and then offset" row is not a test at all and should not be read as one: the API shape already
forbids it, because `fundEarningsTax` only ever receives `grossedUpAmount` (§2.8.1.1's discipline —
do not claim a mutation test where the types already rule the wrong answer out).

| Mutation | Trap | Must fail against | FY2026-27 blind |
|---|---|---|---|
| **Index the $5,000 small shareholder ceiling** by CPI or AWOTE | T48 | a 20-year projection: it must stay **$5,000 nominally in every forecast year**. This is the mutation the §5A.5 exception exists to catch | **YES** |
| **Apply the individual's small shareholder relief to the super side** | T49 | a complying fund with under $5,000 of credits that fails the 45-day rule must **not** be a qualified person; the same facts on the individual side must qualify | no |
| Taper the ceiling — "$5,000 reduced by $4 per $1 of excess", or cap the claim at $5,000 | T48 | a holder with $6,000 of credits failing the holding rule must claim **nothing**, not $5,000 and not a tapered amount | no |
| Test the ceiling as `credits < 5000` | T48 | credits of **exactly $5,000.00** must qualify — the statute says "does not exceed" | no |
| Store a portfolio-level franking gross-up rate as an engine constant | T43 | a structural test: the effective franking rate must resolve from a **Setting**, and the §7 constants list must not contain one | no |
| Materialise the gross-up rate as 2.3333 and divide by it | T44 | $100,000 fully franked at 30%: the credit must be **$42,857.14**, not $42,857.75 | no |
| Tax the cash distribution and then apply the offset, instead of grossing up first | T44, P3-22c | any franked distribution where the gross-up moves a bracket, LITO, SAPTO's rebate income or the Medicare levy base (T9) | no |
| Apply s 207-90 without reaching s 207-110 | T45 | a Retirement Phase fund: the credit must be **refunded in full**, not zero | no |
| Let s 207-110 also disapply Subdivision 207-F | T45 | a Retirement Phase fund failing the qualified person test must lose the credit **outright** — exempt status is no shelter | no |
| Refund excess credits on the super side but only offset them on the individual side | T46 | the P6-8 fixture holding the same Australian equity allocation on both sides: an individual whose credits exceed tax payable must receive **cash**, and the reported difference must not move | no |
| Treat a related payment as disqualifying | T47 | a holder who made a related payment and held the parcel 45 days inside the **secondary** window must still qualify | no |
| Test a related-payment case against the primary window | T47 | the same fixture, where the primary window would fail and the secondary passes | no |
| Count the day of acquisition | T51 | a parcel held exactly **45 calendar days** must fail; 46 must pass | no |
| Break continuity when a materially-diminished day is excluded | T51 | a parcel with a diminished day in the middle of an otherwise continuous 46 days must still pass on the surrounding days | no |
| Apply the s 207-157(4) direct-only limit to the holding-period exemption | T50 | an individual under $5,000 receiving the distribution **indirectly through a trust** must still qualify | no |
| Let a beneficiary claim where the trustee is not a qualified person | — | s 160APHU(1): the beneficiary must get **nothing**, and no exemption may rescue it | no |
| Credit a franked distribution as cash in the month it is paid | P3-22g, O28 | the Income Waterfall must not fund spending from a refund before the assessment that creates it | no |

### Register hygiene

| Mutation | Must fail against |
|---|---|
| Remove an FY stamp from any assumption | a structural test asserting every config row carries a financial year or effective date |
| Reclassify any §7 constant as config, or any config as a constant | a structural test against the §7 list |
| Upgrade a `secondary-only` or `primary-via-archive` confidence to `primary-verified` | a structural test asserting the confidence of each row against this register |

---

## 10. Source index

**ATO** (all retrieved 2026-09-03 by `curl` with a browser User-Agent):
resident tax rates · LITO QC105020 · SAPTO QC72197 · new-legislation QC104015 · Medicare levy
reduction QC27031 and QC27032 · contributions caps · transfer balance cap · non-concessional
contributions cap · other super rates and thresholds (AWOTE Table 40) · super guarantee ·
Division 293 tax · better-targeted superannuation concessions.
ATO **Legal Database**: ITAA 1997 ss 61-110, 61-115, 291-20, 292-85, 293-20, 293-25, 294-35 ·
ITAA 1936 s 160AAAA · Medicare Levy Act 1986 ss 3, 7, 8 · Reg `F2025L01060` Authorised Version PDF
at `https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf`.

**legislation.gov.au** (Word/PDF download endpoints and the OData API; the HTML is an SPA shell):
Treasury Laws Amendment (Building a Stronger and Fairer Super System) Act 2026 `C2026A00008` ·
Superannuation (BSFSS) Imposition Act 2026 `C2026A00009` · ITAA 1997 `C2004A05138` compilation 266
(1 Jul 2026) · SGAA 1992 `C2004A04402` compilation 78 · Income Tax Rates Act 1986 `C2004A03348`
compilation 66 · Super (Sustaining the Superannuation Contribution Concession) Imposition Act 2013
`C2013A00087` · `F2026L00726` (Div 296 regulations) · Social Security Act 1991 `C2004A04121`
compilation 1 Jul 2026 · `F2019L00420` (HEAS age component) · `F2026L00945` (HEAS interest) ·
`F2022L00998` (HEAS market value) · `F2026L00944` (scheme rename) · `F2018L01644` (legacy scheme).

**DSS**: [rates list 20 Sep 2026](https://www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf) ·
[rates list 1 Jul 2026](https://www.dss.gov.au/system/files/documents/2026-05/rates-list-1-july-2026.pdf) ·
[rates list 20 Mar 2026](https://www.dss.gov.au/system/files/documents/2026-03/20-march-2026-rates-list_1.pdf) ·
indexation-rates-september-2026 · social-security-indexation · social-security-deeming-rates.

**AGA**: [deeming rate recommendation, September 2026](https://aga.gov.au/publications/deeming-rate-recommendation-september-2026) · [letter to the Minister, 31 Jul 2026](https://aga.gov.au/sites/aga.gov.au/files/sites/aga.gov.au/files/publications/2026-08/p2026-799305.pdf).

**Services Australia**: how-much-age-pension-you-can-get · income-test-for-age-pension ·
assets-test-for-age-pension · deeming · work-bonus-balance · how-work-bonus-works ·
who-can-get-work-bonus · work-bonus-and-your-partners-income · superannuation · income-streams ·
asset-types · who-can-get-age-pension · residence-rules-for-age-pension ·
who-can-get-energy-supplement · the twelve HEAS pages listed in `docs/research/p1-heas.md` §12.

**DVA**: [indexation ready reckoner](https://www.dva.gov.au/access-benefits/pensions-and-payments/ready-reckoners/indexation-of-income-support-pensions-and-allowances) · CLIK Compensation and Support Policy Library 5.4.1, 5.4.2, 5.4.3, 5.4.6.

**DSS Guide to Social Security Law** — `primary-via-archive`, retrieved through
`web.archive.org/web/2025/…` because `guides.dss.gov.au` returns 403 to everything: 1.2.3.50;
3.4.5 and .10, .20, .30, .40, .50, .55, .60, .80, .90.

**Franking — P1-11, all retrieved 2026-09-04.** ATO **Legal Database** (`?DocID=` form; the `?LocID=`
form returns a title with no body): ITAA 1997 ss 63-10, 67-10, 67-25, 202-5, 202-55, 202-60, 203-35,
207-20, 207-90, 207-110, 207-145, 207-150, 207-157, 295-5, 295-10, 295-385, 295-387, 295-390, 328-115,
960-115, 995-1 · ITAA 1936 ss 128B, 128D · Income Tax Rates Act 1986 ss 23, 23AA, 23AB, 26. Rulings and
IDs: **TD 2007/11** (binding — Division 1A applies as in force at 30 June 2002), ATO IDs 2002/604,
2003/1105, 2014/10, **TA 2015/1**, LCR 2019/5. ATO guidance: company tax rate changes (QC 54063,
refreshed 2026-09-04) · franking credit trading · refund of franking credits for individuals ·
non-widely held trusts and the franking tax offset · you and your shares 2022 · trust tax return
instructions appendixes. **Budget 2026-27** *Tax reform* theme.
**legislation.gov.au OData** — the route to **repealed** provisions, and it works:
`/v1/documents/find(titleid='C1936A00027',asat=2002-05-30,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=8|9,rectificationVersionNumber=0)`
returns former Part IIIAA Division 1A as a `.doc`. The 2002-05-30 compilation is the one in force on
30 June 2002, and Division 1A is byte-identical to the 2002-03-11 compilation (MD5-compared, both
Subdivisions). A **second independent primary source** for the same text: the ATO Legal Database's
s 207-145 *document* reproduces former Division 1A inline, even though the repealed sections 404 at the
section level.

**Medicare levy family shade-in — P3, all retrieved 2026-09-04.** ATO **Legal Database**, `?DocID=`
form: *Medicare Levy Act 1986* ss 3, 6, 7, 8, 9 at `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F<section>`
(all HTTP 200 with a browser User-Agent; the `?LocID=%22…%22` form this register used until 2026-09-05
returns a title with no body). 🆕 **A formula served as a GIF in the ATO Legal Database is retrievable
and readable, and is a first-class primary source** — path pattern
`/law/view/sgif/cch-leg2/formula_<section>_<id>_<timestamp>.gif`, with the provision named in the
`<img>` element's `title` attribute; s 8(2)'s is
`https://www.ato.gov.au/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif`
(200, 15,071 B, 380×118). **"It is an image" is not a reason to fall back to a secondary source.**
🆕 **The FRL PDF's text layer is a second route to an embedded formula** where the `.docx` drops it to
an empty paragraph — decompress the Flate content streams and reconstruct the `Tj`/`TJ` literals;
operators drawn from symbol fonts may not survive, operands and numeric coefficients do.
🆕 **ATO history notes are a plain-text source for a formula that is now an image** — where an
amending Act "substituted the formula", the note reproduces the *prior* formula with its variable
definitions in text.
**legislation.gov.au OData**: *Medicare Levy Act 1986* `C2004A03351`, **Compilation No. 53**,
compilation date 1 July 2026, in both `format='Word'` (180,530 B) and `format='Pdf'` (407,070 B).
⚠️ The register's earlier note that the OData host 404s is **wrong**: `api.prod.legislation.gov.au/v1/`
answers for both `titles` and `documents/find(…)`. What 404s is appending `/content`, `format='Docx'`
(use `'Word'`), and any `volumeNumber` other than `0` on a single-volume Act.
**ATO guidance** (secondary): QC27032 *Medicare levy reduction — family income* (the **Ashton**
example → $92.90, and the eligibility bullet that contradicts it — §2.7) · QC27031 *…for low-income
earners* (the **Angie** example → $98.90). **AustLII was not needed and was not fetched.**

**Secondary, corroboration only, never sourced from**: SuperGuide (Age Pension rates — matched
primary to the cent) · Challenger (deeming freeze history 2020–2025, the **only** secondary-only row
in this register) · Morningstar and Grant Thornton (FY2026-27 super caps) · cfs.com.au (LITO and
SAPTO maximums).

### Fetch reality, 2026-09-03

| Source | Result |
|---|---|
| `ato.gov.au` via WebFetch | **403**, every URL |
| `ato.gov.au` via `curl` + browser User-Agent | **200** — web pages, Legal Database, `/law/view/pdf/` |
| `legislation.gov.au` HTML | 200 but the **SPA shell only** — no legislative text |
| `legislation.gov.au` **download endpoints** (`/text/original/word`, `/pdf`) via `curl` | **200** — full authorised text. This is the route |
| `legislation.gov.au` OData (`api.prod.legislation.gov.au/v1/`) | 200 — metadata and enumeration, no document body |
| `servicesaustralia.gov.au` via `curl` | **200.** WebFetch times out — a tool limitation, not a site block |
| `dss.gov.au` including `/system/files/` PDFs via `curl` | **200** — PDFs parse cleanly |
| `aga.gov.au`, `dva.gov.au` via `curl` | **200** |
| `guides.dss.gov.au` | **403** to `curl` and WebFetch, with full browser headers and referer. Reachable **via the Wayback Machine** |
| `ministers.dss.gov.au` | **403** to both |
| `austlii.edu.au` (all mirrors) | **403 Cloudflare**, both tools |
| `abs.gov.au` | 404 on the CPI release path tried |

**Working pattern for legislation.gov.au:** `https://www.legislation.gov.au/<id>/latest/downloads`
→ grep for the `.../text/original/word` link → `curl` → unzip `word/document.xml`.

---

*Consolidated 2026-09-03 from `docs/research/p1-tax-offsets.md`, `p1-super-caps.md`,
`p1-age-pension.md` and `p1-heas.md`, extended 2026-09-04 (§5A, traps T43–T51) from
`p1-11-franking-grossup.md`, `p1-11-franking-refundability.md` and `p1-11-franking-holding-rule.md`,
and corrected 2026-09-05 (§2.7, traps T52–T53, O7 closed, O30–O34 opened) from
`p3-medicare-family-shadein.md`.
Those seven remain the evidence record and are not edited, except where an audit correction is stamped
in place.
Figures are FY2026-27 or the 20 Sep 2026 Age Pension set unless a row says otherwise. The Medicare
levy low-income thresholds are FY2025-26 prior-year fallbacks — FY2026-27 values do not exist.*

---

**Transfer balance cap — P3-9, all retrieved 2026-09-09** by `curl` with a browser User-Agent.
Full log, including every failure and every URL form that does not work, in
`docs/research/p3-transfer-balance-cap.md` §7 — **77 successful retrievals, 29 distinct failures**,
of which 11 are confirmed true absences and 8 were a malformed request against a document that
does exist.

ATO **Legal Database**: ITAA 1997 ss 294-15, 294-25, 294-30, 294-35, 294-40, 294-50, 294-55,
294-80, 294-120, 294-125, 294-130, 294-135, 294-140, 294-145, 294-225, 294-230, 294-235, 294-240,
294-245, 294-250, 295-385, 307-5, 307-65, 307-70, 307-75, 307-80, 307-205, 960-265,
960-270, 960-275, 960-280, 960-285, 995-1 · TAA 1953 s 8AAD and Schedule 1 ss 131-5, 131-45, and
the whole of Division 136 (eleven sections) · ITAR (1997 Act) 2021 regs 294-25.01–.03, 294-80.01–.03,
294-145.01, 307-205.02, 307-205.02B · SIS Regulations 1994 reg 6.01(2) and Schedule 1.
Rulings: **LCR 2016/9** (retrieved independently by three agents, byte-identical each time),
LCR 2016/8, LCR 2016/10, LCR 2016/11, LCR 2017/3, **TR 2013/5**.
**ABS SDMX data API** — All Groups CPI, weighted average of the 8 capital cities, Dec 2016–Dec 2025
(§3.2). **Federal Register of Legislation OData** — title enumeration.

> **CORRECTION, 2026-09-10.** An earlier draft of this block listed **s 295-390** among the
> sections retrieved on 2026-09-09. It was not — the P3-9 fetch log says so expressly ("s 295-385
> was later retrieved by the §D pass; **s 295-390** … and ss 295-395, 295-400 were not"). Removed.
>
> **Two things that fetch settled anyway.** s 295-390 and s 295-395 were fetched on 2026-09-10 and
> both return **HTTP 200** with real documents at `PAC%2F19970038%2F295-390` — s 295-390 carrying
> the proportionate method, "segregated" and the actuary's certificate. So **O60's blocker was
> never source availability**: the provision was one fetch away on a prefix this project had
> already confirmed on more than twenty sections, and no pass had attempted it. The *analysis*
> remains owed — see **P3-25** — but "never retrieved" was a description of what nobody did, not
> of what could not be done.
>
> **SETTLED 2026-09-10 by P3-25. The *Franking — P1-11* list above is RIGHT; O52 and O60 were
> WRONG, and had been since 2026-09-04.** The evidence was in this repository and needed no fetch:
> `docs/research/p1-11-franking-refundability.md` paraphrases **s 295-390(1)** and cites
> **s 295-390(3)**'s formula (*average current pension liabilities ÷ average superannuation
> liabilities*) — which is not derivable from s 295-385 and is in none of that pass's secondary
> sources — cites **ss 295-385(2) and 295-390(2)** together for the NALI and Subdiv 295-C
> exclusions, records the source URL `…DocID=PAC%2F19970038%2F295-390`, quotes **s 295-387(2)(c)(i)**
> and its **$1.6 million** correctly as hard-coded, and draws the consequence that such a fund must
> use the proportionate method. **That is not reconstructible from memory or from a secondary
> source: the franking pass fetched ss 295-390 and 295-387 on 2026-09-04, and its own notes are
> accurate.**
>
> **The failure was the opposite of the one anticipated, and it is a process failure (O70).** No
> pass drew conclusions from a source its notes then denied having. What happened is that **a later
> pass wrote an open item asserting a negative it had not checked** — O52 and O60 both say *"never
> retrieved by any pass"* where what was true was *"not retrieved by **this** pass"* — and three
> shipped artefacts then repeated it, two of them in a **refusal message**. The correction note
> above says *"'never retrieved' was a description of what nobody did"*; even that understates it —
> **somebody had.** The rule that closes it: **verify a cross-pass negative against this section
> before writing it down, and never assert one inside a refusal message** (O70). Cost: six days and
> a blocked build limb. **Nothing in the *Franking — P1-11* list is to be changed.**

**ECPI and Subdivision 295-F — P3-25, all retrieved 2026-09-10** by `curl` with a browser
User-Agent. Full log, with every failure and every URL form that does not work, in
`docs/research/p3-25-ecpi-apportionment.md` §7 — **27 retrievals logged** (one of them a 200 that
returned an SPA shell, counted as a failure in substance) and **28 distinct failing URLs**, of which
twelve are **true absences** and the rest malformed or mis-valued requests against documents that do
exist. **Four absences were confirmed exhaustively rather than merely un-fetched.**

ATO **Legal Database**: ITAA 1997 ss 295-320, 295-385, 295-387, 295-390, 295-395, 295-400, 295-405,
295-407, 295-410, 295-550, 307-70, 307-75, 307-80, 960-265, 995-1 · **ITAR (1997 Act) 2021**
regs 295-385.01 and 307-70.02 (the instrument O58 / U32 wanted, now fetched at
`REG%2F20210206%2F307-70.02`). Rulings: **TR 2013/5**, **LCR 2016/8**, and **PCG 2017/5** — fetched
only to establish the `COG` prefix for PCGs (recipe 20).
**Federal Register of Legislation OData**: the **authorised Word compilation of the ITAR (1997 Act)
Regulations 2021**, `F2021L00206` **Compilation No. 16, 27 June 2026** — 396,418 bytes, retrieved
through `documents/find(…)` with `type='Primary'` (recipe 19), `word/document.xml` extracted and
searched in full; plus title lookups for `F2021L00206` and `C2022A00010` and a document enumeration
for the latter.

**The four true absences, and what each licenses.** (1) **No regulation has ever been made for
ITAA 1997 s 295-390(7)** — Subdiv 295-F of the ITAR contains **reg 295-385.01 and nothing else**,
table of contents agreeing, so the s 295-390(4) certificate requirement has no escape (§3.11.1,
U35). (2) **The ITAA 1997 Dictionary does not define *"actuary's certificate"*** — the only
`certificate` hits in the full s 995-1 document are *NRAS*, *registered PGO* and *shipping exempt
income* (§3.11.5, U34). (3) **Subdivision 295-F prescribes no form, deadline, content, lodgment or
retention rule for the s 295-385(9) election and involves the Commissioner nowhere** — no hits for
*Commissioner*, *approved form* or *notify* across the five core sections (§3.11.5, U36). (4)
**Subdivision 295-F contains no days-based apportionment for a complying superannuation fund** — the
one days formula, **s 295-410**, is for RSAs (T130). **Each is an argument from absence, verified
across a bounded and exhaustively searched text, and each keeps that label under R6.**

**Not retrieved, and recorded rather than smoothed over:** any **ATO guidance page or PCG on the
ECPI method choice** — nine URL forms 404'd and there is no usable ATO search from this environment
(**O67**) — and the **Explanatory Memorandum to Act No 10 of 2022** (**O68**). Neither would change a
figure in §3.11.7; both would corroborate readings §3.11 carries as labelled inferences.

**Retrieval recipes — instructions, not anecdotes.** Each cost a real fetch, several cost the same
fetch more than once because parallel agents kept no shared log.

1. **ITAA 1997**: `?DocID=PAC%2F19970038%2F<section>`. 200 on every section tried; no 403, no
   Cloudflare challenge.
2. **TAA 1953**: `?DocID=PAC%2F19530001%2F<section>`, but **Schedule 1 sections REQUIRE the `Sch1-`
   prefix** — `…%2FSch1-136-80`, never `…%2F136-80`. Without it the 404 reads as "the provision does
   not exist".
3. **Law Companion Rulings use the `COG` prefix**: `?DocID=COG%2FLCR<year><n>%2FNAT%2FATO%2F00001`.
   The intuitive `LCR%2F…` form **404s**, and so does `TXR%2F…`. **Three separate agents lost a fetch
   to this one.**
4. **Taxation Rulings**: `?DocID=TXR%2FTR<year><n>%2FNAT%2FATO%2F00001`. The `/00001` suffix is the
   live consolidated document; `/00003` does not exist.
5. **ITAR (1997 Act) 2021**: `?DocID=REG%2F20210206%2F<section>`. Not `SAL`, not a title abbreviation.
6. **SIS Regulations 1994**: the **`REG`** prefix, not `PAC` — `?DocID=REG%2F19940057%2F<reg>`.
   Subregulations work percent-encoded: `6.01%282%29`.
7. **SISR Schedule 1 has NO `Sch1-<item>` form** — fetch the whole schedule with the bare `Sch1`
   DocID. The `Sch<N>-<item>` suffix *does* work for TAA 1953 Sch 1 and for **SISR Schedule 7**
   (`Sch7-1`). It is SISR Schedule 1 specifically that refuses it.
8. **Do not try subsection-level DocIDs.** `…%2F8AAD-1` 404s; `…%2F8AAD` returns every subsection.
9. **Unencoded slashes are accepted** — `DocID=TXR/TR20135/NAT/ATO/00001` returns identical bytes to
   the percent-encoded form.
10. **Use `?DocID=`, never `?LocID=`.** The `?LocID=` form returns a **title-only shell with no
    legislative text**. Register rows still carrying `?LocID=` URLs cite a document that does not
    contain the words quoted from it.
11. **`WebFetch` 403s on `www.ato.gov.au` for every URL. Use `curl` with a browser User-Agent**,
    which returns 200 for guidance pages, the Legal Database and `/law/view/pdf/`.
12. **An ATO 404 is served with a real 404 status, and the size of the error page is NOT a
    constant** — *corrected 2026-09-10 (T134).* There are two error pages: the Legal Database
    (`/law/view/document?DocID=…`) serves **~101.5 KB** and a guidance path or `/General/Gen/QC…`
    serves **~257 KB**. A pass that had memorised the 257 KB figure as the 404 signal would have
    read **every one of P3-25's twelve Legal Database 404s as a success**. The rule the recipe
    protects is right and gets stronger, not weaker: **the body size of a 404 is not a signal at
    all — read the status code.**
13. **There is no usable ATO search.** `results?query=` 302s from `curl`, `/api/search` 404s, and
    search-engine discovery is unavailable from this environment. **Construct DocID URLs directly
    from the prefixes above** — that is how every document above was reached.
14. **Prefer `/law/view/document` over ATO guidance pages.** Four separate consumer-page paths cited
    by this project's own earlier documents now **404**. The Legal Database route is stable; guidance
    URLs rot.
15. **ABS index numbers**:
    `https://data.api.abs.gov.au/rest/data/ABS,CPI,<version>/1.10001.10.50.Q?startPeriod=…&endPeriod=…`
    with `Accept: application/vnd.sdmx.data+csv`. **The dataflow version segment is load-bearing** —
    `2.0.0` is the current reference base, `1.1.0` the superseded one, and no other version exists.
    See §3.2 (O41): **record the reference base with every index number; never compute a factor from
    a mixed pair.**
16. **The ABS codelist endpoint `/rest/codelist/ABS/CL_BASE_PERIOD` returns 200 but does NOT settle
    the reference period** — its labels are calendar-year and do not reconcile with the observed
    series. Not authority for the CPI base.
17. **FRL OData**:
    `https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'<text>')&$select=id,name,collection`.
    The `search(criteria=…)` form **400s** on parenthesised titles. A `count 0` result from a
    well-formed filter **is** evidence of absence; a 400 or a 404 is not.
18. **ITAR (1997 Act) 2021 regulation numbers keep their dot** — `?DocID=REG%2F20210206%2F295-385.01`
    works, unencoded dot and all. *(Extends recipe 5 to dotted regulation numbers; added 2026-09-10.)*
19. **The FRL OData `documents/find(…)` route works for a LEGISLATIVE INSTRUMENT, but only with
    `type='Primary'`.** `type='Principal'` — the form an English speaker reaches for first —
    `'LegislativeInstrument'` and `'Instrument'` all **404**. This is the route to the *authorised*
    text of a regulation, and it is how the s 295-390(7) true absence was proved:
    `…/v1/documents/find(titleid='F2021L00206',asat=<date>,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0)`
    → 200, a real `.docx`. ⚠️ For that instrument the `www.legislation.gov.au/<id>/latest/text/original/word`
    path of the "working pattern" above returns **200 with the SPA shell** — a success by status and a
    failure in substance. The OData route is the only one that works for it.
20. **Practical Compliance Guidelines use the `COG` prefix, exactly like Law Companion Rulings** —
    `?DocID=COG%2FPCG<year><n>%2FNAT%2FATO%2F00001`. The intuitive `PCG%2F…` form **404s**. This is
    recipe 3's trap wearing a different document type, and it costs a fetch every time.
21. **To prove a section does not exist, probe its neighbours.** Five fetches bounded Subdivision
    295-F and turned *"I did not find it"* into *"it is not there"*. Cheap, and it is what makes an
    absence **citable** — which under **R6** is the difference between a labelled inference and an
    unusable guess.
22. **`aph.gov.au` answers 200 to `curl` with a browser User-Agent** — unlike `austlii.edu.au` and
    `guides.dss.gov.au`. It is a live route to explanatory memoranda **if a bill id is known**;
    discovery is the obstacle, not access (O68).
23. **The FRL OData navigation-property form `titles('<id>')/documents` 404s.** Use
    `/v1/documents?$filter=titleId eq '<id>'`.

---

## 11. The plan file boundary

**This section records no assumption.** It is here because §3.10.8 made this document the one home
for refusal names (R8) and `test/refusal-names.test.mjs` enforces that in both directions: a refusal
in `src/` that this register does not name is a refusal the user cannot look up. The refusals below
are not about the law at all — they are about the **file**, and they exist because of a gap that is
worth stating in the register's own terms.

**The gap.** `Entry` is a nineteen-member union and only **five** members can be constructed in
TypeScript; the other fourteen carry `UnspecifiedParams`, whose symbol key cannot be produced by any
object literal. That is a **compiler-only** protection, and a plan file is JSON on a disk that has
never met the compiler. `{"type":"HEAS_DRAW", …}` in `plan.json` would reach `projection.ts`, which
dispatches on `entry.type` with scattered `if`s rather than an exhaustive switch — so the entry
would be **silently ignored** and the forecast would be confidently wrong about a plan the user
does in fact hold. `src/core/parsePlan.ts` is the door that closes, and its refusals are the
evidence that it is closed.

**Two rulings are recorded in these rows** (taken from precedent 2026-09-19, reported to the user
and not objected to — NOT issued by the user; this register's own discipline is that a decision
carries an honest source, and "nobody objected" is weaker evidence than "somebody ruled"). First, an entry type this build
cannot honour refuses the **whole file** — entries are never silently dropped, because a projection
computed from a plan with one entry deleted is exactly the confidently-wrong output this project is
organised against. Second, `version` is a **bare integer**, it is `1`, and an unrecognised one is
refused **by name** rather than coerced or best-guessed: the plan file must outlast the app, which
argues for a version you can refuse on rather than one you can interpret. There is no migration
framework and one gets written the day a migration is first needed.

**A refusal here never writes.** `src/app/loadPlan.ts` seeds `plan.json` from the demo fixture only
when the file is **absent**; a file that exists and is refused is left byte for byte as it is, and
`test/app-load-plan.test.mjs` asserts that against a real file on disk. Absence and refusal are
different states and the startup path must not collapse them into one.

### 11.1 Named refusals

| Refusal | Fires when | Status |
|---|---|---|
| **`UnspecifiedEntryTypeError`** | An entry names one of the **fourteen** `ENTRY_TYPES` whose params are unspecified — `HEAS_DRAW`, `DEATH`, `DOWNSIZE` and the rest. The type is real, not a typo: `projection.ts` has no branch for it. The list is **derived** — `ENTRY_TYPES` minus the types `parsePlan` can read params for — so specifying a sixth type is the single edit that retires a membership, and no second list can drift | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileVersionError`** | The file's `version` is anything other than `PLAN_FILE_VERSION` — including absent, a string, or a number this build has never heard of. Refused by name; never coerced | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileShapeError`** | The file is not an object, or carries a top-level key that is not one of `version`, `settings`, `household`, `entries`, `scenarios`, `activeScenarioId`. An unread key is a fact the projection was not computed from, so it is refused rather than dropped. **From plan file v2 (P6-4, 2026-09-19) it also owns the SCENARIO GRAPH** — an empty `scenarios`, a malformed `Scenario`, a duplicate scenario id, a `parentId` naming no scenario, a `parentId` chain that LOOPS, and an `activeScenarioId` naming no scenario. All six are facts about the shape of the file rather than unanswered questions about the law, so they wear this name rather than minting a new one | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileSettingsError`** | A field of `Settings` — including the forward `economicSeries` and the `deemingRates` — is missing, of the wrong type, not a member of its union, or an unknown key. `planningHorizonAge` must be a whole age above zero, because a fractional or negative one gives `forecastWindow` a last month before its first and that is not a refusal it carries | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileHouseholdError`** | A field of `Household`, `Person`, `SuperInterest`, `StatedStreamSettings`, `Schedule1ItemIdentification` or `Parcel` is malformed, or `persons` holds other than one or two people — a third Person has no meaning anywhere in this model | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileEntryError`** | An entry is malformed in any way other than its type: a bad `id`, `owner`, `enabled`, an unknown key, or params that do not match the type — including `incidentalCostsOfAcquisition` on a `NON_SUPER_INVESTMENT` **sell**, which the compiler refuses on the same ground. **From v2 it also covers a `Scenario.entryIds` member naming no entry in the pool, and (2026-09-22) an `entryOverrides` key doing the same**: that entry would be silently absent from the projection, which is the failure the whole module exists for | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileAmountError`** | Any money field is not a whole number of cents — a float, a `NaN`, a string, or past `Number.MAX_SAFE_INTEGER`. ADR-0001: money is integer cents, and `84000.5` cents in a file is not a rounding decision this model may take on the user's behalf. It is `money.ts`'s own `Number.isSafeInteger` rule wearing a name a user can look up; `test/core-parse-plan.test.mjs` pins the two against each other so they cannot drift | **BUILT** — `src/core/parsePlan.ts` |
| **`PlanFileDateError`** | Any date field is not a zero-padded ISO date. `IsoDate` is a template literal type, so `2026-3-5` satisfies the compiler and sorts wrongly against `2026-03-20` — and this engine compares dates as strings. The check is `household.ts`'s `assertIsoDate`, re-thrown under this name | **BUILT** — `src/core/parsePlan.ts` |

**Not a refusal, and deliberately not a `RangeError`: `PlanWriteFailure`** (`src/app/loadPlan.ts`,
P8-2b). ADR-0004's refusals say *"this input is not something I will act on"*. A failed write says
the opposite — the input was fine and the **disk** did not take it — and the two must not arrive
under one kind, because the user's next action differs: fix the plan, or fix the disk. It is
surfaced in the UI as a banner rather than a console line, because the failure is otherwise
invisible: every figure on screen still looks right and is simply no longer what is stored.

### 11.2 The Ledger (P11-1 slice 1, 2026-09-28)

`ledger.json` is a separate file from the plan (CONTEXT.md §Ledger) and has its own door,
`parseLedger` in `src/core/ledger.ts`, version `1`. An absent file is the empty Ledger, not a refusal.
The Ledger is **append-only, not chronological**: a Transaction is never edited or removed, a
correction is a new Transaction that `reverses` the original, and a Transaction dated before the last
one is legal (a back-dated import). A Category is a separate appended `Categorisation`, not a field
on the Transaction, so categorising edits nothing. `amount` is signed: money out is negative. Nothing
in the projection reads the Ledger.

| Refusal | Fires when | Status |
|---|---|---|
| **`LedgerFileShapeError`** | The file is not an object, lacks one of `version`, `transactions`, `categorisations`, adds a top-level key beyond those and the optional `importMappings` (P11-2) and `categorisationRules` (P11-6), or a list is not an array | **BUILT** — `src/core/ledger.ts` |
| **`LedgerFileVersionError`** | `version` is anything other than `LEDGER_FILE_VERSION` (1). Refused by name; never coerced | **BUILT** — `src/core/ledger.ts` |
| **`LedgerTransactionError`** | A Transaction lacks a field, carries an unknown one, or has one of the wrong type: an empty id, a date that is not zero-padded ISO, an amount that is not whole cents, an `origin` other than `manual` or `import` | **BUILT** — `src/core/ledger.ts` |
| **`LedgerCategorisationError`** | A Categorisation is malformed in the same ways, has a `category` outside Committed / Discretionary / One-off, names no Transaction in the Ledger, or carries a `ruleId` (P11-6) naming no rule record that suggests a category | **BUILT** — `src/core/ledger.ts` |
| **`LedgerDuplicateIdError`** | Two Transactions, two Categorisations, two ImportMappings, or two categorisation rules share an id — whether in a file or in an `appended` call | **BUILT** — `src/core/ledger.ts` |
| **`LedgerReversalError`** | A `reverses` names no EARLIER Transaction (itself, a later one or none), names one already reversed, or its amount is not the exact negation of the original | **BUILT** — `src/core/ledger.ts` |
| **`LedgerNotAnExtensionError`** | The writer (`saveLedger`, `src/app/ledgerStore.ts`) is handed a Ledger that is not the one last loaded plus records after it: a recorded Transaction, Categorisation, ImportMapping or categorisation rule edited, removed or moved. Refused before the transport is called, so nothing is written | **BUILT** — `src/core/ledger.ts` |

**Not a refusal: `LedgerWriteFailure`** (`src/app/ledgerStore.ts`), for the reason `PlanWriteFailure`
is not one.

### 11.3 CSV import (P11-2, 2026-09-28)

A bank CSV is read in the browser and appended through the §11.2 door. User rulings 2026-09-28: a
column mapping is saved IN `ledger.json` as an appended `ImportMapping` (last one for a format wins),
keyed by the header row's column names in any order, or — for a headerless export such as CommBank's
— by the column count plus a name the user gives the format, whose columns are then "Column 1" ….
Rows already imported are skipped by MULTISET on (date, cents, raw description, account): k copies in
the file over j imported copies held adds max(0, k − j); a hand-entered Transaction is never a copy.
A row that cannot be read is listed with its line number and reason, and nothing is appended until
the user presses "Import the N good rows". Dates are checked against the calendar; an amount with
more than two decimal places is unreadable, never rounded.

| Refusal | Fires when | Status |
|---|---|---|
| **`LedgerImportMappingError`** | A saved mapping carries both or neither of `header` and `formatName` + `columnCount`, both or neither of `amountColumn` and `debitColumn` + `creditColumn`, a header naming a column twice, a column its format does not have, or a `dateFormat` outside the four offered | **BUILT** — `src/core/ledger.ts` |
| **`CsvSyntaxError`** | A quote opens and never closes, so the file cannot be split into rows at all. The whole file is refused, naming the line the quote opened on, and nothing is written | **BUILT** — `src/app/csv.ts` |

### 11.4 Categorisation rules and subcategories (P11-5/P11-6, 2026-09-28)

ADR-0004: a rule SUGGESTS, and never writes a Categorisation by itself. A rule is a case-insensitive
piece of the raw description, optionally held to one account label, and the Category (with an
optional subcategory) it suggests. Rules are the optional `categorisationRules` list in `ledger.json`
(version unchanged, written only once a rule exists, so an older ledger round-trips to its own bytes;
an older build refuses the key by name). Appended, never edited: the last record for a text (case
ignored) and account is the rule; retiring one is a record carrying `retired: true`. User ruling
2026-09-28: what a rule matches is reviewed as ONE batch — Accept all appends one Categorisation per
member carrying the rule record's `ruleId`; Reject writes nothing, and the batch is set aside for
that page only (re-offered after a reload or when its members change; retire the rule to stop it).
A Transaction whose current Categorisation has no `ruleId` (chosen by hand; every Categorisation
before P11-6) is in no batch. Where two live rules match one Transaction it is in the batch of the
rule saved most recently only, and both cards say so. An import only offers the batches. Subcategories
are free text under each Category, offered back from those already used; there is no separate store.

| Refusal | Fires when | Status |
|---|---|---|
| **`LedgerCategorisationRuleError`** | A rule record has blank `match` text, carries both or neither of `category` and `retired`, a `retired` other than `true`, a `subcategory` on a retirement, an empty `account`, or a `category` outside the three | **BUILT** — `src/core/ledger.ts` |

## 12. Aged care

**SLICE 1 (P14-1/P14-3, 2026-09-24): the sourced rates and their indexation ONLY.** No means test
module, no entries, no projection change — those are P14-4 onward. Source:
`docs/research/p14-aged-care-sources-2026-09-24.md` (every figure, its URL and its effective date)
and `docs/research/p14-aged-care-gate-2026-09-24.md` (the design and GO/NO-GO). Everything below is
`src/data/assumptions/agedCare.ts`.

### 12.1 The residential schedule — 20 Sep 2026

health.gov.au publishes ALL of the figures below in one PDF, three times a year (20 Mar / 1 Jul /
20 Sep) — one calendar, unlike the Age Pension's two. `primary-verified`, retrieved 2026-09-24:
["Schedule of fees and charges for residential care, 20 September 2026"](https://www.health.gov.au/sites/default/files/2026-09/schedule_of_fees_and_charges_for_residential_care_20_september_2026.pdf).

| Figure | 20 Sep 2026 | Notes |
|---|---|---|
| Basic daily fee | $68.93/day | |
| Hotelling contribution | $22.15/day max | Means-tested, **uncapped** — payable for life, unlike the NCCC |
| Non-clinical care contribution (NCCC) | $109.45/day max | |
| NCCC lifetime cap | $140,652.80 | Same combined cap as Support at Home's standard lifetime cap (§12.5) |
| NCCC day cap | 1,460 days (4 years) | Whichever of the two caps binds first ends the fee |
| Income free area (single) | $36,454.60 | No couple figure sourced |
| Assets free area | $66,500.00 | |
| Home exemption cap ("first asset threshold") | $219,858.40 | The home's ASSESSED value is capped at this figure, not exempted below it |
| Max RAD without pricing approval | $789,686 | |

**P14-1 resolved, superseded once already.** concept.md carried two candidate figures for three of
these (income free area, home exemption cap, NCCC daily rate); the 1 Jul 2026 schedule confirmed
the first candidate of each pair was right **for that date**, and the 20 Sep 2026 indexation (four
days before this pass) moved all three again. The table above is the current one; concept.md's
pairs are both stale. TODO's "$130k indexed?" guess for the NCCC lifetime cap is dropped — the
actual figure is $140,652.80, not $130,000, and no primary source ever said $130k.

### 12.2 MPIR — quarterly, not on the schedule's own dates

The Maximum Permissible Interest Rate redetermines on the calendar quarter (1 Jan / 1 Apr / 1 Jul /
1 Oct), independently of the 20 Mar/1 Jul/20 Sep schedule cycle — its own calendar, same source PDF,
`primary-verified`:

| Effective | MPIR |
|---|---|
| 2026-07-01 | 8.43% |
| **2026-10-01** | **8.51%** |

`DAP = RAD × MPIR ÷ 365`, simple daily accrual, no compounding (quoted). Not computed against an
actual RAD in this slice (P14-8). **No formula or index links future MPIR to CPI or wages** — same
posture as `agePension.ts`'s deeming rates: a quarterly administrative determination, not a
statutory index, so only determined values are recorded and nothing here extrapolates past the
last one.

### 12.3 Forward indexation — UNVERIFIED, with ONE evidenced exception (the basic daily fee)

**Unlike the Age Pension's §4.7 (CPI, PBLCI, MTAWE, all named and cited to SSA 1991 ss 1195, 1197),
no linkage citation was retrieved for what index MOST of the residential schedule's figures move
by.** The 20 Sep 2026 research found three dated PDF snapshots, not a rule (P14-3, "still open
before coding").

**The basic daily fee is the one exception, `primary-verified` 2026-09-24.** It is not indexed by
the mechanism below at all. myagedcare.gov.au's "Aged care home costs and fees" page states, in one
sentence: *"The basic daily fee is set at 85% of the single person rate of the basic age pension.
The government indexes it on 20 March and 20 September each year."* Two known points reproduce the
published fee to the cent from `agePension.ts`'s own single maximum basic rate, floored (not
rounded — 20 Sep 2026 is exactly halfway and the published figure is the lower cent):

| Date | Single max basic rate | × 0.85 ÷ 14, floored | Published fee |
|---|---|---|---|
| 2026-09-20 | $1,135.40 | $68.935 → $68.93 | $68.93 ✓ |
| 2026-03-20 | $1,100.30 | $66.8032... → $66.80 | $66.80 ✓ |

Recorded as `agedCare.indexation.basicDailyFeeLinkage` (`basicDailyFeeFromPension`). Because the Age
Pension's basic rate is MTAWE-benchmarked (§4.7) and rises with wages, indexing the fee by CPI
alone — the previous, unsourced choice — systematically understated it: the flattering direction
this file otherwise guards against. Nothing else on the myagedcare.gov.au page is linked this
tightly: the hotelling supplement is described only as "means tested and indexed in March and
September each year" — a calendar, not a rate — and no income/assets free area or RAD figure is
mentioned there at all, so those stay on cautious CPI, unevidenced, as below.

**The choice for everything else, recorded as `agedCare.indexation.linkageUnknown` and
`agedCare.indexation.mechanism` (`indexAgedCareSchedule`), `unverified`:** project every dollar
figure EXCEPT the basic daily fee forward on the caller's own CPI movement — never wages — with the
rounding direction that cannot flatter the household on either side of the aged-care ledger:

- a figure the household **pays** (the hotelling contribution, the NCCC lifetime cap, the
  grandfathered caps, the home exemption cap — a HIGHER cap assesses more of the home) rounds
  **UP**, so a forecast never UNDER-states a cost;
- a figure that **protects** the household from assessment (the income and assets free areas, the
  max RAD without pricing approval) rounds **DOWN**, so a forecast never OVER-states a protection —
  the same direction `agePension.ts`'s `indexMeansTestParameters` floors its own free areas in.

The residual is bounded at one cent per figure per step, the same bound
`agePension.ts`'s `PUBLISHED_ROUNDING_STEPS` admission carries. ⚠️ **WIRED 2026-09-25 (P14-17) — see
§12.6.** Until then nothing in `src/` called `indexAgedCareSchedule` at all, and `project()` refused
outright any month with a resident in care past 19 Sep 2027 — the sentence that stood here, that
nothing consumes an aged care figure, is superseded rather than deleted because the gap it recorded
was real and the fix's own section explains what closed it.

**Periods are assembled by the SAME merge the Age Pension uses.** `mergeCalendarBoundaries`
(`src/data/assumptions/periods.ts`) was generalised out of `agePensionPeriods` for this slice — the
P14 gate's own condition for GO — and `agedCarePeriods` calls it over the schedule and MPIR
calendars exactly as `agePensionPeriods` calls it over the rate and means-test calendars. The
refactor is byte-identical for the Age Pension: the golden file and every existing Age Pension test
were run unchanged through it.

### 12.4 Grandfathering and RAD retention

**The one schedule PDF carries three tiers side by side**, `primary-verified`, retrieved
2026-09-24:

| Tier | Who | Caps (20 Sep 2026) |
|---|---|---|
| "1 November 2025" arrangements | New entrants, or opted in | §12.1's hotelling + NCCC |
| "post 1 July 2014" arrangements | Entered 1 Jul 2014 – 31 Oct 2025, did not opt in | Old means-tested care fee: lifetime cap **$88,934.57**, annual cap **$37,055.98**, both indexed 20 Sep 2026 |
| "pre 1 July 2014" arrangements | A third, older tier | Not carried in this file — no household fact reaches it |

Supersedes concept.md's $86,185.23 / $35,910.43 pair for the middle tier's two caps, which were the
1 Jul 2026 (not 20 Sep 2026) values for the same two figures.

**RAD retention**, `primary-verified`, [health.gov.au](https://www.health.gov.au/our-work/residential-aged-care/charging/rad-and-rac-retention):
quote — *"calculated daily at a rate of 2% per annum and it is limited to 5 years."* Applies to a
resident on 1 Nov 2025 arrangements who entered on/after 1 Nov 2025 (or opted in) — the source
phrases this by arrangement/entry-date, not simply "new entrants." concept.md's "max 10%" (5 × 2%)
is a **derived** figure, not a quoted one — the page never states 10% verbatim.

### 12.5 Support at Home — classification budgets only (P14-2 scope)

**Data only in this slice.** No contribution-bucket arithmetic (Clinical/Independence/Everyday
Living) is built — that is P14-11. The 8 classification budgets, `primary-verified`, "current as of
1 Jul 2026, next indexed 1 Jul 2027":

| Classification | Annual budget |
|---|---|
| 1 | $11,010.01 |
| 2 | $16,451.35 |
| 3 | $22,536.81 |
| 4 | $30,468.51 |
| 5 | $40,729.53 |
| 6 | $49,365.27 |
| 7 | $59,660.00 |
| 8 | $80,137.12 |

Updates concept.md's "$10,731 to $78,106", which was the 1 Nov 2025 launch figure — both are
primary-sourced, just for different dates.

**P14-2 — the 1 Oct 2026 reclassification is CONFIRMED and SCOPED NARROWER than concept.md
implies.** Personal care moves from the Independence contribution bucket (5–50%) to the Clinical
bucket (0%) — **Support at Home only**. Residential care (hotelling, NCCC) is explicitly untouched:
nothing in the 20 Sep 2026 residential schedule carves out personal care, and a secondary source
confirms the NCCC classification is unchanged by this reform. Recorded as
`agedCare.supportAtHome.reclassification1Oct2026`, effective 2026-10-01.

### 12.6 Forward indexation WIRED — the defect closed (P14-17, 2026-09-25)

**CRITICAL DEFECT, found at review 2026-09-25: aged care was unusable for any real plan.**
`AGED_CARE_PERIODS` covered exactly one published year (20 Sep 2026 – 19 Sep 2027), and `project()`
refused ANY month with a resident in care outside it (`projection.ts`, "aged care rates are
published only through…"). §12.3's `indexAgedCareSchedule` was built correctly in slice 1 but
**nothing called it** — a household stating care starting at age 85 in a plan running to 2056 hit a
hard refusal the moment the walk crossed 19 Sep 2027, which is within the first year of almost every
real projection.

**Fixed by mirroring `agePension.ts`'s own answer to the identical published-window problem** (§4.7,
`agePensionPeriodsThrough`/`defaultAgePensionSeries`): `agedCareScheduleThrough` and
`agedCarePeriodsThrough` (`data/assumptions/agedCare.ts`) extend the residential schedule forward on
its own 20 Mar / 1 Jul / 20 Sep calendar, all the way to the walk's own horizon, through the SAME
`mergeCalendarBoundaries` machinery `agedCarePeriods` already used (the P14 gate's own "generalise,
don't hand-roll a third" condition, unbroken by this fix).

**Each generated set is `indexAgedCareSchedule(previous, cpi, projectedSingleBasicPensionRate)`,
cumulative — one step per schedule date, indexed from the set immediately before it, never from the
2026-09-20 origin in one jump.** The per-step CPI movement is `core/priceLevel.ts`'s
`priceLevelFactor`, run from the PREVIOUS generated (or published) schedule date to the new one — the
one CPI-compounding expression this project has, not a second copy of it. The basic daily fee's own
pension linkage (§12.3) is honoured exactly as documented: `singleMaximumBasicRateAt` is a callback
`project()` supplies from the SAME `indexationSeries` (stated or generated, register O5) the walk
pays the Age Pension line from — `agePensionPeriodAt(date, indexationSeries).rates.maximumBasicRate.single`
— so the basic fee tracks the pension this walk actually pays, never a second, independent forecast
of it.

**The MPIR is deliberately NOT extended.** No linkage citation was ever retrieved for it (§12.2), and
it is fixed per resident at the date they enter care anyway, so a forward rule would have nothing to
apply to a resident already admitted. It is simply left to hold at its last determined quarter
(1 Oct 2026, 8.51%) — `agedCarePeriods`'s own `mergeCalendarBoundaries`/`latestOnOrBefore` already
resolves any later boundary's MPIR to the last one on the (unextended) MPIR table, so no new code
states the holding rule a second time.

**`agedCareParametersCover` narrowed to ONE bound.** Before this fix it checked both ends of
`AGED_CARE_PERIODS`; now, exactly as `agePensionParametersCover` has read since the Age Pension's
own standing table (§4.1's P4-1e note), the mechanism runs FORWARD from a published set and never
backwards, so only the LOWER bound (a date before 20 Sep 2026, nothing published) can still refuse.
`agedCareProvenance` marks a generated period `unverified` and its `determination` states in words
that the schedule for that date is PROJECTED, not published — `agePensionProvenance`'s own
`AGE_PENSION_GENERATED_KEY` shape, reused rather than re-invented.

**Unchanged, verified explicitly:** the published 2026-09-20 figures are byte-identical whether or
not a forward schedule is generated past them (`test/assumptions-aged-care.test.mjs`), and
`fixtures/golden/demo-couple.golden.json` — which states no `ENTER_CARE` at all — stays byte-identical
(`test/golden-demo-couple.test.mjs`). This also lifts the bound `test/core-projection-aged-care.test.mjs`
noted at P14-5a: a `DEATH` removing the last person protecting a home can now be walked the full 24
months through the vacated-home cliff without the old one-year aged-care ceiling cutting the walk off
first — a literal version of that scenario (a couple, one dies, the survivor already in care) is
pinned beside the single-Person stand-in the earlier slice used.

**Mutation-tested** (isolated scratchpad copy, per the mutation protocol): generation disabled past
the published year turned 4 tests red; the basic fee wired to a fixed figure instead of the
projected pension rate turned 2 tests red. Both reverted before this change was committed.
