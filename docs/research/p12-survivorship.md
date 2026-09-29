# Survivorship & illness-separation research — Australian Age Pension, Super, home

Retrieval date: 2026-09-24. Sources: DSS Social Security Guide (via web.archive.org — origin returns Cloudflare 403 to curl), Services Australia (servicesaustralia.gov.au — direct curl worked, pages dated 20 Sept 2026), ATO (ato.gov.au — direct curl worked), legislation.gov.au (direct curl worked for the ITAA 1997 and SIS Regulations 1994 body text; TOC/body fetched from the site's own epub document endpoints).

---

## 1. Age Pension on a partner's death

### Bereavement lump sum (LBP) formulas
Source: SS Guide **3.1.5.70** "The lump sum bereavement payment – member of a couple"
https://guides.dss.gov.au/social-security-guide/3/1/5/70 (fetched via archive: `https://web.archive.org/web/2026/https://guides.dss.gov.au/social-security-guide/3/1/5/70`)

- Prompt notification (NEPED = 0):
  > "LBP = (6 multiplied by (CCR minus NR)) plus (NDEP multiplied by (CCR minus NR) then divided by 14)."
- Late notification (NEPED ≠ 0):
  > "LBP = (7 minus NEPED) multiplied by (CCR minus NR)."
  Where CCR = combined couple rate that would have applied, NR = survivor's new single rate, NEPED = entitlement-period-end-days the deceased was paid after death.
- Illness-separated/respite couples get an adjusted formula that removes the "overpaid" gap between the illness-separated single rates and the ordinary partnered rate.

**The Guide never states "14 weeks" or "7 fortnights" in prose** — that figure is only implicit in the constants (6, 7, ÷14) in the formulas above. Treat "up to 7 fortnightly entitlement periods" as an inference from the formula, not a quoted rule.

### New single rate — timing
Source: SS Guide **3.1.5.30** "Bereavement payment provisions for couples"
https://guides.dss.gov.au/social-security-guide/3/1/5/30

> "Following notification of the partner's death, the survivor's rate is immediately adjusted to the single rate from the LATER of the following: if the person and their partner were long term social security recipients or in a receipt of a pension — the day of the partner's death, OR the day after the date paid to, of the combined couple rate, OR if the person's partner was NEITHER a long term social security recipient or a pensioner — the payday on or after the death, provided Services Australia was notified of the death within 4 weeks..., OR the date of notification if notified outside the 4-week period."

Also (same page): survivor keeps any instalments already paid in the deceased's name during the bereavement period regardless of the new single-rate outcome — Act ref: SSAct s21(2).

### Single rates and thresholds (current, from Services Australia — pages last updated **20 September 2026**)
- Single maximum pension rate: **$1,178.70/f** (period 20 Sept 2025–19 Mar 2026, per DSS Guide **5.1.8.10** "Common pension rates" — this table is now one indexation cycle stale; Services Australia's own rate pages should be checked for the 20 Sept 2026 update, which this session could not separately pull as a rates table).
  https://guides.dss.gov.au/social-security-guide/5/1/8/10 (SSAct s1064-A1)
- Single homeowner assets-test free area (full pension): **$333,000**; non-homeowner: **$600,000**.
  https://www.servicesaustralia.gov.au/assets-test-for-age-pension?context=22526 ("Page last updated: 20 September 2026")
- Single income-test free area: **$226/f** (50c reduction per $1 over).
  https://www.servicesaustralia.gov.au/income-test-for-age-pension?context=22526 ("Page last updated: 20 September 2026")
- **Single deeming thresholds** (current): "The first $66,800 of your financial assets has the deemed rate of 1.75% applied. Everything over that is deemed to earn 3.75% interest."
  https://www.servicesaustralia.gov.au/deeming?context=22526 ("Page last updated: 20 September 2026")
  (Cross-check: DSS Guide **4.4.1.10** table, archived snapshot only goes to 20/09/2025 showing 0.75%/2.75% at a $64,200 single threshold — i.e. the Guide's own historical table is stale; the Services Australia figures above are the current ones as at retrieval date.)

---

## 2. "Illness separated" couples

Source: SS Guide **2.2.5.60** "Determining an illness separated couple"
https://guides.dss.gov.au/social-security-guide/2/2/5/60 — Act ref: SSAct s4(7)

> "A couple is considered to be an 'illness separated couple' where: they are unable to live together in their home, and the inability to live together is due to illness or infirmity of either or both of them, results in their living expenses being greater or are likely to be greater than otherwise, and is likely to continue indefinitely."

> "Illness separated couples are entitled to the illness separated rate of the payment for which they are eligible (this is paid the same as the single rate). However, the amount paid takes into account the combined income and assets of both member of an illness separated couple."

Confirmed again in SS Guide **5.1.8.10**:
> "A pensioner who is a member of illness separated couple, respite care couple, or has a partner in prison, is paid at the single rate (including supplementary payments) but the income and assets tests apply as to a couple."

**Current rates/thresholds** (Services Australia, updated 20 Sept 2026):
- Each partner is paid the single maximum rate ($1,178.70/f per the DSS table, subject to the same staleness caveat as above).
- Assets test free area for "a couple, separated due to illness, combined" (full pension): **Homeowner $499,000 / Non-homeowner $766,000** — same free area as an ordinary couple, but note the **part-pension cut-off is higher**: Homeowner $1,324,500 / Non-homeowner $1,591,500 (vs $1,121,000/$1,388,000 for an ordinary couple), because the illness-separated pair draws two single-rate pensions.
  https://www.servicesaustralia.gov.au/assets-test-for-age-pension?context=22526
- Income test: combined free area **$396/f** — same as a couple living together — but the cut-off point is higher: **$5,346.80/f combined** (couple living apart due to ill health) vs **$4,128.00/f combined** (couple living together).
  https://www.servicesaustralia.gov.au/income-test-for-age-pension?context=22526

---

## 3. Superannuation death benefits — tax

### Statutory structure (verified directly against ITAA 1997 text, compilation dated 2026-08-27)
https://www.legislation.gov.au/C2004A05138/latest/text/302.60 (TOC/heading structure) — Division 302:

- **Subdivision 302-B — Death benefits to dependant**
  - s302-60 "All of superannuation lump sum is tax free" (heading group: "Lump sum death benefits to dependants are tax free")
  - s302-65/70/75 — income stream to a dependant: tax-free component always tax-free; taxable component tax-free if either the deceased or the dependant was 60+, else a 15% tax offset applies
  - s302-80/90 — treatment of the untaxed element for a dependant's income stream
- **Subdivision 302-C — Death benefits to non-dependant**
  - s302-140 "Superannuation lump sum — tax free status of tax free component"
  - s302-145 "Superannuation lump sum — element taxed in the fund taxed at 15%, element untaxed in the fund taxed at 30%"
- **Subdivision 302-D — Definitions**
  - s302-195 "Meaning of death benefits dependant"
  - s302-200 "What is an interdependency relationship?"

Note: legislation.gov.au serves this Act as a client-rendered app; this session could pull the table-of-contents/heading text (which gives exact section numbers/titles, confirmed above) but not the full operative wording of each section within the time available — treat the heading text as confirmed, but the operative wording quoted below is from the ATO, not the Act itself.

### ATO's plain-language statement of the same rule (confirms the rates, adds the Medicare-levy-inclusive withholding rates)
Source: ATO, "Paying superannuation death benefits" — https://www.ato.gov.au/tax-and-super-professionals/for-superannuation-professionals/apra-regulated-funds/paying-benefits/paying-superannuation-death-benefits

> "If you pay a lump sum death benefit to a dependant, the whole amount is tax-free. This is the case whether the lump sum contains a taxed element or an untaxed element."
> "If all the beneficiaries are not dependants, you will be subject to tax on the taxable component at the rates of 15% for the taxed element and 30% for any untaxed element. Any tax-free component will not be subject to tax."

Source: ATO, Schedule 12 — tax table for superannuation lump sums (withholding rates, **Medicare-levy-inclusive**) — https://www.ato.gov.au/tax-rates-and-codes/schedule-12-tax-table-for-superannuation-lump-sums

> "Death benefit paid to a dependant – taxed and untaxed elements of the taxable component … Nil – amount is non-assessable, non-exempt income"
> "Death benefit paid to a non-dependant – taxed element of the taxable component … Whole amount … 17%"
> "Death benefit paid to a non-dependant – untaxed element of the taxable component … Whole amount … 32%"

So: **taxed element 15% income tax + 2% Medicare levy = 17% withheld; untaxed element 30% + 2% = 32% withheld**, for a non-dependant. A spouse (a "death benefits dependant") pays nothing on a lump sum, and can also take the benefit as an income stream (see below).

### Spouse may take the benefit as a pension; non-dependant cannot
Source: ATO, "Superannuation death benefits" — https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/superannuation-death-benefits (last updated 10 July 2026)

> "If a death benefit is paid to a dependant, it can be paid as either a lump sum or income stream. [If paid to] someone who is not a dependant, it must be paid as a lump sum."

### Compulsory cashing — "as soon as practicable"
This is a **Superannuation Industry (Supervision) Regulations 1994** rule, not ITAA 1997. Verified against the operative regulation text (compilation dated 2026-07-01):
https://www.legislation.gov.au/F1996B00580/latest/text (reg 6.21, "Compulsory cashing of benefits in regulated superannuation funds")

> "(1) Subject to subregulation (3), a member's benefits in a regulated superannuation fund must be cashed as soon as practicable after the member dies."
> "(2) The form in which benefits may be cashed under this regulation is any one or more of the following forms: ... (b) subject to subregulations (2A) and (2B): (i) 1 or more pensions, each of which is a superannuation income stream that is in the retirement phase; (ii) the purchase of 1 or more annuities..."
> "(2A) If a member dies on or after 1 July 2007, subparagraphs (2)(b)(i) and (ii) apply to an entitled recipient only if, at the time of the member's death, the entitled recipient: (a) is a dependant of the member; and (b) in the case of a child of the member: [age/disability conditions]..."

So reg 6.21(2A) is the direct mechanism confirming a spouse (a dependant, no age/child restriction) can receive the death benefit as a retirement-phase pension, while reg 6.21(1) is the primary source for "as soon as practicable" — the ATO's page paraphrases this but the regulation itself is the primary source.

---

## 4. Reversionary pensions and the transfer balance cap

Source: ATO, "Superannuation death benefits" — Transfer balance account section — https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/superannuation-death-benefits

> "If you become entitled to a reversionary death benefit income stream on or after 1 July 2017, the credit in your transfer balance account arises 12 months after the date of the member's death."
> "The amount of the credit is equal to the value of the income stream at the date of the member's death."
> Worked example: "On 15 April 2018, Ivan dies and his super income stream reverts automatically to Sasha. The value of the super death benefit at this time is $1.1 million. Sasha's transfer balance account will be credited with $1.1 million on 15 April 2019."

Non-reversionary case, same source:
> "If you become entitled to a non-reversionary death benefit income stream on or after 1 July 2017, the credit arises on the day you become entitled to the income stream. The amount of the credit is the value of the income stream on that day."
> Worked example: earnings accrue between date of death and the date the income stream actually starts being paid to the beneficiary, and that accrued value (not the date-of-death value) is what gets credited.

**Gap**: I confirmed from legislation.gov.au that ITAA 1997 **Division 294 is titled "Transfer balance cap"** (compilation 2026-08-27), but could not retrieve the operative text of s294-25 (the credits table) from the Act itself within the time available — the epub document endpoints that served Division 302's and SIS reg 6.21's full text did not contain Division 294's body in the documents this session checked. The "12 months after death, valued at date of death" rule above is sourced to the ATO's own explanatory page (an authoritative regulator source, with a worked example), not to a verified quote of s294-25 itself. Any reference to "s294-25 item 2(b)" specifically should be treated as unverified secondary commentary (from web search results), not confirmed against the primary text.

I did not find a TAA 1953 (Taxation Administration Act) provision in this research — the TBAR *reporting* obligation (distinct from the credit-timing rule above) likely sits in TAA 1953 Sch 1, but this was not chased down; treat as ungrounded.

---

## 5. Homeowner status and the home — surviving partner

### Ordinary case (survivor keeps living in the home)
No special "death of partner" provision was found for this scenario — the DSS Guide is silent because it isn't needed: the home simply continues to be the surviving pensioner's exempt principal residence under the general homeowner rules (SS Guide 4.6.3.10, not fetched in detail here). Note this as a "silence = no special rule needed" case, not a gap.

### Illness-separated / care-situation couples — partner living in the home dies
Source: SS Guide **4.6.3.70** "Exempting the principal home – care situations", table "Assessment of illness separated members of a couple"
https://guides.dss.gov.au/social-security-guide/4/6/3/70

Row "If the partner living in the principal home … dies":
> "2-year exemption applies to the person in the care situation from the date of the partner's death."
(Note: Exemption period may be extended under the accommodation-charge/bond exceptions referenced elsewhere on the page.)

**This is a narrow rule**: it applies specifically where the couple was illness-separated with one partner already in a care situation (e.g. aged care) and the *other* partner (who remained living in the home) dies — it grants a fresh 2-year home exemption, running from the date of death, to the partner still in care. It is not a general "surviving partner selling the home after a death" rule.

### Sale-proceeds rule (24/36 months) — no death-specific variant found
Source: SS Guide **4.6.3.90** "Exempting the principal home – sale proceeds (for homes sold on or after 01/01/2023)"
https://guides.dss.gov.au/social-security-guide/4/6/3/90

> "From 1 January 2023, if a person sells their principal home, the portion of the proceeds intended to be used for the new principal home can be exempt from the assets test for up to 24 months."
> "For homes sold on or after 1 January 2023, the maximum sale proceeds exemption period is 36 months" (24 months + up to a further 12-month extension on specified criteria).

Searched this page specifically for "death"/"survivor" — **no hits**. The 24/36-month sale-proceeds exemption is a general rule that applies equally to a bereaved survivor selling the family home; the Guide does not carve out a separate/different period for that case. Sale proceeds continue to be exempt from the assets test during the period but are deemed at the lower deeming rate for income-test purposes (SS Guide 4.6.3.70, care-situations page, same statement repeated).
