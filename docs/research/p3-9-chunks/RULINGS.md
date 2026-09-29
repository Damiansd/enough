# P3-9 — user rulings

Decisions the user has made during the transfer balance cap research pass. **Authoritative.**
Written here rather than in `p3-transfer-balance-cap.md` because that file was being edited by
another agent at the time; fold these into the register and TODO, then this file can go.

All rulings dated **2026-09-09**.

---

## R1 — Cap breaches: refuse, do not model

The engine **hard-refuses to project any financial year containing an end-of-day cap breach**.
Excess transfer balance tax is **not implemented**.

**Why:** "warn and continue" has no conservative form. Continuing forces the model to decide
where commuted capital goes, and the default an implementer naturally reaches for (leave it at
0% ECPI, add a little tax) flatters the household by 15% of earnings, forever. Refusal is the
only option whose failure mode leaves the tool understating.

**But the refusal is not sufficient on its own.** A latching `hasEverExceededCap` flag must be
built regardless, because refusing only prevents *new* breaches — it cannot undo one that
predates the projection, and without the flag the model silently restores a proportional
indexation entitlement that s 294-40(1)(b) has already removed permanently.

Reached independently from two directions: §C from the breach side, §A from the indexation side.

---

## R2 — The refusal is named `UnknownPersonalTransferBalanceCapError`

§A's name wins over §B's `PreForecastTransferBalanceNotDerivable`. Cosmetic choice, settled so
that two modules do not ship two names for one condition.

---

## R3 — The Settings block is §A's seven fields, not §B's six

**Why:** not a matter of taste. §B's list is **arithmetically insufficient** — it asks for the
account-start *year*, but reconstructing a personal cap from a start year alone requires
replaying every intervening s 294-40 increase, and §B carries neither
`personalCapOnHighestBalanceDay` nor `hasEverExceededCap`. §A's list actually closes the
calculation; §B's does not.

---

## R4 — Account start is captured as a DAY, not a financial year

Follows from R3, and independently correct: the transfer balance credit is valued on the
stream's **starting day** (s 294-25 item 2), never on 1 July, so a year-granular input cannot
express the figure the statute asks for.

---

## Still open — NOT ruled

- The three §A↔§B items above are now closed, but **any disagreement §C or §D raises against
  §A/§B is not** — surface it rather than assuming it follows R2/R3/R4.
- Whether register §5A / §3.10 gets its own assumptions module is untouched by these rulings.

---

# Second round — the §B ↔ §D conflicts (2026-09-09)

## R5 — The conversion day is a stated Setting, not derived from date of birth

§B's approach wins over §D's derive-from-DOB.

**Mandatory mitigation, and it is part of the ruling.** The research doc warns that a stated day
lets a user who supplies nothing get *no conversion, no credit, no cap check and no ECPI change* —
the exact failure §B and §D independently wrote **T80** and **T117** against. So:

**An absent conversion-day Setting for a Person holding a TRIS must raise a NAMED REFUSAL, never
silently skip the conversion.** Silence is conservative on the tax side (the stream stays at 15%
instead of 0%) but **flattering on the cap side** — with no credit, the transfer balance account
never records the conversion and a real breach goes undetected. Mixed-direction errors do not get
the benefit of R1; they get a refusal.

## R6 — The age-65 confidence label is §D's, in full

`inference from an express enumeration` — an argument from the absence of subparagraph
(2)(c)(iv) from (3)(b)(ii)'s list — corroborated by a public ruling. **Never bare
`primary-verified`.** §D's full wording at §D.2 is reproduced into the register row and **must not
be narrowed** to §B's shorter label.

**Why:** an absence-based reading silently promoted to a verified fact is the failure this
project's confidence labels exist to catch. Narrowing the label is how that promotion happens.

## R7 — The entry test takes §D's seven inputs, not §B's three

No conflict with R5. §B's three are what the **credit** needs once the phase answer is known;
§D's seven are what the **entry test** needs to reach that answer. Both are required, for
different questions. Four of the seven are absent from `src/core/superPhase.ts` today.

## R8 — `ReversionaryStreamNotModelledError`

§D's name wins over §B's `ReversionaryPensionNotModelled`.

**Why:** "Stream" matches the statutory term — s 307-80(3)(aa) speaks of the beneficiary of an
income *stream*, which is wider than a pension — and the `Error` suffix matches every other
refusal in this codebase. §B's name would be the only refusal without it.

**Systemic point, and it is an instruction:** this is the **third** independent naming collision
(see R2, and §D vs §B on the reversionary refusal). Three passes inventing three names for the
same refusals means the refusals need **one home**. Before any of these is registered, collect the
refusal names into a single module so a fourth pass cannot mint a fourth spelling.

---

# FY2027-28 forward items (2026-09-09)

## R9 — Do NOT refuse to project FY2027-28

Keep computing. R1 does not transfer: R1 refused because "warn and continue" had no conservative
form, whereas here every gap runs the same, safe way. Carrying `secondLowestMarginalRate: 0.3`
forward over-states tax or is exactly right, and omitting WATO over-states tax — both understate
the household. Refusing would trade a conservative answer for no answer, inside the planning
horizon the tool exists to talk about.

Three actions follow:
1. **`tax.ts` FY2027-28 note must state the DIRECTION of the error**, not merely `unverified`.
   A confidence label says the number is unsourced; it does not say the error is safe. That is
   the half the label does not do, and it is what a future agent needs in order to decide whether
   to touch it.
2. **Assert the conservatism with a test** that fails if the placeholder is later "improved" in
   the flattering direction. Today the safety is a property of the number, not of the code — the
   same defect pattern as a rule recorded but consumed by nothing.
3. **Source WATO, not the 0.30.** It is the larger gap, it is already law from 2027-28, and it is
   the one that moves a real household's numbers.

Actions 1 and 2 go in the remediation brief; action 3 is its own small research pass.

---

# Third round — ECPI (2026-09-10)

## R10 — Narrow `MidYearPhaseChangeError`; do not lift it, do not leave it standing

Accepted as recommended by the P3-25 pass (`docs/research/p3-25-ecpi-apportionment.md` §5). Four
steps:

1. **Rewrite the refusal message unconditionally.** It currently asserts three things now known
   false — including the unchecked negative that s 295-390 "has never been retrieved by any pass"
   (**O70**).
2. **Replace `phaseHeldForTheWholeYear: boolean` with a fraction.** The fund-level proportion
   decomposes exactly into a per-interest time weight (verified to the cent), so the existing API
   shape survives the change.
3. **Compute the conversion year at the provable UPPER BOUND — 15% on everything — by default,
   disclosed by name.**
4. **Keep named refusals** for the segregated method and for an unstated s 295-385(9) election.

**Why step 3 is not a plausible default.** It is a **bound with a proof**, which is a different
object. Its failure mode understates the household, and — unlike R5 — **nothing points the other
way**: the conversion still happens, the s 294-25 credit still arises, and the cap check still
runs. So **R9's reasoning applies here, not R1's**. Compare the naive repair (delete the guard,
honour the stated phase), which returns **$4,500.00** against a statutory **$7,569.86** and a bound
of **$11,250.00** — landing exactly on the flattering extreme.

## ~~Still open, and it gates shipping~~ — O69, RESOLVED 2026-09-10 by [R11] below

**All of the ECPI machinery bites only SMSFs.** For an APRA-fund member ECPI is invisible: the fund
computes it and the member's balance simply arrives net. **The model has no SMSF/APRA
discriminant**, so R10's refusals would fire on households they cannot apply to.

The **upper bound of step 3 is conservative for either fund type**, so it is safe to build ahead of
this. The **refusals of step 4 are not scoped** and must not reach an APRA household. ~~**Not ruled — do not treat R10 as settling it.**~~ **RULED by R11 and BUILT** — the
discriminant is `fund?: FundType` on the interest, and `src/core/ecpiMethod.ts` dispatches on it
before any ECPI question is asked, so neither refusal can reach an APRA interest.

## R11 — O69: a per-interest SMSF/APRA discriminant, absent by default, refusing when needed and missing

The model gains an **SMSF/APRA discriminant on the interest**. It is **not** resolved by recording
that all modelled super is SMSF.

**Why:** §8's O69 row offered exactly two ways out — a discriminant, or "an explicit, recorded
statement that all modelled super is SMSF". The second hard-codes one household's circumstances
into the engine, and this project's standing preference is that personal facts are **inputs**: the
tool designs for the range, not for one household's point on it. It is also not durable — the
household may hold an APRA interest tomorrow, and the statement would be silently wrong rather
than loudly absent.

**Shape, following R3/R4/R5:**
- **Per-interest, not per-Person.** A Person may hold both an SMSF interest and an APRA one, and
  it is the *interest* that carries phase, so it is the interest that must carry fund type.
- **Absent by default.** No default value, and in particular **no default to `smsf`** — a default
  here would silently decide which of R10 step 4's refusals apply.
- **A named refusal when it is needed and missing**, per R5's mitigation pattern. "Needed" is the
  narrow case: only where a computation actually turns on fund type.

**The scoping this exists to fix:** ECPI is invisible to an APRA-fund member — the fund computes it
and the balance arrives net — so R10 step 4's `SegregatedEcpiNotModelledError` and
`EcpiMethodNotStatedError` **must not fire on an APRA interest**. A correct refusal reaching a
household it cannot apply to reads as a broken tool, and teaches the user to distrust refusals
that are load-bearing elsewhere.

---

# Fourth round — the FY2027-28 bracket table (2026-09-11)

## R12 — R9 DOES govern the bracket table: narrow `MissingBracketTableError`, do not leave it standing

**BUILT 2026-09-15.** All six actions landed; 578 tests pass. The FY2027-28 table is assembled
from the register's own records, the guard is narrowed and kept reachable by a synthetic test-only
year, and the direction rule exempts the legislated 0.14 **by provenance**, not by index.

**The tension recorded in register §3.9's `MissingBracketTableError` row (Findings 1–4) is
resolved in favour of R9.** A caller asking `householdIncomeTax` for FY2027-28 must get a
conservative answer, not no answer. Today the same year is projected for SAPTO, for LITO and for
the Medicare levy and refused for the tax itself, which is incoherent.

**Why.** R9's ground was that *every* FY2027-28 gap runs the same safe way, so refusing trades a
conservative answer for none inside the planning horizon the tool exists to discuss. Two facts
found on 2026-09-11 show that ground covers the bracket table too:

1. **Australian bracket thresholds and rates are not indexed.** They do not drift; they sit
   unchanged until Parliament legislates a change. So carrying a rate forward is not an estimate
   of an unknown — it is the explicit assumption **"no legislated change"**, which is the standard
   forecasting position and is *exactly right* unless a change is enacted. This is categorically
   different from an invented figure, and R9's reasoning about `secondLowestMarginalRate` already
   depends on it.
2. **Finding 2 is decisive: the gap is two numbers, not a table.** The register already carries
   everything a FY2027-28 table needs *except the 37% and 45% rates* — the thresholds are §2.1's
   `never indexed` constant (primary-verified), the 14% lowest rate is already law, and the 30%
   second-lowest is carried forward with a direction-of-error note. The refusal's message claims
   the whole table "would be an assumption the register does not make"; the register makes most of
   it. **The refusal is broader than its own ground.**

**A correction that prompted this ruling, recorded so it is not re-made:** I characterised the
`0.30` as an invented placeholder that had to be removed. It is not. It is the FY2026-27 rate
carried forward unchanged, already labelled `unverified` and already carrying the
direction-of-error note that R9 action 1 demanded. **Read the note on a figure before calling it
invented** — this one explains itself at length.

**Six actions follow:**

1. **Supply the FY2027-28 37% and 45% rates as carried forward**, `kind: 'config'`,
   `confidence: 'unverified'`, each with a note in **the same shape as
   `secondLowestMarginalRate`'s** — stating the direction of the error explicitly, because a
   confidence label says a number is unsourced and does not say the error is safe. Nothing
   announced or legislated raises these rates, so carrying them forward **over-states tax or is
   exactly right, and cannot flatter the household**.
2. **Narrow the refusal; do NOT delete it.** Following R10's discipline: it must still fire for any
   year whose `TaxYear` record genuinely carries no `brackets`. Its firing condition narrows to
   exclude FY2027-28 — the class of refusal survives, one input leaves it. Deleting the guard is
   the naive repair and is forbidden.
3. **Assert the conservatism structurally**, mirroring the existing
   `test/assumptions-tax.test.mjs` guard on `secondLowestMarginalRate`: moving **any** carried-forward
   FY2027-28 rate *below* its FY2026-27 value must fail a test. Today the safety of these numbers
   would be a property of the numbers, not of the code — the same defect pattern as a rule recorded
   but consumed by nothing.
4. **Register the rule in §2.1 (Finding 1).** That the engine declines a year rather than deriving
   one is currently specified only in a module header and in TODO P3-1 — a task list is not a
   specification. §2.1 must state the rule and its narrowed boundary.
5. **Fix the unreachable branch (Finding 4).** `householdIncomeTax` builds provenance with
   `brackets === undefined ? [] : …` twenty lines after the call that has already thrown for that
   case. It reads as though a table-less year were a supported result.
6. **P2-10 is promoted to real, queued work.** This ruling leans on the annual refresh —
   `npm run update-assumptions -- --fy YYYY-YY` — to replace these carried-forward rates with
   legislated ones. While P2-10 is unbuilt, "I will refresh it annually" is a promise with no
   mechanism, and these figures rot silently. **That is the failure mode this project exists to
   prevent, so the refresh path is part of the ruling, not an adjacent nicety.**

   **ITEM 6 DISCHARGED 2026-09-15 — the sentence above stands as ruled and is not rewritten; this
   stamp records what changed under it.** `scripts/update-assumptions.mjs` is built, wired as
   `npm run update-assumptions -- --fy YYYY-YY` and pinned by
   `test/scripts-update-assumptions.test.mjs` (TODO P2-10/a/b ticked the same day). The
   missing-mechanism clause — *"While P2-10 is unbuilt, 'I will refresh it annually' is a promise
   with no mechanism"* — is the only part discharged. **R12's substance is NOT discharged:** the
   30%, 37% and 45% FY2027-28 rates remain `unverified` carried-forward figures and still await
   legislated ones. The script scaffolds blanked, unsourced rows that refuse to compile; a human
   sources and wires them in a reviewed commit. A mechanism existing is not the figures arriving.

**The outer boundary stays nameless and that is accepted.** A year absent from the year table
altogether still raises a bare `RangeError` from `taxYear` before reaching `bracketsFor`
(FY2030-31 → *"no tax assumptions for FY2030-31"*). R8's naming discipline is not extended to it
by this ruling.


---

# Third round — the TRIS conversion day (2026-09-16)

## R13 — R5 is NARROWED: a stated changeover day wins, and age 65 is the backstop

**Ruled by the user, 2026-09-16.** R5 stands as written for the case it was reasoned about, but its
*absent-Setting* limb is narrowed. The user's words: *"the user can say 'I retired on this date, and
changed over to an account based pension', and defaulting at age 65 if the user hasn't indicated a
date before this time."*

So the conversion day is resolved in this order:

1. **A stated changeover day**, supplied by the user alongside the retirement date it goes with.
   This is R5's stated Setting and it wins whenever it is present.
2. **Otherwise the 65th birthday**, derived from date of birth.

**Why this is a narrowing and not a reversal.** R5's reasoning was *do not guess a day*. A day
derived from a date of birth is not a guess: under Schedule 1 item 106 a TRIS moves to retirement
phase **automatically on the 65th birthday**, with no notification and no election, so the day is
mechanically certain. R5's reasoning bites on the 101/102A/103 routes, where the day depends on a
notification only the user knows — those still need the stated day.

**What this does to R5's mandatory refusal.** R5 required a named refusal when the Setting is
absent, because silence meant *no conversion, no credit, no cap check* — flattering on the cap side,
which is the failure this project exists to prevent. **That justification is discharged by the
backstop**: silence no longer means "never converts", it means "converts at 65", so a credit is
always recorded and the cap is always tested. `TrisNotificationNotStatedError` may therefore never
acquire a throw site on this path. **Do not delete the name on that basis** — decide it deliberately
when 5b is built, and if it is struck, strike it through the tripwire contract with its ground
replaced, never by quiet deletion.

**The direction of the residual error, which is why the backstop is acceptable.** A user who
actually converted at 60 and says nothing is modelled as converting at 65. The tool then charges
15% on fund earnings for five years that were in fact tax-free, and keeps the 10% maximum drawdown
in place. That **understates** the household, which is the direction every unsourced figure in this
project is engineered to fail in. It is not free of error on the cap side — a later conversion is
credited at a later balance against a possibly indexed cap — so the backstop is a default, **not a
substitute for asking**, and the UI should ask.

**Open edge, to be decided when 5b is built, not now.** A stated changeover day **after** the 65th
birthday is a contradiction: item 106 has already converted the stream automatically. Precedent from
chunk 6-3 is to refuse a contradiction rather than silently prefer one of the two facts (*"stating
BOTH 'never a recipient' and a prior history is a contradiction"*). Follow it unless 5b finds a
reason not to.

**Status: R5's absent-Setting limb is NARROWED by R13. R5 is otherwise undisturbed and its
stated-day-wins rule is reaffirmed.**
