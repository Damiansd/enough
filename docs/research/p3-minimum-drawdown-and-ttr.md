# P3 — The pension minimum drawdown and the TTR maximum: SIS Regulations reg 1.06(9A) and Schedule 7

**Scope:** register open item **O36 / TODO P3-10** (account-based pension minimum drawdown) and the **part-year limb of P3-8** (transition-to-retirement maximum). One instrument only: *Superannuation Industry (Supervision) Regulations 1994*, reg 1.06(9A) and Schedule 7. Nothing else.
**Retrieval date:** 2026-09-08 · **Forecast year:** FY2026-27

---

## 0. Headline answers

| Question | Answer | Confidence |
|---|---|---|
| **(a) Rounding DIRECTION** | **Nearest $10, ties rounded UP.** Sch 7 cl 5, verbatim: *"rounded to the **nearest** 10 whole dollars. If the amount ends in an **exact 5 dollars**, it is to be **rounded up**."* Not a ceiling, not a floor. On `$987,654.32 × 5%` → **`$49,380`** (ceiling's `$49,390` is wrong). | primary-verified |
| **(b) ORDER of rounding vs pro-rating** | **Pro-rate first. Round ONCE, LAST.** Cl 1(1) is *"Subject to clauses 3, 4, 4A and 4B"*, so pro-rating is inside the clause-1 determination; cl 5 then rounds *"an amount **determined under this Schedule**"*. On the constructed discriminating case (`$1,009,078`, 4%, commencing 1 Aug 2026) → **`$36,940`**, not `$36,930`. | primary-verified as to text; **the ordering is a reading of that text**, corroborated to the dollar by ATO's own worked example |
| **(c) Pro-rating BASIS** | **DAYS**, and the commencement day itself counts. Sch 7 cl 3: *"proportionally to the number of days in the financial year that **include and follow** the commencement day."* The word "month" does not appear in Schedule 7. On `$500,000 × 4%`, commencing 1 Oct 2026 (273/365) → **`$14,960`** (months' `$15,000` is wrong). | primary-verified |
| **(c′) The pro-rating DENOMINATOR** | Days in the financial year — **365, or 366 in an FY containing 29 February**. **The instrument does not state the denominator.** ATO does. FY2026-27 has 365 days. | **secondary-only** — see U2 |
| **(d) WHICH BALANCE in a commencement year** | **The balance on the COMMENCEMENT DAY**, and the **full annual factor is applied to it directly** — the part-year adjustment lives entirely in cl 3. Sch 7 cl 1(2)(a)(ii). Plus an unmodelled floor: cl 1(2)(b) substitutes the **withdrawal benefit** if it exceeds the account balance. | primary-verified |
| **Age used for the factor** | Age at **1 July**, **except** in the commencement year, where it is age on the **commencement day**. Sch 7 cl 1(2). | primary-verified |
| **Pension commencing on or after 1 June** | **NIL. No payment is required for that financial year.** Sch 7 cl 4, and it is **operative**, not permissive (contrast reg 1.06(9) for market-linked pensions). The brief's recollection is correct and the register already carries it. | primary-verified |
| **COVID-era halving — in force for FY2026-27?** | **No.** Sch 7 cl 4A is a **closed enumeration of named years** ending at *1 July 2022*; cl 4B names only 2011-12 and 2012-13. `1 July 2026` is in neither. Last extension was `F2022L00498`, eff. 2 Apr 2022 — **no amendment since.** FY2026-27 uses the full 4/5/6/7/9/11/14 table. | primary-verified |
| **The formula itself** | `account balance × percentage factor` — **no divisor in the formula**; the `/100` is carried by the word "percentage". Read out of the FRL .docx's embedded WMF drawing records **and** confirmed as plain text in the ATO Legal Database. | primary-verified |
| **TTR: is the 10% maximum PRO-RATED for a part year?** | **NO.** The maximum lives in **reg 6.01(2)(b)(ii)**, not Schedule 7; Sch 7 cl 3 is confined to *"the minimum total payment"* and cannot reach it. **The asymmetry the brief suspected is real.** | primary-verified as to the three provisions; **the conclusion is an argument from the absence of a provision** — see U1 — corroborated by an explicit ATO instruction |
| **TTR: is the maximum ROUNDED?** | **NO.** Sch 7 cl 5 is confined to *"an amount determined under **this Schedule**"*. ATO states it flatly: *"don't round the maximum annual pension payment amount to the nearest $10."* | same basis as the row above |
| **TTR: which balance for the maximum in a commencement year?** | **The pension account balance on the commencement day** (reg 6.01(2)(b)(ii)(B)) — the **same day** the minimum uses, but **without** the cl 1(2)(b) withdrawal-benefit substitution. | primary-verified |
| **TTR: does the 10% vary with age?** | **No.** Flat 10% at every age, against a minimum that is age-banded. | primary-verified (reg 6.01(2)) |
| **TTR minimum** | **The whole of Schedule 7**, pulled in by reg 6.01(2)(b)(i) → reg 1.06(9A). Age-banded, pro-rated, rounded, nil for a June commencement. 4% is only the under-65 band. | primary-verified |
| **Net effect on the TTR corridor in a commencement year** | **The floor drops; the ceiling does not move.** TRIS commencing 1 Oct 2026, $500,000, age 61: **minimum `$14,960`, maximum `$50,000`**. Commencing on/after 1 June: **minimum nil, maximum still the full 10%**. | primary-verified derivation |

**Register §3.9 corrections required — see §5 (DISCREPANCIES).** Every factor and boundary in §3.9 is confirmed exactly; what is missing is the rounding direction, the rounding order, the days basis, the commencement-year balance, and the whole of the TTR asymmetry.

---

## RAW PRIMARY TEXT — captured first, analysed below

**Instrument:** *Superannuation Industry (Supervision) Regulations 1994*, Statutory Rules No. 57, 1994, made under the *Superannuation Industry (Supervision) Act 1993*.
**FRL title id:** `F1996B00580` · **Compilation No. 159** · **compilation date 1 July 2026** · includes amendments to `F2026L00133`. This is the compilation in force for FY2026-27.
**Retrieved:** 2026-09-08, Word (.docx) compilation, both volumes, via `api.prod.legislation.gov.au/v1/documents/find(...)`.

### Schedule 7 — *Minimum payment amount for a superannuation income stream* — verbatim

> *(paragraph 1.05(11A)(a), subparagraph 1.05(11A)(b)(i), paragraph 1.06(9A)(a), subparagraph 1.06(9A)(b)(i) and regulation 1.07D)*
>
> **1(1)** Subject to clauses 3, 4, 4A and 4B, the amount of payments mentioned in paragraph 1.05(11A)(a) or 1.06(9A)(a) is the amount worked out using the formula: **[formula rendered as an embedded object — see §Formula below]**
>
> **1(2)** In subclause (1):
> **account balance** means:
> (a) the amount of the annuity or pension account balance:
>  (i) **on 1 July in the financial year in which the payment is made**; or
>  (ii) **if that year is the year in which the annuity or pension payments commence — on the commencement day**; or
> (b) **if the amount of the annuity or pension account balance under paragraph (a) is less than the withdrawal benefit** to which the beneficiary would be entitled if the annuity or pension were to be fully commuted — **the amount of the withdrawal benefit**.
> **percentage factor** means the percentage factor specified in the item in the table that applies to the beneficiary because of the beneficiary's age on:
> (a) 1 July in the financial year in which the payment is made; or
> (b) if that is the year in which the annuity or pension payments commence — **the commencement day**.
>
> **2(1)** The amount of payments mentioned in (a) subparagraph 1.05(11A)(b)(i) and sub-subparagraph 1.05(11A)(b)(ii)(D); and (b) subparagraph 1.06(9A)(b)(i) and sub-subparagraph 1.06(9A)(b)(ii)(C); is the amount worked out using the formula: **[embedded object]**
> **2(2)** In subclause (1): **purchase price** means the total amount paid as consideration to purchase the income stream. **percentage factor** means the percentage factor specified in the item in the table that applies to the beneficiary because of the beneficiary's age on: (a) the commencement day; or (b) the anniversary of the commencement day.
>
> **3** For the determination of the minimum total payment **in the year in which the commencement day** of the annuity or pension occurs, if that day is a day other than 1 July, **the applicable value specified in column 3 of the table must be applied proportionally to the number of days in the financial year that include and follow the commencement day**.
>
> **4** **If the commencement day of the annuity or pension is on or after 1 June in a financial year, no payment is required to be made for that financial year.**
>
> **4A** For the financial years commencing on **1 July 2008, 1 July 2009, 1 July 2010, 1 July 2019, 1 July 2020, 1 July 2021 and 1 July 2022**, the amount of payments is **half** of the amount worked out using the formula in clause 1.
>
> **4B** For the financial years commencing on **1 July 2011 and 1 July 2012**, the amount of payments is **75%** of the amount worked out using the formula in clause 1.
>
> **5** **An amount determined under this Schedule is to be rounded to the nearest 10 whole dollars. If the amount ends in an exact 5 dollars, it is to be rounded up to the next 10 whole dollars.**
>
> **Table**
>
> | Item | Age of Beneficiary | Percentage factor |
> |---|---|---|
> | 1 | Under 65 | 4 |
> | 2 | 65—74 | 5 |
> | 3 | 75—79 | 6 |
> | 4 | 80—84 | 7 |
> | 5 | 85—89 | 9 |
> | 6 | 90—94 | 11 |
> | 7 | 95 or more | 14 |

### reg 1.06(9A) — verbatim (the operative standard)

> **(9A)** Rules for the provision of a benefit (the **pension**) meet the standards of this subregulation if the rules ensure that **payment of the pension is made at least annually**, and also ensure that:
> **(a)** for a pension in relation to which there is an **account balance attributable to the beneficiary** — the **total of payments in any year** (excluding payments by way of commutation but including payments under a payment split) is **at least the amount calculated under clause 1 of Schedule 7**; and
> **(b)** for a pension that is not described in paragraph (a): [(i) 100%-of-purchase-price / clause 2 limb; (ii) lifetime or fixed-term limb; (iii) subreg (2) standards; (iv) grandfathered 2007 rules] … and
> **(c)** the pension is transferable to another person only on the death of the beneficiary (primary or reversionary, as the case may be); and
> **(d)** the capital value of the pension and the income from it cannot be used as a security for a borrowing.

Paragraph **(a)** is the account-based-pension limb this project models. Clause 2 of Schedule 7 (purchase-price basis) is **not** used for an account-based pension.

Also captured, for contrast — **reg 1.06(9)** (market-linked pensions) makes the 1-June rule *permissive* ("are not prevented from meeting the standards … by reason only that the rules provide that, if the commencement day … is on or after 1 June …, no payment is required"), whereas Schedule 7 clause 4 is *operative* for the account-based limb.

### reg 6.01(2) — definition of **transition to retirement income stream** — verbatim (pension limb)

> **transition to retirement income stream** means: … **(b)** a pension provided from a superannuation fund, the rules of which:
> **(i)** are rules to which **paragraph 1.06(9A)(a)** applies and that meet the standards of **subregulation 1.06(9A)**; and
> **(ii)** allow total payments (excluding payments by way of commutation but including payments under a payment split) made in a financial year to amount to **no more than 10% of the pension account balance**:
>  **(A)** **on 1 July in the financial year in which the payment is made**; or
>  **(B)** **if that year is the year in which the pension commences — on the commencement day**;
> unless the pensioner has satisfied a condition of release in respect of which the cashing restriction for preserved benefits and restricted non-preserved benefits is 'Nil'; and
> **(iii)** comply with paragraph (b) of the definition of **non-commutable allocated pension** in subregulation 6.01AB(1), as if it were such a pension.

(The annuity limb, para (a)(ii), is word-for-word identical on "annuity account balance".)

**There is no pro-rating clause and no rounding clause anywhere in this definition.** Schedule 7 clause 3 (pro-rating) and clause 5 (rounding) are expressly confined to "the minimum total payment" / "an amount determined under **this Schedule**".

### The two Schedule 7 formulae — read directly out of the embedded images

Both formulae are **embedded WMF drawings** inside the FRL .docx (`word/media/image13.wmf` for clause 1(1), `word/media/image14.wmf` for clause 2(1)), reached via `r:id="rId62"` / `r:id="rId63"` in `word/document.xml`. The docx text layer renders them as **empty paragraphs**, and the FRL PDF's text layer is **subset-font-encoded and not readable without the ToUnicode CMaps**. They were read by parsing the WMF record stream directly (`EXTTEXTOUT` / `TEXTOUT` / `CREATEFONT` records).

**Clause 1(1)** — `image13.wmf`, records in order:
```
CREATEFONT face=Times New Roman ; EXTTEXTOUT x=14  y=90  'account balance  percentage factor.'
CREATEFONT face=Symbol          ; EXTTEXTOUT x=692 y=90  '´'          <- Symbol-font 0xB4 = MULTIPLICATION SIGN ×
```
The Symbol `´` is drawn at x=692, i.e. **into the double-space gap** between "balance" and "percentage". The trailing `.` is the sentence full stop.

> **clause 1(1) formula = `account balance × percentage factor`**

**Clause 2(1)** — `image14.wmf`, identical structure:
> **clause 2(1) formula = `purchase price × percentage factor`**

**There is no fraction bar and no divisor in either image.** The complete WMF record dump contains **no `LINETO` records at all** — only the two `MOVETO`s that position the two text runs. So the formula is a bare product; the `/100` is carried by the word **"percentage"** in "percentage factor" and by the table's column heading **"Percentage factor"** (values `4, 5, 6, 7, 9, 11, 14`). A factor of `4` means **4%**.

**Confidence:** primary-verified (read out of the instrument's own embedded drawing records, not inferred).

### Second independent primary route — ATO Legal Database renders the formula as **text**

The ATO Legal Database carries the SIS Regulations under the act code prefix **`REG`**, not `PAC`, and the brief's **`Sch<N>-` prefix rule is correct**: `REG%2F19940057%2FSch7-5` returns HTTP 200 where `REG%2F19940057%2FSch7` returns a 302 to nothing and `REG%2F19940057%2F5` returns 404.

`https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1` renders clause 1(1) as **plain text, with the multiplication sign as a real character**:

> *Subject to clauses 3, 4, 4A and 4B, the amount of payments mentioned in paragraph 1.05(11A)(a) or 1.06(9A)(a) is the amount worked out using the formula:* **account balance × percentage factor.**

**This is an exact match for the WMF read above.** The formula now has two independent primary confirmations.

**Amendment histories, from the same source (load-bearing for the COVID question):**

| Clause | History |
|---|---|
| Sch 7 cl 1(1) | amended SLI No 83 of 2011 (added "4B"); SLI No 46 of 2009 (added "4A"). Formula itself never amended. |
| Sch 7 cl **3** | **no history note — never amended since the original** |
| Sch 7 cl **4** | **no history note — never amended since the original** |
| Sch 7 cl **4A** | inserted SLI No 46 of 2009 (2008-09); extended SLI No 106 of 2009 (+2009-10); SLI No 237 of 2010 (+2010-11); **Act No 22 of 2020** (+2019-20, 2020-21); **F2021L00833** (+2021-22); **F2022L00498, effective 2 April 2022** (+2022-23). **No amendment after F2022L00498.** |
| Sch 7 cl **4B** | inserted SLI No 83 of 2011 (2011-12); extended SLI No 2 of 2012 (+2012-13). No later amendment. |
| Sch 7 cl **5** | **no history note — never amended since the original** |

---

## 2. Numbered findings

### Finding 2.1 — The minimum: what is multiplied by what

- **Name:** Account-based pension minimum annual payment
- **Rule:** SISR **Sch 7 cl 1(1)**: `minimum = account balance × percentage factor`, where **account balance** and **percentage factor** are the Sch 7 cl 1(2) defined terms. Engaged by **reg 1.06(9A)(a)**, which requires *"the total of payments in any year (excluding payments by way of commutation but including payments under a payment split) is **at least** the amount calculated under clause 1 of Schedule 7"*, and separately requires *"payment of the pension is made **at least annually**"*.
- **It is a floor on the annual total, not a payment schedule.** Nothing in the instrument dictates when in the year the money moves, only that at least one payment is made and the year's total clears the floor.
- **Commutations are excluded from the total; payment splits are included.**
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural
- **Source URL:** FRL `F1996B00580` Compilation No. 159 (Word, vol. of Schedules), `word/media/image13.wmf` · cross-confirmed https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified

### Finding 2.2 — The percentage-factor table

- **Name:** Schedule 7 percentage factors
- **Rule:** Sch 7 Table, column 3 "Percentage factor", keyed on column 2 "Age of Beneficiary":

| Item | Age of Beneficiary | Percentage factor |
|---|---|---|
| 1 | Under 65 | **4** |
| 2 | 65 — 74 | **5** |
| 3 | 75 — 79 | **6** |
| 4 | 80 — 84 | **7** |
| 5 | 85 — 89 | **9** |
| 6 | 90 — 94 | **11** |
| 7 | 95 or more | **14** |

- **Register §3.9's factors and boundaries are confirmed exactly.** Bands are inclusive of both endpoints; there are no gaps and no overlaps.
- **The age used is not always the age at 1 July.** Sch 7 cl 1(2) *"percentage factor"*: age on **1 July in the financial year in which the payment is made**, or — **if that is the year in which the pension payments commence — the age on the commencement day**. A pension commencing 1 October in the year the Person turns 65 (birthday 15 September) uses **5%**, not the 4% their 1 July age would give.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** **constant** — hard numbers in the instrument's own table, never indexed, amended only by amending regulation. (See §5.1 for why the *year multiplier* beside them should nevertheless be config.)
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-5 (the table is rendered under clause 5) · FRL Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified

### Finding 2.3 — **(a) THE ROUNDING DIRECTION: nearest $10, with exact $5 rounding up**

- **Name:** Schedule 7 rounding rule
- **Rule:** **Sch 7 cl 5**, verbatim and in full: *"An amount determined under this Schedule is to be **rounded to the nearest 10 whole dollars**. If the amount ends in an **exact 5 dollars**, it is to be **rounded up** to the next 10 whole dollars."*
- **This is `round-half-up to the nearest $10`. It is not a ceiling and it is not a floor.** The second sentence exists solely to break the `.5` tie upward; without it "nearest" would be ambiguous at exactly $5.
- **The brief's discriminating case, resolved:** `$987,654.32 × 5% = $49,382.716`. Nearest $10 → **`$49,380`**. Ceiling would give `$49,390`, which is **wrong**.
- Note the tie-break is on an **exact 5 whole dollars** — e.g. `$49,385.00` → `$49,390`. `$49,385.01` is already nearer to `$49,390` anyway, and `$49,384.99` rounds to `$49,380`. Implemented as half-up on the tenth-of-a-dollar this is a single rule, not two.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** **constant** — `MIN_DRAWDOWN_ROUNDING_INCREMENT = $10`, half-up
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-5 · FRL Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified
- **Corroboration (secondary):** ATO, *Income stream (pension) rules and payments*, last updated 29 Apr 2026: *"The amount is rounded to the nearest 10 whole dollars. If the amount ends in exactly 5 dollars, it is rounded up to the next 10 whole dollars."* — a verbatim restatement.

### Finding 2.4 — **(b) THE ORDER: pro-rate first, round ONCE, LAST**

- **Name:** Order of Schedule 7 clause 3 against clause 5
- **Rule:** Three textual signals, all pointing the same way:
  1. **Sch 7 cl 1(1) is expressly *"Subject to clauses 3, 4, 4A and 4B"*.** The pro-rating in cl 3 and the multipliers in cl 4A/4B are therefore *inside* the clause-1 determination — they modify what clause 1 produces.
  2. **Sch 7 cl 5 speaks of *"An amount **determined under this Schedule**"*** — the output of the Schedule as a whole, i.e. after cl 3 has done its work. It is not attached to clause 1 and does not fire mid-computation.
  3. **Clause 5 is a single sentence describing a single rounding.** There is no textual room for rounding twice.
- **So: `round10( balance × factor × days ÷ days_in_year )`. One rounding, at the very end.**
- **A discriminating worked case** (constructed to separate the two orders): balance **$1,009,078**, age under 65 (factor 4%), pension commencing **1 August 2026** → 334 days from and including 1 Aug 2026 to 30 Jun 2027, over 365.
  - **Statutory order:** `1,009,078 × 4% = 40,363.12`; `× 334/365 = 36,935.72`; `round10` → **`$36,940`** ✔
  - **Round-first order:** `round10(40,363.12) = 40,360`; `× 334/365 = 36,932.71`; `round10` → `$36,930` ✘
  - These are the two figures the brief flagged. **The statutory order gives `$36,940`.**
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural
- **Source URL:** cl 1(1) https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1 · cl 3 `…Sch7-3` · cl 5 `…Sch7-5` · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified as to the text; the ordering is a **reading of that text** and is corroborated to the dollar by the ATO worked example in Finding 2.5
- **Corroboration (secondary, but decisive):** the ATO's own worked example rounds **once, at the end, after pro-rating** — see Finding 2.5. There is no ATO example anywhere that rounds the un-pro-rated annual figure first.

### Finding 2.5 — **(c) THE PRO-RATING BASIS: DAYS, inclusive of the commencement day**

- **Name:** Part-year pro-rating of the minimum
- **Rule:** **Sch 7 cl 3**, verbatim: *"For the determination of the minimum total payment in the year in which the commencement day of the annuity or pension occurs, **if that day is a day other than 1 July**, the applicable value specified in column 3 of the table must be applied **proportionally to the number of days in the financial year that include and follow the commencement day**."*
- **Days, not months. Explicitly.** The word "months" appears nowhere in Schedule 7.
- **The commencement day itself counts** — *"the number of days … that **include and follow** the commencement day"*.
- **The brief's discriminating case, resolved:** `$500,000`, under 65 (4%), commencing **1 October 2026**. Days from and including 1 Oct 2026 to 30 Jun 2027 = `31+30+31+31+28+31+30+31+30 = 273`. FY2026-27 has 365 days.
  `500,000 × 4% × 273/365 = $14,958.904…` → `round10` → **`$14,960`**.
  A months basis would give `500,000 × 4% × 9/12 = $15,000`, which is **wrong**.
- **Note what clause 3 literally pro-rates: the *percentage factor*, not the annual amount.** *"the applicable value specified in column 3 of the table must be applied proportionally"*. The ATO applies the proportion to the annual amount instead. **The two are algebraically identical** — `(f · d/D) · B ≡ (f · B) · d/D` — and neither is rounded before the multiply, so the outputs are bit-identical. This is a difference of exposition, not of result, but it is worth recording because it means **there is no intermediate "pro-rated percentage factor" that needs rounding.**
- **The denominator is not stated in the instrument.** Clause 3 says "proportionally to the number of days …" without naming what it is a proportion *of*. The only coherent reading is days in the financial year — 365, or 366 in a financial year containing 29 February — and the ATO states that expressly. See **U2**.
- **Financial year:** current law, applies FY2026-27 (365 days: 1 Jul 2026 – 30 Jun 2027 contains no 29 February)
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-3 · FRL Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified (days basis, inclusive of commencement day); the **denominator** is `secondary-only`
- **Corroboration (secondary), ATO *Income stream (pension) rules and payments*, last updated 29 Apr 2026, quoted verbatim:**
  > *"When the pension starts after 1 July, the minimum payment amount for the first year is calculated proportionately to the number of days remaining in the financial year, starting from the pension start day. To calculate the minimum payment amount, multiply the minimum **annual** payment amount by the remaining number of days in the financial year and divide by 365 (or 366 in a leap year). That is: **Minimum payment amount = minimum annual payment amount × (remaining number of days ÷ 365 (or 366))**"*
  >
  > *"**Example: pension starts after 1 July.** Thavi starts an account-based pension on 1 January 2023 at age 66. His pension account balance on the start day is $250,000. The minimum annual payment amount would be $6,250 (2.5% of $250,000). However, as the pension started on 1 January 2023, the required minimum amount is calculated proportionately from the start day to the end of the financial year. This is calculated as: $6,250 (minimum annual payment amount) × 181 (days remaining in the year) ÷ 365 (2023 is not a leap year) = $3,099. $3,099 rounded up to the nearest 10 whole dollars so the minimum payment required for 2022–23 is **$3,100**."*

  **This example independently confirms four things at once:** (i) days basis; (ii) **181** days from and including 1 Jan 2023 to 30 Jun 2023 — inclusive of the start day; (iii) the **commencement-day balance** is used, not a 1 July balance; and (iv) **rounding happens once, after pro-rating** — `6,250 × 181/365 = 3,099.315`, rounded to `$3,100`. (The 2.5% is the FY2022-23 **halved** factor for age 66 under cl 4A, which also confirms cl 4A's mechanics.)

### Finding 2.6 — **(d) WHICH BALANCE in a commencement year: the commencement-day balance, with a withdrawal-benefit floor**

- **Name:** Schedule 7 "account balance"
- **Rule:** **Sch 7 cl 1(2)**, verbatim:
  > **account balance** means: **(a)** the amount of the annuity or pension account balance: **(i)** on **1 July in the financial year in which the payment is made**; or **(ii)** **if that year is the year in which the annuity or pension payments commence — on the commencement day**; or **(b)** **if the amount of the annuity or pension account balance under paragraph (a) is less than the withdrawal benefit** to which the beneficiary would be entitled if the annuity or pension were to be fully commuted — **the amount of the withdrawal benefit**.
- **Answer to (d): the commencement-day balance, and the annual factor is applied to it directly — then clause 3 pro-rates.** There is no scaling of the balance and no annualisation of it. A pension commencing 1 October with $500,000 uses the full $500,000 and the full 4%; the part-year adjustment lives entirely in clause 3.
- **A floor the register does not record.** Paragraph (b) substitutes the **withdrawal benefit** whenever it exceeds the account balance. For a plain account-based pension in an APRA fund the two are ordinarily the same number, so it is inert; it bites where exit fees, an unallocated reserve, or a surrender value make them differ. **The model should record it as an explicit assumption (`accountBalance === withdrawalBenefit`) rather than silently ignore it.**
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1 · FRL Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified

### Finding 2.7 — The 1 June rule: **nil, and it is operative, not permissive**

- **Name:** Late-commencement nil minimum
- **Rule:** **Sch 7 cl 4**, verbatim and in full: *"If the commencement day of the annuity or pension is **on or after 1 June** in a financial year, **no payment is required to be made for that financial year**."*
- **The brief's "vague sense" is correct, and the instrument says so flatly.** It is **nil**, not a reduced amount, and it is an **operative** clause of Schedule 7 — clause 1(1) is expressly subject to it. Contrast **reg 1.06(9)**, which for *market-linked* pensions makes the same rule merely permissive (*"Rules … are **not prevented** from meeting the standards … by reason only that the rules provide that, if the commencement day … is on or after 1 June …, no payment is required"*). For the account-based limb the relief is automatic; the fund's rules need say nothing.
- **The boundary is `>= 1 June`, so a 1 June commencement is nil.** Clause 3 and clause 4 do not overlap ambiguously: clause 4 simply switches the whole determination off.
- **Register §3.9 already carries this** ("nil if commenced on or after 1 June") and is **confirmed correct**.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** **constant** — `MIN_DRAWDOWN_NIL_FROM = 1 June`
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4 · FRL Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified
- **Corroboration (secondary):** ATO, same page: *"If the pension starts from 1 June in a financial year, no minimum payment is required for that financial year."*
- **Note:** clause 4 has **no amendment history at all** — unamended since the Schedule was made.

### Finding 2.8 — The COVID/GFC halving has **fully lapsed** and does not apply to FY2026-27

- **Name:** Pension drawdown relief multiplier
- **Rule:** **Sch 7 cl 4A**: *"For the financial years commencing on **1 July 2008, 1 July 2009, 1 July 2010, 1 July 2019, 1 July 2020, 1 July 2021 and 1 July 2022**, the amount of payments is **half** of the amount worked out using the formula in clause 1."* **Sch 7 cl 4B**: *"For the financial years commencing on **1 July 2011 and 1 July 2012**, the amount of payments is **75%** of the amount worked out using the formula in clause 1."*
- **Both clauses are closed enumerations of named years.** They are not sunset clauses and they do not "expire" — they simply do not list FY2026-27. **1 July 2026 is not in either list.** The relief was extended four separate times, each time by an amending regulation that added another named year; the **last such amendment was `F2022L00498`, effective 2 April 2022, which added 1 July 2022 and nothing further.** The compilation in force on 1 July 2026 (No. 159) shows no later amendment to either clause.
- **Answer: for FY2026-27 the factors are the full Schedule 7 table — 4% / 5% / 6% / 7% / 9% / 11% / 14%. No halving, no 75%.**
- **Financial year:** FY2026-27 (and every year from FY2023-24 onward on the current text)
- **Config or constant:** see §5.1 — the *shape* is a year-keyed multiplier and belongs in **config**, defaulting to `1.0`; the *value for FY2026-27* is `1.0`
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-4A · `…Sch7-4B` · FRL `F1996B00580` Compilation No. 159, compilation date 1 July 2026 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified
- **Corroboration (secondary):** ATO, same page, lists the relief years as 2008-09 … 2012-13 and 2019-20 … 2022-23, then states: *"The minimum payment amount returned to normal … **from the 2023–24 income year and onwards**."*

---

## 3. Question 2 — TTR, the part-year limb

### Finding 3.1 — Where the 10% maximum actually lives, and it is **not** in reg 1.06(9A)

- **Name:** TTR maximum annual payment limit
- **Rule:** The 10% cap is **not in reg 1.06(9A) and not in Schedule 7**. It is a limb of the **reg 6.01(2) definition of *transition to retirement income stream***, para **(b)(ii)** for a pension (para (a)(ii), word-for-word identical, for an annuity):
  > *allow total payments (excluding payments by way of commutation but including payments under a payment split) made in a financial year to amount to **no more than 10% of the pension account balance**: **(A)** on **1 July in the financial year in which the payment is made**; or **(B)** if that year is the year in which the pension commences — **on the commencement day**; unless the pensioner has satisfied a condition of release in respect of which the cashing restriction for preserved benefits and restricted non-preserved benefits is 'Nil'*
- reg 6.01(2)(b)(i) separately requires the rules to be *"rules to which paragraph 1.06(9A)(a) applies and that meet the standards of subregulation 1.06(9A)"* — **so a TRIS carries the full Schedule 7 minimum, unchanged, on top of the 10% ceiling.** The minimum and the maximum come from two different provisions with two different machineries. That is the structural reason the asymmetry below is real.
- **The "unless" is the switch-off:** once the Person satisfies a nil-cashing-restriction condition of release, the 10% limb ceases to constrain — the income stream becomes an ordinary retirement-phase account-based pension with a minimum and no maximum.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** **constant** — `TTR_MAX_RATE = 0.10`, a hard figure in the definition, never indexed
- **Source URL:** https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2F6.01%282%29 · FRL `F1996B00580` Compilation No. 159 · **Retrieval date:** 2026-09-08 · **Confidence:** primary-verified

### Finding 3.2 — **THE ASYMMETRY IS REAL: the 10% maximum is NOT pro-rated and NOT rounded**

This is the finding the brief was looking for, and it holds on the primary text.

| | Minimum (Sch 7 via reg 1.06(9A)(a)) | Maximum (reg 6.01(2)(b)(ii)) |
|---|---|---|
| Where the rule lives | Schedule 7 | the reg 6.01(2) definition |
| Rate | age-banded, 4%–14% | flat **10%**, **never varies with age** |
| Part-year pro-rating | **YES** — Sch 7 cl 3, days basis | **NO — no such provision exists** |
| Rounding | **YES** — Sch 7 cl 5, nearest $10 half-up | **NO — no such provision exists** |
| Nil if commenced on/after 1 June | **YES** — Sch 7 cl 4 | **NO — the full 10% is available** |
| Balance in a commencement year | commencement-day balance (cl 1(2)(a)(ii)) | commencement-day balance (para (B)) — **same** |
| Withdrawal-benefit floor on the balance | **YES** — cl 1(2)(b) | **NO — plain "pension account balance"** |
| COVID/GFC multiplier | **YES** — cl 4A/4B (spent) | **NO — the maximum was never reduced** |

- **Why, on the text.** Sch 7 cl 3 is confined by its own words to *"the determination of the **minimum total payment**"*. Sch 7 cl 5 is confined to *"an amount determined under **this Schedule**"*. The 10% maximum is determined under **reg 6.01(2)**, not under Schedule 7, so **neither clause reaches it**. There is no pro-rating or rounding provision anywhere in reg 6.01(2), reg 6.01AB, or reg 1.06(9A).
- **The practical consequence is a genuine widening of the corridor in the commencement year.** A TRIS commencing 1 October 2026 on a $500,000 balance for a 61-year-old has a **minimum of $14,960** (4% pro-rated over 273/365 and rounded) and a **maximum of $50,000** (the flat 10%, unreduced). In a full year the same account's corridor is $20,000 – $50,000. The floor drops; the ceiling does not move.
- **And clause 4 makes the extreme case:** a TRIS commencing **on or after 1 June** has a minimum of **nil** and a maximum of the **full 10%** — a whole year's ceiling available in under a month.
- **Financial year:** current law, applies FY2026-27
- **Config or constant:** structural
- **Source URL:** reg 6.01(2) https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2F6.01%282%29 · Sch 7 cll 3 and 5 as above · **Retrieval date:** 2026-09-08
- **Confidence:** **primary-verified as to the text of all three provisions.** The conclusion "not pro-rated, not rounded" is an **argument from the absence of a provision** — a negative — and negatives from a single instrument deserve corroboration. It has it, explicitly (below). Label the *conclusion* `primary-verified`, but see **U1** for the one thing that would make it airtight.

- **Corroboration (secondary — ATO guidance, and it is unusually direct).** ATO, *Transition to retirement income streams (TRIS)*, last updated 2 April 2025, under the heading **"Calculating the maximum annual pension payment limit"**, quoted verbatim:
  > *"When calculating the maximum annual pension payment limit for a TRIS:*
  > *• **don't reduce the maximum annual pension payment limit for a financial year if the TRIS started in that year on a day after 1 July***
  > *• **the 10% rate does not vary with the member's age***
  > *• **don't round the maximum annual pension payment amount to the nearest $10.**"*

  Three bullets, one for each half of the asymmetry, phrased as instructions **not** to apply the Schedule 7 machinery. This is as close as ATO guidance gets to answering a question the instrument answers only by silence.

  The same page also confirms the balance: *"The total payments made in a year must not exceed 10% of the account balance on the start date of a TRIS for the year it starts, or on 1 July for each subsequent year."*

### Finding 3.3 — What the TTR minimum is, for completeness

- reg 6.01(2)(b)(i) pulls in **the whole of reg 1.06(9A)**, hence **the whole of Schedule 7**. So a TRIS minimum is the **full age-banded table**, pro-rated and rounded exactly as in §2 — **not a fixed 4%**.
- Register §3.9's "TTR minimum drawdown 4% (under 65)" is right for a Person under 65 and **only** for a Person under 65. A TRIS held by a 65-year-old who has not met a nil-restriction condition of release takes **5%**. Preservation age is 60 (register §3.9), so the modelled TTR window is ages 60–64 and 4% is the practical answer — but the config should carry the table, not the single number. See **D2**.
- **Confidence:** primary-verified

### Finding 3.4 — Exceeding the maximum is catastrophic, not marginal

Not asked, but it changes how the cap should be enforced in code. ATO, same page: if the 10% limit is exceeded while the member holds only preserved or restricted non-preserved benefits, *"the TRIS ends for income tax purposes **at the start of that income year**"* and **every** payment made during the year (not just the excess) becomes a super lump sum, assessable at marginal rates without offsets, plus a payment-standards breach.

**Implication:** the TTR maximum is a **hard constraint the model must never breach**, not a soft target to optimise against. If a forecast wants more than 10% in a TTR year, the correct answer is that the plan is infeasible, not that the surplus is drawn and taxed. `secondary-only` (ATO guidance; the underlying mechanism is ITAA 1997 s 307-70 / TR 2013/5, which was **not** retrieved — out of scope for this brief).

> **AUDIT CORRECTION — stamped in place 2026-09-10 by the P3-9 pass.** Both sources named above
> have since been retrieved (`docs/research/p3-transfer-balance-cap.md` §D and its §7 fetch log).
> The paragraph above is preserved as written; the following supersedes its closing citation.
>
> - **The s 307-70 citation was wrong.** ITAA 1997 **s 307-70 contains no cessation rule at all** —
>   it is a bare delegation, *"has the meaning given by the regulations"*. The operative definition
>   is **ITAR (1997 Act) 2021 s 307-70.02(1)**, which remains unfetched (**O58 / U32**).
> - **TR 2013/5 was retrieved in full**, so the *mechanism* is **`ruling-verified`**, not
>   `secondary-only` — ¶¶18–20, 100–101 and Example 6.
> - **Two consequences this finding did not carry.** The fund **loses ECPI for the whole income
>   year** (¶19), and the stream **dies permanently** (¶20): a breach forces commutation and the
>   commencement of a *new* stream, with the proportioning rule re-struck. Not merely a bad year.
> - **But the application to the 10% MAXIMUM stays `secondary-only`** (**O61 / U31**). TR 2013/5's
>   reasoning runs reg 1.06(1) → 1.06(9A) → Schedule 7, which is the **minimum**; only ¶18's
>   general words reach the maximum. **Do not cite TR 2013/5 as stating the 10%-breach
>   consequence**, and do not upgrade this label to match the mechanism's.
>
> The finding's *practical* implication is unchanged and is in fact strengthened: infeasible, not
> taxed.

---

## 4. The mechanism, assembled

### 4.1 Order of operations — minimum

```
reg 1.06(9A)(a): total payments in the year >= clause 1 amount, and at least one payment is made

Sch 7 cl 4    if commencementDay is in this FY and commencementDay >= 1 June
                  -> minimum = 0, STOP                          (nil, not reduced)

Sch 7 cl 1(2) "account balance" B:
                  if this FY is the commencement FY -> balance on the commencement day
                  else                              -> balance on 1 July of this FY
                  if B < withdrawalBenefit          -> B = withdrawalBenefit

Sch 7 cl 1(2) "percentage factor" f:
                  age on 1 July of this FY, EXCEPT
                  if this FY is the commencement FY -> age on the commencement day
                  -> table lookup: <65:4  65-74:5  75-79:6  80-84:7  85-89:9  90-94:11  95+:14

Sch 7 cl 3    if this FY is the commencement FY and commencementDay != 1 July
                  d = days from and including commencementDay to 30 June
              else
                  d = D                                         (full year, proportion = 1)
              D = 365, or 366 if the FY contains 29 February

Sch 7 cl 4A/4B  m = 1/2 for FY starting 1 Jul 2008/2009/2010/2019/2020/2021/2022
                m = 3/4 for FY starting 1 Jul 2011/2012
                m = 1   otherwise  -- including FY2026-27

Sch 7 cl 5    minimum = ROUND_HALF_UP_TO_$10( B x f/100 x d/D x m )   <-- THE ONLY ROUNDING
```

The three multiplicative steps (`f/100`, `d/D`, `m`) commute, and **none of them is rounded individually**, so the order among *them* is immaterial. What is not immaterial is that **clause 5 fires once, after all three**.

### 4.2 Order of operations — TTR maximum

```
reg 6.01(2)(b)(ii):
    if the Person has satisfied a condition of release with a 'Nil' cashing restriction
        -> no maximum at all (and the stream is retirement-phase)
    else
        B_max = pension account balance
                    on the commencement day, if this FY is the commencement FY
                    else on 1 July of this FY
                (NO withdrawal-benefit substitution -- that is a Schedule 7 concept)
        maximum = 10% of B_max
                (NO pro-rating. NO rounding. NO age variation. NO 1 June rule.)
```

### 4.3 Model-facing summary — integer cents

All balances and amounts in **integer cents**. `factorPct` is the integer from the Schedule 7 table (`4`, `5`, `6`, `7`, `9`, `11`, `14`) — a **percent**, so the divisor 100 is explicit.

```
# ---------- constants (statutory, never indexed) ----------
SCHEDULE_7_FACTORS = [            # (minAgeInclusive, maxAgeInclusive, factorPct)
    (  0,  64,  4),
    ( 65,  74,  5),
    ( 75,  79,  6),
    ( 80,  84,  7),
    ( 85,  89,  9),
    ( 90,  94, 11),
    ( 95, INF, 14),
]
MIN_DRAWDOWN_ROUNDING_STEP_CENTS = 1000        # Sch 7 cl 5 -- $10
MIN_DRAWDOWN_NIL_FROM            = (June, 1)   # Sch 7 cl 4
TTR_MAX_RATE_PCT                 = 10          # reg 6.01(2)(b)(ii)

# ---------- config (year-keyed; FY2026-27 value is 1/1) ----------
minDrawdownReliefMultiplier(fy) -> (num, den)  # Sch 7 cl 4A/4B
    fy starting 1 Jul 2008|2009|2010|2019|2020|2021|2022 -> (1, 2)
    fy starting 1 Jul 2011|2012                          -> (3, 4)
    otherwise                                            -> (1, 1)     # FY2026-27

# ---------- the only rounding primitive ----------
def roundHalfUpToStep(num, den, step):
    # exact nearest-multiple-of `step` of the rational num/den, ties away from zero (up).
    # Sch 7 cl 5: "rounded to the nearest 10 whole dollars ... an exact 5 dollars ... rounded up"
    # All inputs here are non-negative, so ties-up == ties-away-from-zero.
    assert num >= 0 and den > 0
    q = (2*num + den*step) // (2*den*step)      # integer floor division
    return q * step                              # in cents

# ---------- Schedule 7 minimum ----------
def minimumDrawdownCents(fy, commencementDay, accountBalanceCents,
                         withdrawalBenefitCents, ageAtRelevantDay):

    isCommencementYear = (commencementDay is within fy)

    # Sch 7 cl 4 -- nil, not reduced
    if isCommencementYear and commencementDay >= date(fy.startYear, JUNE, 1):
        return 0

    # Sch 7 cl 1(2) "account balance"
    B = accountBalanceCents          # 1 July balance, or commencement-day balance
    if B < withdrawalBenefitCents:   # cl 1(2)(b)
        B = withdrawalBenefitCents

    # Sch 7 cl 1(2) "percentage factor" -- age at 1 July, or at commencement day
    f = lookup(SCHEDULE_7_FACTORS, ageAtRelevantDay)

    # Sch 7 cl 3 -- days, inclusive of the commencement day
    D = daysInFinancialYear(fy)                       # 365, or 366 with a 29 Feb
    d = D
    if isCommencementYear and commencementDay != fy.firstDay:
        d = (fy.lastDay - commencementDay).days + 1   # "include and follow"

    (mn, md) = minDrawdownReliefMultiplier(fy)        # Sch 7 cl 4A/4B -- (1,1) for FY2026-27

    # Sch 7 cl 5 -- ONE rounding, LAST, on the exact rational
    return roundHalfUpToStep(num = B * f * d * mn,
                             den = 100 * D * md,
                             step = MIN_DRAWDOWN_ROUNDING_STEP_CENTS)

# ---------- TTR maximum ----------
def ttrMaximumCents(pensionAccountBalanceCents, hasNilCashingRestrictionCoR):
    if hasNilCashingRestrictionCoR:
        return NO_MAXIMUM                     # reg 6.01(2) "unless ..." -- the limb falls away
    # reg 6.01(2)(b)(ii): flat 10% of the 1 July balance, or the commencement-day balance
    # in the commencement year. NOT pro-rated, NOT rounded, NOT age-varying,
    # and NO withdrawal-benefit substitution.
    return (pensionAccountBalanceCents * TTR_MAX_RATE_PCT) // 100    # floor: it is a ceiling
```

**Where rounding occurs, exactly.**

- **Exactly one place in the minimum: `roundHalfUpToStep`, the final statement.** It is `Sch 7 cl 5` and nothing else. Every input to it is an exact integer ratio — `B` in cents, `f` an integer percent, `d`/`D` integer day counts, `mn`/`md` the integer relief multiplier — so the whole computation is exact until that call. **Do not round `B × f/100` to an annual figure first; do not round the pro-rated factor; do not round the relief multiplier's output.** Each of those introduces a second rounding the instrument does not authorise, and §2.4's worked case shows it changes the answer by $10.
- **Zero places in the TTR maximum.** The `// 100` is integer floor division, not a rounding rule — it is there because the cap is a **ceiling** (`"no more than 10%"`) and money is quantised at the cent, so a fractional cent must be given away, never rounded up into a breach. If the balance in cents is not a multiple of 10 this discards at most 9/10 of a cent. **Do not substitute `roundHalfUpToStep` here** — see §3.2 and ATO's explicit *"don't round the maximum annual pension payment amount to the nearest $10"*.
- **`roundHalfUpToStep` is exact in integer arithmetic and never touches a float.** `(2·num + den·step) // (2·den·step)` is the standard half-up-on-a-rational form. Verified against the three worked cases: `(987,654.32, 5%, full year) → $49,380`; `(500,000, 4%, 273/365) → $14,960`; `(1,009,078, 4%, 334/365) → $36,940`; and against ATO's `(250,000, 2.5%, 181/365) → $3,100`.

### 4.4 Config vs constant

| Key | Value | FY | Kind | Statutory source | Indexation |
|---|---|---|---|---|---|
| `SCHEDULE_7_FACTORS` (7 bands) | 4 / 5 / 6 / 7 / 9 / 11 / 14 | current | **constant** | SISR Sch 7, Table | **none** — hard numbers in the table, amended only by amending regulation |
| `MIN_DRAWDOWN_ROUNDING_STEP` | `$10`, half-up, ties up | current | **constant** | SISR Sch 7 cl 5 | none — never amended |
| `MIN_DRAWDOWN_NIL_FROM` | 1 June | current | **constant** | SISR Sch 7 cl 4 | none — never amended |
| `minDrawdownReliefMultiplier` | **`1` for FY2026-27** | FY-keyed | **config** | SISR Sch 7 cl 4A/4B | **not indexed, but historically amended five times by adding a named year** — see note |
| `TTR_MAX_RATE` | `10%` | current | **constant** | SISR reg 6.01(2)(a)(ii)/(b)(ii) | none |
| pro-rating denominator | `365` / `366` | current | **constant** (derived from the calendar) | SISR Sch 7 cl 3 (implied); ATO states it | — |

**Note on the relief multiplier.** It is tempting to delete clauses 4A/4B as spent history. **Don't.** They are the only precedent for how a shock is applied to this number, and their shape is unambiguous: a **year-keyed multiplier on the formula output, applied before rounding**, never a change to the table. Keeping a `minDrawdownReliefMultiplier(fy)` config that returns `1` for every year gives the model a correctly-shaped slot for the next such regulation and a scenario lever for stress-testing, at the cost of one multiplication. If the relief is instead hard-coded away, the next amendment requires a structural change rather than a config change.

---

## 5. DISCREPANCIES

**D1 — Register §3.9's minimum-drawdown row is right on the numbers and silent on all four things that stopped the build.**
The row reads: *"<65 4% · 65–74 5% · 75–79 6% · 80–84 7% · 85–89 9% · 90–94 11% · 95+ 14%; on the 1 July balance, rounded to $10, pro-rated for part-years, nil if commenced on or after 1 June — config — primary-verified"*. Every factor, boundary and the 1 June rule is **confirmed exactly**. But "rounded to $10" does not say **nearest, half-up**; "pro-rated" does not say **days**; the row does not say **which rounding comes last**; and "on the 1 July balance" is **wrong for a commencement year**, where Sch 7 cl 1(2)(a)(ii) substitutes the **commencement-day** balance. The row should be rewritten to carry all four, and to add the cl 1(2)(b) withdrawal-benefit floor.

**D2 — Register §3.9's "TTR minimum drawdown 4% (under 65) — constant" understates the rule.**
The TTR minimum is **the whole of Schedule 7**, pulled in by reg 6.01(2)(b)(i) → reg 1.06(9A). It is age-banded, pro-rated, rounded, and nil for a June commencement, exactly like any other account-based pension. 4% is merely the band that applies to the 60–64 window the model cares about. It is also mislabelled **constant**: it is a lookup into the same table as the ordinary minimum, and should be **the same config/constant object**, not a separate scalar. Two independent 4%s in the codebase will drift.

**D3 — Register §3.9's "TTR maximum drawdown — 10% of the 1 July balance — constant — primary-verified" is right but dangerously incomplete.**
The 10% and the 1 July balance are confirmed. What the row does not say, and what P3-8's part-year limb turns on: in a **commencement year the balance is the commencement-day balance**, and the maximum is **neither pro-rated nor rounded nor age-varying nor switched off by the 1 June rule**. The row currently reads as if the maximum is the minimum's mirror image. It is not — §3.2. Add the asymmetry to the row, or a future maintainer will pro-rate the maximum "for consistency".

**D4 — The register cites the TTR maximum to no provision, and it is not where one would look.**
The 10% cap is in the **reg 6.01(2) definition of *transition to retirement income stream***, paras (a)(ii)/(b)(ii) — **not** in reg 1.06(9A) and **not** in Schedule 7. Anyone searching reg 1.06(9A) for it will not find it. The register row should carry `SISR reg 6.01(2)(b)(ii)` explicitly.

**D5 — The register's minimum-drawdown row is marked `config`; the parts of it are not all config.**
The **factor table, the $10 rounding step and the 1 June date are constants** — hard numbers in the instrument, never indexed, changed only by amending regulation. What genuinely varies by year is the **cl 4A/4B relief multiplier**, which the register does not mention at all. Splitting the row this way (§4.4) makes the FY-keyed part small and explicit, and stops the factor table being re-checked every year against an indexation that does not exist.

**D6 — The instrument pro-rates the *factor*; the ATO pro-rates the *annual amount*.**
Sch 7 cl 3: *"the applicable value specified in column 3 of the table must be applied proportionally"* — column 3 is the **percentage factor**. ATO: *"multiply the minimum **annual** payment amount by the remaining number of days …"*. These are algebraically identical and neither intermediate is rounded, so the outputs agree exactly. **Recorded only so that a future reader comparing the two texts does not conclude one of them is wrong.** Implement either; §4.3 implements a single exact rational and sidesteps the question.

**D7 — ATO's "If the pension starts *from* 1 June" is looser than the instrument's "*on or after* 1 June".**
Same meaning; the instrument's wording is the one to encode, and it settles that a **1 June commencement is itself nil**.

**D8 — Sch 7 cl 3 does not name its denominator.** See U2. The ATO supplies 365/366. This is the one place in the minimum calculation where the instrument alone is not sufficient.

---

## 6. UNVERIFIED LIST

| # | What is not closed | Impact | Exactly what would close it |
|---|---|---|---|
| **U1** | **"The TTR 10% maximum is not pro-rated and not rounded" is established by the *absence* of a provision, not by a provision.** Sch 7 cl 3 and cl 5 are confined by their own words to the minimum / to "this Schedule", and reg 6.01(2) contains no substitute — I read the whole of reg 6.01(2), reg 1.06(9A) and all of Schedule 7. The reading is corroborated **explicitly and in three separate bullets** by ATO guidance that instructs the reader **not** to pro-rate, **not** to round, and **not** to vary by age. But no primary provision *says* it. | **Low.** The negative reading and the ATO instruction agree, and no competing reading has been found. | An ATO ruling or determination stating it (rather than a web-guidance bullet), or an SMSF auditor contravention-report instruction. The Explanatory Statement to the 2005 regulation that inserted the TRIS definition would also settle intent — **it was not retrieved**. |
| **U2** | **Sch 7 cl 3 does not state the denominator of the proportion.** It says the factor "must be applied proportionally to the number of days in the financial year that include and follow the commencement day" — the numerator only. That the denominator is the number of days in the financial year (365/366) is the only coherent reading and is what ATO states, **but it is not in the instrument.** | **Low**, and bounded: any other denominator would make the proportion exceed 1 or be nonsensical. | An ATO ruling, or the Explanatory Statement to the original 2007 regulation (SLI 2007 No. 50 / the *Superannuation Legislation Amendment (Simplification) Regulations 2007*) that inserted Schedule 7. **Not retrieved.** |
| **U3** | **Whether a leap-year FY uses 366 in the denominator is `secondary-only`.** Same root cause as U2. FY2026-27 is a 365-day year, so **this does not affect the forecast year**; it affects FY2027-28 (which contains 29 Feb 2028). | Very low for FY2026-27; real from FY2027-28 | As U2. ATO states "365 (or 366 in a leap year)" — note ATO says "leap year", meaning the FY containing 29 February, which is the FY *ending* in the leap calendar year. |
| **U4** | **Sub-cent treatment of the TTR maximum.** `10% of the balance` is not necessarily a whole number of cents. §4.3 floors it, because the provision is a ceiling ("no more than") and a breach is catastrophic (§3.4). **The instrument prescribes nothing.** | Negligible (< 1 cent) but the *direction* matters because the consequence of breach is total | Nothing will close this from the instrument. It is a defensible modelling choice; record it as an assumption, not as law. |
| **U5** | **The exact-$5 tie in Sch 7 cl 5 was never observed in any retrieved worked example.** The rule is read directly from the text and is unambiguous, but no ATO example lands on an exact $5. | Negligible ($10 at most, on a measure-zero set of inputs) | An ATO example, or the ATO's own pension-minimum calculator, on a balance engineered to hit an exact $5. |
| **U6** | **The Sch 7 cl 1(2)(b) withdrawal-benefit floor is not modelled and its trigger conditions were not investigated.** It substitutes the withdrawal benefit whenever it exceeds the account balance. For a plain account-based pension the two coincide. | Low for the modelled Household; **would matter for a product with exit fees, a surrender value, or an unallocated reserve** | Nothing further from this instrument — it is already read in full. Closing it means deciding, at the domain level, whether the model's super account can ever have `withdrawalBenefit > accountBalance`. Recommend an explicit assumption that it cannot. |
| **U7** | **Whether a *partial commutation or rollover* mid-year alters the minimum was not researched.** Out of the brief's scope, but ATO's income-streams page says *"The minimum payment amount will be a proportion of the annual amount if the income stream starts, **is commuted or rolled over** part way through the year"* — i.e. clause 3's pro-rating is not the only proportioning event ATO recognises, and the *commutation* limb is **not** in Sch 7 cl 3, which speaks only of the commencement year. | **Medium if the model ever commutes or rolls over a pension mid-year.** Nil for a pension that starts once and runs. | A separate research item against reg 1.06(9A) / TR 2013/5 / ATO's commutation guidance. **Explicitly not attempted here** — the brief confined scope to reg 1.06(9A) and Schedule 7. |
| **U8** | **No Explanatory Statement was retrieved for any of the amending instruments.** They would corroborate intent on U1 and U2 and are freely available on the FRL. | Low | FRL `documents/find(...)` with `type='Explanatory Statement'` (parameter name not verified) against `F2022L00498`, SLI 2007 No. 50, and the 2005 TRIS regulation. **Not attempted** — the operative text answered the brief. |
| **U9** | **FY2026-27-specific figures do not exist and are not expected to.** Nothing in Schedule 7 or reg 6.01(2) is indexed. Compilation No. 159 (compilation date **1 July 2026**) is the compilation in force for FY2026-27 and carries exactly the text reported here. **This is a confirmation, not a gap.** | n/a | n/a |

**Nothing in the deliverable itself is unverified.** The rounding direction, the rounding order, the days basis, the commencement-year balance, the 1 June nil rule and the COVID lapse are all read directly from the instrument's operative text via two independent primary routes, and the ATO's worked example reproduces the combined reading to the dollar. The TTR asymmetry rests on a negative reading of the primary text plus an unusually explicit ATO instruction — U1 is the only item touching the answer itself, and it is corroborated three ways.

---

## 7. Source register

| # | URL | HTTP / size | What it yielded | Class |
|---|---|---|---|---|
| S1 | `https://api.prod.legislation.gov.au/v1/titles?$filter=contains(name,'Superannuation Industry (Supervision) Regulations')&$top=40` | 200 · JSON, 33 titles | Title id **`F1996B00580`**, *Superannuation Industry (Supervision) Regulations 1994*, SR 1994 No. 57, `isPrincipal: true`, `status: InForce`. The other 32 hits are repealed *(Amendment)* instruments. | primary index |
| S2 | `https://api.prod.legislation.gov.au/v1/documents/find(titleid='F1996B00580',asat=2026-09-01,type='Primary',format='Word',uniqueTypeNumber=0,volumeNumber=1,rectificationVersionNumber=0)` | **200 · 363,776 B · .docx** | **Compilation No. 159, compilation date 1 July 2026**, includes amendments to `F2026L00133`. **This is the SCHEDULES volume** (the compilation's own front matter calls it "Volume 2"). Full text of Schedule 7 cll 1–5 and the Table. | primary |
| S3 | same as S2 but `volumeNumber=2` | **200 · 471,177 B · .docx** | Same compilation, **the REGULATIONS volume** ("Volume 1", rr. 1.01–14.39). Full text of reg 1.06(9), 1.06(9A), 1.06(9B), 1.06(9C) and the reg 6.01(2) definition of *transition to retirement income stream*. | primary |
| S4 | `x1/word/media/image13.wmf` (inside S2) | WMF, 1,546 B | **Sch 7 cl 1(1) formula, read out of the drawing records:** `account balance × percentage factor`. `EXTTEXTOUT` in Times New Roman plus a Symbol-font `´` (×) positioned into the word gap. **No `LINETO` records ⇒ no fraction bar ⇒ no divisor.** | primary |
| S5 | `x1/word/media/image14.wmf` (inside S2) | WMF, 1,542 B | **Sch 7 cl 2(1) formula:** `purchase price × percentage factor`. Same structure. (Clause 2 is the non-account-based limb; not used by this project.) | primary |
| S6 | same as S2 but `volumeNumber=0`, or `volumeNumber=3`, or `type='Principal'` | **404** | Nothing. **Recorded because it contradicts the brief** — see §8. | — |
| S7 | same as S2 but `format='Pdf'`, `volumeNumber=1` | 200 · 808,270 B | PDF of the Schedules volume. **Its text layer is subset-font-encoded** — extracting the content streams yields glyph codes, not characters, without the per-font `ToUnicode` CMaps. **The PDF route did NOT work here.** The WMF route (S4) and the ATO Legal Database (S8) did. | primary, unusable as retrieved |
| S8 | `https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch7-1` | 200 · 110,589 B | **Sch 7 cl 1(1) and 1(2) as plain text, including the formula with a real `×` character** — independent confirmation of S4. Plus cl 1(1)'s amendment history. | primary |
| S9 | `…?DocID=REG%2F19940057%2FSch7-3` | 200 · 105,560 B | **Sch 7 cl 3** verbatim (the days-basis pro-rating). **No amendment history — never amended.** | primary |
| S10 | `…?DocID=REG%2F19940057%2FSch7-4` | 200 · 105,367 B | **Sch 7 cl 4** verbatim (1 June nil). **No amendment history — never amended.** | primary |
| S11 | `…?DocID=REG%2F19940057%2FSch7-4A` | 200 · 108,397 B | **Sch 7 cl 4A** verbatim + **full amendment history**: inserted SLI 46/2009; extended SLI 106/2009, SLI 237/2010, Act 22/2020, F2021L00833, and finally **F2022L00498 eff. 2 Apr 2022**. **Nothing after that.** | primary |
| S12 | `…?DocID=REG%2F19940057%2FSch7-4B` | 200 · 107,358 B | **Sch 7 cl 4B** verbatim (75%, 2011-12 and 2012-13) + history (SLI 83/2011, SLI 2/2012). | primary |
| S13 | `…?DocID=REG%2F19940057%2FSch7-5` | 200 · 108,846 B | **Sch 7 cl 5 — the rounding rule — verbatim**, plus the **Table** of percentage factors. **No amendment history — never amended.** | primary |
| S14 | `…?DocID=REG%2F19940057%2F1.06%289A%29` | 200 · 258,952 B | **reg 1.06(9A)** verbatim, all limbs. | primary |
| S15 | `…?DocID=REG%2F19940057%2F6.01%282%29` | 200 · 228,798 B | **reg 6.01(2)** — the *transition to retirement income stream* definition verbatim, both the annuity and pension limbs, plus its amendment history (F2017L00704, SLI 79/2015). | primary |
| S16 | `…?DocID=REG%2F19940057%2FSch7` (no clause suffix) | **302 → empty** | Nothing. **The `Sch<N>-<clause>` form is required.** | — |
| S17 | `…?DocID=REG%2F19940057%2F5` | **404** | Nothing — confirms a bare clause number does not resolve. | — |
| S18 | `…?DocID=PAC%2F19940057%2FSch7`, `SR%2F19940057%2FSch7`, `SIR%2F19940057%2FSch7-5`, `PAC%2F19940057%2F1.06` | **404** ×4 | Nothing. **`PAC` is for Acts; the SIS Regulations use `REG`.** Recorded so the next researcher does not repeat the probe. | — |
| S19 | `https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/self-managed-super-funds-smsf/paying-smsf-benefits/income-stream-pension-rules-and-payments` (last updated **29 April 2026**) | 200 · 483,160 B | The **rounding restatement**, the **pro-rating formula with the 365/366 denominator**, the **Thavi worked example → $3,100**, the **1 June rule**, the **relief-year list**, and *"The minimum payment amount returned to normal … from the 2023–24 income year and onwards."* | secondary (ATO guidance) |
| S20 | `https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/self-managed-super-funds-smsf/paying-smsf-benefits/income-stream-pension-rules-and-payments/transition-to-retirement-income-streams` (last updated **2 April 2025**) | 200 · 408,409 B | **The three "Calculating the maximum annual pension payment limit" bullets** — don't reduce for a part year, doesn't vary with age, don't round to $10. Plus the balance rule and the consequences of breach (§3.4). | secondary (ATO guidance) |
| S21 | `https://www.ato.gov.au/tax-and-super-professionals/for-superannuation-professionals/apra-regulated-funds/paying-benefits/income-streams` | 200 · 310,477 B | *"there's no maximum annual payment amount except for transition to retirement income streams"*; and the commutation/rollover proportioning note behind **U7**. | secondary (ATO guidance) |
| S22 | `https://www.ato.gov.au/api/v1/search?q=…` | 200 but returns **"ATO website currently unavailable"** HTML | Nothing. There is no usable public search API on that path. | — |
| S23 | `https://www.ato.gov.au/tax-and-super-professionals/for-superannuation-professionals/self-managed-super-funds/paying-benefits/pensions/minimum-annual-payments-for-super-income-streams` and `…/withdrawing-and-using-your-super/starting-a-super-pension` | **404** ×2 (genuine ATO 404 pages, ~257 KB) | Nothing. **Guessed ATO content paths do not survive their site reorganisation.** The working URLs (S19–S21) were found via web search, not by guessing. | — |
| — | AustLII | **not fetched** | Not needed — two independent primary routes agreed. (Recorded elsewhere in this repo as Cloudflare-blocked, HTTP 403.) | — |
| — | Explanatory Statements | **not fetched** | See **U8**. | — |

### Fetch guidance — corrections and additions for the next researcher

- ✅ **The brief is right that FRL is the route for a legislative instrument.** `api.prod.legislation.gov.au/v1/titles` + `documents/find(...)` both answer. `type='Primary'` is correct **even for a regulation** — `type='Principal'` 404s on all volumes.
- ✅ **The brief is right that the ATO Legal Database needs a `Sch<N>-` prefix.** `REG%2F19940057%2FSch7-5` → 200; `REG%2F19940057%2FSch7` → 302-to-nothing; `REG%2F19940057%2F5` → 404. **A 404 here really is "wrong identifier", not "no such provision".**
- ✅ **The brief is right that `PAC%2F…` does not apply to an instrument.** The prefix for the SIS Regulations is **`REG`**, and the act code is **`REG%2F19940057%2F<provision>`**. Confirmed on reg 1.06(9A), reg 6.01(2) and all seven Schedule 7 clauses.
- ⚠️ **The brief's "`volumeNumber` other than `0` 404s" does NOT generalise.** It is true only of a *single-volume* instrument. The SIS Regulations are published in **two volumes and `volumeNumber=0` 404s**; the working values are **`1` (the Schedules) and `2` (the regulations)**. **And the numbering is inverted relative to the compilation's own labels** — the compilation's preface says "Volume 1: Parts 1 to 14, regulations 1.01 to 14.39 / Volume 2: Schedules, Endnotes", but `volumeNumber=1` returns the **Schedules** document and `volumeNumber=2` returns the **regulations**. (Both files carry the identical preface, so the label is no help; the per-volume **Contents** list is what identifies which is which.) **Probe `0,1,2,3` and read each document's Contents rather than trusting the index number.**
- ⚠️ **The brief's "the PDF text layer is a reliable second route" did NOT hold here.** This instrument's PDF uses subset fonts with custom encodings; the extracted `Tj`/`TJ` literals are glyph codes, and reconstructing them needs each font's `ToUnicode` CMap. It was abandoned in favour of two routes that worked.
- 🆕 **A formula that a .docx "drops" is usually still in the .docx — as a WMF or EMF under `word/media/`.** Find it by locating `r:id`/`r:embed` in the paragraph after *"using the formula:"* in `word/document.xml`, resolve the id in `word/_rels/document.xml.rels`, then **parse the WMF record stream directly**: `EXTTEXTOUT` (`0x0A32`) and `TEXTOUT` (`0x0521`) carry the literal characters, and `CREATEFONT` (`0x02FB`) names the face, which is how you know a `´` is a Symbol-font **×** and not an acute accent. **The absence of `LINETO` records is positive evidence that there is no fraction bar** — that is how "is there a `/100` in this formula?" was answered without rendering anything. Reading the record stream is faster and more certain than rasterising.
- 🆕 **The ATO Legal Database renders formulae that the FRL .docx embeds as images as *plain text with real Unicode operators*.** For SISR it was the cheapest primary route of all. Try it **before** any image or PDF work.
- 🆕 **Do not guess ATO content URLs.** Two plausible guesses returned genuine 404s (~257 KB pages whose `dcterms.title` is literally "404 - Page not found"). Web search against `allowed_domains: ["ato.gov.au"]` found the live paths immediately. `curl` with a browser User-Agent then works fine — no 403 was encountered on `www.ato.gov.au` in this session.

---

*Researched 2026-09-08 against Federal Register of Legislation **Compilation No. 159** (compilation date **1 July 2026**, includes amendments to `F2026L00133`) of the* Superannuation Industry (Supervision) Regulations 1994 *(`F1996B00580`, SR 1994 No. 57), and the ATO Legal Database rendering of the same instrument (`REG/19940057`). No file under `src/`, `test/`, `TODO.md` or `docs/assumptions-register.md` was modified. Uncommitted by design.*
