# P1-11 (Chunk 3 of 3) — Franking credits: the qualified person rules (45-day holding rule, at-risk test, small shareholder exemption)

**Scope:** whether a franking credit is *available at all*. This gates chunks 1 (gross-up) and 2 (refundability).
**Retrieval date:** 2026-09-04 · **Forecast year:** FY2026-27 · **Researcher note:** all statutory text below was pulled from the Federal Register of Legislation compilation API and verified against the compilation actually in force on 30 June 2002.

**Out of scope for this chunk (done elsewhere):** gross-up rate, corporate tax rates, base rate entity test, refundability.

---

## 0. Headline answers

| Question | Answer | Confidence |
|---|---|---|
| Where do the rules live? | ITAA 1936 **former Division 1A of Part IIIAA**, applied *as in force on 30 June 2002*, imported by the express terms of **ITAA 1997 s 207-145(1)(a)** and **s 207-150(1)(a)**. **NOT** via the *Income Tax (Transitional Provisions) Act 1997*. | primary-verified |
| Holding period | 45 continuous days at risk; 90 for preference shares | primary-verified |
| Days excluded | day of acquisition (always); day of disposal (if disposed of); any day of material diminution | primary-verified |
| "At risk" threshold | materially diminished if net position (by delta) has **less than 30%** of the risks/opportunities | primary-verified |
| Small shareholder ceiling | **$5,000** of franking-credit tax offset entitlement for the income year | primary-verified |
| Indexed or frozen? | **FROZEN HARD CONSTANT.** Not indexed, and **no existing mechanism can index it**. | primary-verified |
| Available to a complying super fund? | **NO.** s 160APHT(1)(a) requires the taxpayer to be *an individual*. | primary-verified statutory text; conclusion inferential — see U1 |
| Available to an individual? | Yes — including where the distribution comes indirectly through a trust or partnership. | primary-verified |

---

## 1. Statutory location — the "known trap", corrected

### Finding 1.1 — The operative rules were never rewritten into ITAA 1997

- **Name:** Qualified person test — location of operative provisions
- **Rule:** ITAA 1997 s 207-145(1)(a): if "the entity is **not a qualified person** in relation to the distribution **for the purposes of Division 1A of former Part IIIAA of the *Income Tax Assessment Act 1936***", then the franking credit is **not** included in assessable income under s 207-20 or s 207-35, **and** the entity gets **no tax offset**, **and** if the distribution flows indirectly through the entity, s 207-35(3) and s 207-45 do not apply to the downstream entity. Section 207-150(1)(a) does the same for distributions that *flow indirectly*.
- **Financial year:** current law; applies FY2026-27
- **Config or constant:** structural — this is a hard gate on the whole franking-credit calculation, not a parameter
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-145
- **Retrieval date:** 2026-09-04
- **Confidence:** primary-verified

### Finding 1.2 — The preservation mechanism is NOT the Transitional Provisions Act

**The brief's hypothesis is wrong, and this is worth recording because it is an easy thing to get wrong in the other direction too.**

Division 1A is **not** preserved by the *Income Tax (Transitional Provisions) Act 1997*. I checked directly: the ITTPA (ATO act code `19970040`) has **no Division 207 at all** — every probe of `207-1`, `207-5`, `207-10`, `207-15`, `207-20`, `207-25`, `207-30`, `207-35`, `207-45`, `207-50`, `207-55`, `207-57`, `207-58`, `207-95`, `207-110`, `207-115`, `207-120`, `207-125`, `207-128`, `207-130`, `207-135`, `207-140`, `207-145`, `207-150`, `207-155`, `207-157` returned HTTP 404, while control probes of `1-1` and `205-70` on the same act code returned HTTP 200. So the act code is right and the sections genuinely do not exist.

The actual chain is:

1. Part IIIAA of the ITAA 1936 **ceased to apply** from 1 July 2002 (former ITAA 1936 s 160AOAA, inserted by the *New Business Tax System (Imputation) Act 2002* (No. 48 of 2002)).
2. The **same** Act inserted ITAA 1997 ss 207-145 and 207-150 with effect from 29 June 2002, which **refer to Division 1A by name**. That reference is itself the preservation mechanism.
3. Part IIIAA was then **physically repealed** from the ITAA 1936 on **14 September 2006** by the *Tax Laws Amendment (Repeal of Inoperative Provisions) Act 2006* (No. 101 of 2006), Sch 2 item 710, which also inserted the word "**former**" into ss 207-145(1)(a) and 207-150(1)(a) and repealed the ITAA 1997 s 995-1(1) definition of "qualified person".
4. The Commissioner's binding public ruling **TD 2007/11** holds that Div 1A must still be applied, **"as in force at 30 June 2002"**, for distributions made on or after 1 July 2002 — rejecting both the "Div 1A died on 1 July 2002" and the "Div 1A died on 14 September 2006" arguments as producing absurd results.

- **Source URLs:**
  - TD 2007/11 — https://www.ato.gov.au/law/view/document?Docid=TXD%2FTD200711%2FNAT%2FATO%2F00001&PiT=99991231235958
  - ITAA 1997 s 207-145 (history notes recording No. 48 of 2002 and No. 101 of 2006) — https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-145
  - ATO ID 2003/1105 (same conclusion) — https://www.ato.gov.au/law/view/document?docid=AID/AID20031105
- **Retrieval date:** 2026-09-04
- **Confidence:** primary-verified (TD 2007/11 is a binding public ruling; the statutory text of s 207-145 is primary)

### Finding 1.3 — Provenance of the Division 1A text used in this document

Because the provisions are repealed, they are **not** retrievable from the ATO Legal Database **as sections** (`?DocID=PAC%2F19360027%2F160APHO` returns HTTP 404, with or without a `&PiT=` point-in-time parameter). **Corrected 2026-09-04 on audit:** they *are* retrievable at the **document** level — the Legal Database's **s 207-145 document reproduces the whole of former Division 1A inline**, which is a **second, independent primary source** for every Division 1A quotation in this report. The original claim that the text was unavailable from the ATO was true only of the section-level `?DocID=` form. AustLII is Cloudflare-blocked (HTTP 403).

They **were** retrieved from the Federal Register of Legislation OData API, which works fine (the SPA-shell problem is a web-front-end problem, not an API problem):

```
https://api.prod.legislation.gov.au/v1/documents/find(titleid='C1936A00027',
  asat=2002-05-30,type='Primary',format='Word',uniqueTypeNumber=0,
  volumeNumber=8,rectificationVersionNumber=0)
```

- Volume 8 → Div 1A **Subdivision A** (ss 160APHC–160APHNA: object, definitions, at-risk/delta, related payments)
- Volume 9 → Div 1A **Subdivision B** (ss 160APHO–160APHU: the operative qualified-person tests)
- `rectificationVersionNumber=0` is required; `rectified=true` returns HTTP 404.

**Version control performed.** The ITAA 1936 compilations either side of 30 June 2002 start on 2002-03-11, **2002-05-30**, and 2002-07-03. The version in force on 30 June 2002 is therefore the **2002-05-30** compilation. I extracted Division 1A from both the 2002-03-11 and the 2002-05-30 compilations and MD5-compared them:

- Subdivision A (57,574 chars): `75214056302b0a8dee829ba59d31b805` — **identical**
- Subdivision B (16,791 chars): `ce3cee1995679054af9fcc893b199b36` — **identical**

So the text quoted below **is** Division 1A "as in force at 30 June 2002" in the TD 2007/11 sense.

- **Confidence:** primary-verified

---

## 2. The 45-day holding rule

### Finding 2.1 — The operative test (s 160APHO)

- **Name:** Holding period rule / holding rule
- **Rule:** ITAA 1936 (former) s 160APHO(1)–(2). A taxpayer who has held shares or an interest in shares on which a dividend has been paid is a qualified person if they held the shares/interest **for a continuous period of not less than 45 days (90 days if preference shares)** during the applicable qualification period, **"not counting the day on which the taxpayer acquired the shares or, if the taxpayer has disposed of the shares, the day on which the disposal occurred"**.
  - s 160APHO(1)(a): **no related payment** → test against the **primary qualification period**.
  - s 160APHO(1)(b): **related payment** made/obliged/likely → test against the **secondary qualification period**.
  - s 160APHO(4): this section **does not apply** to an interest held as a beneficiary of a **widely held trust** — those go to s 160APHP.
- **Financial year:** FY2026-27 (text frozen at 30 June 2002)
- **Config or constant:** `HOLDING_DAYS_ORDINARY = 45`, `HOLDING_DAYS_PREFERENCE = 90` — **frozen literals**, never indexed, never amended
- **Source:** FRL API, ITAA 1936 `C1936A00027`, compilation start 2002-05-30, Word vol 9 (see §1.3 for exact call)
- **Retrieval date:** 2026-09-04
- **Confidence:** primary-verified

### Finding 2.2 — Exact counting convention

- **Rule:** Two independent exclusions, both mandatory:
  1. **s 160APHO(2)(a)/(b)** — the **day of acquisition** is never counted. The **day of disposal** is not counted **if** there has been a disposal. (Note the asymmetry: acquisition day is always dropped; disposal day is dropped only conditionally, so a holding still on hand at test time loses only one day.)
  2. **s 160APHO(3)** — "any days on which the taxpayer has materially diminished risks of loss or opportunities for gain … are to be **excluded**, but the exclusion of those days is **not taken to break the continuity** of the period". So diminished-risk days are removed from the count without resetting the streak.
- **Modelling consequence:** buy on day 0, the first countable day is day 1. To reach 45 countable days on an undisposed parcel you must own it across at least 46 calendar days.
- **Confidence:** primary-verified
- **ATO corroboration:** "The 45-day and 90-day periods don't include the day of acquisition or, if the shares have been disposed of, the day of disposal. Also excluded are days where the financial risk of owning the shares is materially diminished." — https://www.ato.gov.au/businesses-and-organisations/corporate-tax-measures-and-assurance/imputation/integrity-rules/franking-credit-trading (retrieved 2026-09-04)

### Finding 2.3 — The two qualification periods (s 160APHD definitions)

- **Rule:**
  - **primary qualification period** — "the period beginning **on the day after the day on which the taxpayer acquired** the shares or interest and ending: (a) if the shares are not preference shares — **on the 45th day after the day on which the shares or interest became *ex dividend***; or (b) if the shares are preference shares — on the **90th day** after that day."
  - **secondary qualification period** — "(a) if the shares are not preference shares — the period beginning on the **45th day before**, and ending on the **45th day after**, the day on which the shares or interest became ex dividend; or (b) if the shares are preference shares — the period beginning on the **90th day before**, and ending on the **90th day after** …"
  - **ex dividend** (s 160APHE(1)) — a share becomes ex dividend "**on the day after the last day on which the acquisition by a person of the share will entitle the person to receive the dividend**". For an interest as beneficiary of a **widely held trust**, s 160APHE(2) substitutes entitlement to receive a *distribution from the trust*.
- **Config or constant:** `PRIMARY_WINDOW_END_DAYS_AFTER_EX_DIV = 45 / 90`; `SECONDARY_WINDOW = ±45 / ±90` — **frozen literals**
- **Confidence:** primary-verified

### Finding 2.4 — "Once per parcel", not once per dividend

- **Rule:** Because the primary qualification period runs from acquisition, satisfying it once for a parcel carries forward. ATO: "the holding period rule only needs to be satisfied **once per parcel of shares** — that is, if a shareholder is a qualified person for a distribution from shares under that rule, they will also qualify for subsequent distributions from those same shares, **unless the related payments rule applies**." The related payments rule, by contrast, "applies to **each distribution**".
- **Modelling consequence:** a long-term buy-and-hold ETF/share portfolio passes the holding rule permanently on each parcel after ~46 days. For this project's forecast horizon the holding rule is effectively **always satisfied** on established holdings; it bites only on parcels bought or sold near an ex-dividend date.
- **Source URL:** https://www.ato.gov.au/businesses-and-organisations/corporate-tax-measures-and-assurance/imputation/integrity-rules/franking-credit-trading
- **Confidence:** primary-verified as to the statute; ATO's "once per parcel" phrasing is secondary but follows directly from the s 160APHD definition of primary qualification period

### Finding 2.5 — The "at risk" / 30% delta test (s 160APHM)

- **Name:** Material diminution of risks of loss or opportunities for gain
- **Rule:** ITAA 1936 (former) s 160APHM:
  - **(1)** regulations may prescribe circumstances constituting material diminution, and the rest of the section is subject to them;
  - **(2)** *"A taxpayer is taken to have materially diminished risks of loss or opportunities for gain on a particular day … if the taxpayer's **net position** on that day in relation to the shares or interest has **less than 30%** of those risks and opportunities."*
  - **(3)** *"A taxpayer's net position is worked out using the financial concept known as **delta** (see section 160APHJ). For example, an option to sell a share with a delta of minus 0.5 in relation to the share reduces the risks of loss and opportunities for gain by 50%."*
- **Financial year:** FY2026-27 (frozen at 30 June 2002)
- **Config or constant:** `AT_RISK_MIN_NET_DELTA = 0.30` — **frozen literal**. The comparison is strict: **less than 30% fails; exactly 30% or more passes.** ATO renders it as "you must have **30% or more** of the ordinary financial risks of loss and opportunities for gain".
- **Source:** FRL API vol 8 (see §1.3); ATO: https://www.ato.gov.au/forms-and-instructions/you-and-your-shares-2022/franking-tax-offsets
- **Confidence:** primary-verified

### Finding 2.6 — Related payments (s 160APHN)

- **Rule:** s 160APHN(1) is **inclusive, not exhaustive** — it "gives examples of, but does **not limit**" what a related payment is. s 160APHN(2) is the operative concept: a related payment arises if, **under an arrangement**, the taxpayer or an associate "has done, is under an obligation to do, or may reasonably be expected to do … anything having the effect of **passing the benefit of the dividend or distribution to one or more other persons**." Subsections (3)–(4) list mechanisms (payments, credits, services, property transfers, use of property, set-offs, increases in debts owed) where the amount equals, approximates, or is calculated by reference to the dividend.
- **Critical carve-out — s 160APHN(5):** *"The **distribution by a trustee of a dividend to a beneficiary or beneficiaries of the trust who are presently entitled to it does not constitute the making of a related payment** in respect of the dividend."* **This is why a normal ETF/managed-fund distribution does not trip the related payments rule.**
- **s 160APHNA:** wholly-owned-group share sale price reductions are not related payments.
- **Confidence:** primary-verified

### Finding 2.7 — LIFO for substantially identical parcels (ss 160APHI, 160APHF)

- **Rule:** s 160APHI(4) — related securities are taken to be disposed of on a **last-in first-out** basis when working out how long a parcel was held. "Related securities" (s 160APHI(2)) means the primary securities plus substantially identical securities held by connected persons in respect of which a corresponding franked dividend was paid; it **excludes** securities covered by a s 160APHR election. "Substantially identical securities" (s 160APHF(1)) means "property that is **fungible with, or economically equivalent to**, the shares or interest", expanded by s 160APHF(3) to include same-class shares, materially-indistinguishable other classes, fixed-rate exchangeables, shares in a holding company, **a vested and indefeasible interest in a trust whose assets consist predominantly of such shares**, and partnership interests in the same.
- **Modelling consequence:** for a portfolio built by regular contributions, a partial sale is deemed to sell the **most recently acquired** units first — which are the ones most likely to fail the 45-day test. This matters for any model that simulates rebalancing or drawdown sales near an ex-dividend date.
- **Confidence:** primary-verified

---

## 3. The small shareholder exemption

### Finding 3.1 — The provision, verbatim

- **Name:** Small shareholder exemption (ATO also calls it the "**individual** small shareholder exemption")
- **Statute:** ITAA 1936 (former) **s 160APHT — "Individual taxpayers qualified as small shareholders"**, as in force 30 June 2002:

> **(1)** A taxpayer is a qualified person in relation to **all** dividends paid during a year of income on shares that the taxpayer **held or held an interest in** if:
> **(a)** the taxpayer is **an individual**; and
> **(b)** the total of the amounts of the **rebates** to which the taxpayer would be entitled under sections 160AQU, 160AQX and 160AQZ in respect of the year of income if the taxpayer were a qualified person in relation to each of those dividends **does not exceed $5000**.
>
> **(2)** A taxpayer is **not** a qualified person under subsection (1) in relation to a dividend if the taxpayer or an **associate** of the taxpayer: (a) has made; or (b) is under an obligation to make; or (c) is likely to make; a **related payment** in respect of the dividend or a distribution attributable to the dividend.

- **Financial year:** FY2026-27
- **Config or constant:** `SMALL_SHAREHOLDER_CEILING = 5000` (AUD)
- **Source:** FRL API, ITAA 1936 `C1936A00027`, compilation start 2002-05-30, Word vol 9
- **Retrieval date:** 2026-09-04
- **Confidence:** primary-verified

### Finding 3.2 — INDEXED OR FROZEN? — **FROZEN. Doubly so.**

**This is the single most important flag in this chunk.**

The $5,000 is a **hard-coded literal with no indexation mechanism whatsoever**, and it is frozen for two independent reasons:

1. **On its face.** s 160APHT(1)(b) reads "does not exceed **$5000**". There is no reference to an index factor, no companion indexation section, no regulation-making power over the amount, and no CPI or AWOTE linkage anywhere in Division 1A. Compare the delegated-legislation hooks in the Division — s 160APHM(1) (regulations may prescribe what constitutes material diminution), **s 160APHJ(1)** (delta), **s 160APHR(3)/(4)** (prescribed related payments that make an election ineffective), s 160APHR(1)(j)/(2) (regulations may add or preclude electors), and the s 160APHD **"widely held trust"** definition (which turns on a s 160APHR(1)(j) declaration) — **none of which touches the $5,000**. *(Corrected 2026-09-04 on audit: this paragraph originally called s 160APHM(1) and s 160APHR(1)(j)/(2) the **only** such hooks. They are not. The conclusion survives intact — no hook reaches the $5,000 — but the completeness claim was false, and **U5** is corrected to match.)*
2. **Structurally, it cannot ever change.** The provision containing it was **repealed on 14 September 2006**. What ITAA 1997 s 207-145(1)(a) imports, per TD 2007/11, is Division 1A **"as in force at 30 June 2002"** — a fixed historical snapshot. There is no live provision to amend. Indexing this figure would require Parliament to legislate a *new* provision; it has not, in the 24 years since.

**Do not model this as indexed. Do not apply any CPI/AWOTE uplift to it in any forecast year.** In FY2026-27 it is $5,000, in FY2036-37 it will still be $5,000 absent new legislation. Its real value has been eroding since **FY1999-2000** — that erosion is a genuine feature of the projection, not a bug to be "fixed" by indexing.

*(Corrected 2026-09-04 on audit: this originally read "since 1997". The $5,000 form of s 160APHT was **substituted by No 89 of 2000, Sch 3 item 98, applicable to assessments for the 1999-2000 year of income and later years**. The pre-2000 s 160APHT was an unrelated franking-rebate-ceiling election and contained no $5,000 figure.)*

- **Confidence:** primary-verified

### Finding 3.3 — What the $5,000 is measured against

- **Rule:** The statutory measure is the total **rebates** under ITAA 1936 ss 160AQU, 160AQX and 160AQZ — i.e. the pre-2002 *franking rebate*, the direct predecessor of today's franking credit tax offset. Since those sections were repealed with the rest of Part IIIAA, the test is applied by analogy to the modern equivalent: the **total franking credit tax offset entitlement for the income year**.
- **Aggregation:** the test is at the **taxpayer / income-year level across the whole portfolio**, not per parcel or per company. ATO: "whether their shares are a single parcel or a portfolio made up of several parcels".
- **ALL-OR-NOTHING — no tapering, no partial claim.** ATO, explicitly: *"If you have more than $5,000 in franking credits from a single parcel of shares and didn't satisfy the holding period rule, you **can't claim any** franking credits tax offset for those franking credits. This means you **can't limit your franking credit claim to a maximum of $5,000**."* There is **no** $4-for-$1 shade-out or similar taper — any such figure encountered in secondary sources is a confusion with an unrelated provision.
- **Rough equivalence** (ATO's own figures, current page): $5,000 of credits ≈ a fully franked dividend of **$11,667** at a 30% corporate rate, or **$15,000** at a 25% base-rate-entity rate. *(Corporate rates are chunk-1 scope; reproduced here only to size the ceiling.)*
- **Source URL:** https://www.ato.gov.au/individuals-and-families/investments-and-assets/shares-funds-and-trusts/investing-in-shares/refund-of-franking-credits-for-individuals
- **Retrieval date:** 2026-09-04
- **Confidence:** primary-verified (statute) + ATO current guidance for the all-or-nothing and equivalence points

### Finding 3.4 — Conditions that disqualify reliance on the exemption

| # | Disqualifier | Source | Confidence |
|---|---|---|---|
| 1 | Taxpayer is **not an individual** | s 160APHT(1)(a) | primary-verified |
| 2 | Total franking credit entitlement **exceeds $5,000** | s 160APHT(1)(b) | primary-verified |
| 3 | The taxpayer **or an associate** has made, is obliged to make, or is **likely to make** a **related payment** in respect of the dividend or a distribution attributable to it | s 160APHT(2) | primary-verified |
| 4 | The **trustee/partnership through which the distribution flows is not itself a qualified person** | s 160APHU(1) — overrides "any other provision of this Subdivision" | primary-verified |
| 5 | Distribution **washing** — a separate, parallel test with its own $5,000 threshold (see 3.6) | ITAA 1997 s 207-157 | primary-verified |
| 6 | General anti-avoidance (Pt IVA) still available to the Commissioner even under $5,000 | ATO guidance | secondary-only |

**The related payments rule is never switched off.** s 160APHT relieves the taxpayer of the *holding period* rule only. ATO: an individual under the ceiling "**are entitled to franking credits for all shares that satisfy the related payments rule, without having to satisfy the holding period rule**".

**A related payment does not disqualify. It switches the window.** s 160APHO(1)(b) tests a holder who made a related payment against the **secondary** qualification period (±45 / ±90 days) rather than the primary one; what the related payment costs is the *s 160APHT exemption* (s 160APHT(2)), not qualification itself. Model it as:

```
window    = SECONDARY if related_payment else PRIMARY        # s 160APHO(1)(a)/(b)
qualified = holding_period_ok(window)                        # s 160APHO
            OR (is_individual AND credits <= 5000 AND NOT related_payment)   # s 160APHT
```

*(Corrected 2026-09-04 on audit. This line previously read `qualified = related_payments_ok AND (credits <= 5000 OR holding_period_ok)`, which made `related_payments_ok` necessary in every case and so **wrongly denied qualification to a holder who made a related payment and satisfied 45 days in the secondary window**. It also contradicted this report's own pseudocode in §6. The pseudocode carried a milder form of the same bug and is corrected there too.)*

### Finding 3.5 — Does the exemption survive an *indirect* distribution (ETF / trust / partnership)?

**Yes.** Two independent primary confirmations:

1. **Statutory text.** s 160APHT(1) applies to dividends on shares "that the taxpayer **held or held an interest in**". An interest in shares held through a trust is squarely within that.
2. **ATO current guidance (page last updated 18 November 2025):** *"Under the small shareholder exemption, ignore the holding period rule if all your franking credit tax offset entitlements for the income year are less than $5,000. **This applies whether you receive the dividend or distribution directly from a shareholding, or indirectly through a trust or partnership.** You still need to meet the related payments rule for each dividend payment."*
3. **ATO worked example (Example 1, "Non-widely held trusts and the franking tax offset"):** a beneficiary Joy whose interest in a non-family discretionary trust is *not* held at risk — and who would therefore fail the holding period rule outright — **nonetheless qualifies**, because the trustee is a qualified person and Joy is an individual with under $5,000 of credits. The exemption rescues the *beneficiary-level* failure entirely.

**But it does not rescue a trustee-level failure** — s 160APHU(1) is expressly stated to apply "despite any other provision of this Subdivision", and s 160APHT sits in that Subdivision.

- **Source URLs:**
  - https://www.ato.gov.au/individuals-and-families/investments-and-assets/shares-funds-and-trusts/investing-in-shares/refund-of-franking-credits-for-individuals
  - https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/non-widely-held-trusts-and-the-franking-tax-offset
- **Confidence:** primary-verified

### Finding 3.6 — TRAP: there are **two different $5,000 rules**, and they behave differently

This is a live confusion risk — a web search on "$5,000 franking credits trust" surfaces both and conflates them.

| | **s 160APHT** (ITAA 1936, former) | **s 207-157(4)** (ITAA 1997) |
|---|---|---|
| Relieves you of | the **holding period rule** | the **dividend/distribution washing rule** |
| Who | individuals | individuals |
| Threshold | "does not exceed **$5000**" | "is **$5000 or less**" |
| Indirect distributions | **Yes** — applies to interests held through a trust/partnership | **No** — s 207-157(5)(b) works out the sum "**not** disregarding this Subdivision, to the extent it applies to any other entity through which a franked distribution flows indirectly to the individual"; ATO: *"It does not apply where the dividend flows indirectly to an individual through their interest in a trust or partnership."* |
| Indexed? | **No — frozen literal** | **No — frozen literal** |

- **Source URLs:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-157 ; https://www.ato.gov.au/forms-and-instructions/you-and-your-shares-2022/franking-tax-offsets
- **Confidence:** primary-verified

---

## 4. Who the rules apply to — and the super-versus-individual asymmetry

### Finding 4.1 — The qualified person test applies to **every** entity

- **Rule:** ITAA 1997 s 207-145(1) is framed in terms of "an **entity**" — individuals, companies, trustees, partnerships, and complying superannuation funds alike. The 45-day holding rule, the 30% at-risk test and the related payments rule apply to **all** of them without distinction.
- ATO applies it to SMSFs explicitly: **TA 2015/1** describes an arrangement where "**After the SMSF satisfies the 45 day holding period rule**, the company distributes its accumulated profits to the SMSF as fully or partially franked dividends."
- **Source URL:** https://www.ato.gov.au/law/view/document?docid=%22tpa%2Fta20151%2Fnat%2Fato%2F00001%22
- **Confidence:** primary-verified

### Finding 4.2 — The **small shareholder exemption does NOT apply to a complying superannuation fund**

- **Rule:** s 160APHT(1)(a): "the taxpayer is **an individual**". A complying superannuation fund is taxed through its **trustee** on the fund's taxable income; the taxpayer is the trustee **in its capacity as trustee of a trust estate**, not an individual. This is true even of an SMSF with natural-person individual trustees — the trustee acts in a representative capacity and is a separate taxpayer from the human being. The exemption is therefore unavailable to any super fund, APRA-regulated or self-managed, at any credit level.
- **Structural corroboration inside the statute:** Parliament gave complying superannuation funds a **different and separate** route to qualified-person status — s 160APHR(1)(**g**), the benchmark portfolio election. It would be incoherent to have legislated that route if s 160APHT already covered them. **Weakened, not broken, on audit 2026-09-04:** s 160APHR(1)(g) is expressly confined to "the trustee of a fund **(other than an excluded fund)**", and whether an **SMSF** falls inside that carve-out is unresolved (**U6**). If SMSFs are excluded from (g), then Parliament legislated the separate route for APRA-regulated funds only, and the corroboration carries less weight for an SMSF. It does not touch the primary point, which is the statutory words "an individual" in s 160APHT(1)(a).
- **ATO's own statement of the split** (Trust tax return instructions, "Appendixes"): *"As an alternative to complying with the 45-day holding period rule, there are **two other methods** of attaining [qualified person status]. **The first exempts individual shareholders** with total franking credit entitlements of less than $5,000. **The second allows certain taxpayers to elect to have a ceiling applied** to franking credit entitlements. These taxpayers include: the trustees of listed widely held unit trusts, **trustees of complying superannuation funds** …"*
- ATO "Franking credit trading" page draws the same line: *"An **individual** shareholder can also be a qualified person if the small shareholder exemption applies"*, then separately, under **"Alternative test for certain institutions"**: *"For certain institutional taxpayers (such as **superannuation funds** and listed widely held trusts) there is an alternative test."*
- **Source URLs:**
  - https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2016-instructions/appendixes
  - https://www.ato.gov.au/businesses-and-organisations/corporate-tax-measures-and-assurance/imputation/integrity-rules/franking-credit-trading
- **Retrieval date:** 2026-09-04
- **Confidence:** **primary-verified** on the statutory text (s 160APHT(1)(a) "an individual"); ATO guidance corroborates the split but never says the words "super funds cannot use the small shareholder exemption" in terms — see UNVERIFIED LIST item U1.

### Finding 4.3 — The super fund's alternative: the s 160APHR benchmark portfolio election

- **Rule:** s 160APHR(1) lets listed enumerated taxpayers elect, for a specified year of income **and all later years**, to have a **franking credit / franking rebate ceiling** apply instead of the holding period rule, in relation to shares "managed by or on behalf of the taxpayer as or in a discrete fund". Eligible electors include:
  - (a) trustee of a **listed widely held trust** (Sch 2F s 272-115)
  - (b) trustee of an **unlisted very widely held trust** (Sch 2F s 272-120)
  - (c)–(f) life assurance companies, general insurance companies, friendly societies, registered health benefits organisations
  - **(g) the trustee of a fund (other than an excluded fund) that is a *complying superannuation fund* for the purposes of Part IX**
  - (h) trustee of a **complying ADF**; (i) trustee of a **pooled superannuation trust**
  - (j) regulation-declared taxpayers; (k) certain 75%-institutionally-held unit trusts
- **The ceiling:** ATO describes it as "the maximum franking rebate a fund is entitled to in an income year cannot exceed the amount (**increased by 20%**) of franking credits to which the taxpayer would be entitled in respect of dividends paid on a **benchmark portfolio of shares** with the fund's net equity exposure."
- **Election is ineffective for a given dividend if a *prescribed* related payment was made** — s 160APHR(3)–(4): securities lending obligations (other than s 160AQUA ones) and equity swaps.
- **Practical note / caution — two independent unresolved questions.** First, **who may elect**: paragraph (g) reads "the trustee of a fund **(other than an excluded fund)** that is a *complying superannuation fund*", and s 160APHR(11) gives "excluded fund" the meaning in s 10(1) of the *Superannuation Industry (Supervision) Act 1993*. The SIS Act compilation in force 1 July 2002 contains **no "excluded fund" definition** — it defines "self managed superannuation fund" at s 17A instead. So **whether the (g) route is open to an SMSF at all is unresolved**; see **U6**. Do not assert that it is. Second, **whether the election still operates**: the election's *machinery and consequence* live in **Subdivision BA of Division 7 of former Part IIIAA** (s 160AQZH, "benchmark portfolio of shares"), which is **outside Division 1A** and therefore **outside** what ITAA 1997 s 207-145(1)(a) and TD 2007/11 preserve. Whether a fresh s 160APHR election can still be made and given effect post-1 July 2002 is not resolved by TD 2007/11. See UNVERIFIED LIST item U2. **For this project this is low-impact**: a super fund holding a diversified ETF or share portfolio long-term passes the plain 45-day rule anyway.
- **Confidence:** primary-verified as to the text of s 160APHR; the post-2002 operability of the election is **unverified**

### Finding 4.4 — **THE ASYMMETRY, stated directly (for P6-8)**

> **An individual investor with $5,000 or less of total franking credits in an income year is a qualified person for *all* their dividends without ever having to satisfy the 45-day holding rule (ITAA 1936 former s 160APHT). A complying superannuation fund — APRA-regulated or SMSF — has no equivalent relief at any credit level and must satisfy the 45-day holding rule for every parcel. The related payments rule binds both equally.**
>
> **The one alternative route is not available to be asserted.** s 160APHR(1)(g), the benchmark-portfolio ceiling, is confined to "the trustee of a fund **(other than an excluded fund)**" — and whether an **SMSF** is an "excluded fund" for that purpose is **unresolved** (**U6**), as is whether the election operates at all after 1 July 2002 (**U2**). Treat the (g) route as **open, not established**, for either kind of fund.

**Sizing the asymmetry for the model.** The bite is narrow, and the model should not overstate it:

- The gap only opens for a taxpayer holding **≤ $5,000** of credits *and* failing the 45-day test. Above $5,000 both sides face the identical rule, so the comparison is symmetric across most of the range this project cares about.
- On established buy-and-hold positions the 45-day rule is satisfied permanently after ~46 days (Finding 2.4), so **both** sides pass and the asymmetry contributes **zero**.
- It therefore only shows up in a modelled scenario involving **churn near an ex-dividend date**, a **hedged/derivative overlay** dropping net delta below 30%, or a **non-fixed trust interposed** in the non-super chain.
- **Recommended modelling default:** treat both super and non-super as passing the qualified person test, carry the asymmetry as a **documented structural note against P6-8** rather than a numeric adjustment, and only activate it if the model gains a turnover/hedging dimension. Encoding it as a live numeric difference on a passive portfolio would **overstate** the super penalty.

**Second-order asymmetry worth recording:** an **individual** can also be rescued at the *beneficiary* level by s 160APHT where their interest in an interposed non-fixed trust is not held at risk (ATO Example 1, Finding 3.5). A **super fund** beneficiary of such a trust cannot be. Where the model routes non-super holdings through a family/discretionary trust, this widens the gap.

- **Confidence:** primary-verified

---

## 5. Trusts and managed funds — how the rule is tested for an ETF

An Australian ETF is typically a **unit trust** (usually an AMIT). Division 1A tests it in a two-level structure.

### Finding 5.1 — Tested at BOTH levels, with a hard trustee-level gate

- **Rule (trustee-level gate):** ITAA 1936 (former) **s 160APHU(1)**: *"If a taxpayer that is a **trustee** or partnership **is not a qualified person** in relation to a dividend … then, **despite any other provision of this Subdivision** (except subsection 160APHH(6)), **no beneficiary** of the trust or partner in the partnership **is a qualified person** in relation to the dividend."*
- The s 160APHL notes say the same from the other direction: *"The calculation is not required unless the trustee is a qualified person in relation to the dividend. **If the trustee is not a qualified person, no beneficiary of the trust can receive a franking rebate or franking credit through the trust.**"*
- ATO (page last updated 18 November 2025): *"**Both** the trustee and beneficiaries need to be qualified persons in relation to the shares for the beneficiaries to be entitled to a franking tax offset."*
- **Answer to the brief's question:** **BOTH levels**, sequentially — trustee first as a hard gate, then investor.
- **Source URL:** https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/non-widely-held-trusts-and-the-franking-tax-offset
- **Confidence:** primary-verified

### Finding 5.2 — Level 1: the trustee

- **Rule:** The trustee is tested as an ordinary taxpayer under s 160APHO against the **underlying shares** — 45/90 days at risk, acquisition/disposal days excluded, ≥30% net delta. Alternatively, an eligible trustee (listed widely held trust, unlisted very widely held trust — s 160APHR(1)(a)/(b)) may elect the benchmark portfolio ceiling.
- **Practical reality for a broad-market index ETF:** the trustee holds a long, unhedged, buy-and-hold portfolio, so it satisfies the holding rule on essentially every parcel. Index-rebalance turnover is the only realistic failure mode, and it affects a small tail of holdings.
- **Confidence:** primary-verified

### Finding 5.3 — Level 2: the investor — which test depends on whether the trust is "widely held"

This is the fork the model must get right.

**(a) Widely held trust → s 160APHP.**

- **Definition (s 160APHD, "widely held trust"):** (a) a trust that is neither a **closely held fixed trust** nor a **non-fixed trust**; **or** (b) a trust whose trustee is the subject of a regulation-made declaration under s 160APHR(1)(j); **or** (c) a unit trust where at the time (i) ≥75% of units are held by s 160APHR(1)(a)–(j) persons or prescribed persons, (ii) all units carry the same rights, (iii) if redeemable, redeemable at a price on the trust's NAV per Australian accounting principles, and (iv) the trust engages only in qualifying activities. A "closely held fixed trust" is a fixed trust in which ≤20 entities (associates counted as one) hold ≥75% of income or capital beneficial interests.
- **Test:** s 160APHP(1) — the investor is tested on their **interest in the trust** (the interest in shares contained in the trust holding as defined in s 160APHL(4)), for a continuous period of **not less than 45 days**, "not counting the day on which the taxpayer acquired the interest or, if the taxpayer has disposed of the interest, the day on which the disposal occurred", within the primary or secondary qualification period as applicable. s 160APHP(2) applies the same material-diminution exclusion.
- **Note the two differences from s 160APHO:** (i) the test bites on the **units**, not the underlying shares; (ii) there is **no 90-day preference-share variant** in s 160APHP — it is a flat 45 days regardless of what the trust holds.
- **"Ex dividend" is redefined** for these investors: s 160APHE(2) — the interest becomes ex dividend "on the day after the last day on which the acquisition by a person of the interest will entitle the person to receive a **distribution from the trust**". So the reference date is the **ETF's own ex-distribution date**, not the underlying companies' ex-dividend dates.
- s 160APHO(4) switches off s 160APHO for these interests, so there is no double test.
- ATO: *"If you have interests in a **widely held trust**, the holding period rule and related payments rule apply to **your interest in the trust** (rather than in the shares held by the trust)."*
- **Confidence:** primary-verified

**(b) Non-widely held trust → s 160APHO applied to the interest, computed via s 160APHL.**

- **Test:** the investor is tested on their **interest in the underlying shares**, quantified under s 160APHL(5) (proportional to their share of the dividend income), which s 160APHL(7) gives a **long position with delta +1**.
- **The killer deeming — s 160APHL(10):** if (a) the trust is **not a family trust** within Sch 2F, (b) it is not a trust merely by reason of executors/administrators (i.e. not a deceased estate), and (c) the interest is not an employee share scheme security, then the beneficiary has, **in addition** to other positions, a **short position equal to their long position under (7)**, and a **long position equal to so much of their interest in the trust holding as is a *fixed interest***.
- **Consequence:** absent a fixed interest, the +1 long and the −1 short net to **zero delta** → below 30% → materially diminished → **fails**. This is why a beneficiary of a discretionary trust with no family trust election gets nothing.
- **"Fixed interest" — s 160APHL(11):** the interest is fixed "to the extent that the interest is constituted by a **vested and indefeasible** interest in so much of the corpus of the trust as is comprised by the trust holding."
- ATO's own summary: *"Beneficiaries of trusts, other than family trusts and deceased estate trusts, will not pass these tests **unless they hold a sufficient fixed interest** in the shares to expose them to at least 30% of the risks and opportunities of owning the shares. They may, however, be eligible for the small shareholder exemption."*
- **Confirmed by ATO ID 2002/604:** beneficiaries of a discretionary trust **do** have materially diminished risks for s 160APHM(2) purposes. **Confirmed by ATO ID 2003/1105:** a beneficiary of a non-fixed trust with no family trust election is **not** a qualified person, even though the trustee held the shares at risk for 45 days.
- **Confidence:** primary-verified

### Finding 5.4 — s 160APHL(13): the provision that saves ETF and unlisted-fund unitholders

- **Rule:** s 160APHL(12) would otherwise deem an interest **defeasible** (and therefore not "fixed") where the interest may be redeemed for less than value, or where its value may be materially reduced by the **issue of further units**. Since open-ended funds and ETFs continuously create and redeem units, that would sink every unitholder.
- **s 160APHL(13)** rescues them. If: (a) the trust is a unit trust and the taxpayer holds units; and (b) the units are redeemable or further units can be issued; and (c) **where the units are listed** on an approved stock exchange — units will be redeemed, or further units issued, **for the price at which other units of the same kind are offered for sale on the exchange** at the time; or (d) **where not listed** — redeemed/issued **for a price determined on the basis of the unit trust's net asset value, according to Australian accounting principles**, at the time — then *"the **mere fact** that the units are redeemable, or that the further units are able to be issued, **does not mean** that the taxpayer's interest, as a unit holder, in so much of the corpus of the trust as is comprised by the trust holding **is defeasible**."*
- **Modelling consequence:** a **listed ETF creating/redeeming at market price**, and an **unlisted managed fund applying/redeeming at NAV**, both fall squarely inside s 160APHL(13). Unitholders keep a vested and indefeasible (fixed) interest, and the s 160APHL(10) short-position deeming is neutralised. **This is the provision that makes ordinary ETF investing work under Division 1A.**
- **s 160APHL(14):** the Commissioner has a residual discretion to treat an interest as vested and indefeasible. **ATO ID 2014/10** holds that the fact a unitholder cannot satisfy the s 160APHO qualification period is **not** a relevant matter for the Commissioner in exercising that discretion.
- **Confidence:** primary-verified

### Finding 5.5 — What a distributing trust is required to certify

- **Finding:** **Division 1A imposes no express certification or notification obligation on a distributing trustee.** There is no equivalent of a s 160APHR-style certificate. What Division 1A does is make the trustee's own qualified-person status a **precondition** to any beneficiary claiming (s 160APHU(1)), and the trust return instructions then require the trustee not to report franking credits it cannot pass on.
- **What the ATO does require:**
  - *"For the franking credits to flow through to the beneficiaries **both they and the trust must be qualified persons** in relation to the dividend."*
  - *"For credits received indirectly through a partnership or other trust, **do not show the franking credit if the trustee was not a qualified person** or was otherwise unable to claim a franking credit."*
  - The onus is placed on the **investor**: *"If your organisation receives franked dividends as a beneficiary of a trust, **before making claim for franking credits, you should**: confirm your interest in the trust and whether, for example, it includes an entitlement to income and to the capital or corpus of the trust estate; obtain advice, where necessary, on the nature of your interest and whether you are eligible to claim franking credits."*
- **In practice** the information reaches investors through the fund's annual tax statement (AMMA statement for an AMIT / standard distribution statement otherwise), which reports "Franked distributions" and "Franking credits" components. That is a Division 276 / trust-reporting obligation, **not** a Division 1A certification. The tax statement asserts the amounts; it does **not** certify that the *investor* is a qualified person, because the investor-level test (45 days on their own units, ≥30% net delta) depends on facts the fund cannot see.
- **Source URLs:** https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2016-instructions/appendixes ; https://www.ato.gov.au/businesses-and-organisations/not-for-profit-organisations/statements-and-returns/refund-of-franking-credits-for-not-for-profit-entities/rules-on-claiming-a-franking-credit-refund
- **Confidence:** the *absence* of a Division 1A certification duty is **primary-verified** (I read the whole Division); the AMMA/tax-statement practice description is **secondary-only** — see UNVERIFIED LIST item U3.

---

## 6. Model-facing summary

### Constants — every one a FROZEN literal, none indexed

| Config key | Value | Statutory source | Indexation |
|---|---|---|---|
| `HOLDING_DAYS_ORDINARY` | 45 | s 160APHO(2)(a)(i), (b)(i) | none — frozen |
| `HOLDING_DAYS_PREFERENCE` | 90 | s 160APHO(2)(a)(ii), (b)(ii) | none — frozen |
| `WIDELY_HELD_TRUST_INVESTOR_DAYS` | 45 (flat, no pref variant) | s 160APHP(1) | none — frozen |
| `PRIMARY_PERIOD_END_DAYS_AFTER_EX_DIV` | 45 / 90 | s 160APHD "primary qualification period" | none — frozen |
| `SECONDARY_PERIOD_WINDOW` | ±45 / ±90 around ex-div | s 160APHD "secondary qualification period" | none — frozen |
| `AT_RISK_MIN_NET_DELTA` | 0.30 (strictly less than fails) | s 160APHM(2) | none — frozen |
| `SMALL_SHAREHOLDER_CEILING` | 5000 | s 160APHT(1)(b) | **none — frozen; no existing mechanism can index it** |
| `SMALL_SHAREHOLDER_ELIGIBLE_ENTITIES` | `{individual}` only | s 160APHT(1)(a) | n/a |
| `DIVIDEND_WASHING_SMALL_HOLDER_CEILING` | 5000 (separate rule, direct-only) | ITAA 1997 s 207-157(4) | none — frozen |
| `EXCLUDE_ACQUISITION_DAY` | always true | s 160APHO(2) | n/a |
| `EXCLUDE_DISPOSAL_DAY` | true only if disposed | s 160APHO(2) | n/a |
| `PARCEL_DISPOSAL_ORDER` | LIFO | s 160APHI(4) | n/a |

### Decision procedure

```
qualified_person(entity, distribution):
    # 0. trustee gate, applied recursively up the chain — s 160APHU(1)
    if distribution flows through a trust or partnership
       and that trustee/partnership is not qualified_person:
        return False                      # hard stop, no exemption survives this

    # 1. related payments — never waived by any exemption
    if entity or an associate has made / is obliged to make / is likely to make
       a related payment in respect of the distribution:              # s 160APHN
        # trustee distributing to a presently entitled beneficiary is NOT
        # a related payment — s 160APHN(5). Normal ETF distributions are safe.
        window = SECONDARY                                            # ±45 / ±90
    else:
        window = PRIMARY                        # acq_day+1 .. ex_div+45 / +90

    # 2. small shareholder exemption — s 160APHT. INDIVIDUALS ONLY.
    if entity.type == INDIVIDUAL and total_franking_credits_for_year <= 5000 \
       and not related_payment_made:          # s 160APHT(2)
        # applies to direct AND indirect (trust/partnership) holdings
        # and rescues beneficiary-level at-risk failures
        return True
    # A related payment costs the EXEMPTION, not qualification: fall through
    # to the holding period test below, against the SECONDARY window.
    # (Corrected 2026-09-04 — this branch used to `return not related_payment_made`,
    #  denying a taxpayer who made a related payment and still held 45 days.)
    # NOTE: complying super funds (APRA + SMSF), companies and trustees
    #       NEVER reach this branch. s 160APHT(1)(a).

    # 3. holding period rule, at risk
    if entity is a beneficiary of a WIDELY HELD trust:                # s 160APHP
        days = at_risk_days(interest_in_trust, window)     # 45 flat, no pref
        ex_div_ref = trust's ex-DISTRIBUTION date                     # s 160APHE(2)
    else:                                                            # s 160APHO
        days = at_risk_days(interest_in_shares, window)   # via s 160APHL if trust
        ex_div_ref = company's ex-dividend date                       # s 160APHE(1)
    # at_risk_days: drop acquisition day; drop disposal day if disposed;
    #               drop every day with net delta < 0.30 WITHOUT breaking continuity
    # LIFO on substantially identical parcels — s 160APHI(4)

    if days >= required_days: return True

    # 4. institutional alternative — s 160APHR benchmark portfolio ceiling
    #    listed widely held trusts, life/general insurers, friendly societies,
    #    ADFs, PSTs, and complying super funds OTHER THAN an "excluded fund".
    #    See U6 — whether an SMSF is an "excluded fund" is unresolved.
    #    See U2 — post-2002 operability is unresolved. Do not assume either.
    return has_effective_160APHR_election(entity)
```

### What this means for the project's typical case

For a passive investor (super or non-super) holding broad-market ETFs bought and held, the qualified person test is **satisfied continuously** and imposes no reduction on the franking credit computed in chunk 1 or refunded per chunk 2. The gate matters for edge scenarios only: portfolio churn near an ex-distribution date, derivative overlays, and interposed non-fixed trusts.

---

## 7. UNVERIFIED LIST

| # | Item | Status | What would close it |
|---|---|---|---|
| **U1** | An **explicit ATO statement in terms** that "the small shareholder exemption is not available to a superannuation fund". I established this from the statutory words "the taxpayer is an individual" (s 160APHT(1)(a)) plus ATO's consistent framing of two *separate* alternatives (individuals → $5,000; super funds → benchmark ceiling). ATO never negates it in one sentence. | statute **primary-verified**; ATO corroboration **structural, not express** | An ATO ID, private ruling, or SMSF-specific guidance page saying it directly. Try the ATO Legal Database full-text search for `160APHT` + `superannuation`, or the current SMSF annual return instructions for the franking credits label. I fetched the 2019 SMSF annual return "J, K, L Dividends and franking credits" page and it does not address the qualified person test at all. **CLOSED — ACCEPTED 2026-09-04 (user ruling).** Shipped as labelled inference; the express ATO statement is not to be chased. Reasons: the statutory words are unambiguous, the structural corroboration is consistent, and the inference runs toward **less** relief — if it is wrong the tool is conservative, not confidently over-stating, which is the failure mode this project exists to prevent. Practical weight is small: a buy-and-hold portfolio passes the 45-day rule anyway, in super or out. **Do not reopen without new evidence.** |
| **U2** | Whether a **s 160APHR benchmark portfolio election can still be made and given effect after 1 July 2002**. s 160APHR is inside Division 1A and so is preserved; but its *consequence* — Subdivision BA of Division 7 of former Part IIIAA, and the s 160AQZH "benchmark portfolio of shares" definition — is **outside** Division 1A and outside what ITAA 1997 s 207-145(1)(a) and TD 2007/11 preserve. TD 2007/11 is silent. | **unverified** | A TD/TR/ATO ID addressing s 160APHR post-2002, or confirmation that the ATO still publishes the "average franking credit & rebate yields" tables its guidance points to for this purpose. Low impact for this project (see 4.3). |
| **U3** | Exactly what an **AMIT/managed fund must report** to unitholders about franked distributions and franking credits, and under which provision (Division 276 AMMA statement requirements vs. general trust reporting). I established the *negative* — Division 1A imposes no certification duty — from a full read of the Division. The positive obligation was not traced to statute. | negative **primary-verified**; positive **secondary-only** | Read ITAA 1997 Division 276 (AMMA statement content requirements) and the current ATO "AMIT" guidance. Note this is arguably chunk-1 territory (what the statement *contains*), not chunk-3 (whether the credit is *available*). |
| **U4** | The precise **commencement/application provisions** for Division 1A. ATO states two different dates for two different purposes (see DISCREPANCIES D2) and I did not open the amending Act's application items. | **unverified** | Fetch *Taxation Laws Amendment Act (No. 2) 1999* (No. 93 of 1999), Schedule 4, application provisions, from the FRL API. **Immaterial for FY2026-27** — every holding in a 2026-27 forecast was acquired long after 1997. |
| **U5** | Whether any **regulations** have ever been made under any of Division 1A's regulation-making hooks — s 160APHM(1) (what constitutes material diminution), **s 160APHJ(1)** (delta), **s 160APHR(3)/(4)** (prescribed related payments) and s 160APHR(1)(j)/(2) (declaring or precluding electors). I found no evidence of any, but did not search the Income Tax Regulations. *(Corrected 2026-09-04 on audit — this item originally named only two hooks and implied the list was complete. It was not. No hook reaches the $5,000, so §3.2's conclusion is unaffected.)* | **unverified** | Search the *Income Tax Assessment Regulations 1936* (or its successor) for regulations referencing 160APHJ / 160APHM / 160APHR. Note that since Part IIIAA is repealed, any such regulations are almost certainly spent. |
| **U6** | Whether the **s 160APHR(1)(g) benchmark-portfolio election is available to an SMSF at all.** Paragraph (g) covers "the trustee of a fund **(other than an excluded fund)** that is a *complying superannuation fund*", and s 160APHR(11) gives "excluded fund" the meaning in s 10(1) of the *SIS Act 1993*. **The SIS Act compilation in force 1 July 2002 contains no "excluded fund" definition** — it defines "self managed superannuation fund" at s 17A instead (the SIS Act term was replaced when SMSFs were introduced in 1999). So the carve-out points at a definition that no longer exists in the incorporated Act, and the report must **not** assert that (g) is open to an SMSF. Raised on audit 2026-09-04. | **unverified — and it must stay visibly open** | Read s 10(1) of the SIS Act as in force when s 160APHR(11) was enacted, trace the "excluded fund" → "self managed superannuation fund" transition (*Superannuation Legislation Amendment Act (No. 3) 1999*), and check whether ITAA 1936 s 160APHR(11) was consequentially amended before Part IIIAA ceased to apply. Compounds with **U2**: even if (g) is open, the election's machinery may not have survived 1 July 2002. Low impact for this project — a super fund holding a long-term diversified portfolio passes the plain 45-day rule anyway. |

---

## 8. DISCREPANCIES

**D1 — "$5,000 or less" vs "less than $5,000" (the boundary case).**
The **statute** is unambiguous: s 160APHT(1)(b) says the total "**does not exceed $5000**", i.e. **≤ $5,000 qualifies**. ITAA 1997 s 207-157(4), drafted 15 years later for the parallel dividend-washing carve-out, uses the equivalent "**is $5000 or less**". But **one** current ATO web page — *Refund of franking credits for individuals* — carries **both** loose formulations, *"less than $5,000"* and *"The holding period rule applies if your total franking credit entitlement for the income year is **$5,000 or more**"* — which would put a taxpayer at **exactly $5,000.00** inside the holding period rule, contrary to the statute. *(Corrected 2026-09-04 on audit: this originally attributed the two formulations to two different pages. It is one page contradicting the statute twice; the resolution below is unchanged.)*
**Resolution: follow the statute — `credits <= 5000` qualifies.** The ATO pages are loose summaries; s 160APHT(1)(b) and the parallel s 207-157(4) both use inclusive language. The practical impact is a measure-zero boundary case, but a model that hard-codes `< 5000` is wrong on the statute.
Sources: statute (FRL, ITAA 1936 vol 9, 2002-05-30 compilation) vs https://www.ato.gov.au/individuals-and-families/investments-and-assets/shares-funds-and-trusts/investing-in-shares/refund-of-franking-credits-for-individuals.

**D2 — Two different commencement dates cited by the ATO.**
"Refund of franking credits for individuals" says the holding period rule "applies to [shares] bought **on or after 1 July 1997**". "Non-widely held trusts and the franking tax offset" says "Special rules apply to shares acquired **on or after 31 December 1997** that are held by a non-widely held trust", and ATO ID 2003/1105 frames its facts as shares "acquired by the trustee **post 31 December 1997**".
**Resolution: these are almost certainly not in conflict** — the general holding period rule commenced for acquisitions from 1 July 1997, while the *trust-specific* deeming machinery (s 160APHL(10) and the beneficiary interest rules) commenced for acquisitions from 31 December 1997. Not confirmed against the amending Act's application provisions (U4). **Immaterial for FY2026-27.**

**D3 — A widely-circulated "$2,000 ceiling reduced by $4 for every $1 of excess" claim.**
An automated search summary returned this figure while purporting to describe s 160APHT. **It is wrong.** The statutory text of s 160APHT contains **no** taper, **no** shade-out, and the figure is **$5,000**, not $2,000. The ATO is explicit that the rule is all-or-nothing: *"you **can't limit your franking credit claim to a maximum of $5,000**."* The $2,000/$4-per-$1 shape belongs to an unrelated provision. **Do not implement any taper on this ceiling.**
Sources: statute (primary) vs. an unattributed search-result summary (rejected).

**D4 — "The small shareholder exemption does not apply where the dividend flows indirectly through a trust or partnership."**
This statement is **true of ITAA 1997 s 207-157(4)** (the dividend-washing small-holder carve-out) and **false of ITAA 1936 s 160APHT** (the holding-period small shareholder exemption). Search engines routinely conflate them because both are "$5,000 exemptions for individuals". The ATO page that carries the "does not apply … indirectly" sentence is discussing the **dividend washing integrity rule**, as its surrounding text makes clear.
**Resolution: for the holding period rule, the exemption DOES apply to indirect distributions** — confirmed by the statutory words "held **or held an interest in**" (s 160APHT(1)), by ATO's *"This applies whether you receive the dividend or distribution directly from a shareholding, **or indirectly through a trust or partnership**"*, and by ATO's worked Example 1 on the non-widely-held-trusts page. See Finding 3.6.

**D5 — The brief's premise about the *Income Tax (Transitional Provisions) Act 1997*.**
The brief asked whether the rules live in ITAA 1936 former Division 1A of Part IIIAA "as preserved by the *Income Tax (Transitional Provisions) Act 1997*". **The first half is right; the second half is not.** The ITTPA has no Division 207 and plays no part here (verified by exhaustive section probing — see Finding 1.2). Preservation is by the **express terms of ITAA 1997 ss 207-145(1)(a) and 207-150(1)(a)**, construed by **TD 2007/11** as importing Division 1A **as in force at 30 June 2002**. Any citation to the ITTPA for this proposition should be corrected wherever it appears downstream.

---

## 9. Source register

| Source | Type | URL | Retrieved |
|---|---|---|---|
| ITAA 1997 s 207-145 (with history notes) | primary — statute | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-145 | 2026-09-04 |
| **Former Div 1A of Pt IIIAA reproduced inline in the ATO Legal Database s 207-145 document** — a **second, independent primary source** for every Div 1A quotation here (added on audit 2026-09-04) | primary — statute (reproduction) | same URL as the row above | 2026-09-04 |
| ITAA 1997 s 207-157 (distribution washing) | primary — statute | https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-157 | 2026-09-04 |
| ITAA 1936 former Div 1A Pt IIIAA, Subdiv A (ss 160APHC–160APHNA), compilation in force 30 June 2002 | primary — statute | `https://api.prod.legislation.gov.au/v1/documents/find(titleid='C1936A00027',asat=2002-05-30,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=8,rectificationVersionNumber=0)` | 2026-09-04 |
| ITAA 1936 former Div 1A Pt IIIAA, Subdiv B (ss 160APHO–160APHU), same compilation | primary — statute | same call, `volumeNumber=9` | 2026-09-04 |
| TD 2007/11 (binding public ruling — Div 1A applies as in force at 30 June 2002) | primary — public ruling | https://www.ato.gov.au/law/view/document?Docid=TXD%2FTD200711%2FNAT%2FATO%2F00001&PiT=99991231235958 | 2026-09-04 |
| ATO ID 2003/1105 (beneficiary of non-fixed trust, no FTE, not qualified) | ATO interpretative decision | https://www.ato.gov.au/law/view/document?docid=AID/AID20031105 | 2026-09-04 |
| ATO ID 2002/604 (discretionary trust beneficiaries have materially diminished risks) | ATO interpretative decision | https://www.ato.gov.au/law/view/document?docid=AID/AID2002604/00001 | 2026-09-04 |
| ATO ID 2014/10 (s 160APHL(14) discretion) | ATO interpretative decision | https://www.ato.gov.au/law/view/document?docid=AID/AID201410/00001 | 2026-09-04 |
| TA 2015/1 (ATO requires SMSF to satisfy the 45-day rule) | taxpayer alert | https://www.ato.gov.au/law/view/document?docid=%22tpa%2Fta20151%2Fnat%2Fato%2F00001%22 | 2026-09-04 |
| ATO "Franking credit trading" | ATO guidance | https://www.ato.gov.au/businesses-and-organisations/corporate-tax-measures-and-assurance/imputation/integrity-rules/franking-credit-trading | 2026-09-04 |
| ATO "Refund of franking credits for individuals" | ATO guidance | https://www.ato.gov.au/individuals-and-families/investments-and-assets/shares-funds-and-trusts/investing-in-shares/refund-of-franking-credits-for-individuals | 2026-09-04 |
| ATO "Non-widely held trusts and the franking tax offset" (last updated 18 Nov 2025) | ATO guidance | https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/non-widely-held-trusts-and-the-franking-tax-offset | 2026-09-04 |
| ATO "Rules on claiming a franking credit refund" (NFP) | ATO guidance | https://www.ato.gov.au/businesses-and-organisations/not-for-profit-organisations/statements-and-returns/refund-of-franking-credits-for-not-for-profit-entities/rules-on-claiming-a-franking-credit-refund | 2026-09-04 |
| ATO "You and your shares 2022 — Franking tax offsets" | ATO guidance | https://www.ato.gov.au/forms-and-instructions/you-and-your-shares-2022/franking-tax-offsets | 2026-09-04 |
| ATO Trust tax return instructions — Appendixes (states the individual/institution split) | ATO guidance | https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2016-instructions/appendixes | 2026-09-04 |

### Fetch notes for later chunks (measured this session)

- **`api.prod.legislation.gov.au` WORKS** and is the way to get **repealed** provisions. Swagger at `/swagger/v1/swagger.json`. Use `/v1/documents/find(titleid='<id>',asat=YYYY-MM-DD,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=N,rectificationVersionNumber=0)` — it returns the **binary .doc directly** (not JSON). `rectified=true` → 404; **`rectificationVersionNumber=0` is the working form**. `asat` must land on an actual compilation start date; list them first with `/v1/documents?$filter=titleId eq '<id>' and start ge YYYY-MM-DDT00:00:00 and start le ...` (**no trailing `Z` on the datetime — it 400s**). Convert the .doc with macOS `textutil -convert txt`.
- ITAA 1936 title id = `C1936A00027`. Part IIIAA sits in Word volumes **8** and **9** of the 2002 compilations.
- **ATO Legal Database 404s repealed provisions** — `?DocID=PAC%2F19360027%2F160APHO` fails with or without `&PiT=`. Only in-force sections resolve. Confirmed the `?DocID=PAC%2F<act>%2F<section>` form works for in-force ITAA 1936 (`19360027`), ITAA 1997 (`19970038`) and the *Income Tax (Transitional Provisions) Act 1997* (`19970040`).
- ATO Legal Database rulings/IDs resolve as `?docid=TXD/TD<year><no>/NAT/ATO/00001`, `?docid=AID/AID<year><no>[/00001]`, `?docid="tpa/ta<year><no>/nat/ato/00001"`.
- **AustLII remains Cloudflare-blocked** (HTTP 403 with a browser UA).
- ato.gov.au continues to require plain `curl` + a browser User-Agent; WebFetch 403s.
