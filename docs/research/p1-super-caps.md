# P1-3 / P1-4 — Superannuation caps, Division 296 and Division 293

**Scope:** FY2026-27 (the forecast's first financial year).
**Retrieval date for every figure below:** 2026-09-03.
**Terminology:** per `CONTEXT.md` — *Person*, *Total Super Balance*, *Transfer Balance Cap*,
*Accumulation Phase*, *Retirement Phase*, *Account-Based Pension*. Every figure here is assessed
per Person, never per Household.

## 0. Source access — correction to the concept doc

`concept.md` §6 records that **ato.gov.au blocks automated fetch**. That is true of the
WebFetch path (HTTP 403) but **not** of a plain `curl` with a browser `User-Agent`, which
returns HTTP 200 on every ATO page tried. **Every ATO figure below was read off the live ATO
page, not a secondary source.** The §6 note should be amended: ATO is reachable; the earlier
cfs.com.au sourcing is no longer needed and the caps are now ATO-confirmed.

`legislation.gov.au` is an Angular SPA and returns only a shell to a naive fetch, but it exposes
two usable primary routes:
- OData API — `https://api.prod.legislation.gov.au/v1/titles?$filter=…`
- Authorised PDF — `https://www.legislation.gov.au/{id}/{asAt}/{date}/text/original/pdf[/{volume}]`

Division 296 and Division 293 below are read from the **authorised PDF of the Act itself**, not
from commentary.

### Primary documents used

| Document | Register ID | Version read |
|---|---|---|
| Treasury Laws Amendment (Building a Stronger and Fairer Super System) Act 2026 | C2026A00008 | As made, assented 13 Mar 2026, registered 16 Mar 2026 |
| Superannuation (Building a Stronger and Fairer Super System) Imposition Act 2026 | C2026A00009 | As made, assented 13 Mar 2026 |
| Income Tax Assessment Act 1997 | C2004A05138 | Compilation No. 266, compilation date **1 July 2026** (C2026C00324) |
| Superannuation Guarantee (Administration) Act 1992 | C2004A04402 | Compilation No. 78, compilation date **1 July 2026** (C2026C00272) |
| Income Tax Rates Act 1986 | C2004A03348 | Compilation No. 66, compilation date **1 July 2026** (C2026C00300) |
| Superannuation (Sustaining the Superannuation Contribution Concession) Imposition Act 2013 | C2013A00087 | As made; never amended |
| Income Tax Assessment (1997 Act) Amendment (Building a Stronger and Fairer Super System and Other Measures) Regulations 2026 | F2026L00726 | Made 11 Jun 2026, registered 18 Jun 2026 |

---

## 1. Contributions caps — P1-3

| Figure | Value | FY | Config / constant | Confidence |
|---|---|---|---|---|
| Concessional contributions cap | **$32,500** | 2026-27 | **config** — indexed | primary-verified |
| Non-concessional contributions cap | **$130,000** | 2026-27 | **config** — derived, 4× concessional cap | primary-verified |
| General Transfer Balance Cap | **$2,100,000** | 2026-27 | **config** — indexed | primary-verified |
| Contributions tax (fund low tax component) | **15%** | 2026-27 | **constant** — structural | primary-verified |
| Non-arm's-length / non-complying fund rate | 45% | 2026-27 | constant | primary-verified |
| Fund earnings tax, Retirement Phase (ECPI) | 0% | 2026-27 | constant | primary-verified (exempt current pension income, ITAA 1997 ss 295-385/295-390) |

**Sources**

- Concessional cap value — ATO, *Key super rates and thresholds → Contributions caps*, Table 1.1,
  page last updated 24 April 2026:
  https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps
  Text on that page: *"From 1 July 2026 the general concessional contributions cap is $32,500 as a
  result of indexation in line with average weekly ordinary time earnings (AWOTE)."*
- Concessional cap law — ITAA 1997 **s 291-20(2)**: base $25,000 for 2017-18, indexed annually
  thereafter. Compilation No. 266: https://www.legislation.gov.au/C2004A05138/latest/text
- NCC cap value — ATO, same page, Table 4 (2026-27 → $130,000).
- NCC cap law — ITAA 1997 **s 292-85(2)(a)**: the general non-concessional contributions cap is
  **4 × the concessional contributions cap under s 291-20(2)** for the year (ignoring any
  carry-forward increase under s 291-20(4)). 4 × $32,500 = $130,000. ✔
- General Transfer Balance Cap value — ATO, *Key super rates and thresholds → Transfer balance
  cap*, Table 26 (2026-27 → $2.1m), page last updated 27 April 2026:
  https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/transfer-balance-cap
- General Transfer Balance Cap law — ITAA 1997 **s 294-35(3)**: base $1,600,000 for 2017-18,
  indexed annually.
- Contributions tax 15% — Income Tax Rates Act 1986 **s 26(1)(a)**: *"in respect of the low tax
  component—15%"*: https://www.legislation.gov.au/C2004A03348/latest/text
- Independent cross-check on all three caps: Morningstar Australia, "Key changes to 2026/27 super
  thresholds", and Grant Thornton Australia client alert — both agree ($32,500 / $130,000 / $2.1m).
  Secondary; used only to corroborate, not to source.

### 1.1 Indexation mechanics — the part the forecaster actually needs

All of these index under **ITAA 1997 Subdivision 960-M, s 960-285** (compilation 266, vol 10).
The mechanics are identical for every cap; only the index, base amount, base quarter and
rounding amount differ.

```
indexation_factor = index_number(quarter ending 31 December immediately before the
                                 start of the relevant financial year)
                  / index_number(base quarter)          # s 960-285(5)

indexation_factor is computed to 3 decimal places, rounding up
if the 4th decimal is >= 5                                # s 960-285(6)

if indexation_factor <= 1: cap is NOT indexed             # s 960-285(4)

capped_amount = floor_to_multiple(base_amount * indexation_factor,
                                  rounding_amount)        # s 960-285(2)
```

**Critical modelling point.** Indexation is computed **cumulatively from the original base amount
and base quarter every year** — it is *not* a year-on-year chain off last year's cap. A forecaster
that multiplies last year's cap by an annual factor and re-rounds will drift, because the
round-down is applied once to the cumulative product, not repeatedly. Project the index number
forward, then apply the formula above against the fixed base.

| Cap | s 960-265 item | Index | Base amount | Base quarter | Rounding (floor) |
|---|---|---|---|---|---|
| Concessional contributions cap | 9 | **AWOTE** (s 960-280(4)) | $25,000 (2017-18) | quarter ending **31 Dec 2016** | **$2,500** |
| General Transfer Balance Cap | 10A | **CPI** (s 960-280(1)) | $1,600,000 (2017-18) | quarter ending **31 Dec 2016** | **$100,000** |
| Large super balance threshold (Div 296) | 10B | **CPI** (s 960-280(1)) | $3,000,000 (2026-27) | quarter ending **31 Dec 2025** | **$150,000** |
| Very large super balance threshold (Div 296) | 10C | **CPI** (s 960-280(1)) | $10,000,000 (2026-27) | quarter ending **31 Dec 2025** | **$500,000** |
| Non-concessional contributions cap | — | not separately indexed | — | — | **derived: 4 × concessional cap** ⇒ moves in $10,000 steps |

**Index definitions (primary):**
- **CPI index number** (s 960-280(1)) — the All Groups Consumer Price Index number, weighted
  average of the 8 capital cities, **as first published** by the Australian Statistician for the
  quarter. If the ABS re-bases, only index numbers in the new reference period are used after the
  change (s 960-280(3)).
- **AWOTE index number** (s 960-280(4)) — the estimate of **full-time adult average weekly
  ordinary time earnings for the middle month of the quarter, as first published**. For the
  December quarter that is the **November** reference month. First-published figures are used;
  ABS historical revisions are explicitly ignored (ATO, *Other super rates and thresholds*).
  s 960-280(3) re-basing rule does **not** apply to AWOTE (s 960-280(5)).

**Verification of the algorithm against known outcomes.** Using AWOTE from ATO Table 40
(*Other super rates and thresholds*: Dec 2016 = $1,533.40; Dec 2024 = $1,975.80;
Dec 2025 = $2,051.10):

- 2025-26: 1975.80 / 1533.40 = 1.28853 → **1.289**; $25,000 × 1.289 = $32,225 → floor to $2,500 →
  **$30,000** ✔ (matches the published 2025-26 cap)
- 2026-27: 2051.10 / 1533.40 = 1.33765 → **1.338**; $25,000 × 1.338 = $33,450 → floor to $2,500 →
  **$32,500** ✔ (matches the published 2026-27 cap)

The implementation above reproduces both published caps exactly. Treat it as the reference
algorithm and unit-test it against these two cases.

AWOTE source table:
https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/other-super-rates-and-thresholds

---

## 2. Bring-forward — Total Super Balance tiers

| Total Super Balance at 30 June 2026 | NCC cap, first year | Bring-forward period | FY | Config / constant | Confidence |
|---|---|---|---|---|---|
| < $1,840,000 | **$390,000** | 3 years | 2026-27 | **config** | primary-verified |
| $1,840,000 to < $1,970,000 | **$260,000** | 2 years | 2026-27 | **config** | primary-verified |
| $1,970,000 to < $2,100,000 | **$130,000** | none — general cap applies | 2026-27 | **config** | primary-verified |
| ≥ $2,100,000 | **nil** | not applicable | 2026-27 | **config** | primary-verified |

**Sources**
- ATO, *Non-concessional contributions cap* — table "Bring-forward cap first year (applying to
  2026–27 and later years)":
  https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/non-concessional-contributions-cap
  The page states explicitly: *"These limits are based on the non-concessional contributions cap
  being $130,000 from 1 July 2026 and the general transfer balance cap being $2.1 million."*
- Law: ITAA 1997 **s 292-85(2)–(7)**.

**The tiers are derived, not hard-coded in the Act.** Do not store them as literals — they fall
out of the cap and the Transfer Balance Cap and will move with both. The generating rule
(s 292-85):

```
GTBC          = general Transfer Balance Cap for the first year          # $2,100,000
gen_cap       = 4 * concessional_cap                                     # $130,000
cap_space     = GTBC - TSB(immediately before start of the first year)   # s 292-85(3)(e)

if TSB >= GTBC:                       cap = 0            # s 292-85(2)(b)
elif cap_space >  2 * gen_cap:        cap = 3 * gen_cap  # s 292-85(5)(b) — 3-year
elif cap_space >  1 * gen_cap:        cap = 2 * gen_cap  # s 292-85(5)(a) — 2-year
else:                                 cap = gen_cap      # no bring-forward
```

Note the inequalities are **strict** ("exceeds"). At TSB exactly $1,840,000 the cap space is
exactly $260,000, which does *not* exceed 2 × $130,000 — so that Person gets the **2-year**
arrangement, matching the ATO table's "$1.84 million to less than $1.97 million" band. The
derived boundaries $1,840,000 / $1,970,000 / $2,100,000 reproduce the ATO table exactly.

**Other bring-forward rules that must be modelled (all ITAA 1997 s 292-85, primary-verified):**
- **Age gate:** the Person must be **under 75 at any time in the first year** (s 292-85(3)(c)).
  Constant — this age is written into the Act, not indexed.
- **Trigger:** the arrangement is triggered by actually contributing more than the general cap in
  the first year (s 292-85(3)(a)) — it is not elective.
- **Frozen cap:** once triggered, indexation of the NCC cap during the bring-forward period does
  **not** apply. The total is the first-year cap × 3 (or × 2), not a sum of each year's indexed
  cap. ATO worked example: $390,000, not $410,000.
- **Second/third-year cut-out:** the remaining cap for year 2 or 3 is **reduced to nil** if the
  Person's Total Super Balance at 30 June of the previous year is ≥ the general Transfer Balance
  Cap for that year (s 292-85(6)(a), (7)(a)).
- **Non-concessional cap is nil outright** for a year where Total Super Balance at the immediately
  preceding 30 June ≥ the general Transfer Balance Cap for that year (s 292-85(2)(b)).

---

## 3. Carry-forward concessional

| Figure | Value | FY | Config / constant | Confidence |
|---|---|---|---|---|
| Total Super Balance test for carry-forward eligibility | **< $500,000** | 2026-27 | **constant** — a fixed figure in the Act, **no indexation provision** | primary-verified |
| Test date | Total Super Balance **just before the start of the financial year** (i.e. 30 June immediately prior) | 2026-27 | constant | primary-verified |
| Look-back window | **previous 5 financial years** | 2026-27 | constant | primary-verified |
| Application order | **earliest year first** | 2026-27 | constant | primary-verified |
| Earliest year that can generate unused cap | **2018-19** | — | constant | primary-verified |

**Source:** ITAA 1997 **s 291-20(3)–(7)**, compilation 266 (1 July 2026).
Cross-check: ATO, *Contributions caps*, "Unused concessional cap carry forward":
*"From 1 July 2018 if you have a total superannuation balance of less than $500,000 on 30 June of
the previous financial year… Unused amounts are available for a maximum of 5 years, after which
they will expire."*

The **$500,000** figure is **not** in the s 960-265 indexation table and s 291-20(3)(b) states a
bare dollar amount. It is a constant that only Parliament can move — but for a 40-year forecast it
is a *nominal* constant, so its real value erodes and more Persons fall inside it over time. Flag
it in the assumptions object as legislated-fixed rather than truly structural.

The carry-forward increase is explicitly **excluded** from the calculation of the non-concessional
cap (s 292-85(2)(a) note) — carrying forward concessional cap does **not** enlarge the NCC cap.

---

## 4. Superannuation Guarantee

| Figure | Value | FY | Config / constant | Confidence |
|---|---|---|---|---|
| SG charge percentage | **12%** | 2026-27 | **config** — legislated, currently flat | primary-verified |
| SG earnings base | **qualifying earnings** (replaces ordinary time earnings from 1 July 2026) | 2026-27 | **constant** — structural | primary-verified |
| SG payment frequency | **each payday** (Payday Super) | 2026-27 | constant | primary-verified |
| Maximum contributions base | **$270,830 per financial year, per employer** | 2026-27 | **config** — derived from the concessional cap | primary-verified |
| Norfolk Island transitional SG rate | 11% | 2026-27 | config | primary-verified (not relevant to this Household) |

**Sources**
- SGAA 1992 **s 17A(2)**: *"charge percentage means 12."* — a flat number, no year table.
  Compilation 78, compilation date 1 July 2026:
  https://www.legislation.gov.au/C2004A04402/latest/text
- ATO, *Key super rates and thresholds → Super guarantee*, Table 21 (1 July 2026 – 30 June 2027 →
  12.00%; 1 July 2027 onwards → 12.00%):
  https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
- Maximum contributions base — SGAA 1992 **s 10A(5)**:
  `concessional contributions cap × 100 ÷ charge percentage`, **rounded down to the nearest $10**.
  $32,500 × 100 ÷ 12 = $270,833.33 → **$270,830** ✔ matches ATO Table 23.

**Two structural changes at 1 July 2026 the forecaster must not miss (Payday Super, inserted by
Act No. 57, 2025):**

1. **The SG base changed from *ordinary time earnings* to *qualifying earnings*** (SGAA s 10A(1)).
   Notably, **a salary-sacrificed amount is itself a payment of qualifying earnings**
   (s 10A(1)(h), s 10A(4)(b)) — so sacrificing salary no longer reduces the SG base. If the model
   computes SG on post-sacrifice salary, it will now understate employer contributions.
2. **The maximum contributions base is now an annual, per-employer figure**, not a quarterly one
   (s 10A(5)–(6)). Pre-1 July 2026 it was $62,500 per quarter. A model carrying the quarterly
   construct forward will be wrong from FY2026-27 on.

Both are **config**, not constant: the maximum contributions base is a pure function of the
concessional cap and so re-indexes every time the cap does.

---

## 5. Division 293 — P1-4

| Figure | Value | FY | Config / constant | Confidence |
|---|---|---|---|---|
| Division 293 threshold | **$250,000** | 2026-27 (and 2017-18 onwards) | **constant** — bare figure in the Act, **not indexed** | primary-verified |
| Division 293 rate | **15%** | 2026-27 | **constant** | primary-verified |
| Income base | *income for surcharge purposes* (**disregarding reportable superannuation contributions**) **+** *low tax contributions* | 2026-27 | constant — structural | primary-verified |
| Taxable contributions | the **lesser** of (a) low tax contributions and (b) the excess over $250,000 | 2026-27 | constant | primary-verified |
| Low tax contributions | low tax contributed amounts **less excess concessional contributions** | 2026-27 | constant | primary-verified |

**Sources**
- ITAA 1997 **s 293-20(1)**: *"exceeds $250,000, you have taxable contributions for the income
  year equal to the lesser of the low tax contributions and the amount of the excess."*
  Compilation 266 (1 July 2026).
- ITAA 1997 **s 293-25**: low tax contributions = low tax contributed amounts (s 293-30) less
  excess concessional contributions.
- Rate — Superannuation (Sustaining the Superannuation Contribution Concession) Imposition Act
  2013 **s 5**: *"The amount of the tax is 15% of a person's taxable contributions for an income
  year."* https://www.legislation.gov.au/C2013A00087/latest/text
- ATO cross-check: *"The rate of Division 293 tax is 15%"*, Table 7 threshold $250,000 for
  2017-18 onwards:
  https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax

**The $250,000 threshold appears nowhere in the s 960-265 indexation table.** `concept.md`'s
"not indexed — pure creep" is confirmed against primary source. Over a 40-year nominal projection
this is a genuine, compounding effect on any working Person with a high salary — model it, do not
inflate it.

**Modelling note (already flagged in `concept.md` §5.4, and correct):** the income base
*disregards* reportable superannuation contributions and then adds back low tax contributions, so
the Division 293 income base and the personal income tax base must be tracked **separately**.

---

## 6. Division 296 — P1-4

**Answer to the critical question up front: Division 296 IS indexed, to CPI.** The concept doc's
"yes — CPI, $150k/$500k steps" is confirmed against the Act. There is no materially different
forecast to report.

| Figure | Value | FY | Config / constant | Confidence |
|---|---|---|---|---|
| Large super balance threshold (LSBT) | **$3,000,000** | 2026-27 | **config** — indexed to CPI | primary-verified |
| Very large super balance threshold (VLSBT) | **$10,000,000** | 2026-27 | **config** — indexed to CPI | primary-verified |
| Base rate | **15%** of *taxable superannuation earnings* | 2026-27 | **constant** | primary-verified |
| Additional rate | **+10%** of the *very large super balance earnings component* | 2026-27 | **constant** | primary-verified |
| Commencement of Schedule 1 | **1 April 2026** | — | constant | primary-verified |
| First income year of application | **2026-27** | — | constant | primary-verified |
| Basis of "earnings" | **realised** — derived from the fund's taxable income; **unrealised gains are NOT included as enacted** | 2026-27 | constant — structural | primary-verified |

**Sources**
- Thresholds and structure — Treasury Laws Amendment (Building a Stronger and Fairer Super System)
  Act 2026 (**C2026A00008**), Schedule 1, inserting ITAA 1997 Division 296. Authorised PDF:
  https://www.legislation.gov.au/C2026A00008/asmade/2026-03-13/text/original/pdf
  (landing page: https://www.legislation.gov.au/C2026A00008/asmade/text)
  Also now consolidated into ITAA 1997 compilation 266, vol 6, ss 296-30 / 296-35.
- Rates — Superannuation (Building a Stronger and Fairer Super System) Imposition Act 2026
  (**C2026A00009**), **s 5**:
  https://www.legislation.gov.au/C2026A00009/asmade/text
- ATO cross-check:
  https://www.ato.gov.au/about-ato/new-legislation/in-detail/superannuation/better-targeted-superannuation-concessions

### 6.1 Indexation — confirmed against the Act, not commentary

Items **17–22** of Schedule 1 to C2026A00008 insert the Division 296 thresholds into the ITAA
indexation machinery:

- Item 17 inserts s 960-265 table items **10B** (LSBT → s 296-30) and **10C** (VLSBT → s 296-35).
- Items 18–19 add s 960-285(3)(c): the **base amount** is *"the amount for the 2026-27 income
  year"* — i.e. $3,000,000 and $10,000,000.
- Items 20–21 add s 960-285(5)(c): the **base quarter** is *"the quarter ending on 31 December
  2025"*.
- Item 22 adds table rows 4 and 5 to s 960-285(7):
  - item 10B → index number is *"the index number mentioned in subsection 960-280(1) (**which is
    about the CPI**)"*, rounding amount **$150,000**
  - item 10C → same CPI index number, rounding amount **$500,000**

So both thresholds index on the **same s 960-285 machinery as every other cap**: CPI All Groups
(8-capital-city weighted average), factor to 3 dp against the December-2025 base quarter, floor to
the rounding amount, and **no indexation if the factor is ≤ 1** (thresholds cannot fall).

Both ss 296-30 and 296-35 carry the standard note: *"annual indexation does not necessarily
increase the amount of the threshold: see section 960-285."*

**These are CPI, not AWOTE.** Note that this differs from the concessional cap (AWOTE) and matches
the general Transfer Balance Cap (CPI). Three different index/step combinations coexist in the
model — do not share one indexation routine's parameters across them.

### 6.2 Unrealised gains — NOT included as enacted

The 2023 exposure draft computed "earnings" from the **movement in Total Super Balance**, which
swept in unrealised gains. **The Act as passed does not.** Under ITAA 1997 **s 296-60(1)**,
*Division 296 fund earnings* for a superannuation entity is:

```
relevant taxable income or loss
  - assessable contributions
  + net exempt current pension income
  - the entity's non-arm's-length component
  + pooled superannuation trust component
```

where *relevant taxable income or loss* is the entity's **taxable income** for the year (or its
tax loss expressed as a negative). This is realised, tax-return income — interest, dividends,
rent and **realised** capital gains — not a balance movement. `concept.md`'s "+15% on realised
earnings" is correct as enacted.

Attribution to the individual Person's interest is under **s 296-65(3)**: *"determined on a fair
and reasonable basis, having regard to the matters prescribed by the regulations"*, with a
separate prescribed method for small superannuation funds (SMSFs) under s 296-65(5).

### 6.3 How the tax is actually computed — the structure matters

Two percentages are computed and **both are applied to the same base** (*total superannuation
earnings for the year*). This is **not** a marginal-band calculation over earnings.

```
TSB_ref  = max(TSB just before start of year, TSB at end of year)      # s 296-40(2)

# taxable superannuation earnings — s 296-40
if TSB_ref > LSBT and total_super_earnings > 0:
    pct_LSBT  = round_2dp((TSB_ref - LSBT) / TSB_ref * 100)            # s 296-40(2),(3)
    taxable_super_earnings = pct_LSBT / 100 * total_super_earnings

# very large super balance earnings component — s 296-45
if TSB_ref > VLSBT:
    pct_VLSBT = round_2dp((TSB_ref - VLSBT) / TSB_ref * 100)           # s 296-45(2),(3)
    vlsbt_component = pct_VLSBT / 100 * total_super_earnings

# tax — Imposition Act 2026 s 5
tax = 0.15 * taxable_super_earnings + 0.10 * vlsbt_component
```

- Percentages are rounded to **2 decimal places, rounding up if the third decimal is ≥ 5**
  (ss 296-40(3), 296-45(3)).
- The VLSBT component is an **additional** slice on the same earnings, not a replacement — hence
  the widely quoted "30% / 40% effective". Those effective figures assume the fund also paid 15%
  on the same earnings; they are commentary framing, **not rates in the Act**.
- **Total Super Balance is taken to be nil after death** (s 296-50).

**Transitional rule for 2026-27 only** — Income Tax (Transitional Provisions) Act 1997
**s 296-1(2)**: for the 2026-27 income year the *"just before the start of the year"* limb is
struck out, so liability and the percentages are worked out on the **end-of-year Total Super
Balance alone (30 June 2027)**. From 2027-28 the test is the **greater of** opening and closing
Total Super Balance. `concept.md`'s "first assessment on TSB at 30 Jun 2027" is right, but the
one-year-only nature of the single-date test is not currently recorded and should be.

**Exclusions (ss 296-20, 296-25):** no liability for a Person who is a child recipient of a
superannuation income stream at any time in the year, or in respect of whom a structured
settlement contribution has ever been made.

### 6.4 Transitional CGT phase-in — regulations ARE made

Income Tax (Transitional Provisions) Act 1997 **s 296-60(2)** discounts net capital gains by a
factor prescribed by regulation for the first four years. Those regulations have been made:
**F2026L00726**, reg **296-60.01** (registered 18 June 2026):

| Income year | Prescribed net-capital-gain factor |
|---|---|
| 2026-27 | **0.2** |
| 2027-28 | **0.4** |
| 2028-29 | **0.6** |
| 2029-30 | **0.8** |
| 2030-31 onwards | no discount (provision spent) |

Config. **Does not apply to a small superannuation fund** (s 296-60(3)) — SMSFs instead get a
cost-base reset at 30 June 2026 under transitional s 296-50.
https://www.legislation.gov.au/F2026L00726/asmade/text

### 6.5 Total Super Balance definition changed at 1 July 2026

Schedule 2 of C2026A00008 rewrites the Total Super Balance definition and inserts ITAA 1997
**s 307-230A** *total superannuation balance value*. The default (s 307-230A(1)(b)) is the total
superannuation benefits that **would become payable if the Person voluntarily caused the interest
to cease at that time** — a withdrawal-benefit test, replacing the old *accumulation phase value*
construct (that definition is repealed). Applies to any time **just before, or on or after,
1 July 2026** (Schedule 2 item 10).

For a Household holding ordinary Accumulation Phase accounts and Account-Based Pensions this is
effectively the account balance and the model needs no change — but the definition now feeds the
bring-forward test, the carry-forward test **and** Division 296, so the change is worth a note in
the assumptions object.

---

## 7. Corrections to `concept.md` §5.3 / §6

| Line in concept.md | Status |
|---|---|
| Concessional cap $32,500, AWOTE, $2,500 steps | ✔ correct, now primary-verified; base quarter is **31 Dec 2016**, base amount **$25,000** |
| Non-concessional cap $130,000, 4× concessional | ✔ correct, primary-verified (s 292-85(2)(a)) |
| SG rate 12% | ✔ correct — but the **base changed to *qualifying earnings*** and the **maximum contributions base is now annual ($270,830)**, neither of which is recorded |
| Carry-forward: TSB < $500,000, 5-year look-back, oldest first, not indexed | ✔ correct, primary-verified |
| Bring-forward tiers <$1.84m / $1.84–1.97m / $1.97–2.1m / ≥$2.1m | ✔ correct, primary-verified — but store as **derived**, not literals; add the **under-75** age gate and the **frozen-cap** rule |
| Division 293: extra 15% where income + concessional > $250,000, not indexed | ✔ correct, primary-verified |
| General Transfer Balance Cap $2.1m, CPI, $100,000 steps | ✔ correct, primary-verified |
| Division 296: CPI, $150k/$500k steps | ✔ **correct** — confirmed against the Act, not commentary |
| Division 296: "law from 1 Jul 2026" | ✘ imprecise — Schedule 1 **commenced 1 April 2026**; it **applies to** the 2026-27 income year |
| Division 296: "+15% … $3m–$10m, +25% above $10m" | ⚠ numerically right, structurally misleading — the Act is 15% + an additional 10%, both applied to the **same** earnings base, not marginal bands |
| Division 296: "first assessment on TSB at 30 Jun 2027" | ✔ correct — add that the single-date test is **2026-27 only**; from 2027-28 it is max(opening, closing) |
| §6: "ato.gov.au blocks automated fetch" | ✘ **superseded** — ATO returns HTTP 200 to `curl` with a browser User-Agent; all caps above are ATO-sourced |

---

## 8. UNVERIFIED LIST

Nothing in the task brief was left secondary-sourced. What remains open is downstream of it.

1. **ABS index numbers themselves.** The indexation *mechanics* are primary-verified and the
   AWOTE series is ATO-published, but the **CPI All Groups index numbers** — Dec 2016 (base for
   the Transfer Balance Cap) and Dec 2025 (base for both Division 296 thresholds) — were not
   retrieved. `abs.gov.au` returned 404 on the CPI release path tried.
   *To close:* pull ABS catalogue **6401.0** (CPI, All Groups, weighted average of 8 capital
   cities, original, first-published) for the December 2016 and December 2025 quarters, and
   confirm the algorithm reproduces the published $2.0m (2025-26) and $2.1m (2026-27) Transfer
   Balance Caps — the same two-point check already done successfully for AWOTE. Also pull ABS
   **6302.0** for the AWOTE series so the projection isn't dependent on the ATO's table being
   updated.
2. **Division 296 attribution for small superannuation funds.** ITAA 1997 s 296-65(5) hands the
   method entirely to regulation. F2026L00726 was retrieved and contains regs 296-65.01,
   296-70.01 (prescribed factor **0.825**) and 296-70.02, but they were not read in full.
   *To close:* read F2026L00726 Schedule 1 in full if any Scenario ever puts a Person above $3m
   with an SMSF. Not blocking for this Household.
3. **Division 296 defined-benefit interests** (ss 296-70, 296-75) — read only far enough to
   confirm they exist. Out of scope for this Household; note as a known hole if a defined benefit
   interest is ever modelled.
4. **Payday Super "qualifying earnings" — full definition.** s 10A(1) has paragraphs (a)–(h) with
   exclusions in s 10A(3); only the salary-sacrifice limb (h) was read closely because it changes
   the model's behaviour. There is also an out-of-cycle determination **F2026L00784** that was
   found but not read.
   *To close:* read SGAA s 10A(1)–(3) in full before coding the SG base, if any Scenario involves
   bonuses, allowances or termination payments.
5. **Superannuation Guarantee rate beyond 2027-28.** SGAA s 17A(2) states a flat *"charge
   percentage means 12"* with no forward schedule, and ATO Table 21 shows 12.00% for "1 July 2027
   onwards". There is no legislated increase past 12%. Model it as config held flat, and record
   that holding it flat for 40 years is an assumption about future policy, not a legislated fact.

## 9. DISCREPANCIES

1. **ATO contradicts itself on the general Transfer Balance Cap.**
   The ATO *Contributions caps* page (last updated 24 April 2026) carries, in **present tense**:
   *"Note: The general transfer balance cap is $2 million from 1 July 2025."* The very next
   sentence uses the past tense correctly (*"From 1 July 2025 to 30 June 2026, the general
   transfer balance cap **was** $2 million"*) but never states the 2026-27 figure.
   The ATO *Transfer balance cap* page (updated 27 April 2026) tabulates **2026-27 → $2.1m**, and
   the ATO *Non-concessional contributions cap* page states *"the general transfer balance cap
   being $2.1 million."*
   **Resolution: $2,100,000 for FY2026-27**, on two of three ATO pages plus arithmetic consistency
   with the bring-forward tiers ($1.84m = $2.1m − $260k; $1.97m = $2.1m − $130k). The stale note is
   an un-updated sentence on the caps page, not a real conflict — but it is exactly the kind of
   thing that would have poisoned a single-source fetch.

2. **Division 296 rate structure — the Act versus universal commentary.**
   Commentary (William Buck, Grant Thornton, SuperGuide, and `concept.md`) describes Division 296
   as **"30% on $3m–$10m and 40% above $10m"**, or as *"+15% / +25%"*.
   The Imposition Act 2026 **s 5** says: **15%** of taxable superannuation earnings, **plus 10%**
   of the very large super balance earnings component.
   These reconcile to the same dollar figure, but the commentary framing implies **marginal bands
   over earnings**. The Act does not work that way: ss 296-40 and 296-45 each compute a proportion
   of the **same** total superannuation earnings figure, from two different threshold-vs-TSB
   ratios, and the two results are then taxed at 15% and 10% respectively. **A forecaster
   implemented from the commentary framing will produce wrong numbers above $10m.** Implement from
   §6.3 above.

3. **The task brief's own premise on Transfer Balance Cap indexation.**
   The brief states *"concessional and TBC index to AWOTE in $2,500/$100,000 steps respectively"*.
   That is wrong for the Transfer Balance Cap. Per s 960-285(7) table item 3, the general Transfer
   Balance Cap indexes to **CPI**, not AWOTE, in $100,000 steps. `concept.md` §5.3 already had
   this right ("yes — CPI, $100k steps"). Reported here only so the error does not propagate into
   the assumptions object.

4. **Division 296 commencement date.**
   `concept.md` and most commentary say Division 296 is "law from 1 July 2026". The Act's
   commencement table (s 2, item 2) gives Schedule 1's commencement as **1 April 2026** (tied to
   the Imposition Act). 1 July 2026 is the start of the first income year to which it *applies*
   (Income Tax (Transitional Provisions) Act 1997 s 296-1(1)). No numerical consequence, but the
   assumptions object should carry the application year, not a commencement date.

5. **"$3 million from 1 July 2026" framing.**
   The ATO page says the LSBT *"will be $3 million"* for 2026-27 and *"these thresholds will be
   indexed in line with CPI"* without stating the base quarter. The Act pins the base quarter to
   **31 December 2025**, which means the **first possible increase is for the 2027-28 income
   year**, and only if the Dec-2026 CPI has risen enough to lift $3,000,000 past $3,150,000 —
   i.e. an indexation factor of ≥ 1.050. On any plausible CPI path that is **not** a one-year
   move. The forecaster should expect the LSBT to sit at $3,000,000 for several years, then jump
   $150,000 at once. Modelling it as a smooth annual escalation would be materially wrong. The
   same "long plateau, then a step" shape applies to the VLSBT ($500,000 steps ⇒ a 5% cumulative
   CPI move needed) and, more gently, to the Transfer Balance Cap ($100,000 on $2.1m ⇒ ~4.8%).

---

*Compiled 2026-09-03. Every figure in §§1–6 marked primary-verified was read from either an
authorised legislation.gov.au PDF or a live ato.gov.au page on that date. Secondary sources appear
only as corroboration and are labelled as such.*
