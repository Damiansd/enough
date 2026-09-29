# P3-24 — WATO, the Working Australians tax offset

Research pass, 2026-09-11. No code, no register edits. Scope: source register **§2.8**'s WATO row
(O15, TODO P3-1b / P3-24).

---

## 0. Existence verdict

**IT IS ENACTED LAW. It is not an announcement, not a bill, not invented.**

> **ITAA 1997 Subdivision 61-E — Working Australians tax offset**, ss 61-150, 61-155, 61-160,
> inserted by **Treasury Laws Amendment (Tax Reform No. 1) Act 2026 (Act No. 49 of 2026),
> Schedule 3, item 1**. Schedule 3 commenced **1 July 2026**; the amendments apply
> **in relation to assessments for the 2027-28 income year and later income years**
> (Act No. 49 of 2026 Sch 3 Part 2 item 4).

§2.8's row is **substantively correct in every claim it makes** — it exists, it is non-refundable,
it is for residents, the test is net labour income against the tax-free threshold, and it runs from
2027-28. Its `unverified` label was earned only by the two things it left blank (amount and taper),
and both are now primary-verified. **Nothing in §2.8's WATO row was wrong.**

### Status, with dates

| Step | Date | Detail |
|---|---|---|
| Announced | **12 May 2026** | 2026-27 Budget (delivered Tue 12 May 2026), Budget Paper No. 2, Part 1 Receipt Measures, Treasury portfolio: *"Tax Reform — cutting taxes with a Working Australians Tax Offset"* |
| Bill introduced (HoR, 1R + 2R moved) | **28 May 2026** | **Treasury Laws Amendment (Tax Reform No. 1) Bill 2026** (Parliament 48, bId `r7493`), introduced with the Income Tax Rates Amendment (Tax Reform No. 1) Bill 2026 |
| Passed HoR (3R) | 4 Jun 2026 | |
| Senate 3R, with amendments | 25 Jun 2026 | Committee of the Whole: 30 Government and 3 Australian Greens amendments agreed to |
| **Finally passed both Houses** | **25 Jun 2026** | HoR agreed to Senate amendments the same day |
| **Assent** | **26 Jun 2026** | **Act No. 49 of 2026** |
| Schedule 3 commencement | **1 Jul 2026** | first 1 Jan/Apr/Jul/Oct after assent (Act s 2(1) table item 6, covering Schedules 3 and 4) |
| **First income year of effect** | **FY2027-28** | assessments for the 2027-28 income year and later |

Not superseded: **Treasury Laws Amendment (Tax Reform No. 2) Act 2026** (Act No. 71 of 2026,
assent 26 Aug 2026) contains three Schedules (loss carry back, $20,000 instant asset write-off,
PNG Chiefs Limited exemption) and **does not touch Subdivision 61-E**. The ATO consolidation of
Subdiv 61-E carries **one** history note only — *"inserted by No 49 of 2026"* — with no later
amendment.

### Source hierarchy used

1. **Primary, as-made statute** — legislation.gov.au Federal Register, Act No. 49 of 2026, as-made
   text, read in full from the ePub rendering (the SPA shell defeats `curl`, but the ePub HTML the
   shell's TOC links to serves the whole Act as plain XHTML):
   `https://www.legislation.gov.au/C2026A00049/asmade/2026-06-26/text/1/epub/OEBPS/document_1/document_1.html`
   (found via `https://www.legislation.gov.au/C2026A00049/asmade/text`; Act located by enumerating
   `api.prod.legislation.gov.au/v1/titles?$filter=year eq 2026 and collection eq 'Act'`, `$top` ≤ 100).
2. **Primary, consolidated statute** — ATO Legal Database (CCH-consolidated), `?DocID=` form:
   [s 61-150](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F61-150) ·
   [s 61-155](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F61-155) ·
   [s 61-160](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F61-160) ·
   [s 63-10](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F63-10) ·
   [s 960-265](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-265) ·
   [s 4-10](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F4-10) ·
   [s 25-130](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F25-130) ·
   [ITRA 1986 s 3](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F3).
   **The two routes agree word for word** on ss 61-155 and 61-160 — this is the strongest
   corroboration available in this project and the first time in it that a provision has been read
   from the Register *and* the ATO consolidation independently.
3. **Secondary, official** — [ATO new-legislation page *Working Australians tax offset*, QC 107797,
   published 23 July 2026](https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/working-australians-tax-offset)
   (this is the page P1 saw and could not get figures from — the figures are on it now, or P1 read
   it before the $250 was added);
   [Budget Paper No. 2 2026-27](https://budget.gov.au/content/bp2/download/bp2_2026-27.pdf) p 16-17;
   [Treasurer's media release *Tax reform bill passes the Parliament*, 25 June 2026](https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/tax-reform-bill-passes-parliament).
4. **Parliamentary** — [Bills page, bId r7493](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r7493)
   for the passage dates.

**Every figure below is `primary-verified` from source (1) and (2) unless the row says otherwise.**
No figure in this document is invented, and no figure is taken from a media release alone.

---

## 1. The provision, verbatim

### s 61-150 — Guide

> You may be entitled to a tax offset if you earn certain labour income.

### s 61-155 — Entitlement

> **61-155(1)** You are entitled to a `*`tax offset for an income year if:
> **(a)** you are an individual who is an Australian resident at any time during the income year; and
> **(b)** in the income year, the amount worked out for you under subsection (2) (about your net
> labour income) **exceeds the tax-free threshold** (within the meaning of the *Income Tax Rates
> Act 1986*).
>
> *Net labour income*
> **61-155(2)** Work out the amount for an income year using the formula:
>
> **Labour amounts − Labour deductions**
>
> where:
> **labour amounts** means the sum of the following amounts **included in your assessable income**
> for the income year:
> (a) an amount of `*`assessable labour income;
> (b) an amount you `*`derive from carrying on a `*`business as an individual (not including
> assessable income you derive from a business carried on by a partnership or trust);
> (c) an amount of `*`personal services income;
> (d) an amount included in your assessable income under section 83A-25 (about discounts given in
> relation to an `*`ESS interest included in assessable income);
> (e) an amount that is a payment from which an amount must be withheld (even if the amount is not
> withheld) under section 12-60 in Schedule 1 to the *Taxation Administration Act 1953* (about
> payments under labour hire and certain other arrangements).
>
> **labour deductions** means the sum of the following amounts **you can deduct** in relation to the
> income year:
> (a) an amount of a loss or outgoing that you incurred in gaining or producing an amount mentioned
> in paragraph (a) or (c) of the definition of **labour amounts**;
> (b) an amount of a loss or outgoing that you necessarily incurred in carrying on a `*`business as
> an individual (not including a loss or outgoing necessarily incurred by a business carried on by a
> partnership or trust);
> (c) **an amount you can deduct under section 25-130**;
> (d) an amount you can deduct under section 40-25 (other than an amount equal to the decline in
> value of a `*`depreciating asset that you allocate to a low-value pool under section 40-425), to
> the extent that the deduction arises for a depreciating asset that you use to: (i) derive an amount
> mentioned in paragraph (b) of the definition of **labour amounts**; or (ii) gain or produce an
> amount mentioned in paragraph (c) of that definition;
> (e) an amount of a deduction mentioned in paragraphs 25-130(2)(d) to (g) (standard deduction for
> work-related expenses);
> (f) an amount you can deduct under Subdivision 328-D, to the extent that the deduction arises for
> a depreciating asset that you use to derive an amount mentioned in paragraph (b) of the definition
> of **labour amounts**.
>
> **61-155(3)** If more than one paragraph in the definition of **labour amounts** or **labour
> deductions** covers an amount, include the amount only once.

*(In the as-made ePub the formula in 61-155(2) is an image, `image.007.png`, whose `alt` attribute
reads "Start formula Labour amounts minus Labour deductions end formula". The ATO consolidation
renders the same formula as text. Both agree, so — unlike Medicare Levy Act s 8(2) — this formula
is **not** an unread GIF.)*

### s 61-160 — Amount

> **61-160** The amount of your `*`tax offset for an income year is **the lesser of**:
> **(a) $250**; and
> **(b)** the amount that would be the amount of your **basic income tax liability** for the income
> year **if your taxable income was comprised only of your net labour income** worked out under
> subsection 61-155(2) for the income year.

### s 63-10(1) — order of application, inserted as table item 3

> | Item | Tax offset | What happens to any excess |
> |---|---|---|
> | **3** | `*`Tax offset under Subdivision 61-E (working Australians tax offset) | You cannot get a refund of it, you cannot transfer it and you cannot carry it forward to a later income year |

### s 13-1 (list of tax offsets)

> labour income .................... Subdivision 61-E

---

## 2. Answers to the brief's questions

### 2.1 Amount and "taper"

**There is no taper and no shade-out.** This is the single most important finding for the engine.

- The amount is **`min($250, hypothetical basic income tax liability on net labour income)`**.
- Limb (b) is a **shade-IN** at the bottom, not a phase-out at the top. It bites only for people
  whose net labour income is just above the tax-free threshold.
- **Above the shade-in point the offset is a flat $250 for everyone, at every income, forever.**
  There is no income ceiling, no eligibility ceiling of the s 61-110(1)(b) kind LITO has, and no
  s 61-115-style band table. A Person on $400,000 of salary gets the same $250 as a Person on
  $30,000.

**The shade-in point is derived, not legislated. Do not store it as a figure.** With the FY2027-28
rate scale (tax-free threshold $18,200; lowest marginal rate 14% from 1 Jul 2027 — register §2.1 and
§2.8, already law):

```
WATO(NLI) = 0                                if NLI <= 18,200          # s 61-155(1)(b): must EXCEED
          = 0.14 * (NLI - 18,200)            if 18,200 < NLI < 19,985.714285...
          = 250                              if NLI >= 19,985.714285...   # 18,200 + 250/0.14
```

`250 / 0.14 = 1,785.7142857…`, so the full $250 is reached at **NLI = $19,985.71** (to the cent,
$19,985.72 is the first whole cent at which limb (a) binds). **Budget Paper No. 2 states this
independently**: *"The Working Australians Tax Offset will increase the effective tax-free threshold
for income derived from work by nearly $1,800 to **$19,985** (or up to **$24,985** for workers
eligible for the Low Income Tax Offset)."* The $24,985 figure is `18,200 + (700 + 250)/0.14 =
24,985.71`, which reproduces §2.2's LITO maximum of $700 exactly. Two independent derivations of
both numbers agree — this is as close to a published fixture as this measure has.

**Watch the shade-in limb, it is a trap.** Limb (b) is the liability on a *hypothetical* taxable
income equal to NLI. It is **pre-offset** — LITO and SAPTO are tax offsets under s 4-10(3) step 3,
applied *after* basic income tax liability is worked out in step 2, so **neither enters limb (b)**.
Computing limb (b) net of LITO would give $0 for everyone below ~$23,200 and is wrong.

### 2.2 Which income base — a FIFTH base

**Neither taxable income, nor rebate income, nor family income, nor surcharge income.**

WATO is tested and measured on **net labour income**, a base defined nowhere but s 61-155(2) and
used nowhere but Subdiv 61-E. **T9 says "four income bases"; from FY2027-28 there are five.**

Two distinct tests, on two different bases:

| Test | Base | Provision |
|---|---|---|
| **Entitlement** — must *exceed* $18,200 | **net labour income** | s 61-155(1)(b) |
| **Amount**, limb (b) — hypothetical basic liability | **net labour income** treated as if it were the whole taxable income | s 61-160(b) |
| **Usability** — non-refundable cap | **actual basic income tax liability** on **actual taxable income** | s 63-10(1) item 3 |

The third row is a separate cap and it is not the same number as limb (b). A Person with net labour
income of $50,000 but an actual taxable income of $3,000 (large non-labour deductions) has a limb (b)
figure of $250 and an actual liability of nil: **the offset is computed in full and then entirely
wasted.** Any implementation that stops at s 61-160 and forgets s 63-10 will over-credit that Person.

**What "net labour income" is and is not.** `labour amounts` are amounts **included in assessable
income** — salary and wages (via `*assessable labour income`), sole-trader business income (expressly
*not* partnership or trust business income), personal services income, ESS discounts under s 83A-25,
and labour-hire payments under TAA 1953 Sch 1 s 12-60. It therefore **excludes** interest, dividends,
rent, net capital gains, superannuation income streams and the Age Pension. **`*assessable labour
income` is itself defined by the same Act** — new **ITAA 1997 s 25-130(4)** (Act No. 49 of 2026
Sch 4 item 3) — as each amount included in assessable income from which an amount must be withheld
under TAA 1953 Sch 1 ss 12-35 (employee), 12-40 (company director), 12-45 (office holder), 12-47
(religious practitioners), 12-50 (return to work), Subdiv 12-C (termination payments) or
para 12-110(1)(ca) (parental leave pay).

**Consequence for this project's own model:** in the years both Persons draw only superannuation
income streams and the Age Pension, net labour income is **nil**, so WATO is nil and correctly
omitted. It matters in the working and TTR years only — exactly as P1 said, and it is worth $250 per
working Person per year in those years.

### 2.3 Interaction with LITO and SAPTO

**Order of application is statutory and WATO goes first.** ITAA 1997 s 63-10(1), as amended:

| s 63-10 item | Offset | Excess |
|---|---|---|
| **3** | **WATO (Subdiv 61-E)** | lost — no refund, no transfer, no carry-forward |
| 5 | **SAPTO** (ITAA 1936 s 160AAAA) | **transferred** under the regulations |
| 10 | SAPTO, trustee assessed under s 98 (s 160AAAB) | transferred under the regulations |
| 15 | s 160AAA beneficiary/pensioner offset | transferred under the regulations |
| **20** | **any tax offset not covered by another item — this is where LITO lands** | lost |

So the order is **WATO → SAPTO → s 160AAA → LITO** (LITO has no item of its own; Subdiv 61-D is
caught by the item 20 residual). Item 3 was inserted *before* item 5 by Act No. 49 of 2026 Sch 3
item 2, which is a deliberate choice, not an accident of numbering.

- **Refundability: non-refundable, non-transferable, non-carry-forward** — item 3's own words, and
  the ATO page says the same. Unlike items 21 and 22 it **carries no Medicare-levy limb**, so WATO
  can **never** reduce the Medicare levy. It is capped by basic income tax liability alone.
- **It stacks with LITO** — nothing in Subdiv 61-E or 61-D excludes the other, and BP2's $24,985
  figure is only arrivable by stacking them.
- **The ordering has a real consequence for a SAPTO household and it is not neutral.** WATO consumes
  basic income tax liability *ahead of* SAPTO, and SAPTO's excess is the one excess in the table that
  is **transferred to a spouse** under the regulations rather than lost. Applying WATO first
  therefore *increases* the SAPTO excess available to transfer where liability is scarce. Applying
  them in any other order would change a couple's answer. **See §5 decision (c).**

### 2.4 Config vs constant, for every figure

| Figure | Provision | Value | Indexed? | Mark | Confidence |
|---|---|---|---|---|---|
| WATO maximum | ITAA 1997 s 61-160(a) | **$250** | **No mechanism exists.** Subdiv 61-E is **absent from the ITAA 1997 s 960-265 indexation table** (whose current items run 1, 2, 3, 3A, 5–13, 13A, 14, 10A–10C; latest amendment No 8 of 2026). The section contains no indexation words and no `*index number` reference | **`config`** — year-keyed, **not indexed, changes only by amendment**. This is deliberately the same treatment §2.2 gives LITO's $700 (`config`, "Not indexed — changes only by amendment"), and the two figures have identical mechanism | `primary-verified` |
| Entitlement threshold | ITAA 1997 s 61-155(1)(b) → **ITRA 1986 s 3(1)** definition of *tax-free threshold* | **$18,200** | **No — positively frozen.** ITRA s 3(1): *"**tax-free threshold** means $18,200."* Its history note records that No 150 of 2011 *would have* substituted $19,400 from 2015-16 and that this was **repealed** by the Labor 2013-14 Budget Savings (Measures No 1) Act 2015 (No 72 of 2015) *"so that the tax-free threshold remains at $18,200 for the 2015-16 year of income and later years of income"* | **`constant`** — this is the positive evidence of a freeze the project's default demands | `primary-verified` |
| Lowest marginal rate, FY2027-28, used in the limb (b) arithmetic | Income Tax Rates Act 1986 Sch 7 (amended by Treasury Laws Amendment (More Cost of Living Relief) Act 2025) | **0.14** | already carried by §2.1 / §2.8 | `config` (as §2.8 has it) | `primary-verified` per §2.8; **but see §4 item 4** |
| Shade-in point | **derived**: `tax-free threshold + 250 / lowest marginal rate` | $19,985.71 for FY2027-28 | derived — moves whenever either input moves | **neither** — a **derived** figure. Store the formula, never the number (the §3.2 pattern: *"Derived, not copied"*) | `primary-verified` (arithmetic; corroborated by BP2's $19,985) |
| Combined WATO+LITO effective threshold | derived: `18,200 + (700 + 250) / 0.14` | $24,985.71 | derived | **neither** — derived | `secondary` corroboration only (BP2's $24,985); the arithmetic itself is primary |
| Refundability / order | s 63-10(1) item 3 | non-refundable, non-transferable, no carry-forward; applied **first**, before SAPTO; **no Medicare-levy limb** | n/a | **`constant`** (rule) | `primary-verified` |
| Residency test | s 61-155(1)(a) | Australian resident **at any time during** the income year | n/a | **`constant`** (rule) | `primary-verified` |

**No figure in Subdiv 61-E indexes.** That is a positive finding from s 960-265, not an absence of
evidence: s 960-265 is styled *"The provisions for which indexation is relevant"* and is the
exhaustive switchboard. Compare §3.1's general Transfer Balance Cap, which is in that table at item
10A. WATO is not, and neither is LITO.

---

## 3. Adjacent finding the pass tripped over, reported not resolved

**Act No. 49 of 2026 Schedule 4 inserts ITAA 1997 s 25-130 — the $1,000 standard deduction for
work-related expenses — and it applies from FY2026-27, the register's CURRENT year, not FY2027-28.**

- Sch 4 Part 1 item 17: *"The amendments made by this Part apply in relation to **assessments for the
  2026-27 income year** and later income years."* The ATO consolidation of s 25-130 confirms:
  *"S 25-130 inserted by No 49 of 2026, s 3 and Sch 4 item 3, effective 1 July 2026."*
- s 25-130(2): the deduction is **the lesser of $1,000 and total assessable labour income**, reduced
  (not below zero) by the taxpayer's actual s 8-1 work deductions, Div 28 car expenses, s 25-100
  travel, repairs/Subdiv 40-B/40-D depreciation on work assets, and s 25-125 COVID-test deductions;
  s 25-130(3) makes income-protection, personal-sickness and accident-insurance premiums and
  trade/professional association membership fees **not** count as reducers.
- **It is not indexed either** (no s 960-265 item).
- **It couples to WATO.** s 61-155(2) `labour deductions` limb (c) is *"an amount you can deduct
  under section 25-130"*, so the standard deduction **reduces net labour income** by up to $1,000.
  For an ordinary wage earner with no other work deductions, the wage needed for the full $250 is
  therefore roughly **$20,985.71**, not $19,985.71. BP2's "$19,985" is stated on net labour income
  and is not wrong, but it is not a gross-wage figure.

**Neither §2.1 nor §2.8 carries any row for s 25-130.** Direction of the error, in R9's terms:
omitting a deduction **over-states** taxable income and therefore over-states tax, so the omission
is conservative and R9's logic covers it — but it is a **current-year** gap, not a forward one, and
it is worth up to $1,000 of taxable income per working Person in FY2026-27.

Also present in Act No. 49 of 2026 and expressly out of scope per register §10, noted only so the
next pass does not rediscover them as surprises: Sch 1 (CGT — 50% discount replaced by cost-base
indexation plus a 30% minimum tax rate on capital gains, with a new ITRA s 12AA rate provision
inserted by Act No. 50 of 2026, from 1 Jul 2027), Sch 2 (negative gearing limited to new builds from
1 Jul 2027, with grandfathering), Sch 5 (SIS Act limited recourse borrowing arrangements, from
10 Aug 2026 — **this one is superannuation and may not be out of scope**).

---

## 4. What I could NOT verify — explicit list

1. **The Explanatory Memorandum and Supplementary EM were not read.** Both are listed on the bill
   page but were not retrieved. They are the place any worked example or transitional gloss would
   live. Not load-bearing: the statute is unambiguous, and BP2's two effective-threshold figures
   independently reproduce the arithmetic.
2. **`*personal services income` (s 61-155(2) labour amounts limb (c)) was not read.** ITAA 1997
   Div 84/85 (s 84-5) was not fetched. Matters only if this project ever models a PSI Person.
3. **TAA 1953 Sch 1 ss 12-60 and 12-35/40/45/47/50, Subdiv 12-C, para 12-110(1)(ca) were not read.**
   They are the withholding provisions that define `*assessable labour income` and labour-hire
   payments by reference. The `Sch1-` prefix form (`.../19530001/Sch1-12-35`) was not exercised in
   this pass. Matters for the exact boundary of "labour" — e.g. whether an employment termination
   payment counts (Subdiv 12-C suggests **yes**, which would be significant for a retirement-year
   projection, but this is inference from a cross-reference, not a reading of the provision).
4. **Income Tax Rates Act 1986 Schedule 7 Part I was again not read** — P1's UNVERIFIED item 4 is
   still open. The FY2027-28 lowest rate of 0.14 is `primary-verified` in §2.1/§2.8 from the ATO,
   not from the Schedule. **The $19,985.71 shade-in point inherits that dependency.** Its
   corroboration by BP2's independently published "$19,985" materially reduces the risk.
5. **No sweep of bills currently before Parliament** for a pending amendment to Subdiv 61-E (e.g. one
   that would index the $250). I checked only enacted Acts: Act No. 71 of 2026 does not touch it, and
   the ATO consolidation shows no second amendment. A bill introduced after the consolidation's
   currency date would not appear in either check.
6. **The ATO consolidation's currency date was not read off the page**, so "no later amendment" rests
   on that consolidation plus my own check of Act No. 71 of 2026, not on a stated as-at date.
7. **Part-year and mid-year cases are not addressed by the provision and I found no ATO guidance.**
   s 61-155(1)(a) says *"an Australian resident **at any time** during the income year"*, which on
   its face gives the **full** $250 with no apportionment — the same shape, and the same open
   question, as P1's UNVERIFIED item 5 for SAPTO. Untested against ATO guidance. Note also that
   s 61-155(1)(b) refers to *"the tax-free threshold (within the meaning of the Income Tax Rates Act
   1986)"*, which is ITRA s 3(1)'s **flat $18,200** — **not** the part-year-resident reduced
   threshold in ITRA Sch 7. That reading is primary but it has not been checked against guidance.
8. **A citation slip in the ATO/CCH consolidation, recorded so it is not propagated.** The s 25-130
   history note attributes the application provision to *"No 49 of 2026, s 3 and **Sch 1** item 17"*.
   In the as-made Act that application provision is **Schedule 4 Part 1 item 17**. The as-made text
   governs. (Schedule 1 does have its own item 17, an unrelated CGT amendment.)
9. **WebSearch is unusable in this project and actively produced a false claim.** Both WebSearch
   calls returned a message denying that the tool can search the web at all, and one of them
   volunteered from "training data" that *"the Working Australians Tax Offset was announced in
   Australia's 2024-25 budget"*. **That is wrong** — it was announced in the **2026-27** Budget on
   12 May 2026. Every fact in this document comes from `curl` against legislation.gov.au,
   api.prod.legislation.gov.au, ato.gov.au, budget.gov.au, ministers.treasury.gov.au and aph.gov.au.
   **Do not source anything in this project from WebSearch.**

### Fetch technique notes for the next pass

- The brief's route list works. Two additions worth keeping:
  - **legislation.gov.au full text IS reachable without a headless browser** (P1's UNVERIFIED item 1
    assumed otherwise). `curl` the SPA shell at `/{id}/asmade/text` — the shell embeds the whole
    table of contents, and its TOC anchors point at
    `/{id}/asmade/{date}/text/{ver}/epub/OEBPS/document_1/document_1.html`, which serves the entire
    Act as plain XHTML. **Grep the shell for the epub href rather than guessing it** — the version
    segment varies (`1` for Act 49, `original` for Act 50) and a wrong guess 404s.
  - `api.prod.legislation.gov.au/v1/documents?$filter=titleId eq '...'` lists the Word/PDF/ePub
    artefacts but **`bytes` always comes back `null`** — the API will not hand over the file.
    Also `$top` is capped at **100**, and `$filter` combined with `$select` can 500 with
    *"Exception has been thrown by the target of an invocation"*. The bound `Search` function on
    Titles/Versions/TextApplies rejects free text; it is not a full-text search.
- The Budget PDF has no local `pdftotext`; its text was extracted with `zlib.decompress` over the
  `stream`…`endstream` objects plus a regex for `(...)` string literals. Crude, but it recovered the
  measure description intact.

---

## 5. Decisions needed from the user — NOT resolved here

These follow from the findings. Per the brief I am reporting them, not settling them.

**(a) Can the model even compute net labour income, and if not, what should it do?** This is the
central question and it is a scope decision, not a research one. WATO's base is a **fifth income
base** that the household model does not currently track (T9 knows four). To compute WATO exactly the
engine needs, per Person per year, the split of assessable income into labour and non-labour amounts
*and* the split of deductions into labour and non-labour. Four possible dispositions, each with a
different failure mode:

  1. **Keep omitting WATO** (status quo). Over-states tax by up to $250 per working Person per year
     from FY2027-28. Conservative, and R9 already blesses exactly this.
  2. **Model it exactly** — add a labour/non-labour split to the income model.
  3. **Approximate** — treat salary-like entries as net labour income. Since WATO is flat $250 above
     ~$19,986 with no upper taper, the approximation is *exact* for the overwhelmingly common case
     (a Person with any real wage), and wrong only in the shade-in band and for Persons whose actual
     basic liability is under $250. That is an unusually favourable accuracy profile — but it is
     still an approximation, and this project's stated default is to refuse rather than approximate.
  4. **Refuse** for FY2027-28 households with labour income. Note this would re-open the R9 question
     in the opposite direction.

**(b) Does the tool model ITAA 1997 s 25-130, the $1,000 standard deduction?** It is law **now**, for
**FY2026-27**, it is unregistered, and it feeds WATO's own base (§3). Same four-way choice, but the
year in question is the current one, so "leave it out because it's conservative" costs more.

**(c) Should the offset application order become an explicit, registered rule?** s 63-10(1) now
orders WATO (item 3) **before** SAPTO (item 5), whose excess is the only transferable one, with LITO
last at item 20. The register records s 63-10 only for franking (item 40) and nowhere states an
order. Whether `householdIncomeTax` must apply offsets in s 63-10 order — and whether the reg s 12
SAPTO transfer's precondition is computed before or after WATO has eaten into the liability — is a
correctness question for a SAPTO couple and it has no register row.

**(d) §2.8's WATO row now needs rewriting, and its `unverified` label is spent.** I have not touched
`docs/assumptions-register.md` (out of scope for this brief). Whoever does: the row's mechanics claim
was right, the amount is `$250`, the mark is `config` / not indexed, the base is a fifth base, and
**O15 can close**. O15's text ("amount, taper and the definition of net labour income not captured")
should close with the note that **there is no taper**, since a future reader looking for one will not
find it.

**(e) Out of scope but flagged: Act No. 49 of 2026 Schedule 5** amends the SIS Act on limited
recourse borrowing arrangements from 10 Aug 2026. Register §10 scopes out the CGT and negative
gearing schedules of this Act; it does not obviously scope out an SIS Act amendment, and §3 is
superannuation.

### Untouched, as instructed

`MissingBracketTableError` and the FY2027-28 bracket-table question were not touched. For the record
and without proposing anything: this pass **does** bear on that refusal's Finding 2. That finding
says the only FY2027-28 figures the register carries no row for are the 37% and 45% rates. WATO is
now sourced, so it is no longer one of R9's open gaps — which changes the shape of the FY2027-28
gap set, but the bracket-table ruling is the user's and is left alone.
