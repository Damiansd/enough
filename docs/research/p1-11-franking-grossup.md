# P1-11 — Franking gross-up rate (chunk 1 of 3)

Scope of this chunk: **the gross-up formula, the corporate tax rate that feeds it, and the maximum
franking percentage.** Refundability, the 45-day holding rule, the small-shareholder exemption and
super-fund treatment are deliberately **out of scope** — chunks 2 and 3.

Retrieval date: **2026-09-04**. Target financial year: **FY2026-27** (1 Jul 2026 – 30 Jun 2027).

Terminology per `CONTEXT.md`. Note the unit mismatch that matters here: franking is a **company**
concept, but the amount that lands in the model is a **Person**-level assessable-income item. The
statute below sits entirely on the company side; the Person side is chunk 2.

---

## 0. Fetch note — how the primary text was obtained

`docs/research/p1-tax-offsets.md` §0 records that `curl` + browser User-Agent beats the WebFetch 403
on `ato.gov.au`. That still holds, with one refinement worth recording:

**The ATO Legal Database `?LocID=` URL form returns a page whose body never loads** (the section
title resolves in `<title>`, but the text is absent). The `?DocID=` form returns the full
consolidated section text in the initial HTML:

```
https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-20      # works
https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F207-20%22 # title only
```

`PAC/19970038/...` = ITAA 1997. `PAC/19860107/...` = Income Tax Rates Act 1986.

| Source | Result |
|---|---|
| `curl` + browser UA → ato.gov.au Legal Database, `?DocID=` form | **200 — full section text** |
| `curl` + browser UA → ato.gov.au guidance pages | **200 — full text** |
| legislation.gov.au HTML (`/latest/text`, `/latest/downloads`, `/latest/downloads/pdf`) | 200 but **SPA shell only** (~63 KB, no legislative text) |
| `api.prod.legislation.gov.au/v1/titles/...` and `/v1/titles(...)` | **404** |
| budget.gov.au | 200 — full text |

All statutory text below therefore comes from the **ATO Legal Database consolidation**, footered
*"This information is provided by CCH Australia Limited"*. Same caveat as the previous pass: it is
the ATO's legal database of record, but it is not the Federal Register's authorised compilation.
Every figure was independently corroborated against an ATO guidance page and, for the rates, against
Budget 2026-27. See UNVERIFIED LIST.

---

## 1. The gross-up — what actually happens (ITAA 1997 s 207-20)

**s 207-20 "General rule — gross-up and tax offset"**, verbatim:

> **207-20(1)** If an entity makes a \*franked distribution to another entity, the assessable income
> of the receiving entity, for the income year in which the distribution is made, **includes the
> amount of the \*franking credit on the distribution**. This is in addition to any other amount
> included in the receiving entity's assessable income in relation to the distribution under any
> other provision of this Act.
>
> **207-20(2)** The receiving entity is entitled to a \*tax offset for the income year in which the
> distribution is made. The tax offset is equal to the \*franking credit on the distribution.

So the "gross-up" is not a rate applied to a dividend. It is an **addition of the franking credit
amount** to assessable income:

```
grossed_up_dividend = franked_amount + franking_credit
```

There is no separate "gross-up rate" applied to the taxpayer's dividend. The rate lives one level
down, in how the *paying company* computes the franking credit it attaches. (What the s 207-20(2)
offset is then worth — refundable or not — is chunk 2. Do not read s 207-20(2) as settling that.)

| Name | Value / rule | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Franked distribution gross-up | Assessable income includes the franking credit, in addition to the distribution | 2026-27 | **formula** | [ITAA 1997 s 207-20(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-20) | 2026-09-04 | primary-verified |
| Franking tax offset | Offset = the franking credit on the distribution | 2026-27 | **formula** | [ITAA 1997 s 207-20(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-20) | 2026-09-04 | primary-verified |

---

## 2. The franking credit formula (ITAA 1997 ss 202-55, 202-60, 995-1)

Four provisions chain together. This chain **is** the answer to "what is the gross-up rate".

### 2.1 s 202-60(1) — the credit is what the statement says, capped

> The amount of the \*franking credit on a \*distribution is that stated in the \*distribution
> statement for the distribution, **unless that amount exceeds the \*maximum franking credit** for
> the distribution.

### 2.2 s 202-60(2) — the maximum franking credit

> The **maximum franking credit** for a \*distribution is worked out using the formula:
>
> `Amount of the *frankable distribution × 1 / Applicable gross-up rate`
>
> where **applicable gross-up rate** means the \*corporate tax gross-up rate **of the entity making
> the distribution** for the income year in which the distribution is made.

Note the italicised words: the rate is the **payer's**, for the year the distribution is made. Not
the recipient's, not a market-wide rate.

### 2.3 s 995-1 — corporate tax gross-up rate

> **corporate tax gross-up rate**, of an entity for an income year, means the amount worked out
> using the following formula:
>
> `(100% − Corporate tax rate for imputation purposes of the entity for the income year)
>   ÷ Corporate tax rate for imputation purposes of the entity for the income year`

### 2.4 s 202-55 — what the cap means, in plain words

> The maximum franking credit for a distribution is equivalent to **the maximum amount of income tax
> that the entity making the distribution could have paid**, at the entity's corporate tax rate for
> imputation purposes for the income year in which the distribution is made, on the profits
> underlying the distribution.

### 2.5 The composed formulas

Let `r` = the payer's corporate tax rate for imputation purposes (§3), `D` = the frankable
distribution (cash), `f` = the franking percentage (§4, 0 ≤ f ≤ 1).

```
gross_up_rate(r)          = (1 − r) / r                       # s 995-1
max_franking_credit(D, r) = D × 1 / gross_up_rate(r)
                          = D × r / (1 − r)                    # s 202-60(2), simplified
franking_credit(D, f, r)  = f × max_franking_credit(D, r)      # s 203-35 rearranged
                          = f × D × r / (1 − r)
grossed_up_income         = D + franking_credit(D, f, r)       # s 207-20(1)
                          = D × (1 + f·r/(1 − r))
```

Fully franked (`f = 1`) collapses to the familiar identity:

```
grossed_up_income = D / (1 − r)
```

Values at the two FY2026-27 corporate rates:

| `r` (imputation rate) | gross-up rate `(1−r)/r` | max credit per $1 cash `r/(1−r)` | fully-franked multiplier `1/(1−r)` |
|---|---|---|---|
| **30%** | 7/3 = 2.333333… | 3/7 = 0.428571… | 10/7 = 1.428571… |
| **25%** | 3 (exact) | 1/3 = 0.333333… | 4/3 = 1.333333… |

**Store the formula, not the table.** The rationals are exact; the decimals are not. The ATO's own
published worked examples get this wrong at the cent level — see DISCREPANCIES.

| Name | Value / rule | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Maximum franking credit | `frankable distribution × 1 / applicable gross-up rate` | 2026-27 | **formula** | [ITAA 1997 s 202-60(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-60) | 2026-09-04 | primary-verified |
| Corporate tax gross-up rate | `(100% − r_imp) / r_imp`, r_imp = payer's corporate tax rate for imputation purposes | 2026-27 | **formula** | [ITAA 1997 s 995-1](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1) | 2026-09-04 | primary-verified |
| Whose rate applies | The **entity making the distribution**, for the income year the distribution is made | 2026-27 | constant (rule) | [ITAA 1997 s 202-60(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-60) | 2026-09-04 | primary-verified |
| Gross-up rate @ r=30% | 2.333333… (= 7/3) — **derive, do not store** | 2026-27 | derived | s 995-1 + ITRA 1986 s 23(2)(b) | 2026-09-04 | primary-verified |
| Gross-up rate @ r=25% | 3 (exact) — **derive, do not store** | 2026-27 | derived | s 995-1 + ITRA 1986 s 23(2)(a) | 2026-09-04 | primary-verified |

Supporting: **s 202-5** — an entity *franks* a distribution if it is a resident franking entity, the
distribution is frankable, and it allocates a franking credit to it.
([s 202-5](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-5), primary-verified.)

---

## 3. The corporate tax rate — the base rate entity rule

This is **a rule, not a number**, and it is the part most likely to be mis-implemented. There are
**two distinct tests** using the same words, and they are answered from different years' data.

### 3.1 The rates themselves — ITRA 1986 s 23(2)

> **23(2)** The rate of tax in respect of the taxable income of a company is:
> (a) if the company is a **base rate entity** for a year of income — **25%**; or
> (b) otherwise — **30%**;
> if subsections (3) to (5) and section 23A do not apply to the company.

Amendment history confirms 25% has applied since 1 July 2021 (No 41 of 2017 as amended by No 134 of
2018, Sch 1 item 45, "effective 1 July 2021 and applicable to the 2021-22 year of income and later
years of income"). **No sunset, no scheduled step, and no Budget 2026-27 change** — see §3.5.

### 3.2 Base rate entity — ITRA 1986 s 23AA

> An entity is a **base rate entity** for a year of income if:
> (a) **no more than 80%** of its assessable income for the year of income is base rate entity
> passive income; **and**
> (b) its **aggregated turnover** (within the meaning of the ITAA 1997) for the year of income,
> worked out as at the end of that year, is **less than $50 million**.

Both limbs must hold. The $50 million is **hard-coded in the statute and is not indexed** — the
amendment history shows it was substituted for "$25 million" by No 41 of 2017 effective 1 July 2018,
and has not moved since. Store it as a config constant with no indexation rule attached.

### 3.3 Base rate entity passive income (BREPI) — ITRA 1986 s 23AB

Assessable income that is any of:

- (a) a distribution by a corporate tax entity, other than a non-portfolio dividend (ITAA 1936 s 317);
- (b) **an amount of a franking credit on such a distribution**;
- (c) a non-share dividend by a company;
- (d) interest (or a payment in the nature of interest), royalties and rent;
- (e) a gain on a qualifying security (ITAA 1936 Pt III Div 16E);
- (f) a **net capital gain**;
- (g) a partnership or trust distribution to the extent traceable (directly or through interposed
  partnerships/trusts) to any of the above.

s 23AB(2) carves interest out of (d) for financial institutions, registered finance providers,
Australian credit licensees/representatives, and financial services licensees covering securities —
and to the extent the interest is a return on an equity interest.

Note (b): the franking credit itself counts toward the 80% passive test. A company whose income is
mostly franked dividends fails the test on the grossed-up amount, not the cash.

### 3.4 Corporate tax rate **for imputation purposes** — ITAA 1997 s 995-1

**This is the rate that feeds §2, and it is not the company's actual tax rate for the year.**

> **corporate tax rate for imputation purposes**, of an entity for an income year, means:
> (a) unless paragraph (b) applies — the entity's \*corporate tax rate for the income year, worked
> out **on the assumptions that**:
>   (i) the entity's \*aggregated turnover for the income year is equal to its aggregated turnover
>   **for the previous income year**; and
>   (ii) the entity's base rate entity passive income … for the income year is equal to its base rate
>   entity passive income **for the previous income year**; and
>   (iii) the entity's assessable income for the income year is equal to its assessable income
>   **for the previous income year**; or
> (b) **if the entity did not exist in the previous income year** — the rate of tax … covered by
> paragraph 23(2)(a) of the Income Tax Rates Act 1986 [i.e. **25%**].

And **s 995-1 "corporate tax rate"**: (a) for a company to which ITRA s 23(2)(a) applies — the rate
under that paragraph [25%]; (b) for another entity — the rate under s 23(2)(b) [30%].

**The two tests, side by side:**

| | Company's actual tax rate for FY | Company's franking (imputation) rate for FY |
|---|---|---|
| Governing provision | ITRA 1986 s 23(2) + s 23AA | ITAA 1997 s 995-1 "…for imputation purposes" |
| Turnover tested | **current** income year, at year end | **previous** income year |
| BREPI / assessable income tested | **current** income year | **previous** income year |
| New entity (no prior year) | ordinary s 23AA test | **25% by default**, para (b) |

They can and do diverge — a company crossing $50m in the current year still franks at 25% that year.
The model only ever needs the **imputation** column.

### 3.5 Corroboration — ATO and Budget 2026-27

ATO *"Changes to company tax rates"* (QC 54063), **page last updated 4 September 2026** (i.e. today),
carries the progressive-change table:

| Income year | Aggregated turnover threshold | BRE rate | All other companies |
|---|---|---|---|
| 2017–18 | $25m | 27.5% | 30.0% |
| 2018–19 to 2019–20 | $50m | 27.5% | 30.0% |
| 2020–21 | $50m | 26.0% | 30.0% |
| **2021–22 and future years** | **$50m** | **25.0%** | **30.0%** |

"2021–22 and future years" covers FY2026-27 on its face, and the page was refreshed today.

Budget 2026-27 (`budget.gov.au`, "Tax reform" theme) announces **no change to the company tax rate
and no change to imputation**. The business measures are loss carry back (from 2026-27), start-up
loss refundability (from 2028-29) and a permanent $20,000 instant asset write-off (from 1 Jul 2026).
The page's own worked case study prices a small company's 2025-26 tax "at the 25% tax rate",
confirming the rate is live and unchanged.

### 3.6 Aggregated turnover — ITAA 1997 s 328-115

> Your **aggregated turnover** for an income year is the sum of the relevant annual turnovers …

being your own annual turnover plus that of any entity **connected with** you, or an **affiliate** of
yours, at any time during the income year (s 328-115(2)), less the exclusions in s 328-115(3)
(broadly, inter-entity dealings). Grouping is what pushes most listed-company subsidiaries over the
threshold.

| Name | Value / rule | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Full company tax rate | **30%** | 2026-27 | config | [ITRA 1986 s 23(2)(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23) · [ATO QC 54063](https://www.ato.gov.au/tax-rates-and-codes/company-tax-rate-changes) | 2026-09-04 | primary-verified |
| Base rate entity company tax rate | **25%** | 2026-27 | config | [ITRA 1986 s 23(2)(a)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23) · [ATO QC 54063](https://www.ato.gov.au/tax-rates-and-codes/company-tax-rate-changes) | 2026-09-04 | primary-verified |
| Aggregated turnover threshold | **$50,000,000**, not indexed | 2026-27 | config | [ITRA 1986 s 23AA(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AA) | 2026-09-04 | primary-verified |
| BREPI proportion threshold | **80%** ("no more than 80%") of assessable income | 2026-27 | config | [ITRA 1986 s 23AA(a)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AA) | 2026-09-04 | primary-verified |
| Base rate entity test | Both limbs: BREPI ≤ 80% of assessable income **and** aggregated turnover < $50m | 2026-27 | **formula** | [ITRA 1986 s 23AA](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AA) | 2026-09-04 | primary-verified |
| BREPI composition | Corporate distributions + their franking credits, non-share dividends, interest/royalties/rent, Div 16E gains, net capital gains, traceable trust/partnership amounts | 2026-27 | **formula** | [ITRA 1986 s 23AB](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F23AB) | 2026-09-04 | primary-verified |
| Imputation rate — year tested | **Previous** income year's turnover, BREPI **and** assessable income | 2026-27 | **formula** | [ITAA 1997 s 995-1](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1) | 2026-09-04 | primary-verified |
| Imputation rate — new entity | **25%** if the entity did not exist in the previous income year | 2026-27 | constant (rule) | [ITAA 1997 s 995-1 para (b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1) | 2026-09-04 | primary-verified |
| Aggregated turnover | Own annual turnover + connected entities + affiliates, less inter-entity amounts | 2026-27 | **formula** | [ITAA 1997 s 328-115](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F328-115) | 2026-09-04 | primary-verified |
| Company tax rate change in FY2026-27 | **None announced or legislated** | 2026-27 | — | [Budget 2026-27 Tax reform](https://budget.gov.au/content/04-tax-reform.htm) · [ATO QC 54063](https://www.ato.gov.au/tax-rates-and-codes/company-tax-rate-changes) (updated 2026-09-04) | 2026-09-04 | primary-verified |

Interpretive guidance on the BREPI test: **LCR 2019/5** *Base rate entities and base rate entity
passive income* ([ATO Legal Database](https://www.ato.gov.au/law/view/document?docid=COG%2FLCR20195%2FNAT%2FATO%2F00001&document=document)).
Cited, not relied on for any figure above.

---

## 4. Maximum franking percentage (ITAA 1997 s 203-35)

> **203-35(1)** … the **franking percentage** for a \*frankable distribution is worked out using the
> formula:
>
> `(*Franking credit allocated to the *frankable distribution ÷ *Maximum franking credit for the distribution) × 100`
>
> **203-35(2)** If the \*franking percentage for a \*frankable distribution **would exceed 100%** if
> it were worked out under subsection (1), it is **taken to be 100%**.

So the ceiling is **100%**, and 100% means "franked to the payer's own corporate tax rate for
imputation purposes" — not to any fixed 30%. Relationship to the rate the company actually paid:

- The cap is defined by s 202-55 as the **maximum tax the payer could have paid** at its imputation
  rate on the underlying profits. It is a rate ceiling, not an evidence-of-payment test.
- A 25% company franking at 100% attaches **$1/3 per $1 cash**. A 30% company franking at 100%
  attaches **$3/7 per $1 cash**. Both are "fully franked" and both appear on a statement as 100%.
  **"Fully franked" is therefore not a single number** — it is 100% of a company-specific maximum.
- The company chooses `f` freely subject to (i) the 100% cap, (ii) its franking account surplus, and
  (iii) the **benchmark rule** — all frankable distributions within a franking period must be franked
  to the same extent.
- **Over-franking is ineffective, not penal at the shareholder level**: if the statement shows a
  credit above the maximum, the franking account is debited only by the maximum, and the recipient
  includes — and is entitled to — only the maximum (ATO QC 54063 lineage; s 202-60(1) is the
  statutory hook).

| Name | Value / rule | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Franking percentage | `franking credit allocated ÷ maximum franking credit × 100` | 2026-27 | **formula** | [ITAA 1997 s 203-35(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F203-35) | 2026-09-04 | primary-verified |
| Maximum franking percentage | **100%** (hard cap; anything above is taken to be 100%) | 2026-27 | config | [ITAA 1997 s 203-35(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F203-35) | 2026-09-04 | primary-verified |
| What 100% means | 100% of the payer's own maximum — 3/7 per $1 cash at 30%, 1/3 per $1 cash at 25% | 2026-27 | **formula** | [ITAA 1997 s 202-55](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-55) + s 202-60(2) | 2026-09-04 | primary-verified |
| Credit is capped, not clamped upward | Credit = statement amount unless it exceeds the maximum | 2026-27 | **formula** | [ITAA 1997 s 202-60(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F202-60) | 2026-09-04 | primary-verified |

---

## 5. What this means for a household holding a diversified ETF

The brief flags this correctly: a fund holds companies on **both** rates, so there is no single
legislated gross-up rate for the portfolio. Three observations, ranked by how much they should
change the implementation:

1. **The rate is per-payer and per-distribution.** s 202-60(2) fixes it to "the entity making the
   distribution". A portfolio-level `franking_gross_up_rate` constant has no statutory referent.
   Anything the model stores at portfolio level is an **assumption**, not a legislated figure.

2. **In practice the household never derives it.** An Australian-equity ETF or managed fund is a
   trust; its AMMA / annual tax statement reports the **franked amount and the franking credit as
   separate given dollar amounts**. Downstream of that, `grossed_up = franked_amount +
   franking_credit` (s 207-20(1)) needs no rate at all. The right model input is a **franking-credit
   yield**, or a franking-credit-to-cash-distribution ratio, taken as a Setting.

3. **If the model must derive one**, `r = 30%` is the defensible single-rate approximation for a
   broad ASX exposure, because the s 23AA turnover limb ($50m, aggregated across connected entities
   and affiliates per s 328-115) excludes essentially every listed company an index ETF holds. This
   is an **inference from the rule**, not a sourced figure — see UNVERIFIED LIST. Record it as an
   assumption with the reasoning attached, never as a legislated rate.

---

## 6. UNVERIFIED LIST

1. **Federal Register authorised compilations not retrieved.** All statutory text above is from the
   ATO Legal Database (CCH consolidation, ATO-hosted). `legislation.gov.au` served only the SPA
   shell on `/latest/text`, `/latest/downloads` and `/latest/downloads/pdf`, and the OData host
   `api.prod.legislation.gov.au` returned 404 on every probed path.
   *Closes by:* retrieving the authorised compilation PDFs for the Income Tax Rates Act 1986
   (C1986A00107) and ITAA 1997 (C2004A05138) once an FRL download path is found — or via a library
   copy — and re-checking s 23(2), s 23AA, s 23AB, and the s 995-1 definitions word-for-word.

2. **Post-Budget bills not swept.** Confirmed "no change" from the Budget 2026-27 *Tax reform* theme
   page and the ATO rates page (refreshed 2026-09-04). **Not** checked: Budget Paper No. 2 (Budget
   Measures) in full, or the FRL/Parliament bills list for any Bill amending ITRA 1986 s 23 with
   effect from 1 July 2026.
   *Closes by:* a targeted search of Budget Paper No. 2 revenue measures and the Parliament bills
   register for "Income Tax Rates Amendment".

3. **Blended imputation rate for a diversified ETF — no source exists.** §5 item 3 (`r = 30%` for
   broad ASX exposure) is my inference from the s 23AA turnover limb, not a published figure. No
   primary or secondary source states a portfolio-blended rate.
   *Closes by:* accepting it as a documented Setting with reasoning, or by sourcing an actual AMMA
   statement's franked-amount / franking-credit split from the specific fund the household holds —
   which is the better answer, since it sidesteps the derivation entirely.

4. **ATO "Allocating franking credits" page is stale.** Last updated **9 December 2020**; its rate
   commentary stops at "25% for the 2021-22 income year" and its examples use 2018-19/2019-20 facts.
   The **formulas** on it match the current statute exactly and are used here only as corroboration
   of the formula, never as the source of a FY2026-27 figure. Confidence in the formulas is carried
   by ss 202-60 and 995-1, not by this page.

5. **s 23A and ITRA 1986 s 23(3)–(5) not examined.** s 23(2) opens "if subsections (3) to (5) and
   section 23A do not apply". Those cover life insurance companies, RSA providers, PDFs and similar.
   Immaterial to an ordinary listed company or ETF holding, but not verified as immaterial.
   *Closes by:* reading s 23A and confirming it does not touch ordinary trading companies.

---

## 7. DISCREPANCIES

1. **The ATO's own worked examples are arithmetically wrong at the cent level.** On *Allocating
   franking credits*, Example 2 computes, for a $100,000 distribution at a 30% imputation rate:
   > applicable gross up rate = (100% − 30%) ÷ 30% = **2.3333**
   > maximum franking credit = $100,000 × (1 ÷ 2.3333) = **$42,857.75**

   The exact value is `$100,000 × 3/7 = $42,857.142857`. The ATO rounded the gross-up rate to four
   decimals and then divided, introducing a **60-cent error per $100,000**. Example 1 has the same
   defect at 27.5% ($37,930.51 stated; $37,931.034 exact). The statute (s 202-60(2)) prescribes no
   rounding of the gross-up rate.
   **Implementation consequence: compute `D × r/(1−r)` directly. Never materialise the gross-up rate
   as a rounded decimal and divide by it.** This alone justifies storing §2.5 as a formula.

2. **ATO QC 54063 states the BRE test two different ways, ~100 lines apart, without flagging it.**
   The "Base rate entity company tax rate" section says the test uses **current**-year aggregated
   turnover and adds emphatically: *"The aggregated turnover from any prior income year is irrelevant
   when working out if a company is a base rate entity for any particular income year."* The
   "Maximum franking credits" section then says you *"need to assume your aggregated turnover,
   assessable income, and base rate entity passive income will be the same as the previous income
   year"* and that you are a BRE if *"your aggregated turnover in the **previous** income year was
   less than $50 million"*.
   **Not a contradiction** — they are the two different tests set out in §3.4 (ITRA s 23AA for the
   company's own tax; ITAA 1997 s 995-1 for franking). But the page never says so, and reading either
   section alone yields the wrong rule. Resolved in favour of the statute, which is unambiguous.

3. **ATO "Allocating franking credits" vs current law on the turnover threshold.** That page still
   presents "$25 million for the 2017-18 income year or less than $50 million from the 2018-19 income
   year" as a live either/or. Only the $50m limb is operative for FY2026-27. Staleness, not conflict.

4. **No discrepancy found** between the ATO Legal Database text of ITRA s 23(2)/s 23AA/s 23AB, ITAA
   1997 ss 202-55/202-60/203-35/207-20/995-1, the ATO guidance table, and Budget 2026-27. The 25/30
   split and the $50m/80% test agree across all four.
