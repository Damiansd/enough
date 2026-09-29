# Scenarios are a baseline plus an append-only overlay of Journal Entries

A Scenario is never a copy of the base parameters with some values changed. It is the Baseline
plus an ordered, append-only list of dated Journal Entries, replayed from scratch on every
change. Entries are never edited or deleted — only disabled via a flag.

## Why

The alternative — letting a scenario hold its own mutated copy of the parameters — is the
obvious design and it fails at the thing this tool exists for. Comparing "extend the mortgage"
against "extend the mortgage *and* discharge it from super" requires the two to provably share
the first change. With mutated copies they merely happen to agree, and drift apart the moment
one is edited. With an overlay, the second Scenario inherits the first's entry by reference.

Append-only matters for a second reason: a comparison run months ago must still reproduce. A
disabled entry keeps its history; a deleted one silently changes what an old Scenario meant.

Replaying from scratch rather than incrementally updating is affordable — the horizon is
~500 months and a projection is microseconds — and it removes a whole class of
cache-invalidation bugs. It also makes the "what can we sustainably spend?" solver possible,
since that is just a binary search calling the projection ~20 times.

## Consequences

- `project(settings, entries) → Month[]` must be pure and side-effect free. The solver calls it
  in a loop; anything stateful breaks it.
- **Dated Parameters are sugar.** Retirement age, TTR start and TTR days-per-week look like
  settings but are events in time. They resolve into *synthetic* Journal Entries before
  projection, so there is exactly one mechanism. An explicit entry supersedes the synthetic one
  for the same person and type, which is what lets you ask "what if I retire two years later"
  without editing the parameter.
- Every entry carries an `owner` (`personA` | `personB` | `household`), because almost every
  Australian super and tax rule is assessed per person.
- Each projected month must record which entries applied, plus a line-item breakdown. Without
  it the tool cannot explain a number, which is the one thing a spreadsheet would have given
  for free.

## Note, 2026-09-03 — `asAtDate`, and the clock

The decision above is unchanged. This supplies the mechanism its reproducibility claim was
missing.

"A comparison run months ago must still reproduce" is false if `project()` reads the system
clock. Every projection is anchored at *today*: contribution caps reset from it, the
younger-partner exemption counts toward 67 from it, a two-year home exemption clock runs from
it. A `Date.now()` anywhere under `project()` means the same plan, the same entries and the same
assumptions yield different `Month[]` in September than they did in March — silently, and in a
way that looks like a modelling difference rather than a defect.

So **`project()` never reads the clock.** "Today" is `settings.asAtDate`, a Setting like any
other, carried in the plan file and displayed alongside the assumptions FY stamp. Advancing the
plan to a new date is an explicit edit with a visible effect, not something that happens because
time passed. Everything the projection reads is inside the file it was given, which is also what
makes the golden files stable and the demo couple diffable.

Asserted, not intended: a test runs the demo couple under two different fake system clocks and
requires byte-identical output.

## Note, 2026-09-16 — the signature widened: `project(settings, household, entries)`

The decision above is unchanged, and so is every word of the purity claim it turns on. This
corrects the **arity** of the consequence line, which described a function that was not the one
P4-1 built. The superseded line is quoted once here so a reader who remembers it knows it was
changed on purpose and is not looking at a second, older API:

> - `project(settings, entries) → Month[]` must be pure and side-effect free. The solver calls it
>   in a loop; anything stateful breaks it.

**It now reads `project(settings, household, entries) → Month[]`.** Pure and side-effect free is
untouched — that is the half of the line the solver depends on, and it still holds.

**Why the third parameter exists.** The Planning Horizon is an **age** —
`Settings.planningHorizonAge`, 100 — and turning an age into a date needs a date of birth.
`Settings` carries no `Person` and no `dateOfBirth`; `core/household.ts` is where both live. The
alternatives were weighed and rejected: widening `Settings` with a `Person` would give `Person`
and `Household` a second home, which is the exact failure `household.ts`'s own header names, and
taking a bare `dateOfBirth` would be a third spelling of a fact `Household` already holds.

P4-1 chunk 2 then confirmed the choice rather than merely tolerating it: the Age Pension means
test is a **Household-level** assessment and `agePensionEntitlement` takes a `Household` and never
a `Person`, so a `project()` that held only a date of birth could not have called it. Every
domain module the Waterfall reaches in chunks 3 and 4 is assessed per Person against Household
aggregates, so the `Household` was always going to be the operand.

**What did NOT change.** `Settings` is untouched, the Journal Entries are still the whole of the
overlay, and a `Household` is not a Scenario input that entries edit — it is the base position the
entries are applied *to*. Nothing here reopens the append-only-safe delete, the synthetic-entry
rule, or the reproducibility promise the 2026-09-03 note supplies the mechanism for.

## Note, 2026-09-24 — Dated Parameters were never needed

The "Dated Parameters are sugar" mechanism above was never built, and P6-3 is closed without
building it. Every parameter it named turned out to be an event, and each ships as an explicit
entry: retirement is `RETIRE`, and TTR start and days a week are `WORK_PATTERN_CHANGE`. The Glide
Path followed the same ruling (P2-11). There is still exactly one mechanism: explicit Journal
Entries, which scenarios override. Reopen this only if a genuine Setting that is shaped like an
event appears.
