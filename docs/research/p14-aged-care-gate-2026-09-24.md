# Phase 14 (aged care) gate — 2026-09-24

Read-only design/GO-NO-GO pass. Figures below are from `docs/research/p14-aged-care-sources-2026-09-24.md`
(20 Sep 2026 indexation) and are not re-researched here. HEAS is mentioned once, as a funding
route alternative to RAD/DAP; a separate pass is researching HEAS itself.

## 1. Design — what Phase 14 needs in the engine

**A second means test, parallel to but structurally independent of the Age Pension's.**
`agePension.ts` already proves the right shape: a `Household` walk produces an `assessableAssets`
/ `accessibleAssets` pair per month (confirmed live via `dist`, see part 2). The Aged Care Means
Assessment is a *second* reduction over the *same* per-Person asset and income facts, with its own
free areas, its own taper, and — critically — its own treatment of the home and the RAD, which
diverge from Centrelink's on exactly the two figures that matter (below). It should be a sibling
module (`agedCareMeansAssessment.ts`), not a branch inside `agePension.ts`: the two tests share
inputs (assets, income, home status) but must never share a threshold constant, on the same
"disjoint key space" discipline `agePension.ts`'s header describes for its own two calendars —
mixing them is exactly the kind of drift that module was written to make untypeable.

**The home cap and the protected person.** One `Constant`: home exemption cap **$219,858.40**
(20 Sep 2026), per person, applying only when *nobody* protected remains — the "capped, not
exempt" treatment for a vacant former home once the 2-year Centrelink cliff is irrelevant because
this is the *aged care* test, which caps rather than time-limits. A **protected person** (spouse or
specified relative remaining in the home) makes it **100% exempt** on *both* tests — this is a new
Household-level fact ("does a protected person occupy the home"), not derivable from `homeStatus`
alone, because `homeStatus` today is binary (occupied/vacated) and doesn't distinguish "vacated
because the resident moved to care while a partner stays" from "vacated, nobody home." P14-5's
"former home capped per person" is squarely the second case.

**RAD/DAP/MPIR arithmetic.** `DAP = RAD × MPIR ÷ 365` (simple, no compounding) is the whole of the
computed side; MPIR is a rate that changes quarterly (8.43% → 8.51% from 1 Oct 2026) and is exactly
the kind of dated-rate series `agePension.ts` already has a pattern for (`PAYMENT_RATES` keyed by a
literal indexation-date union). A **partial payment** (RAD + DAP on the balance) is the general
case; full-RAD and full-DAP are its two boundary values, not separate code paths.

**The RAD asymmetry is the one fact that must be structurally impossible to get backwards.** A paid
RAD is:
- **Age Pension assets test: exempt** (drops out of `assessableAssets` entirely, raising the
  pension if asset-tested).
- **Aged care means assessment: assessable at full face value, no cap** (adds straight back into
  the *other* test's asset base).

Concretely this means the engine cannot compute "assessable assets" as one number handed to both
tests — it needs two, computed from a shared ledger of what the household actually holds (cash,
super, RAD receivable, home) but with different exemption rules applied per test. Get this
backwards (e.g. exempt the RAD from both, or assess it in both) and the model silently defeats
the one input this phase exists to let the user optimise — RAD sizing.

**Hotelling contribution + NCCC.** Hotelling ($22.15/day max, means-tested, *uncapped* — payable
for life) and NCCC ($109.45/day max, means-tested, lifetime cap $140,652.80 **and** a 4-year cap,
whichever binds first) are both outputs of the *same* means-assessed-amount, at different maximum
rates and different caps. They should be one `agedCareContributions` function returning both lines
plus the two cap-tracking balances (lifetime $ remaining, days remaining), because both caps need a
running total carried month-to-month the same way the Work Bonus balance is carried (P4-10's
pattern: a stated/derived balance that must be written back each month or the flattering direction
wins silently).

**Entries.** `ENTER_CARE` (dated, one Person, starts the means assessment and the daily fee/
contribution lines, sets that Person's status so the Age Pension side can apply the protected-
person exemption to the other Person's home), `SELL_HOME` (household-level, converts home status
to sold, proceeds become liquid and assessable on both tests, ends the protected-person exemption),
`RENT_OUT_HOME` (assessable rental income on both tests per concept.md §5.10's "exemption abolished
2016," home itself stays under whatever exemption otherwise applies), `RAD_PAYMENT` (one Person,
draws down liquid assets, converts them to the RAD receivable — the one entry that actually
triggers the asymmetry above). All four are levels/events in the existing `Entry` idiom, nothing
structurally new beside `agedCareMeansAssessment`.

**One partner in care, the other at home.** This is the *default* couple case, not an edge case —
concept.md is explicit that selling to fund the RAD in this scenario "destroys a total exemption."
The engine must carry per-Person care status (`inCare` / `atHome`) the same way it already carries
per-Person `retired`/`worksNoDays` (P6-8 brief 2's precedent), and the protected-person exemption
must key off "does *this Household* have a Person both at-home and a spouse," not off a flag on the
home itself.

**Care cost as its own chart band.** Additive, not folded into `annualSpend` — the existing
`Month.lines` structure already tags each line with a description; a chart band is a filter over
`lines` by description prefix (`"Aged care …"`), the same mechanism the Age Pension lines use today
(confirmed live, part 2) — no new Month field needed, just a naming convention plus a chart
consumer.

**Indexation pattern.** The 20 Sep 2026 research is unambiguous: aged care rates index **20 Mar /
1 Jul / 20 Sep** — the *same three dates* `agePensionPeriods` already merges from two disjoint
calendars (rates on 20 Mar/20 Sep, means-test free areas on 1 Jul). That means aged care doesn't
need a third calendar type; it needs its own dated-value series (`AGED_CARE_RATES` keyed the same
literal-union way `PAYMENT_RATES` is, `AGED_CARE_MEANS_TEST` keyed the way `MEANS_TEST` is) sharing
the *period-boundary* logic already proven in `agePensionPeriods`, generalised to take a calendar
rather than being hand-written for the Age Pension's two. That generalisation is itself a small,
worthwhile first step, not a Phase 14 side-quest — it de-risks every later indexation date this
project adds.

**The smallest honest first slice.** Not the full solver (P14-10), not Support at Home (P14-11),
not the funding-route comparison view (P14-14). The smallest slice that gives the user a *real*
answer to "what will it cost us" is:
1. `agedCareMeansAssessment` (P14-4, P14-5, P14-6) — the second test, with the home cap and
   protected-person exemption.
2. Basic daily fee + hotelling + NCCC with its two caps (P14-7).
3. RAD/DAP/MPIR arithmetic and the asymmetry (P14-8, P14-9) — even before a *solver*, showing the
   Age Pension effect of a stated RAD size already answers the household's actual question.
4. `ENTER_CARE` and `RAD_PAYMENT` only (not `SELL_HOME`/`RENT_OUT_HOME` yet) — because the
   protected-person case (partner stays home) needs neither.
5. Care cost as its own chart band (P14-15) — cheap, and it's how the user actually reads the
   number.

RAD sizing as a *solver* (P14-10), Support at Home (P14-11), grandfathering (P14-12), and the
funding-route comparison (P14-14) are all real second-slice work — they extend the same test rather
than requiring a different one, and Support at Home is a materially cheaper path this household
probably won't need given its assessable assets (see part 2), so it's lower priority than the
solver for this household specifically. HEAS is one more funding route inside P14-14's comparison
view; not researched here.

## 3. GO / NO-GO

**GO for the smallest slice above (means test + fees/RAD/DAP arithmetic + `ENTER_CARE`/
`RAD_PAYMENT` + chart band), conditional on the items below. NO-GO for the solver, Support at Home,
and the funding-route comparison until the slice ships and is checked against a second source.**

**Named conditions for GO:**
- Register the four rate/threshold figures (basic daily fee, hotelling cap, NCCC cap + two caps,
  home exemption cap, max RAD w/o pricing approval, MPIR) as sourced `Constant`s dated 20 Sep 2026,
  the same register discipline every other legislated figure in this project already carries —
  not yet done (P14-1/P14-3 are still unticked).
- Generalise `agePensionPeriods`'s calendar-merge logic before or alongside adding the aged-care
  calendar, rather than hand-rolling a third copy.
- Decide and register the protected-person data model (a Household-level fact, not inferred) before
  `ENTER_CARE` is built, since `agedCareMeansAssessment`'s home-exemption branch depends on it.

**Open user decisions (stated inputs, not modelled facts):**
- Care entry age for each Person (this pass assumed 85 for illustration only — not a household
  statement).
- Home value at that date (this pass assumed $1.2M — not sourced, stated as an assumption).
- RAD price at that date (this pass assumed $750k — a facility's actual RAD price is a market fact
  this model cannot forecast; it must always be a stated input, the way `HEAS_DRAW`'s security
  value already is per P6-6a's ADR-0005 pattern).
- Whether/when the at-home partner's home is later sold — a second, separate decision the model
  should let the user state as a dated `SELL_HOME` entry rather than assume.

**What the legislation-level check still needs.** Every figure in the 20 Sep 2026 research doc
comes from health.gov.au administrative schedules, not from legislation.gov.au's Aged Care Act 2024
/ Aged Care Rules 2025 text directly (flagged there as "confirmed-by-regulator-publication, not
confirmed-against-statute-text"). Before this ships as a load-bearing figure (the way Age Pension
figures are), at minimum the RAD/DAP formula and the means-assessment taper structure should be
checked against the Rules' own section numbers, not just the schedule PDF's restatement of them.
The CHSP-exclusion clause for the 1 Oct 2026 reclassification is also secondary-only and untouched
by this gate.

**Test and golden impact.** A new means-test module needs its own fixture-based unit tests in
`agePension.ts`'s idiom (hand-worked amounts, not solver-derived, per this project's stated
distrust of anything it can't verify by hand — see `docs/research/p14-aged-care-sources-2026-09-24.md`'s
own caution about re-sourcing). Any existing golden/demo-household walk that reaches age 85+ for a
Person will pick up new `Month.lines` once `ENTER_CARE` exists — the demo household
(`src/app/demoHousehold.ts`) should almost certainly gain a golden scenario exercising this, since
the walk in part 2 shows the household's own current demo/user plan reaches assessable assets over
$1.8M by 85, squarely in the range where every aged-care cap and taper binds. `Month.lines`-based
chart consumers (P7-1's Scenario walk, any existing spend/asset chart) should be checked for
whether a new line-description prefix needs adding to their filters, the same mechanical step
P14-15's chart band already names.
