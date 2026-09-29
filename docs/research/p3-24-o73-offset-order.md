# O73 — Offset application order (s 63-10) and the SAPTO transfer precondition vs WATO

STATUS: in progress

## Questions

**Q1.** Is the ITAA 1997 s 63-10(1) tax-offset priority table *mandatory* as an order of
application, or is it only a priority rule for particular purposes (absorption, refundability,
carry-forward)? What turns on the order — can it change **net tax payable** for a household, or
only the **composition** of which offset was consumed? WATO (Subdiv 61-E, FY2027-28+) is
non-refundable, non-transferable, no carry-forward, and sits at table item 3, ahead of SAPTO
(item 5).

**Q2.** The SAPTO spouse transfer is conditioned on a "tax payable" quantity, which
`docs/assumptions-register.md` calls "reg s 12's tax-payable precondition". Verify that citation
(do not assume it is right). Then: is the transferable/unused SAPTO measured **before or after**
WATO is applied? If WATO is applied first and absorbs tax, does that **reduce** the SAPTO
available to transfer to the spouse?

## Deliverables

- Answers to Q1 and Q2 in operative words.
- Worked numerical example for a SAPTO couple under each candidate reading.
- Every proposition labelled `primary-verified` / `secondary` / `unverified` with source.
- Explicit could-not-verify list.
- Recommendation: close O73 or keep it open, and exactly what would close it.

<!-- findings appended below as they are established -->

---

## Q1 — ANSWER: the order is MANDATORY, and it is not neutral for a SAPTO couple

`primary-verified` — ITAA 1997 s 63-10(1), ATO Legal Database consolidation retrieved
2026-09-15, https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F63-10

**Operative words (s 63-10(1), opening):**

> "If you have one or more \*tax offsets for an income year, **apply them against your basic
> income tax liability in the order shown in the table**. To the extent that an amount of a tax
> offset remains, the table tells you what happens to it."

Two things follow from those two sentences, and they must be kept apart:

1. **"apply them … in the order shown in the table" is imperative.** It is not a list of
   priorities for particular purposes; it is the rule for the order of application itself. There
   is no discretion, no "may", and no purposive limitation ("for the purposes of …") of the kind
   the SAPTO transfer provision itself carries. So the table order is mandatory.
   `primary-verified`.
2. **What turns on the order is the identity of the excess, not the size of the total applied.**
   The second sentence is the whole payload: the table's third column attaches a *different
   consequence to each item's* remainder. Ordering therefore decides **which** offset is the one
   left over, and the leftover's fate (lost / transferred / refunded / carried forward) is
   item-specific.

**Confirmation that s 63-10 is the Div 63 rule and not a mere signpost:** ITAA 1997 s 4-10(3)
method statement step 4 does the subtraction in the aggregate ("Subtract your \*tax offsets from
your basic income tax liability"), and its **Note 1** hands the excess case to Division 63 —
"Division 63 explains what happens if your tax offsets exceed your basic income tax liability".
So step 4 never orders anything; s 63-10 is the only ordering rule, and it exists precisely to
resolve the excess case. `primary-verified` —
https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F4-10

**The table as it stands for FY2027-28** (`primary-verified`, same source; item 3 inserted by
**Act No. 49 of 2026, s 3 and Sch 3 item 2, effective 1 July 2026 and applicable in relation to
assessments for the 2027-28 income year and later income years** — history note read directly):

| item | offset | what happens to any excess |
|---|---|---|
| **3** | Subdiv 61-E — **WATO** | "You cannot get a refund of it, you cannot transfer it and you cannot carry it forward" |
| 5 | ITAA 1936 s 160AAAA — **SAPTO** | "**Your entitlement to it is transferred in accordance with regulations made under that Act**" |
| 10 | s 160AAAB — SAPTO, trustee assessed under s 98 | transferred under the regulations |
| 15 | s 160AAA — certain benefits | transferred under the regulations |
| **20** | "Any \*tax offset not covered by another item in this table" — **LITO lands here** | lost |
| 21 | Subdiv 301-F veterans' invalidity | against Medicare levy, then MLS, then lost |
| 22 | Div 770 foreign income tax | against Medicare levy, then MLS, then lost |
| 40 | refundable offsets (Div 67) | "You can get a refund of the remaining amount" |
| 45 | franking deficit tax | carry forward under s 205-70 |

Note 5 to the table confirms items 5 and 10 are the seniors offset.

### Can the order change net tax payable?

**For a single taxpayer whose every offset's excess is lost: no** — only the composition changes.
Applying A then B or B then A both consume `min(A+B, liability)`; the total subtracted at s 4-10(3)
step 4 is identical, so net tax payable is identical. That is the proposition
`householdIncomeTax` already relies on.

**For a SAPTO couple: yes, it can change the household's net tax, and only in one direction.**
`primary-verified` as to the mechanism (s 63-10(1) items 3 and 5 read together), `unverified` as
to the quantum until Q2 is settled. Reasoning:

- SAPTO's excess is the one excess in the table that is **transferred to the spouse**, not lost.
- WATO at item 3 is consumed **before** SAPTO at item 5. Every dollar of basic income tax
  liability WATO eats is a dollar SAPTO does not get to absorb, so the SAPTO **remainder grows by
  exactly the amount of WATO applied** (up to the point SAPTO is wholly unused).
- A bigger SAPTO remainder is a bigger transfer to the spouse, and therefore a bigger offset on
  the *spouse's* return — to the extent the spouse has liability to absorb it.

So: **WATO-first is weakly taxpayer-favourable at the household level.** Reversing the order
(SAPTO first) would consume liability with the transferable offset and leave the *non*-transferable
WATO as the excess, which is then simply lost. The transferor's own tax is nil either way; the
difference lands entirely on the spouse's return. The ceiling on the effect is
`min(WATO applied to the transferor, the spouse's remaining capacity to absorb offsets)` — it is
nil whenever the spouse has no residual liability, which is the common case for a retired SAPTO
couple.

**Consequence for the register:** §2.2/§2.3's note that "the relative order of two non-refundable
offsets cannot change the net figure" is **true only where every excess is lost**. It is not a
safe general statement once item 5 is in play. This is a *finding*, not a design decision.

STATUS: Q1 answered. Q2 in progress.

---

## Q2 — ANSWER

### (a) The citation is CORRECT — but it is the right section of an instrument whose *name* matters

`primary-verified` — Federal Register of Legislation, title record **F2025L01060**, name
**"Income Tax Assessment (1936 Act) Regulations 2025"**, made 4 September 2025, registered
9 September 2025, status InForce (API: `https://api.prod.legislation.gov.au/v1/titles/F2025L01060`).
Full text read from the as-made ePub:
https://www.legislation.gov.au/F2025L01060/asmade/2025-09-09/text/original/epub/OEBPS/document_1/document_1.html

**Section 12** of that instrument is headed **"Transfer of unused base rebate amount from
individual taxpayer to spouse or spouse's trustee"**, and it sits in Part 5 Division 1 alongside
s 9 (Key concepts), s 10 (Entitlement to rebate) and s 11 (Amount of rebate). So the register's
"reg s 12" is the right provision of the right instrument. **No citation error found.**
(Pedantic note only: the 2025 Regulations use *sections*, not *regulations*, so "reg s 12" is
mildly redundant but not wrong. The instrument is made under the ITAA **1936** — s 3 Authority.)

### (b) The precondition's operative words

**s 12(1)** — "This section applies if: (a) either: (i) an individual … is entitled to a rebate
under section 160AAAA of the Act for a year of income; … and

> **"(b) the base rebate amount for the rebate exceeds: (i) … the tax payable by the taxpayer in
> respect of income of the year; … (disregarding any credits or rebates); and"**

(c) a person is at any time in the year the individual's spouse; and (d) the spouse … is entitled
to a rebate … under section 160AAAA …; and (e) the amount of the spouse's rebate … is less than
the base rebate amount for that rebate."

**s 12(3)** — "**For the purposes of subsection 11(2) (but not section 10)**: (a) the base rebate
amount for the taxpayer's rebate is **reduced** by the amount of the excess mentioned in
paragraph (1)(b) …; and (b) the base rebate amount for the spouse's rebate … is **increased** by:
(i) the amount of the excess mentioned in paragraph (1)(b) …; or (ii) if the conditions in
subsection (4) are met — the greater of the amount worked out using the following formula and nil"
[the `BRA − (TI − 6,000) × 0.15` formula]. Note: "Changing the base rebate amount may also change
the rebate threshold: see subsections 9(4) to (7)."

**s 12(4)** — the (3)(b)(ii) formula branch applies where "(a) … the taxpayer's taxable income for
the year" is "greater than $6,000; and (b) … each rate of tax payable by the taxpayer is a rate set
out in Part I of Schedule 7 to the *Income Tax Rates Act 1986*" (i.e. resident rates).

All `primary-verified` from the source above.

### (c) Before or after WATO? — **BEFORE**, and on the better reading WATO is disregarded entirely

Two findings, in order of importance.

**Finding 1 (structural, `primary-verified`) — the transferable amount is NOT the s 63-10 residual,
so the s 63-10 ordering cannot touch it.** s 63-10(1) item 5 says the excess "is transferred **in
accordance with regulations made under that Act**". It does not itself transfer anything, and it
does not define the quantity. The operative machinery is reg s 12, which never asks what actually
remained after applying offsets in table order. It computes its own quantity two ways:

- the **s 12(1)(b) excess** = `base rebate amount − tax payable (disregarding any credits or
  rebates)`; or
- where the taxpayer is on resident rates with taxable income above $6,000, the **s 12(3)(b)(ii)
  formula** = `max(0, BRA − (taxable income − 6,000) × 0.15)`, which references **taxable income
  only** and no tax-payable quantity at all.

Neither is a function of which offsets were consumed, or in what order. **So the register's O73 /
§2.8.1 claim that "applying WATO first consumes basic income tax liability ahead of SAPTO and
thereby *increases* the SAPTO excess available to transfer" is not supported by the regulation.**
That claim treats s 63-10 item 5's "excess" as the transferred amount; reg s 12 supplies the
amount, and it is order-blind. Flag this as a correction to §2.8.1's paragraph and to the O73 row.
(The Q1 mechanism above is therefore correct *in the abstract* — order decides whose excess it is —
but it has no dollar consequence here, because the transfer's size does not come from that excess.)

**Finding 2 (textual, on the precondition itself) — "(disregarding any credits or rebates)".**
Where the s 12(1)(b) quantity does bite (the **gate**, and the residual branch's amount), the
parenthetical expressly strips offsets out of "tax payable". Two readings:

- **Reading A — WATO is disregarded (`secondary`, preferred).** "Rebate" is the ITAA 1936's generic
  word for what the ITAA 1997 calls a tax offset; the two are used for the same thing in the same
  breath here — s 63-10(1) item 5 calls the s 160AAAA amount a "\*tax offset" while s 160AAAA and
  the 2025 Regulations call it a "rebate". On this reading "tax payable … disregarding any credits
  or rebates" is **basic income tax liability, gross of every offset** — WATO, LITO and SAPTO
  alike. The quantity is measured **before** WATO, WATO does **not** reduce the transferable SAPTO,
  and the answer is order-independent.
- **Reading B — "rebates" means only ITAA 1936 rebates (`unverified`, disfavoured).** Then WATO
  (an ITAA 1997 Subdiv 61-E tax offset) would reduce "tax payable" and the gate would open more
  easily. This reading has the same consequence for **LITO** (ITAA 1997 Subdiv 61-D), so it is not
  a new question WATO introduces — it is a pre-existing one the engine has already answered.

**Why the instrument does not itself resolve A vs B:** neither the 2025 Regulations s 4
(Definitions — read in full; it defines *base rebate amount*, *lowest marginal tax rate*,
*rebatable benefit amount*, *rebate maximum amount* $445, *rebate reduction rate* 0.015, *rebate
reduction threshold* $37,000, *rebate threshold*, but **not** "rebate" or "tax payable") nor ITAA
1936 s 6(1) (read in full for "rebate" / "tax offset" — s 6(1) defines *rebate income*,
*rebatable medical expense amount*, *tax offset refund* and several named offsets, but has **no**
definition of "rebate" simpliciter) supplies a definition. `primary-verified` as to the absence.
So on the instrument alone the point is **not expressly resolved** — it is resolved by ordinary
reading plus Finding 3.

**Finding 3 (decisive in practice, `primary-verified` arithmetic on primary provisions) — the two
provisions cannot overlap for a resident couple, so A vs B is worth $0.** Three facts collide:

1. WATO as *applied* is capped at the taxpayer's **actual basic income tax liability on actual
   taxable income** (register §2.8, s 63-10(1) — a non-refundable offset cannot exceed liability).
   So WATO applied is nil whenever taxable income is at or below the $18,200 tax-free threshold.
2. The s 12(3)(b)(ii) transfer formula reaches **nil** at taxable income
   `6,000 + BRA / 0.15` = `6,000 + 1,602 / 0.15` = **$16,680** (couple BRA $1,602).
3. $16,680 < $18,200.

Therefore, **over the whole resident domain, wherever the transferred amount is positive the WATO
actually applied is zero, and wherever WATO is positive the transferred amount is already zero.**
The residual branch (s 12(1)(b), reached only at taxable income ≤ $6,000 or on non-resident rates)
is likewise a nil-liability zone for a resident. The gap is $1,520 of taxable income wide and
carries no dollars either way.

**Plain statement:** the regulation does **not** expressly say "before WATO" in those words. It
says the quantity is "tax payable … disregarding any credits or rebates", which on the better
reading is gross basic liability and therefore before WATO; and it makes the *amount* depend on
taxable income alone in the branch that matters. Either way, **WATO cannot reduce the SAPTO
available to transfer.**

STATUS: Q1 and Q2 answered. Worked example and recommendation in progress.

---

## Worked example — a SAPTO couple, both candidate readings, in dollars

**Assumed inputs** (stated because several are stand-ins, not law for the year in question):

- Both Persons are SAPTO-eligible as members of a **couple**; **base rebate amount $1,602** each
  (register §2.3/§2.4, FY2026-27 couple BRA). Living together; not illness-separated.
- Rate scale: the **FY2026-27** resident scale ($18,200 tax-free threshold, 16% lowest rate) is used
  as a **stand-in** because FY2027-28 has no bracket table in the build
  (`MissingBracketTableError`) and this research pass is forbidden to invent one. The *conclusion*
  does not depend on the scale — see the sensitivity note below.
- WATO: **$250 maximum**, no taper, `min($250, basic income tax liability that net labour income
  alone would bear)`, and non-refundable so also capped by actual basic liability (register §2.8.1).
- All employment income is salary, so **net labour income = taxable income** in these cases.
- Medicare levy ignored throughout — WATO has **no** Medicare-levy limb (s 63-10(1) item 3 carries
  none, unlike items 21 and 22), so it cannot move that number.

### Case 1 — the transfer is live (Person A taxable income $12,000; Person B $45,000)

| step | Reading A (WATO disregarded — "tax payable" is gross) | Reading B (WATO reduces "tax payable") |
|---|---|---|
| A's basic income tax liability | $0 (below $18,200) | $0 |
| A's WATO *applied* | $0 (capped by nil liability) | $0 |
| s 12(1)(b) gate: BRA $1,602 > tax payable? | $1,602 > $0 → **open** | $1,602 > $0 → **open** |
| transfer amount (s 12(3)(b)(ii), TI > $6,000, resident) | `max(0, 1,602 − (12,000 − 6,000) × 0.15)` = **$702** | **$702** |
| B's BRA\* | $2,304 (threshold re-derived per T4) | $2,304 |
| **household difference** | — | **$0** |

### Case 2 — the gate is genuinely contestable (Person A taxable income $28,500)

This is the only band where the two readings disagree about anything at all: A's basic liability
`(28,500 − 18,200) × 0.16` = **$1,648**, which straddles the $1,602 BRA once $250 of WATO is in
play.

| step | Reading A | Reading B |
|---|---|---|
| A's basic income tax liability | $1,648 | $1,648 |
| A's WATO applied | $250 | $250 |
| "tax payable" for s 12(1)(b) | **$1,648** (gross) | **$1,398** ($1,648 − $250) |
| gate: BRA $1,602 > tax payable? | $1,602 > $1,648 → **CLOSED** | $1,602 > $1,398 → **OPEN** |
| transfer amount | n/a — $0 | `max(0, 1,602 − (28,500 − 6,000) × 0.15)` = `max(0, 1,602 − 3,375)` = **$0** |
| **household difference** | — | **$0** |

**The disagreement is real and it is worth nothing.** Reading B opens a gate onto a formula that
has already tapered to nil. That is not a coincidence of the chosen numbers: the formula hits nil
at taxable income **$16,680**, and WATO cannot be *applied* at all below **$18,200**, so the
positive-transfer region and the positive-WATO region are **disjoint by $1,520 of taxable income**.

**Sensitivity.** The gap survives a change of scale as long as
`6,000 + BRA / 0.15 < tax-free threshold`. With BRA $1,602 that is `$16,680 < $18,200` — true, with
$1,520 of headroom. It would close only if the couple BRA rose above **$1,830**
(`(18,200 − 6,000) × 0.15`), a ~14% increase, or if the tax-free threshold fell. Neither is in
prospect: §2.1 records bracket thresholds as never indexed, and the BRA is a regulation constant.
The reg's 0.15 is a frozen literal (T1) and does **not** follow the lowest marginal rate to 14% in
FY2027-28, so the FY2027-28 rate cut does not move $16,680 either. `secondary` (arithmetic on
primary-verified inputs).

### What the engine already does

`src/core/incomeTax.ts:366` implements the gate as
`if (baseRebateAmount <= taxOnTaxableIncome(fy, from.person.taxableIncome)) return null;` —
`taxOnTaxableIncome` is the **gross** basic liability with no offset subtracted, so the build has
**already adopted Reading A**, and has already been applying it to LITO (which is likewise not
deducted before the comparison). Adding WATO requires **no change** to this line. Recorded as an
observation; the design call is not mine to make.

---

## Confidence table

| # | Proposition | Label | Source |
|---|---|---|---|
| 1 | s 63-10(1) says "apply them against your basic income tax liability **in the order shown in the table**" — mandatory, not a listing | `primary-verified` | ITAA 1997 s 63-10(1), https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F63-10 |
| 2 | The table's third column attaches an item-specific consequence to each offset's remainder; order therefore fixes *which* offset is the excess | `primary-verified` | same |
| 3 | WATO is table **item 3**, excess lost; SAPTO is **item 5**, excess "transferred in accordance with regulations made under that Act"; LITO falls into **item 20**, lost | `primary-verified` | same |
| 4 | Item 3 inserted by **Act No. 49 of 2026 s 3 Sch 3 item 2**, effective 1 July 2026, applicable to assessments for **2027-28** and later | `primary-verified` | s 63-10(1) history note, same page |
| 5 | Item 3 carries **no Medicare-levy limb** (unlike items 21 and 22) | `primary-verified` | same |
| 6 | s 4-10(3) step 4 subtracts offsets in aggregate; Note 1 refers the excess case to Division 63 — s 63-10 is the only ordering rule | `primary-verified` | ITAA 1997 s 4-10, https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F4-10 |
| 7 | For a single taxpayer with all-excess-lost offsets, order changes composition only, never net tax | `secondary` (arithmetic on 1–3) | — |
| 8 | Order *can* matter at household level in principle, because item 5's excess is transferred rather than lost | `primary-verified` (mechanism) | s 63-10(1) items 3, 5 |
| 9 | The register's instrument name and section are right: **F2025L01060 = Income Tax Assessment (1936 Act) Regulations 2025**, s 12 = "Transfer of unused base rebate amount…" | `primary-verified` | https://api.prod.legislation.gov.au/v1/titles/F2025L01060 ; ePub text (link above) |
| 10 | s 12(1)(b): "the base rebate amount … exceeds … **the tax payable by the taxpayer in respect of income of the year** … **(disregarding any credits or rebates)**" | `primary-verified` | Regs 2025 s 12(1)(b), ePub text |
| 11 | s 12(3) operates "**for the purposes of subsection 11(2) (but not section 10)**" — confirms register T3 | `primary-verified` | Regs 2025 s 12(3) |
| 12 | s 12(3)(b)(ii)'s formula branch requires taxable income > $6,000 **and** resident rates (ITRA 1986 Sch 7 Pt I) — s 12(4) | `primary-verified` | Regs 2025 s 12(4) |
| 13 | The transferred amount is fixed by reg s 12 and is **not** the s 63-10 residual; it is order-blind | `primary-verified` | s 63-10(1) item 5 ("in accordance with regulations") + Regs 2025 ss 12(1)(b), 12(3) |
| 14 | **§2.8.1 / O73's claim that WATO-first increases the transferable SAPTO is wrong** | `primary-verified` (follows from 13) | as above |
| 15 | "Rebate" and "tax offset" are used interchangeably for the same amount (s 160AAAA "rebate" = s 63-10 item 5 "\*tax offset"), so "rebates" in s 12(1)(b) most naturally covers WATO ⇒ measured **before** WATO | `secondary` | s 63-10(1) item 5 vs Regs 2025 s 11 heading |
| 16 | Neither Regs 2025 s 4 nor ITAA 1936 s 6(1) defines "rebate" or "tax payable" — the instrument does **not** expressly resolve it | `primary-verified` (absence checked in full text of both) | Regs 2025 s 4; ITAA 1936 s 6, https://www.ato.gov.au/law/view/document?DocID=PAC%2F19360027%2F6 |
| 17 | Transfer formula hits nil at TI **$16,680**; WATO cannot be applied below TI **$18,200**; the regions are disjoint, so the reading is worth **$0** for a resident couple | `secondary` (arithmetic on primary inputs) | Regs 2025 s 12(3)(b)(ii); s 63-10(1) item 3 non-refundability |
| 18 | The build already implements Reading A at `src/core/incomeTax.ts:366` | `primary-verified` (code read) | repo |

---

## Could not verify

1. **Whether "rebates" in Regs 2025 s 12(1)(b) is a defined or judicially settled term covering
   ITAA 1997 tax offsets.** No definition in the instrument, none in ITAA 1936 s 6(1). No
   Explanatory Statement to F2025L01060, no ATO ruling and no case law was fetched on the point.
   Left as Reading A (`secondary`) vs Reading B (`unverified`).
2. **The Explanatory Statement to F2025L01060** — not fetched. It would very likely say whether
   s 12(1)(b) was intended as gross basic liability, and it is the cheapest remaining source.
3. **The Explanatory Memorandum to Act No. 49 of 2026 Sch 3** — not fetched. It would say whether
   placing WATO at item 3 rather than after SAPTO was a deliberate interaction choice.
4. **ATO guidance / worked examples for the SAPTO transfer in a year in which WATO exists.**
   FY2027-28 guidance does not yet exist; nothing was fetched.
5. **The FY2027-28 couple base rebate amount.** The $1,602 used above is the FY2026-27 figure. If
   the BRA is ever indexed above **$1,830** the disjointness in Finding 3 fails and the reading
   starts to matter. Not checked; the register carries no FY2027-28 BRA.
6. **Non-resident and trustee (s 160AAAB / s 98) paths.** The residual branch under s 12(1)(b)(ii)
   and the non-resident rate case were reasoned about but not worked through; WATO's own residency
   test was not re-read this pass. Out of scope for this Household (both Persons resident).
7. **Part-year / mid-year cases** — already open from P3-24 and untouched here.

---

## Recommendation

**O73 can be CLOSED as a blocker, and should be closed with a correction rather than a
confirmation.** Both limbs are answered:

- **Limb 1 (is the order mandatory?)** — **Yes.** s 63-10(1)'s "apply them … in the order shown in
  the table" is imperative, and what it governs is the identity of the excess and hence its fate.
  `primary-verified`. Nothing further to retrieve.
- **Limb 2 (where does the precondition sit?)** — **Before WATO, and in the branch that matters it
  does not look at tax payable at all.** The transferable amount is reg s 12's own quantity, not
  the s 63-10 residual, so it is order-blind; and even on the contrary reading of "(disregarding
  any credits or rebates)" the dollar difference for a resident SAPTO couple is **$0**, because the
  positive-transfer and positive-WATO regions are disjoint by $1,520 of taxable income.

**Two things must land in the register before O73 is struck out** (both are *record* changes, not
design decisions — I am not making either):

1. **Correct §2.8.1 and the O73 row.** The sentence "applying WATO first consumes basic income tax
   liability ahead of SAPTO and thereby *increases* the SAPTO excess available to transfer" does
   not survive reg s 12. It should be replaced by: the s 63-10 order fixes which offset is the
   excess, but the **amount transferred is set by reg s 12 independently of the order**, so for a
   SAPTO couple the ordering has **no dollar effect**. Leaving the current sentence in place is the
   live risk here — a future implementer will build an order-sensitive transfer that the regulation
   does not authorise.
2. **Record the Reading A / Reading B ambiguity as a small, non-blocking open item** (or a §2.6
   row), noting that (a) it is a **LITO** question at least as much as a WATO one, (b) the build
   already answers it Reading A at `src/core/incomeTax.ts:366`, and (c) it is worth $0 while the
   couple BRA stays below $1,830.

**What would close the residual ambiguity** if the user wants it closed rather than recorded: fetch
the **Explanatory Statement to F2025L01060** (one document) and, failing that, the EM to Act No. 49
of 2026 Sch 3. **User decision needed** on exactly one point: whether to accept Reading A — "tax
payable … disregarding any credits or rebates" means gross basic income tax liability, before
every offset — as a registered assumption, which is what the code already does and which costs
nothing under any FY2027-28 scenario this Household can reach.

STATUS: complete
