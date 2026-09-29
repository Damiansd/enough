## C. Excess transfer balance — earnings, tax and correction

**Retrieval date for every fetch in this section: 2026-09-09.** Forecast year FY2026-27. Everything
quoted below was either already verbatim in this file's RAW PRIMARY TEXT section or was fetched in
this pass and is logged in `## FETCH LOG`. Nothing here is written from memory.

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
found. `unverified` → **CU9**.

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

**None of these figures is large.** That is itself the finding, and it drives §C-DESIGN-RECOMMENDATION:
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
**CU10** records what would close it properly.

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
  Subdiv 295-F itself was not retrieved in this pass` → **CU11**.

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
pass did not retrieve. `unverified` → **CU12**.

**But the tax consequence of the two destinations differs, and it is 15 percentage points on the
earnings of the commuted capital, every year, for the rest of the projection:**

- Retained in accumulation → fund earnings on that capital are taxed at **15%** (register §3.1, `superannuation.fundTax.earningsTaxAccumulation`, and `src/core/superPhase.ts`).
- Cashed out to the member's own name → taxed in the member's hands at their marginal rate, with the deeming and Age Pension asset-test consequences that entails (register §4.4, §4.5).

**Does the tool need to model that flow?** Given the recommendation in §C-DESIGN-RECOMMENDATION —
refuse to project a breaching plan — **no, and it must not pretend to.** The flow only exists in a
world where a breach happened, and the recommendation is that the engine never produces such a world.
If the recommendation is rejected in favour of "warn and continue", then the flow becomes mandatory,
because *not* modelling it is the flattering error: leaving the commuted capital in retirement phase at
0% overstates the household's position by 15% of its earnings, compounding, forever. **There is no
"warn and continue" option that is safe without modelling the accumulation-phase move.** That is the
strongest single argument against "warn and continue" and it is why §C-DESIGN-RECOMMENDATION is written
as it is.

---

## C-UNKNOWNS

**CU9 — Has any instrument ever been made under s 294-235(3)?**
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

**CU10 — Can excess transfer balance tax be paid from superannuation by any route?**
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

**CU11 — Is the earnings tax exemption really unmodified by s 294-50 in a s 307-80(4) case?**
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

**CU12 — Where does a s 136-80 commutation lump sum go?**
*The question:* the provision says "pay by way of commutation … a superannuation lump sum" and names no
destination. May it be retained in accumulation phase inside the same fund?
*Why it matters to the money:* 15% fund earnings tax versus the member's marginal rate, plus deeming
and Age Pension assets-test treatment on the money if it leaves super — see §C.7.
*What would close it:* SIS Regulations Part 6 (cashing rules) and the payment standards; and the ATO's
own guidance on responding to a commutation authority.
*Current label:* `unverified`. **This unknown is currently harmless only because the design
recommendation refuses to project breaching plans.** If that recommendation is rejected, CU12 becomes a
blocker.

**CU13 — What is the *value* of the supporting interest for the item 5 debit?**
*The question:* s 294-80(1) item 5 debits *"the \*value of the \*superannuation interest that supports
it at the end of the period"*. `*value` is a defined term with its own valuation rules (and F2024L01023,
*Income Tax Assessment Amendment (Transfer Balance Account Value for Certain Superannuation Income
Streams) Regulations 2024*, was found in the FRL search and modifies it for some streams). Neither was
retrieved.
*Why it matters to the money:* it sizes the largest single debit in the whole Division.
*What would close it:* the s 995-1 definition of `value` for a superannuation interest, plus F2024L01023.

**CU14 — Does the Commissioner have any deadline at all?**
*The question:* ss 136-10(1) and 136-55(1) impose no time limit on the Commissioner's own acts, and
s 294-240 keys the due date to an assessment whose timing is unstated. Is there an outer limit
(Div 155 amendment periods, an administrative service standard)?
*Why it matters to the money:* it determines the length of the excess transfer balance period, which is
the exponent in `E((1+r)^N − 1)`, and it determines which financial year the cash outflow lands in.
*What would close it:* TAA Sch 1 Div 155 (assessments and amendment periods), not retrieved.

---

## C-TRAPS

**CT58 — Taxing the excess instead of the earnings on the excess.**
A $200,000 excess must not produce `$200,000 × 15% = $30,000`. It produces **15% of $5,715.99 = $857.40**
over 90 days. *Test:* assert that a fixture with a $200,000 excess for 90 days at an 11.43% annual GIC
rate returns tax of $857.40, and that no code path multiplies a cap-excess by 0.15 or 0.30.

**CT59 — Simple interest instead of daily compounding.**
s 294-25 item 3 credits each day's earnings back "at the start of the next day", so `E × r × N` is wrong.
*Test:* the same fixture must return $5,715.99, not $5,636.71 — a 1.39% gap over 90 days that widens with
the period. Assert the closed form `E × ((1+r)^N − 1)`.

**CT60 — Annualising or re-dividing the s 8AAD(1) rate.**
s 8AAD(1) already divides by the days in the calendar year. *Test:* feed the engine an annual GIC rate of
11.43% and assert the daily rate it uses is 0.000313150684931507, not 11.43% and not 0.0000008579.

**CT61 — Dividing by 365 unconditionally, or by the days in the *financial* year.**
s 8AAD(1) says *"the number of days in the **calendar** year"*. *Test:* a day in February 2028 must divide
by 366; 31 December 2027 must divide by 365; and an excess period spanning 1 January must use both.

**CT62 — Using the s 8AAD(1A) Division 296 rate (base + 3) for transfer balance purposes.**
Inserted into the same section on 1 April 2026 by No 8 of 2026. s 294-235(2)(a) cites *subsection 8AAD(1)*
by number. *Test:* assert the excess-transfer-balance rate and the Div 296 rate differ by exactly
`4 ÷ days-in-calendar-year` on any given day, and that the transfer balance path consumes the +7 one.

**CT63 — Holding the rate constant across a calendar quarter boundary.**
The base interest rate changes on 1 Jan / 1 Apr / 1 Jul / 1 Oct — not on 1 July only. *Test:* a 90-day
excess beginning 1 August 2026 must produce $5,729.06 (61 days at 11.43%, 29 at 11.51%), not $5,715.99.

**CT64 — Storing a rounded daily rate as config.**
s 8AAD(4) rounds only the **base interest rate**, to 2 dp. The ATO's published 8-dp daily rate is a display
figure. *Test:* the config record must hold the base or annual rate per quarter; assert no 8-decimal
literal daily rate exists under `src/data/`.

**CT65 — Treating a determination period as ordinary compounding, or as ordinary simple interest.**
Once a determination issues, s 294-25(2) stops the item 3 credit and s 294-230(3)(b) substitutes
`r² · E · D(D−1)/2` on top of `D · r · E`. *Test:* a 90-day period run entirely as a determination period
must yield $5,715.26, distinguishable from both $5,715.99 (compounded) and $5,636.71 (simple).

**CT66 — Missing that a determination period ends early on any credit.**
s 294-25(2)(b)(ii): the period ends *"if a \*transfer balance credit arises … before that day — the day on
which that credit arises"*. *Test:* a new pension commenced during a determination period must re-arm
item 3 compounding from that day.

**CT67 — Treating the excess transfer balance period as a financial year.**
s 294-230(2) is *"a continuous period of one or more days"* with no year boundary. *Test:* a period running
20 June to 20 July is **one** period, not two, and the 15%/30% test applies to it once.

**CT68 — Not breaking the period on a single compliant day.**
*Test:* 40 excess days, one compliant end-of-day, then 40 more excess days = **two** periods. If the first
one started on or after 1 July 2018, the second is taxed at **30%**, not 15%.

**CT69 — Implementing "subsequent breach" as "the second breach ever".**
Imposition Act s 5(2) requires **both** that the current period starts on or after 1 July 2018 **and** that
a previous liability arose for a period that *also* started on or after 1 July 2018. *Test:* a first period
starting 1 March 2018 followed by a second starting 1 March 2019 must be taxed at **15%**, not 30%.

**CT70 — Requiring a determination before the 30% rate can be primed.**
s 5(2)(b) says "has previously been **liable**". s 136-10(1) Note says liability arises with or without a
determination. *Test:* a prior period with no determination and no assessment must still prime 30%.

**CT71 — Indexing 15% or 30%.**
Neither appears in ITAA 1997 s 960-265, which is this project's indexation test, and the Imposition Act has
no indexation provision and has never been amended. *Test:* the constants must be `kind: 'constant'`, and a
mutation that FY-keys them must fail a register-consistency test.

**CT72 — Booking the tax as a cash outflow in the year of the breach.**
s 294-240: due 21 days after notice of assessment; s 294-245 for amendments. The assessment date is not
fixed by statute. *Test:* the accrual year and the payment year must be separable inputs, and the engine
must refuse to assume they are the same year rather than silently assuming it.

**CT73 — Paying the tax from superannuation.**
TAA Sch 1 s 131-5(1) lists excess concessional, excess non-concessional, Div 293, Div 296 and FHSS. Excess
transfer balance tax is not there. *Test:* whatever release-authority machinery exists for Div 293/296 must
not accept an excess transfer balance liability.

**CT74 — Sizing the s 294-80(1) item 5 debit at the reduction amount.**
It is *"the \*value of the \*superannuation interest that supports it"* — the **whole interest**. *Test:* a
$2.3m interest with a $200,000 reduction amount and a non-compliant provider must produce a **$2.3m** debit.

**CT75 — Applying s 307-80(4) retrospectively to the transfer balance account.**
s 294-50(3) disregards s 307-80(4) for TBA purposes at every time before the end of the 60-day period.
*Test:* credits and debits recorded earlier in that income year must be untouched; the item 5 debit must
arise **at the end of the 60-day period**, not at the start of the income year.

**CT76 — Applying s 294-50(3) to the earnings tax exemption.**
s 294-50(1) scopes it to *"(a) whether you have a \*transfer balance account; (b) the \*transfer balance in
your transfer balance account"* and nothing else. *Test:* in a non-compliance year the interest must lose
exempt current pension income for the **whole income year** while the transfer balance account is adjusted
only from the end of the 60 days. The two dates deliberately differ; a test asserting they are the same is
asserting the bug.

**CT77 — Treating "no election" as "no correction".**
s 136-10(6)–(7) put the default commutation notice in the determination at the outset, and s 136-55(4) makes
it mandatory on silence. *Test:* a member who does nothing for 60 days must still be commuted, on the
default notice's streams.

**CT78 — Treating a partial election as a ceiling.**
s 136-55(3): a short election is topped up with default-notice authorities. *Test:* an election covering
$50,000 of a $200,000 commutable amount must produce authorities totalling $200,000.

**CT79 — Letting the total of reduction amounts exceed the commutable amount.**
s 136-55(6) and s 136-65(4) both cap it. *Test:* a second round under s 136-65 must be capped at the
commutable amount less lump sums notified under s 136-85 and less item 5 debits already arisen.

**CT80 — Running the provider's 60 days from the determination.**
s 136-80(1): *"within 60 days after the **commutation authority** is issued"*, and s 136-20(4)'s 60 days runs
from the **determination**. Two separate 60-day clocks, in series, with an unbounded Commissioner gap
between them. *Test:* the earliest possible correction is ≥120 days after the determination, never 60.

**CT81 — Assuming the provider must always comply.**
s 136-80(2) (capped defined benefit) and (3) (recipient has died) are both *"may choose not to comply"*, and
limb (1)(b) caps the payment at the maximum available release amount. *Test:* a capped defined benefit
stream must not be assumed commutable.

**CT82 — Opening the s 136-70 valve without a determination.**
s 136-70(1) opens with *"at the end of a day **after the Commissioner has issued an \*excess transfer
balance determination** to you"*. *Test:* an uncorrectable excess with no determination gets **no** item 7
debit and keeps accruing tax.

**CT83 — Sizing the item 7 debit at the crystallised reduction amount.**
Item 7 is *"the amount of the \*excess transfer balance **stated in the notice**"* — the excess **now**, not
the crystallised amount from the determination. Those differ by every debit and every day's compounding
since. *Test:* the two must be independently sourced.

**CT84 — Remitting accrued tax when the item 7 debit lands.**
The debit ends the excess transfer balance period prospectively. Nothing remits tax already accrued.
*Test:* tax for the days before the notice survives.

**CT85 — Forgetting that one end-of-day excess permanently kills proportional indexation.**
s 294-40(1)(b): *"at no time **before the start of that financial year** has the \*transfer balance … at the
end of a day exceeded your transfer balance cap"*. *Test:* a one-dollar, one-day excess in FY2027-28 must
freeze the personal cap for **every** later year in the projection, even after the excess is fully corrected.
This is the largest money consequence in the cluster and the easiest to omit.

---

## C-OPEN-ITEMS

**CO40 — The GIC base interest rate is a quarterly CONFIG with no home in the register.**
Register §7 (*The constants*) has no slot for a quarterly-moving rate, and §3's config rows are FY-keyed.
Decide the shape: a `quarter → baseInterestRate` map keyed `2026-Q3` etc., with the s 8AAD(1) `+7` and the
days-in-calendar-year divisor as **structural constants** beside it. Refresh cadence: quarterly, roughly
two weeks before each quarter starts (per the ATO page). This is the first quarterly-cadence item in the
register; §4.10 covers Age Pension's twice-yearly cadence and is the nearest precedent.

**CO41 — Subdivision 295-F was never retrieved.** §3.1 cites ss 295-385 and 295-390 for the 0% rate and
`src/core/superPhase.ts` consumes it, but neither section has been read in this project. CU11 and the
whole of §C.4's right-hand column depend on it. It is also the provision the mid-year phase change refusal
in `superPhase.ts` (`MidYearPhaseChangeError`) is refusing on behalf of.

**CO42 — TAA Sch 1 Div 155 was never retrieved.** It supplies the assessment machinery that s 294-240's due
date hangs off (CU14) and the amendment periods that bound how far back a breach can be assessed.

**CO43 — Capped defined benefit income streams are unmodelled and appear in four places in this cluster**
(s 136-70(1)(c)(i), s 136-80(2), s 294-25 Note 1 "modified for certain capped defined benefit income
streams: see Subdivision 294-D", s 294-30(1) Note). Subdivision 294-D was not retrieved. Whether the
forecaster ever needs it depends on whether the household has a defined benefit pension — decide
explicitly, and if the answer is "not modelled", make declaring one a refusal rather than a silent
treatment as an account-based pension.

**CO44 — Child recipients (Subdivision 294-E) were not retrieved**, though s 294-35(1) Note names them as a
cap modification. Out of scope for a two-adult household forecaster; record the scope decision rather than
leaving the Note dangling.

**CO45 — `*value` of a superannuation interest, and F2024L01023.** CU13. Needed before the item 5 debit or
the s 294-25 item 1/2 credits can be sized for anything other than a plain account-based pension.

**CO46 — `src/core/superPhase.ts`'s `UNCAPPED_ENTRY` caveat text will need updating** once §3.10 lands. It
currently reads *"the transfer balance cap that limits how much capital may enter Retirement Phase is not
modelled (P3-9) — no amount here has been checked against it"*. If the design recommendation is accepted,
that caveat is replaced by an actual check and a refusal; if it is rejected, the caveat must at minimum
name the 15%-versus-0% direction of the error (§C.7). Do not leave it saying "not modelled" once it is.

---

## C-DESIGN-RECOMMENDATION

> **Decision: the forecaster must REFUSE to project a plan in which a Person's transfer balance exceeds
> their transfer balance cap at the end of any day. Not a warning, not a silently-modelled tax — a named
> refusal, thrown at the point the excess would arise, in the idiom of `TrisRetirementPhaseNotModelledError`
> and `MidYearPhaseChangeError` in `src/core/superPhase.ts`. Excess transfer balance tax is therefore NOT
> implemented; the excess machinery is implemented only as the detector that fires the refusal.**

**The argument.**

*1. A breach in a projection is a modelling artefact, not a plan.* Nobody's retirement plan is "exceed the
cap and pay the tax". The overwhelmingly likely cause of an excess appearing in a forecast is that the user
declared more capital as retirement-phase than they have cap for — exactly the input error
`src/core/superPhase.ts` already names in `UNCAPPED_ENTRY`: *"the interest is in Retirement Phase because it
was stated to be"*. The right response to an impossible input is to reject the input, not to price it.

*2. The tax is trivially small and the real consequence is not modellable cheaply.* §C.1.3: a $200,000
excess for 90 days costs **$857**. Meanwhile s 294-40(1)(b) (§C.6) permanently destroys proportional cap
indexation for the rest of the person's life, and — if the correction runs — commutes capital from a 0%
environment to a 15% one for the rest of the projection (§C.7, and CU12 says we do not even know where the
money lands). **Modelling "the tax" and calling the breach handled is the flattering error**: it books an
$857 cost against a consequence worth six figures. The project exists to prevent confident over-statement,
and this is precisely the shape of over-statement it exists to prevent.

*3. "Warn and continue" is not a safe middle.* Continuing requires deciding what happens next — does the
excess sit there compounding? does a correction fire? where does the commuted capital go? Every one of those
answers is currently `unverified` (CU12, CU13) and the *default* answer an implementer would reach for —
leave the money in retirement phase at 0% and add a small tax — is the one that flatters by 15% of earnings
on the excess, compounding, forever. A warning the user scrolls past sits on top of a projection that is
still wrong in the flattering direction. **There is no version of "warn and continue" that is conservative
without first closing CU12 and building the accumulation-phase flow.**

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
pointing at Subdivision 294-D and CO43, not a silent gap.

---

## C-REGISTER-EDITS

**Proposed for `docs/assumptions-register.md`, new §3.10, immediately after §3.9. Drafted, not applied.**
Trap and open-item numbers assume T57 and O39 are the current maxima; renumber on application.

---

<details><summary>Draft §3.10</summary>

### 3.10 The transfer balance cap — excess, its tax, and why the model refuses it

**Added 2026-09-09** by `docs/research/p3-transfer-balance-cap.md` (register open item **P3-9**), read
off the ATO Legal Database (ITAA 1997 `PAC/19970038`, TAA 1953 `PAC/19530001`) and the Federal Register
of Legislation (`C2016A00080`). §3.1 carries the general cap; **this section carries what happens when it
is exceeded, and the decision not to model it.**

**The decision first, because it governs everything below.** *The projection engine REFUSES to project any
year in which a Person's transfer balance exceeds their transfer balance cap at the end of a day.* Excess
transfer balance tax is **not implemented**. The rows below exist so that the refusal is testable, so that
the numbers are on the record if the decision is ever reversed, and because **one** of them — the permanent
loss of proportional indexation — must be implemented regardless.

#### Why refusal rather than modelling the tax

An excess in a forecast is almost always a **modelling artefact** — a user declaring more capital as
retirement phase than their cap allows — not a plan a household intends. And the tax is the *small* part of
a breach:

| Consequence of a $200,000 excess held for 90 days | Amount |
|---|---|
| Excess transfer balance tax at 15% | **$857** |
| Permanent loss of proportional cap indexation, s 294-40(1)(b) | **every future indexation step on the personal cap, for life** |
| Capital forced from 0% ECPI to 15% accumulation on correction | **15% of earnings on the commuted capital, every year, forever** |

Modelling the $857 and not the other two rows is the **flattering** error — the shape of over-statement this
project exists to prevent. See §3.10 traps T58–T85 and the design argument in the research file.

#### The excess itself — how it would be computed if it ever were

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Excess transfer balance | `transfer balance at a time − transfer balance cap at that time`, where transfer balance = Σ credits − Σ debits. **A negative transfer balance has NO consequence** | — | **constant** — structural | [ITAA 1997 s 294-30](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-30) | 2026-09-09 | primary-verified |
| Measurement point | **the end of a day**, every day. Not an average, not an opening balance | — | **constant** — structural | ITAA 1997 ss 294-30(1), 294-235(1), 294-230(2) | 2026-09-09 | primary-verified |
| Excess transfer balance period | *"a continuous period of one or more days during which, **at the end of each day**, there is excess transfer balance"*. **A single compliant day breaks it into two periods** | — | **constant** — structural | [ITAA 1997 s 294-230(2)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-230) | 2026-09-09 | primary-verified |
| Excess transfer balance earnings, per day | `rate × excess at the end of that day` | — | **constant** — structural | [ITAA 1997 s 294-235(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-235) | 2026-09-09 | primary-verified |
| **The excess COMPOUNDS DAILY** | each day's earnings are credited back into the account **at the start of the next day**, so over N days at one rate: `notional earnings = E × ((1+r)^N − 1)`. **Not simple interest** | — | **constant** — structural | [ITAA 1997 s 294-25(1) table item 3](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-25) | 2026-09-09 | primary-verified |
| The rate | **the LOWER of** (a) the s 8AAD(1) GIC **daily** rate and (b) a rate the Minister may determine by legislative instrument under s 294-235(3). **No such instrument was found**, so limb (b) is treated as inert | — | **constant** — structural | ITAA 1997 s 294-235(2)–(3) · FRL title search 2026-09-09 | 2026-09-09 | primary-verified as to the text; **limb (b)'s inertness is an argument from the absence of an instrument, on a title-name search only**. O-new (CU9) |
| **GIC daily rate — the formula** | `(base interest rate + 7 percentage points) ÷ the number of days in the CALENDAR year`. The `+7` and the divisor are structural; **only the base rate is rounded** (to 2 dp, ties up) | — | **constant** — structural | [TAA 1953 s 8AAD(1), (4)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19530001%2F8AAD) | 2026-09-09 | primary-verified |
| **Base interest rate** | the RBA monthly average yield of 90-day Bank Accepted Bills, **on a calendar-quarter cycle** with a lagged reference month: Jan–Mar ← preceding Nov · Apr–Jun ← preceding Feb · Jul–Sep ← preceding May · Oct–Dec ← preceding Aug | quarterly | **CONFIG — quarterly-keyed, the only quarterly config in this register** | TAA 1953 s 8AAD(2)–(4) | 2026-09-09 | primary-verified |
| GIC annual rate (= base + 7), **Jul–Sep 2026** | **11.43%** → daily `0.11430 ÷ 365 = 0.000313150684931507` | 2026-27 Q1 | config | ATO, *General interest charge (GIC) rates* (page updated 4 Sep 2026) | 2026-09-09 | **secondary-only** — the Commissioner publishing his own s 8AAD calculation; the RBA series was not retrieved |
| GIC annual rate, **Oct–Dec 2026** | **11.51%** → daily `0.000315342465753425` | 2026-27 Q2 | config | ATO, *General interest charge (GIC) rates* | 2026-09-09 | secondary-only |
| **Do NOT use s 8AAD(1A)** | the **Division 296** GIC rate is `base + 3`, inserted 1 Apr 2026 by No 8 of 2026 Sch 1 item 67. s 294-235(2)(a) cites **subsection 8AAD(1)** by number | — | **constant** — structural | TAA 1953 s 8AAD(1A) | 2026-09-09 | primary-verified. **T-new** |
| The determination period | once an excess transfer balance determination issues, s 294-25(2) **switches the item 3 credit OFF**, and s 294-230(3)(b) substitutes `r² × E × D(D−1)/2` on top of `D × r × E`. **A second formula, close to but not equal to compounding.** The period ends on the first day cumulative debits reach the crystallised reduction amount, **or earlier on the day any credit arises** | — | **constant** — structural | ITAA 1997 ss 294-25(2), 294-230(3)(b) | 2026-09-09 | primary-verified |

**Worked example, for a test fixture.** $200,000 excess, 90 days, entirely within Jul–Sep 2026 (11.43%),
no determination, no debits: `200,000 × ((1.000313150684931507)^90 − 1) = $5,715.99` of notional earnings;
tax at 15% = **$857.40**, at 30% = **$1,714.80**. Simple interest gives $5,636.71 (wrong, −1.39%). The same
90 days beginning 1 August 2026 crosses into the 11.51% quarter and gives $5,729.06. Run entirely as a
determination period it gives $5,715.26.

#### The tax rates — FROZEN, and the "subsequent breach" test

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| Excess transfer balance tax — first breach | **15% of notional earnings** for the period | — | **constant — never indexed** | [*Superannuation (Excess Transfer Balance Tax) Imposition Act 2016* s 5(1)(b)](https://www.legislation.gov.au/C2016A00080) | 2026-09-09 | primary-verified. Frozen: the whole Act is six sections, contains no indexation provision, **has never been amended since assent on 29 Nov 2016**, and **is absent from the ITAA 1997 s 960-265 indexation table** (which lists the general transfer balance cap at item 10A but nothing for this tax) |
| Excess transfer balance tax — subsequent breach | **30% of notional earnings** for the period | — | **constant — never indexed** | Imposition Act s 5(1)(a), (2) | 2026-09-09 | primary-verified, same reasoning |
| **What makes a breach "subsequent"** | **BOTH**: (a) the current period **starts on or after 1 July 2018**; **AND** (b) the person **has previously been liable** for a period that **also started on or after 1 July 2018**. Not "the second breach ever" — the date appears twice. **Liability, not a determination or an assessment**: s 136-10(1) Note confirms liability arises with no determination | — | **constant** — structural | Imposition Act s 5(2) · TAA 1953 Sch 1 s 136-10(1) Note | 2026-09-09 | primary-verified |
| Notional earnings | *"the sum worked out under subsection 294-230(3)"* — i.e. limb (a) plus limb (b), **not the excess** | — | **constant** — structural | Imposition Act s 3 | 2026-09-09 | primary-verified |
| Who is liable | **the individual, personally** — *"**you** are liable to pay"*. Not the fund | — | **constant** — structural | [ITAA 1997 s 294-230(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-230) | 2026-09-09 | primary-verified |
| When it is payable | **21 days after the Commissioner gives notice of the assessment** (or of an amended assessment). **The assessment date is not fixed by statute**, so the accrual year and the cash year are not the same variable | — | **constant** — structural | [ITAA 1997 ss 294-240](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-240), [294-245](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-245), [294-250](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-250) (GIC on late payment) | 2026-09-09 | primary-verified |
| **It CANNOT be paid from superannuation** | TAA 1953 Sch 1 s 131-5(1) lists the five liabilities that permit a release request — excess concessional, excess non-concessional, **Div 293**, **Div 296**, FHSS. **Excess transfer balance tax is not among them.** Unlike Div 293 and Div 296 (§3.6, §3.7), this is an outside-super cash outflow | — | **constant** — structural | [TAA 1953 Sch 1 s 131-5(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19530001%2FSch1-131-5) | 2026-09-09 | **primary-verified as to the list; the conclusion is an argument from the ABSENCE of a paragraph in a closed list.** O-new (CU10) |

#### The correction machinery — MUST vs MAY

*(Insert the §C.3.1 table from the research file verbatim, with its s 136-10 / 136-15 / 136-20 / 136-25 /
136-55 / 136-60 / 136-65 / 136-70 / 136-80 / 136-85 / 136-90 links. Every section: inserted by No 81 of 2016
Sch 1 item 15, effective 1 Jan 2017, applicable on and after 1 Jul 2017; **none amended since**.)*

Four things the register must state in prose because the table does not carry them:

1. **Issuing a determination is a `may`; the tax accrues regardless.** *"You are still liable to pay excess
   transfer balance tax if no determination is issued"* (s 136-10(1) Note).
2. **Doing nothing is not an escape.** The determination **must** carry a *default commutation notice*
   naming the streams to be cut (s 136-10(6)–(7)), and on silence for 60 days the Commissioner **must**
   issue authorities to every provider in it (s 136-55(4)). A *partial* election is topped up from the
   default notice, not treated as a ceiling (s 136-55(3)). An election is **irrevocable** (s 136-20(5)).
3. **Two 60-day clocks in series, with unbounded gaps.** 60 days for the member to elect, from the
   determination (s 136-20(4)); then 60 days for the provider, from the **commutation authority**
   (s 136-80(1)). Nothing bounds the Commissioner's own timing at either end.
4. **The provider may lawfully refuse** where the stream is a capped defined benefit income stream
   (s 136-80(2)) or the recipient has died (s 136-80(3)), and pays only the **lesser of** the reduction
   amount and the *maximum available release amount* — *"the total amount of all the superannuation lump
   sums that could be payable from the interest at that time"* (TAA 1953 Sch 1 s 131-45).

#### Provider non-compliance — the two-sided asymmetry

| | Transfer balance account | Fund earnings tax exemption |
|---|---|---|
| Provision | s 294-80(1) **item 5**, via **s 294-50(3)** | **s 307-80(4)**, unmodified |
| Effective from | **the end of the 60-day period** | **the start of the income year** in which the 60 days ended |
| Retrospective? | **No** — s 294-50(3) disregards s 307-80(4) at every time before the end of the 60 days | **Yes — the whole income year** |
| Amount | the **\*value of the whole supporting interest**, not the reduction amount | the whole year's earnings lose ECPI |

s 294-50(1) is what creates the asymmetry, and its words are the test: subsections (2) and (3) apply *"for
the purposes of working out the following matters: (a) whether you have a \*transfer balance account; (b)
the \*transfer balance in your transfer balance account"* — **and nothing else**. `primary-verified` as to
the scoping words; that Subdiv 295-F contains no competing softener is **unverified** (O-new, CU11 / CO41).

#### The safety valve — s 136-70 and the item 7 debit

The Commissioner **must** notify a *non-commutable excess transfer balance* if, **after a determination**:
debits since the determination fall short of the crystallised reduction amount; excess still exists at the
end of a day; and **either** the only remaining retirement-phase streams are capped defined benefit income
streams **or** the person is no longer a retirement phase recipient of any stream (s 136-70(1)). The notice
**must state the amount** (s 136-70(2)), and **that amount** is debited under s 294-80(1) item 7 at the
moment of issue — taking the excess to exactly nil, ending the excess transfer balance period, and stopping
the tax **prospectively only**. Tax already accrued is not remitted. **The valve cannot open without a
determination, which is a `may`.**

#### The consequence that must be implemented even though the tax is not

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **Permanent loss of proportional cap indexation** | s 294-40(1)(b) requires that *"**at no time before the start of that financial year** has the \*transfer balance in your transfer balance account **at the end of a day** exceeded your transfer balance cap"*. **One end-of-day excess, of any size, at any time, permanently disqualifies the person from every future indexation increase to their personal cap.** Correcting the excess does not restore it. It is a bare boolean over the person's entire history | — | **constant** — structural | [ITAA 1997 s 294-40(1)(b)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-40) | 2026-09-09 | primary-verified |

**Therefore, and despite the refusal:** the Person record must carry **`transferBalanceHasEverExceededCap: boolean`**,
sourced from the household's actual history, and when true the personal cap must be held flat for every
projected year. The refusal prevents new breaches inside the projection; it does not undo one that already
happened outside it. Without this field the model quietly restores an indexation entitlement the law has
already removed — which is over-statement, in the flattering direction.

</details>

**Additions to §1 (Traps)** — the full list is C-TRAPS above; the ones that belong in the register's own
trap table, as the highest-value five: T58 (tax the earnings, not the excess), T59 (daily compounding, not
simple interest), T62 (s 8AAD(1), not the Div 296 s 8AAD(1A) rate), T76 (s 294-50(3) reaches the transfer
balance account and **not** the earnings tax exemption), T85 (one end-of-day excess kills proportional
indexation permanently).

**Additions to §8 (What is still open)** — CO40 through CO46 above, renumbered from O40.

**Additions to §9 (Proposed mutation tests)** — every C-TRAP is written as a fixture with a named expected
value; the six with hard numbers ($857.40 / $5,715.99 / $5,636.71 / $5,729.06 / $5,715.26 / $2.3m item 5
debit) should go in first.

**Addition to §7 (The constants)** — `excessTransferBalanceTaxRateFirst: 0.15`, `excessTransferBalanceTaxRateSubsequent: 0.30`,
both `kind: 'constant'`, both cited to the Imposition Act s 5 and to the **absence** of an s 960-265 entry.
`gicAdditionalPercentagePoints: 7` as a structural constant, distinct from any Div 296 `3`.

**Addition to §10 (Source index)** — the eleven Division 136 sections, ITAA 1997 ss 294-50, 294-230, 294-235,
294-240, 294-245, 294-250, 960-265, TAA 1953 s 8AAD and Sch 1 ss 131-5, 131-45, the Imposition Act
`C2016A00080`, and the ATO GIC rates page.

---

## FETCH LOG

All fetches 2026-09-09, via `curl` with a browser User-Agent (`Mozilla/5.0 (Macintosh; …) Chrome/126.0`).
`WebFetch` was not used (403 on `www.ato.gov.au`, per the brief).

### ITAA 1997 — `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F<section>`

| Section | HTTP | Result |
|---|---|---|
| `294-50` | 200 | **SUCCESS** — full text of ss 294-50(1), (2), (3) **plus** the superseded pre-2017 section, which the research file did not carry. Substituted by No 55 of 2017 Sch 1 item 5, eff 1 Jul 2017; originally inserted by No 81 of 2016 Sch 1 item 4. |
| `294-230` | 200 | **SUCCESS** — s 294-230(1)–(3) confirmed word-for-word against the text already in the research file. |
| `294-235` | 200 | **SUCCESS** — s 294-235(1)–(3) confirmed word-for-word. |
| `294-225` | 200 | **SUCCESS** — Subdivision 294-F's *What this Subdivision is about* **and its table of sections**, which revealed ss 294-240, 294-245, 294-250 that the research file had not reached. |
| `294-240` | 200 | **SUCCESS** — *When tax is payable — original assessments.* 21 days after notice of assessment. |
| `294-245` | 200 | **SUCCESS** — *When tax is payable — amended assessments.* |
| `294-250` | 200 | **SUCCESS** — *General interest charge* on unpaid assessed tax. |
| `960-265` | 200 | **SUCCESS** — the full indexation table. Item **10A** = general transfer balance cap → s 294-35. **No item for excess transfer balance tax.** |
| `995-1` | 200 | **SUCCESS** — dictionary; located *maximum available release amount* → TAA 1953 Sch 1 s 131-45 (substituted for the former reference by No 81 of 2016 Sch 10 item 26). |
| `307-5`, `307-15`, `307-125`, `307-80` | 200 | **SUCCESS** (fetched only to grep for *maximum available release amount*; no hit — the term is not in Div 307). |

### TAA 1953 — `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19530001%2F<section>`

| Section | HTTP | Result |
|---|---|---|
| `8AAD` | 200 | **SUCCESS** — s 8AAD(1), (1A), (2) incl. the quarter/reference-month table, (3), (4). Confirms s 8AAD(1A) inserted by **No 8 of 2026 Sch 1 item 67, effective 1 April 2026**. |
| `8AAD-1` | **404** | **FAILURE** — subsection-level DocIDs are not addressable for this Act; the whole-section DocID carries every subsection anyway. Recorded so nobody retries it. |

### TAA 1953 Schedule 1 — `…DocID=PAC%2F19530001%2FSch1-<section>` (the `Sch1-` prefix is required)

| Section | HTTP | Result |
|---|---|---|
| `Sch1-136-5` | 200 | **SUCCESS** — Subdiv 136-A *What this Subdivision is about* + table of sections (136-10, 136-15, 136-20, 136-25 only). |
| `Sch1-136-10` | 200 | **SUCCESS** — full text incl. **(5) prima facie evidence, (6) the mandatory default commutation notice and its three specified contents, (7) the definition** — none of which was in the research file. |
| `Sch1-136-15` | 200 | **SUCCESS** — *Review.* Part IVC objection; **the default commutation notice does not form part of the taxation decision**. Not previously captured. |
| `Sch1-136-20` | 200 | **SUCCESS** — full text incl. (1)(b) the "2 or more streams" gate, (3) the identification requirements, (4)(b)(ii) "a further period allowed by the Commissioner", (5) irrevocability. |
| `Sch1-136-25` | 200 | **SUCCESS** — *Notifying Commissioner of transfer balance debits*, incl. the window: from the determination to the earlier of the election and the end of the election period. Not previously captured. |
| `Sch1-136-50` | 200 | **SUCCESS** — Subdiv 136-B *What this Subdivision is about* + table of sections (136-55, 136-60, 136-65, 136-70, 136-80, 136-85, 136-90). |
| `Sch1-136-55` | 200 | **SUCCESS** — full text, all six subsections, incl. **(3) the top-up rule for a short election** and (5) the four content requirements. |
| `Sch1-136-60` | 200 | **SUCCESS** — *Varying and revoking a commutation authority.* Not previously captured. |
| `Sch1-136-65` | 200 | **SUCCESS** — *Issuing further commutation authorities* after a shortfall or non-compliance, incl. the (4) cap. Not previously captured. |
| `Sch1-136-70` | 200 | **SUCCESS** — full text of (1)(a)–(c) and (2). |
| `Sch1-136-80` | 200 | **SUCCESS** — full text of (1)–(3). |
| `Sch1-136-85` | 200 | **SUCCESS** — provider must notify the Commissioner within 60 days, approved form; s 286-75 penalty. Not previously captured. |
| `Sch1-136-90` | 200 | **SUCCESS** — provider must notify **you** within 60 days. Not previously captured. |
| `Sch1-136-28`, `-136-30`, `-136-35`, `-136-40`, `-136-45`, `-136-75` | **404** | **FAILURE — and these are TRUE absences, not fetch errors.** The two subdivision tables of sections (136-5, 136-50) independently confirm Division 136 has exactly the eleven sections listed above. |
| `Sch1-131-5` | 200 | **SUCCESS** — the five paragraphs (a), (b), (c), (ca), (d) of the release-request trigger list. Excess transfer balance tax absent. |
| `Sch1-131-45` | 200 | **SUCCESS** — *maximum available release amount*, one sentence, in full. |
| `Sch1-131-15` | 200 | fetched while hunting the MARA definition; no hit. |
| `Sch1-96-10`, `Sch1-96-15` | **404** | **FAILURE** — speculative probes for the MARA definition; the term is in Div 131, not Div 96. |
| `Sch1-155-5`, `Sch1-155-15`, `Sch1-155-25` | 200 | fetched but **NOT read** — Div 155 (assessments) is left open as **CO42**. |

### Federal Register of Legislation — `https://api.prod.legislation.gov.au/v1/titles`

| Query | HTTP | Result |
|---|---|---|
| `$filter=contains(name,'Excess Transfer Balance')&$select=id,name,collection,inForce` | **400** | **FAILURE** — *"Could not find a property named 'inForce' on type 'Default.Title'."* Recorded: `inForce` is not a selectable property on `Titles`. |
| `$filter=contains(name,'Excess Transfer Balance')&$select=id,name,collection` | 200 | **SUCCESS** — count 1: `C2016A00080` *Superannuation (Excess Transfer Balance Tax) Imposition Act 2016*, collection `Act`. |
| `$filter=contains(name,'Excess Transfer')` | 200 | **SUCCESS** — count 1, same single result. |
| `$filter=contains(name,'Transfer Balance Cap')` | 200 | **SUCCESS** — count **0**. |
| `$filter=contains(name,'Transfer Balance')` | 200 | **SUCCESS** — count 3: `F2024L01023` *Income Tax Assessment Amendment (Transfer Balance Account Value for Certain Superannuation Income Streams) Regulations 2024*; `F2017L01273` *Reporting of event based transfer balance account information…*; `C2016A00080`. **No s 294-235(3) rate determination.** Basis for CU9's argument from absence, and the source of CO45's F2024L01023 lead. |

### ATO published rates

| URL | HTTP | Result |
|---|---|---|
| `https://www.ato.gov.au/tax-rates-and-codes/interest-rates-general-interest-charge-and-shortfall-interest-charge` | **404** | **FAILURE** — guessed path; does not exist. |
| `https://www.ato.gov.au/rates/general-interest-charge-(gic)-rates/` | 200 | **SUCCESS** — page last updated **4 September 2026**. Quarterly GIC annual and daily rates back to 2019, incl. **Jul–Sep 2026 = 11.43%** and **Oct–Dec 2026 = 11.51%**, and the statement *"Section 8AAD … specifies how the rate of the charge is calculated. To work out the daily rate, divide this rate by the number of days in a calendar year."* |

### Not fetched — recorded so the gap is visible

ITAA 1997 Subdivision **295-F** (ss 295-385, 295-390 — the earnings tax exemption itself) → **CO41 / CU11**.
ITAA 1997 Subdivision **294-D** (capped defined benefit income streams) → **CO43**.
ITAA 1997 Subdivision **294-E** (child recipients) → **CO44**.
TAA 1953 Sch 1 Division **155** (assessments) — pages retrieved, not read → **CO42 / CU14**.
`F2024L01023` (transfer balance account **value**) and the s 995-1 definition of `*value` → **CO45 / CU13**.
SIS Regulations Part 6 cashing rules, for where a commutation lump sum may go → **CU12**.
