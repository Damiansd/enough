# The home is modelled as a time-varying exemption status, not an asset value

The Home is not a single number on the balance sheet. It carries a **Home Status** that changes
over time and differs per Scenario, and the projection derives its means-test treatment from
that status every month. Net worth is reported split into **Protected** and **Assessable**
components rather than as one total.

## Why

For this household the home's *exemption status is worth more than its market value*, and the
status is not stable:

| Home Status | Age Pension assets test | Aged Care Means Assessment |
|---|---|---|
| Occupied by the Household | Exempt | Exempt |
| Vacated, Protected Person remains | Exempt indefinitely | **100% exempt** |
| Vacated, nobody remains | Exempt **2 years**, then full market value, uncapped | Capped at $214,884 per person |
| Sold, proceeds earmarked for a new home | Exempt 24 months, **but still deemed for income** | n/a |
| Sold, proceeds free | Fully assessable and deemed | Fully assessable |

A model holding the home as a static value cannot represent any of this. Worse, it cannot
represent the **cliff**: when a vacated home's two-year Age Pension exemption expires, a
previously invisible asset becomes fully assessable overnight and entitlement can vanish. That
cliff is datable, scenario-dependent, and is exactly the kind of event this tool exists to
surface in advance.

The same structure is what makes the phase 2 aged care work tractable — the statuses are already
tracked, and only the second means test needs adding.

## Consequences

- `HomeStatus` is derived per month from the Journal Entries, not stored as a Setting.
- `VACATE_HOME` is a **v1** entry type — it starts the two-year Age Pension clock and is
  independent of aged care. `SELL_HOME` arrives with phase 2.
- Every projected month reports `protectedAssets` and `assessableAssets` separately. The Age
  Pension calculation consumes the assessable figure only.
- **Charting requirement:** total wealth is drawn as a stacked area distinguishing Protected from
  Assessable, with a marker at any date the exemption status changes and at the expiry of a
  two-year clock. Drawing a single net-worth line would hide the entire mechanism.
- Anyone tempted to reduce the home to `home_value: number` should read this first. The number is
  the least useful thing about it.

## Note, 2026-09-03 — the home's market value is a user-supplied Setting

The decision above is unchanged. This narrows it by exactly one input.

The Home Equity Access Scheme needs the number this ADR refused to hold: capacity is
`age component × floor(security value ÷ $10,000)`, and security value starts from the home's
market value (assumptions register T42). There is no modelling HEAS without it.

So the market value is a **Setting the user enters**, carried in the plan file like any other —
not hardcoded, not derived from a price index, not inferred from the mortgage. And it is read by
**exactly one thing: HEAS capacity.** It is not an asset value in the means-test model. It never
enters `assessableAssets` or `protectedAssets`, the Age Pension calculation never sees it, and no
chart draws it as wealth. With the HEAS facility off — its default — nothing reads it at all.

ADR-0005 is therefore narrowed, not contradicted. The home's exemption status is still worth more
than its market value, and holding the home as a number still invites treating it as a liquid
asset. That reasoning holds everywhere except this one HEAS-only input, whose job is to size a
loan, not to value an asset.

One cost, stated plainly: this is a user's estimate of a market value, not a figure sourced from
legislation or an agency, so it does not carry the confidence character of the register's verified
figures. Everything downstream of it — Maximum Loan Available, remaining headroom, projected debt —
is an **estimate**, and is presented as one.

## Note, 2026-09-04 — the ruling: the value is an input field, not part of the means test

The 2026-09-03 note narrowed this ADR to one HEAS-only input but left a live contradiction with
the assumptions register: T42 said the market value never reaches `assessableAssets`, while T39
said that at the two-year vacated-home cliff the home enters `assessableAssets` at full market
value. Both cannot hold. The user has ruled, in these words:

> House value is an input field. House value is not part of the means test.

That resolves it in favour of T42, and it resolves it completely. The home's market value is a
figure the user types. It is read by **HEAS capacity alone** — explicitly not by the assets test,
not by the income test, not by the Age Pension calculation, and **not by the vacated-home case**.
There is no exception, datable or otherwise. `HomeStatus` remains the only means-test primitive.

### The cost, stated plainly

Australian social security law does assess a vacated home at full market value once the two-year
exemption lapses. T39 recorded that correctly from primary sources, and this ruling does not make
it untrue — it makes it out of scope. So the consequence is a real one, and it is not a rounding
error: **v1 cannot forecast a household that vacates its home and stays away beyond two years.**

The tool therefore **refuses that scenario rather than approximating it**. `agePensionEntitlement`
throws `UnvaluedAssessableHomeError` the moment `HomeStatus` is `vacatedBeyondTwoYearExemption`.
That is deliberate and it stays. The alternative — omitting the home from `assessableAssets` and
computing anyway — would over-state entitlement by the whole value of a house, fluently and
without warning. That is the exact failure this project is organised against, so an error the user
cannot miss is the better answer than a number they cannot check.

`VACATE_HOME` and the two-year clock therefore remain in v1, but their job changes: the clock is
no longer the thing that switches an assessment on, it is the thing that **detects the boundary at
which the tool must stop**. TODO P3-15 is rescoped to detect-and-refuse; the full assessment
treatment moves to Phase 14, where vacating the home for aged care naturally belongs and where the
second means test needs a home value anyway.

### Where the value lives — refined 2026-09-04

The 2026-09-03 note called it "a Setting … carried in the plan file like any other". That was the
right substance in the wrong container, and it is narrowed again here. **The market value is not a
Setting. It is a parameter of the `HEAS_DRAW` Journal Entry that needs it**, held in that entry's
`params` as the **Security Value** the scheme actually reads.

The substance of the ruling is unchanged — the figure is a user-typed input, it sizes a loan, and
the means test never sees it. What changes is scope of reach:

- It is **absent from `Person` and `Household`**, exactly as it is today. That absence is already
  asserted by a test that greps the core sources for `marketValue|homeValue`, and it stays.
- It is **absent from the Settings surface**, so household setup never asks for it and no Scenario
  carries it unless a `HEAS_DRAW` entry puts it there. A Setting holds for the whole projection
  and would sit in every plan file whether or not the facility was ever switched on; a figure only
  one entry type consumes has no business being a global.
- The UI **prompts for it inside the entry editor**, at the moment a `HEAS_DRAW` entry is created
  or enabled, alongside the estimate warning it already has to carry.
- It is **passed directly to the HEAS ceiling calculator** as a function argument.
  `core/agePension.ts` never receives it and has no parameter to receive it through.

This is a tighter fit to ADR-0002 as well: a dated what-if that needs a number of its own carries
that number, and the plan file shows which entry supplied it. Two scenarios can then price HEAS
against two different valuations — a conservative one and an optimistic one — and compare them,
which a single global figure makes impossible.

`data/assumptions/settings.ts` still registers `heas.homeMarketValue` under
`SETTINGS_NOT_ASSUMPTIONS`, and it should: that register exists to answer *why no assumption backs
this key*, and the answer is unchanged. Only its `HomeMarketValueSetting` shape is now misnamed —
correcting it is TODO P9-1c, not a change of decision.

### Refusal on refinance or redraw

One further consequence, already recorded as register **T35** and TODO **P9-1a** but worth naming
here because it is the same entry editor doing the work: increasing the Owner-Occupied Mortgage
while a HEAS loan runs **voids the No Negative Equity Guarantee** (SS Act s 1144AA(3)(a)). Any
Scenario holding both a `HEAS_DRAW` and a `MORTGAGE_REFINANCE` — refinance or redraw — must surface
that at the point the second entry is added, not silently keep the guarantee in the projection.

### Reopen condition

If forecasting a vacated home past two years becomes a requirement — most likely when Phase 14
starts, or if the household's actual plans change — **this note is what must be revisited.** The
change is small and known: let the means test read the same Setting HEAS reads, at the cliff date
only, with s 1121(5) deducting any HEAS debt from it in full (T39). What must not happen is that
change arriving quietly, because it would make the home's market value load-bearing for
entitlement while it still carries no source and no confidence rating (§5.1).

## Note, 2026-09-24 — the exemption periods in the table above are partly wrong

A primary-source check ([research/p6-5-home-absence.md](../research/p6-5-home-absence.md),
Social Security Act 1991 s 11A(9), s 1118, and DSS Guide 4.6.3.60–.90) found:

- **"Vacated, nobody remains: exempt 2 years" is wrong as a general rule.**
  - An ordinary absence is exempt for **12 months** (s 11A(9)(a)).
  - Two years applies only in two cases: moving into a care situation or residential aged care
    (s 11A(9)(b)), and caring for another person elsewhere (s 11A(9)(f)).
  - A home that is lost or damaged is exempt for 12 months, extendable to 24 (s 11A(9A)).
- **"Sold, proceeds earmarked: exempt 24 months" is the base period only.** For sales on or after
  1 January 2023 it can be extended to a maximum of **36 months** (s 1118(1B), (2B)). "Still
  deemed" is confirmed.

None of these periods is in `src/data/assumptions` yet. `VACATE_HOME` (P6-5) stays refused
until they are registered as sourced figures, and until the case being modelled is decided.

## Note, 2026-09-25 — the reopen condition above is exercised, for exactly the case it named (P14-5a)

The 2026-09-04 reopen condition said: *"let the means test read the same Setting HEAS reads, at
the cliff date only... What must not happen is that change arriving quietly."* Phase 14 is what
makes it arrive on purpose, and by a narrower door than the one that note imagined.

**Not a Setting.** `ENTER_CARE` (P14-13) carries `homeValue` as one of its own params — *"the
household's own estimate"*, stated on the entry, not a global. That is the figure this note
resolves to read, not `heas.homeMarketValue`; the two remain independent inputs a user could state
differently, exactly as the 2026-09-04 note's own reasoning about HEAS wanted.

**One case, not the general one.** Re-verified 2026-09-25 (`research/p6-5-home-absence.md`,
re-fetched live): the 2-year figure this note reopens is the CARE-SITUATION exemption alone (SS Act
s 11A(9)(b)), registered as `AGE_PENSION.assetsTest.careVacatedHomeExemptionMonths`. The general
12-month absence (s 11A(9)(a)) is untouched — `VACATE_HOME` stays refused, P3-15 unchanged. A
`homeStatus` set to `vacatedBeyondTwoYearExemption` by hand, with no `ENTER_CARE` behind it, still
throws `UnvaluedAssessableHomeError` exactly as before: the reopen is the entry, not the status.

**What is NOT built.** s 1121(5)'s HEAS-debt deduction this note also named — no fixture in this
build runs a `HEAS_DRAW` past a care-situation cliff, so that interaction is untested and unpriced,
not merely unmentioned. **Built 2026-09-25** (`docs/research/p9-heas-debt-netting-2026-09-25.md`; SS Act s 1121(5), DSS Guide 3.4.5.20 and Aged Care Act 2024 s 330(1),(8)): past the
cliff the month's opening HEAS debt comes off the assessable home in full, inside the nil floor
(whether a debt above the home reaches other assets is unsourced); while the home is exempt,
nothing changes; and the aged care home value nets the same debt before its cap. Rented-out or sold former homes are not modelled either (`SELL_HOME`,
`RENT_OUT_HOME` are still open, P14-13's own list) — a household that rents out or sells the home
after entering care gets the SAME treatment as one that leaves it vacant, which is wrong the moment
either happens and is a gap worth stating plainly rather than silently.

**How the value reaches the walk, in one sentence.** `core/household.ts`'s `splitAssets` gained a
third, optional parameter — never a `Household` field — supplied only by `project()`, only once the
home has been unprotected (`ADR-0005`'s own primitive, not a stored value) for the registered
number of months, carrying the entry's stated figure forward on CPI from the entry's own day and
netting off any mortgage still owing. `core/agePension.ts` forwards it, unread otherwise; nothing
under `src/` outside `project()` and the two modules just named can construct one.
