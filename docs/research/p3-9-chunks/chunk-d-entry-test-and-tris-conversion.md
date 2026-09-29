## D. The retirement-phase entry test and the TRIS conversion

**Scope of this section:** ITAA 1997 s 307-80 as an implementable decision procedure; the
notification asymmetry in s 307-80(3)(b)(ii); the 2019 reversionary carve-out in (aa); what
`src/core/superPhase.ts` must expose and refuse; the conversion event end to end; and the
retrospective-TRIS-failure finding at `docs/research/p3-minimum-drawdown-and-ttr.md` §3.4, which
this pass **re-opened and resolved** by retrieving ITAA 1997 s 307-70 and TR 2013/5.

Every provision quoted below is either already verbatim in §"RAW PRIMARY TEXT" of this file
(s 307-80, s 294-25, s 294-15, s 294-20, s 294-35, s 294-50) or was fetched by this pass and is
logged in **FETCH LOG**. Nothing is written from memory.

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
  (DU9, DO45).

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
  guards (DU10, DO41). Until it is retrieved, the item-101 mapping is `unverified` and the tool
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
chooses. **DU11 — refuse rather than choose.**

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
words and TR 2013/5 ¶10; the conclusion is a reading of them (DU15).**

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
apportionment question is answered, and answering it is not in this brief. See D-P3-8-CLOSURE.

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
with subregulation 1.06(1) of the SIS Regulations". **s 307-70.02 itself was not retrieved** (DO40) —
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
stream, which is trap T57's whole point. So ¶¶96–101's chain (reg 1.06(1) → reg 1.06(9A) → Sch 7)
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
| That mechanism applies to a breach of the **reg 6.01(2)(b)(ii) 10% maximum** specifically | **`secondary-only`, and an inference from ¶18's general words.** ATO web guidance (register §3.9's existing source) asserts it; the ruling never applies it to a maximum and gives no example. **DU13 / DO43** |

**Effect on code: none.** `ttrPaymentRange` already treats the ceiling as a hard constraint and does
not compute past it. What changes is the citation, the confidence basis, and the fact that the
consequence is **permanent** rather than annual — which belongs in the refusal message and in
§3.9's row.

---

## D-UNKNOWNS

**DU9 — The notification in s 307-80(3)(b)(ii) has no prescribed form, deadline, content or
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

**DU10 — SISR reg 6.01(7), the definition of "retirement", was never retrieved, so the mapping from
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

**DU11 — Whether reg 6.01(2)(b)(ii)'s "unless" removes the 10% ceiling for the WHOLE financial year
in which the condition is satisfied, or only from the day it is satisfied.** The provision limits
"total payments … made in a financial year"; the "unless" is a state of the pensioner, not a date.
*Why it matters to the money:* a member turning 65 in March could, on the whole-year reading, draw
the entire balance in April; on the from-that-day reading, payments made in July–February are still
tested against 10%. The two readings differ by up to the whole balance, and the wrong one either
declares a feasible plan infeasible or lets a forecast breach a limit whose breach is now known to
kill the stream permanently (D.6).
*What would close it:* the Explanatory Statement to the 2005 regulation that inserted the TRIS
definition (the same document O38 wants), or an ATO ruling. Not retrieved.

**DU12 — The ECPI apportionment for the conversion year is unresolved, and s 295-390 was never
retrieved.** s 295-385(3)(b) shows the segregated method requires an actuary's certificate — it is
not an arithmetic split — and register §5A.3 names both methods without stating an apportionment
rule.
*Why it matters to the money:* every conversion lands mid-year, so this is not an edge case, it is
**the** case. Until it is answered `fundEarningsTax` must refuse the conversion year, which means the
conversion limb of P3-8 cannot produce a tax figure for the year in which the conversion happens —
the single most valuable year in a TTR strategy.
*What would close it:* fetch ITAA 1997 s 295-390 and ss 295-395/295-400, plus the ATO's ECPI guidance
on the choice of method, and open a register row for the apportionment rule.

**DU13 — Whether a breach of the reg 6.01(2)(b)(ii) 10% MAXIMUM falls within TR 2013/5 ¶18.** See
D.6(d). The ruling's reasoning at ¶¶96–101 runs through reg 1.06(1)/1.06(9A), which contains no
maximum; only ¶18's general words reach it, and no example applies them.
*Why it matters to the money:* if it does not fall within ¶18, a 10% breach is a preservation/payment
standards contravention with its own (very different) consequences rather than a retrospective
income-tax cessation, and the "plan is infeasible" conclusion in §3.9 would be wrong in kind, not
just in degree.
*What would close it:* an ATO ID, private ruling, determination or SMSF auditor contravention
guidance addressing a TRIS that exceeded 10%.

**DU14 — ITAR (1997 Act) 2021 s 307-70.02(1) was not retrieved.** Only TR 2013/5 ¶52's partial
reproduction of subparagraph (a)(ii) is held, and the ruling itself says at fn [25] that it "does not
specifically consider pensions that are covered by paragraphs (b) to (c) of the definition, or rights
covered by paragraph (d) … and they have not been reproduced".
*Why it matters to the money:* it is the definition on which every "is this still a superannuation
income stream" question turns, including D.6's whole mechanism, and paragraph (d) (rights arising on
death) is what extends ECPI past a member's death.
*What would close it:* fetch the *Income Tax Assessment (1997 Act) Regulations 2021* s 307-70.02 from
legislation.gov.au (the ATO Legal Database `REG/19940057` prefix is the SIS Regulations and does not
serve it; the correct instrument identifier was not determined this pass).

**DU15 — Whether the conversion year's Schedule 7 minimum is genuinely a full-year minimum.** D.5
argues it is, from cl 3's confinement to "the commencement day", cl 1(2)(a)(ii)'s confinement to "the
year the pension commences", and TR 2013/5 ¶10's definition of commencement. No source states it.
*Why it matters to the money:* on a $500,000 balance the difference between a full-year and a
part-year minimum in the conversion year is several thousand dollars of forced drawdown, and the
minimum is a floor the plan must clear.
*What would close it:* an ATO worked example of a TRIS converting mid-year, or O39's commutation/
rollover proportioning research pass, which touches the same clause.

---

## D-TRAPS

**DT58 — Reading s 307-80(3)(b) alone and ignoring the conjunction with (a) and (aa).** (3) excludes
only where **(a) AND (aa) AND (b)** all hold.
*Test:* an ordinary account-based pension (not a listed kind), benefit payable, recipient has
satisfied no condition of release and has notified nobody, must be **retirement phase** — paragraph
(a) fails, so the carve-out cannot bite. An implementation that tests only "(b)" returns accumulation
and taxes exempt earnings at 15%.

**DT59 — Treating a met condition of release as sufficient to convert a TRIS.** For items 101, 102A
and 103 it is not: (3)(b)(ii) requires the member to have **notified the provider**.
*Test:* member retires 1 March, notifies the provider 1 September. Phase must be **accumulation**
throughout 1 March – 31 August and **retirement** from 1 September. An implementation keyed on
`release.met` converts on 1 March and exempts six months of fund earnings that are taxable, and dates
the transfer balance credit six months early at the wrong value.

**DT60 — The mirror error: requiring notification for the age-65 limb.** Item 106 is absent from
(3)(b)(ii)'s enumerated list, so no notification is required.
*Test:* member attains 65 on 14 February, has told nobody, still holds a TRIS. Phase must be
**retirement** from 14 February, and a s 294-25 item 2 credit must arise on that day for the whole
supporting interest's value. An implementation that demands notification leaves the stream in
accumulation indefinitely, taxes exempt earnings at 15%, and — worse — **misses the transfer balance
credit entirely**, so a member who is over their cap looks compliant.

**DT61 — Conflating reg 6.01(2)'s "Nil cashing restriction" set with s 307-80(2)(c)'s four-item
set.** The SISR set is strictly larger: it also contains items 102, 104 and 105(b).
*Test:* member satisfies item 104 (termination of employment with a standard employer-sponsor, with
preserved benefits under $200). The TTR maximum must **fall away** (reg 6.01(2)(b)(ii)'s "unless"
fires) while the phase must remain **accumulation** at 15% with **no** transfer balance credit
(item 104 is not in s 307-80(2)(c)). An implementation that derives phase from "the 10% no longer
applies" exempts the earnings and creates a credit that does not exist.

**DT62 — Collapsing the ceiling event and the phase event onto one day.** On the 101/102A/103 route
the ceiling falls away on the day the condition is **satisfied** (reg 6.01(2)(b)(ii) has no
notification word) and the phase changes on the day of **notification** (s 307-80(3)(b)(ii)).
*Test:* member retires 30 June, notifies 15 July. For 30 June there must be **no maximum**, **15%**
fund earnings tax and **no** transfer balance credit — three answers that no single "converted"
boolean can produce.

**DT63 — Treating the conversion as a commencement.** It is not: the same stream continues.
*Test:* TRIS commenced 2020, member turns 65 on 1 December 2026. The FY2026-27 Schedule 7 minimum
must be computed on the **1 July 2026 balance**, the **age at 1 July 2026**, with **no pro-rating**
and no cl 4 nil rule. An implementation that re-reads the balance on 1 December and pro-rates
211/365 produces a smaller, entirely plausible minimum.

**DT64 — Crediting the transfer balance account with the wrong amount.** s 294-25(1) item 2 credits
"the \*value on the starting day of the \*superannuation interest **that supports** the
superannuation income stream".
*Test:* a $900,000 TRIS converting must credit $900,000 on the conversion day — not the year's
pension payments, not the growth since commencement, not the amount "moved" (nothing is moved).

**DT65 — Treating a reverted TRIS as not in retirement phase because the beneficiary has met no
condition of release.** (3)(aa) takes it out of the carve-out entirely.
*Test:* a TRIS reverts to a 45-year-old reversionary beneficiary who has satisfied nothing and
notified nobody. On the statute the stream **is** in retirement phase. This project should
**refuse** rather than compute it (D.3) — so the test asserts a named refusal, not a 0% rate, and
must fail if the code silently returns either 15% or 0%.

**DT66 — Treating a 10% breach as costing one year.** TR 2013/5 ¶20: the stream "cannot recommence
meeting the SISR requirements in a future year"; ¶101: a new stream must be commenced and the
proportioning rule reapplied.
*Test:* a scenario that breaches in FY2027-28 must not show the same stream running normally in
FY2028-29. If the model cannot represent the death of a stream, it must refuse the breaching year
rather than continue past it.

**DT67 — Citing TR 2013/5 ¶71B's plain-English gloss instead of s 307-80(3)(b)(ii).** ¶71B says a
TRIS "will not be in the retirement phase unless the person **has met a specified condition of
release**", omitting notification.
*Test:* the same fixture as DT59. Any comment, docstring or register row whose wording follows ¶71B
rather than the statute will encode the wrong answer for Case B; a source-text canary asserting that
the notification requirement appears in the module's own reasoning is the cheap guard.

**DT68 — Treating entry into retirement phase as an act the user chooses.** On the item-106 route it
is automatic.
*Test:* a member with a $2.4m TRIS who turns 65 in FY2026-27 and does nothing must show a
$2.4m credit on their birthday, an excess transfer balance against the $2,100,000 cap, and — under
s 294-40(1)(b) — permanent loss of proportional indexation. A model that only creates credits when
the user commences a pension shows this member as compliant forever.

---

## D-OPEN-ITEMS

**DO40 — ITAR (1997 Act) 2021 s 307-70.02 not retrieved.** The operative definition of
"superannuation income stream", to which ITAA 1997 s 307-70(2) delegates and on which the whole of
D.6 depends. Only TR 2013/5 ¶52's partial reproduction of subparagraph (a)(ii) is held. *Closes by:*
locating the *Income Tax Assessment (1997 Act) Regulations 2021* on legislation.gov.au (the ATO Legal
Database `REG/19940057` prefix serves the SIS Regulations only; the correct DocID or FRL identifier
for the ITAR was not determined) and fetching s 307-70.02 in full, including paragraphs (b)–(d) and
subsections (2)–(6). See DU14.

**DO41 — SISR reg 6.01(7) ("retirement") not retrieved.** Blocks the mapping from this model's
`ReleaseGround` values to Schedule 1 item 101, which s 307-80(3)(b) requires. Already implicated in
`CessationBeforePreservationAgeError`. *Closes by:* `REG/19940057/6.01(7)`. See DU10.

**DO42 — ITAA 1997 s 295-390 (the proportionate ECPI method) not retrieved, and no apportionment
rule exists in the register.** This is the **binding blocker** on the conversion limb of P3-8: every
conversion is mid-year. *Closes by:* fetching s 295-390 (and ss 295-395, 295-400) and opening a
register row for the choice-of-method and apportionment rule. See DU12.

**DO43 — No source applies TR 2013/5's cessation mechanism to a breach of the 10% MAXIMUM.** The
ruling's reasoning runs through reg 1.06(9A), which contains no maximum; only ¶18's general words
reach it. The register currently cites TR 2013/5 as if it stated the maximum consequence. *Closes
by:* an ATO ID, private ruling, determination, or auditor contravention guidance on a TRIS that
exceeded 10%. **Supersedes the "not retrieved" half of the existing §3.9 note; the "not retrieved"
statement is now false and the citation is now wrong.** See DU13.

**DO44 — "\*value" of a superannuation interest (ITAA 1997 s 307-205 and the regulations for it) is a
DEPENDENCY on the s 294-25 chunk, not an open item of this one.** Recorded so the conversion limb
does not re-research it. The conversion limb asserts the **starting day** and that the credit is of
the **whole supporting interest**; it asserts nothing about how the value is measured.

**DO45 — No form, deadline, content or evidentiary rule was found for a s 307-80(3)(b)(ii)
notification, and the SMSF member-trustee case is unaddressed.** *Closes by:* ATO guidance or a
ruling; see DU9. Until then the notification day is a **stated fact**, and the tool should say in
its provenance that the day was stated and not derived.

**DO46 — Whether reg 6.01(2)(b)(ii)'s "unless" lapses the ceiling for the whole year or only
prospectively.** See DU11. *Closes by:* the Explanatory Statement to the regulation that inserted
the TRIS definition — the same document O38 wants, so one retrieval closes both.

---

## D-P3-8-CLOSURE

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
* Write §3.10 and the §3.9 corrections (D-REGISTER-EDITS).
* Write every test in D-TRAPS **except** those that need a fund earnings tax figure for the
  conversion year.

**What remains BLOCKED, and by what:**

| Blocked | Blocked by |
|---|---|
| **A fund earnings tax figure for the conversion year** — i.e. the number a TTR strategy is actually evaluated on | **DO42 / DU12.** Every conversion is mid-year, and `MidYearPhaseChangeError` refuses mid-year phase changes because §5A.3 states no apportionment rule and s 295-390 was never retrieved. **This is the binding constraint on the whole limb.** |
| **The amount of the transfer balance credit** | **DO44** — the s 294-25 chunk owns "\*value". The conversion limb can assert the day and the object; it cannot assert the number. |
| **A cap check on the credit** | **P3-9.** The credit is computable in principle but there is no transfer balance account, no personal cap and no excess machinery in `src/`. |
| **Item-101 identification for a Person aged 60–64 who ceased employment** | **DO41 / DU10** — reg 6.01(7) unretrieved. |
| **Any reversionary case** | **D.3** — refuse; needs death benefits, Subdiv 294-E and reg 6.21, none in the register. |
| **The 10%-breach path** | Not blocked for **enforcement** (the ceiling is already a hard constraint), but blocked for **modelling what happens after** a breach: TR 2013/5 ¶20 says the stream dies permanently, and the model has no way to represent a dead stream. Until it does, the breaching year must refuse. |

**One-line summary for TODO.md P3-8:** the *legal* content of the conversion limb is now closed
except for the item-101 mapping; the *computational* content is blocked on ECPI apportionment
(DO42), which is a different research pass and is not in this brief.

---

## D-REGISTER-EDITS

> Drafted, **not applied.** Nothing in the repository was modified by this pass.

### NEW — §3.10 Retirement phase: the entry test — ITAA 1997 s 307-80

Insert after §3.9, before §4.

> ### 3.10 Retirement phase — the entry test, ITAA 1997 s 307-80
>
> **Added 2026-09-09** by `docs/research/p3-transfer-balance-cap.md`, read off the ATO Legal
> Database at `PAC/19970038/307-80`, `307-75`, `307-70`, `307-65` and `295-385`, the *Superannuation
> Industry (Supervision) Regulations 1994* Schedule 1 at `REG/19940057/Sch1` and reg 6.01(2) at
> `REG/19940057/6.01(2)`, and against **LCR 2016/9** and **TR 2013/5**. This section is what
> `src/core/superPhase.ts` records as missing: "§3.1 gives the two rates and §5A.3 names ECPI …
> neither states ITAA 1997 s 307-80's test, and no row anywhere says what makes a stream a
> retirement phase stream."
>
> **Phase is not a property of an account. It is a test applied to an income stream at a time**, and
> §3.1's two rates hang off it: s 307-80 decides phase, s 307-75(1) turns a retirement-phase stream's
> benefits into **RP superannuation income stream benefits**, and s 295-385(3)(a) makes the assets
> supporting *those* benefits **segregated current pension assets**, whose income s 295-385(1)
> exempts. A TRIS is at 15% because **No 81 of 2016 Sch 8 item 1** substituted "\*RP superannuation
> income stream benefits of the fund at that time" for "\*superannuation income stream benefits that
> are payable by the fund at that time" in s 295-385(3)(a), effective 1 January 2017 and applicable
> from the 2017-18 income year.
>
> | Name | Value / rule | FY | Kind | Source | Retrieved | Confidence |
> |---|---|---|---|---|---|---|
> | **The positive limb** | a superannuation income stream is in the **retirement phase** at a time if a superannuation income stream benefit **is payable** from it at that time | — | **constant** — structural | [ITAA 1997 s 307-80(1)](https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F307-80) | 2026-09-09 | primary-verified |
> | **The deferred limb** | also in retirement phase if it is a **deferred** superannuation income stream, a benefit **will be payable** after that time, and the person has satisfied SISR Sch 1 item **101, 102A, 103 or 106**. **No notification is required on this limb** | — | **constant** — structural | ITAA 1997 s 307-80(2) | 2026-09-09 | primary-verified — **not modelled; refuse** |
> | **The TRIS carve-out is a CONJUNCTION** | a stream from which a benefit is payable is **not** in retirement phase only if **(a) it is a TRIS or one of the four other listed kinds, AND (aa) the recipient is not a reversionary beneficiary, AND (b) the condition/notification test is failed**. **Any one of the three failing leaves the stream IN retirement phase** | — | **constant** — structural | ITAA 1997 s 307-80(3) | 2026-09-09 | primary-verified. Trap **DT58** |
> | **(b), the condition/notification test** | failed if **(i)** the recipient has satisfied **none** of items 101/102A/103/106, **or (ii)** has satisfied item **101, 102A or 103** but **has not notified the superannuation income stream provider of that fact** | — | **constant** — structural | ITAA 1997 s 307-80(3)(b) | 2026-09-09 | primary-verified |
> | **Attaining 65 converts a TRIS AUTOMATICALLY, with NO notification** | (3)(b)(i) points at **paragraph (2)(c)** — all four items — while (3)(b)(ii) points at **subparagraphs (2)(c)(i), (ii) or (iii)** — three of the four. **Item 106 is in the first list and not the second**, so for a member who has turned 65 both limbs of (b) are false and there is nothing left to notify. Conversion is on the **65th birthday** | — | **constant** — structural | ITAA 1997 ss 307-80(2)(c), (3)(b) · [SISR Sch 1 Pt 1 item 106](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch1) "Attaining age 65 — Nil" · **LCR 2016/9 ¶15** (first bullet, no notification words) and **Example 1A ¶30A–30B** | 2026-09-09 | **an inference from an express enumeration — an argument from the ABSENCE of subparagraph (2)(c)(iv) from (3)(b)(ii)'s list — corroborated by a public ruling. NOT bare `primary-verified`.** DO nothing to upgrade this without a provision that says it. Trap **DT60** |
> | **Retiring is NOT enough; the notification IS the conversion** | for items 101, 102A and 103 the stream enters retirement phase on the day the provider is **notified**, not the day the condition was satisfied | — | **constant** — structural | ITAA 1997 s 307-80(3)(b)(ii) · **LCR 2016/9 Example 1B ¶30D**: retired 30 June 2019, notified 15 July 2019, *"The TRIS is in the retirement phase on 15 July 2019 (the time of notifying …)"* | 2026-09-09 | primary-verified as to the requirement; **the day is fixed by a public ruling's example**. Trap **DT59** |
> | **The notification is a USER-SUPPLIED FACT and is PER-STREAM** | s 307-80(3)(b)(ii) names "the superannuation income stream provider **for the superannuation income stream**". One Person with two TRISs may have notified one provider and not the other, so the fact belongs on the interest, not on the Person. **No form, deadline, content or evidentiary rule was found** | — | **constant** — structural | ITAA 1997 s 307-80(3)(b)(ii); contrast ss 294-85(1)(b) and 294-90, which **do** say "in the \*approved form" | 2026-09-09 | primary-verified as to the words; **the absence of a form/deadline rule is `unverified` — DO45** |
> | **The reversionary carve-out** | a TRIS paid to a **reversionary beneficiary** is in retirement phase regardless of that beneficiary's own conditions of release and notifications, because (3)(aa) fails and the conjunction collapses | — | **constant** — structural | ITAA 1997 s 307-80(3)(aa), inserted by **No 8 of 2019** Sch 8 item 43, effective 1 April 2019 · LCR 2016/9 ¶15 third bullet | 2026-09-09 | primary-verified — **REFUSED in code**, not modelled: death benefits, the s 294-25 item 2(b) 12-month reversionary deferral, Subdiv 294-E and SISR reg 6.21 are all absent from this register. Trap **DT65** |
> | **The commutation-authority carve-out** | a stream specified in a Commissioner's commutation authority whose provider fails to pay within 60 days is not in retirement phase for that income year **and every later one** | — | **constant** — structural | ITAA 1997 s 307-80(4) | 2026-09-09 | primary-verified — **not modelled; refuse** |
> | **Div 294 and Subdiv 295-F can disagree** | for transfer balance cap purposes only, s 294-50(3) requires you to *"disregard the operation of subsection 307-80(4), if the time is before the end of the 60-day period"* — so the same stream can be out of retirement phase for ECPI and in it for the cap | — | **constant** — structural | ITAA 1997 s 294-50(3) | 2026-09-09 | primary-verified — not modelled |
> | **The SISR "Nil" set is STRICTLY LARGER than s 307-80's four-item set** | reg 6.01(2)(b)(ii)'s *"unless the pensioner has satisfied a condition of release in respect of which the cashing restriction … is 'Nil'"* is a test on **Schedule 1 column 3**, and the Nil items are **101, 102, 102A, 103, 104, 105 (the 6.01(5)(b) limb) and 106** — seven, against s 307-80(2)(c)'s four. **Items 104 and 105(b) switch off the 10% ceiling and do NOT convert the phase**: no maximum, still 15%, no transfer balance credit | — | **constant** — structural | SISR reg 6.01(2)(b)(ii) · [SISR Sch 1 Pt 1, column 3](https://www.ato.gov.au/law/view/document?DocID=REG%2F19940057%2FSch1) · ITAA 1997 s 307-80(2)(c) | 2026-09-09 | primary-verified — a comparison of two retrieved lists, not an inference. Trap **DT61** |
> | **The two events happen on different days** | reg 6.01(2)(b)(ii)'s "unless" has **no notification word**, so on the 101/102A/103 route the **ceiling falls away on the day the condition is satisfied** while the **phase changes on the day of notification**. In between: no maximum, 15% fund earnings tax, no credit | — | **constant** — structural | SISR reg 6.01(2)(b)(ii) against ITAA 1997 s 307-80(3)(b)(ii) | 2026-09-09 | primary-verified. Trap **DT62** |
> | **The stream stays a TRIS** | conversion changes the stream's **tax phase**, not its SISR identity. s 307-80(3)(a)(i) applies to a stream that **is** "a transition to retirement income stream (within the meaning of Part 6 of the SISR)" and asks separately, in (b), whether the recipient has satisfied and notified — so if satisfying a condition ended the product's TRIS character, (3)(b) would be dead text. The ATO's own term is "**TRIS in the retirement phase**" | — | **constant** — structural | ITAA 1997 s 307-80(3)(a)(i) · LCR 2016/9 Examples 1A/1B headings | 2026-09-09 | primary-verified — **corrects §3.9's "the income stream is no longer a transition to retirement income stream"** |
> | **The conversion is NOT a commencement** | so the conversion year's Schedule 7 minimum is a **full-year** minimum on the **1 July** balance at the **1 July** age, with no cl 3 pro-rating and no cl 4 nil rule; and the Schedule 7 floor survives conversion because reg 6.01(2)(b)(i)'s limb is **unqualified** — the "unless" is punctuated inside (b)(ii) | — | **constant** — structural | SISR reg 6.01(2)(b)(i) and (b)(ii) · Sch 7 cll 1(2)(a)(ii), 3, 4 · TR 2013/5 ¶10 (commencement is *"the first day of the period to which the first payment … relates"*) | 2026-09-09 | **primary-verified as to the provisions; the conclusion is a reading of them — DU15.** Trap **DT63** |
> | **Conversion creates a transfer balance credit automatically** | the conversion day is the **starting day** for s 294-25(1) item 2; the credit is the **\*value on that day of the whole superannuation interest** supporting the stream; and it is also the day the transfer balance **account** starts (s 294-15(2)(b)) and therefore the year that fixes the personal cap (s 294-35(1)). On the item-106 route **the member does nothing** and can be pushed into excess and lose s 294-40(1)(b) indexation permanently | — | **constant** — structural | ITAA 1997 ss 294-20(1), 294-25(1) item 2, 294-15(2), 294-35(1), 294-40(1)(b) · LCR 2016/9 ¶30D | 2026-09-09 | primary-verified as to when and of what. **The measurement of "\*value" (s 307-205) is P3-9's, not this section's — DO44.** Traps **DT64**, **DT68** |
> | **Every conversion is mid-year, so every conversion year needs ECPI apportionment** | a 65th birthday and a notification day are both arbitrary days. s 295-385(3)(b) shows the segregated method needs an **actuary's certificate** — it is not an arithmetic split — and **s 295-390 has never been retrieved**. `fundEarningsTax` refuses the year | — | — | ITAA 1997 s 295-385(3)(b); §5A.3 states no apportionment rule | 2026-09-09 | **UNRESOLVED — DO42. This is the binding blocker on the conversion limb of P3-8** |
>
> **The decision procedure, in full** (research §D.1). Order matters, and (3) applies only where a
> benefit **is payable**:
>
> ```
> (2)  deferred stream + benefit will be payable + any of items 101/102A/103/106
>          -> RETIREMENT PHASE          [no notification required on this limb]
> (1)  else benefit payable now
>          -> candidate RETIREMENT PHASE, then test (3):
> (3)  EXCLUDED  iff   listed stream kind                                   (a)
>                AND   NOT a reversionary beneficiary                       (aa)
>                AND ( no item of 101/102A/103/106 satisfied                (b)(i)
>                      OR  item 101/102A/103 satisfied but provider not notified )  (b)(ii)
>      -- item 106 appears in (b)(i)'s reference and NOT in (b)(ii)'s, so 65 escapes (b)
> (4)  commutation authority + provider failed to pay within 60 days
>          -> NOT retirement phase for that income year and every later one
>          -- but for Div 294 only, s 294-50(3) disregards (4) before the 60 days end
> ```

### CORRECTIONS owed to §3.9

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
> DT61); (ii) even on the shared items the ceiling falls away on **satisfaction** while the phase
> changes only on **notification**, so there is a window with no maximum, 15% fund tax and no credit
> (§3.10, DT62); (iii) the product **remains a transition to retirement income stream** under the
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
> permanently — a breach is not a bad year, it is the end of the stream** (DT66).
> **The citation was wrong.** ITAA 1997 **s 307-70 contains no cessation rule**: it is a bare
> delegation — *"A superannuation income stream has the meaning given by the regulations"* (s
> 307-70(2)). The operative definition is **ITAR (1997 Act) 2021 s 307-70.02(1)** (TR 2013/5 ¶52 and
> fn [1B]), which is **still not retrieved — DO40**. The lump-sum characterisation comes from
> **s 307-65(1)**: *"A superannuation lump sum is a superannuation benefit that is not a
> superannuation income stream benefit"*.
> **The application to the 10% MAXIMUM remains `secondary-only` — DO43/DU13.** TR 2013/5's reasoning
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
> 6.01(7), which has never been retrieved (DO41)** — so the item-101 mapping is `unverified` and
> must not be asserted. ITAA 1997 s 307-80(3)(b) turns on **which item**, not on the boolean, so the
> item identity is now load-bearing and not merely a citation.

**C4 — a pointer row.** §3.9 says nothing about what a TTR stream *becomes*. Add one line at the end
of "The TTR range":

> **What the stream becomes on conversion is §3.10**, not this section: the entry test is ITAA 1997
> s 307-80, the conversion day differs by route, and the two events — the ceiling lapsing and the
> phase changing — are not the same event on the same facts on the same day.

### Traps to add to §1 (Superannuation)

Add **DT58–DT68** (renumbered T58–T68 on insertion) as drafted in **D-TRAPS**, each with its money
consequence and its test. T60, T61 and T62 are the three that a maintainer is most likely to
introduce while "simplifying", and T68 is the only one that produces a wrong answer for a Person who
does nothing at all.

### Open items to add to §8

Add **DO40–DO46** (renumbered O40–O46) as drafted in **D-OPEN-ITEMS**. **O42 (ECPI apportionment /
s 295-390) belongs in the "Genuinely unresolved" table and should be marked as blocking the
conversion limb of P3-8**, which is a stronger statement than any other row in that table currently
makes.

---

## FETCH LOG

All fetches **2026-09-09**, via `curl` with a browser User-Agent
(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 … Chrome/124.0 Safari/537.36`).
`WebFetch` was not used (403 on `www.ato.gov.au`, per the brief).

| # | URL | Result | Use |
|---|---|---|---|
| F1 | `https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F307-70` | **HTTP 200, 113,380 bytes — SUCCESS.** Full section text plus amendment history. | **Closes half of the §3.4 "not retrieved" gap.** Contains **no** cessation rule — a bare delegation to the regulations. See D.6(a). |
| F2 | `…DocID=PAC%2F19970038%2F307-65` | **HTTP 200, 116,258 bytes — SUCCESS.** | s 307-65(1)/(2): a superannuation lump sum is a benefit that is **not** an income stream benefit. The residual mechanism behind D.6. |
| F3 | `…DocID=PAC%2F19970038%2F307-5` | **HTTP 200, 160,912 bytes — SUCCESS.** Fetched, not quoted. | Context only (meaning of superannuation benefit). |
| F4 | `…DocID=TXR%2FTR20135%2FNAT%2FATO%2F00001` | **HTTP 200, 269,793 bytes — SUCCESS.** Full ruling, 798 lines of extracted text including all footnotes and Appendix 2. | **Closes the other half of the §3.4 gap.** ¶¶4, 10, 18–20, 51–59, 71B, 96–101, Example 6 ¶¶42–44, fn [1B], [17], [25], [36C]–[36E]. See D.6. |
| F5 | `…DocID=TXR%2FTR20135%2FNAT%2FATO%2F00003` | **HTTP 404** (101,529 bytes — the 404 shell). | Probe for a later version. **The `…/00001` suffix is the live document; there is no `/00003`.** |
| F6 | `…DocID=TXR/TR20135/NAT/ATO/00001` (unencoded slashes) | **HTTP 200, identical 269,793 bytes.** | **Useful retrieval fact: the ATO Legal Database accepts unencoded `/` in a DocID.** Percent-encoding is not required. |
| F7 | `…DocID=COG%2FLCR20169%2FNAT%2FATO%2F00001` | **HTTP 200, 271,690 bytes — SUCCESS.** Full Law Companion Ruling. | **The corroboration for D.2 and D.3.** ¶¶11–15AB, 30A–30D, footnotes [11]–[15]. |
| F8 | `…DocID=LCR%2FLCR20169%2F…` and `…DocID=TXR%2FLCR20169%2F…` | **HTTP 404** (both). | **Retrieval fact: a Law Companion Ruling's DocID prefix is `COG`, not `LCR` and not `TXR`.** Taxation Rulings use `TXR`. |
| F9 | `…DocID=REG%2F19940057%2FSch1` | **HTTP 200, 162,380 bytes — SUCCESS.** Schedule 1 Parts 1–3 with column 2 (conditions) and column 3 (cashing restrictions) and full amendment history. | **New provenance for §3.9's Access table (C3) and for §3.10.** Items 101, 102, 102A, 103, 104, 105, 106 read directly. |
| F10 | `…DocID=REG%2F19940057%2FSch1-1` and `…DocID=REG%2F19940057%2FSch1-101` | **HTTP 404** (both). | **Retrieval fact: the `Sch<N>-<item>` suffix rule that works for TAA 1953 Sch 1 (`Sch1-136-80`) and for SISR Schedule 7 (`Sch7-1`) does NOT work for SISR Schedule 1. Fetch the whole schedule with the bare `Sch1` DocID.** Do not repeat these two. |
| F11 | `…DocID=REG%2F19940057%2F6.01%282%29` | **HTTP 200, 228,798 bytes — SUCCESS.** | Re-fetched independently of the P3-10 pass in order to verify the **punctuation** of the "unless": it sits at the end of subparagraph (b)(ii), before the "; and" leading to (b)(iii), so **(b)(i) is unqualified**. Load-bearing for D.5's "the Schedule 7 minimum survives". |
| F12 | `…DocID=PAC%2F19970038%2F295-385` | **HTTP 200, 136,065 bytes — SUCCESS.** ss 295-385(1)–(6) with amendment history. | The ECPI end of the chain, plus the **No 81 of 2016 Sch 8 item 1** amendment that put TRISs outside it, plus s 295-385(3)(b)'s actuary's certificate. |
| F13 | `…DocID=PAC%2F19970038%2F307-75` | **HTTP 200, 114,007 bytes — SUCCESS.** | s 307-75(1) — the **RP superannuation income stream benefit** link between s 307-80 and s 295-385(3)(a). Completes the phase→rate chain end to end. |
| F14 | `https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/transition-to-retirement` | **HTTP 404** (256,905 bytes — the site's 404 page, served with a 404 status). | Attempt to re-fetch the ATO web guidance §3.9 cites for the TRIS maximum. **The path has moved.** Not pursued: LCR 2016/9 and TR 2013/5 are both rulings and outrank the web page. |
| F15 | `https://www.ato.gov.au/tax-and-super-professionals/for-super-funds/paying-benefits/transition-to-retirement-income-streams-tris` | **HTTP 404** (256,905 bytes). | Same. **Retrieval fact: `www.ato.gov.au` non-`/law/` guidance paths recorded by earlier passes have shifted; the Legal Database `/law/view/document` route is stable and should be preferred.** |

**NOT ATTEMPTED, and why — so the next researcher does not assume they were tried and failed:**

* **ITAR (1997 Act) 2021 s 307-70.02** (DO40/DU14). The ATO Legal Database `REG/19940057` prefix is
  the *SIS Regulations*; the identifier for the *Income Tax Assessment (1997 Act) Regulations 2021*
  in that database was not determined, and legislation.gov.au OData was not queried for it. **This
  is the single highest-value unfetched document for D.6.**
* **SISR reg 6.01(7)** ("retirement") (DO41/DU10). Try `REG/19940057/6.01(7)`; the `6.01(2)` form is
  confirmed working, so the same shape should serve.
* **ITAA 1997 s 295-390** (the proportionate ECPI method) and ss 295-395, 295-400 (DO42/DU12). Try
  `PAC/19970038/295-390`; the prefix is confirmed working on five sections this pass.
* **ITAA 1997 s 307-205** ("\*value" of a superannuation interest). Deliberately left to the s 294-25
  chunk (DO44).
* **The Explanatory Statement to the regulation that inserted the TRIS definition** (DU11/DO46, and
  the existing O38). Would close two open items at once. On legislation.gov.au, not the ATO database.
