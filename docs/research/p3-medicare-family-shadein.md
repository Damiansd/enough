# P3 — The Medicare levy family shade-in: how the s 8(2) reduction is split between two spouses

**Scope:** register open item **O7** only. How the *Medicare Levy Act 1986* s 8 reduction is computed and apportioned between spouses in the family shade-in band. Nothing else — not Division 293, not the surcharge, not the thresholds' indexation mechanism.
**Retrieval date:** 2026-09-04 · **Forecast year:** FY2026-27 (thresholds are the 2025-26 prior-year fallback per register §2.7)

---

## 0. Headline answers

| Question | Answer | Confidence |
|---|---|---|
| Was the s 8(2) formula read as text? | **Yes — the GIF was downloaded and read directly, and independently corroborated by the ATO's own history notes, which set out the *previous* forms of the same formula in plain text.** Register §2.7's "was not read" is now closed. | primary-verified |
| The s 8(2) formula | **reduction = 2% of the family income threshold − (0.08 × (family income − family income threshold))** | primary-verified |
| Is the reduction a *levy*, or a *reduction of levy*? | A **reduction**. s 8(2) reduces "the amount of the levy payable by the relevant person **upon the taxable income of the relevant person**" — i.e. the person's own 2% levy is computed first, then reduced. | primary-verified |
| Is it apportioned between spouses? | **YES — s 8(3).** This is the missing provision. It was never in the register. | primary-verified |
| By what ratio? | Each spouse keeps **their own share of combined taxable income**: `reduction_P = raw_reduction × TI(P) / family_income`. s 8(3) achieves this by *subtracting* the spouse's proportion. | primary-verified |
| Does one spouse's levy depend on the other's income? | **YES, three separate ways:** (1) family income is the sum of both taxable incomes (s 8(5)(a)); (2) the s 8(3) apportionment is by the *spouse's* share; (3) the s 8(3) apportionment only happens **if the spouse would be liable to levy at all** — a spouse under the s 7 single threshold switches it off, and the relevant person then keeps the **whole** reduction. | primary-verified |
| Effective marginal rate in the band | **10%** — confirmed algebraically from the read formula, not by reconciliation. See §3.3. | primary-verified |
| Where does the upper threshold come from? | It is **derived, not enacted**. The reduction hits nil at `FI = 1.25 × FIT` because `0.02·FIT = 0.08·(FI − FIT)`. The published "upper threshold" is the ATO's arithmetic, not a statutory number. | primary-verified |
| Seniors interaction | s 8(7) does **one thing only**: it substitutes `$61,623` for `$47,238` in ss 8(5) and 8(6). The 2% / 0.08 / apportionment machinery is **identical**. | primary-verified |
| Dependent children | s 8(5) "family income threshold" definition: `$47,238 + $4,338 per child`. **Irrelevant to a childless couple** — the count is zero and the threshold is the bare base amount. | primary-verified |
| Does s 8(4) (spillover of excess reduction to the spouse) ever bite? | **Only when s 7(2) has already capped a spouse's own levy below 2%.** Where neither spouse is s 7(2)-capped it is provably unreachable. See §4. | primary-verified derivation |
| Does s 7(2) (the *single* 10% shade-in) still apply to a married person? | **Yes — s 7 has no married-person carve-out, and s 7(2) expressly caps the levy "but for sections 8 and 9".** Both caps operate, s 7 first. **The current code does not do this — see §7 D4.** | primary-verified |

**Register §2.7 corrections required — see §7 (DISCREPANCIES).**

---

## 1. Retrieval — what worked, and a correction to the brief

### Finding 1.1 — The `PAC%2F19860110%2F<section>` act code **works**

- **Verified.** `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8` returned **HTTP 200, 161,774 bytes**, with a browser User-Agent, and contains the full operative text of s 8 plus its complete amendment history. The act code in the brief is correct and needs no substitution.
- The `?LocID=` form the register currently cites (e.g. `?LocID=%22PAC%2F19860110%2F8%22`) is the title-only shell the brief warned about. **The register's s 8 source URLs should be switched to the `?DocID=` form.**
- **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 1.2 — The formula **is** a GIF, and the GIF **is** readable

The register was right that s 8(2)'s formula is served as an image. The `<img>` tag in the s 8 document is:

```
<img src="/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif"
     title="Formula s 8(2)" />
```

The image itself is fetchable at `https://www.ato.gov.au/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif` — **HTTP 200, 15,071 bytes, GIF 380×118, greyscale**. It was downloaded, upscaled 3×, and read. It renders, verbatim:

> **2% of the family income threshold in relation to the relevant person − ( 0.08 × ( The family income in relation to the relevant person − The family income threshold in relation to the relevant person ) )**

**This is a direct read of the operative text, not a reconciliation.** It is corroborated *independently* by the plain-text history notes on the same page, which give the two immediately prior forms of the same formula with named variables:

- Before No. 43 of 2013 (i.e. up to 2013-14): `A − (0.085 (B − C))` where *"A is 1.5% of the family income threshold in relation to the relevant person; B is the family income in relation to the relevant person; and C is the family income threshold in relation to the relevant person."*
- Before No. 55 of 2006: `A − (0.185 (B − C))` on the same definitions.

The 2013 amendment (Act No. 43 of 2013, Sch 1 items 5–6, applicable from 2014-15) *"substitut[ed] the formula and omitt[ed] all the words after the formula"* — which is exactly why the variable definitions vanished and the whole expression became an inline image. The structure `A − (k(B − C))` is continuous across all three versions; only `A`'s percentage and `k` changed (1.5%/0.085 → 2%/0.08), tracking the levy rate rise from 1.5% to 2%.

- **Source URLs:**
  - https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8
  - https://www.ato.gov.au/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif
- **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

**Note for future retrievals:** an ATO Legal Database formula GIF is a first-class primary source. The path pattern is `/law/view/sgif/cch-leg2/formula_<section>_<id>_<timestamp>.gif`, and the `title` attribute names the provision. There is no need to fall back to secondary sources when a formula is "an image".

---

## 2. The statutory text, as read

### Finding 2.1 — s 8(1): the nil band

- **Name:** Medicare levy — family nil threshold
- **Rule:** *Medicare Levy Act 1986* s 8(1). Where a person **(a)** is a married person on the last day of the year of income; **or (b)** is entitled to a Subdivision 61-A (invalid/carer) tax offset in respect of the person's child; **or (c)** is entitled to a notional Subdivision 961-B tax offset — *"and the **family income** in relation to the person **does not exceed** the **family income threshold** in relation to the person, **no levy is payable by the person upon the taxable income of the person**."*
- Note the trigger is being **married on the last day of the income year** (para (a)) — for this project's retiree couple that is the only limb that matters; (b) and (c) are dependant limbs. Para (d) was repealed by No. 70 of 2015.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8 · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.2 — s 8(2): the reduction formula — **THE ANSWER, PART 1**

- **Name:** Family shade-in reduction amount
- **Rule:** s 8(2). *"**Subject to subsection (3)**, where a person (in this subsection referred to as the **relevant person**) [same (a)/(b)/(c) limbs as s 8(1)] and the **family income** in relation to the relevant person **exceeds** the **family income threshold** in relation to the relevant person, **the amount of the levy payable by the relevant person upon the taxable income of the relevant person but for this section and section 9 shall be reduced by the amount (if any) calculated in accordance with the formula:**"*

```
reduction_raw = 0.02 × FIT − ( 0.08 × ( FI − FIT ) )
```

where `FIT` = the family income threshold in relation to the relevant person, `FI` = the family income in relation to the relevant person.

- **Three things this text settles that the register did not record:**
  1. It is a **reduction of a levy already computed on the person's own taxable income**, not a levy computed on family income. The base being reduced is `0.02 × TI(P)`. Family income enters only through the reduction.
  2. **"the amount (if any)"** — a negative result is **nil**, not a negative reduction. This is the statutory floor, and it is what makes the "upper threshold" exist at all.
  3. **"Subject to subsection (3)"** — s 8(2) alone is *not* the whole answer. The register stopped one subsection too early.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** `MEDICARE_FAMILY_SHADE_IN_A_RATE = 0.02` (**= the levy rate — see §6 note**), `MEDICARE_FAMILY_SHADE_IN_TAPER = 0.08` — both **hard constants in the Act's text**, amended only by Act, never indexed
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8 (text) + the s 8(2) formula GIF (formula) · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.3 — s 8(3): **THE APPORTIONMENT — THE ANSWER, PART 2**

**This is the provision the register was missing.** Quoted in full:

> **8(3)** Where:
> **(a)** but for this subsection, the amount of levy payable by a person upon the taxable income of the person but for this section and section 9 would be reduced by an amount (in this subsection referred to as the **reduction amount**) ascertained in accordance with subsection (2);
> **(b)** the person was a **married person** on the last day of the year of income; and
> **(c)** but for this section and section 9, **the spouse of the person would be liable to pay levy upon the taxable income of the spouse**;
> the reduction amount shall, subject to subsection (4), **be reduced by so much of the reduction amount as bears to the reduction amount the same proportion as the amount of the taxable income of the spouse bears to the family income in relation to the person.**

**Unpacking the last clause.** It removes from the reduction amount the fraction `TI(spouse) / FI`. So:

```
reduction_P = reduction_raw − reduction_raw × TI(S)/FI
            = reduction_raw × ( 1 − TI(S)/FI )
            = reduction_raw × TI(P)/FI            [since FI = TI(P) + TI(S)]
```

**Each spouse keeps exactly their own share of combined taxable income.** The two spouses' reductions sum to `reduction_raw` — the household gets the reduction once, split pro-rata by taxable income. That is the answer to the brief's central question.

- **The s 8(3)(c) switch is load-bearing.** s 8(3) applies **only if** the spouse "would be liable to pay levy upon the taxable income of the spouse" **but for s 8 and s 9**. s 7 is *not* excluded from that hypothetical. So a spouse whose **own** taxable income is at or below the s 7 **threshold amount** (the single low-income threshold — $28,011, or $44,268 on the seniors thresholds) is **not liable but for ss 8 and 9**, s 8(3) does **not** apply, and the relevant person keeps the **entire, unapportioned** `reduction_raw`. See §3.2 and U1.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural — no numeric parameter
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8 · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.4 — s 8(4): the excess spills over to the spouse

> **8(4)** Where:
> **(a)** subsection (3) applies for the purposes of ascertaining the levy payable by a person upon the taxable income of the person but for section 9; and
> **(b)** the amount of the reduction of that levy ascertained in accordance with subsections (2) and (3) **exceeds** the amount of the levy payable by the person upon the taxable income of the person but for this section and section 9;
> the amount of levy payable by **the spouse** of the person upon the taxable income of the spouse but for this subsection and section 9 **shall be reduced by the amount of the excess**.

- This is a genuine cross-spouse dependency in the statute. **But see §4: it is arithmetically unreachable for a two-spouse couple under the current parameters.** Implement it as an assertion, not as a branch.
- **Confidence:** primary-verified (text); the unreachability is a derivation — see §4 and U3

### Finding 2.5 — s 8(5): the two defined terms

> **8(5)** In this section:
> **family income**, in relation to a person, means: **(a)** if the person was a married person on the last day of the year of income — **the sum of the taxable income of the person and the taxable income of the spouse of the person**; and **(b)** in any other case — the taxable income of the person.
>
> **family income threshold**, in relation to a person (the **relevant person**), means **$47,238 increased by $4,338 for each person covered by paragraph 961-5(1)(c) of the *Income Tax Assessment Act 1997*** in respect of whom: **(a)** in a case to which paragraph (b) does not apply — the relevant person; or **(b)** if the relevant person was a married person on the last day of the year of income — **the relevant person *or the spouse of the relevant person***; is entitled to a notional tax offset under Subdivision 961-A of the *Income Tax Assessment Act 1997* for the year of income.

- **Income base confirmed: taxable income, both spouses, summed.** Not rebate income, not adjusted taxable income. Register §2.7's "Income base" row is correct.
- **The threshold is the same number for both spouses.** Para (b) makes the child count draw on either spouse, so `FIT` is symmetric across the couple. Combined with the symmetric `FI`, **`reduction_raw` is a single household-level number**, computed once.
- **$47,238 and $4,338 are the operative statutory figures on this compilation** — the ATO page's own history note records them as substituted by **Act No. 58 of 2026, s 3 and Sch 5 items 6 and 7** (replacing $45,907 and $4,216), *"effective 1 July 2026 and applicable in relation to assessments for the **2025-26** year of income and later years of income"*. This **independently confirms register §2.7's prior-year-fallback finding**: the figures now in the Act are stamped 2025-26, and no FY2026-27 figures exist.
- **Financial year:** 2025-26 (prior-year fallback for FY2026-27)
- **Config or constant:** `familyLower = $47,238` **config**; `familyLowerPerDependentChild = $4,338` **config** — both indexed by amending Act each year, retrospectively
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8 · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.6 — s 8(6): the single-parent restriction (irrelevant to a couple)

> **8(6)** In the application of the definition of **family income threshold** in subsection (5) … in relation to a person … **being a person who was not a married person on the last day of the year of income**, the amount of $47,238 … **shall not be increased on account of another person unless family tax benefit** under the *A New Tax System (Family Assistance) (Administration) Act 1999* **was payable** to the first-mentioned person in respect of that other person …

- Restricts the per-child uplift for **unmarried** persons only. **Does not touch a married couple.** For a childless retiree couple it is doubly irrelevant.
- **Confidence:** primary-verified

### Finding 2.7 — s 8(7): the seniors substitution — **it does exactly one thing**

> **8(7)** Subsections (5) and (6) apply in relation to a person who is entitled for the year of income to a rebate under **section 160AAAA** of the Assessment Act **as if each reference to $47,238 were a reference to $61,623**.

- **This is the complete extent of the seniors interaction.** s 8(7) substitutes the base figure in the `family income threshold` definition and nothing else. It does **not** touch s 8(2)'s 2% or 0.08, does **not** touch s 8(3)'s apportionment, and does **not** touch the $4,338 per-child uplift — that figure is untouched by s 8(7), so **a seniors family threshold with children is $61,623 + $4,338 × children**.
- **Answer to brief question 3: the seniors family thresholds interact with s 8 in exactly one way — a larger `FIT` fed into the identical machinery.** There is no separate seniors formula, no separate seniors apportionment, no separate seniors taper.
- **The trigger is s 160AAAA entitlement**, i.e. SAPTO — consistent with register T8. Note the trigger is per-person ("a person who is entitled"), so in principle one spouse could take $61,623 and the other $47,238, producing **asymmetric `FIT` across the couple**. See U2 — this breaks the "single household-level `reduction_raw`" simplification in that edge case.
- **Financial year:** 2025-26 (prior-year fallback) · **Config:** `seniorsFamilyLower = $61,623`
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8 · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.8 — s 7 applies to married people too, and runs **before** s 8

This is not part of the brief's question, but it is unavoidable in getting s 8 right, because s 8(2) reduces *"the amount of the levy payable by the relevant person upon the taxable income of the relevant person **but for this section and section 9**"* — i.e. the amount surviving ss 6 and **7**.

> **7(1)** Where the **taxable income of a person** does not exceed the **threshold amount**, no levy is payable by the person upon that taxable income.
> **7(2)** Where the taxable income of a person exceeds the threshold amount but does not exceed the **phase-in limit**, the amount of levy payable by the person upon that taxable income **but for sections 8 and 9** shall not exceed **10%** of the amount of the excess.

- **s 7 contains no married-person carve-out.** It speaks of "a person". And s 7(2) is expressly framed as a ceiling on the levy computed *before* ss 8 and 9. So the correct order of operations is **s 6 → s 7 → s 8 → s 9**, and a married person whose *own* taxable income sits in the single shade-in range gets the s 7(2) cap **whatever their family income is**.
- **s 6(1):** *"The rate of levy payable by a person upon a taxable income is **2%**."* (No. 43 of 2013 substituted 2% for 1.5%, from 2014-15.)
- **s 9** reduces the levy pro-rata by days as a **prescribed person** — out of scope for this project's residents.
- **Source URLs:** https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F6 · `…%2F7` · `…%2F9` (all HTTP 200) · **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

### Finding 2.9 — s 3(1): the single thresholds, verbatim (confirms register §2.7's four single rows)

> **phase-in limit** means: **(a)** for a person who is entitled to a rebate under **section 160AAAA** of the Assessment Act — **$55,335**; or **(b)** *(Repealed by No 159 of 2011)*; **(c)** in any other case — **$35,013**.
>
> **threshold amount** means: **(a)** for a person who is entitled to a rebate under **section 160AAAA** of the Assessment Act — **$44,268**; or **(b)** *(Repealed by No 159 of 2011)*; **(c)** in any other case — **$28,011**.

- All four figures substituted by **Act No. 58 of 2026, s 3 and Sch 5 items 4 and 5**, on the same "effective 1 July 2026, applicable to the **2025-26** year of income and later" footing as the family figures.
- **Register §2.7's four single rows are confirmed against the statute itself**, and their `?LocID=` source URL should be replaced with `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F3`.
- **Financial year:** 2025-26 (prior-year fallback) · **Config:** all four · **Confidence:** primary-verified

---

## 3. The mechanism, derived

### 3.1 Order of operations

```
1. s 6(1)   gross levy        = 2% × TI(P)
2. s 7(1)   if TI(P) ≤ threshold_amount(P)                     → levy 0, STOP
   s 7(2)   if TI(P) ≤ phase_in_limit(P)  base = min(2%×TI(P), 10%×(TI(P) − threshold_amount(P)))
            else                          base = 2% × TI(P)
3. s 8(1)   if married/dependants and FI ≤ FIT                 → levy 0, STOP
   s 8(2)   raw = max(0, 0.02×FIT − 0.08×(FI − FIT))
   s 8(3)   if married AND spouse is liable under step 2 (i.e. TI(S) > threshold_amount(S)):
                 reduction = raw × TI(P) / FI
            else reduction = raw
   s 8(4)   levy = base − reduction; if negative, the excess reduces the SPOUSE's levy
4. s 9      pro-rata by prescribed-person days (not modelled)
```

### 3.2 Why the s 8(3)(c) switch changes the answer, and when it fires

s 8(3) only apportions if *"but for this section and section 9, the spouse of the person **would be liable to pay levy** upon the taxable income of the spouse"*. **s 7 is not in the excluded list.** So a spouse whose own taxable income is at or below their own `threshold amount` is *not* liable, s 8(3) is not engaged, and the relevant person keeps the **whole** `raw`.

**For a seniors couple this is not an edge case — it is the normal case, and apportionment never happens.**

Take the seniors figures: `threshold_amount = $44,268`, `FIT = $61,623`, band top `= $77,028`. For both spouses to be liable, both need `TI > $44,268`, so `FI > $88,536` — which is **above** the top of the seniors family shade-in band. Therefore:

> **In the seniors family shade-in band ($61,623 – $77,028), at most one spouse can be liable to levy at all. That spouse's s 8(3) is never engaged, and they receive the entire, unapportioned `raw` reduction. The other spouse pays nil under s 7(1).**

**Apportionment is therefore dead in exactly the band the brief identified as live for a retiree couple.** The answer to "how is it split between two spouses" for a seniors couple is: **it is not split — one spouse takes all of it, and the other pays nothing.**

For an **ordinary (non-seniors)** couple the apportionment *is* reachable, but only in a narrow window: both liable requires `TI > $28,011` each, so `FI > $56,022`, against a band top of `$59,047.50`. So s 8(3) apportionment operates only for `FI ∈ ($56,022, $59,047.50]` with both spouses above $28,011 — and in that whole window each spouse's own income is necessarily below the $35,013 phase-in limit, so **s 7(2) is capping both of them simultaneously**.

- **Confidence:** primary-verified as to the statutory text; the reachability arithmetic is a derivation from primary figures

### 3.3 The 10% effective rate, derived rather than reconciled

Let `x = FI − FIT ≥ 0`. Then `raw = 0.02·FIT − 0.08x`, so `d(raw)/dx = −0.08`.

Where **s 8(3) does not apply** (the seniors case, §3.2), the liable spouse's levy is `base − raw`, so `d(levy)/d(FI) = +0.08` — **8%**, not 10%, when family income rises through the band with the liable spouse's own income held constant.

The **10%** figure arises when the *liable spouse's own income* is what is rising, because then `FI` and `TI(P)` rise together and `base` moves too:
- if that spouse is above their own phase-in limit: `d(levy)/dTI = 0.02 + 0.08 = 0.10` → **10%**
- if that spouse is inside their own s 7(2) shade-in: `d(levy)/dTI = 0.10 + 0.08 = 0.18` → **18%** (both shade-ins stacking)

**So register §2.7's "10% effective, via the s 8(2) reduction formula" is right only for the specific case of one earner above their own phase-in limit.** It is not a property of the family formula on its own. The family formula's own coefficient is **0.08**, and 0.08 + the 0.02 statutory rate = 0.10 is where the "10%" comes from. See §7 D2.

### 3.4 Why the "upper threshold" exists and why it is 1.25×

`raw = 0` when `0.02·FIT = 0.08·(FI − FIT)` ⟺ `FI − FIT = FIT/4` ⟺ **`FI = 1.25 × FIT`**.

- $47,238 × 1.25 = **$59,047.50** → ATO publishes **$59,047**
- $61,623 × 1.25 = **$77,028.75** → ATO publishes **$77,028**
- $4,338 × 1.25 = **$5,422.50** → ATO publishes **$5,423**

**The upper thresholds are not in the Act.** They are the ATO's arithmetic on the enacted lower thresholds, and — as register §2.7 already flags — the ATO does not round them consistently (three truncations, one round-half-up). **Register §2.7's instruction to store the published uppers and not derive them is correct and is now explained**: nothing is being derived from a statutory upper, because there is no statutory upper. The Act's own operative test is `raw > 0`, which is *exact* and needs no upper threshold at all.

**Modelling recommendation:** do not test `FI ≤ familyUpper` as the band test. Compute `raw` and test `raw > 0`. That is what the statute says, it is exact in integer cents, and it sidesteps the inconsistent rounding of the published uppers entirely. Keep the published uppers only for display and for reconciliation against ATO tables.

- **Confidence:** primary-verified derivation from the read formula

### 3.5 Independent primary confirmation from the Federal Register of Legislation

The brief asked for the FRL to be tried. It works, and it **independently confirms the formula as text**.

**What worked:** the FRL OData API. Title lookup:

```
https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'Medicare Levy Act')&$top=10
  → C2004A03351  Medicare Levy Act 1986  InForce
```

Compilation retrieval (note: **no `/content` suffix** — adding it returns HTTP 404):

```
https://api.prod.legislation.gov.au/v1/documents/find(titleid='C2004A03351',asat=2026-09-01,
  type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0)
  → HTTP 200, 180,530 bytes, .docx   — Compilation No. 53, compilation date 1 July 2026
```
```
  …,format='Pdf',…  → HTTP 200, 407,070 bytes
  …,format='Docx',… → HTTP 404      (only 'Word' and 'Pdf' are valid)
  volumeNumber=1 or 2 → HTTP 404    (this Act is a single volume)
```

- **The Word (.docx) compilation reproduces every word of ss 8(1)–(7) identically to the ATO Legal Database version** — verified line by line. But its `word/document.xml` renders the s 8(2) formula as an **empty paragraph**: the formula is an embedded object, so the Word route confirms the *provisions* but not the *formula*.
- **The PDF compilation's text layer *does* carry the formula as extractable text.** Decompressing the PDF content streams and reconstructing the text yields, immediately after "…calculated in accordance with the formula:", the formula laid out as a three-cell table:

  > `2% of the` / `family income` / `threshold` / `in relation` / `to the` / `relevant person` — `0.08` — `The family income in relation to the relevant person` — `The family income threshold in relation to the relevant person`

  The operators (`−`, `×`, the brackets) are drawn from a symbol font and did not survive extraction, but **the three operands and the `0.08` coefficient are confirmed as text in the Federal Register compilation itself**, matching the ATO GIF exactly.

**So the formula now has three independent primary confirmations:** the ATO Legal Database GIF (read directly), the FRL PDF text layer, and the ATO's own plain-text history notes recording the identically-structured predecessor formulae.

- **Source URLs:** https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'Medicare%20Levy%20Act') · https://api.prod.legislation.gov.au/v1/documents/find(titleid='C2004A03351',asat=2026-09-01,type='Primary',format='Pdf',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0) · https://www.legislation.gov.au/C2004A03351/latest
- **Compilation identified:** No. 53, compilation date **1 July 2026** — the compilation in force for FY2026-27, carrying the 2025-26 figures inserted by Act No. 58 of 2026
- **Retrieval date:** 2026-09-04 · **Confidence:** primary-verified

**AustLII was not needed and was not fetched.** The brief's fallback ladder terminated at step one. (The franking chunk records AustLII as Cloudflare-blocked, HTTP 403.)

### 3.6 Numerical confirmation against the ATO's worked example — **exact to the cent**

This is a *confirmation*, not the basis of the finding. The finding is the statutory text; this shows the reading reproduces the ATO's own answer exactly.

**ATO example (QC27032, page last updated 30 June 2026), quoted:**

> *"Ashton is 68 years old and his taxable income is $49,700 in 2025–26. Ashton and his spouse live apart due to illness and have no dependent children. Ashton's spouse's taxable income was $21,700 in 2025–26. … The calculator confirms they are entitled to SAPTO. … Ashton and his spouse's family taxable income is $71,400 … he enters his and his spouse's details and finds out his **Medicare levy will be reduced to $92.90**."*

Applying §3.1 exactly:

| Step | Provision | Computation | Result |
|---|---|---|---|
| Own gross levy | s 6(1) | 2% × 49,700 | 994.00 |
| s 7(2) cap (seniors `threshold amount` = 44,268; `phase-in limit` = 55,335; 49,700 is inside) | s 7(2) | 10% × (49,700 − 44,268) | **base = 543.20** |
| Family income | s 8(5)(a) | 49,700 + 21,700 | FI = 71,400 |
| Family income threshold (seniors, no children) | s 8(7) | | FIT = 61,623 |
| Raw reduction | s 8(2) | 0.02 × 61,623 − 0.08 × (71,400 − 61,623) = 1,232.46 − 782.16 | **raw = 450.30** |
| Apportionment? | s 8(3)(c) | spouse TI 21,700 ≤ 44,268 → **spouse not liable** → s 8(3) **not engaged** | reduction = **450.30** (whole) |
| Levy | s 8(2) | 543.20 − 450.30 | **$92.90** ✓ |

**This single example discriminates between every competing reading:**

| Competing reading | Result | Verdict |
|---|---|---|
| **The reading in this report** | **$92.90** | ✅ matches |
| Apportion unconditionally: `450.30 × 49,700/71,400 = 313.4441…` | $229.76 | ❌ |
| Ignore s 7(2), base = 2% × 49,700 = 994.00 | $543.70 | ❌ |
| Levy family income at 2%, reduce, then split by income share: `(0.02×71,400 − 450.30) × 49,700/71,400` | $680.56 | ❌ |
| Test each spouse against the family threshold individually (49,700 ≤ 61,623 → nil) | $0.00 | ❌ |
| Taper 0.085 (the pre-2014 value) instead of 0.08 | $141.79 | ❌ |
| Taper 0.10 instead of 0.08 | $288.44 | ❌ |

The example also **confirms the 0.08 coefficient to the cent**, independently of the GIF.

The single-taxpayer example on the companion page reconciles s 7(2) the same way: *"Angie's taxable income is $29,000 … her Medicare levy will be reduced to $98.90"* — `10% × (29,000 − 28,011) = 98.90` ✓.

- **Source URLs:** https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income (QC27032) · https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners (QC27031)
- **Retrieval date:** 2026-09-04 · **Confidence:** the *statutory reading* is primary-verified; this reconciliation is **confirmatory ATO guidance**, and is labelled as such

---

## 4. When s 8(4) can actually bite

s 8(4) requires s 8(3) to have applied, i.e. **both spouses liable**, i.e. both `TI > threshold_amount`.

**Where neither spouse is s 7(2)-capped, s 8(4) is provably unreachable.** With `base_P = 0.02 × TI(P)`:

```
raw = 0.02·FIT − 0.08(FI − FIT) < 0.02·FIT < 0.02·FI          (for FI > FIT)
⟹ reduction_P = raw × TI(P)/FI < 0.02 × TI(P) = base_P
```

So the reduction can never exceed the levy, and there is no excess to spill.

**But s 7(2) breaks that inequality, and in the only window where s 8(3) applies at all, s 7(2) is *always* capping both spouses:**

- **Seniors couple:** both liable needs `TI > 44,268` each, so `FI > 88,536` — **above** the seniors band top of `$77,028`. **s 8(3) and s 8(4) are both dead for a seniors couple in the seniors family shade-in band.**
- **Ordinary couple:** both liable needs `TI > 28,011` each, so `FI > 56,022`, against a band top of `$59,047.50`. So s 8(3) applies only for `FI ∈ ($56,022, $59,047.50]`. In that whole window each spouse's own income is at most `59,047.50 − 28,011 = $31,036.50 < $35,013`, so **both are inside their own s 7(2) shade-in and both bases are capped at `10% × (TI − 28,011)`** — which near the bottom of the window is a few dollars, far below the reduction. **s 8(4) then bites, and the outcome is nil levy for both spouses.**

  Worked instance: `TI(P) = TI(S) = 28,050`, `FI = 56,100`. `base = 10% × 39 = $3.90` each. `raw = 0.02×47,238 − 0.08×8,862 = 944.76 − 708.96 = $235.80`. `reduction = 235.80 × 0.5 = $117.90` each. Each reduction exceeds each base by $114.00, and s 8(4) spills each excess onto the other spouse. **Both levies are nil.**

- **s 8(4) is mutual and potentially circular** when both spouses generate an excess simultaneously. The statute does not resolve the circularity because in every case where it arises both levies are already exhausted. Implement it non-recursively (§5) and assert that the result is nil for both. See **U4**.

- **Confidence:** primary-verified derivation from primary figures and primary text

---

## 5. Model-facing summary

### 5.1 Constants and config

| Config key | Value | FY | Kind | Statutory source | Indexation |
|---|---|---|---|---|---|
| `tax.medicareLevy.rate` | `0.02` | current | **constant** | s 6(1) | none — amended by Act (1.5% → 2% by No. 43 of 2013) |
| `shadeInRateSingles` | `0.10` | current | **constant** | s 7(2) | none — amended by Act (20% → 10% by No. 55 of 2006) |
| `familyShadeInTaper` **(NEW)** | `0.08` | current | **constant** | s 8(2) formula | none — amended by Act (0.185 → 0.085 → 0.08) |
| `familyShadeInBaseRate` **(NEW)** | `0.02` | current | **constant** | s 8(2) formula ("2% of the FIT") | **tracks the levy rate but is a separate literal** — see note below |
| `singleLower` (`threshold amount` (c)) | `$28,011` | 2025-26 fallback | config | s 3(1) | annual amending Act, retrospective |
| `singleUpper` (`phase-in limit` (c)) | `$35,013` | 2025-26 fallback | config | s 3(1) | as above |
| `seniorsSingleLower` (`threshold amount` (a)) | `$44,268` | 2025-26 fallback | config | s 3(1) | as above |
| `seniorsSingleUpper` (`phase-in limit` (a)) | `$55,335` | 2025-26 fallback | config | s 3(1) | as above |
| `familyLower` (`family income threshold`) | `$47,238` | 2025-26 fallback | config | s 8(5) | as above |
| `seniorsFamilyLower` | `$61,623` | 2025-26 fallback | config | s 8(7) | as above |
| `familyLowerPerDependentChild` | `$4,338` | 2025-26 fallback | config | s 8(5) | as above |
| `familyUpper` | `$59,047` | 2025-26 fallback | **display only** | **not statutory** — ATO arithmetic (`1.25 × lower`, truncated) | — |
| `seniorsFamilyUpper` | `$77,028` | 2025-26 fallback | **display only** | not statutory (truncated) | — |
| `familyUpperPerDependentChild` | `$5,423` | 2025-26 fallback | **display only** | not statutory (`1.25 × 4,338 = 5,422.50`, **rounded up**) | — |

**Note on `familyShadeInBaseRate`.** It is tempting to write `MEDICARE.rate` into the s 8(2) formula. **Don't.** They have moved together historically (1.5%/2%) but they are separate literals in separate provisions, and the taper (0.085 → 0.08) did *not* move proportionally with the rate (1.5% → 2%): `0.02/0.08 = 0.25` where `0.015/0.085 ≈ 0.176`. Encoding the formula's "2%" as `MEDICARE.rate` would silently rewrite the shade-in band's width if either ever moves alone. Keep three independent constants and let a test assert `familyShadeInBaseRate === rate` as a *tripwire*, not as a definition.

### 5.2 Integer-cent implementation

All amounts in **integer cents**. Write `TA(P)` for `threshold_amount` and `PL(P)` for `phase-in limit` (the seniors variant iff that Person's SAPTO received > 0 — register T8).

```
FIT(P) = (saptoReceived(P) > 0 ? 6_162_300 : 4_723_800)          # s 8(5)/(7), cents
       + 433_800 * dependentChildren                              # s 8(5)
                                                                  # NB: no seniors variant
                                                                  #     of the per-child uplift

# ---- step 1: each Person's own levy, before s 8 (ss 6, 7) ------------------
baseLevy(P):
    if TI(P) <= TA(P): return 0                                   # s 7(1)
    gross = TI(P) * 2 / 100                                       # s 6(1)
    if TI(P) <= PL(P):                                            # s 7(2)
        return min(gross, (TI(P) - TA(P)) * 10 / 100)
    return gross

liable(P) = TI(P) > TA(P)          # "would be liable but for s 8 and s 9" — s 8(3)(c)

# ---- step 2: the family reduction (s 8) ------------------------------------
FI = TI(P) + TI(S)                                                # s 8(5)(a)

if FI <= FIT(P): levy(P) = 0                                      # s 8(1)  -- STOP
else:
    raw = FIT(P) * 2 / 100  -  (FI - FIT(P)) * 8 / 100            # s 8(2)
    raw = max(raw, 0)                                             # "the amount (if any)"
                                                                  # equivalently: FI > 1.25*FIT
    if isMarried(P) and liable(S):                                # s 8(3)(a)(b)(c)
        # statutory order: compute the SUBTRACTED share, then subtract
        share      = round( raw * TI(S) / FI )                     # <-- ONLY rounding point
        reduction  = raw - share                                   # == raw * TI(P)/FI
    else:
        reduction  = raw                                           # s 8(3) not engaged

    levy(P)  = baseLevy(P) - reduction
    excess(P)= max(0, -levy(P))                                    # s 8(4)(b)
    levy(P)  = max(0, levy(P))

# ---- step 3: s 8(4) spillover, applied symmetrically -----------------------
# only where s 8(3) applied for that Person
final(P) = max(0, levy(P) - excess(S))
final(S) = max(0, levy(S) - excess(P))
```

**Where rounding occurs — and where it does not.**

- **If both taxable incomes are whole dollars, the whole calculation is exact in integer cents and there is no rounding anywhere.** Every product is an integer number of cents: `TI × 2/100` = `2 × dollars` cents; `(TI − TA) × 10/100` = `10 × dollars` cents; `FIT × 2/100` = `2 × dollars` cents; `(FI − FIT) × 8/100` = `8 × dollars` cents. This is why the ATO's examples land on clean two-decimal figures ($92.90, $98.90) — they are exact, not rounded.
- **The single rounding point is the s 8(3) apportionment**, `raw × TI(S) / FI`, which is a genuine ratio. **The Act prescribes no rounding rule for it.** Round half-up to the cent, matching the project's existing `mulCents`/`roundCents` (`Math.round` on the absolute value). Follow the **statutory order** — compute the *subtracted* share and subtract it — rather than computing `raw × TI(P)/FI` directly: the two differ by at most one cent, and the statutory order is the defensible one. See **U5**.
- **This rounding point is unreachable for a seniors couple** (§3.2/§4), and in the narrow ordinary-couple window where it is reachable the levy is either nil or the reduction is a few dollars.

### 5.3 What to do with `FamilyShadeInUnsourcedError`

**It can now be deleted.** The refusal was correct while the mechanism was unsourced; the mechanism is now sourced from three independent primary retrievals plus an exact ATO reconciliation. Replacing it requires more than filling in the band, though — see §7 D4 and D5, which are pre-existing defects in the surrounding code that the refusal was masking.

**Do not** implement `medicareLevy` as a per-Person function any more. s 8(3) and s 8(4) are **irreducibly two-Person**: one spouse's levy depends on the other's taxable income, on whether the other is liable, and (via s 8(4)) on the other's *excess reduction*. The interface must take the couple, or take the spouse's taxable income **and** the spouse's `saptoReceived` (needed to know the spouse's `threshold amount`, which decides the s 8(3)(c) gate).

---

## 6. Answering the brief's four questions directly

**Q1 — the operative text of s 8, especially s 8(2) and any family/spouse subsection.** Retrieved in full. The act code `PAC%2F19860110%2F<section>` **works** (HTTP 200) — see §1.1. Text at §2.1–2.7. The provision the register was missing is **s 8(3)**, with **s 8(4)** behind it.

**Q2 — precisely how the reduction is split between two spouses.**

> The reduction is computed **once for the household** from combined taxable income (`raw = 0.02×FIT − 0.08×(FI − FIT)`, floored at nil). It is **not** a levy on family income. Each spouse's **own** levy — 2% of their **own** taxable income, capped by s 7(2) — is then reduced by their **share of that one reduction, pro-rata by taxable income**: `reduction_P = raw × TI(P)/FI`.
>
> **But that apportionment only happens if the other spouse is themselves liable to levy** (s 8(3)(c)). If the other spouse's own taxable income is at or below their own `threshold amount`, s 8(3) is not engaged and the liable spouse takes the **entire** reduction, unapportioned. **For a seniors couple in the seniors family shade-in band this is always the case** (§3.2), so **for this project's target case the reduction is not split at all: one spouse takes all of it and the other pays nothing.**
>
> **Yes, one spouse's levy depends on the other's income — in three distinct ways:** (i) `FI` is the sum of both taxable incomes; (ii) the apportionment ratio is the spouse's share; (iii) s 8(3) fires or does not fire depending on whether the spouse crosses their own `threshold amount` — and s 8(4) can push one spouse's unused reduction onto the other outright.

Formula and rounding: §5.2.

**Q3 — do the seniors and pensioners family thresholds interact with s 8 differently?** **No.** s 8(7) substitutes `$61,623` for `$47,238` in ss 8(5) and 8(6), and does nothing else. Same formula, same coefficients, same apportionment rule. The *practical* difference is entirely a consequence of the larger numbers: because `2 × $44,268 > $77,028`, apportionment can never occur in the seniors band (§3.2). Note also that s 8(7) does **not** substitute anything for the `$4,338` per-child uplift, so a seniors family threshold with children is `$61,623 + $4,338 × N`.

**Q4 — how the number of dependent children shifts the thresholds.** `FIT = base + $4,338 × N`, where `N` is the number of persons covered by ITAA 1997 **para 961-5(1)(c)** in respect of whom **either spouse** (s 8(5)(b)) is entitled to a **notional tax offset under Subdivision 961-A**. The ATO's published per-child uplift for the *upper* threshold, `$5,423`, is **not statutory** — it is `1.25 × $4,338 = $5,422.50` rounded up.

> **For a couple with no dependent children — this project's case — the child count is zero and the term vanishes entirely.** `FIT` is the bare `$47,238` / `$61,623`. The `dependentChildren` field is inert for the modelled household, and the `familyLowerPerDependentChild` / `familyUpperPerDependentChild` config rows are never consumed.

**s 8(6)** further restricts the uplift to **unmarried** persons who received Family Tax Benefit — doubly irrelevant to a married couple with no children.

---

## 7. DISCREPANCIES

**D1 — Register §2.7's confidence label on the family shade-in row is now wrong, in the taxpayer's favour.**
It reads *"primary-verified **by reconciliation only** — the formula is a GIF in the ATO Legal Database and was not read"*. **The GIF has now been read**, and the formula independently confirmed from the FRL PDF text layer and from the ATO's own plain-text history notes. The row should become **primary-verified**, cited to the s 8(2) formula, with the caveat removed.

**D2 — Register §2.7's "10% effective" is right by accident and wrong as a description.**
The family formula's own coefficient is **0.08**, not 0.10. The 10% appears only when the *liable spouse's own taxable income* is the thing changing **and** that spouse is above their own phase-in limit, in which case the 2% statutory rate plus the 0.08 taper make 10%. Where the *spouse's* income rises instead, the effective rate is **8%**. Where the liable spouse is inside their own s 7(2) shade-in, the two shade-ins stack and the effective rate is **18%**. The register row should record **0.08**, described as the s 8(2) taper on family income, not "10% effective".

**D3 — The `familyUpper`, `seniorsFamilyUpper` and `familyUpperPerDependentChild` rows are not primary-verified against the Act, because they are not in the Act.**
Register §2.7 sources `familyUpper` and `familyUpperPerDependentChild` to ATO QC27032 and `seniorsFamilyUpper` to "Medicare Levy Act s 8(7)". **s 8(7) contains no upper threshold.** No upper family threshold exists anywhere in the Act. They are the ATO's `1.25 ×` arithmetic, inconsistently rounded. Their confidence should be **secondary (ATO-published)**, not primary-verified, and their `Source` should not cite s 8(7). §3.4 explains why the model should test `raw > 0` rather than `FI ≤ upper` anyway.

**D4 — `src/core/incomeTax.ts` omits s 7(2) on the family path.** *(Reported, not fixed — I did not modify `src/`.)*
In `medicareLevy`, once `familyIncome` is supplied, the "full levy" branch returns `full()` = `2% × income` unconditionally. But **s 7(2) has no married-person carve-out**: a Person whose own taxable income is between their `threshold amount` and their `phase-in limit` is capped at `10% × (TI − threshold amount)` **regardless of family income**. Example: `TI(P) = $30,000`, `TI(S) = $40,000`, `FI = $70,000` (above the ordinary family upper). Current code returns `$600.00`. s 7(2) caps it at `10% × (30,000 − 28,011) = ` **`$198.90`** — a **$401.10 overcharge** on a case that is *outside* the shade-in band entirely, so the `FamilyShadeInUnsourcedError` refusal never protected against it. **The ATO's own Ashton example is precisely this shape** (s 7(2) cap applied to a married Person) and confirms the point to the cent.

**D5 — The interface is per-Person and cannot express s 8(3)/(4).**
`MedicareLevyInput` takes `familyIncome` (a single summed number) and `saptoReceived` for one Person. That is not enough: s 8(3)(c) needs the **spouse's own taxable income** and the **spouse's own `threshold amount`** (hence the spouse's `saptoReceived`), and s 8(4) needs the spouse's full computation. Closing O7 requires widening the interface, not just filling the band. §5.3.

**D6 — The register's s 8 and s 3 source URLs use the title-only `?LocID=` form.** Switch to `?DocID=PAC%2F19860110%2F8` and `…%2F3`, both HTTP 200 with a browser User-Agent.

**D7 — ATO's own eligibility bullet contradicts its own worked example.**
QC27032 states eligibility requires *"Your individual taxable income was more than $35,013 ($55,335 for seniors …)"*. Ashton's is **$49,700** — below $55,335 — and he plainly receives the s 8 reduction (from $543.20 to $92.90). The statute has no such condition: s 8(2) applies whenever `FI > FIT`, whatever the individual's income. **Do not encode the ATO's bullet.** Encode s 8(2). Flagged so a future maintainer reconciling against QC27032 does not "correct" the model into agreement with a wrong sentence.

**D8 — The register's "Upper : lower ratio at a 2% levy = 1.25, constant (derived), source: s 7(2) reconciliation" is right for the wrong provision on the family side.**
For singles the 1.25 does come out of s 7(2) (`0.02x = 0.10(x − T)` ⟹ `x = 1.25T`). For families it comes out of **s 8(2)** (`0.02·FIT = 0.08·(FI − FIT)` ⟹ `FI = 1.25·FIT`). Two different provisions and two different coefficient pairs happen to give the same ratio. The row should say so, because if either pair is ever amended alone the two ratios diverge.

**D9 — a note, not a discrepancy: s 3(3)(a) vs the Ashton example.**
s 3(3)(a) deems a person **not** married "if they are living separately and apart", yet ATO's example applies family income to spouses who "live apart due to illness". Under a literal s 3(3)(a) reading Ashton's family income would be his own $49,700, below `$61,623`, and s 8(1) would give **nil** levy — not $92.90. The ATO evidently reads "living separately and apart" as marital separation, not illness separation. The arithmetic match at $92.90 confirms the ATO's reading, but the point is unresolved on the text. **Irrelevant unless the model gains an illness-separated couple state — but this project already has an `illnessSeparatedEach` SAPTO branch, so it is worth a note.** See **U6**.

---

## 8. UNVERIFIED LIST

| # | What is not closed | Impact | Exactly what would close it |
|---|---|---|---|
| **U1** | **"Would be liable to pay levy … but for this section and section 9" (s 8(3)(c)) is read as including s 7.** The text excludes only ss 8 and 9, so s 7 survives the hypothetical and a spouse below their `threshold amount` is not liable. That is the plain reading, and the Ashton example is consistent with it — **but Ashton's spouse is at $21,700, far below $44,268, so the example does not test the boundary.** An alternative reading ("liable" = liable under s 6 alone, i.e. any positive taxable income) would make s 8(3) apportion in Ashton's case and give $229.74, not $92.90 — **so the example does rule that alternative out.** What remains untested is whether liability is measured before or after s 7(2) merely *reduces* (not eliminates) the spouse's levy — but s 7(2) never reduces to nil, so this cannot change the gate. **Confidence in the reading is high; it is flagged only because no ATO example sits near the boundary.** | Low | An ATO worked example, private ruling, or the Medicare levy calculator output for a couple where one spouse's taxable income is just *above* their `threshold amount` and family income is in the band. The ATO **Medicare levy calculator** could produce this directly. |
| **U2** | **Asymmetric `FIT` where only one spouse is entitled to SAPTO.** s 8(7) is keyed to *"a person who is entitled … to a rebate under section 160AAAA"* — a **per-person** test. So one spouse could take `FIT = $61,623` while the other takes `$47,238`, on the **same** `FI`. Then `raw` is **not** a single household number, `raw_P ≠ raw_S`, and the s 8(3) apportionment is applied to two different raws. Nothing in s 8 forbids this and nothing resolves it. | **Medium — realistic for a couple where one partner is under Age Pension age**, which is common in this project's household model | An ATO worked example or ruling on a mixed SAPTO couple; or reading the Medicare levy calculator's behaviour. Note that this also interacts with register §2.7's SAPTO-crossover note. |
| **U3** | **No statutory rounding rule for the s 8(3) apportionment.** The Act gives no rounding direction, and no general rounding provision in the *Medicare Levy Act 1986* was found (I read the whole Act: ss 1–11 plus endnotes). Whether the ATO rounds the apportioned share half-up, truncates, or carries full precision to the final levy is not established. | **Very low** — at most 1 cent, and only in the narrow ordinary-couple window of §4, where the levy is usually nil anyway | An ATO calculator output, or the ITAA 1936 Part VIIB assessment machinery. Also unresolved: whether **taxable income is necessarily a whole-dollar amount** — if it always is, the rest of the calculation is exact and this is the only rounding in the whole of s 8. |
| **U4** | **s 8(4) is mutual and the statute does not resolve the circularity.** Where both spouses generate an excess, each subsection-(4) reduction feeds the other. §5.2 implements it as a single non-recursive pass (`excess` computed from the pre-spillover levies). Every instance found produces nil levy for both spouses either way, so the choice is unobservable — but it is a choice. | Very low | An ATO example, or the Medicare levy calculator, for `FI` just above `$56,022` with both spouses just above `$28,011`. |
| **U5** | **Direction of the s 8(3) subtraction under rounding.** The statute subtracts `raw × TI(S)/FI`; computing `raw × TI(P)/FI` directly is algebraically identical but can differ by a cent once rounded. §5.2 follows the statutory order. Not confirmed against any ATO output. | Very low (1 cent) | Same as U3. |
| **U6** | **s 3(3)(a) "living separately and apart" vs an illness-separated couple** (D9). Unresolved on the text; the ATO's practice is inferred from one worked example whose arithmetic happens to match. | Low for the levy; **relevant if the model computes an illness-separated household** | ATO guidance on "living separately and apart" for Medicare levy purposes, or ITAA 1936 s 251R. |
| **U7** | **FY2026-27 figures do not exist.** Confirmed independently, twice over: the Act's own history notes stamp the current `$47,238` / `$4,338` / `$61,623` / `$44,268` / `$28,011` / `$55,335` / `$35,013` as inserted by **Act No. 58 of 2026, effective 1 July 2026, applicable to the 2025-26 year of income and later**; and FRL **Compilation No. 53, compilation date 1 July 2026** — the compilation in force for FY2026-27 — carries exactly those figures. **This is a confirmation of register §2.7's prior-year-fallback finding, not a gap.** | n/a — behaves as designed | The 2027 Budget's amending Act. Not obtainable now. |
| **U8** | **The ATO Medicare levy calculator was not run.** It would settle U1, U2, U3, U4 and U5 at once. It is an interactive tool with no documented URL API, so it could not be driven by `curl`. | — | A browser session against https://www.ato.gov.au/calculators-and-tools/medicare-levy-calculator, entering the U1/U2 boundary cases. **This is the single highest-value next step**, and it would produce *ATO-tool* evidence (secondary), never primary. |

**Nothing in the deliverable itself is unverified.** The formula, the apportionment ratio, the s 8(3)(c) gate, the s 8(7) seniors substitution and the dependent-child term are all read directly from primary text and confirmed to the cent against the ATO's own worked example. The list above is edge cases around the answer, not the answer.

---

## 9. Source register

| # | URL | HTTP / size | What it yielded | Class |
|---|---|---|---|---|
| S1 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F8` | 200 · 161,774 B | **Full operative text of s 8(1)–(7)** + complete amendment history including the pre-2013 and pre-2006 formula forms in plain text. **The brief's act code works.** | primary |
| S2 | `https://www.ato.gov.au/law/view/sgif/cch-leg2/formula_s_8_2_534582216_20260709t135745-968.gif` | 200 · 15,071 B · GIF 380×118 | **The s 8(2) formula, read directly.** `2% of FIT − (0.08 × (FI − FIT))` | primary |
| S3 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F3` | 200 · 186,960 B | s 3(1) `threshold amount` and `phase-in limit` definitions, all four figures + Act No. 58 of 2026 history; also s 3(3)(a) "living separately and apart" | primary |
| S4 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F7` | 200 · 112,112 B | s 7(1)–(4) verbatim — the s 7(2) 10% cap "but for sections 8 and 9" | primary |
| S5 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F6` | 200 · 117,779 B | s 6(1) 2% rate | primary |
| S6 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860110%2F9` | 200 · 108,120 B | s 9 prescribed-person pro-rata (out of scope, confirmed) | primary |
| S7 | `https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'Medicare Levy Act')&$top=10` | 200 · JSON | Title id **`C2004A03351`**, status InForce | primary index |
| S8 | `https://api.prod.legislation.gov.au/v1/documents/find(titleid='C2004A03351',asat=2026-09-01,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0)` | 200 · 180,530 B · .docx | **Compilation No. 53, compilation date 1 July 2026** — whole Act. Confirms ss 3, 6, 7, 8(1)–(7) word for word against S1/S3/S4/S5. **Renders the s 8(2) formula as an empty paragraph.** | primary |
| S9 | same as S8 but `format='Pdf'` | 200 · 407,070 B | **PDF text layer carries the s 8(2) formula operands and the `0.08` coefficient as extractable text** — independent confirmation of S2 | primary |
| S10 | same as S8 but `format='Docx'`, or `volumeNumber=1`/`2`, or with a `/content` suffix | **404** | Nothing. Recorded so the working form is not lost: **`format='Word'`, `volumeNumber=0`, no `/content`.** | — |
| S11 | `https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income` (QC27032, last updated 30 June 2026) | 200 · 313,756 B | The **Ashton worked example → $92.90**, reproduced exactly (§3.6); all published thresholds; the SAPTO-crossover note; the dependent-child ATI table; **and the incorrect eligibility bullet at D7** | secondary (ATO guidance) |
| S12 | `https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners` (QC27031, last updated 30 June 2026) | 200 · 298,265 B | The **Angie worked example → $98.90**, confirming s 7(2); single thresholds; SAPTO singles cut-out $52,759 (2025-26) | secondary (ATO guidance) |
| — | AustLII | **not fetched** | The fallback ladder terminated at step one — S1 and S2 answered the question. (Recorded elsewhere in this repo as Cloudflare-blocked, HTTP 403.) | — |
| — | ATO Medicare levy calculator | **not run** | Interactive tool, no documented URL API. See U8. | — |

### Fetch guidance — corrections and additions for the next researcher

- ✅ **The brief's ATO act-code form `PAC%2F19860110%2F<section>` is correct** and returns full text with a browser User-Agent. Verified on ss 3, 6, 7, 8, 9.
- ✅ **The brief's warning about `?LocID=` is correct** — the register's existing §2.7 URLs use that form and are title-only shells.
- ⚠️ **The brief's claim that "legislation.gov.au … its OData host 404s" is not right.** `api.prod.legislation.gov.au/v1/` answers fine for both `titles` and `documents/find(...)`. What 404s is (a) appending `/content` to a `documents/find(...)` call, (b) `format='Docx'` (use `format='Word'`), and (c) any `volumeNumber` other than `0` on a single-volume Act. The franking chunk's working recipe generalises; only `volumeNumber` needs adjusting per Act.
- 🆕 **A formula served as a GIF in the ATO Legal Database is retrievable and readable.** Path pattern `/law/view/sgif/cch-leg2/formula_<section>_<id>_<timestamp>.gif`, with the provision named in the `title` attribute of the `<img>`. **"It is an image" is not a reason to fall back to secondary sources.**
- 🆕 **The FRL PDF's text layer is a second route to an embedded formula** even when the .docx drops it: decompress the Flate content streams and reconstruct the `Tj`/`TJ` literals. Operators drawn from symbol fonts may not survive, but operands and numeric coefficients do.
- 🆕 **ATO history notes are a plain-text source for a formula that is now an image.** Where an amending Act "substituted the formula", the note reproduces the *prior* formula with its variable definitions in text. Continuity of structure across versions is strong corroboration for the current image.

---

*Researched 2026-09-04 against ATO Legal Database and Federal Register of Legislation Compilation No. 53 (compilation date 1 July 2026) of the* Medicare Levy Act 1986 *(`C2004A03351`). No file under `src/`, `test/`, `TODO.md` or `docs/assumptions-register.md` was modified. Uncommitted by design.*
