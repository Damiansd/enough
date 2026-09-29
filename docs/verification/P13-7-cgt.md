# P13-7 — one hand-worked CGT disposal, reconciled independently of the engine

TODO.md P13-7: *"a parcel held over 12 months, sold part-way through a year with salary, reconciled
by hand through the discount, taxable income, LITO and the Medicare levy."* This is that
reconciliation. **The figures below were computed before any test was written and before
`src/core/incomeTax.ts` or any CGT module was read in this session** — from
`docs/assumptions-register.md` §2.1 (brackets and the levy), §2.2 (LITO) and the standard CGT
50% discount (ITAA 1997 Div 115, s 115-25 — a parcel held **more than 12 months** by an individual
discounts the gross gain by half), and from the FY2026-27 figures in `src/data/assumptions/tax.ts`
(read only for the constants, not the arithmetic that consumes them).

## The case

A single person, Priya (not SAPTO-eligible — well under 67, so only the ordinary Medicare levy
thresholds apply, and no SAPTO row is in play). No spouse.

- **Salary**: $41,600.00 for FY2026-27 ($1,600.00 a fortnight × 26).
- **Parcel**: acquired 2024-01-15, cost base $20,000.00, market value $50,000.00 at the time of
  sale. Held well over 12 months by the sale date.
- **Disposal**: the whole parcel sold 2026-11-20 (inside FY2026-27, which runs 1 July 2026 to
  30 June 2027) for $50,000.00.
- **Settings**: `nominalReturn: 0` — the parcel's market value does not move with the calendar, so
  the sale realises exactly the stated gain regardless of which month it lands in. This is a
  fixture device, not a claim about markets (the same device the engine's own
  `test/core-non-super-gain-tax.test.mjs` uses, for the same reason: two sales in two different
  months would otherwise realise two different gains under compounding).

## Step 1 — the discount

Gross capital gain: $50,000.00 − $20,000.00 = **$30,000.00**.

Held more than 12 months, individual taxpayer ⇒ Div 115 discount applies: 50%.

Net capital gain = $30,000.00 × 0.5 = **$15,000.00**.

(There is only one parcel and one disposal, so s 102-5's method-statement ordering — which
`core-non-super-gain-tax.test.mjs` §1 hand-works separately, across losses and multiple parcels —
collapses to this one line: no loss to net, no undiscounted gain to add.)

## Step 2 — the timing

The engine charges the whole of a disposal's tax once, in the month of the disposal, as the
**difference between two whole-financial-year assessments**: the year's tax with the gain in
taxable income, less the year's tax without it — both computed on the SAME salary, which is
assessed at its full annual rate regardless of which month of the walk it is read from. (This is
the annual-assessment design `core-non-super-gain-tax.test.mjs` §2 pins directly — two disposals in
one year telescope to the tax on the combined gain, and a disposal is assessed on the year's own
brackets, LITO and levy, from a clean slate at 1 July.) So the reconciliation below is:

```
tax on the disposal = tax(salary + net capital gain) − tax(salary alone)
```

both assessed under FY2026-27's ladder.

## Step 3 — taxable income, both assessments

⚠️ **CORRECTED ON RE-CHECK — see "The re-check" below.** The first pass of this document took
taxable income as the salary itself. That is wrong: ITAA 1997 s 25-130 (register §2.8.2) gives a
**$1,000 standard deduction for work-related expenses**, in force from FY2026-27, which reduces a
salary's own contribution to taxable income before anything else is added. Priya has no stated
s 25-130(2) reducers, so the deduction is the full `min($1,000, salary) = $1,000.00`. The capital
gain is added AFTER this deduction, not before it (§2.8.2: *"the gain therefore enters the sum and
not the deduction base"* — folding a capital gain into the base the work-expense deduction is
computed on would be wrong in law, not just in arithmetic).

| | Without the gain | With the gain |
|---|---|---|
| Salary | $41,600.00 | $41,600.00 |
| less s 25-130 standard deduction | − $1,000.00 | − $1,000.00 |
| Taxable income from salary | $40,600.00 | $40,600.00 |
| plus net capital gain | — | + $15,000.00 |
| **Taxable income** | **$40,600.00** | **$55,600.00** |

## Step 4 — the brackets (register §2.1, FY2026-27: nil to $18,200 · 15% to $45,000 · 30% to
$135,000 · 37% to $190,000 · 45% above)

**Without the gain**, $40,600.00 sits entirely inside the 15% band (below $45,000):

```
($40,600.00 − $18,200.00) × 15% = $22,400.00 × 0.15 = $3,360.00
```

**With the gain**, $55,600.00 crosses into the 30% band:

```
($45,000.00 − $18,200.00) × 15% = $26,800.00 × 0.15 = $4,020.00
($55,600.00 − $45,000.00) × 30% = $10,600.00 × 0.30 = $3,180.00
                                                        $7,200.00
```

## Step 5 — LITO (register §2.2)

`offset = 700 − 0.05 × (TI − 37,500)` for $37,500 < TI ≤ $45,000 (stage 1); `325 − 0.015 × (TI −
45,000)` for $45,000 < TI ≤ $66,667 (stage 2).

**Without the gain**, TI = $40,600.00 is in stage 1:

```
$700.00 − 0.05 × ($40,600.00 − $37,500.00) = $700.00 − 0.05 × $3,100.00 = $700.00 − $155.00 = $545.00
```

**With the gain**, TI = $55,600.00 is in stage 2:

```
$325.00 − 0.015 × ($55,600.00 − $45,000.00) = $325.00 − 0.015 × $10,600.00 = $325.00 − $159.00 = $166.00
```

Both are fully absorbed by the gross tax computed in step 4 (no LITO is wasted — $545.00 < $3,360.00
and $166.00 < $7,200.00), so net tax after LITO is:

```
without: $3,360.00 − $545.00 = $2,815.00
with:    $7,200.00 − $166.00 = $7,034.00
```

## Step 6 — the Medicare levy (register §2.1, §2.7)

Ordinary (non-seniors) single thresholds: lower $28,011.00, upper $35,013.00. Priya is not
SAPTO-eligible, so these are the thresholds that apply, not the seniors/pensioners pair.

Both assessments' taxable income exceeds the upper threshold ($40,600.00 and $55,600.00, both
above $35,013.00), so s 7(2)'s 10%-of-the-excess cap does not bind and the full, uncapped 2% under
s 6(1) applies in both:

```
without: 2% × $40,600.00 = $812.00
with:    2% × $55,600.00 = $1,112.00
```

## Step 7 — net tax, both assessments

```
without: $2,815.00 + $812.00 = $3,627.00
with:    $7,034.00 + $1,112.00 = $8,146.00
```

## Step 8 — the tax the disposal causes

```
$8,146.00 − $3,627.00 = $4,519.00
```

**Hand figure: the November 2026 disposal is charged $4,519.00 of capital gains tax.**

## The re-check

The first pass of this document (before any test was written) omitted the s 25-130 standard
deduction and gave taxable income of $41,600.00 / $56,600.00 and a disposal charge of **$4,634.00**
— $115.00 high. `test/verification-p13-7-cgt.test.mjs` first asserted that figure and failed
against the engine's $4,519.00. Per the brief: the working was re-checked once, against the
register, before either figure was changed to match the other. The re-check found the omission
above — §2.8.2, already in the register and already read for §2.1 and §2.2, but not carried into
this case — and is what produced the corrected figures in steps 3–8. This is a correction to an
incomplete hand-working, not a disagreement between an engine defect and a correct hand figure: once
the deduction is included, the two agree to the cent (confirmed directly against
`householdIncomeTax` on $40,600.00 and $55,600.00, and against the walk's own salary-only monthly
accrual, before the disposal test was corrected).

## Reconciliation against the engine

`test/verification-p13-7-cgt.test.mjs` builds this exact household and sale through `project()`
(the real walk) and asserts the `Income tax on capital gain` line for November 2026 equals
`toCents(4_519)`.

**Result: AGREES**, on the corrected figure. No further discrepancy.
