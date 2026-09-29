# Age Pension assets test — how long the vacated home stays "principal home" (exempt)

Retrieval date for all sources below: **2026-09-24**.

Access notes: `legislation.gov.au` and `guides.dss.gov.au` both return HTTP 403 (Cloudflare
challenge) to both WebFetch and direct `curl`. The Wayback Machine's live-proxy
(`web.archive.org/web/2026/<url>`) was not blocked and served the current, live DSS Guide pages
and the current AustLII consolidation of the Act, so all quotes below are the primary-source text,
fetched via that proxy. Straight `curl -sL -A 'Mozilla/5.0'` to the origin domains failed with 403
(Cloudflare) for both the Act (classic.austlii.edu.au) and the Guide (guides.dss.gov.au).

## The statute: Social Security Act 1991, s 11A(9)

s 11A(1) defines "principal home"; s 11A(9) is the absence-extension provision — the residence
"is to be taken to continue to be the person's principal home" during:

> (9) A residence of a person is to be taken to continue to be the person's principal home during:
> (a) any period (not exceeding 12 months or any longer period determined under subsection (9A)
> or (9B)) during which the person is temporarily absent from the residence; and
> (b) if the person is in a care situation or residential care — the period of 2 years beginning
> when the person started to be in a care situation or residential care; and
> ... (c)/(d)/(e) cover a partner remaining, or a partner's death during/after the 2-year period ...
> (f) any period of up to 2 years while the person is absent from the residence and is personally
> providing a substantial level of care in another private residence for another person who needs
> ... that level of care ...

— AustLII consolidation, SOCIAL SECURITY ACT 1991 - SECT 11A, retrieved via
`https://web.archive.org/web/2026/https://classic.austlii.edu.au/au/legis/cth/consol_act/ssa1991186/s11a.html`
(mirrors `https://classic.austlii.edu.au/au/legis/cth/consol_act/ssa1991186/s11a.html`),
2026-09-24.

s 11A(9A) — extension of the 12-month period in (9)(a), by Secretary's written determination, to
**up to 24 months**, only where the home was lost or damaged (not wilfully), the person is making
reasonable attempts to rebuild/repair/sell/rebuy, has done so within a reasonable period, and has
experienced delays beyond their control.

s 11A(9B) — a further, undefined-length extension of the (9)(a) period for a person stuck overseas
unable to return "because of circumstances beyond the person's control".

## Variant-by-variant answer

### 1. General temporary absence (no care, no loss/damage, no partner remaining) — **12 months**

- Section: s 11A(9)(a).
- Guide: 4.6.3.60 *Exempting the principal home — temporary vacation of property*.
  URL: `https://guides.dss.gov.au/social-security-guide/4/6/3/60` (retrieved via web.archive.org
  proxy, 2026-09-24; page states "Last reviewed: 20 March 2023", Guide version 1.333, released 3
  November 2025).
- Quote: *"If an income support recipient temporarily vacates the principal home for any reason
  other than those described elsewhere in this topic, the home continues to be the principal home
  and the income support recipient continues to be defined as a homeowner, for up to 12 months...
  After a 12 month temporary absence the home is no longer the income support recipient's principal
  home."*
- Exception: overseas and unable to return due to circumstances beyond the person's control — the
  Secretary "may determine an additional period" (s 11A(9B)), open-ended, no stated cap.

### 2. Home lost or damaged (fire, natural disaster, etc.) — **12 months, extendable to a maximum of 24 months**

- Section: s 11A(9)(a) extended by s 11A(9A).
- Guide: 4.6.3.60, "Extended exemption period for temporary vacation — home is lost or damaged
  (from 1/07/2007)".
- Quote: *"If an income support recipient's principal home is lost or damaged the home can continue
  to be the income support recipient's principal home for a period of up to 24 months if: the loss
  or damage was not wilfully caused ... [and three further conditions about reasonable attempts /
  reasonable period / delays beyond control] ... All of the above criteria MUST be met."*
- This is a **12-month rule with a conditional extension to 24 months**, not an unconditional
  24-month rule.

### 3. Caring for another person in a private residence — **up to 24 months**

- Section: s 11A(9)(f).
- Guide: 4.6.3.60, "Care for another person".
- Quote: *"Where an income support recipient is absent from their principal home to care for another
  person in a private residence, their principal home can be treated as an exempt asset for that
  person for up to 24 months."*
- This is a flat 24-month rule (unlike variant 2, no separate 12-month base + extension structure).

### 4. Entering residential aged care / a "care situation" — **2 years (24 months) flat**, running regardless of intention to return

- Section: s 11A(9)(b).
- Guide: 4.6.3.70 *Exempting the principal home — care situations*.
  URL: `https://guides.dss.gov.au/social-security-guide/4/6/3/70` (retrieved via web.archive.org
  proxy, 2026-09-24; page states "Last reviewed: 20 March 2025").
- Quote: *"If an income support recipient vacates their principal home to enter a care situation,
  the home continues to be an EXEMPT asset under the assets test for a 2-year period. This
  provision applies irrespective of whether an income support recipient intends to return their
  principal home."*
- After the 2 years: *"If, after 2 years, an income support recipient has not returned to their
  principal home the: income support recipient is treated as a non-homeowner, AND principal home
  is an assessable asset."*
- Legacy exceptions (rarely relevant now, dated entry cohorts) can make the home exempt
  **indefinitely** or for **5 years** where the person is paying an accommodation
  charge/bond/DAP/DAC by instalments or accruing such a liability **and** rents out the home
  (entry dates 5 Nov 1997–30 Jun 2004 for the 5-year variant; 1 Jul 2004–31 Dec 2016, plus a
  continuous-occupancy condition from 1 Jan 2017, for the indefinite variant). These require the
  home to be tenanted, which is a materially different fact pattern from "nobody remains".
- Multiple/successive care situations don't restart the 2-year clock unless the person moves from
  a non-accommodation-charge-liable setting into one where such a charge/bond/DAP/DAC becomes
  payable and the home is rented.

### 5. A partner remains living in the home — **exempt indefinitely, for as long as the partner (or, per s 11A(9)(c), the person's partner under the care-situation carry-over) lives there**

- Section: s 11A(9)(c)/(d)/(e).
- Confirmed by Guide 4.6.3.70's illness-separated-couple table: *"remains in the home → principal
  home is an exempt asset under the assets test."* If the remaining partner later also vacates
  (e.g. also enters care), a fresh 2-year clock (or 12-month clock, for a non-care reason) starts
  from that date. If the partner dies while the absent person is still in a care situation of less
  than 2 years' standing, s 11A(9)(e) restarts a fresh 2-year period from the death.
- This matches ADR-0005's "Vacated, Protected Person remains: Exempt indefinitely" row — no
  contradiction found there (that row wasn't in question, but it checks out).

### 6. Home sold, proceeds earmarked for a new home — **24 months base, extendable to a maximum of 36 months; still deemed for income throughout**

- Section: s 1118(1B) (base period) and s 1118(2B) (extension), **current version, for sales on or
  after 1 January 2023**. Confirmed against the live AustLII text of s 1118 (retrieved via
  web.archive.org proxy of `https://classic.austlii.edu.au/au/legis/cth/consol_act/ssa1991186/s1118.html`,
  2026-09-24), which reads: *"(1B) Subsection (2) applies if: (a) a person sells the person's
  principal home; and (b) ... and (c) before the end of 24 months, or any longer period determined
  under subsection (2B), after the sale, one or more of the following applies: [intends/applies
  proceeds to build/rebuild/repair/renovate or purchase another principal home]"* and *"(2B) ...
  the Secretary may determine, in writing, a period of up to 36 months if [reasonable attempts,
  reasonable period, delays beyond control]."*
- Guide: 4.6.3.90 *Exempting the principal home — sale proceeds (for homes sold on or after
  01/01/2023)*. URL: `https://guides.dss.gov.au/social-security-guide/4/6/3/90` (retrieved via
  web.archive.org proxy, 2026-09-24; "Last reviewed: 22 September 2025").
- Quote: *"From 1 January 2023, if a person sells their principal home, the portion of the proceeds
  intended to be used for the new principal home can be exempt from the assets test for up to 24
  months."* And: *"For homes sold on or after 1 January 2023, if the person has not been able to
  purchase, build, rebuild, repair, or renovate a new principal home within 24 months of
  settlement, the principal home sale proceeds CAN be exempt from the assets test for up to another
  12 months, subject to the person meeting certain criteria... the maximum sale proceeds exemption
  period is 36 months."*
- Deeming: *"Even though principal home sale proceeds can be exempt from the assets test for up to
  36 months, the proceeds will still be subject to deeming under the income test... only the lower
  deeming rate will be applied to principal home sale proceeds during the period of the assets test
  exemption."*
- **Older regime, superseded**: for homes sold between 1 July 2007 and 31 December 2022, the base
  period was **12 months**, extendable to a maximum of **24 months** (Guide 4.6.3.80, s 1118
  pre-1-January-2023 numbering: s 1118(1B)/(2)/(2B)). This is the source of a "24 months" figure
  in the pre-2023 law, but as the *maximum*, not the base — the opposite structure from the
  current rule.

## After the exemption ends: market value, non-homeowner thresholds

Directly confirmed for the care-situation case (variant 4), Guide 4.6.3.70: *"If, after 2 years, an
income support recipient has not returned to their principal home the: income support recipient is
treated as a non-homeowner, AND principal home is an assessable asset."* No special valuation rule
is stated beyond the general assets-test principle that an assessable asset is counted at its
market/realisable value — the sources are silent on any cap or special valuation method once the
home becomes assessable, consistent with (but not verbatim authority for) "uncapped."

For the general 12-month case (variant 1), the Guide states only that *"the home is no longer the
income support recipient's principal home"* after 12 months, without the explicit
"non-homeowner"/"assessable asset" sentence that 4.6.3.70 gives for the care case. The inference to
non-homeowner status and full market-value assessment is strongly implied by the general
homeowner/non-homeowner and exempt/assessable asset framework (s 11(4) Homeowner; s 1118(1) general
exemption of the "principal home"), but I could not find a sentence in 4.6.3.60 stating it as
explicitly as 4.6.3.70 does for the care case. Flagging this as a minor gap, not a contradiction.

## Verdict on ADR-0005 (docs/adr/0005-home-is-a-status-not-a-value.md, lines 15–20)

**Row: "Vacated, nobody remains: exempt 2 years, then full market value, uncapped" — WRONG AS A
GENERAL RULE. Overgeneralises a care-situation-specific figure.**

- "2 years" is correct **only** for the two care-related variants: entering a care
  situation/residential aged care (s 11A(9)(b), flat 24 months) and caring for another person in a
  private residence (s 11A(9)(f), up to 24 months).
- For an ordinary/general temporary absence with nobody remaining and no care situation involved,
  the exemption is **12 months** (s 11A(9)(a)), not 2 years — extendable only in the narrow
  lost-or-damaged-home case (to 24 months, s 11A(9A)) or the overseas-unable-to-return case
  (s 11A(9B), no fixed cap).
- The ADR's single "Vacated, nobody remains" row therefore conflates at least three distinct
  statutory variants (general 12-month, damaged-home 12→24-month, care-situation flat 24-month)
  under one figure. The "then full market value, uncapped" tail is directionally correct once
  *some* exemption period expires (confirmed explicitly for the care case; strongly implied, not
  explicitly stated, for the general case).
- If the codebase's `VACATE_HOME` entry type is meant to model a person leaving home for a reason
  *other than* entering care (i.e., the general case), the correct clock is **12 months**, not
  24. If it specifically models entering aged care, 24 months is correct, but that should be
  distinguished from a general "vacate" case in the model/ADR language.

**Row: "Sold, proceeds earmarked for a new home: exempt 24 months, but still deemed" — CORRECT AS
FAR AS IT GOES, BUT INCOMPLETE.**

- 24 months is the correct **base** period under current law (s 1118(1B), for sales on or after 1
  January 2023) and "still deemed" (for income test purposes, at the lower deeming rate) is
  confirmed verbatim in Guide 4.6.3.90.
- What the ADR row omits: the base 24 months can be **extended to a maximum of 36 months**
  (s 1118(2B)) on the same "reasonable attempts / reasonable period / delays beyond control" test
  used for the damaged-home extension. If the ADR/TODO register treats "24 months" as the hard
  ceiling for this variant, that's understated by up to 12 months in the current-law case.
  (Under the superseded pre-2023 regime the ceiling actually was 24 months, off a 12-month base —
  so "24 months" as a ceiling is right for pre-2023 sales, wrong as a ceiling for the current,
  post-2023 rule that plan_ai.md's contemporaries would apply.)

## Gaps / ambiguities the sources leave open

- Neither Guide page states explicitly whether "uncapped" is the right word for the market-value
  assessment after a care-situation exemption lapses — it's simply silent on any cap, which is not
  the same as an affirmative "no cap" statement.
- 4.6.3.60 does not use the words "non-homeowner" or "assessable asset" for the general 12-month
  case the way 4.6.3.70 does for the care case; the outcome is inferred from the general
  homeowner/exempt-asset framework, not asserted on that page.
- I did not locate primary confirmation of a "market value" valuation *method* specifically for a
  home that has become assessable post-exemption (as opposed to the general assets-test valuation
  rules that apply to any assessable real property) — the sources address exemption/non-exemption,
  not valuation methodology, so "full market value" is an inference from general principles, not a
  quoted rule.
