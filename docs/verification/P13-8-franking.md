# P13-8 — one hand-worked franked distribution, both sides, reconciled independently of the engine

TODO.md P13-8, both halves in one task: (a) an individual on a low retirement income — cash plus
credit, grossed up, tax on the grossed-up figure, the offset, and the excess refunded in cash,
through LITO, SAPTO's rebate income and the Medicare levy; (b) a fund in Retirement Phase — 0%
earnings tax, credit refunded in full; (c) a fund in Accumulation Phase — credit offsetting the
15%.

**The figures below were computed before any test was written and before
`src/core/individualFranking.ts` or `src/core/superFranking.ts` was read in this session** — from
`docs/assumptions-register.md` §5A (the gross-up, §5A.1; the corporate rate, §5A.2; refundability,
§5A.3) and §2 (brackets, LITO, SAPTO, the Medicare levy), and from the FY2026-27 figures in
`src/data/assumptions/tax.ts` (read only for the constants).

**The exact rationals, per §5A.1 — not the ATO's rounded 2.3333.** A payer's own corporate rate `r`
gives a gross-up rate `(1−r)/r` and a credit `f × D × r/(1−r)`, where `D` is the cash distribution
and `f` the franking percentage. At `r = 30%`: `r/(1−r) = 0.30/0.70 = 3/7` exactly. At `r = 25%`:
`r/(1−r) = 0.25/0.75 = 1/3` exactly. Both cases below are chosen so the division lands on a whole
cent, so no flooring behaviour is in play (that is separately pinned in
`test/core-super-franking.test.mjs`'s T44 case, which this document does not re-derive).

## (a) An individual on a low retirement income

Nadia, single, SAPTO-qualified (age 67+, so both SAPTO and the seniors/pensioners Medicare levy
thresholds apply — register §2.5, §2.7). No spouse, no Rebate Income add-backs, so Rebate Income =
taxable income throughout.

- **Baseline taxable income**: $22,000.00 (before the distribution).
- **Distribution**: $16,800.00 cash, fully franked (f = 1), payer at 30%.

### Step 1 — the gross-up (§5A.1)

```
credit     = D × r/(1−r) = $16,800.00 × 3/7 = $7,200.00
grossed up = D + credit  = $16,800.00 + $7,200.00 = $24,000.00
```

### Step 2 — taxable income, both assessments

| | Without | With |
|---|---|---|
| Taxable income = Rebate Income | $22,000.00 | $22,000.00 + $24,000.00 = $46,000.00 |

### Step 3 — the brackets

**Without**, $22,000.00 is entirely in the 15% band:

```
($22,000.00 − $18,200.00) × 15% = $3,800.00 × 0.15 = $570.00
```

**With**, $46,000.00 crosses into the 30% band:

```
($45,000.00 − $18,200.00) × 15% = $26,800.00 × 0.15 = $4,020.00
($46,000.00 − $45,000.00) × 30% = $1,000.00 × 0.30  =   $300.00
                                                       $4,320.00
```

### Step 4 — LITO (§2.2)

**Without**, TI $22,000.00 ≤ $37,500.00 ⇒ full $700.00 entitlement, but capped by the tax it
reduces (non-refundable): `min($700.00, $570.00) = $570.00` applied, net tax to nil.

**With**, TI $46,000.00 is in stage 2 ($45,000 < TI ≤ $66,667):

```
$325.00 − 0.015 × ($46,000.00 − $45,000.00) = $325.00 − $15.00 = $310.00
```

fully absorbed ($310.00 < $4,320.00).

```
without: $570.00 − $570.00 = $0.00
with:    $4,320.00 − $310.00 = $4,010.00
```

### Step 5 — SAPTO (§2.3, §2.4; single 2026-27 golden fixture: shade-out $36,034, cut-out $53,874;
BRA $2,230, taper 12.5c/$1, offset rounded UP to the whole dollar)

**Without**, Rebate Income $22,000.00 ≤ $36,034.00 ⇒ full $2,230.00 entitlement, but tax after LITO
is already $0.00, so nothing is absorbed (SAPTO is non-refundable — the unused entitlement is
simply lost, not carried or paid).

```
without: $0.00 − $0.00 = $0.00
```

**With**, Rebate Income $46,000.00 is between shade-out ($36,034.00) and cut-out ($53,874.00), so
the taper applies:

```
offset = ceil($2,230.00 − 0.125 × ($46,000.00 − $36,034.00))
       = ceil($2,230.00 − 0.125 × $9,966.00)
       = ceil($2,230.00 − $1,245.75)
       = ceil($984.25)
       = $985.00
```

fully absorbed ($985.00 < $4,010.00 remaining after LITO):

```
with: $4,010.00 − $985.00 = $3,025.00
```

(Both offsets are far from binding against the remaining tax at either step, so the LITO/SAPTO
application order does not change either total — checked both ways by hand.)

### Step 6 — the Medicare levy (§2.7 — seniors/pensioners single thresholds, 2025-26 fallback in
force for FY2026-27: lower $44,268.00, upper $55,335.00)

**Without**, TI $22,000.00 ≤ $44,268.00 ⇒ s 7(1): nil levy, STOP.

**With**, TI $46,000.00 is between the seniors lower and upper thresholds ⇒ s 7(2) shade-in:

```
base = min(2% × $46,000.00, 10% × ($46,000.00 − $44,268.00))
     = min($920.00, 10% × $1,732.00)
     = min($920.00, $173.20)
     = $173.20
```

```
without: $0.00
with:    $173.20
```

### Step 7 — net tax, both assessments

```
without: $0.00 + $0.00 + $0.00 = $0.00
with:    $4,320.00 − $310.00 − $985.00 + $173.20 = $3,198.20
```

### Step 8 — the tax on the distribution, the offset and the refund

```
tax on the distribution = $3,198.20 − $0.00 = $3,198.20
offset (s 207-20(2))    = the credit = $7,200.00
refund (s 63-10(1) item 40) = $7,200.00 − $3,198.20 = $4,001.80   IN CASH
net cash = $16,800.00 + $4,001.80 = $20,801.80
```

**Hand figure: additional tax $3,198.20, offset $7,200.00, refund $4,001.80, net cash $20,801.80.**

## (b) A fund in Retirement Phase

A complying, resident, qualified fund, wholly in Retirement Phase for the whole financial year
(ECPI, ss 295-385/295-390 — earnings tax 0%). Distribution: $42,000.00 cash, fully franked, payer
at 30%.

```
credit     = $42,000.00 × 3/7 = $18,000.00
grossed up = $42,000.00 + $18,000.00 = $60,000.00
earnings tax = $60,000.00 × 0% = $0.00
```

s 207-90 would deny both the gross-up and the offset on this exempt income, but s 207-110(2)(b)
disapplies s 207-90 for ECPI (§5A.3), so the offset stands and s 67-25(1) with s 63-10(1) item 40
refunds whatever the offset exceeds the (nil) tax — the whole credit, in cash:

```
offset = $18,000.00
refund = $18,000.00 − $0.00 = $18,000.00   (the WHOLE credit)
net cash = $60,000.00 (the grossed-up amount, entirely untaxed)
```

**Hand figure: earnings tax $0.00, offset $18,000.00, refund $18,000.00 (in full), net cash
$60,000.00.**

## (c) A fund in Accumulation Phase

A complying, resident, qualified fund, wholly in Accumulation Phase for the whole financial year
(15% under the Income Tax Rates Act 1986 s 26(1)(a) — register §5A.3). Distribution: $36,000.00
cash, fully franked, payer at **25%** — the base rate entity rate, exercising the 1/3 rational
rather than repeating (b)'s 3/7.

```
credit     = $36,000.00 × 1/3 = $12,000.00
grossed up = $36,000.00 + $12,000.00 = $48,000.00
earnings tax = $48,000.00 × 15% = $7,200.00
```

The credit offsets the 15% liability (§5A.3); the excess, if any, is refunded in cash.

```
offset = $12,000.00
tax after offset: $7,200.00 − $12,000.00 = −$4,800.00 ⇒ refund $4,800.00, tax payable $0.00
net cash = $36,000.00 + $4,800.00 = $40,800.00
```

**Hand figure: earnings tax $7,200.00, offset $12,000.00, refund $4,800.00 (the excess), tax
payable $0.00, net cash $40,800.00.**

## Reconciliation against the engine

`test/verification-p13-8-franking.test.mjs` builds these three cases through `frankingForIndividual`
and `frankingInSuper` — the public functions, not `project()` — and asserts each figure above.

**Result: AGREES, in all three cases, to the cent.** No discrepancy in any of (a), (b) or (c).
