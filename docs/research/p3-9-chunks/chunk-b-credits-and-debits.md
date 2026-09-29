# CHUNK B — analysis for `docs/research/p3-transfer-balance-cap.md`

**Cluster:** the transfer balance account — credits and debits (ITAA 1997 Subdiv 294-B, Subdiv 294-D,
ITAR 2021 Div 294 regs, s 307-65, s 307-70, s 307-205, reg 307-205.02).
**Retrieval date:** 2026-09-09 · **Forecast year:** FY2026-27.
Every provision quoted below is either already verbatim in the raw-text part of the research doc
(lines 59–252) or was fetched by this pass and is logged in `## FETCH LOG`.

---

## B. The transfer balance account — credits and debits

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
  s 307-80(3)(b), public-ruling-corroborated. But see **BU9** for a real textual anomaly in the
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
by regulation (reg 294-130.01 exists and was not read this pass — see **BO43**).

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

## B-UNKNOWNS

**BU9 — The s 307-80(3)(b)(ii) overlap: a member who retired without notifying, and then turns 65.**
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

**BU10 — Is "value" under s 307-205(b) for an account-based pension exactly the account balance, or
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
regs 307-205.02B–02E were **not** read in full and one of them may reach further — see BO43).

**BU11 — What is the value on the conversion day when the fund has not yet allocated the year's
earnings?** An SMSF converting a TRIS on, say, 14 March must value the supporting interest on that
day, which requires an interim revaluation of assets and an interim allocation of earnings. For an
APRA fund the unit price does this automatically. For an SMSF it is a trustee act that may happen
after the fact.
*Why it matters:* it moves the credited amount by whatever the year-to-date earnings are — on
$1,000,000 at 7% over eight months, roughly $47,000 of transfer balance, which is either inside or
outside a cap.
*What would close it:* ATO guidance on interim valuation for transfer-balance-account purposes
(SMSFR or the SMSF valuation guidelines), which was not retrieved.

**BU12 — Does the tool need the s 8AAD(1) TAA GIC base rate at all?** Only if it prices excess
transfer balance tax rather than refusing it (B.5, credit item 3). If the refusal recommended here is
adopted, this is not an unknown but a deliberately unentered door. If a future pass decides to price
it, the daily rate series and any s 294-235(3) Ministerial determination become live inputs and
neither was retrieved.
*What would close it:* a decision on the refusal, then (if priced) the ATO's published GIC rate
series and a check of the Federal Register for instruments made under s 294-235(3).

**BU13 — Is reg 294-130.01 (streams prescribed as capped defined benefit under s 294-130(2)) capable
of catching an ordinary product?** It was seen only by cross-reference from reg 294-80.01(1)(b)(ii)
and was **not fetched**. If it prescribes something an ordinary retiree can hold, the
`CappedDefinedBenefitIncomeStreamNotModelled` refusal needs a wider trigger than "defined benefit,
lifetime annuity, or market-linked pension".
*Why it matters:* a mis-scoped refusal either fires on healthy inputs or fails to fire on the ones it
exists for.
*What would close it:* fetch `REG/20210206/294-130.01`.

---

## B-TRAPS

**BT58 — Modelling the transfer balance as the current value of the retirement-phase interests.**
The transfer balance is a cumulative record of *transfers into* retirement phase and moves only on the
five credit and eight debit events. It does not track the account. *Testable:* commence a pension at
$1,500,000 on 1 July 2027; run to 30 June 2035 with drawdowns exceeding earnings so the account
balance falls to $1,100,000; commence a second pension with $900,000. The transfer balance must be
**$2,400,000**, not $2,000,000, and the second commencement must be reported as a breach. A model
that revalues gives $2,000,000 and reports compliance.

**BT59 — Debiting a pension payment.** A minimum (or above-minimum) pension drawdown is a
superannuation income stream benefit, and s 307-65(1) defines a superannuation lump sum as "*a
\*superannuation benefit that is not a \*superannuation income stream benefit*", so it can never
satisfy s 294-80(1) item 1. *Testable:* a $2,050,000 pension with $110,000 of drawdowns in the year
must leave the transfer balance at exactly $2,050,000 at 30 June. Any debit is wrong.

**BT60 — Crediting investment earnings.** *Testable:* a $1,800,000 pension that grows to $2,150,000
over five years with no further contributions must leave the transfer balance at $1,800,000 and must
**not** report a cap breach, even though the account now exceeds the general cap. (This is the trap's
tell: the wrong model reports a breach that does not exist, and the user is advised to commute for no
reason.)

**BT61 — Offering "draw down more" as the remedy for an excess.** LCR 2016/9 ¶25 is explicit that a
large pension drawdown does not reduce the transfer balance. *Testable:* given a transfer balance of
$2,200,000 against a cap of $2,100,000, the only remediation the tool may emit is a **commutation** of
at least the excess (plus accrued s 294-235 earnings); any suggestion framed as an increased pension
payment is a failure.

**BT62 — Valuing an item 2 credit at 1 July instead of the commencement day.** s 294-25(1) item 2
reads "*the \*value **on the starting day***". *Testable:* a pension commenced on 1 October 2026 with
$500,000 on the commencement day and $487,000 at the preceding 1 July must credit **$500,000**. The
1 July figure is a different number multiplied by nothing — it is simply the wrong day. Note this is
the *opposite* day rule from §3.9's Schedule 7 minimum in a non-commencement year, which is exactly
why the two get crossed.

**BT63 — Treating a TRIS conversion as crediting only the amount originally put into the TRIS.** The
credit is the value of the supporting interest on the conversion day, full stop. *Testable:* a TRIS
commenced at 60 with $800,000 that has grown to $1,050,000 by the member's 65th birthday must credit
**$1,050,000** on the birthday. Crediting $800,000 understates the balance by the entire TTR-phase
growth and can hide a breach.

**BT64 — Using the retirement day rather than the notification day as the TRIS starting day.**
s 307-80(3)(b)(ii) keeps the stream out of retirement phase until the provider is notified. *Testable:*
retirement on 28 June 2027, notification on 12 July 2027 → the account starts in **FY2027-28**, the
personal cap is the FY2027-28 general cap, and the credited value is the balance on **12 July 2027**.
A model that uses 28 June gets a different cap year *and* a different valuation day from one
two-week input.

**BT65 — Requiring notification for an age-65 TRIS conversion.** Item 106 (attaining 65) sits in
s 307-80(2)(c)(iv), which is **not** in the (3)(b)(ii) notification list. *Testable:* a TRIS held by a
Person who turns 65 on 3 November 2028 and never notifies the fund must convert on **3 November 2028**
and credit the balance on that day. A model that waits for a notification flag never converts the
stream, never opens the account, and silently forecasts a TRIS running past 65 — which is also wrong
for the fund's earnings tax exemption and for the §3.9 10% ceiling.

**BT66 — Inferring a commutation from a large withdrawal.** The same cashflow is a $100,000 debit or
nothing depending on the member's act (s 307-65(2); LCR 2016/9 ¶41). *Testable:* an above-minimum
withdrawal of $100,000 with no explicit `partialCommutation` characterisation must produce **no**
debit; the same withdrawal marked `partialCommutation` must produce a **$100,000** debit on the day of
receipt. Also assert the default is `pensionPayment` — the direction that does not invent headroom.

**BT67 — Routing a full commutation through item 6 instead of item 1.** Item 6 is expressly
conditioned on "*items 1 and 5 do not apply*". *Testable:* a full commutation producing a $1,000,000
lump sum received on 7 July 2030 must debit **$1,000,000 on 7 July 2030** (item 1: "*the amount of the
superannuation lump sum*", "*at the time you receive*"), not the interest's value just before the stop
time on the stop day (item 6). Construct the case so the two differ — e.g. a market move between the
instruction and the receipt, or a boundary at 30 June.

**BT68 — Closing the transfer balance account when the last pension is commuted.** s 294-15(1)'s
"*or have at any time been*" and s 294-45's "*ceases when the retirement phase recipient dies*"
together mean the account survives. *Testable:* commence $1,000,000 in FY2027-28, fully commute in
FY2030-31, then commence a new pension in FY2034-35. The personal cap must still be the **FY2027-28**
general cap (indexed only proportionally on the unused percentage measured against the historical
high), not the FY2034-35 general cap. A model that closes and reopens the account hands the Person a
free cap upgrade worth hundreds of thousands.

**BT69 — Deriving the s 294-40 unused cap percentage from the current balance instead of the
historical high.** s 294-40(2)(a) identifies "*the **highest** \*transfer balance … at the end of any
day up to the end of the previous \*financial year*". *Testable:* balance peaks at $1,900,000, is
commuted to $1,200,000, then indexation occurs. The unused cap percentage must be computed off
$1,900,000, not $1,200,000. (Cross-check against the rounding direction: s 294-40(2)(c) rounds the
*used* percentage **down**, which rounds the unused percentage **up** — LCR 2016/9 ¶17G works
$1.4m/$1.6m = 0.875 → 87% used → 13% unused.)

**BT70 — Treating an account-based pension as capped defined benefit, or vice versa.** *Testable:* a
Person flagged as holding a defined benefit lifetime pension must raise
`CappedDefinedBenefitIncomeStreamNotModelled` and must **not** credit the user's stated capital value;
the correct number under s 294-135(2) is annual entitlement × 16, which the tool does not compute. The
test asserts the refusal, not a number.

**BT71 — Pooling or transferring cap between spouses.** *Testable:* a couple with $3,600,000 of super
must not be able to commence $2,600,000 for Person A and $1,000,000 for Person B without Person A
being reported in breach, however much unused cap Person B has. Div 294 is drafted wholly per
individual and contains no aggregation provision.

---

## B-OPEN-ITEMS

**BO40 — The `unused cap percentage` needs the historical high, and the register has no Setting for
it.** s 294-40(2) requires the highest end-of-day transfer balance up to the end of the previous
financial year *and the earliest day it occurred*. For a Person whose account predates the forecast,
neither is derivable. This is a distinct input from the opening transfer balance and will be
collapsed into it unless it is a named Setting. **What would close it:** a decision to carry
`transferBalanceHistoricalHigh` and `transferBalanceHistoricalHighDay` as per-Person Settings, and a
test (BT69) that they are actually consumed.

**BO41 — The withdrawal characterisation Setting is not yet in the model, and §3.9's drawdown code
has no slot for it.** The `pensionPayment` / `partialCommutation` distinction changes both the
transfer balance (this cluster) and the Schedule 7 minimum satisfaction (§3.9). It has to be one
input read by both, or the two will disagree. **What would close it:** a design decision on where the
characterisation lives, and a cross-report consistency test (§6) that a withdrawal marked
`partialCommutation` produces a debit here **and** does not count toward the minimum there.

**BO42 — Named refusals for this cluster are drafted but not registered.** Nine are proposed in B.5
and B.6: `PreForecastTransferBalanceNotDerivable`, `ReversionaryPensionNotModelled`,
`TransferBalanceCapExceeded`, `LRBACreditNotModelled`,
`DeferredAndCappedDefinedBenefitCreditsNotModelled`, `StructuredSettlementNotModelled`,
`FraudAndBankruptcyDebitsNotModelled`, `PaymentSplitNotModelled`,
`StreamCeasedOutsideCommutationNotModelled`, `CappedDefinedBenefitIncomeStreamNotModelled`. **What
would close it:** adopting the names into §3.10 and asserting each is reachable from at least one
input configuration.

**BO43 — Four provisions cross-referenced but not read this pass.** reg 294-130.01 (prescribed capped
defined benefit streams — BU13); regs 307-205.02C/02D/02E (further valuation methods, one of which
may reach a product an ordinary retiree holds — BU10); reg 294-145.01 (the `debit value` method for
s 294-145(7)); and *Income Tax (Transitional Provisions) Act 1997* Subdiv 294-A/294-B, referenced in
every Div 294 history note and containing the 2017 transitional excess relief (LCR 2016/9 ¶74 —
"*The transitional provisions operate only to disregard your excess transfer balance for this
6-month period*"). The last is almost certainly spent for FY2026-27 but that has **not been
verified**. **What would close it:** four fetches — the three ITAR sections at
`REG/20210206/<section>` and the ITTPA at the ATO Legal Database's transitional-provisions DocID.

**BO44 — The BU9 textual anomaly is unresolved and the tool has to pick a side now.** The
recommendation is to implement the ATO's reading (age 65 converts automatically, BT65) because it is a
public ruling the Commissioner is bound by, and to carry the anomaly as a labelled inference rather
than as `primary-verified`. **What would close it:** the EM to Act No. 55 of 2017 Sch 1 item 13, or a
ruling addressing the overlap.

---

## B-REGISTER-EDITS

*Draft only — to be written into `docs/assumptions-register.md` as a new §3.10. Not applied.*

### 3.10 The transfer balance cap — the account, its credits and its debits (ITAA 1997 Div 294)

Read off the **ATO Legal Database** on **2026-09-09** — ITAA 1997 ss 294-15, 294-20, 294-25, 294-30,
294-45, 294-50, 294-55, 294-80, 294-85, 294-90, 294-125 to 294-145, 307-65, 307-70, 307-205; *Income
Tax Assessment (1997 Act) Regulations 2021* ss 294-25.01 to 294-25.03, 294-80.01 to 294-80.03,
307-205.02; and **LCR 2016/9** *Superannuation reform: transfer balance cap* (a public ruling, binding
on the Commissioner except as to excess transfer balance tax). The **general** cap for FY2026-27 —
$2,100,000 — is already carried in §3.1 and is not restated here. This section is about the
**account**, not the cap amount.

**The one sentence that governs everything else.** The transfer balance is a **cumulative record of
capital moved into retirement phase**, not a valuation of the retirement-phase assets. It moves only
on the five credit events in s 294-25(1) and the eight debit events in s 294-80(1). Between events it
is inert: **investment earnings do not credit it and pension drawdowns do not debit it.**

| Constant / rule | Value | Kind | Source | Retrieved | Confidence |
|---|---|---|---|---|---|
| Account start | the **later** of 1 July 2017 and the day you **first start to be** a retirement phase recipient | structural | s 294-15(2) | 2026-09-09 | primary-verified |
| Account end | **death of the retirement phase recipient**, and nothing else — commuting every pension does not close it | structural | s 294-45; s 294-15(1) "*or have at any time been*"; LCR 2016/9 ¶12 | 2026-09-09 | primary-verified |
| Personal cap base year | the financial year the account **starts**; never resets | structural | s 294-35(1)–(2) | 2026-09-09 | primary-verified |
| Negative balance | permitted, no consequence | structural | s 294-30(2) Note 2; LCR 2016/9 ¶20 | 2026-09-09 | primary-verified |
| Credit on commencing a stream | the **value on the starting day** of the supporting interest — **not** the 1 July value, **not** the prior 30 June balance, **not** the TSB | computed | s 294-25(1) item 2 | 2026-09-09 | primary-verified |
| "Value" of an account-based interest | s 307-205(b), "*the total amount of all the \*superannuation lump sums that could be payable from the interest at that time*" — reg 307-205.02(2)(b)(ii) excludes account-based streams from the regulation method, so limb (a) is empty | derived | ss 307-205, reg 307-205.02(2) | 2026-09-09 | primary-verified chain; the last step (fully commutable ⇒ value = balance) is a **labelled inference**, BU10 |
| Investment earnings | **no credit** | structural | s 294-25(1), exhaustive, all 5 items + all 3 item-5 regs read; LCR 2016/9 ¶¶24, 24A, 39F | 2026-09-09 | primary-verified (exhaustive-table reading) + public-ruling-corroborated; **the negative is an argument from the absence of a provision** |
| Pension drawdown | **no debit** | structural | s 294-80(1) item 1 requires a **\*superannuation lump sum**; s 307-65(1) defines that as "*a \*superannuation benefit that is **not** a \*superannuation income stream benefit*"; s 307-70(1); LCR 2016/9 ¶¶24A, 24B, 25 | 2026-09-09 | primary-verified (positive definitional exclusion, not merely absence) |
| Partial commutation | **debit = the lump sum**, on the day it is **received** | computed, on a user characterisation | s 294-80(1) item 1; s 307-65(2); LCR 2016/9 ¶¶41, 43 | 2026-09-09 | primary-verified |
| TRIS → retirement phase, by **age 65** | converts **on the 65th birthday**, no notification: item 106 is s 307-80(2)(c)**(iv)** and (iv) is absent from the s 307-80(3)(b)(ii) notification list | computed | ss 307-80(2)(c)(iv), 307-80(3)(b); LCR 2016/9 ¶15 first bullet, ¶30B | 2026-09-09 | primary-verified on structure; **BU9** records a textual overlap the ATO's bullet does not address |
| TRIS → retirement phase, by **retirement / terminal medical / permanent incapacity** | converts on the **day the provider is notified**, which may be a later financial year than the retirement itself | Setting (notification day) | s 307-80(3)(b)(ii); LCR 2016/9 ¶30D (retires 30 June 2019, notifies 15 July 2019, credit 15 July 2019) | 2026-09-09 | primary-verified |
| TRIS conversion credit | item 2, at the **whole balance on the conversion day**, including all growth accumulated while the TRIS was out of retirement phase | computed | s 294-25(1) item 2; LCR 2016/9 ¶30D | 2026-09-09 | primary-verified |
| Reversionary credit | arises **12 months** after the starting day but at the **starting-day value** | — | s 294-25(1) items 1–2; LCR 2016/9 ¶38 | 2026-09-09 | primary-verified — **refused**, not modelled |
| Spouse cap pooling | **does not exist**; two accounts, two caps | structural | ss 294-15, 294-30, 294-35, all per-individual | 2026-09-09 | positive limb primary-verified; the non-existence is a **labelled inference from absence** |
| Capped defined benefit streams | **refused** — special value is annual entitlement × 16 (lifetime) or × remaining term (life expectancy / market linked), and s 294-140 replaces the excess rule with a lesser-of-two-excesses test | refusal | ss 294-125, 294-130, 294-135(1)–(3), 294-140; TAA Sch 1 s 136-80(2) | 2026-09-09 | primary-verified |

**Settings this section requires, per Person** (none derivable): (1) whether a transfer balance
account already exists and its **start financial year**; (2) the **opening transfer balance**; (3) the
**highest end-of-day transfer balance ever** and the **earliest day** it was reached — distinct from
(2), and the input that drives s 294-40 proportional indexation; (4) each stream's **commencement
day**; (5) the **TRIS conversion basis** (`age65` | `retirement`) and, for `retirement`, the
**notification day**; (6) each above-minimum withdrawal's **characterisation** (`pensionPayment` |
`partialCommutation`), defaulting to `pensionPayment`.

**Named refusals.** `PreForecastTransferBalanceNotDerivable` · `TransferBalanceCapExceeded` (a plan
that breaches is infeasible, not taxable — the tool reports the excess and the commutation required
and declines to price s 294-235 notional earnings) · `CappedDefinedBenefitIncomeStreamNotModelled` ·
`ReversionaryPensionNotModelled` · `LRBACreditNotModelled` ·
`DeferredAndCappedDefinedBenefitCreditsNotModelled` · `StructuredSettlementNotModelled` ·
`FraudAndBankruptcyDebitsNotModelled` · `PaymentSplitNotModelled` ·
`StreamCeasedOutsideCommutationNotModelled`. Between them these cover **credit items 1, 4 and 5, the
reversionary limb of item 2, and debit items 2, 3, 4, 5, 6, 7 and 8** — i.e. everything in both
tables except item 2 credits and item 1 debits, which is the honest scope of a tool that models two
people's own account-based super.

**Cross-reference to §3.9.** The transfer balance credit reads the **commencement-day** value
**once, ever**; the Schedule 7 minimum reads the commencement-day balance in the commencement year
and the **1 July** balance in every later year (T56). They are different rules on different days and
must not share a "pension balance as at" helper. A `partialCommutation` also produces a debit here
while **not** counting toward the §3.9 minimum, so the characterisation input is shared and must be
read consistently by both (BO41).

**Proposed traps for §1:** BT58–BT71 above, to be renumbered on consolidation.

---

## FETCH LOG

All fetches on **2026-09-09** with `curl` and a browser User-Agent
(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 … Chrome/126.0 Safari/537.36`).
Base URL for ITAA 1997 sections: `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F<section>`.
Base URL for *Income Tax Assessment (1997 Act) Regulations 2021* sections:
`https://www.ato.gov.au/law/view/document?DocID=REG%2F20210206%2F<section>`.
Base URL for Law Companion Rulings: `https://www.ato.gov.au/law/view/document?DocID=COG%2FLCR<n>%2FNAT%2FATO%2F00001`.
Raw HTML was saved and stripped to text with a local extractor; no text below was written from memory.

| # | URL / DocID | Result | What came back |
|---|---|---|---|
| 1 | `PAC%2F19970038%2F294-50` | **200**, 117 KB | s 294-50 *Assumptions about income streams* in full — subsections (1), (2), (3), plus the superseded pre-2017 text. The research doc had only (3); (1) and (2) added here. |
| 2 | `PAC%2F19970038%2F294-130` | **200**, 118 KB | s 294-130 *Meaning of capped defined benefit income stream* — the 7-item table and the "*in the retirement phase just before 1 July 2017*" condition on items 2–7. |
| 3 | `PAC%2F19970038%2F294-135` | **200**, 118 KB | s 294-135 — special value: × 16 for lifetime products, × remaining term for life expectancy / market linked. |
| 4 | `PAC%2F19970038%2F294-120` | **200**, 115 KB | Guide to Subdiv 294-D + the Subdivision's table of sections (294-125 to 294-145). |
| 5 | `PAC%2F19970038%2F294-125` | **200**, 112 KB | s 294-125 — "*This Subdivision applies to you if you are the \*retirement phase recipient of a \*capped defined benefit income stream.*" |
| 6 | `PAC%2F19970038%2F294-140` | **200**, 116 KB | s 294-140 — the lesser-of-two-excesses rule and the `capped defined benefit balance`. |
| 7 | `PAC%2F19970038%2F294-145` | **200**, 142 KB | s 294-145 — the substituted item 1 debit (`debit value`) for capped defined benefit streams; sub (1) substituted by No 64 of 2020, applicable on or after 1 July 2017. |
| 8 | `PAC%2F19970038%2F307-65` | **200**, 116 KB | s 307-65 — "*A **superannuation lump sum** is a \*superannuation benefit that is not a \*superannuation income stream benefit*"; (2) treats a **partial commutation** payment as a lump sum. **The provision that settles BT59.** |
| 9 | `PAC%2F19970038%2F307-70` | **200**, 113 KB | s 307-70 — superannuation income stream benefit / superannuation income stream, both defined by regulation; note pointing to s 294-50(2). |
| 10 | `PAC%2F19970038%2F307-205` | **200**, 118 KB | s 307-205 *Value of superannuation interest*, as amended by **No 8 of 2026** effective 1 April 2026 (subsection numbering removed; the accumulation-phase-value limb repealed). |
| 11 | `REG%2F20210206%2F307-205.02` | **200**, 114 KB | reg 307-205.02 — its subsection (2)(b)(ii) **excludes** streams based on "*the amount available in the member's account*", i.e. account-based pensions, so s 307-205(b) governs them. |
| 12 | `REG%2F20210206%2F307-205.02B` | **200** | reg 307-205.02B — value for **public sector** superannuation schemes. Not applicable to an account-based interest; noted, not read in full (BO43). |
| 13 | `REG%2F20210206%2F294-25.01` | **200** | Credit item 5: consideration paid for a **deferred** superannuation income stream interest. Amount = the consideration; arises when paid. |
| 14 | `REG%2F20210206%2F294-25.02` | **200** | Credit item 5: commutation of a **capped defined benefit** stream rolled directly into a life-expectancy or market-linked stream. |
| 15 | `REG%2F20210206%2F294-25.03` | **200** | Credit item 5: **successor fund transfer** of a capped defined benefit stream; credit = the item 6 debit; sub (4) switches off table item 2 for that stream. |
| 16 | `REG%2F20210206%2F294-80.01` | **200** | Debit item 8: CPI-exclusive **reduction** in a capped defined benefit stream benefit; amount = the fall in special value; arises at the later time. |
| 17 | `REG%2F20210206%2F294-80.02` | **200** | Debit item 8: **deferred** stream under reg 307-205.02C(1); amount = benefits payable on voluntary cessation. |
| 18 | `REG%2F20210206%2F294-80.03` | **200** | Made under s 294-80(3): items 5 and 6 do not apply to reg 307-205.02C(1) deferred streams. |
| 19 | `REG%2F20210206%2F294-80.04` | **404** | **Failure — no such section.** Confirms regs 294-80.01 to .03 are the complete item-8 set. |
| 20 | `REG%2F20210206%2F294-145.01` | **200** | Exists — the `debit value` method for s 294-145(7). Header confirmed only; not read in full (BO43). |
| 21 | `COG%2FLCR20169%2FNAT%2FATO%2F00001` | **200** | **LCR 2016/9** *Superannuation reform: transfer balance cap*, consolidated version, 877 lines of extracted text. Paras 11–17C, 20–30D, 31–46, 55–68B read. The source for ¶¶24, 24A, 24B, 25, 27, 30B, 30D, 38, 39F, 41, 43. A **public ruling**, binding except as to excess transfer balance tax. |
| 22 | `COG%2FLCR20168%2FNAT%2FATO%2F00001` | **200** | Title confirmed as *transitional CGT relief* — **not** this cluster. Not read further. |
| 23 | `COG%2FLCR201610%2FNAT%2FATO%2F00001` | **200** | Title confirmed: *capped defined benefit income streams — non-commutable, lifetime pensions and lifetime annuities*. Title only; not read (the cluster refuses CDB). |
| 24 | `COG%2FLCR20173%2FNAT%2FATO%2F00001` | **200** | Title confirmed: *Superannuation death benefits and the transfer balance cap*. Title only; not read (out of scope). |
| 25 | `LCR%2FLCR20169%2FNAT%2FATO%2F00001` | **404** | **Failure.** The `LCR/` prefix does not work for Law Companion Rulings on this database. |
| 26 | `LCR%2FLCR20168%2FNAT%2FATO%2F00001` | **404** | **Failure.** Same. |
| 27 | `SAL%2FITAR2021%2F307-205.02` | **404** | **Failure.** Guessed prefix for the ITAR 2021; wrong. |
| 28 | `https://www.ato.gov.au/law/view/results?query=LCR%202016%2F9` | **302** | **Failure.** The Legal Database search endpoint redirects and returns no usable result to `curl`. |
| 29 | `https://api.prod.legislation.gov.au/v1/titles/search(criteria='Income%20Tax%20Assessment%20(1997%20Act)%20Regulations%202021')?$top=5` | **400** | **Failure** — "*Unexpected error / cannot parse Income*". The OData `search(criteria=…)` form rejects unquoted-parenthesis titles. Not retried; the ATO `REG/20210206/` route succeeded instead. |

**Recipe notes for the next pass, confirmed by this one:**
`DocID=PAC%2F19970038%2F<section>` works for every ITAA 1997 section tried (7 for 7, no 403).
`DocID=REG%2F20210206%2F<section>` is the working form for the **Income Tax Assessment (1997 Act)
Regulations 2021** (8 for 9; the single 404 was a section that does not exist).
**Law Companion Rulings use `COG%2FLCR<year><n>%2FNAT%2FATO%2F00001`, not `LCR%2F…`** — the `LCR/`
prefix 404s. The Legal Database `results?query=` search endpoint is unusable from `curl` (302).

**Not fetched, and recorded as BO43:** reg 294-130.01, regs 307-205.02C/02D/02E, reg 294-145.01 in
full, and *Income Tax (Transitional Provisions) Act 1997* Subdiv 294-A/294-B.
