# P1-7 — Home Equity Access Scheme: the total capacity formula

Researched 2026-09-03. All retrieval dates below are **2026-09-03**.

**Verdict up front: YES — the capacity formula is now known well enough to code.** The age
component table is reproduced in full below from the legislative instrument itself, cross-checked
against two independent government sources, and the arithmetic is confirmed against three
published worked examples.

## 0. How the sources were obtained (fetch notes)

- `legislation.gov.au` — the SPA HTML is useless to `WebFetch`, but the **Word/PDF download
  endpoints work with plain `curl`**, and the **OData API** at `api.prod.legislation.gov.au/v1/titles`
  enumerates instruments. This is how the age component table, the Act, and all three
  determinations were obtained *as primary text*. Pattern for future passes:
  `https://www.legislation.gov.au/<id>/latest/downloads` → grep for the `.../text/original/word`
  link → `curl` → unzip `word/document.xml`.
- `servicesaustralia.gov.au` — times out under `WebFetch` but **responds fine to `curl` with a
  browser User-Agent**. Previous "timed out" note in concept.md §6 can be retired.
- `guides.dss.gov.au` — **still 403 to everything** (WebFetch and curl, full browser headers,
  referer). Retrieved instead **via the Wayback Machine** (`web.archive.org/web/2025/<url>`),
  which serves the complete unmodified DSS pages. Content is primary Commonwealth policy text;
  the *retrieval channel* is an archive, so it is labelled `primary-via-archive` below.
- `austlii.edu.au` — 403 to both tools. Not needed; the Act was obtained direct.

## 1. The maximum loan formula (the deliverable)

### 1.1 The statutory formula

> **1135A Effect of participation in home equity access scheme — maximum loan available**
> (1) The maximum loan available to a person under the home equity access scheme is the amount
> worked out using the formula:
>
> **age component amount × ( value of real assets ÷ 10,000 )**

Source: *Social Security Act 1991* (Cth) s 1135A(1), compilation in force 1 July 2026,
`https://www.legislation.gov.au/C2004A04121/latest/downloads` (volume 3 Word download).
The formula in the Act is a rendered image; the text above is the image's own accessibility
description embedded in the official Word file, verbatim: *"Start formula age component amount
times start fraction value of real assets over 10,000 end fraction end formula"*.
Confidence: **primary-verified**.

Independently stated the same way by DSS: *"Age component amount × (value of real assets ÷ 10,000)"*
— SS Guide 3.4.5.30. And by Services Australia: *"we round the security value down to the nearest
$10,000. Then we divide it by 10,000 and multiply that by the age component amount."*

### 1.2 Rounding of the security value — s 1135A(2)

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Value of real assets over $10,000 and not a multiple of $10,000 → round **down** to the next lower multiple of $10,000 | s 1135A(2)(a) | SS Act 1991 | primary-verified |
| Value of real assets **less than $10,000** → taken to be **nil** | s 1135A(2)(b) | SS Act 1991 | primary-verified |

Rounding is **down, always** — this is a floor, not a round-to-nearest. Code it as
`floor(value / 10000) * 10000`, or more directly `floor(value / 10000)` as the multiplier.

### 1.3 Whose age — the couple rule

**The YOUNGER member of the couple.** This is settled in the instrument itself, not inferred:

> 4(1) The age component amount is determined to be the amount specified in column 2 … in relation to:
> (a) if the person is not a member of a couple — the age specified in column 1 that the person
> turned on his or her **last birthday**; or
> (b) if the person is a member of a couple — the age specified in column 1 that the **younger
> member of the couple** turned on his or her last birthday.

Source: *Social Security (Home Equity Access Scheme – Age Component Amount) Determination 2019*
(F2019L00420), s 4(1), compilation in force 11 July 2026.
Confirmed identically at SS Act s 1135A(1) definition of *age component amount*, at
SS Guide 3.4.5.30 (*"the age component is based on the age of the YOUNGER partner on their last
birthday"*), and by Services Australia (*"If you have a partner, and they're younger than you,
we'll use their age instead"*). Confidence: **primary-verified**, four sources.

**Age is age at last birthday** — not age next birthday, not age in whole years plus fraction.
A step function that increments on the younger Person's birthday.

### 1.4 ⚠️ The couple structure detail that secondary sources get wrong

A couple does not have *one* loan. **Each member of the couple has their own loan against their
own share of the security**, and each loan uses the *younger* partner's age component:

> "In the case of members of a couple, the age component is based on the age of the YOUNGER
> partner on their last birthday. Although the age component is drawn from a single person, **each
> partner's share of the value of real assets** is used to work out the maximum loan available."
>
> *Example*: A couple aged 72 and 68 offer property valued at $240,000 … The younger partner's
> age is used to determine the age component ($2,850 at age 68), and the maximum loan available
> **for each partner** is calculated as: real assets equal $120,000 minus $45,000 → after rounding
> $70,000; maximum loan for each member of a couple = $2,850 × ($70,000 ÷ $10,000) = **$19,950**.
>
> *Note*: Where one member of a couple owns a greater than 50% share of the securing property,
> **a 50-50 arrangement will operate** where the maximum loan available for an individual applicant
> of a member of a couple is based on 50% share of the securing property. This arrangement also
> applies to members of a couple who are qualified for but not receiving income support payments.

Source: DSS SS Guide 3.4.5.30, `https://guides.dss.gov.au/social-security-guide/3/4/5/30`
(retrieved via `https://web.archive.org/web/2025/…`). Confidence: **primary-via-archive**.

**Net effect for the Household's model:** the *combined* couple capacity is the same number you
get by applying the formula once to the whole security — because 2 × (age component × half the
assets ÷ 10,000) = age component × (all the assets ÷ 10,000). So a Household-level model can use
the single formula on the full security value **provided** the security is jointly owned or the
50-50 rule applies (it does apply here — the note extends it to unequal ownership). But the
*rounding happens per person on the per-person share*, which can cost up to $10,000 of counted
security per Person. Model it per Person to be exact; the error from modelling it once at
Household level is at most `age_component × 1` per Person (≈ $2,700 at age 67).

### 1.5 THE AGE COMPONENT TABLE (full, verbatim)

Dollars of maximum loan per **$10,000** of security value.

| Age (last birthday) | Age component amount | Age (last birthday) | Age component amount |
|---:|---:|---:|---:|
| **55, and each earlier year** | $1,710.00 | 75 | $3,750.00 |
| 56 | $1,780.00 | 76 | $3,900.00 |
| 57 | $1,850.00 | 77 | $4,050.00 |
| 58 | $1,920.00 | 78 | $4,210.00 |
| 59 | $2,000.00 | 79 | $4,380.00 |
| 60 | $2,080.00 | 80 | $4,560.00 |
| 61 | $2,160.00 | 81 | $4,740.00 |
| 62 | $2,250.00 | 82 | $4,930.00 |
| 63 | $2,340.00 | 83 | $5,130.00 |
| 64 | $2,430.00 | 84 | $5,330.00 |
| 65 | $2,530.00 | 85 | $5,550.00 |
| 66 | $2,630.00 | 86 | $5,770.00 |
| 67 | $2,740.00 | 87 | $6,000.00 |
| 68 | $2,850.00 | 88 | $6,240.00 |
| 69 | $2,960.00 | 89 | $6,490.00 |
| 70 | $3,080.00 | **90, and each later year** | $6,750.00 |
| 71 | $3,200.00 | | |
| 72 | $3,330.00 | | |
| 73 | $3,460.00 | | |
| 74 | $3,600.00 | | |

- **Name**: HEAS age component amount table
- **Effective date**: 1 July 2019, **unchanged since**. Instrument compiled 11 July 2026 (Compilation
  No. 1); the only amendment ever made was the 2026 renaming of the scheme (F2026L00944), which
  touched s 1 of the instrument and **not one number in the table**.
- **Config or constant**: **CONSTANT** (`HEAS_AGE_COMPONENT` — a frozen age→dollars lookup).
  It is a legislative instrument, not an indexed figure. It has no indexation mechanism at all:
  the Minister may remake it under s 1135A(3), but it has not moved in seven years. Ship it as a
  hard-coded table stamped `effective 2019-07-01`, not as a user-editable Setting.
- **Sources** (three, independent):
  1. F2019L00420 s 4(2) — `https://www.legislation.gov.au/F2019L00420/latest/downloads`
     (Word download of the 11 July 2026 compilation). **primary-verified**.
  2. Services Australia — `https://www.servicesaustralia.gov.au/age-component-for-loans-under-home-equity-access-scheme?context=22546`
     (page last updated 28 September 2023). **primary-verified**.
  3. DSS SS Guide 3.4.5.30 — `https://guides.dss.gov.au/social-security-guide/3/4/5/30`.
     **primary-via-archive**.
- **Cross-check result**: all three tables agree on **every one of the 36 rows**, to the cent.
- Confidence: **primary-verified**.

### 1.6 Worked examples (from the sources, for use as test fixtures)

| # | Situation | Security | Age used | Calculation | MLA | Source |
|---|---|---|---|---|---|---|
| 1 | Single, 70 | $256,000 | 70 → $3,080 | $250,000 ÷ 10,000 = 25; 25 × $3,080 | **$77,000** | Services Australia |
| 2 | Couple, John 70 / Joe 69 | $256,000 | **69** → $2,960 | 25 × $2,960 | **$74,000** | Services Australia |
| 3 | Single, 70, nominated amount $80,000 | $180,000 | 70 → $3,080 | ($180,000 − $80,000) ÷ 10,000 = 10; 10 × $3,080 | **$30,800** | SS Guide 3.4.5.30 |
| 4 | Couple 72/68, jointly owned, each nominates $45,000 | $240,000 | **68** → $2,850 | per Person: ($120,000 − $45,000) → rounds to $70,000; 7 × $2,850 | **$19,950 each** | SS Guide 3.4.5.30 |

Example 4 is the important fixture: it exercises the per-Person halving, the nominated-amount
deduction, *and* the round-down (75,000 → 70,000, losing $5,000 of security).

### 1.7 Recalculation cadence — a detail that matters for a monthly projection

> "The maximum loan available to a person is NOT a fixed amount that is set permanently. The
> maximum loan available is **recalculated once every 12 months after the person's birthday**
> (or, if applicable, the younger partner's birthday)."

Source: DSS SS Guide 3.4.5.30. **primary-via-archive**.

So capacity is a **step function that increments annually on the younger Person's birthday**, not
a continuously growing quantity. Combined with s 1141 (below), this creates a real mechanic the
forecaster should surface: the debt compounds fortnightly and continuously, while the ceiling it
is chasing rises only once a year.

## 2. Security value, and whether a mortgage reduces capacity

**Yes — an existing mortgage reduces capacity, directly.**

| Name | Value / rule | Config or constant | Source | Confidence |
|---|---|---|---|---|
| Security = equity, not market value | "Your equity is the **market value** of the Australian real estate you offer, **less any existing mortgages or loans**." | input | Services Australia, `security-for-home-equity-access-scheme-loans` (page updated 2 March 2026) | primary-verified |
| Secretary may deduct encumbrances when valuing | s 1133(4)(b): "the Secretary **may** take into account any charge or encumbrance over the property"; and s 1133(4)(a): "**disregard section 1121**" | — | SS Act 1991 s 1133(4) | primary-verified |
| Mortgage does not disqualify | "The presence of a mortgage or reverse mortgage on the property … **does not necessarily disqualify** a person … However, the mortgage should be considered, when valuing the real assets and when calculating the maximum loan available" | — | SS Guide 3.4.5.20 | primary-via-archive |
| **Nominated amount** — Person may voluntarily carve out equity | s 1136(1A)(b); deducted from real assets before the formula. Changeable at any time by signed written request (s 1137) | Journal Entry field | SS Act 1991 ss 1133AA(1), 1136, 1137 | primary-verified |
| Eligible property types | Any Australian real property — principal home, investment property, vacant land, farmland, commercial. **Not** retirement village units without freehold title. | — | SS Guide 3.4.5.20; Services Australia | primary-verified |
| Insurance condition | Buildings insured for **≥ 90% of value**, standard events (fire, escape of liquid, flood, storm, explosion). Loss of adequate insurance can end participation. | constant `HEAS_MIN_INSURANCE_PCT = 0.90` | SS Act s 1133(1)(cc); SS Guide 3.4.5.10; Services Australia | primary-verified |
| Value changes must be notified; MLA moves both ways | "If it increases, you can ask us to increase your MLA. If it decreases, **we'll need to lower your MLA**." | — | Services Australia, `maximum-loan-amount-under-home-equity-access-scheme` | primary-verified |

**Model as:**
`security_value = home_market_value − outstanding_owner_occupied_mortgage − nominated_amount`,
then `MLA = age_component(younger_age) × floor(security_value / 10_000)`.

⚠️ **ADR 0005 tension, and how to resolve it.** ADR 0005 says the home is a *status*, not a value.
HEAS is the one mechanism in the whole model that **genuinely requires a home market value** —
capacity is linear in it. The resolution is that the value is needed **only inside the HEAS
facility**, which defaults off. Recommended shape: keep `HomeStatus` as the means-test primitive
exactly as ADR 0005 mandates, and introduce the market value as an *optional Setting consumed by
nothing but the HEAS capacity calculation* (and, later, `DOWNSIZE`). Nothing in the assets test
should ever read it. That preserves the ADR's actual claim — *"the exemption status is worth more
than its market value"* and *"anyone tempted to reduce the home to `home_value: number` should
read this first"* — because the value becomes a second, subordinate attribute rather than a
replacement for the status. Worth a short ADR amendment note rather than a silent addition.

## 3. The fortnightly income stream cap — 150%

| Name | Value | Effective | Config or constant | Source | Confidence |
|---|---|---|---|---|---|
| Combined pension + HEAS fortnightly cap | **1.5 × maximum payment rate** | 1 July 2019 → current | constant `HEAS_FORTNIGHTLY_CAP_MULTIPLE = 1.5` | SS Act s 1134(1A)(a)(i) | primary-verified |
| The cap **counts the Age Pension already received** | Yes — confirmed | — | — | SS Act s 1134(1A); SS Guide 3.4.5.40 | primary-verified |
| "Maximum payment rate" **includes supplements** | = Step 4 of Module A = maximum basic rate **+ pension supplement + energy supplement + rent assistance** | — | derived | SS Act s 1064, Pension Rate Calculator A, Module A, Step 4 | primary-verified |

The believed position in concept.md §5.10 is **confirmed on both counts**.

s 1134(1A)(a): the rate payable by operation of the scheme is *"1.5 multiplied by the maximum
payment rate"* — the loan is the **difference** between that and what the Person actually
receives. DSS states the mechanic explicitly:

> "The portion of the fortnightly payment that is a loan is the difference between: the total
> fortnightly rate of pension including any relevant supplements a person **actually receives**,
> including the impact of income and assets tests direct deduction … and the total amount they
> have nominated to receive each fortnight up to an allowable limit of 150% of the maximum
> fortnightly pension rate." — SS Guide 3.4.5.40

And on supplements, Services Australia is unambiguous: *"The maximum pension rate we use for a
Home Equity Access Scheme loan **includes any supplements you get** … Pension Supplement, Energy
Supplement, Rent Assistance."*

So: **a full-rate pensioner can draw only the remaining 50%; a $0-entitlement Person can draw the
full 150%.** Both confirmed by worked example (DSS 3.4.5.40 Janet; Services Australia Terry).

```
heas_fortnightly_draw = 1.5 × MPR − age_pension_actually_received
```

### 3.1 Current dollar figures

Age Pension maximum payment rate, **20 March 2026 – 19 September 2026** (homeowner, no Rent
Assistance). Source: `https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get?context=22526`.

| | Single /fn | Couple each /fn | Couple combined /fn |
|---|---:|---:|---:|
| Maximum basic rate | $1,100.30 | $829.40 | $1,658.80 |
| Maximum Pension Supplement | $86.50 | $65.20 | $130.40 |
| Energy Supplement | $14.10 | $10.60 | $21.20 |
| **Maximum payment rate** | **$1,200.90** | **$905.20** | **$1,810.40** |
| Annual (× 26) | $31,223.40 | $23,535.20 | $47,070.40 |
| **150% cap /fn** | **$1,801.35** | **$1,357.80** | **$2,715.60** |
| **150% cap /yr** | **$46,835.10** | **$35,302.80** | **$70,605.60** |

**The $70,605.60 figure in concept.md §5.10 ("~$70,600/yr") is confirmed exact** for a
nil-entitlement Household at current rates.

- **Config or constant**: **CONFIG, dated** — these are the indexed Age Pension rates already in
  the assumptions register, reused. Do **not** duplicate them into a HEAS constant; derive the cap
  from the existing Age Pension rate assumption × 1.5.
- ⚠️ **These rates change on 20 September 2026 — 17 days from today.** Same warning already
  recorded in concept.md §6.
- The Act computes in **annual** terms and divides by **364** for a daily rate (s 1064A1), so
  annual = fortnightly × 26 exactly. No 365/366 drift.

## 4. Lump sum advances

| Name | Value | Config or constant | Source | Confidence |
|---|---|---|---|---|
| Advance cap per 26-fortnight period | **50% of the maximum *ANNUAL* rate of pension** (incl. basic + pension supplement + ES + RA) | constant `HEAS_ADVANCE_CAP_MULTIPLE = 0.5` **of the annual rate** | SS Act s 1134A(3)(a); SS Guide 3.4.5.40 and 1.2.3.50; DVA CLIK 5.4.1 | primary-verified |
| Maximum number of advances | **2** per 26-fortnight period | constant `HEAS_MAX_ADVANCES_PER_PERIOD = 2` | SS Act s 1134A(2)(b) | primary-verified |
| Period definition | 26 fortnights starting on the day the *first* advance was worked out — a **rolling** period per Person, not a calendar or financial year | — | SS Act s 1133AA(1) def. "home equity access scheme advance payment period" | primary-verified |
| Second advance is capped at the *remainder* | s 1134A(3)(b): 0.5 × annual MPR **less the previous amount** | — | SS Act s 1134A(3)(b) | primary-verified |
| Advance also capped by remaining capacity | s 1134A(3)(c): MLA **less** current debt | — | SS Act s 1134A(3)(c) | primary-verified |
| Effect on the fortnightly stream | For the 26 fortnights, fortnightly rate = **max( MPR , 1.5 × MPR − advances taken )** — i.e. floor of **100%** of MPR | — | SS Act s 1134(1A)(b) | primary-verified |

### 4.1 ⚠️ The trap: the two percentages are against DIFFERENT bases

This is the single most error-prone fact in the whole scheme, and it is exactly where secondary
sources go wrong:

- the **150%** is against the **fortnightly** maximum rate;
- the **50%** is against the **annual** maximum rate.

Stated in terms by DVA: *"The maximum fortnightly payment under the scheme, including any actual
pension or ISS entitlement, is 150% of the maximum rate of pension. **The advance payments are
capped at 50% of the annual maximum pension rate.**"* — DVA CLIK 5.4.1. Same in DSS SS Guide
3.4.5.40 and 1.2.3.50.

Arithmetically confirmed three ways:
- DSS worked example (Keith, single): *"The maximum lump sum a participant can access is
  **$15,323.10** ($1,178.70 × 0.5 × 26)"*.
- Services Australia, current rates, single: **$15,611.70** = $1,200.90 × 0.5 × 26. ✓
- Services Australia, current rates, partnered: *"The maximum annual pension amount for a
  partnered person is $23,535.20. This means Olli can get a maximum advance amount of
  **$11,767.60**."* = $905.20 × 0.5 × 26. ✓ (per Person; **$23,535.20** for the Household.)

Had this been read as "50% of the fortnightly rate", the modelled lump sum would have been
**$452.60 instead of $11,767.60 per Person** — a 26× understatement. Flagging it as the specific
thing to guard with a test.

### 4.2 How an advance suppresses the fortnightly stream

DSS worked example (Keith, single, full-rate pensioner):

> Keith wishes to access a lump sum advance of $5,000. The maximum lump sum is $15,323.10.
> Keith's maximum fortnightly HEAS payment will reduce from $589.35 to **$397.04**
> (($15,323.10 − $5,000) ÷ 26) for the next 26 fortnights.

Services Australia's George example (current rates, full-rate single pensioner, $10,000 advance):
$15,611.70 − $10,000 = $5,611.70 ÷ 26 = **$215.83/fn** for 26 fortnights.

So the implementable rule for the fortnightly HEAS component during an advance period is:

```
heas_fn_headroom_annual   = (1.5 × MPR_fn − pension_fn) × 26
heas_fn_during_advance    = max(0, (heas_fn_headroom_annual − advances_in_period) / 26)
```

with the statutory floor from s 1134(1A)(b) meaning a **part- or nil-rate** pensioner who takes
the maximum advance still keeps fortnightly access up to **100%** of MPR, while a **maximum-rate**
pensioner who takes the maximum advance gets **nothing** fortnightly for 26 fortnights (DSS
3.4.5.40 states both cases explicitly).

## 5. Interest rate

| Name | Value | Effective | Config or constant | Source | Confidence |
|---|---|---|---|---|---|
| HEAS compound interest rate | **3.95% per annum** | since **1 January 2022**, unchanged | **CONFIG, dated** `HEAS_INTEREST_RATE = 0.0395` | F2026L00945 s 5 | primary-verified |
| Compounding frequency | **Fortnightly** | — | constant | SS Act s 1135(3) Step 4: *"compound interest at the rate fixed under subsection (4) and **compounding fortnightly**"* | primary-verified |
| Fortnightly periodic rate | **3.95% ÷ 26 = 0.15192308%** per fortnight | — | derived | Services Australia worked examples (below) | primary-verified |
| Set by | **The Minister for Social Services, by legislative instrument** under s 1135(4) — administrative, **not** legislated in the Act, and **disallowable** | — | — | SS Act s 1135(4); F2026L00945 Explanatory Statement | primary-verified |
| Rate history | 4.50% p.a. from 1 January 2020 → **3.95%** from 1 January 2022 | — | — | F2026L00945 Explanatory Statement | primary-verified |
| Notice of change | *"We will tell you if it is going to change."* No statutory notice period found. | — | Services Australia | primary-verified |
| Legacy pre-1996 scheme | **7% simple** interest (not compound), closed to new entrants; irrelevant here | — | F2018L01644 s 5 | primary-verified |

**Instrument**: *Social Security (Home Equity Access Scheme – Rate of Compound Interest)
Determination 2026* (F2026L00945), made 6 July 2026 by the Hon Tanya Plibersek MP, Minister for
Social Services. `https://www.legislation.gov.au/F2026L00945/asmade/2026-07-10/text/original/word`.
s 5: *"the rate at which compound interest is payable under subsection 1135(3) of the Social
Security Act is 3.95 per cent per annum."*

⚠️ **New this year, and worth knowing:** this July 2026 instrument **repealed and remade** the
2021 Determination. Two reasons, both stated in the Explanatory Statement: to rename the scheme,
and because the 2021 Determination *"was inadvertently registered incorrectly"* — as a
**notifiable** instrument when s 1135(4) requires a **legislative** instrument. **The rate itself
did not change.** So: 3.95% has held continuously since 1 January 2022, but the instrument id to
cite is now F2026L00945, not the 2021 one.

### 5.1 The compounding convention, pinned by arithmetic

Services Australia's own worked example fixes the convention to `annual ÷ 26`, **not** `× 14/365`:

| Balance | Stated interest | `r/26` gives | `r × 14/365` gives | Match |
|---:|---:|---:|---:|---|
| $750.00 | $1.14 | $1.1394 → 1.14 | $1.1363 → 1.14 | both |
| $1,501.14 | $2.28 | **$2.2806 → 2.28** | $2.2745 → 2.27 | **`r/26`** |
| $2,253.42 | $3.42 | **$3.4235 → 3.42** | $3.4139 → 3.41 | **`r/26`** |

Source: `https://www.servicesaustralia.gov.au/interest-rate-for-loans-under-home-equity-access-scheme?context=22546`
(page last updated 26 July 2024). Confidence: **primary-verified** (arithmetic derivation from a
primary worked example).

Also confirmed against their long-horizon examples: John, $50/fn for 5 years (130 fortnights),
stated balance **$7,191.20** — an annuity-due at i = 0.0395/26 gives $7,191.47, agreeing to
within per-fortnight rounding.

**Order of operations, from the s 1135(3) Method statement and the worked example:** the loan
payment is added to the balance **first**, then interest is charged on the new total at the end of
the fortnight. Interest accrues **immediately** on the first payment. Interest continues to accrue
after the MLA is reached and payments stop, after the Person exits the scheme, and after death
(ss 1139(2A)(a), 1142A(2)).

```
balance = (balance + draw_this_fortnight) × (1 + 0.0395/26)
```

**Debt method statement** (s 1135(3)), for completeness:
Step 1 sum of pension received under the scheme → Step 1A add advances → Step 2 add registration
costs payable under s 1143(4) → Step 3 subtract the pension that would have been received anyway
→ Step 4 add fortnightly compound interest → Step 5 subtract repayments made.
Note Step 2: **charge registration costs are added to the debt and themselves accrue interest.**

## 6. No Negative Equity Guarantee — exact terms

**Statutory authority: SS Act s 1144AA**, inserted with effect from **1 July 2022**.
Confidence: **primary-verified**.

**The guarantee.** On repayment or recovery, if the debt exceeds the **adjusted value** of the
real assets, the Commonwealth *"is not entitled to recover"* the excess, and *"the debt … and the
charge securing the debt, is discharged to the extent of the excess amount **by force of this
paragraph**"* (s 1144AA(1)(f)–(g)). Automatic — it is not a discretion or an application.

**"Adjusted value"** (s 1144AA(5)–(6)) = market value, **less** encumbrances, both determined
under the *Social Security (Home Equity Access Scheme—Market Value) Determination 2022*
(F2022L00998, compiled 29 May 2026), s 5:

- **Market value** is, in order: (a) the **sale price** if sold before the event; else (b) a value
  **agreed** between the Secretary and the person; else (c) an **accredited valuer's** valuation
  from within the **3 months** before the event, if no material change since; else (d) an
  accredited valuer's valuation at the event time.
- **Anti-avoidance**: if the Secretary reasonably believes the sale price was depressed by a sale
  not in good faith, not on fair and reasonable terms, or **not at arm's length**, market value
  reverts to an accredited valuer's figure (s 5(3)).
- **Adjustment** (s 5(4)): market value is reduced by *"the total value of any charges or
  encumbrances over the assets … **other than** any charge referred to in paragraph 1133(3)(c) or
  section 1138"* — i.e. a **pre-existing mortgage reduces the NNEG ceiling, but the HEAS charge
  itself does not** (obviously, or the guarantee would be circular).
- *"accredited valuer"* = API certified practising valuer, RICS Chartered Valuation Surveyor, or a
  State/Territory-registered valuer.
- **The valuation is free to the borrower** (Services Australia).

**Exclusions — the two ways the NNEG is lost** (s 1144AA(3)):
1. **a non-HEAS charge or encumbrance over the security is created or increased**, by or with the
   express consent of the person, **after** they began participating, where it affects or will
   affect the Commonwealth's ability to recover; **or**
2. the person **engaged in fraud, or made a misrepresentation**, in relation to their participation,
   including in relation to the real assets.

If either applies, *"the full loan balance will need to be repaid"* (Services Australia).
The Secretary may make disallowable guidelines for these decisions (s 1144AA(4)) — **none found on
the register**; see UNVERIFIED LIST.

**Worked example** (DSS 3.4.5.55): debt $300,000; pre-existing mortgage $200,000; home falls to
$450,000 at death → adjusted value $250,000 → Commonwealth recovers $250,000, **$50,000
extinguished**.

⚠️ **Modelling consequence for this Household:** redrawing or increasing the Owner-Occupied
Mortgage while a HEAS loan is running **voids the No Negative Equity Guarantee**. Any scenario
that combines `HEAS_DRAW` with a refinance/redraw entry has to raise this. Since redraw against
the Owner-Occupied Mortgage is already in the model's vocabulary (CONTEXT.md, Offset Account
entry), this is a live and easily-missed interaction, not a hypothetical.

## 7. Eligibility

| Criterion | Rule | Source | Confidence |
|---|---|---|---|
| Age | Person **has reached pension age**, **or is the partner of** someone who has (s 1133(2)(c)). Pension age is 67. | SS Act s 1133(1)(c), (2)(c) | primary-verified |
| Qualifying payment | **Receiving *or qualified for*** Age Pension, Disability Support Pension, or Carer Payment | SS Act s 1133(1)(a), (2)(a) | primary-verified |
| **$0 entitlement does NOT disqualify** | **CONFIRMED** — see below | multiple | primary-verified |
| Residency | Not a separate HEAS test. It arrives **through** Age Pension *qualification* (Australian residence + 10 years' qualifying residence). Claims **cannot be lodged from overseas** — the Person must be **present in Australia** when applying. Once granted, payments **continue overseas** while qualification holds, and are **not subject to portability rules**. | SS Guide 3.4.5.10, 3.4.5.50 | primary-via-archive |
| Not bankrupt / not under a Part X personal insolvency agreement | Applies to the Person, partner, and any co-owner | SS Act s 1133(1)(ca), (cb); Services Australia | primary-verified |
| Insurance | Adequate and appropriate, ≥ 90% of building value | SS Act s 1133(1)(cc) | primary-verified |
| Sufficient real assets in Australia | s 1133(1)(d) | SS Act | primary-verified |
| Both partners must sign | s 1136(2)(b) — *"even if they don't own the property"* | SS Act; SS Guide 3.4.5.20 | primary-verified |
| Mutually exclusive with asset hardship provisions | Can apply, but must choose one | SS Guide 3.4.5.10; Services Australia | primary-verified |
| Not available if receiving a DVA service pension / ISS | Use the VEA scheme instead | SS Act s 1133(3A) | primary-verified |

**$0 entitlement — the point on which this whole facility rests. Confirmed, four sources:**

- SS Act s 1133(1)(a): *"is receiving **or is qualified for**"* — the disjunction is statutory.
- SS Guide 3.4.5.10: *"Applicants do **not** have to be receiving an income support payment to be
  eligible for the HEAS, so long as they remain **qualified** for the relevant payment. For example,
  a person may be eligible for the HEAS if they meet Age qualification criteria such as the age and
  residency requirements, **even if they are prevented from receiving an age pension payment due to
  the income and/or assets tests**."*
- SS Guide 3.4.5.50, suspension table: *"Pension or allowance stops due to income or assets
  exceeding the allowable limits → **HEAS payments can continue to be paid** as the pension has
  ceased to be payable but the person has not ceased to be qualified. Loan amounts could increase."*
- Services Australia: *"you meet the rules for a qualifying pension but don't get a payment, for
  example, **your rate is zero** because your income or assets are over the threshold."*

The distinction that carries it is **qualification vs payability**. Qualification survives means
testing; payability does not. HEAS keys off qualification. Note the corollary in SS Guide
3.4.5.80: HEAS **terminates** on loss of *qualification* (e.g. failing the residency test), but
**continues** through loss of *payability*.

## 8. ⚠️ Means-test treatment — including one finding that cuts against a stated project goal

### 8.1 Fortnightly HEAS payments

| Question | Answer | Source | Confidence |
|---|---|---|---|
| Assessed as **income** for the Age Pension? | **NO.** *"Participating in the HEAS does **not change** a person's existing fortnightly income support entitlement."* The loan is delivered *as* the pension payment at an increased rate (s 1134(1A)); it is borrowed money, not ordinary income. | SS Guide 3.4.5.40 | primary-via-archive |
| Taxable? | **No** — *"a voluntary **non-taxable** loan"* | Services Australia | primary-verified |
| Assessed as an **asset** when received? | Not as such — but **money that accumulates unspent in a bank account is an assessable financial investment and is deemed**, like any other cash. | Services Australia (advances page, same logic); general deeming rules | primary-verified |

**The concept.md §5.10 belief is confirmed** for the fortnightly stream.

### 8.2 ⚠️ Lump sum advances are treated DIFFERENTLY — this was not in the brief's assumptions

> "Advance payments of loans under the scheme **may impact your rate of pension** because they're
> both: **subject to deeming provisions under the income test**; **assessable under the assets test**.
> … If you used your **principal home** as security for the loan, the advance **won't count for the
> assets test for the first 90 days**. … We record your advance payment as a **financial
> investment** on your record and automatically apply the asset test exemption for 90 days."

Source: `https://www.servicesaustralia.gov.au/home-equity-access-scheme-advance-payments?context=22546`
(page last updated 11 March 2026). Confidence: **primary-verified**. Repeated in the worked
example page (George): *"the advance loan payment is an assessable asset for pension purposes …
exempt under the asset test for the first 90 days. After 90 days, the assets test will apply."*

| Name | Value | Config or constant | Confidence |
|---|---|---|---|
| Advance assets-test exemption | **90 days**, only where the **principal home** was the security | constant `HEAS_ADVANCE_ASSET_EXEMPT_DAYS = 90` | primary-verified |
| Advance income-test treatment | **Deemed from day one** — the 90-day relief is **assets test only** | — | primary-verified |

So: a lump sum advance is **not** means-test neutral. Once held it is an assessable financial
investment and it is deemed immediately. For a Household chasing residual Age Pension entitlement
this is materially different from the fortnightly stream, and the model must not treat the two
identically.

### 8.3 The debt in the assets test — and why it is worth nothing here

s 1121(5) provides that where real assets are subject to a HEAS charge, *"the value of those real
assets … is to be reduced by the amount of the debt owed"*. s 1121(1A) disapplies the ordinary
charge rule so that s 1121(5) is the exclusive mechanism.

But DSS states the consequence plainly:

> "**NO reduction in the overall value of assets will occur if the pensioner's principal home is
> the ONLY security for the debt.** *Explanation*: The principal home is an exempt or
> non-assessable asset."
>
> "If the HEAS loan is secured by assessable real assets AND the pensioner's principal home, the
> **full** value of the loan is deducted from the value of the assessable asset. *Explanation*: The
> apportionment of encumbrances rules do **not** apply to HEAS loans."

Source: SS Guide 3.4.5.20. Confidence: **primary-via-archive**.

**For this Household — home-only security, home exempt — the HEAS debt is invisible to the assets
test.** It offsets an already-exempt asset. In ADR 0005 terms: the debt sits entirely inside
`protectedAssets` and never touches `assessableAssets`. Meanwhile the cash it produces, if
unspent, lands in `assessableAssets` and is deemed.

**The net direction of travel is therefore adverse:** drawing HEAS and *not spending it* strictly
reduces Age Pension entitlement. Drawing and spending it is neutral to the means test. This is the
opposite of the intuition that a loan against an exempt asset must be means-test-free, and it
should be stated wherever the tool presents the facility.

⚠️ **One real exception, and it is datable.** Under ADR 0005, a **vacated** home loses its
exemption after **2 years**. At that moment the home enters `assessableAssets` — and s 1121(5)
switches on, so the accumulated HEAS debt is then deducted from it in full. A HEAS loan running at
the time of that cliff **cushions it**, dollar for dollar. That is precisely the kind of
scenario-dependent, datable interaction ADR 0005 exists to surface, and it is an argument for
modelling HEAS and `VACATE_HOME` together rather than in separate phases.

### 8.4 ⚠️⚠️ HEAS at $0 entitlement does NOT deliver a Pensioner Concession Card

CONTEXT.md defines **Pensioner Concession Card** as *"the concession entitlement that comes with
any Age Pension entitlement, however small. The reason retaining minimal eligibility is a goal
rather than a rounding error."* HEAS does **not** substitute for that entitlement.

> | If the recipient … | then they … |
> |---|---|
> | is entitled and **receives a payment** under the normal income and assets test | **qualify** for fringe benefits. |
> | is **precluded from payment and/or their entire payment is a loan** | **do NOT qualify** for fringe benefits. |
>
> HEAS recipients, who qualify for a **part pension** … qualify for additional benefits … This
> could include: **pensioner concession card**, family assistance means test concessions, CCS
> means test concessions, pension bonus scheme.

Source: SS Guide 3.4.5.60. Confidence: **primary-via-archive**.

The statutory basis is **s 1137A**: a person is taken **not** to be receiving a social security
pension merely because they receive it at a rate worked out under the HEAS Division — **except**
(s 1137A(3)) where, but for the Division, they would have been receiving the pension at a rate
**greater than nil**. So a **part-pensioner** using HEAS keeps the card; a **nil-entitlement**
Person using HEAS does **not** get one. DSS 3.4.5.40 adds that HEAS-only recipients also do not
get family assistance free of the FA means tests, and if a full-loan recipient dies, neither the
partner nor the estate is entitled to a **bereavement payment**.

**This is a genuine correction to the plan's framing.** HEAS is described in concept.md §5.10 as
"the largest omitted lever" precisely *because* it works at $0 entitlement — and that remains true
for cash flow. But it does not rescue the Pensioner Concession Card goal, and the tool must not
let a HEAS scenario imply that it does. If retaining the card matters, it has to be won on the
means test itself; HEAS is orthogonal to it.

## 9. Death, sale, aged care, and repayment mechanics

| Event | Treatment | Source | Confidence |
|---|---|---|---|
| **Voluntary repayment** | **Allowed, in part or full, at any time**, with no penalty. Delegate may accept instalments or lump sums. BPAY, Post Billpay, credit/debit card, cheque, money order. | SS Act s 1142A(1); SS Guide 3.4.5.90; Services Australia | primary-verified |
| **General recovery bar** | *"The Commonwealth is **not entitled to recover** a debt … from a person **until after the person's death**"* | SS Act s 1139(1) | primary-verified |
| **Death, single** | Debt recovered from the **estate**. Services Australia *"will generally seek repayment from your estate **after 14 weeks**"*. Charge continues; interest continues to accrue until recovered. | SS Act ss 1139(2A), 1138(3); SS Guide 3.4.5.90; Services Australia | primary-verified |
| **Death, surviving partner** | Recovery deferred **until the death of the surviving partner**, if the partner (i) survives, (ii) **has the use of** the secured assets, and (iii) **has reached pension age**. "Use" includes living in it, using it as a holiday home, or taking its rent. Also deferred until the last bereavement instalment is paid. **Interest keeps accruing throughout.** | SS Act s 1139(2)(a),(b), (2A)(a); SS Guide 3.4.5.90 | primary-verified |
| Surviving partner qualified in own right | May **continue in the scheme**; recovery deferred to their death | SS Guide 3.4.5.90 | primary-via-archive |
| **Sale of the home** | Either **transfer the loan to another property** (including a new home), **or repay at settlement**. Must notify **≥ 14 days** before the agreed settlement date. The Secretary may recover out of the proceeds (s 1140(1)) and may enforce the charge against a new owner — **except a bona fide purchaser for value without notice** (s 1140(3)). Disposal by sale, transfer, **gift or will** all count (s 1140(2A)). | SS Act s 1140; Services Australia; SS Guide 3.4.5.90 | primary-verified |
| **Entry to aged care** | **No HEAS-specific rule exists.** Nothing in Part 3.12, the DSS Guide's HEAS chapter, or Services Australia treats aged care entry as an event. The consequences are therefore the *general* ones: qualification for Age Pension survives, so **HEAS continues**; the home remains the security while retained; if the home is **sold** to fund a RAD the loan must be repaid or transferred at settlement; and s 1144A confirms only that Division 4 does not apply to the **care receiver assets test** (a Carer Payment test, not the Aged Care Means Assessment). See UNVERIFIED LIST. | SS Act ss 1139, 1140, 1144A | primary-verified (as a negative) |
| **Hitting the MLA** | Participation **ceases** from the start of the first instalment period after the debt exceeds the MLA (s 1141). Payments stop; **interest keeps compounding**. This is not a default — it is an automatic exit. | SS Act s 1141; SS Guide 3.4.5.80 | primary-verified |
| **Withdrawal** | At any time by signed written request; debt repayable immediately **or** from the estate; interest continues either way | SS Act ss 1142, 1142A | primary-verified |
| **Registration costs** | Payable by the borrower, for registering **and** discharging the charge; may be **added to the debt**, where they attract interest. If discharge falls after death, the estate bears it. | SS Act s 1143(4); s 1135(3) Step 2; SS Guide 3.4.5.20 | primary-verified |
| Security mechanism | Statutory charge under s 1138; in practice a **caveat** on title (a **"notice of charge"** in Queensland) | SS Act s 1138; SS Guide 3.4.5.20 | primary-verified |

## 10. Nil Real Assets Determination

**It does not exist under that name.** Confidence: **primary-verified (negative finding)**.

Checked and not found in: Part 3.12 Division 4 of the *Social Security Act 1991* (ss 1133AA–1144A,
read in full); the complete DSS SS Guide HEAS chapter topic list (3.4.5, .10, .20, .30, .40, .50,
.55, .60, .70, .80, .90, .100) plus 1.2.3.50; the full Services Australia HEAS site tree; the DVA
CLIK 5.4 chapter; and an OData enumeration of **every** legislative instrument on the Federal
Register whose title contains "Home Equity Access" — which returns exactly five instruments, all
listed in this document, and none of them is a "nil real assets" determination.

The three nearest real things, in case one of them is what the term was reaching for:

1. **s 1135A(2)(b)** — *"if … the value of real assets would be less than $10,000, the value is to
   be taken to be **nil**."* A **nil-capacity floor**, not a determination. This is the most likely
   intended referent, and it is coded above.
2. **Qualification at a nil rate** — the s 1133(1)(a) *"receiving **or is qualified for**"* limb,
   which is what makes HEAS work at $0 Age Pension (§7). Sometimes loosely called a "nil rate"
   case. No determination involved; it is qualification, and it is automatic.
3. **s 1133(3)** — the alternative security route where the Person has **no real assets of their
   own** and an attributable company or trust gives the Commonwealth a **guarantee** secured by a
   charge over *its* real property, **approved in writing by the Secretary**. This *is* a
   Secretary's approval in a nil-personal-real-assets situation. Not applicable to this Household
   (no company or trust), but it is the only provision fitting the shape of the phrase.

**Recommendation:** drop the term. Nothing in the scheme requires it, and the two mechanics it
might denote are already captured.

## 11. Constants and config — implementation summary

Everything the facility needs, and how each should be stored.

| Key | Value | Kind | Stamp | Confidence |
|---|---|---|---|---|
| `HEAS_AGE_COMPONENT` | the 36-row table in §1.5 | **CONSTANT** (frozen lookup) | eff. 2019-07-01, F2019L00420 | primary-verified |
| `HEAS_SECURITY_ROUNDING` | floor to $10,000; **nil below $10,000** | CONSTANT | s 1135A(2) | primary-verified |
| `HEAS_FORTNIGHTLY_CAP_MULTIPLE` | `1.5` × maximum payment rate (**fortnightly** basis) | CONSTANT | eff. 2019-07-01, s 1134(1A) | primary-verified |
| `HEAS_ADVANCE_CAP_MULTIPLE` | `0.5` × maximum payment rate (**ANNUAL** basis) | CONSTANT | eff. 2022-07-01, s 1134A(3) | primary-verified |
| `HEAS_MAX_ADVANCES_PER_PERIOD` | `2` per rolling 26 fortnights | CONSTANT | s 1134A(2)(b) | primary-verified |
| `HEAS_ADVANCE_PERIOD_FORTNIGHTS` | `26`, rolling from the first advance | CONSTANT | s 1133AA(1) | primary-verified |
| `HEAS_ADVANCE_ASSET_EXEMPT_DAYS` | `90` (assets test only; **income deeming applies immediately**) | CONSTANT | primary home security only | primary-verified |
| `HEAS_INTEREST_RATE` | `0.0395` p.a. | **CONFIG, dated** | eff. 2022-01-01, F2026L00945 | primary-verified |
| `HEAS_COMPOUNDING_PER_YEAR` | `26` (rate ÷ 26 per fortnight) | CONSTANT | s 1135(3) Step 4 + arithmetic | primary-verified |
| `HEAS_MIN_INSURANCE_PCT` | `0.90` of building value | CONSTANT | s 1133(1)(cc) | primary-verified |
| Age Pension maximum payment rate | reuse the **existing** dated Age Pension assumption (basic + pension supplement + ES + RA) | **CONFIG, dated** — do not duplicate | 20 Mar 2026 set; **reindexes 20 Sep 2026** | primary-verified |
| Home market value | **new optional Setting**, read **only** by the HEAS facility (and later `DOWNSIZE`) — never by the assets test | CONFIG | see ADR 0005 note in §2 | — |
| MLA recalculation cadence | annually, on the **younger** Person's birthday | CONSTANT | SS Guide 3.4.5.30 | primary-via-archive |

### Reference implementation sketch

```
age        = age_at_last_birthday(younger_person, date)          # step on birthday
component  = HEAS_AGE_COMPONENT[clamp(age, 55, 90)]              # 55 and under → 1710; 90+ → 6750
security   = home_market_value − mortgage_balance − nominated_amount
share      = security / 2                                        # per Person; 50-50 rule
mla_person = component * floor(share / 10_000)
mla_total  = mla_person * 2

# fortnightly, per Person
mpr        = age_pension_max_payment_rate_fn(date)               # incl. supplements
draw_fn    = min(1.5 * mpr − age_pension_received_fn, remaining_capacity)
balance    = (balance + draw_fn) * (1 + 0.0395 / 26)
if balance > mla_person: stop payments; keep compounding         # s 1141
```

Clamping: ages **below 56** all take the 55 value ($1,710); ages **above 89** all take the 90 value
($6,750). Both endpoints are open-ended in the instrument ("and each earlier year" / "and each
later year").

## 12. Source list

**Primary — statute and legislative instruments** (all `legislation.gov.au`, retrieved 2026-09-03):

- *Social Security Act 1991* (Cth), Ch 3 Pt 3.12 Div 4, ss 1121, 1064 (PRC A Module A), 1133AA–1144A.
  Compilation in force 1 July 2026. `https://www.legislation.gov.au/C2004A04121/latest/downloads`
- *Social Security (Home Equity Access Scheme – Age Component Amount) Determination 2019*
  (F2019L00420), compilation in force 11 July 2026. `https://www.legislation.gov.au/F2019L00420/latest/downloads`
- *Social Security (Home Equity Access Scheme – Rate of Compound Interest) Determination 2026*
  (F2026L00945), made 6 July 2026, **+ Explanatory Statement**. `https://www.legislation.gov.au/F2026L00945/asmade/2026-07-10/text/original/word`
- *Social Security (Home Equity Access Scheme—Market Value) Determination 2022* (F2022L00998),
  compilation in force 29 May 2026. `https://www.legislation.gov.au/F2022L00998/latest/downloads`
- *Social Security (Home Equity Access Scheme—Rate of Simple Interest) Determination 2018*
  (F2018L01644) — legacy pre-1996 scheme, 7% simple. Not applicable.
- *Social Security Legislation Amendment (Renaming Pension Loans Scheme) Determination 2026*
  (F2026L00944), commenced 11 July 2026 — renaming only.

**Primary — administrative** (`servicesaustralia.gov.au`, retrieved 2026-09-03 by curl):
`/home-equity-access-scheme`; `/who-can-get-loan-under-home-equity-access-scheme`;
`/how-much-you-can-get-under-home-equity-access-scheme`;
`/maximum-loan-amount-under-home-equity-access-scheme`;
`/age-component-for-loans-under-home-equity-access-scheme`;
`/maximum-rate-pension-for-loan-under-home-equity-access-scheme`;
`/security-for-home-equity-access-scheme-loans`;
`/interest-rate-for-loans-under-home-equity-access-scheme`;
`/home-equity-access-scheme-advance-payments`;
`/home-equity-access-scheme-advance-payment-examples`;
`/repay-your-loan-under-home-equity-access-scheme`;
`/how-much-age-pension-you-can-get`.

**Primary content, archive channel** — DSS *Guide to Social Security Law*, `guides.dss.gov.au`
(403 direct; retrieved via `web.archive.org/web/2025/…` on 2026-09-03): 1.2.3.50; 3.4.5;
3.4.5.10; 3.4.5.20; 3.4.5.30; 3.4.5.40; 3.4.5.50; 3.4.5.55; 3.4.5.60; 3.4.5.80; 3.4.5.90.

**Primary — DVA** (`clik.dva.gov.au`, retrieved 2026-09-03): Compensation and Support Policy
Library 5.4.1, 5.4.2, 5.4.3, 5.4.6. Used as the **independent cross-check on the 150%/50% bases**.

**Secondary sources: none were relied on.** Every figure in this document traces to a Commonwealth
statute, legislative instrument, or Commonwealth agency page. No superannuation-fund, adviser, or
media source contributed a number.

---

## UNVERIFIED LIST

Small, and none of it blocks coding.

1. **s 1144AA(4) NNEG guidelines.** The Secretary *may* make disallowable guidelines governing when
   the NNEG is switched off. An OData query over the Federal Register for HEAS-titled instruments
   returned five, none of which is such a guideline. **To close**: query the register for
   instruments made under s 1144AA(4) by provision rather than by title. *Impact*: nil for
   forecasting — the statutory exclusions in s 1144AA(3) are what the model needs, and they are
   verified. Matters only for edge-case narrative.
2. **Aged care entry.** Confirmed as a **negative finding** — no HEAS-specific rule exists in the
   Act, the DSS Guide, or Services Australia. What is *not* verified is how a HEAS debt interacts
   with the **Aged Care Means Assessment** (as opposed to the Age Pension assets test), which is a
   different statute (*Aged Care Act 2024*) and outside this task. **To close**: fold into the
   phase-2 aged care pass; specifically whether the debt reduces the capped former-home value in
   that assessment. *Impact*: phase 2 only.
   **CLOSED 2026-09-25** (`docs/research/p9-heas-debt-netting-2026-09-25.md`): yes, before the cap — Aged Care Act 2024 s 330(1),(8) apply
   SS Act s 1121(5) before the s 330(7) cap; the Age Pension side past the 2-year cliff deducts it
   in full (DSS Guide 3.4.5.20). Built in `project()`.
3. **Interest rate change notice period.** Services Australia says only *"We will tell you if it is
   going to change."* No statutory notice period was found, and none appears to exist — the
   Minister's instrument takes effect on its own terms, subject to disallowance. **To close**:
   nothing further available; treat 3.95% as a dated config that can move without warning.
4. **Whether Services Australia rounds the fortnightly interest per fortnight or carries full
   precision.** Their examples are consistent with per-fortnight rounding to the cent, but a
   26-fortnight reconciliation was not performed. *Impact*: cents over decades — immaterial, but it
   means the model will not tie to a Centrelink statement to the cent.
5. **20 September 2026 indexation.** The 150% and 50% dollar figures in §3.1 and §4.1 are the
   20 March 2026 rate set and **expire in 17 days**. The *multiples* (1.5, 0.5) are stable; only
   the rate base moves. Already tracked in concept.md §6.

## DISCREPANCIES

1. **The one that mattered: the 150% and 50% bases differ, and the brief's framing invited
   conflating them.** The task described the advance limit as "the annual limit as a percentage of
   the maximum rate", parallel to the 150% figure. They are **not** parallel: 150% is of the
   **fortnightly** rate, 50% is of the **ANNUAL** rate. Resolved to primary sources (SS Act
   ss 1134/1134A read together, DVA CLIK 5.4.1 stating it in terms, DSS 3.4.5.40 and 1.2.3.50) and
   confirmed by three worked examples across two agencies and two rate years. Reading it the wrong
   way understates the lump sum by a factor of 26.
2. **Couple structure.** Services Australia presents HEAS as *one* loan to *one* person, using the
   younger partner's age (the John/Joe example). DSS 3.4.5.30 shows it is *two* loans, one per
   Person, each against that Person's **share** of the security. **Not a contradiction** — Services
   Australia is describing a single applicant with a younger partner, DSS the both-apply case — but
   the combined totals only coincide because 2 × half = whole. The per-Person **rounding** is where
   they genuinely diverge, and DSS is the authority. Resolved in favour of DSS.
3. **Scheme naming, mid-transition.** The legislative rename from "Pension Loans Scheme" to "Home
   Equity Access Scheme" commenced in **primary legislation on 5 December 2025** (*Regulatory Reform
   Omnibus Act 2025* sch 5 pt 2), with instruments following on **10–11 July 2026**. The policy
   rename happened on 1 January 2022, four years earlier. Sources therefore straddle both names —
   DSS pages still carry "Act reference: … participation in **PLS**" against text about HEAS. Same
   scheme throughout; no substantive change. Noted so a future pass does not read it as two regimes.
4. **Interest rate instrument identity.** The rate has been 3.95% since 1 January 2022, but the
   *instrument* setting it was **repealed and remade** on 6 July 2026 because the 2021 version had
   been mis-registered as a notifiable rather than legislative instrument. Cite **F2026L00945**.
   Any source citing the 2021 Determination is now stale as to authority, though correct as to rate.
5. **No numeric disagreement anywhere.** The age component table agreed across three independent
   sources on all 36 rows; the 3.95% rate agreed across four; the Age Pension rate arithmetic tied
   out against Services Australia's own current worked examples.

## VERDICT

**YES — the capacity formula is known well enough to code, and P1-7 is closed.**

`MLA = age_component(age of the YOUNGER member of the couple, at last birthday) ×
floor(security_value ÷ 10,000)`, with the full 36-row age component table reproduced above from
the legislative instrument itself, cross-checked against Services Australia and the DSS Guide with
zero disagreement, and validated against four published worked examples.

Every figure needed for the facility is primary-verified: the interest rate (3.95%, ÷26 per
fortnight, confirmed by arithmetic against a primary worked example), the 150% fortnightly cap
including supplements and net of pension actually received, the 50%-of-**annual** advance cap with
its 2-per-26-fortnight limit, the NNEG and its two exclusions, and eligibility at $0 entitlement.
Nothing in the UNVERIFIED LIST touches the capacity calculation.

**Three findings that change the plan rather than merely filling it in**, and which should be
carried into concept.md before P9 is built:

1. **HEAS at $0 Age Pension entitlement does NOT deliver a Pensioner Concession Card** (§8.4). A
   full-loan recipient is taken not to be receiving a pension (s 1137A) and does not qualify for
   fringe benefits. The card goal and the HEAS lever are **independent**; the tool must not let a
   HEAS scenario imply otherwise.
2. **Lump sum advances are deemed for income and assessable for assets** after 90 days (§8.2) —
   unlike the fortnightly stream. The two draw modes are not means-test equivalent.
3. **Increasing the Owner-Occupied Mortgage while a HEAS loan runs voids the No Negative Equity
   Guarantee** (§6). Given that redraw is already in the model's vocabulary, this is a live
   scenario interaction, not a footnote.
