# P3-9 — The transfer balance cap: ITAA 1997 Division 294 and s 307-80

**Scope:** register open item **P3-9** (transfer balance cap) plus the **s 307-80 retirement-phase entry test** that `src/core/superPhase.ts` names as missing from the register, and the **TTR conversion limb of P3-8**. ITAA 1997 Div 294 and s 307-80 only. Not Div 296, not Div 293, not franking, not the Age Pension.
**Retrieval date:** 2026-09-09 · **Forecast year:** FY2026-27

> **STATUS: RESEARCH COMPLETE — NOT A FINISHED SPECIFICATION. Decisions remain open.**
>
> **What this document is.** The evidence record for P3-9, consolidated from four parallel research
> passes. It carries, in order: the **verbatim primary text** of every provision relied on, captured
> before any analysis; **four analysis sections** — §A the cap and its indexation, §B the transfer
> balance account's credits and debits, §C excess transfer balance and its enforcement, §D the
> retirement-phase entry test and the TRIS conversion; **three reconciliations** (§A ↔ §B,
> §A ↔ §C, §B ↔ §D) that state where independent passes converged and where they did not;
> and the catalogues of **UNKNOWNS**, **TRAPS** and **OPEN ITEMS**.
>
> **Nothing in this file is written from memory; every quoted provision was fetched, and every fetch
> is logged in §7.** §7 is the merged retrieval record for all four passes — 77 successful
> retrievals and 29 failing URLs, with the failures kept and sorted into true absences, bad URL
> forms, and dead ends, plus a subsection of reusable retrieval recipes.
>
> **ID ranges defined here: U9–U33, T58–T125, O40–O65.** These **extend** the sequences already
> running in `docs/assumptions-register.md`; they do not restart them. Do not renumber.
>
> **One design question is settled by user ruling and is not open.** The engine **hard-refuses** to
> project any financial year containing an end-of-day cap breach. **Excess transfer balance tax is
> NOT implemented** — the §C machinery is recorded as the detector that fires the refusal, not as
> tax to compute. The latching **`hasEverExceededCap`** flag **is built regardless**, because a
> refusal prevents only new breaches and cannot undo one that predates the projection.
>
> **Everything else that is flagged as a decision is still open.** The §A ↔ §B reconciliation
> raised three conflicts and all three are now ruled; the §B ↔ §D reconciliation raised **four
> conflicts and none of them is ruled**, and **O65** — whether §B's U16 and §D's
> automatic-conversion-at-65 finding can both stand — is unresolved. A reader who treats this
> document as an implementation spec will implement an unresolved question by accident.
>
> **The register and `TODO.md` have not yet been updated from this file.** Nothing here edited
> `docs/assumptions-register.md`, `TODO.md` or any file under `src/`.
> **`## Corrections owed to existing artefacts`** is the list of what a later agent must apply:
> changes owed to **register §3.9**, to **`docs/research/p3-minimum-drawdown-and-ttr.md`**, and to
> **three source files**. Register **§3.10** is deliberately not written here — §C and §D each
> drafted a competing version and they must be merged, not applied in sequence.

---

## RAW PRIMARY TEXT — captured first, analysed below

Source for every provision in this section unless otherwise noted: **ATO Legal Database**,
`https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F<section>`, retrieved
**2026-09-09** with `curl` and a browser User-Agent. The `DocID=PAC%2F19970038%2F…` form worked on
every ITAA 1997 section tried; **no 403 was encountered**.

### ITAA 1997 s 307-80 — *When a superannuation income stream is in the retirement phase* — VERBATIM

> **307-80(1)** A \*superannuation income stream is in the **retirement phase** at a time if a
> \*superannuation income stream benefit **is payable** from it at that time.
>
> **307-80(2)** A \*superannuation income stream is **also** in the **retirement phase** at a time if:
> (a) it is a \*deferred superannuation income stream; and
> (b) a \*superannuation income stream benefit **will be payable** from it to a person after that time; and
> (c) the person has satisfied (whether at or before that time) a condition of release specified in any of the following items of the table in Schedule 1 to the *Superannuation Industry (Supervision) Regulations 1994*:
> (i) **101 (retirement)**; (ii) **102A (terminal medical condition)**; (iii) **103 (permanent incapacity)**; (iv) **106 (attaining age 65)**.
>
> **307-80(3)** **However**, a \*superannuation income stream from which a \*superannuation income
> stream benefit is payable is **not** in the **retirement phase** at a time if:
> (a) the superannuation income stream is any of the following:
>  (i) a **transition to retirement income stream** (within the meaning of Part 6 of the *Superannuation Industry (Supervision) Regulations 1994*);
>  (ii) a non-commutable allocated annuity (within the meaning of those regulations);
>  (iii) a non-commutable allocated pension (within the meaning of those regulations);
>  (iv) a transition to retirement pension (within the meaning of Part 4 of the *Retirement Savings Accounts Regulations 1997*);
>  (v) a non-commutable allocated pension (within the meaning of those regulations); and
> **(aa)** the person to whom the benefit is payable is **not a reversionary beneficiary**; and
> (b) at or before that time, the person to whom the benefit is payable:
>  (i) **has not satisfied** a condition of release specified in paragraph (2)(c); **or**
>  (ii) **has satisfied** a condition of release specified in subparagraph (2)(c)(i), (ii) or (iii), **but has not notified the \*superannuation income stream provider** for the superannuation income stream **of that fact**.
>
> **307-80(4)** A \*superannuation income stream is **also not** in the **retirement phase** in an
> income year if:
> (a) the superannuation income stream is specified in a **commutation authority** issued by the Commissioner under Subdivision 136-B in Schedule 1 to the *Taxation Administration Act 1953* to a \*superannuation income stream provider; and
> (b) the superannuation income stream provider is required by section 136-80 in that Schedule to pay a \*superannuation lump sum **but fails to do so within the 60-day period** mentioned in that section; and
> (c) the income year is the income year in which the 60-day period ended, or a later income year.
>
> **Note:** The operation of this subsection in relation to the part of the income year before the
> end of the 60-day period is modified for the purposes of the transfer balance cap: **see section 294-50**.

**Amendment history, from the same page:** s 307-80 inserted by **No 81 of 2016** (Sch 11 item 1),
effective 1 January 2017. s 307-80(3) **substituted** by No 55 of 2017 (Sch 1 item 13), effective
1 July 2017 — the former subsection (3) excluded a TRIS from retirement phase **outright, with no
condition-of-release escape**. s 307-80(3) further amended by **No 8 of 2019** (Sch 8 item 43),
inserting para **(aa)** (the reversionary-beneficiary carve-out), effective 1 April 2019. **No
amendment after 2019.**

### ITAA 1997 s 294-25 — *Transfer balance credits* — VERBATIM

> **294-25(1)** The following table sets out **when a credit arises** in your \*transfer balance
> account and **the amount** of the credit. The credit is called a **transfer balance credit**.
>
> **Credits in the transfer balance account**
>
> | Item | If: | A credit of: | Arises: |
> |---|---|---|---|
> | **1** | just before **1 July 2017**, you are the \*retirement phase recipient of a \*superannuation income stream | the \*value, just before 1 July 2017, of the \*superannuation interest that supports the superannuation income stream | on the later of: (a) 1 July 2017; and (b) if you are a **reversionary beneficiary** — the last day of the period of **12 months** beginning on the day a \*superannuation income stream benefit first becomes payable from the income stream |
> | **2** | on a day (the **starting day**) on or after 1 July 2017, **you start to be the \*retirement phase recipient** of a \*superannuation income stream | the **\*value on the starting day** of the \*superannuation interest that supports the superannuation income stream | (a) **on the starting day**, unless paragraph (b) applies; or (b) if you are a **reversionary beneficiary** — at the end of the period of **12 months** beginning on the starting day |
> | **3** | you have **\*excess transfer balance at the end of a day** | your **\*excess transfer balance earnings** for that day | **at the start of the next day** |
> | **4** | a \*transfer balance credit arises under **section 294-55** because of a **repayment of a limited recourse borrowing arrangement** | the amount of the credit specified in section 294-55 | at the time provided by section 294-55 |
> | **5** | a \*transfer balance credit arises under **regulations** made for the purposes of this item | the amount of the credit worked out in accordance with the regulations | at the time specified in the regulations |
>
> **Note 1:** The amount of the transfer balance credit is **modified for certain capped defined benefit income streams: see Subdivision 294-D**.
> **Note 2:** For the meaning of **excess transfer balance earnings**, see section **294-235**.
> **Note 3:** If a payment split applies to payments from the superannuation income stream, a debit arises under section 294-90.
>
> **294-25(2) — No crediting of earnings if determination issued.** Despite item 3 of the table in
> subsection (1), **no credit arises** in your \*transfer balance account under that item because of
> \*excess transfer balance at the end of a day if the day is in the period: (a) starting on the day
> the Commissioner makes an **\*excess transfer balance determination** in respect of you; and (b)
> ending on: (i) unless subparagraph (ii) applies — the first day on which the sum of all \*transfer
> balance debits arising in your \*transfer balance account since the determination was issued
> **equals or exceeds the \*crystallised reduction amount**; or (ii) if a \*transfer balance credit
> arises in your transfer balance account before that day — the day on which that credit arises.
> **Note:** For provisions about excess transfer balance determinations, see **Division 136 in
> Schedule 1 to the *Taxation Administration Act 1953***.
>
> **294-25(3)** The regulations may provide that an item of the table in subsection (1) does not
> apply to a class of \*superannuation income streams specified in the regulations.

**Amendment history:** s 294-25 inserted by No 81 of 2016 (Sch 1 item 4), effective 1 January 2017.
Subsection (1) amended by No 55 of 2017 (Sch 1 item 3) inserting table items 4 and 5, effective
1 July 2017; subsection (3) inserted by the same Act (item 4).

**The brief's guess at the section number is CORRECT: credits are s 294-25.**

### ITAA 1997 s 294-80 — *Transfer balance debits* — VERBATIM

> **294-80(1)** The following table sets out **when a debit arises** in your \*transfer balance
> account and **the amount** of the debit. The debit is called a **transfer balance debit**.
>
> **Debits in the transfer balance account**
>
> | Item | If: | A debit of: | Arises: |
> |---|---|---|---|
> | **1** | you receive a **\*superannuation lump sum** because a \*superannuation income stream of which you are a \*retirement phase recipient is **commuted, in full or in part** | **the amount of the superannuation lump sum** | **at the time you receive the superannuation lump sum** |
> | **2** | a **\*structured settlement contribution** is made in respect of you | the amount of the contribution | at the later of: (a) the time the contribution is made; and (b) the start of the day you first start to have a \*transfer balance account |
> | **3** | a \*transfer balance debit arises under **section 294-85** because of an **event that results in reduced superannuation** | the amount of the debit specified in section 294-85 | at the time provided by section 294-85 |
> | **4** | a \*transfer balance debit arises under **section 294-90** because of a **\*payment split** | the amount of the debit specified in section 294-90 | at the time provided by section 294-90 |
> | **5** | a \*superannuation income stream of which you are a \*retirement phase recipient **stops being in the \*retirement phase under subsection 307-80(4)** | the \*value of the \*superannuation interest that supports it **at the end of the period within which the commutation authority was required to be complied with** | at the end of that period |
> | **6** | a \*superannuation income stream of which you **were** a \*retirement phase recipient **stops being** a superannuation income stream that is in the \*retirement phase at a time (the **stop time**), **but items 1 and 5 do not apply** | the \*value of the \*superannuation interest that supported the superannuation income stream **just before the stop time** | **at the stop time** |
> | **7** | the Commissioner gives you a **notice under section 136-70 in Schedule 1 to the *Taxation Administration Act 1953*** (about **non-commutable excess transfer balance**) | the amount of the \*excess transfer balance **stated in the notice** | at the time the Commissioner issues the notice |
> | **8** | a \*transfer balance debit arises under **regulations** made for the purposes of this item | the amount of the debit worked out in accordance with the regulations | at the time specified in the regulations |
>
> **294-80(2) — Structured settlement contributions.** Each of the following is a **structured
> settlement contribution** in respect of you: (a) a contribution to a \*complying superannuation
> plan in respect of you that is covered under **section 292-95** (about structured settlements or
> orders for personal injuries); (b) a contribution that would be covered under section 292-95 if
> (i) the section applied to contributions made before 10 May 2006; and (ii) paragraphs 292-95(1)(b)
> and (d) were disregarded.
>
> **294-80(3)** The regulations may provide that an item of the table in subsection (1) does not
> apply to a class of \*superannuation income streams specified in the regulations.

**Amendment history:** inserted by No 81 of 2016 (Sch 1 item 4), effective 1 January 2017.
Table item 6 **substituted** and item 8 inserted by No 55 of 2017 (Sch 1 items 7, 8), effective
1 July 2017 — the former item 6 valued the interest at the **end of the income year**, the current
one values it **just before the stop time**. Item 4 amended by **No 8 of 2026** (Sch 3 item 4),
effective **1 April 2026**, a drafting change only (`payment split` → `*payment split`).

**The brief's guess at the section number is CORRECT: debits are s 294-80.**

### ITAA 1997 s 294-35 — *Your transfer balance cap* — VERBATIM

> **294-35(1)** Your **transfer balance cap** for the \*financial year in which you **first start to
> have a \*transfer balance account** is equal to the \***general transfer balance cap** for that
> financial year.
> **Note:** The amount of the transfer balance cap is modified for **child recipients**: see Subdivision 294-E.
>
> **294-35(2)** Your **transfer balance cap** for a **later** \*financial year is equal to **your
> transfer balance cap for the previous year**, subject to **section 294-40** (which is about
> proportional indexation).
>
> **294-35(3)** The **general transfer balance cap** is: (a) for the **2017-2018** \*financial year
> — **$1,600,000**; or (b) for the 2018-2019 financial year or a later financial year — the amount
> worked out by **indexing annually** the amount mentioned in paragraph (a).
> **Note:** Subdivision 960-M shows how to index amounts. However, **annual indexation does not
> necessarily increase the amount of the cap**: see section 960-285.

The page also carries a **CCH editorial note** (not statutory text) listing the general cap:
2017/18–2020/21 $1.6m · 2021/22 $1.7m · 2022/23 $1.7m · 2023/24 $1.9m · 2024/25 $1.9m ·
**2025/26 $2.0m** · **2026/27 $2.1m**. This corroborates register §3.1's $2,100,000 for FY2026-27
from a second (secondary, publisher-editorial) source.

### ITAA 1997 s 294-40 — *Proportionally indexed transfer balance cap* — VERBATIM

> **294-40(1)** This section applies to **increase** your **transfer balance cap** for a \*financial
> year (**other than the financial year in which you first start to have a \*transfer balance
> account**) if:
> (a) the \*general transfer balance cap is **increased as a result of indexation** for the financial year; and
> (b) **at no time before the start of that financial year has the \*transfer balance in your transfer balance account at the end of a day exceeded your transfer balance cap**.
>
> **294-40(2)** Your **transfer balance cap** is increased for the \*financial year by the amount
> worked out using the following formula:
>
> > **Unused cap percentage × Indexation increase**
>
> where:
> **indexation increase** means the amount by which the \*general transfer balance cap for the
> \*financial year **increased as a result of indexation**.
> **unused cap percentage** is worked out by:
> (a) identifying the **highest \*transfer balance** in your \*transfer balance account **at the end of any day up to the end of the previous \*financial year**; and
> (b) identifying **the day** on which the transfer balance account had that transfer balance at the end of the day, or, **if more than one day, the earliest of those days**; and
> (c) **expressing the transfer balance identified in paragraph (a) as a percentage (rounded down to the nearest whole number) of your \*transfer balance cap on the day identified in paragraph (b)**; and
> (d) **subtracting the result of paragraph (c) from 100%**.
>
> **294-40(3)** However, if the highest \*transfer balance mentioned in paragraph (a) of the
> definition of **unused cap percentage** in subsection (2) is **less than nil**, that unused cap
> percentage is **taken to be 100%**.

**Amendment history:** ss 294-35 and 294-40 both inserted by No 81 of 2016 (Sch 1 item 4), effective
1 January 2017. **Neither has been amended since.**

### ITAA 1997 Subdiv 294-B, the rest of the machinery — VERBATIM

> **s 294-1 (What this Division is about).** *There is a cap on the total amount you can transfer
> into the retirement phase of superannuation (where earnings are exempt from taxation). Credits are
> added to a transfer balance account when you transfer amounts. If the balance in your account
> exceeds the cap, you will be required to remove the excess from the retirement phase, and you will
> be liable to pay excess transfer balance tax.* **Note:** Division 136 in Schedule 1 to the
> *Taxation Administration Act 1953* contains rules about excess transfer balance determinations and
> commutation authorities.
>
> **s 294-5 (Object).** *The object of this Division is to limit the total amount of an individual's
> \*superannuation income streams that receive an **earnings tax exemption**.*
>
> **s 294-15 (When you have a transfer balance account).**
> **(1)** *You have a **transfer balance account** if you are, **or have at any time been**, the
> \*retirement phase recipient of a \*superannuation income stream.*
> **(2)** *You **start to have** the \*transfer balance account on the **later** of: (a) 1 July 2017;
> and (b) the day you **first start to be** a \*retirement phase recipient of a \*superannuation
> income stream.*
>
> **s 294-20 (Meaning of retirement phase recipient).**
> **(1)** *You are the **retirement phase recipient** of a \*superannuation income stream at a time
> if: (a) the superannuation income stream is **in the \*retirement phase** at that time; and (b) a
> \*superannuation income stream benefit from it **is payable to you** at that time.*
> **(2)** *You are **also** the retirement phase recipient … if: (a) it is in the \*retirement phase;
> and (b) it is a \*deferred superannuation income stream; and (c) a \*superannuation income stream
> benefit **will be payable to you after that time**.*
>
> **s 294-30 (Excess transfer balance).**
> **(1)** *You have **excess transfer balance** at a particular time if, at that time, the
> \*transfer balance in your \*transfer balance account **exceeds** your \*transfer balance cap at
> that time. The amount of the **excess transfer balance** is the amount of the excess.*
> **Note:** There is a modification for certain capped defined benefit income streams: see Subdivision 294-D.
> **(2)** *The **transfer balance** in your \*transfer balance account at a time equals: (a) the sum
> of the \*transfer balance **credits** in the account at that time; **less** (b) the sum of the
> \*transfer balance **debits** (if any) in the account at that time.*
> **Note 2: There is NO consequence for having a negative transfer balance.**
>
> **s 294-45 (Transfer balance account ends).** *The \*transfer balance account **ceases when the
> \*retirement phase recipient dies**.*
>
> **s 294-50 (Assumptions about income streams).** (3) *In working out whether a \*superannuation
> income stream is in the **retirement phase** at a time, **disregard the operation of subsection
> 307-80(4)**, if the time is before the end of the 60-day period mentioned in paragraph (c) of that
> subsection.* (Substituted by No 55 of 2017, effective 1 July 2017.)
>
> **s 294-55 (Repayment of limited recourse borrowing arrangement).** A credit arises where a
> \*superannuation provider makes a payment in respect of a \*borrowing covered by the s 67A(1) SIS
> Act LRBA exception, **as a result the \*value of a \*superannuation interest supporting a
> retirement-phase stream increases**, and the interest is in a **\*small superannuation fund**.
> **The amount of the credit is the amount of the increase in \*value; it arises at the time of the
> payment.** (Para (c) substituted by No 47 of 2021, effective 1 July 2021 — previously "SMSF or
> fewer than 5 members".)
>
> **s 294-85 (Certain events that result in reduced superannuation).** A debit arises **only if you
> notify the Commissioner in the \*approved form** (s 294-85(1)(b)) **and** either: **fraud or
> dishonesty** reducing the interest's value where *an individual has been convicted of an offence
> involving that fraud or dishonesty* (debit = the reduction in value, at the time of the loss); or a
> payment in compliance with a notice under **s 139ZQ of the *Bankruptcy Act 1966*** (debit = the
> amount paid to the trustee in bankruptcy, at the time of the payment).
>
> **s 294-90 (Payment splits).** A debit arises **only if the Commissioner is notified in the
> \*approved form**, where a \*superannuation interest supporting a retirement-phase stream is
> subject to a **\*payment split** and both spouses become retirement phase recipients. Amount = the
> split proportion (member spouse) or the remaining proportion (non-member spouse) **of the \*value,
> on the day the debit arises**, of the supporting interest. Arises at the later of the Family Law
> Act operative time and the start of the day you first have a transfer balance account.

### ITAA 1997 ss 294-230, 294-235 — excess transfer balance tax and earnings — VERBATIM

> **294-230(1)** *If there is an \*excess transfer balance period for your \*transfer balance
> account, you are liable to pay \*excess transfer balance tax **imposed by the *Superannuation
> (Excess Transfer Balance Tax) Imposition Act 2016*** for the period.* **Note:** The **amount** of
> the tax is set out in that Act.
> **294-230(2)** *An **excess transfer balance period** … is a **continuous period of one or more
> days** during which, **at the end of each day**, there is \*excess transfer balance in the account.*
> **294-230(3)** *Your \*excess transfer balance tax is worked out by reference to the **sum of**:
> (a) your \*excess transfer balance **earnings** for each day in the \*excess transfer balance
> period; and (b) for each day in the excess transfer balance period that is also a day in the period
> mentioned in subsection 294-25(2) (the **determination period**) — the amount worked out by
> multiplying the rate mentioned in subsection 294-235(2) for the day by the sum of your excess
> transfer balance earnings for each **previous** day in the determination period.*
>
> **294-235(1)** *Your **excess transfer balance earnings** for a day is worked out by **multiplying
> the rate mentioned in subsection (2) for that day by the amount of your \*excess transfer balance
> at the end of that day**.*
> **294-235(2)** *The rate is **the lower of**: (a) the rate worked out under **subsection 8AAD(1) of
> the *Taxation Administration Act 1953*** for the day (the **GIC base rate — a daily rate**); and
> (b) a rate determined under subsection (3) for the day.*
> **294-235(3)** *The Minister may, by legislative instrument, determine a rate for a day.*

**So the base of the tax is NOT the excess itself. It is the notional *earnings* on the excess,
compounded daily** (item 3 of the s 294-25 credit table capitalises each day's earnings back into
the account at the start of the next day), **plus a second-order term under s 294-230(3)(b) for the
determination period**, during which s 294-25(2) switches the crediting off but s 294-230(3)(b)
keeps charging notional earnings-on-earnings.

### *Superannuation (Excess Transfer Balance Tax) Imposition Act 2016* (Act **No. 80 of 2016**) — VERBATIM, WHOLE ACT

Retrieved **two** ways on 2026-09-09: the Federal Register of Legislation document for title id
**`C2016A00080`** (`type='Primary'`, `format='Word'`, `volumeNumber=0`, `asat=2026-09-01`) — which
returns the **as-made** text with no compilation number, i.e. **the Act has never been amended** —
and the ATO Legal Database at `DocID=PAC%2F20160080%2F<section>`.

> **3 Definitions.** In this Act:
> **excess transfer balance period** has the same meaning as in the *Income Tax Assessment Act 1997*.
> **notional earnings** means **the sum worked out under subsection 294-230(3)** of the *Income Tax
> Assessment Act 1997* for the excess transfer balance period.
>
> **4 Imposition of tax.** Excess transfer balance tax payable under section 294-230 of the *Income
> Tax Assessment Act 1997* is imposed.
>
> **5 Amount of tax.**
> **(1)** The amount of the excess transfer balance tax is:
> (a) **if the circumstances mentioned in subsection (2) apply — 30% of the person's notional earnings** for the excess transfer balance period; or
> (b) **in any other case — 15% of the person's notional earnings** for the excess transfer balance period.
> **(2)** For the purposes of paragraph (1)(a), the circumstances are:
> (a) the excess transfer balance period **starts on or after 1 July 2018**; and
> (b) the person **has previously been liable** to pay excess transfer balance tax for an excess transfer balance period **starting on or after 1 July 2018**.
>
> **6 Severability.** [constitutional saving — not modelled]

**There is no indexation provision anywhere in this Act.** It contains six sections and the whole of
its operative content is quoted above. **15% and 30% are frozen rates — confirmed frozen, not merely
"no indexation provision found":** the Act is four operative sections long and was read in full from
the Federal Register's own document; there is nothing else in it that could index them, and it has
never been amended since assent on 29 November 2016.

### TAA 1953 Schedule 1, Division 136 — determination, election, commutation authority — VERBATIM

Retrieved via `DocID=PAC%2F19530001%2FSch1-136-<n>` — **the brief's `Sch<N>-` prefix rule is
correct and necessary here too.** All inserted by **No 81 of 2016** (Sch 1 item 15), effective
1 January 2017, applicable on and after 1 July 2017. **None has been amended since.**

> **s 136-1 (What this Division is about).** *If you have excess transfer balance in your transfer
> balance account, the Commissioner **may require you and your superannuation income stream provider
> to reduce** the total amount of your superannuation income streams that are in the retirement phase.*
>
> **s 136-10 (Excess transfer balance determination).**
> **(1)** *If you have \*excess transfer balance in your \*transfer balance account **at the end of a
> day**, the Commissioner **may** make a written determination stating the amount of that excess
> transfer balance.* **Note:** *It is **not necessary** for the Commissioner to issue a determination
> … if the Commissioner becomes aware that you no longer have an excess transfer balance. **You are
> still liable to pay excess transfer balance tax if no determination is issued**: see Subdivision
> 294-F of the ITAA 1997.*
> **(2)** A determination under this section is an **excess transfer balance determination**.
> **(3)** The amount of \*excess transfer balance stated in it is a **crystallised reduction amount**.
> **(4)** The Commissioner may amend or revoke it **at any time before a commutation authority relating to it is issued** under s 136-55.
> **(6)–(7)** The determination **must include a default commutation notice** naming the provider(s)
> and stream(s) that will be commuted, and the amount (or method) for each, if you do not elect.
>
> **s 136-20 (Electing to commute a different superannuation income stream).** Applies if you receive
> a determination and are the retirement phase recipient of **2 or more** streams. You **may elect**
> which stream(s) to commute. The election must be in the **\*approved form** and given to the
> Commissioner **within 60 days** after the determination is issued (or a further period allowed).
> **An election under this section is irrevocable.**
>
> **s 136-55 (Issuing of commutation authorities).** The Commissioner **must** issue a commutation
> authority if a determination has been issued, not revoked, the 60-day election period has ended,
> and a **commutable amount** greater than nil remains after reducing the crystallised reduction
> amount by transfer balance debits notified under s 136-25. Each authority states a **reduction
> amount**; the total of all reduction amounts **must not exceed the commutable amount**.
>
> **s 136-80 (Obligations on superannuation income stream providers).**
> **(1)** *A \*superannuation income stream provider issued with a commutation authority … must,
> **within 60 days** after the commutation authority is issued, pay by way of commutation …, a
> \*superannuation lump sum equal to the **lesser of**: (a) the **reduction amount** stated in the
> commutation authority; and (b) the **\*maximum available release amount** for the \*superannuation
> interest that supports the specified superannuation income stream.*
> **(2)** Exception — a **\*capped defined benefit income stream**: the provider **may choose not to comply**.
> **(3)** Exception — the retirement phase recipient **has died**: the provider **may choose not to comply**.
>
> **s 136-70 (Notifying of non-commutable excess transfer balance).** The Commissioner **must**
> notify you in writing if, after a determination, the debits since the determination fall short of
> the crystallised reduction amount, you still have excess transfer balance, and **either** your only
> retirement-phase streams are **capped defined benefit income streams** **or** you are **no longer a
> retirement phase recipient of any** stream. **Note:** a debit arises when that notice issues — s
> 294-80(1) item 7. (This is the safety valve that closes an account that cannot be commuted down.)

---

# ANALYSIS

Two independent retrieval-and-analysis passes are merged below: **§A**, which came at the cap from the
indexation side (ss 294-35, 294-40, Subdiv 960-M, ABS CPI), and **§B**, which came at it from the
account side (the s 294-25 credit table, the s 294-80 debit table, and the modelling triage those
tables force). Their findings, unknowns, traps and open items are reproduced here with their
confidence labels intact and their IDs renumbered into non-colliding ranges: **§A holds U9–U15,
T58–T72, O40–O45; §B holds U16–U20, T73–T86, O46–O50.** Sections **C** (excess and enforcement) and
**D** (the s 307-80 entry test and TRIS conversion) are **PENDING**; **U21+, T87+ and O51+ are
reserved for them.**

---

## A. The cap and its indexation

**Retrieval date:** 2026-09-09 · **Forecast year:** FY2026-27 · **Cluster:** ITAA 1997 ss 294-35,
294-40; Subdiv 960-M (ss 960-265, 960-270, 960-280, 960-285); ABS CPI index numbers.
Every provision quoted below was fetched on the retrieval date. Nothing is from memory; the fetch
log for this pass belongs to §7 (PENDING — not yet merged).

---

### A.1 How a Person's personal transfer balance cap is determined

There are **two** caps and the statute names them differently. The **general transfer balance cap**
is a single national figure per financial year. **Your transfer balance cap** — the ATO and
LCR 2016/9 call it the *personal* transfer balance cap — is a per-Person number that is seeded from
the general cap once and then never touches it again.

> **294-35(1)** Your **transfer balance cap** for the \*financial year in which you **first start to
> have a \*transfer balance account** is equal to the \***general transfer balance cap** for that
> financial year.
> **Note:** The amount of the transfer balance cap is modified for **child recipients**: see Subdivision 294-E.
>
> **294-35(2)** Your **transfer balance cap** for a **later** \*financial year is equal to **your
> transfer balance cap for the previous year**, subject to **section 294-40** (which is about
> proportional indexation).
>
> **294-35(3)** The **general transfer balance cap** is: (a) for the **2017-2018** \*financial year —
> **$1,600,000**; or (b) for the 2018-2019 financial year or a later financial year — the amount
> worked out by **indexing annually** the amount mentioned in paragraph (a).
> **Note:** Subdivision 960-M shows how to index amounts. However, **annual indexation does not
> necessarily increase the amount of the cap**: see section 960-285.

(ITAA 1997 s 294-35, ATO Legal Database, retrieved 2026-09-09. **primary-verified.**)

The mechanics that follow from those three subsections:

1. **The seed.** The personal cap is set **once**, from the general cap for the financial year in
   which the transfer balance account *starts*. The account starts on "the **later** of: (a) 1 July
   2017; and (b) the day you **first start to be** a \*retirement phase recipient" (s 294-15(2),
   quoted verbatim earlier in this file). The seeding year is therefore a **property of the Person's
   history**, not of the forecast year.
2. **The default is stickiness, not tracking.** s 294-35(2) carries last year's *personal* cap
   forward. It does **not** re-read the general cap. A Person who seeded at $1,600,000 in FY2017-18
   and never qualified for a s 294-40 increase still has a $1,600,000 personal cap in FY2026-27,
   while the general cap is $2,100,000 — a **$500,000 divergence** on the same day.
3. **The only way the two converge or diverge** is s 294-40. There is no other operative provision
   in Subdiv 294-B that moves a personal cap. (Subdiv 294-E modifies it for **child recipients** —
   s 294-35(1) note — and Subdiv 294-D modifies *credit amounts* for capped defined benefit income
   streams. Neither was read in this pass; see O43.)

**When they diverge.** They are equal only in the seeding year, and thereafter only for a Person who
has received the *full* indexation increase every year — i.e. whose highest-ever end-of-day transfer
balance has always been nil or less (s 294-40(3)) or, with the whole-percent rounding, has always
been under 1% of their cap. **For every Person who has actually used their cap, the personal cap is
strictly below the general cap from the first indexation event onwards, and the gap is permanent and
compounding.** This is confirmed by ATO Law Companion Ruling LCR 2016/9 para 15B:

> **15B.** When you commence to have a transfer balance account, you will also commence to have a
> personal transfer balance cap. Your transfer balance cap limits the total amount of capital you can
> transfer to the retirement phase to support superannuation income streams.

**Do not model "the transfer balance cap" as a single config figure.** The general cap is config
(§A.4); the personal cap is **per-Person state** (§A.3, §A.6).

---

### A.2 Proportional indexation, precisely

> **294-40(1)** This section applies to **increase** your **transfer balance cap** for a \*financial
> year (**other than the financial year in which you first start to have a \*transfer balance
> account**) if:
> (a) the \*general transfer balance cap is **increased as a result of indexation** for the financial year; and
> (b) **at no time before the start of that financial year has the \*transfer balance in your transfer balance account at the end of a day exceeded your transfer balance cap**.
>
> **294-40(2)** Your **transfer balance cap** is increased for the \*financial year by the amount
> worked out using the following formula:
>
> > **Unused cap percentage × Indexation increase**
>
> where:
> **indexation increase** means the amount by which the \*general transfer balance cap for the
> \*financial year **increased as a result of indexation**.
> **unused cap percentage** is worked out by:
> (a) identifying the **highest \*transfer balance** in your \*transfer balance account **at the end of any day up to the end of the previous \*financial year**; and
> (b) identifying **the day** on which the transfer balance account had that transfer balance at the end of the day, **or, if your transfer balance account had that transfer balance at the end of more than one day, the earliest of those days**; and
> (c) **expressing the transfer balance identified in paragraph (a) as a percentage (rounded down to the nearest whole number) of your \*transfer balance cap on the day identified in paragraph (b)**; and
> (d) **subtracting the result of paragraph (c) from 100%**.
>
> **294-40(3)** However, if the highest \*transfer balance mentioned in paragraph (a) of the
> definition of **unused cap percentage** in subsection (2) is **less than nil**, that unused cap
> percentage is **taken to be 100%**.

(ITAA 1997 s 294-40, ATO Legal Database, retrieved 2026-09-09 — fetched independently today and
character-for-character identical to the text already in this file. **primary-verified.**)

#### The four operands, named exactly

| Operand | What it is | Where it comes from |
|---|---|---|
| **Numerator** | The **highest transfer balance at the end of any day**, over every day from the account's start to **the end of the previous financial year** | s 294-40(2)(a) — per-Person state |
| **Denominator** | **Your transfer balance cap on the day identified in (b)** — the *personal* cap as it stood on the high-water day, **not** the general cap and **not** the current cap | s 294-40(2)(c) — per-Person state |
| **Measurement moment** | **The end of a day.** Every day. Not "at each credit", not "at 30 June" | s 294-40(2)(a) "at the end of any day" |
| **The day** | The **earliest** day on which the maximum was attained, where it was attained more than once | s 294-40(2)(b) |

#### Rounding — the direction is load-bearing and it favours the taxpayer

Paragraph (c) rounds the **used** percentage **down** to a whole number. Paragraph (d) then
subtracts. Because the rounding happens *before* the subtraction, **rounding the used percentage
down rounds the unused percentage up.** 87.5% used becomes 87%, so 13% unused — not 12.5%, and not
12%. There is **no rounding at all applied to the resulting dollar increase**, and none is needed:
the indexation increase is always a multiple of $100,000 (§A.4), and an integer percentage of
$100,000 is always a whole multiple of $1,000.

**Invariant a test can assert** (*derived by arithmetic from primary-verified provisions*): a
personal transfer balance cap is always a **whole multiple of $1,000**, because it is a multiple of
$100,000 (the seed) plus a sum of integer-percent slices of multiples of $100,000. It is never a
figure with cents. If the engine ever produces $2,038,271.65, the rounding step has been dropped.

#### Hand example 1 — LCR 2016/9 Example A1, worked end to end (golden fixture)

The ATO's own two-step worked example, quoted verbatim from LCR 2016/9 (a **public ruling** binding
on the Commissioner under TAA 1953, except as to excess transfer balance tax):

> **17D.** Ryuk commences a superannuation income stream on 1 March 2018 valued at $1.4 million. His
> transfer balance account commences on this date and is credited with $1.4 million.
> **17E.** Ryuk's personal transfer balance cap is equal to the general transfer balance cap for the
> financial year in which the account commenced, which is $1.6 million. …
> **17F.** On 1 July 2021, the general transfer balance cap is increased as a result of indexation by
> $100,000 to $1.7 million. …
> **17G.** … • unused cap percentage: $1.4 million (highest balance) ÷ $1.6 million = 0.875
> • expressed as a percentage and rounded down = 87% • subtract 87% from 100% = 13%
> • transfer balance increase: $100,000 × 13% = $13,000.
> **17H.** On 1 July 2021, Ryuk's personal transfer balance cap is indexed to $1.613 million. …
> **17I.** On 31 December 2022, Ryuk commenced another superannuation income stream. The value … is
> $125,000. Ryuk's transfer balance account is credited with $125,000, taking his transfer balance to
> $1.525 million.
> **17J.** On 1 July 2023, the general transfer balance cap is increased again due to indexation, this
> time by $200,000 to $1.9 million. …
> **17K.** … • unused cap percentage: $1.525 million (highest balance) ÷ **$1.613 million** = 0.945
> • expressed as a percentage and rounded down = 94% • subtract 94% from 100% = 6%
> • transfer balance increase: $200,000 × 6% = $12,000.
> **17L.** On 1 July 2023, Ryuk's personal transfer balance cap is indexed by a further $12,000 to
> $1.625 million …

Re-derived from the statute, digit by digit:

**Step 1 — FY2021-22.**
- Account start 1 Mar 2018 (FY2017-18) → seed cap `= general cap FY2017-18 = $1,600,000` (s 294-35(1)).
- s 294-40(1): FY2021-22 is not the seeding year ✔; general cap rose $1,600,000 → $1,700,000, so
  `indexation increase = $100,000` ✔; highest end-of-day balance $1,400,000 never exceeded
  $1,600,000 ✔.
- (a) highest end-of-day balance to 30 Jun 2021 = **$1,400,000**. (b) earliest such day =
  **1 Mar 2018**. (c) personal cap on 1 Mar 2018 = **$1,600,000**;
  `1,400,000 / 1,600,000 = 0.875 = 87.5%` → **rounded down to 87%**. (d) `100% − 87% = 13%`.
- Increase `= 13% × $100,000 =` **$13,000**. Personal cap FY2021-22 `= $1,600,000 + $13,000 =` **$1,613,000**.

**Step 2 — FY2023-24.** (Note FY2022-23 got nothing: the general cap stayed $1,700,000, so
s 294-40(1)(a) failed and `indexation increase = $0`.)
- New credit $125,000 on 31 Dec 2022 → end-of-day balance $1,525,000, a **new** high-water mark.
- (a) highest end-of-day balance to 30 Jun 2023 = **$1,525,000**. (b) earliest such day =
  **31 Dec 2022**. (c) **personal cap on 31 Dec 2022 = $1,613,000** — *not* the general cap for
  FY2022-23 of $1,700,000. `1,525,000 / 1,613,000 = 0.9454432…= 94.54432…%` → **rounded down to 94%**.
  (d) `100% − 94% = 6%`.
- `indexation increase = $1,900,000 − $1,700,000 = $200,000`. Increase `= 6% × $200,000 =` **$12,000**.
- Personal cap FY2023-24 `= $1,613,000 + $12,000 =` **$1,625,000** (s 294-35(2)).

**Exact dollar answers: $1,613,000 (FY2021-22) and $1,625,000 (FY2023-24).** Both reproduce the ATO
ruling to the dollar. If the engine used the general cap ($1,700,000) as the step-2 denominator it
would get `1,525,000/1,700,000 = 89.70…%` → 89% used → 11% unused → $22,000 → **$1,635,000**, a
**$10,000 overstatement of headroom**.

#### Hand example 2 — this project's own years, with a commutation (the high-water mark)

Person P, FY2026-27 forecast:

- **1 Sep 2025** — starts an account-based pension valued **$1,200,000**. Transfer balance account
  starts that day (s 294-15(2)(b)); credit $1,200,000 (s 294-25(1) item 2). Personal cap for
  FY2025-26 `= general cap FY2025-26 =` **$2,000,000** (s 294-35(1)).
- **15 Mar 2026** — P commutes $300,000 and receives the lump sum. Debit $300,000 (s 294-80(1) item
  1, "at the time you receive the superannuation lump sum"). End-of-day transfer balance
  **$900,000**.
- **1 Jul 2026** — general cap rises $2,000,000 → $2,100,000, so `indexation increase = $100,000`.

Applying s 294-40 for FY2026-27:
- (1): not the seeding year ✔ (seeded FY2025-26); general cap increased by indexation ✔;
  no end-of-day balance ever exceeded $2,000,000 ✔ (the maximum was $1,200,000).
- (2)(a) **highest end-of-day balance up to 30 Jun 2026 = $1,200,000.** The 15 Mar 2026 debit does
  **not** reduce it — see §A.3.
- (2)(b) earliest day it was attained = **1 Sep 2025**.
- (2)(c) personal cap on 1 Sep 2025 = $2,000,000. `1,200,000 / 2,000,000 = 60.0%` → rounded down =
  **60%**.
- (2)(d) `100% − 60% =` **40%**.
- Increase `= 40% × $100,000 =` **$40,000**.

**Personal transfer balance cap for FY2026-27 = $2,000,000 + $40,000 = $2,040,000.**
Available cap space at 1 Jul 2026 `= $2,040,000 − $900,000 =` **$1,140,000**.

**The trap made numeric.** An engine that used the *current* balance ($900,000) instead of the
high-water mark would compute `900,000/2,000,000 = 45%` used → 55% unused → `$55,000` → cap
**$2,055,000** and headroom **$1,155,000**. It over-states the Person's permanent tax-free capacity
by **$15,000**, forever, and compounds at every subsequent indexation event.

#### Hand example 3 — the rounding direction, isolated

Person Q starts a pension on **1 Jul 2025** valued **$1,234,567**. Personal cap FY2025-26 =
$2,000,000. Indexation increase for FY2026-27 = $100,000.

`1,234,567 / 2,000,000 = 0.6172835 = 61.72835%` → **rounded down to 61%** used → **39%** unused →
`39% × $100,000 =` **$39,000** → personal cap FY2026-27 = **$2,039,000**.

| Wrong implementation | Result | Error |
|---|---|---|
| round the **used** percentage to nearest (62%) | $38,000 → $2,038,000 | −$1,000 |
| don't round at all (38.27165% unused) | $38,271.65 → $2,038,271.65 | −$728.35, and produces cents |
| round the **unused** percentage down (38%) | $38,000 → $2,038,000 | −$1,000 |
| round the **unused** percentage up from the unrounded (39%) | $39,000 → $2,039,000 | correct **by accident** — diverges when the used percentage is an exact integer |

That last row is why the test must include an **exact-integer** case: at $1,200,000/$2,000,000 = 60%
exactly, "round used down" gives 40% unused, while "round unused up" gives 40% too — but at
$1,220,000/$2,000,000 = 61% exactly, "round used down" → 39%, and a `ceil(unused)` implementation
also → 39%. The two only separate on non-integers, so a fixture set of *only* clean numbers will not
distinguish them. Use $1,234,567.

#### Hand example 4 — s 294-40(3), the negative balance

s 294-80(1) item 2 debits a **structured settlement contribution** at "the later of: (a) the time the
contribution is made; and (b) the start of the day you first start to have a \*transfer balance
account". A Person who received a $500,000 personal-injury structured settlement contribution in
2010 and then starts a $300,000 pension on 1 Sep 2025 has, at the end of that day, credits $300,000
less debits $500,000 = **−$200,000**. s 294-30(2) permits this ("**Note 2: There is NO consequence
for having a negative transfer balance**"; LCR 2016/9 para 20: "Your transfer balance can be less
than zero").

Without s 294-40(3) the formula would give `−200,000/2,000,000 = −10%` used → `100% − (−10%) = 110%`
unused → `110% × $100,000 = $110,000`, i.e. **more than the whole indexation increase**.
s 294-40(3) caps it: the unused cap percentage **is taken to be 100%**, so the increase is exactly
$100,000 and the FY2026-27 personal cap is **$2,100,000** — the full general cap.

**A percentage above 100% is never reachable and a negative unused percentage is never reachable.**
(3) closes the bottom; s 294-40(1)(b) closes the top, because a balance exceeding the then-current
cap disapplies the section entirely. So `unusedCapPercentage ∈ [0, 100]` as integers — a cheap
assertion.

---

### A.3 HIGHEST-EVER tracking — the crux of P3-9

**What is tracked is the highest-ever *balance*, in dollars — not the highest-ever proportion of cap
used.** The statute is explicit: s 294-40(2)(a) identifies "the **highest \*transfer balance** in
your \*transfer balance account at the end of any day". "Transfer balance" is a dollar amount defined
by s 294-30(2) as "the sum of the \*transfer balance **credits** … **less** … the \*transfer balance
**debits**". The *percentage* is computed downstream, in paragraph (c), from that dollar figure and
from the cap on the day the dollar figure was attained.

**This distinction has money in it.** Consider two high-water candidates: $1,400,000 on 1 Mar 2018
(cap $1,600,000 → 87.5% used) and $1,500,000 on 1 Mar 2022 (cap $1,613,000 → 93.0% used). If the
engine tracked the highest *proportion* it would pick the second either way here — but reverse the
figures: $1,500,000 on 1 Mar 2018 (93.75% of $1,600,000) and $1,550,000 on 1 Mar 2022 (96.09% of
$1,613,000). Highest **balance** is $1,550,000; highest **proportion** is also the second. Now make
the second $1,550,000 against a cap of $1,700,000 (91.2%): the highest *balance* is still $1,550,000
(→ 91% used → 9% unused) but the highest *proportion* is the first (93% used → 7% unused). The two
rules give **different answers**, and only the balance rule is the statute. *(This construction
requires a cap that grew between the two dates — which is exactly what happens to anyone who received
an indexation increase, i.e. exactly the population s 294-40 applies to.)*

**Granularity: daily, at the end of the day.** Not at each credit or debit event. LCR 2016/9 makes
the consequence explicit for a same-day credit-and-debit pair:

> **51.** Because her transfer balance is measured at the **end of a day**, Alice has never had an
> excess transfer balance (because the relevant credit and debit both arose on the same day, 1 July
> 2017) and is eligible to increase her transfer balance cap by indexation in future years.

So an intraday spike above the cap that is reversed the same day **never happened** for both
s 294-40(1)(b) and s 294-40(2)(a). An engine that evaluates the maximum after each individual credit
would wrongly bar such a Person from indexation for life.

**A later debit does NOT reduce it. It is a true high-water mark that never falls.** The text is
"the highest transfer balance … at the end of **any** day **up to** the end of the previous financial
year" — a maximum over a closed set of past days, and a debit creates a *new, lower* day; it does not
edit an old one. Hand example 2 above is the fixture: P's balance falls to $900,000 but the numerator
stays $1,200,000. LCR 2016/9 para 17A states it in terms: "Your personal transfer balance cap will be
proportionally indexed based on the **highest balance** of your transfer balance account."

**A Person whose account has ever equalled or exceeded the cap gets nothing, permanently.** Two
separate mechanisms produce this and they must not be conflated:

| Case | Mechanism | Effect |
|---|---|---|
| End-of-day balance **exceeded** the then-current personal cap | **s 294-40(1)(b)** — the section does not apply at all, in that year or any later year ("at no time before the start of that financial year") | permanent bar |
| End-of-day balance **equalled** the then-current personal cap | s 294-40 applies, but (2)(c) gives 100% used → (2)(d) gives **0% unused** → increase of `0 × anything = $0` | nil increase, and permanent because the high-water mark never falls |

LCR 2016/9 collapses the two:

> **17.** … However, if your transfer balance has **ever equalled or exceeded** your transfer balance
> cap at the end of a day, you will **permanently lose your entitlement** to increase your transfer
> balance cap by indexation in future years.
>
> **17O.** On 1 July 2021, although the general transfer balance cap is increased to $1.7 million,
> Ryuk's personal transfer balance cap will remain at $1.6 million. He is not entitled to indexation
> on 1 July 2021 (or any future indexation …) because his transfer balance **equalled** his personal
> transfer balance cap.

**The bar is not "had excess transfer balance".** LCR 2016/9 para 76 separates them for the
transitional period:

> **76.** … even though your excess transfer balance is **disregarded** for the transitional period up
> to 31 December 2017, your transfer balance **has still exceeded** your transfer balance cap and you
> will **not** be entitled to increase your transfer balance cap as a result of proportional
> indexation.

So a Person can have been relieved of excess transfer balance tax and still be barred from
indexation. An engine that keys the bar off "was ever liable to excess transfer balance tax" is wrong.

**The other half of the crux: the transfer balance account is a *transaction* ledger valued at
commencement, not a market-value ledger.** Nothing about how the underlying pension actually performs
touches it. LCR 2016/9:

> **24A.** That means a superannuation interest that supports a superannuation income stream that
> increases in value because of **investment earnings** does not have its growth reflected in your
> transfer balance account. Similarly, a superannuation interest … that **decreases in value because
> of investment losses or a drawdown** of superannuation income stream benefits does not have that
> reduction reflected in your transfer balance account.
> **24B.** This is because investment earnings and losses … and amounts paid to you to comply with
> the minimum drawdown requirements are **not debit or credit events**.
> **25.** Consequently, making a large pension drawdown does **not** reduce your transfer balance and
> would not bring you under your transfer balance cap. You must **commute** an amount … in order to
> reduce your transfer balance …
> **27.** Investment returns and payments made to Darius to meet minimum drawdown requirements change
> the value of the superannuation interest supporting his pension. Because of this, the value of his
> superannuation interest at 1 July 2019 is $1.05 million. These changes, however, do **not** cause a
> credit or debit to arise in his transfer balance account and his **transfer balance remains $1.1
> million**.

This is primary-verified independently from the tables already in this file: the s 294-25 credit table
has no item for earnings on a retirement-phase interest (only item 3, earnings on an *excess*), and
the s 294-80 debit table has no item for a pension payment or an investment loss. **Argument from the
absence of a table item — labelled as such** — but corroborated in terms by a binding public ruling,
so the combined confidence is high.

**Consequence for the engine: the transfer balance account is a *second, parallel ledger* to the
Person's actual super balance, and the two diverge from day one.** The engine already models
Retirement Phase balances that grow and are drawn down (`src/core/superPhase.ts`,
`src/core/minimumDrawdown.ts`). The transfer balance account must be a separate accumulator that is
touched **only** by the s 294-25 and s 294-80 events.

#### State the engine must persist across financial years, per Person

Everything below is per-**Person** (never per-Household — s 294-15 is addressed to "you"), survives
a financial-year boundary, and is seeded from the Person's history, not from the forecast:

| # | Field | Type | Starting point | Written when |
|---|---|---|---|---|
| 1 | `transferBalanceAccountStartDay` | date \| null | `null` until the Person first becomes a retirement phase recipient; then **the later of 1 July 2017 and that day** (s 294-15(2)) | once |
| 2 | `personalTransferBalanceCap` | Cents (multiple of $1,000) | the **general cap for the FY containing field 1** (s 294-35(1)) | carried forward each FY (s 294-35(2)); increased at the start of an FY by s 294-40 |
| 3 | `transferBalance` | Cents, **may be negative** | 0 at account start | at each s 294-25 credit / s 294-80 debit |
| 4 | `highestEndOfDayTransferBalance` | Cents, **may be negative**, **monotone non-decreasing** | the end-of-day balance on the account's first day | end of every day: `max(prev, todayCloseBalance)` |
| 5 | `highestBalanceDay` | date | the account's first day | only when field 4 **strictly increases** — never on a tie (s 294-40(2)(b) takes the **earliest** of equal days) |
| 6 | `personalCapOnHighestBalanceDay` | Cents | the seed cap | snapshotted whenever field 5 is written |
| 7 | `hasEverExceededCap` | boolean, **latching** | `false` | end of every day: `\|= (todayCloseBalance > personalTransferBalanceCap_thatDay)` |

Notes on the design:

- **Field 5's tie rule is not decorative.** If the maximum is attained on several days, (b) takes the
  *earliest*, whose personal cap is the *lowest*, which gives the *highest* used percentage and the
  *smallest* increase. Writing field 5 on `>=` instead of `>` moves the denominator forward to a
  later, larger cap and **over-states** the Person's cap. In hand example 2, P's balance sits at
  $1,200,000 from 1 Sep 2025 to 14 Mar 2026 — 195 consecutive tied days.
- **Field 6 must be snapshotted, not recomputed.** Recomputing "the cap on the high-water day" later
  requires the Person's entire cap history; snapshotting is O(1) and exact.
- **Field 7 should be persisted explicitly even though it is *usually* derivable.** The derivation
  `field4 > field6` holds under the assumption that s 294-40 is the only thing that ever moves the
  personal cap: once the bar latches, the cap freezes, so any later higher balance is measured
  against the same frozen cap and also exceeds it. That assumption is **not verified** — Subdiv 294-E
  modifies the cap for child recipients (s 294-35(1) note) and was not read (O43). An explicit
  latching flag is also what a test can assert against, and it is what distinguishes the s 294-40(1)(b)
  bar from "had excess transfer balance", which is a different set (LCR para 76).
- **What is *not* per-Person state:** the general transfer balance cap and the per-FY **indexation
  increase**. Those are config (§A.4). But note that the increase for FY *n* requires the general cap
  for **both** FY *n* and FY *n−1*, so the config must be a **series**, not one figure. `superCaps.ts`
  today has a single FY2026-27 value and throws `UnsourcedIndexBaseError` for any other year, so the
  FY2026-27 indexation increase of $100,000 is **not currently computable by this engine** (O44).

#### Order of operations at a financial-year boundary

s 294-40 increases the cap "for a financial year"; the general cap for that year is the indexed one.
So on 1 July:

```
1. capThisFY  = capPrevFY                                        # s 294-35(2)
2. if accountStartFY != thisFY
     and generalCap[thisFY] > generalCap[prevFY]                 # s 294-40(1)(a)
     and not hasEverExceededCap:                                 # s 294-40(1)(b)
       increase   = generalCap[thisFY] - generalCap[prevFY]      # "indexation increase"
       usedPct    = 100 if highestBalance < 0                    # s 294-40(3) short-circuit
                    else floor(100 * highestBalance / capOnHighestBalanceDay)
       unusedPct  = 100 - usedPct                                # (3): 100 if highestBalance < 0
       capThisFY  = capPrevFY + unusedPct * increase / 100
3. the day's credits and debits are then applied to `transferBalance`,
   and fields 4-7 are updated at the END of the day.
```

Note step 2's guard is `hasEverExceededCap` as at **the start of** the financial year
(s 294-40(1)(b): "at no time **before the start of** that financial year"). An exceedance occurring
*during* FY *n* does not claw back the increase already granted on 1 July of FY *n*; it bars FY *n+1*
onwards.

---

### A.4 Indexation mechanics of the general cap

**The gateway test the project uses is satisfied: the general transfer balance cap is CONFIG.**
It is **item 10A** of the s 960-265 table:

> **SECTION 960-265 The provisions for which indexation is relevant.** This table sets out the
> provisions for which indexation is relevant.
> … | **10A** | \*General transfer balance cap | section **294-35** | …

(ITAA 1997 s 960-265, retrieved 2026-09-09. **primary-verified.** Also confirms items 9, 10, 10B, 10C
as §3.2 records them, and s 960-270(3) routes items 8–12 away from the generic s 960-270 machinery to
s 960-285: "This section does not apply in relation to amounts mentioned in the provisions listed at
items 8 to 12, or at item 14, in section 960-265.")

The mechanics, from s 960-285 (retrieved 2026-09-09, **primary-verified**):

> **960-285(1)** This section applies in relation to the amounts listed at **items 8 to 12** in section 960-265.
> **960-285(2)** You index the amount by: (a) first, multiplying its **base amount** mentioned in
> subsection (3) by its \*indexation factor mentioned in subsection (5); and (b) next, **rounding the
> result in paragraph (a) down to the nearest multiple of its \*rounding amount**.
> **960-285(3)** The amount (the **base amount**) … is: … (b) if the amount is mentioned in **item 9 or
> 10A** in section 960-265 — **the amount for the 2017-2018 financial year**; …
> **960-285(4)** You do **not index** the amount if the \*indexation factor is **1 or less**.
> **960-285(5)** … its **indexation factor** is: [\*Index number … for the **quarter ending on 31
> December just before the start of** the relevant income year or \*financial year] ÷ [\*Index number
> … for the **base quarter**] where **base quarter** means: … (b) if the amount is mentioned in item 9
> or **10A** … — **the quarter ending on 31 December 2016**; …
> **960-285(6)** You work out the \*indexation factor … **to 3 decimal places (rounding up if the
> fourth decimal place is 5 or more)**.
> **960-285(7)** … | **3** | Item 10A (general transfer balance cap) | the \*index number mentioned in
> subsection **960-280(1)** (which is about the **CPI**) | **$100,000** |

and s 960-280 (retrieved 2026-09-09, **primary-verified**):

> **960-280(1)** In most cases, the **index number** for a \*quarter is the **All Groups Consumer
> Price Index number (being the weighted average of the 8 capital cities) first published by the
> Australian Statistician for the quarter**.
> **960-280(3)** If the Australian Statistician **changes the index reference period** for an \*index
> number, **only index numbers published in terms of the new index reference period are to be used
> after the change**.

**When it takes effect.** s 960-285(5) keys the numerator to "the quarter ending on 31 December **just
before the start of** the relevant … financial year", and s 294-35(3)(b) sets the cap "for the
2018-2019 financial year or a later financial year". So the FY2026-27 general cap is fixed by the
**December 2025 quarter CPI** and applies **from 1 July 2026**. The December quarter CPI is published
by the ABS in late January, so the figure is knowable roughly five months ahead — and *not* knowable
for FY2027-28 today (O40).

#### Cross-check against register §3.2 — no conflict found

| §3.2 claim | Verdict |
|---|---|
| `index_ratio = index(31 Dec quarter before the FY) / index(base quarter)` — s 960-285(5) | ✔ confirmed verbatim |
| `factor = round to 3 dp, rounding up if the 4th decimal ≥ 5` — s 960-285(6) | ✔ confirmed verbatim |
| `if factor <= 1: cap unchanged` — s 960-285(4) | ⚠ **wording is wrong, arithmetic is right in practice.** s 960-285(4) says "You do not index **the amount**", and the amount for the FY under s 294-35(3)(b) is the *base amount* $1,600,000 — **not** last year's cap. In a deflation year the cap would revert to $1,600,000, not hold at $2,100,000. (*Inference from reading s 960-285(4) with s 294-35(3)(b) together — labelled inference, not primary-verified in terms.* Practically unreachable: it needs CPI below its Dec 2016 level.) See T69. |
| `cap = floor_to_multiple(base_amount * factor, rounding_amount)` — s 960-285(2) | ✔ confirmed verbatim |
| "cumulatively from the original base amount and base quarter every year, never chained off last year's cap" | ✔ confirmed — s 960-285(2)(a) multiplies the *base amount*, (3)(b) fixes it at the 2017-18 amount, (5)(b) fixes the base quarter at 31 Dec 2016 |
| §3.2 table: item **10A**, index **CPI** (s 960-280(1)), base **$1,600,000** (2017-18), base quarter **31 Dec 2016**, rounding **$100,000** | ✔ all five confirmed verbatim |
| §3.2: "CPI … **as first published**; if the ABS re-bases, only new-reference-period numbers are used after the change (s 960-280(3))" | ✔ confirmed verbatim — **and this is now live, not theoretical: the ABS has re-referenced the CPI.** See §A.5 and U9 |

**One conflict of a different kind, in §3.1 rather than §3.2:** the General Transfer Balance Cap row
cites "ITAA 1997 s 294-35(3)" as a source for **$2,100,000** at `primary-verified`. s 294-35(3)
contains **$1,600,000** and the words "indexed annually"; it does not contain $2,100,000 and cannot.
Before today the $2.1m figure rested on an ATO web table plus a CCH editorial note — i.e.
`secondary-only`. §A.5 fixes that properly.

---

### A.5 The FY2026-27 figure — resolved, and now primary-derived for the first time

**Answer: $2,100,000 is correct for FY2026-27. The "$2 million from 1 July 2025" sentence is a stale
orphan on the contributions-caps page and is contradicted by the sentence immediately below it on the
same page.**

Three independent confirmations, retrieved today:

1. **ATO key rates — *Transfer balance cap*, "Last updated 27 April 2026"** (retrieved 2026-09-09):

   > **Table 26: General transfer balance cap** — 2026–27 | **2.1** · 2025–26 | 2 · 2024–25 | 1.9 ·
   > 2023–24 | 1.9 · 2022–23 | 1.7 · 2021–22 | 1.7 · 2020–21 | 1.6 · 2019–20 | 1.6 · 2018–19 | 1.6 ·
   > 2017–18 | 1.6

2. **The "conflict" is not a conflict.** On the ATO *Contributions caps* page ("Last updated 24 April
   2026"), the disputed sentence and the sentence that follows it read, in that order:

   > **"Note: The general transfer balance cap is $2 million from 1 July 2025."**
   > "**From 1 July 2025 to 30 June 2026, the general transfer balance cap was $2 million.** From 1
   > July 2023 to 30 June 2025, the general transfer balance cap was $1.9 million and from 1 July
   > 2021 to 30 June 2023 the general transfer balance cap was $1.7 million. …"

   The very next sentence puts the $2 million in the **past tense** with an explicit end date of
   30 June 2026. The Note is an un-updated remnant of the FY2025-26 edition of the page. **Register
   §3.1's instruction to ignore it is correct**, and this is now demonstrated on the page's own text
   rather than argued from other pages.

3. **The statute plus the Australian Statistician's own numbers reproduce $2,100,000 exactly — and
   reproduce the entire published series.** This is the confirmation the register did not have.
   ABS CPI, All Groups, weighted average of eight capital cities, index numbers, retrieved from the
   ABS SDMX API on 2026-09-09 (dataflow `ABS,CPI,2.0.0`, series `1.10001.10.50.Q`):
   **Dec 2016 = 76.38** and **Dec 2025 = 100.32**.

   ```
   s 960-285(5): 100.32 / 76.38            = 1.313433…
   s 960-285(6): 3 dp, 4th decimal is 4    → 1.313
   s 960-285(2)(a): 1,600,000 × 1.313      = 2,100,800
   s 960-285(2)(b): floor to $100,000      = 2,100,000      ✔
   ```

   The same two provisions and the same base reproduce **every** published year:

   | FY | Dec quarter CPI | ratio | factor (3dp) | $1.6m × factor | floor $100k | ATO published |
   |---|---|---|---|---|---|---|
   | 2018-19 | 77.87 | 1.019508 | 1.020 | 1,632,000 | **1,600,000** | 1.6 ✔ |
   | 2019-20 | 79.24 | 1.037444 | 1.037 | 1,659,200 | **1,600,000** | 1.6 ✔ |
   | 2020-21 | 80.70 | 1.056559 | 1.057 | 1,691,200 | **1,600,000** | 1.6 ✔ |
   | 2021-22 | 81.40 | 1.065724 | 1.066 | 1,705,600 | **1,700,000** | 1.7 ✔ |
   | 2022-23 | 84.23 | 1.102776 | 1.103 | 1,764,800 | **1,700,000** | 1.7 ✔ |
   | 2023-24 | 90.85 | 1.189447 | 1.189 | 1,902,400 | **1,900,000** | 1.9 ✔ |
   | 2024-25 | 94.53 | 1.237628 | 1.238 | 1,980,800 | **1,900,000** | 1.9 ✔ |
   | 2025-26 | 96.81 | 1.267478 | 1.267 | 2,027,200 | **2,000,000** | 2.0 ✔ |
   | **2026-27** | **100.32** | **1.313433** | **1.313** | **2,100,800** | **2,100,000** | **2.1 ✔** |

   **Nine for nine.** This closes register open item **O11** ("CPI index numbers for Dec 2016 and Dec
   2025 — not retrieved") and upgrades the FY2026-27 general cap from a figure copied off an ATO
   table to one **derived from the statute and the Statistician's published index numbers**:
   `primary-verified`, on the right sources this time.

**Two things this exercise exposes, both of which matter more than the answer:**

**(a) FY2026-27 cleared the $100,000 step by $800.** `1,600,000 × 1.313 = 2,100,800`. Had the factor
been 1.312 the product would be $2,099,200 and the cap would have **stayed at $2,000,000**. One
thousandth of the indexation factor is worth $1,600 at this base, and the margin was half of that.
A copied-constant approach is not merely inelegant here; the figure genuinely turns on the third
decimal place of a ratio.

**(b) The ABS has re-referenced the CPI, and the re-reference changes the factor.** The older ABS
series (dataflow `ABS,CPI,1.1.0`, reference base 2011-12 = 100) gives Dec 2016 = **110.0** and stops
at Sep 2025 = 143.6 — there is **no Dec 2025 number on the old base**. The current series
(`ABS,CPI,2.0.0`) gives Dec 2016 = **76.38**. Because both are published to a fixed number of
decimals, the ratio of the *rounded* published numbers is not identical on the two bases, and in two
years it lands on a different third decimal:

| FY | new-base factor | old-base factor | same cap? |
|---|---|---|---|
| 2018-19 | 1.020 | 1.019 | yes ($1.6m) |
| 2020-21 | 1.057 | 1.056 | yes ($1.6m) |
| 2021-22 | 1.066 | 1.065 | yes ($1.7m) |
| 2024-25 | 1.238 | 1.237 | yes ($1.9m) |

No published year is changed by the choice, but **the mechanism that could change one is real** and
sits directly on top of the $800 margin in (a). s 960-280(3) is the tie-breaker — "only index numbers
published in terms of the **new** index reference period are to be used **after the change**" — and
on its plain words the new-base pair (76.38, 100.32) is the correct one, which is also the pair that
reproduces $2,100,000. **Flagged as U9**, not smoothed over: the engine must store *which reference
base* an index number came from, and must never mix bases across the numerator and denominator.

**One residual caveat, stated rather than hidden.** s 960-280(1) says "**first published**". The
number first published for the December 2016 quarter was 110.0, not 76.38. 76.38 is a *re-referenced*
restatement. It is s 960-280(3), not s 960-280(1), that authorises using it, and s 960-280(3) speaks
of using new-base numbers "after the change" without saying in terms that a historic base quarter is
restated onto the new base. The reading is close to inescapable (the alternative — 100.32 ÷ 110.0 —
is absurd) and it reproduces every published figure, but it is **a reading, not a recital**. Labelled
inference from primary text; see U9.

---

### A.6 Is the personal cap computable by this tool, or is it a Setting?

**It is a Setting for every Person whose transfer balance account started before the forecast start
date, and this must be said in the interface, not buried.**

The personal cap for FY2026-27 is a function of five things the tool does not and cannot have:

1. **The account's start day** (s 294-15(2)) — determines which year's general cap seeds the cap.
2. **The general cap series back to that day** — the tool has *one* year (§A.3, O44).
3. **Every credit and debit since then, dated** (ss 294-25, 294-80) — the s 294-25 item 2 credit is
   "the **\*value on the starting day**" of the interest, a historical valuation.
4. **The high-water mark and the earliest day it was attained.**
5. **The personal cap on that day** — which is itself the recursive output of steps 1–4 for every
   prior year.

**And there is no shortcut from the current balance.** The natural (wrong) instinct is "take the
Person's current pension balance and treat it as the transfer balance". LCR 2016/9 paras 24A–27
(quoted in §A.3) rule this out from both directions:

- The current pension balance is **not an upper bound** on the transfer balance. A pension started at
  $1,600,000 in 2018 and drawn down and hit by a bad year may be worth $900,000 today while the
  transfer balance is still $1,600,000. The Person may have **zero** remaining cap space while
  holding $900,000.
- It is **not a lower bound** either. Investment growth is invisible to the account: a pension started
  at $1,100,000 and now worth $2,000,000 still has a transfer balance of $1,100,000, and the Person
  has $940,000 of headroom (against a $2,040,000-ish personal cap) that a balance-based estimate would
  deny them.

So the error is **unsigned and unbounded in both directions**. That rules out a "conservative
approximation".

**Design conclusion — a named refusal, in the project's idiom.** For a Person with a pre-existing
retirement-phase income stream, the engine must not derive a personal transfer balance cap. It should
require the state as Settings and raise a named error if asked to forecast retirement-phase entry
without them — by analogy with `MixedSaptoFamilyThresholdError` (O30) and `MidYearProportioningError`
(O39). Suggested: **`UnknownPersonalTransferBalanceCapError`**, carrying the list of fields the user
must supply.

**What the user can actually supply.** The ATO publishes the individual's transfer balance account —
including their personal transfer balance cap and their highest-ever balance — in ATO online services
(myGov → Australian Taxation Office → Super → Information → Transfer balance cap). That is where a
real user gets fields 1, 2, 4, 5, 6 and 7 of the §A.3 table. **This project has not verified the
exact labels or the shape of that screen** (U14), so the Settings prompt must be written from a
verified screenshot or ATO guidance page before it ships.

**Where the tool *is* fully self-sufficient:** a Person who has **never** been a retirement phase
recipient before the forecast starts. For them the account starts inside the forecast, the seed cap is
the general cap for the seeding year (which the engine holds for FY2026-27), s 294-40 does not apply
in the seeding year at all, and every subsequent credit and debit is generated by the engine's own
Scenario. That Person's personal cap is **fully computable and should be computed, not asked for.**
The refusal must be scoped to the pre-existing-pension case only.
---

## B. The transfer balance account — credits and debits

**Cluster:** the transfer balance account — credits and debits (ITAA 1997 Subdiv 294-B, Subdiv 294-D,
ITAR 2021 Div 294 regs, s 307-65, s 307-70, s 307-205, reg 307-205.02).
**Retrieval date:** 2026-09-09 · **Forecast year:** FY2026-27.
Every provision quoted below is either already verbatim in the raw-text part of this file
(lines 59–252) or was fetched by this pass; the fetch log belongs to §7 (PENDING — not yet merged).

### B.1 When the account starts, and when it ends

Two provisions, and they are not symmetrical.

**Start** — s 294-15, verbatim (research doc lines 198–203):

> **(1)** *You have a **transfer balance account** if you are, **or have at any time been**, the
> \*retirement phase recipient of a \*superannuation income stream.*
> **(2)** *You **start to have** the \*transfer balance account on the **later** of: (a) 1 July 2017;
> and (b) the day you **first start to be** a \*retirement phase recipient of a \*superannuation
> income stream.*

**End** — s 294-45, verbatim (research doc lines 223–224):

> *The \*transfer balance account **ceases when the \*retirement phase recipient dies**.*

So the exact trigger for the start is *becoming a retirement phase recipient* — which s 294-20(1)
defines as the conjunction of (a) the stream being **in the retirement phase** (s 307-80) and (b) a
stream benefit being **payable to you**. The exact date is the **day** that first happens, floored at
1 July 2017.

The exact trigger for the end is **death**, and nothing else. There is **no other terminating event
in Subdiv 294-B**. In particular:

- fully commuting every pension does **not** close the account. s 294-15(1) is drafted in the past
  tense — "*or have at any time been*" — precisely to keep the account open. LCR 2016/9 ¶12 states
  the same: "*You continue to have a transfer balance account even if you subsequently cease to be a
  retirement phase recipient of a superannuation income stream. You only cease to have a transfer
  balance account when you die.*"
- the balance in a still-open account can be **negative** and that is harmless. s 294-30(2) Note 2:
  "*There is NO consequence for having a negative transfer balance.*" LCR 2016/9 ¶20: "*Your transfer
  balance can be less than zero.*"

**Why this matters to the money and not just the bookkeeping.** The account's *start year* fixes the
personal cap permanently under s 294-35(1) — "*Your **transfer balance cap** for the \*financial year
in which you **first start to have** a \*transfer balance account is equal to the \*general transfer
balance cap for that financial year*" — and s 294-35(2) carries that number forward, uplifted only by
the s 294-40 proportional indexation. Because the account never closes and never restarts, a Person
who started a $200,000 pension in FY2017-18 is locked to a **$1.6m** base cap forever, indexed
proportionally on 87.5%→**88%** unused (s 294-40(2)(c) rounds the *used* percentage **down**, so the
unused percentage is rounded **up**), while a Person who first starts a pension in FY2026-27 gets a
**$2.1m** base cap. Starting a token pension early is therefore *cap-destroying*, and closing it
again does not undo the damage. Confidence: **primary-verified**.

**Household consequence.** The account, the balance and the cap are all defined per individual —
"*You* have a transfer balance account", "*Your* transfer balance cap". There is **no provision
anywhere in Div 294 that aggregates, pools or transfers cap between spouses**. For a two-person
forecaster this means two independent accounts and two independent caps, and a couple with $3.6m in
super cannot put $2.6m into one Person's pension and $1.0m into the other's without the first
breaching. Confidence: **labelled inference from the absence of an aggregation provision**, with the
positive limb (per-individual drafting of ss 294-15, 294-30, 294-35) `primary-verified`.

---

### B.2 The complete credit table (s 294-25(1), plus the item-5 regulations)

s 294-25(1) opens: "*The following table sets out **when a credit arises** in your \*transfer balance
account and **the amount** of the credit.*" The table is the exhaustive statement of credit events,
subject only to item 5 (regulations) and to Subdiv 294-D's substitution of *special value* for
*value*.

| # | Trigger (verbatim, s 294-25(1)) | Value credited | Day the credit arises |
|---|---|---|---|
| **1** | "*just before **1 July 2017**, you are the \*retirement phase recipient of a \*superannuation income stream*" | "*the \*value, **just before 1 July 2017**, of the \*superannuation interest that supports*" it | 1 July 2017; **or**, if reversionary beneficiary, the last day of the 12 months beginning when a stream benefit first became payable |
| **2** | "*on a day (the **starting day**) on or after 1 July 2017, **you start to be the \*retirement phase recipient** of a \*superannuation income stream*" | "*the **\*value on the starting day** of the \*superannuation interest that supports*" it | **on the starting day**; **or**, if reversionary beneficiary, **at the end of the 12 months beginning on the starting day** (value still the *starting-day* value) |
| **3** | "*you have **\*excess transfer balance at the end of a day***" | "*your **\*excess transfer balance earnings** for that day*" (s 294-235: excess at end of day × the lower of the s 8AAD(1) TAA daily GIC base rate and any Ministerial rate) | "***at the start of the next day***" — i.e. daily capitalisation |
| **4** | a credit arises under **s 294-55** because of an **LRBA repayment** | "*the amount of the credit specified in section 294-55*" = the **increase in \*value** of the retirement-phase interest caused by the payment; only where the interest is in a **\*small superannuation fund** | at the time of the payment |
| **5** | a credit arises under **regulations** made for the purposes of item 5 | per the regulations | per the regulations |

**What actually sits in item 5.** Three regulations in the *Income Tax Assessment (1997 Act)
Regulations 2021*, all fetched this pass, and **none of them touches an ordinary account-based
pension**:

- **reg 294-25.01** — *Payment of consideration for interest supporting deferred superannuation
  income stream*: applies where you are the retirement phase recipient of a **deferred**
  superannuation income stream and, after you started to be, "*you pay an amount of consideration for
  the superannuation interest*". "*(2) The amount of the credit is the amount of the consideration.
  (3) The credit arises at the time you pay the consideration.*"
- **reg 294-25.02** — *Commutation of certain capped defined benefit income streams*: a lump sum from
  commuting a **capped defined benefit income stream** on or after 1 July 2017 that "*is transferred
  directly to the purchase of a superannuation income stream … covered by an item of the following
  table*" (life-expectancy and market-linked pensions/annuities) "*and is in the retirement phase*".
- **reg 294-25.03** — *Capped defined benefit income streams: transfers to successor funds*: credit
  equal to the item-6 debit that arose on the old stream, arising "*on the day you start to be the
  retirement phase recipient of the new stream*". Its subsection (4) **switches off table item 2** for
  that stream, so the two do not double up.

**Modifier — Subdiv 294-D.** s 294-25 Note 1 says the credit amount "*is modified for certain capped
defined benefit income streams: see Subdivision 294-D*". s 294-135(1) does that modification:
"*Section 294-25 applies in relation to a \*capped defined benefit income stream as if a reference in
that section to the \*value of a \*superannuation interest were a reference to the \*special value of
the superannuation interest.*" See B.6.

**Suppression of item 3 during a determination period.** s 294-25(2): "*Despite item 3 … **no credit
arises** … because of \*excess transfer balance at the end of a day if the day is in the period*"
running from the Commissioner's excess transfer balance determination to the day the debits since it
equal or exceed the crystallised reduction amount (or an intervening credit arises). Note the sting
in the tail: s 294-230(3)(b) keeps charging tax on notional earnings-on-earnings across the same
period, so the *account* stops growing but the *tax* does not.

#### B.2.1 The valuation rule for a stream that starts in retirement phase — the place implementers go wrong

**The credited value is the value of the supporting interest ON THE COMMENCEMENT DAY. It is not the
1 July value, not the prior 30 June closing balance, and not the Total Super Balance.**

Item 2 says so in terms: "*the **\*value on the starting day** of the \*superannuation interest that
supports the superannuation income stream*". The only case in which 1 July is the right day is when
the pension actually commences on 1 July. Confidence: **primary-verified**.

The word "value" is itself defined. **s 307-205** (fetched this pass, as amended by No 8 of 2026 with
effect 1 April 2026, which removed the old subsection numbering and repealed the accumulation-phase
value limb):

> *The **value** of a \*superannuation interest at a particular time is: (a) if the regulations
> specify a method for determining the value of the superannuation interest — that value; or (b)
> otherwise — the total amount of all the \*superannuation lump sums that could be payable from the
> interest at that time.*

For an **account-based** pension, limb (a) is empty. **reg 307-205.02(2)** specifies its method only
for streams *other than*, relevantly, "*a superannuation income stream … for which the rules
providing for the income stream or annuity are based on: … (ii) the amount available in the member's
account*". An account-based pension is exactly that, so the regulation excludes itself and **s
307-205(b)** governs: the value is the total of the lump sums that could be paid out of the interest
on that day — which, for a retirement-phase account-based pension, is the account balance, because
the whole interest is commutable. Confidence: **primary-verified** for the statutory chain;
`labelled inference` for the last step ("all of it is commutable, therefore value = balance"), which
rests on the ordinary account-based product having no commutation restriction once in retirement
phase. LCR 2016/9 works its examples on exactly that basis ("*commences an account-based pension
(pension A) with a $1.1 million value*", ¶26).

Three consequences the forecaster must get right:

1. **The credit is a one-shot photograph, not a running balance.** LCR 2016/9 ¶24: "*Once a
   superannuation income stream has commenced and a credit arises in your transfer balance account,
   subsequent changes in the value of the supporting superannuation interest do not affect your
   transfer balance.*" ¶27 works it: Darius commences at $1.1m on 1 July 2018; the interest is worth
   $1.05m on 1 July 2019; "*These changes, however, do not cause a credit or debit to arise in his
   transfer balance account and his transfer balance remains $1.1 million.*"
2. **The reversionary limb freezes the value at the starting day even though the credit lands twelve
   months later.** Item 2(b) delays the *arising*, not the *valuation*. LCR 2016/9 ¶38: "*A credit
   arises in Heather's transfer balance account on 1 August 2018 (12 months from the starting date).
   The credit amount is $1 million, which is equal to the value of the superannuation interest **on
   the starting day being 1 August 2017**.*"
3. **This is a different day from the one Schedule 7 uses for the minimum drawdown, and the two must
   not be unified.** Register §3.9 / T56 records that SISR Sch 7 cl 1(2)(a)(ii) reads the
   **commencement-day** balance in the commencement year and the **1 July** balance in every later
   year. The transfer balance credit reads the commencement-day value **once, ever**, and never reads
   1 July at all. A shared "pension balance as at" helper that serves both is a bug waiting to
   happen.

---

### B.3 The complete debit table (s 294-80(1), plus the item-8 regulations)

| # | Trigger (verbatim, s 294-80(1)) | Value debited | Day the debit arises |
|---|---|---|---|
| **1** | "*you receive a \*superannuation lump sum because a \*superannuation income stream of which you are a \*retirement phase recipient is **commuted, in full or in part***" | "*the amount of the superannuation lump sum*" | "***at the time you receive the superannuation lump sum***" |
| **2** | "*a \*structured settlement contribution is made in respect of you*" (defined in s 294-80(2) by reference to s 292-95 — personal injury settlements/orders) | the amount of the contribution | the **later** of the contribution and "*the start of the day you first start to have a \*transfer balance account*" |
| **3** | a debit arises under **s 294-85** — "*an event that results in reduced superannuation*" | per s 294-85: the reduction in value (fraud/dishonesty with a **conviction**), or the amount paid to the trustee in bankruptcy under a s 139ZQ *Bankruptcy Act 1966* notice | per s 294-85 (time of the loss / time of the payment) — **and only if you notify the Commissioner in the \*approved form** |
| **4** | a debit arises under **s 294-90** — a **\*payment split** | the split proportion (member spouse) or remaining proportion (non-member spouse) "*of the \*value, **on the day the debit arises***" | later of the Family Law Act operative time and the start of the day you first have an account — **and only if the Commissioner is notified in the approved form** |
| **5** | the stream "*stops being in the \*retirement phase under subsection 307-80(4)*" (provider failed to comply with a commutation authority within 60 days) | "*the \*value … **at the end of the period within which the commutation authority was required to be complied with***" | at the end of that period |
| **6** | the stream "*stops being a superannuation income stream that is in the \*retirement phase at a time (the **stop time**), **but items 1 and 5 do not apply***" | "*the \*value … **just before the stop time***" | **at the stop time** |
| **7** | the Commissioner gives a **s 136-70 notice** (non-commutable excess transfer balance) | "*the amount of the \*excess transfer balance **stated in the notice***" | when the Commissioner issues the notice |
| **8** | a debit arises under **regulations** made for item 8 | per the regulations | per the regulations |

**What sits in item 8** (fetched this pass; again, nothing that touches an account-based pension):

- **reg 294-80.01** — a **CPI-exclusive reduction in the amount of a capped defined benefit income
  stream benefit** (items 1–2 lifetime products, or a prescribed stream). Debit = the drop in
  **special value** between the earlier and later benefit entitlements; arises "*at the later time*".
  Expressly excludes a shortfall attributable to "*a CPI adjustment*".
- **reg 294-80.02** — a **deferred** superannuation income stream under reg 307-205.02C that would
  have had an item 5 or 6 debit but for reg 294-80.03. Debit = "*the total amount of the
  superannuation benefits that would be payable if you voluntarily caused the superannuation interest
  to cease at that time*".
- **reg 294-80.03** — made under s 294-80(3): "*items 5 and 6 of the table in subsection 294-80(1) of
  the Act **do not apply** to deferred superannuation income streams mentioned in subsection
  307-205.02C(1)*".

**Modifier — s 294-145** re-writes item 1 for capped defined benefit income streams: it substitutes,
for "the amount of the superannuation lump sum", the ***debit value*** of the supporting interest
just before a full commutation, or a fraction of it for a partial commutation. See B.6.

#### B.3.1 The two debits an intuitive reader expects and does not get

**(i) Investment earnings growth in the pension account does NOT create a credit.**

There is no item in the s 294-25(1) table that is triggered by the interest growing. Item 3 is
triggered by *excess transfer balance*, and its amount is *notional earnings on the excess*, not
actual fund earnings. Item 4 is triggered by an *LRBA repayment*, and even then only where the value
increase comes from moving money across from a non-retirement-phase interest (s 294-55; LCR 2016/9
¶39C).

Epistemic basis, stated honestly: the positive limb is `primary-verified` — s 294-25(1) is drafted as
an exhaustive statement ("*The following table sets out when a credit arises*") and each of its five
items has been read in full, as have all three item-5 regulations. The negative limb is an
**argument from the absence of a provision**, and must be labelled as such. It is, however, an
unusually well-corroborated absence: LCR 2016/9 — a **public ruling**, binding on the Commissioner
under the TAA except as to excess transfer balance tax — says it twice:

> **¶24A.** "*a superannuation interest that supports a superannuation income stream that increases in
> value **because of investment earnings** does not have its growth reflected in your transfer balance
> account.*"
> **¶39F.** "*increases in the value of your superannuation interest from other factors other than a
> payment in respect of an LRBA (such as capital appreciation) will not increase your transfer
> balance.*"

Composite label: **`primary-verified` (exhaustive-table reading, all items and regulations read) +
public-ruling-corroborated; the negative is an argument from absence.**

**(ii) A pension payment (drawdown) does NOT create a debit.**

This one is *stronger than an argument from absence*, and the difference matters. Item 1 — the only
debit that a withdrawal could plausibly fall under — requires that "*you receive a \*superannuation
**lump sum**…*". **s 307-65(1)** (fetched this pass) defines the term by exclusion:

> *A **superannuation lump sum** is a \*superannuation benefit that **is not** a \*superannuation
> income stream benefit (see section 307-70).*

A minimum-drawdown pension payment *is* a superannuation income stream benefit (s 307-70(1): "*a
\*superannuation benefit specified in the regulations that is paid from a \*superannuation income
stream*"), and therefore **cannot be** a superannuation lump sum, and therefore **cannot** satisfy
item 1. That is a positive definitional exclusion, not a gap. The residual absence element is only
that no other item 2–8 covers a drawdown either, which is checkable by inspection of the table above.

Corroborated by LCR 2016/9:

> **¶24A.** "*a superannuation interest … that decreases in value because of investment losses or **a
> drawdown of superannuation income stream benefits** does not have that reduction reflected in your
> transfer balance account.*"
> **¶24B.** "*investment earnings and losses … **and amounts paid to you to comply with the minimum
> drawdown requirements are not debit or credit events**.*"
> **¶25.** "***Consequently, making a large pension drawdown does not reduce your transfer balance and
> would not bring you under your transfer balance cap.** You must commute an amount of your
> superannuation income stream in order to reduce your transfer balance…*"

Composite label: **`primary-verified`** (s 294-80(1) item 1 + s 307-65(1) + s 307-70(1)), public-ruling
corroborated.

**(iii) The consequence, which is the single largest modelling error available in this cluster.**

The transfer balance is a **cumulative record of transfers into retirement phase**, not a valuation
of the retirement-phase assets. It is monotonically non-decreasing except at the eight named debit
events. Over a 30-year forecast the pension *account balance* falls (drawdowns exceed earnings) while
the *transfer balance* stands still. An implementer who models the transfer balance as "the current
value of the retirement-phase interests" will:

- **understate** breach risk at commencement — because a Person who commences at $2.05m and draws it
  down looks compliant forever under the wrong model, and is compliant under the right one too, so
  this direction is benign; but
- **catastrophically understate the cost of a second commencement.** Under the wrong model, a Person
  who commenced $1.5m in 2027, drew it to $1.1m by 2035, and then commences a second pension with
  $900,000 appears to be at $2.0m against a $2.1m+ cap — compliant. Under the law they are at
  $1.5m + $900k = **$2.4m** against a cap that never indexed past its FY2027 base (because s
  294-40(1)(b)/(2) freezes indexation entitlement in proportion to the highest balance ever reached),
  and they are in **excess by roughly $300k**, accruing daily notional earnings taxed at 15% and then
  30%, plus a compulsory commutation.
- **wrongly offer "just draw more out" as a remediation.** LCR 2016/9 ¶25 forecloses it in terms.
  The only member-side lever is a **commutation**.

**(iv) The commutation/pension-payment distinction is a characterisation, not an amount.**

The same $100,000 leaving the same pension account on the same day produces a **$100,000 debit** if
it is a partial commutation and **zero debit** if it is a pension payment. s 307-65(2): "*Treat a lump
sum payment arising from a **partial commutation** of a \*superannuation income stream as a
**superannuation lump sum** for the purposes of this Act (other than Subdivision 295-F).*" What makes
it one rather than the other is the member's act, not the arithmetic — LCR 2016/9 ¶41: "*A commutation
… occurs where the member **consciously and validly exercises their right** to exchange some or all
of their entitlement to receive future superannuation income stream benefits for an entitlement to be
paid a superannuation lump sum.*" And per ¶43 the debit arises on **receipt of the lump sum**, not on
the instruction: "*if you instruct your superannuation income stream provider to commute … on 1 July
2017 and, due to processing times, the superannuation income stream provider commutes … on 7 July
2017, the debit arises on 7 July 2017*". Note also that a partial commutation does **not** count
toward the SISR Sch 7 minimum — a point owned by §3.9, not restated here — so the two
characterisations differ in *both* directions and cannot be collapsed.

**A forecaster cannot infer the characterisation from a cashflow.** This is the cleanest case in the
cluster for a user-supplied Setting (B.5).

---

### B.4 The TRIS conversion credit — the conversion limb of P3-8

**Answer: a table item 2 credit, equal to the value of the whole supporting interest on the day the
TRIS enters retirement phase, arising on that day.**

There is no special TRIS provision. The mechanism is a composition of three sections already
verbatim in the research doc plus s 294-25 item 2:

1. **s 307-80(3)** takes a TRIS *out* of retirement phase while the recipient is not a reversionary
   beneficiary **and** either "(b)(i) *has not satisfied* a condition of release specified in
   paragraph (2)(c)" or "(b)(ii) *has satisfied* a condition of release specified in subparagraph
   (2)(c)(i), (ii) or (iii), **but has not notified the \*superannuation income stream provider** …
   of that fact".
2. When s 307-80(3) stops applying, s 307-80(1) applies on its own terms — the stream **is** in
   retirement phase because a stream benefit is payable from it — and s 294-20(1) makes the member a
   **retirement phase recipient** on that day.
3. **s 294-25(1) item 2** then fires: "*on a day (the **starting day**) on or after 1 July 2017, you
   start to be the \*retirement phase recipient of a \*superannuation income stream*" → a credit of
   "*the **\*value on the starting day** of the \*superannuation interest that supports*" it, arising
   "*(a) **on the starting day***".

**Which day is the starting day?** Two different answers, and the split runs down the middle of
s 307-80(2)(c):

- **Retirement (item 101), terminal medical condition (102A), permanent incapacity (103)** — these
  are subparagraphs (2)(c)(i), (ii), (iii), i.e. exactly the set enumerated in s 307-80(3)(b)(ii).
  For these, the exclusion persists until the member **notifies the provider**. The starting day is
  the **day of notification**, not the day the condition was met. LCR 2016/9 Example 1B is exactly on
  point:

  > **¶30D.** "*Raj **retires on 30 June 2019**, meeting a relevant condition of release, and
  > **notifies the superannuation provider** that pays the TRIS of his retirement **on 15 July 2019**.
  > The TRIS is in the retirement phase on 15 July 2019 (the time of notifying the superannuation
  > provider of his retirement) and Raj commences to have a transfer balance account on 15 July 2019.
  > The credit that arises in his transfer balance account is equal to the **value of the
  > superannuation interest supporting the TRIS on 15 July 2019**.*"

  Note what this straddles: retirement on 30 June 2019 (FY2018-19), notification on 15 July 2019
  (FY2019-20). The account start year — and hence the **personal cap under s 294-35(1)** — is set by
  the notification, so a fortnight's paperwork moved Raj's base cap from the FY2018-19 general cap to
  the FY2019-20 one. In a forecast the same fortnight can be worth six figures of cap.

- **Attaining age 65 (item 106)** — this is subparagraph (2)(c)**(iv)**, and (2)(c)(iv) is
  **conspicuously absent** from the list in s 307-80(3)(b)(ii). So on the 65th birthday: (b)(i) is
  false (a condition of release in para (2)(c) *has* been satisfied) and (b)(ii) is false (item 106 is
  not one of (i)–(iii)); s 307-80(3) therefore cannot apply, and the TRIS is in retirement phase
  under s 307-80(1) **automatically, with no notification and no member act at all**. The starting
  day is the **65th birthday**. The ATO states the same in LCR 2016/9 ¶15 first bullet — a TRIS is not
  in retirement phase unless a benefit is currently payable and the recipient "*is 65 years old or
  older, or … has met a relevant condition of release with a nil cashing restriction (retirement,
  terminal medical condition, permanent incapacity) **and they have notified** …*" — and works it in
  Example 1A ¶30B: "*As Robert was over 65 on 1 July 2017, the TRIS is in the retirement phase and
  Robert is a retirement phase recipient.*" Confidence: **primary-verified** on the structure of
  s 307-80(3)(b), public-ruling-corroborated. But see **U16** for a real textual anomaly in the
  overlap case.

**What value is credited.** The value of the **whole** supporting interest on that day — s 307-205(b),
i.e. the full account balance, **including every dollar of earnings the TRIS accumulated during the
years it was in the pre-retirement phase**. There is no carve-out for growth. A TRIS commenced at
$800,000 at 60 and converting at 65 at $1,050,000 credits **$1,050,000**, not $800,000. The years in
TTR phase are invisible to the account (no credit was ever taken, because the stream was never in
retirement phase — s 294-15(2)(b)); the whole balance arrives at once on conversion day.

**What does NOT happen on conversion:**

- **No debit.** A TRIS converting is the *same* stream changing phase, not a cessation and
  recommencement. Debit item 6 requires a stream "*of which you **were** a \*retirement phase
  recipient*" to *stop being* in retirement phase — the opposite direction. Nothing in the debit table
  is triggered by entry. Confidence: `primary-verified` on the direction of item 6; the "no other item
  applies" limb is an inspection of the eight-item table.
- **No second credit later.** Once converted, subsequent growth is invisible (B.3.1(i)).
- **No re-exit.** Once the member has satisfied a nil-cashing-restriction condition of release and
  notified (or turned 65), s 307-80(3)(b) can never be satisfied again on those facts, so the stream
  cannot fall back out of retirement phase by that route.

**For P3-8 the conversion limb therefore needs exactly three inputs:** the conversion **day**, the
account **balance on that day**, and — where conversion is by retirement rather than by age 65 —
whether/when the member **notified the provider**. The tool computes the balance; the day and the
notification are Settings (B.5).

---

### B.5 Modelling triage for a two-person household forecaster

Legend: **(a)** the tool can compute it · **(b)** must be a user-supplied Setting · **(c)** an
explicit named refusal.

#### Credits

| Item | Placement | Justification |
|---|---|---|
| **1** — retirement-phase recipient just before 1 July 2017 | **(c) refusal**, folded into a **(b)** Setting | The event is nine years in the past relative to the forecast year and cannot recur. A Person with a pre-2017 pension has an account whose opening balance and start year the tool cannot reconstruct. Refuse to *derive* it; require it as the opening-position Setting below. Named refusal: `PreForecastTransferBalanceNotDerivable`. |
| **2** — start to be a retirement phase recipient (new account-based pension **and** TRIS conversion) | **(a) compute**, on **(b)** inputs | The only credit the tool needs to get right. Amount = the modelled account balance on the commencement/conversion day; day = the commencement/conversion day. Both are already in the model (the same commencement day §3.9 needs for the Sch 7 pro-rate). The Settings it depends on are the conversion day and the notification fact — not the arithmetic. |
| **2 (reversionary limb)** | **(c) refusal** | Death benefits are out of scope by construction. It also carries the 12-month deferral and the starting-day-value freeze, neither of which is worth building for a tool that does not model death benefits. Named refusal: `ReversionaryPensionNotModelled`. |
| **3** — excess transfer balance earnings | **(c) refusal**, as a **hard constraint** | Computable in principle (s 294-235: excess × daily rate, capitalised at the start of the next day), but it needs the s 8AAD(1) TAA GIC base rate as a daily series and any Ministerial determination under s 294-235(3), and the tax on it is a second-order compounding term under s 294-230(3)(b) that keeps running after the account stops crediting. More importantly, **a plan that breaches the cap is not a plan with a tax line — it is an infeasible plan**: the Commissioner will issue a determination and force a commutation (TAA Sch 1 ss 136-10, 136-55, 136-80). The right output is a refusal, not a number. Named refusal: `TransferBalanceCapExceeded` — the tool should report the breach, the excess, and the commutation needed to clear it, and decline to forecast the tax. |
| **4** — s 294-55 LRBA repayment | **(c) refusal** | Requires an SMSF (or a fund with fewer than 7 members — "*\*small superannuation fund*", s 294-55(c) as substituted by No 47 of 2021) with a limited recourse borrowing arrangement, plus a fair-and-reasonable apportionment across members' retirement-phase interests (LCR 2016/9 ¶39E). Out of scope for a couple's own super. Named refusal: `LRBACreditNotModelled`. |
| **5** — regs 294-25.01 / .02 / .03 | **(c) refusal** | All three require either a **deferred** superannuation income stream or a **capped defined benefit** income stream. Neither exists in a two-person account-based forecast. Named refusal: `DeferredAndCappedDefinedBenefitCreditsNotModelled`. |

#### Debits

| Item | Placement | Justification |
|---|---|---|
| **1** — commutation lump sum | **(a) compute**, on a **(b)** characterisation Setting | The *amount* is computable (it is the lump sum). The *characterisation* is not: the identical cashflow is a debit if it is a partial commutation and nothing if it is a pension payment (s 307-65(1) vs (2); LCR 2016/9 ¶41). The tool must require the user to mark a withdrawal as a commutation and must **never infer** it. Also: the debit day is the day the lump sum is **received**, not instructed (LCR 2016/9 ¶43) — for an annual-step forecaster this is only material at a 30 June/1 July boundary. |
| **2** — structured settlement contribution | **(c) refusal** | s 294-80(2) → s 292-95: personal injury settlements and court orders. Not a retirement-planning input. Named refusal: `StructuredSettlementNotModelled`. |
| **3** — s 294-85 reduced superannuation | **(c) refusal** | Requires either a **conviction** for fraud or dishonesty, or a *Bankruptcy Act 1966* s 139ZQ notice, **and** notification to the Commissioner in the approved form. Unforecastable by construction. Named refusal: `FraudAndBankruptcyDebitsNotModelled`. |
| **4** — s 294-90 payment split | **(c) refusal** | Relationship breakdown. A household forecaster that models a couple as an ongoing unit has no coherent way to model its own dissolution; and the debit depends on an approved-form notification and a Family Law Act operative time. Named refusal: `PaymentSplitNotModelled`. Worth naming rather than ignoring, because it is the one out-of-scope item a *couples* tool will be asked about. |
| **5** — s 307-80(4) commutation-authority failure | **(c) refusal** | Downstream of an excess that the tool already refuses to model (item 3 above), and it is a provider compliance failure. Named refusal: subsumed in `TransferBalanceCapExceeded`. |
| **6** — stream stops being in retirement phase otherwise | **(c) refusal**, with **one** carve-out | The realistic triggers are a successor fund transfer (LCR 2016/9 ¶¶55N, 449) or a failure to meet the SIS pension standards (¶55E). Both are fund-side events. **The carve-out that must be stated:** a **full commutation** is item **1**, not item 6 — item 6 is expressly conditioned on "*items 1 and 5 do not apply*". An implementer who routes full commutations through item 6 gets the wrong *value* (the interest value just before the stop time, rather than the lump sum received) and, at a boundary, the wrong day. Named refusal: `StreamCeasedOutsideCommutationNotModelled`. |
| **7** — s 136-70 notice | **(c) refusal** | The safety valve for an excess that cannot be commuted away (only capped defined benefit streams remain, or the person is no longer a retirement phase recipient). Both antecedents are already refused. Named refusal: subsumed in `TransferBalanceCapExceeded`. |
| **8** — regs 294-80.01 / .02 | **(c) refusal** | Capped defined benefit benefit-reductions and deferred income streams. Named refusal: as for credit item 5. |

#### The Settings this cluster requires (all **(b)**), per Person

1. **Does this Person already have a transfer balance account, and in which financial year did it
   start?** Drives s 294-35(1). Cannot be derived; a Person may have started a pension before the
   forecast horizon. Without it the personal cap is wrong from year one.
2. **Opening transfer balance at the start of the forecast** (sum of credits less debits to date).
   Drives every headroom calculation.
3. **Highest end-of-day transfer balance ever reached, and the earliest day it was reached.** Drives
   the s 294-40(2) `unused cap percentage`. Distinct from (2) — a Person who commuted down has an
   opening balance below their historical high, and it is the **high** that governs indexation. This
   is the Setting implementers will most often collapse into (2).
4. **Pension/TRIS commencement day** for each planned stream (already needed by §3.9 for Sch 7 cl 3).
5. **TRIS conversion basis and day** — `age65` (automatic, on the birthday) or `retirement`, and for
   `retirement` the **notification day**, which may differ from the retirement day and may fall in a
   different financial year (LCR 2016/9 ¶30D).
6. **Withdrawal characterisation** — for each above-minimum withdrawal, `pensionPayment` or
   `partialCommutation`. Default must be `pensionPayment` (the conservative direction: it produces no
   debit, so it does not manufacture headroom the Person does not have).

Everything else in both tables is **(c)**. That is 5 of 8 debit items outright, plus 3 of 5 credit
items outright, plus the reversionary limb of item 2 and the whole of Subdiv 294-D — which is the
honest answer for a tool that models two people's own account-based super.

---

### B.6 Capped defined benefit income streams

**They appear in this cluster in five places**, so they cannot simply be ignored:

- **s 294-25 Note 1** — "*The amount of the transfer balance credit is **modified for certain capped
  defined benefit income streams: see Subdivision 294-D***."
- **s 294-30 Note** — "*There is a modification for certain capped defined benefit income streams: see
  Subdivision 294-D.*"
- **s 294-145** — special rules for **debits** on commutation.
- **TAA Sch 1 s 136-80(2)** — a provider issued a commutation authority for a capped defined benefit
  income stream "***may choose not to comply***".
- **TAA Sch 1 s 136-70** — the non-commutable-excess notice, whose first trigger is that your only
  retirement-phase streams are capped defined benefit income streams.

**Definition — s 294-130** (fetched this pass). A stream is a capped defined benefit income stream if
it is covered by an item of a 7-item table **and**, "*if it is covered by any of items 2 to 7 of that
table — it is in the \*retirement phase **just before 1 July 2017***". The table: item 1 lifetime
pension (SISR 1.06(2)); item 2 lifetime annuity (1.05(2)); item 3 life expectancy pension (1.06(7));
item 4 life expectancy annuity (1.05(9)); item 5 market linked pension (1.06(8)); item 6 market
linked annuity (1.05(10)); item 7 market linked RSA pension (RSAR 1.07(3A)). s 294-130(2) allows more
by regulation (reg 294-130.01 exists and was not read this pass — see **O49**).

Structurally important: **items 2–7 are a closed historical class** — they had to be in retirement
phase before 1 July 2017, so no new one can arise. Only **item 1**, a SIS lifetime pension, remains
open-ended. Confidence: **primary-verified**.

**Credit modification — s 294-135(1):** "*Section 294-25 applies in relation to a \*capped defined
benefit income stream as if a reference in that section to the \*value of a \*superannuation interest
were a reference to the **\*special value** of the superannuation interest.*" Special value is
**not** an account balance and cannot be derived from one:

- items 1–2 (lifetime): s 294-135(2), "***Annual entitlement × 16***", where annual entitlement is the
  first benefit payable just after that time divided by the whole days it relates to, × 365.
- items 3–7 (life expectancy, market linked): s 294-135(3), "***Annual entitlement × Remaining
  term***", remaining term being the years left, "*rounded up to the next whole number*".

**Excess modification — s 294-140.** This is the provision that makes capped defined benefit streams
genuinely different in kind: "*Despite section 294-30, you have **excess transfer balance** … if …
the transfer balance … (a) **exceeds** your \*transfer balance cap … **and** (b) **exceeds** your
capped defined benefit balance …*", and "*(2) The amount of the excess transfer balance is **the
lesser of the 2 excesses**.*" Combined with s 136-80(2) (provider may decline to comply), the design
is that a capped defined benefit stream **cannot on its own generate a commutable excess** — instead
Subdiv 303-A taxes the excess *income*. s 294-120: "*Certain defined benefit lifetime pensions that
are subject to commutation restrictions **cannot result in excess transfer balance** (instead,
Subdivision 303-A applies to the superannuation income stream benefits).*"

**Recommendation: an explicit named refusal, not special treatment.**

A capped defined benefit stream drags in: a valuation formula the tool cannot compute from an account
balance (there is no account balance); a second parallel balance (`capped defined benefit balance`,
s 294-140(3)); a lesser-of-two-excesses rule that replaces s 294-30 entirely; a substituted commutation
debit (`debit value`, s 294-145 with reg 294-145.01); a benefit-reduction debit under reg 294-80.01;
and a whole other Division (Subdiv 303-A) for the tax consequence. None of it composes with an
account-based model. Named refusal: **`CappedDefinedBenefitIncomeStreamNotModelled`** — raised when a
Person is flagged as holding a defined benefit pension, a lifetime annuity, or a market-linked
(term allocated) pension.

**The refusal must be reachable, not theoretical.** Australian retirees in CSS, PSS, MilitarySuper,
state schemes and pre-2017 market-linked pensions hold these in numbers. A forecaster that silently
treats a $60,000-a-year defined benefit pension as an account-based interest will credit the wrong
amount (it should be $60,000 × 16 = $960,000 of special value, not whatever balance the user typed)
and will apply the wrong excess rule. Refusing is the correct and the safe answer; guessing is not.

---

## C. Excess transfer balance — earnings, tax and correction

**Retrieval date for every fetch in this section: 2026-09-09.** Forecast year FY2026-27. Everything
quoted below was either already verbatim in this file's RAW PRIMARY TEXT section or was fetched in
this pass; the fetch log for this pass belongs to §7 (PENDING — not yet merged). Nothing here is
written from memory.

---

### C.1 The base of the tax is *earnings on the excess*, not the excess

s 294-230(1) makes you liable; s 294-230(3) says what the tax is worked out by reference to; and the
Imposition Act s 3 defines **notional earnings** as *"the sum worked out under subsection 294-230(3)"*.
So the chain is: **excess → daily earnings → summed → 15% or 30% of that sum.** The excess itself is
never taxed. `primary-verified`.

The daily figure, s 294-235(1), verbatim (ATO Legal Database, `PAC/19970038/294-235`, 2026-09-09):

> **294-235(1)** *Your **excess transfer balance earnings** for a day is worked out by multiplying the
> rate mentioned in subsection (2) for that day by the amount of your \*excess transfer balance at the
> end of that day.*
> **294-235(2)** *The rate is the lower of: (a) the rate worked out under subsection 8AAD(1) of the
> Taxation Administration Act 1953 for the day; and (b) a rate determined under subsection (3) for
> the day.*
> **294-235(3)** *The Minister may, by legislative instrument, determine a rate for a day.*

**Four load-bearing words in (1): "at the end of that day".** The measurement is a daily closing
balance, not an average and not an opening balance. Combined with s 294-230(2) — *"a continuous period
of one or more days during which, **at the end of each day**, there is \*excess transfer balance in
the account"* — a single day on which the account closes at or under the cap **breaks the period**.
Two 40-day excesses separated by one compliant day are two excess transfer balance periods, not one
81-day period. `primary-verified`.

#### C.1.1 The rate — s 8AAD(1), and the trap next door

TAA 1953 s 8AAD, fetched in full this pass, verbatim:

> **8AAD(1)** *The **general interest charge rate** for a day is the rate worked out by adding **7
> percentage points** to the base interest rate for that day, and dividing that total by **the number
> of days in the calendar year**.*
> **8AAD(1A)** *The **Division 296 general interest charge rate** for a day is the rate worked out by:
> (a) adding **3 percentage points** to the base interest rate for that day; and (b) dividing that
> total by the number of days in the calendar year.* — *[S 8AAD(1A) inserted by No 8 of 2026, s 3 and
> Sch 1 item 67, effective 1 April 2026.]*
> **8AAD(2)** *The **base interest rate** for a day depends on which quarter of the year the day is
> in. For each day in a quarter in the second column of the table, it is the monthly average yield of
> 90-day Bank Accepted Bills published by the Reserve Bank of Australia for the month in the third
> column…*
> | Item | For days in this quarter | …for this month applies |
> |---|---|---|
> | 1 | 1 January to 31 March | the preceding November |
> | 2 | 1 April to 30 June | the preceding February |
> | 3 | 1 July to 30 September | the preceding May |
> | 4 | 1 October to 31 December | the preceding August |
>
> **8AAD(3)** *If the monthly average yield … is not published … before the beginning of the relevant
> quarter, assume that it is the same as the last monthly average yield … published … before that month.*
> **8AAD(4)** *[Base interest rate rounded]* *The base interest rate must be rounded to the second
> decimal place (rounding .005 upwards).*

Five consequences the engine must carry:

1. **It is a *daily* rate, already divided.** s 8AAD(1) does the division. Dividing the ATO's published
   "GIC annual rate" a second time, or multiplying s 294-235's rate by 365 to "annualise" it, is a
   365× error in either direction.
2. **The divisor is the number of days in the *calendar* year, not the financial year.** A day in
   January–June 2028 divides by **366**; the day before it, 31 December 2027, divides by 365. An
   excess transfer balance period spanning a New Year uses two divisors even if the base interest
   rate has not moved.
3. **The rate moves quarterly, on calendar quarters** (1 Jan / 1 Apr / 1 Jul / 1 Oct), which do **not**
   align with the financial year. FY2026-27 contains four different base interest rates.
4. **s 8AAD(1A) is not this rate.** s 294-235(2)(a) points at *subsection 8AAD(1)* by number. The
   Division 296 rate (base **+3**, not +7) was inserted into the same section on 1 April 2026 and is
   already relevant to this project — register §3.7 carries Div 296. Feeding the +3 rate to the
   transfer balance machinery understates excess transfer balance tax by roughly 35%.
5. **Only the *base* rate is rounded, to 2 dp.** s 8AAD(4) rounds the base interest rate; nothing
   rounds the daily quotient. The ATO's published 8-decimal "GIC daily rate" is a display rounding,
   not the statutory number.

**The published numbers for the forecast year** — ATO, *General interest charge (GIC) rates*, page
last updated 4 September 2026, fetched 2026-09-09. `secondary-only` as to the values (the Commissioner
publishing his own calculation; the RBA yields themselves were not retrieved):

| Quarter | GIC annual rate (= base + 7) | ATO published daily rate | Exact daily rate (annual ÷ 365) |
|---|---|---|---|
| **1 Jul – 30 Sep 2026** | **11.43%** | 0.03131507% | 0.0003131506849315068… |
| **1 Oct – 31 Dec 2026** | **11.51%** | 0.03153425% | 0.0003153424657534247… |
| 1 Jan – 31 Mar 2026 | 10.65% | 0.02917808% | — |
| 1 Apr – 30 Jun 2026 | 10.96% | 0.03002740% | — |

**Feed the engine the base interest rate (or the annual rate) per calendar quarter, and let it do the
s 8AAD(1) division itself against the days in *that day's* calendar year.** A stored daily rate is a
stored rounding and a stored calendar-year assumption. This is **CONFIG, quarterly-keyed** — it is not
in the s 960-265 indexation table because it is not indexed at all; it is republished four times a
year off an RBA series.

**The s 294-235(2)(b) Ministerial floor.** The rate is the *lower* of the GIC daily rate and any rate
determined by the Minister under s 294-235(3). A search of the Federal Register of Legislation title
index on 2026-09-09 for `contains(name,'Excess Transfer')` returned exactly one title — the Imposition
Act itself — and `contains(name,'Transfer Balance')` returned three, none of them a rate determination
(F2024L01023 is an account-*value* regulation; F2017L01273 is event-based reporting). **On that
evidence no s 294-235(3) instrument has ever been made, so limb (b) is inert and the rate is the GIC
daily rate.** This is an **argument from the absence of an instrument, based on a title-name search
only** — not `primary-verified`; a determination named without either phrase would not have been
found. `unverified` → **U21**.

#### C.1.2 The excess compounds — s 294-25 table item 3

The earnings are credited straight back into the account:

> | **3** | you have \*excess transfer balance at the end of a day | your \*excess transfer balance earnings for that day | **at the start of the next day** |

So the excess at the end of day *n* is `E × (1+r)^(n−1)`, and day *n*'s earnings are `E × r × (1+r)^(n−1)`.
Summing a geometric series gives a closed form for a period at a single rate with no debits and no
determination:

```
notional earnings over N days  =  E × ( (1 + r)^N − 1 )
```

**Daily compounding, not simple interest, and not monthly or annual rests.** `primary-verified` — the
compounding is the joint effect of s 294-235(1) reading the balance "at the end of that day" and item
3 crediting "at the start of the next day", both quoted above.

#### C.1.3 Worked example — $200,000 excess, 90 days

Assume the excess arises at the end of 1 July 2026, persists for 90 days (1 July – 28 September 2026,
entirely inside the Jul–Sep quarter), no determination is issued in the period, no debits arise, and
the personal cap does not move. Rate: `r = 11.43 ÷ 100 ÷ 365 = 0.000313150684931507`.

| Day | Excess at end of day | Earnings that day | Credited |
|---|---|---|---|
| 1 | $200,000.00 | $62.6301 | start of day 2 |
| 2 | $200,062.63 | $62.6497 | start of day 3 |
| 3 | $200,125.28 | $62.6693 | start of day 4 |
| … | … | … | … |
| 90 | **$205,651.59** | $64.3999 | start of day 91 |

```
notional earnings = 200,000 × ((1.000313150684931507)^90 − 1)
                  = 200,000 × 0.02857993771820082
                  = $5,715.99          (exactly 5,715.98754364…)

tax @ 15%  =  $857.40                  (857.39813154…)
tax @ 30%  =  $1,714.80                (1,714.79626309…)
```

Cross-checks that a test should assert against:

| Variant | Notional earnings | Δ vs the correct figure |
|---|---|---|
| **Correct** — daily compounding, single quarter | **$5,715.99** | — |
| Simple interest, `200,000 × r × 90` | $5,636.71 | **−$79.28 (−1.39%)** — the compounding error |
| Same 90 days started 1 Aug 2026 (61 days @ 11.43%, 29 days @ 11.51%) | $5,729.06 | +$13.07 — the quarter-boundary error |
| Using the ATO's rounded 8-dp daily rate | $5,715.9878 | +$0.0003 — immaterial here, real at scale |
| Determination issued day 1, running the whole 90 days (see C.1.4) | $5,715.26 | −$0.73 |

**None of these figures is large.** That is itself the finding, and it drives §C.8:
a $200,000 breach held for a quarter costs **$857** in tax. Against a $2.1m cap the tax is noise. The
consequences that are *not* noise are the permanent loss of proportional cap indexation (s 294-40(1)(b),
§C.6) and the forced move of capital from a 0% environment to a 15% one (§C.7).

#### C.1.4 The determination period — the second-order term

Once a determination issues, s 294-25(2) **switches item 3 off**: *"**no credit arises** … under that
item because of \*excess transfer balance at the end of a day if the day is in the period: (a) starting
on the day the Commissioner makes an \*excess transfer balance determination … and (b) ending on: (i)
… the first day on which the sum of all \*transfer balance debits arising … since the determination was
issued **equals or exceeds the \*crystallised reduction amount**; or (ii) if a \*transfer balance credit
arises … before that day — the day on which that credit arises."*

The excess therefore **stops compounding** during the determination period. s 294-230(3)(b) puts a
hand-rolled substitute back:

> *(b) for each day in the excess transfer balance period that is also a day in the period mentioned in
> subsection 294-25(2) (the **determination period**) — the amount worked out by multiplying the rate
> mentioned in subsection 294-235(2) for the day by the sum of your excess transfer balance earnings
> for each **previous** day in the determination period.*

For a determination period of `D` days at a constant rate with a frozen excess `E`:

```
limb (a)  =  D · r · E
limb (b)  =  r² · E · D(D−1)/2
```

which is the first three terms of the binomial expansion of `E((1+r)^D − 1)` and therefore **very
close to, but not equal to,** true compounding. For the worked example run entirely as a determination
period: `(a) = $5,636.71`, `(b) = $78.55`, total `$5,715.26` against `$5,715.99` compounded — a 73-cent
gap on 90 days. **Two distinct formulae, not one.** An implementer who models only the compounding
form is right to within a rounding error and wrong in principle; one who models only limb (a) is out
by 1.4% over a quarter and by more over longer periods.

Note also that s 294-25(2)(b)(ii) ends the determination period **on the day any credit arises**, of
any kind — a new pension started while a determination is on foot re-arms daily compounding.

---

### C.2 The tax — rate, trigger, liability, timing

The *Superannuation (Excess Transfer Balance Tax) Imposition Act 2016* (Act No. 80 of 2016), whose
whole operative content is four sections and is quoted verbatim earlier in this file:

> **5 Amount of tax.**
> **(1)** The amount of the excess transfer balance tax is:
> (a) **if the circumstances mentioned in subsection (2) apply — 30% of the person's notional earnings** for the excess transfer balance period; or
> (b) **in any other case — 15% of the person's notional earnings** for the excess transfer balance period.
> **(2)** For the purposes of paragraph (1)(a), the circumstances are:
> (a) the excess transfer balance period **starts on or after 1 July 2018**; and
> (b) the person **has previously been liable** to pay excess transfer balance tax for an excess transfer balance period **starting on or after 1 July 2018**.

**What makes a breach "subsequent" — three precise things, all of which an implementer will get wrong
at least once.** `primary-verified`.

1. **It is not "the second breach". It is "a period starting on or after 1 July 2018 where a previous
   liability arose for a period that also started on or after 1 July 2018".** The 1 July 2018 date
   appears **twice**, in both paragraph (a) and paragraph (b), and both must hold. A pre-1 July 2018
   period never counts as the priming breach and never itself attracts 30%.
2. **The trigger is *previous liability*, not a previous determination, not a previous assessment, and
   not a previous notice.** s 136-10(1) Note: *"You are still liable to pay excess transfer balance tax
   if no determination is issued."* A first breach that the Commissioner never noticed still primes the
   30% rate.
3. **The tax is 30% of the *whole* second period's notional earnings, not 30% of some increment.** There
   is no blending and no tiering within a period.
4. **What separates two periods is a single compliant day** (s 294-230(2), C.1). So the difference
   between 15% and 30% can turn on whether the account closed one dollar under the cap on one day
   eighteen months earlier. This makes the 30% rate **path-dependent on the entire projection history**,
   not a property of the current year.
5. **The rates are frozen.** ITAA 1997 **s 960-265**, fetched in full this pass, lists the provisions
   for which indexation is relevant: item **10A** is *"\*General transfer balance cap — section 294-35"*.
   **There is no item for the Imposition Act, and none for excess transfer balance tax.** Combined with
   the whole-Act read (six sections, no indexation provision, never amended since assent), 15% and 30%
   are **constants**. This is `primary-verified` as to the s 960-265 table's contents and as to the
   Act's text; the *conclusion* that they cannot index is an argument from the absence of any indexing
   provision — but it is the strong form of that argument, since both candidate homes were read in full.

**Who is liable: the individual, personally.** s 294-230(1): *"**you** are liable to pay \*excess
transfer balance tax"*. Not the fund, not the trustee.

**When it is payable** — ss 294-240 and 294-245, fetched this pass, verbatim:

> **294-240** *Your \*assessed excess transfer balance tax is due and payable at the end of **21 days
> after** the Commissioner gives you notice of the assessment of the amount of the \*excess transfer
> balance tax.* **Note:** For assessments of excess transfer balance tax, see Division 155 in Schedule 1
> to the *Taxation Administration Act 1953*.
> **294-245** *If the Commissioner amends your assessment, any extra \*assessed excess transfer balance
> tax resulting from the amendment is due and payable **21 days after** the day the Commissioner gives
> you notice of the amended assessment.*
> **294-250** *If an amount of \*assessed excess transfer balance tax … remains unpaid after the time by
> which it is due to be paid, you are liable to pay the \*general interest charge on the unpaid amount…*

So the cash outflow is **not** in the year of the breach. It lands 21 days after an assessment that
the Commissioner issues at a time the statute does not fix. In a forecaster keyed to financial years,
the liability accrues in year *n* and the cash moves in year *n* or *n+1* or later.

**And it cannot be paid out of superannuation.** TAA 1953 Sch 1 **s 131-5(1)**, fetched this pass, lists
exhaustively the determinations and assessments that let you request a release of amounts from a
superannuation interest: (a) excess concessional contributions; (b) excess non-concessional
contributions; (c) Division 293 tax; (ca) Division 296 tax; (d) first home super saver. **Excess
transfer balance tax is not in the list.** So — unlike Div 293 and Div 296, both of which the register
already models — this tax must be met from **outside super**, or by the member voluntarily taking a
super benefit (which for a 60+ retirement-phase member is tax-free, but is itself a lump sum and
therefore itself an item 1 transfer balance debit). This is an **argument from the absence of a
paragraph in an exhaustive list** — the list is closed by *"any of the following"* and the section was
read in full — label it `primary-verified as to the list; the conclusion is an argument from absence`.
**U22** records what would close it properly.

---

### C.3 The correction path — determination, election, commutation authority

All Division 136 sections below were fetched in full this pass (`PAC/19530001/Sch1-136-<n>`; the
`Sch1-` prefix is required — bare `136-10` 404s). Every one was inserted by No 81 of 2016 Sch 1 item 15,
effective 1 January 2017, applicable on and after 1 July 2017, and **none has been amended since**.
The Division has ten operative sections: 136-10, 136-15, 136-20, 136-25 (Subdiv 136-A) and 136-55,
136-60, 136-65, 136-70, 136-80, 136-85, 136-90 (Subdiv 136-B). There is no 136-30, 136-35, 136-40,
136-45 or 136-75 — those numbers 404, which is a genuine absence, not a fetch failure.

#### C.3.1 MUST vs MAY — the whole enforcement chain in one table

| Step | Provision | Obligation | Verbatim hook |
|---|---|---|---|
| Issue a determination | s 136-10(1) | **MAY** | *"the Commissioner **may** make a written determination"* |
| Include a default commutation notice in it | s 136-10(6) | **MUST** | *"A determination made under subsection (1) **must** include a notice…"* |
| Amend or revoke a determination | s 136-10(4) | **MAY**, but only *"at any time **before** a commutation authority relating to the determination is issued under section 136-55"* | — |
| Member elects a different stream | s 136-20(2) | **MAY**, and only if recipient of **2 or more** streams (s 136-20(1)(b)) | *"You **may** elect which of those … is to be fully or partially commuted"* |
| Election form and deadline | s 136-20(4) | **MUST** be in the approved form and given **within 60 days** after the determination (or amended determination) is issued, *"or a further period allowed by the Commissioner"* | — |
| Election is irrevocable | s 136-20(5) | — | *"An election under this section is **irrevocable**."* |
| Member notifies debits | s 136-25(2) | **MAY** | *"You **may** notify the Commissioner in the \*approved form of the amount of a \*transfer balance debit"* |
| Issue commutation authority | s 136-55(1) | **MUST**, on four conditions | *"The Commissioner **must** issue a commutation authority … if: (a) an \*excess transfer balance determination has been issued to you; and (b) … has not been revoked; and (c) the period mentioned in subsection 136-20(4) has ended; and (d) an amount (the **commutable amount**) greater than nil remains after reducing the \*crystallised reduction amount by the sum of any \*transfer balance debits notified … under section 136-25."* |
| Vary or revoke a commutation authority | s 136-60 | **MAY**, only before a s 136-85 notice is received | — |
| Issue **further** authorities after a shortfall or non-compliance | s 136-65(1) | **MAY** | *"The Commissioner **may** issue a commutation authority under this section … if … the provider (i) paid a \*superannuation lump sum that fell short of the reduction amount …; or (ii) did not comply"* |
| Notify a non-commutable excess | s 136-70(1) | **MUST**, on three conditions | quoted in full at §C.5 |
| Provider commutes | s 136-80(1) | **MUST, within 60 days** | quoted below |
| Provider notifies the Commissioner | s 136-85(1)–(3) | **MUST**, approved form, **within 60 days** after the authority is issued; s 286-75 administrative penalty for breach | — |
| Provider notifies **you** | s 136-90(1)–(2) | **MUST**, approved form, **within 60 days** | — |
| Member objects | s 136-15(1) | **MAY**, Part IVC — but s 136-15(2): *"the \*default commutation notice **does not form part of the taxation decision**"* | — |

**The critical asymmetry: everything upstream of the determination is discretionary and everything
downstream of it is mandatory.** The Commissioner *may* never issue a determination — and the tax
accrues anyway (s 136-10(1) Note). But once a determination issues and the 60 days lapse with a
commutable amount left, s 136-55(1) is a **must**.

#### C.3.2 What happens if the member does nothing

s 136-10(6)–(7), verbatim:

> **136-10(6)** *A determination made under subsection (1) **must include a notice**: (a) stating that,
> **if you do not make an election under section 136-20 within the period specified in that section,
> the Commissioner will issue one or more commutation authorities**; and (b) specifying: (i) the
> \*superannuation income stream provider or providers to whom a commutation authority will be issued;
> and (ii) the \*superannuation income stream or streams that the providers will be obliged to commute
> in full or in part; and (iii) if more than one commutation authority will be issued — the amount to be
> stated in each commutation authority, or the method the Commissioner will use to work out the amount…*
> **136-10(7)** *A notice included with an \*excess transfer balance determination in accordance with
> subsection (6) is a **default commutation notice**.*

> **136-55(4)** *If you have **not** made a valid election under section 136-20, the Commissioner
> **must** issue a commutation authority to **each** \*superannuation income stream provider specified
> in the \*default commutation notice.*

**Doing nothing is not a way of avoiding the correction; it is a way of not choosing which stream is
cut.** The default notice is written into the determination *at the outset*, before the member has
done anything, and it names the streams. Silence for 60 days converts it into the operative instruction.

Two more shapes an implementer will miss:

- **s 136-55(3):** if the member elects but the elected amounts *fall short* of the commutable amount,
  the Commissioner **must also** issue authorities to providers **specified in the default notice** —
  a partial election is topped up from the default, not honoured as a ceiling.
- **s 136-55(6) and s 136-65(4):** the total of all reduction amounts **must not exceed the commutable
  amount**. The Commissioner cannot over-commute. But the *provider's* payment under s 136-80(1) can
  fall short (limb (b)), and s 136-65 then allows a further round.

#### C.3.3 The provider's 60 days, and the lesser-of

> **136-80(1)** *A \*superannuation income stream provider issued with a commutation authority under
> this Subdivision **must, within 60 days** after the commutation authority is issued, pay by way of
> commutation of the specified \*superannuation income stream, a \*superannuation lump sum equal to
> **the lesser of**: (a) the **reduction amount** stated in the commutation authority; and (b) the
> **\*maximum available release amount** for the \*superannuation interest that supports the specified
> superannuation income stream.*
> **136-80(2)** *Despite subsection (1), if the specified \*superannuation income stream is a \*capped
> defined benefit income stream, the provider **may choose not to comply**.*
> **136-80(3)** *Despite subsection (1), if the \*retirement phase recipient has **died**, the provider
> **may choose not to comply**.*

**maximum available release amount** — TAA 1953 Sch 1 **s 131-45**, fetched this pass, in full:

> *The **maximum available release amount** for a \*superannuation interest at a particular time is the
> **total amount of all the \*superannuation lump sums that could be payable from the interest at that
> time**.*

For an ordinary account-based pension held by a member who got into retirement phase by satisfying a
nil-cashing-restriction condition of release, the MARA will normally be the whole account balance, so
limb (b) does not bite. It bites on a defined benefit or non-commutable interest — and note that
s 136-80(2) already excuses the *capped* defined benefit case outright. That the two exceptions and
limb (b) all point at the same population is **a labelled inference from reading the three provisions
together**, not something any of them states. `unverified as to the population`.

The 60 days runs **from the issue of the commutation authority**, not from the determination. So the
worst-case timeline from the end of the breach day to the money actually moving is:
`(unbounded Commissioner delay) + 60 days election + (unbounded Commissioner delay) + 60 days provider`.
**There is no statutory outer bound on the whole process**, because s 136-10(1) and s 136-55 impose no
deadline on the Commissioner's own acts. Meanwhile the excess is compounding daily under s 294-25 item 3
up to the determination, and accruing under s 294-230(3) throughout.

---

### C.4 If the provider does not comply — s 307-80(4) and its s 294-50 modification

s 307-80(4), quoted verbatim earlier in this file:

> *A \*superannuation income stream is **also not** in the **retirement phase** in an income year if:
> (a) the superannuation income stream is specified in a **commutation authority** …; and (b) the
> \*superannuation income stream provider is required by section 136-80 … to pay a \*superannuation
> lump sum **but fails to do so within the 60-day period** …; and (c) **the income year is the income
> year in which the 60-day period ended, or a later income year**.*

Read alone this is retrospective and total: the stream is out of retirement phase **for the whole of
the income year in which the 60 days ended**, and for every later year. Every dollar the fund earned on
that interest since the previous 1 July loses its exempt current pension income status.

**s 294-50, fetched in full this pass** (the earlier RAW section carried only subsection (3)):

> **294-50 — Assumptions about income streams**
> **294-50(1)** *Subsections (2) and (3) apply for the purposes of working out the following matters at
> a time: (a) whether you have a \*transfer balance account; (b) **the \*transfer balance in your
> transfer balance account**.*
> **294-50(2)** *In working out whether there is a superannuation income stream at a time: (a) have
> regard only to facts and circumstances that exist at that time; and (b) assume a requirement will be
> met, to the extent (if any) that: (i) the requirement arises under a provision of the \*taxation law
> or under any rules or standards under which a benefit is, or is purported to be, provided; and (ii)
> meeting the requirement is a condition for there to be a superannuation income stream at that time;
> and (iii) it is not possible to determine, having regard only to facts and circumstances that exist at
> that time, whether or not the requirement has been met.*
> **294-50(3)** *In working out whether a \*superannuation income stream is in the **retirement phase**
> at a time, **disregard the operation of subsection 307-80(4)**, if the time is **before the end of the
> 60-day period** mentioned in paragraph (c) of that subsection.*
>
> *[S 294-50 **substituted** by No 55 of 2017, s 3 and Sch 1 item 5, effective 1 July 2017. The former
> section, headed "Assume pension rules and commutation authorities complied with", directed the reader
> to "disregard subsection 307-80(4)" outright, for the purposes of working out whether you are a
> retirement phase recipient and whether a credit arises. S 294-50 inserted by No 81 of 2016, Sch 1
> item 4, effective 1 January 2017.]*

**The modification, stated exactly.** s 294-50(1) confines subsections (2) and (3) to **two questions
only**: whether you have a transfer balance account, and what your transfer balance is. Within those
two questions, s 294-50(3) **switches off s 307-80(4) for every moment before the end of the 60-day
period**. So:

- **For transfer balance account purposes**, the stream is treated as having been in retirement phase
  right up to the last second of the 60-day period. The account is **not** rewound to 1 July; the
  original credit is not unwound; nothing is retrospective. Then, at exactly the end of the 60 days,
  s 307-80(4) is allowed to bite, the stream ceases to be in retirement phase, and **s 294-80(1) item 5**
  fires: *"a \*superannuation income stream of which you are a \*retirement phase recipient stops being
  in the \*retirement phase under subsection 307-80(4) → a debit of **the \*value of the \*superannuation
  interest that supports it at the end of the period within which the commutation authority was required
  to be complied with** → arises **at the end of that period**."*
- **For every other purpose — in particular the earnings tax exemption in ITAA 1997 Subdiv 295-F —
  s 294-50 does nothing**, because s 294-50(1) does not extend to it. s 307-80(4) applies in its
  unmodified, whole-income-year, retrospective form. `primary-verified as to s 294-50(1)'s wording;
  the conclusion that Subdiv 295-F is unmodified is a reading of that scoping subsection, and
  Subdiv 295-F itself was not retrieved in this pass` → **U23**.

**The result is a two-sided asymmetry that is easy to state and easy to get backwards:**

| | Transfer balance account | Fund earnings tax exemption |
|---|---|---|
| Governing provision | s 294-80(1) item 5, via s 294-50(3) | s 307-80(4) unmodified |
| Effective from | **the end of the 60-day period** | **the start of the income year** in which the 60 days ended |
| Retrospective? | **No** | **Yes — the whole year** |
| Amount | the **full value of the supporting interest**, not the reduction amount | the whole year's earnings on the interest lose ECPI |

**Two consequences worth naming.** First, the item 5 debit is the **entire interest**, not the excess.
A member with a $2.3m balance against a $2.1m cap who suffers a non-compliant provider gets a
**$2.3m debit**, not a $200,000 one — their transfer balance plunges (s 294-30(2) Note 2 in this file:
*"There is NO consequence for having a negative transfer balance"*). Second, and permanently, that
member has already had a day on which their transfer balance exceeded their cap, so **s 294-40(1)(b)
is failed forever** and their personal cap never indexes again (§C.6).

---

### C.5 The safety valve — s 136-70 and the item 7 debit

> **136-70(1)** *The Commissioner **must** notify you in writing if, at the end of a day after the
> Commissioner has issued an \*excess transfer balance determination to you: (a) the sum of all
> \*transfer balance debits arising in your \*transfer balance account since the determination was
> issued **falls short of** the \*crystallised reduction amount; and (b) you **have \*excess transfer
> balance** in your transfer balance account; and (c) **either**: (i) the **only** \*superannuation
> income streams of which you are a \*retirement phase recipient are **\*capped defined benefit income
> streams**; or (ii) **you are no longer a retirement phase recipient of any** superannuation income
> stream.* **Note:** *A debit arises in your transfer balance account when the Commissioner issues a
> notice under this section: see item 7 of the table in subsection 294-80(1) of the ITAA 1997.*
> **136-70(2)** *A notice under subsection (1) **must state the amount** of the \*excess transfer
> balance mentioned in paragraph (1)(b).*

And the debit, s 294-80(1) item 7 (already verbatim in this file):

> | **7** | the Commissioner gives you a **notice under section 136-70** … | **the amount of the \*excess transfer balance stated in the notice** | at the time the Commissioner issues the notice |

**When an uncorrectable excess is written off — the four conditions, all of which must hold:**

1. A determination has already been issued. **The valve cannot open without one**, and issuing one is a
   `may`. A member with an uncorrectable excess whom the Commissioner never assesses gets no write-off
   and keeps accruing tax indefinitely.
2. Debits since the determination fall short of the crystallised reduction amount — i.e. the correction
   genuinely did not complete.
3. Excess still exists at the end of a day.
4. **Either** the only remaining retirement-phase streams are capped defined benefit income streams
   (nothing left that a provider is obliged to commute — s 136-80(2)), **or** there are no
   retirement-phase streams at all (nothing left to commute).

Limb (c)(ii) is exactly the state produced by the §C.4 wipeout: the item 5 debit removes the interest
and the member stops being a retirement phase recipient. So the two mechanisms interlock — a
non-compliant provider destroys the stream, which then satisfies s 136-70(1)(c)(ii), which then closes
out the residual excess.

**The debit is sized to the excess exactly** (item 7: "the amount of the excess transfer balance stated
in the notice"), so it takes the account to precisely nil excess — not below, not partially. That ends
the excess transfer balance period under s 294-230(2) and **stops the tax accruing from that day**.
**Tax already accrued remains payable**; nothing in Div 294 or Div 136 remits it.

---

### C.6 The consequence that dwarfs the tax — s 294-40(1)(b)

Already verbatim in this file, but it belongs in this cluster because it is the real cost of a breach:

> **294-40(1)** *This section applies to **increase** your **transfer balance cap** for a \*financial
> year … if: (a) the \*general transfer balance cap is **increased as a result of indexation** …; and
> (b) **at no time before the start of that financial year has the \*transfer balance in your transfer
> balance account at the end of a day exceeded your transfer balance cap**.*

**One end-of-day excess, of one dollar, at any time in the member's life, permanently disqualifies them
from every future proportional indexation increase.** It is not "unwound" by correcting the excess, it
is not time-limited, and it is not proportional to the size of the breach — s 294-40(1)(b) is a bare
boolean over all history. `primary-verified`.

Against the worked example: the $200,000 / 90-day breach costs **$857 in tax**. The same breach costs a
member with a $2.1m cap **the whole of every future indexation step on their personal cap**. If the
general cap rises by $100,000 twice over the remaining projection, that is $200,000 of retirement-phase
headroom — earning at 0% instead of 15% — forgone forever. **The tax is the small part.** Any design
that models the tax and not s 294-40(1)(b) has modelled the rounding error and dropped the number.

---

### C.7 Where the money goes after a commutation — question 6

s 136-80(1) requires the provider to *"pay by way of commutation of the specified \*superannuation
income stream, a \*superannuation lump sum"*. **It does not say to whom, or where.** Neither s 136-80,
s 136-85, s 136-90, s 131-45, nor s 294-80(1) item 1 states a destination; item 1 only says a debit of
*"the amount of the superannuation lump sum"* arises *"at the time you receive the superannuation lump
sum"*. Whether a commutation lump sum may be retained inside the fund in accumulation phase, or must be
cashed out, is a **SIS Regulations** question (the payment standards and the cashing rules) that this
pass did not retrieve. `unverified` → **U24**.

**But the tax consequence of the two destinations differs, and it is 15 percentage points on the
earnings of the commuted capital, every year, for the rest of the projection:**

- Retained in accumulation → fund earnings on that capital are taxed at **15%** (register §3.1, `superannuation.fundTax.earningsTaxAccumulation`, and `src/core/superPhase.ts`).
- Cashed out to the member's own name → taxed in the member's hands at their marginal rate, with the deeming and Age Pension asset-test consequences that entails (register §4.4, §4.5).

**Does the tool need to model that flow?** Given the settled decision in §C.8 — refuse to project a
breaching plan — **no, and it must not pretend to.** The flow only exists in a
world where a breach happened, and the settled decision is that the engine never produces such a
world. If that decision were ever reversed in favour of "warn and continue", then the flow becomes mandatory,
because *not* modelling it is the flattering error: leaving the commuted capital in retirement phase at
0% overstates the household's position by 15% of its earnings, compounding, forever. **There is no
"warn and continue" option that is safe without modelling the accumulation-phase move.** That is the
strongest single argument against "warn and continue" and it is why §C.8 is written as it is.

---

### C.8 SETTLED — the engine refuses to project a breaching year

**RULED AND SETTLED.** The user has ruled and §C's recommendation is accepted. This is not a
proposal and it is not awaiting a decision. §C's reasoning is preserved below because the reasoning
is what a later reader needs in order not to reopen it by accident.

> **Settled: the engine HARD-REFUSES to project any financial year containing an end-of-day cap
> breach — any financial year in which a Person's \*transfer balance exceeds their \*transfer balance
> cap at the end of any day. Not a warning, not a silently-modelled tax — a named refusal, thrown at
> the point the excess would arise, in the idiom of `TrisRetirementPhaseNotModelledError` and
> `MidYearPhaseChangeError` in `src/core/superPhase.ts`. Excess transfer balance tax is NOT
> implemented; the excess machinery of §C.1–§C.5 is implemented only as the detector that fires the
> refusal. The latching `hasEverExceededCap` flag IS built regardless, because refusing only prevents
> NEW breaches and cannot undo one that predates the projection.**

**Consequences of the ruling, stated so they are testable.** Everything in §C.1 (the daily
compounding formula and the two determination-period formulae), §C.2 (the 15%/30% rates, the
"subsequent breach" test, the 21-day payment timing, the no-release-from-super finding), §C.3 (the
Division 136 correction chain), §C.4 (the two-sided s 294-50 asymmetry) and §C.5 (the s 136-70
safety valve) is **recorded and not implemented**. The traps T87–T114 that price them are recorded
as the fixtures a future reversal would have to satisfy, not as tests to write now. The traps that
survive the ruling and must be built are **T114** (one end-of-day excess permanently kills
proportional indexation) and, from §A, **T67** and **T68**.

**The argument.**

*1. A breach in a projection is a modelling artefact, not a plan.* Nobody's retirement plan is "exceed the
cap and pay the tax". The overwhelmingly likely cause of an excess appearing in a forecast is that the user
declared more capital as retirement-phase than they have cap for — exactly the input error
`src/core/superPhase.ts` already names in `UNCAPPED_ENTRY`: *"the interest is in Retirement Phase because it
was stated to be"*. The right response to an impossible input is to reject the input, not to price it.

*2. The tax is trivially small and the real consequence is not modellable cheaply.* §C.1.3: a $200,000
excess for 90 days costs **$857**. Meanwhile s 294-40(1)(b) (§C.6) permanently destroys proportional cap
indexation for the rest of the person's life, and — if the correction runs — commutes capital from a 0%
environment to a 15% one for the rest of the projection (§C.7, and U24 says we do not even know where the
money lands). **Modelling "the tax" and calling the breach handled is the flattering error**: it books an
$857 cost against a consequence worth six figures. The project exists to prevent confident over-statement,
and this is precisely the shape of over-statement it exists to prevent.

*3. "Warn and continue" is not a safe middle.* Continuing requires deciding what happens next — does the
excess sit there compounding? does a correction fire? where does the commuted capital go? Every one of those
answers is currently `unverified` (U24, U25) and the *default* answer an implementer would reach for —
leave the money in retirement phase at 0% and add a small tax — is the one that flatters by 15% of earnings
on the excess, compounding, forever. A warning the user scrolls past sits on top of a projection that is
still wrong in the flattering direction. **There is no version of "warn and continue" that is conservative
without first closing U24 and building the accumulation-phase flow.**

*4. Refusal is conservative in the one direction that matters, and it is the house idiom.* A refusal cannot
overstate anything. It also costs the user nothing they wanted: the fix is to declare less capital as
retirement phase, which is what the law would force anyway, and which makes the projection *worse* — that
is, more honest. The codebase already refuses on `MidYearPhaseChangeError` for a far smaller gap than this,
and the refusal-message convention (say what is missing, say why answering either way is wrong, say what
the caller should state instead) fits this case exactly.

*5. Scope the refusal precisely, so it stays useful.* Refuse on an **end-of-day** transfer balance exceeding
the cap (s 294-30(1) + s 294-230(2) both measure at end of day). Do **not** refuse on a negative transfer
balance — s 294-30(2) Note 2: *"There is NO consequence for having a negative transfer balance."* Do **not**
refuse on a person merely having a large total super balance; only on retirement-phase capital. The refusal
message must name the amount by which the cap is exceeded, the personal cap it was tested against, and the
s 294-40(1)(b) permanent-indexation consequence — because that consequence is what makes the answer "reduce
what you declare", not "accept the tax".

*6. Keep s 294-40(1)(b) even under the refusal.* The refusal prevents *new* breaches inside the projection.
It does not erase a breach that happened before the projection starts. **The personal cap record must carry
a `hasEverExceeded: boolean` fed from the user's actual history**, and when true, proportional indexation is
off for every projected year. Without that field the refusal is a fair-weather guard that quietly restores
indexation the law has already removed. This is the one piece of Div 294 excess machinery that must be
implemented even though the tax is not.

**What is given up by accepting this.** The tool cannot answer "what if I deliberately over-transfer?" —
a question no household asks. It cannot model an inherited or reversionary-pension breach that a real
household might genuinely be walked into by a death; that case should be a *separately named* refusal
pointing at Subdivision 294-D and O54, not a silent gap.

---

## D. The retirement-phase entry test and the TRIS conversion

**Scope of this section:** ITAA 1997 s 307-80 as an implementable decision procedure; the
notification asymmetry in s 307-80(3)(b)(ii); the 2019 reversionary carve-out in (aa); what
`src/core/superPhase.ts` must expose and refuse; the conversion event end to end; and the
retrospective-TRIS-failure finding at `docs/research/p3-minimum-drawdown-and-ttr.md` §3.4, which
this pass **re-opened and resolved** by retrieving ITAA 1997 s 307-70 and TR 2013/5.

Every provision quoted below is either already verbatim in §"RAW PRIMARY TEXT" of this file
(s 307-80, s 294-25, s 294-15, s 294-20, s 294-35, s 294-50) or was fetched by this pass; the fetch
log for this pass belongs to §7 (PENDING — not yet merged). Nothing is written from memory.

---

### D.1 The entry test as a decision procedure

s 307-80 is **two positive limbs and two carve-outs**, and the carve-outs subtract from the limbs
rather than replacing them. Written as an ordered procedure a function can implement:

```
INPUTS (all facts about ONE income stream at ONE time t)
  benefitPayableAt(t)          : bool    -- 307-80(1)
  isDeferred                   : bool    -- 307-80(2)(a)
  benefitWillBePayableAfter(t) : bool    -- 307-80(2)(b)
  corSatisfiedAtOrBefore(t)    : subset of {101, 102A, 103, 106}      -- 307-80(2)(c)(i)-(iv)
  streamKindIsListed           : bool    -- 307-80(3)(a)(i)-(v)
  isReversionaryBeneficiary    : bool    -- 307-80(3)(aa)
  notifiedProviderOf           : subset of {101, 102A, 103}           -- 307-80(3)(b)(ii)
  commutationAuthorityFailure  : (issued, 60-day period ended in FY)  -- 307-80(4)

STEP 1 — is either positive limb made out?
  1a  if isDeferred AND benefitWillBePayableAfter(t)
         AND corSatisfiedAtOrBefore(t) is non-empty
      -> candidate = RETIREMENT PHASE, by 307-80(2). GO TO STEP 3.
          (Note: 307-80(2) has NO notification requirement of any kind.)
  1b  else if benefitPayableAt(t)
      -> candidate = RETIREMENT PHASE, by 307-80(1). GO TO STEP 2.
  1c  else
      -> NOT RETIREMENT PHASE. STOP. (No limb is made out; nothing to carve out of.)

STEP 2 — the 307-80(3) carve-out. It applies ONLY on the 1b route, because the chapeau is
         "a *superannuation income stream FROM WHICH a *superannuation income stream benefit
         IS PAYABLE". Apply it as a single conjunction:
  EXCLUDED := streamKindIsListed                                   -- (a)
              AND NOT isReversionaryBeneficiary                    -- (aa)
              AND (   corSatisfiedAtOrBefore(t) is empty           -- (b)(i)
                   OR (   corSatisfiedAtOrBefore(t) INTERSECT {101,102A,103} is non-empty
                      AND that intersection is NOT covered by notifiedProviderOf ) )  -- (b)(ii)
  if EXCLUDED -> NOT RETIREMENT PHASE. STOP.

STEP 3 — the 307-80(4) carve-out, which is keyed to an INCOME YEAR, not a time.
  if commutationAuthorityFailure and t's income year is the year the 60-day period ended
     or a later income year
  -> NOT RETIREMENT PHASE for that whole income year.
  EXCEPT: for transfer balance cap purposes only, s 294-50(3) requires you to
  "disregard the operation of subsection 307-80(4), if the time is before the end of the
  60-day period". So Div 294 and Subdiv 295-F can give DIFFERENT answers for the same
  stream at the same time inside that window.

STEP 4 -> RETIREMENT PHASE.
```

**What subsection (3) does, exactly.** It is a **carve-out** — "**However**, a \*superannuation
income stream from which a \*superannuation income stream benefit is payable is **not** in the
retirement phase at a time if: (a) … **and (aa)** … **and (b)** …". The three paragraphs are joined
by "and". Every one of them must hold for the stream to be excluded.

**The consequence of the conjunction, spelled out, because reading (b) alone gives the wrong
answer.** De Morgan: the stream **stays** in retirement phase if **any one** of the three fails.
There are therefore **three independent escapes** from (3), not one:

| Escape | Which paragraph fails | What it looks like |
|---|---|---|
| **E1 — not a listed kind** | (a) | An ordinary account-based pension is not a "transition to retirement income stream", a non-commutable allocated annuity/pension, or an RSA transition to retirement pension. (3) can **never** exclude it, no matter what the member has or has not notified. |
| **E2 — reversionary** | (aa) | A TRIS being paid to a reversionary beneficiary is in retirement phase **even though (b) is squarely satisfied** — the beneficiary may be 45, have satisfied no condition of release at all, and have notified nobody. |
| **E3 — satisfied and (where required) notified** | (b) | The member has satisfied item 106; **or** has satisfied 101/102A/103 **and** notified the provider. |

An implementer who tests only "(b): has the member met a condition of release and told the fund?"
gets **E1 and E2 backwards in opposite directions**: they will pull an ordinary account-based
pension out of retirement phase for want of a notification the law never asks for, and they will
tax a reversionary TRIS at 15% when the law exempts it. Both errors are silent — they produce a
plausible number.

**One asymmetry inside the section worth recording.** The deferred limb, s 307-80(2), requires only
that "the person has satisfied (whether at or before that time) a condition of release specified in
any of the following items … 101 … 102A … 103 … 106". It contains **no notification requirement at
all**. The notification requirement exists only inside the (3) carve-out, and the (3) carve-out
does not reach a deferred stream (its chapeau is confined to a stream from which a benefit **is
payable**). Not modelled by this project, but the shape matters: notification is not a general
feature of the entry test, it is a feature of the TRIS exclusion.

**Confidence: `primary-verified`.** The procedure above is a restatement of quoted operative text
with no gap-filling, save the one inference flagged in D.2.

---

### D.2 The notification asymmetry — turning 65 converts a TRIS with no notification

This is the heart of the item. Set out the two lists side by side, verbatim.

**s 307-80(2)(c)** enumerates **four** items:

> (c) the person has satisfied (whether at or before that time) a condition of release specified in
> any of the following items of the table in Schedule 1 to the *Superannuation Industry
> (Supervision) Regulations 1994*: (i) **101 (retirement)**; (ii) **102A (terminal medical
> condition)**; (iii) **103 (permanent incapacity)**; (iv) **106 (attaining age 65)**.

**s 307-80(3)(b)** enumerates the failure conditions:

> (b) at or before that time, the person to whom the benefit is payable:
> (i) **has not satisfied** a condition of release specified in **paragraph (2)(c)**; **or**
> (ii) **has satisfied** a condition of release specified in **subparagraph (2)(c)(i), (ii) or
> (iii)**, **but has not notified the \*superannuation income stream provider** for the
> superannuation income stream **of that fact**.

(b)(i) points at **paragraph (2)(c)** — all four items. (b)(ii) points at **subparagraphs
(2)(c)(i), (ii) or (iii)** — three of the four. **Item 106 is in the first list and not in the
second.**

**Working the four cases through the procedure in D.1 (assume a TRIS, non-reversionary, benefit
payable — so (a) and (aa) both hold and the answer turns wholly on (b)):**

| Case | (b)(i) | (b)(ii) | (b) | (3) applies? | Phase |
|---|---|---|---|---|---|
| **A.** No item in (2)(c) satisfied | **true** | false | true | yes | **NOT retirement phase.** A TRIS at 61, still working. |
| **B.** Item 101 satisfied (retired), provider **not** notified | false | **true** | true | yes | **NOT retirement phase.** Retiring is not enough. |
| **C.** Item 101 satisfied **and** provider notified | false | false | **false** | **no** | **RETIREMENT PHASE**, from the notification. |
| **D.** Item **106** satisfied (attained 65), provider **not** notified | false — 106 **is** "a condition of release specified in paragraph (2)(c)" | false — 106 is **not** among "(2)(c)(i), (ii) or (iii)" | **false** | **no** | **RETIREMENT PHASE**, automatically, on attaining 65. |

**So: yes. Turning 65 converts a TRIS automatically, with no notification and no act by the member
of any kind.** In Case D there is nothing left for the member to fail to do. (b)(i) is closed off by
the fact that item 106 *is* in paragraph (2)(c); (b)(ii) is closed off by the fact that item 106 is
*not* in its enumerated list; and there is no residual limb. The text that settles it is the
divergence between "**paragraph (2)(c)**" in (b)(i) and "**subparagraph (2)(c)(i), (ii) or (iii)**"
in (b)(ii) — a drafter who enumerated three of four subparagraphs in a section that enumerates all
four eight lines above.

**The day.** Item 106 of the Schedule 1 table is, verbatim (fetched this pass):

> | Item | Conditions of release | Cashing restrictions |
> | **106** | **Attaining age 65** | **Nil** |

There is no act, no application, and no notice. The condition is satisfied on the day the member
attains 65, so on the D.1 procedure the stream is in retirement phase **from that day**.

For Case C, the day is the day of **notification**, not the day of retirement. LCR 2016/9 Example
1B, ¶30D, verbatim:

> "Raj retires on 30 June 2019, meeting a relevant condition of release, and notifies the
> superannuation provider that pays the TRIS of his retirement on 15 July 2019. **The TRIS is in the
> retirement phase on 15 July 2019 (the time of notifying the superannuation provider of his
> retirement)** and Raj commences to have a transfer balance account on 15 July 2019. The credit
> that arises in his transfer balance account is equal to the value of the superannuation interest
> supporting the TRIS **on 15 July 2019**."

Note what that example is engineered to show: retirement on 30 June and notification on 15 July put
the conversion, the ECPI start and the transfer balance credit in **the next financial year**.
A fortnight's delay moves a whole year's fund earnings from 0% to 15% and moves the year in which
the member's personal transfer balance cap is fixed under s 294-35(1).

#### Confidence label — this is an argument from an absence, and is labelled as one

**Label: `inference from an express enumeration` — specifically, an argument from the ABSENCE of
subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — CORROBORATED BY A PUBLIC RULING. It is NOT bare
`primary-verified`, and must never be recorded as such.**

What makes it stronger than a bare negative: (i) the enumeration is **express and closed** — (b)(ii)
lists three subparagraphs by number, so the omission is a choice made in the drafting, not a
silence; (ii) it sits **eight lines below** a paragraph that enumerates all four, so the drafter had
the fourth in hand; (iii) there is no residual or catch-all limb in (3)(b) for it to fall into.

The corroboration is **LCR 2016/9** — a Law Companion Ruling, i.e. a public ruling, not web
guidance. ¶15, verbatim:

> "15. Further, a transition to retirement income stream (TRIS) is **not** in the retirement phase
> unless a superannuation income stream benefit is currently payable from it and the recipient:
> • **is 65 years old or older**, or
> • has met a relevant condition of release with a nil cashing restriction (retirement, terminal
> medical condition, permanent incapacity) **and they have notified the superannuation provider for
> the TRIS of that fact**, or
> • is in receipt of the TRIS as a **reversionary beneficiary**."

The Commissioner's three bullets are the three escapes E3(106), E3(101/102A/103), E2 — and the
notification words are attached to the second bullet and **not** to the first. Example 1A, ¶30A–30B,
applies it: Robert's TRIS, commenced at 58, is in retirement phase on 1 July 2017 "**As Robert was
over 65** on 1 July 2017" with a $900,000 credit, and notification is never mentioned.

**What is still missing, and why the label is not upgraded:** no primary provision says in terms
that attaining 65 converts a TRIS without notification. It is read off a list, and confirmed by a
ruling. The register must carry the basis in the same cell as the confidence, exactly as it already
does for O38.

#### A counter-source that would mislead an implementer

**TR 2013/5 ¶71B paraphrases s 307-80(3) and drops the notification requirement entirely**:

> "71B. … For example, a superannuation income stream that is a transition to retirement income
> stream (payable to a person other than a reversionary beneficiary) will not be in the retirement
> phase **unless the person has met a specified condition of release**. [36E]"

Footnote [36E] is "Subsection 307-80(3) and paragraph 307-80(2)(c)". On the operative text that
paraphrase is **wrong for Case B** — meeting item 101 without notifying does not convert. It is a
plain-English gloss in a ruling about a different question (when a stream commences and ceases), and
LCR 2016/9 ¶15, which is the ruling *about* this question, states the notification requirement
expressly. Recorded here because an implementer who reaches for the shorter sentence gets Case B
wrong and exempts a whole year's fund earnings that are taxable.

#### The set of conditions is NOT the same set the 10% ceiling uses — and this is where the money is

`ttrPaymentRange.ts` switches off the 10% maximum on **reg 6.01(2)(b)(ii)**'s "unless", which reads
(structure confirmed against my own fetch of reg 6.01(2) this pass — the "unless" is punctuated
**inside subparagraph (b)(ii)**, after paragraphs (A) and (B), and before the "; and" that leads to
(b)(iii)):

> "**unless the pensioner has satisfied a condition of release in respect of which the cashing
> restriction for preserved benefits and restricted non-preserved benefits is 'Nil'**"

That is a test on **the Schedule 1 column 3 value**, not on an enumerated list of items, and it
contains **no notification requirement**. Reading column 3 of Schedule 1 Part 1 as fetched, the
items whose cashing restriction is "Nil" are **101 (Retirement), 102 (Death), 102A (Terminal medical
condition), 103 (Permanent incapacity), 104 (Termination of gainful employment with a standard
employer-sponsor … where the member's preserved benefits in the fund at the time of the termination
are less than $200), 105 (Severe financial hardship) in its "person taken to be in severe financial
hardship under paragraph 6.01(5)(b) — Nil" limb, and 106 (Attaining age 65)**.

Two consequences, both currently mis-stated in `src/`:

1. **The two sets are not equal — the SISR set is strictly larger.** Items **104** and **105(b)**
   have a Nil cashing restriction and so switch off the 10% ceiling, but they are **not** in
   s 307-80(2)(c) and so do **not** put the stream into retirement phase. A member in that position
   has an income stream with **no maximum** whose fund earnings are still taxed at **15%** and which
   generates **no transfer balance credit**. `TrisConversionNotModelledError`'s message treats the
   reg 6.01(2) "unless" and the tax-side conversion as one event; they are two events on two
   different sets of facts.
2. **Even on the shared items, the two events happen on different days.** For items 101/102A/103,
   the ceiling falls away when the condition is **satisfied** (reg 6.01(2)(b)(ii) — no notification
   word), while retirement phase begins only on **notification** (s 307-80(3)(b)(ii)). Between the
   two there is a window in which the stream has **no maximum, still bears 15% fund earnings tax,
   and has no transfer balance credit**. Raj's fortnight is exactly that window.

**Confidence: `primary-verified` on both provisions' texts and on Schedule 1's column 3 values (all
three fetched this pass). The proposition "the SISR set is strictly larger" is a comparison of two
retrieved lists, not an inference.**

#### The stream does not stop being a TRIS

`ttrPaymentRange.ts`'s refusal message says "the income stream is no longer a transition to
retirement income stream". That is wrong, and s 307-80(3)(a)(i) is the proof: subsection (3) applies
to a stream that **is** "a transition to retirement income stream (within the meaning of Part 6 of
the *Superannuation Industry (Supervision) Regulations 1994*)" and asks separately, in (b), whether
the recipient has satisfied and notified. If satisfying a condition of release stopped the product
being a TRIS, (3)(a)(i) and (3)(b) could never both be engaged and (b) would be dead text. The
product remains a TRIS under the SISR — the ATO's own term for the converted state is "**TRIS in the
retirement phase**" (LCR 2016/9 heading to Example 1A). What changes is its **tax phase**, not its
SISR identity. Correction owed to §3.9 and to the error message.

---

### D.3 The (aa) reversionary carve-out

Verbatim, from the s 307-80 text captured in this file:

> **(aa)** the person to whom the benefit is payable is **not a reversionary beneficiary**; and

Inserted by **No 8 of 2019** (Sch 8 item 43), effective **1 April 2019**; no amendment to s 307-80
since.

**What it does.** It removes a reverted TRIS from the reach of the (3) carve-out entirely. Where the
original member dies and the TRIS automatically reverts to a beneficiary, (aa) fails, the conjunction
fails, and the stream is in retirement phase under (1) — **regardless of the reversionary
beneficiary's own age, conditions of release, or notifications**. Corroborated by LCR 2016/9 ¶15,
third bullet: "• is in receipt of the TRIS as a reversionary beneficiary."

The purpose is structural: on death the interest must be cashed as a death benefit and the
survivor's own preservation status is beside the point, so subjecting a reverted stream to a
preservation-based exclusion would be incoherent. Before 1 April 2019 the text did subject it to
one.

**Does this tool need it? No — it should refuse.** Reasons, in order of weight:

1. The register carries **nothing** on death benefits, reversionary pensions or dependant
   beneficiaries. §3.9 has no row; the only "surviving partner" row anywhere is HEAS §5.8. So there
   is no source to consume, and a computed answer here would be provenance the project has not got.
2. `docs/assumptions-register.md` §8 O16 records that a **v1 `DEATH` what-if exists**. So this is a
   reachable state, not a hypothetical — which is precisely why it must refuse loudly rather than
   fall through to a default.
3. Getting (aa) "right" in isolation is a trap: entering retirement phase as a reversionary
   beneficiary immediately drags in machinery that is not modelled — the s 294-25(1) item 2
   paragraph (b) **12-month deferral** of the credit for a reversionary beneficiary, Subdiv 294-E
   child recipients and the modified cap (s 294-35(1) Note), and the SISR reg 6.21 death benefit
   cashing rules. Modelling (aa) without those produces a stream that is exempt from fund earnings
   tax with **no** transfer balance credit for twelve months and no cap check — the most
   flattering possible wrong answer.

**Recommendation:** carry (aa) in the register as a stated rule, model it as a **required input**
whose only supported value is `false`, and refuse on `true`. See `ReversionaryStreamNotModelledError`
in D.4.

---

### D.4 What `superPhase.ts` must expose

`superPhase.ts` today states, correctly and honestly: "§3.1 gives the two rates and §5A.3 names ECPI
… neither states ITAA 1997 s 307-80's test, and no row anywhere says what makes a stream a
retirement phase stream. So phase is **stated by the caller, per interest, and never derived
here**." Once §3.10 exists that sentence is no longer true, and the module can derive phase — but
only if the facts the test actually needs are in scope, and three of them are not.

#### The inputs the entry test genuinely requires

| # | Input | Provision | Where it is today |
|---|---|---|---|
| 1 | the time `t` | (3) chapeau, "at a time" | `release.on` — present |
| 2 | whether a benefit is payable at `t` | (1) | implied by which constructor is called — must become explicit |
| 3 | **the stream kind**: is it one of (3)(a)(i)–(v)? | (3)(a) | `SuperIncomeStream`, which the file states is "a label on the result; **nothing in the rate lookup reads it**". The entry test makes it load-bearing; it must become the discriminant the derivation reads. |
| 4 | **whether the recipient is a reversionary beneficiary** | (3)(aa) | **absent entirely** |
| 5 | **which Schedule 1 items** were satisfied at or before `t` | (2)(c), (3)(b) | **absent.** `ConditionOfRelease` carries `grounds: ReleaseGround[]` with two values — `'ceasing gainful employment after Preservation Age'` and `'turning the age that releases benefits by itself'` — and no item numbers. `conditionOfRelease.ts` says so on purpose: "No SIS Regulation item numbers appear below. The register's source line for §3.9 is 'ITAA 1997 · SIS Regulations · P0 research pass' and it cites no item, so citing one here would be provenance this project has not got." **That provenance now exists** (Schedule 1 Part 1 fetched, items 101/102A/103/106 with their Nil restrictions). §3.10 should supply it. |
| 6 | **the notification fact** | (3)(b)(ii) | **absent, and underivable — see below** |
| 7 | commutation-authority facts | (4), s 294-50(3) | **absent.** Out of scope; refuse. |

#### Input 6 is a user-supplied fact and cannot be derived — this is the crux

The notification in (3)(b)(ii) is "**has not notified the \*superannuation income stream provider for
the superannuation income stream of that fact**". It is:

* **an act, not an anniversary.** It has no relationship to any date the model holds. Date of birth
  does not produce it; a cessation date does not produce it; the commencement day does not produce
  it. This is the same argument `superPhase.ts` already makes about phase itself — "moving it is an
  act, not an anniversary" — and it applies one level deeper.
* **per-stream, not per-Person.** The section says "the superannuation income stream provider **for
  the superannuation income stream**". One Person holding two TRISs with two providers can have
  notified one and not the other, and the two streams are then in different phases on the same day.
  A `ConditionOfRelease`, which is deliberately a fact about the Person carrying no stream identity,
  therefore **cannot** be the place this lives. It belongs on the interest.
* **without a statutory form, deadline or content.** Nothing in s 307-80 prescribes any of them
  (U27, O63).

So the notification day is an input the **user** must state, exactly as `gainfulEmployment` is —
a required discriminated union, never defaulted, with the "not notified" case an affirmative
statement rather than an absence.

#### What it should refuse, and the named errors

In the style already used (`RangeError` subclasses whose message names the provision, the two
candidate answers, and the money at stake):

* **`TrisNotificationNotStatedError(on, grounds)`** — a listed-kind stream whose recipient has
  satisfied item 101, 102A or 103 at or before `on`, where the notification fact is not stated.
  Message must say: on these facts s 307-80(3)(b)(ii) makes the phase turn on whether the provider
  was notified and on what day; not notified means 15% fund earnings tax and no transfer balance
  credit, notified means 0% from the notification day and a credit of the whole supporting
  interest's value on that day; there is no defensible default, and the gap between the two answers
  is the entire value of the strategy. **This replaces the 101/102A/103 half of the existing
  `TrisRetirementPhaseNotModelledError`.**
* **`ReversionaryStreamNotModelledError(on)`** — the recipient is stated as a reversionary
  beneficiary. Message: s 307-80(3)(aa) takes a reverted TRIS out of the carve-out so it is in
  retirement phase regardless of the beneficiary's own condition of release; but the s 294-25(1)
  item 2(b) twelve-month deferral of the credit, Subdiv 294-E, and the SISR reg 6.21 cashing rules
  are not in the register, and modelling the exemption without them gives 0% fund tax with no cap
  check for a year — the most flattering wrong answer available.
* **`ConditionOfReleaseItemNotIdentifiedError(on, ground)`** — a met condition whose
  `ReleaseGround` cannot be mapped onto a Schedule 1 item. s 307-80(3)(b) turns on **which item**,
  not on `met`. `'turning the age that releases benefits by itself'` maps cleanly to item 106
  (Attaining age 65). `'ceasing gainful employment after Preservation Age'` maps to item 101
  (Retirement) **only if** the SISR definition of "retirement" is satisfied, and **SISR reg 6.01(7)
  was not retrieved by any pass** — the same gap `CessationBeforePreservationAgeError` already
  guards (U28, O59). Until it is retrieved, the item-101 mapping is `unverified` and the tool
  must not assert it silently.
* **`CommutationAuthorityNotModelledError(fy)`** — s 307-80(4) and TAA 1953 Sch 1 Div 136 are not
  modelled, and s 294-50(3) makes Div 294 and Subdiv 295-F disagree inside the 60-day window.
* **Narrow `TrisRetirementPhaseNotModelledError`.** It currently fires for **every** Person with
  `release.met === true`. After §3.10 the item-106 case is determined — automatic, no notification,
  from the 65th birthday — and refusing it would be refusing a case the register answers, which
  `conditionOfRelease.ts` already identifies as its own kind of error. Keep the refusal only for the
  cases above.
* **`MidYearPhaseChangeError` stays, and becomes the binding blocker.** See D.5.

#### Two consequential edits inside `superPhase.ts`

* The `UNCAPPED_ENTRY` caveat says "ITAA 1997 s 307-80's entry test **is not in the register**, and
  the transfer balance cap … is not modelled (P3-9)". Once §3.10 lands, the first clause must be
  retired and the second must stay. Leaving a stale caveat on every Retirement Phase result is worse
  than none: it invites a reader to discount the half that is still true.
* `transitionToRetirementInterest` returns `AccumulationInterest`, and that return type is described
  as the defence ("Writing `phase: 'retirement'` into that constructor is a type error"). That
  defence is still correct for a **non-converted** TRIS and must not be weakened. The converted case
  is a **different constructor** — a TRIS that has entered retirement phase is, in the register's own
  two-row world, a retirement phase interest — so the conversion must produce a
  `RetirementPhaseInterest` from a constructor that takes the extra facts, not a mutable `phase`
  field on the existing one.

---

### D.5 The conversion event, end to end

#### The day

| Route | Conversion day | Authority |
|---|---|---|
| Item **106** — attaining 65 | **the day the member attains 65** | s 307-80(3)(b), read with SISR Sch 1 Pt 1 item 106 "Attaining age 65", cashing restriction "Nil" |
| Items **101 / 102A / 103** | **the day the member notifies the provider** — not the day the condition was satisfied | s 307-80(3)(b)(ii); LCR 2016/9 Example 1B ¶30D, quoted in D.2 |

#### What changes about the payment range

**The 10% ceiling: it is gone — but it went on a different day and on a wider trigger.**
reg 6.01(2)(b)(ii)'s "unless the pensioner **has satisfied** a condition of release in respect of
which the cashing restriction … is 'Nil'" contains no notification word. So on the notification
route the ceiling falls away on the **retirement** day while the phase changes on the
**notification** day; and on items 102, 104 and 105(b) the ceiling falls away with **no** phase
change at all (D.2). The single `TrisConversionNotModelledError` currently stands for both events
and must be split.

**Whether the ceiling falls away for the whole financial year or only from the day it is satisfied
is NOT settled by the text** and matters a great deal: the ceiling constrains "total payments …
made in a financial year", so if the constraint lapses mid-year, either (i) the year has no ceiling
at all, and a member turning 65 in March may draw the entire balance in April; or (ii) payments made
before the trigger day remain subject to it. Nothing in reg 6.01(2), reg 6.01AB or reg 1.06(9A)
chooses. **U29 — refuse rather than choose.**

**The Schedule 7 minimum: it still applies, in full, unchanged.** Two independent reasons:

1. **The "unless" is inside (b)(ii) and does not reach (b)(i).** Confirmed against my own fetch of
   reg 6.01(2): the definition runs "(b) a pension provided from a superannuation fund, the rules of
   which: (i) are rules to which paragraph 1.06(9A)(a) applies and that meet the standards of
   subregulation 1.06(9A); **and** (ii) allow total payments … no more than 10% … [(A)/(B)] …
   **unless** the pensioner has satisfied a condition of release … 'Nil'; **and** (iii) comply with
   paragraph (b) of the definition of *non-commutable allocated pension* in subregulation
   6.01AB(1)". The "unless" is punctuated at the end of (ii). (b)(i) is unqualified.
2. **Independently**, after conversion the stream is an account-based pension to which reg
   1.06(9A)(a) applies in its own right, and reg 1.06(9A) is the source of the Schedule 7 floor.

So `minimumDrawdown(...)` remains the whole answer for the floor, and the converted stream is a
minimum-with-no-maximum. `TrisConversionNotModelledError`'s message already says this correctly.

**The conversion is NOT a commencement, so the conversion year's minimum is a FULL-year minimum.**
Sch 7 cl 3 pro-rates only by reference to "the commencement day"; cl 1(2)(a)(ii) reads the balance
on the commencement day only "in the year the pension commences"; and TR 2013/5 ¶10 fixes
commencement as "the first day of the period to which the first payment of the superannuation income
stream relates". A conversion is the same stream continuing. So in the conversion year: the balance
is the **1 July** balance, the factor is the age at **1 July**, there is **no** pro-rating, and cl 4
is irrelevant. An implementer who re-reads the balance on the 65th birthday and pro-rates from there
produces a different, plausible number. **Confidence: `primary-verified` as to cl 3's and cl 1(2)'s
words and TR 2013/5 ¶10; the conclusion is a reading of them (U33).**

#### What changes about fund earnings tax

The chain from phase to the rate is now primary-verified end to end, all three links fetched this
pass:

> **s 307-75(1)** "A \*superannuation income stream benefit is a **retirement phase superannuation
> income stream benefit** (or **RP superannuation income stream benefit**) of a \*superannuation fund
> at a time if it is payable by the fund at that time **from a \*superannuation income stream that is
> in the \*retirement phase at that time**."
>
> **s 295-385(3)** "Assets of a \*complying superannuation fund are **segregated current pension
> assets** at a time if: (a) the assets are invested, held in reserve or otherwise dealt with at that
> time **solely to enable the fund to discharge all or part of its liabilities (contingent or not) in
> respect of \*RP superannuation income stream benefits of the fund at that time**; and (b) **the
> trustee of the fund obtains an \*actuary's certificate** before the date for lodgment of the fund's
> \*income tax return for the income year to the effect that the assets and the earnings that the
> actuary expects will be made from them would provide the amount required to discharge in full those
> liabilities …"
>
> **s 295-385(1)** "The \*ordinary income and \*statutory income of a \*complying superannuation fund
> for an income year **is exempt from income tax** to the extent that: (a) it would otherwise be
> assessable income; and (b) it is **from \*segregated current pension assets**."

**And the amendment that put TRISs outside it is on the same page**, which is worth recording
because it is the whole reason a TRIS is at 15%:

> "S 295-385(3) amended by **No 81 of 2016**, s 3 and Sch 8 item 1, by substituting '\*RP
> superannuation income stream benefits of the fund at that time' for '\*superannuation income stream
> benefits that are payable by the fund at that time' in para (a), effective 1 January 2017 and
> applicable in relation to the **2017-18 income year and later income years**."

LCR 2016/9 ¶15AA states the effect plainly: "From 1 July 2017, superannuation income stream
providers **will be taxed on earnings made from assets supporting a TRIS that is not in the
retirement phase**." So register §3.1's two rows — 15% accumulation/TTR, 0% retirement — are the
right shape, and s 307-80 is the switch between them.

**And here is the blocker.** Both conversion routes land **mid-financial-year**: a 65th birthday
falls on 1 July only for 1/365 of people, and a notification day is whatever day the member wrote
the letter. So **every** conversion produces a year that is part-accumulation and part-retirement —
which is exactly the year `fundEarningsTax` refuses, by design:

> `MidYearPhaseChangeError`: "…where a fund is partly in Retirement Phase for part of a year its
> exempt current pension income is worked out either by segregating assets or by an actuarial
> proportion (register §5A.3 names both methods and states no apportionment rule)…"

s 295-385(3)(b)'s actuary's certificate confirms the shape of the problem — the segregated method is
not an arithmetic apportionment at all, it is an asset-identification exercise with a certificate
attached. **s 295-390 (the proportionate method) was not retrieved by this pass or any prior one.**
The conversion limb of P3-8 therefore **cannot produce a fund earnings tax figure** until the ECPI
apportionment question is answered, and answering it is not in this brief. See §D.7.

#### What transfer balance credit arises, and at what value — REQUIREMENT, not implementation

The parallel chunk owns s 294-25. Stated here as a **requirement on that chunk**, not duplicated:

The conversion is the event in **s 294-25(1) table item 2** — "on a day (**the starting day**) on or
after 1 July 2017, **you start to be the \*retirement phase recipient** of a \*superannuation income
stream" — because s 294-20(1) makes you a retirement phase recipient when "(a) the superannuation
income stream is **in the \*retirement phase** at that time; and (b) a \*superannuation income stream
benefit from it **is payable to you** at that time", and (a) is precisely what flips on the
conversion day.

**R1 — the starting day is the conversion day derived above**: the 65th birthday, or the
notification day. Not the retirement day, not 1 July, not the commencement day.

**R2 — the credit is the value of the WHOLE supporting interest on the starting day**: item 2's
amount column is "the **\*value on the starting day** of the \*superannuation interest that supports
the superannuation income stream". Not the pension payments, not an "amount transferred", not the
growth since commencement. A $900,000 TRIS converting on a 65th birthday credits $900,000 that day.
LCR Example 1A confirms the whole-interest reading on the item 1 analogue; Example 1B ¶30D confirms
the valuation date on the item 2 route.

**R3 — the same day starts the transfer balance ACCOUNT and fixes the personal cap.** s 294-15(2):
you start to have the account on "the later of: (a) 1 July 2017; and (b) the day you first start to
be a \*retirement phase recipient". s 294-35(1): "Your **transfer balance cap** for the \*financial
year in which you **first start to have a \*transfer balance account** is equal to the \*general
transfer balance cap for that financial year." So the conversion year fixes the cap. A member
turning 65 in FY2026-27 has their cap fixed at that year's general cap; they cannot wait for a
higher one, because turning 65 is not an act they can defer. And s 294-40(1)(b) then makes
proportional indexation available only if "**at no time before the start of that financial year has
the \*transfer balance … exceeded your transfer balance cap**" — a cap breach on the conversion day
is permanent.

**R4 — DEPENDENCY, do not resolve here:** "**\*value**" is a defined term. Its measurement (ITAA
1997 s 307-205 and the regulations made for it), the reversionary 12-month deferral in item 2
paragraph (b), and the Subdiv 294-D capped-defined-benefit modifications in Note 1 all belong to the
s 294-25 chunk. This chunk asserts **when** the credit arises and **what it is a value of**, and
nothing about **how the value is worked out**.

**The reason this matters more than it looks:** the item-106 conversion is automatic. A member can
be pushed over their transfer balance cap, incur excess transfer balance tax under s 294-230, and
lose their indexation entitlement permanently under s 294-40(1)(b), **without doing anything at
all**. A forecaster that treats "entering retirement phase" as an act the user chooses will miss it
every time.

---

### D.6 The retrospective TRIS failure — BOTH SOURCES RETRIEVED

`docs/research/p3-minimum-drawdown-and-ttr.md` §3.4 and register §3.9 hold this at `secondary-only`
because "the underlying mechanism is ITAA 1997 s 307-70 / TR 2013/5, which was **not** retrieved".
**Both were retrieved this pass.** The finding is **upgraded in substance, corrected in citation,
and extended in two ways the register does not carry.**

#### (a) s 307-70 — retrieved, and it contains no cessation rule at all

Verbatim, whole section:

> **307-70(1)** A **superannuation income stream benefit** is a \*superannuation benefit specified in
> the regulations that is paid from a \*superannuation income stream.
> **307-70(2)** A **superannuation income stream** has the meaning given by the regulations.
> **Note:** For the purposes of the transfer balance cap, the meaning of *superannuation income
> stream* is affected by subsection 294-50(2).

History, from the same page: "S 307-70 amended by No 55 of 2017, s 3 and Sch 1 item 12, by inserting
the note, effective 1 July 2017. S 307-70 inserted by No 9 of 2007 … applicable on and after 1 July
2007."

**Correction owed.** s 307-70 is a **bare delegation**. It says nothing about cessation, nothing
about retrospectivity and nothing about lump sums. The register's "the underlying mechanism is ITAA
1997 s 307-70 / TR 2013/5" points at a provision that does not contain the mechanism. The operative
definition is **ITAR (1997 Act) 2021 s 307-70.02(1)** — TR 2013/5 fn [1B]: "Superannuation income
stream is defined in subsection 307-70(2) of the *Income Tax Assessment Act 1997* as having the
meaning given by the ITAR (1997 Act) 2021", and ¶52: "A 'superannuation income stream' is defined in
subsection 307-70(2), by reference to subsection 307-70.02(1) of the ITAR (1997 Act) 2021 … as: (a)
an income stream that is taken to be: … (ii) a pension for the purposes of the SIS Act in accordance
with subregulation 1.06(1) of the SIS Regulations". **s 307-70.02 itself was not retrieved** (O58) —
only TR 2013/5's partial reproduction of it.

The complementary provision **was** retrieved and is what turns a failed stream's payments into lump
sums — **s 307-65(1)**: "A **superannuation lump sum** is a \*superannuation benefit that is **not** a
\*superannuation income stream benefit (see section 307-70)." That is the whole mechanism on the
member side: once there is no superannuation income stream, there are no superannuation income
stream benefits, so every payment is a lump sum by residue.

#### (b) TR 2013/5 — retrieved in full; the mechanism is now quoted, not paraphrased

*Taxation Ruling TR 2013/5, "Income tax: when a superannuation income stream commences and ceases"*.
¶4 puts a TRIS squarely inside its scope: "This Ruling **also applies to an account-based pension
that is a transition to retirement income stream** (as defined in paragraph (b) of the definition of
*transition to retirement income stream* in subregulation 6.01(2) of the SISR 1994)."

Verbatim, under the heading **"Failure to comply with pension rules"**:

> **18.** A superannuation income stream is taken to have ceased for income tax purposes if **any of
> the requirements of the SISR 1994 relating to the payment of the superannuation income stream are
> not met in a financial year**. This is the case even if a member remains entitled to receive a
> payment from the superannuation fund in relation to the purported superannuation income stream
> under the governing rules of the superannuation fund, or under general trust law concepts.
>
> **19.** **The trustee is taken not to have been paying a superannuation income stream at any time
> during the income year** [17] in which the requirements are not met.
>
> **20.** If a superannuation income stream ceases for income tax purposes for the reasons outlined
> in paragraph 18 of this Ruling, **it cannot recommence meeting the SISR requirements in a future
> year**. This means it will not be a superannuation income stream for income tax purposes from the
> time of cessation, even if the member remains entitled to receive payments from the superannuation
> fund. For the member to receive a superannuation income stream, **any income stream payable from
> the superannuation interest must cease (for example, by commutation) and a new superannuation
> income stream must commence** under the principles in paragraphs 9 to 13 of this Ruling.

([17] is "This assumes the superannuation fund's income year corresponds with the financial year.")

And in the explanation, ¶100:

> **100.** If a purported superannuation income stream fails to meet these requirements in a
> financial year, the superannuation income stream will be taken to have **ceased at the start of
> that income year** for income tax purposes. Therefore, **from the start of that income year the
> superannuation interest is no longer supporting a superannuation income stream** and the payments
> made from that superannuation interest are not superannuation income stream benefits. Therefore,
> **any payments made during that income year or subsequently are superannuation lump sums**.

Example 6, ¶43:

> "During the 2012–13 year the trustee … makes a single payment to Bill of $50. As this amount is
> less than the minimum annual payment required, the superannuation income stream has not met the
> requirements of the SISR 1994 for the 2012–13 year. **The superannuation income stream ceases for
> income tax purposes at the beginning of this income year, and the $50 payment is a superannuation
> lump sum.**"

#### (c) What is UPGRADED

The retrospective mechanism as §3.4 and §3.9 describe it — cessation at the **start** of the income
year, and **every** payment in the year (not just the excess) becoming a superannuation lump sum — is
now a **verbatim quotation from a public ruling**, not a paraphrase of a web-guidance page.
**Confidence: `ruling-verified`** (a Taxation Ruling is a public ruling the Commissioner is bound by;
it is not primary legislation, and this label should be used rather than `primary-verified`).

**Two things the ruling adds that the register does not carry, and both are material to a
forecaster:**

1. **¶19 — the loss is on the FUND side too, for the whole year.** "The trustee is taken not to have
   been paying a superannuation income stream **at any time during the income year**." Read with
   s 307-75(1) and s 295-385(3)(a), quoted in D.5: if no superannuation income stream was being paid
   at any time in the year, there are no RP superannuation income stream benefits, so there are no
   segregated current pension assets, so **there is no ECPI for that year**. §3.9's row records only
   the member-side lump sum consequence. For a converted (retirement-phase) stream that breaches,
   the fund earnings go from 0% to 15% for the entire year, retrospectively.
2. **¶20 and ¶101 — the stream is dead, not merely disqualified for a year.** "It **cannot
   recommence** meeting the SISR requirements in a future year … any income stream payable from the
   superannuation interest must cease (for example, by commutation) and a **new** superannuation
   income stream must commence". ¶101 adds: "**The proportioning rule must be applied to that new
   superannuation income stream when it commences**" — so the tax-free/taxable proportions are
   re-struck. §3.9 says the plan is "infeasible" for the breach year; on the ruling it is worse than
   that — the breach ends the stream permanently and forces a commutation-and-recommence, which is
   itself a transfer balance debit (s 294-80(1) item 1) and then a fresh credit (s 294-25(1) item 2)
   at the new commencement value. For a retirement-phase stream that round trip can **increase** the
   transfer balance if the interest has grown.

#### (d) What is CORRECTED — the ruling does NOT address the 10% MAXIMUM

State this plainly, because it is the opposite of what the register currently implies.

TR 2013/5's **explanation** reasons entirely through the **minimum**:

> **96.** A superannuation income stream must meet the requirements of subregulation 1.06(1) of the
> SISR 1994, and thus the requirements of **subregulation 1.06(9A)** of the SISR 1994, and the
> commutation standards in regulations 1.07D of SISR 1994. …
> **97.** The requirements of subregulation 1.06(1) … include the standards of subregulation
> 1.06(9A). **If these standards are not met, the requirements of subregulation 1.06(1) will not be
> met.**
> **98.** Subregulation 1.06(9A) … provides that the rules of the superannuation fund meet the
> relevant standards if the rules 'ensure' that the payment is made at least annually and 'ensure'
> that the other requirements as outlined in that subregulation are met.
> **99.** … As the rules of the superannuation fund must 'ensure' that the standards are met it is
> not enough for the rules … to simply include a reference to, or reproduce the terms of, those
> standards. Rather, **the rules (standards) must be met, or given effect to, in practice.**

And its only worked example, Example 6, is a **minimum** failure ($50 paid against a $1,000 minimum).

**The 10% maximum is not in reg 1.06(9A).** reg 1.06(9A), as captured verbatim in
`p3-minimum-drawdown-and-ttr.md`, imposes only a floor ("the **total of payments in any year** … is
**at least** the amount calculated under clause 1 of Schedule 7"), transferability and no-security.
The maximum lives in **reg 6.01(2)(b)(ii)** — the *definition* of a transition to retirement income
stream, which is the existing register trap T57's whole point. So ¶¶96–101's chain (reg 1.06(1) → reg 1.06(9A) → Sch 7)
**does not reach a 10% breach at all**.

The only route to the register's stated consequence is **¶18's broader words** — "**any** of the
requirements of the SISR 1994 relating to the payment of the superannuation income stream" — read
with ¶4 (the ruling applies to a TRIS) and ¶99 (the rules must be "given effect to, in practice", so
a fund whose payments exceed 10% does not have rules that "allow total payments … no more than
10%"). That reading is available, it is the only one on offer, and **no source retrieved by this
pass or any prior one applies it to the maximum**.

**So the finding splits:**

| Proposition | Label |
|---|---|
| The cessation mechanism — retrospective to the **start** of the income year; every payment in the year becomes a superannuation lump sum; the stream **cannot recommence**; the fund is taken not to have been paying an income stream at any time in the year | **`ruling-verified`** — TR 2013/5 ¶¶18–20, 100–101 and Example 6, quoted verbatim |
| That mechanism applies to a breach of the **reg 6.01(2)(b)(ii) 10% maximum** specifically | **`secondary-only`, and an inference from ¶18's general words.** ATO web guidance (register §3.9's existing source) asserts it; the ruling never applies it to a maximum and gives no example. **U31 / O61** |

**Effect on code: none.** `ttrPaymentRange` already treats the ceiling as a hard constraint and does
not compute past it. What changes is the citation, the confidence basis, and the fact that the
consequence is **permanent** rather than annual — which belongs in the refusal message and in
§3.9's row.

---

### D.7 What the conversion limb of P3-8 now has, and what remains blocked

**What the conversion limb of P3-8 now has, and can be built on:**

1. **A complete, primary-verified decision procedure** for s 307-80(1)–(4) (D.1), including the
   exact shape of the (3) conjunction and the s 294-50(3) divergence inside the 60-day window.
2. **The conversion day, for both routes** (D.5): the 65th birthday for item 106, the notification
   day for items 101/102A/103. The second is fixed by LCR 2016/9 Example 1B ¶30D, which also fixes
   the valuation date of the credit.
3. **The item-106 answer** — automatic conversion, no notification — at a labelled confidence
   (D.2), which is what `TrisRetirementPhaseNotModelledError` was refusing for want of.
4. **Schedule 1 Part 1 items 101, 102A, 103, 106 verbatim with their "Nil" cashing restrictions**,
   which is the provenance `conditionOfRelease.ts` correctly said the project did not have.
5. **The payment-range consequences** (D.5): the ceiling goes, the Schedule 7 floor stays whole via
   reg 6.01(2)(b)(i)'s unqualified limb, and the conversion year's minimum is a full-year minimum.
6. **The fund-earnings-tax chain, primary-verified end to end**: s 307-80 → s 307-75(1) →
   s 295-385(3)(a) → s 295-385(1), plus the No 81 of 2016 Sch 8 item 1 amendment that put TRISs
   outside it.
7. **A stated requirement for the transfer balance credit** (D.5 R1–R4), scoped so it does not
   collide with the s 294-25 chunk.
8. **The breach consequence, upgraded to `ruling-verified` and extended**: retrospective to the
   start of the income year, all payments become lump sums, no ECPI for the whole year, and the
   stream **cannot recommence** (D.6).

**What can be built immediately, without any further retrieval:**

* Split `TrisConversionNotModelledError` into the two events it currently conflates — the reg
  6.01(2) ceiling lapse (wider trigger, earlier day) and the s 307-80 phase change (narrower
  trigger, later day) — and correct its "no longer a transition to retirement income stream"
  sentence.
* Add the four inputs the test needs to `superPhase.ts` (stream kind as a discriminant, reversionary
  flag, Schedule 1 item set, notification fact) and the refusals named in D.4.
* Narrow `TrisRetirementPhaseNotModelledError` so the item-106 case is answered rather than refused.
* Add `ReversionaryStreamNotModelledError` and `CommutationAuthorityNotModelledError`.
* Write §3.10 and the §3.9 corrections (see `## Corrections owed to existing artefacts`).
* Write every test in the §D traps (T115–T125) **except** those that need a fund earnings tax figure for the
  conversion year.

**What remains BLOCKED, and by what:**

| Blocked | Blocked by |
|---|---|
| **A fund earnings tax figure for the conversion year** — i.e. the number a TTR strategy is actually evaluated on | **O60 / U30.** Every conversion is mid-year, and `MidYearPhaseChangeError` refuses mid-year phase changes because §5A.3 states no apportionment rule and s 295-390 was never retrieved. **This is the binding constraint on the whole limb.** |
| **The amount of the transfer balance credit** | **O62** — the s 294-25 chunk owns "\*value". The conversion limb can assert the day and the object; it cannot assert the number. |
| **A cap check on the credit** | **P3-9.** The credit is computable in principle but there is no transfer balance account, no personal cap and no excess machinery in `src/`. |
| **Item-101 identification for a Person aged 60–64 who ceased employment** | **O59 / U28** — reg 6.01(7) unretrieved. |
| **Any reversionary case** | **D.3** — refuse; needs death benefits, Subdiv 294-E and reg 6.21, none in the register. |
| **The 10%-breach path** | Not blocked for **enforcement** (the ceiling is already a hard constraint), but blocked for **modelling what happens after** a breach: TR 2013/5 ¶20 says the stream dies permanently, and the model has no way to represent a dead stream. Until it does, the breaching year must refuse. |

**One-line summary for TODO.md P3-8:** the *legal* content of the conversion limb is now closed
except for the item-101 mapping; the *computational* content is blocked on ECPI apportionment
(O60), which is a different research pass and is not in this brief.

---

## A ↔ B — the convergence, and the disagreements that need a decision

§A and §B were run as separate passes over separate provisions. They are reconciled here rather than
silently interleaved, because *where* they agree is itself evidence and *where* they differ is a
decision that must not be resolved by editorial preference.

### The convergence: the historical-high pair is required, and two independent routes reach it

**Merged statement of the requirement.** Every Person must carry, as state that survives a
financial-year boundary and — for any Person whose transfer balance account started before the
forecast — as a **user-supplied Setting**:

1. **`highestEndOfDayTransferBalance`** — the highest \*transfer balance in the account **at the end of
   any day**, over every day from the account's start to the end of the previous financial year
   (s 294-40(2)(a)). **Monotone non-decreasing; may be negative** (s 294-30(2) Note 2); **never reduced
   by a later debit**; measured at the **end of the day**, never intraday.
2. **`highestBalanceDay`** — **the earliest** day on which that maximum was attained, where it was
   attained on more than one day (s 294-40(2)(b)). Written only on a **strict** increase, never on a tie.

§A adds a third field that §B does not name — **`personalCapOnHighestBalanceDay`** — because the
denominator in s 294-40(2)(c) is *your personal cap on that day*, and recomputing it later would need
the Person's entire cap history. The merged requirement is therefore **§A's field list, of which §B's
Setting 3 is a subset**; see the disagreement note below.

**The two routes, stated so the convergence stays visible:**

- **§A's route (indexation).** s 294-40(2) cannot be evaluated without the pair. The high-water balance
  is the numerator and the cap *on the day it was attained* is the denominator, so the pair is not a
  convenience — it is two of the four operands of the only provision that ever moves a personal cap
  (§A.2, §A.3, fields 4–6 of the §A.3 state table; traps **T58**, **T59**, **T71**).
- **§B's route (Settings triage).** Walking the credit and debit tables to decide what a two-person
  forecaster can compute, §B reached the same pair from the other end: the historical high is
  **"distinct from the opening transfer balance and will be collapsed into it unless it is a named
  Setting"** — because a Person who has commuted down has an opening balance *below* their historical
  high, and it is the high that governs indexation (§B.5 Setting 3; open item **O46**; trap **T84**).

**Why the convergence matters.** Neither pass was looking for the other's conclusion. §A derived the
pair as an arithmetic necessity of a formula; §B derived it as a data-availability fact about a user
who cannot be asked for what the tool can compute. That two unrelated lines of reasoning land on the
same two fields — and on the same failure mode, collapsing the high into the current balance — is the
strongest signal in this cluster that the pair is real and must be built. **T58** (§A) and **T84**
(§B) are the same trap found twice, independently, and both fixtures should be kept: §A's is a
$1,200,000 credit with a $300,000 commutation (cap must be **$2,040,000**, not $2,055,000); §B's is a
peak of $1,900,000 commuted to $1,200,000 before an indexation event.

### Disagreements and unreconciled differences — flagged, not resolved

| # | §A says | §B says | Why it needs a decision |
|---|---|---|---|
| **1. The name of the refusal for a pre-existing pension** | **`UnknownPersonalTransferBalanceCapError`**, carrying the list of fields the user must supply (§A.6) | **`PreForecastTransferBalanceNotDerivable`**, folded into an opening-position Setting (§B.5, credit item 1) | Same refusal, two names, and both are proposed for the register. One name must win before either is registered (§A O42, §B **O48**). Not resolved here. |
| **2. What the Settings block must contain** | **Seven** fields (§A.3 table): account start day, personal cap, transfer balance, historical high, high day, **cap on the high day**, and a latching **`hasEverExceededCap`** | **Six** Settings (§B.5), of which only three overlap: account start FY, opening transfer balance, historical high + earliest day. **No `personalCapOnHighestBalanceDay` and no `hasEverExceededCap`** | §B's list is **insufficient to compute the personal cap**: knowing only the start *financial year* requires replaying every intervening year's s 294-40 increase, which needs the very history the Person cannot supply. §A's list is sufficient. A decision is needed on whether the merged Settings block is §A's seven fields (recommended by the arithmetic) or whether §B's smaller ask is defended on usability grounds — but if §B's is chosen, the shortfall must be named, not assumed away. |
| **3. Granularity of the account-start Setting** | the account start **day** (s 294-15(2)) — needed because the day also seeds the high-water day for a Person whose first credit is their high | the start **financial year** — "*in which financial year did it start?*" | The day is strictly more information than the year, and s 294-35(1) needs only the year. Cheap to resolve in favour of the day; recorded so it is resolved deliberately. |

**Not a disagreement, though it reads like one:** §B.1 writes the rounding as "87.5%→**88%** unused"
for a $200,000 pension against a $1.6m cap. That is the *unused* percentage after §A.2's rule
(12.5% used → rounded **down** to 12% used → 88% unused), not a competing rounding rule. Both passes
state the same rule: **s 294-40(2)(c) rounds the *used* percentage down, which rounds the *unused*
percentage up** (§A.2; §B.5/T84's cross-check). §A's hand example 3 ($1,234,567 → **$2,039,000**) is
the fixture that pins it.

**Consistency with the settled ruling on breaches.** §B.5 (credit item 3) independently recommends
that the engine **refuse** rather than price excess transfer balance tax — "*a plan that breaches the
cap is not a plan with a tax line — it is an infeasible plan*" — and §A.3 field 7 independently
requires a **latching** `hasEverExceededCap`. Both are consistent with the settled decision that the
engine hard-refuses to project any financial year containing an end-of-day cap breach, does not
implement excess transfer balance tax, and carries a latching "has ever exceeded the cap" flag. The
write-up of that decision belongs to **§C** and is not made here; §B's refusal name
**`TransferBalanceCapExceeded`** and §A's traps **T67** (do not un-latch the flag; do not key it off
"had excess transfer balance") and **T68** (exact equality still costs the entitlement) are recorded
in their own passes and should be read as inputs to §C, not as open questions.

---

## A ↔ C — the latching flag, reached twice

§A and §C were run as separate passes over separate provisions — §A over the indexation machinery,
§C over the excess and its enforcement. They converged on one field.

### The convergence: `hasEverExceededCap`

**§A already states the requirement, and it is not restated here.** §A.3 sets it out in full: field 7
of the §A.3 state table (`hasEverExceededCap`, boolean, **latching**, updated at the end of every day
as `|= (todayCloseBalance > personalTransferBalanceCap_thatDay)`); the order-of-operations block that
guards the s 294-40 increase on it as at **the start of** the financial year; the note that it should
be persisted rather than derived, because the derivation `field4 > field6` rests on an unverified
assumption about Subdiv 294-E (**U12**, **O43**); and traps **T67** and **T68**.

**§C reached the same field from the other end.** §C.6 reads s 294-40(1)(b) as the real cost of a
breach — *"one end-of-day excess, of one dollar, at any time in the member's life, permanently
disqualifies them from every future proportional indexation increase"* — and measures it against
§C.1.3's tax figure: the same $200,000 / 90-day breach costs **$857** in tax and *every future
indexation step on the personal cap* under s 294-40(1)(b). §C.8's sixth argument then makes the field
a condition of the refusal rather than an alternative to it: refusing prevents *new* breaches inside
the projection and cannot erase one that happened before it, so **without the field the refusal is a
fair-weather guard that quietly restores an indexation entitlement the law has already removed**.

**Two independent routes.** §A derived the flag as a guard on the only provision that ever moves a
personal cap — it had to exist for s 294-40 to be evaluable at all. §C derived it as the one piece of
Div 294 excess machinery that survives a decision *not* to model excess transfer balance tax. Neither
pass was looking for the other's conclusion, and the second route is the stronger evidence, because
§C reached the field while arguing that almost everything else in its cluster should not be built.

**§C's "sharper point" is already §A's.** §C's contribution was expected to be that the
"ever exceeded" set is **not** the same set as "had excess transfer balance". §A carries that
already, at §A.3, and carries it in stronger form — it quotes LCR 2016/9 ¶76 verbatim
(*"even though your excess transfer balance is **disregarded** for the transitional period … your
transfer balance **has still exceeded** your transfer balance cap and you will **not** be entitled to
increase your transfer balance cap"*), states the conclusion in terms (*"a Person can have been
relieved of excess transfer balance tax and still be barred from indexation"*), and encodes it in
**T67**. §C states the same discrimination without the ¶76 citation. **So this is a second
independent arrival at a point §A had already made, not a new finding**, and the register row should
cite §A's ¶76 quotation as the authority.

### Three consequences of reading §A and §C together

1. **Under the settled ruling the flag is fed only by the Setting.** §A.3's write rule updates field 7
   at the end of every projected day. §C.8 refuses any financial year containing an end-of-day
   breach. The two compose: a projected day that would set the flag throws instead, so **the
   end-of-day test in §A.3 becomes the detector that fires the refusal, and the flag's only live
   write path is the user-supplied history**. This does not weaken the field — it is the whole reason
   §C.8 insists on it — but it changes what a test can exercise: **T67's fixture ("exceeds by $50,000
   on one day in FY2021-22 and commutes it out the next week") must be expressed as Setting-fed
   history, not as projected days**, because projected days that breach are refused.
2. **§A's within-year note survives and matters for the refusal's granularity.** §A.3 records that an
   exceedance during FY *n* does not claw back the increase already granted on 1 July of FY *n*; it
   bars FY *n+1* onwards. §C.8 refuses the *financial year containing* the breach. The two are about
   different things — one is the indexation arithmetic, the other is what the engine will project —
   and neither displaces the other, but a reader who conflates them will think the refusal is doing
   the indexation work.
3. **One field, three spellings.** §A.3 writes `hasEverExceededCap`; §C.8's sixth argument writes
   `hasEverExceeded`; §C's drafted register row writes `transferBalanceHasEverExceededCap`. They are
   the same field. The settled ruling names it **`hasEverExceededCap`**, which is §A's spelling, and
   that is the name the register row should carry.

### What §C adds that §A does not have

- **A fixture from the enforcement side.** §C.4: a member with a $2.3m interest against a $2.1m cap
  whose provider does not comply gets a **$2.3m** item 5 debit — the whole interest, not the
  $200,000 excess — and has, by then, already had a day over the cap, so s 294-40(1)(b) is failed
  permanently *and* their transfer balance is deeply negative with no consequence (s 294-30(2)
  Note 2). It is the strongest single illustration that the flag and the balance are independent
  state.
- **The reason the flag cannot be inferred from the tax.** §C.2 shows liability can arise with no
  determination and no assessment (s 136-10(1) Note), so "was ever assessed" is a strictly smaller
  set again. §A's T67 warns against keying the bar off excess transfer balance tax liability; §C
  explains why that set is smaller in two independent ways (never assessed, and disregarded under the
  transitional relief).

---

## B ↔ D — the TRIS conversion, reconciled

§B.4 and §D (D.1, D.2, D.5) analysed the same event from different ends: §B from the credit table
inward, §D from the entry test outward. They are reconciled here into one account. Where they agree
the point is stated once, with a note that both reached it; where they differ the difference is
flagged as a decision and **not** resolved by preference.

### Where they agree — stated once

1. **There is no special TRIS provision.** The conversion is a composition: s 307-80(3) stops
   applying → s 307-80(1) applies on its own terms → s 294-20(1) makes the member a retirement phase
   recipient → **s 294-25(1) item 2** credits *"the \*value on the starting day of the
   \*superannuation interest that supports"* the stream, *"on the starting day"*. §B.4 states it as a
   three-section composition; §D.5 states it as requirement **R1–R2** on the s 294-25 chunk. Same
   mechanism, same provisions.
2. **Two routes, two different days.** Items 101 / 102A / 103 convert on the day the provider is
   **notified**; item 106 converts on the **65th birthday**. Both passes reach this, and both fix the
   notification-route day on the same authority — **LCR 2016/9 Example 1B ¶30D** (Raj: retires
   30 June 2019, notifies 15 July 2019, *"The TRIS is in the retirement phase on 15 July 2019"*),
   which both quote verbatim and both read as also fixing the **valuation date** of the credit.
3. **The fortnight is worth a year.** Both draw the same consequence from ¶30D: retirement in one
   financial year and notification in the next moves the account-start year, and therefore the
   personal cap fixed by s 294-35(1), and therefore the year the fund's earnings become exempt.
4. **The credit is the whole supporting interest, including every dollar of TTR-phase growth.** §B.4:
   a TRIS commenced at $800,000 at 60 and converting at $1,050,000 credits **$1,050,000** (trap
   **T78**). §D.5 R2: a $900,000 TRIS converting on a 65th birthday credits **$900,000** that day
   (trap **T121**). **Both fixtures should be kept** — they test the same rule from different
   starting balances.
5. **The conversion day is also the account-start day and the cap-fixing day.** s 294-15(2)(b) and
   s 294-35(1). §B.4 says it; §D.5 R3 says it and adds the s 294-40(1)(b) corollary — a cap breach on
   the conversion day is permanent.
6. **Item 106 is absent from s 307-80(3)(b)(ii)'s enumerated list and that absence is the finding.**
   Both passes read (b)(i) as pointing at *paragraph* (2)(c) — all four items — and (b)(ii) as
   pointing at *subparagraphs* (2)(c)(i), (ii) or (iii) — three of the four. See the label
   disagreement below.
7. **Nothing in the debit table fires on conversion.** §B.4 works the direction of item 6 (it
   requires a stream *of which you were a retirement phase recipient* to *stop being* in retirement
   phase) and inspects the eight-item table. §D does not contradict it.
8. **"No re-exit" and s 307-80(4) are compatible, not conflicting.** §B.4 says the stream cannot fall
   back out of retirement phase **"by that route"** — i.e. by s 307-80(3)(b) on the same facts. §D.1
   step 3 and §D.6 supply two *other* routes out: s 307-80(4) (commutation-authority non-compliance)
   and TR 2013/5's cessation on a payment-standards failure. §B's qualifier holds; read together, the
   correct statement is **"cannot re-exit by the (3)(b) route; can still be removed by (4) or by
   cessation"**.

### Where they disagree — decisions, not resolved here

| # | §B says | §D says | Why it needs a decision |
|---|---|---|---|
| **4. The confidence label on the automatic-conversion-at-65 finding** | *"Confidence: **primary-verified** on the structure of s 307-80(3)(b), public-ruling-corroborated. But see U16 for a real textual anomaly in the overlap case"* (§B.4) | **"`inference from an express enumeration` — specifically, an argument from the ABSENCE of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — CORROBORATED BY A PUBLIC RULING. It is NOT bare `primary-verified`, and must never be recorded as such"** (§D.2) | One register row cannot carry both labels. The two are not stylistic variants: §D's says the proposition is read *off a list*, with the three reasons the negative is strong (express and closed enumeration; eight lines below a paragraph enumerating all four; no residual limb) and the express warning that no primary provision says it in terms. **§D's wording is reproduced in full at §D.2 and must not be silently narrowed to §B's** when the row is written. The decision is which label the register carries — it is not made here. |
| **5. Is the conversion day derived or stated?** | *"the day and the notification are **Settings**"* — the conversion limb needs exactly three inputs: the conversion **day**, the balance on that day, and the notification fact (§B.4, §B.5) | the item-106 day is **derivable** from the date of birth, and `TrisRetirementPhaseNotModelledError` should be **narrowed** so the item-106 case is answered rather than refused — *"refusing it would be refusing a case the register answers"*; only the **notification** fact is a user-supplied fact, and it is per-stream, not per-Person (§D.4) | This is the highest-money disagreement in the pair. If the age-65 conversion day is a Setting the user must supply, a user who does not supply it gets **no conversion, no credit, no cap check and no ECPI change** — which is precisely the failure both passes independently wrote a trap against (**T80**, **T117**). If it is derived, the engine converts a TRIS on a birthday the user never mentioned, which is what the law does. Decide before either the Settings block or the refusal set is registered. |
| **6. How many inputs the entry test needs** | three (above) | **seven** — time, benefit-payable, stream kind, reversionary flag, the Schedule 1 **item set**, the notification fact, and commutation-authority facts — of which **four are absent from `src/core/superPhase.ts` entirely** (§D.4) | Mostly reconcilable rather than contradictory: §B's three are what the **credit** needs *once the phase answer is known*, and §D's seven are what **deriving** the phase answer needs. It becomes a real conflict only through disagreement 5 — if the day is derived, §D's list governs and §B's three are insufficient. |
| **7. The name of the reversionary refusal** | **`ReversionaryPensionNotModelled`** (§B.5/§B.6, open item **O48**) | **`ReversionaryStreamNotModelledError`** (§D.3, §D.4) | Same refusal, two names — a third instance of the pattern §A ↔ §B flagged as its disagreement 1 (`UnknownPersonalTransferBalanceCapError` vs `PreForecastTransferBalanceNotDerivable`). **This is evidence about that disagreement, not a settlement of it**: the collision is now systematic across three independent passes, which is an argument for naming the refusals in one place before any of them is registered. Also note the adjacent pair that is *not* a collision: §B's `StreamCeasedOutsideCommutationNotModelled` and §D's `CommutationAuthorityNotModelledError` refuse different things. |

**Both passes independently recommend refusing the reversionary case**, for the same reason stated
differently: §B lists it among the credit-table refusals; §D.3 gives the fuller argument — the
register carries nothing on death benefits, the v1 `DEATH` what-if (register O16) makes the state
reachable rather than hypothetical, and modelling (aa) without the s 294-25(1) item 2(b) twelve-month
deferral, Subdiv 294-E and SISR reg 6.21 produces *"0% fund tax with no cap check for a year — the
most flattering wrong answer available"*. That is agreement on the substance and disagreement only on
the name.

### The consistency question: are §B's U16 and §D's Case D the same answer?

**They are not consistent as written. They are consistent once §D's finding is qualified — and the
qualification does not close U16.** Worked through, because this is the one place where the two
passes reach opposite results on the same enumeration.

- **§D's Case D is sound on its own facts.** The member has satisfied **item 106 and nothing else in
  (2)(c)**. Then (b)(i) is false — item 106 *is* "a condition of release specified in paragraph
  (2)(c)" — and (b)(ii) is false — item 106 is *not* among "(2)(c)(i), (ii) or (iii)". Paragraph (b)
  fails, the (a)/(aa)/(b) conjunction fails, and the stream is in retirement phase under s 307-80(1)
  from the birthday. §B.4 reaches exactly the same conclusion on exactly these facts, and both
  passes wrote the same trap against the mirror error (**T80**, **T117**).
- **§B's U16 is a different fact pattern, and §D's table does not contain it.** The member retired at
  62 (**item 101**), never notified the provider, and then turns 65. Paragraph (b) is a
  **disjunction**: *(i) … **or** (ii) …*. Limb (b)(ii) is satisfied on its own terms — this person
  *has* satisfied a condition of release specified in subparagraph (2)(c)(i), and *has not* notified
  the provider of that fact. So **(b) is TRUE**, the conjunction holds, and s 307-80(3) continues to
  exclude the stream. Attaining 65 adds a fourth satisfied item; it does not un-satisfy (b)(ii), and
  there are no words in (b) that make the limbs exclusive or that let a later item displace an earlier
  one.
- **Therefore §D's four cases are exhaustive only over mutually exclusive fact patterns.** Case D
  reads "Item 106 satisfied (attained 65), provider not notified"; it does not say "and no other item
  in (2)(c) has been satisfied", and on the overlap the (b)(ii) column would flip from false to true
  and the answer with it. §D's general sentence — *"turning 65 converts a TRIS automatically, with no
  notification and no act by the member of any kind"* — is therefore **true only for a member who has
  satisfied none of items 101, 102A or 103**. Read without that qualifier it contradicts the bare
  text in the overlap case, which is the case §B's U16 identified.
- **What §D adds to U16, and what it does not.** It adds the enumeration argument (express, closed,
  eight lines below a paragraph enumerating all four, no residual limb) — which strengthens the
  "65 converts" reading for the **non-overlap** case and says nothing about the overlap, because in
  the overlap the operative limb is (b)(ii), which is engaged on its own terms rather than by
  absence. It adds the LCR 2016/9 ¶15 and Example 1A corroboration — but ¶15's first bullet is stated
  as a standalone alternative without addressing what happens when both bullets are engaged, and
  Example 1A does not say whether Robert had retired without notifying. **Nothing in §D closes U16.**
- **Recorded as O65.** §B's **O50** already recommends implementing the ATO's reading (age 65
  converts) and carrying the anomaly as a labelled inference. O65 records that §D analysed the same
  enumeration, reached a compatible answer on the non-overlap facts, and left the overlap untouched —
  so O50's recommendation stands on §B's reasoning alone and gains nothing from §D.
- **The money direction is unchanged from U16:** the two readings differ in *which financial year
  fixes the personal cap* under s 294-35(1) — the difference between a $2.0m and a $2.1m base cap in
  the current pair of years — and in the day on which the whole supporting interest is valued and
  credited, and in whether the fund's earnings become exempt on the birthday or on a notification day
  that may never come.
- **One concrete correction falls out of this.** §D's trap **T117** is drafted as *"member attains 65
  on 14 February, has told nobody, still holds a TRIS → retirement phase from 14 February"*. As
  drafted it is silent on whether the member had retired earlier, so it encodes one side of the
  unresolved reading. **The fixture must state that no item 101, 102A or 103 was satisfied before the
  birthday** — otherwise the test asserts a proposition the statute's bare text denies.

---

## Corrections owed to existing artefacts

**Record only.** Nothing in this pass edited `docs/assumptions-register.md`, `TODO.md` or any file
under `src/`. Everything below is a correction that a later agent must apply, written so it can be
applied without re-reading the sources. Each item names the artefact, the text that is wrong, and
what it should say instead.

Two corrections in this class were raised by §A and are **still not written**: **O44** (the
`UnsourcedIndexBaseError` throw in `src/core/superCaps.ts` is no longer justified now that the
Dec 2016 CPI index number is in hand, and `generalTransferBalanceCap` should become a real s 960-285
computation over a config index series) and **O45** (the register §3.1 *General Transfer Balance Cap*
row cites s 294-35(3) for $2,100,000, but that subsection contains $1,600,000). They belong in this
section; this pass did not write them, and the pointer is left so they are not lost.

Both §C and §D drafted a register **§3.10** in their chunk files
(`docs/research/p3-9-chunks/chunk-c-excess-and-enforcement.md` and
`chunk-d-entry-test-and-tris-conversion.md`). Those drafts are **not** reproduced here — their rows
restate the analysis above — but they are the starting point when §3.10 is actually written, and the
two drafts must be merged rather than applied in sequence, because both claim the same section
number.

---

### Owed to `docs/assumptions-register.md` §3.9 — from §D

**C1 — the "TTR maximum — when it falls away" row.** It currently reads: *"the 10% limb ceases to
constrain once the pensioner satisfies a condition of release with a 'Nil' cashing restriction (the
"unless" in reg 6.01(2)); **the stream becomes an ordinary retirement-phase pension** with a minimum
and no maximum"*. Three things in that sentence are wrong or incomplete and each is a different
number. Replace with:

> the 10% limb ceases to constrain once the pensioner **satisfies** a condition of release whose
> Schedule 1 column 3 cashing restriction is **'Nil'** — items **101, 102, 102A, 103, 104, 105(b)
> and 106**, a **wider** set than the four items ITAA 1997 s 307-80(2)(c) uses for the tax phase.
> Three consequences the previous wording collapsed: (i) the stream is **not** thereby in the
> retirement phase — items 104 and 105(b) leave it at 15% with no transfer balance credit (§3.10,
> T118); (ii) even on the shared items the ceiling falls away on **satisfaction** while the phase
> changes only on **notification**, so there is a window with no maximum, 15% fund tax and no credit
> (§3.10, T119); (iii) the product **remains a transition to retirement income stream** under the
> SISR — s 307-80(3)(a)(i) presupposes exactly that. The **Schedule 7 minimum survives**, because
> reg 6.01(2)(b)(i)'s limb is unqualified: the "unless" is punctuated inside (b)(ii).
> **Confidence: primary-verified. Retrieved 2026-09-09.**

**C2 — the "Exceeding the maximum" row.** Its source cell currently reads: *"ATO, Transition to
retirement income streams (TRIS) (2 Apr 2025). The underlying mechanism is ITAA 1997 s 307-70 /
TR 2013/5, **not retrieved**"* at `secondary-only`. **Both were retrieved on 2026-09-09.** Replace
with a split:

> **The mechanism — `ruling-verified` (TR 2013/5, retrieved 2026-09-09).** *"A superannuation income
> stream is taken to have ceased for income tax purposes if any of the requirements of the SISR 1994
> relating to the payment of the superannuation income stream are not met in a financial year"*
> (¶18); *"The trustee is taken not to have been paying a superannuation income stream **at any time
> during the income year**"* (¶19); *"the superannuation income stream will be taken to have **ceased
> at the start of that income year** … any payments made during that income year or subsequently are
> **superannuation lump sums**"* (¶100); *"**it cannot recommence** meeting the SISR requirements in a
> future year … any income stream payable from the superannuation interest **must cease (for example,
> by commutation) and a new superannuation income stream must commence**"* (¶20), with the
> proportioning rule reapplied (¶101). **Two things this register did not carry: the fund loses ECPI
> for the WHOLE year (¶19, read with ss 307-75(1) and 295-385(3)(a)), and the stream is dead
> permanently — a breach is not a bad year, it is the end of the stream** (T123).
> **The citation was wrong.** ITAA 1997 **s 307-70 contains no cessation rule**: it is a bare
> delegation — *"A superannuation income stream has the meaning given by the regulations"* (s
> 307-70(2)). The operative definition is **ITAR (1997 Act) 2021 s 307-70.02(1)** (TR 2013/5 ¶52 and
> fn [1B]), which is **still not retrieved — O58**. The lump-sum characterisation comes from
> **s 307-65(1)**: *"A superannuation lump sum is a superannuation benefit that is not a
> superannuation income stream benefit"*.
> **The application to the 10% MAXIMUM remains `secondary-only` — O61/U31.** TR 2013/5's reasoning
> at ¶¶96–101 runs reg 1.06(1) → reg 1.06(9A) → Sch 7 cl 1, i.e. the **minimum**, and its only
> example (Example 6, ¶43) is a minimum failure. **reg 1.06(9A) contains no maximum** — the 10% is in
> reg 6.01(2)(b)(ii) (T57). Only ¶18's general words reach a maximum breach, read with ¶4 (the ruling
> applies to a TRIS) and ¶99 (*"the rules (standards) must be met, or given effect to, in practice"*).
> That reading is the only one on offer and no source applies it. **Do not cite TR 2013/5 as stating
> the 10%-breach consequence; cite it as stating the mechanism a 10% breach is inferred into.**

**C3 — the Access table's "Condition of Release" row.** It reads *"a boolean per Person, independent
of age — ceasing gainful employment after 60, or turning 65"*, sourced to "ITAA 1997 · SIS
Regulations (P0 pass)" with **no item numbers** — which is why `src/core/conditionOfRelease.ts`
records, correctly, that "citing one here would be provenance this project has not got". **That
provenance now exists.** Add the item numbers and the source:

> **SISR Schedule 1, Part 1 (Regulated superannuation funds)**, retrieved 2026-09-09 at
> `REG/19940057/Sch1`, columns 1–3 verbatim: **101 Retirement — Nil**; **102 Death — Nil**;
> **102A Terminal medical condition — Nil**; **103 Permanent incapacity — Nil**; **106 Attaining age
> 65 — Nil**. §3.9's "turning 65" is **item 106**; §3.9's "ceasing gainful employment after 60" is
> intended to be **item 101 (Retirement)**, but the SISR definition of "retirement" is **reg
> 6.01(7), which has never been retrieved (O59)** — so the item-101 mapping is `unverified` and
> must not be asserted. ITAA 1997 s 307-80(3)(b) turns on **which item**, not on the boolean, so the
> item identity is now load-bearing and not merely a citation.

**C4 — a pointer row.** §3.9 says nothing about what a TTR stream *becomes*. Add one line at the end
of "The TTR range":

> **What the stream becomes on conversion is §3.10**, not this section: the entry test is ITAA 1997
> s 307-80, the conversion day differs by route, and the two events — the ceiling lapsing and the
> phase changing — are not the same event on the same facts on the same day.

---

### Owed to shipped code — contradictions §D found in `src/`

**Record only; no source file was edited by this pass.** Each item is a statement in shipped code
that §D's retrieved sources contradict.

#### `src/core/ttrPaymentRange.ts`

1. **The refusal message says the stream stops being a TRIS. It does not.** The message reads *"the
   income stream is no longer a transition to retirement income stream"*. §D.2 shows this is wrong on
   the face of s 307-80(3)(a)(i): subsection (3) applies to a stream that **is** *"a transition to
   retirement income stream (within the meaning of Part 6 of the SIS Regulations)"* and then asks
   separately, in (b), whether the recipient has satisfied and notified. If satisfying a condition of
   release ended the product's TRIS character, (3)(a)(i) and (3)(b) could never both be engaged and
   (b) would be dead text. What changes on conversion is the stream's **tax phase**, not its SISR
   identity; the ATO's own term for the converted state is *"TRIS in the retirement phase"*
   (LCR 2016/9, heading to Example 1A).
2. **`TrisConversionNotModelledError` conflates two events that have different triggers and different
   days, and must be split.** §D.2 and §D.5: the reg 6.01(2)(b)(ii) **ceiling lapse** fires on the
   *wider* set (Schedule 1 column 3 "Nil" — items 101, 102, 102A, 103, 104, 105(b), 106) on the day
   the condition is **satisfied**, with no notification word anywhere in the provision; the
   s 307-80 **phase change** fires on the *narrower* set (items 101, 102A, 103, 106) and, for
   101/102A/103, only on the day of **notification**. Items 104 and 105(b) remove the maximum and
   change nothing about phase — no ceiling, still 15% fund earnings tax, no transfer balance credit.
   Traps **T118** and **T119**.
3. **The consequence of exceeding the 10% maximum is permanent, not annual, and the message should
   say so.** TR 2013/5 ¶20: the stream *"cannot recommence meeting the SISR requirements in a future
   year"*; ¶101: a new stream must be commenced and the proportioning rule reapplied. §3.9 calls the
   breach year "infeasible"; on the ruling the stream is dead and a commutation-and-recommence is
   forced, which is itself a s 294-80(1) item 1 debit followed by a fresh s 294-25(1) item 2 credit
   at the new commencement value — a round trip that can **increase** the transfer balance. Trap
   **T123**. **Effect on the computation: none** — `ttrPaymentRange` already treats the ceiling as a
   hard constraint and does not compute past it. What changes is the citation, the confidence basis
   and the refusal message.

#### `src/core/superPhase.ts`

4. **The `UNCAPPED_ENTRY` caveat becomes half-stale the moment §3.10 lands, and a half-stale caveat
   is worse than none.** It currently says ITAA 1997 s 307-80's entry test *"is not in the register"*
   and that the transfer balance cap *"is not modelled (P3-9) — no amount here has been checked
   against it"*. §D.4: the first clause must be retired once §3.10 exists. §C's **O57** covers the
   second clause: under the settled decision in §C.8 the caveat is replaced by an **actual check and
   a refusal**, so it must not be left saying "not modelled" once it is modelled. Leaving the stale
   half on every Retirement Phase result invites a reader to discount the half that is still true.
5. **`TrisRetirementPhaseNotModelledError` fires for every Person with `release.met === true` and
   must be narrowed.** §D.4: after §3.10 the item-106 case is determined — automatic, no
   notification, from the 65th birthday — and refusing a case the register answers is its own kind of
   error, which `conditionOfRelease.ts` already identifies. **But see disagreement 5 in §B ↔ §D and
   O65** — narrowing it presupposes that the age-65 conversion day is derived rather than stated, and
   that the member satisfied no earlier unnotified condition.
6. **The converted case needs a different constructor, not a mutable `phase` field.**
   `transitionToRetirementInterest` returns `AccumulationInterest`, and that return type is the
   defence — *"writing `phase: 'retirement'` into that constructor is a type error"*. §D.4: that
   defence is still correct for a **non-converted** TRIS and must not be weakened; a converted TRIS
   is a retirement phase interest and must come from a constructor that takes the extra facts.
7. **Four inputs the entry test needs are absent entirely**: the reversionary flag, the Schedule 1
   **item set** (not a boolean), the per-stream notification fact, and the commutation-authority
   facts; and the **stream kind**, which the file currently describes as *"a label on the result;
   nothing in the rate lookup reads it"*, becomes the discriminant the derivation reads (§D.4).

#### `src/core/conditionOfRelease.ts`

8. **Its stated reason for carrying no SIS item numbers is now superseded — but only partly.** The
   file records, correctly at the time, that *"citing one here would be provenance this project has
   not got"*. §D fetched SISR Schedule 1 Part 1 in full, so the provenance now exists for items
   **101 Retirement — Nil**, **102 Death — Nil**, **102A Terminal medical condition — Nil**,
   **103 Permanent incapacity — Nil**, **104**, **105** and **106 Attaining age 65 — Nil**.
   **The mapping from this model's ground `'ceasing gainful employment after Preservation Age'` to
   item 101 remains unverified**, because SISR reg 6.01(7) (the definition of "retirement") has never
   been retrieved — **O59 / U28**. So the item numbers may be cited; the item-101 *mapping* may not
   be asserted, and `ConditionOfReleaseItemNotIdentifiedError` (§D.4) is the refusal that holds the
   line.

---

### Owed to `docs/research/p3-minimum-drawdown-and-ttr.md` §3.4 — from §D

Its retrospective-TRIS-failure finding is held at `secondary-only` because *"the underlying mechanism
is ITAA 1997 s 307-70 / TR 2013/5, which was **not** retrieved"*. **Both were retrieved on
2026-09-09.** The "not retrieved" statement is now false, the citation is now wrong, and the
confidence splits in two (§D.6): the **cessation mechanism** is **`ruling-verified`** on TR 2013/5
¶¶18–20, 100–101 and Example 6, quoted verbatim in §D.6(b); its **application to the reg
6.01(2)(b)(ii) 10% maximum specifically** stays **`secondary-only`** and is an inference from ¶18's
general words — **O61 / U31**. And s 307-70 contains **no cessation rule at all**: it is a bare
delegation, and the operative definition is ITAR (1997 Act) 2021 s 307-70.02(1), still unretrieved
(**O58 / U32**). The same correction is written out at length for register §3.9 in **C2** above; §3.4
needs it too, because the two artefacts carry the same wrong citation.

---

### Owed from §C

- **O57** — the `UNCAPPED_ENTRY` caveat text in `src/core/superPhase.ts`, covered at item 4 above.
- **The Division 296 rate adjacency.** Register §3.7 carries Div 296. TAA 1953 **s 8AAD(1A)** — the
  Div 296 GIC rate, base **+3**, inserted into the same section on 1 April 2026 by No 8 of 2026 Sch 1
  item 67 — is **not** the rate s 294-235(2)(a) points at, which is *subsection 8AAD(1)*, base **+7**
  (§C.1.1, trap **T91**). Wherever a GIC rate is stored for Div 296, the record must say which
  subsection it came from, or the two will be crossed the first time either is touched.
- **No correction is owed to register §3.1 by §C** — §C only cites the 15% / 0% rows and
  `src/core/superPhase.ts`; it does not contradict them.

---

## UNKNOWNS

### Unknowns from §A — the cap and its indexation (U9–U15)

| # | Question | Why it matters to the money | What would close it |
|---|---|---|---|
| **U9** | **Which CPI reference base supplies the s 960-285(5) index numbers after the ABS re-reference.** s 960-280(1) says "**first published**", and the number first published for Dec 2016 was **110.0** (old base). The current ABS series publishes Dec 2016 as **76.38**, and Dec 2025 (**100.32**) exists **only** on the new base. s 960-280(3) says only new-base numbers are used "after the change" but does not say in terms that the historic *base quarter* is restated | The indexation factor is worked to **3 decimal places**, and one thousandth is **$1,600** at the $1.6m base. FY2026-27 cleared its $100,000 step by **$800**. The two bases already give different factors in four published years (2018-19, 2020-21, 2021-22, 2024-25) — no published cap changed, but the mechanism that would change one is live | An ATO or Treasury statement of the index numbers used for a specific year's transfer balance cap; the ABS's own re-reference note in the December 2025 quarter CPI release stating whether the historical series is restated; or an ATO ruling on s 960-280(3) |
| **U10** | **The general transfer balance cap for FY2027-28 and beyond.** It is fixed by the **Dec 2026** quarter CPI, which the ABS will not publish until late January 2027 | Every forecast year after FY2026-27. It also drives the FY2027-28 **indexation increase**, which drives every Person's personal cap for the rest of the forecast, and the §3.3 bring-forward tiers | Nothing can close it before Jan 2027. It is a **Setting with a CPI-assumption lever**, in the same class as O5. The engine must not hard-code a step |
| **U11** | **Whether the *earliest* tie rule in s 294-40(2)(b) is ever displaced.** The statute is clear, but no ATO example works a tied maximum, and LCR 2016/9's examples all have a single maximum day | The denominator. In hand example 2 the maximum is tied across **195 days** spanning a cap increase; taking the latest tied day instead of the earliest raises the denominator and over-states the cap | An ATO worked example with a tied maximum straddling 1 July. Low risk — the statutory words admit only one reading — but the fixture should exist regardless (T60/T63) |
| **U12** | **Subdivision 294-E — the child recipient cap modification.** s 294-35(1)'s note points to it; the Subdivision was not read | It is the only known mechanism other than s 294-40 that moves a personal cap, and it is the assumption the derivability of `hasEverExceededCap` rests on (§A.3). Also relevant to a death scenario where a child receives a death benefit income stream | Read ITAA 1997 Subdiv 294-E (ss 294-170 onwards) |
| **U13** | **Subdivision 294-D — capped defined benefit income streams.** Note 1 to s 294-25(1) and the note to s 294-30(1) both say the credit / the excess is "modified" for these | If a Person holds a defined benefit pension, the credit is a **special value**, not the account balance, so the high-water mark and every downstream percentage are wrong. Relevant to any Household with a public-sector or older corporate pension | Read ITAA 1997 Subdiv 294-D and LCR 2016/10 / LCR 2017/1 (both named in LCR 2016/9's footnotes) |
| **U14** | **What the ATO actually shows the user, and under what labels.** The §A.6 Settings prompt has to name fields the user can find. "Highest ever balance" and "personal transfer balance cap" appear in LCR 2016/9's language, but the ATO online screen was not retrieved | If the prompt asks for something the user cannot locate, they will type their **pension account balance** instead — which is the single wrongest number available (§A.6) and produces an unsigned, unbounded error | Retrieve the ATO guidance page describing the transfer balance account view in ATO online services, or a screenshot/help article naming the fields |
| **U15** | **Whether a reversionary beneficiary's deferred credit shifts the high-water day.** s 294-25(1) item 1(b) and item 2(b) defer the credit for a reversionary beneficiary to "the end of the period of **12 months**" | The deferral moves the credit into a later financial year and possibly across a cap increase, changing both the numerator's timing and the denominator. Directly relevant to the v1 `DEATH` what-if (O16) | Read LCR 2016/9's reversionary paragraphs and ITAA 1997 s 294-25 item 1/2 against a death-in-FY fixture |

### Unknowns from §B — credits and debits (U16–U20)

**U16 — The s 307-80(3)(b)(ii) overlap: a member who retired without notifying, and then turns 65.**
On the literal text, s 307-80(3) applies if "(b) at or before that time, the person … **(ii) has
satisfied** a condition of release specified in subparagraph (2)(c)(i), (ii) or (iii), **but has not
notified** the \*superannuation income stream provider … of that fact". A person who retired at 62,
never told the fund, and turns 65 **still literally satisfies (b)(ii)** — they have satisfied item
101 (retirement) and have not notified. On that reading their TRIS stays out of retirement phase past
65, indefinitely, until they notify. The ATO's contrary view is unqualified (LCR 2016/9 ¶15, first
bullet: "*is 65 years old or older*", stated as a standalone alternative), and the ¶30B example turns
on age alone. But the ATO's bullet is not the statute, and the statute's paragraph (b) is a
disjunction that (b)(ii) satisfies.
*Why it matters to the money:* it decides the **starting day**, and therefore (i) which financial
year sets the personal cap under s 294-35(1) — the difference between a $2.0m and a $2.1m base cap in
the current pair of years — and (ii) the day on which the whole TRIS balance is valued and credited.
It also decides whether the fund's earnings tax exemption starts on the birthday or on the
notification day, which is a different but correlated pot of money.
*What would close it:* a Commissioner's ruling or determination that addresses the overlap directly
(LCR 2016/9 ¶15 does not — it presents the two limbs as alternatives without saying what happens when
both are engaged), or the Explanatory Memorandum to *Treasury Laws Amendment (2017 Measures No. 2)
Act 2017* (No. 55 of 2017), Sch 1 item 13, which substituted s 307-80(3). **Neither retrieved this
pass.**

**U17 — Is "value" under s 307-205(b) for an account-based pension exactly the account balance, or
the commutable amount, on a day when part of the interest is temporarily non-commutable?**
s 307-205(b) is "*the total amount of all the \*superannuation lump sums that **could be payable**
from the interest at that time*". For a fully commutable retirement-phase account-based pension that
equals the balance, and LCR 2016/9 uses "value" and "balance" interchangeably in its examples. It is
an inference, not a stated rule.
*Why it matters:* it is the amount of every item 2 credit — the single largest number this cluster
produces.
*What would close it:* a ruling or determination stating that the value of an account-based
retirement-phase interest is the account balance; or confirmation that no regulation under
s 307-205(a) reaches such an interest (reg 307-205.02(2)(b)(ii) was read this pass and excludes it;
regs 307-205.02B–02E were **not** read in full and one of them may reach further — see O49).

**U18 — What is the value on the conversion day when the fund has not yet allocated the year's
earnings?** An SMSF converting a TRIS on, say, 14 March must value the supporting interest on that
day, which requires an interim revaluation of assets and an interim allocation of earnings. For an
APRA fund the unit price does this automatically. For an SMSF it is a trustee act that may happen
after the fact.
*Why it matters:* it moves the credited amount by whatever the year-to-date earnings are — on
$1,000,000 at 7% over eight months, roughly $47,000 of transfer balance, which is either inside or
outside a cap.
*What would close it:* ATO guidance on interim valuation for transfer-balance-account purposes
(SMSFR or the SMSF valuation guidelines), which was not retrieved.

**U19 — Does the tool need the s 8AAD(1) TAA GIC base rate at all?** Only if it prices excess
transfer balance tax rather than refusing it (B.5, credit item 3). If the refusal recommended here is
adopted, this is not an unknown but a deliberately unentered door. If a future pass decides to price
it, the daily rate series and any s 294-235(3) Ministerial determination become live inputs and
neither was retrieved.
*What would close it:* a decision on the refusal, then (if priced) the ATO's published GIC rate
series and a check of the Federal Register for instruments made under s 294-235(3).

**U20 — Is reg 294-130.01 (streams prescribed as capped defined benefit under s 294-130(2)) capable
of catching an ordinary product?** It was seen only by cross-reference from reg 294-80.01(1)(b)(ii)
and was **not fetched**. If it prescribes something an ordinary retiree can hold, the
`CappedDefinedBenefitIncomeStreamNotModelled` refusal needs a wider trigger than "defined benefit,
lifetime annuity, or market-linked pension".
*Why it matters:* a mis-scoped refusal either fires on healthy inputs or fails to fire on the ones it
exists for.
*What would close it:* fetch `REG/20210206/294-130.01`.

---

### Unknowns from §C — excess transfer balance and enforcement (U21–U26)

**U21 — Has any instrument ever been made under s 294-235(3)?**
*The question:* s 294-235(2) makes the rate *"the lower of"* the s 8AAD(1) GIC daily rate and *"a rate
determined under subsection (3)"*. If a Ministerial determination exists and is lower, every notional
earnings figure this project computes is wrong and too high.
*Why it matters to the money:* it is a direct multiplier on the whole tax. A determination at, say,
half the GIC rate halves every excess transfer balance tax figure.
*What would close it:* a Federal Register of Legislation search by **enabling provision** (`ITAA 1997
s 294-235(3)`) rather than by title text, or an ATO statement that limb (b) has never been engaged.
The title-name search done on 2026-09-09 (`contains(name,'Excess Transfer')` → 1 result;
`contains(name,'Transfer Balance')` → 3 results, none a rate determination) is suggestive, not
conclusive — an instrument could be titled without either phrase.
*Current label:* `unverified`. **Engine treatment until closed: use the s 8AAD(1) rate, and record that
limb (b) is assumed inert.** Using the higher of the two candidates is the conservative direction for a
*tax* figure, so this unknown does not currently threaten the conservatism principle.

**U22 — Can excess transfer balance tax be paid from superannuation by any route?**
*The question:* TAA Sch 1 s 131-5(1) lists five triggers for a release request and excess transfer
balance tax is not among them. Is there a release authority elsewhere (a Commissioner-initiated one, a
SIS-side compassionate ground, an ATO administrative practice)?
*Why it matters to the money:* it determines whether the tax is a household **cash** outflow (reducing
non-super assets, affecting the Age Pension assets test) or a super outflow. For a retiree with most
wealth in super these are materially different projections.
*What would close it:* reading TAA Sch 1 Div 131 in full (only ss 131-5 and 131-45 were retrieved) and
Div 135, plus checking whether the Commissioner has any own-motion release power for this liability.
*Current label:* `primary-verified` as to s 131-5(1)'s five paragraphs; the conclusion that no release
route exists is an **argument from absence within one section**.

**U23 — Is the earnings tax exemption really unmodified by s 294-50 in a s 307-80(4) case?**
*The question:* s 294-50(1) scopes subsections (2) and (3) to two questions — whether you have a TBA and
what your transfer balance is. Does anything in ITAA 1997 Subdiv 295-F (ss 295-385, 295-390) or its
surrounding machinery independently soften the retrospective whole-income-year effect of s 307-80(4) on
exempt current pension income?
*Why it matters to the money:* it is the difference between losing ECPI on one interest for the tail of
a year and losing it for the whole year. On a $2.3m interest earning 5%, a full year of ECPI is
~$17,000 of fund tax.
*What would close it:* retrieving ss 295-385 and 295-390 and the definition of *segregated current
pension assets*, which register §3.1 and §5A.3 cite but this file never fetched.
*Current label:* the reading is `primary-verified` as to s 294-50(1)'s scoping words; the absence of a
competing softener elsewhere is **unverified**.

**U24 — Where does a s 136-80 commutation lump sum go?**
*The question:* the provision says "pay by way of commutation … a superannuation lump sum" and names no
destination. May it be retained in accumulation phase inside the same fund?
*Why it matters to the money:* 15% fund earnings tax versus the member's marginal rate, plus deeming
and Age Pension assets-test treatment on the money if it leaves super — see §C.7.
*What would close it:* SIS Regulations Part 6 (cashing rules) and the payment standards; and the ATO's
own guidance on responding to a commutation authority.
*Current label:* `unverified`. **This unknown is currently harmless only because the settled
decision in §C.8 refuses to project breaching plans.** If that decision were ever reversed, U24 would
become a blocker.

**U25 — What is the *value* of the supporting interest for the item 5 debit?**
*The question:* s 294-80(1) item 5 debits *"the \*value of the \*superannuation interest that supports
it at the end of the period"*. `*value` is a defined term with its own valuation rules (and F2024L01023,
*Income Tax Assessment Amendment (Transfer Balance Account Value for Certain Superannuation Income
Streams) Regulations 2024*, was found in the FRL search and modifies it for some streams). Neither was
retrieved.
*Why it matters to the money:* it sizes the largest single debit in the whole Division.
*What would close it:* the s 995-1 definition of `value` for a superannuation interest, plus F2024L01023.

**U26 — Does the Commissioner have any deadline at all?**
*The question:* ss 136-10(1) and 136-55(1) impose no time limit on the Commissioner's own acts, and
s 294-240 keys the due date to an assessment whose timing is unstated. Is there an outer limit
(Div 155 amendment periods, an administrative service standard)?
*Why it matters to the money:* it determines the length of the excess transfer balance period, which is
the exponent in `E((1+r)^N − 1)`, and it determines which financial year the cash outflow lands in.
*What would close it:* TAA Sch 1 Div 155 (assessments and amendment periods), not retrieved.

### Unknowns from §D — the entry test and the TRIS conversion (U27–U33)

**U27 — The notification in s 307-80(3)(b)(ii) has no prescribed form, deadline, content or
evidentiary standard, and it is unclear whether an SMSF member-trustee can notify themselves.**
The section says only "has not notified the \*superannuation income stream provider … of that fact".
It does not say *in the approved form* (contrast s 294-85(1)(b) and s 294-90, which both say exactly
that), does not impose a time limit, and does not say what happens if notification is given before
the condition is satisfied or is later disputed.
*Why it matters to the money:* the notification day **is** the conversion day, and the conversion day
fixes (i) the day fund earnings go from 15% to 0%, (ii) the day and the amount of the s 294-25 item 2
transfer balance credit, and (iii) under s 294-15(2)(b) and s 294-35(1), the financial year whose
general transfer balance cap becomes the member's permanent personal cap. LCR Example 1B moves all
three across a financial year boundary on a fifteen-day delay. For an SMSF — the case this project's
Household most plausibly occupies — the member and the provider are the same people, and if the
"notification" is a minuted trustee resolution the member controls the date, which makes it a
planning lever rather than a fact.
*What would close it:* an ATO ruling, determination, ATO ID or SMSF-specific guidance on the form and
evidencing of a s 307-80(3)(b)(ii) notification, particularly for an SMSF. Not retrieved.

**U28 — SISR reg 6.01(7), the definition of "retirement", was never retrieved, so the mapping from
this model's ground `'ceasing gainful employment after Preservation Age'` to Schedule 1 item 101 is
unverified.** `conditionOfRelease.ts` already refuses inside the window where the register's wording
and the SISR definition disagree (`CessationBeforePreservationAgeError`), but the entry test needs
more than a boolean: s 307-80(3)(b) turns on **which item**, and item 101 is "Retirement", whose
content is in reg 6.01(7).
*Why it matters to the money:* if the Person is not on item 101 they are not on the notification limb
at all, and the phase question is answered by item 106 alone — which converts automatically. Getting
this wrong in the 60–64 window either exempts fund earnings that are taxable or taxes earnings that
are exempt, for as many years as the Person is in that window.
*What would close it:* fetch SISR reg 6.01(7) (`REG/19940057/6.01(7)`).

**U29 — Whether reg 6.01(2)(b)(ii)'s "unless" removes the 10% ceiling for the WHOLE financial year
in which the condition is satisfied, or only from the day it is satisfied.** The provision limits
"total payments … made in a financial year"; the "unless" is a state of the pensioner, not a date.
*Why it matters to the money:* a member turning 65 in March could, on the whole-year reading, draw
the entire balance in April; on the from-that-day reading, payments made in July–February are still
tested against 10%. The two readings differ by up to the whole balance, and the wrong one either
declares a feasible plan infeasible or lets a forecast breach a limit whose breach is now known to
kill the stream permanently (D.6).
*What would close it:* the Explanatory Statement to the 2005 regulation that inserted the TRIS
definition (the same document O38 wants), or an ATO ruling. Not retrieved.

**U30 — The ECPI apportionment for the conversion year is unresolved, and s 295-390 was never
retrieved.** s 295-385(3)(b) shows the segregated method requires an actuary's certificate — it is
not an arithmetic split — and register §5A.3 names both methods without stating an apportionment
rule.
*Why it matters to the money:* every conversion lands mid-year, so this is not an edge case, it is
**the** case. Until it is answered `fundEarningsTax` must refuse the conversion year, which means the
conversion limb of P3-8 cannot produce a tax figure for the year in which the conversion happens —
the single most valuable year in a TTR strategy.
*What would close it:* fetch ITAA 1997 s 295-390 and ss 295-395/295-400, plus the ATO's ECPI guidance
on the choice of method, and open a register row for the apportionment rule.

**U31 — Whether a breach of the reg 6.01(2)(b)(ii) 10% MAXIMUM falls within TR 2013/5 ¶18.** See
D.6(d). The ruling's reasoning at ¶¶96–101 runs through reg 1.06(1)/1.06(9A), which contains no
maximum; only ¶18's general words reach it, and no example applies them.
*Why it matters to the money:* if it does not fall within ¶18, a 10% breach is a preservation/payment
standards contravention with its own (very different) consequences rather than a retrospective
income-tax cessation, and the "plan is infeasible" conclusion in §3.9 would be wrong in kind, not
just in degree.
*What would close it:* an ATO ID, private ruling, determination or SMSF auditor contravention
guidance addressing a TRIS that exceeded 10%.

**U32 — ITAR (1997 Act) 2021 s 307-70.02(1) was not retrieved.** Only TR 2013/5 ¶52's partial
reproduction of subparagraph (a)(ii) is held, and the ruling itself says at fn [25] that it "does not
specifically consider pensions that are covered by paragraphs (b) to (c) of the definition, or rights
covered by paragraph (d) … and they have not been reproduced".
*Why it matters to the money:* it is the definition on which every "is this still a superannuation
income stream" question turns, including D.6's whole mechanism, and paragraph (d) (rights arising on
death) is what extends ECPI past a member's death.
*What would close it:* fetch the *Income Tax Assessment (1997 Act) Regulations 2021* s 307-70.02 from
legislation.gov.au (the ATO Legal Database `REG/19940057` prefix is the SIS Regulations and does not
serve it; the correct instrument identifier was not determined this pass).

**U33 — Whether the conversion year's Schedule 7 minimum is genuinely a full-year minimum.** D.5
argues it is, from cl 3's confinement to "the commencement day", cl 1(2)(a)(ii)'s confinement to "the
year the pension commences", and TR 2013/5 ¶10's definition of commencement. No source states it.
*Why it matters to the money:* on a $500,000 balance the difference between a full-year and a
part-year minimum in the conversion year is several thousand dollars of forced drawdown, and the
minimum is a floor the plan must clear.
*What would close it:* an ATO worked example of a TRIS converting mid-year, or O39's commutation/
rollover proportioning research pass, which touches the same clause.

---

## TRAPS

### Traps from §A — the cap and its indexation (T58–T72)

Proposed for register §1. Each is phrased so a test can be written against it.

| # | Trap | The wrong thing an implementer does | The fixture that catches it |
|---|---|---|---|
| **T58** | **Use the current transfer balance as the indexation numerator instead of the all-time high-water mark** | reads `transferBalance` at 30 June instead of `highestEndOfDayTransferBalance` | Hand example 2: credit $1,200,000 on 1 Sep 2025, debit $300,000 on 15 Mar 2026. Personal cap FY2026-27 must be **$2,040,000**, not $2,055,000 |
| **T59** | **Let a debit lower the high-water mark** | implements field 4 as `transferBalance` rather than a monotone `max` | Same fixture; also a fixture that commutes the *whole* pension to nil — the numerator must stay $1,200,000 and the unused percentage must stay 40% |
| **T60** | **Use the general cap for the indexation year as the denominator, instead of the personal cap on the high-water day** | divides the high-water balance by `generalCap[thisFY]` | LCR 2016/9 Example A1 step 2: `$1,525,000 ÷ **$1,613,000**` → 94% → cap **$1,625,000**. Dividing by the FY2022-23 general cap of $1,700,000 gives 89% → **$1,635,000** |
| **T61** | **Round the percentage the wrong way** — to nearest, or round the *unused* percentage down, or skip rounding | applies `round()` or omits the `floor` in s 294-40(2)(c) | Hand example 3: balance **$1,234,567** against a $2,000,000 cap. The increase must be **$39,000** (cap $2,039,000), not $38,000 and not $38,271.65. A cents-bearing personal cap is always a bug |
| **T62** | **Apply proportional indexation in the year the transfer balance account first starts** | forgets the s 294-40(1) parenthetical "other than the financial year in which you first start to have a \*transfer balance account" | A Person who starts a $500,000 pension on **1 July 2026**: personal cap must be exactly **$2,100,000**, not $2,100,000 plus a proportioned slice of the FY2026-27 increase |
| **T63** | **Multiply the unused percentage by the *general cap* rather than by the *indexation increase*** | `unusedPct × generalCap` instead of `unusedPct × (generalCap[n] − generalCap[n−1])` | Hand example 2: 40% × $2,100,000 = $840,000 → cap $2,840,000. The correct increase is 40% × **$100,000** = **$40,000** |
| **T64** | **Cache the unused-cap percentage as a stored constant and reuse it** | computes the percentage once and carries it forward instead of recomputing from the all-time high each indexation year | LCR Example A1: the percentage is **13%** in FY2021-22 and **6%** in FY2023-24, because a new credit reset the high-water mark. A cached 13% gives $26,000 → $1,639,000 instead of **$1,625,000** |
| **T65** | **Treat investment earnings, investment losses or pension drawdowns as credits or debits in the transfer balance account** | reuses the Retirement Phase balance as the transfer balance | LCR 2016/9 para 27 (Darius): the interest is worth $1.05m at 1 Jul 2019 and the transfer balance is still **$1.1m**. Only a **commutation** (s 294-80(1) item 1) debits it |
| **T66** | **Measure the transfer balance intraday rather than at the end of the day** | evaluates the maximum, or the excess, after each individual credit | LCR 2016/9 para 51 (Alice): a credit and a debit on the **same day** (1 July 2017) that would breach intraday. She must have **never** had an excess transfer balance and must **remain eligible** for indexation |
| **T67** | **Key the s 294-40(1)(b) bar off "had excess transfer balance", or un-latch it once the excess is commuted away** | resets `hasEverExceededCap` when the balance falls back under the cap, or equates the bar with excess transfer balance tax liability | A Person who exceeds by $50,000 on one day in FY2021-22 and commutes it out the next week must get **nil** indexation in FY2023-24, FY2025-26 **and** FY2026-27. Also LCR para 76: a transitional-period excess that was *disregarded* for tax still bars indexation |
| **T68** | **Treat an exact equality as leaving indexation entitlement intact** | tests `balance > cap` for the *bar* and then computes a positive unused percentage anyway | LCR Example A2: balance **exactly** $1,600,000 against a $1,600,000 cap → 100% used → **0%** unused → the personal cap stays **$1,600,000** in FY2021-22 and forever |
| **T69** | **On an indexation factor of 1 or less, hold last year's cap** | implements s 960-285(4) as "cap unchanged" (as register §3.2's pseudocode currently reads) | A deflation fixture: s 960-285(4) says "You do not index **the amount**", and the amount under s 294-35(3)(b) is the **base amount $1,600,000** — the cap reverts, it does not hold. *(Labelled inference — see §A.4. Practically unreachable, but the pseudocode should not teach the wrong rule)* |
| **T70** | **Hard-code the indexation increase as $100,000** | assumes one $100,000 step per indexation event | LCR Example A1 step 2: the FY2023-24 increase was **$200,000** ($1.7m → $1.9m). And FY2019-20, FY2020-21, FY2022-23 and FY2024-25 each had an increase of **$0** |
| **T71** | **Write the high-water day on a tie** | updates `highestBalanceDay` on `>=` rather than `>` | Hand example 2 holds $1,200,000 for 195 consecutive days spanning 1 Jul 2026. s 294-40(2)(b) takes the **earliest** of the tied days, so the denominator must be the cap on **1 Sep 2025** |
| **T72** | **Freeze the general transfer balance cap as a constant** | stores $2,100,000 as a code constant rather than a config series | It is **item 10A of the s 960-265 table** — the project's own gateway test for CONFIG. A 20-year projection must not hold $2.1m flat, and the engine must be able to produce the **indexation increase**, which needs two consecutive years |

### Traps from §B — credits and debits (T73–T86)

Proposed for register §1. Each is phrased so a test can be written against it.

**T73 — Modelling the transfer balance as the current value of the retirement-phase interests.**
The transfer balance is a cumulative record of *transfers into* retirement phase and moves only on the
five credit and eight debit events. It does not track the account. *Testable:* commence a pension at
$1,500,000 on 1 July 2027; run to 30 June 2035 with drawdowns exceeding earnings so the account
balance falls to $1,100,000; commence a second pension with $900,000. The transfer balance must be
**$2,400,000**, not $2,000,000, and the second commencement must be reported as a breach. A model
that revalues gives $2,000,000 and reports compliance.

**T74 — Debiting a pension payment.** A minimum (or above-minimum) pension drawdown is a
superannuation income stream benefit, and s 307-65(1) defines a superannuation lump sum as "*a
\*superannuation benefit that is not a \*superannuation income stream benefit*", so it can never
satisfy s 294-80(1) item 1. *Testable:* a $2,050,000 pension with $110,000 of drawdowns in the year
must leave the transfer balance at exactly $2,050,000 at 30 June. Any debit is wrong.

**T75 — Crediting investment earnings.** *Testable:* a $1,800,000 pension that grows to $2,150,000
over five years with no further contributions must leave the transfer balance at $1,800,000 and must
**not** report a cap breach, even though the account now exceeds the general cap. (This is the trap's
tell: the wrong model reports a breach that does not exist, and the user is advised to commute for no
reason.)

**T76 — Offering "draw down more" as the remedy for an excess.** LCR 2016/9 ¶25 is explicit that a
large pension drawdown does not reduce the transfer balance. *Testable:* given a transfer balance of
$2,200,000 against a cap of $2,100,000, the only remediation the tool may emit is a **commutation** of
at least the excess (plus accrued s 294-235 earnings); any suggestion framed as an increased pension
payment is a failure.

**T77 — Valuing an item 2 credit at 1 July instead of the commencement day.** s 294-25(1) item 2
reads "*the \*value **on the starting day***". *Testable:* a pension commenced on 1 October 2026 with
$500,000 on the commencement day and $487,000 at the preceding 1 July must credit **$500,000**. The
1 July figure is a different number multiplied by nothing — it is simply the wrong day. Note this is
the *opposite* day rule from §3.9's Schedule 7 minimum in a non-commencement year, which is exactly
why the two get crossed.

**T78 — Treating a TRIS conversion as crediting only the amount originally put into the TRIS.** The
credit is the value of the supporting interest on the conversion day, full stop. *Testable:* a TRIS
commenced at 60 with $800,000 that has grown to $1,050,000 by the member's 65th birthday must credit
**$1,050,000** on the birthday. Crediting $800,000 understates the balance by the entire TTR-phase
growth and can hide a breach.

**T79 — Using the retirement day rather than the notification day as the TRIS starting day.**
s 307-80(3)(b)(ii) keeps the stream out of retirement phase until the provider is notified. *Testable:*
retirement on 28 June 2027, notification on 12 July 2027 → the account starts in **FY2027-28**, the
personal cap is the FY2027-28 general cap, and the credited value is the balance on **12 July 2027**.
A model that uses 28 June gets a different cap year *and* a different valuation day from one
two-week input.

**T80 — Requiring notification for an age-65 TRIS conversion.** Item 106 (attaining 65) sits in
s 307-80(2)(c)(iv), which is **not** in the (3)(b)(ii) notification list. *Testable:* a TRIS held by a
Person who turns 65 on 3 November 2028 and never notifies the fund must convert on **3 November 2028**
and credit the balance on that day. A model that waits for a notification flag never converts the
stream, never opens the account, and silently forecasts a TRIS running past 65 — which is also wrong
for the fund's earnings tax exemption and for the §3.9 10% ceiling.

**T81 — Inferring a commutation from a large withdrawal.** The same cashflow is a $100,000 debit or
nothing depending on the member's act (s 307-65(2); LCR 2016/9 ¶41). *Testable:* an above-minimum
withdrawal of $100,000 with no explicit `partialCommutation` characterisation must produce **no**
debit; the same withdrawal marked `partialCommutation` must produce a **$100,000** debit on the day of
receipt. Also assert the default is `pensionPayment` — the direction that does not invent headroom.

**T82 — Routing a full commutation through item 6 instead of item 1.** Item 6 is expressly
conditioned on "*items 1 and 5 do not apply*". *Testable:* a full commutation producing a $1,000,000
lump sum received on 7 July 2030 must debit **$1,000,000 on 7 July 2030** (item 1: "*the amount of the
superannuation lump sum*", "*at the time you receive*"), not the interest's value just before the stop
time on the stop day (item 6). Construct the case so the two differ — e.g. a market move between the
instruction and the receipt, or a boundary at 30 June.

**T83 — Closing the transfer balance account when the last pension is commuted.** s 294-15(1)'s
"*or have at any time been*" and s 294-45's "*ceases when the retirement phase recipient dies*"
together mean the account survives. *Testable:* commence $1,000,000 in FY2027-28, fully commute in
FY2030-31, then commence a new pension in FY2034-35. The personal cap must still be the **FY2027-28**
general cap (indexed only proportionally on the unused percentage measured against the historical
high), not the FY2034-35 general cap. A model that closes and reopens the account hands the Person a
free cap upgrade worth hundreds of thousands.

**T84 — Deriving the s 294-40 unused cap percentage from the current balance instead of the
historical high.** s 294-40(2)(a) identifies "*the **highest** \*transfer balance … at the end of any
day up to the end of the previous \*financial year*". *Testable:* balance peaks at $1,900,000, is
commuted to $1,200,000, then indexation occurs. The unused cap percentage must be computed off
$1,900,000, not $1,200,000. (Cross-check against the rounding direction: s 294-40(2)(c) rounds the
*used* percentage **down**, which rounds the unused percentage **up** — LCR 2016/9 ¶17G works
$1.4m/$1.6m = 0.875 → 87% used → 13% unused.)

**T85 — Treating an account-based pension as capped defined benefit, or vice versa.** *Testable:* a
Person flagged as holding a defined benefit lifetime pension must raise
`CappedDefinedBenefitIncomeStreamNotModelled` and must **not** credit the user's stated capital value;
the correct number under s 294-135(2) is annual entitlement × 16, which the tool does not compute. The
test asserts the refusal, not a number.

**T86 — Pooling or transferring cap between spouses.** *Testable:* a couple with $3,600,000 of super
must not be able to commence $2,600,000 for Person A and $1,000,000 for Person B without Person A
being reported in breach, however much unused cap Person B has. Div 294 is drafted wholly per
individual and contains no aggregation provision.

---

### Traps from §C — excess transfer balance and enforcement (T87–T114)

**Recorded, not scheduled.** The settled decision in §C.8 means the engine never prices excess
transfer balance tax, so T87–T113 are the fixtures a reversal of that decision would have to
satisfy, and the numbers in them are the point of keeping them. **T114 survives the ruling and must
be built** — it is the trap the latching flag exists for, and it is the same trap §A found from the
indexation side (**T67**).


**T87 — Taxing the excess instead of the earnings on the excess.**
A $200,000 excess must not produce `$200,000 × 15% = $30,000`. It produces **15% of $5,715.99 = $857.40**
over 90 days. *Test:* assert that a fixture with a $200,000 excess for 90 days at an 11.43% annual GIC
rate returns tax of $857.40, and that no code path multiplies a cap-excess by 0.15 or 0.30.

**T88 — Simple interest instead of daily compounding.**
s 294-25 item 3 credits each day's earnings back "at the start of the next day", so `E × r × N` is wrong.
*Test:* the same fixture must return $5,715.99, not $5,636.71 — a 1.39% gap over 90 days that widens with
the period. Assert the closed form `E × ((1+r)^N − 1)`.

**T89 — Annualising or re-dividing the s 8AAD(1) rate.**
s 8AAD(1) already divides by the days in the calendar year. *Test:* feed the engine an annual GIC rate of
11.43% and assert the daily rate it uses is 0.000313150684931507, not 11.43% and not 0.0000008579.

**T90 — Dividing by 365 unconditionally, or by the days in the *financial* year.**
s 8AAD(1) says *"the number of days in the **calendar** year"*. *Test:* a day in February 2028 must divide
by 366; 31 December 2027 must divide by 365; and an excess period spanning 1 January must use both.

**T91 — Using the s 8AAD(1A) Division 296 rate (base + 3) for transfer balance purposes.**
Inserted into the same section on 1 April 2026 by No 8 of 2026. s 294-235(2)(a) cites *subsection 8AAD(1)*
by number. *Test:* assert the excess-transfer-balance rate and the Div 296 rate differ by exactly
`4 ÷ days-in-calendar-year` on any given day, and that the transfer balance path consumes the +7 one.

**T92 — Holding the rate constant across a calendar quarter boundary.**
The base interest rate changes on 1 Jan / 1 Apr / 1 Jul / 1 Oct — not on 1 July only. *Test:* a 90-day
excess beginning 1 August 2026 must produce $5,729.06 (61 days at 11.43%, 29 at 11.51%), not $5,715.99.

**T93 — Storing a rounded daily rate as config.**
s 8AAD(4) rounds only the **base interest rate**, to 2 dp. The ATO's published 8-dp daily rate is a display
figure. *Test:* the config record must hold the base or annual rate per quarter; assert no 8-decimal
literal daily rate exists under `src/data/`.

**T94 — Treating a determination period as ordinary compounding, or as ordinary simple interest.**
Once a determination issues, s 294-25(2) stops the item 3 credit and s 294-230(3)(b) substitutes
`r² · E · D(D−1)/2` on top of `D · r · E`. *Test:* a 90-day period run entirely as a determination period
must yield $5,715.26, distinguishable from both $5,715.99 (compounded) and $5,636.71 (simple).

**T95 — Missing that a determination period ends early on any credit.**
s 294-25(2)(b)(ii): the period ends *"if a \*transfer balance credit arises … before that day — the day on
which that credit arises"*. *Test:* a new pension commenced during a determination period must re-arm
item 3 compounding from that day.

**T96 — Treating the excess transfer balance period as a financial year.**
s 294-230(2) is *"a continuous period of one or more days"* with no year boundary. *Test:* a period running
20 June to 20 July is **one** period, not two, and the 15%/30% test applies to it once.

**T97 — Not breaking the period on a single compliant day.**
*Test:* 40 excess days, one compliant end-of-day, then 40 more excess days = **two** periods. If the first
one started on or after 1 July 2018, the second is taxed at **30%**, not 15%.

**T98 — Implementing "subsequent breach" as "the second breach ever".**
Imposition Act s 5(2) requires **both** that the current period starts on or after 1 July 2018 **and** that
a previous liability arose for a period that *also* started on or after 1 July 2018. *Test:* a first period
starting 1 March 2018 followed by a second starting 1 March 2019 must be taxed at **15%**, not 30%.

**T99 — Requiring a determination before the 30% rate can be primed.**
s 5(2)(b) says "has previously been **liable**". s 136-10(1) Note says liability arises with or without a
determination. *Test:* a prior period with no determination and no assessment must still prime 30%.

**T100 — Indexing 15% or 30%.**
Neither appears in ITAA 1997 s 960-265, which is this project's indexation test, and the Imposition Act has
no indexation provision and has never been amended. *Test:* the constants must be `kind: 'constant'`, and a
mutation that FY-keys them must fail a register-consistency test.

**T101 — Booking the tax as a cash outflow in the year of the breach.**
s 294-240: due 21 days after notice of assessment; s 294-245 for amendments. The assessment date is not
fixed by statute. *Test:* the accrual year and the payment year must be separable inputs, and the engine
must refuse to assume they are the same year rather than silently assuming it.

**T102 — Paying the tax from superannuation.**
TAA Sch 1 s 131-5(1) lists excess concessional, excess non-concessional, Div 293, Div 296 and FHSS. Excess
transfer balance tax is not there. *Test:* whatever release-authority machinery exists for Div 293/296 must
not accept an excess transfer balance liability.

**T103 — Sizing the s 294-80(1) item 5 debit at the reduction amount.**
It is *"the \*value of the \*superannuation interest that supports it"* — the **whole interest**. *Test:* a
$2.3m interest with a $200,000 reduction amount and a non-compliant provider must produce a **$2.3m** debit.

**T104 — Applying s 307-80(4) retrospectively to the transfer balance account.**
s 294-50(3) disregards s 307-80(4) for TBA purposes at every time before the end of the 60-day period.
*Test:* credits and debits recorded earlier in that income year must be untouched; the item 5 debit must
arise **at the end of the 60-day period**, not at the start of the income year.

**T105 — Applying s 294-50(3) to the earnings tax exemption.**
s 294-50(1) scopes it to *"(a) whether you have a \*transfer balance account; (b) the \*transfer balance in
your transfer balance account"* and nothing else. *Test:* in a non-compliance year the interest must lose
exempt current pension income for the **whole income year** while the transfer balance account is adjusted
only from the end of the 60 days. The two dates deliberately differ; a test asserting they are the same is
asserting the bug.

**T106 — Treating "no election" as "no correction".**
s 136-10(6)–(7) put the default commutation notice in the determination at the outset, and s 136-55(4) makes
it mandatory on silence. *Test:* a member who does nothing for 60 days must still be commuted, on the
default notice's streams.

**T107 — Treating a partial election as a ceiling.**
s 136-55(3): a short election is topped up with default-notice authorities. *Test:* an election covering
$50,000 of a $200,000 commutable amount must produce authorities totalling $200,000.

**T108 — Letting the total of reduction amounts exceed the commutable amount.**
s 136-55(6) and s 136-65(4) both cap it. *Test:* a second round under s 136-65 must be capped at the
commutable amount less lump sums notified under s 136-85 and less item 5 debits already arisen.

**T109 — Running the provider's 60 days from the determination.**
s 136-80(1): *"within 60 days after the **commutation authority** is issued"*, and s 136-20(4)'s 60 days runs
from the **determination**. Two separate 60-day clocks, in series, with an unbounded Commissioner gap
between them. *Test:* the earliest possible correction is ≥120 days after the determination, never 60.

**T110 — Assuming the provider must always comply.**
s 136-80(2) (capped defined benefit) and (3) (recipient has died) are both *"may choose not to comply"*, and
limb (1)(b) caps the payment at the maximum available release amount. *Test:* a capped defined benefit
stream must not be assumed commutable.

**T111 — Opening the s 136-70 valve without a determination.**
s 136-70(1) opens with *"at the end of a day **after the Commissioner has issued an \*excess transfer
balance determination** to you"*. *Test:* an uncorrectable excess with no determination gets **no** item 7
debit and keeps accruing tax.

**T112 — Sizing the item 7 debit at the crystallised reduction amount.**
Item 7 is *"the amount of the \*excess transfer balance **stated in the notice**"* — the excess **now**, not
the crystallised amount from the determination. Those differ by every debit and every day's compounding
since. *Test:* the two must be independently sourced.

**T113 — Remitting accrued tax when the item 7 debit lands.**
The debit ends the excess transfer balance period prospectively. Nothing remits tax already accrued.
*Test:* tax for the days before the notice survives.

**T114 — Forgetting that one end-of-day excess permanently kills proportional indexation.**
s 294-40(1)(b): *"at no time **before the start of that financial year** has the \*transfer balance … at the
end of a day exceeded your transfer balance cap"*. *Test:* a one-dollar, one-day excess in FY2027-28 must
freeze the personal cap for **every** later year in the projection, even after the excess is fully corrected.
This is the largest money consequence in the cluster and the easiest to omit.

### Traps from §D — the entry test and the TRIS conversion (T115–T125)

**T116 and T117 are the same traps §B found independently, at T79 and T80.** Both fixtures should be
kept: §B's are dated 28 June 2027 / 12 July 2027 and 3 November 2028; §D's are 1 March / 1 September
and 14 February. **T117's fixture carries an unstated assumption — see O65**: it must state that the
member satisfied *none* of items 101, 102A or 103 before turning 65, or it silently encodes one side
of an unresolved reading.

**T115 — Reading s 307-80(3)(b) alone and ignoring the conjunction with (a) and (aa).** (3) excludes
only where **(a) AND (aa) AND (b)** all hold.
*Test:* an ordinary account-based pension (not a listed kind), benefit payable, recipient has
satisfied no condition of release and has notified nobody, must be **retirement phase** — paragraph
(a) fails, so the carve-out cannot bite. An implementation that tests only "(b)" returns accumulation
and taxes exempt earnings at 15%.

**T116 — Treating a met condition of release as sufficient to convert a TRIS.** For items 101, 102A
and 103 it is not: (3)(b)(ii) requires the member to have **notified the provider**.
*Test:* member retires 1 March, notifies the provider 1 September. Phase must be **accumulation**
throughout 1 March – 31 August and **retirement** from 1 September. An implementation keyed on
`release.met` converts on 1 March and exempts six months of fund earnings that are taxable, and dates
the transfer balance credit six months early at the wrong value.

**T117 — The mirror error: requiring notification for the age-65 limb.** Item 106 is absent from
(3)(b)(ii)'s enumerated list, so no notification is required.
*Test:* member attains 65 on 14 February, has told nobody, still holds a TRIS. Phase must be
**retirement** from 14 February, and a s 294-25 item 2 credit must arise on that day for the whole
supporting interest's value. An implementation that demands notification leaves the stream in
accumulation indefinitely, taxes exempt earnings at 15%, and — worse — **misses the transfer balance
credit entirely**, so a member who is over their cap looks compliant.

**T118 — Conflating reg 6.01(2)'s "Nil cashing restriction" set with s 307-80(2)(c)'s four-item
set.** The SISR set is strictly larger: it also contains items 102, 104 and 105(b).
*Test:* member satisfies item 104 (termination of employment with a standard employer-sponsor, with
preserved benefits under $200). The TTR maximum must **fall away** (reg 6.01(2)(b)(ii)'s "unless"
fires) while the phase must remain **accumulation** at 15% with **no** transfer balance credit
(item 104 is not in s 307-80(2)(c)). An implementation that derives phase from "the 10% no longer
applies" exempts the earnings and creates a credit that does not exist.

**T119 — Collapsing the ceiling event and the phase event onto one day.** On the 101/102A/103 route
the ceiling falls away on the day the condition is **satisfied** (reg 6.01(2)(b)(ii) has no
notification word) and the phase changes on the day of **notification** (s 307-80(3)(b)(ii)).
*Test:* member retires 30 June, notifies 15 July. For 30 June there must be **no maximum**, **15%**
fund earnings tax and **no** transfer balance credit — three answers that no single "converted"
boolean can produce.

**T120 — Treating the conversion as a commencement.** It is not: the same stream continues.
*Test:* TRIS commenced 2020, member turns 65 on 1 December 2026. The FY2026-27 Schedule 7 minimum
must be computed on the **1 July 2026 balance**, the **age at 1 July 2026**, with **no pro-rating**
and no cl 4 nil rule. An implementation that re-reads the balance on 1 December and pro-rates
211/365 produces a smaller, entirely plausible minimum.

**T121 — Crediting the transfer balance account with the wrong amount.** s 294-25(1) item 2 credits
"the \*value on the starting day of the \*superannuation interest **that supports** the
superannuation income stream".
*Test:* a $900,000 TRIS converting must credit $900,000 on the conversion day — not the year's
pension payments, not the growth since commencement, not the amount "moved" (nothing is moved).

**T122 — Treating a reverted TRIS as not in retirement phase because the beneficiary has met no
condition of release.** (3)(aa) takes it out of the carve-out entirely.
*Test:* a TRIS reverts to a 45-year-old reversionary beneficiary who has satisfied nothing and
notified nobody. On the statute the stream **is** in retirement phase. This project should
**refuse** rather than compute it (D.3) — so the test asserts a named refusal, not a 0% rate, and
must fail if the code silently returns either 15% or 0%.

**T123 — Treating a 10% breach as costing one year.** TR 2013/5 ¶20: the stream "cannot recommence
meeting the SISR requirements in a future year"; ¶101: a new stream must be commenced and the
proportioning rule reapplied.
*Test:* a scenario that breaches in FY2027-28 must not show the same stream running normally in
FY2028-29. If the model cannot represent the death of a stream, it must refuse the breaching year
rather than continue past it.

**T124 — Citing TR 2013/5 ¶71B's plain-English gloss instead of s 307-80(3)(b)(ii).** ¶71B says a
TRIS "will not be in the retirement phase unless the person **has met a specified condition of
release**", omitting notification.
*Test:* the same fixture as T116. Any comment, docstring or register row whose wording follows ¶71B
rather than the statute will encode the wrong answer for Case B; a source-text canary asserting that
the notification requirement appears in the module's own reasoning is the cheap guard.

**T125 — Treating entry into retirement phase as an act the user chooses.** On the item-106 route it
is automatic.
*Test:* a member with a $2.4m TRIS who turns 65 in FY2026-27 and does nothing must show a
$2.4m credit on their birthday, an excess transfer balance against the $2,100,000 cap, and — under
s 294-40(1)(b) — permanent loss of proportional indexation. A model that only creates credits when
the user commences a pension shows this member as compliant forever.

---

## OPEN ITEMS

### Open items from §A — the cap and its indexation (O40–O45)

| # | Item | Status | What would close it |
|---|---|---|---|
| **O40** | **The general transfer balance cap beyond FY2026-27** | **Unknowable until the ABS publishes the December 2026 quarter CPI (late Jan 2027).** FY2026-27's $2,100,000 is now derived from primary index numbers (§A.5); FY2027-28's is not derivable at all | Nothing can close it now. It must be a **Setting driven by a CPI assumption**, with the s 960-285 machinery applied to a projected index number, never a hard-coded $100,000 step |
| **O41** | **Which CPI reference base the s 960-285(5) numerator and denominator come from after the ABS re-reference** | **Open — labelled inference.** s 960-280(3) plainly points to the new base, and the new-base pair (Dec 2016 = 76.38, Dec 2025 = 100.32) reproduces all nine published caps. But s 960-280(1) says "first published", and 76.38 is not what was first published for Dec 2016. Four published years already show a **different third decimal** on the two bases | See U9. Until closed, the engine must **store the reference base alongside every index number** and refuse to compute a factor from a mixed pair |
| **O42** | **A personal transfer balance cap cannot be derived for a Person with a pre-existing retirement-phase income stream** | **Refused, not decided.** Five inputs are required and none is inferable from a current balance; the error from guessing is **unsigned and unbounded** (§A.6) | Nothing to fetch — this is a data-availability fact, not a legal gap. The resolution is a Settings block (`transferBalanceAccountStartDay`, `personalTransferBalanceCap`, `highestEndOfDayTransferBalance`, `highestBalanceDay`, `personalCapOnHighestBalanceDay`, `hasEverExceededCap`) plus **`UnknownPersonalTransferBalanceCapError`**. Scoped to pre-existing pensions only — a Person who enters retirement phase inside the forecast is fully computable |
| **O43** | **Subdiv 294-D (capped defined benefit income streams) and Subdiv 294-E (child recipients) were not read** | **Unread.** Both are named in notes to provisions this pass *did* read (s 294-25(1) Note 1, s 294-30(1) Note, s 294-35(1) Note). 294-D changes the **credit amount**; 294-E changes the **cap** | Read both Subdivisions plus LCR 2016/10 and LCR 2017/1. Until then the engine must not model a defined benefit pension's transfer balance credit, and the §A.3 derivability argument for `hasEverExceededCap` stays labelled as resting on an unverified assumption |
| **O44** | **`generalTransferBalanceCap()` cannot produce an indexation increase** | **Live code gap.** `src/core/superCaps.ts` holds one FY2026-27 value and throws `UnsourcedIndexBaseError` for any other year — deliberately, because the Dec 2016 CPI was not in the register (O11). **O11 is now closed** (§A.5), so the throw is no longer justified and the function should become a real s 960-285 computation over a config index series | Add the CPI index numbers to the register (via the "Corrections owed to existing artefacts" section — PENDING, not yet written) and give `generalTransferBalanceCap` an `indexNumbers` parameter, exactly as the concessional cap already has. The **two-point check is now available**: Dec 2016 = 76.38 → Dec 2025 = 100.32 → $2,100,000, and seven more golden years |
| **O45** | **The wording and provenance of the §3.1 General Transfer Balance Cap row** | **Mis-sourced, not wrong.** The row cites s 294-35(3) for **$2,100,000**; that subsection contains **$1,600,000**. The figure was in truth `secondary-only` (ATO table + CCH note) until today | Fixed by the "Corrections owed to existing artefacts" section (PENDING, not yet written): re-cite as s 294-35(3) **+ s 960-265 item 10A + s 960-285 + s 960-280(1) + ABS CPI Dec 2016 and Dec 2025**, which is what actually makes it `primary-verified` |

### Open items from §B — credits and debits (O46–O50)

**O46 — The `unused cap percentage` needs the historical high, and the register has no Setting for
it.** s 294-40(2) requires the highest end-of-day transfer balance up to the end of the previous
financial year *and the earliest day it occurred*. For a Person whose account predates the forecast,
neither is derivable. This is a distinct input from the opening transfer balance and will be
collapsed into it unless it is a named Setting. **What would close it:** a decision to carry
`transferBalanceHistoricalHigh` and `transferBalanceHistoricalHighDay` as per-Person Settings, and a
test (T84) that they are actually consumed.

**O47 — The withdrawal characterisation Setting is not yet in the model, and §3.9's drawdown code
has no slot for it.** The `pensionPayment` / `partialCommutation` distinction changes both the
transfer balance (this cluster) and the Schedule 7 minimum satisfaction (§3.9). It has to be one
input read by both, or the two will disagree. **What would close it:** a design decision on where the
characterisation lives, and a cross-report consistency test (§6) that a withdrawal marked
`partialCommutation` produces a debit here **and** does not count toward the minimum there.

**O48 — Named refusals for this cluster are drafted but not registered.** Nine are proposed in B.5
and B.6: `PreForecastTransferBalanceNotDerivable`, `ReversionaryPensionNotModelled`,
`TransferBalanceCapExceeded`, `LRBACreditNotModelled`,
`DeferredAndCappedDefinedBenefitCreditsNotModelled`, `StructuredSettlementNotModelled`,
`FraudAndBankruptcyDebitsNotModelled`, `PaymentSplitNotModelled`,
`StreamCeasedOutsideCommutationNotModelled`, `CappedDefinedBenefitIncomeStreamNotModelled`. **What
would close it:** adopting the names into §3.10 and asserting each is reachable from at least one
input configuration.

**O49 — Four provisions cross-referenced but not read this pass.** reg 294-130.01 (prescribed capped
defined benefit streams — U20); regs 307-205.02C/02D/02E (further valuation methods, one of which
may reach a product an ordinary retiree holds — U17); reg 294-145.01 (the `debit value` method for
s 294-145(7)); and *Income Tax (Transitional Provisions) Act 1997* Subdiv 294-A/294-B, referenced in
every Div 294 history note and containing the 2017 transitional excess relief (LCR 2016/9 ¶74 —
"*The transitional provisions operate only to disregard your excess transfer balance for this
6-month period*"). The last is almost certainly spent for FY2026-27 but that has **not been
verified**. **What would close it:** four fetches — the three ITAR sections at
`REG/20210206/<section>` and the ITTPA at the ATO Legal Database's transitional-provisions DocID.

**O50 — The U16 textual anomaly is unresolved and the tool has to pick a side now.** The
recommendation is to implement the ATO's reading (age 65 converts automatically, T80) because it is a
public ruling the Commissioner is bound by, and to carry the anomaly as a labelled inference rather
than as `primary-verified`. **What would close it:** the EM to Act No. 55 of 2017 Sch 1 item 13, or a
ruling addressing the overlap.

### Open items from §C — excess transfer balance and enforcement (O51–O57)

**O51 — The GIC base interest rate is a quarterly CONFIG with no home in the register.**
Register §7 (*The constants*) has no slot for a quarterly-moving rate, and §3's config rows are FY-keyed.
Decide the shape: a `quarter → baseInterestRate` map keyed `2026-Q3` etc., with the s 8AAD(1) `+7` and the
days-in-calendar-year divisor as **structural constants** beside it. Refresh cadence: quarterly, roughly
two weeks before each quarter starts (per the ATO page). This is the first quarterly-cadence item in the
register; §4.10 covers Age Pension's twice-yearly cadence and is the nearest precedent.

**O52 — Subdivision 295-F was never retrieved.** §3.1 cites ss 295-385 and 295-390 for the 0% rate and
`src/core/superPhase.ts` consumes it, but neither section has been read in this project. U23 and the
whole of §C.4's right-hand column depend on it. It is also the provision the mid-year phase change refusal
in `superPhase.ts` (`MidYearPhaseChangeError`) is refusing on behalf of.

**O53 — TAA Sch 1 Div 155 was never retrieved.** It supplies the assessment machinery that s 294-240's due
date hangs off (U26) and the amendment periods that bound how far back a breach can be assessed.

**O54 — Capped defined benefit income streams are unmodelled and appear in four places in this cluster**
(s 136-70(1)(c)(i), s 136-80(2), s 294-25 Note 1 "modified for certain capped defined benefit income
streams: see Subdivision 294-D", s 294-30(1) Note). Subdivision 294-D was not retrieved. Whether the
forecaster ever needs it depends on whether the household has a defined benefit pension — decide
explicitly, and if the answer is "not modelled", make declaring one a refusal rather than a silent
treatment as an account-based pension.

**O55 — Child recipients (Subdivision 294-E) were not retrieved**, though s 294-35(1) Note names them as a
cap modification. Out of scope for a two-adult household forecaster; record the scope decision rather than
leaving the Note dangling.

**O56 — `*value` of a superannuation interest, and F2024L01023.** U25. Needed before the item 5 debit or
the s 294-25 item 1/2 credits can be sized for anything other than a plain account-based pension.

**O57 — `src/core/superPhase.ts`'s `UNCAPPED_ENTRY` caveat text will need updating** once §3.10 lands. It
currently reads *"the transfer balance cap that limits how much capital may enter Retirement Phase is not
modelled (P3-9) — no amount here has been checked against it"*. **Under the settled decision in §C.8
that caveat is replaced by an actual check and a named refusal.** (Were the decision ever reversed, the
caveat would at minimum have to name the 15%-versus-0% direction of the error, §C.7.) Do not leave it
saying "not modelled" once it is.

### Open items from §D — the entry test and the TRIS conversion (O58–O64)

**O58 — ITAR (1997 Act) 2021 s 307-70.02 not retrieved.** The operative definition of
"superannuation income stream", to which ITAA 1997 s 307-70(2) delegates and on which the whole of
D.6 depends. Only TR 2013/5 ¶52's partial reproduction of subparagraph (a)(ii) is held. *Closes by:*
locating the *Income Tax Assessment (1997 Act) Regulations 2021* on legislation.gov.au (the ATO Legal
Database `REG/19940057` prefix serves the SIS Regulations only; the correct DocID or FRL identifier
for the ITAR was not determined) and fetching s 307-70.02 in full, including paragraphs (b)–(d) and
subsections (2)–(6). See U32.

**O59 — SISR reg 6.01(7) ("retirement") not retrieved.** Blocks the mapping from this model's
`ReleaseGround` values to Schedule 1 item 101, which s 307-80(3)(b) requires. Already implicated in
`CessationBeforePreservationAgeError`. *Closes by:* `REG/19940057/6.01(7)`. See U28.

**O60 — ITAA 1997 s 295-390 (the proportionate ECPI method) not retrieved, and no apportionment
rule exists in the register.** This is the **binding blocker** on the conversion limb of P3-8: every
conversion is mid-year. *Closes by:* fetching s 295-390 (and ss 295-395, 295-400) and opening a
register row for the choice-of-method and apportionment rule. See U30.

**O61 — No source applies TR 2013/5's cessation mechanism to a breach of the 10% MAXIMUM.** The
ruling's reasoning runs through reg 1.06(9A), which contains no maximum; only ¶18's general words
reach it. The register currently cites TR 2013/5 as if it stated the maximum consequence. *Closes
by:* an ATO ID, private ruling, determination, or auditor contravention guidance on a TRIS that
exceeded 10%. **Supersedes the "not retrieved" half of the existing §3.9 note; the "not retrieved"
statement is now false and the citation is now wrong.** See U31.

**O62 — "\*value" of a superannuation interest (ITAA 1997 s 307-205 and the regulations for it) is a
DEPENDENCY on the s 294-25 chunk, not an open item of this one.** Recorded so the conversion limb
does not re-research it. The conversion limb asserts the **starting day** and that the credit is of
the **whole supporting interest**; it asserts nothing about how the value is measured.

**O63 — No form, deadline, content or evidentiary rule was found for a s 307-80(3)(b)(ii)
notification, and the SMSF member-trustee case is unaddressed.** *Closes by:* ATO guidance or a
ruling; see U27. Until then the notification day is a **stated fact**, and the tool should say in
its provenance that the day was stated and not derived.

**O64 — Whether reg 6.01(2)(b)(ii)'s "unless" lapses the ceiling for the whole year or only
prospectively.** See U29. *Closes by:* the Explanatory Statement to the regulation that inserted
the TRIS definition — the same document O38 wants, so one retrieval closes both.

### Open item from the §B ↔ §D reconciliation (O65)

**O65 — §B's U16 and §D's automatic-conversion-at-65 finding are not consistent as written, and the
overlap case is still unresolved.** §D's Case D (item 106 satisfied, nothing else in s 307-80(2)(c))
and §B.4 agree. §B's **U16** case — retired at 62 on item 101, never notified, then turns 65 — is a
different fact pattern that §D's four-case table does not contain: paragraph (b) is a **disjunction**
and limb (b)(ii) is satisfied on its own terms, so on the bare text s 307-80(3) keeps excluding the
stream and it never converts. §D's general statement is true only for a member who has satisfied none
of items 101, 102A or 103; the enumeration argument that carries §D's finding does not reach the
overlap, because in the overlap the operative limb is engaged rather than absent. **Nothing in §D
closes U16**, so **O50's recommendation** (implement the ATO's reading, carry it as a labelled
inference) stands on §B's reasoning alone.
*Why it matters to the money:* which financial year fixes the personal cap under s 294-35(1), the day
the whole supporting interest is valued and credited, and whether the fund's earnings become exempt
on the birthday or on a notification day that may never come.
*What would close it:* the same two documents U16 and O50 already name — the EM to *Treasury Laws
Amendment (2017 Measures No. 2) Act 2017* (No. 55 of 2017) Sch 1 item 13, or a ruling addressing the
overlap. Neither retrieved.
*Consequences already recorded:* trap **T117**'s fixture must state that no item 101, 102A or 103 was
satisfied before the birthday (§B ↔ §D); and disagreement 5 in §B ↔ §D — whether the age-65
conversion day is derived or stated — cannot be settled toward "derived" without also settling this.

---

## 7. Fetch log

This is the merged retrieval record for the whole of P3-9. Four research agents ran separate passes
over separate provisions and each kept its own fetch log; those four logs were dropped when the
analysis was consolidated into this file, and are merged back here. **Retrieval date for every entry
below is 2026-09-09** unless a row says otherwise.

Every fetch was performed with `curl` and a browser User-Agent
(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 … Chrome/124.0` or `…/126.0`).
`WebFetch` was **not** used against `www.ato.gov.au` — it 403s. See §7.13.

**Counts.** 77 distinct successful retrievals, after collapsing 7 duplicate entries where two or
three agents independently pulled the same URL. 29 distinct URLs failed, recorded as 19 grouped
entries. **No failure has been removed.** A failure that has been shown to be a *true absence* — the
provision does not exist — is worth more than a success, because it closes a question; a failure that
was a *bad URL form* is worth almost as much, because it stops the next pass re-deriving the working
form. §7.9 and §7.10 keep those two categories apart, and §7.11 holds the failures that established
neither.

### 7.1 Successful retrievals — ITAA 1997, `DocID=PAC%2F19970038%2F<section>`

Every section tried returned **HTTP 200**. **No 403 was encountered on this prefix by any agent.**

| Section | Bytes | What came back |
|---|---|---|
| `294-35` | 116,977 | s 294-35(1)–(3), the child-recipient note, the Subdiv 960-M note, amendment history (inserted No 81 of 2016, never amended), and the CCH editorial note listing the 2017/18–2026/27 general caps ending **2026/27 $2.1m** |
| `294-40` | 116,731 | s 294-40(1)–(3) including the fuller (2)(b) tie-breaker wording ("…at the end of more than one day, the earliest of those days"). Inserted No 81 of 2016, **never amended** |
| `294-50` | 117 KB | s 294-50(1), (2), (3) **plus the superseded pre-2017 section**. Substituted by No 55 of 2017 Sch 1 item 5, eff 1 Jul 2017; originally inserted by No 81 of 2016 Sch 1 item 4. **Retrieved independently by two agents** (§B and §C passes); both got (1) and (2), which this file previously lacked |
| `294-120` | 115 KB | Guide to Subdiv 294-D + the Subdivision's table of sections (294-125 to 294-145) |
| `294-125` | 112 KB | s 294-125 — "*This Subdivision applies to you if you are the \*retirement phase recipient of a \*capped defined benefit income stream.*" |
| `294-130` | 118 KB | s 294-130 *Meaning of capped defined benefit income stream* — the 7-item table and the "*in the retirement phase just before 1 July 2017*" condition on items 2–7 |
| `294-135` | 118 KB | s 294-135 — special value: × 16 for lifetime products, × remaining term for life expectancy / market linked |
| `294-140` | 116 KB | s 294-140 — the lesser-of-two-excesses rule and the `capped defined benefit balance` |
| `294-145` | 142 KB | s 294-145 — the substituted item 1 debit (`debit value`) for capped defined benefit streams; sub (1) substituted by No 64 of 2020, applicable on or after 1 July 2017 |
| `294-225` | 200 | Subdivision 294-F *What this Subdivision is about* **and its table of sections** — which revealed ss 294-240, 294-245, 294-250, none of which this file had reached |
| `294-230` | 200 | s 294-230(1)–(3), confirmed word-for-word against the text already held |
| `294-235` | 200 | s 294-235(1)–(3), confirmed word-for-word |
| `294-240` | 200 | *When tax is payable — original assessments.* 21 days after notice of assessment |
| `294-245` | 200 | *When tax is payable — amended assessments* |
| `294-250` | 200 | *General interest charge* on unpaid assessed tax |
| `295-385` | 136,065 | ss 295-385(1)–(6) with amendment history, the **No 81 of 2016 Sch 8 item 1** amendment that put TRISs outside ECPI, and s 295-385(3)(b)'s actuary's certificate |
| `307-5` | 160,912 | Meaning of *superannuation benefit*. **Retrieved independently by two agents** (§C to grep for *maximum available release amount* — no hit; §D for context). Fetched, not quoted |
| `307-15` | 200 | Fetched only to grep for *maximum available release amount*; no hit |
| `307-65` | 116,258 | s 307-65(1)/(2) — a superannuation lump sum is a benefit that is **not** an income stream benefit; (2) treats a **partial commutation** payment as a lump sum. **The provision that settles BT59.** **Retrieved independently by two agents** (§B, §D) |
| `307-70` | 113,380 | s 307-70 — superannuation income stream benefit / superannuation income stream, both defined by regulation; note pointing to s 294-50(2). **Contains no cessation rule — a bare delegation to the regulations.** **Retrieved independently by two agents** (§B, §D) |
| `307-75` | 114,007 | s 307-75(1) — the **RP superannuation income stream benefit** link between s 307-80 and s 295-385(3)(a). Completes the phase→rate chain end to end |
| `307-80` | 200 | The retirement-phase entry test. Also grepped for *maximum available release amount*; no hit |
| `307-125` | 200 | Fetched only to grep for *maximum available release amount*; no hit |
| `307-205` | 118 KB | s 307-205 *Value of superannuation interest*, **as amended by No 8 of 2026 effective 1 April 2026** (subsection numbering removed; the accumulation-phase-value limb repealed) |
| `960-265` | 122,208 / 200 | The full indexation-relevance table. **Item 10A = "\*General transfer balance cap · section 294-35"**, and **no item for excess transfer balance tax**. **Retrieved independently by two agents** (§A, §C); §A read it as the CONFIG-gateway test, §C as an argument from absence |
| `960-270` | 110,786 | s 960-270(1)–(3): "**Some** provisions of this Act require amounts to be indexed"; (3) excludes items 8–12 and item 14, routing them to s 960-285 |
| `960-275` | 141,303 | The generic "indexation factor" provision. Fetched, not quoted — superseded for item 10A by s 960-285(5) |
| `960-280` | 122,481 | s 960-280(1) (All Groups CPI, weighted average of 8 capital cities, **first published**), (2) car limit, **(3) the reference-period change rule**, (4) AWOTE. **(3) is the provision U9/O41 turns on** |
| `960-285` | 148,062 | Current s 960-285(1)–(7) including the (7) table (item 3 = general transfer balance cap, CPI, **$100,000**), the superseded pre-2017 version, and the No 8 of 2026 amendment history for items 10B/10C |
| `995-1` | 200 | Dictionary. Located *maximum available release amount* → TAA 1953 Sch 1 s 131-45 (substituted for the former reference by No 81 of 2016 Sch 10 item 26) |

### 7.2 Successful retrievals — Income Tax Assessment (1997 Act) Regulations 2021, `DocID=REG%2F20210206%2F<section>`

| Section | HTTP | What came back |
|---|---|---|
| `307-205.02` | 200, 114 KB | Its (2)(b)(ii) **excludes** streams based on "*the amount available in the member's account*", i.e. account-based pensions, so s 307-205(b) governs them |
| `307-205.02B` | 200 | Value for **public sector** superannuation schemes. Not applicable to an account-based interest; header noted, not read in full (**O43**) |
| `294-25.01` | 200 | Credit item 5: consideration paid for a **deferred** superannuation income stream interest. Amount = the consideration; arises when paid |
| `294-25.02` | 200 | Credit item 5: commutation of a **capped defined benefit** stream rolled directly into a life-expectancy or market-linked stream |
| `294-25.03` | 200 | Credit item 5: **successor fund transfer** of a capped defined benefit stream; credit = the item 6 debit; sub (4) switches off table item 2 for that stream |
| `294-80.01` | 200 | Debit item 8: CPI-exclusive **reduction** in a capped defined benefit stream benefit; amount = the fall in special value; arises at the later time |
| `294-80.02` | 200 | Debit item 8: **deferred** stream under reg 307-205.02C(1); amount = benefits payable on voluntary cessation |
| `294-80.03` | 200 | Made under s 294-80(3): items 5 and 6 do not apply to reg 307-205.02C(1) deferred streams |
| `294-145.01` | 200 | Exists — the `debit value` method for s 294-145(7). Header confirmed only; not read in full (**O43**) |

### 7.3 Successful retrievals — SIS Regulations 1994, `DocID=REG%2F19940057%2F<reg>`

| Reg | HTTP | What came back |
|---|---|---|
| `Sch1` | 200, 162,380 | Schedule 1 Parts 1–3 with column 2 (conditions of release) and column 3 (cashing restrictions), plus full amendment history. **Items 101, 102, 102A, 103, 104, 105, 106 read directly.** New provenance for register §3.9's Access table and for the unwritten §3.10 |
| `6.01%282%29` | 200, 228,798 | Re-fetched independently of the P3-10 pass in order to verify the **punctuation** of the "unless": it sits at the end of subparagraph (b)(ii), before the "; and" leading to (b)(iii), so **(b)(i) is unqualified**. Load-bearing for D.5's "the Schedule 7 minimum survives" |

### 7.4 Successful retrievals — TAA 1953, `DocID=PAC%2F19530001%2F<section>` and `…%2FSch1-<section>`

The **`Sch1-` prefix is required** for Schedule 1 sections. See §7.13.

| Section | HTTP | What came back |
|---|---|---|
| `8AAD` | 200 | s 8AAD(1), (1A), (2) incl. the quarter/reference-month table, (3), (4). Confirms **s 8AAD(1A) inserted by No 8 of 2026 Sch 1 item 67, effective 1 April 2026** |
| `Sch1-96-…` | — | see §7.12 |
| `Sch1-131-5` | 200 | The five paragraphs (a), (b), (c), (ca), (d) of the release-request trigger list. **Excess transfer balance tax is absent from it** |
| `Sch1-131-15` | 200 | Fetched while hunting the MARA definition; no hit |
| `Sch1-131-45` | 200 | *Maximum available release amount*, one sentence, in full |
| `Sch1-136-5` | 200 | Subdiv 136-A *What this Subdivision is about* + table of sections (136-10, 136-15, 136-20, 136-25 **only**) |
| `Sch1-136-10` | 200 | Full text incl. **(5) prima facie evidence, (6) the mandatory default commutation notice and its three specified contents, (7) the definition** — none of which this file previously held |
| `Sch1-136-15` | 200 | *Review.* Part IVC objection; **the default commutation notice does not form part of the taxation decision.** Not previously captured |
| `Sch1-136-20` | 200 | Full text incl. (1)(b) the "2 or more streams" gate, (3) the identification requirements, (4)(b)(ii) "a further period allowed by the Commissioner", (5) irrevocability |
| `Sch1-136-25` | 200 | *Notifying Commissioner of transfer balance debits*, incl. the window: from the determination to the earlier of the election and the end of the election period. Not previously captured |
| `Sch1-136-50` | 200 | Subdiv 136-B *What this Subdivision is about* + table of sections (136-55, 136-60, 136-65, 136-70, 136-80, 136-85, 136-90) |
| `Sch1-136-55` | 200 | Full text, all six subsections, incl. **(3) the top-up rule for a short election** and (5) the four content requirements |
| `Sch1-136-60` | 200 | *Varying and revoking a commutation authority.* Not previously captured |
| `Sch1-136-65` | 200 | *Issuing further commutation authorities* after a shortfall or non-compliance, incl. the (4) cap. Not previously captured |
| `Sch1-136-70` | 200 | Full text of (1)(a)–(c) and (2) |
| `Sch1-136-80` | 200 | Full text of (1)–(3) |
| `Sch1-136-85` | 200 | Provider must notify the Commissioner within 60 days, approved form; s 286-75 penalty. Not previously captured |
| `Sch1-136-90` | 200 | Provider must notify **you** within 60 days. Not previously captured |
| `Sch1-155-5`, `Sch1-155-15`, `Sch1-155-25` | 200 | Retrieved but **NOT read.** Div 155 (assessments) is left open as **O42/U14** |

### 7.5 Successful retrievals — ATO rulings

Law Companion Rulings use the **`COG`** prefix; Taxation Rulings use **`TXR`**. See §7.10 and §7.13.

| DocID | HTTP | What came back |
|---|---|---|
| `COG%2FLCR20169%2FNAT%2FATO%2F00001` | 200, 271,690 | **LCR 2016/9** *Superannuation reform: transfer balance cap and transition-to-retirement reforms*, consolidated version, 877 lines of extracted text. A **public ruling**, binding on the Commissioner under TAA 1953 **except as to excess transfer balance tax**. Paras read across the three passes: 11–17C, 15B–17O (personal cap, unused cap percentage, Examples A1 and A2), 20–30D, 31–46, 51 (end-of-day measurement), 55–68B, 76 (a transitional excess still bars indexation). **Retrieved independently by three agents** (§A, §B, §D), byte-identical at 271,690 each time — the strongest provenance in this file |
| `COG%2FLCR20168%2FNAT%2FATO%2F00001` | 200 | Title confirmed as *transitional CGT relief* — **not** this cluster. Not read further |
| `COG%2FLCR201610%2FNAT%2FATO%2F00001` | 200 | Title confirmed: *capped defined benefit income streams — non-commutable, lifetime pensions and lifetime annuities*. Title only; not read |
| `COG%2FLCR20173%2FNAT%2FATO%2F00001` | 200 | Title confirmed: *Superannuation death benefits and the transfer balance cap*. Title only; out of scope |
| `TXR%2FTR20135%2FNAT%2FATO%2F00001` | 200, 269,793 | **TR 2013/5** in full, 798 lines of extracted text including all footnotes and Appendix 2. ¶¶4, 10, 18–20, 51–59, 71B, 96–101, Example 6 ¶¶42–44, fn [1B], [17], [25], [36C]–[36E]. Closes half of the §3.4 gap |
| `TXR/TR20135/NAT/ATO/00001` (**unencoded slashes**) | 200, 269,793 | The same document, byte-for-byte, via an unencoded URL. Retrieved deliberately as a probe: it establishes that **the Legal Database accepts unencoded `/` in a DocID** — see §7.14 |

### 7.6 Successful retrievals — ATO published web pages

| URL | HTTP | What came back |
|---|---|---|
| `https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/transfer-balance-cap` | 200, 295,604 | "Last updated **27 April 2026**." Table 26: **2026–27 = 2.1**, 2025–26 = 2, 2024–25 = 1.9, 2023–24 = 1.9, 2022–23 = 1.7, 2021–22 = 1.7, 2020–21…2017–18 = 1.6. Table 27 defined benefit income cap 2026–27 = $131,250. **Resolves the register's asserted conflict in favour of $2,100,000** |
| `https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps` | 200, 625,284 | "Last updated **24 April 2026**." Carries the disputed "*Note: The general transfer balance cap is $2 million from 1 July 2025*" **immediately above** "*From 1 July 2025 to 30 June 2026, the general transfer balance cap **was** $2 million*". The stale Note is contradicted by the next sentence on the same page |
| `https://www.ato.gov.au/rates/general-interest-charge-(gic)-rates/` | 200 | Page last updated **4 September 2026**. Quarterly GIC annual and daily rates back to 2019, incl. **Jul–Sep 2026 = 11.43%** and **Oct–Dec 2026 = 11.51%**, and the statement "*Section 8AAD … specifies how the rate of the charge is calculated. To work out the daily rate, divide this rate by the number of days in a calendar year.*" |

### 7.7 Successful retrievals — ABS SDMX API

| URL | HTTP | What came back |
|---|---|---|
| `https://data.api.abs.gov.au/rest/data/ABS,CPI,/1.10001.10.50.Q?startPeriod=2016-Q4&endPeriod=2026-Q2`, `Accept: application/vnd.sdmx.data+csv` | 200 | Resolved to dataflow **`ABS:CPI(2.0.0)`**. Dec 2016 **76.38**, Dec 2017 **77.87**, Dec 2018 **79.24**, Dec 2019 **80.70**, Dec 2020 **81.40**, Dec 2021 **84.23**, Dec 2022 **90.85**, Dec 2023 **94.53**, Dec 2024 **96.81**, **Dec 2025 100.32**. `BASE_PERIOD` code **25**. These nine numbers plus s 960-285 reproduce **every** published general transfer balance cap. **Closes O11** |
| `https://data.api.abs.gov.au/rest/data/ABS,CPI,1.1.0/1.10001.10.50.Q?…` (three period ranges) | 200 | The **superseded** dataflow. Dec 2016 **110.0** … Dec 2024 **139.4**; the series **ends at Sep 2025 = 143.6** — **no Dec 2025 number exists on the old base.** Decisive for U9: proves the ABS re-referenced the CPI with the December 2025 quarter, and that the old base cannot supply the FY2026-27 numerator at all |
| `https://data.api.abs.gov.au/rest/codelist/ABS/CL_BASE_PERIOD` | 200 | JSON. Code **25 = "2025 = 100.0"**. **Partial success only:** the codelist offers calendar-year labels and its label does not reconcile with the observed series (calendar-2025 average = 99.045, not 100.0), so it does **not** authoritatively name the CPI's reference period. This is why **U9/O41 stays open** rather than being closed here |

### 7.8 Successful retrievals — Federal Register of Legislation OData, `https://api.prod.legislation.gov.au/v1/titles`

| Query | HTTP | What came back |
|---|---|---|
| `$filter=contains(name,'Excess Transfer Balance')&$select=id,name,collection` | 200 | Count 1: `C2016A00080` *Superannuation (Excess Transfer Balance Tax) Imposition Act 2016*, collection `Act` |
| `$filter=contains(name,'Excess Transfer')` | 200 | Count 1, the same single result |
| `$filter=contains(name,'Transfer Balance Cap')` | 200 | **Count 0.** A successful query returning an established absence |
| `$filter=contains(name,'Transfer Balance')` | 200 | Count 3: `F2024L01023` *Income Tax Assessment Amendment (Transfer Balance Account Value for Certain Superannuation Income Streams) Regulations 2024*; `F2017L01273` *Reporting of event based transfer balance account information…*; `C2016A00080`. **No s 294-235(3) rate determination exists.** Basis for U9's argument from absence, and the source of O45's `F2024L01023` lead |

### 7.9 Failures — CONFIRMED TRUE ABSENCES

**These are the highest-value rows in this log.** In each case the 404 was corroborated against an
independent source — a table of sections, a dataflow enumeration, or a second agent — and the
conclusion is that **the thing does not exist**, not that the URL was wrong. Do not retry them.

| URL / DocID | HTTP | What the absence establishes | How it was corroborated |
|---|---|---|---|
| `REG%2F20210206%2F294-80.04` | 404 | **Regs 294-80.01 to .03 are the complete item-8 set.** There is no fourth item-8 regulation | The three that exist were all retrieved (§7.2); the numbering runs out |
| `PAC%2F19530001%2FSch1-136-28` | 404 | Division 136 has **exactly eleven** sections: 136-10, -15, -20, -25 in Subdiv 136-A and 136-55, -60, -65, -70, -80, -85, -90 in Subdiv 136-B | The two subdivision tables of sections (`Sch1-136-5` and `Sch1-136-50`), both retrieved at 200, independently enumerate the Division |
| `PAC%2F19530001%2FSch1-136-30` | 404 | as above | as above |
| `PAC%2F19530001%2FSch1-136-35` | 404 | as above | as above |
| `PAC%2F19530001%2FSch1-136-40` | 404 | as above | as above |
| `PAC%2F19530001%2FSch1-136-45` | 404 | as above | as above |
| `PAC%2F19530001%2FSch1-136-75` | 404 | as above | as above |
| `…DocID=TXR%2FTR20135%2FNAT%2FATO%2F00003` | 404 (101,529-byte shell) | **There is no `/00003` version of TR 2013/5.** The `…/00001` suffix is the live consolidated document | The `/00001` form returned the full consolidated ruling twice, by two URL encodings |
| `https://data.api.abs.gov.au/rest/data/ABS,CPI,1.0.0/…` | 404 "Could not find Dataflow and/or DSD related with this data request" | **Only versions 1.1.0 (superseded) and 2.0.0 (current) of the ABS CPI dataflow exist.** The version segment is load-bearing and cannot be guessed upward | Both surviving versions returned 200 with data |
| `https://data.api.abs.gov.au/rest/data/ABS,CPI,1.2.0/…` | 404, same message | as above | as above |
| `…/v1/titles?$filter=contains(name,'Excess Transfer Balance')&$select=id,name,collection,inForce` | 400 "Could not find a property named 'inForce' on type 'Default.Title'" | **`inForce` is not a selectable property on the OData `Titles` entity.** Drop it from `$select` | The identical query without `inForce` returned 200 |

### 7.10 Failures — BAD URL FORM (the document exists; the request was malformed)

In every row below the target document was subsequently retrieved, or is known to be retrievable,
under a different URL. **Nothing is missing — only the form was wrong.**

| URL / DocID | HTTP | The working form instead | Notes |
|---|---|---|---|
| `…DocID=LCR%2FLCR20169%2FNAT%2FATO%2F00001` | 404, "Error \| ATO Legal Database" | `COG%2FLCR20169%2FNAT%2FATO%2F00001` | **Hit independently by three agents** (§A, §B, §D). Three separate passes each burned a retrieval on the intuitive `LCR/` prefix before finding `COG/`. This is the single most repeated wasted fetch in the project |
| `…DocID=LCR%2FLCR20168%2FNAT%2FATO%2F00001` | 404 | `COG%2FLCR20168%2FNAT%2FATO%2F00001` | Same prefix error, second ruling |
| `…DocID=TXR%2FLCR20169%2F…` | 404 | `COG%2FLCR20169%2F…` | `TXR` is the **Taxation Ruling** prefix; it does not serve Law Companion Rulings |
| `…DocID=SAL%2FITAR2021%2F307-205.02` | 404 | `REG%2F20210206%2F307-205.02` | A guessed prefix for the *Income Tax Assessment (1997 Act) Regulations 2021*. The regulations use `REG` + the FRL-style numeric id, not an abbreviation of the title |
| `…DocID=PAC%2F19530001%2F8AAD-1` | 404 | `PAC%2F19530001%2F8AAD` | **Subsection-level DocIDs are not addressable.** The whole-section DocID carries every subsection anyway, so there is never a reason to try one |
| `…DocID=REG%2F19940057%2FSch1-1` | 404 | `REG%2F19940057%2FSch1` (the whole schedule) | **SISR Schedule 1 has no `Sch1-<item>` form.** The items exist and are in the bare-`Sch1` document |
| `…DocID=REG%2F19940057%2FSch1-101` | 404 | `REG%2F19940057%2FSch1` | As above. Note the trap: the `Sch<N>-<item>` suffix **does** work for TAA 1953 Sch 1 (`Sch1-136-80`) and for **SISR Schedule 7** (`Sch7-1`) — it is Schedule 1 of the SIS Regulations specifically that refuses it |
| `https://api.prod.legislation.gov.au/v1/titles/search(criteria='Income%20Tax%20Assessment%20(1997%20Act)%20Regulations%202021')?$top=5` | 400, "Unexpected error / cannot parse Income" | `$filter=contains(name,'…')` | The OData `search(criteria=…)` form rejects titles containing unescaped parentheses. The `$filter=contains(name,…)` form works (§7.8) |

### 7.11 Failures — endpoint or path unusable (nothing established about the document)

These rows establish **neither** presence nor absence. They record dead ends so that the next pass
does not spend time on them, and so that no one mistakes them for evidence that a document is missing.

| URL | HTTP | What it means |
|---|---|---|
| `…/super/withdrawing-and-using-your-super/transfer-balance-cap` | 404 (~257 KB error page) | Guessed path for the ATO consumer-facing page. **U14 stays open** — this does not show the page does not exist, only that it is not here |
| `…/super/withdrawing-and-using-your-super/personal-transfer-balance-cap` | 404 (~257 KB) | As above |
| `…/super/withdrawing-and-using-your-super/transition-to-retirement` | 404 (256,905 bytes) | Attempt to re-fetch the ATO web guidance register §3.9 cites for the TRIS maximum. **The path has moved.** Not pursued: LCR 2016/9 and TR 2013/5 are both rulings and outrank a web page |
| `…/for-super-funds/paying-benefits/transition-to-retirement-income-streams-tris` | 404 (256,905 bytes) | As above. Two agents' worth of evidence that ATO non-`/law/` guidance paths recorded by earlier passes have shifted |
| `https://www.ato.gov.au/tax-rates-and-codes/interest-rates-general-interest-charge-and-shortfall-interest-charge` | 404 | Guessed path for GIC rates. The working page is `https://www.ato.gov.au/rates/general-interest-charge-(gic)-rates/` (§7.6) |
| `https://www.ato.gov.au/api/search?q=personal%20transfer%20balance%20cap` | 404 | **There is no usable ATO search API at that path** |
| `https://www.ato.gov.au/law/view/results?query=LCR%202016%2F9` | 302 | The Legal Database search endpoint redirects and returns no usable result to `curl` |
| `https://duckduckgo.com/html/?q=site:ato.gov.au …` | 302, no result links extracted | **Search-engine discovery is not available from this environment.** Every ATO document in this log was reached by constructing the URL directly |
| `PAC%2F19530001%2FSch1-96-10`, `…%2FSch1-96-15` | 404 | Speculative probes for the *maximum available release amount* definition. Not an absence finding about Div 96 — the definition is in **Div 131**, as s 995-1 said. Recorded only so the guess is not repeated |

### 7.12 Documents NOT attempted — recorded so the gap is visible

Nothing below was fetched. They are listed so that a later reader does not assume they were tried
and failed.

- **ITAA 1997 Subdivision 295-F** (ss 295-385, 295-390 — the earnings tax exemption itself). s 295-385 was later retrieved by the §D pass (§7.1); **s 295-390** (the proportionate ECPI method) and ss 295-395, 295-400 were not. → **O41 / U11 / U12.** Try `PAC%2F19970038%2F295-390`; the prefix is confirmed on more than twenty sections.
- **ITAA 1997 Subdivision 294-D** (capped defined benefit income streams) beyond the sections in §7.1, and **Subdivision 294-E** (child recipients). → **O43 / O44.**
- **TAA 1953 Sch 1 Division 155** (assessments) — three sections retrieved, **not read**. → **O42 / U14.**
- **`F2024L01023`** (transfer balance account *value*) and the s 995-1 definition of `*value`. → **O45 / U13.**
- **ITAR (1997 Act) 2021 s 307-70.02.** The §D pass did not attempt it because it had not yet established the `REG%2F20210206%2F` prefix — **the §B pass later did** (§7.2), so this is now a one-line fetch. It was called *"the single highest-value unfetched document"* for D.6 and remains so.
- **SISR reg 6.01(7)** ("retirement"). Try `REG%2F19940057%2F6.01%287%29`; the `6.01(2)` form is confirmed working, so the same shape should serve.
- **reg 294-130.01, regs 307-205.02C / 02D / 02E, reg 294-145.01 in full**, and *Income Tax (Transitional Provisions) Act 1997* Subdiv 294-A/294-B. → **O43.**
- **SIS Regulations Part 6** cashing rules, for where a commutation lump sum may go. → **U12.**
- **The Explanatory Statement to the regulation that inserted the TRIS definition.** Would close **O38** and **O64** at once. On legislation.gov.au, not the ATO database.
- **The EM to *Treasury Laws Amendment (2017 Measures No. 2) Act 2017* (No. 55 of 2017) Sch 1 item 13.** The document **U16**, **O50** and **O65** all name. Not retrieved.

### 7.13 Reusable retrieval facts

Each of these cost a real fetch, and several cost the same fetch more than once because three agents
worked in parallel without a shared log. They are written as instructions, not anecdotes. **They are
owed to register §10 (Source index), which has not been updated from this file.**

**ATO Legal Database — DocID prefixes**

1. **ITAA 1997: use `?DocID=PAC%2F19970038%2F<section>`.** 200 on every section tried across three
   agents and more than twenty sections. No 403, no rate limiting, no Cloudflare challenge.
2. **TAA 1953: use `?DocID=PAC%2F19530001%2F<section>`.** For **Schedule 1 sections the `Sch1-`
   prefix is required**: `PAC%2F19530001%2FSch1-136-80`, not `…%2F136-80`.
3. **Do not try subsection-level DocIDs.** `…%2F8AAD-1` 404s; `…%2F8AAD` returns every subsection.
4. **Law Companion Rulings: use `?DocID=COG%2FLCR<year><n>%2FNAT%2FATO%2F00001`.** The intuitive
   `LCR%2F…` form **404s**, and so does `TXR%2F…`. Three separate agents lost a fetch to this.
5. **Taxation Rulings: use `?DocID=TXR%2FTR<year><n>%2FNAT%2FATO%2F00001`.** The `…%2F00001` suffix is
   the live consolidated document; higher suffixes such as `/00003` do not exist.
6. **Income Tax Assessment (1997 Act) Regulations 2021: use `?DocID=REG%2F20210206%2F<section>`.**
   Not `SAL`, not an abbreviation of the title. 8 of 9 sections tried returned 200; the one 404 was a
   section that genuinely does not exist.
7. **SIS Regulations 1994: use the `REG` prefix, not `PAC` — `?DocID=REG%2F19940057%2F<reg>`.**
   Subregulation form works percent-encoded: `6.01%282%29` for reg 6.01(2).
8. **SISR Schedule 1 has no `Sch1-<item>` form. Fetch the whole schedule with the bare `Sch1` DocID.**
   The `Sch<N>-<item>` suffix works for TAA 1953 Sch 1 and for **SISR Schedule 7** (`Sch7-1`) — it is
   SISR Schedule 1 specifically that refuses it.
9. **The Legal Database accepts unencoded slashes in a DocID.** `DocID=TXR/TR20135/NAT/ATO/00001`
   returns the identical bytes to the percent-encoded form. Percent-encoding is not required.
10. **Use `?DocID=`, never `?LocID=`.** The `?LocID=%22…%22` form this project's earlier passes used
    returns a **title-only shell** with no legislative text. Register rows still carrying `?LocID=`
    URLs are cosmetically wrong and cite a document that does not contain the quoted words.

**Transport**

11. **`WebFetch` 403s on `www.ato.gov.au`, every URL. Use `curl` with a browser User-Agent** — the
    same `Mozilla/5.0 … Chrome/12x` string in the header of this log — which returns 200 for web
    pages, the Legal Database, and `/law/view/pdf/`.
12. **An ATO 404 is served with a real 404 status **and** a ~257 KB HTML error page.** Check the
    status code; do not infer success from a large response body.
13. **The Legal Database `results?query=` search endpoint is unusable from `curl`** (302, no usable
    result), and **there is no ATO search API at `/api/search`** (404).
14. **Search-engine discovery is not available from this environment** (DuckDuckGo HTML endpoint
    returns 302 with no extractable links). **Construct Legal Database URLs directly from the prefixes
    above** — that is how every document in this log was reached.
15. **Prefer `/law/view/document` over ATO guidance pages.** Non-`/law/` `www.ato.gov.au` guidance
    paths recorded by earlier passes have **moved**: four separate consumer-page paths cited by this
    project's own earlier documents now 404. The Legal Database route is stable.

**ABS**

16. **ABS index numbers: `https://data.api.abs.gov.au/rest/data/ABS,CPI,<version>/1.10001.10.50.Q?startPeriod=…&endPeriod=…`
    with `Accept: application/vnd.sdmx.data+csv`.** The dataflow **version segment is load-bearing**:
    `2.0.0` is the current reference base, `1.1.0` the superseded one, and **no other version exists**.
    Omitting the version (`ABS,CPI,/…`) resolves to the current one.
17. **The ABS codelist endpoint (`/rest/codelist/ABS/CL_BASE_PERIOD`) returns 200 but does not settle
    the reference period.** Its labels are calendar-year and do not reconcile with the observed series.
    Do not treat it as authority for the CPI base.

**Federal Register of Legislation**

18. **OData enumeration: `https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'<text>')&$select=id,name,collection`.**
    **`inForce` is not a selectable property** and adding it returns 400.
19. **Do not use the `titles/search(criteria='…')` form for a title containing parentheses** — it
    returns 400 with a parse error. Use `$filter=contains(name,…)`.
20. **legislation.gov.au HTML is an SPA shell with no legislative text.** The route for full text is
    `https://www.legislation.gov.au/<id>/latest/downloads` → the `.../text/original/word` link →
    `curl` → unzip `word/document.xml`. Not needed by this pass; the ATO Legal Database served
    everything.
