# Moneysmart Retirement Planner — P4-7 run 4, 2026-09-21

The fee-matched re-run, and the last one. Runs 1-3 are in `moneysmart-baseline-2026-09-17.md`,
`moneysmart-limb3-2026-09-18.md` and `moneysmart-run3-2026-09-21.md`; the input sheet is
`moneysmart-run3-fill-in-sheet.md`. Source PDF: `ASIC Retirement Planner-1 copy.pdf` (21/09/2026).
The year-by-year table was transcribed by hand into the fill-in sheet — the PDF contains none.

---

## What this run settled

**Run 3 did not test fees.** It left the pension account — where the whole drawdown happens — at 0%.
This run charges their own realistic defaults on both accounts and is otherwise run 3 exactly.

Two results, one good and one bad, and they are independent of each other.

1. ✅ **The fee effect is confirmed quantitatively.** This is the first clean numerical validation
   the whole P4-7 exercise has produced.
2. ⚠️ **The Age Pension indexation defect reproduces exactly.** Two runs, four days and two fee
   configurations apart, identical broken behaviour. It is a property of their calculator.

---

## Inputs that changed from run 3

| Field | Run 3 | Run 4 |
| --- | --- | --- |
| Super account admin fee $ / % / cap | $0 / 0.11% / $0 | **$59 / 0.11% / $710** |
| **Pension account** admin fee $ / % / cap | $0 / **0%** / $0 | **$69 / 0.14% / $900** |
| Insurance premiums (super account) | $0 | **$599** *(entered, but not charged — see below)* |

Everything else is run 3: single, homeowner, age 66 retiring at 67, super to last to 92, $600,000
balance, $0 salary, Balanced then Conservative, no shares or other assets, personal assets $0,
inflation 2.5% / wage 3.7%, deflators 3.7% / 2.5%, income target $0.

---

## Headline outputs (today's dollars, annual)

| Figure | Run 3 | Run 4 |
| --- | --- | --- |
| Estimated balance at retirement (age 67) | $610,530 | **$610,389** |
| Average estimated income (the level solve) | $51,853 | **$51,335** |
| Age the money runs out | 92 | 92 |

**The prediction written down before the run was that income would FALL.** It did, by **$518 a year**.
Had it risen, something would have been wrong and the run would have been stopped.

> The balance is the top KPI tile on page 1. It was reported as missing during the run — it is there,
> above the income target.

---

## ✅ THE FEE EFFECT, CONFIRMED

Solving for the real return that exhausts the super column exactly at age 92, from each run's own
stated opening balance:

| | Implied real return |
| --- | --- |
| Run 3 — **no** pension-account fee | **3.3093%** |
| Run 4 — 0.14% of balance **+ $69 a year** | **3.1350%** |
| **Difference** | **0.1743 points** |

**Predicted from the stated fees: ~0.1515 points** — 0.14% of balance, plus $69 on roughly $600,000.

The residual of about 0.023 points is explained, not waved away: **the flat $69 bites harder as the
balance shrinks.** It is 0.0115% of $600,000 but 0.035% of $200,000, so its average effect across a
25-year drawdown is larger than its effect at the start. Nothing else is needed to close the gap.

**Their fee machinery does what it says it does.** Note this result is derived from the **balance
path**, so it is untouched by the pension defect below.

### Insurance was entered but not charged
$599 was entered on the super account where the sheet asked for $0. The retirement balance fell only
**$141** from run 3, which is the $59 admin fee alone. That matches their own stated rule (run 3 PDF,
p11): *premiums are applied only up to the earlier of age 65 or the retirement age* — and this
person is already 66. **A useful thing to have confirmed by accident.**

---

## ⚠️ THE AGE PENSION DEFECT REPRODUCES — this is now established, not suspected

Run 3's reverse-engineered model was: **the maximum single rate frozen at today's nominal $31,286,
never indexed**, shown in today's money as `31,286 / 1.025^(age−67)`, less the assets-test abatement.

Applied to **run 4's** figures without refitting anything:

| Age | Run 3's model predicts | Run 4 actual | Difference |
| --- | --- | --- | --- |
| 87 | $19,093 | $19,097 | +0.02% |
| 92 | $16,875 | $16,879 | +0.02% |
| 96 | $15,288 | $15,291 | +0.02% |
| 100 | $13,850 | $13,853 | +0.02% |

And the year-on-year freeze fits **to the dollar** across the whole tail — each year is the previous
divided by 1.025, within $1 at every step from 93 to 100.

This still contradicts their own PDF page 8, which states wage inflation of 3.7% is used to inflate
*"Government Age Pension payment rate"*, and it still contradicts **run 1**, whose pension
demonstrably did index at 1.171%/yr real. **Two runs now show the frozen behaviour and one shows the
indexed behaviour, on the same stated assumptions.**

> **THE RULING STANDS, and is now better evidenced: do not change `enough` to match this.** Our
> engine indexes the Age Pension off a dated `economicSeries` and is the more correct of the two.

---

## Transcription slips in the hand-typed table

Both were caught because every row from 67 to 91 must total the level income, $51,335:

| Age | As typed | Should be | What happened |
| --- | --- | --- | --- |
| 72 | 36,903 | **36,250** | run 3's age-72 figure, carried over |
| 80 | 31,137 | **31,317** | age 79's figure, duplicated |

The corrected values were used throughout this document. Neither changes any conclusion. **A
row-sum invariant is what makes a hand-transcribed table checkable — keep the totals column, or keep
a figure the rows must add to.**

---

## P4-7's verdict

**Validated:** the assets-test free area and taper (run 3 back-solved them to within $52 of the
stated balance), growth compounding, the depletion age, and now **fees**.

**Not validatable, and the reason is theirs not ours:** the **Age Pension means test** — the single
largest area of genuine overlap between the two models. Their pension column is wrong in two runs
out of three, and we cannot calibrate against a reference that is broken in the one place it matters
most.

**Never in scope for this shape:** income tax (they apply none to retirement income and say so
outright, p14), CGT, salary sacrifice, the Superannuation Guarantee, Division 293. A $0-salary,
super-only household contains none of them.

**Still open from run 1 and NOT closed here:** run 1's accumulation year ran +1.776% in today's
dollars where Balanced 6.1% against a 3.7% deflator predicts +2.314%. Run 4's retirement balance sits
$141 below run 3's on a change that should cost $59 — the same scale of unexplained discrepancy.
**Do not treat a divergence of that size in `enough` as a defect until it is explained.**

**P4-7 is closed.** Four runs, one calculator, and the honest summary is that it validated three of
the four things it could have, and disqualified itself on the fourth.
