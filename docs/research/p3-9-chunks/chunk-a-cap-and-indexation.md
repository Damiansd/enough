## A. The cap and its indexation

**Retrieval date:** 2026-09-09 · **Forecast year:** FY2026-27 · **Cluster:** ITAA 1997 ss 294-35,
294-40; Subdiv 960-M (ss 960-265, 960-270, 960-280, 960-285); ABS CPI index numbers.
Every provision quoted below was fetched today — see `## FETCH LOG`. Nothing is from memory.

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

## A-UNKNOWNS

| # | Question | Why it matters to the money | What would close it |
|---|---|---|---|
| **U9** | **Which CPI reference base supplies the s 960-285(5) index numbers after the ABS re-reference.** s 960-280(1) says "**first published**", and the number first published for Dec 2016 was **110.0** (old base). The current ABS series publishes Dec 2016 as **76.38**, and Dec 2025 (**100.32**) exists **only** on the new base. s 960-280(3) says only new-base numbers are used "after the change" but does not say in terms that the historic *base quarter* is restated | The indexation factor is worked to **3 decimal places**, and one thousandth is **$1,600** at the $1.6m base. FY2026-27 cleared its $100,000 step by **$800**. The two bases already give different factors in four published years (2018-19, 2020-21, 2021-22, 2024-25) — no published cap changed, but the mechanism that would change one is live | An ATO or Treasury statement of the index numbers used for a specific year's transfer balance cap; the ABS's own re-reference note in the December 2025 quarter CPI release stating whether the historical series is restated; or an ATO ruling on s 960-280(3) |
| **U10** | **The general transfer balance cap for FY2027-28 and beyond.** It is fixed by the **Dec 2026** quarter CPI, which the ABS will not publish until late January 2027 | Every forecast year after FY2026-27. It also drives the FY2027-28 **indexation increase**, which drives every Person's personal cap for the rest of the forecast, and the §3.3 bring-forward tiers | Nothing can close it before Jan 2027. It is a **Setting with a CPI-assumption lever**, in the same class as O5. The engine must not hard-code a step |
| **U11** | **Whether the *earliest* tie rule in s 294-40(2)(b) is ever displaced.** The statute is clear, but no ATO example works a tied maximum, and LCR 2016/9's examples all have a single maximum day | The denominator. In hand example 2 the maximum is tied across **195 days** spanning a cap increase; taking the latest tied day instead of the earliest raises the denominator and over-states the cap | An ATO worked example with a tied maximum straddling 1 July. Low risk — the statutory words admit only one reading — but the fixture should exist regardless (T60/T63) |
| **U12** | **Subdivision 294-E — the child recipient cap modification.** s 294-35(1)'s note points to it; the Subdivision was not read | It is the only known mechanism other than s 294-40 that moves a personal cap, and it is the assumption the derivability of `hasEverExceededCap` rests on (§A.3). Also relevant to a death scenario where a child receives a death benefit income stream | Read ITAA 1997 Subdiv 294-E (ss 294-170 onwards) |
| **U13** | **Subdivision 294-D — capped defined benefit income streams.** Note 1 to s 294-25(1) and the note to s 294-30(1) both say the credit / the excess is "modified" for these | If a Person holds a defined benefit pension, the credit is a **special value**, not the account balance, so the high-water mark and every downstream percentage are wrong. Relevant to any Household with a public-sector or older corporate pension | Read ITAA 1997 Subdiv 294-D and LCR 2016/10 / LCR 2017/1 (both named in LCR 2016/9's footnotes) |
| **U14** | **What the ATO actually shows the user, and under what labels.** The §A.6 Settings prompt has to name fields the user can find. "Highest ever balance" and "personal transfer balance cap" appear in LCR 2016/9's language, but the ATO online screen was not retrieved | If the prompt asks for something the user cannot locate, they will type their **pension account balance** instead — which is the single wrongest number available (§A.6) and produces an unsigned, unbounded error | Retrieve the ATO guidance page describing the transfer balance account view in ATO online services, or a screenshot/help article naming the fields |
| **U15** | **Whether a reversionary beneficiary's deferred credit shifts the high-water day.** s 294-25(1) item 1(b) and item 2(b) defer the credit for a reversionary beneficiary to "the end of the period of **12 months**" | The deferral moves the credit into a later financial year and possibly across a cap increase, changing both the numerator's timing and the denominator. Directly relevant to the v1 `DEATH` what-if (O16) | Read LCR 2016/9's reversionary paragraphs and ITAA 1997 s 294-25 item 1/2 against a death-in-FY fixture |

---

## A-TRAPS

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

---

## A-OPEN-ITEMS

| # | Item | Status | What would close it |
|---|---|---|---|
| **O40** | **The general transfer balance cap beyond FY2026-27** | **Unknowable until the ABS publishes the December 2026 quarter CPI (late Jan 2027).** FY2026-27's $2,100,000 is now derived from primary index numbers (§A.5); FY2027-28's is not derivable at all | Nothing can close it now. It must be a **Setting driven by a CPI assumption**, with the s 960-285 machinery applied to a projected index number, never a hard-coded $100,000 step |
| **O41** | **Which CPI reference base the s 960-285(5) numerator and denominator come from after the ABS re-reference** | **Open — labelled inference.** s 960-280(3) plainly points to the new base, and the new-base pair (Dec 2016 = 76.38, Dec 2025 = 100.32) reproduces all nine published caps. But s 960-280(1) says "first published", and 76.38 is not what was first published for Dec 2016. Four published years already show a **different third decimal** on the two bases | See U9. Until closed, the engine must **store the reference base alongside every index number** and refuse to compute a factor from a mixed pair |
| **O42** | **A personal transfer balance cap cannot be derived for a Person with a pre-existing retirement-phase income stream** | **Refused, not decided.** Five inputs are required and none is inferable from a current balance; the error from guessing is **unsigned and unbounded** (§A.6) | Nothing to fetch — this is a data-availability fact, not a legal gap. The resolution is a Settings block (`transferBalanceAccountStartDay`, `personalTransferBalanceCap`, `highestEndOfDayTransferBalance`, `highestBalanceDay`, `personalCapOnHighestBalanceDay`, `hasEverExceededCap`) plus **`UnknownPersonalTransferBalanceCapError`**. Scoped to pre-existing pensions only — a Person who enters retirement phase inside the forecast is fully computable |
| **O43** | **Subdiv 294-D (capped defined benefit income streams) and Subdiv 294-E (child recipients) were not read** | **Unread.** Both are named in notes to provisions this pass *did* read (s 294-25(1) Note 1, s 294-30(1) Note, s 294-35(1) Note). 294-D changes the **credit amount**; 294-E changes the **cap** | Read both Subdivisions plus LCR 2016/10 and LCR 2017/1. Until then the engine must not model a defined benefit pension's transfer balance credit, and the §A.3 derivability argument for `hasEverExceededCap` stays labelled as resting on an unverified assumption |
| **O44** | **`generalTransferBalanceCap()` cannot produce an indexation increase** | **Live code gap.** `src/core/superCaps.ts` holds one FY2026-27 value and throws `UnsourcedIndexBaseError` for any other year — deliberately, because the Dec 2016 CPI was not in the register (O11). **O11 is now closed** (§A.5), so the throw is no longer justified and the function should become a real s 960-285 computation over a config index series | Add the CPI index numbers to the register (§A-REGISTER-EDITS) and give `generalTransferBalanceCap` an `indexNumbers` parameter, exactly as the concessional cap already has. The **two-point check is now available**: Dec 2016 = 76.38 → Dec 2025 = 100.32 → $2,100,000, and seven more golden years |
| **O45** | **The wording and provenance of the §3.1 General Transfer Balance Cap row** | **Mis-sourced, not wrong.** The row cites s 294-35(3) for **$2,100,000**; that subsection contains **$1,600,000**. The figure was in truth `secondary-only` (ATO table + CCH note) until today | Fixed by the §A-REGISTER-EDITS below: re-cite as s 294-35(3) **+ s 960-265 item 10A + s 960-285 + s 960-280(1) + ABS CPI Dec 2016 and Dec 2025**, which is what actually makes it `primary-verified` |

---

## A-REGISTER-EDITS

Draft only — **not applied.** Intended for a new `### 3.10` in `docs/assumptions-register.md`, plus
four small edits elsewhere.

#### Edit 1 — §3.1, General Transfer Balance Cap row: fix the provenance

Replace the source cell:

> ITAA 1997 **s 294-35(3)** (base $1,600,000 for 2017-18, "indexed annually") + **s 960-265 item 10A**
> + **s 960-285(2), (3)(b), (5)(b), (6), (7) item 3** + **s 960-280(1)** + **ABS CPI All Groups,
> weighted average of 8 capital cities: Dec 2016 = 76.38, Dec 2025 = 100.32**. Derived, not copied:
> `100.32/76.38 = 1.313433 → 1.313 → 1,600,000 × 1.313 = 2,100,800 → floor $100,000 = **$2,100,000**`.
> Retrieved 2026-09-09. `primary-verified`.

Add after the "One stale ATO sentence to ignore" paragraph:

> **The stale sentence is now demonstrated stale on its own page.** The *Contributions caps* page
> ("Last updated 24 April 2026") carries "**Note: The general transfer balance cap is $2 million from
> 1 July 2025**" immediately above "**From 1 July 2025 to 30 June 2026, the general transfer balance
> cap was $2 million**" — past tense, with an end date. The *Transfer balance cap* key-rates page
> ("Last updated 27 April 2026") gives **2026–27 = 2.1**. And the s 960-285 arithmetic on the ABS
> index numbers reproduces **all nine** published years. There is no conflict left to resolve.

#### Edit 2 — §3.2, add the CPI index numbers and the algorithm verification (closes O11)

Add after the AWOTE verification block:

> **Algorithm verification (CPI, ABS All Groups, weighted average of 8 capital cities, current
> reference base):** Dec 2016 **76.38**; Dec 2020 **81.40**; Dec 2021 **84.23**; Dec 2022 **90.85**;
> Dec 2023 **94.53**; Dec 2024 **96.81**; Dec 2025 **100.32**.
>
> | FY | ratio | factor | × $1,600,000 | floor $100,000 | published |
> |---|---|---|---|---|---|
> | 2021-22 | 1.065724 | 1.066 | 1,705,600 | **$1,700,000** | $1.7m ✔ |
> | 2022-23 | 1.102776 | 1.103 | 1,764,800 | **$1,700,000** | $1.7m ✔ |
> | 2023-24 | 1.189447 | 1.189 | 1,902,400 | **$1,900,000** | $1.9m ✔ |
> | 2024-25 | 1.237628 | 1.238 | 1,980,800 | **$1,900,000** | $1.9m ✔ |
> | 2025-26 | 1.267478 | 1.267 | 2,027,200 | **$2,000,000** | $2.0m ✔ |
> | 2026-27 | 1.313433 | 1.313 | 2,100,800 | **$2,100,000** | $2.1m ✔ |
>
> All six are golden fixtures, as are 2018-19 (1.020 → $1.6m), 2019-20 (1.037 → $1.6m) and 2020-21
> (1.057 → $1.6m). **O11 is closed.**
>
> **FY2026-27 cleared its step by $800.** `1,600,000 × 1.313 = 2,100,800`, against a $100,000 floor at
> $2,100,000. One thousandth of the indexation factor is $1,600 at this base. This figure is not a
> candidate for freezing as a constant.
>
> **CPI reference base — O41.** The ABS has **re-referenced** the CPI. The superseded series gives
> Dec 2016 = **110.0** and has **no Dec 2025 number at all**; the current series gives Dec 2016 =
> **76.38**. s 960-280(3) directs that "only index numbers published in terms of the **new** index
> reference period are to be used after the change", so the new-base pair is the one to use — and it
> is the pair that reproduces every published cap. But the two bases give a **different third
> decimal** in 2018-19 (1.020 vs 1.019), 2020-21 (1.057 vs 1.056), 2021-22 (1.066 vs 1.065) and
> 2024-25 (1.238 vs 1.237). No published cap turns on it *yet*. **Every stored index number must
> record its reference base, and a factor must never be computed from a mixed pair.**

Also correct the pseudocode comment:

> ```
> if factor <= 1:   amount = base_amount   # s 960-285(4) — "You do not index THE AMOUNT".
>                                          # For the GTBC that is $1,600,000 (s 294-35(3)(b)),
>                                          # NOT last year's cap. Trap T69. Labelled inference:
>                                          # s 960-285(4) read with s 294-35(3)(b).
> ```

#### Edit 3 — new §3.10

> ### 3.10 The transfer balance cap — ITAA 1997 Div 294 Subdiv 294-B (ss 294-35, 294-40)
>
> **Two caps, and only one of them is config.**
>
> | | General transfer balance cap | **Your** (personal) transfer balance cap |
> |---|---|---|
> | Scope | one national figure per FY | **per Person** |
> | FY2026-27 | **$2,100,000** | anything from $1,600,000 up |
> | Kind | **config** — CPI-indexed, **s 960-265 item 10A** | **per-Person persisted state** |
> | Authority | s 294-35(3) | s 294-35(1), (2); s 294-40 |
>
> **s 294-35(1)** seeds the personal cap, **once**, from the general cap for the financial year in
> which the Person's transfer balance account starts (s 294-15(2): the later of 1 July 2017 and the
> day they first become a retirement phase recipient). **s 294-35(2)** then carries *last year's
> personal cap* forward — it never re-reads the general cap. **s 294-40** is the only thing that moves
> it. A Person who seeded at $1,600,000 in FY2017-18 and never qualified for an increase still has a
> **$1,600,000** cap in FY2026-27, $500,000 below the general cap. `primary-verified`.
>
> **Proportional indexation (s 294-40).**
>
> ```
> # at the start of each financial year, per Person
> capThisFY = capPrevFY                                              # s 294-35(2)
> if accountStartFY != thisFY                                        # s 294-40(1) parenthetical
>    and generalCap[thisFY] > generalCap[prevFY]                     # s 294-40(1)(a)
>    and not hasEverExceededCap:                                     # s 294-40(1)(b) — latching
>     increase  = generalCap[thisFY] - generalCap[prevFY]            # "indexation increase"
>     usedPct   = 100 if highestEndOfDayBalance < 0 else \
>                 floor(100 * highestEndOfDayBalance / capOnHighestBalanceDay)   # (2)(c) floor
>     unusedPct = 100 - usedPct                                      # (2)(d); (3) => 100 if < nil
>     capThisFY = capPrevFY + unusedPct * increase / 100
> ```
>
> Every operand is exact:
>
> | Operand | Definition | Provision |
> |---|---|---|
> | numerator | the **highest transfer balance at the end of any day** from account start to the end of the previous FY — **a high-water mark that never falls** | s 294-40(2)(a) |
> | the day | the **earliest** day the maximum was attained | s 294-40(2)(b) |
> | denominator | the **personal** cap **on that day** — not the general cap, not the current cap | s 294-40(2)(c) |
> | rounding | the **used** percentage is floored to a whole number **before** subtraction, so the unused percentage rounds **up** | s 294-40(2)(c), (d) |
> | negative balance | unused percentage **taken to be 100%** | s 294-40(3) |
>
> **Invariant:** a personal transfer balance cap is always a whole multiple of **$1,000**, and
> `unusedCapPercentage` is always an integer in **[0, 100]**. *(Derived by arithmetic from
> primary-verified provisions.)*
>
> **The transfer balance account is a transaction ledger, not a market-value ledger.** Investment
> earnings, investment losses and pension drawdowns are **not** credit or debit events (LCR 2016/9
> paras 24A–27; and neither the s 294-25 credit table nor the s 294-80 debit table has an item for
> them — *argument from the absence of a table item, corroborated in terms by a binding public
> ruling*). A pension started at $1.6m and now worth $900k still carries a $1.6m transfer balance and
> **zero** remaining cap space. Trap T65.
>
> **State the engine must persist, per Person, across financial years:**
>
> | Field | Starting point | Updated |
> |---|---|---|
> | `transferBalanceAccountStartDay` | later of 1 Jul 2017 and first retirement-phase-recipient day | once (s 294-15(2)) |
> | `personalTransferBalanceCap` | general cap for the FY containing the start day | each 1 July (ss 294-35(2), 294-40) |
> | `transferBalance` (may be negative) | 0 | at each s 294-25 credit / s 294-80 debit |
> | `highestEndOfDayTransferBalance` (monotone) | first day's closing balance | `max()` at the **end of every day** |
> | `highestBalanceDay` | account start day | only on a **strict** increase (T71) |
> | `personalCapOnHighestBalanceDay` | seed cap | snapshotted with the line above |
> | `hasEverExceededCap` (latching) | `false` | end of every day, against **that day's** cap |
>
> **Two ways to lose indexation, and they are different rules.** An end-of-day balance that
> **exceeded** the then-current cap disapplies s 294-40 outright and permanently (s 294-40(1)(b)); one
> that merely **equalled** it leaves the section applying but with a 0% unused percentage, which is
> equally permanent because the high-water mark never falls. LCR 2016/9 para 17 collapses them —
> "**ever equalled or exceeded** … you will permanently lose your entitlement" — and para 76 warns
> that the bar is **not** the same as having had excess transfer balance: a transitional excess that
> was *disregarded for tax* still bars indexation. Trap T67, T68.
>
> **The balance is measured at the END of a day.** A credit and a debit on the same day net out and
> the intraday spike never happened (LCR 2016/9 para 51 — Alice). Trap T66.
>
> **Golden fixtures.**
>
> | Fixture | Facts | Required answer |
> |---|---|---|
> | **LCR 2016/9 Ex A1 step 1** | $1.4m credit 1 Mar 2018; seed cap $1.6m; FY2021-22 increase $100,000 | 87% used → 13% → **+$13,000** → **$1,613,000** |
> | **LCR 2016/9 Ex A1 step 2** | +$125,000 on 31 Dec 2022 → $1.525m; FY2023-24 increase $200,000; denominator **$1,613,000** | 94% used → 6% → **+$12,000** → **$1,625,000** |
> | **LCR 2016/9 Ex A2** | $1.6m credit against a $1.6m seed cap | 100% used → 0% → **$1,600,000**, in FY2021-22 and forever |
> | **High-water mark** | $1.2m credit 1 Sep 2025; $300k debit 15 Mar 2026; FY2026-27 increase $100,000 | 60% used → 40% → **+$40,000** → **$2,040,000**; headroom **$1,140,000** |
> | **Rounding direction** | $1,234,567 credit 1 Jul 2025 against a $2.0m cap | 61% used → 39% → **+$39,000** → **$2,039,000** |
> | **Negative balance** | $500,000 structured settlement debit; $300,000 credit 1 Sep 2025 → −$200,000 | s 294-40(3): unused **100%** → **+$100,000** → **$2,100,000** |
> | **Seeding year** | pension starts 1 Jul 2026 | cap exactly **$2,100,000**; s 294-40 does not apply |
>
> **Refusal.** For a Person who was already a retirement phase recipient before the forecast starts,
> the personal cap is **not computable by this tool** and must not be guessed. It requires the account
> start day, the general-cap series back to it, every dated credit and debit since, the high-water
> mark and its earliest day, and the personal cap on that day. **The current pension balance is
> neither an upper nor a lower bound** — earnings and drawdowns are invisible to the account in both
> directions — so there is no conservative approximation available. Carry the seven fields above as
> **Settings** and raise **`UnknownPersonalTransferBalanceCapError`** if a Scenario needs the cap
> without them. **Scope the refusal narrowly:** a Person who enters retirement phase *inside* the
> forecast is fully computable and must be computed. O42.

#### Edit 4 — §8, mark O11 closed and add O40–O45

O11's status cell becomes:

> **CLOSED 2026-09-09.** ABS CPI (All Groups, weighted average of 8 capital cities) retrieved from the
> ABS SDMX API: **Dec 2016 = 76.38, Dec 2025 = 100.32** (and Dec 2017–Dec 2024). The s 960-285
> arithmetic reproduces **all nine** published general transfer balance caps, 2018-19 through 2026-27.
> **The residue is O41** — the ABS has re-referenced the CPI and the superseded base gives a different
> third decimal in four years.

Then add O40–O45 as drafted in `## A-OPEN-ITEMS` above.

#### Edit 5 — §1 and §9

Add **T58–T72** to the §1 trap table, and add the corresponding mutation rows to §9. The three
mutations most worth marking as high-value (in the sense §9 uses for T48):

| Mutation | Trap | Detected by | High-value |
|---|---|---|---|
| Use the closing transfer balance instead of the all-time high-water mark | T58 | the $1.2m/$300k debit fixture: **$2,040,000**, not $2,055,000 | **YES** |
| Divide by the general cap instead of the personal cap on the high-water day | T60 | LCR Ex A1 step 2: **$1,625,000**, not $1,635,000 | **YES** |
| Freeze $2,100,000 as a code constant | T72 | a structural test: the general TBC must resolve from config, and §7's constants list must not contain it — it is **s 960-265 item 10A** | **YES** |

---

## FETCH LOG

All fetches performed **2026-09-09** with `curl` and a browser User-Agent
(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 … Chrome/124.0 Safari/537.36`).

| # | URL | Result | Verdict |
|---|---|---|---|
| 1 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F294-35` | **200**, 116,977 bytes. Full text of s 294-35(1)–(3), the child-recipient note, the Subdiv 960-M note, the amendment history (inserted No 81 of 2016, never amended), and the CCH editorial note listing 2017/18–2026/27 general caps ending **2026/27 $2.1m** | **success.** Independently reproduces the verbatim text already in this file |
| 2 | `…DocID=PAC%2F19970038%2F294-40` | **200**, 116,731 bytes. Full text of s 294-40(1)–(3) including the fuller (2)(b) tie-breaker wording ("…at the end of more than one day, the earliest of those days"). History: inserted No 81 of 2016, **never amended** | **success** |
| 3 | `…DocID=PAC%2F19970038%2F960-285` | **200**, 148,062 bytes. Current s 960-285(1)–(7) in full, including the (7) table (item 3 = general transfer balance cap, CPI, **$100,000**), plus the superseded pre-2017 version and the No 8 of 2026 amendment history for items 10B/10C | **success** |
| 4 | `…DocID=PAC%2F19970038%2F960-265` | **200**, 122,208 bytes. The full indexation-relevance table. **Item 10A = "\*General transfer balance cap · section 294-35"** | **success.** Confirms the project's CONFIG gateway test is met |
| 5 | `…DocID=PAC%2F19970038%2F960-270` | **200**, 110,786 bytes. s 960-270(1)–(3): "**Some** provisions of this Act require amounts to be indexed"; (3) excludes items 8–12 and item 14, routing them to s 960-285 | **success** |
| 6 | `…DocID=PAC%2F19970038%2F960-275` | **200**, 141,303 bytes | **success** (not quoted — s 960-275 is the "indexation factor" generic provision, superseded for item 10A by s 960-285(5)) |
| 7 | `…DocID=PAC%2F19970038%2F960-280` | **200**, 122,481 bytes. s 960-280(1) (All Groups CPI, weighted average of 8 capital cities, **first published**), (2) car limit, (3) **reference-period change rule**, (4) AWOTE | **success** — (3) is the provision U9/O41 turns on |
| 8 | `https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/transfer-balance-cap` | **200**, 295,604 bytes. "Last updated **27 April 2026**". Table 26: **2026–27 = 2.1**, 2025–26 = 2, 2024–25 = 1.9, 2023–24 = 1.9, 2022–23 = 1.7, 2021–22 = 1.7, 2020–21…2017–18 = 1.6. Table 27 defined benefit income cap 2026–27 = $131,250 | **success.** Resolves the register's asserted conflict in favour of **$2,100,000** |
| 9 | `https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps` | **200**, 625,284 bytes. "Last updated **24 April 2026**". Contains the disputed "**Note: The general transfer balance cap is $2 million from 1 July 2025**" — **immediately above** "From 1 July 2025 to 30 June 2026, the general transfer balance cap **was** $2 million" | **success.** The stale Note is contradicted by the next sentence on the same page |
| 10 | `…/law/view/document?DocID=COG%2FLCR20169%2FNAT%2FATO%2F00001` | **200**, 271,690 bytes. **LCR 2016/9** *Superannuation reform: transfer balance cap and transition-to-retirement reforms*, consolidated version. Paras 15B–17O (personal cap, unused cap percentage, Examples A1 and A2), 20–27 (transfer balance; earnings/drawdowns are not credit or debit events), 51 (end-of-day measurement), 76 (transitional excess still bars indexation) | **success.** A **public ruling** binding on the Commissioner under TAA 1953 except as to excess transfer balance tax. **The `COG/` prefix is the working DocID form for a Law Companion Ruling — record this in §10** |
| 11 | `…/law/view/document?DocID=LCR%2FLCR20169%2FNAT%2FATO%2F00001` | **404**, "Error \| ATO Legal Database" | **failure — useful.** An `LCR/` prefix does **not** work; use `COG/` |
| 12 | `https://data.api.abs.gov.au/rest/data/ABS,CPI,/1.10001.10.50.Q?startPeriod=2016-Q4&endPeriod=2026-Q2`, `Accept: application/vnd.sdmx.data+csv` | **200**, CSV. Resolved to dataflow **`ABS:CPI(2.0.0)`**. Dec 2016 **76.38**, Dec 2017 **77.87**, Dec 2018 **79.24**, Dec 2019 **80.70**, Dec 2020 **81.40**, Dec 2021 **84.23**, Dec 2022 **90.85**, Dec 2023 **94.53**, Dec 2024 **96.81**, **Dec 2025 100.32**. `BASE_PERIOD` code **25** | **success.** These nine numbers + s 960-285 reproduce every published general transfer balance cap. **Closes O11** |
| 13 | `https://data.api.abs.gov.au/rest/codelist/ABS/CL_BASE_PERIOD` | **200**, JSON. Code **25 = "2025 = 100.0"** | **partial.** The codelist offers only calendar-year labels and its label does not reconcile with the observed series (calendar-2025 average = 99.045, not 100.0), so the codelist does **not** authoritatively name the CPI's reference period. **This is why U9/O41 stays open** rather than being closed here |
| 14 | `https://data.api.abs.gov.au/rest/data/ABS,CPI,1.1.0/1.10001.10.50.Q?startPeriod=2016-Q4…` and `…2020-Q4&endPeriod=2026-Q2` and `…2017-Q4&endPeriod=2019-Q4` | **200**. The **superseded** dataflow. Dec 2016 **110.0**, Dec 2017 **112.1**, Dec 2018 **114.1**, Dec 2019 **116.2**, Dec 2020 **117.2**, Dec 2021 **121.3**, Dec 2022 **130.8**, Dec 2023 **136.1**, Dec 2024 **139.4**; series **ends at Sep 2025 = 143.6** — **no Dec 2025 number exists on the old base** | **success, and decisive for U9.** Proves the ABS re-referenced the CPI with the December 2025 quarter, and that the old base cannot supply the FY2026-27 numerator at all |
| 15 | `https://data.api.abs.gov.au/rest/data/ABS,CPI,1.0.0/…` and `…,1.2.0/…` | **404**, "Could not find Dataflow and/or DSD related with this data request" | **failure — useful.** Only versions **1.1.0** (superseded) and **2.0.0** (current) of the ABS CPI dataflow exist |
| 16 | `https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/transfer-balance-cap` and `…/personal-transfer-balance-cap` | **404** (both, ~257KB soft-404 pages) | **failure.** The ATO consumer-facing personal-transfer-balance-cap page was not located at the guessed paths. **U14 stays open** |
| 17 | `https://www.ato.gov.au/api/search?q=personal%20transfer%20balance%20cap` | **404** | **failure.** No usable ATO search API at that path |
| 18 | `https://duckduckgo.com/html/?q=site:ato.gov.au …` | **302**, no result links extracted | **failure.** Search-engine discovery was not available from this environment; every ATO document above was reached by constructing the URL directly |

**Retrieval recipes confirmed for §10 of the register:**
- ITAA 1997 sections: `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F<section>` — **200 on every section tried, no 403.**
- **Law Companion Rulings: `DocID=COG%2FLCR<yyyy><n>%2FNAT%2FATO%2F00001`** (e.g. `COG%2FLCR20169%2F…`). An `LCR/` prefix 404s. *(New — not previously in §10.)*
- **ABS index numbers: `https://data.api.abs.gov.au/rest/data/ABS,CPI,<version>/1.10001.10.50.Q?startPeriod=…&endPeriod=…` with `Accept: application/vnd.sdmx.data+csv`.** The dataflow **version is load-bearing**: `2.0.0` is the current reference base, `1.1.0` the superseded one. *(New — §8's O11 recorded only that `abs.gov.au` 404'd on the path tried; this is the path that works.)*
