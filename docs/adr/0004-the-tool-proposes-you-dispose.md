# Derived values are always suggestions, never silent bindings

Anywhere the tool computes something that could just be applied automatically, it proposes the
value and waits for acceptance instead. This covers the spending baseline derived from imported
history, the categorisation of imported transactions, and the go-go/slow-go spending presets.

## Why

Auditability is the governing constraint of this project — it is the thing a spreadsheet gives
free and a web app has to earn. A number that changes because a CSV was imported, with no
visible cause, is precisely the failure that erodes trust in the whole model. Once you stop
believing a figure, you stop believing the comparison it feeds, and the tool is worthless for
the decision it was built for.

The cost is real: more clicks, and an import that cannot be fully automated. That is accepted.

## How it applies

- **Derived spending baseline:** "your trailing 12-month average is $X/month — use it?" The
  Setting only changes when accepted.
- **Transaction categorisation:** rules *suggest* in bulk and are reviewed before commit — "47
  transactions match `WOOLWORTHS` → Committed/Groceries, accept?". A saved rule pre-sorts the
  next import but never silently reclassifies data already categorised.
- **Spending presets:** presets generate *visible* Journal Entries rather than applying a hidden
  curve, so every step can be seen and individually overridden.
- **Age Pension entitlement** is the deliberate exception in the other direction: it is computed
  and never assumed, because assuming it would hide a cliff. See
  [ADR-0003](./0003-age-pension-eligibility-is-computed.md). The unifying rule is that the user
  can always see why a number is what it is — sometimes that means not auto-applying, sometimes
  it means not auto-assuming.

## Consequences

- Import is a two-phase flow: parse and propose, then review and commit. Budget UI for the
  review step; it is not a dialog box.
- Every derived value needs to display its provenance — which transactions, which window, which
  rule.
