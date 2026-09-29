# P1-11 chunk 2 — Franking credit refundability (individual vs superannuation fund)

- **Task**: P1-11, chunk 2 of 3. Feeds P6-8 ("salary sacrifice into super vs invest outside it").
- **Scope**: refundability of excess franking credits only. Gross-up rate, corporate rates and the base rate entity test are chunk 1. The 45-day holding rule / qualified person test is chunk 3 — noted here only where the statute cross-references it.
- **Retrieval date**: 2026-09-04. Forecast starts FY2026-27.
- **Source**: ATO Legal Database (`ato.gov.au/law/view/document?DocID=PAC%2F...`), consolidated principal legislation. Fetched with `curl` + browser User-Agent (WebFetch 403s).
- **Currency caveat**: the ATO Legal Database serves the current consolidation with amendment history notes. Each finding below records the latest amendment note visible in the section text. No amendment with an effective date after 2026-09-04 was observed in any section fetched.

---

## 1. The statutory chain, end to end

The whole question turns on five provisions read in this order:

| Step | Provision | Effect |
|---|---|---|
| 1 | ITAA 1997 s 207-20(1),(2) | Franking credit is included in assessable income (gross-up) **and** gives a tax offset equal to the credit |
| 2 | ITAA 1997 s 207-90 (Subdiv 207-D) | **Denies** gross-up and offset if the distribution is exempt income or NANE in the recipient's hands |
| 3 | ITAA 1997 s 207-110 (Subdiv 207-E) | **Disapplies s 207-90** for, among others, ECPI under ss 295-385 / 295-390 / 295-400 — this is the provision that saves retirement-phase super |
| 4 | ITAA 1997 s 67-25(1) | Division 207 offsets **are** subject to the refundable tax offset rules, subject to carve-outs in (1A)–(1E) |
| 5 | ITAA 1997 s 63-10(1) item 40 | For a refundable offset: "**You can get a refund of the remaining amount**" |

Subdivision 207-F (ss 207-145, 207-150) sits outside this chain and can deny the credit independently — see §6.

---

## 2. Refundability for an individual

**Finding 2.1 · Division 207 offsets are refundable · all years incl. FY2026-27 · confidence: primary-verified**

ITAA 1997 s 67-25(1):

> "Tax offsets available under Division 207 (which sets out the effects of receiving a franked distribution) or Subdivision 210-H ... are subject to the refundable tax offset rules, unless otherwise stated in this section."

An individual is not caught by any carve-out in s 67-25: (1A) covers non-complying superannuation funds / non-complying ADFs; (1B) covers trustees assessed under ITAA 1936 s 98 or 99A; (1C) and (1D) cover *corporate tax entities*; (1DA) covers foreign residents with an Australian permanent establishment; (1E) covers venture capital credits.

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F67-25
- Latest amendment note in section: s 67-25(1A) amended by No 9 of 2007, eff 15 March 2007; s 67-25(1)–(1E) substituted by No 66 of 2003.

**Finding 2.2 · Refundable means cash, not merely offset to nil · confidence: primary-verified**

ITAA 1997 s 63-10(1), order-of-applying-tax-offsets table, **item 40**:

> Tax offset | "*Tax offset that is subject to the refundable tax offset rules (see Division 67)"
> What happens to any excess | "**You can get a refund of the remaining amount**"

Contrast item 35 (R&D non-refundable) and item 30 (early stage investor) — "You may carry it forward"; and item 3 — "You cannot get a refund of it".

Corroborated by ITAA 1997 s 67-10 (guide): "If your total tax offsets exceed your basic income tax liability, and some of those offsets are subject to the refundable tax offset rules, **you may get a refund instead of paying income tax** (see section 63-10)."

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F63-10 ; https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F67-10
- Config: `franking.excess_refundable.individual = true`

**Finding 2.3 · Eligibility condition — Australian residence · confidence: primary-verified**

A non-resident individual gets **no** gross-up and **no** offset, so nothing to refund. Mechanism: the franked part of a dividend is exempt from dividend withholding tax under ITAA 1936 s 128B(3)(ga); ITAA 1936 s 128D then makes income that "would, but for paragraph 128B(3)(ga) ... be payable [withholding tax on]" **"not assessable income and not exempt income"** (i.e. NANE). ITAA 1997 s 207-90(1)(c) then denies gross-up and offset for a NANE distribution.

- Sources: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19360027%2F128B ; https://www.ato.gov.au/law/view/document?DocID=PAC%2F19360027%2F128D ; https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-90
- Config: `franking.requires_australian_residence = true`

**Finding 2.4 · No other individual-specific exclusion found · confidence: primary-verified (negative finding, scoped to s 67-25 and Subdiv 207-D/E/F)**

There is no income test, no age test, no minimum-holding-value test and no dollar cap on an individual's franking credit refund in Division 67, s 63-10 or Division 207. (The 2019 proposal to abolish individual refundability was never legislated; nothing in the current consolidation reflects it.)

---

## 3. Refundability for a complying superannuation fund

**Finding 3.1 · A complying superannuation fund is NOT a corporate tax entity · confidence: primary-verified**

ITAA 1997 s 960-115: an entity is a *corporate tax entity* only if it is (a) a company, (b) a corporate limited partnership, or (d) a public trading trust. (Para (c) repealed by No 53 of 2016.) A complying superannuation fund is none of these.

**Consequence**: the s 67-25(1C) and (1D) denials of refundability — which are the reason a company's excess franking credits convert to a tax loss rather than cash — **do not apply to a super fund**.

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-115

**Finding 3.2 · s 67-25(1B) does not apply either · confidence: primary-verified**

s 67-25(1B) denies refundability to a trustee liable to be assessed under ITAA 1936 s 98 or 99A. A superannuation provider is instead liable under ITAA 1997 s 295-5(2): "The superannuation provider in relation to an entity referred to in paragraph (1)(a) to (d) is liable to pay tax on the taxable income of the entity." Tax is computed by the s 295-10 method statement, not by ITAA 1936 s 98/99A.

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F295-5 ; .../295-10

**Finding 3.3 · The only super-related denial in s 67-25 is for NON-complying funds · confidence: primary-verified**

ITAA 1997 s 67-25(1A):

> "Where the trustee of a *non-complying superannuation fund or a *non-complying approved deposit fund is entitled to a *tax offset under Division 207 because a *franked distribution is made to, or *flows indirectly to, the trustee, the tax offset **is not** subject to the refundable tax offset rules."

Expressio unius: the deliberate limitation to *non-complying* funds confirms a **complying** fund falls under the general refundable rule in s 67-25(1).

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F67-25
- Config: `franking.excess_refundable.complying_super_fund = true`; `franking.excess_refundable.non_complying_super_fund = false`

---

## 4. The retirement-phase case (the critical one)

**Finding 4.1 · ECPI is exempt income · confidence: primary-verified**

ITAA 1997 s 295-385(1) (segregated method):

> "The *ordinary income and *statutory income of a *complying superannuation fund for an income year is **exempt from income tax** to the extent that: (a) it would otherwise be assessable income; and (b) it is from *segregated current pension assets."

ITAA 1997 s 295-390(1) (proportionate / unsegregated method): a proportion of income "that would otherwise be assessable income **is exempt from income tax** under this section", the proportion being average current pension liabilities ÷ average superannuation liabilities (s 295-390(3)).

Both are expressed as **exempt income**, and both exclude non-arm's length income and Subdivision 295-C amounts (ss 295-385(2), 295-390(2)).

- Sources: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F295-385 ; .../295-390

**Finding 4.2 · THE TRAP — s 207-90 would, on its own, destroy the credit · confidence: primary-verified**

ITAA 1997 s 207-90(1), in Subdivision 207-D ("No gross-up or tax offset where distribution would not be taxed"):

> "If: (a) a *franked distribution is made to an entity; and (b) the distribution does not *flow indirectly through the entity to another entity; and (c) **the distribution is *exempt income** or *non-assessable non-exempt income in the hands of the entity; then, for the purposes of this Act: (d) the amount of the *franking credit on the distribution **is not included in the assessable income** of the entity under section 207-20; and (e) **the entity is not entitled to a *tax offset** under this Division because of the distribution."

s 207-90 has only subsections (1) and (2) (the latter apportioning where only part of a distribution is exempt). It contains **no** internal exception for superannuation. Read alone, a retirement-phase fund would get no franking credit at all — not merely a wasted one, but no entitlement.

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-90

**Finding 4.3 · THE ANSWER — s 207-110 expressly overrides it for ECPI · confidence: primary-verified**

ITAA 1997 Subdivision 207-E is headed "**Exceptions to the rules in Subdivision 207-D**". Section 207-110 ("Effect of non-assessable income on gross up and tax offset"):

> **207-110(1)** "This section applies to an entity to whom a *franked distribution is made, or *flows indirectly, in any of the following circumstances:
> (a) the entity is an *exempt institution that is eligible for a refund ...;
> (b) the distribution is, or the entity's *share of the distribution would have been, this kind of income in its hands:
>  (i) *exempt income under **section 295-385** (about income from assets set aside to meet current pension liabilities), **section 295-390** (about income from other assets used to meet current pension liabilities) or **section 295-400** (about income of a PST attributable to current pension liabilities); or
>  (ii) *non-assessable non-exempt income under paragraph 320-37(1)(a) ... or 320-37(1)(d) ..."

> **207-110(2)** "The following have effect in relation to the entity:
> (a) **section 207-90 or 207-95 (as appropriate) does not apply to the entity**;
> (b) if the entity would, apart from section 207-90 or 207-95, be entitled to a *tax offset under section 207-20 or 207-45 in relation to the distribution — **the entity is entitled to that tax offset**;
> (c) if the entity would not be entitled to such a tax offset, the entity is entitled to a tax offset under this section that is equal to ... the *franking credit on the distribution ..."

> **Note to (2)**: "Paragraph (2)(c) only applies to an exempt institution that is eligible for a refund and that is not entitled to a tax offset under section 207-20 or 207-45. **An entity covered by paragraph (1)(b) will, in all cases, be entitled to a tax offset under section 207-20 or 207-45.**"

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-110
- Amendment note in section: s 207-110(1)(b)(i) substituted by No 15 of 2007, applicable 2007-08 and later (previously referred to ITAA 1936 ss 282B, 283, 297B).

**Finding 4.4 · Retirement-phase franking credits are refunded in cash, not wasted · confidence: primary-verified**

Chain: s 207-110(2)(b) preserves the s 207-20(2) offset → s 67-25(1) makes it refundable (fund is complying, not a corporate tax entity) → s 63-10(1) item 40, "You can get a refund of the remaining amount". Basic income tax liability on ECPI is nil, so the **entire** franking credit is refunded in cash.

- Rule: *ECPI does not extinguish the franking credit. The credit is entitled under s 207-20(2) despite the income being exempt, and is refundable in full.*
- Config: `super.pension_phase.franking_credit_refund_rate = 1.0` (100% of the credit received as cash)
- Effective tax rate on a fully franked dividend held in retirement phase: **negative** — the fund recovers company tax paid at the franking rate (chunk 1) with no offsetting liability.

**Finding 4.5 · Applies to BOTH the segregated and proportionate methods · confidence: primary-verified**

s 207-110(1)(b)(i) names s 295-385 (segregated) **and** s 295-390 (proportionate). Under the proportionate method the fund's income is only partly exempt; s 207-110 disapplies s 207-90 in respect of the exempt share, and the assessable share carries its own s 207-20 gross-up and offset. Either way the full credit is available; the only difference is how much of it offsets a liability versus is refunded.

**Finding 4.6 · Segregated method unavailable to some SMSFs — does not affect refundability · confidence: primary-verified**

ITAA 1997 s 295-385(7): "*disregarded small fund assets* are not segregated current pension assets." s 295-387(2) defines these: a small superannuation fund with at least one retirement-phase interest, where just before the start of the income year a person had a **total superannuation balance exceeding $1.6 million** and was a retirement phase recipient of a superannuation income stream, and has an interest in the fund.

The **$1.6 million figure is hard-coded in s 295-387(2)(c)(i)** — it is not expressed as the (indexed) general transfer balance cap. Treat it as a static constant until an amending Act says otherwise.

Effect: such a fund must use the proportionate method (s 295-390). Per Finding 4.5, refundability is unaffected.

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F295-387
- Config: `smsf.disregarded_small_fund_assets.tsb_threshold = 1_600_000` (static, statutory)

---

## 5. The accumulation-phase case

**Finding 5.1 · 15% on the low tax component, 45% on NALI · confidence: primary-verified**

*Income Tax Rates Act 1986* s 26(1):

> "The rates of tax payable by a trustee of a complying superannuation fund in respect of the taxable income of the fund are: (a) in respect of the low tax component — **15%**; and (b) in respect of the non-arm's length component — **45%**."

(Latest amendment note in section: No 19 of 2007, renaming "standard component" → "low tax component" and "special component" → "non-arm's length component", applicable 2007-08 and later.)

- Source: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19860107%2F26
- Config: `super.tax_rate.low_tax_component = 0.15`; `super.tax_rate.nali = 0.45`

**Finding 5.2 · Mechanics: gross up, offset against 15%, excess refunded · confidence: primary-verified**

1. s 207-20(1) — franking credit included in the fund's assessable income.
2. s 207-90 does not apply (the distribution is assessable, not exempt).
3. s 207-20(2) — offset equal to the franking credit.
4. s 295-10 method statement — taxable income determined, s 26(1) Rates Act applies 15% to the low tax component.
5. s 63-10(1) item 40 via s 67-25(1) — offset applied against basic income tax liability; **excess refunded in cash**.

- Rule: *A complying fund in accumulation offsets franking credits against its 15% liability and receives any excess as a cash refund. There is no wastage.*
- Because the franking rate (chunk 1: 30% / 25%) exceeds 15%, a fully franked dividend in accumulation phase produces a **net refund**, not a net payment.
- Config: `super.accumulation.franking_credit_refundable = true`

---

## 6. Anti-avoidance and integrity provisions

**Finding 6.1 · Subdivision 207-F — the closed list of imputation-integrity denials · confidence: primary-verified**

ITAA 1997 s 207-145(1) (direct distributions) denies both the gross-up and the offset where:

| Para | Trigger | In scope here? |
|---|---|---|
| (a) | Entity is **not a qualified person** for Division 1A of former Part IIIAA ITAA 1936 | **Chunk 3** — the 45-day holding rule. Noted, not researched here. |
| (b) | Commissioner determination under **ITAA 1936 s 177EA(5)(b)** (schemes to obtain an imputation benefit) that no imputation benefit is to arise | Yes |
| (c) | Commissioner determination under **ITAA 1997 s 204-30(3)(c)** (streaming of imputation benefits) | Yes |
| (d) | Distribution made as part of a **dividend stripping operation** | Yes |
| (da) | **s 207-157 — distribution washing** (acquiring a substantially identical interest after disposing of one, and receiving a corresponding franked distribution on both) | Yes |
| (db) | **s 207-158 — foreign income tax deductions** (inserted by No 84 of 2018, eff 1 Oct 2018, distributions made on/after 1 Jan 2019) | Yes |

ITAA 1997 s 207-150(1) is the mirror provision for distributions that *flow indirectly*, with the same triggers plus (d) distributions treated as interest under s 207-160.

- Sources: https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F207-145 ; .../207-150 ; .../207-157
- **Important ordering point**: s 207-110 disapplies only ss 207-90 and 207-95. It does **not** disapply Subdivision 207-F. So a retirement-phase super fund that fails the qualified-person test, or is hit by a s 177EA determination or the distribution-washing rule, loses the credit outright — exempt status gives it no shelter.

**Finding 6.2 · Non-arm's length income · confidence: primary-verified**

NALI is excluded from ECPI by ss 295-385(2)(a) and 295-390(2)(a), and taxed at 45% (Rates Act s 26(1)(b)). Franking credits on NALI-tainted distributions are not denied by any provision found; they offset the 45% liability. NALI is a rate/characterisation risk, not a refundability denial.

**Finding 6.3 · Provisions NOT found to deny refundability in these cases · confidence: primary-verified (negative, scoped to Div 67 and Div 207)**

- No integrity rule denies an individual or a complying fund a refund by reason of the size of the refund, the entity's income, or the proportion of the portfolio in franked equities.
- s 67-25(1DA) (foreign resident with an Australian PE) has no application to a resident individual or an Australian complying fund.
- ITAA 1936 Part IVA remains available generally, but no provision specific to franking refundability beyond §6.1 was located.

---

## 7. Config summary for the model

| Key | Value | Basis |
|---|---|---|
| `franking.excess_refundable.individual` | `true` | ITAA 1997 ss 67-25(1), 63-10(1) item 40 |
| `franking.requires_australian_residence` | `true` | ITAA 1936 ss 128B(3)(ga), 128D + ITAA 1997 s 207-90(1) |
| `franking.excess_refundable.complying_super_fund` | `true` | ITAA 1997 ss 67-25(1), (1A) by implication; s 960-115 |
| `franking.excess_refundable.non_complying_super_fund` | `false` | ITAA 1997 s 67-25(1A) |
| `super.pension_phase.tax_rate` | `0.0` | ITAA 1997 ss 295-385(1), 295-390(1) |
| `super.pension_phase.franking_credit_refund_rate` | `1.0` | ITAA 1997 ss 207-110(2)(b), 67-25(1), 63-10 item 40 |
| `super.accumulation.tax_rate` | `0.15` | Income Tax Rates Act 1986 s 26(1)(a) |
| `super.nali.tax_rate` | `0.45` | Income Tax Rates Act 1986 s 26(1)(b) |
| `smsf.disregarded_small_fund_assets.tsb_threshold` | `1_600_000` | ITAA 1997 s 295-387(2)(c)(i) — hard-coded, not indexed |

All values current for FY2026-27 on the consolidation retrieved 2026-09-04.

---

## 8. UNVERIFIED LIST

1. **Refund payment mechanism and timing.** s 63-10(1) item 40 establishes the *entitlement* to a refund. The machinery that turns it into money — running balance account, offsetting against other tax debts, interest on overpayment — sits in the *Taxation Administration Act 1953* Part IIB (ss 8AAZL–8AAZLH). **Not fetched.** Matters for a cash-flow forecast: the refund arrives after assessment, not at dividend payment date. *To close*: fetch TAA 1953 ss 8AAZLF and 8AAZLA (DocID `PAC%2F19530001%2F8AAZLF`).
2. **ITAA 1997 s 295-400 (PST current pension liabilities)** is named in s 207-110(1)(b)(i) but was not fetched. Almost certainly irrelevant to a personal-super forecasting tool. *To close*: one fetch.
3. **ITAA 1997 s 207-158 (foreign income tax deductions)** — trigger confirmed to exist from the s 207-145(1)(db) text; the section's own conditions were not read. Aimed at hybrid/regulatory-capital instruments; unlikely to touch a retail portfolio. *To close*: one fetch.
4. **ATO administrative guidance** (the "Refund of franking credits" instructions for individuals, and SMSF ECPI guidance) could not be located — every guessed `ato.gov.au` content URL returned 404, and search engines were not used. This is a *corroboration* gap only; the statutory position in §§2–5 is fully primary-verified and is the stronger source.
5. **Whether the ATO consolidation retrieved is fully up to date** as at 2026-09-04. The CCH-sourced ATO Legal Database is authoritative in practice but is a reproduction. `legislation.gov.au` (the Federal Register, the authoritative source) was not successfully queried. *To close*: retrieve the ITAA 1997 compilation from the Federal Register and diff ss 67-25, 207-90, 207-110.
6. **No-TFN contributions tax** (s 295-605, Rates Act s 26 further subsections) — outside scope, not read.

## 9. DISCREPANCIES

**None.** Every source read was primary legislation from a single database and the provisions interlock without conflict. The one apparent conflict — s 207-90 denying a tax offset on exempt income versus the known fact that pension-phase funds receive franking refunds — is resolved *within the statute* by s 207-110, whose Subdivision is literally headed "Exceptions to the rules in Subdivision 207-D". This is a drafting trap, not a discrepancy: reading Division 207 without reaching Subdivision 207-E gives exactly the wrong answer.

---

## 10. Direct answer to the P6-8 question

**On franking alone, super wins — but by less than the naive model suggests, and for a reason that is easy to mis-model.**

Franking credits are **fully refundable in cash on both sides of the comparison**. An Australian-resident individual holding shares outside super gets excess credits refunded (§2). A complying fund gets them refunded in accumulation (§5) and in retirement phase (§4). Refundability itself is therefore **not** a super advantage. The advantage is purely the **rate differential** between the holder's tax rate and the franking rate.

Ranking, for a fully franked dividend (franking rate `f` from chunk 1 — 30% or 25%):

| Holder | Tax rate on the grossed-up dividend | Net position |
|---|---|---|
| Super, retirement phase | 0% | Refund of the **entire** credit — best case |
| Super, accumulation | 15% | Net refund of `(f − 15%)` of the grossed-up amount |
| Individual, 16% bracket + 2% Medicare | 18% | Net refund of `(f − 18%)` |
| Individual, 30% + 2% | 32% | Small top-up payment if `f = 30%` |
| Individual, 37% / 45% + 2% | 39% / 47% | Meaningful top-up payment |

**The super side comes out ahead** whenever the individual's marginal rate (including the 2% Medicare levy) exceeds the fund's rate — 15% in accumulation, 0% in retirement phase. For the P6-8 salary-sacrifice scenario the saver is by construction on a marginal rate of at least 30% + 2% (otherwise sacrificing is not attractive on contributions tax grounds either), so franking reinforces the super case during accumulation, and reinforces it strongly once the balance moves to retirement phase.

**Where it flips to the non-super side:** only when the individual's *effective* marginal rate, after LITO/SAPTO and the Medicare levy thresholds, falls **below 15%** — a retiree or low-income holder whose taxable income sits under the effective tax-free threshold. Such a person outside super receives 100% of the credit in cash, exactly matching a retirement-phase fund, and does so with none of super's preservation, contribution-cap or condition-of-release constraints. In that band franking gives super **zero** edge. It never flips to a positive non-super *franking* advantage — 0% is the floor on both sides — but the super advantage collapses to nothing.

**The modelling trap to avoid:** do not credit franking refunds to the super side while only offsetting them against tax on the individual side. That single asymmetry manufactures a spurious super advantage of up to the full franking rate. Model both sides as `credit − rate × grossed-up amount`, floored at a full cash refund, and the comparison is honest.

**Two conditions that void the credit on both sides** (so they cannot be assumed away for super): failing the qualified-person / 45-day test (chunk 3), and the Subdivision 207-F integrity triggers in §6.1. A retirement-phase fund gets **no** shelter from these — s 207-110 rescues it from s 207-90 only, not from s 207-145.
