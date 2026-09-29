# P3-25 — Exempt current pension income and mid-year apportionment: ITAA 1997 Subdivision 295-F

**Scope:** register open item **O60 / U30** (mid-year ECPI apportionment) and **O52** (Subdivision
295-F never retrieved). ITAA 1997 Subdiv 295-F and the definitions it depends on. Not Div 294 (that
is P3-9), not Div 296, not Div 293, not franking beyond the point where s 207-110 touches ECPI.
**Retrieval date:** 2026-09-10 · **Forecast year:** FY2026-27

> **STATUS: RESEARCH COMPLETE — NOT A FINISHED SPECIFICATION. One decision is put to the user and
> is not taken here.**
>
> **What this document is.** The evidence record for **P3-25**. It carries, in order: the
> **verbatim primary text** of every provision relied on, captured before any analysis (§1); the
> analysis (§2–§6); two **hand-worked examples with real dollar figures** intended as test
> fixtures (§5); the **fetch log**, successes and failures, with true absences separated from
> malformed requests (§7); **proposed register rows** for a new **§3.11**, drafted and **not
> applied** (§8); and the **corrections owed** to existing artefacts (§9).
>
> **Nothing here is written from memory.** Every quoted provision in §1 was fetched by this pass on
> **2026-09-10** and every fetch is logged in §7. **27 fetches succeeded, 28 distinct URLs failed**, and one further URL returned HTTP 200 with an SPA shell instead of the document.
>
> **ID ranges defined here: T126–T134, O67–O71, U34–U37.** These **extend** the sequences already
> running in `docs/assumptions-register.md` (which stop at T125, O66, U33). Do not renumber.
>
> **Nothing under `src/` or `test/` was changed by this pass**, and neither was
> `docs/assumptions-register.md` or `TODO.md`. §9 is the list a later agent must apply.
>
> **The one open decision** is §6: whether `MidYearPhaseChangeError` is lifted, narrowed or stands.
> §6 gives a **recommendation with its reasoning**, in the shape R1/R5/R9 are written in. The user
> rules.

---

## 0. The headline, before the evidence

Four things this pass found that the register currently states the opposite of, or does not state:

1. **s 295-390 is fetchable, was fetchable all along, and had in fact already been fetched** — by
   the **P1-11 franking pass on 2026-09-04**. §10's *Franking — P1-11* list is **right**; **O52 and
   O60 are wrong**, and have been for six days. See §6.6.
2. **The segregated method does not always require an actuary's certificate.** s 295-385(3)(b)
   requires one; **s 295-385(4)**, read with **reg 295-385.01** of the ITAR (1997 Act) 2021,
   provides a **second, certificate-free route** for allocated, market linked and **account-based**
   pensions — which is every pension a household SMSF is likely to pay. The register's
   *"s 295-385(3)(b) shows the segregated method needs an actuary's certificate — it is not an
   arithmetic split"* is **half the provision**.
3. **The proportionate method DOES always require an actuary's certificate.** s 295-390(4). Its one
   escape, s 295-390(7), is **inoperative — no regulation has ever been made for it**, confirmed
   against the complete ITAR (1997 Act) 2021 compilation (§7.3, true absence #1). So the register
   has the certificate attached to the wrong method.
4. **There is no days-based apportionment rule for a superannuation fund anywhere in Subdivision
   295-F.** There is one for an **RSA** — **s 295-410**, an express days formula — and Parliament
   wrote it for RSAs and not for funds. The fund answer is reached by two different mechanisms,
   neither of which is a day count, and they **give different numbers on the same facts** (§5.2).

---

## 1. RAW PRIMARY TEXT — captured first, analysed below

Source for every ITAA 1997 provision in this section: **ATO Legal Database**,
`https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F<section>`, retrieved
**2026-09-10** with `curl` and a browser User-Agent, HTTP 200 on every section quoted. The
Legal Database renders the Act's defined-term asterisks as separate glyphs; they are restored
inline below as `*term` and nothing else is altered. Emphasis in **bold** is this document's.

### 1.1 ITAA 1997 s 295-385 — *Income from assets set aside to meet current pension liabilities* — VERBATIM

> **295-385(1)** The \*ordinary income and \*statutory income of a \*complying superannuation fund
> **for an income year is exempt from income tax to the extent that**:
> (a) it would otherwise be assessable income; and
> (b) **it is from \*segregated current pension assets**.
>
> **Exception**
>
> **295-385(2)** Subsection (1) does not apply to:
> (a) \*non-arm's length income; or
> (b) amounts included in assessable income under Subdivision **295-C**.
>
> **Meaning of *segregated current pension assets***
>
> **295-385(3)** Assets of a \*complying superannuation fund are **segregated current pension
> assets at a time** if:
> (a) the assets are **invested, held in reserve or otherwise dealt with at that time solely** to
> enable the fund to discharge all or part of its liabilities (contingent or not) in respect of
> \*RP superannuation income stream benefits of the fund **at that time**; and
> (b) **the trustee of the fund obtains an \*actuary's certificate before the date for lodgment of
> the fund's \*income tax return for the income year** to the effect that the assets and the
> earnings that the actuary expects will be made from them would provide the amount required to
> discharge in full those liabilities, or that part of those liabilities, as they fall due.
>
> **295-385(4)** Assets of a \*complying superannuation fund are **also segregated current pension
> assets** of the fund at a time if the assets are invested, held in reserve or otherwise being
> dealt with at that time **for the sole purpose** of enabling the fund to discharge all or part of
> its liabilities (contingent or not), as they become due, in respect of \*superannuation income
> stream benefits:
> (a) that are \*RP superannuation income stream benefits of the fund at that time; and
> (b) **prescribed by the regulations** for the purposes of this section.
>
> **295-385(5)** Subsection (4) does not apply unless, **at all times during the income year**, the
> liabilities of the fund (contingent or not) to pay \*RP superannuation income stream benefits of
> the fund were liabilities in respect of superannuation income stream benefits that are prescribed
> by the regulations for the purposes of this section.
>
> **295-385(6)** However, assets of a \*complying superannuation fund that are supporting a
> \*superannuation income stream benefit that is prescribed by the regulations for the purposes of
> this section **are not segregated current pension assets to the extent that the \*market value of
> the assets exceeds the account balance supporting the benefit**.
>
> **295-385(7)** Also, **\*disregarded small fund assets are not segregated current pension
> assets**.
>
> **Meaning of *segregated current pension assets* — trustee choice**
>
> **295-385(8)** Despite subsections (3) to (6), **none of the assets** of a \*complying
> superannuation fund are segregated current pension assets of the fund **at any time in an income
> year** if the trustee of the fund **chooses under subsection (9)** to treat all of the assets as
> not being segregated current pension assets for the year.
>
> **295-385(9)** The trustee of a \*complying superannuation fund **may choose** to treat all of
> the assets of the fund as not being \*segregated current pension assets of the fund for an income
> year if, **at one or more times in the year, all \*superannuation interests in the fund are in the
> \*retirement phase**.
>
> **295-385(10)** Subsections (8) and (9) **do not apply** if:
> (a) **at all times in the year**, all \*superannuation interests in the fund are in the
> \*retirement phase; or
> (b) the assets of the fund are \*disregarded small fund assets at all times in the year.

**Amendment history, from the same page.** s 295-385 inserted by **No 9 of 2007** Sch 1 item 1,
applicable to 2007-08 and later. (6) inserted by No 143 of 2007 Sch 5 item 5. (3)(a), (4)(a) and
(5) amended by **No 81 of 2016** Sch 8 items 1–3 (substituting the *RP superannuation income stream
benefits* formulation), effective 1 January 2017, applicable **2017-18 and later**. **(7) inserted
by No 81 of 2016 Sch 8 item 4**, same commencement. **(8), (9) and (10) inserted by No 10 of 2022
Sch 5 item 1, effective 1 April 2022 and applicable in relation to the 2021-22 income year and
later income years.** **No amendment after 2022.**

### 1.2 ITAA 1997 s 295-387 — *Disregarded small fund assets* — VERBATIM

> **295-387(1)** The assets of a \*complying superannuation fund are **disregarded small fund
> assets at all times in an income year** if the fund is covered by subsection (2) for the income
> year.
>
> **295-387(2)** A \*complying superannuation fund is covered by this subsection for an income year
> if:
> (a) the fund is a \*small superannuation fund **at a time during** the income year; and
> (b) **at a time during** the income year, there is **at least one** \*superannuation interest in
> the fund that is in the \*retirement phase; and
> (c) **just before the start of the income year**:
>  (i) a person has a \*total superannuation balance that **exceeds $1.6 million**; and
>  (ii) the person **is the \*retirement phase recipient of a \*superannuation income stream**
>  (whether or not the fund is the \*superannuation income stream provider for the superannuation
>  income stream); and
> (d) at a time during the income year, the person has a superannuation interest in the fund
> (whether or not the superannuation interest is the superannuation interest mentioned in
> paragraph (b)).
>
> **295-387(3)** However, the fund is **not** covered by subsection (2) for an income year if, **at
> all times during the income year, all of the assets** of the superannuation fund would, apart
> from subsection 295-385(7), **be \*segregated current pension assets**.

**Amendment history, from the same page.** s 295-387 inserted by **No 81 of 2016** Sch 8 item 5,
effective 1 January 2017, applicable 2017-18 and later. (2)(a) substituted by No 47 of 2021 Sch 1
item 6 effective 1 July 2021 (formerly: an SMSF, or a fund with fewer than 5 members). (3) inserted
by **No 111 of 2021** Sch 3 item 1, effective 1 October 2021, applicable to assessments for 2021-22
and later.

### 1.3 ITAA 1997 s 295-390 — *Income from other assets used to meet current pension liabilities* — VERBATIM

> **295-390(1)** **A proportion** of the \*ordinary income and \*statutory income of a \*complying
> superannuation fund that would otherwise be assessable income **is exempt from income tax under
> this section**. The proportion is worked out under subsection (3).
>
> **Exception**
>
> **295-390(2)** Subsection (1) does not apply to:
> (a) \*non-arm's length income; or
> (b) amounts included in assessable income under Subdivision **295-C**; or
> (c) income \*derived from \*segregated non-current assets; or
> (d) **income that is exempt from income tax under section 295-385**.
>
> **Formula**
>
> **295-390(3)** The proportion is:
>
> ```
>              Average value of current pension liabilities
>             ---------------------------------------------
>              Average value of superannuation liabilities
> ```
>
> where:
>
> **average value of current pension liabilities** is **the average value for the income year** of
> the fund's **current** liabilities (contingent or not) in respect of \*RP superannuation income
> stream benefits of the fund **at any time in that year**. **This does not include liabilities for
> which \*segregated current pension assets are held.**
>
> **average value of superannuation liabilities** is **the average value for the income year** of
> the fund's **current and future** liabilities (contingent or not) in respect of \*superannuation
> benefits in respect of which contributions have, or were liable to have, been made. This does not
> include liabilities for which \*segregated current pension assets or \*segregated non-current
> assets are held.
>
> **Actuary's certificate**
>
> **295-390(4)** The value of particular liabilities of the fund at a particular time is the amount
> of the fund's assets, together with future contributions in respect of the benefits concerned and
> expected earnings on the assets and contributions after that time, that would provide the amount
> required to discharge those liabilities as they fall due. **This must be specified in an
> \*actuary's certificate obtained by the trustee of the fund before the date for lodgment of the
> fund's \*income tax return for the income year.**
>
> **295-390(5)** The expected earnings are worked out at the rate the actuary expects will be the
> rate of the fund's earnings on its assets (except \*segregated current pension assets or
> \*segregated non-current assets).
>
> **Superannuation liabilities where no current certificate**
>
> **295-390(6)** The superannuation liabilities do not have to be valued by an actuary for the
> income year **if the fund has no \*segregated current pension assets or \*segregated non-current
> assets for the income year**. Instead, the value can be worked out using this formula:
>
> ```
>     Last value of superannuation liabilities  ×  Current value of assets
>                                                  -----------------------
>                                                    Last value of assets
> ```
>
> where **current value of assets** is the value of all of the fund's assets at a time in the income
> year, **as specified in an \*actuary's certificate** obtained by the trustee of the fund before
> the date for lodgment of the fund's \*income tax return for the income year; **last value of
> assets** is the most recent value of all of the fund's assets specified in an \*actuary's
> certificate; **last value of superannuation liabilities** is the value, at the time of that most
> recent valuation, of the fund's superannuation liabilities specified in an \*actuary's
> certificate.
>
> **Note:** This allows a fund to avoid the expense of an actuarial valuation of its superannuation
> liabilities, except in those years that a valuation is required by the SIS Act in order for the
> fund to continue to be complying.
>
> **295-390(7)** Subsections (4), (5) and (6) **do not apply** in working out the amounts to be used
> in the formula in subsection (3) if, at all times during the income year, the liabilities of the
> fund in respect of \*RP superannuation income stream benefits of the fund at those times were
> liabilities in respect of superannuation income stream benefits that **are prescribed by the
> regulations for the purposes of this subsection**.

**Amendment history, from the same page.** s 295-390 inserted by **No 9 of 2007** Sch 1 item 1.
*average value of superannuation liabilities* amended by No 143 of 2007 Sch 5 item 43 (substituting
*superannuation benefits* for *superannuation income stream benefits*). *average value of current
pension liabilities* and (7) amended by **No 81 of 2016** Sch 8 items 6 and 7, effective 1 January
2017, applicable 2017-18 and later. **No amendment after 2016.**

### 1.4 ITAA 1997 s 295-395 — *Meaning of segregated non-current assets* — VERBATIM

> **295-395(1)** Assets of a \*complying superannuation fund are **segregated non-current assets**
> at a time in an income year if:
> (a) the assets are invested, held in reserve or otherwise dealt with at that time **solely** to
> enable the fund to discharge all or part of its current and future liabilities (contingent or not)
> to pay benefits in respect of which contributions have, or were liable to have, been made; and
> (b) **the trustee of the fund obtains an \*actuary's certificate** before the date for lodgment of
> the fund's \*income tax return for the income year to the effect that the amount of the assets,
> together with any future contributions, and the earnings that the actuary expects will be made
> from them will provide the amount required to discharge in full those liabilities, or that part of
> those liabilities, as they fall due.
>
> **295-395(2)** The liabilities referred to in paragraph (1)(a) **do not include** liabilities
> (contingent or not) in respect of \*RP superannuation income stream benefits of the fund at that
> time.
>
> **295-395(3)** However, **\*disregarded small fund assets are not segregated non-current assets**.

**Amendment history.** Inserted by No 9 of 2007 Sch 1 item 1. (2) amended and (3) inserted by
**No 81 of 2016** Sch 8 items 8 and 9, effective 1 January 2017, applicable 2017-18 and later.

### 1.5 ITAA 1997 s 295-400 — *Income of a PST attributable to current pension liabilities* — VERBATIM

> **295-400(1)** This proportion of the \*ordinary income and \*statutory income that would
> otherwise be assessable income of a \*pooled superannuation trust is \*exempt income:
>
> ```
>   Average number of units in the trust during the income year that are
>   *segregated current pension assets of unitholders that are
>   *complying superannuation funds
>   -----------------------------------------------------------------------
>   Average number of units in the trust during the income year
> ```
>
> **Exceptions**
>
> **295-400(2)** Subsection (1) does not apply to: (a) \*non-arm's length income; or (b) amounts
> included in assessable income under item 1 of the table in section 295-320.
>
> **Alternative exemption**
>
> **295-400(3)** However, the trustee of the \*pooled superannuation trust **can choose** that a
> different amount be \*exempt income of the trust under this section if a percentage of the
> assessable income of the trust would have been exempt income under section 295-385 or 295-390 if
> it had been \*derived instead by the unitholders in the trust in proportion to their holdings.
>
> **295-400(4)** That percentage of the trust's \*ordinary income and \*statutory income is then
> \*exempt income.

**Amendment history.** Inserted by No 9 of 2007 Sch 1 item 1. **Never amended.**

### 1.6 ITAA 1997 s 295-410 — *Amount credited to RSA* — VERBATIM

*Retrieved because it is the only express part-year apportionment in the Subdivision, and it is for
RSAs, not funds. It is the contrast that carries §3.4.*

> **295-410** For **item 3 of the table in section 295-405**, the part of the amount credited to the
> \*RSA that is \*exempt income is worked out by:
> (a) **multiplying the amount by the number of days in the income year for which the pension
> covered by section 295-407 was paid**; and
> (b) **dividing the result by the number of days in the income year that the RSA existed**.

And the table row it serves, from s 295-405 (verbatim, same fetch):

> | 2 | \*RSA provider | Amount credited to the \*RSA where a \*superannuation income stream covered by section 295-407 was paid from the RSA **for all of the period** in the income year that the RSA existed |
> | 3 | \*RSA provider | **Part** of an amount credited to the \*RSA (worked out under section 295-410) where a \*superannuation income stream covered by section 295-407 was paid from the RSA **for part of the period** in the income year that the RSA existed |

### 1.7 ITAA (1997 Act) Regulations 2021, reg 295-385.01 — VERBATIM

*Fetched twice, independently: from the ATO Legal Database (`REG/20210206/295-385.01`) and from the
Federal Register of Legislation authorised Word compilation of `F2021L00206` (Compilation No. 16,
compilation date **27 June 2026**, includes amendments up to `F2026L00831`). The two agree.*

> **295-385.01 Segregated current pension assets — prescribed superannuation income stream
> benefits**
>
> For the purposes of section 295-385 of the Act, the following superannuation income stream
> benefits are prescribed:
> (a) an RP superannuation income stream benefit of a superannuation fund payable from:
>  (i) **an allocated pension** within the meaning of the SIS Regulations; or
>  (ii) **a market linked pension** within the meaning of the SIS Regulations; or
>  (iii) **an account-based pension** within the meaning of the SIS Regulations;
> (b) a superannuation benefit payable, from a superannuation interest, in respect of a right
> mentioned in subsection 307-70.02(2) that is covered by subsection 307-70.02(3), if, immediately
> before the death mentioned in paragraph 307-70.02(2)(a), the superannuation interest supported a
> pension mentioned in subparagraph (a)(i), (ii) or (iii) of this section payable to the deceased
> mentioned in paragraph 307-70.02(2)(a);
> (c) a superannuation benefit payable from a superannuation interest that supports a new
> superannuation income stream in relation to which subsection 307-70.02(4) applies (as affected by
> subsection 307-70.02(5)), if the superannuation income stream payable to the deceased mentioned in
> paragraph 307-70.02(4)(a) was a pension mentioned in subparagraph (a)(i), (ii) or (iii) of this
> section.
>
> **Note 1:** Certain assets that enable a superannuation fund to discharge liabilities in respect of
> superannuation income stream benefits that are RP superannuation income stream benefits and are
> prescribed under this section are **segregated current pension assets** of the fund (see
> **subsection 295-385(4)** of the Act).
> **Note 2:** Section 307-205.02 does not apply to a superannuation income stream mentioned in
> paragraph (a) of this section (see paragraph 307-205.02(2)(a)).

**And the fact that matters more than the text.** The **entire** content of Subdivision 295-F of the
ITAR (1997 Act) 2021 is this one regulation. It runs from the heading *Subdivision 295-F — Exempt
income* to the heading *Subdivision 295-G — Deductions* with nothing between but reg 295-385.01.
See §7.3, true absence #1.

### 1.8 ITAA 1997 s 307-75 — *Meaning of retirement phase superannuation income stream benefit* — VERBATIM

> **307-75(1)** A \*superannuation income stream benefit is a **retirement phase superannuation
> income stream benefit** (or **RP superannuation income stream benefit**) of a \*superannuation
> fund **at a time** if it is payable by the fund at that time from a \*superannuation income stream
> that is **in the \*retirement phase at that time**.
>
> **307-75(2)** A \*superannuation income stream benefit is also a **retirement phase superannuation
> income stream benefit** … of a \*superannuation fund at a time if it is payable by the fund after
> that time from a \*superannuation income stream that: (a) is a \*deferred superannuation income
> stream; and (b) is in the \*retirement phase at that time.

*This is the hinge between Subdiv 295-F and s 307-80. s 307-80 is quoted verbatim in
`docs/research/p3-transfer-balance-cap.md` §D and is not re-quoted here; it was re-fetched by this
pass on 2026-09-10 (HTTP 200) and is byte-consistent with that quotation.*

### 1.9 ITAA 1997 s 995-1 definitions relied on — VERBATIM

> **actuary** means **a Fellow or Accredited Member of the Institute of Actuaries of Australia**.
>
> **small superannuation fund** means a \*complying superannuation fund with **no more than 6
> members**. *(amended by No 47 of 2021 Sch 1 item 9, substituting "no more than 6 members" for
> "4 or fewer members", effective 1 July 2021)*
>
> **segregated current pension assets** has the meaning given by **section 295-385**.

**A negative finding from the same fetch, and it disposes of a dependency rather than opening one.**
The Dictionary contains **no definition of "actuary's certificate"**. Searching the retrieved
s 995-1 document (5.2 MB) for `certificate` returns only *NRAS certificate*, *registered PGO
certificate* and *shipping exempt income certificate*. The asterisk in `*actuary's certificate`
therefore attaches to **actuary**, not to the compound: the statutory requirement is a certificate
given by a Fellow or Accredited Member of the Institute of Actuaries of Australia, and the Act
prescribes **no form, no content standard, no lodgment and no retention rule** for it. Confidence:
**primary-verified as to the definition of *actuary*; the absence of any "actuary's certificate"
definition is an argument from absence in an exhaustive alphabetical dictionary** — see U34.

### 1.10 ITAA 1997 s 960-265 — the indexation table — the AU-figures test

The register's test for whether an AU figure is config or a constant is whether it appears in the
s 960-265 table. s 960-265 was fetched by this pass (HTTP 200, 2026-09-10). Its opening words are
**"This table sets out the provisions for which indexation is relevant"**, and the complete table is
items 1, 2, 3, 3A, 5, 6, 7, 8, 9, 10, **10A** (general transfer balance cap, s 294-35), **10B**,
**10C** (Div 296 thresholds), 11, 12, 13, 13A, 14 — items 4 and 4A repealed.

**There is no item for s 295-387.** The **$1.6 million** in s 295-387(2)(c)(i) is therefore a
**frozen constant, not config** — see §8's proposed row and T126.

---

## 2. The two methods — what each is, and the certificate question (Q1)

### 2.1 They are not alternatives at the fund level; they are complementary

The instinctive model — "a fund picks segregated *or* proportionate" — is not what the Subdivision
says. **A fund can be on both at once**, and in the ordinary case it is on exactly one only because
its facts happen to put it there.

* **s 295-385 exempts income *from* particular assets.** It is asset-tracing. It operates "to the
  extent that" income "is from segregated current pension assets" (s 295-385(1)(b)), and assets are
  segregated current pension assets **"at a time"** (s 295-385(3), (4)). It is not a percentage and
  it is not annual: it is a question asked of each dollar of income, about the asset that produced
  it, at the moment it was produced.
* **s 295-390 exempts a proportion of the fund's income for the income year.** It is a single
  percentage applied to the whole year (s 295-390(1), (3)).
* **They are wired not to overlap.** s 295-390(2)(d) excludes from the proportionate exemption any
  income already exempt under s 295-385; and *average value of current pension liabilities* in
  s 295-390(3) expressly **"does not include liabilities for which segregated current pension assets
  are held"**. So a fund with a segregated pension pool and an unsegregated remainder applies
  s 295-385 to the pool and s 295-390 to what is left, with the segregated liabilities stripped out
  of both the numerator and the denominator of the s 295-390 fraction.

Confidence: **primary-verified.** Every step is on the face of ss 295-385(1), (3), (4) and
295-390(1), (2)(d), (3).

### 2.2 The actuary's certificate — the register has it attached to the wrong method

| | Certificate required? | Provision |
|---|---|---|
| Segregated, **s 295-385(3) route** | **Yes** — obtained before the return's lodgment date | s 295-385(3)(b) |
| Segregated, **s 295-385(4)+(5) route** (allocated / market linked / **account-based** pensions) | **No. The subsection does not mention one** | s 295-385(4), reg 295-385.01(a) |
| **Proportionate, s 295-390** | **Yes, always** — the liability values "must be specified in an actuary's certificate" | s 295-390(4) |
| s 295-390's escape from the certificate | **Dead letter** — no regulation has ever been made for s 295-390(7) | §7.3, true absence #1 |
| Segregated **non-current** assets (s 295-395) | **Yes** | s 295-395(1)(b) |

So the picture the register carries — *"s 295-385(3)(b) shows the segregated method needs an
actuary's certificate — it is not an arithmetic split"* — is **exactly backwards for a household
SMSF**. A two-member SMSF paying an **account-based pension** can be on the segregated method with
**no actuary involved at all**, and cannot be on the proportionate method **without one**.

This matters for question 4 and it is the single most consequential correction in this document:
the reason the tool cannot compute the proportionate figure is **not** that the segregated method is
gated by a certificate. It is that the **proportionate** method is, and that the certificate
supplies inputs (`average value of ... liabilities`) whose *averaging convention the Act does not
prescribe*.

Confidence: **primary-verified** as to each row, except the s 295-390(7) row, which is an
**argument from the absence of a regulation, verified exhaustively against the full compilation** —
see §7.3 and U35.

### 2.3 What "segregated" actually requires — and "deemed segregation"

s 295-385(3)(a) and (4) both turn on the assets being dealt with **"solely"** / **"for the sole
purpose"** of discharging RP liabilities. Nothing requires a *separate bank account, a separate
portfolio, or any act of formal designation*. The test is factual.

**The consequence, and it is the whole of the mid-year problem.** If, at a time, **every**
superannuation interest in the fund is in the retirement phase, then the fund has **no** non-RP
liabilities, so **all** of its assets are necessarily being dealt with solely to discharge RP
liabilities, and — where the pensions are account-based (reg 295-385.01(a)(iii)) — all of its assets
are **segregated current pension assets at that time under s 295-385(4)**, automatically, with no
certificate and no trustee act. This is what practitioners call **deemed segregation**.

Confidence: **an inference from the operative words applied to a fund with no other liabilities —
NOT bare `primary-verified`.** But the corroboration inside the statute is unusually strong and is
close to conclusive:

* **s 295-385(9)** gives the trustee a choice to opt *out* of segregation, available only "if, **at
  one or more times in the year, all superannuation interests in the fund are in the retirement
  phase**". A choice to opt out of a thing presupposes that the thing otherwise happens, and it is
  triggered by **precisely** the condition described above.
* **s 295-385(10)(a)** then removes that choice where "**at all times** in the year, all
  superannuation interests in the fund are in the retirement phase" — i.e. a fund that is 100%
  retirement phase for the whole year is left segregated with no way out. That only makes sense if
  such a fund is segregated in the first place.
* **s 295-387(3)** likewise contemplates a fund all of whose assets "would, apart from subsection
  295-385(7), be segregated current pension assets" **at all times during the income year**, without
  any act of segregation being mentioned.

Recorded as **T127**: an implementer who reads "segregated" as "the trustee chose to segregate" will
get the mid-year case wrong in the one direction that matters, because deemed segregation is *not
chosen* and arrives on the conversion day by itself.

### 2.4 s 295-385(6) — the cap that stops a segregated pool over-earning its exemption

Where the stream is a prescribed one (an ABP), assets are **not** segregated current pension assets
"to the extent that the market value of the assets exceeds the account balance supporting the
benefit". This is a real constraint on a fund that sets aside a lumpy asset (a property) to support
a smaller pension. Confidence: **primary-verified**. Not modelled — see §4.4.

---

## 3. Is the choice free? (Q2)

**No, and the register is right that it is not — but for none of the reasons the register gives.**
Here is what actually constrains it, in the order the constraints bite.

### 3.1 Disregarded small fund assets — the disqualifying-circumstances rule (s 295-387)

This is the forcing rule the task asks about, and it is the only one in the Subdivision that
**removes the segregated method outright**.

If a fund is covered by s 295-387(2), its assets are **disregarded small fund assets at all times in
the income year** (s 295-387(1)), and by ss 295-385(7) and 295-395(3) they can be **neither**
segregated current pension assets **nor** segregated non-current assets. The fund is on the
**proportionate method for the whole year**, with an actuary's certificate, and has no choice about
it — s 295-385(10)(b) also strips the (9) election.

The four conditions, all of which must hold (s 295-387(2)):

| Limb | Test | When tested |
|---|---|---|
| (a) | fund is a **small superannuation fund** — a complying fund with **no more than 6 members** (s 995-1) | at **a time during** the year |
| (b) | at least **one** superannuation interest in the fund is in the **retirement phase** | at **a time during** the year |
| (c)(i) | **a person** has a **total superannuation balance exceeding $1.6 million** | **just before the start of** the income year |
| (c)(ii) | **that same person** is a **retirement phase recipient of a superannuation income stream** — *in any fund, not necessarily this one* | **just before the start of** the income year |
| (d) | that person has a superannuation interest in the fund | at **a time during** the year |

**Three traps live in that table, and they are exactly the traps a two-person household hits.**

* **T126 — the $1.6 million is frozen, not the transfer balance cap.** It looks like the 2017-18 seed
  cap and it is not indexed with it. It is absent from the **s 960-265** table (§1.10); it is a
  literal in s 295-387(2)(c)(i) and has never been amended. Wiring it to
  `SUPERANNUATION.transferBalanceCap.general` would put the threshold at **$2,100,000** for
  FY2026-27 and would silently exempt a fund that the law puts on the proportionate method. Because
  the two methods can differ in either direction (§5.2), that is not a conservative error.
* **T128 — the person need not be a member of *this* fund's pension.** (c)(ii) says "whether or not
  the fund is the superannuation income stream provider". A household where one spouse has a large
  APRA-fund pension and a small SMSF interest can taint the SMSF.
* **T129 — the conversion year is usually NOT a DSFA year, and the year after usually IS.** (c)(ii)
  tests retirement-phase-recipient status **just before the start of the income year**. In the year
  a first pension commences, the person was not a retirement phase recipient at the previous 30
  June, so (c)(ii) fails and the fund is **not** DSFA — in the very year the apportionment question
  arises. From the following 1 July it is. An implementer who tests DSFA "as at the conversion" gets
  both years wrong.

**s 295-387(3) is the escape:** a fund all of whose assets would be segregated current pension assets
at **all** times in the year is not DSFA. A fund that is 100% retirement phase for the whole year is
therefore never DSFA — which is why s 295-385(10)(a) and (10)(b) can sit side by side without
contradicting each other.

Confidence: **primary-verified** throughout §3.1, except T129, which is a **reading of (c)(ii)'s
timing words applied to a first conversion** — a labelled inference, though a narrow one.

### 3.2 The s 295-385(9) election — a real, live choice, and only in the mid-year case

Read (8), (9) and (10) together and the availability of the election is exactly:

```
election under s 295-385(9) is AVAILABLE  iff
      at one or more times in the year, ALL interests in the fund are retirement phase   (9)
  AND NOT ( at all times in the year, ALL interests are retirement phase )              (10)(a)
  AND NOT ( assets are disregarded small fund assets at all times in the year )         (10)(b)
```

The first two conjuncts together say: **the fund was 100% retirement phase for part of the year and
not for all of it.** That is the mid-year phase-change case and *nothing else*. The election exists
for this case and for no other. It was inserted by **No 10 of 2022** with effect from **2021-22**.

So the answer to "is the choice free" has three branches, and only one of them is a choice:

| The fund's year | Method | Free? |
|---|---|---|
| **100% retirement phase at all times** | segregated, whole year, 0% on everything | **No choice** — s 295-385(10)(a) removes the election |
| **DSFA at all times** | proportionate, whole year, certificate required | **No choice** — ss 295-385(7), (10)(b), 295-395(3) |
| **100% retirement phase for part of the year only** | either (i) segregated for the RP part + proportionate for the rest, or (ii) proportionate for the whole year | **A genuine binary election**, s 295-385(9), and the two branches give **different numbers** — §5.2 |
| **Never 100% retirement phase** (the ordinary two-member fund, one converting) | proportionate for the whole year, unless the trustee actually sets assets aside solely for the pension | Constrained by fact, not election: segregation requires the assets to be dealt with *solely* for RP liabilities |

Confidence: **primary-verified** as to the election's availability conditions (they are read straight
off (8)–(10)); the fourth row's "unless the trustee actually sets assets aside" is the **deemed
segregation reading of §2.3** applied in the negative and carries that reading's label.

### 3.3 What is NOT a constraint

* **There is no election in s 295-390.** A fund does not "choose the proportionate method"; it
  falls into it because s 295-385 does not reach its income.
* **There is no Commissioner's discretion, approval, or notification anywhere in Subdiv 295-F.**
  Searched across all five retrieved sections: the words *Commissioner*, *approved form* and *notify*
  do not appear. The s 295-385(9) election is made by the trustee and the Act says nothing about how
  or when it is recorded. Confidence: **argument from absence across the retrieved text of the
  Subdivision** — U36, and it is why the tool cannot verify a user's stated method against anything.
* **There is no consistency or once-and-for-all rule.** Nothing binds the trustee to the method used
  last year. The election in (9) is expressed "for an income year".

---

## 4. How a part-year phase change is actually apportioned (Q3) — the question O60 exists to answer

### 4.1 The answer, stated once, plainly

**There is no apportionment rule for a superannuation fund. There are two different mechanisms, and
neither of them apportions the year.**

* Under **s 295-385**, nothing is apportioned. Each dollar of income is exempt or not according to
  **whether the asset that produced it was a segregated current pension asset at the time the income
  was derived**. A mid-year phase change moves the boundary of "at that time"; it does not create a
  fraction. The basis is **actual derivation, traced to assets, in real time**.
* Under **s 295-390**, the year is not split at all. **One** proportion is computed for the whole
  income year and applied to the whole year's income, including income derived months before any
  pension existed. The basis is the ratio of two **average values of liabilities over the income
  year**, certified by an actuary.

**Not days. Not asset values. Not a two-period split.** A part-year phase change reaches the
s 295-390 answer only *indirectly*, because a pension liability that did not exist for the first
166 days of the year has a lower **average value for the income year** than one that existed
throughout.

### 4.2 Does the answer differ between the two methods? Yes — materially, and in both directions

Under the segregated method the exempt amount depends on **when income was derived**. Under the
proportionate method it does not — a capital gain realised in July, before any pension existed, is
54% exempt in the worked example at §5.2 purely because a pension started in December.

§5.2 hand-works one fund, one set of facts, and gets **$4,296.58** under the segregated method and
**$3,069.86** under the s 295-385(9) election. Same year, same fund, same income, **$1,226.71
apart** — and which is larger depends entirely on whether income was lumpy early or lumpy late.

**This is the finding that decides question 4.** The choice between the methods is not a formality
whose answer the tool can assume, because the two methods are not approximations of each other.

### 4.3 On what basis is the "average value" computed? — the Act does not say

s 295-390(3) says "the **average value for the income year**". It does not say daily, monthly,
opening-and-closing, or anything else. s 295-390(4) tells the actuary how to value liabilities *at a
particular time* (a solvency-style projection: assets plus future contributions plus expected
earnings sufficient to discharge the liabilities as they fall due) and requires the values to be in
a certificate — but the **averaging convention across the year is left to the actuary**.

Two consequences, and both are load-bearing:

1. **The exempt proportion is not a determinate function of facts the tool holds.** Two actuaries
   given identical fund data may certify different percentages, both correctly. This is why the
   proportionate figure is a **Setting or a bound**, never a computation — §4.4.
2. **The daily time-weighting used at §5 is a convention, not the law.** It is the ordinary
   actuarial practice and it is what makes the arithmetic in §5 reproducible, but it is labelled
   `unverified` wherever it is used, and U37 records it.

**A regulation could have prescribed the averaging and none exists.** Subdiv 295-F of the ITAR (1997
Act) 2021 contains one regulation and it prescribes benefit *types* for s 295-385, nothing else
(§1.7, §7.3).

### 4.4 The contrast that settles it — s 295-410 (T130)

Parliament **did** write a days-based part-year apportionment into this Subdivision. It wrote it in
**s 295-410**, for **retirement savings accounts**, in terms that could hardly be plainer: multiply
by the days the pension was paid, divide by the days the RSA existed. And **s 295-405 item 3** exists
solely to catch the case where the stream "was paid from the RSA **for part of the period** in the
income year".

There is no equivalent for a complying superannuation fund. The drafter of Subdiv 295-F had the
part-year problem in mind, had a days formula in hand, and put it only in the RSA provisions.

Confidence: **an inference from an express provision elsewhere in the same Subdivision** —
*expressio unius*. Under **ruling R6** it must never be recorded as bare `primary-verified`. It is
recorded as **T130** because it is the specific wrong answer an implementer reaches for: a days-based
split of the conversion year's earnings **is not the law under either method**, and it happens to
coincide with the proportionate answer only when the averaging is daily *and* income accrues evenly
*and* liabilities equal account balances.

### 4.5 The decomposition that makes the existing per-interest API salvageable

`fundEarningsTax` in `src/core/superPhase.ts` is **per interest**. ECPI is **per fund**. That looks
like a structural mismatch and mostly it is not — for the ordinary case.

Take a fund with a single pooled portfolio (so every interest earns the same rate of return `r`),
liabilities equal to account balances, and no segregated assets. Let interest *i* have average
balance `Bᵢ` over the year and let interest *p* be in retirement phase for a fraction `fₚ` of the
year. Then:

```
exempt proportion  =  Σ_p (B_p · f_p)  /  Σ_i B_i          (s 295-390(3), daily averaging)
exempt income      =  r · Σ_i B_i  ·  exempt proportion
                   =  r · Σ_p (B_p · f_p)
                   =  Σ_p ( income of interest p  ·  f_p )
```

**The fund-level proportion decomposes exactly into a per-interest, time-weighted split.** So the
existing signature is not wrong; what it is missing is the **time weight `fₚ`**, and it has the
`phaseHeldForTheWholeYear: boolean` where the fraction should be.

The four assumptions that make the decomposition exact are worth naming, because each is a way for
it to stop being exact: **(i)** one pooled return across all interests; **(ii)** liability value =
account balance; **(iii)** daily time-weighted averaging; **(iv)** no segregated assets. (ii) is
supported but not proved by s 295-385(6)'s use of "the account balance supporting the benefit" as the
measure for a prescribed stream. (iii) is §4.3's convention. Confidence for the decomposition
itself: **arithmetic, given (i)–(iv)**; for (i)–(iv) as a description of a real household SMSF:
**stated assumption, `unverified` — U37**.

---

## 5. Worked examples with real dollar figures — intended as test fixtures

Both examples use **FY2026-27** = 1 July 2026 to 30 June 2027, **365 days** (2027 is not a leap
year). Conversion day **14 December 2026**, the day Alex Nguyen turns 65 and SISR Schedule 1 item
106 is satisfied, converting a TRIS to retirement phase **automatically** (register §3.10.6; a
labelled inference under **R6**, not bare `primary-verified`).

**Day counts, computed once and reused.**

```
1 Jul 2026 – 13 Dec 2026 : 31+31+30+31+30+13            = 166 days   (accumulation)
14 Dec 2026 – 30 Jun 2027: 18+31+28+31+30+31+30         = 199 days   (retirement phase)
                                                   total = 365 days
199 / 365 = 0.545205479452…
```

### 5.1 Example A — the ordinary two-member household SMSF (one member converts)

**Facts.** The Nguyen Superannuation Fund, a complying SMSF, two members, one pooled portfolio.

| | 1 Jul 2026 balance | Phase in FY2026-27 |
|---|---|---|
| Alex — account-based pension (converted TRIS) | **$900,000** | accumulation to 13 Dec, **retirement phase from 14 Dec** |
| Sam (58) — accumulation | **$600,000** | accumulation all year |
| **Fund total** | **$1,500,000** | |

Fund taxable earnings for FY2026-27, composed elsewhere and stated: **$75,000** (5.00% on
$1,500,000). Balances held flat for the year so the arithmetic is auditable; drawdowns and
contributions are deliberately excluded — they would move the *average* balances and nothing else in
the structure.

**Which method?** Not DSFA: Alex's TSB at 30 June 2026 is $900,000 ≤ $1.6m, and Alex was not a
retirement phase recipient just before the start of the year, so s 295-387(2)(c) fails on **both**
limbs (T129). Not 100% retirement phase at any time — Sam's accumulation interest is always there —
so the s 295-385(9) election is **unavailable** and, absent an actual setting-aside of assets solely
for Alex's pension, no assets are segregated. **The fund is on the proportionate method for the whole
year, with an actuary's certificate.**

**The statutory computation (s 295-390(3)), daily averaging:**

```
average value of current pension liabilities  =  900,000 × 199/365   =  $490,684.93
average value of superannuation liabilities   =                         $1,500,000.00
exempt proportion                             =  490,684.93 / 1,500,000
                                              =  0.3271232877  =  32.71232877%

exempt income        =  75,000.00 × 0.3271232877     =  $24,534.25
assessable income    =  75,000.00 − 24,534.25        =  $50,465.75
fund earnings tax    =  50,465.75 × 0.15             =  $7,569.86
```

In cents, for a fixture: `taxableEarnings = 7_500_000`, `exemptProportion = 0.3271232877`,
`tax = 756_986` (`5_046_575 × 0.15 = 756_986.25`, rounded half away from zero by `mulCents`).

**The three other numbers a reader needs, and they are the point of the example:**

| | Reasoning | Fund tax | vs statutory |
|---|---|---|---|
| **Statutory (proportionate, daily averaging)** | above | **$7,569.86** | — |
| **Upper bound** — whole year at the accumulation rate | exempt proportion ≥ 0 always, so 15% of everything is a **provable ceiling** | **$11,250.00** | **+$3,680.14** — *understates the household* |
| **Lower bound** — whole year in retirement phase for Alex | exempt proportion ≤ 60% here, so this is a **provable floor** | **$4,500.00** | **−$3,069.86** — *flatters the household* |
| **The naive per-interest fix** — drop `phaseHeldForTheWholeYear` and take the stated phase | Alex 0% on $45,000, Sam 15% on $30,000 | **$4,500.00** | **identical to the floor** |

**That last row is the fixture that matters.** The minimal, obvious way to lift
`MidYearPhaseChangeError` — delete the guard and use the interest's stated phase — lands **exactly
on the flattering extreme**, understating the fund's tax by **$3,069.86** in the first year of a
strategy the tool exists to evaluate. It is not an approximation of the right answer; it is the
worst available answer in the wrong direction.

**Cross-check of §4.5's decomposition.** Per-interest, time-weighted: Alex's share of the income is
$45,000, of which 199/365 is exempt → $24,534.25 exempt. Identical to the fund-level figure, to the
cent. The decomposition holds.

### 5.2 Example B — the fund that goes 100% retirement phase mid-year, where the methods diverge

**Facts.** The Alex Nguyen Superannuation Fund, a complying SMSF, **Alex is the only member**, one
account-based pension, **$900,000** at 1 July 2026, converting **14 December 2026**. Not DSFA (same
reasoning as Example A). Fund income for the year **$45,000**, and — this is the whole point — it is
**not evenly derived**:

| Component | Amount | Derived |
|---|---|---|
| Rent and interest, accruing evenly | **$30,000** | across the year |
| A realised capital gain (net of the one-third discount, composed elsewhere) | **$15,000** | **20 November 2026** |
| **Total** | **$45,000** | |

From **14 December 2026** every superannuation interest in the fund is in the retirement phase, so
from that day all of the fund's assets are dealt with solely to discharge RP liabilities in respect
of an **account-based pension** — a prescribed benefit under **reg 295-385.01(a)(iii)** — and are
**segregated current pension assets under s 295-385(4)**, automatically and **with no actuary's
certificate**. s 295-385(5) is satisfied: at all times during the year, such RP liabilities as the
fund had were liabilities in respect of prescribed benefits (before 14 December it had none, and the
condition holds vacuously — see U34 and T131).

**Branch 1 — do nothing. The segregated method applies from 14 December (s 295-385(1)).**

```
Exempt = income derived from segregated current pension assets while they were segregated
       = the 199/365 of the evenly-accruing $30,000 that falls on or after 14 Dec
       = 30,000 × 199/365                                    = $16,356.16
The $15,000 gain was derived on 20 Nov, before any asset was segregated: fully assessable.

assessable      = 45,000.00 − 16,356.16                      = $28,643.84
fund tax @ 15%  = 28,643.84 × 0.15                           = $4,296.58
```

**Branch 2 — the trustee makes the s 295-385(9) election.** It is available: all interests were in
the retirement phase at one or more times in the year (from 14 Dec), and not at all times (s
295-385(10)(a) does not bite), and the assets are not DSFA (s 295-385(10)(b) does not bite). All
assets are then **not** segregated current pension assets for the whole year (s 295-385(8)), and the
fund is on **s 295-390 for the whole year**, with an actuary's certificate.

```
average value of current pension liabilities  =  900,000 × 199/365   =  $490,684.93
average value of superannuation liabilities   =                         $900,000.00
exempt proportion                             =  0.5452054795  =  54.52054795%

exempt income   =  45,000.00 × 0.5452054795                  = $24,534.25
assessable      =  45,000.00 − 24,534.25                     = $20,465.75
fund tax @ 15%  =  20,465.75 × 0.15                          = $3,069.86
```

**The election is worth $1,226.71 in this year**, and it is worth it *because the capital gain was
realised in November*. Realise the same gain in March and the election becomes the more expensive
branch. A tool that assumes a method assumes a number it cannot justify.

**Both branches sit inside the bound.** Upper bound $45,000 × 15% = **$6,750.00** ≥ $4,296.58 and
≥ $3,069.86. The bound holds under both methods, which is the property §6 relies on.

### 5.3 What these two examples are for

They are the **most expensive thing in this document to reconstruct**, and they should become
fixtures verbatim:

* **F1** — Example A statutory: `7_500_000` cents, proportion `0.3271232877`, tax `756_986` cents.
* **F2** — Example A upper bound: `1_125_000` cents. Any implementation that returns **less** than
  this for a conversion year without a stated exempt proportion is flattering the household.
* **F3** — Example A naive fix: `450_000` cents. A test asserting the engine does **not** return
  this is the mutation guard for the whole refusal (proposed as **M-P3-25-1**, §8.3).
* **F4** — Example B, both branches: `429_658` and `306_986` cents from identical facts. This is the
  fixture that proves the method choice is not assumable.

---

## 6. What the tool can compute, what needs a Setting, what must be refused (Q4), and the recommendation (Q5)

### 6.1 The placements, decided

| Fact | Placement | Why |
|---|---|---|
| **Whether the fund is a *small superannuation fund*** (≤ 6 members) | **computable** — the tool models a couple's own super; a two-person SMSF is one by definition | s 995-1; nothing to look up |
| **Whether s 295-387 DSFA applies** | **computable**, from state the model already holds | (c)(i) is TSB at the previous 30 June — register §3.8 defines TSB and the projection carries it; (c)(ii) is retirement-phase-recipient status at the previous 30 June, which the projection also knows once a conversion day exists. **Compute it; do not ask.** Guard with **T129** |
| **The $1.6m DSFA threshold** | **frozen constant**, not config | Absent from **s 960-265** (§1.10). T126 |
| **Whether the fund is 100% retirement phase at a time** | **computable** — it is a property of the modelled interests | drives s 295-385(9) availability and deemed segregation |
| **Which ECPI method the fund is actually on** | **Setting — required, never defaulted, per fund per year** where the fund is 100% RP for part of the year; **derivable** otherwise | It is a genuine binary election (s 295-385(9)) whose better branch depends on **when income was derived** (§5.2). There is no notification, no approved form and no Commissioner involvement to check it against (U36) |
| **The exempt proportion under s 295-390** | **Setting if the household has a certificate; a stated conservative bound if it does not** | The Act requires an actuary's certificate (s 295-390(4)) and **does not prescribe the averaging** (§4.3). The tool cannot produce a certificate and must not manufacture the percentage silently |
| **Segregated-method tracing** — which asset produced which dollar, and when | **NAMED REFUSAL** | Requires an asset-level ledger with derivation dates. The model has interests and balances, not assets and transactions. This is not a gap in the research; it is a gap in the data model, and no assumption closes it conservatively (§5.2 shows the error runs both ways) |
| **s 295-385(6)** — market value exceeding the account balance | **NAMED REFUSAL**, or out of scope | Requires per-asset market values |
| **s 295-395 segregated non-current assets** | **out of scope** — say so | A household SMSF paying an ABP has no reason to hold them, and modelling them needs the same asset ledger |
| **s 295-400** — pooled superannuation trusts | **out of scope** — say so | The tool models a couple's own interests, not PST unitholdings |
| **NALI and Subdiv 295-C amounts** (ss 295-385(2), 295-390(2)) | **out of scope**, and it is safe: the register already carries the 45% NALI rate at §5A.3 | Both methods exclude them identically |

**Two placements are worth defending explicitly, because they look wrong.**

*Why the actuary's percentage is a **Setting** and not a refusal.* The register's instinct — the tool
cannot produce an actuary's certificate, therefore refuse — proves too much. **The household
receives that certificate every year.** s 295-390(4) makes the percentage a document the trustee
must obtain before lodging, so for any *historical* year the number exists on paper and asking for it
is asking for a fact the user has. What the tool must never do is *compute* it and present it as
though certified. A Setting expresses exactly that distinction.

*Why DSFA is computed and not asked.* Everything s 295-387 needs is state the projection already
carries, the test has three timing traps that a user will get wrong (T128, T129), and getting it
wrong changes the method. Asking a user to self-assess a rule with a frozen $1.6m threshold that
looks like an indexed cap is inviting the T126 error into the Settings file.

### 6.2 The bound, and why it is not a "plausible default"

For a **forecast** year the certificate does not exist yet and never will, so the Setting route is
empty and the choice is between refusing and stating a number. The project's rule is to prefer a
named refusal to a plausible default — but the number available here is **not** a plausible default.
It is a **provable ceiling**:

> The exempt proportion under s 295-390 lies in [0, 1] by construction (s 295-390(3): both averages
> are non-negative and the numerator's liabilities are a subset of the denominator's), and the exempt
> amount under s 295-385 lies in [0, the year's income]. Therefore, under **either** method and on
> **any** facts, **fund earnings tax ≤ 15% × taxable earnings**.

> **AUDIT CORRECTION — stamped in place 2026-09-10 (P3-31).** The claim above is preserved as
> written; this supersedes its scope. **The bound holds for `taxableEarnings ≥ 0` only.** On a
> loss the inequality **reverses**: with exempt proportion `p ∈ [0,1]` the assessable amount is
> `(1−p) × income`, so `15% × income` is the **most negative** figure available — the largest
> notional refund, not a ceiling. `[0, the year's income]` is not an interval when income is
> negative. Ruling **R10 is unaffected**; what was over-broad was this justification. See register
> **§3.11.6** as corrected, and the mirror fixture: a part-year loss would be charged
> **−$6,750.00** against a proportionate **−$3,069.86**, $3,680.14 further out — the exact mirror
> of the profit-side gap.

Taxing a conversion year wholly at the accumulation rate is therefore an **upper bound on the true
liability, verified against both worked examples** ($11,250 ≥ $7,569.86; $6,750 ≥ $4,296.58 and
≥ $3,069.86). Its failure mode is that it **overstates fund tax and understates the household** —
which is the direction ruling **R1** requires when the evidence runs out. It is a bound with a
proof, not a guess with a plausible look.

**And unlike R5's case, the direction here is not mixed.** R5 refused because silence was
conservative on the tax side but flattering on the cap side: no conversion meant no transfer balance
credit and an undetected breach. That does not arise here. This bound *records the conversion* — the
interest changes phase on the conversion day, the s 294-25 item 2 credit arises, and the cap check
runs. All that changes is that the conversion year's earnings keep the 15% rate. **Every arrow points
the same way**, so **R9's reasoning applies, not R1's**: refusing would trade a conservative answer
for no answer, inside the horizon the tool exists to discuss.

### 6.3 The recommendation on `MidYearPhaseChangeError` (Q5)

**Recommendation: NARROW it. Do not lift it, and do not leave it standing as it is.**

Concretely, four changes, in this order:

1. **Rewrite the refusal message regardless of what else is decided.** It asserts three things that
   are now known to be false or backwards: that s 295-390 "HAS NEVER BEEN RETRIEVED BY ANY PASS"
   (it was, on 2026-09-04 and again today); that s 295-385(3)(b) means "the segregated method needs
   an actuary's certificate" **full stop** (s 295-385(4) does not); and, by implication, that the
   proportionate method is the arithmetic one (it is the one that always needs the certificate).
   The same three errors are in `src/core/superPhase.ts`'s header comment, in
   `src/core/ttrPaymentRange.ts`, and in register §3.10 and §8. **A refusal that misstates its own
   grounds is worse than a refusal, because the next agent acts on the grounds.** This change is
   owed whether or not the refusal survives.

2. **Replace `phaseHeldForTheWholeYear: boolean` with a phase *fraction*.** §4.5 shows the
   fund-level proportion decomposes exactly into a per-interest time weight, so the existing
   per-interest shape survives; the boolean is a fraction that has been collapsed to its two
   endpoints. The natural input is the **conversion day** (the R5 Setting, which must exist anyway
   for the transfer balance credit), from which the fraction is derived — not a second Setting.

3. **Compute the conversion year at the bound by default**, disclosed in the caveats by name: *"the
   conversion year is charged at the accumulation rate on the whole year's earnings. This is a
   proven upper bound on the fund's liability under both ss 295-385 and 295-390, not the fund's
   actual ECPI; the true figure requires an actuary's certificate (s 295-390(4)) or asset-level
   tracing (s 295-385(1)(b)). It understates the household."* This is what actually unblocks P3-8's
   conversion limb and P4.

4. **Keep a named refusal for the three cases the bound does not cover**, and give it a name that
   says which:
   * **`SegregatedEcpiNotModelledError`** — the caller states the fund is on the segregated method,
     or the model detects the fund was 100% retirement phase for part of the year (s 295-385(9)
     available). Asset-level tracing; the error runs both ways (§5.2); refuse.
   * **`EcpiMethodNotStatedError`** — the s 295-385(9) election is available and no Setting says
     which branch. Do **not** silently take either.
   * The existing **`FundLossNotModelledError`** already covers the negative-earnings case and needs
     no change.

**Why not lift it outright.** Because §5.2 proves the two methods give different answers on the same
facts, in a direction that depends on within-year income timing the model has no ledger for. Any
single computed number for the segregated case would be a plausible default of exactly the kind the
project forbids.

**Why not leave it standing.** Because a refusal that blocks the conversion year blocks P3-8 and P4
entirely, and the evidence now shows a bound exists with a proof and a single, safe direction of
error. Standing on the refusal is no longer the conservative choice; it is the *absent* choice, and
R9 has already ruled that trade once.

**What the user is actually being asked to rule.** Whether step 3's disclosed bound is acceptable in
place of a refusal for the default forecast case. Steps 1, 2 and 4 follow whichever way that goes;
step 1 is owed unconditionally.

### 6.4 One structural point that will bite later

For an **APRA-regulated fund**, ECPI apportionment is invisible to the member: the fund reports a
crediting rate net of tax and runs its own pension pool. The 15% / 0% per-interest model is a
*modelling convention* for such a member, not a description of what the fund does. Everything in this
document about method choice, elections and certificates bites **only for an SMSF**. If the tool ever
distinguishes SMSF from APRA-fund interests, the refusals in §6.3 should be scoped to SMSFs — and if
it does not, they will fire on households they do not apply to. Recorded as **O69**.

### 6.5 Where the evidence ran out

Stated plainly rather than smoothed over:

* **The averaging convention in s 295-390(3) is not settled by anything retrieved** (U37). Daily
  time-weighting is used throughout §5 as a stated convention, and every number in §5.1 and §5.2 that
  depends on `199/365` inherits that label.
* **No ATO guidance page on ECPI method choice was retrieved.** Nine URL forms were tried and all
  404'd, and there is no usable ATO search from this environment (§7.2). A Practical Compliance
  Guideline or guidance page may exist and would be the natural corroboration for §2.3's deemed
  segregation reading and §4.3's averaging. **O67.**
* **The Explanatory Memorandum to No 10 of 2022 was not retrieved** (§7.2). It would corroborate
  §2.3 and §3.2 directly, since the (8)–(10) election was enacted for precisely the mid-year case.
  The FRL OData API exposes only Word/PDF/Epub of the Act itself for `C2022A00010`. **O68.**
* **The vacuous-truth reading of s 295-385(5)** — that "at all times during the income year, the
  liabilities … were liabilities in respect of prescribed benefits" is satisfied in a year where the
  fund had no such liabilities for the first 166 days — is a **reading, not a retrieved answer**
  (T131, U34). It is load-bearing for Example B branch 1. Nothing retrieved contradicts it, and
  s 295-390(7) uses the identical formulation, but no authority was found either way.

### 6.6 The contradiction, settled

**The register's *Franking — P1-11* list is RIGHT. O52 and O60 are WRONG, and have been since
2026-09-04.**

The evidence is in this repository and did not need a fetch to find. `docs/research/p1-11-franking-refundability.md`:

* line 104 paraphrases **s 295-390(1)** and cites **s 295-390(3)**'s formula as "average current
  pension liabilities ÷ average superannuation liabilities" — which is correct, is not derivable
  from s 295-385, and is not in any secondary source that pass lists;
* line 106 cites **ss 295-385(2), 295-390(2)** together for the NALI and Subdiv 295-C exclusions —
  again correct, and specific to (2) of each section;
* line 108 records the source URL `…DocID=PAC%2F19970038%2F295-390` explicitly;
* line 154 quotes **s 295-385(7)** verbatim and line 156 pins the **$1.6 million** to
  **s 295-387(2)(c)(i)**, correctly identifying it as hard-coded — a finding that requires having
  read s 295-387, which §10's list also claims;
* line 158 states the consequence — "such a fund must use the proportionate method (s 295-390)" —
  which is §3.1 of this document, reached a week ago.

That is not reconstructible from memory or from a secondary source. **The franking pass fetched
s 295-390 and s 295-387 on 2026-09-04.** The claim in **O52** ("neither section has been read in this
project"; "s 295-390 never") and in **O60** ("has never been retrieved by any pass") is false, and it
was false when written.

**And the second half of the task's question — is it worth flagging on its own — yes, but the
finding is the opposite of the one anticipated.** The concern was that a pass might have drawn
conclusions from a source its own notes then denied having. It did not: the **franking pass's notes
are accurate**, and its conclusions are properly sourced. What happened is that **a later pass wrote
an open item asserting a negative it had not checked** — O52 and O60 both say "never retrieved by any
pass" when what was true was "not retrieved by *this* pass". The register's own correction note of
2026-09-10 gets the diagnosis right in general terms — *"'never retrieved' was a description of what
nobody did"* — but even that understates it: somebody had.

**The lesson, and it is a process one worth recording (O70).** Three separate artefacts —
`src/core/superPhase.ts`, `src/core/ttrPaymentRange.ts` and register §3.10 — carry the words "has
never been retrieved by any pass" in shipped refusal messages, on the authority of an open item that
was never checked against the register's own source index. **A cross-pass negative must be verified
against §10 before it is written down, and a refusal message must never assert one.** The cost here
was six days and a blocked build limb, on a provision that had been sitting in the source index the
whole time.

---

## 7. Fetch log — 2026-09-10

**27 successes, 28 distinct failing URLs, and one 200 that was not a document.** All by `curl` with the browser User-Agent
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`.
Every status code below was read from `curl -w '%{http_code}'`, never inferred from body size — see
§7.4.

### 7.1 Successes

| # | Document | URL / form | Status | Bytes |
|---|---|---|---|---|
| 1 | ITAA 1997 **s 295-385** | `ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F295-385` | 200 | 136,065 |
| 2 | ITAA 1997 **s 295-387** | …`%2F295-387` | 200 | 119,969 |
| 3 | ITAA 1997 **s 295-390** | …`%2F295-390` | 200 | **128,944** |
| 4 | ITAA 1997 **s 295-395** | …`%2F295-395` | 200 | 118,158 |
| 5 | ITAA 1997 **s 295-400** | …`%2F295-400` | 200 | 115,785 |
| 6 | ITAA 1997 **s 295-405** | …`%2F295-405` | 200 | 118,360 |
| 7 | ITAA 1997 **s 295-407** | …`%2F295-407` | 200 | 112,590 |
| 8 | ITAA 1997 **s 295-410** | …`%2F295-410` | 200 | 113,491 |
| 9 | ITAA 1997 **s 295-320** | …`%2F295-320` | 200 | 115,838 |
| 10 | ITAA 1997 **s 295-550** (NALI) | …`%2F295-550` | 200 | 145,489 |
| 11 | ITAA 1997 **s 307-70** | …`%2F307-70` | 200 | 113,380 |
| 12 | ITAA 1997 **s 307-75** | …`%2F307-75` | 200 | 114,007 |
| 13 | ITAA 1997 **s 307-80** | …`%2F307-80` | 200 | 124,331 |
| 14 | ITAA 1997 **s 960-265** | …`%2F960-265` | 200 | 122,208 |
| 15 | ITAA 1997 **s 995-1** (the Dictionary) | …`%2F995-1` | 200 | **5,222,389** |
| 16 | **ITAR (1997 Act) 2021 reg 295-385.01** | `?DocID=REG%2F20210206%2F295-385.01` | 200 | 109,927 |
| 17 | **ITAR (1997 Act) 2021 reg 307-70.02** | `?DocID=REG%2F20210206%2F307-70.02` | 200 | 130,624 |
| 18 | **TR 2013/5** | `?DocID=TXR%2FTR20135%2FNAT%2FATO%2F00001` | 200 | 269,793 |
| 19 | **LCR 2016/8** | `?DocID=COG%2FLCR20168%2FNAT%2FATO%2F00001` | 200 | 266,618 |
| 20 | **PCG 2017/5** *(fetched only to learn the PCG prefix — see §7.5 recipe 3)* | `?DocID=COG%2FPCG20175%2FNAT%2FATO%2F00001` | 200 | 121,786 |
| 21 | **FRL OData** — title lookup, ITAR (1997 Act) Regulations | `api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'…')` | 200 | → `F2021L00206` |
| 22 | **FRL OData** — title lookup, `C2022A00010` by id | same endpoint, `$filter=id eq 'C2022A00010'` | 200 | — |
| 23 | **FRL OData** — title search, *Enhancing Superannuation Outcomes* | same endpoint | 200 | 2 hits |
| 24 | **FRL OData** — document enumeration for `C2022A00010` | `/v1/documents?$filter=titleId eq 'C2022A00010'` | 200 | Epub, Pdf, Word only |
| 25 | **ITAR (1997 Act) 2021, authorised Word compilation** | `/v1/documents/find(titleid='F2021L00206',asat=2026-09-10,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0)` | 200 | 396,418 (`Compilation No. 16`, 27 Jun 2026) |
| 26 | `aph.gov.au` reachability | `/Parliamentary_Business/Bills_Legislation/…/Result?bId=r6779` | 200 | 61,405 — **reachable, but not the right bill; see failure #18** |
| 27 | **`www.legislation.gov.au/F2021L00206/latest/text/original/word`** | direct download path | **200** | 268,009 — **and it is the SPA shell, not a `.docx`.** Counted as a success by status and a failure in substance. `file` says `HTML document text`. The OData route (#25) is the one that works for this instrument |

### 7.2 Failures — and what each one means

**Malformed or wrong-guess requests against documents that may or may not exist:**

| # | Attempt | Status | Diagnosis |
|---|---|---|---|
| 1 | `PAC%2F19970038%2F295-380` | 404 (101,529 B) | **Section does not exist.** Subdiv 295-F starts at 295-385 |
| 2 | `PAC%2F19970038%2F295-386` | 404 (101,527 B) | **Does not exist** |
| 3 | `PAC%2F19970038%2F295-411` | 404 (101,527 B) | **Does not exist** |
| 4 | `PAC%2F19970038%2F295-415` | 404 (101,529 B) | **Does not exist** |
| 5 | `PAC%2F19970038%2F295-420` | 404 (101,527 B) | **Does not exist.** #1–#5 together **bound Subdivision 295-F**: it is ss 295-385, 295-387, 295-390, 295-395, 295-400, 295-405, 295-407, 295-410 and nothing else |
| 6 | `REG%2F20210206%2F295-390.01` | 404 (101,527 B) | **Does not exist** — corroborated exhaustively at §7.3 |
| 7 | `REG%2F20210206%2F295-390.02` | 404 (101,529 B) | Does not exist |
| 8 | `REG%2F20210206%2F295-390.05` | 404 (101,527 B) | Does not exist |
| 9 | `REG%2F20210206%2F295-385.02` | 404 (101,527 B) | Does not exist |
| 10 | `REG%2F20210206%2F295-385.03` | 404 (101,527 B) | Does not exist |
| 11 | `REG%2F20210206%2F295-385.05` | 404 (101,527 B) | Does not exist |
| 12 | `DocID=PCG%2FPCG20175%2F…` | 404 (101,527 B) | **Bad prefix — the document exists.** PCGs use **`COG`**, like LCRs, not `PCG`. Success #20 is the same document. See recipe 3 |

**Federal Register of Legislation OData — four wrong parameter values and no absence:**

| # | Attempt | Status | Diagnosis |
|---|---|---|---|
| 13 | `documents/find(titleid='F2021L00206', … type='Principal', …)` | 404 | **`'Principal'` is not a value.** The parameter is **`type='Primary'`**, which returns 200 and a real `.docx` (success #25). One character of guess cost one fetch |
| 14 | `… type='LegislativeInstrument' …` | 404 | Wrong value, even though `F2021L00206` **is** a legislative instrument (its `collection` field says so). Still `'Primary'` |
| 15 | `… type='Instrument' …` | 404 | Wrong value |
| 16 | `api.prod.legislation.gov.au/v1/titles('C2022A00010')/documents` | 404 | **Bad OData form.** The navigation-property route does not exist; `/v1/documents?$filter=titleId eq '<id>'` does (success #24) |

**ATO guidance pages — NINE URL forms, all dead. This is a true dead end, not a bad guess:**

| # | Attempt | Status |
|---|---|---|
| 17a | `/individuals-and-families/super-for-individuals-and-families/self-managed-super-funds-smsf/paying-benefits/exempt-current-pension-income` | 404 (257,231 B) |
| 17b | `/forms-and-instructions/self-managed-superannuation-fund-annual-return-instructions-2025/exempt-current-pension-income` | 404 (257,241 B) |
| 17c–17i | `/super/self-managed-super-funds/paying-benefits/exempt-current-pension-income/`; `/General/Gen/QC45280`; `/General/Gen/QC21546`; `/General/Gen/QC42473`; `/General/Gen/QC72663`; `/single-page-applications/quickcodesearch#QC45280`; `/businesses-and-organisations/super-for-employers/self-managed-super-funds-smsf` | 404 (257,231 / 257,241 B) each |

**Explanatory memorandum for No 10 of 2022 — not retrieved:**

| # | Attempt | Status | Diagnosis |
|---|---|---|---|
| 18a–18c | FRL OData `documents/find(titleid='C2022A00010', … type='ExplanatoryMemorandum' / 'ExplanatoryStatement' / 'Supporting', format='Word')` | 404, 404, 404 | The API exposes only the Act's own Epub/Pdf/Word (success #24). **A confirmed absence from this API, not from the world** |
| — | `aph.gov.au` bills search by guessed `bId` | 200, wrong page | Reachable but useless without a bill id, and **there is no usable search from this environment**. Left open as **O68** |

**Count.** 12 Legal Database / Regulations probes + 9 ATO guidance paths + 7 FRL OData forms = **28
distinct failing URLs**. Twelve of them (#1–#11, #18a–c counted as one class) are **true absences**;
the rest are **malformed or mis-valued requests against documents that exist**.

### 7.3 True absences — confirmed exhaustively, not merely un-fetched

**#1 — There is no regulation made for the purposes of ITAA 1997 s 295-390(7), and there never has
been.** Not inferred from six 404s (failures #6–#8). Verified against the **complete authorised text**
of the ITAR (1997 Act) Regulations 2021 (`F2021L00206`, Compilation No. 16, 27 June 2026, retrieved
as Word via FRL OData, success #25, and the `word/document.xml` extracted and searched in full).
**Subdivision 295-F of those Regulations contains exactly one regulation — 295-385.01 — between the
headings *Subdivision 295-F — Exempt income* and *Subdivision 295-G — Deductions*.** The table of
contents agrees. Consequence: **s 295-390(7) is inoperative**, and the actuary's certificate
requirement in s 295-390(4) has no escape.

**#2 — The ITAA 1997 Dictionary contains no definition of "actuary's certificate".** Verified by
searching the retrieved s 995-1 document (5.2 MB, success #15) for `certificate`: the only hits are
*NRAS certificate*, *registered PGO certificate* and *shipping exempt income certificate*. The
asterisk therefore attaches to *actuary*.

**#3 — Subdivision 295-F prescribes no form, deadline, content, lodgment or retention rule for the
s 295-385(9) election, and mentions no Commissioner involvement.** Verified by searching the full
retrieved text of all five core sections for `Commissioner`, `approved form` and `notify`: no hits.

**#4 — Subdivision 295-F contains no days-based apportionment for a complying superannuation fund.**
Verified across the bounded Subdivision (failures #1–#5 bound it). The one days formula it contains,
**s 295-410**, is for **RSAs** and is reached only through s 295-405 item 3.

### 7.4 A correction to register §10 recipe 12

Recipe 12 currently reads: *"An ATO 404 is served with a real 404 status AND a ~257 KB HTML error
page."* **There are two different 404 pages and only one of them is 257 KB.**

| Route | 404 body size |
|---|---|
| `www.ato.gov.au/law/view/document?DocID=…` (Legal Database) | **~101.5 KB** |
| `www.ato.gov.au/<guidance path>` and `/General/Gen/QC…` | **~257 KB** |

The rule the recipe is protecting is right and should be strengthened, not weakened: **the body size
of a 404 is not a constant, so it is not a signal at all. Read the status code.** A pass that had
memorised "257 KB means 404" would have read every one of failures #1–#12 as a success.

### 7.5 Retrieval recipes — new or corrected by this pass

1. **`ITAR (1997 Act) 2021` via the ATO Legal Database uses `REG%2F20210206%2F<reg>` with the dotted
   regulation number intact** — `295-385.01` works, unencoded dot and all. (Confirms register §10
   recipe 5 and extends it to dotted numbers.)
2. **The FRL OData `documents/find(…)` route works for a LEGISLATIVE INSTRUMENT, but only with
   `type='Primary'`.** `type='Principal'`, `type='LegislativeInstrument'` and `type='Instrument'`
   all **404** — and `'Principal'` is the one an English speaker reaches for first. This is
   the route to the authorised text of a regulation and it is how §7.3's true absence was proved:
   `…/v1/documents/find(titleid='F2021L00206',asat=<date>,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=0,rectificationVersionNumber=0)`
   → 200, a real `.docx`. The `www.legislation.gov.au/<id>/latest/text/original/word` path returns
   **200 with the SPA shell** for this instrument, so the OData route is the only one that works.
3. **Practical Compliance Guidelines use the `COG` prefix, like Law Companion Rulings** —
   `?DocID=COG%2FPCG<year><n>%2FNAT%2FATO%2F00001`. The intuitive `PCG%2F…` form **404s**. This is
   the same trap register §10 recipe 3 records for LCRs, and it costs a fetch every time.
4. **To prove a section does not exist, probe its neighbours.** Failures #1–#5 bound Subdivision
   295-F in five fetches and turn "I did not find it" into "it is not there". Cheap, and it is what
   makes an absence citable.
5. **`aph.gov.au` answers 200 to `curl` with a browser User-Agent** — unlike `austlii.edu.au` and
   `guides.dss.gov.au`. It is a live route for explanatory memoranda **if a bill id is known**.
   Discovery is the problem, not access.
6. **The FRL OData navigation-property form `titles('<id>')/documents` 404s.** Use
   `/v1/documents?$filter=titleId eq '<id>'`.

---

## 8. PROPOSED register rows — drafted, NOT applied

**A new section §3.11.** Not folded into §3.1 (which carries the two rates) or §3.10 (which is the
transfer balance cap): ECPI is a **fund-level** computation and everything around it in §3 is
per-Person. §3.10's row about mid-year apportionment should become a pointer to §3.11 (see §9).

### 8.1 §3.11 — Exempt current pension income — ITAA 1997 Subdivision 295-F

> **Added 2026-09-10** by `docs/research/p3-25-ecpi-apportionment.md` (P3-25), read off the ATO Legal
> Database (ITAA 1997 `PAC/19970038`; ITAR (1997 Act) 2021 `REG/20210206`) and the **Federal Register
> of Legislation** authorised Word compilation of `F2021L00206` (Compilation No. 16, 27 June 2026).
> Every row **retrieved 2026-09-10** unless it says otherwise.
>
> **§3.1 carries the two rates (15% / 0%). §3.11 is how a fund gets from one to the other in a year
> where an interest changes phase.** Subdivision 295-F is ss 295-385, 295-387, 295-390, 295-395,
> 295-400, 295-405, 295-407 and 295-410 — bounded by probe, §7.2 failures #1–#5.

| Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|---|
| **Two mechanisms, not two alternatives** | s 295-385 exempts income **from** particular assets, traced, **"at a time"**; s 295-390 exempts **one proportion** of the whole year's income. A fund can be on both at once: s 295-390(2)(d) and the *average value of current pension liabilities* definition each strip out what s 295-385 has already exempted | — | **constant** — structural | ITAA 1997 ss 295-385(1), (3), (4); 295-390(1), (2)(d), (3) | 2026-09-10 | primary-verified |
| **Segregated method — s 295-385(3) route** | assets dealt with **solely** for RP liabilities, **AND** the trustee obtains an **actuary's certificate** before the return's lodgment date | — | **constant** — structural | ITAA 1997 s 295-385(3)(a), (b) | 2026-09-10 | primary-verified |
| **Segregated method — s 295-385(4) route: NO CERTIFICATE** | assets dealt with for the **sole purpose** of discharging RP liabilities in respect of **prescribed** benefits — **allocated, market linked and account-based pensions** (reg 295-385.01(a)) — need **no actuary's certificate at all**. Gated by (5): at all times in the year, such RP liabilities as the fund had must have been prescribed ones | — | **constant** — structural | ITAA 1997 s 295-385(4), (5) · **ITAR (1997 Act) 2021 reg 295-385.01(a)** (fetched twice, ATO Legal Database and FRL authorised compilation, agreeing) | 2026-09-10 | primary-verified — **CORRECTS the register's standing claim that "the segregated method needs an actuary's certificate". For a household SMSF paying an account-based pension it does not** |
| **Proportionate method ALWAYS needs a certificate** | s 295-390(4): the liability values "**must be specified in an actuary's certificate** obtained by the trustee … before the date for lodgment". s 295-390(6)'s roll-forward shortcut still needs certificates for the asset values | — | **constant** — structural | ITAA 1997 s 295-390(4), (5), (6) | 2026-09-10 | primary-verified |
| **s 295-390(7) is a DEAD LETTER** | the one escape from (4)–(6) applies only to benefits "prescribed by the regulations for the purposes of this subsection", and **no such regulation has ever been made** | — | **constant** — structural | Absence verified against the **complete** ITAR (1997 Act) 2021, `F2021L00206` Compilation No. 16 (27 Jun 2026): Subdiv 295-F of those Regulations contains **reg 295-385.01 and nothing else** | 2026-09-10 | **argument from the absence of a regulation, verified exhaustively against the full compilation — NOT bare `primary-verified` (R6)**. U35 |
| **The exempt proportion** | `average value of current pension liabilities ÷ average value of superannuation liabilities`, **for the income year**. Numerator excludes liabilities backed by segregated current pension assets; denominator excludes those and segregated non-current assets | — | **constant** — structural | ITAA 1997 s 295-390(3) | 2026-09-10 | primary-verified |
| **The Act does not prescribe the averaging** | "average value **for the income year**" — no daily, monthly or opening/closing rule anywhere in the Act or the Regulations. **Daily time-weighting is actuarial convention, not law**, and every figure derived from it inherits that label | — | — | ITAA 1997 s 295-390(3), read against the exhaustive ITAR check above | 2026-09-10 | **`unverified` — U37. This is why the exempt proportion is a Setting or a bound and never a computation presented as certified** |
| **A part-year change is NOT apportioned by days** | under s 295-385 nothing is apportioned — each dollar is exempt or not by **when and from what** it was derived. Under s 295-390 the year is **not split**: one proportion covers income derived months before any pension existed. A mid-year start reaches the answer only through a lower **average** liability value | — | **constant** — structural | ITAA 1997 ss 295-385(1)(b), (3); 295-390(1), (3) | 2026-09-10 | primary-verified — **this is the answer O60 was opened for** |
| **The days formula that exists is for RSAs only** | **s 295-410** apportions by `days the pension was paid ÷ days the RSA existed`, reached through **s 295-405 item 3** ("for **part** of the period"). Parliament had the part-year problem and a days formula, and wrote it only for RSAs | — | **constant** — structural | ITAA 1997 ss 295-405 items 2, 3; 295-410 | 2026-09-10 | **inference from an express provision elsewhere in the same Subdivision (*expressio unius*) — NOT bare `primary-verified` (R6)**. T130 |
| **Deemed segregation** | if **every** interest in the fund is in the retirement phase at a time, the fund has no other liabilities, so **all** its assets are dealt with solely for RP liabilities and — for an account-based pension — are **segregated current pension assets automatically**, with no certificate and no trustee act. **It arrives on the conversion day by itself** | — | **constant** — structural | ITAA 1997 s 295-385(4) read with reg 295-385.01(a)(iii); **corroborated by ss 295-385(9), (10)(a) and 295-387(3)**, each of which presupposes it | 2026-09-10 | **a reading of the operative words applied to a fund with no other liabilities, corroborated three times inside the statute — NOT bare `primary-verified` (R6)**. T127 |
| **The s 295-385(9) election exists ONLY for the mid-year case** | available **iff** all interests were in the retirement phase **at one or more times** in the year (9) **and not at all times** (10)(a) **and** the assets are not DSFA (10)(b). Its effect: **none** of the fund's assets are segregated current pension assets for the **whole** year (8) → s 295-390 for the whole year | — | **constant** — structural | ITAA 1997 s 295-385(8), (9), (10), inserted by **No 10 of 2022** Sch 5 item 1, eff 1 Apr 2022, applicable **2021-22 and later** | 2026-09-10 | primary-verified |
| **The election changes the number, and which way depends on WHEN income was derived** | worked end to end at research §5.2: one member, $900,000, converting 14 Dec 2026, $45,000 income of which a **$15,000 gain realised 20 Nov**. Segregated → **$4,296.58**. Election → **$3,069.86**. Same facts, **$1,226.71 apart**; move the gain to March and the sign flips | 2026-27 | — | ITAA 1997 ss 295-385(1), (8)–(10); 295-390(1), (3) | 2026-09-10 | primary-verified as to the provisions; the figures assume **daily averaging (U37)** and even accrual of the non-gain income |
| **Disregarded small fund assets FORCE the proportionate method** | if s 295-387(2) is met, the fund's assets are DSFA **at all times in the year** and can be **neither** segregated current pension assets (s 295-385(7)) **nor** segregated non-current assets (s 295-395(3)); the (9) election is also removed (s 295-385(10)(b)). **Whole year, proportionate, certificate required, no choice** | — | **constant** — structural | ITAA 1997 ss 295-387(1), (2); 295-385(7), (10)(b); 295-395(3) | 2026-09-10 | primary-verified — **this is the disqualifying-circumstances rule** |
| **The DSFA threshold — $1.6 million, FROZEN** | s 295-387(2)(c)(i), a literal in the subsection, **never amended**. **Absent from the s 960-265 indexation table**, whose opening words are "This table sets out the provisions for which indexation is relevant" | — | **constant — NOT config** | ITAA 1997 s 295-387(2)(c)(i) · **s 960-265** (complete table: items 1, 2, 3, 3A, 5–10, 10A, 10B, 10C, 11, 12, 13, 13A, 14) | 2026-09-10 | primary-verified as to the literal; **the non-indexation is an argument from absence in an exhaustive table — label it (R6)**. **T126: never wire it to the general transfer balance cap ($2,100,000 for FY2026-27)** |
| **DSFA timing — the conversion year is usually NOT caught and the next one IS** | (c)(i) and (c)(ii) are both tested **just before the start of the income year**. In the year a first pension commences the person was not a retirement phase recipient at the previous 30 June, so (c)(ii) fails and the fund is **not** DSFA — in the very year the apportionment question arises | — | **constant** — structural | ITAA 1997 s 295-387(2)(c) | 2026-09-10 | **a reading of the timing words applied to a first conversion — labelled inference**. T129 |
| **DSFA reaches across funds** | (c)(ii) applies "**whether or not the fund is the superannuation income stream provider**", so a large **APRA-fund** pension held by one spouse can taint the couple's SMSF | — | **constant** — structural | ITAA 1997 s 295-387(2)(c)(ii) | 2026-09-10 | primary-verified. T128 |
| **DSFA has its own escape** | a fund all of whose assets would, but for s 295-385(7), be segregated current pension assets **at all times** in the year is **not** DSFA — so a fund that is 100% retirement phase all year is never DSFA | — | **constant** — structural | ITAA 1997 s 295-387(3), inserted by **No 111 of 2021** Sch 3 item 1, eff 1 Oct 2021, applicable 2021-22 and later | 2026-09-10 | primary-verified |
| **Prescribed streams: the segregated pool is capped at the account balance** | assets supporting a prescribed benefit are **not** segregated current pension assets "to the extent that the **market value** of the assets **exceeds the account balance** supporting the benefit" | — | **constant** — structural | ITAA 1997 s 295-385(6) | 2026-09-10 | primary-verified — **NOT MODELLED: needs per-asset market values. Refuse** |
| **No Commissioner, no form, no notification** | Subdivision 295-F prescribes **no** form, deadline, content, lodgment or retention rule for the s 295-385(9) election, and involves the Commissioner nowhere. The words *Commissioner*, *approved form* and *notify* do not appear in any of the five core sections | — | — | search of the full retrieved text of ss 295-385, 295-387, 295-390, 295-395, 295-400 | 2026-09-10 | **argument from absence across the retrieved Subdivision — label it (R6)**. U36 — **and it is why a user-stated method cannot be checked against anything** |
| **"actuary" is defined; "actuary's certificate" is not** | *actuary* means **a Fellow or Accredited Member of the Institute of Actuaries of Australia**. The Dictionary has **no** definition of *actuary's certificate*, so the Act prescribes no form or content for it | — | **constant** — structural | ITAA 1997 s 995-1 (`actuary`); absence verified by searching the full retrieved s 995-1 document | 2026-09-10 | primary-verified as to *actuary*; **the absence is an argument from absence in an exhaustive dictionary — U34** |
| **The fund-level proportion decomposes into a per-interest time weight** | with one pooled return, liability value = account balance, daily averaging and no segregated assets, `exempt income = Σ_p (income of interest p × fraction of the year p was in retirement phase)` — **arithmetically identical** to s 295-390(3). Verified to the cent at research §5.1 | — | computed | derived from ITAA 1997 s 295-390(3) | 2026-09-10 | **arithmetic given four stated assumptions; the assumptions are `unverified` — U37.** This is what makes `fundEarningsTax`'s per-interest shape salvageable: it needs a **fraction**, not a boolean |
| **The conservative bound** | exempt proportion ∈ [0,1] under s 295-390(3) and exempt income ∈ [0, the year's income] under s 295-385, so on **any** facts under **either** method, `fund earnings tax ≤ 15% × taxable earnings`. Charging a conversion year wholly at the accumulation rate is a **provable ceiling** | — | computed | ITAA 1997 ss 295-385(1), 295-390(1), (3) | 2026-09-10 | **arithmetic bound, not an estimate.** Its failure mode **understates the household** (R1's direction) and, unlike R5, **nothing points the other way** — the conversion, the s 294-25 credit and the cap check all still happen |
| **Only SMSFs** | for an APRA-regulated fund the member sees a crediting rate net of tax; method choice, elections and certificates are invisible to them. Everything in §3.11 bites **only for an SMSF** | — | — | structural | 2026-09-10 | **O69 — scope the §3.11 refusals to SMSF interests, or they fire on households they do not apply to** |

### 8.2 Proposed trap rows for §1

| # | Trap | Wrong move / fixture |
|---|---|---|
| **T126** | **The s 295-387 DSFA threshold is $1.6m and is FROZEN.** | **Wrong move:** wires it to the general transfer balance cap, putting it at $2,100,000 for FY2026-27. **Fixture:** a member with TSB $1,800,000 at 30 June 2026 who was a retirement phase recipient then → the fund **is** DSFA and **must** use the proportionate method; the wired version exempts it. **Test:** s 960-265's complete table contains no s 295-387 item. |
| **T127** | **Deemed segregation is not chosen.** | **Wrong move:** reads "segregated" as "the trustee segregated", so a fund that goes 100% retirement phase mid-year is treated as unsegregated. **Fixture:** research §5.2 branch 1 — $4,296.58, not $3,069.86, unless the s 295-385(9) election was actually made. |
| **T128** | **DSFA reaches across funds.** | **Wrong move:** tests the $1.6m TSB and the retirement-phase-recipient limb against **this** fund's interests. **Fixture:** spouse with a $1.9m APRA-fund pension and a $200,000 SMSF interest → the SMSF is DSFA. |
| **T129** | **DSFA is tested at the PREVIOUS 30 June.** | **Wrong move:** tests it "as at the conversion", catching the conversion year and missing the next. **Fixture:** first pension commences 14 Dec 2026 → **not** DSFA in FY2026-27; DSFA in FY2027-28 if TSB at 30 Jun 2027 exceeds $1.6m. |
| **T130** | **A days-based split of the conversion year's earnings is not the law under either method.** | **Wrong move:** implements `earnings × days_in_retirement_phase / 365` at 0% and the rest at 15%, on the strength of s 295-410. **Fixture:** research §5.2 — that formula gives $3,069.86, which is the **proportionate** answer, on facts where the fund is on the **segregated** method and owes $4,296.58. s 295-410 is an **RSA** provision. |
| **T131** | **s 295-385(5)'s "at all times during the income year" is satisfied vacuously in the conversion year.** | **Wrong move:** reads (5) as requiring RP liabilities to have existed all year, and so denies the certificate-free (4) route in exactly the year it is needed. **Confidence: a reading (U34).** Record it, do not bury it. |
| **T132** | **The naive lift of `MidYearPhaseChangeError` lands on the flattering extreme.** | **Wrong move:** deletes the `phaseHeldForTheWholeYear` guard and uses the interest's stated phase. **Fixture:** research §5.1 — returns **$4,500.00** where the statutory figure is **$7,569.86**, understating the fund's tax by **$3,069.86** in the first year of the strategy the tool exists to evaluate. **This is the mutation guard for the whole refusal.** |
| **T133** | **The exempt proportion is applied to the WHOLE year's income, including income derived before any pension existed.** | **Wrong move:** applies the proportion only to post-conversion income, double-counting the part-year effect. **Fixture:** research §5.1 — $75,000 × 32.7123%, not $75,000 × (199/365) × 32.7123%. |
| **T134** | **An ATO 404 body is ~101.5 KB from the Legal Database and ~257 KB from a guidance path.** | **Wrong move:** memorises register §10 recipe 12's "~257 KB" as a success/failure signal. **Every one of this pass's twelve Legal Database 404s would read as a success.** Read the status code. |

### 8.3 Proposed mutation test for §9

**M-P3-25-1** — *the conversion year must never be cheaper than the bound without a stated exempt
proportion.* Given Example A's facts and no ECPI Setting, an implementation that returns any fund
earnings tax **below $11,250.00** for FY2026-27 fails. The mutation this catches is exactly T132's,
and it is the one an implementer reaches for first.

### 8.4 Proposed open items for §8

| # | Item | Status | What would close it |
|---|---|---|---|
| **O67** | **No ATO guidance or PCG on the ECPI method choice was retrieved** | Nine URL forms 404'd; there is no usable ATO search from this environment. Would corroborate the deemed-segregation reading (T127) and the averaging convention (U37) | A working guidance URL, or a PCG DocID — the prefix is **`COG`**, per §7.5 recipe 3 |
| **O68** | **The Explanatory Memorandum to No 10 of 2022 was not retrieved** | The FRL OData API exposes only the Act's own Epub/Pdf/Word for `C2022A00010`. `aph.gov.au` answers 200 to `curl` but needs a bill id. Would corroborate T127 and §3.2 directly, since the (8)–(10) election was enacted for the mid-year case | The bill id for the Treasury Laws Amendment (Enhancing Superannuation Outcomes For Australians and Helping Australian Businesses Invest) Bill 2021, then the APH EM route |
| **O69** | **§3.11 bites only for SMSFs, and nothing in the model distinguishes fund types** | The refusals proposed at §6.3 will fire on APRA-fund interests, for which ECPI apportionment is invisible to the member | An SMSF/APRA discriminant on the interest, or an explicit statement that all modelled super is SMSF |
| **O70** | **Three shipped artefacts assert a cross-pass negative that was never checked** | `src/core/superPhase.ts`, `src/core/ttrPaymentRange.ts` and register §3.10 all say s 295-390 "has never been retrieved by any pass". It had been, on 2026-09-04, and the register's own §10 said so. **Process finding, not a legal one** | A rule: verify a cross-pass negative against register §10 before writing it down, and never assert one in a refusal message |
| **O71** | **Whether the s 295-385(9) election, once made, is recorded anywhere the tool could read** | The Act prescribes no form (U36). It is presumably a trustee minute and possibly a field in the SMSF annual return | The SMSF annual return instructions, if a live URL can be found |

### 8.5 Proposed unknowns for §8

| # | Unknown |
|---|---|
| **U34** | **Whether s 295-385(5)'s "at all times during the income year" is satisfied vacuously** in a year where the fund had no RP liabilities for part of it. Load-bearing for the certificate-free (4) route in the conversion year (T131). Nothing retrieved contradicts the vacuous reading, and s 295-390(7) uses the identical formulation, but no authority was found either way. Also: **"actuary's certificate" is undefined**, so the Act prescribes no form, content or retention rule for the document the whole proportionate method rests on |
| **U35** | **Whether a regulation for s 295-390(7) was ever contemplated.** The absence is verified against the complete current compilation (§7.3 #1) — but the check is of the **current** compilation, not of every repealed version since 2007. A repealed regulation would not change today's answer and would explain the subsection |
| **U36** | **How a s 295-385(9) election is evidenced.** No form, no notification, no Commissioner. A user-stated method cannot be validated against anything the tool can reach |
| **U37** | **The averaging convention in s 295-390(3).** Daily time-weighting is used throughout research §5 and is stated convention, not law. Two actuaries may certify different percentages on identical data, both correctly. Every figure in §5 that depends on `199/365` inherits this label |

---

## 9. Corrections owed to existing artefacts

**None of these were applied. This is the list.**

### 9.1 `docs/assumptions-register.md`

1. **§10, the *Transfer balance cap — P3-9* correction block (≈ line 2969).** Its unresolved
   contradiction is now resolved: **the *Franking — P1-11* list is correct; O52 and O60 are wrong.**
   Replace the "P3-25 should settle which and correct the loser" paragraph with the finding at §6.6,
   including the point that the franking pass's own notes were accurate and the error was a later
   pass asserting an unchecked negative (**O70**).
2. **§8, O52.** Close it. Subdivision 295-F has now been retrieved in full (ss 295-385, 295-387,
   295-390, 295-395, 295-400, 295-405, 295-407, 295-410), and its assertion that "neither section has
   been read in this project" was false when written. Record **why** it was false, not just that it
   was.
3. **§8, O60 / U30.** Close it and point to **§3.11**. Its two premises are both wrong: s 295-390 was
   retrievable and had been retrieved, and s 295-385(3)(b) is not the whole of the certificate rule.
4. **§8, U23.** Its retrieval dependency ("the retrieval that would close it — ss 295-385 and 295-390
   and the definition of *segregated current pension assets* — is O52's and O60's, and those two are
   live") is discharged. U23 stays **moot under R1** on its own terms, but the reason given for it
   being open no longer holds.
5. **§3.10, the row "Every conversion is mid-year, so every conversion year needs ECPI
   apportionment"** (≈ line 1531). Its "Value / rule" cell is wrong in both halves. Replace with a
   pointer to §3.11 and the corrected certificate position.
6. **§3.10's closing note (≈ line 1691)** — same correction.
7. **§10 recipe 12** — the 257 KB claim. See §7.4 and **T134**.
8. **§10 recipes** — add §7.5's six new or corrected recipes.
9. **§10, the *Franking — P1-11* block** — leave it exactly as it is. It was right.
10. **§1 traps** — add T126–T134 (§8.2). **§8** — add O67–O71 and U34–U37 (§8.4, §8.5). **§9
    mutation tests** — add M-P3-25-1 (§8.3). **§3** — add the new **§3.11** (§8.1).

### 9.2 `src/core/superPhase.ts`

**Comment and message corrections only; no behavioural change is proposed here — §6.3 step 3 is the
user's to rule on.**

11. **The header comment's "A mid-year change of phase" bullet** asserts that "ITAA 1997 s 295-390
    has never been retrieved by any pass" and that "s 295-385(3)(b) shows the segregated method needs
    an actuary's certificate, so the choice of method is not free either". The first is false; the
    second is backwards for a household SMSF. The conclusion — that the choice is not free — survives,
    but for the reasons at §3.
12. **`MidYearPhaseChangeError`'s message** carries the same two errors, in capitals: "s 295-390, the
    proportionate method, HAS NEVER BEEN RETRIEVED BY ANY PASS (open items O60 and O52)". **A shipped
    refusal that misstates its own grounds is worse than a refusal**, because the next agent acts on
    the grounds and not on the register.
13. **`TrisRetirementPhaseNotModelledError`'s message** ends by citing O60 as an independent blocker.
    Still true if the refusal stands; must be rewritten if §6.3 is adopted.

### 9.3 `src/core/ttrPaymentRange.ts`

14. **Lines ~68 and ~139** both carry "ECPI apportionment (O60, ITAA 1997 s 295-390 never
    retrieved)". Same correction.

### 9.4 `TODO.md`

15. **P3-25** should be rewritten: the retrieval half is done, the analysis half is in this document,
    and what remains is the **user ruling at §6.3** plus the register application at §9.1. Its current
    text — "Never retrieved by any pass" — repeats the error.
16. **P3-8's conversion limb (≈ line 732)** — its BLOCKER note should point at §6.3's recommendation
    rather than at O60.

---

## 10. What this document does not settle

Stated as gaps, not smoothed over:

* **The user ruling at §6.3.** A recommendation, not a decision.
* **The averaging convention** (U37) — and therefore the exact cents in §5, which are reproducible
  but not certified.
* **The vacuous-truth reading of s 295-385(5)** (U34, T131) — load-bearing for Example B branch 1.
* **Whether an ATO PCG or guidance page states the ECPI method-choice rules** (O67) and **the
  Explanatory Memorandum to No 10 of 2022** (O68). Both would corroborate readings this document
  labels as inferences; neither would change a number.
* **Fund-type scoping** (O69) — the refusals proposed here are SMSF refusals and the model has no
  SMSF/APRA discriminant.
* **How the s 295-385(9) election is evidenced** (O71).
* **Anything about the fund's taxable earnings BASE** — realised gains and the one-third discount,
  franked distributions, contributions already taxed. This document takes the base as stated by the
  caller, exactly as `fundEarningsTax` does. Example B's $15,000 gain is "net of the one-third
  discount, composed elsewhere" and that composition is not settled anywhere in this project.
