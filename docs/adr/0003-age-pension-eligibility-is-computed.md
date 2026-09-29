# Age Pension entitlement is always computed, never assumed

The engine calculates Age Pension entitlement from the means tests every projected fortnight.
It never applies a floor, a minimum, or an assumption that the Household qualifies.

## Why

It is intuitive — and wrong — to assume everyone eventually receives at least a small Age
Pension. Above the assets test cut-off, entitlement is **zero, not minimal**: $1,121,000 in
assessable assets for a homeowner couple from 20 September 2026, with the Account-Based Pension
balance counted in full.

Whether the Household qualifies is therefore an *output* of the projection, determined largely
by the super balance at 67. Baking in a floor would mask the single most consequential cliff in
the model, and would do it silently — every Scenario would receive income it may not be
entitled to, and "discharge the mortgage from super" would appear better than it is.

That last case is the one to protect. Spending super on the family home genuinely *improves*
entitlement, because the home is assets-test exempt while the super balance was assessable. A
hard-coded floor would flatten exactly the effect the tool was built to reveal.

## The retain-eligibility goal

Structuring finances to keep at least minimal entitlement is a deliberate strategy here, and it
is rational: $1 a fortnight of Age Pension still confers the **Pensioner Concession Card**,
worth a few thousand a year in cheaper pharmaceuticals, utilities, rates and registration.

This is modelled as a **constraint the tool checks, not an assumption it applies**. The chart
carries an eligibility band and flags the years in which assessable assets exceed the cut-off.
The cliff is made visible rather than assumed away.

## Consequences

- Age Pension is computed once on **combined** Household means and then halved. Computing it
  per person on individual means is the classic couple-modelling bug.
- The younger Person's accumulation-phase super is exempt from both tests until they reach 67,
  then becomes fully assessable. This step change is usually the largest single cliff in a
  couple forecast and must be visible on the chart, not buried in the table.
- Anyone later tempted to add a pension floor "because the numbers look harsh" should read this
  first. The harshness is the finding.
