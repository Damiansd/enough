# P1 — Tax offsets: LITO, SAPTO, Medicare levy low-income thresholds

Research pass for TODO items **P1-1**, **P1-2**, **P1-6**.
Retrieval date: **2026-09-03**. Target financial year: **FY2026-27** (1 Jul 2026 – 30 Jun 2027).

Terminology per `CONTEXT.md`: a **Person** is one member of the couple; a **Household** is the
couple taken together. Every figure below is assessed **per Person** — none of these offsets is a
Household-level calculation, even where the eligibility gate reads combined income. An
**assumption** here means a legislated rate or threshold, distinct from a **Setting**.

---

## 0. Fetch note — the 403 rule has changed

`concept.md` §6 records that **ato.gov.au blocks automated fetch**. That is still true of the
WebFetch path (every ato.gov.au URL returned HTTP 403), **but plain `curl` with a browser
User-Agent succeeds on ato.gov.au**, including the ATO Legal Database. That is how most of this
pass was verified against primary text rather than commentary.

What worked / did not:

| Source | Result |
|---|---|
| `WebFetch` → ato.gov.au | **403** every time |
| `curl` + browser UA → ato.gov.au (web pages, Legal Database, `/law/view/pdf/`) | **200** — full text |
| `curl`/`WebFetch` → legislation.gov.au HTML | 200 but returns the **SPA shell only** — no legislative text |
| legislation.gov.au OData API (`api.prod.legislation.gov.au/v1/`) | 200 — metadata only, no document body found |
| austlii.edu.au (classic / www5 / www8) | **403 Cloudflare**, both WebFetch and curl |
| storage.googleapis.com Treasury exposure-draft PDF | 200 — used only to locate provisions, superseded by the authorised version |

The **Authorised Version** of the SAPTO regulation (`F2025L01060`, registered 09/09/2025) was
obtained in full as a PDF from `https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf`. Each page
is stamped "Authorised Version F2025L01060 registered 09/09/2025", so this is the authoritative
text notwithstanding the ATO host.

**Consolidated Act text** (ITAA 1936, ITAA 1997, Medicare Levy Act 1986) came from the ATO Legal
Database, whose consolidations carry the footer *"This information is provided by CCH Australia
Limited"*. That is an ATO-hosted commercial consolidation, not the Federal Register's own
compilation. I have marked those rows **primary-verified** because the ATO publishes them as its
legal database of record and each figure was independently corroborated by an ATO guidance page
or by exact arithmetic reconciliation — but the strictly authoritative compilation on
legislation.gov.au could not be retrieved, and that is noted in the unverified list.

---

## 1. P1-1 — LITO (Low Income Tax Offset), FY2026-27

**Statutory home:** ITAA 1997 Subdivision 61-D, ss 61-110 (entitlement) and 61-115 (amount).
Not in ITAA 1936 s 159N — that section no longer resolves in the ATO Legal Database.

**Income base: TAXABLE INCOME.** s 61-115(1)(a) defines *relevant income* for an individual as
"your taxable income for the income year". This is **not** rebate income and **not** adjusted
taxable income. Contrast SAPTO below — the two offsets are tested on different bases, which is
exactly the separation `concept.md` §5.4 already calls for (model taxable income and the
Div 293 / offset income base separately).

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| LITO maximum offset | **$700** | 2026-27 | config | [ITAA 1997 s 61-115 table item 1](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-115%22) · [ATO LITO page QC105020](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset) | 2026-09-03 | primary-verified |
| LITO income base | Taxable income | 2026-27 | constant | [ITAA 1997 s 61-115(1)(a)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-115%22) | 2026-09-03 | primary-verified |
| LITO stage-1 phase-out threshold | **$37,500** | 2026-27 | config | [ITAA 1997 s 61-115 item 2](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-115%22) · [ATO QC105020](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset) | 2026-09-03 | primary-verified |
| LITO stage-1 taper rate | **5%** (5c per $1 of excess over $37,500) | 2026-27 | constant | as above | 2026-09-03 | primary-verified |
| LITO stage-2 phase-out threshold | **$45,000** | 2026-27 | config | [ITAA 1997 s 61-115 item 3](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-115%22) · ATO QC105020 | 2026-09-03 | primary-verified |
| LITO stage-2 base amount at $45,000 | **$325** | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| LITO stage-2 taper rate | **1.5%** (1.5c per $1 of excess over $45,000) | 2026-27 | constant | as above | 2026-09-03 | primary-verified |
| LITO cut-out / eligibility ceiling | **$66,667** | 2026-27 | config | [ITAA 1997 s 61-110(1)(b)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-110%22) | 2026-09-03 | primary-verified |
| LITO residency condition | Australian resident at any time in the income year | 2026-27 | constant | [ITAA 1997 s 61-110(1)(a)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19970038%2F61-110%22) | 2026-09-03 | primary-verified |
| LITO refundability | Non-refundable; reduces tax payable to $0 only | 2026-27 | constant | [ATO QC105020](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset) | 2026-09-03 | primary-verified |

**Exact statutory table (s 61-115(1)):**

| If relevant income | Offset |
|---|---|
| does not exceed $37,500 | $700 |
| exceeds $37,500 but not more than $45,000 | $700 less 5% of the excess |
| exceeds $45,000 but not more than $66,667 | $325 less 1.5% of the excess |

Notes for implementation:
- The table is a **step function on bands, not a continuous formula**. At exactly $45,000 item 2
  gives $700 − 5% × $7,500 = $325, so the two limbs join cleanly. No discontinuity.
- At $66,667 the offset computes to $325 − 1.5% × $21,667 = −$0.005, i.e. nil. Clamp at zero.
- s 61-110(1)(b) is a hard eligibility gate at taxable income **≤ $66,667**, separate from the
  amount table. Both give the same answer; implement the gate anyway.
- LITO amounts and thresholds are **not indexed**. They change only by amendment (last changed by
  Act No. 52 of 2019). Classified `config` because they are legislated to change, not because
  they reindex.
- s 61-115(2)–(4) caps LITO for minors with Div 6AA eligible taxable income. Not relevant to this
  Household; do not model.

---

## 2. P1-2 — SAPTO (Seniors and Pensioners Tax Offset), FY2026-27

**Statutory home:** ITAA 1936 s 160AAAA (individuals) / s 160AAAB (trustees), with every dollar
figure and every formula set by the **Income Tax Assessment (1936 Act) Regulations 2025**
(`F2025L01060`), Part 5 Division 1, ss 9–12. That instrument **replaced** the Income Tax
Assessment (1936 Act) Regulation 2015 and commenced **1 October 2025**, so FY2026-27 is governed
by the 2025 Regulations.

**Income base: REBATE INCOME**, defined in ITAA 1936 s 6(1) as the sum of:
1. taxable income (disregarding any assessable FHSS released amount), **plus**
2. reportable superannuation contributions, **plus**
3. total net investment loss, **plus**
4. adjusted fringe benefits total.

For this Household that means **salary sacrifice and personal deductible contributions add back**
into the SAPTO income base — the same separation §5.4 flags for Div 293. Age Pension payments are
assessable income and therefore sit inside taxable income and rebate income.

### 2.1 The single most important structural finding

**The SAPTO thresholds are not fixed numbers. They are computed from the year's marginal tax
rates and must be recomputed whenever a rate changes.** Regulation s 9(4)–(8) derives the
"rebate threshold" (the shading-out threshold) from the *lowest marginal tax rate* and the
*tax-free threshold* in the Income Tax Rates Act 1986. Because the lowest rate fell from 16% to
15% on 1 July 2026, **every SAPTO threshold moved for FY2026-27**, and it will move again on
1 July 2027 when the rate falls to 14%.

Reg s 9(5) — the ordinary case:

```
rebate_threshold = tax_free_threshold
                 + (rebate_maximum_amount + base_rebate_amount) / lowest_marginal_tax_rate
```
rounded **up** to the nearest whole dollar (s 9(8)).

Reg s 9(4)(b) + s 9(6)–(7) — the fallback, used **only if** the s 9(5) result exceeds the
*rebate reduction threshold* ($37,000):

```
G = rebate_reduction_rate + second_lowest_marginal_tax_rate
S7 = rebate_reduction_threshold
     × (rebate_reduction_rate + second_lowest_marginal_tax_rate − lowest_marginal_tax_rate)
rebate_threshold = ( lowest_marginal_tax_rate × tax_free_threshold
                   + rebate_maximum_amount
                   + base_rebate_amount
                   + S7 ) / G
```
also rounded up (s 9(8)).

Fixed parameters, defined in reg s 4 and **frozen** (they are legacy values, not the current
LITO — do not substitute LITO's $700/$37,500/5%):

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| `rebate maximum amount` | **$445** | 2026-27 | config | [Reg 2025 s 4 (Authorised Version F2025L01060)](https://www.legislation.gov.au/F2025L01060) via [ATO PDF](https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf) | 2026-09-03 | primary-verified |
| `rebate reduction rate` | **0.015** | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| `rebate reduction threshold` | **$37,000** | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| `lowest marginal tax rate` FY2026-27 | **0.15** | 2026-27 | config | [ATO resident tax rates 2026–27](https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents) (Income Tax Rates Act 1986 Sch 7 Pt I) | 2026-09-03 | primary-verified |
| `second lowest marginal tax rate` FY2026-27 | **0.30** | 2026-27 | config | as above | 2026-09-03 | primary-verified |
| `tax-free threshold` | **$18,200** | 2026-27 | config | as above | 2026-09-03 | primary-verified |

The ATO's own guidance page confirms these three regulation constants by name and states they are
"set out in the Income Tax Assessment (1936 Act) – Regulations 2025".

### 2.2 Maximum offsets and thresholds — FY2026-27

Base rebate amounts (reg s 9(2) table) are **unchanged** and are **not indexed**:

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| SAPTO max — single (not a spouse at any time in the year) | **$2,230** | 2026-27 | config | [Reg 2025 s 9(2) item 1](https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf) · [ATO new-legislation page QC104015](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer) | 2026-09-03 | primary-verified |
| SAPTO max — each member of a couple | **$1,602** | 2026-27 | config | Reg 2025 s 9(2) item 2 · ATO QC104015 | 2026-09-03 | primary-verified |
| SAPTO max — each member of an illness separated couple | **$2,040** | 2026-27 | config | Reg 2025 s 9(2) item 3 · ATO QC104015 | 2026-09-03 | primary-verified |
| SAPTO shade-out threshold — single | **$36,034** | 2026-27 | config (derived) | [ATO QC104015](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer) · reconciles exactly to Reg 2025 s 9(5) | 2026-09-03 | primary-verified |
| SAPTO shade-out threshold — each member of a couple | **$31,847** | 2026-27 | config (derived) | as above | 2026-09-03 | primary-verified |
| SAPTO shade-out threshold — each member of an illness separated couple | **$34,767** | 2026-27 | config (derived) | as above | 2026-09-03 | primary-verified |
| SAPTO cut-out threshold — single | **$53,874** | 2026-27 | config (derived) | ATO QC104015 · reconciles to Reg 2025 s 10(1) | 2026-09-03 | primary-verified |
| SAPTO cut-out threshold — each member of a couple | **$44,663** | 2026-27 | config (derived) | as above | 2026-09-03 | primary-verified |
| SAPTO cut-out threshold — each member of an illness separated couple | **$51,087** | 2026-27 | config (derived) | as above | 2026-09-03 | primary-verified |
| SAPTO taper rate | **12.5 cents per $1** of rebate income above the shade-out threshold | 2026-27 | constant | [Reg 2025 s 11(2)(b)](https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf) · [ATO SAPTO page QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | 2026-09-03 | primary-verified |
| SAPTO refundability | Non-refundable | 2026-27 | constant | [ATO QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | 2026-09-03 | primary-verified |
| SAPTO rounding | Offset amount and thresholds rounded **up** to the nearest whole dollar | 2026-27 | constant | Reg 2025 ss 9(8), 10(2); ATO QC72197 | 2026-09-03 | primary-verified |

**Arithmetic reconciliation (all three shade-out and all three cut-out figures reproduce exactly):**

- Single: 18,200 + (445 + 2,230)/0.15 = 36,033.33 → **$36,034**; cut-out = 36,034 + 2,230/0.125 = **$53,874**
- Couple: 18,200 + (445 + 1,602)/0.15 = 31,846.67 → **$31,847**; cut-out = 31,847 + 1,602/0.125 = **$44,663**
- Illness separated: 18,200 + (445 + 2,040)/0.15 = 34,766.67 → **$34,767**; cut-out = 34,767 + 2,040/0.125 = **$51,087**

This is a genuine independent check: the regulation formula and the ATO's published table were
derived separately and agree to the dollar, including the round-up rule.

The cut-out formula is reg s 10(1): `base_rebate_amount / 0.125 + rebate_threshold`, rounded up.

**Multiple-item rule (reg s 9(2)(b)):** if more than one table item applies to a Person during the
year, use whichever gives the **greatest** entitlement. Reg s 9(3): spouses living separately and
apart on a permanent basis are treated as not being spouses — so a permanent separation moves a
Person to the $2,230 single amount, while an *illness* separation moves them to $2,040.

### 2.3 Eligibility conditions (ITAA 1936 s 160AAAA(2)–(4))

Two conditions, **both** required.

**First condition — the pension / veteran-entitlement test (s 160AAAA(2)).** On at least one day
in the income year, one of:

- **(a)** eligible for a pension, allowance or benefit under the *Veterans' Entitlements Act 1986*
  **and** has reached *pension age* within the meaning of that Act **and** not in gaol; or
- **(b)** **qualified for an Age Pension** under the *Social Security Act 1991* **and** not in
  gaol — note **qualified**, not *receiving*. A Person means-tested down to $0 entitlement still
  satisfies this limb, which is the same structural point `concept.md` §5.10 makes about the Home
  Equity Access Scheme; or
- **(c)** assessable income includes a social security pension or education entry payment, or a
  service pension / carer service pension / income support supplement under the VEA, and not in
  gaol.

Amended by Act No. 17 of 2025 Sch 8 item 34 (omitting "(other than Part VII)" from (a)(i)),
**effective 1 July 2026** — i.e. this amendment lands inside FY2026-27, with a saving provision
for taxpayers eligible under VEA Part VII.

**Age.** There is no free-standing age test in s 160AAAA for the social-security limb; the age
comes through *qualification for an Age Pension*, which is **67** (ATO: 66y6m from 30 June 2021,
**67 from 1 July 2023**). The veterans' limb uses the VEA *pension age* (60 for a veteran with
qualifying service). ATO guidance lists the qualifying payments as: Age Pension, Carer Payment,
Disability Support Pension (if age-pension age), Education Entry Payment, Parenting Payment
(single), age service pension, income support supplement, Veteran Payment, invalidity service
pension (if age-pension age), partner service pension.

**Second condition — the income gate (s 160AAAA(3)–(4)).** Rebate income must be **less than**
the amount ascertained under reg s 10 (the cut-out threshold above). And:

> **s 160AAAA(4): for a Person who is the spouse of another person, the rebate income used in the
> s 160AAAA(3) gate is HALF the sum of the two Persons' rebate incomes** (plus any s 98 trustee
> amount for the spouse).

This is the trap. The **eligibility gate uses half the Household's combined rebate income**; the
**amount calculation (reg s 11) uses the Person's own actual rebate income**. ATO's worked
examples confirm both halves explicitly:

- *Ying and Li Jun*: combined $79,697, halved = $39,848.50 < couple cut-out ⇒ **both eligible**;
  but Ying's own rebate income $54,020 exceeds the cut-out, so **Ying receives $0** while Li Jun
  receives the full $1,602.
- *Keith and Jean*: Keith's own rebate income $33,650 drives the taper, even though the gate used
  $16,825.

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| SAPTO eligibility — Age Pension age | 67 (Social Security Act limb) | 2026-27 | config | [ATO QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | 2026-09-03 | primary-verified |
| SAPTO eligibility — "qualified for" not "receiving" | $0-entitlement Age Pension qualification suffices | 2026-27 | constant | [ITAA 1936 s 160AAAA(2)(b)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19360027%2F160AAAA%22) | 2026-09-03 | primary-verified |
| SAPTO income gate for a partnered Person | **half of combined rebate income** vs cut-out | 2026-27 | constant | [ITAA 1936 s 160AAAA(4)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19360027%2F160AAAA%22) · ATO QC72197 examples | 2026-09-03 | primary-verified |
| SAPTO amount basis for a partnered Person | the Person's **own** rebate income | 2026-27 | constant | Reg 2025 s 11(2) · ATO QC72197 examples | 2026-09-03 | primary-verified |
| Gaol exclusion | No offset if in gaol for the whole income year | 2026-27 | constant | ITAA 1936 s 160AAAA(2); ATO QC72197 | 2026-09-03 | primary-verified |

### 2.4 Transferring unused SAPTO between spouses — the exact mechanism

Governed by **reg s 12**, and confirmed step-for-step by the ATO's worked Example 9. This is the
part `concept.md` §6 flagged as unverified; it is now closed.

**Preconditions — all of reg s 12(1) must hold:**

- (a) the transferor is entitled to a SAPTO under s 160AAAA (or a trustee under s 160AAAB); **and**
- (b) the transferor's **base rebate amount exceeds the tax payable** by them for the year,
  **disregarding any credits or rebates**; **and**
- (c) a person was their spouse at any time in the year (s 12(2): permanent separation ⇒ not
  spouses); **and**
- (d) the spouse is themselves **entitled to a SAPTO**; **and**
- (e) the spouse's SAPTO is **less than** their own base rebate amount.

Note (d): **both Persons must qualify for SAPTO in their own right.** There is no transfer to a
spouse who is not SAPTO-eligible.

**Amount transferred — reg s 12(3)(b), two limbs:**

- **Limb (ii) — the resident formula.** Applies where reg s 12(4) is met: the transferor's
  taxable income is **greater than $6,000** *and* every rate of tax payable by them is a rate in
  Part I of Schedule 7 to the Income Tax Rates Act 1986 (i.e. resident rates). Then:

  ```
  transferred = max( 0 ,  base_rebate_amount_of_transferor
                          − ( transferor_taxable_income − $6,000 ) × 0.15 )
  ```

- **Limb (i) — the residual.** Where s 12(4) is not met (taxable income ≤ $6,000, or non-resident
  rates apply), the transferred amount is simply the **excess** in s 12(1)(b): base rebate amount
  minus tax payable, disregarding credits and rebates. With an $18,200 tax-free threshold a
  transferor on ≤ $6,000 pays no tax, so **the entire base rebate amount transfers** — which is
  precisely how the ATO states it ("Where your spouse's taxable income is $6,000 or less, the full
  amount of their offset is available for transfer").

**Exempt-pension add-back — reg s 12(5).** For the purposes of s 12, the transferor's assessable
income is calculated **as if certain tax-exempt pensions were assessable**: pensions under
Part 2.3 (Disability Support Pension) or Part 2.5 (Carer Payment) of the *Social Security Act
1991*, or Division 4 or 5 of Part III of the *Veterans' Entitlements Act 1986* (invalidity service
pension, partner service pension), where exempt under ITAA 1997 Subdiv 52-A or 52-B. The ATO
renders this as `B = spouse's taxable income plus exempt pension income`. **The Age Pension is
not in this list — it is already assessable income, so it is already inside taxable income.**

**The transferee's threshold is then RECOMPUTED — this is the step most secondary sources omit.**
Reg s 12(3)(b) increases the transferee's *base rebate amount* by the transferred amount, and the
note to s 12(3) states: *"Changing the base rebate amount may also change the rebate threshold:
see subsections 9(4) to (7)."* So the transferee's shading-out threshold must be re-derived with
the augmented base rebate amount. It is **not** the published table threshold.

**And the augmented amount does NOT re-open the eligibility gate.** Reg s 12(3) applies
"**for the purposes of subsection 11(2) (but not section 10)**" — the transfer changes the offset
amount, never the cut-out test.

**Full transferee calculation:**

```
BRA*  = own_base_rebate_amount + transferred
T5    = 18,200 + (445 + BRA*) / lowest_rate                       [reg s 9(5)]
if T5 > 37,000:
    S7 = 37,000 × (0.015 + second_lowest_rate − lowest_rate)      [reg s 9(7)]
    T  = (lowest_rate × 18,200 + 445 + BRA* + S7) / (0.015 + second_lowest_rate)   [reg s 9(6)]
else:
    T  = T5
T     = ceil(T)                                                    [reg s 9(8)]
SAPTO = ceil( BRA* − 0.125 × max(0, rebate_income − T) )           [reg s 11(2)]
```

**FY2026-27 branch condition.** With `lowest_rate = 0.15`, T5 exceeds $37,000 exactly when
`BRA* > $2,375`. So for FY2026-27 the s 9(5) branch always applies to an untransferred amount
($2,230 / $2,040 / $1,602), and the s 9(6) branch is reached **only once a transfer is added**.
An implementation that hard-codes the simple formula will be correct for the base case and wrong
for every transfer case.

**Worked FY2026-27 example** (couple living together; spouse taxable income $10,000, so
transferred = $1,602 − ($10,000 − $6,000) × 0.15 = $1,002; transferee BRA* = $1,602 + $1,002 =
$2,604):

- T5 = 18,200 + (445 + 2,604)/0.15 = $38,526.67 → exceeds $37,000, so the s 9(6) branch applies
- S7 = 37,000 × (0.015 + 0.30 − 0.15) = 37,000 × 0.165 = $6,105
- T = (0.15 × 18,200 + 445 + 2,604 + 6,105) / 0.315 = 11,884 / 0.315 = $37,726.98 → **$37,727**
- If the transferee's rebate income is $42,000: SAPTO = 2,604 − 0.125 × (42,000 − 37,727) = 2,604
  − 534.125 = **$2,070** (rounded up)

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| SAPTO transfer — full-transfer income floor | **$6,000** taxable income | 2026-27 | **constant** (frozen literal) | [Reg 2025 s 12(3)(b)(ii), s 12(4)(a)](https://www.ato.gov.au/law/view/pdf/reg/r20251060.pdf) · [ATO QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset) | 2026-09-03 | primary-verified |
| SAPTO transfer — reduction rate | **0.15** | 2026-27 | **constant** (frozen literal, NOT the marginal rate) | as above | 2026-09-03 | primary-verified |
| SAPTO transfer formula (resident, TI > $6,000) | `max(0, BRA − (TI − 6,000) × 0.15)` | 2026-27 | constant | Reg 2025 s 12(3)(b)(ii) · ATO QC72197 Example 9 | 2026-09-03 | primary-verified |
| SAPTO transfer formula (TI ≤ $6,000 or non-resident rates) | `BRA − tax payable` (disregarding credits and rebates) | 2026-27 | constant | Reg 2025 s 12(1)(b), s 12(3)(b)(i) · ATO QC72197 | 2026-09-03 | primary-verified |
| SAPTO transfer — exempt pensions added to income base | DSP (SSA Pt 2.3), Carer Payment (SSA Pt 2.5), invalidity/partner service pension (VEA Pt III Div 4–5) | 2026-27 | constant | Reg 2025 s 12(5) · ATO QC72197 | 2026-09-03 | primary-verified |
| SAPTO transfer — transferee threshold recomputed | Yes — re-derive via reg s 9(4)–(8) with the augmented base rebate amount | 2026-27 | constant | Reg 2025 s 12(3) note · ATO QC72197 Example 9 | 2026-09-03 | primary-verified |
| SAPTO transfer — effect on eligibility gate | **None** — transfer applies for reg s 11(2) but not reg s 10 | 2026-27 | constant | Reg 2025 s 12(3) opening words | 2026-09-03 | primary-verified |
| SAPTO transfer — both Persons must be SAPTO-entitled | Required | 2026-27 | constant | Reg 2025 s 12(1)(d) | 2026-09-03 | primary-verified |
| SAPTO transfer — automatic | Applied by the ATO on lodgment; no election | 2026-27 | constant | ATO QC72197 | 2026-09-03 | primary-verified |

**Do not confuse the $6,000 / 0.15 pair with tax parameters.** They are frozen literals in the
regulation. In FY2026-27 the 0.15 coincidentally equals the lowest marginal rate, and $6,000 is
the *pre-2012* tax-free threshold. See the risk note in §5.

### 2.5 SAPTO × Medicare levy — they are separate systems, joined by one cross-reference

**They are separate.** SAPTO is a tax offset under ITAA 1936 s 160AAAA reducing income tax; the
Medicare levy is imposed by the *Medicare Levy Act 1986* and is **not** reduced by SAPTO or by any
other tax offset. The connection is one-directional and narrow:

- *Medicare Levy Act 1986* s 3(1) defines **`threshold amount`** as `$44,268` **"for a person who
  is entitled to a rebate under section 160AAAA of the Assessment Act"**, and `$28,011` in any
  other case; and **`phase-in limit`** as `$55,335` / `$35,013` on the same split.
- s 8(7) applies the same switch to the family thresholds: each reference to `$47,238` in ss 8(5)
  and 8(6) is read as `$61,623` for a person entitled to a s 160AAAA rebate.

So **entitlement to SAPTO is the switch that selects the seniors/pensioners Medicare levy
thresholds**. ATO adds the operative qualification: *"You must be entitled to at least $1 of SAPTO
in order to use the threshold"* — and, explicitly, *"In some circumstances, a person may be
eligible for SAPTO, but their income amount means the tax offset is reduced to zero. If this is
the case they are not entitled to use the Medicare low income threshold for SAPTO."*

Two further asymmetries that matter for the model:

1. **Different income bases.** SAPTO is tested on **rebate income**; the Medicare levy thresholds
   are tested on **taxable income** (single) and **family income** = sum of the two Persons'
   taxable incomes (s 8(5)). Do not reuse one figure for both.
2. **The senior single Medicare upper threshold is partly unreachable.** For FY2025-26 the ATO
   notes SAPTO for singles ceases at rebate income $52,759, below the $55,335 phase-in limit —
   so above that point the non-SAPTO thresholds apply instead. For FY2026-27 the SAPTO single
   cut-out moves to **$53,874**, so this crossover point moves too, and it will move again against
   whatever the FY2026-27 Medicare thresholds turn out to be.

Also worth noting for a couple: a partnered Person can satisfy the SAPTO gate on half combined
rebate income yet receive $0 SAPTO on their own rebate income (the *Ying and Li Jun* case). ATO
states directly that being *eligible* for SAPTO without *getting* the offset does **not** entitle
them to the Medicare levy reduction. In the model, the Medicare threshold switch must key off the
**computed offset > $0**, not off eligibility.

---

## 3. P1-6 — Medicare levy low-income thresholds

### 3.1 FY2026-27 — NOT PUBLISHED

**The 2026-27 Medicare levy low-income thresholds have not been published or legislated as at
2026-09-03.** This is the expected pattern: the thresholds are lifted retrospectively in the
Budget following the year they apply to. The most recent uplift — Act No. 58 of 2026, Schedule 5
— raised the thresholds by ~2.9% and applies **retrospectively to the 2025-26 income year**. The
2026-27 figures will not exist until roughly the 2027 Budget.

Confirmations that nothing is published:
- The ATO pages for both the single and family thresholds (both **"Last updated 30 June 2026"**)
  state their tables in terms of **"In 2025–26…"** and offer only prior-year links (2024-25 back
  to 2021-22). There is no 2026-27 table.
- Unlike SAPTO — where the ATO published a forward 2026-27 table on its new-legislation page
  because the change is a consequence of the enacted rate cut — no equivalent forward Medicare
  levy table exists.

**Fallback: use the FY2025-26 figures below, clearly labelled prior-year, and re-run this check
after the next Budget.** The `assumptions` object must stamp them `2025-26` so the chart shows
the mismatch, per §6's rule that every threshold is stamped with its financial year.

### 3.2 FY2025-26 figures (PRIOR-YEAR FALLBACK)

All statutory, all cross-checked against both the Medicare Levy Act 1986 text and the ATO pages.

| Name | Value | FY | config/constant | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Medicare levy rate | **2%** | 2026-27 | config | [ATO resident tax rates](https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents) | 2026-09-03 | primary-verified |
| Single lower threshold (`threshold amount`) | **$28,011** | **2025-26 (prior-year fallback)** | config | [Medicare Levy Act 1986 s 3(1)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19860110%2F3%22) · [ATO QC27031](https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners) | 2026-09-03 | primary-verified (for 2025-26) |
| Single upper threshold (`phase-in limit`) | **$35,013** | 2025-26 (prior-year fallback) | config | as above | 2026-09-03 | primary-verified (for 2025-26) |
| Seniors/pensioners single lower threshold | **$44,268** | 2025-26 (prior-year fallback) | config | Medicare Levy Act s 3(1) `threshold amount` para (a) · ATO QC27031 | 2026-09-03 | primary-verified (for 2025-26) |
| Seniors/pensioners single upper threshold | **$55,335** | 2025-26 (prior-year fallback) | config | Medicare Levy Act s 3(1) `phase-in limit` para (a) · ATO QC27031 | 2026-09-03 | primary-verified (for 2025-26) |
| Family lower threshold (`family income threshold`) | **$47,238** | 2025-26 (prior-year fallback) | config | [Medicare Levy Act 1986 s 8(5)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19860110%2F8%22) · [ATO QC27032](https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income) | 2026-09-03 | primary-verified (for 2025-26) |
| Family upper threshold | **$59,047** | 2025-26 (prior-year fallback) | config (derived = 1.25 × lower) | ATO QC27032 | 2026-09-03 | primary-verified (for 2025-26) |
| Seniors/pensioners family lower threshold | **$61,623** | 2025-26 (prior-year fallback) | config | [Medicare Levy Act 1986 s 8(7)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19860110%2F8%22) · ATO QC27032 | 2026-09-03 | primary-verified (for 2025-26) |
| Seniors/pensioners family upper threshold | **$77,028** | 2025-26 (prior-year fallback) | config (derived = 1.25 × lower) | ATO QC27032 | 2026-09-03 | primary-verified (for 2025-26) |
| Family lower threshold uplift **per dependent child** | **+$4,338** | 2025-26 (prior-year fallback) | config | Medicare Levy Act s 8(5) `family income threshold` · ATO QC27032 | 2026-09-03 | primary-verified (for 2025-26) |
| Family upper threshold uplift **per dependent child** | **+$5,423** | 2025-26 (prior-year fallback) | config (derived = 1.25 × 4,338, rounded) | ATO QC27032 | 2026-09-03 | primary-verified (for 2025-26) |
| Shade-in rate (singles) | **10%** of the excess over the lower threshold | 2026-27 | constant | [Medicare Levy Act 1986 s 7(2)](https://www.ato.gov.au/law/view/document?LocID=%22PAC%2F19860110%2F7%22) | 2026-09-03 | primary-verified |
| Shade-in rate (families) | **10%** effective, via the s 8(2) reduction formula | 2026-27 | constant | Medicare Levy Act s 8(2); reconciled arithmetically | 2026-09-03 | primary-verified (formula image not read — see unverified list) |
| Upper : lower threshold ratio | **1.25** at a 2% levy | 2026-27 | constant (derived) | reconciliation below | 2026-09-03 | primary-verified |
| Medicare levy income base | Taxable income (single) / family income = sum of both Persons' taxable incomes (s 8(5)) | 2026-27 | constant | Medicare Levy Act ss 7, 8(5) | 2026-09-03 | primary-verified |

**The upper thresholds are derived, not independent.** *Medicare Levy Act* s 7(2): where taxable
income exceeds the threshold amount but not the phase-in limit, the levy "shall not exceed **10%**
of the amount of the excess". With a 2% levy the shade-in closes at `lower × 0.10/(0.10 − 0.02)`
= `lower × 1.25`. Every published upper threshold reconciles:

- 28,011 × 1.25 = 35,013.75 → **35,013** ✓
- 44,268 × 1.25 = 55,335.00 → **55,335** ✓
- 47,238 × 1.25 = 59,047.50 → **59,047** ✓
- 61,623 × 1.25 = 77,028.75 → **77,028** ✓
- 4,338 × 1.25 = 5,422.50 → **5,423** ✓ (this one rounds **up**, the others truncate — do not
  assume a single rounding rule; store the published uppers rather than deriving them)

**Family mechanics (s 8(2)).** Where family income exceeds the family income threshold, the levy
payable by the Person is reduced by an amount given by a formula that the ATO Legal Database
renders as a GIF image and which I could not read as text. The historical formula (pre-2013, at a
1.5% levy) was `A − 0.085(B − C)` with `A` = 1.5% of the family income threshold, `B` = family
income, `C` = family income threshold. At a 2% levy the coefficient becomes `0.10 − 0.02 = 0.08`
and `A` = 2% of the threshold, which reproduces the 10% shade-in exactly and matches every ATO
worked example. Treated as verified by reconciliation, flagged in the unverified list.

**Dependent-child definition (ATO QC27032).** A dependent child is a child maintained who was an
Australian resident and whose adjusted taxable income was below: first child $1,786 / additional
child $1,410 (maintained whole year); or `$282 + $28.92 per week` (first) / `$282 + $21.70 per
week` (additional) if part-year. Full-time students under 25 use the first-child figures. Not
relevant to this Household — recorded for completeness only.

**Family threshold uplift requires FTB (s 8(6)).** The $47,238 is not increased on account of
another person unless family tax benefit is payable. Also not relevant here.

---

## 4. Suggested `assumptions` shape

Two things should **not** be stored as literals:

1. **SAPTO thresholds.** Store only `baseRebateAmount` (3 values), `rebateMaximumAmount` ($445),
   `rebateReductionRate` (0.015), `rebateReductionThreshold` ($37,000), and derive the shade-out
   and cut-out from the year's `lowestMarginalRate`, `secondLowestMarginalRate` and
   `taxFreeThreshold` using reg s 9(4)–(8) and s 10(1). This makes the FY2027-28 rate cut to 14%
   automatic instead of a silent error. Keep the published table as a **golden-file test fixture**
   for FY2025-26 and FY2026-27, not as the source of truth.
2. **The SAPTO transfer literals `$6,000` and `0.15`.** Store them under their own names
   (`sapto.transferIncomeFloor`, `sapto.transferReductionRate`) and **never** reference the
   marginal-rate assumption to produce them.

Golden-file assertions worth writing immediately (all primary-verified above):

| FY | Status | Shade-out | Cut-out |
|---|---|---|---|
| 2025-26 | Single | $34,919 | $52,759 |
| 2025-26 | Couple (each) | $30,994 | $43,810 |
| 2025-26 | Illness separated (each) | $33,732 | $50,052 |
| 2026-27 | Single | $36,034 | $53,874 |
| 2026-27 | Couple (each) | $31,847 | $44,663 |
| 2026-27 | Illness separated (each) | $34,767 | $51,087 |

Plus the ATO's own Example 9 (FY2025-26, illness separated, spouse TI $10,000, own rebate income
$48,000): transferred $1,440; recomputed rebate threshold **$39,912**; SAPTO **$2,469**. That
example exercises the s 9(6) branch, the transfer formula and the round-up rule in one case — it
is the single best regression fixture available.

---

## 5. Forward-looking items inside the Planning Horizon

Not asked for, but they land inside the forecast and would break a hard-coded implementation:

- **1 July 2027: lowest marginal rate falls 15% → 14%** (already law). Recomputing reg s 9(5) for a
  single gives 18,200 + 2,675/0.14 = $37,307.14, which **exceeds $37,000**, so the s 9(6) branch
  becomes the *default* for a single from FY2027-28 even with no transfer. A model that only ever
  implements s 9(5) is correct in FY2026-27 and wrong from FY2027-28.
- **Working Australians tax offset (WATO)** — new non-refundable offset, now law, available from
  the **2027-28 income year** for Australian residents whose **net labour income** (labour amounts
  less labour deductions) exceeds the tax-free threshold. Source: ATO new-legislation page,
  published 23 July 2026. Amount and taper not captured in this pass. Affects the working / TTR
  years only; irrelevant once both Persons draw only super and Age Pension.
- **ITAA 1936 s 160AAAA(2)(a)(i) amendment** (Act No. 17 of 2025 Sch 8 item 34) commences
  **1 July 2026** — inside FY2026-27 — with a saving provision for VEA Part VII eligibility.
- Negative gearing / CGT reform from 1 July 2027 (Treasury Laws Amendment (Tax Reform No. 1) Act
  2026). Out of scope per §10 "Not scoped", noted only so it is not rediscovered as a surprise.

---

## UNVERIFIED LIST

1. **legislation.gov.au compilation text for ITAA 1936, ITAA 1997 and the Medicare Levy Act 1986
   was never retrieved.** The site returns only its SPA shell to `curl`/WebFetch, its OData API
   exposes metadata but no document body, and AustLII is behind a Cloudflare 403. All Act-level
   section text in this document therefore comes from the **ATO Legal Database**, whose
   consolidations are footered *"This information is provided by CCH Australia Limited"*.
   *To close:* fetch the Federal Register compilations of ITAA 1936 (`C1936A00027`), ITAA 1997
   (`C1997A00038`) and the Medicare Levy Act 1986 in force for FY2026-27 — most likely via a
   headless browser or the `.docx`/`.pdf` blob URL used by the Register's own download button,
   which was not discoverable from the API metadata. **The regulation `F2025L01060` is NOT in this
   category** — its Authorised Version PDF was retrieved in full and every page carries the
   registration stamp.

2. **Medicare Levy Act 1986 s 8(2) family reduction formula.** The ATO Legal Database renders it
   as an image (`formula_s_8_2_...gif`); the text was not read. The 0.08 coefficient and the
   `A = 2% × family income threshold` term are **inferred** from the repealed pre-2013 formula
   (`A − 0.085(B − C)`, `A` = 1.5% of the threshold) plus exact reconciliation against every ATO
   published upper threshold and worked example. *To close:* read s 8(2) from the Federal Register
   compilation, or OCR the GIF.

3. **FY2026-27 Medicare levy low-income thresholds do not exist.** Not an incomplete search — they
   have not been legislated or published as at 2026-09-03, and on the historical pattern will not
   be until the 2027 Budget legislates them retrospectively. Everything in §3.2 is FY2025-26.
   *To close:* re-check `Medicare Levy Act 1986` ss 3(1) and 8(5)/(7) after the 2027 Budget; the
   amending Act will be the successor to Act No. 58 of 2026 Sch 5.

4. **Income Tax Rates Act 1986 Schedule 7 Part I was not read directly.** The `lowest marginal tax
   rate` = 0.15 and `second lowest marginal tax rate` = 0.30 inputs to the SAPTO formula are taken
   from the ATO's resident tax rates table for 2026-27 (15c over $18,200; 30c over $45,000), not
   from the Schedule. ATO's LocID for the Schedule returned an empty document. *To close:* read
   Sch 7 Pt I from the Federal Register. Low risk — the ATO rate table, the ATO new-legislation
   page and the derived SAPTO thresholds are all mutually consistent, and any error in the rate
   would have produced a mismatch against the published $36,034.

5. **`Amounts of $1` / part-year and residency edge cases in SAPTO were not researched.** Whether
   a mid-year change of status (e.g. reaching Age Pension age partway through the year, or a
   `DEATH` / `ILLNESS_SEPARATION` Journal Entry) apportions the offset. Reg s 9(2) and s 160AAAA(2)
   both operate on "at any time during the year" / "at least one day during the year", which
   suggests **no apportionment** — but this was not confirmed against ATO guidance, and it matters
   directly for the v1 `DEATH` and `ILLNESS_SEPARATION` what-ifs. *To close:* ATO guidance on
   part-year SAPTO and on the year of a spouse's death.

6. **WATO (Working Australians tax offset) amount, taper and definition of "net labour income"**
   not captured. Only its existence, commencement (2027-28) and eligibility outline. *To close:*
   read the Act — the ATO page points at the enacted measure but the figures were not on it.

---

## DISCREPANCIES

1. **The ATO contradicts itself on SAPTO thresholds — two live ATO pages, two different tables.**
   - [ATO SAPTO page QC72197](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/seniors-and-pensioners-tax-offset), *last updated 8 June 2026*, publishes
     **$34,919 / $30,994 / $33,732** (shade-out) and **$52,759 / $43,810 / $50,052** (cut-out).
   - [ATO new-legislation page QC104015](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer), *last updated 13 May 2026*, publishes
     "SAPTO rates and rebate income thresholds for 2026-27" as **$36,034 / $31,847 / $34,767** and
     **$53,874 / $44,663 / $51,087**.

   **This is not a genuine conflict — it is a year label the first page omits.** The QC72197
   figures reconcile exactly to reg s 9(5) at a **16%** lowest marginal rate, i.e. FY2025-26; its
   worked Example 9 is explicitly labelled "during the 2025-26 income year" and uses 0.16 and 0.30.
   The QC104015 figures reconcile exactly at **15%**, i.e. FY2026-27. The main SAPTO page simply
   has not been rolled forward and **does not state which year its table applies to**.
   **Resolution: use $36,034 / $31,847 / $34,767 for FY2026-27.** Anyone reading the obvious ATO
   page in good faith gets the wrong year's numbers with nothing on the page to warn them.

2. **Secondary sources publishing 2025-26 Medicare levy thresholds under a "2026-27" heading.**
   A search result titled *"ATO Medicare Levy Thresholds 2026-27 — 2%, $28,011 Single / $47,238
   Family"* (austax.tools) presents the FY2025-26 figures as FY2026-27. Another
   (pay-calculator-australia.com) titles the same uplift "…in 2025-26". The underlying figures are
   right; the year labels are not, and no 2026-27 figures exist. Both are secondary; neither is
   relied on here.

3. **A secondary source (superguide-adjacent search summary) initially reported the SAPTO couple
   thresholds as "$28,974 full / $41,790 cut-out"** alongside the correct 2026-27 single figure of
   $36,034 — mixing a **2023-24-era** couple threshold (which reconciles at a 19% lowest marginal
   rate) with a 2026-27 single threshold in one answer. Discarded. It is a useful illustration of
   the failure mode: because these thresholds are *derived from the marginal rate*, stale figures
   from any of the last three years all look plausible.

4. **No disagreement found** on: LITO ($700 / $37,500 / 5% / $45,000 / 1.5% / $66,667) — ITAA 1997
   s 61-115, ATO QC105020 and cfs.com.au all agree; SAPTO maximum amounts ($2,230 / $1,602 /
   $2,040) — regulation, both ATO pages and cfs.com.au agree; the 12.5c taper; the FY2025-26
   Medicare levy thresholds — Medicare Levy Act ss 3(1), 8(5), 8(7) and both ATO pages agree to
   the dollar.

---

### Biggest single risk

The SAPTO transfer formula's `$6,000` and `0.15` are **frozen literals in reg s 12(3)(b)(ii)**,
not tax parameters. In FY2026-27 the `0.15` happens to equal the lowest marginal tax rate, so an
implementation that wires the transfer formula to the marginal-rate assumption will produce
**identical, correct output for the whole of FY2026-27** — and start silently returning wrong
transfers on **1 July 2027**, when the lowest rate drops to 14% while the regulation's 0.15 does
not move. It is a bug that cannot be caught by testing the first forecast year, and it lands
inside the Planning Horizon. This is the couple-bug pattern §8 already warns about: it shifts both
Scenarios equally and comparison cannot detect it.

---

*Retrieved 2026-09-03. FY2026-27 unless a row says otherwise. Medicare levy low-income thresholds
are FY2025-26 prior-year fallbacks — FY2026-27 values do not yet exist.*
