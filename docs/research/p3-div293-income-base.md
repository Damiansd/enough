# P3-5 — Division 293: the income base, low tax contributions, and the $250,000 threshold

**Scope:** what "income for surcharge purposes" actually decomposes into, what "low tax contributions" means and how it lines up against `ConcessionalContributions`, and whether the $250,000 threshold is indexed or frozen — plus whether Div 293 bites as a cliff or a taper.
**Retrieval date:** 2026-09-05 · **Forecast year:** FY2026-27
**Out of scope (deliberately):** Division 296, the Medicare levy, the Medicare levy surcharge rates themselves, private health insurance rebate tiers.

## 0. Headline answers

| Question | Answer | Confidence |
|---|---|---|
| Where is "income for surcharge purposes" defined? | **ITAA 1997 s 995-1(1)** — a single self-contained definition, not a pointer elsewhere | primary-verified |
| What are its components? | **Four additive limbs** — (a) taxable income, (b) reportable fringe benefits total, (c) reportable superannuation contributions, (d) total net investment loss — **less** a fifth, **subtractive** amount under s 301-20(3). Paragraph (a) itself carries **two express disregards** (assessable FHSS released amount; ITAA 1936 Sch 2F s 271-105(1)) | primary-verified |
| Was the brief's recollection right? | **Substantially, but not exactly.** Limb (c) is "reportable **superannuation** contributions" — RESC **plus personal deductible contributions**, less excess concessional — **not** "reportable *employer* superannuation contributions". The subtractive fifth limb and both disregards were missing | primary-verified |
| How many components must the **user supply**? | **Four are Settings the forecaster cannot derive**: reportable fringe benefits total, the non-SG employer contribution remainder, net financial investment loss, net rental property loss. Three more are nil-by-default edge inputs | primary-verified statutory text; the compute/supply split is an **engineering judgement** on top of it |
| "Low tax contributions" | **ITAA 1997 s 293-25**: low tax contributed amounts (s 293-30) **less** excess concessional contributions | primary-verified |
| Does it equal the codebase's concessional contributions? | **Nearly, and by design not exactly.** `low tax contributions ≈ concessional contributions − excess`. Two real mismatches exist (SGAA amnesty amounts; SIS Act s 99G(6) refunds) | primary-verified that the two exclusion lists differ; the **consequence** of the s 99G(6) gap is **inferred from statutory structure, not stated in terms** — see U1 |
| Threshold | **$250,000** | primary-verified |
| **Indexed or frozen?** | **CONFIRMED FROZEN.** Not merely "no provision found": (1) no indexation language anywhere in any of the **30 sections of Division 293** (all fetched and swept); (2) **absent from the s 960-265 table**, which s 960-270(1) makes the gateway, while the concessional cap, transfer balance cap, CGT cap, low rate cap and both Div 296 thresholds **are** listed; (3) it has only ever moved by **textual amendment** — No 81 of 2016 Sch 2 items 14–18 rewrote all five occurrences at once | primary-verified |
| Is the freeze the same *kind* as the $5,000 small shareholder exemption's? | **No — weaker.** s 293-20 is **live, amendable law**; indexing it needs only one new item in the s 960-265 table. The $5,000 sits in a repealed provision frozen as a 2002 snapshot and is structurally incapable of indexation. Model both as frozen; do not file them under one label | primary-verified |
| **Cliff or taper?** | **TAPER — a linear shade-in.** `taxable contributions = min(low tax contributions, sum − 250,000)`, taxed at 15%. At $250,001 the tax is **15 cents**, not $4,500. The shade-in band is exactly as wide as the Person's low tax contributions | primary-verified — stated in terms in s 293-20(1) and restated in the s 293-10 Guide |
| Rate | **15%** of *taxable contributions* (not of low tax contributions) — *Superannuation (Sustaining the Superannuation Contribution Concession) Imposition Act 2013* (**No. 87, 2013**) s 5 | primary-verified |
| Anything contradicting register §3.6? | **Nothing.** Every §3.6 row is confirmed verbatim. §3.6 is **incomplete**, not wrong — it lacks the component list and does not flag the taper. One citation nit: the Imposition Act is **No. 87 of 2013** | primary-verified |

---

## 1. The operative provision — ITAA 1997 s 293-20

### Finding 1.1 — s 293-20 verbatim

- **Name:** Taxable contributions (the Div 293 tax base)
- **Rule:** ITAA 1997 **s 293-20(1)**:

> If the sum of:
> **(a)** your \*income for surcharge purposes for an income year (**disregarding your \*reportable superannuation contributions**); and
> **(b)** your \*low tax contributions for the corresponding \*financial year;
> exceeds **$250,000**, you have **taxable contributions** for the income year equal to **the lesser of the low tax contributions and the amount of the excess**.

> **293-20(2)** However, you do not have **taxable contributions** for an income year if the amount of your \*low tax contributions is **nil**.

- **Financial year:** current law; applies FY2026-27
- **Config or constant:** structural, plus the `$250,000` literal (see Finding 4.1)
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-20
- **Retrieval date:** 2026-09-05
- **Confidence:** primary-verified

**Two structural points the register's §3.6 wording gets right and one it under-states.** Right: the income base is "income for surcharge purposes" *disregarding* reportable superannuation contributions, plus low tax contributions; and taxable contributions are the lesser of the two quantities. Under-stated: s 293-20 mixes **two different periods** — paragraph (a) is measured over an **income year**, paragraph (b) over the **corresponding financial year**. For a natural person these coincide (1 July – 30 June), so it is inert for this project, but the drafting is deliberate and the two terms are not synonyms in the Act.

### Finding 1.2 — CLIFF OR TAPER? **Taper (a shade-in), not a cliff.**

- **Rule:** derived directly from the words of s 293-20(1): `taxable contributions = min(low_tax_contributions, sum − 250,000)`. The tax is imposed at 15% on *taxable contributions*, not on low tax contributions as a whole.
- **Consequence:** a Person whose Div 293 sum is $250,001 has taxable contributions of **$1**, and pays **15c** of Div 293 tax. There is no step. The tax phases in linearly, dollar for dollar, over a shade-in band whose width equals the Person's low tax contributions, and only above `250,000 + low_tax_contributions` is the *whole* of the low tax contributions taxed.
- **Worked check:** low tax contributions $30,000, income for surcharge purposes (ex RSC) $235,000. Sum = $265,000. Excess = $15,000. `min(30,000, 15,000)` = **$15,000** taxable contributions → $2,250 of Div 293 tax. At $250,000 of surcharge income the same Person's excess is $30,000, `min(30,000, 30,000)` = $30,000 → $4,500, and above that it stays $4,500.
- **s 293-20(2) is not a cliff either** — it is a redundancy guard: if low tax contributions are nil, `min(0, excess)` would already be 0.
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-20
- **Retrieval date:** 2026-09-05
- **Confidence:** primary-verified (the formula is stated in terms in the statute; the shade-in characterisation is a restatement of those words, not an inference from elsewhere)

---

## 2. "Income for surcharge purposes" — the actual component list

### Finding 2.1 — The definition, verbatim from ITAA 1997 s 995-1(1)

> **income for surcharge purposes**, for a person and an income year, means the **sum of the following**:
> **(a)** the person's **taxable income** for the income year (**disregarding** the person's \*assessable FHSS released amount for the income year **and** subsection **271-105(1) in Schedule 2F** to the *Income Tax Assessment Act 1936*);
> **(b)** the person's \***reportable fringe benefits total** (if any) for the income year;
> **(c)** the person's \***reportable superannuation contributions** for the income year;
> **(d)** the person's \***total net investment loss** for the income year;
> **less** the amount mentioned in **subsection 301-20(3)** for the person for the income year if the person is entitled to a tax offset under subsection **301-20(2)** for the income year.

- **Financial year:** current law; applies FY2026-27
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1
- **Retrieval date:** 2026-09-05
- **Confidence:** primary-verified

**Amendment history captured from the same page** (relevant because it shows the definition is live and amended, unlike the $250,000):
- inserted by **No 27 of 2009**, Sch 3 item 7, applicable to income years starting on or after 1 July 2009;
- amended by **No 41 of 2011**, Sch 5 item 395 ("in Schedule 2F" for "of Schedule 2F"), effective 27 June 2011;
- amended by **No 132 of 2017**, Sch 1 item 31, inserting the assessable-FHSS-released-amount disregard in para (a), effective 1 July 2018.

### Finding 2.2 — VERDICT ON THE BRIEF'S RECOLLECTION: **substantially right, but incomplete in two ways and imprecise in one.**

The brief's recollection was "taxable income, reportable fringe benefits, reportable employer superannuation contributions and net investment loss".

| Recollected | Actual | Verdict |
|---|---|---|
| taxable income | taxable income, **with two express disregards** | correct but incomplete |
| reportable fringe benefits | **reportable fringe benefits total** | correct |
| reportable **employer** superannuation contributions | **reportable superannuation contributions** — a **wider** term that includes RESC **and personal deductible contributions** | **imprecise, and materially so** — see Finding 3.4 |
| net investment loss | **total** net investment loss | correct |
| — | **less** the s 301-20(3) amount where a s 301-20(2) offset applies | **missed entirely** — the definition has a *subtractive* fifth limb |

The recollection is not wrong in outline. It is wrong in exactly the place that matters most for Div 293, because component (c) is the one Div 293 then throws away, and getting its scope wrong changes which contributions are double-counted.

### Finding 2.3 — Component-by-component, with each component's own statutory reference

Every definition below was retrieved from the ATO Legal Database on 2026-09-05. **Confidence for every row: primary-verified** unless the row says otherwise.

**(a) Taxable income** — ITAA 1997 **s 4-15** (assessable income less deductions), as the codebase already models it in `incomeBases.taxableIncome`. Subject to **two express disregards** written into the s 995-1 definition itself:

- **(a)(i) disregard the \*assessable FHSS released amount** — ITAA 1997 s 995-1: *"for an income year, means the amount included in a person's assessable income for the income year under **section 313-20** in respect of the person's \*FHSS released amounts"* (inserted by No 132 of 2017 Sch 1 item 21, effective 1 July 2018). First Home Super Saver released amounts assessed under s 313-20 are stripped back out. **This is the same disregard the codebase already applies in `rebateIncome` via `assessableFhssReleasedAmounts`** — see Finding 5.3.
- **(a)(ii) disregard ITAA 1936 Sch 2F s 271-105(1)** — retrieved: s 271-105 is headed *"AMOUNTS SUBJECT TO FAMILY TRUST DISTRIBUTION TAX NOT ASSESSABLE"*; subsection (1) **reduces** an amount included in assessable income where family trust distribution tax has been paid on it, by `tax payment amount ÷ tax payable × original assessable amount` (s 271-105(2)). "Disregarding" that subsection therefore **adds the reduction back**, i.e. income for surcharge purposes is computed on the *un-reduced* figure. Note the direction: this disregard **increases** the base.
  - Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19360027%2FSch2F-271-105

**(b) Reportable fringe benefits total** — ITAA 1997 s 995-1: *"has the same meaning as in the Fringe Benefits Tax Assessment Act 1986"* → **FBTAA s 135N**: *"the sum of each of the employee's reportable fringe benefits amounts for the year of income in respect of the employee's employment by an employer"* (so it aggregates across employers). Each **reportable fringe benefits amount** comes from **FBTAA s 135P**:
- **s 135P(1)** — an employee has one only if their individual fringe benefits amount for the FBT year ending **31 March in** the income year exceeds **$2,000** (substituted for $1,000 by No 110 of 2006, applicable from the FBT year starting 1 April 2007). Note the **period mismatch**: an FBT year (1 Apr – 31 Mar), not the income year.
- **s 135P(2)** — the reportable amount is **grossed up**: `individual fringe benefits amount × 1 ÷ (1 − rate of tax for the year of tax)`. This is the *type 2* gross-up. The **rate of tax** is **47%** — *Fringe Benefits Tax Act 1986* **s 6**: *"The rate of tax in respect of the fringe benefits taxable amount of an employer of a year of tax is **47%**."* (s 6A's temporary budget repair levy uplift applied only to the FBT years starting 1 April 2015 and 1 April 2016 and is spent.) The gross-up factor is therefore `1 ÷ (1 − 0.47) = 1.886792…`, and the 47% is a **frozen literal in the rating Act with no indexation** (the *Fringe Benefits Tax Act 1986* is the imposition Act for FBT — not to be confused with the Div 293 Imposition Act at Finding 4.3) — retrieved from FRL OData, `titleid='C2004A03281'`, `format='Word'`, `volumeNumber=0`, `asat=2026-09-05`, on 2026-09-05. **primary-verified.**
- **s 135P(3)** — s 8A (exempt car benefits, zero/low-emissions vehicles) is **disregarded**, so a novated-lease EV still produces a reportable amount.
- **FBTAA s 135Q** — special rules for employees of s 57A/s 58 employers (PBIs, registered charities, hospitals, ambulance services, government/religious/non-profit aged and disadvantaged care). Out of scope for this project unless a Person is employed by one.
- Sources: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860039%2F135N · `.../135P` · `.../135Q` · `.../136`

**(c) Reportable superannuation contributions** — ITAA 1997 s 995-1, verbatim:

> **reportable superannuation contributions**, for an individual and an income year, means the **sum of**:
> **(a)** the individual's \*reportable employer superannuation contributions (if any) for the income year; **and**
> **(b)** the individual's **deductions (if any) under Subdivision 290-C** for the income year;
> **reduced (but not below zero)** by the amount of any \*excess concessional contributions the individual has for the \*financial year corresponding to the income year.

- **\*Reportable employer superannuation contribution** — ITAA 1997 s 995-1 → **TAA 1953 Sch 1 s 16-182(1)**: an amount contributed in respect of the income year (a) by an employer or an associate of the employer, for the individual's benefit, and (b) to a superannuation fund or an RSA, **to the extent that** (c) the individual has, has had, or might reasonably be expected to have the **capacity to influence the size** of the amount, or (d) the **capacity to influence the way it was contributed so that their assessable income is reduced**.
  - **Consequence, and it matters for this codebase:** compulsory Superannuation Guarantee at the legislated rate is **not** a RESC, because the employee has no capacity to influence it. **Salary sacrifice is** a RESC. So is an above-award employer contribution the employee negotiated.
  - Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19530001%2FSch1-16-182
- **Subdivision 290-C deductions** = **personal deductible contributions** (s 290-150 with the s 290-170 notice of intent) — exactly what `PersonalDeductibleContributions` in `superConcessional.ts` models.
- **This is where the brief's recollection was imprecise.** RSC is **not** "reportable *employer* superannuation contributions". It is RESC **plus personal deductible contributions**, **less** excess concessional contributions.
- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1

**(d) Total net investment loss** — ITAA 1997 s 995-1: the **sum** of
> **(a)** the amount (if any) by which the individual's deductions for the income year **attributable to \*financial investments** exceed their gross income for that year from those investments; and
> **(b)** the amount (if any) by which the individual's deductions for the income year **attributable to rental property** exceed their gross income for that year from rental property.

- **\*Financial investment** — ITAA 1997 s 995-1, an **inclusive** definition: (a) a share in a company; (b) an interest in a managed investment scheme (Corporations Act 2001); (c) a forestry interest in a forestry managed investment scheme; (d) a right or option in respect of (a), (b) or (c); (e) an investment of a like nature.
- **Two separate silos, each floored at zero.** A financial-investment *profit* does **not** offset a rental *loss*: paragraph (a) and paragraph (b) each read "the amount (if any) by which … exceed", so each is independently non-negative, and they are then summed. Netting them would understate the base.

**(e) LESS the s 301-20(3) amount** (subtractive) — applies only where the person is entitled to a tax offset under **ITAA 1997 s 301-20(2)**. Retrieved:
- **s 301-20(1)** — if you are **under 60 but have reached your preservation age** when you receive a superannuation lump sum, the taxable component is assessable income.
- **s 301-20(2)** — you get a tax offset ensuring the rate on the s 301-20(3) amount **does not exceed 0%**.
- **s 301-20(3)** — that amount is so much of the total taxable components assessed under (1) as **does not exceed your \*low rate cap amount** (s 307-345).
- **Effect:** the 0%-taxed slice of a preservation-age-to-59 super lump sum is **removed** from income for surcharge purposes. The 15% slice (s 301-20(4)/(5), above the low rate cap) is **not** removed.
- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F301-20

### Finding 2.4 — Compute vs supply: which components the forecaster can derive

| # | Component | s 995-1 limb | Compute or **Setting**? | Why |
|---|---|---|---|---|
| 1 | Taxable income | (a) | **compute** | already modelled — `incomeBases.taxableIncome` |
| 2 | Disregard: assessable FHSS released amount | (a) | **Setting** (nil by default) | depends on whether the Person made an FHSS release request; not derivable from a forecast. `rebateIncome` already carries this field |
| 3 | Disregard: ITAA 1936 Sch 2F s 271-105(1) reduction | (a) | **Setting** (nil by default) | requires family trust distribution tax to have been paid. Out of the modelled world; must be surfaced as nil-by-choice, not nil-by-omission |
| 4 | Reportable fringe benefits total | (b) | **Setting** — user must supply | it is a **grossed-up** figure computed by the *employer* against a **31 March FBT year**, subject to a $2,000 entry test the tool cannot see. The forecaster cannot derive it from salary. The user reads it off their payment summary / income statement |
| 5a | Reportable employer super contributions | (c) | **partly computable** | the salary-sacrificed amount the model already holds **is** a RESC (s 16-182(1)(c)/(d)). Employer contributions *at the SG rate* are **not**. Any other above-SG negotiated employer amount is a **Setting** |
| 5b | Subdiv 290-C deductions | (c) | **compute** | this is `PersonalDeductibleContributions`, already modelled |
| 5c | less excess concessional contributions | (c) | **compute** | `superConcessional.ts` already computes the excess against the cap and carry-forward headroom |
| 6a | Net financial investment loss | (d) | **Setting** — user must supply | requires deductions attributable to financial investments (margin-loan interest, borrowing costs) net of gross investment income, floored at zero. Only computable if the model gains a geared-portfolio dimension |
| 6b | Net rental property loss | (d) | **Setting** — user must supply | negative gearing on property. Not in the modelled world |
| 7 | less s 301-20(3) amount | (e) | **compute *if* lump sums are modelled** | derivable from a modelled lump sum taken between preservation age and 60, capped at the low rate cap amount (s 307-345). Otherwise a Setting, nil by default |

**Bottom line for the seam.** `additionalSurchargeComponents` in `incomeBases.ts` is currently one undifferentiated remainder. The sourced decomposition says it should become **at least four named inputs** — reportable fringe benefits total, the non-derivable RESC remainder, net financial investment loss, net rental property loss — plus two disregards and one subtraction. **Four of the seven rows above are Settings the tool genuinely cannot derive.** That is a real finding, not a gap: the seam does not close by computation, it closes by asking the user.

---

## 3. "Low tax contributions" — ITAA 1997 ss 293-25 and 293-30

### Finding 3.1 — s 293-25, verbatim

- **Name:** Low tax contributions
- **Rule:** ITAA 1997 **s 293-25**:

> The amount of your **low tax contributions** for a \*financial year is:
> **(a)** the **low tax contributed amounts covered by section 293-30** for the financial year; **less**
> **(b)** your \***excess concessional contributions** for the financial year (if any).
>
> *Note 1:* Low tax contributions are **modified for defined benefit interests** (see Subdivision **293-D**).
> *Note 2:* Modifications in Subdivision **293-E** (constitutionally protected State higher level office holders) and Subdivision **293-F** (Commonwealth justices) affect the amount of low tax contributions.

- **Financial year:** current law; applies FY2026-27
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-25
- **Retrieval date:** 2026-09-05
- **Confidence:** primary-verified

**Register §3.6 states this correctly.** Its row "Low tax contributions = low tax contributed amounts (s 293-30) **less** excess concessional contributions | s 293-25" is exactly right.

### Finding 3.2 — s 293-30, verbatim

- **Rule:** ITAA 1997 **s 293-30**:
  - **(1)** The low tax contributed amounts for a financial year are the **sum** of the contributions covered by **(2)** and the amounts covered by **(5)**.
  - **(2)** A contribution is covered if **(a)** it is made in the financial year to a \*complying superannuation plan **in respect of you**; and **(b)** it is included **in the assessable income of the \*superannuation provider** in relation to the plan, or by way of a \*roll-over superannuation benefit in the assessable income of a complying superannuation fund or RSA provider in the circumstances in s 290-170(5) (successor funds).
  - **(3)** For the purposes of (2)(b), **disregard** (a) table item 5.3 in s 50-25 (income tax exemption for **constitutionally protected funds**) and (b) **Subdivision 295-D** (excluded contributions).
  - **(4) Exceptions.** Despite (2), a contribution is **not** covered if it is: **(a)** an amount mentioned in s 295-200(2) (transfers from **foreign superannuation funds**); **(b)** an amount mentioned in item 2 of the table in s 295-190(1) (certain **roll-over superannuation benefits**); **(c)** an amount the Commissioner pays for your benefit under **Part 8 of the SGAA 1992** where it represents a charge payment paid as a result of an **amnesty** disclosure under SGAA s 74; **(d) *(Repealed by No 57 of 2025)***.
  - **(5)** An amount in a complying superannuation plan is covered if it is **allocated** by the superannuation provider for you for the financial year in accordance with conditions specified by a **regulation made for the purposes of s 291-25(3)** (the reserve-allocation rule).
  - *Note to (1):* modified for **State higher level office holders** (Subdivision 293-E).
- **Live change for the forecast year:** s 293-30(4)**(d)** — which excluded an employer amnesty contribution offset under SGAA s 23A — was **repealed by No 57 of 2025, Sch 1 item 94, effective 1 July 2026**. It is therefore **gone for FY2026-27**. (This is the same Act — Payday Super — the register already tracks at §3.5.)
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-30
- **Retrieval date:** 2026-09-05
- **Confidence:** primary-verified

### Finding 3.3 — Side-by-side against `ConcessionalContributions` (ITAA 1997 s 291-25)

s 291-25 was retrieved from https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F291-25 (2026-09-05) to make this comparison against the statute rather than against a summary.

| | **Concessional contributions** — s 291-25 | **Low tax contributed amounts** — s 293-30 | Same? |
|---|---|---|---|
| Base limb 1 | (2): contribution made in the FY to a complying super plan in respect of you, **included in the provider's assessable income** (or s 290-170(5) successor-fund roll-over) | (2): **word-for-word the same test** | ✅ |
| Base limb 2 | (3): amount **allocated** per conditions in the regulations | (5): amount allocated per **conditions specified by a regulation made for the purposes of s 291-25(3)** — the *same* regulations | ✅ |
| Disregards for the assessable-income test | (4): s 50-25 item 5.3 (constitutionally protected funds) and Subdiv 295-D (excluded contributions) | (3): **identical pair** | ✅ |
| Excl. — foreign super fund transfers, s 295-200(2) | (2)(c): excluded | (4)(a): excluded | ✅ |
| Excl. — certain roll-overs, s 295-190(1) item 2 | (2)(d): excluded | (4)(b): excluded | ✅ |
| Excl. — **SIS Act s 99G(6) refunded amounts** | **(2)(e): EXCLUDED** (inserted by No 127 of 2021, from FY2021-22) | **no equivalent** | ❌ **MISMATCH** |
| Excl. — **SGAA amnesty charge payments** paid by the Commissioner under SGAA Pt 8 | **no equivalent** | **(4)(c): EXCLUDED** | ❌ **MISMATCH** |
| Excl. — employer amnesty offset under SGAA s 23A | no equivalent | (4)(d) — **repealed from 1 July 2026** | n/a for FY2026-27 |
| Defined benefit interests | modified by **Subdiv 291-C** | modified by **Subdiv 293-D** — *different* Subdivisions | ⚠️ separate machinery |
| Deduct excess concessional contributions | **no** — the excess *is* a concessional contribution (that is what makes it excess) | **yes** — s 293-25(b) subtracts it | ❌ **by design** |
| State higher level office holders / Cwlth justices | no modification | **Subdiv 293-E / 293-F** modify | ⚠️ |

### Finding 3.4 — THE MISMATCHES, stated plainly

**(i) The big one, and it is by design: excess concessional contributions are concessional but are NOT low tax contributions.**
s 293-25(b) subtracts them. The Guide, **s 293-10**, says so in terms: *"The tax is **not** payable in respect of excess concessional contributions."* The reason is that the excess is separately included in the Person's assessable income and taxed at marginal rates under Div 291, so taxing it again at 15% would be double taxation.
- **Modelling consequence:** `low_tax_contributions = concessional_contributions − excess_concessional_contributions`, i.e. **the concessional contributions capped at the Person's cap** (general cap plus any carry-forward increase). `superConcessional.ts` already computes both sides of that subtraction — `applyConcessional` returns the total and the excess. **The seam closes here with arithmetic the codebase already has.**
- **Confidence:** primary-verified

**(ii) Concessional but NOT a low tax contributed amount: SGAA amnesty charge payments.**
s 293-30(4)(c) excludes an amount the Commissioner pays for your benefit under Part 8 of the SGAA where it represents a charge payment made under the superannuation guarantee amnesty (SGAA s 74). s 291-25 has **no** matching exclusion, so the same amount **is** a concessional contribution. Historic (the amnesty window closed 7 September 2020) and irrelevant to a forward projection, but it is a genuine one-directional mismatch and it means "low tax contributions = concessional contributions less excess" is a **near**-identity, not an identity.
- **Confidence:** primary-verified

**(iii) A low tax contributed amount but NOT a concessional contribution: SIS Act s 99G(6) refunded amounts.**
s 291-25(2)(e) — inserted by No 127 of 2021 Sch 3 item 71, effective 1 January 2022 and applying from FY2021-22 — excludes from *concessional contributions* an amount mentioned in **SIS Act s 99G(6)** that is refunded in accordance with that subsection. **s 293-30 was not given a corresponding exception.** On the face of the two provisions the amount therefore remains a low tax contributed amount while ceasing to be a concessional contribution.
- **This is the mismatch this brief was worried about, and it runs in the direction the codebase would not catch:** a figure derived as `concessional − excess` would *understate* low tax contributions in a year where such a refund occurred.
- **Honest caveat:** I did **not** retrieve SIS Act s 99G to establish what kind of amount this is, nor did I find ATO material or an explanatory memorandum addressing whether the omission from s 293-30 is deliberate or an oversight. The conclusion above is **inferred from the absence of a matching paragraph in s 293-30(4)**, not stated anywhere in terms. See UNVERIFIED LIST **U1**.
- **Confidence:** **primary-verified** that s 291-25(2)(e) exists and s 293-30(4) has no counterpart; the *consequence* is **inferred from statutory structure**, not stated.

**(iv) Defined benefit interests run on separate machinery.**
Concessional contributions are modified by **Subdiv 291-C**; low tax contributions by **Subdiv 293-D**. These are different Subdivisions with different rules — you cannot compute one from the other for a Person with a defined benefit interest. **Subdivisions 293-D, 293-E and 293-F were not retrieved** — see UNVERIFIED LIST **U2**. For a Person with an accumulation interest only, they do not apply.

**(v) The forecaster's own limbs.** Mapping `ConcessionalContributions` in `src/core/superConcessional.ts`:

| Codebase limb | s 291-25 | s 293-30 | Verdict |
|---|---|---|---|
| employer contributions (SG) | covered by (2) | covered by (2) | ✅ both |
| salary sacrificed | covered by (2) | covered by (2) | ✅ both |
| personal deductible (Subdiv 290-C, with s 290-170 notice) | covered by (2) — the notice is what puts it in the fund's assessable income under Subdiv 295-D | covered by (2), with the **same** Subdiv 295-D disregard in (3)(b) | ✅ both |
| `otherConcessional` (unenumerated remainder) | — | — | ⚠️ whatever is put here must be checked against **both** lists; the two exclusion sets are *not* identical |

**The `otherConcessional` remainder is the one place the mismatch can bite silently.** The three named limbs are safe in both directions. The remainder is not.

---

## 4. The $250,000 threshold — indexed or frozen?

### Finding 4.1 — **CONFIRMED FROZEN.** Three independent primary grounds, plus ATO corroboration.

- **Name:** Division 293 high income threshold
- **Value:** **$250,000**
- **Financial year:** FY2026-27 (and every year from FY2017-18 onwards)
- **Config or constant:** **CONSTANT — a frozen nominal literal.** Do **not** put it in indexed config. Do **not** apply CPI or AWOTE to it in any forecast year.
- **Confidence:** **primary-verified**

This is not "no indexation provision found". It is **confirmed frozen**, on the following grounds, each independently retrieved:

**Ground 1 — It is a bare literal in the operative provision, and there is no indexation language anywhere in Division 293.**
I fetched **every section of Division 293** from the ATO Legal Database by brute-force probe of `293-1` … `293-320` (30 sections exist: 293-1, -5, -10, -15, -20, -25, -30, -35, -60, -65, -70, -75, -100, -105, -115, -140, -145, -150, -155, -160, -185, -190, -195, -200, -225, -230, -235, -240, -245, -250) and grepped the lot for `indexation` / `indexed` / `index number` / `index factor`. **Zero hits.** The `$250,000` appears in exactly **five** places, all as a bare literal:

| Provision | Role |
|---|---|
| s 293-1 (Guide to Division 293) | "The high income threshold is $250,000." |
| s 293-10 (Guide to Subdivision 293-B) | "...compared to the high income threshold of $250,000." |
| **s 293-20(1)** | **the operative test** |
| s 293-155(1) (Subdiv 293-E, State higher level office holders) | "...exceeds the $250,000 threshold mentioned in that subsection" |
| s 293-200(1) (Subdiv 293-F, Commonwealth justices) | same |

**Ground 2 — It is not in the s 960-265 table, and that table is the gateway.**
ITAA 1997 **s 960-270(1)**: *"**Some** provisions of this Act require amounts to be indexed. You index an amount by multiplying it by its \*indexation factor."* Indexation applies only where a provision requires it; **s 960-265** is the exhaustive list of "the provisions for which indexation is relevant". I retrieved the whole table. It contains items 1, 2, 3, 3A, 5, 6, 7, 8, 9, 10, 10A, 10B, 10C, 11, 12, 13, 13A, 14. **There is no Division 293 item, and the string "293" does not appear in s 960-265, s 960-270 or s 960-275 at all.**

**The contrast inside the same table is the strongest part of this finding.** Every neighbouring superannuation threshold that *is* indexed is listed there by name:

| s 960-265 item | Indexed amount |
|---|---|
| 9 | **\*Concessional contributions cap** — s 291-20(2) |
| 10 | \*CGT cap amount — s 292-105(4) |
| 10A | **\*General transfer balance cap** — s 294-35 |
| 10B | \*Large superannuation balance threshold — s 296-30 |
| 10C | \*Very large superannuation balance threshold — s 296-35 |
| 11 | \*Low rate cap amount — s 307-345(4) |
| 12 | \*Untaxed plan cap amount — s 307-350(4) |
| — | **Division 293 threshold — ABSENT** |

Parliament put the Div 296 thresholds into this table in 2026 and did not add Div 293. The omission is not an oversight of drafting era.

**Ground 3 — The only mechanism that has ever changed it is a textual amendment, and it changed all five occurrences at once.**
The threshold moved from $300,000 to $250,000 by the **Treasury Laws Amendment (Fair and Sustainable Superannuation) Act 2016 (No. 81 of 2016)**, Sch 2 **items 14, 15, 16, 17 and 18**, effective 1 January 2017 and applicable in relation to the **2017-18 income year and later income years** — one item per occurrence, each expressed as *"by substituting '$250,000' for '$300,000'"*. That is what a frozen figure looks like: it can only move when Parliament rewrites five separate strings.

**Corroboration (secondary, and it agrees).** ATO, *Division 293 tax* rates page, **last updated 7 August 2026**, Table 7:

| Income year | Threshold |
|---|---|
| **2017–18 onwards** | **$250,000** |
| 2012–13 to 2016–17 | $300,000 |

Note the shape of the ATO's own table: a **single open-ended row** covering every year from 2017-18 on. Compare the ATO's concessional-cap table, which necessarily carries a different figure per year because that cap *is* indexed. The presentation is itself evidence.

- **Source URLs:**
  - https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-20 (operative)
  - https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-1 · `.../293-10` · `.../293-155` · `.../293-200` (the other four occurrences)
  - https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-265 (the indexation table)
  - https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-270 ("Some provisions of this Act require amounts to be indexed")
  - https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax (ATO, retrieved 2026-09-05, page last updated 7 August 2026)
- **Retrieval date:** 2026-09-05

### Finding 4.2 — What *kind* of frozen this is (the P1-11 comparison)

This is **weaker** than the $5,000 small shareholder exemption's freeze, and the difference should be recorded so the two are not filed under one label.

| | Div 293 $250,000 | s 160APHT $5,000 |
|---|---|---|
| Indexation provision | none | none |
| Is the containing provision live? | **YES** — s 293-20 is current, amendable law | **NO** — repealed 2006; imported as a frozen 30 June 2002 snapshot |
| Can Parliament index it without new machinery? | **YES** — one item added to the s 960-265 table plus an "is indexed" hook | **NO** — structurally incapable; would need a wholly new provision |
| Has it ever moved? | **YES** — $300,000 → $250,000, No 81 of 2016 | once (introduced at $5,000 by No 89 of 2000) |
| Model as | **frozen nominal constant, with a documented policy-change risk** | frozen, full stop |

**Modelling instruction:** hold at $250,000 in every projected year. **Register T21 is correct** and this research confirms it. The bracket creep is real and is the point: at ~3.5% nominal wage growth, a Person on $180,000 today crosses $250,000 in roughly a decade, at which point Div 293 begins to bite on their concessional contributions. That is a feature of the projection.

### Finding 4.3 — The rate (confirmed while here)

- **Name:** Division 293 tax rate
- **Rule:** *Superannuation (Sustaining the Superannuation Contribution Concession) Imposition Act 2013* (**No. 87, 2013**), **s 5**: *"The amount of the tax is **15%** of a person's **taxable contributions** for an income year."* s 4 imposes the tax payable under ITAA 1997 s 293-15. ITAA 1997 **s 293-15**: *"You are liable to pay \*Division 293 tax if you have \*taxable contributions for an income year."*
- **Note the base:** the 15% applies to **taxable contributions** (the `min(...)` output of s 293-20(1)), **not** to low tax contributions. A model that multiplies 15% by the whole of low tax contributions overstates the tax for every Person in the shade-in band.
- **Config or constant:** **constant** — a bare 15% in the Imposition Act with no indexation and no formula
- **Source:** FRL OData, `titleid='C2013A00087'`, `format='Word'`, `volumeNumber=0`, `asat=2026-09-05` — retrieved and text-extracted 2026-09-05
- **Confidence:** primary-verified
- **Register correction (minor):** §3.6 cites this Act without its number. It is **No. 87 of 2013** (not No. 82, which is the *Tax and Superannuation Laws Amendment (Increased Concessional Contributions Cap and Other Measures) Act 2013* that inserted Div 293 itself).

---

## 5. Independent corroboration and downstream interactions

### Finding 5.1 — ATO guidance reproduces exactly the component list derived above, including the *direction* of each term

- **Source URL:** https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-293-tax-on-concessional-contributions-by-high-income-earners
- **Retrieval date:** 2026-09-05 · **Page last updated:** 24 August 2026
- **Confidence:** secondary-only as a source, but it **agrees with the statute on every limb**, which is the useful part

> *"The income component of the Division 293 tax calculation is based on the same income calculation used to determine the Medicare levy surcharge (MLS), **disregarding any reportable superannuation contributions**. The components of this income calculation are:*
> - *taxable income (assessable income minus allowable deductions)*
> - *total reportable fringe benefits amounts*
> - *net financial investment loss*
> - *net rental property loss*
> - *net amount on which family trust distribution tax has been paid*
> - *super lump sum taxed elements with a zero tax rate*
> - *assessable first home super saver released amount.*
>
> *These amounts are **added up (except the super lump sum and assessable first home super saver released amount, which are subtracted)** to give the income amount."*

**Cross-check against Finding 2.3 — every item lines up, and so does its sign:**

| ATO plain-English item | Statutory limb | Sign |
|---|---|---|
| taxable income | s 995-1 para (a) | + |
| total reportable fringe benefits amounts | para (b) → FBTAA ss 135N/135P | + |
| *(absent — because Div 293 disregards it)* | para (c) reportable super contributions | *removed by s 293-20(1)(a)* |
| net financial investment loss | para (d) limb (a) | + |
| net rental property loss | para (d) limb (b) | + |
| net amount on which family trust distribution tax has been paid | the ITAA 1936 Sch 2F s 271-105(1) **disregard** in para (a) | **+** ✔ confirms the direction inferred in Finding 2.3 |
| super lump sum taxed elements with a zero tax rate | the s 301-20(3) subtraction | **−** ✔ |
| assessable first home super saver released amount | the FHSS **disregard** in para (a) | **−** ✔ |

**Nothing in the ATO list is absent from the statute, and nothing in the statute is absent from the ATO list.** The decomposition is closed. Two independent routes, agreeing.

**Note for register T9 (cross-reference only, not researched here):** the ATO states that income for surcharge purposes is "**the same income calculation used to determine the Medicare levy surcharge**". If that identity holds it means the Div 293 base and the MLS base are the *same* s 995-1 term, differing only in Div 293's RSC disregard. **This report does not verify the MLS side** (out of scope by the brief) — flagged as **U3** so that nobody treats it as settled.

### Finding 5.2 — The ATO's own worked example confirms the taper arithmetic

> *"Jan's Division 293 income is $240,000 and Division 293 super contributions are $15,000. This is a total of $255,000. Division 293 taxable contributions are the lesser of Division 293 super contributions ($15,000) or the amount above the $250,000 threshold ($5,000). Jan's Division 293 tax payable is **15% of $5,000**. So the Division 293 tax payable is **$750**."*

Jan has $15,000 of low tax contributions but pays tax on only $5,000 of them. **A cliff model would have charged her $2,250.** Three times too much. This is the single most important arithmetic point in the report.

### Finding 5.3 — Interaction with the carry-forward cap already modelled in `superCaps.ts`

- **ATO, same page:** *"Note that if your concessional contributions cap has increased due to the use of **carried-forward amounts**, **all contributions included in your higher cap amount are counted** for Division 293 purposes."*
- **Why the statute produces that result:** low tax contributions = low tax contributed amounts **less excess concessional contributions** (s 293-25). "Excess concessional contributions" is measured against the cap **as increased** by s 291-20(3)–(7). A bigger cap therefore means a *smaller* excess, therefore a *larger* subtrahend removed, therefore **more** low tax contributions.
- **The counter-intuitive consequence, stated plainly:** **using carry-forward headroom increases a high-income Person's Div 293 exposure.** A Person who contributes $60,000 against a $32,500 general cap plus $27,500 of carry-forward has **$60,000** of low tax contributions and no excess. The same Person without the headroom has $32,500 of low tax contributions and $27,500 of excess — the excess escapes Div 293 entirely (and is instead taxed at marginal rates under Div 291). **A model that treats carry-forward as unambiguously beneficial for a Person above $250,000 is wrong.**
- **Confidence:** primary-verified as to the statutory mechanism (ss 293-25, 291-20(3)–(7)); ATO guidance corroborates the outcome in terms

### Finding 5.4 — Commissioner's discretion does not reach Div 293

- **ATO, same page:** *"Unlike excess contributions, we **don't have discretion to disregard or reallocate contributions** for the calculation of Division 293 tax. If you apply (and we agree) to have your excess concessional contributions disregarded or reallocated to another year, they will retain concessional tax treatment and **need to be added back into the Division 293 calculation**."*
- **Modelling consequence:** there is no discretionary relief valve to model. Good — one fewer branch.
- **Confidence:** secondary-only (this is ATO's statement of its own powers; the underlying provision, ITAA 1997 s 291-465, was **not retrieved** — see **U4**)

### Finding 5.5 — How the liability is settled (relevant to cashflow modelling, not to the income base)

- **ATO:** the Person may pay *"with your own money"* **or** *"by releasing money from super"* (a release authority). The tax is a **personal** liability, not a fund liability — unlike the 15% contributions tax in `superConcessional.ts`.
- **Defined benefit members:** payment is **deferred to a debt account** until a benefit is paid from the interest, and unpaid deferred amounts attract **end of year interest** at the average 10-year Treasury bond rate. The ATO rates page publishes that rate per year (e.g. 2025–26: **4.6148%**).
- **Modelling consequence:** if the model ever charges Div 293, it must decide **which pot pays** — after-tax cash, or the super balance via a release. The two produce different terminal balances. That is a modelling decision, not a legal one, and it belongs in a Setting.
- **Sources:** ATO Div 293 guidance page (above); ATO Div 293 rates page https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax
- **Confidence:** secondary-only (the underlying provisions — TAA 1953 Sch 1 Part 3-20, ITAA 1997 Subdiv 293-C and the debt-account machinery in ss 293-100 to 293-115 — were **not** retrieved in full; see **U5**)

---

## 6. Model-facing summary

### Constants and config

| Key | Value | FY | Config or constant | Statutory source | Indexation | Confidence |
|---|---|---|---|---|---|---|
| `DIV293_THRESHOLD` | **250_000_00** cents | 2026-27 and every later year | **CONSTANT — frozen nominal literal** | ITAA 1997 s 293-20(1) | **none. Not in the s 960-265 table; no indexation language anywhere in Div 293; only ever moved by textual amendment (No 81 of 2016)** | primary-verified |
| `DIV293_RATE` | **0.15** | — | **constant** | *Superannuation (Sustaining the Superannuation Contribution Concession) Imposition Act 2013* (No. 87, 2013) **s 5** | none | primary-verified |
| `RFBA_ENTRY_THRESHOLD` | **2_000_00** cents (individual fringe benefits amount for the FBT year) | — | **constant — frozen literal** | FBTAA s 135P(1) | none found (last moved by No 110 of 2006) | primary-verified statutory text; *"no indexation"* is **inferred from the absence of a provision**, not separately confirmed — see **U6** |
| `FBT_RATE` | **0.47** → gross-up `1 ÷ 0.53` | — | **constant** | *Fringe Benefits Tax Act 1986* s 6 | none | primary-verified |

**`DIV293_THRESHOLD` must not be modelled as indexed config.** It is a nominal constant that erodes across the whole projection horizon. That erosion is the behaviour, not a bug.

### Types

`SurchargeIncome` in `src/core/incomeBases.ts` is the right brand and it is already distinct from `TaxableIncome`. What this research says is that **Div 293 does not consume `SurchargeIncome` directly** — it consumes `SurchargeIncome` *with paragraph (c) removed*. Those are two different numbers, and for a salary-sacrificing Person they differ by the whole sacrificed amount. Modelling suggestion (design decision, not a legal finding): a second brand, or a constructor that takes the reportable-super-contributions component **separately** so it can be excluded by construction rather than by a subtraction someone can forget.

### Decision procedure

```
# ---- s 995-1 "income for surcharge purposes" ------------------------------
surcharge_income(person, year):
    ti = taxable_income(person, year)                      # ITAA 1997 s 4-15

    # the two disregards written into s 995-1 para (a)
    ti -= assessable_fhss_released_amount                  # s 313-20; SETTING, nil default
    ti += family_trust_distribution_tax_reduction          # ITAA 1936 Sch 2F s 271-105(1)
                                                           # SETTING, nil default. NOTE: this ADDS.

    rfbt  = reportable_fringe_benefits_total               # FBTAA s 135N; SETTING (user supplies)
                                                           #   = Σ over employers of s 135P amounts
                                                           #   each = individual_fb_amount / (1 - 0.47)
                                                           #   only if individual_fb_amount > 2000

    rsc   = max(0, resc + subdiv_290C_deductions - excess_concessional)   # s 995-1
                                                           #   resc: TAA Sch 1 s 16-182 — salary
                                                           #   sacrifice YES, SG-rate employer NO
                                                           #   "reduced (but not below zero)"

    tnil  = max(0, fin_inv_deductions - fin_inv_income) \
          + max(0, rental_deductions   - rental_income)    # s 995-1; TWO silos, each floored at 0,
                                                           # NEVER netted against each other.
                                                           # SETTINGS (user supplies)

    lump_sum_0pct = amount_under_s_301_20_3                # taxable component of a super lump sum
                                                           # taken between preservation age and 60,
                                                           # capped at the low rate cap (s 307-345)

    return ti + rfbt + rsc + tnil - lump_sum_0pct

# ---- s 293-20 Division 293 -----------------------------------------------
div293_tax(person, year):
    # (a) income for surcharge purposes DISREGARDING reportable super contributions
    base = surcharge_income(person, year) - rsc            # s 293-20(1)(a)
                                                           # equivalently: build it without rsc

    # (b) low tax contributions — ss 293-25, 293-30
    ltc  = low_tax_contributed_amounts                     # s 293-30: ≈ concessional contributions
                                                           # (see the two mismatches in Finding 3.4)
         - excess_concessional_contributions               # s 293-25(b)
    # For an accumulation-only Person with no amnesty amounts and no SIS s 99G(6) refund:
    #     ltc == concessional_total - excess
    # i.e. the concessional contributions AS CAPPED (general cap + carry-forward increase).

    if ltc <= 0: return 0                                  # s 293-20(2)

    excess = (base + ltc) - 250_000_00                     # frozen threshold
    if excess <= 0: return 0

    taxable_contributions = min(ltc, excess)               # s 293-20(1) — TAPER, NOT A CLIFF
    return 0.15 * taxable_contributions                    # Imposition Act 2013 s 5
```

**The three things a naive implementation gets wrong, in order of damage:**
1. **Charging 15% on the whole of `ltc` once the threshold is crossed.** That is the cliff error. The ATO's own example (Finding 5.2) shows it overstating by 3×.
2. **Forgetting the s 293-20(1)(a) RSC disregard.** For a Person sacrificing $25,000 this double-counts $25,000 — once in the income base and again in the contributions — and pulls people over the threshold who are not over it.
3. **Indexing the $250,000.** Suppresses the bracket creep the projection exists to show.

### What the seam still needs from the user

Four **Settings**, none derivable, all nil by default and nil **by choice**:
`reportableFringeBenefitsTotal`, `netFinancialInvestmentLoss`, `netRentalPropertyLoss`, and the non-derivable RESC remainder (employer contributions above SG that the Person can influence). Plus three nil-by-default edge inputs: `assessableFhssReleasedAmount` (already present on `rebateIncome`), `familyTrustDistributionTaxAddBack`, and the `s 301-20(3)` lump-sum subtraction.

---

## 7. UNVERIFIED LIST

| # | What is not closed | Why it matters | Exactly what would close it |
|---|---|---|---|
| **U1** | **SIS Act s 99G(6) refunded amounts appear to be a low tax contributed amount while not being a concessional contribution.** I retrieved both s 291-25(2)(e) and the whole of s 293-30 and confirmed s 293-30(4) has no matching exception. I did **not** retrieve SIS Act s 99G, and found no ATO or EM statement on the asymmetry. The consequence is **inferred from statutory structure, not stated in terms.** | It is the one direction in which `low_tax_contributions = concessional − excess` **understates**. Low-frequency, but silent. | Retrieve *Superannuation Industry (Supervision) Act 1993* **s 99G** (FRL `C2004A02952` or equivalent) to see what kind of amount is refunded, and the EM to No 127 of 2021 Sch 3 to see whether the omission from s 293-30 was considered |
| **U2** | **Subdivisions 293-D (defined benefit interests), 293-E (constitutionally protected State higher level office holders) and 293-F (Commonwealth justices) were not retrieved beyond their headings and ss 293-155/293-200.** All three modify low tax contributions (s 293-25 Notes 1 and 2). | If the model ever gains a defined benefit member, `low_tax_contributions` is computed by different machinery entirely. | Retrieve ss 293-100 to 293-115 (Subdiv 293-C/D), 293-140 to 293-160 (293-E) and 293-185 to 293-200 (293-F). All 30 sections are confirmed to exist at `?DocID=PAC%2F19970038%2F293-<n>` — the HTML is already cached in the scratchpad from this session's sweep |
| **U3** | **The ATO's statement that income for surcharge purposes is "the same income calculation used to determine the Medicare levy surcharge" is not verified against the MLS provisions.** Deliberately out of scope per the brief. | Register T9 keeps four income bases separate. If MLS income and Div 293 income really are one s 995-1 term, that is a simplification available to the codebase — but only if verified. | Retrieve *Medicare Levy Act 1986* s 8B–8G and confirm they turn on the s 995-1 term "income for surcharge purposes". Explicitly deferred |
| **U4** | **ITAA 1997 s 291-465 (Commissioner's discretion to disregard or reallocate excess concessional contributions) was not retrieved.** Finding 5.4 rests on ATO's own description of its powers. | Only matters if the model ever simulates a discretion application. | Retrieve s 291-465 |
| **U5** | **The collection machinery — TAA 1953 Sch 1 Part 3-20, release authorities, and the defined-benefit debt account — was not retrieved.** Finding 5.5 is ATO guidance only. | Determines *which pot pays* the tax, which changes terminal balances. | Retrieve TAA 1953 Sch 1 Part 3-20 (`?DocID=PAC%2F19530001%2FSch1-133-...` — the `Sch1-` prefix form works, see §9) |
| **U6** | **The FBTAA s 135P(1) $2,000 entry threshold: "not indexed" is inferred from the absence of an indexation provision, not confirmed.** I did not sweep the FBTAA for indexation machinery the way I swept Div 293. | Only affects whether a Person with marginal fringe benefits crosses into having a reportable amount. Second-order. | Sweep FBTAA Part XIB (ss 135K–135U) and the FBTAA's own indexation provisions for any hook onto the $2,000 |
| **U7** | **Whether "otherConcessional" in `superConcessional.ts` can hold anything that diverges between s 291-25 and s 293-30.** The three named limbs are safe in both directions; the remainder is unbounded by construction. | This is where mismatch (ii) and (iii) would enter the model. | A codebase decision, not a research one: either enumerate what may go in `otherConcessional`, or make it carry a caveat that it has been checked against **both** s 291-25(2) and s 293-30(4) |

**Nothing in the three questions the brief asked is unclosed.** U1 is a boundary case at the edge of Question 2; U2–U7 are adjacent territory recorded so it is visible that it was not researched.

---

## 8. DISCREPANCIES

### D1 — The brief's recollection of the component list: **mostly right, wrong in the place that matters**
"Reportable **employer** superannuation contributions" is not the s 995-1 term. The term is "**reportable superannuation contributions**" = RESC **plus Subdiv 290-C deductions (personal deductible contributions)**, reduced (not below zero) by excess concessional contributions. Since Div 293 then *disregards* that whole limb, getting its scope wrong changes which of the Person's own contributions are stripped from the income base. The recollection also **missed the subtractive fifth limb** (s 301-20(3)) and both disregards inside paragraph (a). Recorded as a useful negative result, as the brief invited.

### D2 — Register §3.6 is **accurate but incomplete**, and one row needs sharpening
Everything §3.6 asserts, this research confirms:

| §3.6 row | Verdict |
|---|---|
| Threshold $250,000, constant, not in the s 960-265 indexation table | ✅ **confirmed, and strengthened** — see Finding 4.1, which adds two further independent grounds |
| Rate 15% | ✅ confirmed — but the Act is **No. 87 of 2013**; §3.6 gives no Act number, and No 82 of 2013 (which it cites for the Division) is a different Act |
| Income base = income for surcharge purposes (disregarding RSC) plus low tax contributions | ✅ confirmed verbatim |
| Taxable contributions = lesser of low tax contributions and the excess over $250,000 | ✅ confirmed verbatim |
| Low tax contributions = low tax contributed amounts (s 293-30) less excess concessional contributions | ✅ confirmed verbatim |

**Nothing in §3.6 is wrong.** What it lacks is the decomposition of "income for surcharge purposes" — which is the whole reason for this report — and it does not record that **the excess/threshold relationship is a taper**. The words "the **lesser** of" carry that, but a reader skimming the row could implement a cliff. §3.6 should gain the seven-component list and an explicit "shade-in, not a cliff" note.

### D3 — `incomeBases.ts` `SurchargeIncomeComponents` is under-specified for its Div 293 consumer
The current shape is `taxableIncome + additionalSurchargeComponents`. Two problems now visible:
1. **It cannot express the RSC disregard.** Div 293 needs `income for surcharge purposes minus paragraph (c)`. With RSC hidden inside an undifferentiated remainder, the disregard cannot be applied by construction — only by a subtraction the caller has to remember.
2. **It has no subtractive term.** The s 301-20(3) amount and the FHSS disregard both *reduce* the base; `addCents(taxableIncome, additionalSurchargeComponents)` can only represent them by allowing a negative remainder, which would also silently permit a negative total.

This is an observation for the build phase, not a defect in the current code — the seam was deliberately left open and is correctly caveated. **Not fixed here; this report writes no code.**

### D4 — `superConcessional.ts` `DIVISION_293_CAVEAT` says the threshold is on "**Div 293 income**"
The caveat reads *"a Person whose Div 293 income exceeds $250,000"*. The statutory test is on the **sum of** the income base **and** the low tax contributions (s 293-20(1)) — contributions are on the *same side* of the comparison as income, not the other side. A Person with $235,000 of Div 293 income and $20,000 of contributions is over the threshold on $255,000 even though their "Div 293 income" is $235,000. Minor wording, but it is the kind of imprecision that becomes an implementation.

### D5 — **Carry-forward increases Div 293 exposure.** Not a discrepancy with anything written, but a counter-intuitive interaction not currently recorded anywhere
See Finding 5.3. Using carry-forward headroom converts what would have been an *excess* concessional contribution (outside Div 293, taxed at marginal rates under Div 291) into a *within-cap* concessional contribution (inside Div 293, taxed at 15%). For a Person above the threshold this is a real trade-off, and any UI that presents carry-forward as a straightforward win is misleading them.

---

## 9. Fetch-guidance corrections and additions

Recorded because the brief asked for it. **Every instruction in the brief that I exercised worked as stated.**

| Guidance | Outcome |
|---|---|
| ATO Legal Database via `curl` with a browser User-Agent, `?DocID=PAC%2F19970038%2F<section>` | ✅ **Worked, every time, ~30 fetches.** No blocking, no rate limiting, no Cloudflare challenge. The `?LocID=` form was not needed and was not tried |
| legislation.gov.au OData `api.prod.legislation.gov.au/v1/` | ✅ **Worked.** `format='Word'` + `volumeNumber=0` + `rectificationVersionNumber=0` returned a real `.docx` for both the Imposition Act and the FBT Act |
| ATO formula GIFs | **Not encountered.** Division 293 contains no formula images. ITAA 1936 Sch 2F s 271-105(2) *is* a formula and rendered as **inline text**, not an image |
| ATO section pages reproduce related provisions inline | ✅ Confirmed — every page carries its full Part/Division/Subdivision heading chain and complete amendment history, which is how the No 81 of 2016 item numbers in Finding 4.1 were established |

**Two additions worth carrying forward:**

1. **Schedule sections need a `Sch<N>-` prefix.** `?DocID=PAC%2F19530001%2F16-182` returns **404**. `?DocID=PAC%2F19530001%2FSch1-16-182` returns **200**. Same for ITAA 1936 Schedule 2F: `.../19360027/271-105` → 404, `.../19360027/Sch2F-271-105` → 200. The forms `16-182(Sch1)` and `Sch 1-16-182` both 404. **This is not in the brief's guidance and would otherwise read as "the provision does not exist".**
2. **`?DocID=PAC%2F19970038%2F995-1` returns the entire ITAA 1997 Dictionary in one 5.2 MB page.** Every s 995-1 definition in this report — `income for surcharge purposes`, `reportable superannuation contributions`, `reportable employer superannuation contribution`, `reportable fringe benefits total`, `total net investment loss`, `financial investment`, `assessable FHSS released amount` — came from that single fetch, with amendment history attached to each. It is the most efficient fetch available for any definitional question.
3. **`www.ato.gov.au` guidance pages 403 against `WebFetch` but 200 against `curl` with a browser User-Agent.** Use `curl`. The correct URL for a guidance page is best obtained by grepping `href=` out of a related ATO page rather than guessed — ATO guidance URLs are long, deeply nested, and get reorganised (three plausible guesses all returned 404 before the correct path was extracted from the rates page's own HTML).

---

## 10. Source register

| # | URL | Retrieved | What it yielded | Confidence contribution |
|---|---|---|---|---|
| 1 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-20 | 2026-09-05 | **s 293-20(1)–(2) verbatim**; the $250,000; the taper formula; No 81 of 2016 Sch 2 item 18 amendment note | primary |
| 2 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F995-1 | 2026-09-05 | The **whole ITAA 1997 Dictionary** (5.2 MB) — `income for surcharge purposes`, `reportable superannuation contributions`, `reportable employer superannuation contribution`, `reportable fringe benefits total`, `total net investment loss`, `financial investment`, `assessable FHSS released amount`, each with amendment history | primary |
| 3 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-25 | 2026-09-05 | **s 293-25 verbatim** + Notes 1 and 2 (Subdiv 293-D/E/F modifications) | primary |
| 4 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-30 | 2026-09-05 | **s 293-30(1)–(5) verbatim**, incl. the (4)(c) amnesty exception and the (4)(d) repeal by No 57 of 2025 effective 1 July 2026 | primary |
| 5 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F291-25 | 2026-09-05 | **s 291-25(1)–(4) verbatim** — the concessional contributions definition used for the side-by-side in Finding 3.3, incl. (2)(e) SIS s 99G(6) | primary |
| 6 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-15 | 2026-09-05 | s 293-15 liability provision | primary |
| 7 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-10 | 2026-09-05 | Guide to Subdiv 293-B: *"A tax is payable on the excess, or on the superannuation contributions (whichever is less)"* and *"The tax is not payable in respect of excess concessional contributions"* | primary (Guide) |
| 8 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-1 | 2026-09-05 | Guide to Div 293; *"The high income threshold is $250,000"*; No 81 of 2016 items 14–15 | primary (Guide) |
| 9 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-155 | 2026-09-05 | Subdiv 293-E occurrence of the $250,000; No 81 of 2016 item 18 | primary |
| 10 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F293-200 | 2026-09-05 | Subdiv 293-F occurrence of the $250,000; No 81 of 2016 item 18 | primary |
| 11 | `?DocID=PAC%2F19970038%2F293-<n>` for n = 1…320 (brute-force sweep) | 2026-09-05 | **30 sections exist**: 293-1, -5, -10, -15, -20, -25, -30, -35, -60, -65, -70, -75, -100, -105, -115, -140, -145, -150, -155, -160, -185, -190, -195, -200, -225, -230, -235, -240, -245, -250. Grep for `indexation` / `indexed` / `index number` / `index factor` across all 30: **zero hits** | primary (negative result) |
| 12 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-265 | 2026-09-05 | The **full indexation table** — items 1–14. **No Div 293 item.** Items 9, 10, 10A, 10B, 10C, 11, 12 are the indexed super thresholds by contrast | primary (negative result) |
| 13 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-270 | 2026-09-05 | *"**Some** provisions of this Act require amounts to be indexed"* — establishes s 960-265 as the gateway | primary |
| 14 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-275 | 2026-09-05 | The indexation factor formula (rendered as inline text, not a GIF). Confirms no Div 293 reference | primary |
| 15 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F301-20 | 2026-09-05 | **s 301-20(1)–(5) verbatim** — the subtractive limb of `income for surcharge purposes` | primary |
| 16 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19360027%2FSch2F-271-105 | 2026-09-05 | **ITAA 1936 Sch 2F s 271-105(1)–(3) verbatim** — the family trust distribution tax reduction that Div 293 adds back | primary |
| 17 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19530001%2FSch1-16-182 | 2026-09-05 | **TAA 1953 Sch 1 s 16-182(1) verbatim** — the RESC "capacity to influence" test | primary |
| 18 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860039%2F135N | 2026-09-05 | **FBTAA s 135N verbatim** — reportable fringe benefits total = sum across employers | primary |
| 19 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860039%2F135P | 2026-09-05 | **FBTAA s 135P(1)–(3) verbatim** — the $2,000 entry test, the gross-up formula, the s 8A EV disregard | primary |
| 20 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860039%2F135Q | 2026-09-05 | FBTAA s 135Q — s 57A/s 58 employers (scoped out) | primary |
| 21 | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860039%2F136 | 2026-09-05 | FBTAA s 136(1) — pointer from `reportable fringe benefits total` to s 135N | primary |
| 22 | FRL OData `documents/find(titleid='C2013A00087', asat=2026-09-05, type='Primary', format='Word', uniqueTypeNumber=0, volumeNumber=0, rectificationVersionNumber=0)` | 2026-09-05 | **Imposition Act 2013 (No. 87, 2013) ss 3–6 verbatim** — the 15% rate on taxable contributions | primary |
| 23 | FRL OData, same call with `titleid='C2004A03281'` | 2026-09-05 | **Fringe Benefits Tax Act 1986 s 6** — FBT rate 47%; s 6A budget repair levy spent after FBT year starting 1 April 2016 | primary |
| 24 | FRL OData `titles?$filter=contains(name,'Sustaining the Superannuation')` | 2026-09-05 | Resolved the Imposition Act's title id to `C2013A00087` | n/a (lookup) |
| 25 | https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax | 2026-09-05 (page last updated 7 Aug 2026) | Table 7: **"2017–18 onwards → $250,000"** as a single open-ended row; the 15% rate; Table 8 end-of-year interest rates for deferred DB debts | secondary-only (corroborating) |
| 26 | https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-293-tax-on-concessional-contributions-by-high-income-earners | 2026-09-05 (page last updated 24 Aug 2026) | The **seven-item plain-English component list with signs**; the Jan worked example; the carry-forward interaction; the no-discretion statement; payment and DB deferral mechanics | secondary-only (corroborating) |

**Attempted and failed, recorded so they are not retried blindly:**

| URL / call | Result |
|---|---|
| `?DocID=PAC%2F19530001%2F16-182` | 404 — Schedule sections need the `Sch1-` prefix |
| `?DocID=PAC%2F19360027%2F271-105` | 404 — needs `Sch2F-` |
| `?DocID=PAC%2F19530001%2F16-182%28Sch1%29`, `.../Sch 1-16-182` | 404 both |
| `?DocID=PAC%2F2013011[89]%2F5`, `.../20130120/5`, `.../20130055/5` | 404 — the Imposition Act is not in the ATO Legal Database under a guessed `PAC` code; FRL is the route |
| `WebFetch` on any `www.ato.gov.au` guidance URL | HTTP 403 — use `curl` with a browser User-Agent |
| Three guessed ATO Div 293 guidance URLs | 404 — the working path was extracted from an `href` in the rates page HTML |
| FRL `titleid='C2004A03280'` for the FBT Act | 404 — the correct id is `C2004A03281` (`C2004A03280` is a different title) |
