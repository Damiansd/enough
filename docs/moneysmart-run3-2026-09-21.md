# Moneysmart Retirement Planner — P4-7 run 3, 2026-09-21

Third run against `enough`. Runs 1 and 2 are in `moneysmart-baseline-2026-09-17.md` and
`moneysmart-limb3-2026-09-18.md`; the input sheet used is `moneysmart-run3-fill-in-sheet.md`.
Source PDF: `ASIC Retirement Planner-1.pdf` (15 pages, 21/09/2026). The year-by-year table was
transcribed by hand into the fill-in sheet — the PDF does not contain one.

---

## ⚠️ READ THIS BEFORE USING ANY FIGURE FROM THIS RUN

**Their Age Pension is not indexed in this run. It is today's nominal rate, held flat for the whole
34-year projection.** The fit is exact:

    pension(age) = 31,286 nominal, NEVER indexed
                 = 31,286 / 1.025^(age - 67) in today's dollars
                 less the assets-test abatement

**Every year from 87 to 100 fits within $3** — see the table below. $31,286 is the *current*
maximum single rate. Because the figures are deflated at 2.5% and the rate never rises, the pension
**decays at 2.439% a year in today's money**.

This contradicts two things at once:

1. **Their own PDF, page 8:** *"Wage inflation is set to 3.7% per annum by default and is used to
   inflate the following variables … Government Age Pension payment rate"*. Deflated at 2.5%, that
   is **+1.171%/yr** in today's money. Observed: **−2.439%/yr**.
2. **Run 1 of the same calculator, four days earlier**, whose pension demonstrably *did* index —
   `31223.40 * (1.037/1.025)^(age-67)` fitted **exactly, to the dollar, for every year 82 to 100**.

Same stated inputs, opposite behaviour. **By age 100 this run understates the Age Pension by a
factor of about 2.4** — $13,848 against ~$45,845.

**Two candidate causes were tested and eliminated by the user:** "Include a partner" was OFF
(confirmed single, and the PDF shows a single "You" column), and **the tool exposes no Age Pension
indexation setting**.

> **THE RULING: do not change `enough` to match this.** Our engine indexes the Age Pension off a
> dated `economicSeries` and is **more correct here than the reference tool**. Taking run 3 at face
> value would mean "fixing" working code to reproduce a frozen pension. When an external reference
> disagrees, establish which side is wrong *before* moving anything.

---

## Inputs (confirmed from PDF pages 2-5)

| Field | Value |
| --- | --- |
| Status | Single, no partner, homeowner, Age Pension included |
| Age / retirement age / **age for super to last** | 66 / 67 / **92** |
| Salary / salary growth | $0 / 0% |
| Super balance | $600,000 |
| Investment choice before / after retirement | Balanced / Conservative |
| Employer / salary sacrifice / after-tax contributions | $0 / $0 / $0 |
| Shares, cash, investment property | $0 / $0 / $0 (net rental yield 0%) |
| Personal assets | $0 *(their default is $25,000 — overridden)* |
| Inflation / wage inflation | 2.5% / 3.7% |
| Deflator before / after retirement | 3.7% / 2.5% |
| Retirement income target | $0 — this is what makes it solve for a level income |
| **Super account** admin fee $ / % / cap | $0 / **0.11%** / $0 |
| **Pension account** admin fee $ / % / cap | $0 / **0%** / $0 |
| Insurance premiums, adviser fees, one-off advice | $0 |

**Two settled questions, both of which runs 1 and 2 had right.** *"Age for super to last"* **is an
input**, listed under *About you* on page 2; page 13 confirms drawdowns are solved *"for the period
to your nominated super run out age (default of 92 based on regulatory requirements)"*. And the
**post-retirement investment choice is separately settable** — page 3 lists *Investment choice
(before retirement) Balanced* and *(after retirement) Conservative* as distinct rows.

⚠️ **The intended fee-matching did not happen.** The sheet asked for $59/0.11%/$710 on the super
account and $69/0.14%/$900 on the pension account. What was applied is above: **the pension account
carries no fee at all**, and the whole drawdown happens there. **This run therefore does not test
fees the way it was designed to** — though it produced a fee result anyway, below.

---

## Headline outputs (today's dollars)

| Figure | Value |
| --- | --- |
| Estimated balance at retirement (age 67) | **$610,530** |
| Retirement income target | $0 |
| Average estimated income | **$51,853** |
| Age the money runs out | 92 |

**$51,853 is the level income, not an average of a varying series.** Every row from 67 to 91 sums
to $51,853 or $51,854 — verified against all 25 rows. Run 1's equivalent was **$64,370**.

⚠️ **A hypothesis that fitted and was still false, recorded because the lesson is general.** Before
the year-by-year table arrived, the drop from $64,370 was explained as a change in the averaging
window: a 25-year level income of $64,370 plus a 9-year pension-only tail of $17,084 averages to
$51,853 **exactly, to the dollar**. It was wrong. The tail it implied — ~$17,000 for someone with no
assets — was impossible, since a single homeowner with nothing should draw the full rate. **A
hypothesis that reproduces one number while implying an impossible quantity is not an explanation.**

---

## Year-by-year (today's dollars, annual)

The unabated-frozen column is `31,286 / 1.025^(age-67)` — what the model above predicts when the
assets test is not binding.

| Age | Age Pension | Super | Total | Unabated-frozen | Status |
| --- | --- | --- | --- | --- | --- |
| 67 | 9,539 | 42,314 | 51,853 | 31,286 | abated |
| 68 | 10,645 | 41,208 | 51,853 | 30,523 | abated |
| 69 | 11,739 | 40,114 | 51,853 | 29,778 | abated |
| 70 | 12,822 | 39,031 | 51,853 | 29,052 | abated |
| 71 | 13,892 | 37,961 | 51,853 | 28,343 | abated |
| 72 | 14,950 | 36,903 | 51,853 | 27,652 | abated |
| 73 | 15,995 | 35,859 | 51,854 | 26,978 | abated |
| 74 | 17,026 | 34,827 | 51,853 | 26,320 | abated |
| 75 | 18,044 | 33,809 | 51,853 | 25,678 | abated |
| 76 | 19,048 | 32,805 | 51,853 | 25,051 | abated |
| 77 | 20,039 | 31,815 | 51,854 | 24,440 | abated |
| 78 | 20,363 | 31,491 | 51,854 | 23,844 | abated |
| 79 | 20,152 | 31,701 | 51,853 | 23,263 | abated |
| 80 | 19,972 | 31,881 | 51,853 | 22,695 | abated |
| 81 | 19,821 | 32,032 | 51,853 | 22,142 | abated |
| 82 | 19,700 | 32,153 | 51,853 | 21,602 | abated |
| 83 | 19,607 | 32,246 | 51,853 | 21,075 | abated |
| 84 | 19,542 | 32,311 | 51,853 | 20,561 | abated |
| 85 | 19,506 | 32,347 | 51,853 | 20,059 | abated |
| 86 | 19,497 | 32,356 | 51,853 | 19,570 | abated by $73 |
| 87 | 19,090 | 32,763 | 51,853 | 19,093 | **unabated** |
| 88 | 18,624 | 33,229 | 51,853 | 18,627 | **unabated** |
| 89 | 18,170 | 33,683 | 51,853 | 18,173 | **unabated** |
| 90 | 17,727 | 34,126 | 51,853 | 17,730 | **unabated** |
| 91 | 17,295 | 34,559 | 51,854 | 17,297 | **unabated** |
| 92 | 16,873 | 262 | 17,135 | 16,875 | **unabated** |
| 93 | 16,461 | 0 | 16,461 | 16,464 | **unabated** |
| 94 | 16,060 | 0 | 16,060 | 16,062 | **unabated** |
| 95 | 15,668 | 0 | 15,668 | 15,670 | **unabated** |
| 96 | 15,286 | 0 | 15,286 | 15,288 | **unabated** |
| 97 | 14,913 | 0 | 14,913 | 14,915 | **unabated** |
| 98 | 14,549 | 0 | 14,549 | 14,552 | **unabated** |
| 99 | **14,149** | 0 | 14,149 | 14,197 | ⚠️ off by $48 — see below |
| 100 | 13,848 | 0 | 13,848 | 13,850 | **unabated** |

Means over 67-91: Age Pension **$17,312**, super draw **$34,541**.

⚠️ **Age 99 is a transcription slip, not data.** Every other unabated row sits within **$3** of the
model; 99 is out by **$48**. It should read approximately **14,197**. Re-check before anyone fits
anything to it.

---

## Reverse-engineered model — verified numerically, not eyeballed

**1. The assets test, back-solved.** Taking run 1's free area (**$331,670**, constant in today's
dollars) and taper (**$78 per $1,000 per year**), and inverting the abatement:

    assets(age) = 331,670 + (unabated_frozen(age) - pension(age)) / 0.078

At age 67 this returns **$610,478** against an actual stated balance of **$610,530** — within
**$52**. The free area and the taper are therefore **jointly confirmed** on this run independently
of run 1, and the frozen-rate model is confirmed with them, since all three must be right together
for that to land.

The back-solved path then declines smoothly to **$332,609** at age 86 — just above the free area —
which is exactly where the abatement stops. Internally consistent at both ends.

⚠️ **One thing that is NOT explained.** The back-solved asset path falls about $21,000-24,000 a year
to age 77, then abruptly slows to about $5,000 a year from 79. The super draw and growth over that
period imply roughly $19,000 a year throughout, so the slowdown does not follow from the drawdown.
It is recorded as an observation, not a finding — **it may simply mean the free area is not constant
in today's dollars in this run**, which would also perturb the back-solve.

**2. The growth rate, solved from the drawdown.** Paying the super column out of $610,530 and
solving for the real return that exhausts it exactly at 92:

| | Implied real return |
| --- | --- |
| **Run 3** | **3.3093%** |
| Run 1 | 3.150% |
| Stated (Conservative 5.6% nominal, 2.5% CPI) | 3.0244% |

---

## The one thing this run genuinely established: the fee behaves correctly

Run 1 carried a **0.14%** pension-account admin fee; run 3 carries **none**. Their implied real
returns differ by **+0.159 points** (3.3093% against 3.150%) — which is the removed fee, to within
two hundredths of a percentage point.

**Their fee machinery does what it says**, and a fee of that size moves the implied return by very
nearly its own magnitude. That is the first clean, quantitative confirmation this exercise has
produced, and it survives the pension defect untouched because it is derived from the *balance
path*, not from the pension column.

---

## ⚠️ A correction to the comparison design — their returns are already net of investment fees

PDF page 5 states it in the column headers: *"Superannuation Account Returns per annum (**net of
investment related fees, costs and tax**)"* and *"Pension Account returns per annum (**net of
investment related fees and costs**)"*.

**So the admin fee is the only separately-charged fee.** When matching fees in `enough`, set our
**investment fee to zero** and `nominalReturn` to their already-net rate, charging only the admin
fee. Matching all their fee fields — which the run-3 fill-in sheet asked for — would **double-count
the investment fee**. The sheet is wrong on this point and should be corrected before a re-run.

---

## What this run validates, and what it cannot

**Usable from run 3:** the assets-test free area and taper, the depletion behaviour, and the fee
effect above.

**Use run 1 for the Age Pension.** Run 3's pension column is unusable for that purpose, which is
unfortunate, because the means test is the single largest area of genuine overlap between the two
models.

**Out of reach in this shape, by construction:** income tax (they apply none to retirement income —
PDF page 14 says so outright), CGT, salary sacrifice, the Superannuation Guarantee and Division 293.
None of them are present in a $0-salary, super-only household.

**Still open from run 1, and NOT closed here.** Run 1's accumulation year ran +1.776% in today's
dollars where Balanced 6.1% against a 3.7% deflator predicts +2.314%. Run 3 has the same single
accumulation year and the same $127-scale discrepancy in the retirement balance ($610,530 against
run 1's $610,657 on identical stated inputs). **Do not treat a divergence of this size in `enough`
as a defect until it is explained.**

---

## How to use this against `enough`

1. Household: single, homeowner, **$600,000** in super, retiring at 67, planning horizon 100.
2. Spending target: **$51,853** a year — *their* solve, which is an input to us. `enough` has no
   level-income solver and is not being asked to reproduce one.
3. Fees: **admin only** — see the correction above. Investment fee **zero**.
4. Read our figures with the page in **today's money**; no manual deflation is needed any more.
5. **Compare the balance path and the depletion age. Do not compare the Age Pension column** —
   ours indexes, theirs does not, and ours is right.
